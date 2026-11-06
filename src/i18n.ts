import { state } from './state';

const EN = {
  title: 'Rising Tides',
  subtitle: "Sea level rise on Israel's coast",
  view_2d: 'Map', view_3d: '3D city', view_photo: 'Photoreal',
  search: 'Search a place', search_ph: 'Is my place safe? Type an address…', search_none: 'No match on the coast',
  tour: 'Fly the coast', tour_stop: 'Stop flight', orbit: 'Fly around here', drone: 'Drone mode',
  drone_help: 'W/S forward·back · A/D sideways · Q/E turn · R/F tilt · Shift = faster · Esc = exit',
  present: 'Present', about: 'About & method', lang_switch: 'עברית',
  sea_level: 'Sea level', vs_base: 'above 1995–2014 · Hadera', incl_storm: 'incl. {m} storm',
  land: 'Land under water', buildings: 'Buildings reached', roads: 'Roads reached', whole_coast: 'Whole coast, Zikim → Rosh HaNikra',
  year: 'Year', play: 'Play', pause: 'Pause', in_2000y: 'Committed over ~2,000 years',
  driver_scenario: 'IPCC scenario', driver_budget: 'CO₂ budget', driver_manual: 'Set it yourself',
  ssp119: 'Net zero by ~2050', ssp126: 'Paris: well below 2 °C', ssp245: 'Current policies', ssp370: 'High emissions', ssp585: 'Fossil-fuelled', ssp585_low: 'Fossil + ice-sheet collapse',
  ssp585_low_note: 'Low-confidence, high-impact: rapid Antarctic ice loss',
  range: 'Uncertainty', q0: 'Very low (5%)', q1: 'Low (17%)', q2: 'Median', q3: 'High (83%)', q4: 'Very high (95%)',
  budget_label: 'CO₂ the world still emits (from 2025)', budget_warm: 'Peak warming', budget_years: '≈ {n} years at today’s {r} Gt/yr',
  mark_15: '1.5 °C', mark_2: '2 °C', mark_now: 'Current policies', mark_fossil: 'Fossil-fuelled',
  manual_label: 'Sea level rise', storm: 'Storm on top',
  surge_calm: 'Calm', surge_tide: 'High tide', surge_winter: 'Winter storm', surge_severe: 'Severe storm', surge_extreme: 'Extreme storm',
  surge_note: 'Illustrative still-water levels incl. tide, surge and wave set-up',
  horizon: 'Horizon', h_year: 'By year', h_long: '2,000 years',
  compare: 'Show coast we can save', compare_note: 'Blue: floods even with net zero (SSP1-1.9). Orange: floods only if we keep burning fossil fuels (SSP5-8.5).',
  tab_place: 'This place', tab_emissions: 'Emissions → sea', tab_act: 'What can we do?', tab_data: 'Data',
  close: 'Close',
  // place
  place_here: 'At {site}', exposure_title: 'What the sea reaches here, by sea level', exposure_y: 'buildings', at_level: 'At today’s setting',
  when_floods: 'When does the sea get here?', reach_level: 'reached at +{m}', never: 'not by 2150',
  land_short: 'land', bld_short: 'buildings', road_short: 'roads',
  click_hint: 'Tip: click anywhere on the map to check that spot.',
  // popup
  pop_ground: 'Ground', pop_reach: 'Sea reaches this spot at', pop_flooded: 'Under water now: {d} deep', pop_dry: 'Dry at this setting',
  pop_high: 'Higher than 24 m or outside the coastal strip - safe from the sea.', pop_sea: 'Open sea',
  pop_year: 'First year it floods', pop_basin: 'Low ground, but cut off from the sea by higher land',
  // emissions
  em_intro: 'Every tonne of CO₂ adds warming, and warming adds sea level. Drag the budget to see the chain.',
  em_step1: 'CO₂ emitted from 2025', em_step2: 'Peak global warming', em_step3: 'Sea level here in 2100', em_step4: 'Sea level committed (~2,000 yr)',
  em_budget_left: 'Budget left for 1.5 °C', em_budget_gone: 'At today’s pace, gone in about {n} years.',
  em_long_note: 'Ice sheets respond slowly: what we emit this century keeps raising the sea for millennia.',
  em_chart: 'Sea level at Hadera in 2100, by peak warming (median & likely range)',
  // act
  act_intro: 'What if we change how we move, eat and power our homes? Here is what it saves - honestly scaled.',
  act_who: 'Who is doing it', who_me: 'Just me', who_seminar: 'Our seminar', who_uni: 'University', who_israel: 'All of Israel', who_world: 'Everyone on Earth',
  people: 'people',
  act_commute: 'Leave the car', act_km: 'Round trip per day', act_days: 'Days per week', act_by: 'Instead by',
  t_train: 'Train', t_lightrail: 'Light rail', t_bus: 'Bus', t_bike: 'Bike / walk', t_ebike: 'E-bike',
  act_flights: 'Skip flights', act_short: 'Return flights to Europe / year', act_long: 'Return flights to the USA / year',
  act_diet: 'Plant-based days', act_plant: 'Days per week (instead of meat-heavy)',
  act_energy: 'Home electricity', act_energy_pct: 'Saved or from rooftop solar',
  act_years: 'Kept up for', years: 'years',
  res_co2: 'CO₂ avoided', res_peryear: 'per person per year', res_ice: 'Arctic summer sea ice kept', res_water: 'Seawater kept out of the ocean (long run)',
  res_coast: 'Israeli coast kept dry (long run)', res_warming: 'Warming avoided',
  res_pools: '≈ {n} Olympic pools', res_honest: 'One person’s share is tiny - the sea responds to all of us together. That is exactly why collective choices (transit, clean grids, policy) matter.',
  res_vs: 'Average Israeli: about 6–7 t CO₂ a year',
  res_parts: 'Where the savings come from',
  part_commute: 'Commute', part_flights: 'Flights', part_diet: 'Food', part_energy: 'Electricity',
  // data
  data_gauge: 'Measured: Hadera tide gauge, then IPCC projections', data_trend: 'Measured trend: {r} mm per year (1995–2025)',
  data_co2: 'CO₂ in the air (Mauna Loa)', data_latest: 'Latest: {ppm} ppm ({m}/{y})',
  data_sources: 'Sources', observed: 'measured', median: 'median', likely: 'likely range',
  // about
  about_body: `
<p><b>What you see.</b> Blue areas are land that the Mediterranean would cover at the chosen sea level, using a 30 m “bare earth” elevation model of the coast. Water only spreads where it can actually flow from the sea, so low inland basins stay dry unless the sea reaches them.</p>
<p><b>Sea level.</b> IPCC AR6 projections for the Hadera tide gauge (including local land motion), relative to 1995–2014. “CO₂ budget” links emissions to warming using the IPCC remaining carbon budgets, then to sea level with the IPCC warming-level projections. The 2,000-year view uses IPCC ranges (2–3 m at 1.5 °C, 2–6 m at 2 °C, 19–22 m at 5 °C); levels in between are interpolated.</p>
<p><b>Limits.</b> This is a “bathtub” model: it ignores erosion, sea walls, drainage and future building. Elevation errors of about ±1 m matter most below +1 m. Storm levels are illustrative. Use it to explore and discuss, not to plan a specific property.</p>`,
  sources_list: `
<li>Elevation: DeltaDTM v1.1 - Pronk et al. 2024, Scientific Data (CC-BY 4.0)</li>
<li>Sea level projections: IPCC AR6, Garner et al. 2021 / Fox-Kemper et al. 2021, doi:10.5281/zenodo.6382554</li>
<li>Tide gauge: PSMSL, Hadera (station 1797)</li>
<li>CO₂: NOAA Global Monitoring Laboratory, Mauna Loa</li>
<li>Carbon budgets & warming: IPCC AR6 WG1 SPM (Table SPM.2, B.5.4); TCRE 0.45 °C / 1000 GtCO₂</li>
<li>Arctic sea ice: Notz & Stroeve 2016, Science · Long-term sea level per °C: Levermann et al. 2013, PNAS</li>
<li>Emission factors: UK DESNZ 2024; Israel Electricity Authority; Scarborough et al. 2023, Nature Food</li>
<li>Buildings, roads, map: © OpenStreetMap contributors, OpenFreeMap, OpenMapTiles</li>
<li>Terrain: AWS Terrain Tiles (Mapzen) · Satellite: Esri World Imagery · Photoreal: Google Map Tiles</li>`,
  // photoreal
  photo_title: 'Photoreal 3D (Google)', photo_body: 'Photoreal mode streams Google’s textured 3D city models and floods them with the same sea level. It needs your own free Google Maps API key with the “Map Tiles API” enabled. The key stays in this browser only.',
  photo_key: 'Google Maps API key', photo_go: 'Start photoreal', photo_help: 'How to get a key', photo_loading: 'Loading photoreal 3D…',
  photo_error: 'Could not load Google 3D tiles - check the key and that Map Tiles API is enabled.',
  photo_datum: 'Water height fine-tune',
  // story
  story_next: 'Next', story_prev: 'Back', story_exit: 'Exit',
  s1_t: 'One coast, 190 km', s1_b: 'From the chalk cliffs of Rosh HaNikra to the dunes of Zikim, most Israelis live within a short drive of this sea.',
  s2_t: 'It is already rising', s2_b: 'The Hadera tide gauge has measured about 4 mm a year since 1995 - roughly 12 cm in 30 years.',
  s3_t: '2050: the beaches go first', s3_b: 'By mid-century, every scenario gives about +0.2 to 0.3 m. Beaches and river mouths narrow; winter storms reach further.',
  s4_t: '2100: our choice', s4_b: 'With a winter storm on top: orange is the coast we lose only if we keep burning fossil fuels. Blue floods anyway. The difference is decided this century.',
  s5_t: 'Storms ride on top', s5_b: 'A winter storm on a higher sea pushes water into ports, roads and the Kishon valley.',
  s6_t: 'The long tail', s6_b: 'If Antarctic ice sheets destabilise, sea level could pass +1.5 m by 2100 and keep accelerating. Low confidence - but high impact.',
  s7_t: 'Committed for 2,000 years', s7_b: 'Ice sheets respond slowly. At about 2.7 °C the sea keeps rising for millennia - several metres at Old Akko, Haifa Bay and Jaffa.',
  s8_t: 'What we can still change', s8_b: 'Every 0.1 °C avoided means tens of centimetres less sea in the long run. Orange is what net zero saves. Open the calculator and see what our seminar could do.',
  loading: 'Loading the coast…', toast_photo_back: 'Back to the 3D city view',
  legend_depth: 'Water depth', legend_saved: 'Saved if we cut emissions',
  layers: 'Layers', base_map: 'Map', base_sat: 'Satellite', show_buildings: '3D buildings',
  share: 'Copy link', copied: 'Link copied', shot: 'Save image',
  more_opts: 'Storm, horizon & compare',
};

type Key = keyof typeof EN;

const HE: Partial<Record<Key, string>> = {
  title: 'גאות עולה', subtitle: 'עליית מפלס הים בחופי ישראל',
  view_2d: 'מפה', view_3d: 'עיר בתלת־ממד', view_photo: 'פוטו־ריאליסטי',
  search: 'חיפוש מקום', search_ph: 'האם הבית שלי בטוח? הקלידו כתובת…', search_none: 'לא נמצא מקום על החוף',
  tour: 'טיסה לאורך החוף', tour_stop: 'עצירת הטיסה', orbit: 'טיסה סביב המקום', drone: 'מצב רחפן',
  drone_help: 'W/S קדימה·אחורה · A/D הצידה · Q/E סיבוב · R/F הטיה · Shift מהר · Esc יציאה',
  present: 'הצגה', about: 'אודות ושיטה', lang_switch: 'English',
  sea_level: 'מפלס הים', vs_base: 'מעל ממוצע 1995–2014 · חדרה', incl_storm: 'כולל סערה {m}',
  land: 'שטח מוצף', buildings: 'מבנים שהים מגיע אליהם', roads: 'כבישים מוצפים', whole_coast: 'כל החוף, מזיקים עד ראש הנקרה',
  year: 'שנה', play: 'הפעלה', pause: 'עצירה', in_2000y: 'עלייה מחויבת לאורך כ־2,000 שנה',
  driver_scenario: 'תרחיש IPCC', driver_budget: 'תקציב פחמן', driver_manual: 'בחירה ידנית',
  ssp119: 'אפס נטו עד ~2050', ssp126: 'פריז: הרבה מתחת ל־2°', ssp245: 'המדיניות הנוכחית', ssp370: 'פליטות גבוהות', ssp585: 'דלק מאובנים', ssp585_low: 'מאובנים + קריסת קרחונים',
  ssp585_low_note: 'ודאות נמוכה, השפעה גבוהה: אובדן מהיר של קרח באנטארקטיקה',
  range: 'אי־ודאות', q0: 'נמוך מאוד (5%)', q1: 'נמוך (17%)', q2: 'חציון', q3: 'גבוה (83%)', q4: 'גבוה מאוד (95%)',
  budget_label: 'CO₂ שהעולם עוד יפלוט (מ־2025)', budget_warm: 'שיא ההתחממות', budget_years: '≈ {n} שנים בקצב הנוכחי של {r} גיגה־טון בשנה',
  mark_15: '1.5°', mark_2: '2°', mark_now: 'מדיניות נוכחית', mark_fossil: 'דלק מאובנים',
  manual_label: 'עליית מפלס', storm: 'סערה מעל',
  surge_calm: 'רגוע', surge_tide: 'גאות', surge_winter: 'סערת חורף', surge_severe: 'סערה קשה', surge_extreme: 'סערה קיצונית',
  surge_note: 'מפלסים להמחשה, כולל גאות, נחשול סערה והצטברות גלים',
  horizon: 'טווח זמן', h_year: 'לפי שנה', h_long: '2,000 שנה',
  compare: 'הצגת החוף שאפשר להציל', compare_note: 'כחול: מוצף גם באפס נטו (SSP1-1.9). כתום: מוצף רק אם נמשיך לשרוף דלק מאובנים (SSP5-8.5).',
  tab_place: 'המקום הזה', tab_emissions: 'פליטות ← ים', tab_act: 'מה אפשר לעשות?', tab_data: 'נתונים',
  close: 'סגירה',
  place_here: 'ב{site}', exposure_title: 'למה הים מגיע כאן, לפי מפלס', exposure_y: 'מבנים', at_level: 'במצב הנוכחי',
  when_floods: 'מתי הים יגיע לכאן?', reach_level: 'מוצף ב־+{m}', never: 'לא עד 2150',
  land_short: 'שטח', bld_short: 'מבנים', road_short: 'כבישים',
  click_hint: 'טיפ: לחצו בכל מקום במפה כדי לבדוק אותו.',
  pop_ground: 'גובה הקרקע', pop_reach: 'הים מגיע לנקודה הזו ב־', pop_flooded: 'מוצף עכשיו: עומק {d}', pop_dry: 'יבש במצב הזה',
  pop_high: 'גבוה מ־24 מ׳ או מחוץ לרצועת החוף - מוגן מהים.', pop_sea: 'ים פתוח',
  pop_year: 'השנה הראשונה שבה מוצף', pop_basin: 'קרקע נמוכה, אבל מנותקת מהים על ידי שטח גבוה יותר',
  em_intro: 'כל טון CO₂ מוסיף התחממות, וההתחממות מוסיפה מפלס ים. גררו את התקציב כדי לראות את השרשרת.',
  em_step1: 'CO₂ שנפלט מ־2025', em_step2: 'שיא ההתחממות העולמית', em_step3: 'מפלס הים כאן ב־2100', em_step4: 'עלייה מחויבת (~2,000 שנה)',
  em_budget_left: 'התקציב שנותר ל־1.5°', em_budget_gone: 'בקצב הנוכחי ייגמר בעוד כ־{n} שנים.',
  em_long_note: 'יריעות הקרח מגיבות לאט: מה שנפלוט במאה הזו ימשיך להעלות את הים במשך אלפי שנים.',
  em_chart: 'מפלס הים בחדרה ב־2100 לפי שיא ההתחממות (חציון וטווח סביר)',
  act_intro: 'מה אם נשנה איך אנחנו נוסעים, אוכלים ומפעילים את הבית? הנה מה שזה חוסך - בקנה מידה כן.',
  act_who: 'מי עושה את זה', who_me: 'רק אני', who_seminar: 'הסמינר שלנו', who_uni: 'האוניברסיטה', who_israel: 'כל ישראל', who_world: 'כל האנושות',
  people: 'אנשים',
  act_commute: 'לוותר על הרכב', act_km: 'הלוך־חזור ביום', act_days: 'ימים בשבוע', act_by: 'במקום זאת',
  t_train: 'רכבת', t_lightrail: 'רכבת קלה', t_bus: 'אוטובוס', t_bike: 'אופניים / הליכה', t_ebike: 'אופניים חשמליים',
  act_flights: 'לוותר על טיסות', act_short: 'טיסות הלוך־חזור לאירופה בשנה', act_long: 'טיסות הלוך־חזור לארה״ב בשנה',
  act_diet: 'ימים צמחוניים', act_plant: 'ימים בשבוע (במקום תפריט עתיר בשר)',
  act_energy: 'חשמל ביתי', act_energy_pct: 'נחסך או מסולארי על הגג',
  act_years: 'לאורך', years: 'שנים',
  res_co2: 'CO₂ שנחסך', res_peryear: 'לאדם בשנה', res_ice: 'קרח ים ארקטי שנשמר', res_water: 'מי ים שלא נוספו לאוקיינוס (בטווח הארוך)',
  res_coast: 'חוף ישראלי שנשאר יבש (בטווח הארוך)', res_warming: 'התחממות שנמנעה',
  res_pools: '≈ {n} בריכות אולימפיות', res_honest: 'החלק של אדם אחד זעיר - הים מגיב לכולנו יחד. בדיוק בגלל זה בחירות משותפות (תחבורה ציבורית, חשמל נקי, מדיניות) חשובות.',
  res_vs: 'ישראלי ממוצע: כ־6–7 טון CO₂ בשנה',
  res_parts: 'מאיפה מגיע החיסכון',
  part_commute: 'נסיעות', part_flights: 'טיסות', part_diet: 'אוכל', part_energy: 'חשמל',
  data_gauge: 'נמדד: מד הגאות בחדרה, ואחריו תחזיות IPCC', data_trend: 'מגמה נמדדת: {r} מ״מ בשנה (1995–2025)',
  data_co2: 'CO₂ באוויר (מאונה לואה)', data_latest: 'עדכני: {ppm} ppm ({m}/{y})',
  data_sources: 'מקורות', observed: 'נמדד', median: 'חציון', likely: 'טווח סביר',
  about_body: `
<p><b>מה רואים.</b> האזורים הכחולים הם יבשה שהים התיכון יכסה במפלס שנבחר, לפי מודל גובה "קרקע חשופה" ברזולוציה של 30 מ׳. המים מתפשטים רק לאן שהם באמת יכולים לזרום מהים, כך שאגנים נמוכים בפנים הארץ נשארים יבשים אם הים לא מגיע אליהם.</p>
<p><b>מפלס הים.</b> תחזיות IPCC AR6 למד הגאות בחדרה (כולל תנועת קרקע מקומית), ביחס ל־1995–2014. "תקציב פחמן" מקשר פליטות להתחממות לפי תקציבי הפחמן של IPCC, ואז למפלס הים לפי תחזיות לפי רמת התחממות. תצוגת 2,000 השנים משתמשת בטווחי IPCC (2–3 מ׳ ב־1.5°, 2–6 מ׳ ב־2°, 19–22 מ׳ ב־5°); ערכי ביניים מחושבים באינטרפולציה.</p>
<p><b>מגבלות.</b> זהו מודל "אמבטיה": הוא מתעלם מסחף, חומות ים, ניקוז ובנייה עתידית. שגיאות גובה של כ־±1 מ׳ משמעותיות במיוחד מתחת ל־+1 מ׳. מפלסי הסערה להמחשה בלבד. השתמשו בו כדי לחקור ולדון, לא לתכנון נכס מסוים.</p>`,
  photo_title: 'תלת־ממד פוטו־ריאליסטי (Google)', photo_body: 'המצב הפוטו־ריאליסטי מציג את מודלי הערים התלת־ממדיים של Google ומציף אותם באותו מפלס. נדרש מפתח API חינמי של Google Maps עם “Map Tiles API” פעיל. המפתח נשמר רק בדפדפן הזה.',
  photo_key: 'מפתח Google Maps API', photo_go: 'הפעלה', photo_help: 'איך משיגים מפתח', photo_loading: 'טוען תלת־ממד פוטו־ריאליסטי…',
  photo_error: 'לא ניתן לטעון את אריחי התלת־ממד של Google - בדקו את המפתח ושה־Map Tiles API פעיל.',
  photo_datum: 'כיוון עדין של גובה המים',
  story_next: 'הבא', story_prev: 'הקודם', story_exit: 'יציאה',
  s1_t: 'חוף אחד, 190 ק״מ', s1_b: 'מצוקי הגיר של ראש הנקרה ועד דיונות זיקים - רוב הישראלים גרים במרחק נסיעה קצרה מהים הזה.',
  s2_t: 'הים כבר עולה', s2_b: 'מד הגאות בחדרה מדד עלייה של כ־4 מ״מ בשנה מאז 1995 - כ־12 ס״מ ב־30 שנה.',
  s3_t: '2050: החופים ראשונים', s3_b: 'עד אמצע המאה כל התרחישים נותנים כ־0.2–0.3 מ׳. החופים ושפכי הנחלים מצטמצמים; סערות החורף מגיעות רחוק יותר.',
  s4_t: '2100: הבחירה שלנו', s4_b: 'עם סערת חורף מעל: הכתום הוא החוף שנאבד רק אם נמשיך לשרוף דלק מאובנים. הכחול יוצף בכל מקרה. ההבדל נקבע במאה הזו.',
  s5_t: 'סערות מעל הכול', s5_b: 'סערת חורף על ים גבוה יותר דוחפת מים לנמלים, לכבישים ולעמק הקישון.',
  s6_t: 'הזנב הארוך', s6_b: 'אם יריעות הקרח באנטארקטיקה יתערערו, המפלס עלול לעבור +1.5 מ׳ עד 2100 ולהמשיך להאיץ. ודאות נמוכה - אבל השפעה גבוהה.',
  s7_t: 'מחויבים ל־2,000 שנה', s7_b: 'יריעות הקרח מגיבות לאט. בהתחממות של כ־2.7° הים ממשיך לעלות במשך אלפי שנים - כמה מטרים בעכו העתיקה, במפרץ חיפה וביפו.',
  s8_t: 'מה עוד אפשר לשנות', s8_b: 'כל 0.1° שנמנע פירושו עשרות סנטימטרים פחות ים בטווח הארוך. הכתום הוא מה שאפס נטו מציל. פתחו את המחשבון וראו מה הסמינר שלנו יכול לעשות.',
  loading: 'טוען את החוף…', toast_photo_back: 'חזרה לתצוגת העיר בתלת־ממד',
  legend_depth: 'עומק המים', legend_saved: 'ניצל אם נפחית פליטות',
  layers: 'שכבות', base_map: 'מפה', base_sat: 'לוויין', show_buildings: 'מבנים בתלת־ממד',
  share: 'העתקת קישור', copied: 'הקישור הועתק', shot: 'שמירת תמונה',
  more_opts: 'סערה, טווח זמן והשוואה',
};

export function t(key: Key, vars?: Record<string, string | number>): string {
  let s = (state.lang === 'he' ? HE[key] : undefined) ?? EN[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
export type { Key };

export function fmt(n: number, digits = 0): string {
  return new Intl.NumberFormat(state.lang === 'he' ? 'he-IL' : 'en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}
/** Signed metres, e.g. "+0.57 m" / "+0.57 מ׳" */
export function meters(m: number, digits = 2): string {
  const u = state.lang === 'he' ? ' מ׳' : ' m';
  return (m >= 0 ? '+' : '−') + fmt(Math.abs(m), digits) + u;
}
export function siteName(s: { en: string; he: string }) { return state.lang === 'he' ? s.he : s.en; }
export function siteTag(s: { tag_en: string; tag_he: string }) { return state.lang === 'he' ? s.tag_he : s.tag_en; }
/** Compact number with unit suffix for big values. */
export function big(n: number, digits = 1): string {
  const a = Math.abs(n);
  const he = state.lang === 'he';
  if (a >= 1e12) return fmt(n / 1e12, digits) + (he ? ' טריליון' : ' trillion');
  if (a >= 1e9) return fmt(n / 1e9, digits) + (he ? ' מיליארד' : ' billion');
  if (a >= 1e6) return fmt(n / 1e6, digits) + (he ? ' מיליון' : ' million');
  if (a >= 1e4) return fmt(n / 1e3, 0) + (he ? ' אלף' : 'k');
  if (a >= 100) return fmt(n, 0);
  if (a >= 1) return fmt(n, 1);
  if (a === 0) return '0';
  if (a >= 0.001) return fmt(n, Math.max(2, -Math.floor(Math.log10(a)) + 1));
  // tiny numbers: 4.5 × 10⁻¹⁰
  const e = Math.floor(Math.log10(a));
  const sup = String(e).split('').map((c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]).join('');
  return `${fmt(n / 10 ** e, 1)} × 10${sup}`;
}
