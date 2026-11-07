// MapLibre maps: base map, terrain, flood overlay, sinking buildings, markers and point queries.
// The main map is always there; a second, camera-synced map is added for the swipe comparison.
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import type { FloodGrid, FloodTarget } from './flood';
import { WATER } from './flood';
import { ClassicLayer, classicFactor } from './classic';
import type { Site } from './data';
import { state, set, level, compareLevels } from './state';

// v6 ships its worker as a separate module; point MapLibre at the bundled copy.
maplibregl.setWorkerUrl(workerUrl);

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const BLD_MAX = 22;               // buildings the sea can reach below this level are drawn by us
const BLD_COLOR = 'hsl(35,8%,85%)';
const BLD_WET = '#f87171';        // part of a reached building still above the water

interface View {
  m: maplibregl.Map; target: FloodTarget; ready: boolean;
  replaced: Set<number>; keys: Set<string>; feats: GeoJSON.Feature[];
  shown: number; goal: number; raf: number;
  tz: number;   // tile zoom the collected buildings came from
  lastDraw: number; pending: number; lastBld: number; bldKey: string; bldPending: number;
}

export let map: maplibregl.Map;
let main: View;
let other: View | null = null;
let grid: FloodGrid;
let sites: Site[];
let coastline: GeoJSON.FeatureCollection;
const markers: { site: Site; el: HTMLElement }[] = [];
let classic: ClassicLayer;

/** What the classic water layer should draw: one frame, or two split at the swipe line. */
function classicFrames() {
  const site = sites.find((x) => x.id === state.site);
  const s = site ? { lat: site.lat, lon: site.lon } : undefined;
  if (other && other.ready) {
    const x = parseFloat(document.getElementById('swipe')?.style.left || '') || window.innerWidth / 2;
    return [{ map, level: main.shown, clip: [0, x] as [number, number], site: s }, { map: other.m, level: other.shown, clip: [x, window.innerWidth] as [number, number], site: s }];
  }
  return [{ map, level: main.shown, site: s }];
}

function makeMap(container: HTMLElement, controls: boolean) {
  const m = new maplibregl.Map({
    container, style: STYLE,
    center: [34.85, 32.35], zoom: 8.4, minZoom: 7, maxZoom: 18.5, maxPitch: 80,
    maxBounds: [[33.6, 30.9], [36.2, 33.8]],
    attributionControl: controls ? { compact: true } : false,
    // no preserveDrawingBuffer: it costs graphics memory on every frame (snapshots use the render event instead)
    canvasContextAttributes: { antialias: true },
  } as any);
  if (controls) {
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    m.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
  }
  return m;
}
function newView(m: maplibregl.Map): View {
  return { m, target: grid.newTarget(), ready: false, replaced: new Set(), keys: new Set(), feats: [], shown: NaN, goal: 0, raf: 0, tz: 0, lastDraw: 0, pending: 0, lastBld: 0, bldKey: '', bldPending: 0 };
}

export function createMap(container: HTMLElement, g: FloodGrid, s: Site[], coast: GeoJSON.FeatureCollection): Promise<void> {
  grid = g; sites = s; coastline = coast;
  const site = sites.find((x) => x.id === state.site) ?? sites[5];
  map = makeMap(container, true);
  main = newView(map);
  classic = new ClassicLayer(document.body, classicFrames);
  return new Promise((resolve) => {
    map.on('load', () => {
      setupLayers(main);
      applyLanguage(); applyBasemap();
      addMarkers();
      updateFlood(true);
      if (state.view === '3d') enter3D(false);
      map.on('click', (e) => onClick(main, e));
      map.on('idle', () => scanBuildings(main));
      map.on('moveend', () => { scanBuildings(main); paintFlood(main); });
      guardContext(main);
      map.on('move', () => { if (other) syncCam(map, other.m); });
      resolve();
      if (location.hash.includes('site=')) flyToSite(site, false);
      else map.fitBounds([[34.45, 31.6], [35.2, 33.1]], { duration: 0 });
    });
  });
}

// ---------------- layers ----------------
function setupLayers(v: View) {
  const m = v.m;
  m.addSource('terrain', {
    type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
    encoding: 'terrarium', tileSize: 256, maxzoom: 15,
    attribution: '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Terrain Tiles</a>',
  });
  m.addSource('hillshade-dem', {
    type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
    encoding: 'terrarium', tileSize: 256, maxzoom: 14,
  });
  m.addSource('sat', {
    type: 'raster', tileSize: 256, maxzoom: 19,
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
  });
  m.addLayer({ id: 'sat', type: 'raster', source: 'sat', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 150 } }, 'park');
  m.addLayer({
    id: 'hillshade', type: 'hillshade', source: 'hillshade-dem',
    paint: { 'hillshade-exaggeration': 0.35, 'hillshade-shadow-color': '#5a4a3a', 'hillshade-highlight-color': '#fffaf0' },
  }, 'water');

  // flood overlay: one canvas per grid chunk, draped on terrain in 3D
  grid.chunks.forEach((ch, k) => {
    const { n, s, w, e } = ch.meta;
    const id = `flood-${k}`;
    m.addSource(id, { type: 'canvas', canvas: v.target.layers[k].canvas, animate: false, coordinates: [[w, n], [e, n], [e, s], [w, s]] } as any);
    m.addLayer({ id, type: 'raster', source: id, paint: { 'raster-resampling': 'linear', 'raster-fade-duration': 0 } }, 'building');
  });
  // today's shoreline, so you can see how far the sea has come
  m.addSource('coast-today', { type: 'geojson', data: coastline });
  m.addLayer({
    id: 'coast-today', type: 'line', source: 'coast-today',
    paint: {
      'line-color': '#163a63', 'line-opacity': 0.85,
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 13, 1.6, 16, 2.4],
      'line-dasharray': [2, 1.6],
    },
  }, 'building');

  // buildings the sea can reach, re-drawn from the base map's own footprints so they can sink
  m.addSource('fbld', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  m.addLayer({
    id: 'fbld-water', type: 'fill-extrusion', source: 'fbld', minzoom: 14, filter: ['<', ['get', 'f'], -99],
    paint: { 'fill-extrusion-base': 0, 'fill-extrusion-height': 0, 'fill-extrusion-color': WATER.map.shallow, 'fill-extrusion-opacity': 0.88 },
  }, 'boundary_3');
  m.addLayer({
    id: 'fbld-3d', type: 'fill-extrusion', source: 'fbld', minzoom: 14,
    paint: {
      'fill-extrusion-base': ['get', 'b'],
      'fill-extrusion-height': ['max', ['+', ['get', 'b'], 2.5], ['get', 'h']],
      'fill-extrusion-color': BLD_COLOR, 'fill-extrusion-opacity': 0.92,
    },
  }, 'fbld-water');
  v.ready = true;
}

// ---------------- flood drawing (with a short "rising water" animation) ----------------
function goals(): { main: number; other: number } {
  if (state.compare) { const c = compareLevels(); return { main: c.low, other: c.high }; }
  const L = level(); return { main: L, other: L };
}
export function updateFlood(instant = false) {
  const g = goals();
  for (const [v, goal] of [[main, g.main], [other, g.other]] as const) {
    if (!v || !v.ready) continue;
    v.goal = goal;
    if (instant || isNaN(v.shown) || Math.abs(goal - v.shown) < 0.02) { v.shown = goal; drawView(v); continue; }
    if (!v.raf) animate(v);
  }
}
function animate(v: View) {
  let last = performance.now();
  const step = (ts: number) => {
    const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
    const d = v.goal - v.shown;
    v.shown = Math.abs(d) < 0.02 ? v.goal : v.shown + d * Math.min(1, dt * 7);
    drawView(v);
    v.raf = v.shown === v.goal ? 0 : requestAnimationFrame(step);
  };
  v.raf = requestAnimationFrame(step);
}
/** The level a map is currently showing (mid-animation included). */
export function shownLevel(which: 'main' | 'other' = 'main') { const v = which === 'main' ? main : other; return v ? v.shown : NaN; }

// Redraws are capped (about 15 a second for water, 5 for buildings) and only touch what is on screen:
// re-uploading the whole coast's water images every frame can make the browser reset its graphics.
const FRAME_MS = 66, BLD_MS = 200;
function drawView(v: View, force = false) {
  const now = performance.now();
  if (!force && now - v.lastDraw < FRAME_MS) {
    if (!v.pending) v.pending = window.setTimeout(() => { v.pending = 0; drawView(v, true); }, FRAME_MS - (now - v.lastDraw));
    return;
  }
  v.lastDraw = now;
  paintFlood(v);
  paintBuildings(v);
}

function paintFlood(v: View) {
  const m = v.m, cl = state.style === 'classic';
  // classic view: the original lab's animated water is drawn on its own canvas instead of the data layer
  if (v === main) { if (cl) classic.start(); else classic.stop(); }
  m.setLayoutProperty('coast-today', 'visibility', cl ? 'none' : 'visible');
  const b = m.getBounds();
  const pw = (b.getEast() - b.getWest()) * 0.3, ph = (b.getNorth() - b.getSouth()) * 0.3;
  const W = b.getWest() - pw, E = b.getEast() + pw, S = b.getSouth() - ph, N = b.getNorth() + ph;
  const onScreen = (k: number) => { const c = grid.chunks[k].meta; return c.e > W && c.w < E && c.n > S && c.s < N; };
  for (const k of v.target.render({ level: cl ? -99 : v.shown, style: state.style, sat: state.basemap === 'sat' }, onScreen)) {
    const src = m.getSource(`flood-${k}`) as unknown as { play(): void; pause(): void } | undefined;
    if (src) { src.play(); src.pause(); }
  }
  m.triggerRepaint();
}

function paintBuildings(v: View, force = false) {
  const m = v.m, L = v.shown, sat = state.basemap === 'sat';
  const cl = state.style === 'classic', illus = state.style === 'illus' || cl;
  const bkey = `${state.style}|${sat}|${Math.round(L * 50)}`;
  if (bkey === v.bldKey) return;
  const now = performance.now();
  if (!force && now - v.lastBld < BLD_MS) {
    if (!v.bldPending) v.bldPending = window.setTimeout(() => { v.bldPending = 0; paintBuildings(v, true); }, BLD_MS - (now - v.lastBld));
    return;
  }
  v.lastBld = now; v.bldKey = bkey;
  // buildings: the part under water is replaced by a block of water, so they sink as the sea rises
  const key = cl ? 'fc' : illus ? 'fi' : 'f';
  const wet: any = ['<', ['get', key], L];
  const depth: any = illus
    ? ['case', ['<', ['get', 'f'], L], ['-', L, ['get', 'e']], 999]   // eroded away: gone entirely
    : ['-', L, ['get', 'e']];
  const H: any = ['max', ['+', ['get', 'b'], 2.5], ['get', 'h']];
  const base: any = ['case', wet, ['max', ['get', 'b'], depth], ['get', 'b']];
  m.setPaintProperty('fbld-3d', 'fill-extrusion-base', base);
  m.setPaintProperty('fbld-3d', 'fill-extrusion-height', ['max', H, base]);
  m.setPaintProperty('fbld-3d', 'fill-extrusion-color', ['case', wet, BLD_WET, BLD_COLOR]);
  // water up the walls while a building is partly under; once fully under, it is simply gone
  m.setFilter('fbld-water', ['all', wet, ['<', depth, H]]);
  m.setPaintProperty('fbld-water', 'fill-extrusion-height', ['max', 0.3, depth]);
  m.setPaintProperty('fbld-water', 'fill-extrusion-color', sat ? WATER.sat.shallow : WATER.map.shallow);
  m.triggerRepaint();
}

/** If the browser resets the graphics context, redraw everything once it is back. */
function guardContext(v: View) {
  v.m.on('webglcontextlost', () => console.warn('Graphics context lost - waiting for the browser to restore it'));
  v.m.on('webglcontextrestored', () => {
    v.target.invalidate(); v.bldKey = '';
    grid.chunks.forEach((_, k) => { const src = v.m.getSource(`flood-${k}`) as any; if (src) src.texture = null; });
    drawView(v, true);
  });
}

/** A PNG of the main map (taken right after a fresh frame, as the drawing buffer is not preserved). */
export function snapshot(): Promise<string> {
  return new Promise((res) => { map.once('render', () => res(map.getCanvas().toDataURL('image/png'))); map.triggerRepaint(); });
}

// ---------------- buildings ----------------
function tileBounds(z: number, x: number, y: number) {
  const n = 2 ** z;
  const lon = (xx: number) => (xx / n) * 360 - 180;
  const lat = (yy: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * yy) / n))) * 180) / Math.PI;
  return { w: lon(x), e: lon(x + 1), n: lat(y), s: lat(y + 1) };
}

function scanBuildings(v: View) {
  const m = v.m;
  if (!v.ready || !state.buildings || m.getZoom() < 14 || !m.getSource('openmaptiles')) return;
  const qs = m.querySourceFeatures('openmaptiles', { sourceLayer: 'building' }) as any[];
  // use the most detailed building tiles loaded (z14, or z15 where the base map has them);
  // when that changes, start over so the same building is never drawn twice
  let tz = 0;
  for (const f of qs) if (f._z > tz) tz = f._z;
  if (tz < 14) return;
  if (tz !== v.tz) { v.tz = tz; v.feats = []; v.keys.clear(); v.replaced.clear(); }
  let added = 0;
  for (const f of qs) {
    const id = f.id as number;
    if (id == null || f._z !== tz) continue;
    const g = f.geometry as GeoJSON.Geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    if (!polys.length) continue;
    const tb = tileBounds(f._z, f._x, f._y);
    const evals: { poly: GeoJSON.Position[][]; f: number; fi: number; fc: number; e: number }[] = [];
    let relevant = false;
    for (const poly of polys) {
      const ring = poly[0]; if (!ring || ring.length < 3) continue;
      let cx = 0, cy = 0, minF = 99, minFi = 99, minFc = 99, minE = 99;
      for (const [x, y] of ring) {
        cx += x; cy += y;
        const c = grid.sample(x, y);
        if (c && !c.sea) {
          if (c.fill < minF) minF = c.fill;
          if (c.fillIllus < minFi) minFi = c.fillIllus;
          const fc = c.dist / classicFactor(y);
          if (fc < minFc) minFc = fc;
          if (c.ground < minE) minE = c.ground;
        } else if (c && c.sea) { minF = Math.min(minF, 0); minFi = Math.min(minFi, 0); minFc = Math.min(minFc, 0); }
      }
      cx /= ring.length; cy /= ring.length;
      if (cx < tb.w || cx >= tb.e || cy > tb.n || cy <= tb.s) continue; // piece belongs to a neighbour tile
      if (minFi < BLD_MAX || minFc < BLD_MAX) relevant = true;
      evals.push({ poly, f: minF, fi: Math.min(minF, minFi), fc: Math.min(minF, minFc), e: minE === 99 ? Math.max(0, minF) : minE });
    }
    if (!relevant && !v.replaced.has(id)) continue;
    v.replaced.add(id);
    for (const ev of evals) {
      const r0 = ev.poly[0][0];
      const key = `${id}:${r0[0].toFixed(6)},${r0[1].toFixed(6)}`;
      if (v.keys.has(key)) continue;
      v.keys.add(key); added++;
      v.feats.push({
        type: 'Feature', geometry: { type: 'Polygon', coordinates: ev.poly },
        properties: { h: f.properties.render_height ?? 4, b: f.properties.render_min_height ?? 0, f: ev.f, fi: ev.fi, fc: ev.fc, e: ev.e },
      });
    }
  }
  if (!added) return;
  if (v.feats.length > 120000) { v.feats = []; v.keys.clear(); v.replaced.clear(); return scanBuildings(v); }
  (m.getSource('fbld') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: v.feats });
  const hide: any = v.replaced.size ? ['match', ['id'], [...v.replaced], false, true] : true;
  m.setFilter('building-3d', ['all', ['!', ['has', 'hide_3d']], hide]);
  m.setFilter('building', hide);
}

const views = () => [main, other].filter((v): v is View => !!v && v.ready);
export function setBuildingsVisible(on: boolean) {
  for (const v of views()) for (const id of ['fbld-3d', 'fbld-water', 'building-3d']) v.m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
}

// ---------------- base map & language ----------------
const FILL_LAYERS = ['park', 'landuse_residential', 'landcover_wood', 'landcover_grass', 'landcover_wetland', 'landuse_pitch', 'landuse_track',
  'landuse_cemetery', 'landuse_hospital', 'landuse_school', 'water', 'landcover_sand', 'aeroway_fill', 'road_area_pattern', 'hillshade', 'natural_earth'];
export function applyBasemap() {
  const sat = state.basemap === 'sat';
  for (const v of views()) {
    const m = v.m;
    m.setLayoutProperty('sat', 'visibility', sat ? 'visible' : 'none');
    for (const id of FILL_LAYERS) if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', sat || (id === 'hillshade' && is3D()) ? 'none' : 'visible');
    m.setPaintProperty('coast-today', 'line-color', sat ? '#ffffff' : '#163a63');
  }
  updateFlood(true);
}

export function applyLanguage() {
  const name: any = state.lang === 'he'
    ? ['coalesce', ['get', 'name:he'], ['get', 'name'], ['get', 'name:latin']]
    : ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']];
  for (const v of views()) {
    for (const l of v.m.getStyle().layers) {
      if (l.type !== 'symbol') continue;
      const tf = v.m.getLayoutProperty(l.id, 'text-field');
      if (tf && JSON.stringify(tf).includes('name')) v.m.setLayoutProperty(l.id, 'text-field', name);
    }
  }
  for (const mk of markers) mk.el.querySelector('.mk-label')!.textContent = state.lang === 'he' ? mk.site.he : mk.site.en;
}

// ---------------- 2D / 3D ----------------
const SKY: any = {
  'sky-color': '#7cc3f2', 'horizon-color': '#d8ecf7', 'fog-color': '#e6f0f5',
  'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.5, 'fog-ground-blend': 0.6, 'atmosphere-blend': 0.6,
};
function terrainOn(m: maplibregl.Map, on: boolean) {
  m.setTerrain(on ? { source: 'terrain', exaggeration: 1.35 } : (null as any));
  if (on) m.setSky(SKY);
  if (m.getLayer('hillshade')) m.setLayoutProperty('hillshade', 'visibility', on || state.basemap === 'sat' ? 'none' : 'visible');
}
export function enter3D(animate = true) {
  for (const v of views()) terrainOn(v.m, true);
  const z = Math.max(map.getZoom(), 14.2);
  if (animate) map.easeTo({ pitch: 62, zoom: z, bearing: map.getBearing() || 90, duration: 1600 });
}
export function enter2D() {
  for (const v of views()) terrainOn(v.m, false);
  map.easeTo({ pitch: 0, bearing: 0, duration: 1200 });
}
/** Keep the map's visual centre in the part of the screen not covered by the dock / drawer. */
export function setPadding(p: { top: number; bottom: number; left: number; right: number }) {
  map?.setPadding(p); other?.m.setPadding(p);
}
export function is3D() { return !!map.getTerrain(); }

export function flyToSite(site: Site, animate = true) {
  const is3d = state.view !== '2d';
  const opts = {
    center: [site.lon, site.lat] as [number, number],
    zoom: is3d ? site.zoom + 0.2 : site.zoom - 0.6,
    pitch: is3d ? 64 : 0, bearing: is3d ? site.bearing : 0,
  };
  if (animate) map.flyTo({ ...opts, duration: 3200, curve: 1.5, essential: true });
  else map.jumpTo(opts);
}

// ---------------- swipe comparison: a second map on top, clipped to the right of the divider ----------------
let syncing = false;
function syncCam(from: maplibregl.Map, to: maplibregl.Map) {
  if (syncing) return;
  syncing = true;
  to.jumpTo({ center: from.getCenter(), zoom: from.getZoom(), bearing: from.getBearing(), pitch: from.getPitch() });
  syncing = false;
}
export function setCompare(on: boolean, container: HTMLElement) {
  if (!on) {
    if (other) { cancelAnimationFrame(other.raf); other.m.remove(); other = null; }
    container.hidden = true;
    updateFlood(true);
    return;
  }
  if (other) return;
  container.hidden = false;
  const m = makeMap(container, false);
  m.setPadding(map.getPadding());
  syncCam(map, m);
  const v = newView(m);
  other = v;
  m.on('load', () => {
    if (other !== v) return;
    setupLayers(v);
    applyLanguage(); applyBasemap();
    if (is3D()) terrainOn(m, true);
    syncCam(map, m);
    m.on('move', () => syncCam(m, map));
    m.on('idle', () => scanBuildings(v));
    m.on('moveend', () => { scanBuildings(v); paintFlood(v); });
    guardContext(v);
    m.on('click', (e) => onClick(v, e));
    updateFlood(true);
  });
  updateFlood(true);
}

// ---------------- markers ----------------
function addMarkers() {
  for (const site of sites) {
    const el = document.createElement('button');
    el.className = 'mk';
    el.innerHTML = `<span class="mk-dot"></span><span class="mk-label"></span>`;
    el.addEventListener('click', (ev) => { ev.stopPropagation(); set({ site: site.id }); });
    new maplibregl.Marker({ element: el, anchor: 'left' }).setLngLat([site.lon, site.lat]).addTo(map);
    markers.push({ site, el });
  }
  highlightMarker();
  const zoomClass = () => {
    const z = map.getZoom();
    document.body.classList.toggle('mk-far', z < 9.2);
    document.body.classList.toggle('mk-near', z > 13.5);
  };
  map.on('zoom', zoomClass); zoomClass();
}
export function highlightMarker() {
  for (const mk of markers) mk.el.classList.toggle('active', mk.site.id === state.site);
}

// ---------------- click popup ----------------
let popupFn: ((lngLat: maplibregl.LngLat, which: 'main' | 'other') => string) | null = null;
export function onPointInfo(fn: (lngLat: maplibregl.LngLat, which: 'main' | 'other') => string) { popupFn = fn; }
let popup: { p: maplibregl.Popup; which: 'main' | 'other' } | null = null;
function openPopup(v: View, ll: maplibregl.LngLat) {
  if (!popupFn) return;
  popup?.p.remove();
  const which = v === main ? 'main' : 'other';
  popup = { p: new maplibregl.Popup({ maxWidth: '300px', className: 'rt-popup' }).setLngLat(ll).setHTML(popupFn(ll, which)).addTo(v.m), which };
}
function onClick(v: View, e: maplibregl.MapMouseEvent) { openPopup(v, e.lngLat); }
export function showPointInfo(lngLat: [number, number]) { openPopup(main, new maplibregl.LngLat(lngLat[0], lngLat[1])); }
export function refreshPopup() {
  if (popup && popup.p.isOpen() && popupFn) popup.p.setHTML(popupFn(popup.p.getLngLat(), popup.which));
}
