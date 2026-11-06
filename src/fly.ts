// Camera flights: tour along the coast, orbit a place, and free "drone" flying with the keyboard.
import { map } from './map';
import type { Site } from './data';

let raf = 0;
let mode: null | 'tour' | 'orbit' | 'drone' = null;
const listeners: ((m: typeof mode) => void)[] = [];
export function onFlightChange(fn: (m: typeof mode) => void) { listeners.push(fn); }
function setMode(m: typeof mode) { mode = m; listeners.forEach((f) => f(m)); }
export function flightMode() { return mode; }

export function stopFlight() {
  cancelAnimationFrame(raf); raf = 0;
  if (mode === 'drone') { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); map.keyboard.enable(); }
  setMode(null);
}
const interrupt = () => { if (mode === 'tour' || mode === 'orbit') stopFlight(); };

function bindInterrupt() {
  const c = map.getCanvasContainer();
  for (const ev of ['mousedown', 'touchstart', 'wheel']) c.addEventListener(ev, interrupt, { once: true, passive: true });
}

// ---- coast tour: a smooth path through all sites, north to south ----
export function startTour(sites: Site[], onSite?: (s: Site) => void) {
  stopFlight();
  // path offshore of each site so the camera looks at the coast from the sea
  const pts = sites.map((s) => [s.lon - 0.012, s.lat] as [number, number]);
  const M = 111320, cos = Math.cos((32.4 * Math.PI) / 180);
  const seg: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    const dx = (pts[i][0] - pts[i - 1][0]) * M * cos, dy = (pts[i][1] - pts[i - 1][1]) * M;
    seg.push(seg[i - 1] + Math.hypot(dx, dy));
  }
  const total = seg[seg.length - 1];
  const speed = 650; // m/s
  const at = (d: number) => {
    let i = 0; while (i < seg.length - 2 && d > seg[i + 1]) i++;
    const f = (d - seg[i]) / (seg[i + 1] - seg[i] || 1);
    // Catmull-Rom for a smooth line
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cr = (a: number, b: number, c: number, d2: number) => 0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d2) * f * f + (-a + 3 * b - 3 * c + d2) * f * f * f);
    return { lon: cr(p0[0], p1[0], p2[0], p3[0]), lat: cr(p0[1], p1[1], p2[1], p3[1]), i: f > 0.5 ? i + 1 : i };
  };
  map.flyTo({ center: pts[0], zoom: 13.6, pitch: 70, bearing: 160, duration: 2500, essential: true });
  setMode('tour');
  let start = 0, lastSite = -1, bearing = 160;
  const step = (ts: number) => {
    if (mode !== 'tour') return;
    if (!start) start = ts;
    const d = ((ts - start) / 1000) * speed;
    if (d >= total) { stopFlight(); return; }
    const p = at(d), ahead = at(Math.min(total, d + 2500));
    const heading = (Math.atan2((ahead.lon - p.lon) * cos, ahead.lat - p.lat) * 180) / Math.PI;
    // look ahead along the coast, turned a little towards the land (east)
    const target = heading + 28;
    bearing += ((((target - bearing) % 360) + 540) % 360 - 180) * 0.03;
    map.jumpTo({ center: [p.lon, p.lat], bearing, pitch: 70, zoom: 13.6 });
    if (p.i !== lastSite) { lastSite = p.i; onSite?.(sites[p.i]); }
    raf = requestAnimationFrame(step);
  };
  setTimeout(() => { if (mode === 'tour') { bindInterrupt(); raf = requestAnimationFrame(step); } }, 2600);
}

// ---- orbit a place ----
export function startOrbit(site: Site) {
  stopFlight();
  map.flyTo({ center: [site.lon, site.lat], zoom: site.zoom + 0.3, pitch: 66, bearing: site.bearing, duration: 2500, essential: true });
  setMode('orbit');
  setTimeout(() => {
    if (mode !== 'orbit') return;
    bindInterrupt();
    let last = 0;
    const step = (ts: number) => {
      if (mode !== 'orbit') return;
      const dt = last ? (ts - last) / 1000 : 0; last = ts;
      map.setBearing(map.getBearing() + dt * 6);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }, 2600);
}

// ---- drone: keyboard flying ----
const keys = new Set<string>();
const kd = (e: KeyboardEvent) => {
  if ((e.target as HTMLElement)?.closest('input,textarea,select')) return;
  if (e.key === 'Escape') { stopFlight(); return; }
  keys.add(e.key.toLowerCase()); if (e.shiftKey) keys.add('shift'); else keys.delete('shift');
};
const ku = (e: KeyboardEvent) => { keys.delete(e.key.toLowerCase()); if (!e.shiftKey) keys.delete('shift'); };
export function startDrone() {
  stopFlight();
  setMode('drone');
  map.keyboard.disable();
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  if (map.getPitch() < 50) map.easeTo({ pitch: 68, duration: 800 });
  let last = 0;
  const step = (ts: number) => {
    if (mode !== 'drone') return;
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
    const z = map.getZoom();
    const mps = (keys.has('shift') ? 3 : 1) * 40 * 2 ** (17 - z); // speed scales with altitude
    let fwd = 0, side = 0, turn = 0, tilt = 0, climb = 0;
    if (keys.has('w') || keys.has('arrowup')) fwd += 1;
    if (keys.has('s') || keys.has('arrowdown')) fwd -= 1;
    if (keys.has('d')) side += 1;
    if (keys.has('a')) side -= 1;
    if (keys.has('e') || keys.has('arrowright')) turn += 1;
    if (keys.has('q') || keys.has('arrowleft')) turn -= 1;
    if (keys.has('r')) tilt += 1;
    if (keys.has('f')) tilt -= 1;
    if (keys.has('z') || keys.has('-')) climb -= 1;
    if (keys.has('x') || keys.has('=') || keys.has('+')) climb += 1;
    if (fwd || side || turn || tilt || climb) {
      const b = (map.getBearing() * Math.PI) / 180;
      const c = map.getCenter();
      const dx = (Math.sin(b) * fwd + Math.cos(b) * side) * mps * dt;
      const dy = (Math.cos(b) * fwd - Math.sin(b) * side) * mps * dt;
      const lat = c.lat + dy / 110540;
      const lon = c.lng + dx / (111320 * Math.cos((c.lat * Math.PI) / 180));
      map.jumpTo({
        center: [lon, lat], bearing: map.getBearing() + turn * 45 * dt,
        pitch: Math.max(0, Math.min(80, map.getPitch() + tilt * 30 * dt)), zoom: z - climb * 0.8 * dt,
      });
    }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}
