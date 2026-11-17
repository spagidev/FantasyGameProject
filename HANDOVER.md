# Emberwake · v0.13 complete on the branch

## Start here

1. Branch `claude/game-improvement-plan-quwmax` holds all of v0.13 (front door, balance, guide, ground, keeper levels, feel); verified green (152 unit, 49 browser tests, build). If not yet merged, open a PR to `main` and merge after CI when the owner asks.
2. Round four in `docs/BACKLOG.md` is done. Next candidates: a companion recruited from waylights (Heroes III armies, Lead), save slots (Build), Slovak lore translation (needs a native reviewer), a second country (needs network access).

## v0.13 on the branch (not yet in main)

- **One front door:** the lobby defaults to the Lost Atlas as "the campaign"; the First Crossing is the "quick road". The last choice is kept in `localStorage['emberwake.lobby.mode']`. Browser specs that assume classic set that key to `'quick'` in a `beforeEach`.
- **Balance pass:** ruleset-3 Seer 38/6/1 and Wayfarer 44/6/1 via `startingStats` (`data.ts`). A naive scripted player now wins 64 / 58 / 54 % at Dusk 0. `tests/player.ts` has `beginnerAction`; `npm run balance` records beginner and Atlas groups and asserts keepers within 20 points.
- **Keeper's guide:** `src/game/tips.ts` (`tipFor(run, meta)`, eleven notes), `meta.tips` / `meta.tipsOff`. Card: `src/components/GuideNote.tsx` above the board, on/off switch in Help, Slovak text in `src/i18n`.
- **Ground of an encounter:** `src/game/terrain.ts`. Narrow streets, open ground, winding hill road or crossroads, from absolute road metres within 300 m (3,500 / 1,800, winding 1.4, degree 4). Active only on charts with `atlas.ground` (v0.13+). `nodeOf` adds `terrain`; `makeEnemy`, travel focus and `victoryCoins` apply it. Shown on the chart, scout card and combat board. Rules in RULES.md.

## Keeper levels (done in v0.13; original spec)

Heroes III's "ding". Experience from every fight, a level every two encounters (troves count half), and a choice of three: +2 attack, +6 max health, a lesson, or an upgrade to the keeper's second technique. Rebalance enemy health so `npm run balance` keeps the beginner between about 50 and 70 % per keeper and the search player winning every Dusk 0 run. Keep it out of rulesets 1–2 and older journals (gate it with a run field such as `levels`). Then: "Feel" (motion, ambient sound; Build), from the Round four list in `docs/BACKLOG.md`.

## Working method that worked

The lead model designs rules, lore and engine and reviews. Mid-tier subagents build UI from tight written briefs with explicit file lists, and never commit. Check every subagent's screenshots and tests before committing. Codex makes art from `docs/ART_BRIEF*.md`. It pushes an `art/*` branch without merging, so pull it in yourself and validate names, sizes and alpha.

## Open owner questions

Slovak wording a native speaker should check (listed in the PR #11 description and in this session's notes: "Krbový voz", "cestné svetlo", "zachvený", "Rozumiem", "Lampášový trh"…). Lore translation is pending. A second country needs network access for a Geofabrik extract.

---

# Earlier checkpoint · Boons and offline (v0.11.0)

## v0.11

Backlog items 5, 6, 7, 9 and 10 shipped. Items 5/9 and 6/10 were built by two mid-tier subagents in parallel from the backlog, item 7 (province boons) by the lead model.

- **Boons:** `Province.boon` in `src/atlas/provinces.ts`; `unlockedRelics` adds the boon of every recovered province. Hooks in `engine.ts` / `atlas.ts`. `provinces.ts` imports its JSON `with { type: 'json' }` because Playwright loads `meta.ts` in Node.
- **Map:** continuous view `{cx, cy, scale}` in `AtlasMap`; wheel zooms only when the map is focused or with Ctrl.
- **Offline:** `public/manifest.webmanifest`, `public/sw.js` (registered in production only), `OfflineBadge`; the Worker build asserts both files.
- **Share links:** `?road=<base36 seed>&keeper=&dusk=` prefills the lobby; never replaces a run.
- Icons for the eight boons: `docs/ART_BRIEF_3.md`.
- Remaining backlog: 8 (Slovak translation, needs a human reviewer), 11 (second country, needs network access), 12 (owner decisions).

---

# Earlier checkpoint · Free roads (v0.10.0)

## v0.10

Backlog items 1–4 shipped (see `docs/BACKLOG.md`, RULES.md sections “Free order and guarded troves”, “Omens”, “Relic sets”).

- **Free order:** `atlas.done`, `freeOrder`, `encounterState`, `atlasObjectives`, `siteAt` in `src/game/atlas.ts`; `travel` sets `depth` to the site's own depth; `validFreeOrder` in `storage.ts` replays `done`. Use `encountersEntered`/`encountersWon` (path-based) for counts and `realmOf(run)` for the current realm — never `depth + 1` arithmetic.
- **Troves:** `TROVES`, `isTrove`, `grantGift` (atlas.ts); `troveGuard`, action `atlas-challenge`, `run.side` (engine.ts). A trove fight never advances `depth`/`path` and never offers a lesson.
- **Omens:** `src/game/omens.ts` (`omenAt(seed, day)`, `omenOf(run)`); Long shadows works through `roadCost(run, metres)`, which the interface and test player also use.
- **Relic sets:** `RELIC_SETS`, `setOf` (data.ts), `hasSet` (engine.ts). Default relic pool cannot complete any set; they appear as deeds unlock relics.
- Omens were built by a mid-tier subagent from the backlog spec and reviewed; Long shadows was redesigned after review because a dawn-oil cut was clamped away on almost every chart.

---

# Earlier checkpoint · Hearth-wagon and provinces (v0.9.0)

## Round three (v0.9)

Working method this round: the lead model did design, lore and engine; two mid-tier subagents built the interfaces from written briefs. `docs/BACKLOG.md` is the prioritised list of what is next, each item sized (Lead / Build / Chore).

- **Hearth-wagon:** `WORKS`, `worksOf`, `workBlocked`, `darkNights`, `REST_HEALING` in `src/game/atlas.ts`; action `{ type: 'atlas-camp', work? }`. Evening dialog and wagon row in `src/components/Atlas.tsx`, styles in `src/wagon.css`.
- **Provinces:** `src/atlas/provinces.ts` (legends, `campaignProgress`), data `src/atlas/slovakia-map.json` built by `scripts/build-campaign-map.mjs` from the Natural Earth outline (public domain) and the bundled chart centres. `bundledChart(area, seed, rekindled)` passes over completed charts. Interface: `src/components/CampaignMap.tsx`, `src/campaign.css`, used in `AtlasSetup.tsx` and the Chronicle's Atlas tab.
- **Lore:** `src/game/lore.ts` (`VOICES`, `KEEPER_PAGES`, `EPILOGUES`); pages are appended to `LORE`, pushed to `run.lore` by ruleset-3 boss victories and endings.
- **Art:** the 18 illustrations of `docs/ART_BRIEF_2.md` (works, province crests, wagon and journal paintings) were delivered and checked on every screen that shows them.
- Validation: see the PR description for the counts of the final run.

---

# Earlier checkpoint · The Living Map (v0.8.0)

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
