// "Learn" tab: why the sea rises (with calculators), a timeline of Israel's coast,
// a quiz built on the app's sources, and material for the seminar class.
import { state, set, level } from './state';
import { fmt, meters } from './i18n';
import { slrScenario, commitment2000y } from './science';
import { reached } from './stats';
import { map } from './map';
import type { Site } from './data';

const H = () => state.lang === 'he';
const T = (en: string, he: string) => (H() ? he : en);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
type Sub = 'why' | 'timeline' | 'quiz' | 'class';
let sub: Sub = 'why';
let sites: Site[] = [];
export function initLearn(s: Site[]) { sites = s; }

const SRC = {
  ar6spm: 'https://www.ipcc.ch/report/ar6/wg1/chapter/summary-for-policymakers/',
  ar6ch9: 'https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-9/',
  monitor: 'https://www.ynetnews.com/environment/article/s15y8m10bl',
  comptroller: 'https://library.mevaker.gov.il/sites/DigitalLibrary/Documents/2020/Shilton-2020/EN/2020-Shilton2020-102-Matzok-Taktzir-EN.pdf',
  huji: 'https://hayadan.com/sea-cover-danger-in-israel-regarding-global-warming-3003116',
  prtr: 'https://www.gov.il/BlobFolder/news/prtr_2019_news/en/prtr_prtr_2019_ppt_eng.pdf',
  hreiz: 'https://doi.org/10.1371/journal.pone.0222560',
  caesarea: 'https://doi.org/10.3390/geosciences11080306',
  atlit: 'https://en.wikipedia.org/wiki/Atlit_Yam',
  pelerin: 'https://en.wikipedia.org/wiki/Ch%C3%A2teau_P%C3%A8lerin',
  carmel: 'https://en.wikipedia.org/wiki/2010_Mount_Carmel_forest_fire',
  fires25: 'https://en.wikipedia.org/wiki/2025_Israel%E2%80%93West_Bank_fires',
  ynetFlood: 'https://www.ynetnews.com/article/B1Fx9xHeU',
  beitYannay: 'https://cris.haifa.ac.il/en/publications/coastal-cliff-retreat-rates-at-beit-yannay-israel-in-the-20th-cen/',
  gloss: 'https://www.gloss-sealevel.org/gloss-station-handbook?stn=80',
  vousdoukas: 'https://doi.org/10.1038/s41558-020-0697-0',
  calcalist: 'https://www.calcalistech.com/ctechnews/article/e0elh1nl2',
};
const link = (u: string, t: string) => `<a href="${u}" target="_blank" rel="noopener">${esc(t)} ↗</a>`;

export function renderLearn(body: HTMLElement) {
  const tabs: [Sub, string, string][] = [['why', 'Why the sea rises', 'למה הים עולה'], ['timeline', 'Timeline', 'ציר זמן'], ['quiz', 'Quiz', 'חידון'], ['class', 'For the class', 'לכיתה']];
  body.innerHTML = `<h2>${T('Learn', 'ללמוד')}</h2>
    <div class="seg small wrap learn-tabs">${tabs.map(([k, en, he]) => `<button data-lsub="${k}" class="${sub === k ? 'on' : ''}">${H() ? he : en}</button>`).join('')}</div>
    <div id="learnbody"></div>`;
  body.querySelectorAll<HTMLButtonElement>('[data-lsub]').forEach((b) => b.addEventListener('click', () => { sub = b.dataset.lsub as Sub; renderLearn(body); }));
  const lb = body.querySelector<HTMLElement>('#learnbody')!;
  if (sub === 'why') why(lb); else if (sub === 'timeline') timeline(lb); else if (sub === 'quiz') quiz(lb); else klass(lb);
}

// ---------------- why the sea rises ----------------
// Shares of observed global mean sea-level rise 1971-2018 (IPCC AR6 WGI SPM A.4.3)
const PARTS = [
  { k: 'thermal', c: '#3987e5', v: 50, en: 'Warmer water expands', he: 'מים חמים מתפשטים' },
  { k: 'glaciers', c: '#199e70', v: 22, en: 'Mountain glaciers melt', he: 'קרחוני הרים נמסים' },
  { k: 'sheets', c: '#c98500', v: 20, en: 'Greenland & Antarctica lose ice', he: 'גרינלנד ואנטארקטיקה מאבדות קרח' },
  { k: 'land', c: '#d95926', v: 8, en: 'Water on land ends up in the sea', he: 'מים מהיבשה מגיעים לים' },
];
// Sea-level equivalent of all the ice (IPCC AR6 WGI Ch. 9)
const ICE = [
  { k: 'glaciers', m: 0.32, en: 'All mountain glaciers', he: 'כל קרחוני ההרים' },
  { k: 'greenland', m: 7.4, en: 'Greenland ice sheet', he: 'יריעת הקרח של גרינלנד' },
  { k: 'antarctica', m: 58, en: 'Antarctic ice sheet', he: 'יריעת הקרח של אנטארקטיקה' },
];
function why(el: HTMLElement) {
  const bar = PARTS.map((p) => `<i style="width:${p.v}%;background:${p.c}" title="${H() ? p.he : p.en}: ${p.v}%"></i>`).join('');
  el.innerHTML = `
    <p class="muted">${T('Two big things raise the sea: water expands as it warms, and ice on land melts into it. Here is how much each has added so far.', 'שני דברים עיקריים מעלים את הים: מים מתפשטים כשהם מתחממים, וקרח על היבשה נמס לתוכו. כך תרמה כל סיבה עד היום.')}</p>
    <h3>${T('What raised the sea, 1971–2018', 'מה העלה את הים, 1971–2018')}</h3>
    <div class="stackbar big">${bar}</div>
    <div class="legend-inline">${PARTS.map((p) => `<span><i style="background:${p.c}"></i>${H() ? p.he : p.en} <b>${p.v}%</b></span>`).join('')}</div>
    <p class="muted small">${link(SRC.ar6spm, 'IPCC AR6 WGI, Summary for Policymakers (A.4.3)')}</p>

    <h3>${T('Try it: warm the ocean', 'נסו: חממו את האוקיינוס')}</h3>
    <div class="lever">
      <div class="sl"><div class="row between"><label>${T('Warm the top', 'חימום השכבה העליונה')}</label><output id="th-d"></output></div><input type="range" class="eco" id="th-depth" min="100" max="2000" step="100" value="700"></div>
      <div class="sl"><div class="row between"><label>${T('By', 'ב־')}</label><output id="th-t"></output></div><input type="range" class="eco" id="th-temp" min="0.1" max="3" step="0.1" value="1"></div>
      <div class="result-hero small-hero"><div class="k">${T('The sea rises by about', 'הים עולה בערך')}</div><div class="v" id="th-r"></div></div>
      <p class="muted small">${T('Seawater expands about 0.02% for every 1 °C (a typical value for the upper ocean). Spread over hundreds of metres of water, that adds up.', 'מי ים מתפשטים בכ־0.02% לכל מעלה (ערך אופייני לאוקיינוס העליון). על פני מאות מטרים של מים, זה מצטבר.')}</p>
    </div>

    <h3>${T('Try it: melt the ice', 'נסו: המיסו את הקרח')}</h3>
    <div class="lever">
      ${ICE.map((i) => `<div class="sl"><div class="row between"><label>${H() ? i.he : i.en} <span class="muted">(${T('all of it', 'כולו')} = ${fmt(i.m, i.m < 1 ? 2 : 1)} m)</span></label><output id="ice-o-${i.k}"></output></div><input type="range" class="eco" data-ice="${i.k}" min="0" max="100" step="1" value="${i.k === 'glaciers' ? 50 : i.k === 'greenland' ? 10 : 0}"></div>`).join('')}
      <div class="result-hero small-hero"><div class="k">${T('Sea level rise from this melt', 'עליית מפלס מההמסה הזו')}</div><div class="v" id="ice-r"></div></div>
      <button class="btn primary" id="ice-map">${T('Show this on the map', 'הצגה על המפה')}</button>
      <p class="muted small">${link(SRC.ar6ch9, 'IPCC AR6 WGI Ch. 9 - sea-level equivalent of glaciers and ice sheets')}</p>
    </div>

    <h3>${T('Two ways the sea takes land', 'שתי דרכים שבהן הים לוקח יבשה')}</h3>
    <div class="cards2">
      <div class="card"><div class="l"><b>${T('Flooding ("bathtub")', 'הצפה ("אמבטיה")')}</b></div><p class="small">${T('Land lower than the sea goes under. This is the app\'s "Real elevation" view.', 'יבשה נמוכה מהים מוצפת. זו תצוגת "גובה אמיתי" באפליקציה.')}</p></div>
      <div class="card"><div class="l"><b>${T('Erosion', 'סחף')}</b></div><p class="small">${T('Waves eat beaches and cliffs, so the shore moves inland much further than the rise itself. That is the "Illustration" view.', 'גלים אוכלים חופים ומצוקים, כך שקו החוף נסוג הרבה יותר מגובה העלייה עצמה. זו תצוגת "המחשה".')} ${link(SRC.vousdoukas, 'Vousdoukas et al. 2020')}</p></div>
      <div class="card"><div class="l"><b>${T('Storm surge', 'נחשול סערה')}</b></div><p class="small">${T('Winter storms pile water on top of the higher sea. Try "Storm on top" in the dock.', 'סערות חורף מערימות מים מעל הים הגבוה יותר. נסו "סערה מעל" בלוח הבקרה.')}</p></div>
      <div class="card"><div class="l"><b>${T('Committed rise', 'עלייה מחויבת')}</b></div><p class="small">${T('Ice sheets react slowly: at 2 °C the sea keeps rising for 2,000 years, by about', 'יריעות קרח מגיבות לאט: ב־2° הים ממשיך לעלות 2,000 שנה, בכ־')} ${fmt(commitment2000y(2).lo)}–${fmt(commitment2000y(2).hi)} m.</p></div>
    </div>`;
  const D = el.querySelector<HTMLInputElement>('#th-depth')!, Tt = el.querySelector<HTMLInputElement>('#th-temp')!;
  const upd = () => {
    const d = Number(D.value), t = Number(Tt.value), dh = 2e-4 * t * d;
    el.querySelector('#th-d')!.textContent = `${fmt(d)} m`;
    el.querySelector('#th-t')!.textContent = `+${fmt(t, 1)} °C`;
    el.querySelector('#th-r')!.textContent = dh < 1 ? `${fmt(dh * 100, 0)} cm` : `${fmt(dh, 2)} m`;
  };
  D.oninput = upd; Tt.oninput = upd; upd();
  const iceSum = () => ICE.reduce((s, i) => s + i.m * Number(el.querySelector<HTMLInputElement>(`[data-ice="${i.k}"]`)!.value) / 100, 0);
  const updIce = () => {
    for (const i of ICE) {
      const v = Number(el.querySelector<HTMLInputElement>(`[data-ice="${i.k}"]`)!.value);
      el.querySelector(`#ice-o-${i.k}`)!.textContent = `${v}% → ${fmt((i.m * v) / 100, 2)} m`;
    }
    const s = iceSum();
    el.querySelector('#ice-r')!.textContent = meters(s, 2);
  };
  el.querySelectorAll<HTMLInputElement>('[data-ice]').forEach((i) => (i.oninput = updIce)); updIce();
  el.querySelector<HTMLButtonElement>('#ice-map')!.onclick = () => set({ driver: 'manual', manual: Math.min(20, Math.round(iceSum() * 20) / 20), longTerm: false, compare: false, panel: null });
}

// ---------------- timeline ----------------
interface Ev { y: string; en: string; he: string; u: string; src: string; go?: [number, number, number]; year?: number }
const EVENTS: Ev[] = [
  { y: '~6900–6300 BCE', en: 'Atlit Yam, a farming village, sits by the shore. The rising sea after the ice age later drowns it; it lies 8–12 m down today.', he: 'עתלית ים, כפר חקלאי, יושב על החוף. הים העולה שאחרי עידן הקרח מטביע אותו מאוחר יותר; היום הוא בעומק 8–12 מ׳.', u: SRC.atlit, src: 'Wikipedia - Atlit Yam', go: [34.9352, 32.7108, 15] },
  { y: '~5500–5000 BCE', en: 'At Tel Hreiz people build a 100 m boulder seawall against the sea - the oldest known. The village is still flooded and abandoned.', he: 'בתל חריז בונים חומת ים מסלעים באורך 100 מ׳ נגד הים - העתיקה ביותר הידועה. הכפר עדיין מוצף וננטש.', u: SRC.hreiz, src: 'Galili et al. 2019, PLOS ONE', go: [34.925, 32.679, 15] },
  { y: '22–10 BCE', en: 'Herod builds Sebastos, the great harbour of Caesarea. Winter storms later wash out its sandy foundations and the breakwaters sink.', he: 'הורדוס בונה את סבסטוס, הנמל הגדול של קיסריה. סערות חורף שוטפות מאוחר יותר את יסודות החול ושוברי הגלים שוקעים.', u: SRC.caesarea, src: 'Galili et al. 2021, Geosciences', go: [34.8875, 32.5005, 15.5] },
  { y: '1218', en: 'The Templars build the Atlit fortress, with foundations below sea level and piers in the water.', he: 'הטמפלרים בונים את מבצר עתלית, עם יסודות מתחת לפני הים ומזחים במים.', u: SRC.pelerin, src: 'Wikipedia - Château Pèlerin', go: [34.9465, 32.706, 15.5] },
  { y: '1918–2000', en: 'Aerial photos show the cliff at Beit Yannay retreating about 20 cm a year - up to 25 m in total.', he: 'צילומי אוויר מראים שהמצוק בבית ינאי נסוג כ־20 ס״מ בשנה - עד 25 מ׳ בסך הכול.', u: SRC.beitYannay, src: 'Zviely & Klein 2004', go: [34.865, 32.39, 15] },
  { y: '1992', en: 'The Hadera tide gauge starts recording the sea level (GLOSS station 80).', he: 'מד הגאות בחדרה מתחיל לתעד את מפלס הים (תחנת GLOSS ‏80).', u: SRC.gloss, src: 'GLOSS station handbook - Hadera', go: [34.86, 32.47, 14] },
  { y: '2010', en: 'The Carmel forest fire kills 44 people - the deadliest in Israel\'s history.', he: 'שריפת הכרמל הורגת 44 בני אדם - הקטלנית בתולדות ישראל.', u: SRC.carmel, src: 'Wikipedia - 2010 Mount Carmel forest fire', go: [35.0024, 32.7554, 12.5] },
  { y: '2011', en: 'The government decides to protect the 45 km unstable cliff. By 2019 only 8.6% of the budget had been spent.', he: 'הממשלה מחליטה להגן על המצוק הלא יציב באורך 45 ק״מ. עד 2019 נוצלו רק 8.6% מהתקציב.', u: SRC.comptroller, src: 'State Comptroller 2020', go: [34.85, 32.33, 13] },
  { y: '2019', en: 'Three sources - Orot Rabin, Rutenberg and Nesher - produce about 70% of reported emissions.', he: 'שלושה מקורות - אורות רבין, רוטנברג ונשר - אחראים לכ־70% מהפליטות המדווחות.', u: SRC.prtr, src: 'Ministry of Environmental Protection - PRTR 2019', go: [34.89, 32.47, 13] },
  { y: 'Jan 2020', en: 'Record storms flood the north; Nahariya suffers the most damage.', he: 'סערות שיא מציפות את הצפון; נהריה סופגת את הנזק הכבד ביותר.', u: SRC.ynetFlood, src: 'Ynet', go: [35.098, 33.006, 14] },
  { y: '2024', en: 'The national monitoring report: the sea off Israel is up about 15 cm since 1992.', he: 'דוח הניטור הלאומי: הים מול ישראל עלה בכ־15 ס״מ מאז 1992.', u: SRC.monitor, src: '2024 national monitoring report (Ynet)' },
  { y: '2025', en: 'Wildfires race through the forests near Latrun in heat and strong winds; data centres ask for 27,000 MW of grid power.', he: 'שריפות מתפשטות ביערות ליד לטרון בחום ורוחות חזקות; חוות שרתים מבקשות 27,000 מגה־וואט מהרשת.', u: SRC.fires25, src: 'Wikipedia - 2025 fires; Calcalist' },
  { y: '2050', en: 'Projected: about +0.2 to +0.3 m in every scenario.', he: 'צפוי: כ־+0.2 עד +0.3 מ׳ בכל התרחישים.', u: SRC.ar6ch9, src: 'IPCC AR6 projections (Hadera)', year: 2050 },
  { y: '2100', en: 'Projected: our choice - from about +0.4 m (net zero) to +0.8 m (fossil fuels), or more if ice sheets collapse.', he: 'צפוי: הבחירה שלנו - מכ־+0.4 מ׳ (אפס נטו) עד +0.8 מ׳ (דלק מאובנים), או יותר אם יריעות הקרח קורסות.', u: SRC.ar6ch9, src: 'IPCC AR6 projections (Hadera)', year: 2100 },
  { y: '2150', en: 'Projected: still rising - the sea does not stop in 2100.', he: 'צפוי: עדיין עולה - הים לא נעצר ב־2100.', u: SRC.ar6ch9, src: 'IPCC AR6 projections (Hadera)', year: 2150 },
];
function timeline(el: HTMLElement) {
  el.innerHTML = `<p class="muted">${T('From a drowned village 9,000 years ago to the choices of this century. Click an event to fly there or set the year.', 'מכפר שטבע לפני 9,000 שנה ועד הבחירות של המאה הזו. לחצו על אירוע כדי לטוס אליו או לקבוע את השנה.')}</p>
    <ol class="tl">${EVENTS.map((e, i) => `<li class="${e.year ? 'future' : ''}"><button data-ev="${i}"><span class="tl-y">${e.y}</span><span class="tl-t">${esc(H() ? e.he : e.en)}</span></button>
      <span class="tl-s">${link(e.u, e.src)}</span></li>`).join('')}</ol>`;
  el.querySelectorAll<HTMLButtonElement>('[data-ev]').forEach((b) => b.addEventListener('click', () => {
    const e = EVENTS[Number(b.dataset.ev)];
    if (e.year) set({ driver: 'scenario', year: e.year, longTerm: false });
    if (e.go) map.flyTo({ center: [e.go[0], e.go[1]], zoom: e.go[2], pitch: state.view === '2d' ? 0 : 60, duration: 2600 });
  }));
}

// ---------------- quiz ----------------
interface Q { q: [string, string]; a: [string, string][]; right: number; why: [string, string]; u: string }
function questions(): Q[] {
  const s245 = slrScenario('ssp245', 2100);
  return [
    { q: ['How much has the sea off Israel risen since 1992?', 'בכמה עלה הים מול ישראל מאז 1992?'], a: [['About 1.5 cm', 'כ־1.5 ס״מ'], ['About 15 cm', 'כ־15 ס״מ'], ['About 1.5 m', 'כ־1.5 מ׳']], right: 1, why: ['The 2024 national monitoring report: ~15 cm, about 4.7 mm a year.', 'דוח הניטור הלאומי 2024: כ־15 ס״מ, כ־4.7 מ״מ בשנה.'], u: SRC.monitor },
    { q: ['What raised the sea most between 1971 and 2018?', 'מה העלה את הים יותר מכול בין 1971 ל־2018?'], a: [['Warmer water expanding', 'התפשטות מים חמים'], ['Melting sea ice', 'המסת קרח ים'], ['More rain', 'יותר גשם']], right: 0, why: ['Thermal expansion explained about 50%. Melting sea ice barely changes sea level - it already floats.', 'התפשטות תרמית הסבירה כ־50%. המסת קרח ים כמעט לא משנה את המפלס - הוא כבר צף.'], u: SRC.ar6spm },
    { q: ['Under current policies, about how high will the sea be at Hadera in 2100?', 'במדיניות הנוכחית, כמה יעלה הים בחדרה עד 2100 בערך?'], a: [[meters(s245 / 10, 2), meters(s245 / 10, 2)], [meters(s245, 2), meters(s245, 2)], [meters(s245 * 10, 1), meters(s245 * 10, 1)]], right: 1, why: ['IPCC AR6 SSP2-4.5 median for the Hadera tide gauge, used by this app.', 'חציון IPCC AR6 בתרחיש SSP2-4.5 למד הגאות בחדרה, שבו משתמשת האפליקציה.'], u: SRC.ar6ch9 },
    { q: ['How far did the Ashkelon cliff retreat in 20 years?', 'כמה נסוג מצוק אשקלון ב־20 שנה?'], a: [['Up to 2 m', 'עד 2 מ׳'], ['Up to 22 m', 'עד 22 מ׳'], ['Up to 220 m', 'עד 220 מ׳']], right: 1, why: ['State Comptroller 2020.', 'מבקר המדינה 2020.'], u: SRC.comptroller },
    { q: ['What mainly destroyed Herod\'s harbour at Caesarea?', 'מה הרס בעיקר את נמל הורדוס בקיסריה?'], a: [['An earthquake', 'רעידת אדמה'], ['Storms washing out its sandy foundations', 'סערות ששטפו את יסודות החול'], ['A war', 'מלחמה']], right: 1, why: ['Galili et al. 2021: storms, with tsunamis at most adding to the damage.', 'גלילי ועמיתיו 2021: סערות, וצונאמי לכל היותר הוסיף לנזק.'], u: SRC.caesarea },
    { q: ['Where is the oldest known seawall against the rising sea?', 'איפה נמצאת חומת הים העתיקה ביותר הידועה נגד הים העולה?'], a: [['Venice', 'ונציה'], ['The Netherlands', 'הולנד'], ['Off the Carmel coast, Israel', 'מול חוף הכרמל, ישראל']], right: 2, why: ['Tel Hreiz, about 7,000 years old (Galili et al. 2019).', 'תל חריז, בן כ־7,000 שנה (גלילי ועמיתיו 2019).'], u: SRC.hreiz },
    { q: ['With a 1.5 m rise, about how much of Haifa would flood?', 'בעלייה של 1.5 מ׳, כמה מחיפה יוצף בערך?'], a: [['1%', '1%'], ['12.5%', '12.5%'], ['50%', '50%']], right: 1, why: ['About 7.5 km² (Hebrew University mapping).', 'כ־7.5 קמ״ר (מיפוי האוניברסיטה העברית).'], u: SRC.huji },
    { q: ['Which three sources made ~70% of Israel\'s reported emissions (2019)?', 'אילו שלושה מקורות אחראים לכ־70% מהפליטות המדווחות (2019)?'], a: [['Cars, planes and ships', 'מכוניות, מטוסים ואוניות'], ['Orot Rabin, Rutenberg and Nesher cement', 'אורות רבין, רוטנברג ומלט נשר'], ['Three data centres', 'שלוש חוות שרתים']], right: 1, why: ['PRTR 2019 - two coal power stations and a cement works.', 'מרשם הפליטות 2019 - שתי תחנות פחם ומפעל מלט.'], u: SRC.prtr },
    { q: ['If warming stays near 2 °C, how much will the sea rise over 2,000 years?', 'אם ההתחממות תישאר סביב 2°, כמה יעלה הים לאורך 2,000 שנה?'], a: [['0.2–0.6 m', '0.2–0.6 מ׳'], ['2–6 m', '2–6 מ׳'], ['20–60 m', '20–60 מ׳']], right: 1, why: ['IPCC AR6 WGI SPM B.5.4.', 'IPCC AR6 WGI SPM B.5.4.'], u: SRC.ar6spm },
    { q: ['Data centres could use about what share of Israel\'s electricity by 2030?', 'איזה חלק מהחשמל בישראל עשויות לצרוך חוות שרתים עד 2030?'], a: [['About 2%', 'כ־2%'], ['About 20%', 'כ־20%'], ['About 60%', 'כ־60%']], right: 1, why: ['Calcalist, citing estimates for 2030.', 'כלכליסט, לפי הערכות ל־2030.'], u: SRC.calcalist },
  ];
}
const answers: Record<number, number> = {};
function quiz(el: HTMLElement) {
  const qs = questions();
  const done = Object.keys(answers).length, score = qs.filter((q, i) => answers[i] === q.right).length;
  el.innerHTML = `<div class="row between"><p class="muted">${T('Every answer comes from a source in the app.', 'כל תשובה מגיעה ממקור באפליקציה.')}</p>
      <b class="quiz-score">${score} / ${qs.length}</b></div>
    ${qs.map((q, i) => {
      const a = answers[i];
      return `<div class="quiz-q ${a == null ? '' : a === q.right ? 'ok' : 'bad'}"><b>${i + 1}. ${esc(H() ? q.q[1] : q.q[0])}</b>
        <div class="quiz-a">${q.a.map((o, j) => `<button data-qz="${i}" data-qa="${j}" class="${a == null ? '' : j === q.right ? 'right' : j === a ? 'wrong' : 'dim'}" ${a != null ? 'disabled' : ''}>${esc(H() ? o[1] : o[0])}</button>`).join('')}</div>
        ${a != null ? `<p class="small">${a === q.right ? '✅' : '❌'} ${esc(H() ? q.why[1] : q.why[0])} ${link(q.u, T('Source', 'מקור'))}</p>` : ''}</div>`;
    }).join('')}
    ${done ? `<button class="btn" id="quiz-reset">${T('Start again', 'להתחיל מחדש')}</button>` : ''}`;
  el.querySelectorAll<HTMLButtonElement>("[data-qz]").forEach((b) => b.addEventListener('click', () => { answers[Number(b.dataset.qz)] = Number(b.dataset.qa); quiz(el); }));
  el.querySelector<HTMLButtonElement>('#quiz-reset')?.addEventListener('click', () => { for (const k of Object.keys(answers)) delete answers[Number(k)]; quiz(el); });
}

// ---------------- for the class ----------------
const PROMPTS: [string, string][] = [
  ['Compound flooding: in Haifa Bay and Nahariya, how does a higher sea turn a winter rainstorm into an urban flood when the sea blocks rivers from draining?', 'הצפה משולבת: במפרץ חיפה ובנהריה, איך ים גבוה יותר הופך סערת גשם חורפית להצפה עירונית כשהים חוסם את ניקוז הנחלים?'],
  ['Hard walls or nature? Compare sea walls in Tel Aviv and Netanya with restoring dunes and seagrass. What happens to a beach in front of a wall as the sea rises?', 'חומות או טבע? השוו חומות ים בתל אביב ונתניה לשיקום דיונות ועשבי ים. מה קורה לחוף שמול חומה כשהים עולה?'],
  ['Salt in the aquifer: fresh groundwater floats on seawater - roughly 40 m of fresh water below sea level for every 1 m above it (the Ghyben-Herzberg rule). What does a higher sea do to coastal wells?', 'מלח באקוויפר: מי תהום מתוקים צפים על מי ים - בערך 40 מ׳ מים מתוקים מתחת לפני הים לכל מטר מעליו (כלל גייבן־הרצברג). מה עושה ים גבוה יותר לבארות בחוף?'],
  ['Heritage triage: Old Akko, Caesarea, Tel Dor, Atlit - which sites get engineered protection, and which are recorded digitally before they are lost?', 'מיון מורשת: עכו העתיקה, קיסריה, תל דור, עתלית - אילו אתרים יקבלו הגנה הנדסית, ואילו יתועדו דיגיטלית לפני שיאבדו?'],
  ['Who acts? In "What can we do?", compare one student with the whole university and all of Israel. Why do transport and energy policies matter more than single choices?', 'מי פועל? ב"מה אפשר לעשות?", השוו סטודנט אחד לכל האוניברסיטה ולכל ישראל. למה מדיניות תחבורה ואנרגיה חשובה יותר מבחירות בודדות?'],
  ['Data centres and the coast: Israel\'s grid got 27,000 MW of data-centre requests. Where should they go - and who decides? Use the site checker.', 'חוות שרתים והחוף: הרשת בישראל קיבלה בקשות ל־27,000 מגה־וואט לחוות שרתים. איפה הן צריכות להיות - ומי מחליט? השתמשו בבודק האתרים.'],
];
const ACTIVITIES: [string, string][] = [
  ['Pick a place. Record buildings and land reached at +0.5, +1, +2 and +5 m in both views. When does it change from "a little" to "a lot"?', 'בחרו מקום. רשמו מבנים ושטח שהים מגיע אליהם ב־+0.5, +1, +2 ו־+5 מ׳ בשתי התצוגות. מתי זה עובר מ"קצת" ל"הרבה"?'],
  ['Use Compare futures at 2100 and 2150. How much coast does net zero save in your city?', 'השתמשו בהשוואת עתידים ב־2100 וב־2150. כמה חוף מציל אפס נטו בעיר שלכם?'],
  ['Fly the University of Haifa plane from Haifa Bay to Akko at 2150 (ice-sheet scenario). Write down three things you saw.', 'הטיסו את מטוס אוניברסיטת חיפה ממפרץ חיפה לעכו ב־2150 (תרחיש קריסת קרח). רשמו שלושה דברים שראיתם.'],
  ['Open three evidence cards. Which source types (study, official, news) are they? Which would you trust most, and why?', 'פתחו שלושה כרטיסי ראיות. מאיזה סוג המקורות (מחקר, רשמי, חדשות)? באיזה הייתם סומכים יותר, ולמה?'],
];
function klass(el: HTMLElement) {
  el.innerHTML = `
    <h3>${T('Discussion questions', 'שאלות לדיון')}</h3>
    <ol class="prompts">${PROMPTS.map((p) => `<li>${esc(H() ? p[1] : p[0])}</li>`).join('')}</ol>
    <h3>${T('Activities', 'פעילויות')}</h3>
    <ol class="prompts">${ACTIVITIES.map((p) => `<li>${esc(H() ? p[1] : p[0])}</li>`).join('')}</ol>
    <h3>${T('Download the data', 'הורדת הנתונים')}</h3>
    <p class="muted small">${T('A spreadsheet (CSV) with every place: buildings, land and roads reached at the current sea level and at +0.5, +1, +2 and +5 m, in both views.', 'גיליון (CSV) עם כל המקומות: מבנים, שטח וכבישים שהים מגיע אליהם במפלס הנוכחי וב־+0.5, +1, +2 ו־+5 מ׳, בשתי התצוגות.')}</p>
    <button class="btn primary" id="csv">${T('Download CSV', 'הורדת CSV')}</button>`;
  el.querySelector<HTMLButtonElement>('#csv')!.onclick = downloadCsv;
}
function downloadCsv() {
  const L = Math.max(0, level());
  const levels = [L, 0.5, 1, 2, 5];
  const head = ['place', 'lat', 'lon', ...levels.flatMap((l, i) => {
    const tag = i === 0 ? `now_${l.toFixed(2)}m` : `${l}m`;
    return [`buildings_${tag}`, `land_ha_${tag}`, `road_km_${tag}`, `buildings_${tag}_illus`, `land_ha_${tag}_illus`];
  })];
  const rows = sites.map((s) => [s.en, s.lat, s.lon, ...levels.flatMap((l) => [
    Math.round(reached(s.id, 'buildings', l)), (reached(s.id, 'land_m2', l) / 1e4).toFixed(1), (reached(s.id, 'road_m', l) / 1000).toFixed(2),
    Math.round(reached(s.id, 'buildings', l, true)), (reached(s.id, 'land_m2', l, true) / 1e4).toFixed(1),
  ])]);
  const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `save-the-coast-line-${state.year}-${L.toFixed(2)}m.csv`;
  a.click();
}
