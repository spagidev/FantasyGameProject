# Emberwake backlog

A living list, ordered by impact. Each item says **why**, **what exactly**, **where**, **done when**, and which class of agent can do it: **Lead** (needs design judgment, balance or writing: use the strongest model), **Build** (well specified: a mid-tier model can do it from this page), **Chore** (mechanical: the cheapest model).

House rules for every item: the engine in `src/game/` is pure and deterministic and is the only place rules live; the interface reads numbers from it and never recalculates them; nothing may raise a keeper's starting strength between runs; older journals must keep loading; every new screen passes the axe check and fits a 390 px phone; no real place name may appear before the player has named the city. Run `npx tsc -b`, `npm test`, `npm run test:e2e -- --trace off` before handing back.

## Shipped in round three (v0.9)

- **The hearth-wagon.** The Atlas camp is a town that travels: each evening build one of six works or rest, never both. (`WORKS` in `src/game/atlas.ts`, dialog in `src/components/Atlas.tsx`.)
- **The provinces of Veyr.** A real map of Slovakia with eight fantasy provinces mirroring the eight kraje; choose where to go on the map; a province campaign reaches both of its cities; rekindle both to recover its legend. (`src/atlas/provinces.ts`, `src/components/CampaignMap.tsx`.)
- **Voices.** Guardians and elites speak when a fight begins, turns and ends; each keeper writes their own page after each bell and has their own epilogue for each ending — fifteen new chronicle pages, three tellings of one story. (`src/game/lore.ts`.)

## Shipped in v0.10

- **Free order within a realm** (item 1 below) and **guarded troves** (item 2), both on Atlas charts begun from v0.10. See RULES.md, “Free order and guarded troves”.

## Next

### 1. ✓ Free order within a realm · Lead (shipped v0.10)

**Why.** Heroes III lets you decide which guarded thing to take first; on the Atlas the bell wards force one order, so the map is a corridor with detours.
**What.** Inside a realm, the three encounters before the guardian may be entered in any order; the guardian opens when all three are done. `run.depth` stays the count of encounters won; add `atlas.done: string[]` (site ids) and derive the node for a site from its own fixed depth/lane. `nextNodes` on the Atlas returns the node of the site the keeper stands on if it belongs to the current realm and is not done. Waylight, lesson and reward rules are unchanged. Old Atlas journals (no `done`) keep the strict order.
**Where.** `engine.ts` (`nextNodes`, `travel`, `victory`), `atlas.ts`, `storage.ts`, objective banner in `Atlas.tsx`, `tests/player.ts`.
**Done when.** A test wins a realm's three encounters in each of the six orders; saves round-trip; the balance matrix still wins at Dusk 0.

### 2. ✓ Guarded troves · Lead (shipped v0.10)

**Why.** “Is that treasure worth that fight?” is the adventure-map question, and Emberwake has no optional fights.
**What.** The cache, spring and haven sites each gain a seeded guardian from the realm's ordinary roster (visible when scouted, toughened like any enemy by nights). Entering is optional; winning grants the site's gift plus a relic choice drawn as for an elite. A side fight does not advance `depth`: add `run.side?: string` (site id) set on entry and cleared on victory, with `victory()` returning to the map. Fleeing is not offered; scouting is.
**Where.** `engine.ts`, `atlas.ts`, `Atlas.tsx`, `Strategy.tsx` (scout), tests.
**Done when.** A trove can be scouted, fought and looted once; skipping all three still wins; validation rejects a side fight with no site.

### 3. Omens · Build

**Why.** Heroes' “week of…” makes the calendar itself an event; days exist on the Atlas now.
**What.** Every third dawn (days 4, 7, 10…) the almanac names a seeded omen that lasts three days, announced in the dawn message and shown in the day bar. Six omens, each one visible rule: _Moth-light_ (+1 starting focus), _Hoarfrost_ (enemies' first hit adds 1 frost), _Fair days_ (trader prices −20%), _Long shadows_ (lamp oil −15% at dawn), _Clear bells_ (perfect guards wear 25% more poise), _Kind weather_ (resting heals 12). Pure functions `omenAt(seed, day)` and hooks at the six places named.
**Where.** new `src/game/omens.ts`, hooks in `engine.ts`/`atlas.ts`, day bar in `Atlas.tsx`, scout and combat chips.
**Done when.** Each omen has a unit test proving its one effect and its absence a day later; the same seed gives the same almanac.

### 4. Relic sets · Build, then Lead for balance

**Why.** Combination artifacts turn single finds into a hunt.
**What.** Four sets of three existing relics; carrying all three adds one bonus line, shown on each member's card (“2 of 3 · The Bell-ringer's kit”). Proposed: _Bell-ringer's kit_ (clapper, chime, echo): breaking poise restores 1 focus. _The long watch_ (buckle, psalm, mirror): perfect guards heal 2. _Night garden_ (censer, gravebloom, briar): poison fades every second turn. _Pilgrim's purse_ (ferrycoin, scale, thread): +1 flask at every trader visit. Re-run `npm run balance` and the scripted-player sim; adjust numbers if Dusk 0 novice win rates move more than five points.
**Where.** `data.ts` (`RELIC_SETS`), hooks in `engine.ts`, cards in `App.tsx`/`Chronicle.tsx`.

### 5. A map you can handle · Build

**Why.** Mapy-style maps are dragged and pinched; ours has one zoom switch.
**What.** In `AtlasMap`: drag to pan, wheel and pinch to zoom between the whole chart and 4×, `+`/`−`/“centre on keeper” buttons, keyboard arrows when the map has focus. Keep the keeper centred after a walk unless the player has panned. No library. Reduced-motion: no animated easing.
**Where.** `Atlas.tsx`, `nightfall.css`. **Done when.** Playwright drags and zooms; axe passes; nothing overflows at 390 px.

### 6. Installable and offline · Build

**Why.** The bundled charts are the game's “downloaded maps”; the site should work on a train.
**What.** Web app manifest, icons from the existing favicon, a small hand-written service worker that precaches the built assets (cache-first, versioned by build hash, never caching `/api/atlas`). “Available offline” line in the footer once cached. The Worker build (`scripts/build-worker.mjs`) must serve the manifest and worker with correct MIME types.

### 7. Province boons · Lead (content), Build (wiring)

**Why.** Recovering a legend should change what future roads can hold — variety, never power.
**What.** Each recovered province adds one province-themed relic or story scene to the pool (eight in all), written to echo its legend (a miner's wooden clapper, a nail-less joint, a coronation offcut…). Needs eight designs with exact rules, then `unlockedRelics` reads province progress.

### 8. Slovak language · Build + native review

**Why.** The charts are Slovak; the player may be too.
**What.** Extract interface strings to a typed dictionary (`src/i18n/en.ts`, `sk.ts`), a language switch in the footer stored in `meta`. Lore and legends need a careful literary translation — flag for human review rather than shipping machine prose.

### 9. Evening dialog polish · Chore

Move the dawn preview above the options so it is visible without scrolling; show the keeper's coins in the dialog header; painted work icons arrive via `src/art/works/` (already wired).

### 10. Share a road · Chore

`?road=<seed>&keeper=<id>&dusk=<n>` pre-fills the lobby; a “copy link to this road” button on the ending screen. Never auto-starts.

### 11. A second country · needs network

The bundled pipeline (`scripts/extract-slovakia.py`, `scripts/build-bundled-atlas.mjs`) is country-agnostic but needs a Geofabrik extract, which this environment cannot download. Run on a machine with network access; then add its provinces to `src/atlas/provinces.ts` with their own legends (Lead).

### 12. Decisions for the owner

- Which expedition should a new player meet first? The Atlas is now the richer mode; the First Crossing is the quicker one.
- Should the First Crossing's sanctuaries become wagon evenings too, so both modes share one camp?
- Human playtests: is Dusk 0 right for each keeper? The scripted “simple player” wins 68 / 30 / 55 % (Warden / Seer / Wayfarer).
