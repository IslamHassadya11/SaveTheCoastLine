// Climate science used by the app. Every constant cites where it comes from.
import type { Climate } from './data';

export type ScenarioId = 'ssp119' | 'ssp126' | 'ssp245' | 'ssp370' | 'ssp585' | 'ssp585_low';

export const SCENARIOS: { id: ScenarioId; short: string; color: string; warm2100: number }[] = [
  // warm2100: IPCC AR6 WG1 SPM Table SPM.1, best estimate 2081-2100 vs 1850-1900
  { id: 'ssp119', short: 'SSP1-1.9', color: '#3987e5', warm2100: 1.4 },
  { id: 'ssp126', short: 'SSP1-2.6', color: '#199e70', warm2100: 1.8 },
  { id: 'ssp245', short: 'SSP2-4.5', color: '#c98500', warm2100: 2.7 },
  { id: 'ssp370', short: 'SSP3-7.0', color: '#d95926', warm2100: 3.6 },
  { id: 'ssp585', short: 'SSP5-8.5', color: '#d55181', warm2100: 4.4 },
  { id: 'ssp585_low', short: 'SSP5-8.5 + ice', color: '#9085e9', warm2100: 4.4 },
];

export const QUANTILES = ['5%', '17%', '50%', '83%', '95%'];
export const GAUGE = '1797'; // Hadera, PSMSL

let C: Climate;
export function initScience(c: Climate) { C = c; }

function interpYears(series: number[], year: number): number {
  const ys = C.projections.years;
  if (year <= ys[0]) {
    // before 2020: linear back to 0 at the 2005 baseline midpoint
    const t = (year - 2005) / (ys[0] - 2005);
    return Math.max(0, series[0] * t);
  }
  for (let i = 0; i < ys.length - 1; i++) {
    if (year <= ys[i + 1]) {
      const t = (year - ys[i]) / (ys[i + 1] - ys[i]);
      return series[i] + (series[i + 1] - series[i]) * t;
    }
  }
  return series[series.length - 1];
}

/** Local sea level rise (m, vs 1995-2014) at Hadera for an IPCC scenario. q = quantile index 0..4 */
export function slrScenario(id: ScenarioId, year: number, q = 2): number {
  const s = C.projections.data[id]?.[GAUGE];
  if (!s) return 0;
  return interpYears(s[q], year);
}

// ---------- Emissions -> warming ----------
// Remaining carbon budgets from 2020, 50% likelihood (IPCC AR6 WG1 SPM Table SPM.2):
//   1.5 C <-> 500 GtCO2,  2.0 C <-> 1350 GtCO2.  A straight line through both gives the
// warming per tonne including the non-CO2 gases that rise and fall with CO2.
const SLOPE = 0.5 / 850;            // C per GtCO2 (= 0.59 C per 1000 Gt)
const T_AT_2020_BUDGET0 = 1.5 - 500 * SLOPE;
export const EMITTED_2020_2025 = 200; // GtCO2, Global Carbon Budget ~40 Gt/yr
export const ANNUAL_EMISSIONS = 41.6; // GtCO2/yr, Global Carbon Project 2024 (fossil + land use)
/** Peak warming (C vs 1850-1900) if the world emits `gt` more GtCO2 from 2025 on, then reaches net zero. */
export function warmingFromBudget(gt: number): number {
  return T_AT_2020_BUDGET0 + SLOPE * (gt + EMITTED_2020_2025);
}
export function budgetForWarming(t: number): number {
  return (t - T_AT_2020_BUDGET0) / SLOPE - EMITTED_2020_2025;
}
// Pure CO2 response (TCRE, AR6 best estimate 0.45 C per 1000 GtCO2) - used for marginal tonnes.
export const TCRE_PER_TONNE = 0.45 / 1000 / 1e9;

const GWL = [1.5, 2.0, 3.0, 4.0, 5.0];
const GWL_KEYS = ['gwl1.5', 'gwl2.0', 'gwl3.0', 'gwl4.0', 'gwl5.0'];
/** Sea level rise (m) at Hadera in `year` for a world that stabilises at warming `t` (AR6 warming-level projections). */
export function slrWarming(t: number, year: number, q = 2): number {
  const tc = Math.max(GWL[0], Math.min(GWL[GWL.length - 1], t));
  let i = 0;
  while (i < GWL.length - 2 && tc > GWL[i + 1]) i++;
  const f = (tc - GWL[i]) / (GWL[i + 1] - GWL[i]);
  const a = interpYears(C.projections.data[GWL_KEYS[i]][GAUGE][q], year);
  const b = interpYears(C.projections.data[GWL_KEYS[i + 1]][GAUGE][q], year);
  return a + (b - a) * f;
}

// ---------- Long-term commitment ----------
// IPCC AR6 WG1 SPM B.5.4: over the next 2000 years global sea level rises about
//   2-3 m at 1.5 C,  2-6 m at 2 C,  19-22 m at 5 C.  Values between are interpolated by us.
const LT = [
  { t: 1.5, lo: 2, hi: 3 },
  { t: 2.0, lo: 2, hi: 6 },
  { t: 5.0, lo: 19, hi: 22 },
];
export function commitment2000y(t: number): { lo: number; mid: number; hi: number; interpolated: boolean } {
  if (t <= LT[0].t) {
    const k = Math.max(0.5, t / LT[0].t);
    return { lo: LT[0].lo * k, hi: LT[0].hi * k, mid: 2.5 * k, interpolated: t < LT[0].t };
  }
  for (let i = 0; i < LT.length - 1; i++) {
    const a = LT[i], b = LT[i + 1];
    if (t <= b.t) {
      const f = (t - a.t) / (b.t - a.t);
      const lo = a.lo + (b.lo - a.lo) * f, hi = a.hi + (b.hi - a.hi) * f;
      return { lo, hi, mid: (lo + hi) / 2, interpolated: f > 0.001 && f < 0.999 };
    }
  }
  const last = LT[LT.length - 1];
  return { lo: last.lo, hi: last.hi, mid: (last.lo + last.hi) / 2, interpolated: false };
}

// ---------- Storms ----------
export const SURGES = [
  { id: 'calm', m: 0 },
  { id: 'tide', m: 0.25 },
  { id: 'winter', m: 0.75 },
  { id: 'severe', m: 1.5 },
  { id: 'extreme', m: 2.5 },
] as const;

// ---------- Personal / collective action ----------
// Emission factors, kg CO2e. Sources: UK DESNZ 2024 GHG conversion factors (transport),
// Israel Electricity Authority grid intensity (~0.45 kg/kWh), Scarborough et al. 2023 Nature Food (diet).
export const FACTORS = {
  car: 0.17,         // average car, driver alone, per km
  bus: 0.10,         // per passenger-km
  train: 0.04,       // Israel Railways (diesel + electric mix), per passenger-km (estimate)
  lightrail: 0.03,   // electric light rail, per passenger-km (estimate on Israeli grid)
  bike: 0.0,
  ebike: 0.005,
  flightPerKm: 0.15, // economy, incl. non-CO2 effects
  grid: 0.45,        // per kWh
  dietMeat: 10.24,   // high-meat diet, per day
  dietVegan: 2.47,   // plant-based diet, per day
  dietVeg: 3.81,     // vegetarian, per day
  kwhPerPerson: 2400 // home electricity per person per year in Israel (approx.)
};
export type Transit = 'train' | 'lightrail' | 'bus' | 'bike' | 'ebike';
export const FLIGHTS = { athens: 1200, london: 3600, nyc: 9100 }; // one-way km from TLV

export interface ActionInput {
  commuteKm: number;    // round trip per day
  commuteDays: number;  // per week moved off solo car
  transit: Transit;
  flightsShort: number; // round trips per year avoided (~Europe)
  flightsLong: number;  // round trips per year avoided (~USA)
  plantDays: number;    // days per week plant-based instead of high-meat
  energyPct: number;    // % of home electricity saved or replaced by rooftop solar
  years: number;        // how long it is kept up
  people: number;
}

export function actionTonnes(a: ActionInput) {
  const commute = (FACTORS.car - FACTORS[a.transit]) * a.commuteKm * a.commuteDays * 47;
  const flights = (a.flightsShort * FLIGHTS.london * 2 + a.flightsLong * FLIGHTS.nyc * 2) * FACTORS.flightPerKm;
  const diet = (FACTORS.dietMeat - FACTORS.dietVegan) * a.plantDays * 52;
  const energy = FACTORS.kwhPerPerson * (a.energyPct / 100) * FACTORS.grid;
  const perPersonYear = (commute + flights + diet + energy) / 1000; // tonnes
  return {
    parts: { commute: commute / 1000, flights: flights / 1000, diet: diet / 1000, energy: energy / 1000 },
    perPersonYear,
    total: perPersonYear * a.years * a.people,
  };
}

// Physical consequences of avoiding `t` tonnes of CO2
export const OCEAN_AREA_M2 = 3.61e14;
export const ARCTIC_ICE_M2_PER_T = 3;    // Notz & Stroeve 2016, Science: ~3 m2 of September sea ice per tonne
export const LT_SLR_PER_C = 2.3;         // Levermann et al. 2013, PNAS: ~2.3 m per C within 2000 years
export function consequences(t: number, slr2100PerC: number, israelM2PerM: number) {
  const dT = t * TCRE_PER_TONNE;
  const dh2100 = dT * slr2100PerC;           // m
  const dhLong = dT * LT_SLR_PER_C;          // m
  return {
    warming: dT,
    seaIce: t * ARCTIC_ICE_M2_PER_T,
    dh2100, dhLong,
    waterLong: dhLong * OCEAN_AREA_M2,       // m3 of sea-level rise avoided
    coastM2: dhLong * israelM2PerM,          // m2 of Israeli coast kept dry in the long run
  };
}
