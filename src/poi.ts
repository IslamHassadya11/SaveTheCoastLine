// Thematic map layers you can switch on and off: infrastructure, pollution and nature.
// Positions come from OpenStreetMap (Nominatim) or Wikipedia; a few are marked approximate.
// Each card shows the sea-level risk at that spot, computed with the same checker as data centres.
import * as maplibregl from 'maplibre-gl';
import { map } from './map';
import { state } from './state';
import { assess, verdictHtml } from './research';
import { showSheet } from './hotspots';
import { visible, saveVisible } from './layerstate';
import { EVIDENCE, evidenceHtml } from './evidence';

type Link = { t: string; u: string };
export type PoiCat = 'power' | 'desal' | 'ports' | 'emitters' | 'nature';
export interface Poi { id: string; cat: PoiCat; lat: number; lon: number; approx?: boolean; en: string; he: string; den: string; dhe: string; links: Link[] }

const W = (p: string) => ({ t: 'Wikipedia', u: `https://en.wikipedia.org/wiki/${p}` });
const PRTR: Link = { t: 'Ministry of Environmental Protection - PRTR 2019 summary', u: 'https://www.gov.il/BlobFolder/news/prtr_2019_news/en/prtr_prtr_2019_ppt_eng.pdf' };
const TOP10: Link = { t: 'Ynet - Israel names top 10 industrial polluters (2023)', u: 'https://www.ynetnews.com/article/r1yqrigaje' };
const GLOBES: Link = { t: 'Globes - Carcinogen emissions up 14% in 2020', u: 'https://en.globes.co.il/en/article-1001383351' };
const GHG: Link = { t: 'Ynet - Israel\'s greenhouse gas emissions up', u: 'https://www.ynetnews.com/environment/article/hkrfm3h0n' };
const MED: Link = { t: 'IPCC AR6 WGII - Mediterranean (heat, drought, fire)', u: 'https://www.ipcc.ch/report/ar6/wg2/chapter/ccp4/' };
const WATER: Link = { t: 'Water supply and sanitation in Israel', u: 'https://en.wikipedia.org/wiki/Water_supply_and_sanitation_in_Israel' };

export const CATS: { id: PoiCat; icon: string; color: string; en: string; he: string }[] = [
  { id: 'emitters', icon: '☁', color: '#7c3aed', en: 'Biggest polluters', he: 'המזהמים הגדולים' },
  { id: 'power', icon: '⚡', color: '#f59e0b', en: 'Power stations', he: 'תחנות כוח' },
  { id: 'desal', icon: '💧', color: '#0ea5e9', en: 'Desalination plants', he: 'מתקני התפלה' },
  { id: 'ports', icon: '⚓', color: '#475569', en: 'Ports', he: 'נמלים' },
  { id: 'nature', icon: '🌲', color: '#16a34a', en: 'Forests & nature at risk', he: 'יערות וטבע בסיכון' },
];

export const POIS: Poi[] = [
  // ---- biggest polluters (PRTR 2019: ~70% of reported emissions from the first three) ----
  { id: 'e_orot', cat: 'emitters', lat: 32.47067, lon: 34.89098, en: 'Orot Rabin power station (coal & gas)', he: 'תחנת הכוח אורות רבין (פחם וגז)',
    den: "Israel's largest single emitter in the national pollutant register, together with Rutenberg and the Nesher cement works. It stands right on the beach in Hadera.",
    dhe: 'הפולט הגדול ביותר במרשם הפליטות הלאומי, יחד עם רוטנברג ומפעל נשר. היא עומדת על החוף בחדרה.', links: [W('Orot_Rabin'), PRTR, GLOBES] },
  { id: 'e_rutenberg', cat: 'emitters', lat: 31.6275, lon: 34.51611, en: 'Rutenberg power station (coal)', he: 'תחנת הכוח רוטנברג (פחם)',
    den: 'Coal-fired power station on the shore at Ashkelon - one of the three sources behind about 70% of reported emissions in 2019.',
    dhe: 'תחנת כוח פחמית על החוף באשקלון - אחד משלושת המקורות שמאחורי כ־70% מהפליטות המדווחות ב־2019.', links: [W('Rutenberg_Power_Station'), PRTR] },
  { id: 'e_nesher', cat: 'emitters', lat: 31.918, lon: 34.882, approx: true, en: 'Nesher cement works, Ramla', he: 'מפעל המלט נשר, רמלה',
    den: 'Cement making releases CO₂ from both fuel and the limestone itself. Named with the two coal plants as the top sources in the 2019 register.',
    dhe: 'ייצור מלט פולט CO₂ גם מהדלק וגם מאבן הגיר עצמה. נמנה עם שתי תחנות הפחם כמקורות המובילים במרשם 2019.', links: [PRTR, GLOBES] },
  { id: 'e_bazan', cat: 'emitters', lat: 32.79479, lon: 35.05998, en: 'Bazan oil refineries, Haifa Bay', he: 'בתי הזיקוק בזן, מפרץ חיפה',
    den: "Israel's largest refinery complex, on the low Kishon plain. Bazan units appear repeatedly in the ministry's environmental-impact rankings.",
    dhe: 'מתחם הזיקוק הגדול בישראל, על מישור הקישון הנמוך. יחידות של בזן מופיעות שוב ושוב בדירוגי ההשפעה הסביבתית של המשרד.', links: [W('BAZAN_Group'), TOP10, GHG] },
  // ---- power stations ----
  { id: 'p_reading', cat: 'power', lat: 32.10509, lon: 34.77902, en: 'Reading power station (gas)', he: 'תחנת הכוח רידינג (גז)',
    den: 'Gas-fired station at the mouth of the Yarkon in Tel Aviv.', dhe: 'תחנה מונעת גז בשפך הירקון בתל אביב.', links: [W('Reading_Power_Station')] },
  { id: 'p_eshkol', cat: 'power', lat: 31.84297, lon: 34.65776, en: 'Eshkol power station (gas)', he: 'תחנת הכוח אשכול (גז)',
    den: 'Power station on the Ashdod shore, next to the port.', dhe: 'תחנת כוח על חוף אשדוד, ליד הנמל.', links: [W('Eshkol_Power_Station')] },
  { id: 'p_haifa', cat: 'power', lat: 32.79214, lon: 35.0553, en: 'Haifa Bay refinery power station', he: 'תחנת הכוח של בתי הזיקוק, מפרץ חיפה',
    den: 'Power plant inside the Haifa Bay refinery area, on the low Kishon plain.', dhe: 'תחנת כוח בתוך אזור בתי הזיקוק במפרץ חיפה, על מישור הקישון הנמוך.', links: [W('BAZAN_Group')] },
  // ---- desalination ----
  { id: 'd_sorek', cat: 'desal', lat: 31.93659, lon: 34.71198, en: 'Palmachim / Sorek desalination', he: 'התפלה פלמחים / שורק',
    den: 'Most of Israel\'s drinking water now comes from seawater desalination - and the plants must sit on the shore. They also use a lot of electricity.',
    dhe: 'רוב מי השתייה בישראל מגיעים היום מהתפלת מי ים - והמתקנים חייבים לשבת על החוף. הם גם צורכים הרבה חשמל.', links: [WATER] },
  { id: 'd_hadera', cat: 'desal', lat: 32.4655, lon: 34.8878, approx: true, en: 'Hadera desalination', he: 'התפלה חדרה',
    den: 'One of the large seawater plants, next to the Orot Rabin power station.', dhe: 'אחד ממתקני מי הים הגדולים, ליד תחנת הכוח אורות רבין.', links: [WATER] },
  { id: 'd_ashkelon', cat: 'desal', lat: 31.6335, lon: 34.5228, approx: true, en: 'Ashkelon desalination', he: 'התפלה אשקלון',
    den: 'Large seawater plant next to the Rutenberg power station.', dhe: 'מתקן מי ים גדול ליד תחנת הכוח רוטנברג.', links: [WATER] },
  // ---- ports ----
  { id: 'o_haifa', cat: 'ports', lat: 32.81932, lon: 35.03618, en: 'Port of Haifa', he: 'נמל חיפה',
    den: 'Ports are built at sea level by design; breakwaters and quays have to be raised as the sea rises.', dhe: 'נמלים נבנים בגובה פני הים מעצם טבעם; שוברי גלים ורציפים צריכים להיות מוגבהים כשהים עולה.', links: [W('Port_of_Haifa')] },
  { id: 'o_ashdod', cat: 'ports', lat: 31.82879, lon: 34.64757, en: 'Port of Ashdod', he: 'נמל אשדוד',
    den: "Israel's largest port.", dhe: 'הנמל הגדול בישראל.', links: [W('Port_of_Ashdod')] },
  // ---- forests & nature ----
  { id: 'n_carmel', cat: 'nature', lat: 32.7554, lon: 35.0024, en: 'Mount Carmel forest', he: 'יער הכרמל',
    den: 'The 2010 Carmel fire killed 44 people. Hotter, drier summers and longer droughts - projected for the Mediterranean - mean more days of high fire danger.',
    dhe: 'שריפת הכרמל ב־2010 גבתה 44 חיים. קיצים חמים ויבשים יותר ובצורות ארוכות - הצפויים בים התיכון - פירושם יותר ימים של סכנת שריפה גבוהה.', links: [W('2010_Mount_Carmel_forest_fire'), W('Mount_Carmel_National_Park'), MED] },
  { id: 'n_benshemen', cat: 'nature', lat: 31.95099, lon: 34.95537, en: 'Ben Shemen forest', he: 'יער בן שמן',
    den: 'A large planted pine forest next to cities and highways - the kind of forest most exposed to summer fires.',
    dhe: 'יער אורנים נטוע גדול ליד ערים וכבישים - סוג היער החשוף ביותר לשריפות קיץ.', links: [W('Ben_Shemen_Forest'), MED] },
  { id: 'n_hadera', cat: 'nature', lat: 32.42835, lon: 34.89551, en: 'Hadera forest', he: 'יער חדרה',
    den: 'A coastal-plain forest close to the shore and the power station.', dhe: 'יער במישור החוף, קרוב לים ולתחנת הכוח.', links: [MED] },
  { id: 'n_yatir', cat: 'nature', lat: 31.3425, lon: 35.06167, en: 'Yatir forest (desert edge)', he: 'יער יתיר (בשולי המדבר)',
    den: "Israel's largest planted forest, on the edge of the desert - a long-running research site for how forests cope with heat and drought.",
    dhe: 'היער הנטוע הגדול בישראל, בשולי המדבר - אתר מחקר ותיק לשאלה איך יערות מתמודדים עם חום ובצורת.', links: [W('Yatir_Forest'), MED] },
  { id: 'n_nitzanim', cat: 'nature', lat: 31.7175, lon: 34.63556, en: 'Nitzanim dunes', he: 'דיונות ניצנים',
    den: 'One of the last large coastal dune areas - squeezed between a rising sea and development.', dhe: 'אחד מאזורי הדיונות הגדולים האחרונים בחוף - נדחק בין ים עולה לבנייה.', links: [W('Nitzanim')] },
  { id: 'n_alexander', cat: 'nature', lat: 32.39643, lon: 34.88084, en: 'Alexander stream national park', he: 'גן לאומי נחל אלכסנדר',
    den: 'River mouth with soft-shell turtles and dunes; a higher sea pushes salt water up the stream.', dhe: 'שפך נחל עם צבי רכים ודיונות; ים גבוה יותר דוחף מי מלח במעלה הנחל.', links: [W('Alexander_River')] },
  { id: 'n_ashkelon', cat: 'nature', lat: 31.65775, lon: 34.5444, en: 'Ashkelon national park cliffs', he: 'מצוקי הגן הלאומי אשקלון',
    den: 'Ancient city walls on sandstone cliffs that the waves are wearing back.', dhe: 'חומות עתיקות על מצוקי כורכר שהגלים מכרסמים בהם.', links: [W('Ashkelon_National_Park')] },
];

const markers: { p: Poi; el: HTMLElement }[] = [];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function card(p: Poi) {
  const H = state.lang === 'he';
  const c = CATS.find((x) => x.id === p.cat)!;
  const v = assess(p.lon, p.lat);
  const head = `<div class="hs-kind" style="color:${c.color}">${c.icon} ${H ? c.he : c.en}</div><h3>${esc(H ? p.he : p.en)}</h3><p>${esc(H ? p.dhe : p.den)}</p>
    ${p.approx ? `<p class="hs-note">${H ? 'מיקום משוער' : 'Approximate location'}</p>` : ''}`;
  const risk = verdictHtml(v, H ? 'הסיכון מהים במקום הזה' : 'Sea risk at this spot', '', 'risk').replace(/<p class="muted small">[\s\S]*?<\/p><\/div>$/, '</div>');
  return `<div class="hs-card">${head}${evidenceHtml(EVIDENCE[p.id] ?? [], H)}${risk}
    <div class="hs-links"><b>${H ? 'מקורות' : 'Sources'}</b>${p.links.map((l) => `<a href="${l.u}" target="_blank" rel="noopener">${esc(l.t)} ↗</a>`).join('')}</div></div>`;
}

export function initPois() {
  for (const p of POIS) {
    const c = CATS.find((x) => x.id === p.cat)!;
    const el = document.createElement('button');
    el.className = `poi poi-${p.cat}`;
    el.style.setProperty('--c', c.color);
    el.innerHTML = `<span class="poi-ic">${c.icon}</span><span class="poi-label"></span>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); showSheet(() => card(p)); });
    new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -10] }).setLngLat([p.lon, p.lat]).addTo(map);
    markers.push({ p, el });
  }
  relabelPois();
  applyPois();
}
export function relabelPois() { for (const { p, el } of markers) el.querySelector('.poi-label')!.textContent = state.lang === 'he' ? p.he : p.en; }
export function applyPois() { for (const { p, el } of markers) el.style.display = visible[p.cat] ? '' : 'none'; }
export function setPoiVisible(cat: string, on: boolean) {
  visible[cat] = on; applyPois(); saveVisible();
}
export const poiCount = (cat: PoiCat) => POIS.filter((p) => p.cat === cat).length;
