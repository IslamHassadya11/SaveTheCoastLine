// Fly a "University of Haifa" plane over the coast while the sea rises.
// A three.js model is drawn inside MapLibre as a custom 3D layer; the map camera chases it.
// Flight model: simple and forgiving (thrust, drag, gravity along the flight path, lift/stall,
// coordinated turns from bank angle), tuned to feel like a light trainer aircraft.
import * as THREE from 'three';
import * as maplibregl from 'maplibre-gl';
import { map, flightTick } from './map';
import type { FloodGrid } from './flood';
import type { Site } from './data';
import { level } from './state';

const D2R = Math.PI / 180;
const EXAG = 1.35;                 // terrain exaggeration used by the 3D view
const SCALE = 3;                   // the model is drawn 3x real size so it reads well from the chase camera

export interface FlightState {
  lon: number; lat: number; alt: number;   // alt: metres above sea level
  hdg: number; pitch: number; roll: number; // degrees
  v: number; throttle: number;              // m/s, 0..1
  ground: number;                           // metres, terrain under the plane
  floor: number;                            // ground or water surface under the plane
}
type Listener = (s: FlightState, info: { crashed: boolean }) => void;

let st: FlightState | null = null;
let layer: maplibregl.CustomLayerInterface | null = null;
let raf = 0;
let grid: FloodGrid;
let onTick: Listener = () => {};
const keys = new Set<string>();
let touch = { pitch: 0, roll: 0, thr: 0 };
let camFar = false;
let crashedUntil = 0;
let savedPad: maplibregl.PaddingOptions | null = null;
let vehicle: 'plane' | 'train' = 'plane';
/** Autopilot: follow a path (coast tour or the railway) at a set speed, pausing at stops. */
interface Auto { path: [number, number][]; cum: number[]; s: number; speed: number; stops: number[]; next: number; paused: boolean; onStop: (k: number) => void; onEnd: () => void; agl: number }
let auto: Auto | null = null;
export const autoState = () => (auto ? { s: auto.s, len: auto.cum[auto.cum.length - 1], next: auto.next, paused: auto.paused } : null);
export function resumeAuto() { if (auto) auto.paused = false; }
export function pauseAuto(p: boolean) { if (auto) auto.paused = p; }
export function setAutoSpeed(v: number) { if (auto) auto.speed = v; }

export const flying = () => !!st;
if (import.meta.env.DEV) (window as any).__plane = () => (st ? { ...st, keys: [...keys] } : null);
export function setTouch(t: Partial<typeof touch>) { touch = { ...touch, ...t }; }
export function toggleCamera() { camFar = !camFar; }

// ---------------- model ----------------
// University of Haifa colours, taken from the logo
const NAVY = '#1f3346', CYAN = '#18b4e6';
const NAVY_HEX = 0x1f3346, CYAN_HEX = 0x18b4e6;

/** The university mark: two overlapping roof chevrons (navy, cyan) and a small cyan bar - a redrawn version. */
function drawMark(x: CanvasRenderingContext2D, cx: number, cy: number, w: number) {
  const h = w * 0.5, t = w * 0.16;
  const P = (u: number, v: number): [number, number] => [cx - w / 2 + u * w, cy - h / 2 + v * h];
  const chevron = (pts: [number, number][], color: string) => {
    x.strokeStyle = color; x.lineWidth = t; x.lineJoin = 'miter'; x.lineCap = 'butt';
    x.beginPath(); pts.forEach(([u, v], i) => { const [px, py] = P(u, v); if (i) x.lineTo(px, py); else x.moveTo(px, py); }); x.stroke();
  };
  chevron([[0.02, 1.0], [0.4, 0.22], [0.74, 0.86]], NAVY);
  chevron([[0.3, 1.0], [0.62, 0.34], [0.98, 1.0]], CYAN);
  x.fillStyle = CYAN; x.beginPath();
  const q = [[0.74, 0.0], [0.86, 0.0], [0.94, 0.32], [0.82, 0.32]] as [number, number][];
  q.forEach(([u, v], i) => { const [px, py] = P(u, v); if (i) x.lineTo(px, py); else x.moveTo(px, py); }); x.closePath(); x.fill();
}
function tex(c: HTMLCanvasElement) { const t = new THREE.CanvasTexture(c); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; return t; }
/** Wing top: mark + name, on white with a cyan leading-edge stripe. */
function wingTexture(text: string, font: string, rtl: boolean) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 192;
  const x = c.getContext('2d')!;
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 1024, 192);
  x.fillStyle = CYAN; x.fillRect(0, 0, 1024, 18);
  x.fillStyle = NAVY; x.fillRect(0, 174, 1024, 18);
  const markX = rtl ? 900 : 124;
  drawMark(x, markX, 96, 170);
  x.fillStyle = NAVY; x.font = font; x.textBaseline = 'middle'; x.textAlign = 'center';
  x.direction = rtl ? 'rtl' : 'ltr';
  x.fillText(text, rtl ? 430 : 594, 100, 760);
  return { canvas: c, texture: tex(c) };
}
/** Fuselage side: navy band with the three names, like the logo. */
function sideTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160;
  const x = c.getContext('2d')!;
  x.fillStyle = NAVY; x.fillRect(0, 0, 1024, 160);
  x.fillStyle = CYAN; x.fillRect(0, 140, 1024, 20);
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 52px Heebo, Arial, sans-serif'; x.fillText('אוניברסיטת חיפה', 512, 36);
  x.font = 'bold 50px Inter, Arial, sans-serif'; x.fillText('UNIVERSITY OF HAIFA', 512, 84);
  x.font = 'bold 34px Arial, sans-serif'; x.fillText('جامعة حيفا', 512, 120);
  return tex(c);
}
/** Tail fin: white with the mark. */
function finTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 512, 512);
  drawMark(x, 256, 270, 400);
  return tex(c);
}
/** If the real logo is added to the repository as public/uoh-logo.png, use it on the tail and wings. */
function useRealLogo(onLoad: (img: HTMLImageElement) => void) {
  const img = new Image();
  img.onload = () => onLoad(img);
  img.src = import.meta.env.BASE_URL + 'uoh-logo.png';
}

/** Plane in local metres: x = right wing, y = nose (forward), z = up. Real size ~ a Cessna. */
function buildPlane() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.1 });
  const navy = new THREE.MeshStandardMaterial({ color: NAVY_HEX, roughness: 0.45, metalness: 0.15 });
  const cyan = new THREE.MeshStandardMaterial({ color: CYAN_HEX, roughness: 0.4, metalness: 0.15 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0b1724, roughness: 0.1, metalness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 });

  // fuselage (along y)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.45, 7.5, 24), white); g.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), white);
  nose.position.y = 3.75; g.add(nose);
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 16), cyan); spinner.position.y = 4.75; g.add(spinner);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.765, 0.62, 3.9, 24, 1, true), navy); band.position.y = -0.55; g.add(band);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.77, 0.76, 0.25, 24, 1, true), cyan); ring.position.y = 1.5; g.add(ring);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), glass);
  cockpit.position.set(0, 1.9, 0.45); cockpit.scale.set(0.9, 1.6, 0.8); g.add(cockpit);

  // wings (high wing): mark + English on the left, mark + Hebrew on the right
  const wl = wingTexture('UNIVERSITY OF HAIFA', 'bold 74px Inter, Arial, sans-serif', false);
  const wr = wingTexture('אוניברסיטת חיפה', 'bold 84px Heebo, Arial, sans-serif', true);
  const wingGeo = new THREE.BoxGeometry(5.4, 1.5, 0.16);
  const mk = (t: THREE.Texture) => [white, white, white, white, new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }), white];
  const lw = new THREE.Mesh(wingGeo, mk(wl.texture)); lw.position.set(-2.9, 1.2, 0.85); g.add(lw);
  const rw = new THREE.Mesh(wingGeo, mk(wr.texture)); rw.position.set(2.9, 1.2, 0.85); g.add(rw);
  for (const sx of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.18), cyan); tip.position.set(sx * 5.55, 1.2, 0.85); g.add(tip);
  }
  // fuselage sides: Hebrew, English and Arabic, as in the logo
  const sideTex = sideTexture();
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.6), new THREE.MeshBasicMaterial({ map: sideTex }));
    const m4 = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, sx, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(sx, 0, 0));
    side.quaternion.setFromRotationMatrix(m4);
    side.position.set(sx * 0.775, -0.55, 0.0);
    g.add(side);
  }
  // tail: navy stabiliser, white fin with the mark on both sides
  const hstab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 0.12), navy); hstab.position.set(0, -3.5, 0.2); g.add(hstab);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 1.7), white); fin.position.set(0, -3.4, 1.05); g.add(fin);
  const finMat = new THREE.MeshBasicMaterial({ map: finTexture(), transparent: false });
  for (const sx of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), finMat);
    const m4 = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, -sx, 0).multiplyScalar(-1), new THREE.Vector3(0, 0, 1), new THREE.Vector3(sx, 0, 0));
    f.quaternion.setFromRotationMatrix(m4);
    f.position.set(sx * 0.06, -3.4, 1.08); g.add(f);
  }
  useRealLogo((img) => {
    for (const w of [wl, wr]) {
      const x = w.canvas.getContext('2d')!;
      const isR = w === wr, cx = isR ? 900 : 124;
      x.fillStyle = '#ffffff'; x.fillRect(cx - 100, 20, 200, 152);
      const s = Math.min(190 / img.width, 150 / img.height);
      x.drawImage(img, cx - (img.width * s) / 2, 96 - (img.height * s) / 2, img.width * s, img.height * s);
      w.texture.needsUpdate = true;
    }
    const c = document.createElement('canvas'); c.width = 512; c.height = 512;
    const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, 512, 512);
    const s = Math.min(480 / img.width, 480 / img.height);
    x.drawImage(img, 256 - (img.width * s) / 2, 256 - (img.height * s) / 2, img.width * s, img.height * s);
    finMat.map = tex(c); finMat.needsUpdate = true;
  });
  // propeller
  const prop = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.22), dark); prop.add(blade);
  const blade2 = blade.clone(); blade2.rotation.y = Math.PI / 2; prop.add(blade2);
  prop.position.y = 4.55; g.add(prop);
  // landing gear
  for (const [x, y] of [[-0.9, 0.6], [0.9, 0.6], [0, 3.0]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 12), dark); w.rotation.z = Math.PI / 2; w.position.set(x, y, -0.95); g.add(w);
  }
  g.scale.setScalar(SCALE);
  return { group: g, prop };
}

/** Commuter train in University of Haifa colours: 3 cars along y (forward), real size ~75 m. */
function buildTrain() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.1 });
  const navy = new THREE.MeshStandardMaterial({ color: NAVY_HEX, roughness: 0.45 });
  const cyan = new THREE.MeshStandardMaterial({ color: CYAN_HEX, roughness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0b1724, roughness: 0.15, metalness: 0.5 });
  const side = sideTexture();
  const L = 24, gap = 1.2;
  for (let c = 0; c < 3; c++) {
    const y = -c * (L + gap);
    const car = new THREE.Mesh(new THREE.BoxGeometry(3.1, L, 3.6), white); car.position.set(0, y, 2.2); g.add(car);
    const band = new THREE.Mesh(new THREE.BoxGeometry(3.14, L, 0.5), navy); band.position.set(0, y, 1.0); g.add(band);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.15, L, 0.18), cyan); stripe.position.set(0, y, 3.2); g.add(stripe);
    const win = new THREE.Mesh(new THREE.BoxGeometry(3.16, L * 0.86, 0.9), glass); win.position.set(0, y, 2.55); g.add(win);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, L * 0.95, 0.3), navy); roof.position.set(0, y, 4.1); g.add(roof);
    for (const sx of [-1, 1]) {
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.6), new THREE.MeshBasicMaterial({ map: side }));
      const m4 = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, sx, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(sx, 0, 0));
      lbl.quaternion.setFromRotationMatrix(m4); lbl.position.set(sx * 1.6, y, 1.5); g.add(lbl);
    }
  }
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 3.1, 16, 1, false, 0, Math.PI), cyan);
  nose.rotation.z = Math.PI / 2; nose.rotation.y = Math.PI / 2; nose.position.set(0, L / 2, 2.2); nose.scale.set(1, 1, 0.9); g.add(nose);
  g.scale.setScalar(1.6);
  return { group: g, prop: new THREE.Group() };
}

// ---------------- custom layer ----------------
function makeLayer(): maplibregl.CustomLayerInterface {
  let renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera;
  let plane: ReturnType<typeof buildPlane>, shadow: THREE.Mesh;
  return {
    id: 'uoh-plane', type: 'custom', renderingMode: '3d',
    onAdd(m, gl) {
      camera = new THREE.Camera();
      scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 2.2));
      const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(-0.5, -0.4, 1); scene.add(sun);
      plane = vehicle === 'train' ? buildTrain() : buildPlane(); scene.add(plane.group);
      shadow = new THREE.Mesh(new THREE.CircleGeometry(4.5 * SCALE, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
      if (vehicle !== 'train') scene.add(shadow);
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
    },
    render(_gl, args) {
      if (!st) return;
      const renderAlt = st.alt + st.ground * (EXAG - 1);   // terrain is drawn exaggerated; keep height above ground right
      const origin = maplibregl.MercatorCoordinate.fromLngLat([st.lon, st.lat], renderAlt);
      const s = origin.meterInMercatorCoordinateUnits();
      // local frame: x east, y north, z up (metres)  ->  mercator: x east, y south, z up
      const local = new THREE.Matrix4().makeTranslation(origin.x, origin.y, origin.z ?? 0).scale(new THREE.Vector3(s, -s, s));
      camera.projectionMatrix = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix as unknown as number[]).multiply(local);
      plane.group.rotation.set(0, 0, 0);
      plane.group.rotation.order = 'ZXY';
      plane.group.rotation.z = -st.hdg * D2R;      // heading (clockwise from north)
      plane.group.rotation.x = st.pitch * D2R;     // nose up
      plane.group.rotation.y = st.roll * D2R;      // right wing down
      plane.prop.rotation.y += 0.6 + st.throttle;
      const agl = Math.max(0, st.alt - st.floor);
      shadow.position.set(0, 0, -agl);
      shadow.scale.setScalar(Math.max(0.3, 1 - agl / 1500));
      renderer.resetState();
      renderer.render(scene, camera);
    },
  };
}

// ---------------- physics ----------------
function groundAt(lon: number, lat: number) {
  const e = map.queryTerrainElevation([lon, lat]);
  return e == null ? 0 : e / EXAG;
}
/** Height of the water surface under the plane, if this spot is flooded at the current sea level. */
function waterAt(lon: number, lat: number): number | null {
  const c = grid.sample(lon, lat);
  const L = level();
  if (!c) return null;
  if (c.sea) return Math.max(0, L);
  return c.fill < L ? L : null;
}

function pointAt(a: Auto, d: number): [number, number] {
  const c = a.cum; d = Math.max(0, Math.min(c[c.length - 1], d));
  let lo = 0, hi = c.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= d) lo = m; else hi = m; }
  const f = (d - c[lo]) / Math.max(1e-6, c[hi] - c[lo]);
  return [a.path[lo][0] + (a.path[hi][0] - a.path[lo][0]) * f, a.path[lo][1] + (a.path[hi][1] - a.path[lo][1]) * f];
}
function autoStep(dt: number) {
  const a = auto!, s0 = st!;
  const end = a.cum[a.cum.length - 1];
  if (!a.paused) {
    a.s = Math.min(end, a.s + a.speed * dt);
    if (a.next < a.stops.length && a.s >= a.cum[a.stops[a.next]]) { a.s = a.cum[a.stops[a.next]]; a.paused = true; const k = a.next++; a.onStop(k); }
    else if (a.s >= end) { a.paused = true; a.onEnd(); }
  }
  const [lon, lat] = pointAt(a, a.s);
  const look = vehicle === 'train' ? 60 : 900;
  const [lx, ly] = pointAt(a, a.s + look);
  const kx = 111320 * Math.cos(lat * D2R);
  if (Math.hypot((lx - lon) * kx, (ly - lat) * 110540) > 5) {
    const target = (Math.atan2((lx - lon) * kx, (ly - lat) * 110540) / D2R + 360) % 360;
    const dh = ((target - s0.hdg + 540) % 360) - 180;
    const rate = vehicle === 'train' ? 6 : 2.5;
    s0.hdg = (s0.hdg + dh * Math.min(1, dt * rate) + 360) % 360;
    s0.roll = vehicle === 'train' ? 0 : Math.max(-35, Math.min(35, dh * 0.8));
  }
  s0.lon = lon; s0.lat = lat; s0.pitch = 0;
  s0.ground = groundAt(lon, lat);
  const water = waterAt(lon, lat);
  s0.floor = Math.max(s0.ground, water ?? -1e9);
  if (vehicle === 'train') { s0.alt = s0.ground + 0.3; s0.v = a.paused ? 0 : 33; }
  else { const target = Math.max(s0.floor, s0.ground) + a.agl; s0.alt += (target - s0.alt) * Math.min(1, dt * 1.2); s0.v = a.paused ? 0 : a.speed; }
  onTick(s0, { crashed: false });
}

function step(dt: number) {
  if (!st) return;
  if (auto) { autoStep(dt); return; }
  const k = (a: string, b?: string) => keys.has(a) || (b ? keys.has(b) : false);
  const pitchIn = (k('arrowup', 'w') ? 1 : 0) - (k('arrowdown', 's') ? 1 : 0) + touch.pitch;
  const rollIn = (k('arrowright', 'd') ? 1 : 0) - (k('arrowleft', 'a') ? 1 : 0) + touch.roll;
  const yawIn = (k('e') ? 1 : 0) - (k('q') ? 1 : 0);
  const thrIn = (k('shift', '=') || k('+') ? 1 : 0) - (k('control', '-') ? 1 : 0) + touch.thr;
  st.throttle = Math.max(0, Math.min(1, st.throttle + thrIn * 0.5 * dt));

  // attitude: stick inputs, gentle self-levelling when released
  st.pitch += pitchIn * 32 * dt;
  st.roll += rollIn * 75 * dt;
  if (!rollIn) st.roll -= Math.sign(st.roll) * Math.min(Math.abs(st.roll), 28 * dt);
  if (!pitchIn) st.pitch -= Math.sign(st.pitch) * Math.min(Math.abs(st.pitch), 4 * dt);
  st.pitch = Math.max(-35, Math.min(35, st.pitch));
  st.roll = Math.max(-65, Math.min(65, st.roll));

  // speed: thrust - drag - gravity along the flight path
  const thrust = st.throttle * 11;
  const drag = 0.0011 * st.v * st.v + 0.6;
  const grav = 9.81 * Math.sin(st.pitch * D2R);
  st.v = Math.max(18, Math.min(150, st.v + (thrust - drag - grav) * dt));
  // stall: below ~30 m/s the wings stop lifting and the nose drops
  const stall = st.v < 30;
  if (stall) st.pitch -= (30 - st.v) * 2.2 * dt;

  // turning: coordinated turn from bank angle, plus a little rudder
  const turn = (9.81 * Math.tan(st.roll * D2R)) / Math.max(15, st.v) / D2R;
  st.hdg = (st.hdg + (turn + yawIn * 12) * dt + 360) % 360;

  // move
  const climb = st.v * Math.sin(st.pitch * D2R) - (stall ? (30 - st.v) * 0.6 : 0);
  const fwd = st.v * Math.cos(st.pitch * D2R) * dt;
  st.lat += (fwd * Math.cos(st.hdg * D2R)) / 110540;
  st.lon += (fwd * Math.sin(st.hdg * D2R)) / (111320 * Math.cos(st.lat * D2R));
  st.lat = Math.max(31.2, Math.min(33.5, st.lat)); st.lon = Math.max(34.0, Math.min(35.9, st.lon));
  st.alt = Math.min(3000, st.alt + climb * dt);

  // ground and water
  st.ground = groundAt(st.lon, st.lat);
  const water = waterAt(st.lon, st.lat);
  const floor = Math.max(st.ground, water ?? -1e9);
  st.floor = floor;
  let crashed = false;
  if (st.alt < floor + 4) {
    crashed = true;
    crashedUntil = performance.now() + 1800;
    st.alt = floor + 180; st.v = 55; st.pitch = 4; st.roll = 0; st.throttle = Math.max(st.throttle, 0.6);
  }
  onTick(st, { crashed: crashed || performance.now() < crashedUntil });
}

// ---------------- chase camera ----------------
function chase() {
  if (!st) return;
  // Chase camera: placed a fixed distance behind and a little above the plane, looking just past it.
  // MapLibre computes centre, zoom and pitch from the two points, so hills never push the camera away.
  const behind = vehicle === 'train' ? (camFar ? 320 : 150) : camFar ? 300 : 110;   // metres from camera to vehicle
  const up = behind * (vehicle === 'train' ? (camFar ? 0.6 : 0.4) : camFar ? 0.45 : 0.32);
  const planeZ = st.alt + st.ground * (EXAG - 1); // plane height as drawn (terrain is exaggerated)
  const hx = Math.sin(st.hdg * D2R), hy = Math.cos(st.hdg * D2R);
  const kx = 111320 * Math.cos(st.lat * D2R), ky = 110540;
  const from: [number, number] = [st.lon - (behind * hx) / kx, st.lat - (behind * hy) / ky];
  const ahead = camFar ? 120 : 60;
  const to: [number, number] = [st.lon + (ahead * hx) / kx, st.lat + (ahead * hy) / ky];
  const groundFrom = map.queryTerrainElevation(from) ?? 0;
  const camZ = Math.max(planeZ + up, groundFrom + 25);
  try {
    const o = map.calculateCameraOptionsFromTo(new maplibregl.LngLat(from[0], from[1]), camZ, new maplibregl.LngLat(to[0], to[1]), planeZ - up * 0.35) as any;
    map.jumpTo({ ...o, padding: { top: 0, bottom: 0, left: 0, right: 0 } });
  } catch { /* camera and target coincide - skip this frame */ }
}

// ---------------- start / stop ----------------
const kd = (e: KeyboardEvent) => {
  if ((e.target as HTMLElement)?.closest?.('input,textarea,select')) return;
  const key = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
  if (key === 'c') toggleCamera();
  keys.add(key === ' ' ? 'shift' : key);
};
const ku = (e: KeyboardEvent) => { const key = e.key.toLowerCase(); keys.delete(key === ' ' ? 'shift' : key); };

export interface AutoOpts { path: [number, number][]; speed: number; stops: number[]; onStop: (k: number) => void; onEnd: () => void; agl?: number }
export function startPlane(g: FloodGrid, site: Site, listener: Listener, opts?: { vehicle?: 'plane' | 'train'; auto?: AutoOpts }) {
  grid = g; onTick = listener;
  if (st) return;
  vehicle = opts?.vehicle ?? 'plane';
  auto = null;
  if (opts?.auto) {
    const p = opts.auto.path, cum = [0];
    for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot((p[i][0] - p[i - 1][0]) * 111320 * Math.cos(p[i][1] * D2R), (p[i][1] - p[i - 1][1]) * 110540));
    auto = { path: p, cum, s: 0, speed: opts.auto.speed, stops: opts.auto.stops, next: 0, paused: false, onStop: opts.auto.onStop, onEnd: opts.auto.onEnd, agl: opts.auto.agl ?? 300 };
    // skip a stop at the very start; the caller shows it straight away
    if (auto.stops[0] === 0) auto.next = 1;
  }
  // free flight starts offshore, facing the coast, 250 m up; autopilot starts on its path
  const back = 2200, hdg = (site.bearing + 360) % 360;
  const p0 = auto ? auto.path[0] : null, p1 = auto ? auto.path[Math.min(3, auto.path.length - 1)] : null;
  st = {
    lat: p0 ? p0[1] : site.lat - (back * Math.cos(hdg * D2R)) / 110540,
    lon: p0 ? p0[0] : site.lon - (back * Math.sin(hdg * D2R)) / (111320 * Math.cos(site.lat * D2R)),
    alt: vehicle === 'train' ? 0 : auto ? auto.agl : 250,
    hdg: p0 && p1 ? (Math.atan2((p1[0] - p0[0]) * Math.cos(p0[1] * D2R), p1[1] - p0[1]) / D2R + 360) % 360 : hdg,
    pitch: 0, roll: 0, v: 55, throttle: 0.55, ground: 0, floor: 0,
  };
  savedPad = map.getPadding();
  camFar = false;           // always start with the close camera
  // let the camera look at a point in the air (the plane) instead of pinning it to the ground
  map.setCenterClampedToGround(false);
  map.stop();               // cancel any camera animation still running
  if (layer && map.getLayer('uoh-plane')) map.removeLayer('uoh-plane');
  layer = makeLayer(); map.addLayer(layer);
  map.keyboard.disable(); map.dragRotate.disable(); map.dragPan.disable(); map.scrollZoom.disable(); map.touchZoomRotate.disable();
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  let last = performance.now();
  const loop = (ts: number) => {
    if (!st) return;
    // real time, in small physics steps, whatever the frame rate
    let dt = Math.min(0.5, (ts - last) / 1000); last = ts;
    while (dt > 1e-4) { const h = Math.min(0.04, dt); step(h); dt -= h; }
    chase(); flightTick();
    map.triggerRepaint();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}

export function stopPlane() {
  if (!st) return;
  st = null; auto = null; cancelAnimationFrame(raf); keys.clear(); touch = { pitch: 0, roll: 0, thr: 0 };
  window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
  map.keyboard.enable(); map.dragRotate.enable(); map.dragPan.enable(); map.scrollZoom.enable(); map.touchZoomRotate.enable();
  if (layer && map.getLayer('uoh-plane')) map.removeLayer('uoh-plane');
  if (savedPad) map.setPadding(savedPad);
  map.setCenterClampedToGround(true);
  layer = null;
  map.triggerRepaint();
}
