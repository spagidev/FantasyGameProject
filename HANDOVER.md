# Emberwake · The Living Map checkpoint (v0.8.0)

## Round two (v0.8)

Plan: `docs/ROUND2_PLAN.md`. Inspiration only from Heroes III (days, movement, things on the map, dawn income) and OpenStreetMap/Mapy.com (planner, blazes, real units).

- `src/game/atlas.ts`: `day`/`oil`/`range`/`finds` on `AtlasState` (absent on older charts), `dayRange`, `atlasFinds`, `atlasRoute`, actions `atlas-walk` and `atlas-camp`. `makeEnemy(node, ruleset, dusk, nights)`; `nightsOf(run)`.
- `src/components/Atlas.tsx`: day and oil meter, planner, blazes, finds, pictogram pins. `Chronicle.tsx`: Atlas passport tab (`meta.cities`).
- `src/artwork.ts` globs `src/art/{foes,relics,sites,scenes}/*.webp`; components `EnemyPortrait`, `RelicIcon`, `SiteIcon`, `SceneArt` fall back when a file is absent. All 81 illustrations from `docs/ART_BRIEF.md` were delivered (PR #3, 1.1 MB, provenance in `src/art/NOTICE.md`) and checked in every screen at desktop and phone width.
- Combat: chips are buttons that explain themselves; `effectiveHit` feeds action titles; victory beat on the reward screen.
- Validation: 96 unit tests and 22 Chromium tests pass; strict build and Worker packaging pass. Direct Atlas runs take 4–6 days on the charts sampled.

---

# Earlier checkpoint · The Long Night (v0.7.0)

## Latest user request

“Produce a plan on how to make this game more logical, playable and addictive, then gradually implement it.” The plan and the measured diagnosis of v0.6 are in `docs/IMPROVEMENT_PLAN.md`; all four phases are implemented on branch `claude/game-improvement-plan-quwmax`.

## Implemented in v0.7

- **Ruleset 3** in `src/game/engine.ts` (`combat3`, `hit3`, `wear`, `drawRelics`, seeded `kindAt`/`foeAt`), content in `src/game/bestiary.ts` and `src/game/data.ts`. New runs default to it; `newRun(keeper, seed, atlas, { ruleset, dusk, pool, daily })`. Use `nodeOf(run)` for a run's own node; bare `nodeAt` defaults to the classic layout.
- **Legacy preserved**: rulesets 1–2 run through `legacyCombat`/`legacyEnemy` unchanged; `engine.test.ts` and `strategy.test.ts` pin ruleset 2. Save format stays version 2; ruleset-3 runs carry extra validated fields. `profile.meta` (records) is sanitised, never a reason to reject a journal.
- **Interface**: `src/components/Combat.tsx` (duel board, previews from `transition`, floaters, coaching), `Night.tsx` (Dusk picker, score card), `Chronicle.tsx` (codex tabs), `src/sound.ts` (switch in the footer), styles in `src/nightfall.css`. The old combat rules in `styles.css` are now unused.
- **Balance**: scripted players over 60 seeds per keeper at Dusk 0 — strike-only 0%, simple heuristic (guard heavy blows, skill when affordable) 68/30/55% for Warden/Seer/Wayfarer, bounded search 100%. At Dusk 8 the search player wins 14 of 15 recorded runs. These are simulations, not human playtests.
- `playwright.config.ts` also accepts the Chromium at `/opt/pw-browsers/chromium`.

## Validation

92 unit tests, 21 Chromium tests (full campaigns for three keepers and the Atlas, accessibility on every new screen, mobile), strict build, Worker packaging and the balance matrix pass.

## Known limits

- New enemies reuse four portraits with hue tints.
- The Seer is the hardest keeper for a simple player (30%).
- Atlas walking is still free; Atlas runs use fixed encounter kinds.
- The Strike/skill labels show base damage; the result line under them is the exact figure.

---

# Earlier checkpoint · Bundled Slovak maps (v0.6.0)

## Latest user request

Live regional preparation failed first on the private Worker's denied default cache, then on non-success Overpass responses. The user asked for roughly 15 downloaded real maps that work without the provider, and asked how Mapy.com handles this. Authorization continues to implement, save GitHub checkpoints and publish to the existing owner-only Site. The 16-chart Slovak collection below is the completed alternative. Mapy explanation and design references are in `docs/BUNDLED_ATLAS.md`.

## Implemented in v0.6

- **16 real historical Slovak city road charts, two per kraj**, compiled through the existing connected-road pipeline. The city remains hidden until recognition; country/kraj/aliases/ISO codes constrain selection and show available counts. Seeds choose deterministically.
- **Bundled maps** is the default and makes no map-provider request. The collection is a separate local application chunk. **Live map** retains the regional API and falls back inside the chosen area if the provider fails and there is bundled coverage. Other countries show a clear coverage limit. Cancellation never triggers fallback. Original offline Saltbound Coast is retained.
- Road source is an OSM/Geofabrik-derived historical dataset in GISAdamToth's transport-network sample repository at `f4610ed1dc823788f7fe7cbf1cd0a9074be00327`. Published April 2022; exact OSM extract date unknown. Place centres/node IDs use drakh's OSM-derived Slovak place catalogue at `846fe1c3b1bac53dc1b7ba09f16ccbca7748e424`. The collection contains roads, not complete modern water/buildings/terrain.
- Separately licensed ODbL cropped source and complete compiled geography downloads in `public/atlas/`. Full pinned attribution and reproduction in `NOTICE.md`. Run `node scripts/build-bundled-atlas.mjs` without network or GIS dependencies. Optional original extraction uses `scripts/extract-slovakia.py` with Fiona/PyProj and the pinned repositories.
- Save format 2 stays compatible. Source validation additionally accepts explicit Geofabrik provenance with null administrative area ID; genuine source city node IDs are retained. Selected charts are embedded in journals. Opening the private site still requires access to the game; this is provider-independent map data, not an installed offline website.
- Default-cache access, read/decode and writes are all optional. Provider rejection logs record HTTP status and hostname for diagnosis. The current live provider is still unverified/unavailable in production; do not claim worldwide generation works reliably.

## Implemented in v0.5

- Replaced the accumulated stylesheet with a coherent parchment / forest ink / copper system, Cormorant display type, responsive layouts and accessible interactive states.
- Original locally bundled WebP paintings: opening world scene, three keeper portraits, four adversary portraits and three realm landscapes. Masters remain in `/workspace/generated_images`; provenance is in `public/art/NOTICE.md`. The SVG landscape uses a clipped sprite strip to preserve the correct realm painting at every aspect ratio.
- Cinematic lobby, direct prepare action, numbered setup, portrait keeper selection, seed before departure. Both campaigns, country/region setup, eight kraje, offline source, loading/cancellation/errors remain intact.
- Compact active-run introduction, larger working board and keeper sidebar. Mobile keeper condition sits before the board and stays visible while scrolling. Atlas objective is above the chart. Header Journal shortcut complements the existing footer action.
- Reworked combat arena, readable exact intent, action cards, all encounter/reward/talent/end screens, inventory, Chronicle and every dialog. Engine, service, economy and save format are unchanged.
- `tests/presentation.spec.ts` exercises actual saved campaign scenes on desktop/mobile, takes screenshots and checks accessibility/overflow. Existing behavioral tests remain unchanged. Worker packaging now validates all four artwork assets and their MIME types.

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

59 unit/engine/service/storage tests pass, including playable full campaigns on every bundled chart, geographic validation and journal round-trips, all kraj aliases and area limits, zero provider calls for bundled setup, live fallback and cancellation, and the denied-cache regressions. All 20 Chromium cases are validated: 19 passed in the full run, then both bundled cases passed after a mobile sticky-header contrast correction. Browser checks cover blocked-provider startup, hidden city, recognition, persistence, mobile availability/error/fallback states, existing campaigns, original Atlas and previous journal formats. Strict TypeScript/build, standalone Worker assets/geographic-download checks, formatting and diff checks pass. The 16-chart chunk is about 573 kB gzipped; it loads separately from the opening game bundle.

The Sites preview relay still times out. Existing Playwright tests exercise the app; live service/UI integration tests use controlled OSM fixtures; bundled-map tests use the shipped real historical data. The managed environment blocks live Overpass access, so live regional map generation is not established by these fixture tests. Production deployment success is verified separately. Do not claim every city worldwide works. Human Slovak playtesting is the next useful check.

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
