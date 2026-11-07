// "Classic" water view: the original Rising Tides lab's continuous animated water layer,
// ported from its Leaflet canvas renderer to draw over the MapLibre map(s).
// It is an illustration: the coastline is moved inland by (sea level x a set distance per metre)
// along a hand-drawn coastline, with rivers filling and animated waves. Same numbers as the original.
import type { Map as MLMap } from 'maplibre-gl';

// [lat, lng, metres inland per 1 m of sea level, river mouth]  (north -> south, from the original lab)
export const VERTS: [number, number, number, boolean][] = [
  [33.0940, 35.1042, 18, false], [33.0720, 35.1030, 55, false], [33.0520, 35.1012, 70, false], [33.0250, 35.0965, 85, false],
  [33.0058, 35.0915, 195, true], [32.9850, 35.0875, 90, false], [32.9550, 35.0815, 110, false], [32.9275, 35.0755, 145, false],
  [32.9210, 35.0668, 45, false], [32.9175, 35.0765, 180, true], [32.8950, 35.0785, 175, false], [32.8620, 35.0680, 185, false],
  [32.8320, 35.0510, 210, false], [32.8085, 35.0310, 290, true], [32.8180, 35.0020, 75, false], [32.8335, 34.9850, 55, false],
  [32.8280, 34.9555, 35, false], [32.7950, 34.9565, 80, false], [32.7480, 34.9480, 110, false], [32.7052, 34.9342, 220, true],
  [32.6650, 34.9265, 130, false], [32.6350, 34.9210, 145, false], [32.6080, 34.9160, 165, true], [32.5780, 34.9110, 190, false],
  [32.5535, 34.9050, 260, true], [32.5250, 34.8965, 150, false], [32.5015, 34.8890, 115, false], [32.4650, 34.8825, 160, true],
  [32.4380, 34.8755, 140, false], [32.3965, 34.8648, 230, true], [32.3620, 34.8565, 65, false], [32.3285, 34.8480, 42, false],
  [32.2820, 34.8370, 48, false], [32.2150, 34.8180, 52, false], [32.1650, 34.7965, 75, false], [32.1280, 34.7845, 85, false],
  [32.0990, 34.7742, 280, true], [32.0805, 34.7662, 115, false], [32.0660, 34.7595, 110, false], [32.0522, 34.7490, 55, false],
  [32.0180, 34.7380, 95, false], [31.9650, 34.7180, 125, false], [31.9280, 34.6985, 185, true], [31.8520, 34.6615, 175, true],
  [31.8050, 34.6360, 120, false], [31.7250, 34.5920, 135, false], [31.6680, 34.5520, 95, false], [31.6050, 34.5150, 155, true],
];
const ESTUARIES: { minSlr: number; path: [number, number][]; widthMeters: number }[] = [
  { minSlr: 0.15, widthMeters: 55, path: [[33.0058, 35.0915], [33.0059, 35.0955], [33.0061, 35.0995], [33.0063, 35.1045]] },
  { minSlr: 0.10, widthMeters: 165, path: [[32.8085, 35.0310], [32.8045, 35.0385], [32.7980, 35.0465], [32.7915, 35.0550], [32.7830, 35.0640]] },
  { minSlr: 0.20, widthMeters: 85, path: [[32.9120, 35.0780], [32.9080, 35.0845], [32.9010, 35.0910]] },
  { minSlr: 0.10, widthMeters: 140, path: [[32.5535, 34.9050], [32.5525, 34.9120], [32.5505, 34.9195], [32.5485, 34.9260]] },
  { minSlr: 0.15, widthMeters: 95, path: [[32.3965, 34.8648], [32.3945, 34.8720], [32.3920, 34.8805]] },
  { minSlr: 0.10, widthMeters: 130, path: [[32.0990, 34.7742], [32.0975, 34.7815], [32.0965, 34.7895], [32.0982, 34.7985], [32.1010, 34.8080]] },
  { minSlr: 0.15, widthMeters: 95, path: [[31.8320, 34.6510], [31.8290, 34.6585], [31.8240, 34.6660]] },
];

const eastLng = (m: number, lat: number) => m / (111320 * Math.cos((lat * Math.PI) / 180));

/** Metres the classic coastline moves inland per metre of sea level, at a latitude (used for buildings). */
export function classicFactor(lat: number): number {
  const v = VERTS;
  if (lat >= v[0][0]) return v[0][2];
  for (let i = 0; i < v.length - 1; i++) {
    if (lat >= v[i + 1][0]) { const f = (v[i][0] - lat) / (v[i][0] - v[i + 1][0]); return v[i][2] + (v[i + 1][2] - v[i][2]) * f; }
  }
  return v[v.length - 1][2];
}
/** The classic coastline's longitude at a latitude. */
function coastLng(lat: number): number {
  const v = VERTS;
  if (lat >= v[0][0]) return v[0][1];
  for (let i = 0; i < v.length - 1; i++) {
    if (lat >= v[i + 1][0]) { const f = (v[i][0] - lat) / (v[i][0] - v[i + 1][0]); return v[i][1] + (v[i + 1][1] - v[i][1]) * f; }
  }
  return v[v.length - 1][1];
}

type Pt = { x: number; y: number };
function smooth(ctx: CanvasRenderingContext2D, p: Pt[]) {
  if (p.length < 2) return;
  ctx.moveTo(p[0].x, p[0].y);
  for (let i = 0; i < p.length - 1; i++) ctx.quadraticCurveTo(p[i].x, p[i].y, (p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2);
  ctx.lineTo(p[p.length - 1].x, p[p.length - 1].y);
}

export interface ClassicFrame { map: MLMap; level: number; clip?: [number, number]; site?: { lat: number; lon: number } }

export class ClassicLayer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private phase = 0;
  private raf = 0;
  constructor(parent: HTMLElement, private frames: () => ClassicFrame[]) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'classicCanvas';
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
  }
  get running() { return !!this.raf; }
  start() {
    if (this.raf) return;
    this.canvas.hidden = false;
    const tick = () => { this.phase += 0.045; this.draw(); this.raf = requestAnimationFrame(tick); };
    this.raf = requestAnimationFrame(tick);
  }
  stop() {
    cancelAnimationFrame(this.raf); this.raf = 0;
    this.canvas.hidden = true;
  }

  private draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    if (this.canvas.width !== Math.round(W * dpr) || this.canvas.height !== Math.round(H * dpr)) {
      this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const f of this.frames()) {
      ctx.save();
      if (f.clip) { ctx.beginPath(); ctx.rect(f.clip[0], 0, f.clip[1] - f.clip[0], H); ctx.clip(); }
      this.drawFrame(ctx, f, W);
      ctx.restore();
    }
  }

  /** The original renderContinuousHydroOverlay2D, step for step. */
  private drawFrame(ctx: CanvasRenderingContext2D, f: ClassicFrame, width: number) {
    const map = f.map, phase = this.phase;
    const P = (lat: number, lng: number): Pt => map.project([lng, lat]);
    const water = f.level + (Math.sin(phase) * 0.04 + 0.04);   // gentle wave oscillation
    const base: Pt[] = [], flood: Pt[] = [], west: Pt[] = [];
    VERTS.forEach(([lat, lng, run, est], i) => {
      base.push(P(lat, lng));
      const harmonic = 1.0 + 0.14 * Math.sin(i * 1.7 + phase * 0.6);
      const inland = water * run * harmonic * (est ? 1.35 : 1.0);
      flood.push(P(lat, lng + eastLng(inland, lat)));
      west.push(P(lat, lng - 0.18));
    });

    if (water > 0.005) {
      // continuous sea advancing over the coast
      ctx.beginPath();
      smooth(ctx, flood);
      for (let i = west.length - 1; i >= 0; i--) ctx.lineTo(west[i].x, west[i].y);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, width * 0.78, 0);
      grad.addColorStop(0.0, 'rgba(7, 42, 71, 0.42)');
      grad.addColorStop(0.45, 'rgba(13, 92, 145, 0.56)');
      grad.addColorStop(0.80, 'rgba(28, 163, 236, 0.68)');
      grad.addColorStop(1.0, 'rgba(90, 210, 244, 0.76)');
      ctx.fillStyle = grad; ctx.fill();
      // the newly submerged strip between today's coast and the new shoreline
      ctx.beginPath();
      smooth(ctx, flood);
      for (let i = base.length - 1; i >= 0; i--) ctx.lineTo(base[i].x, base[i].y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(14, 165, 233, 0.58)'; ctx.fill();

      // rivers filling up from their mouths
      for (const est of ESTUARIES) {
        if (water < est.minSlr) continue;
        const frac = Math.min(1.0, (water - est.minSlr) / 2.2 + 0.25);
        const path = est.path.map(([la, ln]) => P(la, ln));
        const a = path[0], b = P(est.path[0][0], est.path[0][1] + eastLng(est.widthMeters * (1 + water * 0.45), est.path[0][0]));
        const px = Math.max(4, Math.hypot(b.x - a.x, b.y - a.y));
        ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
        const maxI = Math.max(1, Math.ceil((path.length - 1) * frac));
        for (let i = 1; i <= maxI; i++) ctx.lineTo(path[i].x, path[i].y);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineWidth = px * 1.45; ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)'; ctx.stroke();
        ctx.lineWidth = px * 0.85; ctx.strokeStyle = 'rgba(14, 165, 233, 0.78)'; ctx.stroke();
      }

      // glow, incoming wave crests and the foam line on the moving shore
      ctx.beginPath(); smooth(ctx, flood);
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)'; ctx.stroke();
      for (let w = 1; w <= 2; w++) {
        const off = (phase * 12 + w * 18) % 36;
        const alpha = (1 - off / 36) * 0.48;
        ctx.beginPath();
        flood.forEach((p, i) => (i ? ctx.lineTo(p.x - off, p.y) : ctx.moveTo(p.x - off, p.y)));
        ctx.lineWidth = 1.6; ctx.strokeStyle = `rgba(186, 230, 253, ${alpha.toFixed(2)})`; ctx.stroke();
      }
      ctx.beginPath(); smooth(ctx, flood);
      ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(240, 249, 255, 0.92)'; ctx.stroke();
    }

    // today's coastline (2026), dashed amber
    ctx.beginPath(); smooth(ctx, base);
    ctx.setLineDash([6, 5]); ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(251, 191, 36, 0.88)'; ctx.stroke();
    ctx.setLineDash([]);

    // shoreline shift arrow + label at the selected place
    if (f.site) {
      const lat = f.site.lat, lng = coastLng(lat);
      const shift = Math.max(0, f.level) * classicFactor(lat);
      const a = P(lat, lng), b = P(lat, lng + eastLng(shift, lat));
      if (Math.abs(b.x - a.x) > 6) {
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#fbbf24'; ctx.stroke();
        const text = `+${Math.round(shift)} m inland`;
        ctx.font = 'bold 12px "Inter", sans-serif';
        const tw = ctx.measureText(text).width + 14;
        ctx.fillStyle = 'rgba(7, 18, 36, 0.92)'; ctx.fillRect(b.x + 8, b.y - 11, tw, 22);
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1; ctx.strokeRect(b.x + 8, b.y - 11, tw, 22);
        ctx.fillStyle = '#fde68a'; ctx.fillText(text, b.x + 15, b.y + 4);
      }
    }
  }
}
