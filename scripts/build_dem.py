"""
Build the coastal flood grid used by the app.

Input : DeltaDTM v1.1 tiles (Pronk et al. 2024, CC-BY 4.0), 1 arc-second, metres above EGM2008.
Output: public/data/flood/grid.bin.gz + index.json

For every cell we store
  E = ground elevation
  F = "fill level": the lowest sea level at which Mediterranean water can reach the cell
      (computed with morphological reconstruction, so inland basins below sea level that are
       not connected to the sea - e.g. the Jordan valley - stay dry).
A cell is flooded at sea level h when F < h, with depth h - E.

Usage: python3 scripts/build_dem.py <dir-with-DeltaDTM-tifs>
"""
import sys, os, json, gzip
import numpy as np, rasterio
from scipy import ndimage
from skimage.morphology import reconstruction

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'flood')
os.makedirs(OUT, exist_ok=True)

RES = 1 / 3600
LAT_S, LAT_N = 31.595, 33.095          # Zikim -> Rosh HaNikra
LON_W, LON_E = 34.40, 35.30
CHUNK = 512
FMAX = 22.0                             # keep chunks that flood below this level

rows = int(round((LAT_N - LAT_S) / RES)); cols = int(round((LON_E - LON_W) / RES))
elev = np.full((rows, cols), np.nan, np.float32)
for f in sorted(os.listdir(SRC)):
    if not f.endswith('.tif'): continue
    with rasterio.open(os.path.join(SRC, f)) as r:
        a = r.read(1).astype(np.float32); a[a == r.nodata] = np.nan
        t = r.transform
        # tile pixel (i,j) covers lon t.c + j*RES, lat t.f - i*RES
        for_lat = t.f; for_lon = t.c
        i0 = int(round((for_lat - LAT_N) / RES)); j0 = int(round((LON_W - for_lon) / RES))
        # overlap between tile rows [0,h) shifted by i0 and grid rows [0,rows)
        ti0, ti1 = max(0, i0), min(a.shape[0], i0 + rows)
        tj0, tj1 = max(0, j0), min(a.shape[1], j0 + cols)
        if ti0 >= ti1 or tj0 >= tj1: continue
        elev[ti0 - i0:ti1 - i0, tj0 - j0:tj1 - j0] = a[ti0:ti1, tj0:tj1]
        print('placed', f)

nan = np.isnan(elev)
lab, n = ndimage.label(nan)
west = set(np.unique(lab[:, 0])) - {0}
sea = np.isin(lab, list(west))
print('sea fraction', sea.mean())
# inland water bodies without elevation: borrow nearest land value
inland = nan & ~sea
if inland.any():
    idx = ndimage.distance_transform_edt(nan, return_distances=False, return_indices=True)
    elev[inland] = elev[idx[0][inland], idx[1][inland]]
elev[sea] = 0.0

seed = np.where(sea, 0.0, 100.0).astype(np.float64)
mask = np.where(sea, 0.0, elev).astype(np.float64)
cross = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], bool)
fill = reconstruction(seed, mask, method='erosion', footprint=cross).astype(np.float32)

def enc(v):  # decimetres with -1 m offset, 0..254
    return np.clip(np.round((v + 1.0) * 10), 0, 254).astype(np.uint8)

E = enc(elev); D = np.clip(np.round((fill - elev) * 10), 0, 254).astype(np.uint8)
E[sea] = 255; D[sea] = 0

chunks = []; blobs = []; off = 0
for ci in range(0, rows, CHUNK):
    for cj in range(0, cols, CHUNK):
        f = fill[ci:ci + CHUNK, cj:cj + CHUNK]; s = sea[ci:ci + CHUNK, cj:cj + CHUNK]
        if not ((~s) & (f < FMAX)).any(): continue
        h, w = f.shape
        e = np.full((CHUNK, CHUNK), 255, np.uint8); d = np.zeros((CHUNK, CHUNK), np.uint8)
        e[:h, :w] = E[ci:ci + h, cj:cj + w]; d[:h, :w] = D[ci:ci + h, cj:cj + w]
        blobs += [e.tobytes(), d.tobytes()]
        chunks.append(dict(row=ci, col=cj, n=LAT_N - ci * RES, s=LAT_N - (ci + CHUNK) * RES,
                           w=LON_W + cj * RES, e=LON_W + (cj + CHUNK) * RES, off=off))
        off += 2 * CHUNK * CHUNK

raw = b''.join(blobs)
with gzip.open(os.path.join(OUT, 'grid.bin.gz'), 'wb', compresslevel=9) as g:
    g.write(raw)
json.dump(dict(source='DeltaDTM v1.1 (Pronk et al. 2024, CC-BY 4.0), 1 arc-second, EGM2008',
               res=RES, chunk=CHUNK, encoding='E: (m+1)*10 uint8, 255=sea; D: (fill-E)*10 uint8',
               bounds=[LON_W, LAT_S, LON_E, LAT_N], chunks=chunks),
          open(os.path.join(OUT, 'index.json'), 'w'))
print('chunks', len(chunks), 'raw MB', len(raw) / 1e6,
      'gz MB', os.path.getsize(os.path.join(OUT, 'grid.bin.gz')) / 1e6)
# quick sanity: flooded land area at a few levels
lat = LAT_N - (np.arange(rows) + 0.5) * RES
cell_km2 = (RES * 111.32) ** 2 * np.cos(np.radians(lat))[:, None]
for h in [0.5, 1, 2, 5, 10]:
    m = (~sea) & (fill < h)
    print(f'h={h:>4} m  flooded land {float((cell_km2 * m).sum()):7.1f} km2')
