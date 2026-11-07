// Research & SDGs panel content, plus the data-centre layer and site checker.
// Data-centre positions are approximate (city / industrial-zone level) from public listings;
// their flood risk is computed live from the app's elevation data.
import * as maplibregl from 'maplibre-gl';
import { map } from './map';
import { state, level } from './state';
import { fmt, meters } from './i18n';
import { slrScenario, commitment2000y, type ScenarioId } from './science';
import type { FloodGrid } from './flood';

type Link = { t: string; u: string };
const he = () => state.lang === 'he';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// ---------------- SDGs ----------------
export const SDGS = [
  { n: 13, color: '#3f7e44', en: 'Climate Action', he: 'פעולה למען האקלים', link: 'https://sdgs.un.org/goals/goal13',
    den: 'Cutting emissions is what decides how high the sea gets. The CO₂ budget slider and "What can we do?" show the link from tonnes to metres.',
    dhe: 'הפחתת פליטות היא מה שקובע כמה הים יעלה. מחוון תקציב הפחמן ו"מה אפשר לעשות?" מראים את הקשר בין טונות למטרים.', panel: 'emissions' },
  { n: 14, color: '#0a97d9', en: 'Life Below Water', he: 'החיים מתחת למים', link: 'https://sdgs.un.org/goals/goal14',
    den: 'A warmer, higher, more acidic sea changes coastal habitats. The drowned sites (Atlit Yam, Caesarea) show the sea has already moved before.',
    dhe: 'ים חם, גבוה וחומצי יותר משנה את בתי הגידול בחוף. האתרים הטבועים (עתלית ים, קיסריה) מראים שהים כבר זז בעבר.', panel: null },
  { n: 11, color: '#fd9d24', en: 'Sustainable Cities', he: 'ערים וקהילות בנות קיימא', link: 'https://sdgs.un.org/goals/goal11',
    den: 'Haifa Bay, the Krayot, Tel Aviv and Ashdod: buildings, roads and ports that the sea reaches, and where new building should not go.',
    dhe: 'מפרץ חיפה, הקריות, תל אביב ואשדוד: מבנים, כבישים ונמלים שהים מגיע אליהם, ואיפה לא כדאי לבנות.', panel: 'place' },
  { n: 6, color: '#26bde2', en: 'Clean Water', he: 'מים נקיים', link: 'https://sdgs.un.org/goals/goal6',
    den: 'A higher sea pushes salt water into the coastal aquifer, a key source of fresh water. Data centres that cool with fresh water add pressure.',
    dhe: 'ים גבוה יותר דוחף מי מלח לאקוויפר החוף, מקור חשוב למים מתוקים. חוות שרתים שמתקררות במים מתוקים מוסיפות לחץ.', panel: null },
  { n: 7, color: '#fcc30b', en: 'Clean Energy', he: 'אנרגיה נקייה', link: 'https://sdgs.un.org/goals/goal7',
    den: 'Coastal power stations (Orot Rabin, Haifa) sit at the waterline; rooftop solar and clean power cut emissions.',
    dhe: 'תחנות כוח חופיות (אורות רבין, חיפה) עומדות על קו המים; סולארי על הגגות וחשמל נקי מפחיתים פליטות.', panel: 'act' },
  { n: 9, color: '#fd6925', en: 'Industry & Infrastructure', he: 'תעשייה ותשתיות', link: 'https://sdgs.un.org/goals/goal9',
    den: 'Ports, refineries, subsea cable landings and data centres need to be resilient. Use the data-centre checker below to test a site.',
    dhe: 'נמלים, בתי זיקוק, נחיתות כבלים תת־ימיים וחוות שרתים צריכים להיות עמידים. בדקו אתר עם בודק חוות השרתים למטה.', panel: null },
];

// ---------------- research ----------------
export const RESEARCH: { group: [string, string]; items: (Link & { note: [string, string] })[] }[] = [
  { group: ['Sea level & coasts', 'מפלס הים והחופים'], items: [
    { t: 'Fox-Kemper et al. 2021 - IPCC AR6 WGI Ch. 9: Ocean, cryosphere & sea level change', u: 'https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-9/', note: ['The projections this app uses', 'התחזיות שהאפליקציה משתמשת בהן'] },
    { t: 'Garner et al. 2021 - IPCC AR6 sea level projections (dataset)', u: 'https://doi.org/10.5281/zenodo.6382554', note: ['Regional numbers for Hadera', 'המספרים האזוריים לחדרה'] },
    { t: 'IPCC AR6 WGII - Cross-Chapter Paper 4: Mediterranean Region', u: 'https://www.ipcc.ch/report/ar6/wg2/chapter/ccp4/', note: ['Impacts on Mediterranean coasts', 'השפעות על חופי הים התיכון'] },
    { t: 'MedECC 2020 - First Mediterranean Assessment Report (MAR1)', u: 'https://www.medecc.org/first-mediterranean-assessment-report-mar1/', note: ['Mediterranean climate & environment', 'אקלים וסביבה בים התיכון'] },
    { t: 'Kulp & Strauss 2019 - New elevation data triple estimates of global vulnerability to sea-level rise (Nature Communications)', u: 'https://doi.org/10.1038/s41467-019-12808-z', note: ['Why elevation data matters so much', 'למה נתוני הגובה חשובים כל כך'] },
    { t: 'Pronk et al. 2024 - DeltaDTM: a global coastal digital terrain model (Scientific Data)', u: 'https://doi.org/10.1038/s41597-024-03091-9', note: ['The elevation data in this app', 'נתוני הגובה באפליקציה'] },
    { t: 'Vousdoukas et al. 2020 - Sandy coastlines under threat of erosion (Nature Climate Change)', u: 'https://doi.org/10.1038/s41558-020-0697-0', note: ['Beach loss - the idea behind Illustration mode', 'אובדן חופים - הרעיון מאחורי מצב ההמחשה'] },
    { t: 'Levermann et al. 2013 - The multimillennial sea-level commitment of global warming (PNAS)', u: 'https://doi.org/10.1073/pnas.1219414110', note: ['~2.3 m per °C over 2,000 years', 'כ־2.3 מ׳ לכל מעלה לאורך 2,000 שנה'] },
    { t: 'Notz & Stroeve 2016 - Observed Arctic sea-ice loss follows anthropogenic CO₂ emission (Science)', u: 'https://doi.org/10.1126/science.aag2345', note: ['3 m² of sea ice per tonne of CO₂', '3 מ״ר קרח ים לכל טון CO₂'] },
  ] },
  { group: ['Data centres, energy & water', 'חוות שרתים, אנרגיה ומים'], items: [
    { t: 'Durairajan, Barford & Barford 2018 - Lights Out: Climate change risk to internet infrastructure', u: 'https://doi.org/10.1145/3232755.3232775', note: ['Data centres & cable landings at risk from sea level rise', 'חוות שרתים ונחיתות כבלים בסיכון מעליית מפלס'] },
    { t: 'IEA 2025 - Energy and AI', u: 'https://www.iea.org/reports/energy-and-ai', note: ['Data-centre electricity could roughly double by 2030', 'צריכת החשמל של חוות שרתים עשויה להכפיל את עצמה עד 2030'] },
    { t: 'IEA - Data centre electricity use surged in 2025', u: 'https://www.iea.org/news/data-centre-electricity-use-surged-in-2025-even-with-tightening-bottlenecks-driving-a-scramble-for-solutions', note: ['+17% in 2025', '‎+17% ב־2025'] },
    { t: 'Li, Yang, Islam & Ren 2023 - Making AI less "thirsty" (arXiv)', u: 'https://arxiv.org/abs/2304.03271', note: ['The water footprint of AI', 'טביעת המים של בינה מלאכותית'] },
    { t: 'Ynet - Israel\'s new gold rush: data centres', u: 'https://www.ynetnews.com/business/article/hykex00l11ml', note: ['The Israeli data-centre boom', 'הבום של חוות השרתים בישראל'] },
  ] },
  { group: ['Israel', 'ישראל'], items: [
    { t: 'Adam Teva V\'Din - Planners must tackle climate threats to beaches', u: 'https://adamteva.org.il/en/news_and_updates/3606/', note: ['Coastal planning in Israel', 'תכנון החוף בישראל'] },
    { t: 'Ynet - Israel\'s beaches are disappearing', u: 'https://www.ynetnews.com/environment/article/r13itilzze', note: ['Erosion & cliffs', 'סחף ומצוקים'] },
    { t: 'Wikipedia - Climate change in Israel', u: 'https://en.wikipedia.org/wiki/Climate_change_in_Israel', note: ['Overview with sources', 'סקירה עם מקורות'] },
  ] },
];

// ---------------- data centres ----------------
export interface DataCentre { id: string; lat: number; lon: number; status: 'existing' | 'planned'; en: string; he: string; who: string; src: Link }
export const DATACENTRES: DataCentre[] = [
  { id: 'dc_pt', lat: 32.094, lon: 34.866, status: 'existing', en: 'Petah Tikva cluster', he: 'אשכול פתח תקווה', who: 'MedOne, GTR (10.5 MW) and others - about a quarter of Israel\'s rack capacity', src: { t: 'Data Center Map - Petah Tikva', u: 'https://www.datacentermap.com/israel/petah-tikva/' } },
  { id: 'dc_rishon', lat: 31.99, lon: 34.77, status: 'existing', en: 'Rishon LeTsiyon', he: 'ראשון לציון', who: 'EdgeConneX (TLV02, TLV04)', src: { t: 'Datacenters.com - Israel', u: 'https://www.datacenters.com/locations/israel' } },
  { id: 'dc_haifaport', lat: 32.8195, lon: 35.0035, status: 'existing', en: 'Haifa Port', he: 'נמל חיפה', who: 'CenterServ Haifa', src: { t: 'Datacenters.com - Israel', u: 'https://www.datacenters.com/locations/israel' } },
  { id: 'dc_matam', lat: 32.789, lon: 34.958, status: 'existing', en: 'Haifa - Matam', he: 'חיפה - מת״ם', who: 'Mega DC', src: { t: 'Datacenters.com - Israel', u: 'https://www.datacenters.com/locations/israel' } },
  { id: 'dc_tirat', lat: 32.762, lon: 34.972, status: 'existing', en: 'Tirat HaCarmel', he: 'טירת הכרמל', who: 'MedOne', src: { t: 'MedOne - sites in Israel (press)', u: 'https://business.mammothtimes.com/mammothtimes/article/businesnewswire-2026-1-21-medone-israels-biggest-data-center-platform-enterprise-colocation-assessment' } },
  { id: 'dc_hartuv', lat: 31.765, lon: 34.983, status: 'existing', en: 'Har Tuv industrial zone', he: 'אזור התעשייה הר טוב', who: 'AWS Israel (Tel Aviv region)', src: { t: 'Datacenters.com - Israel', u: 'https://www.datacenters.com/locations/israel' } },
  { id: 'dc_netanya', lat: 32.285, lon: 34.865, status: 'planned', en: 'Netanya (being examined)', he: 'נתניה (בבדיקה)', who: 'Rami Levy group, examining data centres on its land', src: { t: 'Ynet - Israel\'s data-centre gold rush', u: 'https://www.ynetnews.com/business/article/hykex00l11ml' } },
  { id: 'dc_kgat', lat: 31.6, lon: 34.77, status: 'planned', en: 'Kiryat Gat (being examined)', he: 'קריית גת (בבדיקה)', who: 'Rami Levy group, examining data centres on its land', src: { t: 'Ynet - Israel\'s data-centre gold rush', u: 'https://www.ynetnews.com/business/article/hykex00l11ml' } },
];

let grid: FloodGrid;
let coast: [number, number][] = [];
/** Distance (m) to today's shoreline, from the coastline lines (works on high cliffs too). */
function shoreDistance(lon: number, lat: number) {
  const k = Math.cos((lat * Math.PI) / 180) * 111320;
  let best = 1e9;
  for (const [x, y] of coast) { const d = Math.hypot((x - lon) * k, (y - lat) * 110540); if (d < best) best = d; }
  return best;
}
export type Verdict = { grade: 'red' | 'amber' | 'green'; minFill: number; dist: number; ground: number | null; inGrid: boolean };

/** Flood risk of a site: worst case within ~400 m (a campus is not a point). */
export function assess(lon: number, lat: number): Verdict {
  let minFill = 99, dist = Math.max(0, shoreDistance(lon, lat) - 400), ground: number | null = null, inGrid = false;
  const R = 400, steps = 6;
  for (let i = -steps; i <= steps; i++) for (let j = -steps; j <= steps; j++) {
    const dy = (i / steps) * R, dx = (j / steps) * R;
    if (dx * dx + dy * dy > R * R) continue;
    const c = grid.sample(lon + dx / (111320 * Math.cos((lat * Math.PI) / 180)), lat + dy / 110540);
    if (!c) continue;
    inGrid = true;
    if (c.sea) { minFill = Math.min(minFill, 0); dist = 0; continue; }
    minFill = Math.min(minFill, c.fill);
    dist = Math.min(dist, Math.max(0, c.dist - Math.hypot(dx, dy)));
    if (i === 0 && j === 0) ground = c.ground;
  }
  // thresholds: this century's high end + an extreme storm (~4.5 m) / the 2,000-year commitment at current policies (~8 m)
  const longTerm = commitment2000y(2.7).mid;
  const grade = minFill < 4.5 || dist < 300 ? 'red' : minFill < longTerm + 2.5 || dist < 1000 ? 'amber' : 'green';
  return { grade, minFill, dist, ground, inGrid };
}

function firstYear(id: ScenarioId, fill: number) {
  for (let y = 2020; y <= 2150; y++) if (slrScenario(id, y, 2) > fill) return String(y);
  return he() ? 'לא עד 2150' : 'not by 2150';
}

export function verdictHtml(v: Verdict, title?: string, extra = '') {
  const H = he();
  const label = { red: H ? '⛔ לא מומלץ' : '⛔ Do not build here', amber: H ? '⚠ זהירות' : '⚠ Caution', green: H ? '✅ מתאים יותר' : '✅ Better choice' }[v.grade];
  const why = !v.inGrid && v.dist < 1000
    ? (H ? 'על קרקע גבוהה, אבל קרוב לחוף: מצוקי הכורכר נסוגים כשהים עולה.' : 'On high ground, but close to the shore: the sandstone cliffs retreat as the sea rises.')
    : !v.inGrid
    ? (H ? 'מחוץ לרצועת החוף הנמוכה או מעל 24 מ׳ - מוגן מהים גם בטווח הארוך.' : 'Outside the low coastal strip or above 24 m - safe from the sea even in the long run.')
    : v.grade === 'red'
      ? (H ? 'הים עלול להגיע לאתר במאה הזו (עם סערה), או שהוא קרוב מדי לחוף הנסוג.' : 'The sea could reach the site this century (with a storm), or it is too close to a retreating shore.')
      : v.grade === 'amber'
        ? (H ? 'בטוח במאה הזו, אבל בתוך העלייה המחויבת לטווח הארוך או פחות מק״מ מהחוף. חוות שרתים פועלות עשרות שנים.' : 'Safe this century, but within the long-term committed rise or under 1 km from the shore. Data centres run for decades.')
        : (H ? 'גבוה ורחוק מספיק מהים גם בעלייה המחויבת לטווח הארוך.' : 'High and far enough from the sea even for the long-term committed rise.');
  const rows = !v.inGrid ? `<div class="pi-row"><span>${H ? 'מרחק מקו החוף' : 'Distance from shore'}</span><b>${v.dist > 5000 ? '> 5 km' : fmt(Math.round(v.dist / 10) * 10) + ' m'}</b></div>` : v.inGrid ? `
    <div class="pi-row"><span>${H ? 'הים מגיע לאתר ב־' : 'Sea reaches the site at'}</span><b>${v.minFill >= 22 ? '> +22 m' : meters(Math.max(0, v.minFill), 1)}</b></div>
    <div class="pi-row"><span>${H ? 'מרחק מקו החוף' : 'Distance from shore'}</span><b>${v.dist > 5000 ? '> 5 km' : fmt(Math.round(v.dist / 10) * 10) + ' m'}</b></div>
    ${v.ground != null ? `<div class="pi-row"><span>${H ? 'גובה הקרקע' : 'Ground height'}</span><b>${meters(v.ground, 1)}</b></div>` : ''}
    <div class="pi-sub">${H ? 'השנה הראשונה שבה מוצף (חציון, בלי סערה)' : 'First year it floods (median, no storm)'}</div>
    <div class="pi-row"><span>SSP2-4.5</span><b>${firstYear('ssp245', v.minFill)}</b></div>
    <div class="pi-row"><span>SSP5-8.5 + ice</span><b>${firstYear('ssp585_low', v.minFill)}</b></div>` : '';
  return `<div class="pi dc-v ${v.grade}">${title ? `<h3>${esc(title)}</h3>` : ''}<div class="dc-grade">${label}</div><p class="small">${why}</p>${rows}${extra}
    <p class="muted small">${H ? 'בדיקה ברדיוס 400 מ׳, לפי נתוני הגובה של האפליקציה. שיקולים נוספים: חשמל נקי, מים (לא מים מתוקים לקירור), סיכון רעידות אדמה, וקרבה לכבלים.' : 'Checks a 400 m radius with the app\'s elevation data. Also weigh: clean power, water (avoid cooling with fresh water), earthquake risk and access to cables.'}</p></div>`;
}

// ---- map layer ----
const dcMarkers: { d: DataCentre; el: HTMLElement }[] = [];
let popup: maplibregl.Popup | null = null;
export let checking = false;

export function initDataCentres(g: FloodGrid, coastline: GeoJSON.FeatureCollection) {
  grid = g;
  for (const f of coastline.features) if (f.geometry.type === 'LineString') coast.push(...(f.geometry.coordinates as [number, number][]));
  for (const d of DATACENTRES) {
    const v = assess(d.lon, d.lat);
    const el = document.createElement('button');
    el.className = `dc dc-${v.grade} dc-${d.status}`;
    el.innerHTML = `<span class="dc-ic">▦</span><span class="dc-label"></span>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); openDC(d); });
    new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -10] }).setLngLat([d.lon, d.lat]).addTo(map);
    dcMarkers.push({ d, el });
  }
  relabelDataCentres();
  setDataCentresVisible(state.datacentres);
  map.on('click', (e) => {
    if (!checking) return;
    checking = false; document.body.classList.remove('dc-checking');
    const v = assess(e.lngLat.lng, e.lngLat.lat);
    popup?.remove();
    popup = new maplibregl.Popup({ maxWidth: '320px', className: 'rt-popup' }).setLngLat(e.lngLat)
      .setHTML(verdictHtml(v, he() ? 'חוות שרתים מוצעת כאן?' : 'A data centre here?')).addTo(map);
  });
}
function openDC(d: DataCentre) {
  popup?.remove();
  const v = assess(d.lon, d.lat);
  const H = he();
  const extra = `<p class="small"><b>${d.status === 'planned' ? (H ? 'מתוכנן / בבדיקה' : 'Planned / being examined') : (H ? 'קיים' : 'Existing')}</b> · ${esc(d.who)}</p>
    <p class="muted small">${H ? 'מיקום משוער (ברמת עיר / אזור תעשייה) לפי רשימות פומביות' : 'Approximate location (city / industrial-zone level) from public listings'} · <a href="${d.src.u}" target="_blank" rel="noopener">${esc(d.src.t)} ↗</a></p>`;
  popup = new maplibregl.Popup({ maxWidth: '320px', className: 'rt-popup' }).setLngLat([d.lon, d.lat]).setHTML(verdictHtml(v, H ? d.he : d.en, extra)).addTo(map);
}
export function startChecking() {
  checking = true; document.body.classList.add('dc-checking');
  if (!state.datacentres) setDataCentresVisible(true);
}
export function relabelDataCentres() { for (const { d, el } of dcMarkers) el.querySelector('.dc-label')!.textContent = he() ? d.he : d.en; }
export function setDataCentresVisible(on: boolean) { for (const { el } of dcMarkers) el.style.display = on ? '' : 'none'; if (!on) popup?.remove(); }
export function dcSummary() { return DATACENTRES.map((d) => ({ d, v: assess(d.lon, d.lat) })); }
void level;
