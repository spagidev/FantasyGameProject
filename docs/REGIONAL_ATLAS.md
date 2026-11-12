# Regional Lost Atlas · v0.4 plan

The player names an administrative country/region; the game selects a city/town within its actual OSM area. The player still names the city, never the country, to earn recognition. Slovakia and all eight kraje have explicit accented/unaccented aliases and ISO3166-2 codes. Arbitrary other administrative areas can be resolved by their local or English OSM names. Unknown/ambiguous areas and unavailable map services produce an explicit retryable error, never an out-of-area fallback.

Keep the original bundled chart as an explicit offline choice. New regional maps load only on a deliberate start action, with status/cancellation and no autocomplete traffic. Use Overpass for administrative-area resolution, city candidate membership, and one bounded city extract; do not use the public Nominatim service. Cache the upstream responses, identify the application, bound queries/payloads and serialize upstream requests. Provider endpoints are configurable. This owner-only Site has one player; scaling to a public product requires an appropriately provisioned data provider.

Compile city data into the same 17-site / 12-encounter graph contract: project real geometry, keep a connected foot-road component, select distributed route anchors, connect them by real-road shortest paths, and create terrain-based fantasy clues without real labels. Reject sparse maps. Seeded selection chooses among eligible cities inside the selected area. Record area, city aliases, source and generated map in the journal, so reload/export is self-contained and does not refetch or silently change the geography. Validate imported map geometry/topology and cap journal size. Preserve all old Atlas and First Crossing journals.

Move hosting to a small Worker that serves the same static game and a private map-generation endpoint. No map/tile provider is called during exploration or combat. All generated geography remains OSM-derived ODbL data; provide a geographic-data download beside attribution. The city answer lives in the local single-player journal and can be inspected by technically knowledgeable players, as with existing editable saves; this is not competitive anti-cheat.

Validate boundary aliases, membership queries, geography compilation, disconnected data handling, city-only guesses, reload/export, provider failures, aborts, and existing campaigns. Save checkpoints to GitHub; preserve Site identity and owner-only access when deploying.

Reference: https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL
