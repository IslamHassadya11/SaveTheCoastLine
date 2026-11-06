// All on-screen UI: top bar, place bar, control dock, side drawer panels, popup text, search, story mode.
import { state, set, subscribe, level, baseLevel, surgeM, compareLevels, type Panel, type State } from './state';
import { t, fmt, meters, siteName, siteTag, big, type Key } from './i18n';
import { icon } from './icons';
import {
  SCENARIOS, SURGES, QUANTILES, slrScenario, slrWarming, warmingFromBudget, budgetForWarming, commitment2000y,
  ANNUAL_EMISSIONS, actionTonnes, consequences, type ActionInput, type Transit, type ScenarioId,
} from './science';
import { reached, landPerMetre } from './stats';
import { lineChart } from './charts';
import type { Site, Climate } from './data';
import type { FloodGrid } from './flood';
import * as M from './map';
import { startTour, startOrbit, startDrone, stopFlight, onFlightChange, flightMode } from './fly';

let sites: Site[]; let climate: Climate; let grid: FloodGrid;
const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const site = () => sites.find((s) => s.id === state.site) ?? sites[0];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function initUI(s: Site[], c: Climate, g: FloodGrid, hooks: { onPhoto: () => void; onLeavePhoto: () => void }) {
  sites = s; climate = c; grid = g; photoHooks = hooks;
  renderAll();
  bindGlobal();
  subscribe(onChange);
  M.onPointInfo((ll, which) => pointInfo(ll.lng, ll.lat, which));
  initSwipe();
  onFlightChange(() => renderPlacebar());
}
let photoHooks: { onPhoto: () => void; onLeavePhoto: () => void };

function renderAll() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === 'he' ? 'rtl' : 'ltr';
  document.title = `${t('title')} - ${t('subtitle')}`;
  renderTop(); renderPlacebar(); renderDock(); renderRail(); renderLegend(); renderDrawer(); updateLive();
}

// ---------------- change handling ----------------
let floodQueued = false;
function onChange(s: State, ch: Set<keyof State>) {
  if (ch.has('lang')) {
    try { localStorage.setItem('rt-lang', s.lang); } catch { /* ignore */ }
    renderAll(); M.applyLanguage(); return;
  }
  if (ch.has('driver') || ch.has('longTerm') || ch.has('scenario') || ch.has('q') || ch.has('surge') || ch.has('compare') || ch.has('style')) renderDock();
  if (ch.has('compare')) { M.setCompare(state.compare, $('#map2')); $('#swipe').hidden = !state.compare; }
  if (ch.has('view')) {
    renderTop();
    if (state.view === '3d' && !M.is3D()) {
      const far = M.map.getZoom() < 12 && !ch.has('site');
      M.enter3D(!far && !ch.has('site'));
      if (far) M.flyToSite(site());
    } else if (state.view === '2d' && M.is3D()) M.enter2D();
  }
  if (ch.has('site')) { renderPlacebar(); M.highlightMarker(); M.flyToSite(site()); }
  if (ch.has('panel')) renderDrawer();
  else if (state.panel && [...ch].some((k) => ['scenario', 'year', 'budget', 'driver', 'q', 'manual', 'surge', 'longTerm', 'compare', 'site', 'style'].includes(k))) refreshDrawer();
  if (ch.has('basemap')) M.applyBasemap();
  if (ch.has('buildings')) M.setBuildingsVisible(state.buildings);
  if (ch.has('compare') || ch.has('style') || ch.has('basemap')) renderLegend();
  if (!floodQueued) {
    floodQueued = true;
    requestAnimationFrame(() => { floodQueued = false; M.updateFlood(); M.refreshPopup(); levelListeners.forEach((f) => f()); });
  }
  updateLive();
}
const levelListeners: (() => void)[] = [];
export function onLevelChange(fn: () => void) { levelListeners.push(fn); }

// ---------------- top bar ----------------
function renderTop() {
  $('#top').innerHTML = `
    <div class="brand">
      <div class="logo">${icon('wave', 22)}</div>
      <div class="brand-text"><h1>${t('title')}</h1><p>${t('subtitle')}</p></div>
    </div>
    <div class="seg views" role="tablist">
      ${(['2d', '3d', 'photo'] as const).map((v) => `<button role="tab" aria-selected="${state.view === v}" data-view="${v}" class="${state.view === v ? 'on' : ''}">${t(('view_' + v) as Key)}</button>`).join('')}
    </div>
    <div class="tools">
      <button class="tbtn" data-act="search" title="${t('search')}">${icon('search')}<span>${t('search')}</span></button>
      <button class="tbtn" data-act="tour" title="${t('tour')}">${icon('plane')}<span>${flightMode() === 'tour' ? t('tour_stop') : t('tour')}</span></button>
      <button class="tbtn" data-act="present" title="${t('present')}">${icon('present')}<span>${t('present')}</span></button>
      <a class="tbtn" href="./classic/" title="${t('classic_hint')}">${icon('globe')}<span>${t('classic')}</span></a>
      <button class="tbtn icon-only" data-act="layers" title="${t('layers')}">${icon('layers')}</button>
      <button class="tbtn lang" data-act="lang">${t('lang_switch')}</button>
      <button class="tbtn icon-only" data-act="about" title="${t('about')}">${icon('info')}</button>
    </div>`;
}

function renderPlacebar() {
  const s = site(); const fm = flightMode();
  $('#placebar').innerHTML = `
    <button class="pb-arrow" data-act="prev" aria-label="previous">${icon(state.lang === 'he' ? 'chev_r' : 'chev_l')}</button>
    <button class="pb-site" data-act="places">${icon('pin', 16)}<span class="pb-name">${esc(siteName(s))}</span><span class="pb-tag">${esc(siteTag(s))}</span>${icon('chev_d', 16)}</button>
    <button class="pb-arrow" data-act="next" aria-label="next">${icon(state.lang === 'he' ? 'chev_l' : 'chev_r')}</button>
    <span class="pb-sep"></span>
    <button class="pb-btn ${fm === 'orbit' ? 'on' : ''}" data-act="orbit">${icon('orbit', 16)}<span>${t('orbit')}</span></button>
    <button class="pb-btn ${fm === 'drone' ? 'on' : ''}" data-act="drone">${icon('drone', 16)}<span>${t('drone')}</span></button>
    ${fm === 'drone' ? `<div class="drone-help">${t('drone_help')}</div>` : ''}`;
  const tb = document.querySelector('[data-act="tour"] span'); if (tb) tb.textContent = fm === 'tour' ? t('tour_stop') : t('tour');
}

// ---------------- dock ----------------
function renderDock() {
  const d = state.driver;
  const yearRow = state.longTerm
    ? `<div class="time long"><span class="long-label">${t('in_2000y')}</span></div>`
    : `<div class="time">
        <button class="play" data-act="play" aria-label="${t('play')}">${icon(playing ? 'pause' : 'play', 16)}</button>
        <input type="range" id="year" min="2020" max="2150" step="1" value="${state.year}" aria-label="${t('year')}">
        <output id="yearv">${state.year}</output>
      </div>`;
  let body = '';
  if (d === 'scenario') {
    body = `<div class="chips scen">${SCENARIOS.map((s) => `
      <button class="chip ${state.scenario === s.id ? 'on' : ''}" data-scen="${s.id}" title="${s.id === 'ssp585_low' ? t('ssp585_low_note') : ''}">
        <i style="background:${s.color}"></i><b>${s.short}</b><span>${t(s.id as Key)}</span></button>`).join('')}</div>
`;
  } else if (d === 'budget') {
    const marks = [{ k: 'mark_15', v: budgetForWarming(1.5) }, { k: 'mark_2', v: budgetForWarming(2) }, { k: 'mark_now', v: budgetForWarming(2.7) }, { k: 'mark_fossil', v: budgetForWarming(4.4) }];
    body = `<div class="budget">
        <div class="row between"><label for="budget">${t('budget_label')}</label><output id="budgetv"></output></div>
        <input type="range" id="budget" min="0" max="6500" step="10" value="${state.budget}" class="eco">
        <div class="marks">${marks.map((m) => `<button data-budget="${Math.round(m.v)}" style="--x:${(Math.max(0, m.v) / 6500) * 100}%">${t(m.k as Key)}</button>`).join('')}</div>
        <div class="row between sub"><span id="budgetyears"></span><span id="budgetwarm"></span></div>
      </div>`;
  } else {
    body = `<div class="budget">
        <div class="row between"><label for="manual">${t('manual_label')}</label><output id="manualv"></output></div>
        <input type="range" id="manual" min="0" max="20" step="0.05" value="${state.manual}">
        <div class="ticks"><span>0</span><span>5</span><span>10</span><span>15</span><span>20 m</span></div>
      </div>`;
  }
  $('#dock').innerHTML = `
    <div class="dock-head">
      <div class="readout">
        <div class="lbl">${t('sea_level')}</div>
        <div class="big" id="lvl"></div>
        <div class="sub" id="lvlsub"></div>
      </div>
      <div class="stats" id="stats"></div>
      <button class="collapse" data-act="collapse" aria-label="collapse">${icon('chev_d', 18)}</button>
    </div>
    <div class="dock-body">
      ${yearRow}
      <div class="row-split">
        <div class="drivers seg">${(['scenario', 'budget', 'manual'] as const).map((k) => `<button data-driver="${k}" class="${d === k ? 'on' : ''}">${t(('driver_' + k) as Key)}</button>`).join('')}</div>
        <div class="seg small style-seg" title="${t('style_note')}">${(['real', 'illus'] as const).map((k) => `<button data-style="${k}" class="${state.style === k ? 'on' : ''}">${t(('style_' + k) as Key)}</button>`).join('')}</div>
        ${d !== 'manual' ? `<button class="cmp-btn ${state.compare ? 'on' : ''}" data-act="compare">${icon('swap', 16)}<span>${t('compare')}</span></button>` : ''}
      </div>
      ${state.style === 'illus' ? `<p class="style-note">${t('style_illus_note')}</p>` : ''}
      <div class="driver-body">${body}</div>
      <details class="opts" ${optsOpen ? 'open' : ''}>
        <summary><span>${t('more_opts')}</span><span class="opt-sum">${optSummary()}</span>${icon('chev_d', 16)}</summary>
        <div class="opt"><label>${t('storm')}</label>
          <div class="seg small">${SURGES.map((s) => `<button data-surge="${s.id}" class="${state.surge === s.id ? 'on' : ''}" title="${t('surge_note')}">${t(('surge_' + s.id) as Key)}${s.m ? ` <small>+${fmt(s.m, 2)}</small>` : ''}</button>`).join('')}</div></div>
        <div class="opt-row">
          ${d !== 'manual' ? `<div class="opt"><label>${t('horizon')}</label><div class="seg small"><button data-long="0" class="${!state.longTerm ? 'on' : ''}">${t('h_year')}</button><button data-long="1" class="${state.longTerm ? 'on' : ''}">${t('h_long')}</button></div></div>` : ''}
          ${d !== 'manual' ? `<div class="opt"><label>${t('range')}</label><div class="seg small">${QUANTILES.map((_, i) => `<button data-q="${i}" class="${state.q === i ? 'on' : ''}">${t(('q' + i) as Key)}</button>`).join('')}</div></div>` : ''}
        </div>
      </details>
    </div>`;
  $('#dock').querySelector('details')!.addEventListener('toggle', (e) => { optsOpen = (e.target as HTMLDetailsElement).open; });
  $('#dock').classList.toggle('collapsed', dockCollapsed);
}
let dockCollapsed = window.innerWidth < 700;
let optsOpen = false;
function optSummary() {
  const parts = [t(('surge_' + state.surge) as Key)];
  if (state.driver !== 'manual') parts.push(state.longTerm ? t('h_long') : t('h_year'));
  if (state.driver !== 'manual' && state.q !== 2) parts.push(t(('q' + state.q) as Key));
  return parts.join(' · ');
}

function renderRail() {
  const items: [Panel, string, Key][] = [['place', 'place', 'tab_place'], ['emissions', 'factory', 'tab_emissions'], ['act', 'leaf', 'tab_act'], ['data', 'chart', 'tab_data']];
  $('#rail').innerHTML = items.map(([p, ic, k]) => `<button data-panel="${p}" class="${state.panel === p ? 'on' : ''}">${icon(ic, 20)}<span>${t(k)}</span></button>`).join('');
}

function renderLegend() {
  const sat = state.basemap === 'sat';
  $('#legend').innerHTML = `
    <div class="lg-row"><i class="lg-sw sea ${sat ? 'sat' : ''}"></i><span>${t('legend_new_sea')}</span></div>
    <div class="lg-row"><i class="lg-sw foam"></i><span>${t('legend_edge')}</span></div>
    <div class="lg-row"><i class="lg-line ${sat ? 'sat' : ''}"></i><span>${t('legend_today')}</span></div>
    <div class="lg-row"><i class="lg-sw bld"></i><span>${t('legend_bld')}</span></div>
    ${state.style === 'illus' ? `<div class="lg-note">${t('legend_illus')}</div>` : ''}`;
}

/** Text that changes continuously with sliders (no re-render). */
function updateLive() {
  const L = level(), base = baseLevel(), sg = surgeM();
  const cmp = state.compare ? compareLevels() : null;
  const lv = $('#lvl'); if (!lv) return;
  lv.textContent = meters(L);
  const sub = [t('vs_base')];
  if (sg) sub.push(t('incl_storm', { m: meters(sg, 2) }));
  if (state.driver === 'scenario' && !state.longTerm && !cmp) sub.unshift(`${SCENARIOS.find((s) => s.id === state.scenario)!.short} · ${state.year}`);
  if (state.longTerm) sub.unshift(t('in_2000y'));
  $('#lvlsub').textContent = sub.join(' · ');
  void base;
  const il = state.style === 'illus';
  const km2 = state.lang === 'he' ? 'קמ״ר' : 'km²', km = state.lang === 'he' ? 'ק״מ' : 'km';
  const amounts = (l: number) => ({ land: reached('__all', 'land_m2', l, il) / 1e6, bld: reached('__all', 'buildings', l, il), road: reached('__all', 'road_m', l, il) / 1000 });
  if (cmp) {
    const a = amounts(cmp.low), b = amounts(cmp.high);
    const saved = { land: b.land - a.land, bld: b.bld - a.bld, road: b.road - a.road };
    $('#stats').innerHTML = `
      <div class="stat saved"><div class="v">${fmt(saved.land, saved.land < 10 ? 1 : 0)} <small>${km2}</small></div><div class="l">${t('saved_land')}</div></div>
      <div class="stat saved"><div class="v">${fmt(Math.round(saved.bld))}</div><div class="l">${t('saved_bld')}</div></div>
      <div class="stat saved"><div class="v">${fmt(saved.road, saved.road < 10 ? 1 : 0)} <small>${km}</small></div><div class="l">${t('saved_road')}</div></div>
      <div class="scope">${t('saved_scope')}</div>`;
    $('#lvl').innerHTML = `<span class="cmp-l">${meters(cmp.low)}</span> <span class="vs">${t('vs')} ${meters(cmp.high)}</span>`;
    updateSwipeLabels(cmp);
  } else {
    const a = amounts(L);
    $('#stats').innerHTML = `
      <div class="stat"><div class="v">${fmt(a.land, a.land < 10 ? 1 : 0)} <small>${km2}</small></div><div class="l">${t('land')}</div></div>
      <div class="stat"><div class="v">${fmt(Math.round(a.bld))}</div><div class="l">${t('buildings')}</div></div>
      <div class="stat"><div class="v">${fmt(a.road, a.road < 10 ? 1 : 0)} <small>${km}</small></div><div class="l">${t('roads')}</div></div>
      <div class="scope">${t('whole_coast')}${il ? ' · ' + t('style_illus') : ''}</div>`;
  }
  const yv = $('#yearv'); if (yv) yv.textContent = String(state.year);
  const yr = $<HTMLInputElement>('#year'); if (yr && Number(yr.value) !== state.year) yr.value = String(state.year);
  if (state.driver === 'budget') {
    const w = warmingFromBudget(state.budget);
    $('#budgetv').textContent = `${fmt(state.budget)} GtCO₂`;
    $('#budgetwarm').innerHTML = `${t('budget_warm')}: <b>+${fmt(w, 1)} °C</b>`;
    $('#budgetyears').textContent = t('budget_years', { n: fmt(state.budget / ANNUAL_EMISSIONS), r: fmt(ANNUAL_EMISSIONS, 0) });
    const b = $<HTMLInputElement>('#budget'); if (b && Number(b.value) !== state.budget) b.value = String(state.budget);
  }
  if (state.driver === 'manual') {
    $('#manualv').textContent = meters(state.manual);
    const b = $<HTMLInputElement>('#manual'); if (b && Number(b.value) !== state.manual) b.value = String(state.manual);
  }
}

// ---------------- play ----------------
let playing = false, playTimer = 0;
function togglePlay() {
  playing = !playing;
  if (playing) {
    if (state.year >= 2150) set({ year: 2020 });
    let last = performance.now();
    const step = (ts: number) => {
      if (!playing) return;
      if (ts - last > 70) { last = ts; if (state.year >= 2150) { togglePlay(); return; } set({ year: state.year + 1 }); }
      playTimer = requestAnimationFrame(step);
    };
    playTimer = requestAnimationFrame(step);
  } else cancelAnimationFrame(playTimer);
  const b = $('[data-act="play"]'); if (b) b.innerHTML = icon(playing ? 'pause' : 'play', 16);
}

// ---------------- drawer ----------------
function renderDrawer() {
  renderRail();
  const dr = $('#drawer');
  document.body.classList.toggle('drawer-open', !!state.panel && state.panel !== 'about');
  if (!state.panel || state.panel === 'about') {
    dr.hidden = true;
    if (state.panel === 'about') openAbout();
    return;
  }
  dr.hidden = false;
  const tabs: [Panel, Key][] = [['place', 'tab_place'], ['emissions', 'tab_emissions'], ['act', 'tab_act'], ['data', 'tab_data']];
  dr.innerHTML = `
    <div class="dr-tabs">${tabs.map(([p, k]) => `<button data-panel="${p}" class="${state.panel === p ? 'on' : ''}">${t(k)}</button>`).join('')}
      <button class="dr-close" data-panel="" aria-label="${t('close')}">${icon('close')}</button></div>
    <div class="dr-body" id="drbody"></div>`;
  refreshDrawer(true);
}

function refreshDrawer(full = false) {
  const body = $('#drbody'); if (!body) return;
  const p = state.panel;
  if (p === 'place') renderPlace(body);
  else if (p === 'emissions') renderEmissions(body, full);
  else if (p === 'act') { if (full || !body.querySelector('.act')) renderAct(body); else updateAct(); }
  else if (p === 'data') renderData(body);
}

// ----- place panel -----
function renderPlace(body: HTMLElement) {
  const s = site();
  const cmp = state.compare ? compareLevels() : null;
  const L = cmp ? cmp.low : level();
  const km = state.lang === 'he' ? 'ק״מ' : 'km';
  const ha = state.lang === 'he' ? 'דונם' : 'ha';
  const landHa = (v: number) => state.lang === 'he' ? v / 1000 : v / 1e4; // dunam or hectare
  const r = (k: 'buildings' | 'land_m2' | 'road_m', l: number) => reached(s.id, k, l, state.style === 'illus');
  const rows = [
    { id: 'ssp119' as ScenarioId }, { id: 'ssp245' as ScenarioId }, { id: 'ssp585' as ScenarioId }, { id: 'ssp585_low' as ScenarioId },
  ];
  const sg = surgeM();
  body.innerHTML = `
    <h2>${esc(siteName(s))}</h2><p class="muted">${esc(siteTag(s))}</p>
    <div class="btnrow"><button class="btn" data-act="orbit">${icon('orbit', 16)} ${t('orbit')}</button><button class="btn" data-act="drone">${icon('drone', 16)} ${t('drone')}</button></div>
    <div class="cards3">
      <div class="card"><div class="v">${fmt(landHa(r('land_m2', L)), 0)} <small>${ha}</small></div><div class="l">${t('land')}</div></div>
      <div class="card"><div class="v">${fmt(Math.round(r('buildings', L)))}</div><div class="l">${t('buildings')}</div></div>
      <div class="card"><div class="v">${fmt(r('road_m', L) / 1000, 1)} <small>${km}</small></div><div class="l">${t('roads')}</div></div>
    </div>
    <p class="muted small">${t('at_level')}: ${meters(L)}</p>
    <h3>${t('exposure_title')}</h3>
    <div id="expchart"></div>
    <h3>${t('when_floods')}</h3>
    <table class="tbl"><thead><tr><th></th><th>2050</th><th>2100</th><th>2150</th></tr></thead><tbody>
      ${rows.map(({ id }) => {
        const sc = SCENARIOS.find((x) => x.id === id)!;
        return `<tr><td><i class="dotc" style="background:${sc.color}"></i>${sc.short}</td>${[2050, 2100, 2150].map((y) => {
          const l = slrScenario(id, y, state.q) + sg;
          return `<td><b>${meters(l, 2)}</b><br><span class="muted">${fmt(Math.round(r('buildings', l)))} ${t('bld_short')}</span></td>`;
        }).join('')}</tr>`;
      }).join('')}
    </tbody></table>
    <p class="muted small">${t('click_hint')}</p>`;
  const maxL = Math.max(6, Math.ceil(L + 1));
  const pts: [number, number][] = [];
  for (let l = 0; l <= maxL; l += maxL / 120) pts.push([l, r('buildings', l)]);
  const ymax = niceMax(Math.max(10, pts[pts.length - 1][1]));
  lineChart($('#expchart'), {
    series: [{ label: t('exposure_y'), color: '#3987e5', points: pts, area: true, endLabel: false }],
    x: [0, maxL], y: [0, ymax], xTicks: ticks(0, maxL, 6), yTicks: ticks(0, ymax, 4),
    xFmt: (v) => `${fmt(v)} m`, yFmt: (v) => compact(v),
    vline: { x: Math.min(maxL, L), label: meters(L, 1) },
    tip: (x) => `<b>${meters(x, 1)}</b><br>${fmt(Math.round(r('buildings', x)))} ${t('bld_short')} · ${fmt(landHa(r('land_m2', x)), 0)} ${ha}`,
  });
}

// ----- emissions panel -----
function renderEmissions(body: HTMLElement, full: boolean) {
  const gt = state.driver === 'budget' ? state.budget : budgetForWarming(SCENARIOS.find((s) => s.id === state.scenario)!.warm2100);
  const w = warmingFromBudget(gt);
  const s2100 = slrWarming(w, 2100, 2), lo = slrWarming(w, 2100, 1), hi = slrWarming(w, 2100, 3);
  const lt = commitment2000y(w);
  const left = budgetForWarming(1.5);
  if (full || !body.querySelector('.chain')) {
    body.innerHTML = `
      <h2>${t('tab_emissions')}</h2><p class="muted">${t('em_intro')}</p>
      <div class="budget panel-budget">
        <input type="range" id="budget2" min="0" max="6500" step="10" value="${Math.round(gt)}" class="eco" aria-label="${t('budget_label')}">
      </div>
      <div class="chain" id="chain"></div>
      <div class="callout"><b>${t('em_budget_left')}: ≈ ${fmt(left)} GtCO₂</b><br>${t('em_budget_gone', { n: fmt(left / ANNUAL_EMISSIONS) })}</div>
      <h3>${t('em_chart')}</h3><div id="emchart"></div>
      <p class="muted small">${t('em_long_note')}</p>`;
    const pts: [number, number][] = [], band: [number, number, number][] = [];
    for (let x = 1.5; x <= 5.001; x += 0.05) { pts.push([x, slrWarming(x, 2100, 2)]); band.push([x, slrWarming(x, 2100, 1), slrWarming(x, 2100, 3)]); }
    lineChart($('#emchart'), {
      series: [{ label: t('median'), color: '#3987e5', points: pts, band, endLabel: true }],
      x: [1.5, 5], y: [0, 1.2], xTicks: [1.5, 2, 3, 4, 5], yTicks: [0, 0.4, 0.8, 1.2],
      xFmt: (v) => `${fmt(v, v % 1 ? 1 : 0)} °C`, yFmt: (v) => `${fmt(v, 1)} m`,
      vline: { x: Math.max(1.5, Math.min(5, w)), label: `+${fmt(w, 1)} °C` },
      tip: (x) => `<b>+${fmt(x, 1)} °C</b><br>${t('median')}: ${meters(slrWarming(x, 2100, 2))}<br>${t('likely')}: ${meters(slrWarming(x, 2100, 1))} – ${meters(slrWarming(x, 2100, 3))}`,
    });
  }
  $('#chain').innerHTML = `
    <div class="link"><span class="k">${t('em_step1')}</span><span class="val">${fmt(gt)} GtCO₂</span></div>
    <div class="arrow">↓</div>
    <div class="link"><span class="k">${t('em_step2')}</span><span class="val warm">+${fmt(w, 1)} °C</span></div>
    <div class="arrow">↓</div>
    <div class="link"><span class="k">${t('em_step3')}</span><span class="val">${meters(s2100)} <small>(${meters(lo)} – ${meters(hi)})</small></span></div>
    <div class="arrow">↓</div>
    <div class="link big"><span class="k">${t('em_step4')}</span><span class="val danger">${meters(lt.mid, 1)} <small>(${fmt(lt.lo, 0)}–${fmt(lt.hi, 0)} m${lt.interpolated ? '*' : ''})</small></span></div>`;
  const b2 = $<HTMLInputElement>('#budget2'); if (b2 && document.activeElement !== b2) b2.value = String(Math.round(gt));
}

// ----- act panel -----
const act: ActionInput & { who: string } = {
  commuteKm: 30, commuteDays: 4, transit: 'train', flightsShort: 1, flightsLong: 0, plantDays: 3, energyPct: 30, years: 10, people: 30, who: 'seminar',
};
const WHO: Record<string, number> = { me: 1, seminar: 30, uni: 30000, israel: 10_000_000, world: 8_200_000_000 };
function renderAct(body: HTMLElement) {
  const slider = (id: keyof ActionInput, min: number, max: number, step: number, label: string, unit = '') =>
    `<div class="sl"><div class="row between"><label for="a-${id}">${label}</label><output id="o-${id}">${fmt(act[id] as number)}${unit}</output></div>
     <input type="range" class="eco" id="a-${id}" data-a="${id}" min="${min}" max="${max}" step="${step}" value="${act[id]}"></div>`;
  body.innerHTML = `<div class="act">
    <h2>${t('tab_act')}</h2><p class="muted">${t('act_intro')}</p>
    <h3>${t('act_who')}</h3>
    <div class="seg small wrap">${Object.keys(WHO).map((k) => `<button data-who="${k}" class="${act.who === k ? 'on' : ''}">${t(('who_' + k) as Key)}</button>`).join('')}</div>
    <div class="row people"><input type="number" id="a-people" min="1" value="${act.people}"><span>${t('people')}</span><span class="muted">·</span><span>${t('act_years')}</span><input type="number" id="a-years" min="1" max="80" value="${act.years}"><span>${t('years')}</span></div>
    <div class="lever"><h4>🚆 ${t('act_commute')}</h4>
      ${slider('commuteKm', 0, 120, 5, t('act_km'), ' km')}
      ${slider('commuteDays', 0, 7, 1, t('act_days'))}
      <div class="seg small wrap">${(['train', 'lightrail', 'bus', 'bike', 'ebike'] as Transit[]).map((m) => `<button data-transit="${m}" class="${act.transit === m ? 'on' : ''}">${t(('t_' + m) as Key)}</button>`).join('')}</div></div>
    <div class="lever"><h4>✈️ ${t('act_flights')}</h4>${slider('flightsShort', 0, 6, 1, t('act_short'))}${slider('flightsLong', 0, 4, 1, t('act_long'))}</div>
    <div class="lever"><h4>🥗 ${t('act_diet')}</h4>${slider('plantDays', 0, 7, 1, t('act_plant'))}</div>
    <div class="lever"><h4>☀️ ${t('act_energy')}</h4>${slider('energyPct', 0, 100, 5, t('act_energy_pct'), '%')}</div>
    <div id="actres"></div></div>`;
  updateAct();
}
function updateAct() {
  const r = actionTonnes(act);
  const slr2100PerC = (slrWarming(3, 2100) - slrWarming(2, 2100));
  const L = Math.max(1, baseLevel());
  const c = consequences(r.total, slr2100PerC, landPerMetre(state.longTerm ? L : 3));
  for (const k of ['commuteKm', 'commuteDays', 'flightsShort', 'flightsLong', 'plantDays', 'energyPct'] as const) {
    const o = document.getElementById('o-' + k); if (o) o.textContent = fmt(act[k]) + (k === 'commuteKm' ? ' km' : k === 'energyPct' ? '%' : '');
  }
  const parts = r.parts, sum = Math.max(1e-9, parts.commute + parts.flights + parts.diet + parts.energy);
  const bar = (['commute', 'flights', 'diet', 'energy'] as const).map((k, i) => `<i style="width:${(parts[k] / sum) * 100}%;background:${['#3987e5', '#d95926', '#199e70', '#c98500'][i]}" title="${t(('part_' + k) as Key)}: ${fmt(parts[k], 2)} t"></i>`).join('');
  const tons = r.total;
  const area = c.coastM2;
  $('#actres').innerHTML = `
    <div class="result-hero">
      <div class="k">${t('res_co2')}</div>
      <div class="v">${big(tons)} <small>t CO₂</small></div>
      <div class="muted">${fmt(r.perPersonYear, 2)} t ${t('res_peryear')} · ${t('res_vs')}</div>
    </div>
    <div class="stackbar">${bar}</div>
    <div class="legend-inline">${(['commute', 'flights', 'diet', 'energy'] as const).map((k, i) => `<span><i style="background:${['#3987e5', '#d95926', '#199e70', '#c98500'][i]}"></i>${t(('part_' + k) as Key)} ${fmt(parts[k], 2)} t</span>`).join('')}</div>
    <div class="cards2">
      <div class="card"><div class="v">${big(c.seaIce)} m²</div><div class="l">${t('res_ice')}</div></div>
      <div class="card"><div class="v">${big(c.waterLong)} m³</div><div class="l">${t('res_water')}</div><div class="muted small">${t('res_pools', { n: big(c.waterLong / 2500) })}</div></div>
      <div class="card"><div class="v">${big(area)} m²</div><div class="l">${t('res_coast')}</div></div>
      <div class="card"><div class="v">${big(c.warming)} °C</div><div class="l">${t('res_warming')}</div></div>
    </div>
    <p class="callout">${t('res_honest')}</p>`;
}

// ----- data panel -----
function renderData(body: HTMLElement) {
  const g = climate.tide_gauge.data['1797'];
  const co2 = climate.co2;
  body.innerHTML = `
    <h2>${t('tab_data')}</h2>
    <h3>${t('data_gauge')}</h3>
    <div id="gchart"></div>
    <p class="muted small">${t('data_trend', { r: fmt(g.trend_mm_yr, 1) })}</p>
    <h3>${t('data_co2')}</h3>
    <div id="cchart"></div>
    <p class="muted small">${t('data_latest', { ppm: fmt(co2.latest.ppm, 1), m: co2.latest.month, y: co2.latest.year })}</p>
    <h3>${t('data_sources')}</h3><ul class="sources">${t('sources_list')}</ul>`;
  const yrs: number[] = []; for (let y = 2020; y <= 2150; y += 5) yrs.push(y);
  const show: ScenarioId[] = ['ssp119', 'ssp245', 'ssp585'];
  const colors: Record<string, string> = { ssp119: '#3987e5', ssp245: '#c98500', ssp585: '#d55181' };
  const sel = state.scenario;
  const series = show.map((id) => ({
    label: SCENARIOS.find((s) => s.id === id)!.short, color: colors[id],
    points: yrs.map((y) => [y, slrScenario(id, y, 2)] as [number, number]),
    band: id === sel ? yrs.map((y) => [y, slrScenario(id, y, 1), slrScenario(id, y, 3)] as [number, number, number]) : undefined,
  }));
  if (!show.includes(sel)) series.push({
    label: SCENARIOS.find((s) => s.id === sel)!.short, color: '#e8eef5',
    points: yrs.map((y) => [y, slrScenario(sel, y, 2)] as [number, number]),
    band: yrs.map((y) => [y, slrScenario(sel, y, 1), slrScenario(sel, y, 3)] as [number, number, number]),
  });
  series.push({ label: t('observed'), color: '#e8eef5', points: g.years.map((y, i) => [y, g.m[i]] as [number, number]), dots: true } as any);
  const ymax = sel === 'ssp585_low' ? 3 : 2;
  lineChart($('#gchart'), {
    series, x: [1995, 2150], y: [-0.1, ymax], xTicks: [2000, 2050, 2100, 2150], yTicks: ticks(0, ymax, 4),
    xFmt: String, yFmt: (v) => `${fmt(v, 1)} m`, vline: { x: 2026, label: '2026' },
    tip: (x) => {
      const y = Math.round(x);
      const obs = g.years.indexOf(y);
      return `<b>${y}</b>` + (obs >= 0 ? `<br>${t('observed')}: ${meters(g.m[obs])}` : '') +
        (y >= 2020 ? show.map((id) => `<br><i class="dotc" style="background:${colors[id]}"></i>${SCENARIOS.find((s) => s.id === id)!.short}: ${meters(slrScenario(id, y, 2))}`).join('') : '');
    },
  });
  const cy = Object.keys(co2.annual).map(Number).sort((a, b) => a - b);
  lineChart($('#cchart'), {
    series: [{ label: 'CO₂', color: '#d95926', points: cy.map((y) => [y, co2.annual[y]] as [number, number]), endLabel: false }],
    x: [cy[0], cy[cy.length - 1]], y: [300, 440], xTicks: [1960, 1980, 2000, 2020], yTicks: [300, 340, 380, 420],
    xFmt: String, yFmt: (v) => `${v}`, hline: { y: 280, label: '' },
    tip: (x) => { const y = Math.round(x); return co2.annual[y] ? `<b>${y}</b><br>${fmt(co2.annual[y], 1)} ppm` : `<b>${y}</b>`; },
  });
}

function ticks(a: number, b: number, n: number) { const s = (b - a) / n; return Array.from({ length: n + 1 }, (_, i) => +(a + s * i).toFixed(2)); }
function niceMax(v: number) { const p = 10 ** Math.floor(Math.log10(v)); const m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
function compact(v: number) { return v >= 1000 ? fmt(v / 1000, v % 1000 ? 1 : 0) + 'k' : fmt(v); }

// ---------------- point info (map click) ----------------
export function pointInfo(lon: number, lat: number, which: 'main' | 'other' = 'main'): string {
  const c = grid.sample(lon, lat);
  if (!c) return `<div class="pi"><p>${t('pop_high')}</p></div>`;
  if (c.sea) return `<div class="pi"><p>${t('pop_sea')}</p></div>`;
  const cmp = state.compare ? compareLevels() : null;
  const L = cmp ? (which === 'main' ? cmp.low : cmp.high) : level();
  const il = state.style === 'illus';
  const reach = il ? c.fillIllus : c.fill;
  const basin = c.fill - c.ground > 0.3;
  const flooded = reach < L;
  const sg = surgeM();
  const first = (id: ScenarioId) => {
    for (let y = 2020; y <= 2150; y++) if (slrScenario(id, y, state.q) + sg > reach) return String(y);
    return t('never');
  };
  return `<div class="pi">
    ${cmp ? `<div class="pi-sub">${which === 'main' ? t('swipe_low') : t('swipe_high')}</div>` : ''}
    <div class="pi-row"><span>${t('pop_ground')}</span><b>${meters(c.ground, 1)}</b></div>
    <div class="pi-row"><span>${t('pop_reach')}</span><b>${meters(Math.max(0, c.fill), 1)}</b></div>
    ${il ? `<div class="pi-row"><span>${t('pop_erosion')}</span><b>${meters(Math.max(0, c.fillIllus), 1)}</b></div><p class="muted small">${t('pop_dist', { m: fmt(c.dist), r: fmt(c.retreat) })}</p>` : ''}
    ${basin ? `<p class="muted small">${t('pop_basin')}</p>` : ''}
    <p class="${flooded ? 'pi-wet' : 'pi-dry'}">${flooded ? (c.fill < L ? t('pop_flooded', { d: meters(L - c.ground, 1).replace('+', '') }) : t('pop_eroded')) : t('pop_dry')}</p>
    <div class="pi-sub">${t('pop_year')}${sg ? ` (${t('incl_storm', { m: meters(sg, 2) })})` : ''}</div>
    ${(['ssp119', 'ssp245', 'ssp585', 'ssp585_low'] as ScenarioId[]).map((id) => {
      const sc = SCENARIOS.find((x) => x.id === id)!;
      return `<div class="pi-row"><span><i class="dotc" style="background:${sc.color}"></i>${sc.short}</span><b>${first(id)}</b></div>`;
    }).join('')}
  </div>`;
}

// ---------------- swipe comparison ----------------
function initSwipe() {
  const sw = $('#swipe'), m2 = $('#map2');
  let x = window.innerWidth / 2;
  const place = (nx: number) => {
    x = Math.max(40, Math.min(window.innerWidth - 40, nx));
    sw.style.left = x + 'px';
    m2.style.clipPath = `inset(0 0 0 ${x}px)`;
  };
  place(x);
  const handle = sw.querySelector('.sw-handle') as HTMLElement;
  handle.addEventListener('pointerdown', (e) => {
    handle.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => place(ev.clientX);
    const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up);
  });
  window.addEventListener('resize', () => place(Math.min(x, window.innerWidth - 40)));
  sw.hidden = !state.compare;
  if (state.compare) M.setCompare(true, m2);
}
function updateSwipeLabels(cmp: { low: number; high: number }) {
  const lo = $('#swipe .sw-lo'), hi = $('#swipe .sw-hi');
  if (!lo) return;
  const when = state.longTerm ? t('h_long') : String(state.year);
  lo.innerHTML = `<b>${t('swipe_low')}</b><span>${meters(cmp.low)} · ${when}</span>`;
  hi.innerHTML = `<b>${t('swipe_high')}</b><span>${meters(cmp.high)} · ${when}</span>`;
}

// ---------------- search ----------------
let searchTimer = 0;
function openSearch() {
  const box = $('#searchbox');
  box.hidden = !box.hidden;
  if (box.hidden) return;
  box.innerHTML = `<input id="q" type="search" placeholder="${t('search_ph')}" autocomplete="off"><ul id="qres"></ul>`;
  const inp = $<HTMLInputElement>('#q'); inp.focus();
  inp.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = inp.value.trim();
    // local site names first
    const local = sites.filter((s) => (s.en + ' ' + s.he).toLowerCase().includes(q.toLowerCase())).slice(0, 4);
    const show = (rows: { name: string; sub: string; lon: number; lat: number; site?: string }[]) => {
      $('#qres').innerHTML = rows.length ? rows.map((r, i) => `<li><button data-i="${i}"><b>${esc(r.name)}</b><span>${esc(r.sub)}</span></button></li>`).join('') : `<li class="muted">${t('search_none')}</li>`;
      $('#qres').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        const r = rows[Number(b.dataset.i)];
        box.hidden = true;
        if (r.site) set({ site: r.site });
        else { M.map.flyTo({ center: [r.lon, r.lat], zoom: 16, duration: 2500 }); M.map.once('moveend', () => M.showPointInfo([r.lon, r.lat])); }
      }));
    };
    const lrows = local.map((s) => ({ name: siteName(s), sub: siteTag(s), lon: s.lon, lat: s.lat, site: s.id }));
    show(lrows);
    if (q.length < 3) return;
    searchTimer = window.setTimeout(async () => {
      try {
        const u = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&bbox=34.2,31.4,35.5,33.3${state.lang === 'en' ? '&lang=en' : ''}`;
        const r = await (await fetch(u)).json();
        const rows = (r.features ?? []).map((f: any) => ({
          name: f.properties.name ?? f.properties.street ?? '?',
          sub: [f.properties.street, f.properties.housenumber, f.properties.city].filter(Boolean).join(' '),
          lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1],
        }));
        show([...lrows, ...rows]);
      } catch { /* offline: keep local results */ }
    }, 350);
  });
  inp.addEventListener('keydown', (e) => { if (e.key === 'Escape') box.hidden = true; });
}

function openPlaces() {
  const box = $('#places');
  box.hidden = !box.hidden;
  if (box.hidden) return;
  box.innerHTML = `<ul>${sites.map((s) => `<li><button data-site="${s.id}" class="${s.id === state.site ? 'on' : ''}"><b>${esc(siteName(s))}</b><span>${esc(siteTag(s))}</span><em>${fmt(Math.round(reached(s.id, 'buildings', Math.max(level(), 0.01), state.style === 'illus')))} ${t('bld_short')}</em></button></li>`).join('')}</ul>`;
}

function openLayers() {
  const box = $('#layerbox');
  box.hidden = !box.hidden;
  if (box.hidden) return;
  box.innerHTML = `
    <div class="seg small"><button data-base="map" class="${state.basemap === 'map' ? 'on' : ''}">${t('base_map')}</button><button data-base="sat" class="${state.basemap === 'sat' ? 'on' : ''}">${t('base_sat')}</button></div>
    <label class="toggle"><input type="checkbox" id="bld" ${state.buildings ? 'checked' : ''}><span class="sw"></span>${t('show_buildings')}</label>
    <div class="btnrow"><button class="btn" data-act="share">${icon('link', 16)} ${t('share')}</button><button class="btn" data-act="shot">${icon('camera', 16)} ${t('shot')}</button></div>`;
}

function openAbout() {
  modal(`<h2>${t('about')}</h2>${t('about_body')}<h3>${t('data_sources')}</h3><ul class="sources">${t('sources_list')}</ul>`, () => set({ panel: null }));
}

export function modal(html: string, onClose?: () => void) {
  const m = $('#modal');
  m.hidden = false;
  m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true"><button class="dr-close" data-close aria-label="${t('close')}">${icon('close')}</button>${html}</div>`;
  const close = () => { m.hidden = true; m.innerHTML = ''; onClose?.(); };
  m.onclick = (e) => { if (e.target === m || (e.target as HTMLElement).closest('[data-close]')) close(); };
  return { el: m.firstElementChild as HTMLElement, close };
}

export function toast(msg: string) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}

// ---------------- story / present mode ----------------
interface Step { t: Key; b: Key; site?: string; cam?: { center: [number, number]; zoom: number; pitch: number; bearing: number }; patch: Partial<State>; panel?: Panel }
const STEPS: Step[] = [
  { t: 's1_t', b: 's1_b', cam: { center: [34.86, 32.35], zoom: 8.3, pitch: 0, bearing: 0 }, patch: { driver: 'scenario', scenario: 'ssp245', year: 2026, compare: false, surge: 'calm', longTerm: false, view: '2d' } },
  { t: 's2_t', b: 's2_b', site: 'hadera', patch: { year: 2026, view: '3d' } },
  { t: 's3_t', b: 's3_b', site: 'tel_aviv', patch: { year: 2050, scenario: 'ssp245', surge: 'tide' } },
  { t: 's4_t', b: 's4_b', site: 'akko', patch: { year: 2100, compare: true, surge: 'winter' } },
  { t: 's5_t', b: 's5_b', site: 'haifa_bay', patch: { compare: false, scenario: 'ssp245', year: 2100, surge: 'extreme' } },
  { t: 's6_t', b: 's6_b', site: 'jaffa', patch: { scenario: 'ssp585_low', q: 3, year: 2150, surge: 'calm' } },
  { t: 's7_t', b: 's7_b', site: 'zevulun', patch: { driver: 'budget', budget: Math.round(budgetForWarming(2.7)), longTerm: true, q: 2 } },
  { t: 's8_t', b: 's8_b', site: 'haifa_bay', patch: { driver: 'scenario', compare: true, longTerm: true }, panel: 'act' },
];
let stepI = -1;
function present(on: boolean) {
  document.body.classList.toggle('presenting', on);
  if (!on) { $('#story').hidden = true; stepI = -1; return; }
  set({ panel: null }); stopFlight();
  goStep(0);
}
function goStep(i: number) {
  if (i < 0 || i >= STEPS.length) { present(false); if (i >= STEPS.length) set({ panel: 'act' }); return; }
  stepI = i; const s = STEPS[i];
  const moveSite = s.site && s.site !== state.site;
  set({ ...s.patch, ...(moveSite ? { site: s.site } : {}) });
  setTimeout(() => {
    if (s.cam) M.map.flyTo({ ...s.cam, duration: 2600 });
    else if (s.site && !moveSite) M.flyToSite(site());
  }, 40);
  const st = $('#story'); st.hidden = false;
  st.innerHTML = `
    <div class="st-dots">${STEPS.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
    <h2>${t(s.t)}</h2><p>${t(s.b)}</p>
    <div class="st-level" id="stlevel"></div>
    <div class="btnrow"><button class="btn ghost" data-story="exit">${t('story_exit')}</button><span class="grow"></span>
      ${i > 0 ? `<button class="btn" data-story="prev">${t('story_prev')}</button>` : ''}
      <button class="btn primary" data-story="next">${t('story_next')}</button></div>`;
  setTimeout(() => { const el = $('#stlevel'); if (el) el.innerHTML = `${t('sea_level')}: <b>${$('#lvl')?.innerHTML ?? ''}</b>`; }, 50);
}

// ---------------- events ----------------
function bindGlobal() {
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest('button,[data-panel]') as HTMLElement | null;
    if (!el) return;
    const d = el.dataset;
    if (d.view) {
      const v = d.view as State['view'];
      if (v === 'photo') { photoHooks.onPhoto(); return; }
      if (state.view === 'photo') photoHooks.onLeavePhoto();
      set({ view: v });
      return;
    }
    if (d.panel !== undefined) { const p = (d.panel || null) as Panel; set({ panel: state.panel === p ? null : p }); return; }
    if (d.style) { set({ style: d.style as State['style'] }); return; }
    if (d.scen) { set({ scenario: d.scen as ScenarioId, driver: 'scenario' }); return; }
    if (d.q) { set({ q: Number(d.q) }); return; }
    if (d.driver) { set({ driver: d.driver as State['driver'], ...(d.driver === 'manual' ? { manual: Math.round(baseLevel() * 20) / 20, longTerm: false } : {}) }); return; }
    if (d.surge) { set({ surge: d.surge as State['surge'] }); return; }
    if (d.long) { set({ longTerm: d.long === '1' }); return; }
    if (d.budget) { set({ budget: Number(d.budget) }); return; }
    if (d.base) { set({ basemap: d.base as State['basemap'] }); $('#layerbox').querySelectorAll('[data-base]').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.base === d.base)); return; }
    if (d.site) { set({ site: d.site }); $('#places').hidden = true; return; }
    if (d.who) { act.who = d.who; act.people = WHO[d.who]; renderAct($('#drbody')); return; }
    if (d.transit) { act.transit = d.transit as Transit; el.parentElement!.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el)); updateAct(); return; }
    if (d.story) { if (d.story === 'next') goStep(stepI + 1); else if (d.story === 'prev') goStep(stepI - 1); else present(false); return; }
    switch (d.act) {
      case 'lang': set({ lang: state.lang === 'he' ? 'en' : 'he' }); break;
      case 'search': openSearch(); break;
      case 'places': openPlaces(); break;
      case 'layers': openLayers(); break;
      case 'about': set({ panel: 'about' }); break;
      case 'present': present(true); break;
      case 'tour':
        if (flightMode() === 'tour') stopFlight();
        else { if (state.view === '2d') { set({ view: '3d' }); M.enter3D(false); } startTour(sites, (s) => { if (s.id !== state.site) { state.site = s.id; renderPlacebar(); M.highlightMarker(); } }); }
        renderPlacebar(); break;
      case 'orbit':
        if (state.view === 'photo') { import('./photoreal').then((P) => P.photoOrbit(!P.photoOrbiting())); break; }
        if (flightMode() === 'orbit') stopFlight();
        else { if (state.view === '2d') { set({ view: '3d' }); M.enter3D(false); } startOrbit(site()); }
        break;
      case 'drone':
        if (flightMode() === 'drone') stopFlight();
        else { if (state.view === '2d') { set({ view: '3d' }); M.enter3D(false); } startDrone(); }
        break;
      case 'prev': case 'next': {
        const i = sites.findIndex((s) => s.id === state.site);
        const n = (i + (d.act === 'next' ? 1 : -1) + sites.length) % sites.length;
        set({ site: sites[n].id }); break;
      }
      case 'play': togglePlay(); break;
      case 'compare': set({ compare: !state.compare }); break;
      case 'collapse': dockCollapsed = !dockCollapsed; $('#dock').classList.toggle('collapsed', dockCollapsed); break;
      case 'share': navigator.clipboard?.writeText(location.href).then(() => toast(t('copied'))).catch(() => toast(location.href)); break;
      case 'shot': {
        const a = document.createElement('a');
        a.download = `save-the-coast-line-${state.site}-${state.year}.png`;
        a.href = M.map.getCanvas().toDataURL('image/png'); a.click(); break;
      }
    }
  });
  document.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.id === 'year') set({ year: Number(el.value) });
    else if (el.id === 'budget' || el.id === 'budget2') set({ budget: Number(el.value), driver: 'budget' });
    else if (el.id === 'manual') set({ manual: Number(el.value) });
    else if (el.id === 'bld') set({ buildings: el.checked });
    else if (el.dataset.a) { (act as any)[el.dataset.a] = Number(el.value); updateAct(); }
    else if (el.id === 'a-people') { act.people = Math.max(1, Number(el.value) || 1); act.who = ''; updateAct(); }
    else if (el.id === 'a-years') { act.years = Math.max(1, Number(el.value) || 1); updateAct(); }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).closest('input,textarea')) return;
    if (document.body.classList.contains('presenting')) {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goStep(stepI + 1); }
      if (e.key === 'ArrowLeft') goStep(stepI - 1);
      if (e.key === 'Escape') present(false);
    } else if (e.key === 'Escape') {
      for (const id of ['#searchbox', '#places', '#layerbox']) $(id).hidden = true;
      if (state.panel) set({ panel: null });
    }
  });
  // close popovers when clicking elsewhere
  document.addEventListener('pointerdown', (e) => {
    const tgt = e.target as HTMLElement;
    for (const [box, btn] of [['#searchbox', 'search'], ['#places', 'places'], ['#layerbox', 'layers']] as const) {
      if (!$(box).hidden && !tgt.closest(box) && !tgt.closest(`[data-act="${btn}"]`)) $(box).hidden = true;
    }
  });
}
