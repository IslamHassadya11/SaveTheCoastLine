# Save The Coast Line 🌊

**Sea level rise on Israel's Mediterranean coast - in 2D, 3D and photoreal.**
Made for our sustainability seminar: pick a future, watch the sea move inland over real
elevation data and real buildings, and see what our own choices change.

## What it does

- **Real flood map of the whole coast** (Zikim → Rosh HaNikra). Water only spreads where it can
  actually flow from the sea, using a 30 m bare-earth elevation model. Deeper water is darker.
- **2D map, 3D city and photoreal 3D.** The 3D view uses terrain and OpenStreetMap buildings;
  buildings the sea reaches turn red, with water drawn up to the waterline.
  Photoreal mode floods Google's textured 3D cities (needs your own free Google Maps API key).
- **Three ways to set the sea level**
  - *IPCC scenario*: SSP1-1.9 to SSP5-8.5, plus the low-confidence ice-sheet collapse tail, any year 2020-2150, with uncertainty range.
  - *CO₂ budget*: how much CO₂ the world still emits → peak warming → sea level in 2100 and over ~2,000 years.
  - *Set it yourself*: 0-20 m.
- **Storms on top** (high tide → extreme storm) and **"coast we can save"** (orange = floods only under SSP5-8.5, not under SSP1-1.9).
- **Fly over every place**: 23 coastal sites, fly-around orbit, a full-coast flight north → south, and a keyboard **drone mode** (W/A/S/D, Q/E, R/F, Shift).
- **Click anywhere** to get ground height, the sea level that reaches it and the first year it floods per scenario. **Search an address** ("is my home safe?").
- **What can we do?** calculator: commuting, flights, food and home electricity for me / our seminar / the university / Israel / the world → tonnes CO₂, Arctic sea ice kept, seawater kept out of the ocean, Israeli coast kept dry.
- **Data panel**: Hadera tide gauge (measured since 1995) joined to IPCC projections; Mauna Loa CO₂.
- **Present mode**: an 8-step story for the seminar (arrow keys to move).
- **Classic lab** (`/classic/`): the original Rising Tides page - animated Leaflet flood map, 3D coastal twin, action lab and seminar sites - kept as it was.
- **English / עברית** with right-to-left layout. Shareable links (the URL keeps the view).

## Run it

```bash
npm install
npm run dev
```

Open the printed local address. `npm run build` writes a static site to `dist/`.

## Publish on GitHub Pages

1. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Merge to `main` (or run the *Deploy to GitHub Pages* workflow by hand).
3. The site appears at https://islamhassadya11.github.io/SaveTheCoastLine/

## Photoreal mode

Create a Google Cloud API key with the **Map Tiles API** enabled
([guide](https://developers.google.com/maps/documentation/tile/get-api-key)) and paste it when you
open *Photoreal*. It is stored only in your browser. If the water looks slightly too high or low
against Google's model, use the *Water height fine-tune* slider.

## Data and method

| What | Source |
|---|---|
| Ground elevation | DeltaDTM v1.1 (Pronk et al. 2024, *Scientific Data*, CC-BY 4.0), 1 arc-second, EGM2008 |
| Sea level projections | IPCC AR6 regional projections at the Hadera tide gauge, incl. land motion (Garner et al. 2021, doi:10.5281/zenodo.6382554) |
| Measured sea level | PSMSL annual means, Hadera (station 1797) |
| CO₂ | NOAA GML, Mauna Loa |
| Emissions → warming | IPCC AR6 WG1 remaining carbon budgets (SPM Table SPM.2); TCRE 0.45 °C / 1000 GtCO₂ |
| 2,000-year commitment | IPCC AR6 WG1 SPM B.5.4 (2-3 m at 1.5 °C, 2-6 m at 2 °C, 19-22 m at 5 °C; in-between values interpolated) |
| Buildings & roads | © OpenStreetMap contributors via OpenFreeMap / OpenMapTiles |
| Emission factors | UK DESNZ 2024, Israel Electricity Authority, Scarborough et al. 2023 |

**Limits:** this is a "bathtub" model - no erosion, sea walls, drainage or future construction.
Elevation errors of about ±1 m matter most below +1 m, and storm levels are illustrative.
Good for exploring and discussing; not for planning a specific property.

### Rebuilding the data

The processed files live in `public/data/`. To rebuild them (Python 3 with
`numpy scipy scikit-image rasterio xarray netCDF4 mapbox-vector-tile`):

```bash
python3 scripts/build_dem.py <folder with DeltaDTM N31E034, N32E034, N32E035, N33E035 tiles>
python3 scripts/build_buildings.py <folder with OpenFreeMap z14 tiles 14_x_y.pbf>
python3 scripts/build_climate.py <AR6 ar6-regional-confidence/regional/confidence_output_files>
python3 scripts/build_geoid.py <us_nga_egm96_15.tif from cdn.proj.org>
```
