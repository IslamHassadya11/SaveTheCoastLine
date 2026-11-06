// Loads the pre-built data in public/data (see scripts/).
const BASE = import.meta.env.BASE_URL + 'data/';

export interface Site {
  id: string; lat: number; lon: number; zoom: number; bearing: number;
  en: string; he: string; tag_en: string; tag_he: string; gauge: number; geoid: number;
}
export interface Chunk { row: number; col: number; n: number; s: number; w: number; e: number; off: number; geoid: number }
export interface FloodIndex { res: number; chunk: number; bounds: [number, number, number, number]; chunks: Chunk[]; source: string }
export interface Climate {
  projections: { years: number[]; quantiles: number[]; data: Record<string, Record<string, number[][]>>; source: string };
  tide_gauge: { source: string; data: Record<string, { name: string; years: number[]; m: number[]; trend_mm_yr: number }> };
  co2: { source: string; annual: Record<string, number>; latest: { year: number; month: number; ppm: number } };
}
export interface Exposure {
  bin_m: number;
  sites: Record<string, { buildings: number[]; building_m2: number[]; road_m: number[]; rail_m: number[]; land_m2: number[] }>;
}

async function json<T>(name: string): Promise<T> {
  const r = await fetch(BASE + name);
  if (!r.ok) throw new Error(`Could not load ${name}`);
  return r.json();
}

async function gunzip(name: string): Promise<Uint8Array> {
  const r = await fetch(BASE + name);
  if (!r.ok || !r.body) throw new Error(`Could not load ${name}`);
  // Some servers already decompress .gz; detect the gzip magic number first.
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf[0] !== 0x1f || buf[1] !== 0x8b) return buf;
  const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(ds).arrayBuffer());
}

export async function loadAll() {
  const [sites, index, climate, exposure, grid] = await Promise.all([
    json<Site[]>('sites.json'),
    json<FloodIndex>('flood/index.json'),
    json<Climate>('climate.json'),
    json<Exposure>('exposure.json'),
    gunzip('flood/grid.bin.gz'),
  ]);
  return { sites, index, climate, exposure, grid };
}
