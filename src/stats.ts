// What the sea reaches at a given level, from the pre-computed exposure histograms.
import type { Exposure } from './data';

type Kind = 'buildings' | 'land_m2' | 'road_m' | 'rail_m' | 'building_m2' | 'buildings_i' | 'road_m_i' | 'land_m2_i';
const KINDS: Kind[] = ['buildings', 'land_m2', 'road_m', 'rail_m', 'building_m2', 'buildings_i', 'road_m_i', 'land_m2_i'];
const prefix: Record<string, Record<Kind, Float64Array>> = {};
let bin = 0.1;

export function initStats(ex: Exposure) {
  bin = ex.bin_m;
  const total: Record<Kind, Float64Array> = {} as any;
  for (const k of KINDS) total[k] = new Float64Array(ex.sites[Object.keys(ex.sites)[0]][k].length);
  for (const [id, s] of Object.entries(ex.sites)) {
    prefix[id] = {} as any;
    for (const k of KINDS) {
      const arr = s[k], p = new Float64Array(arr.length);
      let acc = 0;
      for (let i = 0; i < arr.length; i++) { acc += arr[i]; p[i] = acc; total[k][i] += arr[i]; }
      prefix[id][k] = p;
    }
  }
  prefix.__all = {} as any;
  for (const k of KINDS) {
    const p = new Float64Array(total[k].length); let acc = 0;
    for (let i = 0; i < p.length; i++) { acc += total[k][i]; p[i] = acc; }
    prefix.__all[k] = p;
  }
}

/** Amount reached at sea level `level` (m). site = id or '__all'. Linear between bins.
 *  In illustration mode the erosion variants (…_i) are used for buildings, land and roads. */
export function reached(site: string, kind: Kind, level: number, illus = false): number {
  if (illus && (kind === 'buildings' || kind === 'land_m2' || kind === 'road_m')) kind = (kind + '_i') as Kind;
  const p = prefix[site]?.[kind]; if (!p || level <= 0) return 0;
  const x = level / bin, i = Math.floor(x);
  if (i >= p.length - 1) return p[p.length - 1];
  return p[i] + (p[i + 1] - p[i]) * (x - i);
}

/** Israeli land (m2) that one more metre of sea floods around level `l` (for marginal calculations). */
export function landPerMetre(l: number): number {
  const a = reached('__all', 'land_m2', Math.max(0, l - 1)), b = reached('__all', 'land_m2', l + 1);
  return (b - a) / 2;
}
