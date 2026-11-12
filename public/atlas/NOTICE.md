# Saltbound Coast geographic database

© OpenStreetMap contributors. Geographic data is available under the Open Database License (ODbL) 1.0: https://opendatacommons.org/licenses/odbl/1-0/
Attribution and source information: https://www.openstreetmap.org/copyright

`saltbound.json` is an OSM-derived geographic database distributed under ODbL 1.0. `source.osm.gz` is the corresponding original extract. The JSON retains source way/node IDs, projected geometry, and curated shortest road connections. The original fictional names, encounters, writing, illustrations and game logic are separate from this geographic database.

Source mirror: https://github.com/graphhopper/graphhopper/blob/a1f15bac86c14457f31655c822e8ed4f018d2dc7/core/files/monaco.osm.gz
This is a historical June 2012 snapshot of Monaco. It is used as a fantasy game board; it is not current navigation data. Some features and pedestrian access have since changed. Routes are simplified game connections.

Reproduce with Python 3, without dependencies:
`python3 scripts/build-atlas.py public/atlas/source.osm.gz`
