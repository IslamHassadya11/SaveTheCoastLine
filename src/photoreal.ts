// Photoreal 3D: Google Photorealistic 3D Tiles in CesiumJS, flooded at the app's sea level.
// Cesium is loaded from a CDN only when this mode is opened. The water is drawn as flat image
// rectangles at (sea level + geoid height), so the real 3D city is cut by the water surface.
import type { FloodGrid } from './flood';
import { map } from './map';
import { level, state } from './state';

const CESIUM = 'https://cdn.jsdelivr.net/npm/cesium@1.145.0/Build/Cesium/';
declare global { interface Window { Cesium: any; CESIUM_BASE_URL: string } }

let viewer: any = null;
let entities: { ent: any; ch: any; canvas: HTMLCanvasElement }[] = [];
let datum = 0;
let lastLevel = NaN;

function loadCesium(): Promise<any> {
  if (window.Cesium) return Promise.resolve(window.Cesium);
  window.CESIUM_BASE_URL = CESIUM;
  return new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = CESIUM + 'Widgets/widgets.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = CESIUM + 'Cesium.js';
    s.onload = () => res(window.Cesium); s.onerror = () => rej(new Error('Cesium failed to load'));
    document.head.appendChild(s);
  });
}

export async function startPhotoreal(container: HTMLElement, key: string, grid: FloodGrid) {
  const Cesium = await loadCesium();
  if (!viewer) {
    Cesium.Ion.defaultAccessToken = '';
    viewer = new Cesium.Viewer(container, {
      baseLayer: false, baseLayerPicker: false, geocoder: false, timeline: false, animation: false, homeButton: false,
      sceneModePicker: false, navigationHelpButton: false, fullscreenButton: false, infoBox: false, selectionIndicator: false,
      terrainProvider: new Cesium.EllipsoidTerrainProvider(), requestRenderMode: false,
    });
    viewer.scene.globe.show = false;
    viewer.scene.skyAtmosphere.show = true;
    try {
      const tileset = await Cesium.Cesium3DTileset.fromUrl(`https://tile.googleapis.com/v1/3dtiles/root.json?key=${encodeURIComponent(key)}`, {
        showCreditsOnScreen: true, maximumScreenSpaceError: 12,
      });
      viewer.scene.primitives.add(tileset);
    } catch (e) {
      // bad key / API not enabled: tear down so the next attempt starts clean
      viewer.destroy(); viewer = null; entities = [];
      throw e;
    }
    for (const ch of grid.chunks) {
      const { n, s, w, e } = ch.meta;
      const canvas = document.createElement('canvas');
      const ent = viewer.entities.add({
        rectangle: {
          coordinates: Cesium.Rectangle.fromDegrees(w, s, e, n), height: 0,
          material: new Cesium.ImageMaterialProperty({ image: canvas, transparent: true }),
        },
      });
      entities.push({ ent, ch, canvas });
    }
  }
  syncFromMap();
  updatePhotoreal(true);
  return viewer;
}

/** Repaint the water (debounced by the caller). */
export function updatePhotoreal(force = false) {
  if (!viewer) return;
  const Cesium = window.Cesium;
  const L = level();
  const changed = force || Math.abs(L - lastLevel) > 0.004;
  for (const { ent, ch, canvas } of entities) {
    ent.rectangle.height = L + ch.meta.geoid + datum;
    if (changed && gridRef) {
      gridRef.renderPhoto(ch, { level: L, style: state.style, sat: true }, canvas);
      ent.rectangle.material = new Cesium.ImageMaterialProperty({ image: canvas.toDataURL('image/png'), transparent: true });
    }
  }
  lastLevel = L;
}
let gridRef: FloodGrid | null = null;
export function setPhotoGrid(g: FloodGrid) { gridRef = g; }
export function setDatum(d: number) { datum = d; updatePhotoreal(false); }

/** Point the Cesium camera where the MapLibre camera is. */
export function syncFromMap() {
  if (!viewer) return;
  const Cesium = window.Cesium;
  const c = map.getCenter(), z = map.getZoom(), pitch = map.getPitch(), bearing = map.getBearing();
  // altitude above the look-at point roughly matching the web-mercator zoom
  const dist = (40075016 * Math.cos((c.lat * Math.PI) / 180)) / 2 ** z * (map.getCanvas().clientHeight / 512) * 0.9;
  const tilt = Math.max(10, Math.min(80, pitch));
  const back = dist * Math.sin((tilt * Math.PI) / 180), up = dist * Math.cos((tilt * Math.PI) / 180);
  const b = (bearing * Math.PI) / 180;
  const lat = c.lat - (back * Math.cos(b)) / 110540;
  const lon = c.lng - (back * Math.sin(b)) / (111320 * Math.cos((c.lat * Math.PI) / 180));
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, up + 40),
    orientation: { heading: b, pitch: -((90 - tilt) * Math.PI) / 180, roll: 0 },
  });
}

export function photoFlyTo(lon: number, lat: number, bearing: number) {
  if (!viewer) return;
  const Cesium = window.Cesium;
  const b = (bearing * Math.PI) / 180, back = 900;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon - (back * Math.sin(b)) / 94000, lat - (back * Math.cos(b)) / 110540, 520),
    orientation: { heading: b, pitch: -0.5, roll: 0 }, duration: 3,
  });
}

let orbitOn = false;
export function photoOrbiting() { return orbitOn; }
export function photoOrbit(on: boolean) {
  if (!viewer) return;
  orbitOn = on;
  const Cesium = window.Cesium;
  const tick = () => {
    if (!orbitOn) return;
    const scene = viewer.scene;
    const center = scene.pickPosition(new Cesium.Cartesian2(scene.canvas.clientWidth / 2, scene.canvas.clientHeight / 2));
    if (center) {
      const tr = Cesium.Transforms.eastNorthUpToFixedFrame(center);
      viewer.camera.lookAtTransform(tr);
      viewer.camera.rotateRight(0.002);
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    }
    requestAnimationFrame(tick);
  };
  tick();
}
