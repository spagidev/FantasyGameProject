# Emberwake · Regional Atlas checkpoint (v0.4.0)

## Latest user request

The user asked to name a country or administrative region before starting, with an unknown city inside it still requiring recognition. They prioritized **Slovakia and all eight kraje**, with eventual worldwide coverage. This continues the earlier authorization to implement, save GitHub checkpoints, and publish to the existing owner-only Site. Do not publish cloud environment configuration. No reliable quota telemetry is exposed; do not invent readings and obey any user stop signal.

## Implemented in v0.4

- Lost Atlas defaults to country/region setup with Slovakia filled in; all eight kraje are clickable and accept accented/unaccented aliases and ISO3166-2 codes. Original offline chart is an explicit alternative.
- The private `/api/atlas` Worker resolves OSM administrative areas, requests city/town nodes **inside that area**, then uses the seed to select candidates. Generic local/English names and ISO codes use literal, escaped matching; unknown or ambiguous areas return errors. No out-of-area fallback.
- A bounded city extract is compiled into real terrain and a connected 17-site / 24-road graph. Sparse/disconnected or unsupported complex coastlines are rejected. The service tries at most two city extracts per request.
- The chosen region is public, the city hidden in normal UI until correctly guessed. Only city aliases qualify for recognition. Terrain-based clues replace the original coast-specific clues on generated charts.
- Generated geometry and provenance travel in the format-2 save/journal; import cap is 2 MB. Old First Crossing and v0.3 Atlas saves are still accepted. No provider requests during exploration, combat or reload. Geography is immutable and shared during combat transitions.
- Loading, cancellation, errors and source selection preserve the current save. Request abort/timeouts are handled. Mobile and keyboard setup are included.
- Hosting now uses `dist/server/index.js`: a standalone Cloudflare Worker embeds and serves the same game assets and map API. **Omit `static`** in the existing Site manifest. `scripts/build-worker.mjs` verifies HTML, JavaScript and API routing after each production build.
- Provider: public Overpass by default, configurable via production `OVERPASS_URL`. No public Nominatim, live tile service, map account/API key or GPS. Queries are user-triggered, serialized per isolate, identified, bounded and cached; in-memory cache is bounded and large extracts use the edge cache. This remains one private player; public scaling requires provisioned infrastructure.

## Validation and limits

53 unit/engine/service/storage tests passed, including all eight region aliases, area-membership queries, caching, source errors, generated topology, city-only recognition, journal round-trips and full campaigns. Browser cases cover all original campaigns plus regional setup, hidden city, reload/export, provider errors, cancellation and mobile accessibility; all 17 browser cases passed (14 unchanged cases plus the three affected cases rerun after fixes).

The Sites preview relay still times out. Existing Playwright tests exercise the app; new service/UI integration tests use controlled OSM fixtures. The managed environment blocks live Overpass access, so live regional map generation is not established by these fixture tests. Production deployment success is verified separately. Do not claim every city worldwide works. Human Slovak playtesting is the next useful check.

## Locations and publishing

Development: `/workspace/FantasyGameProject`, GitHub `https://github.com/spagidev/FantasyGameProject.git`, branch `work`; checkpoint commits are pushed throughout, final validated release also fast-forwards `main`.

Existing Sites checkout: `/workspace/sites/emberwake`; preserve its source history and `.openai/hosting.json`. Project ID: `appgprj_6af57de7182c8191b7dba67329607be0`. URL: https://emberwake-last-light.fitpartridge2.chatgpt.site

Access was verified as custom, owner-only, sole allowed user, no groups/external viewers. Use the private save/deploy operation. Never recreate the Site or widen access to deploy it. Source credentials expire quickly: keep them in session memory, pass through hidden stdin only, never write tokens to files or command arguments. Bundled Sites workflow helpers are unavailable in this environment; ordinary authenticated Git and an archive of the matching Worker build are used. Source preparation and deployment metadata are recorded outside the source checkout in `/workspace/sites/emberwake-deployment.json`.

## Files and next work

- `docs/REGIONAL_ATLAS.md`: feature plan. `docs/LOST_ATLAS.md`: original OSM/Mapy research and fantasy exploration design.
- `src/atlas/regions.ts`: aliases and boundary query. `worker/atlas-service.ts`: provider/cache and candidate selection. `src/atlas/compile.ts`, `coast.ts`: connected geometry compiler. `types.ts`: map import validation.
- `src/game/atlas.ts`: geography-independent exploration with legacy bundled chart support. `src/components/AtlasSetup.tsx`: region choice. `Atlas.tsx`: fog/map and recognition.
- `public/atlas/`: original pinned June 2012 Monaco OSM source, ODbL notice and database. Generated charts provide their own ODbL geographic data download and provenance. Do not expose true city names in normal unrevealed UI.
- Next: real Slovak playtests across the eight kraje; improve water multipolygons/coast complexity, city selection distribution and region disambiguation; provision a map source before public/global scaling. Preserve both old journal formats and original campaign rules. Do not add permanent stat grinding or timers.
