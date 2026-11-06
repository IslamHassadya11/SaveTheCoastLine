// Flood engine: decodes the coastal grid and paints flooded cells for any sea level.
// Grid encoding (see scripts/build_dem.py):
//   E byte = (ground m + 1) * 10, 255 = open sea
//   D byte = (fill level - ground) * 10, fill level = lowest sea level that reaches the cell
import type { FloodIndex, Chunk } from './data';

export interface ChunkData {
  meta: Chunk;
  E: Uint8Array;           // CHUNK*CHUNK
  F: Uint16Array;          // E + D (encoded fill level)
  seaFade: Uint8Array;     // 0..255 alpha for sea cells near land (photoreal mode)
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  img: ImageData;
  px: Uint32Array;
  minF: number;            // lowest encoded fill level of any land cell
}

export interface CellInfo { ground: number; fill: number; sea: boolean }

const enc = (m: number) => Math.round((m + 1) * 10);

function rgba(r: number, g: number, b: number, a: number) {
  return ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
}
function hex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpColor(stops: [number, string, number][], d: number) {
  let i = 0;
  while (i < stops.length - 2 && d > stops[i + 1][0]) i++;
  const [d0, c0, a0] = stops[i], [d1, c1, a1] = stops[i + 1];
  const f = Math.max(0, Math.min(1, (d - d0) / (d1 - d0)));
  const A = hex(c0), B = hex(c1);
  return rgba(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f, (a0 + (a1 - a0) * f) * 255);
}

// depth (decimetres) -> colour lookup tables
const DEPTH_STOPS: [number, string, number][] = [
  [0, '#cffafe', 0.92], [2, '#67e8f9', 0.85], [8, '#22a7e0', 0.82], [25, '#0369a1', 0.84], [60, '#0c3b6e', 0.88], [200, '#071d3d', 0.9],
];
const SAVED_STOPS: [number, string, number][] = [
  [0, '#fed7aa', 0.95], [5, '#fb923c', 0.9], [30, '#ea580c', 0.9], [200, '#9a3412', 0.92],
];
const LUT = new Uint32Array(600), LUT_SAVED = new Uint32Array(600);
for (let d = 0; d < 600; d++) { LUT[d] = lerpColor(DEPTH_STOPS, d); LUT_SAVED[d] = lerpColor(SAVED_STOPS, d); }

export class FloodGrid {
  chunks: ChunkData[] = [];
  private byKey = new Map<string, ChunkData>();
  res: number; C: number; N: number; W: number;

  constructor(public index: FloodIndex, raw: Uint8Array) {
    this.res = index.res; this.C = index.chunk; this.W = index.bounds[0]; this.N = index.bounds[3];
    const C = this.C, CC = C * C;
    for (const meta of index.chunks) {
      const E = raw.subarray(meta.off, meta.off + CC);
      const D = raw.subarray(meta.off + CC, meta.off + 2 * CC);
      const F = new Uint16Array(CC);
      let minF = 9999;
      for (let i = 0; i < CC; i++) {
        F[i] = E[i] + D[i];
        if (E[i] !== 255 && F[i] < minF) minF = F[i];
      }
      const canvas = document.createElement('canvas');
      canvas.width = C; canvas.height = C;
      const ctx = canvas.getContext('2d', { willReadFrequently: false })!;
      const img = ctx.createImageData(C, C);
      const cd: ChunkData = { meta, E, F, seaFade: new Uint8Array(0), canvas, ctx, img, px: new Uint32Array(img.data.buffer), minF };
      this.chunks.push(cd);
      this.byKey.set(`${meta.row / C},${meta.col / C}`, cd);
    }
  }

  /** Ground elevation & fill level at a point, or null outside the low-lying study area. */
  sample(lon: number, lat: number): CellInfo | null {
    const r = Math.floor((this.N - lat) / this.res), c = Math.floor((lon - this.W) / this.res);
    if (r < 0 || c < 0) return null;
    const ch = this.byKey.get(`${Math.floor(r / this.C)},${Math.floor(c / this.C)}`);
    if (!ch) return null;
    const i = (r % this.C) * this.C + (c % this.C);
    const e = ch.E[i];
    if (e === 255) return { ground: 0, fill: 0, sea: true };
    if (e >= 254) return null; // at or above the 24 m ceiling of the grid
    return { ground: e / 10 - 1, fill: ch.F[i] / 10 - 1, sea: false };
  }

  /**
   * Paint all chunks. `level` = sea level (m). If `saved` is given (a higher level), cells that flood
   * only at the higher level are painted orange: the coast saved by the lower-emission path.
   * Returns the chunks that changed.
   */
  render(level: number, saved: number | null = null): ChunkData[] {
    const L = enc(level), H = saved != null ? enc(saved) : -1;
    const top = Math.max(L, H);
    const changed: ChunkData[] = [];
    for (const ch of this.chunks) {
      const { E, F, px } = ch;
      const wasEmpty = (ch as any)._empty === true;
      if (ch.minF >= top) {
        if (!wasEmpty) { px.fill(0); ch.ctx.putImageData(ch.img, 0, 0); (ch as any)._empty = true; changed.push(ch); }
        continue;
      }
      (ch as any)._empty = false;
      for (let i = 0; i < px.length; i++) {
        const e = E[i];
        if (e === 255) { px[i] = 0; continue; }
        const f = F[i];
        if (f < L) px[i] = LUT[Math.min(599, L - e)];
        else if (f < H) px[i] = LUT_SAVED[Math.min(599, H - e)];
        else px[i] = 0;
      }
      ch.ctx.putImageData(ch.img, 0, 0);
      changed.push(ch);
    }
    return changed;
  }

  /** For photoreal mode: an image that also paints the sea near the shore, fading out offshore. */
  renderPhoto(ch: ChunkData, level: number, out: HTMLCanvasElement) {
    if (!ch.seaFade.length) ch.seaFade = seaFade(ch.E, this.C);
    const L = enc(level), C = this.C;
    out.width = C; out.height = C;
    const ctx = out.getContext('2d')!;
    const img = ctx.createImageData(C, C);
    const px = new Uint32Array(img.data.buffer);
    const sea = rgba(14, 116, 168, 0);
    for (let i = 0; i < px.length; i++) {
      const e = ch.E[i];
      if (e === 255) { const a = ch.seaFade[i]; px[i] = a ? (sea | (((a * 0.85) | 0) << 24)) >>> 0 : 0; continue; }
      px[i] = ch.F[i] < L ? LUT[Math.min(599, L - e)] : 0;
    }
    ctx.putImageData(img, 0, 0);
    return out;
  }
}

// Alpha for sea cells, 255 at the shoreline fading to 0 about 1.5 km offshore (BFS distance).
function seaFade(E: Uint8Array, C: number) {
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
  const out = new Uint8Array(E.length);
  for (let i = 0; i < E.length; i++) if (E[i] === 255) out[i] = dist[i] > D ? 0 : Math.round(255 * (1 - dist[i] / D));
  return out;
}
