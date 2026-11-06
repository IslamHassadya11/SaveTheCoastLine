// Small dependency-free SVG line/area charts with a hover crosshair + tooltip.
export interface Series {
  label: string; color: string;
  points: [number, number][];
  band?: [number, number, number][];   // x, lo, hi
  dots?: boolean; width?: number; area?: boolean; endLabel?: boolean;
}
export interface ChartOpts {
  series: Series[];
  x: [number, number]; y: [number, number];
  xTicks: number[]; yTicks: number[];
  xFmt?: (v: number) => string; yFmt?: (v: number) => string;
  vline?: { x: number; label: string };
  hline?: { y: number; label: string };
  tip?: (x: number) => string;
  height?: number;
}

const NS = 'http://www.w3.org/2000/svg';
function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent?.appendChild(e);
  return e;
}

export function lineChart(host: HTMLElement, o: ChartOpts) {
  host.innerHTML = '';
  host.classList.add('chart');
  const W = Math.max(280, host.clientWidth || 360), H = o.height ?? 210;
  const m = { l: 40, r: 64, t: 12, b: 26 };
  const sx = (v: number) => m.l + ((v - o.x[0]) / (o.x[1] - o.x[0])) * (W - m.l - m.r);
  const sy = (v: number) => H - m.b - ((v - o.y[0]) / (o.y[1] - o.y[0])) * (H - m.t - m.b);
  const xf = o.xFmt ?? String, yf = o.yFmt ?? String;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H, role: 'img' }, host);
  svg.style.direction = 'ltr';
  const g = el('g', { class: 'grid' }, svg);
  for (const t of o.yTicks) {
    el('line', { x1: m.l, x2: W - m.r, y1: sy(t), y2: sy(t) }, g);
    el('text', { x: m.l - 6, y: sy(t) + 4, 'text-anchor': 'end', class: 'tick' }, g).textContent = yf(t);
  }
  for (const t of o.xTicks) el('text', { x: sx(t), y: H - 8, 'text-anchor': 'middle', class: 'tick' }, g).textContent = xf(t);
  el('line', { x1: m.l, x2: W - m.r, y1: sy(o.y[0]), y2: sy(o.y[0]), class: 'axis' }, g);

  if (o.hline) {
    el('line', { x1: m.l, x2: W - m.r, y1: sy(o.hline.y), y2: sy(o.hline.y), class: 'ref' }, svg);
    el('text', { x: m.l + 4, y: sy(o.hline.y) - 5, class: 'reflabel' }, svg).textContent = o.hline.label;
  }
  if (o.vline) {
    el('line', { x1: sx(o.vline.x), x2: sx(o.vline.x), y1: m.t, y2: H - m.b, class: 'ref' }, svg);
    el('text', { x: sx(o.vline.x) + 4, y: m.t + 10, class: 'reflabel' }, svg).textContent = o.vline.label;
  }
  const clampY = (v: number) => Math.max(o.y[0], Math.min(o.y[1], v));
  const labels: { y: number; text: string }[] = [];
  for (const s of o.series) {
    if (s.band?.length) {
      const top = s.band.map(([x, , hi]) => `${sx(x)},${sy(clampY(hi))}`);
      const bot = s.band.slice().reverse().map(([x, lo]) => `${sx(x)},${sy(clampY(lo))}`);
      el('polygon', { points: [...top, ...bot].join(' '), fill: s.color, opacity: 0.14 }, svg);
    }
    if (s.area && s.points.length) {
      const p = s.points.map(([x, y]) => `${sx(x)},${sy(clampY(y))}`);
      el('polygon', { points: `${sx(s.points[0][0])},${sy(o.y[0])} ${p.join(' ')} ${sx(s.points[s.points.length - 1][0])},${sy(o.y[0])}`, fill: s.color, opacity: 0.12 }, svg);
    }
    if (s.dots) {
      for (const [x, y] of s.points) el('circle', { cx: sx(x), cy: sy(clampY(y)), r: 3, fill: s.color, class: 'dot' }, svg);
    } else if (s.points.length) {
      el('polyline', {
        points: s.points.map(([x, y]) => `${sx(x)},${sy(clampY(y))}`).join(' '),
        fill: 'none', stroke: s.color, 'stroke-width': s.width ?? 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      }, svg);
      if (s.endLabel !== false) {
        const [lx, ly] = s.points[s.points.length - 1];
        el('circle', { cx: sx(lx), cy: sy(clampY(ly)), r: 4, fill: s.color, class: 'end' }, svg);
        labels.push({ y: sy(clampY(ly)), text: s.label });
      }
    }
  }
  // direct end labels, nudged apart so they never overlap
  labels.sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 13) labels[i].y = labels[i - 1].y + 13;
  for (const l of labels) el('text', { x: W - m.r + 8, y: l.y + 4, class: 'endlabel' }, svg).textContent = l.text;

  if (o.tip) {
    const cross = el('line', { y1: m.t, y2: H - m.b, class: 'cross', visibility: 'hidden' }, svg);
    const tip = document.createElement('div'); tip.className = 'chart-tip'; host.appendChild(tip);
    const hit = el('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' }, svg);
    const move = (clientX: number) => {
      const r = svg.getBoundingClientRect();
      const px = ((clientX - r.left) / r.width) * W;
      const xv = o.x[0] + ((px - m.l) / (W - m.l - m.r)) * (o.x[1] - o.x[0]);
      const x = Math.max(o.x[0], Math.min(o.x[1], xv));
      cross.setAttribute('x1', String(sx(x))); cross.setAttribute('x2', String(sx(x))); cross.setAttribute('visibility', 'visible');
      tip.innerHTML = o.tip!(x); tip.style.display = 'block';
      const left = (sx(x) / W) * r.width;
      tip.style.left = Math.min(r.width - tip.offsetWidth - 4, Math.max(4, left + 10)) + 'px';
    };
    hit.addEventListener('pointermove', (e) => move((e as PointerEvent).clientX));
    hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); tip.style.display = 'none'; });
  }
}
