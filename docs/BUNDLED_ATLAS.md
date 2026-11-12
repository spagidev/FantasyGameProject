# A dependable map collection · v0.6

## Why

Live regional preparation depends on an external Overpass service. The private Site first rejected default-cache access; subsequent live requests reached the provider path but received non-success responses. Retrying the same service is not a dependable way to start an expedition. Worker logs now record the upstream HTTP status and provider hostname on rejection without logging request bodies or credentials.

## Collection and selection

Emberwake ships 16 historical Slovak city road charts, two in every kraj. Country/region selection still narrows the mystery: Slovakia selects among all 16; a kraj or its existing alias/ISO code selects only its two cities. A seed chooses deterministically. The setup index exposes region membership and counts, keeping the city hidden. The normal source label says this is a historical road snapshot; source/download details are separate from the fiction.

“Bundled maps” is the default. It loads a local application asset without `/api/atlas` or third-party map requests. “Live map” preserves worldwide region lookup and automatically uses a bundled chart **inside the requested area** if its provider request fails. Areas without bundled coverage show that limitation and never silently select a different country. Explicit cancellation never starts a fallback. “Original offline chart” preserves the original Saltbound Coast.

The collection is delivered with the app and the selected chart is embedded in autosaves/journals. This removes the dependency on a map provider; opening the private website still requires access to the game. It does not install a full offline copy of the website or require a service worker that caches private pages.

## Data and implementation

Road geometry is an OSM/Geofabrik-derived layer published in a 2022 GitHub GIS sample. The exact underlying OSM date is unknown. The 16 small city extracts and their complete compiled database are separately downloadable under ODbL. Original fictional landmarks, illustrations and game rules remain separate. The pack contains road geometry, not a complete modern map with buildings, water or terrain. See `public/atlas/NOTICE.md` for pinned sources and reproducible commands.

The compiler reuses the existing geographic pipeline and preserves real road shapes. Source-coordinate junctions form the graph; no straight artificial links are inserted to join disconnected roads. Each city supplies 17 encounter/resource sites and 24 connected paths. Journal format 2 is retained; validation accepts the additional explicit Geofabrik provenance and a null administrative area ID only for that source. All previous journals remain supported.

The 16 charts load together as a separate application chunk, leaving the opening bundle small. Saved expeditions retain their exact map even if later collections change. Add further cities by expanding the source database and regenerating the index/charts, with full-campaign and source validation before publication.

## Relation to Mapy.com

Mapy provides its own [tile service](https://developer.mapy.com/rest-api-mapy-cz/function/map-tiles/) and prepared [offline country/regional downloads](https://help.mapy.com/offline-maps/). Its [developer overview](https://developer.mapy.com/) describes applying its own styling to OSM data outside Czechia. Emberwake follows the same useful principle at a smaller scale: prepare the geographic game boards ahead of play and distribute them from the game's own host. A worldwide version should grow a periodically refreshed catalogue and ingestion pipeline, rather than make every new expedition depend on a public query service.

## Validation

59 unit/engine/service/storage checks pass, including full three-bell campaigns on all 16 shipped charts, valid topology and journal round-trips, coverage/alias/seed selection, provider-free setup, in-area fallback and cancellation. Both default-cache denial paths are covered. All 20 browser cases are validated: 19 passed in the full run; both bundled cases passed after the mobile header contrast correction. Browser coverage includes a blocked provider, city concealment/recognition and persistence, mobile coverage and fallback, existing campaigns and original journals. Production packaging verifies the shipped chart chunk and downloadable 16-chart ODbL database. Regenerating the charts from the pinned source produces identical files.
