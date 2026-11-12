# Emberwake · The Last Light

A browser fantasy adventure about the things worth remembering. Carry a stolen ember through three fallen realms, awaken their bells, and choose what becomes of a world without a sun.

**Play at your own pace.** Every battle is turn based, every enemy intention is visible, and every move is saved on your device. No paid mechanics or external gameplay services. The private hosted version requires your ChatGPT sign-in.

![Emberwake: the Sunken Reach expedition map](docs/emberwake.png)

## Play and develop

Requires **Node.js 22 or newer** and npm.

```sh
npm ci
npm run dev
```

In the managed cloud environment, use `npm ci --cache /workspace/.npm-cache` because the home directory may be read-only. The development server binds to all interfaces on port 5173 by default. Use the existing checkout; a new worktree is unnecessary.

```sh
npm test                 # Combat, economy, progression, save validation, full campaigns
npm run build           # Strict TypeScript check and production assets
npm run test:e2e         # Real Chromium gameplay, accessibility, save/resume, mobile
npm run check            # All of the above
npm run format:check     # Formatting
npm run balance          # Optional 90-campaign strategic-route regression matrix
```

Browser tests use `/usr/bin/chromium` when present. On other machines, run `npx playwright install chromium` first. CI installs its browser and OS dependencies automatically. To inspect failures, use the screenshots and traces in `test-results/`.

`npm run build` produces `dist/`, which can be hosted by any static web host. `npm run preview` serves that build for local testing. No environment variables or credentials are required to run the game.

## The first crossing

- **Three keepers:** Asha the Warden, Orin the Seer, Sable the Wayfarer.
- **Three realms:** the Sunken Reach, the Glass March, the Rootbound Crown.
- **Twelve encounters:** connected routes, story decisions, sanctuaries, traders, elites, and three bosses.
- **Six unique relics** that change combat strategy, plus permanent upgrades within a run.
- **Two complete endings** and a persistent nine-entry chronicle.
- **Reproducible journeys:** enter the same seed word for the same route, events, and relic offers.
- **Local autosave:** reload to resume the exact turn. Browser storage failures are reported without preventing play.
- **Portable journals:** export or restore a validated save file to carry the expedition between browsers. Open “Journal” in the footer; files stay on your device.
- Responsive layouts, keyboard controls, reduced-motion support, native accessible dialogs, and locally bundled fonts and original SVG artwork.

In combat, use the action buttons or keys **1–4**. Your action resolves first, then poison, then the enemy's visible intention. **Guard lasts one enemy action. Flasks also end your turn.** Open “How to play” for the complete introduction.

## The Lost Atlas · v0.3

Select **The Lost Atlas** above the keeper choices, then **Begin expedition**. Existing journeys resume as before; use **Leave this expedition** and confirm if you want to start the new mode instead. Export your current Journal first to keep both journeys.

The Saltbound Coast is a complete new expedition on a real OpenStreetMap region, rendered as a forgotten fantasy realm. Walk the connected roads to uncover the terrain. Reach and resolve twelve encounters, awaken three bells, and collect optional supplies on side paths. Your road history and uncovered chart save with the expedition. Previously explored terrain stays visible; walking back does not generate income.

Shorelines, harbours, old streets and gardens preserve their real shapes, but every landmark has a fantasy identity. Field notes offer clues. If you recognize the place beneath the veil, name it in the journal: a correct answer grants +2 attack once and charts a hidden hearth. There is one attempt per bell stage, no damage for a wrong answer, and the full campaign is winnable without recognition. The haven can also be found by exploring.

The map has a keeper zoom and a whole-chart view. Direction/distance road buttons and a landmark index support keyboard and mobile play. All terrain is bundled: no tile API, GPS permission, external map requests or API key is needed during play. See [the concept and implementation plan](docs/LOST_ATLAS.md) for research and future charts. The first chart is deliberately curated; this release does not support arbitrary worldwide locations.

Geographic data: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). The downloadable [geographic database, source and provenance](public/atlas/NOTICE.md) are distributed separately from the original fiction and game code. The chart uses a historical snapshot, not current navigation data. Rebuild deterministically with `python3 scripts/build-atlas.py public/atlas/source.osm.gz`.

## Roads Rekindled · v0.2

- **A road that gives back:** free a Dawnwell, Cinder Kiln, or Moth Observatory in each realm. Choose future health, expedition income, or opening focus. Sites stack within a run and only pay when you cross into another encounter.
- **Nine remembered lessons:** after the first two bells, choose one of your keeper's unlearned specializations. Build around defense, focus, burst damage, venom, or shared supplies.
- **Free scouting:** inspect any map node before committing. Read its complete enemy pattern, rewards, and waylight benefit; future nodes can be inspected but cannot skip the route.
- **Different threats:** kiln guardians attack continuously, observatory guardians drain focus, and elites pressure your preparation.
- **Existing journals preserved:** old expeditions resume with their original rules and exact turn, while new expeditions use the expanded ruleset.

[Design research](docs/DESIGN_RESEARCH.md) records the Heroes III/VCMI references and independent design decisions behind this milestone. The [90-campaign report](docs/BALANCE_REPORT.json) covers both rulesets, all keepers, and three strategic route plans. Its automated search establishes reachable winning paths; human playtesting is still needed for difficulty and enjoyment.

## Design and implementation

The [lore](docs/LORE.md) was established before implementation. The [rules](docs/RULES.md) define the mechanical contract. The UI calls a pure, deterministic state engine; it does not calculate a second version of the combat rules.

| Location                  | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| `src/game/data.ts`        | Keepers, scenes, relics, lore, and chapter content  |
| `src/game/engine.ts`      | Seeded routes and pure rule transitions             |
| `src/game/storage.ts`     | Versioned save validation and profile progression   |
| `src/App.tsx`             | Campaign screens, local persistence, navigation     |
| `src/components/`         | Original illustrations, route graph, icons, dialogs |
| `src/game/engine.test.ts` | Rules and complete campaign tests                   |
| `tests/`                  | Real-browser tests and a bounded test-player search |

The save format is version 2 under `emberwake.save.v2`. Version 1 saves are migrated without overwriting the original storage slot. A campaign's ruleset remains stable after migration. Saves are local and editable; this is a single-player game, not a trusted competitive leaderboard. Profiles retain discovered memories and completed-run counts. Relics, lessons, waylights, attack upgrades, and supplies reset each run.

## Continuing development

See [HANDOVER.md](HANDOVER.md) for the latest checkpoint, validation evidence, known limits, and a continuation prompt. See [the roadmap](docs/ROADMAP.md) for next priorities.

Fonts are bundled from Fontsource under their SIL Open Font License. Interface icons are Lucide (ISC). Landscape, keeper, and enemy illustrations are original SVG components. Third-party license details remain in their npm packages.
