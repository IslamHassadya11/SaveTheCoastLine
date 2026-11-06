"""Add EGM96 geoid undulation (m) to each flood chunk and site, so the photoreal (ellipsoidal)
3D mode can place the water surface at mean sea level. Usage: build_geoid.py <us_nga_egm96_15.tif>"""
import sys, os, json, rasterio
D = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
r = rasterio.open(sys.argv[1]); band = r.read(1)
def N(lon, lat):
    row, col = r.index(lon, lat); return round(float(band[row, col]), 2)
idx = json.load(open(os.path.join(D, 'flood', 'index.json')))
for c in idx['chunks']: c['geoid'] = N((c['w'] + c['e']) / 2, (c['n'] + c['s']) / 2)
json.dump(idx, open(os.path.join(D, 'flood', 'index.json'), 'w'))
sites = json.load(open(os.path.join(D, 'sites.json')))
for s in sites: s['geoid'] = N(s['lon'], s['lat'])
json.dump(sites, open(os.path.join(D, 'sites.json'), 'w'), ensure_ascii=False, indent=1)
print([ (s['id'], s['geoid']) for s in sites][:: 5])
