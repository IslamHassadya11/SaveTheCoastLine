"""
Extract the climate data the app needs into public/data/climate.json

* IPCC AR6 regional sea-level projections (Garner et al. 2021, Fox-Kemper et al. 2021),
  medium confidence SSPs + warming levels, plus the low-confidence SSP5-8.5 (ice-sheet
  instability) tail, at Israel's PSMSL tide gauges. Includes vertical land motion.
  Relative to the 1995-2014 mean.  Source: doi:10.5281/zenodo.6382554
* PSMSL annual mean sea level at the Hadera tide gauge (RLR), re-referenced to 1995-2014.
* NOAA Mauna Loa monthly CO2.
Usage: python3 scripts/build_climate.py <ar6 confidence_output_files dir>
"""
import sys, os, json, subprocess, io
import numpy as np, xarray as xr
AR6 = sys.argv[1]
GAUGES = {1797: 'Hadera'}   # the only Israeli gauge in the AR6 location list; used for the whole coast
Q = [0.05, 0.17, 0.5, 0.83, 0.95]
RUNS = {'ssp119': 'medium_confidence/ssp119/total_ssp119_medium_confidence_values.nc',
        'ssp126': 'medium_confidence/ssp126/total_ssp126_medium_confidence_values.nc',
        'ssp245': 'medium_confidence/ssp245/total_ssp245_medium_confidence_values.nc',
        'ssp370': 'medium_confidence/ssp370/total_ssp370_medium_confidence_values.nc',
        'ssp585': 'medium_confidence/ssp585/total_ssp585_medium_confidence_values.nc',
        'ssp585_low': 'low_confidence/ssp585/total_ssp585_low_confidence_values.nc'}
for w in ['1.5', '2.0', '3.0', '4.0', '5.0']:
    RUNS['gwl' + w] = f'medium_confidence/tlim{w}win0.25/total_tlim{w}win0.25_medium_confidence_values.nc'

proj = {}; years = None
for k, f in RUNS.items():
    p = os.path.join(AR6, f)
    if not os.path.exists(p): print('missing', k); continue
    d = xr.open_dataset(p)
    locs = d.locations.values
    proj[k] = {}
    for gid in GAUGES:
        i = int(np.where(locs == gid)[0][0])
        v = d.sea_level_change.isel(locations=i).sel(quantiles=Q, method='nearest').values / 1000.0
        proj[k][str(gid)] = np.round(v, 3).tolist()   # [quantile][year] in metres
    years = d.years.values.tolist(); print('ok', k)

def curl(u): return subprocess.run(['curl', '-s', '-m', '60', u], capture_output=True, check=True).stdout.decode()

gauge = {}
for gid in [1797]:
    rows = [l.split(';') for l in curl(f'https://psmsl.org/data/obtaining/rlr.annual.data/{gid}.rlrdata').splitlines() if l.strip()]
    yr = np.array([int(r[0]) for r in rows]); mm = np.array([int(r[1]) for r in rows]); ok = mm > -99999
    yr, mm = yr[ok], mm[ok].astype(float)
    ref = mm[(yr >= 1995) & (yr <= 2014)].mean()
    trend = np.polyfit(yr, mm, 1)[0]
    gauge[str(gid)] = dict(name=GAUGES[gid], years=yr.tolist(), m=np.round((mm - ref) / 1000, 3).tolist(),
                           trend_mm_yr=round(float(trend), 2))
    print('gauge', gid, yr[0], yr[-1], 'trend mm/yr', round(trend, 2))

co2 = [l.split(',') for l in curl('https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.csv').splitlines() if l and l[0].isdigit()]
co2y = {}
for r in co2: co2y.setdefault(int(r[0]), []).append(float(r[3]))
annual = {y: round(sum(v) / len(v), 2) for y, v in co2y.items() if len(v) == 12}
last = co2[-1]
out = dict(
    projections=dict(source='IPCC AR6 sea level projections, regional, incl. vertical land motion (Garner et al. 2021; Fox-Kemper et al. 2021). doi:10.5281/zenodo.6382554',
                     baseline='1995-2014', quantiles=Q, years=years, gauges=GAUGES, data=proj),
    tide_gauge=dict(source='PSMSL Revised Local Reference annual means (psmsl.org)', data=gauge),
    co2=dict(source='NOAA GML Mauna Loa monthly mean CO2 (gml.noaa.gov)', annual=annual,
             latest=dict(year=int(last[0]), month=int(last[1]), ppm=float(last[3]))))
json.dump(out, open(os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'climate.json'), 'w'), separators=(',', ':'))
print('co2 latest', out['co2']['latest'])
