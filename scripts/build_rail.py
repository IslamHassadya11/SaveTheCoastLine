"""
Build the coastal railway route for the train ride: public/data/rail.json
Track geometry: OpenStreetMap railway lines from OpenFreeMap z13 vector tiles (ODbL).
Stations: OpenStreetMap (Nominatim). The route follows the real track between stations by
snapping points along each leg to the nearest mainline track vertex.
"""
import json, math, os, subprocess, gzip
import numpy as np, mapbox_vector_tile

STATIONS = [  # north -> south, coastal line; (en, he, lat, lon)
    ('Nahariya', 'נהריה', 33.00495, 35.09883), ('Akko', 'עכו', 32.92819, 35.08306),
    ('Kiryat Motzkin', 'קריית מוצקין', 32.83296, 35.06992), ('Haifa Center HaShmona', 'חיפה מרכז השמונה', 32.8223, 34.99736),
    ('Haifa Bat Galim', 'חיפה בת גלים', 32.83034, 34.98176), ('Haifa Hof HaCarmel', 'חיפה חוף הכרמל', 32.79351, 34.95746),
    ('Atlit', 'עתלית', 32.69276, 34.94022), ('Binyamina', 'בנימינה', 32.51455, 34.94963),
    ('Hadera West', 'חדרה מערב', 32.43838, 34.89934), ('Netanya', 'נתניה', 32.31995, 34.86933),
    ('Herzliya', 'הרצליה', 32.16324, 34.81834), ('Tel Aviv University', 'תל אביב אוניברסיטה', 32.10371, 34.80461),
    ('Tel Aviv HaShalom', 'תל אביב השלום', 32.07356, 34.79316), ('Tel Aviv HaHagana', 'תל אביב ההגנה', 32.05415, 34.7848),
    ('Bat Yam Yoseftal', 'בת ים יוספטל', 32.01461, 34.76198), ('Yavne West', 'יבנה מערב', 31.89118, 34.73122),
    ('Ashdod Ad Halom', 'אשדוד עד הלום', 31.77394, 34.66624), ('Ashkelon', 'אשקלון', 31.67593, 34.60449),
]
TILES = 'https://tiles.openfreemap.org/planet/20261101_080013_pt/13/{x}/{y}.pbf'
CACHE = os.path.join(os.path.dirname(__file__), '..', '.cache', 'rail'); os.makedirs(CACHE, exist_ok=True)
Z = 13; N = 2 ** Z
def tile_of(lon, lat): return int((lon + 180) / 360 * N), int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * N)
def to_ll(x, y, px, py, ext):
    lon = (x + px / ext) / N * 360 - 180
    yy = y + 1 - py / ext
    return lon, math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * yy / N))))

# tiles along each leg (corridor of +-1 tile)
need = set()
for (a, b) in zip(STATIONS, STATIONS[1:]):
    for t in np.linspace(0, 1, 40):
        lat = a[2] + (b[2] - a[2]) * t; lon = a[3] + (b[3] - a[3]) * t
        x, y = tile_of(lon, lat)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1): need.add((x + dx, y + dy))
pts = []
for (x, y) in sorted(need):
    f = os.path.join(CACHE, f'{x}_{y}.pbf')
    if not os.path.exists(f):
        subprocess.run(['curl', '-s', '-m', '30', '-o', f, TILES.format(x=x, y=y)], check=False)
    d = open(f, 'rb').read()
    if len(d) < 20: continue
    try: d = gzip.decompress(d)
    except Exception: pass
    L = mapbox_vector_tile.decode(d).get('transportation')
    if not L: continue
    for ft in L['features']:
        p = ft['properties']
        if p.get('class') != 'rail' or p.get('service') or p.get('subclass') not in (None, 'rail'): continue
        g = ft['geometry']
        lines = g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']] if g['type'] == 'LineString' else []
        for ln in lines:
            for px, py in ln: pts.append(to_ll(x, y, px, py, L['extent']))
pts = np.array(pts)
print('tiles', len(need), 'track vertices', len(pts))
k = math.cos(math.radians(32.4)) * 111320
P = np.c_[pts[:, 0] * k, pts[:, 1] * 110540]

route = []; stops = []
for i, (a, b) in enumerate(zip(STATIONS, STATIONS[1:])):
    A = np.array([a[3] * k, a[2] * 110540]); B = np.array([b[3] * k, b[2] * 110540])
    n = max(2, int(np.linalg.norm(B - A) / 120))
    if i == 0: stops.append(0)
    for t in np.linspace(0, 1, n)[(0 if i == 0 else 1):]:
        q = A + (B - A) * t
        d = np.hypot(*(P - q).T); j = d.argmin()
        route.append(tuple(pts[j]) if d[j] < 900 else (q[0] / k, q[1] / 110540))
    stops.append(len(route) - 1)
# drop repeats and back-steps, then a light smoothing
clean = [route[0]]; idx = {0: 0}
for i, r in enumerate(route[1:], 1):
    if abs(r[0] - clean[-1][0]) + abs(r[1] - clean[-1][1]) > 1e-6: clean.append(r)
    idx[i] = len(clean) - 1
R = np.array(clean)
S = R.copy()
for _ in range(2): S[1:-1] = (S[:-2] + 2 * S[1:-1] + S[2:]) / 4
stations = []
for (en, he, lat, lon), si in zip(STATIONS, stops):
    stations.append(dict(en=en, he=he, lat=lat, lon=lon, i=idx[si]))
for s in stations: S[s['i']] = (s['lon'], s['lat'])
L = np.hypot(np.diff(S[:, 0]) * k, np.diff(S[:, 1]) * 110540).sum()
out = dict(source='Track: OpenStreetMap contributors (ODbL) via OpenFreeMap; stations: OpenStreetMap (Nominatim)',
           path=[[round(x, 5), round(y, 5)] for x, y in S], stations=stations)
json.dump(out, open(os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'rail.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('route points', len(S), 'length km', round(L / 1000, 1))
