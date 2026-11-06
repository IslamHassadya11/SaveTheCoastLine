// MapLibre map: base map, terrain, flood overlay, flooded buildings, markers and point queries.
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

// v6 ships its worker as a separate module; point MapLibre at the bundled copy.
maplibregl.setWorkerUrl(workerUrl);
import type { FloodGrid } from './flood';
import type { Site } from './data';
import { state, set, level, compareLevels } from './state';

export let map: maplibregl.Map;
let grid: FloodGrid;
let sites: Site[];
let ready = false;
const markers: { site: Site; m: maplibregl.Marker; el: HTMLElement }[] = [];

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const BLD_MAX_F = 22;           // buildings that the sea can reach below this level are drawn by us
const BLD_COLOR = 'hsl(35,8%,85%)';

export function createMap(container: HTMLElement, g: FloodGrid, s: Site[]): Promise<void> {
  grid = g; sites = s;
  const site = sites.find((x) => x.id === state.site) ?? sites[5];
  map = new maplibregl.Map({
    container, style: STYLE,
    center: [34.85, 32.35], zoom: 8.4, minZoom: 7, maxZoom: 18.5, maxPitch: 80,
    maxBounds: [[33.6, 30.9], [36.2, 33.8]],
    attributionControl: { compact: true },
    canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
  } as any);
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
  return new Promise((resolve) => {
    map.on('load', () => {
      setupLayers();
      ready = true;
      applyLanguage();
      applyBasemap();
      addMarkers();
      updateFlood();
      if (state.view === '3d') enter3D(false);
      map.on('click', onClick);
      map.on('idle', scanBuildings);
      map.on('moveend', scanBuildings);
      resolve();
      if (location.hash.includes('site=')) flyToSite(site, false);
      else map.fitBounds([[34.45, 31.6], [35.2, 33.1]], { duration: 0 });
    });
  });
}

// ---------------- layers ----------------
function setupLayers() {
  map.addSource('terrain', {
    type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
    encoding: 'terrarium', tileSize: 256, maxzoom: 15,
    attribution: '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Terrain Tiles</a>',
  });
  map.addSource('hillshade-dem', {
    type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
    encoding: 'terrarium', tileSize: 256, maxzoom: 14,
  });
  map.addSource('sat', {
    type: 'raster', tileSize: 256, maxzoom: 19,
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
  });
  map.addLayer({ id: 'sat', type: 'raster', source: 'sat', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 150 } }, 'park');
  map.addLayer({
    id: 'hillshade', type: 'hillshade', source: 'hillshade-dem',
    paint: { 'hillshade-exaggeration': 0.35, 'hillshade-shadow-color': '#5a4a3a', 'hillshade-highlight-color': '#fffaf0' },
  }, 'water');

  // flood overlay: one canvas per grid chunk, draped on terrain in 3D
  for (const ch of grid.chunks) {
    const { n, s, w, e } = ch.meta;
    const id = `flood-${ch.meta.row}-${ch.meta.col}`;
    map.addSource(id, { type: 'canvas', canvas: ch.canvas, animate: false, coordinates: [[w, n], [e, n], [e, s], [w, s]] } as any);
    map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-resampling': 'linear', 'raster-fade-duration': 0, 'raster-opacity': 0.95 } }, 'building');
  }

  // buildings the sea can reach: re-drawn from the base map's own footprints so they can be coloured by flooding
  map.addSource('fbld', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'fbld-3d', type: 'fill-extrusion', source: 'fbld', minzoom: 14,
    paint: {
      'fill-extrusion-base': ['get', 'b'],
      'fill-extrusion-height': ['max', ['+', ['get', 'b'], 2.5], ['get', 'h']],
      'fill-extrusion-color': BLD_COLOR,
      'fill-extrusion-opacity': 0.9,
    },
  }, 'boundary_3');
  map.addLayer({
    id: 'fbld-water', type: 'fill-extrusion', source: 'fbld', minzoom: 14, filter: ['<', ['get', 'f'], -99],
    paint: {
      'fill-extrusion-base': 0,
      'fill-extrusion-height': 0,
      'fill-extrusion-color': '#38bdf8',
      'fill-extrusion-opacity': 0.75,
    },
  }, 'boundary_3');
}

function canvasSrc(id: string) { return map.getSource(id) as unknown as { play(): void; pause(): void } | undefined; }

/** Re-render the flood overlay and flooded-building styling for the current state. */
export function updateFlood() {
  if (!ready) return;
  const L = level();
  const cmp = state.compare ? compareLevels() : null;
  const show = cmp ? cmp.low : L;
  const changed = grid.render(show, cmp ? cmp.high : null);
  for (const ch of changed) {
    const src = canvasSrc(`flood-${ch.meta.row}-${ch.meta.col}`);
    if (src) { src.play(); src.pause(); }
  }
  const H = cmp ? cmp.high : -99;
  map.setPaintProperty('fbld-3d', 'fill-extrusion-color',
    ['case', ['<', ['get', 'f'], show], '#f43f5e', ['<', ['get', 'f'], H], '#fb923c', BLD_COLOR]);
  map.setFilter('fbld-water', ['<', ['get', 'f'], show]);
  map.setPaintProperty('fbld-water', 'fill-extrusion-height', ['max', 0.15, ['-', show, ['get', 'e']]]);
  map.triggerRepaint();
}

// ---------------- buildings ----------------
const replaced = new Set<number>();
const keys = new Set<string>();
let feats: GeoJSON.Feature[] = [];

function tileBounds(z: number, x: number, y: number) {
  const n = 2 ** z;
  const lon = (xx: number) => (xx / n) * 360 - 180;
  const lat = (yy: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * yy) / n))) * 180) / Math.PI;
  return { w: lon(x), e: lon(x + 1), n: lat(y), s: lat(y + 1) };
}

function scanBuildings() {
  if (!state.buildings || map.getZoom() < 14 || !map.getSource('openmaptiles')) return;
  const qs = map.querySourceFeatures('openmaptiles', { sourceLayer: 'building' });
  let added = 0;
  for (const f of qs as any[]) {
    const id = f.id as number;
    if (id == null || f._z !== 14) continue;
    const g = f.geometry as GeoJSON.Geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    if (!polys.length) continue;
    const tb = tileBounds(f._z, f._x, f._y);
    const evals: { poly: GeoJSON.Position[][]; f: number; e: number }[] = [];
    let relevant = false;
    for (const poly of polys) {
      const ring = poly[0]; if (!ring || ring.length < 3) continue;
      let cx = 0, cy = 0, minF = 99, minE = 99;
      for (const [x, y] of ring) {
        cx += x; cy += y;
        const c = grid.sample(x, y);
        if (c && !c.sea) { if (c.fill < minF) minF = c.fill; if (c.ground < minE) minE = c.ground; }
        else if (c && c.sea) { minF = Math.min(minF, 0); }
      }
      cx /= ring.length; cy /= ring.length;
      if (cx < tb.w || cx >= tb.e || cy > tb.n || cy <= tb.s) continue; // piece belongs to a neighbour tile
      if (minF < BLD_MAX_F) relevant = true;
      evals.push({ poly, f: minF, e: minE === 99 ? Math.max(0, minF) : minE });
    }
    if (!relevant && !replaced.has(id)) continue;
    if (!replaced.has(id)) replaced.add(id);
    for (const ev of evals) {
      const r0 = ev.poly[0][0];
      const key = `${id}:${r0[0].toFixed(6)},${r0[1].toFixed(6)}`;
      if (keys.has(key)) continue;
      keys.add(key); added++;
      feats.push({
        type: 'Feature', geometry: { type: 'Polygon', coordinates: ev.poly },
        properties: { h: f.properties.render_height ?? 4, b: f.properties.render_min_height ?? 0, f: ev.f, e: ev.e },
      });
    }
  }
  if (!added) return;
  if (feats.length > 120000) { feats = []; keys.clear(); replaced.clear(); return scanBuildings(); }
  (map.getSource('fbld') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: feats });
  const hide: any = replaced.size ? ['match', ['id'], [...replaced], false, true] : true;
  map.setFilter('building-3d', ['all', ['!', ['has', 'hide_3d']], hide]);
  map.setFilter('building', hide);
}

export function setBuildingsVisible(on: boolean) {
  for (const id of ['fbld-3d', 'fbld-water', 'building-3d']) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
}

// ---------------- base map & language ----------------
const FILL_LAYERS = ['background', 'park', 'landuse_residential', 'landcover_wood', 'landcover_grass', 'landcover_wetland', 'landuse_pitch', 'landuse_track',
  'landuse_cemetery', 'landuse_hospital', 'landuse_school', 'water', 'landcover_sand', 'aeroway_fill', 'road_area_pattern', 'hillshade'];
export function applyBasemap() {
  const sat = state.basemap === 'sat';
  map.setLayoutProperty('sat', 'visibility', sat ? 'visible' : 'none');
  for (const id of FILL_LAYERS) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', sat && id !== 'background' ? 'none' : 'visible');
  if (map.getLayer('natural_earth')) map.setLayoutProperty('natural_earth', 'visibility', sat ? 'none' : 'visible');
}

export function applyLanguage() {
  const lang = state.lang;
  const name: any = lang === 'he'
    ? ['coalesce', ['get', 'name:he'], ['get', 'name'], ['get', 'name:latin']]
    : ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']];
  for (const l of map.getStyle().layers) {
    if (l.type !== 'symbol') continue;
    const tf = map.getLayoutProperty(l.id, 'text-field');
    if (!tf) continue;
    const s = JSON.stringify(tf);
    if (!s.includes('name')) continue;
    map.setLayoutProperty(l.id, 'text-field', name);
  }
  for (const mk of markers) mk.el.querySelector('.mk-label')!.textContent = lang === 'he' ? mk.site.he : mk.site.en;
}

// ---------------- 2D / 3D ----------------
export function enter3D(animate = true) {
  map.setTerrain({ source: 'terrain', exaggeration: 1.35 });
  map.setSky({
    'sky-color': '#7cc3f2', 'horizon-color': '#d8ecf7', 'fog-color': '#e6f0f5',
    'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.5, 'fog-ground-blend': 0.6, 'atmosphere-blend': 0.6,
  } as any);
  if (map.getLayer('hillshade')) map.setLayoutProperty('hillshade', 'visibility', 'none');
  const z = Math.max(map.getZoom(), 14.2);
  if (animate) map.easeTo({ pitch: 62, zoom: z, bearing: map.getBearing() || -70, duration: 1600 });
}
/** Keep the map's visual centre in the part of the screen not covered by the dock / drawer. */
export function setPadding(p: { top: number; bottom: number; left: number; right: number }) {
  map?.setPadding(p);
}
export function is3D() { return !!map.getTerrain(); }
export function enter2D() {
  map.setTerrain(null as any);
  if (map.getLayer('hillshade') && state.basemap !== 'sat') map.setLayoutProperty('hillshade', 'visibility', 'visible');
  map.easeTo({ pitch: 0, bearing: 0, duration: 1200 });
}

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

// ---------------- markers ----------------
function addMarkers() {
  for (const site of sites) {
    const el = document.createElement('button');
    el.className = 'mk';
    el.innerHTML = `<span class="mk-dot"></span><span class="mk-label"></span>`;
    el.addEventListener('click', (ev) => { ev.stopPropagation(); set({ site: site.id }); });
    const m = new maplibregl.Marker({ element: el, anchor: 'left' }).setLngLat([site.lon, site.lat]).addTo(map);
    markers.push({ site, m, el });
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
let popupFn: ((lngLat: maplibregl.LngLat) => string) | null = null;
export function onPointInfo(fn: (lngLat: maplibregl.LngLat) => string) { popupFn = fn; }
let popup: maplibregl.Popup | null = null;
function onClick(e: maplibregl.MapMouseEvent) {
  if (!popupFn) return;
  popup?.remove();
  popup = new maplibregl.Popup({ maxWidth: '300px', className: 'rt-popup' }).setLngLat(e.lngLat).setHTML(popupFn(e.lngLat)).addTo(map);
}
export function showPointInfo(lngLat: [number, number]) {
  if (!popupFn) return;
  popup?.remove();
  const ll = new maplibregl.LngLat(lngLat[0], lngLat[1]);
  popup = new maplibregl.Popup({ maxWidth: '300px', className: 'rt-popup' }).setLngLat(ll).setHTML(popupFn(ll)).addTo(map);
}
export function refreshPopup() {
  if (popup && popup.isOpen() && popupFn) popup.setHTML(popupFn(popup.getLngLat()));
}
