// Which map layers are switched on (kept per browser).
const KEY = 'rt-layers';
export const visible: Record<string, boolean> = {
  pins: true, coast: true, risk: true, sea: true, dc: true,
  emitters: true, power: false, desal: false, ports: false, nature: true,
};
try { Object.assign(visible, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* storage blocked */ }
export function saveVisible() { try { localStorage.setItem(KEY, JSON.stringify(visible)); } catch { /* ignore */ } }
