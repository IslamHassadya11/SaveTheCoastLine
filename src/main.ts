import './style.css';
import { loadAll } from './data';
import { FloodGrid } from './flood';
import { initScience } from './science';
import { initStats } from './stats';
import { state, set, readHash, subscribe } from './state';
import { createMap, map } from './map';
import * as M from './map';
import { initUI, modal, toast, onLevelChange } from './ui';
import { t } from './i18n';
import { stopFlight } from './fly';

// After a new version is published, a page that was open (or cached) still asks for the old,
// now-deleted file names. Reload once to pick up the new version instead of failing.
window.addEventListener('vite:preloadError', (e) => {
  try {
    if (sessionStorage.getItem('rt-reloaded')) return;
    sessionStorage.setItem('rt-reloaded', '1');
  } catch { /* storage blocked: still reload once per page load */ }
  e.preventDefault();
  location.reload();
});

async function boot() {
  readHash();
  document.documentElement.dir = state.lang === 'he' ? 'rtl' : 'ltr';
  const loader = document.getElementById('loader')!;
  loader.querySelector('p')!.textContent = t('loading');
  const d = await loadAll();
  initScience(d.climate);
  initStats(d.exposure);
  const grid = new FloodGrid(d.index, d.grid, d.retreat);
  if (import.meta.env.DEV) (window as any).__rt = { grid, get map() { return map; } };
  await createMap(document.getElementById('map')!, grid, d.sites, d.coastline);
  (await import('./hotspots')).initHotspots(grid);
  (await import('./research')).initDataCentres(grid, d.coastline);
  (await import('./poi')).initPois();
  M.applyMapLayers();
  initUI(d.sites, d.climate, grid, { onPhoto: () => openPhoto(grid, d.sites), onLeavePhoto: leavePhoto });
  const pad = () => {
    const dock = document.getElementById('dock')!.getBoundingClientRect();
    const drawer = document.getElementById('drawer')!;
    const dr = drawer.hidden ? 0 : drawer.getBoundingClientRect().width + 12;
    const rtl = document.documentElement.dir === 'rtl';
    const side = window.innerWidth > 760 ? dr : 0;
    const dockH = dock.height > 0 && !document.body.classList.contains('presenting') ? Math.max(0, window.innerHeight - dock.top) + 10 : 20;
    M.setPadding({ top: 120, bottom: dockH, left: rtl ? side : 0, right: rtl ? 0 : side });
  };
  new ResizeObserver(pad).observe(document.getElementById('dock')!);
  new MutationObserver(pad).observe(document.getElementById('drawer')!, { attributes: true, attributeFilter: ['hidden'] });
  pad();
  loader.classList.add('done');
  // started fine: allow one automatic reload again for the next stale-file problem
  setTimeout(() => { try { sessionStorage.removeItem('rt-reloaded'); } catch { /* ignore */ } }, 10000);
  setTimeout(() => loader.remove(), 700);

  // photoreal water follows the sea level, debounced (it re-encodes images)
  let deb = 0;
  onLevelChange(() => {
    if (state.view !== 'photo') return;
    clearTimeout(deb);
    deb = window.setTimeout(async () => (await import('./photoreal')).updatePhotoreal(), 180);
  });
  subscribe(async (s, ch) => {
    if (s.view === 'photo' && ch.has('site')) {
      const site = d.sites.find((x) => x.id === s.site)!;
      (await import('./photoreal')).photoFlyTo(site.lon, site.lat, site.bearing);
    }
  });
}

const KEY = 'rt-google-key';
function getKey() { try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; } }

function openPhoto(grid: FloodGrid, _sites: unknown) {
  const m = modal(`
    <h2>${t('photo_title')}</h2><p>${t('photo_body')}</p>
    <label class="field"><span>${t('photo_key')}</span><input id="gkey" type="password" autocomplete="off" value="${getKey().replace(/"/g, '')}" placeholder="AIza…"></label>
    <p class="small"><a href="https://developers.google.com/maps/documentation/tile/get-api-key" target="_blank" rel="noopener">${t('photo_help')} ↗</a></p>
    <div class="btnrow"><span class="grow"></span><button class="btn primary" id="gogo">${t('photo_go')}</button></div>
    <p class="err" id="gerr" hidden></p>`);
  const go = async () => {
    const key = (document.getElementById('gkey') as HTMLInputElement).value.trim();
    if (!key) return;
    try { localStorage.setItem(KEY, key); } catch { /* ignore */ }
    const btn = document.getElementById('gogo') as HTMLButtonElement;
    btn.disabled = true; btn.textContent = t('photo_loading');
    try {
      stopFlight();
      const P = await import('./photoreal');
      P.setPhotoGrid(grid);
      const el = document.getElementById('photo')!;
      el.hidden = false;
      await P.startPhotoreal(el, key, grid);
      document.body.classList.add('photo-on');
      set({ view: 'photo' });
      m.close();
      showDatum();
    } catch (e) {
      console.error(e);
      document.getElementById('photo')!.hidden = true;
      const err = document.getElementById('gerr'); if (err) { err.hidden = false; err.textContent = t('photo_error'); }
      btn.disabled = false; btn.textContent = t('photo_go');
    }
  };
  document.getElementById('gogo')!.addEventListener('click', go);
  document.getElementById('gkey')!.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}

function showDatum() {
  let box = document.getElementById('datum');
  if (!box) {
    box = document.createElement('div'); box.id = 'datum'; box.className = 'datum';
    document.body.appendChild(box);
  }
  box.innerHTML = `<label>${t('photo_datum')} <output id="dv">0.0 m</output></label><input type="range" id="datumr" min="-4" max="4" step="0.1" value="0">`;
  box.querySelector('input')!.addEventListener('input', async (e) => {
    const v = Number((e.target as HTMLInputElement).value);
    box!.querySelector('output')!.textContent = `${v >= 0 ? '+' : ''}${v.toFixed(1)} m`;
    (await import('./photoreal')).setDatum(v);
  });
}

function leavePhoto() {
  document.getElementById('photo')!.hidden = true;
  document.body.classList.remove('photo-on');
  document.getElementById('datum')?.remove();
  map.resize();
  toast(t('toast_photo_back'));
}

boot().catch((e) => {
  console.error(e);
  const l = document.getElementById('loader');
  if (l) l.querySelector('p')!.textContent = 'Could not load the data: ' + (e?.message ?? e);
});
