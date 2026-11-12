# The Lost Atlas · implementation plan

## Experience

Veyr is a layer of forgotten names laid over Earth. Water, street alignments, headlands and parks retain their real shape; the things built on them have become bell shrines, ash markets, glass gardens and Hollow strongholds. The pleasure is first discovering a fantasy landscape, then experiencing recognition. No modern labels, businesses, satellite imagery or coordinates appear before recognition.

The first playable chart is **The Saltbound Coast**: an actual OpenStreetMap extract of Monaco, presented without its true name. This is a complete, bounded adventure, not an unfinished global map. Its distinctive rock, two harbours, coast and gardens support the recognition puzzle. Future charts can use the same pack contract. The original First Crossing and its saves remain available.

## Research and decisions

- [OSM about](https://www.openstreetmap.org/about): geographic data and a rendered map are distinct. Use the data to draw our own world.
- [Mapy developer overview](https://developer.mapy.com/): Mapy uses OSM abroad, combines sources, and applies a consistent visual style. Borrow that architectural idea, not its artwork or map tiles.
- [Mapy REST documentation](https://developer.mapy.com/rest-api/): map display, routing and geocoding are separate services; use only the pieces this experience needs. No Mapy account/API key is needed for our bundled chart.
- [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/): the community tile servers prohibit bulk downloads/prefetch. Fog must not trigger downloads of hidden world tiles. Bundle vector data instead.
- [OSM copyright](https://www.openstreetmap.org/copyright): show attribution on the chart; redistribute the derived geographic database under ODbL, separately from original fiction and code.
- [GraphHopper source fixture](https://github.com/graphhopper/graphhopper/blob/master/core/files/monaco.osm.gz): a reproducible OSM extract is available over the environment's permitted GitHub route. Direct Overpass access is blocked here. Pin the source commit and hash. It is a historical 2012 snapshot, not present-day navigation data. No GraphHopper code is copied.

## Gameplay contract

1. Select Lost Atlas and a keeper. A seed continues to vary the established events/relic offers.
2. Start with a small circle of known land. Travel only along adjacent chart connections. Connections are curated between real locations and follow shortest paths on a walkable OSM street graph. They are fantasy travel links, not real-world navigation advice.
3. Each step reveals terrain and landmarks; explored land remains charted. Previously visited sites give no repeat rewards. No waiting, GPS permission, energy timers or tile requests.
4. Twelve ordered encounters retain the tested combat/reward/lesson economy and all three bells. Backtracking and geographic loops are free; the next encounter must actually be reached. Bell wards explain why a later encounter cannot be entered early. Side caches and a hidden garden reward exploration once.
5. Inspect nearby roads before walking. Hidden destinations are described only by direction and distance. No teleporting to later encounters through the old travel action.
6. A field journal accumulates concrete geographic clues. Players may propose a real place name once per bell stage. A wrong guess gives feedback, not damage; another bell permits another attempt. Correct recognition adds a one-time preparation bonus and charts the lost garden. Exploring without recognizing can still find it and win.
7. Explain immediate objectives, fog, completion and recognition in the UI. Include a compact map during encounters and return to the same location after resolving them.

## Architecture and delivery

- Build a checked-in compact geographic pack from the pinned OSM XML. Keep OSM IDs and geometry for provenance; strip real names from the runtime terrain. Publish the geographic JSON, source archive and licence/provenance notice. No runtime APIs or new dependencies.
- Custom SVG renderer: ink-coloured sea, ochre land, stippled groves, simplified ruins, fantasy icons, soft fog, gold keeper, compass, scale, zoom controls and accessible HTML road/site controls. SVG artwork is clipped to discovered geometry. Responsive map and readable mobile controls.
- Optional `atlas` state on existing format-2 runs; legacy runs omit it. Validate region/version, position, visited sites, guesses and progress on import. Do not change existing rulesets.
- Pure atlas functions for visibility, routing, transitions and clues; existing engine owns combat. Check connectivity, non-repeatable rewards, blocked actions, deterministic fog, recognition and save round trips.
- Deliver in checkpoints: this plan; geographic pack/engine; playable UI; validated release. Push every checkpoint to GitHub. No quota-reading tool is exposed, so do not invent a quota reading.
- Preserve the current Site identity and owner-only access. Deploy the complete tested release to the existing private URL.

## Follow-on scope

Additional curated regions, branching geography-specific encounters and more terrain mechanics come after testing this first chart. Global place search would need a build-time import pipeline, validation and a hosted vector provider or managed extracts. It is deliberately outside this release: arbitrary OSM topology must not be allowed to make a campaign unwinnable. Geographic recognition is optional knowledge, never a prerequisite or a permanent stat advantage across runs.
