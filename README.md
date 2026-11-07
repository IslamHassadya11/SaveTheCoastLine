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
- **Two ways to draw the sea**: *Real elevation* (only land below the water level floods) and *Illustration*, which also pushes the
  shoreline inland by erosion - 12 to 220 m per metre of rise depending on the beach slope, as in the original lab - so the change is
  visible even at realistic levels. Flooded land uses the sea's own colour with a white water's-edge line, and a dashed line marks today's coastline.
- **Classic view**: the original Rising Tides water drawn on the new map - the whole coastline sliding inland, rivers filling, waves rolling in, the amber 2026 coastline and the "+N m inland" tag - as a third option next to Real elevation and Illustration.
- **3D buildings sink as you drag the slider**: water climbs the walls, and a building disappears once it is fully under.
- **Storms on top** (high tide → extreme storm) and **Compare futures**: a swipe divider with net zero (SSP1-1.9) on the left and
  fossil fuels (SSP5-8.5) on the right, plus the land, buildings and roads saved.
- **Fly over every place**: 23 coastal sites, fly-around orbit, a full-coast flight north → south, and a keyboard **drone mode** (W/A/S/D, Q/E, R/F, Shift).
- **Fly the University of Haifa plane** (place bar → *Fly the plane*): a light aircraft with the university's name on its wings and fuselage, simple flight physics (thrust, drag, lift and stall, banked turns), a chase camera, and a live readout of whether the ground under you is flooded. Raise the sea mid-flight with the year slider or the `,` / `.` keys. Touch buttons on phones.
- **Danger & underwater-heritage markers**: places at special risk (Haifa Bay, the Krayot, Old Akko, Nahariya, Atlit, Orot Rabin, Netanya cliffs, Tel Aviv, Ashdod, Ashkelon) with live numbers, and sites the sea already drowned (Atlit Yam, the Athlit ram, Neve Yam, Dor, Caesarea, Akko harbour), each with links to sources and climate reports.
- **Research & SDGs** panel: how the project maps to UN SDGs 13, 14, 11, 6, 7 and 9, the research behind the numbers (with DOIs), and **data centres & the rising sea**: Israel's existing and planned data-centre locations (approximate, from public listings) rated with the app's elevation data, plus a **site checker** - click anywhere to see whether a new data centre there would be safe from the sea.
- **Layers panel** (layers icon in the top bar): switch groups on and off - base map (3D buildings, today's coastline, place names), sea-level risk (places at risk, already under the sea), infrastructure (data centres, power stations, desalination plants, ports), pollution (biggest polluters from the national pollutant register) and nature (forests and reserves at risk). Each marker's card shows its sea risk and sources.
- **The evidence on every card**: each place, site and data centre lists findings from studies, official reports and news with the numbers and a link - for example the State Comptroller's 2020 cliff audit (45 km unstable cliff; Ashkelon cliff back 22 m in 20 years), the 2024 national monitoring report (+15 cm since 1992), Hebrew University flood mapping (27 km² at +1.5 m), the Haifa Bay cancer cohort (2.19 million people) and the 2019 pollutant register.
- **Learn** tab: *Why the sea rises* (IPCC shares of the rise, a warm-the-ocean calculator, a melt-the-ice calculator that can show the result on the map), a *Timeline* of the coast from Atlit Yam (~6900 BCE) to 2150 with fly-to, a 10-question *Quiz* built on the app's sources, and *For the class* - discussion questions, activities and a CSV download of every place's exposure.
- **Click anywhere** to get ground height, the sea level that reaches it and the first year it floods per scenario. **Search an address** ("is my home safe?").
- **What can we do?** calculator: commuting, flights, food and home electricity for me / our seminar / the university / Israel / the world → tonnes CO₂, Arctic sea ice kept, seawater kept out of the ocean, Israeli coast kept dry.
- **Data panel**: Hadera tide gauge (measured since 1995) joined to IPCC projections; Mauna Loa CO₂.
- **Present mode**: an 8-step story for the seminar (arrow keys to move).
- **Classic lab** (`/classic/`): the original Rising Tides page - animated Leaflet flood map, 3D coastal twin, action lab and seminar sites - kept as it was, with an "Open the new app" button in its header.
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
