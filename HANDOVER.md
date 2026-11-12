# Emberwake · The Lost Atlas checkpoint (v0.3.0)

## Current task and authorization

The user requested research into OpenStreetMap and Mapy.com, a considered gameplay/implementation plan, and implementation of a real-world fantasy map with gradual discovery and useful geographic recognition. They asked for frequent GitHub checkpoints. This request authorized resuming development after the previous session's stop signal. The existing hosted game must remain owner-only. Do not publish cloud environment configuration.

No reliable quota-reading tool is exposed. Do not invent quota percentages. The earlier standing safe-stop preferences remain: save above 90% five-hour or 97% weekly usage if reliable telemetry becomes available, and obey any new user stop signal immediately.

## Implemented

Read `docs/LOST_ATLAS.md` for the research, design and initial plan. v0.3 adds **The Lost Atlas**, selectable above the keeper choices before beginning. The original First Crossing stays available; old runs do not acquire map rules automatically.

- The Saltbound Coast is a complete twelve-encounter campaign on a real, curated OSM region, with seventeen geographic sites and twenty-four connected roads. Three ordinary guardians free the well/kiln/lens; three bell guardians preserve the existing rewards, lessons and two endings.
- Fantasy cartography renders the real coast, streets, groves and ruined building footprints with original fantasy landmark identities. Persistent soft fog follows visited locations and roads. Whole-chart/keeper zoom, north indicator, scale, direction/distance road buttons, and keyboard-accessible landmark index are included.
- Movement is legal only between adjacent sites during the map phase. Later encounters are sealed and the next encounter must be physically reached. Movement/revisits never generate waylight income or repeat gifts. The existing engine handles actual encounters.
- Optional arena coins, flask spring and hidden Rose Hearth are single-use. The haven gives up to 12 health and +1 attack. A full flask inventory leaves the spring available for later.
- The field journal records geographic clues. One place-name attempt is allowed per bell stage; a wrong guess changes no stats. Correct recognition gives +2 attack once and charts the haven, without moving the player or collecting it. Recognition is optional.
- Saves remain format 2; the optional version-1 `atlas` field is validated on load/import. Atlas position, discovered roads, gifts and guesses round-trip with the portable journal. All previous v1/v2 compatibility tests remain.
- All map geometry is bundled. No live map/tile/geocoding requests, GPS permission, API key or gameplay backend is needed.

## Geographic data and licensing

The first chart's identity is a gameplay spoiler. Its provenance is intentionally available in source and licensing documentation: a historical June 2012 Monaco OSM extract mirrored by GraphHopper at commit `a1f15bac86c14457f31655c822e8ed4f018d2dc7`. No GraphHopper implementation was copied. Direct Overpass access was denied by the environment proxy, so a reproducible GitHub source was used.

The OSM-derived database, original compressed source and ODbL notice are under `public/atlas/`. Attribution is always visible below the game chart. Reproduce with:

```sh
python3 scripts/build-atlas.py public/atlas/source.osm.gz
```

This standard-library-only compiler projects geometry, strips real runtime labels, retains OSM IDs, finds the largest walkable connected component, snaps authored sites to it, and builds shortest-path geographic connections with duplicate links removed. The downloadable database and `src/game/atlas-geography.json` use identical bytes; Vite caches geography in a separate chunk. Source filenames are for attribution, not a promise of up-to-date navigation data.

## Repositories and hosting

- GitHub development checkout: `/workspace/FantasyGameProject`, remote `https://github.com/spagidev/FantasyGameProject.git`. Checkpoints were pushed to branch `work`; the completed release is also fast-forwarded to `main` after validation.
- Separate existing Sites checkout: `/workspace/sites/emberwake`. Preserve its `.openai/hosting.json` and source Git history when syncing game source. Do not create a new Site.
- Site project: `appgprj_6af57de7182c8191b7dba67329607be0`.
- URL: https://emberwake-last-light.fitpartridge2.chatgpt.site
- Access was verified as `custom`, current user owner, sole allowed user, no groups or external visitors. Publish with the private operation and retain that audience.
- Native Sites source credentials are short-lived. Keep tokens in session memory and send through hidden stdin only; never write credentials to a file, shell argument, Git config or output. The bundled workflow scripts were unavailable in this environment; ordinary authenticated Git and a deployment tar matching the pushed source were used.

## Validation and limits

- 44 unit/engine/storage tests passed, including connectivity for every site, duplicate neighbour rejection, invalid moves, encounter locks, no repeat gifts/income, recognition, malformed Atlas saves and full campaigns for all three keepers without recognition.
- All 13 existing browser checks passed, including complete campaigns, legacy journals, imports/exports, mobile combat and storage failures.
- New Atlas browser checks cover a full Warden campaign, real-road movement, fog/reload persistence, no external map requests, recognition, gifts, keyboard roads, mobile width and WCAG A/AA checks. Both new checks passed after the final fixes; together with the 13 existing checks, all 15 browser cases passed.
- Production TypeScript/Vite build passed. Browser snapshots are generated under ignored `test-results/`.
- The Sites preview relay timed out. The project's existing automated Playwright browser suite was used for browser validation. Native deployment success is the evidence for publication; do not claim an authenticated production gameplay test unless one is actually performed.
- This is one authored chart. It is not an arbitrary worldwide map importer or a full Heroes-style army/town simulation. Human playtesting is still needed for difficulty, enjoyment, fog radius and navigational clarity; automated winning paths do not establish those.

## Next useful work

1. Human playtest the next-encounter bearing, map visibility, optional detours and recognition clues. Keep geography optional and avoid exposing the true place name in normal unrevealed UI.
2. Add a second curated region with meaningful river crossings and more branching encounter choices, after testing the first chart.
3. Separate geography-independent topology contracts from terrain pack loading if the number of maps grows. Global imports require reliable extraction, licensing/provenance, connectivity validation and campaign placement; see the plan.
4. Preserve old journal formats and the original First Crossing. Do not add permanent stat grinding or runtime map-service dependencies casually.
