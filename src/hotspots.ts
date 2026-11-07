// Clickable markers: places especially at risk, and heritage that the sea has already drowned.
// Every link was checked to resolve. Numbers in the popups come live from the app's own data.
import * as maplibregl from 'maplibre-gl';
import { map } from './map';
import { state, level } from './state';
import { reached } from './stats';
import { fmt, meters } from './i18n';
import type { FloodGrid } from './flood';
import { visible } from './layerstate';
import { EVIDENCE, evidenceHtml } from './evidence';

type Link = { t: string; u: string };
export interface Hotspot {
  id: string; kind: 'risk' | 'sea'; lat: number; lon: number; site?: string; depth?: [number, number];
  en: string; he: string; den: string; dhe: string; links: Link[];
}

const W = (p: string) => `https://en.wikipedia.org/wiki/${p}`;
export const REPORTS: Link[] = [
  { t: 'IPCC AR6 WGII - Cross-Chapter Paper 4: Mediterranean Region', u: 'https://www.ipcc.ch/report/ar6/wg2/chapter/ccp4/' },
  { t: 'IPCC AR6 WGI - Chapter 9: Ocean, cryosphere and sea level change', u: 'https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-9/' },
  { t: 'MedECC - First Mediterranean Assessment Report (MAR1)', u: 'https://www.medecc.org/first-mediterranean-assessment-report-mar1/' },
  { t: 'NASA Sea Level Change portal', u: 'https://sealevel.nasa.gov/' },
  { t: 'Climate Central - Coastal Risk Screening Tool', u: 'https://coastal.climatecentral.org/' },
  { t: 'Adam Teva V\'Din - Planners must tackle climate threats to beaches', u: 'https://adamteva.org.il/en/news_and_updates/3606/' },
  { t: 'Ynet - Israel\'s beaches are disappearing', u: 'https://www.ynetnews.com/environment/article/r13itilzze' },
  { t: 'Wikipedia - Climate change in Israel', u: W('Climate_change_in_Israel') },
];

export const HOTSPOTS: Hotspot[] = [
  // ---- places especially at risk ----
  { id: 'r_haifa', kind: 'risk', lat: 32.806, lon: 35.04, site: 'haifa_bay', en: 'Haifa Bay: port, refineries & Kishon', he: 'מפרץ חיפה: נמל, בתי זיקוק וקישון',
    den: "Israel's main port, its oil refineries and petrochemical plants stand on a low plain at the Kishon river mouth. A higher sea and winter storms push water up the river and into the industrial zone.",
    dhe: 'הנמל הראשי של ישראל, בתי הזיקוק והמפעלים הפטרוכימיים עומדים על מישור נמוך בשפך הקישון. ים גבוה יותר וסערות חורף דוחפים מים במעלה הנחל ואל האזור התעשייתי.',
    links: [{ t: 'Haifa Bay', u: W('Haifa_Bay') }, { t: 'Port of Haifa', u: W('Port_of_Haifa') }, { t: 'Kishon River', u: W('Kishon_River') }] },
  { id: 'r_krayot', kind: 'risk', lat: 32.85, lon: 35.08, site: 'zevulun', en: 'Krayot & Zevulun Valley', he: 'הקריות ועמק זבולון',
    den: 'Kiryat Haim, Kiryat Yam and the valley floor lie only a few metres above the sea, behind a thin line of dunes. In our elevation data this is the largest area on the coast that floods between +3 and +5 m.',
    dhe: 'קריית חיים, קריית ים וקרקעית העמק נמצאות כמה מטרים בלבד מעל הים, מאחורי רצועת דיונות דקה. לפי נתוני הגובה שלנו זה השטח הגדול ביותר בחוף שמוצף בין +3 ל־+5 מ׳.',
    links: [{ t: 'Haifa Bay', u: W('Haifa_Bay') }] },
  { id: 'r_akko', kind: 'risk', lat: 32.9235, lon: 35.0735, site: 'akko', en: 'Old Akko (UNESCO)', he: 'עכו העתיקה (אונסק״ו)',
    den: 'A UNESCO World Heritage port city. Its sea walls and harbour take the waves head-on. The old city itself stands on higher ground (about 7 m), but the harbour and the shore around it are low.',
    dhe: 'עיר נמל שהיא אתר מורשת עולמית של אונסק״ו. חומות הים והנמל סופגים את הגלים ישירות. העיר העתיקה עצמה על קרקע גבוהה יותר (כ־7 מ׳), אבל הנמל והחוף סביבו נמוכים.',
    links: [{ t: 'UNESCO - Old City of Acre', u: 'https://whc.unesco.org/en/list/1042/' }, { t: 'Acre, Israel', u: W('Acre,_Israel') }] },
  { id: 'r_nahariya', kind: 'risk', lat: 33.006, lon: 35.098, site: 'nahariya', en: 'Nahariya & the Ga\'aton', he: 'נהריה והגעתון',
    den: "The Ga'aton stream runs through the city centre and floods in winter storms. A higher sea makes it harder for the stream to drain into it.",
    dhe: 'נחל הגעתון עובר במרכז העיר ומציף בסערות חורף. ים גבוה יותר מקשה על הנחל להתנקז אליו.',
    links: [{ t: 'Nahariya', u: W('Nahariya') }] },
  { id: 'r_atlit', kind: 'risk', lat: 32.698, lon: 34.942, site: 'atlit', en: 'Atlit: salt pans, fortress & camp', he: 'עתלית: בריכות מלח, מבצר ומחנה',
    den: 'The salt pans, the Crusader fortress on its headland and the historic detainee camp are all low-lying and close to the shore.',
    dhe: 'בריכות המלח, המבצר הצלבני על הלשון ומחנה המעפילים ההיסטורי - כולם נמוכים וקרובים לחוף.',
    links: [{ t: 'Atlit', u: W('Atlit') }, { t: 'Atlit detainee camp', u: W('Atlit_detainee_camp') }] },
  { id: 'r_maagan', kind: 'risk', lat: 32.556, lon: 34.91, site: 'maagan_michael', en: "Ma'agan Michael fishponds", he: 'בריכות הדגים של מעגן מיכאל',
    den: 'Fishponds and the Taninim stream reserve sit at, or just above, sea level.',
    dhe: 'בריכות הדגים ושמורת נחל תנינים נמצאות בגובה פני הים או מעט מעליו.',
    links: [{ t: "Ma'agan Michael", u: W('Ma%27agan_Michael') }] },
  { id: 'r_hadera', kind: 'risk', lat: 32.471, lon: 34.884, site: 'hadera', en: 'Orot Rabin power station', he: 'תחנת הכוח אורות רבין',
    den: "One of Israel's largest power stations, built right on the shore and cooled with seawater.",
    dhe: 'אחת מתחנות הכוח הגדולות בישראל, בנויה על קו החוף ומקוררת במי ים.',
    links: [{ t: 'Orot Rabin', u: W('Orot_Rabin') }] },
  { id: 'r_netanya', kind: 'risk', lat: 32.33, lon: 34.853, site: 'netanya', en: 'Netanya cliffs', he: 'מצוקי נתניה',
    den: 'Sandstone (kurkar) cliffs collapse as waves undercut them, with buildings close to the edge. A higher sea speeds this up.',
    dhe: 'מצוקי הכורכר קורסים כשהגלים מכרסמים בבסיסם, ובניינים עומדים קרוב לשפה. ים גבוה יותר מאיץ את התהליך.',
    links: [{ t: 'Netanya', u: W('Netanya') }, { t: "Ynet - Israel's beaches are disappearing", u: 'https://www.ynetnews.com/environment/article/r13itilzze' }] },
  { id: 'r_telaviv', kind: 'risk', lat: 32.1, lon: 34.78, site: 'tel_aviv', en: 'Tel Aviv: Yarkon & old port', he: 'תל אביב: הירקון והנמל הישן',
    den: 'The Yarkon river mouth, the old port and the beach promenade are the lowest parts of the city.',
    dhe: 'שפך הירקון, הנמל הישן וטיילת החוף הם החלקים הנמוכים ביותר בעיר.',
    links: [{ t: 'Yarkon River', u: W('Yarkon_River') }, { t: 'Jaffa', u: W('Jaffa') }] },
  { id: 'r_ashdod', kind: 'risk', lat: 31.822, lon: 34.65, site: 'ashdod', en: 'Ashdod port & Lachish', he: 'נמל אשדוד והלכיש',
    den: "Israel's largest port, next to the Lachish river mouth.",
    dhe: 'הנמל הגדול בישראל, לצד שפך נחל לכיש.',
    links: [{ t: 'Port of Ashdod', u: W('Port_of_Ashdod') }] },
  { id: 'r_ashkelon', kind: 'risk', lat: 31.68, lon: 34.562, site: 'ashkelon', en: 'Ashkelon coast', he: 'חוף אשקלון',
    den: 'The marina, the beaches and the cliffs of the national park face erosion.',
    dhe: 'המרינה, החופים ומצוקי הגן הלאומי חשופים לסחף.',
    links: [{ t: 'Ashkelon', u: W('Ashkelon') }] },

  // ---- already under the sea ----
  { id: 's_atlityam', kind: 'sea', lat: 32.7108, lon: 34.9352, depth: [8, 12], en: 'Atlit Yam - drowned village', he: 'עתלית ים - כפר שטבע',
    den: 'A Neolithic village about 9,000 years old (c. 6900-6300 BCE), now 8-12 m under the sea, with a ring of standing stones and water wells. It was drowned by the sea level rise after the last ice age - the same process that is speeding up again today.',
    dhe: 'כפר מהתקופה הנאוליתית, בן כ־9,000 שנה (כ־6900-6300 לפנה״ס), כיום 8-12 מ׳ מתחת לים, עם מעגל אבנים זקופות ובארות מים. הוא טבע בעליית פני הים שאחרי עידן הקרח האחרון - אותו תהליך שמאיץ שוב היום.',
    links: [{ t: 'Atlit Yam', u: W('Atlit_Yam') }] },
  { id: 's_ram', kind: 'sea', lat: 32.699, lon: 34.931, depth: [2, 4], en: 'The Athlit ram', he: 'אייל הניגוח של עתלית',
    den: 'A bronze warship ram from the 2nd century BCE, found in 1980 in shallow water off Atlit.',
    dhe: 'אייל ניגוח מברונזה של ספינת מלחמה מהמאה ה־2 לפנה״ס, שנמצא ב־1980 במים רדודים מול עתלית.',
    links: [{ t: 'Athlit ram', u: W('Athlit_ram') }] },
  { id: 's_neveyam', kind: 'sea', lat: 32.679, lon: 34.925, depth: [1, 5], en: 'Neve Yam - seabed settlements', he: 'נווה ים - יישובים בקרקעית',
    den: 'Remains of prehistoric settlements lie on the seabed off Neve Yam, part of a chain of drowned villages along the Carmel coast.',
    dhe: 'שרידי יישובים פרהיסטוריים שוכנים בקרקעית הים מול נווה ים, חלק משרשרת כפרים טבועים לאורך חוף הכרמל.',
    links: [{ t: 'Neve Yam', u: W('Neve_Yam') }] },
  { id: 's_dor', kind: 'sea', lat: 32.611, lon: 34.913, depth: [1, 4], en: 'Dor & Tantura lagoon shipwrecks', he: 'דור והספינות הטבועות בטנטורה',
    den: 'An ancient harbour town. Dozens of shipwrecks from many periods have been studied in the shallow lagoon and bay.',
    dhe: 'עיר נמל עתיקה. עשרות ספינות טבועות מתקופות שונות נחקרו בלגונה ובמפרץ הרדודים.',
    links: [{ t: 'Tel Dor', u: W('Tel_Dor') }] },
  { id: 's_caesarea', kind: 'sea', lat: 32.5005, lon: 34.8875, depth: [2, 9], en: "Caesarea - Herod's drowned harbour", he: 'קיסריה - הנמל של הורדוס',
    den: "Herod's harbour, Sebastos (c. 22-10 BCE). Much of its breakwater is now under water; an underwater archaeological park has marked diving trails.",
    dhe: 'נמל סבסטוס של הורדוס (כ־22-10 לפנה״ס). חלק גדול משובר הגלים שלו נמצא היום מתחת למים; בגן הארכאולוגי התת־ימי יש מסלולי צלילה מסומנים.',
    links: [{ t: 'Caesarea Maritima - underwater park', u: W('Caesarea_Maritima#Underwater_archaeological_park') }] },
  { id: 's_akko', kind: 'sea', lat: 32.9193, lon: 35.0712, depth: [0, 2], en: 'Akko harbour & Tower of Flies', he: 'נמל עכו ומגדל הזבובים',
    den: "A small fort on a reef in Akko's harbour. The harbour's ancient breakwaters are partly under water.",
    dhe: 'מצודה קטנה על שונית בנמל עכו. שוברי הגלים העתיקים של הנמל שקועים בחלקם.',
    links: [{ t: 'UNESCO - Old City of Acre', u: 'https://whc.unesco.org/en/list/1042/' }] },
];

const markers: { h: Hotspot; m: maplibregl.Marker; el: HTMLElement }[] = [];
let current: Hotspot | null = null;
let custom: (() => string) | null = null;   // a card from another layer (power stations, forests, ...)
let sheet: HTMLElement;
let grid: FloodGrid;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function card(h: Hotspot) {
  const he = state.lang === 'he';
  const L = Math.max(0, level()), il = state.style !== 'real';
  let live = '';
  if (h.kind === 'risk' && h.site) {
    const row = (l: number) => `<tr><td>${meters(l, 1)}</td><td><b>${fmt(Math.round(reached(h.site!, 'buildings', l, il)))}</b></td><td>${fmt(reached(h.site!, 'land_m2', l, il) / 1e4, 0)} ${he ? 'הקטר' : 'ha'}</td></tr>`;
    live = `<table class="hs-tbl"><thead><tr><th>${he ? 'מפלס' : 'Sea level'}</th><th>${he ? 'מבנים' : 'Buildings'}</th><th>${he ? 'שטח' : 'Land'}</th></tr></thead>
      <tbody>${row(1)}${row(2)}${row(5)}${L > 0.05 ? `<tr class="now">${row(L).slice(4)}` : ''}</tbody></table>
      <p class="hs-note">${he ? 'באזור זה, לפי הנתונים של האפליקציה' : 'Around this place, from the app\'s own data'}${L > 0.05 ? (he ? ' · השורה המודגשת = המצב הנוכחי' : ' · highlighted row = current setting') : ''}</p>`;
  } else if (h.depth) {
    const [a, b] = h.depth;
    live = `<div class="hs-depth"><span>${he ? 'עומק היום' : 'Depth today'}</span><b>${fmt(a)}–${fmt(b)} ${he ? 'מ׳' : 'm'}</b></div>
      ${L > 0.05 ? `<div class="hs-depth"><span>${he ? 'במצב הנוכחי' : 'At the current setting'}</span><b>${fmt(a + L, 1)}–${fmt(b + L, 1)} ${he ? 'מ׳' : 'm'}</b></div>` : ''}`;
  }
  void grid;
  return `<div class="hs-card ${h.kind}">
    <div class="hs-kind">${h.kind === 'risk' ? (he ? '⚠ מקום בסיכון' : '⚠ At risk') : (he ? '⚓ כבר מתחת לים' : '⚓ Already under the sea')}</div>
    <h3>${esc(he ? h.he : h.en)}</h3>
    <p>${esc(he ? h.dhe : h.den)}</p>
    ${live}
    ${evidenceHtml(EVIDENCE[h.id] ?? [], he, h.kind === 'risk')}
    <div class="hs-links"><b>${he ? 'לקריאה נוספת' : 'Read more'}</b>
      ${h.links.map((l) => `<a href="${l.u}" target="_blank" rel="noopener">${esc(l.t)} ↗</a>`).join('')}
      <details><summary>${he ? 'דוחות אקלים על הים התיכון' : 'Climate reports on the Mediterranean'}</summary>
        ${REPORTS.map((l) => `<a href="${l.u}" target="_blank" rel="noopener">${esc(l.t)} ↗</a>`).join('')}</details>
    </div></div>`;
}

export function initHotspots(g: FloodGrid) {
  grid = g;
  sheet = document.createElement('aside');
  sheet.id = 'hs-sheet'; sheet.hidden = true;
  document.body.appendChild(sheet);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && (current || custom)) close(); });
  for (const h of HOTSPOTS) {
    const el = document.createElement('button');
    el.className = `hs hs-${h.kind}`;
    el.innerHTML = `<span class="hs-ic">${h.kind === 'risk' ? '!' : '⚓'}</span><span class="hs-label"></span>`;
    el.addEventListener('click', (ev) => { ev.stopPropagation(); open(h); });
    // drawn just above their spot so they do not cover the place pins
    const m = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -14] }).setLngLat([h.lon, h.lat]).addTo(map);
    markers.push({ h, m, el });
  }
  relabelHotspots();
  applyHotspots();
}
// The card opens in a fixed side panel, so it never hides behind the top bar or the dock.
function open(h: Hotspot) {
  current = h; custom = null;
  sheet.hidden = false;
  document.body.classList.add('hs-open');
  render(); sheet.scrollTop = 0;
  for (const { h: x, el } of markers) el.classList.toggle('on', x === h);
}
/** Show any card in the side panel (used by the other map layers). */
export function showSheet(html: () => string) {
  current = null; custom = html;
  sheet.hidden = false; document.body.classList.add('hs-open');
  for (const { el } of markers) el.classList.remove('on');
  render(); sheet.scrollTop = 0;
}
function close() {
  current = null; custom = null; sheet.hidden = true;
  document.body.classList.remove('hs-open');
  for (const { el } of markers) el.classList.remove('on');
}
function render() {
  if (!current && !custom) return;
  sheet.innerHTML = `<button class="dr-close hs-x" aria-label="close">✕</button>${current ? card(current) : custom!()}`;
  sheet.querySelector('.hs-x')!.addEventListener('click', close);
}
export function refreshHotspotPopup() { if (current || custom) render(); }
export function relabelHotspots() {
  for (const { h, el } of markers) el.querySelector('.hs-label')!.textContent = state.lang === 'he' ? h.he : h.en;
  refreshHotspotPopup();
}
/** Places at risk ('risk') and underwater heritage ('sea') switch on and off separately. */
export function applyHotspots() {
  for (const { h, el } of markers) el.style.display = visible[h.kind] ? '' : 'none';
  if (current && !visible[current.kind]) close();
}
