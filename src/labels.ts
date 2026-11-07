// Keeps marker labels from piling on top of each other: when two labels overlap, the less
// important one shows only its icon (its name appears on hover). Runs as the map moves.
import { map } from './map';

const ORDER = ['.mk.active', '.hs.on', '.hs-risk', '.hs-sea', '.dc', '.poi', '.mk'];
const LABEL = '.mk-label, .hs-label, .dc-label, .poi-label';
let timer = 0;

function overlaps(a: DOMRect, b: DOMRect, pad = 3) {
  return a.left < b.right + pad && a.right + pad > b.left && a.top < b.bottom + pad && a.bottom + pad > b.top;
}

export function declutter() {
  const all = [...document.querySelectorAll<HTMLElement>('.mk, .hs, .dc, .poi')];
  for (const el of all) el.classList.remove('lbl-off');
  const placed: DOMRect[] = [];
  const seen = new Set<HTMLElement>();
  for (const sel of ORDER) {
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      if (seen.has(el)) continue;
      seen.add(el);
      const lab = el.querySelector<HTMLElement>(LABEL);
      if (!lab || el.offsetParent === null) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || lab.offsetParent === null) { placed.push(r); continue; }
      if (placed.some((p) => overlaps(p, r))) {
        el.classList.add('lbl-off');
        const ic = el.firstElementChild as HTMLElement | null;
        if (ic) placed.push(ic.getBoundingClientRect());
      } else placed.push(r);
    }
  }
}

/** Run now and again whenever the view changes (throttled). */
export function initDeclutter() {
  const soon = () => { if (!timer) timer = window.setTimeout(() => { timer = 0; declutter(); }, 120); };
  map.on('move', soon);
  map.on('moveend', () => { clearTimeout(timer); timer = 0; declutter(); });
  window.addEventListener('resize', soon);
  new MutationObserver(soon).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  declutter();
}
