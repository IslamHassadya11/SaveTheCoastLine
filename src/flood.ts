// Flood engine: decodes the coastal grid and paints flooded cells for any sea level.
// Grid encoding (see scripts/build_dem.py), three bytes per cell:
//   E = (ground m + 1) * 10, 255 = open sea
//   D = (fill level - ground) * 10, fill level = lowest sea level that reaches the cell from the sea
//   R = distance from today's shoreline / 20 m (illustration mode: erosion moves the shore inland)
import type { FloodIndex, Chunk, Retreat } from './data';
import { classicFactor } from './classic';

export type FloodStyle = 'real' | 'illus' | 'classic';
export interface ChunkData {
  meta: Chunk;
  E: Uint8Array; F: Uint16Array; R: Uint8Array;
  rowRetreat: Float32Array;   // shoreline retreat (m per m of sea level) for each row
  rowClassic: Float32Array;   // same, with the original lab's per-place distances (classic view in 3D)
  minF: number; minRm: number; maxRetreat: number;
  seaFade: Uint8Array;
  seaDist: Uint8Array;       // sea cells: distance to land in cells (255 = far); land = 0
}
export interface CellInfo { ground: number; fill: number; sea: boolean; dist: number; retreat: number; fillIllus: number }

const enc = (m: number) => Math.round((m + 1) * 10);
const rgba = (r: number, g: number, b: number, a: number) => (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
const hex = (h: string): [number, number, number] => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/** Water colours: the base map's own sea colour, a touch deeper with depth, and a white foam edge. */
export const WATER = {
  map: { shallow: '#9ebdff', deep: '#6f97ec', alpha: 0.94 },   // OpenFreeMap "liberty" sea is rgb(158,189,255)
  sat: { shallow: '#2a6f9e', deep: '#123f63', alpha: 0.9 },
};
function ramp(a: string, b: string, alpha: number) {
  const A = hex(a), B = hex(b), out = new Uint32Array(64);
  for (let i = 0; i < 64; i++) { const f = Math.min(1, i / 40); out[i] = rgba(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f, alpha * 255); }
  return out;
}
const LUTS = { map: ramp(WATER.map.shallow, WATER.map.deep, WATER.map.alpha), sat: ramp(WATER.sat.shallow, WATER.sat.deep, WATER.sat.alpha) };
// edge of the water: a slightly deeper blue (a white line looked like noise around every dry patch)
const EDGE = { map: rgba(92, 132, 222, 245), sat: rgba(10, 45, 75, 235) };

export interface RenderOpts { level: number; style: FloodStyle; sat: boolean }

export class FloodGrid {
  chunks: ChunkData[] = [];
  private byKey = new Map<string, number>();
  res: number; C: number; N: number; W: number;
  private rt: Retreat;

  constructor(public index: FloodIndex, raw: Uint8Array, retreat: Retreat) {
    this.res = index.res; this.C = index.chunk; this.W = index.bounds[0]; this.N = index.bounds[3];
    this.rt = retreat;
    const C = this.C, CC = C * C;
    index.chunks.forEach((meta, k) => {
      const E = raw.subarray(meta.off, meta.off + CC);
      const D = raw.subarray(meta.off + CC, meta.off + 2 * CC);
      const R = raw.subarray(meta.off + 2 * CC, meta.off + 3 * CC);
      const F = new Uint16Array(CC);
      let minF = 9999, minR = 255;
      for (let i = 0; i < CC; i++) {
        F[i] = E[i] + D[i];
        if (E[i] !== 255) { if (F[i] < minF) minF = F[i]; if (R[i] < minR) minR = R[i]; }
      }
      const rowRetreat = new Float32Array(C);
      let maxRetreat = 0;
      const rowClassic = new Float32Array(C);
      for (let r = 0; r < C; r++) {
        const lat = meta.n - (r + 0.5) * this.res;
        rowRetreat[r] = this.retreatAt(lat); rowClassic[r] = classicFactor(lat) * 1.15;
        maxRetreat = Math.max(maxRetreat, rowRetreat[r], rowClassic[r]);
      }
      this.chunks.push({ meta, E, F, R, rowRetreat, rowClassic, minF, minRm: minR * 20, maxRetreat, seaFade: new Uint8Array(0), seaDist: seaDistance(E, C) });
      this.byKey.set(`${meta.row / C},${meta.col / C}`, k);
    });
  }

  /** Illustration: metres the shoreline moves inland per metre of sea level rise, by latitude. */
  retreatAt(lat: number): number {
    const p = this.rt.points;
    if (lat <= p[0].lat) return p[0].m_per_m;
    for (let i = 0; i < p.length - 1; i++) {
      if (lat <= p[i + 1].lat) { const f = (lat - p[i].lat) / (p[i + 1].lat - p[i].lat); return p[i].m_per_m + (p[i + 1].m_per_m - p[i].m_per_m) * f; }
    }
    return p[p.length - 1].m_per_m;
  }

  sample(lon: number, lat: number): CellInfo | null {
    const r = Math.floor((this.N - lat) / this.res), c = Math.floor((lon - this.W) / this.res);
    if (r < 0 || c < 0) return null;
    const k = this.byKey.get(`${Math.floor(r / this.C)},${Math.floor(c / this.C)}`);
    if (k == null) return null;
    const ch = this.chunks[k];
    const i = (r % this.C) * this.C + (c % this.C);
    const e = ch.E[i];
    if (e === 255) return { ground: 0, fill: 0, sea: true, dist: 0, retreat: 1, fillIllus: 0 };
    if (e >= 254) return null;
    const fill = ch.F[i] / 10 - 1, dist = ch.R[i] * 20, retreat = this.retreatAt(lat);
    return { ground: e / 10 - 1, fill, sea: false, dist, retreat, fillIllus: Math.min(fill, dist / retreat) };
  }

  newTarget() { return new FloodTarget(this); }

  /** Photoreal mode: same water, plus the sea near the shore so the whole surface rises. */
  renderPhoto(ch: ChunkData, o: RenderOpts, out: HTMLCanvasElement) {
    if (!ch.seaFade.length) ch.seaFade = fadeFrom(ch.seaDist, ch.E);
    const C = this.C; out.width = C; out.height = C;
    const ctx = out.getContext('2d')!;
    const img = ctx.createImageData(C, C);
    const px = new Uint32Array(img.data.buffer);
    const L = enc(o.level), lut = LUTS.sat;
    for (let r = 0; r < C; r++) {
      const Rt = o.style === 'illus' ? (o.level * ch.rowRetreat[r]) / 20 : -1;
      for (let c = 0; c < C; c++) {
        const i = r * C + c, e = ch.E[i];
        if (e === 255) { const a = ch.seaFade[i]; px[i] = a ? rgba(14, 116, 168, a * 0.85) : 0; continue; }
        px[i] = ch.F[i] < L || ch.R[i] < Rt ? lut[Math.max(0, Math.min(63, L - e))] : 0;
      }
    }
    ctx.putImageData(img, 0, 0);
    return out;
  }
}

/** One set of canvases (one per chunk) that a map displays. */
// Beaches and surf zones are often masked as water in the elevation model, so the base map's sand
// shows through. Sea cells this close to land are treated as ~1 m high beach.
const SHORE_CELLS = 12, BEACH_M = 0.8;

export class FloodTarget {
  layers: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; img: ImageData; px: Uint32Array; empty: boolean; key: string }[] = [];
  private wet: Uint8Array;
  constructor(private g: FloodGrid) {
    const C = g.C;
    this.wet = new Uint8Array(C * C);
    for (let k = 0; k < g.chunks.length; k++) {
      const canvas = document.createElement('canvas'); canvas.width = C; canvas.height = C;
      const ctx = canvas.getContext('2d')!;
      const img = ctx.createImageData(C, C);
      this.layers.push({ canvas, ctx, img, px: new Uint32Array(img.data.buffer), empty: false, key: '' });
    }
  }

  /** Forget what was drawn, e.g. after the graphics context was reset. */
  invalidate() { for (const l of this.layers) l.key = ''; }

  /**
   * Paint the chunks for sea level `o.level`. Only chunks for which `visible(k)` is true are painted now;
   * the rest are left for later (call again after the map moves). A chunk whose picture would not change
   * is skipped, so dragging a slider uploads as little as possible to the graphics card.
   * Returns indices of chunks whose image changed.
   */
  render(o: RenderOpts, visible: (k: number) => boolean = () => true): number[] {
    const g = this.g, C = g.C, L = enc(o.level), illus = o.style === 'illus' || o.style === 'classic', cls = o.style === 'classic';
    const lvl = L / 10 - 1;   // level rounded to the 0.1 m steps of the data
    const lut = o.sat ? LUTS.sat : LUTS.map, edge = o.sat ? EDGE.sat : EDGE.map;
    const beachA = Math.max(0, Math.min(1, (lvl - BEACH_M) / 0.7));
    const shore = ((lut[0] & 0xffffff) | (Math.round(((lut[0] >>> 24) & 255) * beachA) << 24)) >>> 0;
    const key = `${L}|${o.style}|${o.sat}`;
    const changed: number[] = [];
    const wet = this.wet;
    g.chunks.forEach((ch, k) => {
      const lay = this.layers[k];
      if (lay.key === key || !visible(k)) return;
      lay.key = key;
      const none = lvl < BEACH_M && ch.minF >= L && (!illus || ch.minRm >= lvl * ch.maxRetreat);
      if (none) {
        if (!lay.empty) { lay.px.fill(0); lay.ctx.putImageData(lay.img, 0, 0); lay.empty = true; changed.push(k); }
        return;
      }
      lay.empty = false;
      const { E, F, R, seaDist } = ch, px = lay.px;
      const beach = beachA > 0;
      // pass 1: which cells are under water (2 = beach masked as sea in the elevation data)
      for (let r = 0; r < C; r++) {
        const Rt = illus ? (lvl * (cls ? ch.rowClassic[r] : ch.rowRetreat[r])) / 20 : -1;
        const base = r * C;
        for (let c = 0; c < C; c++) {
          const i = base + c;
          if (E[i] === 255) wet[i] = beach && seaDist[i] <= SHORE_CELLS ? 2 : 0;
          else wet[i] = F[i] < L || R[i] < Rt ? 1 : 0;
        }
      }
      // pass 2: colour, with a foam line where the water meets dry land
      for (let r = 0; r < C; r++) {
        const base = r * C;
        for (let c = 0; c < C; c++) {
          const i = base + c;
          if (!wet[i]) { px[i] = 0; continue; }
          if (wet[i] === 2) { px[i] = shore; continue; }
          const dryN = (c > 0 && !wet[i - 1] && E[i - 1] !== 255) || (c < C - 1 && !wet[i + 1] && E[i + 1] !== 255) ||
            (r > 0 && !wet[i - C] && E[i - C] !== 255) || (r < C - 1 && !wet[i + C] && E[i + C] !== 255);
          px[i] = dryN ? edge : lut[Math.max(0, Math.min(63, L - E[i]))];
        }
      }
      lay.ctx.putImageData(lay.img, 0, 0);
      changed.push(k);
    });
    return changed;
  }
}

// Distance (in cells, up to 50) from each sea cell to the nearest land cell; land = 0, far sea = 255.
function seaDistance(E: Uint8Array, C: number) {
  const D = 50;
  const dist = new Uint8Array(E.length).fill(255);
  const q = new Int32Array(E.length); let qh = 0, qt = 0;
  for (let i = 0; i < E.length; i++) if (E[i] !== 255) { dist[i] = 0; q[qt++] = i; }
  while (qh < qt) {
    const i = q[qh++], d = dist[i];
    if (d >= D) continue;
    const r = (i / C) | 0, c = i % C;
    const nb = [c > 0 ? i - 1 : -1, c < C - 1 ? i + 1 : -1, r > 0 ? i - C : -1, r < C - 1 ? i + C : -1];
    for (const j of nb) if (j >= 0 && dist[j] > d + 1) { dist[j] = d + 1; q[qt++] = j; }
  }
  return dist;
}
// Alpha for sea cells: 255 at the shoreline fading to 0 about 1.5 km offshore.
function fadeFrom(dist: Uint8Array, E: Uint8Array) {
  const out = new Uint8Array(E.length);
  for (let i = 0; i < E.length; i++) if (E[i] === 255) out[i] = dist[i] > 50 ? 0 : Math.round(255 * (1 - dist[i] / 50));
  return out;
}
