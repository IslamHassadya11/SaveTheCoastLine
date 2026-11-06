"""
Count buildings and road length that each sea level would reach, per coastal site.
Input : OpenFreeMap z14 vector tiles (OpenStreetMap data, ODbL) downloaded to <tiledir> as 14_x_y.pbf
Output: public/data/exposure.json  - histograms by fill level (0.1 m bins, 0..22 m) per site
"""
import sys, os, json, math, gzip, glob
import numpy as np, mapbox_vector_tile
sys.path.insert(0, os.path.dirname(__file__))
from flood_grid import Grid

TD = sys.argv[1]
g = Grid()
sites = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'sites.json')))
slat = np.array([s['lat'] for s in sites]); slon = np.array([s['lon'] for s in sites])
NB = 221  # bins of 0.1 m from 0 to 22 m
RT = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'retreat.json')))['points']
RT_LAT = np.array([p['lat'] for p in RT]); RT_F = np.array([p['m_per_m'] for p in RT], float)
def retreat(lat): return np.interp(lat, RT_LAT, RT_F)
def fill_illus(F, lon, lat):
    # illustration mode: also reached once erosion moves the shoreline past it
    r, c, ok = g.rc(lon, lat)
    R = np.where(ok, g.R[r, c], 5100.0)
    return np.minimum(F, R / retreat(np.asarray(lat)))
bld = np.zeros((len(sites), NB), np.int64); bld_area = np.zeros((len(sites), NB))
bld_i = np.zeros((len(sites), NB), np.int64); road_i = np.zeros((len(sites), NB)); land_i = np.zeros((len(sites), NB))
road = np.zeros((len(sites), NB)); rail = np.zeros((len(sites), NB))
land = np.zeros((len(sites), NB))
seen = set()
ROAD = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service'}

def nearest(lon, lat):
    d = (slat[None, :] - lat[:, None]) ** 2 + ((slon[None, :] - lon[:, None]) * math.cos(math.radians(32))) ** 2
    return d.argmin(1)

def tile_lonlat(x, y, z, px, py, ext):
    n = 2 ** z
    lon = (x + px / ext) / n * 360 - 180
    yy = y + 1 - py / ext   # mapbox_vector_tile flips y by default (origin bottom-left)
    lat = np.degrees(np.arctan(np.sinh(math.pi * (1 - 2 * yy / n))))
    return lon, lat

def fill_at(lon, lat):
    r, c, ok = g.rc(lon, lat)
    F = np.where(ok, g.F[r, c], 99.0); S = np.where(ok, g.sea[r, c], False)
    return np.where(S, 0.0, F)

for p in sorted(glob.glob(os.path.join(TD, '14_*.pbf'))):
    _, x, y = os.path.basename(p)[:-4].split('_'); x, y = int(x), int(y)
    d = open(p, 'rb').read()
    if len(d) < 20: continue
    try: d = gzip.decompress(d)
    except Exception: pass
    t = mapbox_vector_tile.decode(d)
    if 'building' in t:
        L = t['building']; ext = L['extent']
        for f in L['features']:
            # OpenFreeMap merges neighbouring buildings with equal attributes into one
            # MultiPolygon, so every polygon is counted as its own building.
            geom = f['geometry']; polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
            for poly in polys:
                ring = np.array(poly[0], float)
                if len(ring) < 3: continue
                lon, lat = tile_lonlat(x, y, 14, ring[:, 0], ring[:, 1], ext)
                # skip slivers clipped at the tile border (their centre is outside this tile)
                cx, cy = ring[:, 0].mean(), ring[:, 1].mean()
                if not (0 <= cx < ext and 0 <= cy < ext): continue
                F = fill_at(lon, lat).min()   # water enters at the lowest corner
                Fi = min(F, fill_illus(np.array([F]), np.array([lon.mean()]), np.array([lat.mean()]))[0])
                if Fi < 22:
                    si0 = nearest(np.array([lon.mean()]), np.array([lat.mean()]))[0]
                    bld_i[si0, int(min(NB - 1, max(0, math.ceil(Fi * 10))))] += 1
                if F >= 22: continue
                X = (lon - lon.mean()) * 111320 * math.cos(math.radians(lat.mean())); Y = (lat - lat.mean()) * 110540
                a = abs(np.dot(X, np.roll(Y, 1)) - np.dot(Y, np.roll(X, 1))) / 2
                if a < 12: continue           # sheds, kiosks
                si = nearest(np.array([lon.mean()]), np.array([lat.mean()]))[0]
                b = int(min(NB - 1, max(0, math.ceil(F * 10))))
                bld[si, b] += 1; bld_area[si, b] += a; seen.add((x, y, cx, cy))
    if 'transportation' in t:
        L = t['transportation']; ext = L['extent']
        for f in L['features']:
            cls = f['properties'].get('class')
            if cls not in ROAD and cls not in ('rail', 'transit'): continue
            geom = f['geometry']
            lines = geom['coordinates'] if geom['type'] == 'MultiLineString' else [geom['coordinates']] if geom['type'] == 'LineString' else []
            for ln in lines:
                a = np.array(ln, float)
                if len(a) < 2: continue
                lon, lat = tile_lonlat(x, y, 14, a[:, 0], a[:, 1], ext)
                mlon = (lon[1:] + lon[:-1]) / 2; mlat = (lat[1:] + lat[:-1]) / 2
                seg = np.hypot(np.diff(lon) * 111320 * math.cos(math.radians(32)), np.diff(lat) * 110540)
                Fi = fill_illus(fill_at(mlon, mlat), mlon, mlat); ki = Fi < 22
                if ki.any():
                    np.add.at(road_i if cls not in ('rail', 'transit') else road_i * 0, (nearest(mlon[ki], mlat[ki]), np.clip(np.ceil(Fi[ki] * 10), 0, NB - 1).astype(int)), seg[ki])
                F = fill_at(mlon, mlat); keep = F < 22
                if not keep.any(): continue
                si = nearest(mlon[keep], mlat[keep]); b = np.clip(np.ceil(F[keep] * 10), 0, NB - 1).astype(int)
                np.add.at(rail if cls in ('rail', 'transit') else road, (si, b), seg[keep])

# flooded land area per site from the grid itself (each land cell once)
rows, cols = g.F.shape
lat_r = g.N - (np.arange(rows) + .5) * g.res
mask = (~g.sea) & (g.F < 22) & (g.F >= -1)
rr, cc = np.nonzero(mask)
lat = lat_r[rr]; lon = g.W + (cc + .5) * g.res
area = (g.res * 111320) * (g.res * 110540) * np.cos(np.radians(lat))
si = np.concatenate([nearest(lon[i:i + 200000], lat[i:i + 200000]) for i in range(0, len(lon), 200000)])
b = np.clip(np.ceil(np.maximum(g.F[rr, cc], 0) * 10), 0, NB - 1).astype(int)
np.add.at(land, (si, b), area)
mask_i = (~g.sea) & (g.F >= -1)
Fi_all = np.minimum(g.F, g.R / retreat(g.N - (np.arange(rows) + .5) * g.res)[:, None])
mask_i &= Fi_all < 22
rr, cc = np.nonzero(mask_i)
lat = lat_r[rr]; lon = g.W + (cc + .5) * g.res
area = (g.res * 111320) * (g.res * 110540) * np.cos(np.radians(lat))
si = np.concatenate([nearest(lon[i:i + 200000], lat[i:i + 200000]) for i in range(0, len(lon), 200000)])
b = np.clip(np.ceil(np.maximum(Fi_all[rr, cc], 0) * 10), 0, NB - 1).astype(int)
np.add.at(land_i, (si, b), area)

out = dict(source='Buildings & roads: OpenStreetMap contributors (ODbL) via OpenFreeMap tiles; elevation: DeltaDTM v1.1',
           bin_m=0.1, note='bin k = reached when sea level >= k*0.1 m',
           sites={s['id']: dict(buildings=bld[i].tolist(), building_m2=np.round(bld_area[i]).astype(int).tolist(),
                                road_m=np.round(road[i]).astype(int).tolist(), rail_m=np.round(rail[i]).astype(int).tolist(),
                                land_m2=np.round(land[i]).astype(int).tolist(),
                                buildings_i=bld_i[i].tolist(), road_m_i=np.round(road_i[i]).astype(int).tolist(),
                                land_m2_i=np.round(land_i[i]).astype(int).tolist()) for i, s in enumerate(sites)})
json.dump(out, open(os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'exposure.json'), 'w'), separators=(',', ':'))
for lvl in [1, 2, 5, 10]:
    k = lvl * 10
    print(f'+{lvl} m: buildings {bld[:, :k + 1].sum():,}  road km {road[:, :k + 1].sum() / 1000:,.1f}  land km2 {land[:, :k + 1].sum() / 1e6:,.1f}')
print('total buildings seen', len(seen))
for lvl in [0.5, 1, 2, 5]:
    k = int(lvl * 10)
    print(f'illustration +{lvl} m: buildings {bld_i[:, :k + 1].sum():,}  road km {road_i[:, :k + 1].sum() / 1000:,.1f}  land km2 {land_i[:, :k + 1].sum() / 1e6:,.1f}')
