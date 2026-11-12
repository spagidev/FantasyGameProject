# Saltbound Coast geographic database

© OpenStreetMap contributors. Geographic data is available under the Open Database License (ODbL) 1.0: https://opendatacommons.org/licenses/odbl/1-0/
Attribution and source information: https://www.openstreetmap.org/copyright

`saltbound.json` is an OSM-derived geographic database distributed under ODbL 1.0. `source.osm.gz` is the corresponding original extract. The JSON retains source way/node IDs, projected geometry, and curated shortest road connections. The original fictional names, encounters, writing, illustrations and game logic are separate from this geographic database.

Source mirror: https://github.com/graphhopper/graphhopper/blob/a1f15bac86c14457f31655c822e8ed4f018d2dc7/core/files/monaco.osm.gz
This is a historical June 2012 snapshot of Monaco. It is used as a fantasy game board; it is not current navigation data. Some features and pedestrian access have since changed. Routes are simplified game connections.

Reproduce with Python 3, without dependencies:
`python3 scripts/build-atlas.py public/atlas/source.osm.gz`

# Bundled Slovak roads · v0.6

The game includes **16 historical city road charts, two in each Slovak kraj**, distributed separately from the fiction and game logic under **ODbL 1.0**. They are small city-centre extracts, not maps of entire regions. They contain road geometry, with source way IDs and derived game routes. They do not include a complete water, building, park or elevation layer. Fantasy landmarks are fictional and are positioned on the real road graph.

- [Compiled geographic database](slovakia-charts.json.gz) (gzip JSON), also shipped as the lazily loaded `src/atlas/bundled-charts.json` game data.
- [Corresponding cropped source database](slovakia-source.json.gz) (gzip JSON), with pinned provenance, original OSM way IDs, place node IDs, projected-back WGS84 coordinates, and local graph vertex IDs. Shared coordinates form junctions; the derived graph vertex IDs are **not** original OSM node IDs. These are simplified game connections, not a pedestrian navigation product.
- Road source: GISAdamToth's [transport network sample database](https://github.com/GISAdamToth/characteristics_of_transport_network_toolbox/tree/f4610ed1dc823788f7fe7cbf1cd0a9074be00327/sample_data), `OSM_roads_slovakia`. Its [README](https://github.com/GISAdamToth/characteristics_of_transport_network_toolbox/blob/f4610ed1dc823788f7fe7cbf1cd0a9074be00327/README.md) identifies OpenStreetMap via Geofabrik and road classes 5111–5135. The repository snapshot is dated **28 April 2022**; the precise underlying OSM extract date is unknown and the roads may be older.
- Place names, OSM place node IDs and centres: drakh's [Slovak places database](https://github.com/drakh/slovakia-gps-data/tree/846fe1c3b1bac53dc1b7ba09f16ccbca7748e424/GeoJSON/epsg_4326), `cities_regions_districts_epsg_4326.geojson`, an OSM-derived historical database. Only the 16 selected place records are included. Administrative assignments are a fixed catalogue; bundled charts do not claim an OSM administrative area ID.
- Source repositories retrieved **12 November 2026**. These are historical snapshots, not current maps. Coverage and source dates are deliberately visible in the game.

Rebuild the shipped charts deterministically with `node scripts/build-bundled-atlas.mjs`. To re-extract the cropped source, check out the two pinned repository revisions above, install Python `fiona` and `pyproj`, and run `python3 scripts/extract-slovakia.py /path/to/transport-repository /path/to/places-repository`. Normal game builds use the checked-in charts and require no provider access or GIS tooling.
