// Single app state with change subscriptions; persisted in the URL hash so views can be shared.
import type { ScenarioId } from './science';
import { slrScenario, slrWarming, warmingFromBudget, commitment2000y, SURGES, SCENARIOS } from './science';

export type Driver = 'scenario' | 'budget' | 'manual';
export type View = '2d' | '3d' | 'photo';
export type Panel = null | 'place' | 'emissions' | 'act' | 'data' | 'about';

export interface State {
  lang: 'en' | 'he';
  driver: Driver;
  scenario: ScenarioId;
  q: number;            // quantile index 0..4 (2 = median)
  year: number;
  budget: number;       // GtCO2 emitted from 2025 on
  longTerm: boolean;    // show 2000-year committed rise instead of a year
  manual: number;       // m
  surge: (typeof SURGES)[number]['id'];
  compare: boolean;     // show coast saved: SSP1-1.9 vs SSP5-8.5
  view: View;
  basemap: 'map' | 'sat';
  site: string;
  panel: Panel;
  buildings: boolean;
  style: 'real' | 'illus' | 'classic'; // real elevation flooding, or illustration with shoreline erosion
}

export const state: State = {
  lang: 'en', driver: 'scenario', scenario: 'ssp245', q: 2, year: 2100, budget: 2300, longTerm: false,
  manual: 1, surge: 'calm', compare: false, view: '2d', basemap: 'map', site: 'haifa_bay', panel: null,
  buildings: true, style: 'real',
};

type Fn = (s: State, changed: Set<keyof State>) => void;
const subs: Fn[] = [];
export function subscribe(fn: Fn) { subs.push(fn); }

let pending = new Set<keyof State>(); let scheduled = false;
export function set(patch: Partial<State>) {
  for (const k of Object.keys(patch) as (keyof State)[]) {
    if ((state as any)[k] !== (patch as any)[k]) { (state as any)[k] = (patch as any)[k]; pending.add(k); }
  }
  if (!scheduled && pending.size) {
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false; const ch = pending; pending = new Set();
      for (const f of subs) f(state, ch);
      writeHash();
    });
  }
}

export function surgeM() { return SURGES.find((s) => s.id === state.surge)!.m; }

/** Mean sea level rise (m) the map should show, before storms. */
export function baseLevel(s: State = state): number {
  if (s.driver === 'manual') return s.manual;
  if (s.driver === 'budget') {
    const t = warmingFromBudget(s.budget);
    return s.longTerm ? commitment2000y(t).mid : slrWarming(t, s.year, s.q);
  }
  if (s.longTerm) return commitment2000y(SCENARIOS.find((x) => x.id === s.scenario)!.warm2100).mid;
  return slrScenario(s.scenario, s.year, s.q);
}
export function level(): number { return baseLevel() + surgeM(); }

/** Levels for the "coast we can save" comparison. */
export function compareLevels(): { low: number; high: number } {
  const sg = surgeM();
  if (state.longTerm) return { low: commitment2000y(1.4).mid + sg, high: commitment2000y(4.4).mid + sg };
  return { low: slrScenario('ssp119', state.year, state.q) + sg, high: slrScenario('ssp585', state.year, state.q) + sg };
}

// ---- URL hash ----
const KEYS: (keyof State)[] = ['lang', 'driver', 'scenario', 'q', 'year', 'budget', 'longTerm', 'manual', 'surge', 'compare', 'view', 'basemap', 'site', 'style'];
function writeHash() {
  const p = new URLSearchParams();
  for (const k of KEYS) p.set(k, String(state[k]));
  history.replaceState(null, '', '#' + p.toString());
}
export function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  for (const k of KEYS) {
    const v = p.get(k); if (v == null) continue;
    const cur = state[k];
    (state as any)[k] = typeof cur === 'number' ? Number(v) : typeof cur === 'boolean' ? v === 'true' : v;
  }
  if (state.view === 'photo') state.view = '3d'; // photoreal needs an explicit click (API key)
  try { const l = localStorage.getItem('rt-lang'); if (!p.get('lang') && (l === 'he' || l === 'en')) state.lang = l; } catch { /* storage blocked */ }
}
