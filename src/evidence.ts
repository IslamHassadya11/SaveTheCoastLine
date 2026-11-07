// Evidence shown on the map cards: findings from studies, official reports and news,
// each with its source. Every link was opened and the figure checked against the page
// (some publishers block automated checks; their links were confirmed by search).
export interface Fact { en: string; he: string; src: string; u: string; kind: 'study' | 'official' | 'news' }

const F = (kind: Fact['kind'], src: string, u: string, en: string, he: string): Fact => ({ kind, src, u, en, he });

// shared sources
const HUJI = (en: string, he: string) => F('study', 'Felsenstein & Lichter, Hebrew University (SECOA project), via Hayadan', 'https://hayadan.com/sea-cover-danger-in-israel-regarding-global-warming-3003116', en, he);
const MONITOR = F('official', 'Israel\'s national Mediterranean monitoring report 2024, via Ynet', 'https://www.ynetnews.com/environment/article/s15y8m10bl',
  'The sea off Israel has risen about 15 cm since 1992 - about 4.7 mm a year, faster than the global 3.4 mm - and the upper sea is warming by 0.05 °C a year.',
  'הים מול ישראל עלה בכ־15 ס״מ מאז 1992 - כ־4.7 מ״מ בשנה, מהר מהממוצע העולמי של 3.4 מ״מ - ושכבת המים העליונה מתחממת ב־0.05° בשנה.');
const COMPTROLLER = 'https://library.mevaker.gov.il/sites/DigitalLibrary/Documents/2020/Shilton-2020/EN/2020-Shilton2020-102-Matzok-Taktzir-EN.pdf';
const CLIFF45 = F('official', 'State Comptroller 2020 - Handling of coastal cliff erosion', COMPTROLLER,
  'Israel has a 45 km unstable coastal cliff. Erosion is expected to speed up this century, pushing the cliff and beaches back tens of metres.',
  'לאורך חוף ישראל יש מצוק לא יציב באורך 45 ק״מ. הסחף צפוי להאיץ במאה הזו ולהסיג את המצוק והחופים בעשרות מטרים.');
const CLIFF_UNDONE = F('official', 'State Comptroller 2020 - Handling of coastal cliff erosion', COMPTROLLER,
  'Nine years after the government decided to protect the cliff, sea-side protection had still not been built in Hadera, Emek Hefer, Netanya, Herzliya, Tel Aviv-Yafo, Bat Yam and Gan Rave. The protection company had spent only 8.6% of its planned budget.',
  'תשע שנים אחרי החלטת הממשלה להגן על המצוק, ההגנה הימית עדיין לא נבנתה בחדרה, עמק חפר, נתניה, הרצליה, תל אביב־יפו, בת ים וגן רווה. חברת ההגנה ניצלה רק 8.6% מהתקציב המתוכנן.');
const BEIT_YANNAY = F('study', 'Zviely & Klein 2004, Earth Surface Processes and Landforms', 'https://cris.haifa.ac.il/en/publications/coastal-cliff-retreat-rates-at-beit-yannay-israel-in-the-20th-cen/',
  'Aerial photos 1918-2000 at Beit Yannay (north of Netanya): the cliff top retreated about 20 cm a year on average, up to 25 m in total.',
  'צילומי אוויר 1918-2000 בבית ינאי (צפונית לנתניה): ראש המצוק נסוג בממוצע כ־20 ס״מ בשנה, עד 25 מ׳ בסך הכול.');
const LONG_CLIFF = F('study', 'Galili & Zviely 2019 - geo-archaeological markers of cliff retreat', 'https://cris.haifa.ac.il/en/publications/geo-archaeological-markers-reveal-magnitude-and-rates-of-israeli-/',
  'Over 7,500 years the Sharon cliff retreated about 730 m (9.7 cm a year); the authors link human activity and sea-level rise to faster erosion in the last century.',
  'במשך 7,500 שנה נסוג מצוק השרון בכ־730 מ׳ (9.7 ס״מ בשנה); החוקרים קושרים פעילות אדם ועליית מפלס להאצת הסחף במאה האחרונה.');
const COHORT = F('study', 'Lev Bar-Or et al. 2023, Environment & Health', 'https://cris.iucc.ac.il/en/publications/associations-of-adolescence-exposure-to-industrial-air-pollution-/',
  'In 2.19 million young Israelis, more exposure to Haifa Bay industrial air pollution as teenagers meant a higher cancer risk (adjusted hazard ratio 1.16).',
  'בקרב 2.19 מיליון צעירים בישראל, חשיפה גבוהה יותר לזיהום אוויר תעשייתי במפרץ חיפה בגיל ההתבגרות נקשרה לסיכון גבוה יותר לסרטן (יחס סיכון מתוקנן 1.16).');
const PRTR = F('official', 'Ministry of Environmental Protection - PRTR 2019 summary', 'https://www.gov.il/BlobFolder/news/prtr_2019_news/en/prtr_prtr_2019_ppt_eng.pdf',
  'Three sources - the Orot Rabin and Rutenberg power stations and the Nesher cement works in Ramla - produced about 70% of the emissions reported in the national register.',
  'שלושה מקורות - תחנות הכוח אורות רבין ורוטנברג ומפעל המלט נשר ברמלה - אחראים לכ־70% מהפליטות המדווחות במרשם הלאומי.');
const DC20 = F('news', 'Calcalist - Israel to cap new data centers at 200 MW', 'https://www.calcalistech.com/ctechnews/article/e0elh1nl2',
  'Data centres could reach about 20% of Israel\'s electricity use by 2030. Developers asked for 27,000 MW of grid connections - more than the country\'s 18,800 MW of installed power.',
  'חוות שרתים עשויות להגיע לכ־20% מצריכת החשמל בישראל עד 2030. יזמים ביקשו חיבורים של 27,000 מגה־וואט - יותר מ־18,800 מגה־וואט ההספק המותקן במדינה.');
const LIGHTSOUT = F('study', 'Durairajan et al. 2018 - Lights Out', 'https://doi.org/10.1145/3232755.3232775',
  'Overlaying internet infrastructure with sea-level projections, the study found data centres, exchange points and cable landing stations in coastal cities at risk within 15 years.',
  'בהצלבת תשתיות אינטרנט עם תחזיות מפלס, המחקר מצא חוות שרתים, נקודות חיבור ותחנות נחיתת כבלים בערי חוף בסיכון בתוך 15 שנה.');
const FANACK = F('news', 'Fanack Water - Water infrastructure in Israel', 'https://water.fanack.com/israel/water-infrastructure-in-israel/',
  'Seawater plants supply a large share of Israel\'s drinking water: Sorek about 150, Hadera 145 and Ashkelon 120 million m³ a year - all built on the shore.',
  'מתקני מי ים מספקים חלק גדול ממי השתייה בישראל: שורק כ־150, חדרה 145 ואשקלון 120 מיליון מ״ק בשנה - כולם בנויים על החוף.');

/** Evidence for the whole coast, shown on every "at risk" card. */
export const COAST: Fact[] = [MONITOR,
  HUJI('Mapping by the Hebrew University found a 0.5 m rise floods about 10 km² of the coast, 1.5 m about 27 km² and 2 m about 33 km².',
    'מיפוי של האוניברסיטה העברית מצא שעלייה של 0.5 מ׳ מציפה כ־10 קמ״ר מהחוף, 1.5 מ׳ כ־27 קמ״ר ו־2 מ׳ כ־33 קמ״ר.')];

export const EVIDENCE: Record<string, Fact[]> = {
  // ---- places at risk ----
  r_haifa: [
    HUJI('With a 1.5 m rise, Haifa would lose about 7.5 km² - 12.5% of the city. A 6 m tsunami would flood about 14 km².', 'בעלייה של 1.5 מ׳ חיפה תאבד כ־7.5 קמ״ר - 12.5% משטח העיר. צונאמי של 6 מ׳ יציף כ־14 קמ״ר.'),
    COHORT,
    F('news', 'Times of Israel - Polluting Haifa oil refineries must close by 2025, PM\'s adviser demands', 'https://www.timesofisrael.com/polluting-haifa-oil-refineries-must-close-by-2025-pms-economic-adviser-demands/',
      'The refineries sit on the bank of the Kishon. Plans to clear the area cite guarding against more flooding as the climate warms.', 'בתי הזיקוק יושבים על גדת הקישון. תוכניות לפנות את האזור מזכירות הגנה מפני יותר הצפות ככל שהאקלים מתחמם.'),
  ],
  r_krayot: [
    F('study', 'Ynet - study points to Haifa-area cancer hot spots (Environmental Research)', 'https://www.ynetnews.com/articles/0,7340,L-4824472,00.html',
      'Using the Israel Cancer Registry, researchers mapped higher lung-cancer rates in parts of Kiryat Haim and Kiryat Ata.', 'בעזרת מרשם הסרטן הלאומי מיפו החוקרים שיעורי סרטן ריאה גבוהים יותר בחלקים מקריית חיים וקריית אתא.'),
    COHORT,
  ],
  r_akko: [HUJI('With a 1.5 m rise, Akko would lose about 11.2% of its area - one of the highest shares on the coast.', 'בעלייה של 1.5 מ׳ עכו תאבד כ־11.2% משטחה - מהשיעורים הגבוהים בחוף.')],
  r_nahariya: [
    F('news', 'Ynet - Heavy rainfall in Israel\'s north breaks 50-year record (Jan 2020)', 'https://www.ynetnews.com/article/B1Fx9xHeU',
      'In the January 2020 storms Nahariya "suffered the most damage"; parts of the Western Galilee got up to 450 mm of rain in two weeks, the most since 1969. A man drowned trying to rescue people from a flooded car.',
      'בסערות ינואר 2020 נהריה "ספגה את הנזק הכבד ביותר"; בחלקים מהגליל המערבי ירדו עד 450 מ״מ גשם בשבועיים, הכי הרבה מאז 1969. אדם טבע בניסיון לחלץ אנשים מרכב מוצף.'),
    F('news', 'Watchers - Major floods hit Israel (Jan 2020)', 'https://watchers.news/2020/01/06/major-floods-hit-israel-after-20-percent-of-yearly-rainfall-in-just-2-hours/',
      'Rescuers were called to dozens of people trapped in flooded homes, cars and roads, especially in Nahariya.', 'כוחות הצלה הוזעקו לעשרות אנשים שנלכדו בבתים, רכבים וכבישים מוצפים, במיוחד בנהריה.'),
    HUJI('In a 6 m tsunami scenario, 22.3% of Nahariya (2.2 km²) would flood.', 'בתרחיש צונאמי של 6 מ׳ יוצפו 22.3% מנהריה (2.2 קמ״ר).'),
  ],
  r_atlit: [F('study', 'Château Pèlerin (Atlit fortress)', 'https://en.wikipedia.org/wiki/Ch%C3%A2teau_P%C3%A8lerin',
    'The Crusader fortress was built with foundations below sea level and piers in the water; it was badly damaged in the 1837 earthquake.', 'המבצר הצלבני נבנה עם יסודות מתחת לפני הים ומזחים במים; הוא נפגע קשות ברעידת האדמה של 1837.')],
  r_maagan: [HUJI('Next door, Jisr az-Zarqa would lose about 9.7% of its area with a 1.5 m rise.', 'בסמוך, ג׳סר א־זרקא תאבד כ־9.7% משטחה בעלייה של 1.5 מ׳.')],
  r_hadera: [
    F('study', 'WIT Press 2018 - Impact of emissions from a large coal-fired power plant on nearby communities in the Hadera region', 'https://witpress.com/elibrary/wit-transactions-on-ecology-and-the-environment/230/36795',
      'At the monitoring site closest to the plant, coal power-plant emissions were a major source of PM10 particles (29.1%).', 'בתחנת הניטור הקרובה ביותר לתחנה, פליטות תחנת הפחם היו מקור מרכזי לחלקיקי PM10 ‏(29.1%).'),
    PRTR, CLIFF_UNDONE,
  ],
  r_netanya: [CLIFF45, BEIT_YANNAY, LONG_CLIFF, CLIFF_UNDONE],
  r_telaviv: [
    F('news', 'Watchers - Major floods hit Israel (Jan 2020)', 'https://watchers.news/2020/01/06/major-floods-hit-israel-after-20-percent-of-yearly-rainfall-in-just-2-hours/',
      'On 4 January 2020 Tel Aviv got 74 mm of rain - about 20% of a year - in two hours. Two people died in a flooded elevator.', 'ב־4 בינואר 2020 ירדו בתל אביב 74 מ״מ גשם - כ־20% מכמות שנתית - בשעתיים. שני אנשים מתו במעלית מוצפת.'),
    CLIFF_UNDONE,
  ],
  r_ashdod: [MONITOR],
  r_ashkelon: [
    F('official', 'State Comptroller 2020 - Handling of coastal cliff erosion', COMPTROLLER,
      'The Ashkelon cliff has retreated up to 22 m in the last 20 years, and the beach has narrowed. Only urgent sea-side work was ever done, and only here.', 'מצוק אשקלון נסוג עד 22 מ׳ ב־20 השנים האחרונות, ורצועת החוף הצטמצמה. רק עבודה דחופה בים בוצעה אי פעם, ורק כאן.'),
    CLIFF45,
  ],
  // ---- already under the sea ----
  s_atlityam: [
    F('study', 'Galili et al. - Israel: submerged prehistoric sites on the Mediterranean coastline', 'https://cris.haifa.ac.il/en/publications/israel-submerged-prehistoric-sites-and-settlements-on-the-mediter/',
      'Atlit Yam is one of a chain of prehistoric villages that now lie under the sea off the Carmel coast, drowned by the sea-level rise after the last ice age.', 'עתלית ים היא אחד משרשרת כפרים פרהיסטוריים שוכנים היום מתחת לים מול חוף הכרמל, שטבעו בעליית פני הים שאחרי עידן הקרח האחרון.'),
    F('study', 'Wikipedia - Atlit Yam', 'https://en.wikipedia.org/wiki/Atlit_Yam',
      'Dated to about 6900-6300 BCE and now 8-12 m down. Galili argues its water wells were slowly contaminated by seawater, forcing people to leave.', 'מתוארך לכ־6900-6300 לפנה״ס וכיום בעומק 8-12 מ׳. גלילי טוען שבארות המים שלו זוהמו בהדרגה במי ים, מה שאילץ את התושבים לעזוב.'),
    F('study', 'Galili et al. 2019, PLOS ONE - a submerged 7,000-year-old village and seawall', 'https://doi.org/10.1371/journal.pone.0222560',
      'Nearby Tel Hreiz built a 100 m seawall against the rising sea - and was still flooded and abandoned.', 'בתל חריז הסמוך נבנתה חומת ים באורך 100 מ׳ נגד הים העולה - והכפר עדיין הוצף וננטש.'),
  ],
  s_neveyam: [F('study', 'Galili et al. 2019, PLOS ONE - a submerged 7,000-year-old village and seawall', 'https://doi.org/10.1371/journal.pone.0222560',
    'Off the Carmel coast, Tel Hreiz (7,500-7,000 years ago) had a boulder seawall over 100 m long - the oldest known defence against sea-level rise. It worked only for a while: the village was flooded and abandoned.',
    'מול חוף הכרמל, בתל חרִיז (לפני 7,500-7,000 שנה) נבנתה חומת ים מסלעים באורך של יותר מ־100 מ׳ - ההגנה העתיקה ביותר הידועה מפני עליית הים. היא עזרה רק לזמן מה: הכפר הוצף וננטש.')],
  s_caesarea: [F('study', 'Galili et al. 2021, Geosciences - the Caesarea Roman harbour', 'https://doi.org/10.3390/geosciences11080306',
    'Herod\'s breakwaters were built on loose sand. Winter storms washing out their foundations - not an earthquake - were the main reason the harbour collapsed into the sea.',
    'שוברי הגלים של הורדוס נבנו על חול רך. סערות חורף ששטפו את היסודות - ולא רעידת אדמה - היו הסיבה העיקרית לקריסת הנמל לים.')],
  s_dor: [MONITOR],
  s_ram: [MONITOR],
  s_akko: [HUJI('With a 1.5 m rise, Akko would lose about 11.2% of its area.', 'בעלייה של 1.5 מ׳ עכו תאבד כ־11.2% משטחה.')],
  // ---- polluters, power, water, ports ----
  e_orot: [PRTR, F('study', 'WIT Press 2018 - emissions from a large coal-fired power plant, Hadera', 'https://witpress.com/elibrary/wit-transactions-on-ecology-and-the-environment/230/36795',
    'At the nearest monitoring site, the plant\'s emissions made up 29.1% of PM10 particles.', 'בתחנת הניטור הקרובה, פליטות התחנה היוו 29.1% מחלקיקי ה־PM10.'), CLIFF_UNDONE],
  e_rutenberg: [PRTR, F('official', 'State Comptroller 2020 - Handling of coastal cliff erosion', COMPTROLLER,
    'The Ashkelon cliff next to the station has retreated up to 22 m in 20 years.', 'מצוק אשקלון ליד התחנה נסוג עד 22 מ׳ ב־20 שנה.')],
  e_nesher: [PRTR],
  e_bazan: [COHORT, F('news', 'Times of Israel - Polluting Haifa oil refineries must close by 2025, PM\'s adviser demands', 'https://www.timesofisrael.com/polluting-haifa-oil-refineries-must-close-by-2025-pms-economic-adviser-demands/',
    'The refineries are on the bank of the Kishon; plans for the area cite rising flood threats as the climate warms.', 'בתי הזיקוק על גדת הקישון; תוכניות לאזור מזכירות איומי הצפה גוברים ככל שהאקלים מתחמם.')],
  p_reading: [F('news', 'Watchers - Major floods hit Israel (Jan 2020)', 'https://watchers.news/2020/01/06/major-floods-hit-israel-after-20-percent-of-yearly-rainfall-in-just-2-hours/',
    'In January 2020 Tel Aviv got 20% of a year\'s rain in two hours; the Yarkon, next to the station, is one of the city\'s flood corridors.', 'בינואר 2020 ירדו בתל אביב 20% מהגשם השנתי בשעתיים; הירקון, ליד התחנה, הוא אחד מצירי ההצפה של העיר.')],
  p_eshkol: [MONITOR],
  p_haifa: [HUJI('Haifa would lose about 7.5 km² (12.5% of the city) with a 1.5 m rise.', 'חיפה תאבד כ־7.5 קמ״ר (12.5% מהעיר) בעלייה של 1.5 מ׳.')],
  d_sorek: [FANACK], d_hadera: [FANACK, CLIFF_UNDONE], d_ashkelon: [FANACK],
  o_haifa: [HUJI('Haifa would lose about 7.5 km² (12.5% of the city) with a 1.5 m rise; a 6 m tsunami would flood 14 km².', 'חיפה תאבד כ־7.5 קמ״ר (12.5% מהעיר) בעלייה של 1.5 מ׳; צונאמי של 6 מ׳ יציף 14 קמ״ר.')],
  o_ashdod: [MONITOR],
  // ---- nature ----
  n_carmel: [F('news', 'ScienceDaily 2010 - the Carmel fire and climate change (UFZ)', 'https://www.sciencedaily.com/releases/2010/12/101208083535.htm',
    'Researchers called the 2010 Carmel fire "a typical example" of the effects of climate change and "a taste of the future" for the region.', 'חוקרים כינו את שריפת הכרמל ב־2010 "דוגמה טיפוסית" להשפעות שינוי האקלים ו"טעימה מהעתיד" באזור.')],
  n_benshemen: [F('news', 'Wikipedia - 2025 Israel–West Bank fires', 'https://en.wikipedia.org/wiki/2025_Israel%E2%80%93West_Bank_fires',
    'On 30 April 2025 a wildfire spread fast through the planted forests between Eshtaol and Latrun, a few kilometres from Ben Shemen, in high heat, low humidity and strong winds; a national emergency was declared.',
    'ב־30 באפריל 2025 שריפה התפשטה במהירות ביערות הנטועים בין אשתאול ללטרון, קילומטרים ספורים מבן שמן, בחום כבד, לחות נמוכה ורוחות חזקות; הוכרז מצב חירום לאומי.')],
  n_hadera: [CLIFF_UNDONE],
  n_yatir: [
    F('study', 'Frontiers in Forests and Global Change 2018 - heat waves and Aleppo pine', 'https://www.frontiersin.org/articles/10.3389/ffgc.2018.00008',
      'Heat-and-drought treatment killed most young Aleppo pines from Yatir; needles of the survivors heated above 47 °C.', 'טיפול של חום ובצורת הרג את רוב שתילי האורן מיתיר; מחטי השורדים התחממו מעל 47°.'),
    F('study', 'Preisler et al., EGU 2018 - rainfall-exclusion experiment at Yatir', 'https://meetingorganizer.copernicus.org/EGU2018/EGU2018-9718-1.pdf',
      'At this dry timberline, tree growth is limited mainly by water in the soil.', 'בגבול היער היבש הזה, גדילת העצים מוגבלת בעיקר על ידי המים בקרקע.'),
  ],
  n_nitzanim: [F('news', 'Hakai Magazine - Last Dune Standing', 'https://hakaimagazine.com/?p=16919',
    'About two-thirds of Israel\'s coastal sand dunes have been lost to development since 1948. The 18 km² Nizzanim reserve is one of the few large dunes left.',
    'כשני שלישים מדיונות החוף בישראל אבדו לבנייה מאז 1948. שמורת ניצנים, 18 קמ״ר, היא אחת מהדיונות הגדולות המעטות שנותרו.')],
  n_alexander: [BEIT_YANNAY],
  n_ashkelon: [F('official', 'State Comptroller 2020 - Handling of coastal cliff erosion', COMPTROLLER,
    'The Ashkelon cliff has retreated up to 22 m in 20 years, and the beach has narrowed.', 'מצוק אשקלון נסוג עד 22 מ׳ ב־20 שנה, ורצועת החוף הצטמצמה.'),
    F('news', 'Times of Israel - Beachgoers in danger from collapsing cliffs as authorities drag feet', 'https://www.timesofisrael.com/beachgoers-in-danger-from-collapsing-cliffs-as-authorities-drag-feet-report/',
      'A follow-up State Comptroller report found most at-risk cliffs still unprotected, and that the Nature and Parks Authority had not protected the cliffs in the Ashkelon and Apollonia national parks.',
      'דוח המשך של מבקר המדינה מצא שרוב המצוקים בסיכון עדיין לא מוגנים, ושרשות הטבע והגנים לא הגנה על המצוקים בגנים הלאומיים אשקלון ואפולוניה.')],
};

/** Evidence on every data-centre card. */
export const DC_FACTS: Fact[] = [DC20, LIGHTSOUT];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const KIND = { study: ['Study', 'מחקר'], official: ['Official', 'רשמי'], news: ['News', 'חדשות'] } as const;

/** The "Evidence" block for a card. */
export function evidenceHtml(facts: Fact[], he: boolean, coast = false) {
  const all = coast ? [...facts, ...COAST.filter((c) => !facts.includes(c))] : facts;
  if (!all.length) return '';
  return `<div class="ev"><b>${he ? 'הראיות' : 'The evidence'}</b><ul>${all.map((f) => `<li>
    <span class="ev-k ev-${f.kind}">${KIND[f.kind][he ? 1 : 0]}</span>${esc(he ? f.he : f.en)}
    <a href="${f.u}" target="_blank" rel="noopener">${esc(f.src)} ↗</a></li>`).join('')}</ul></div>`;
}
