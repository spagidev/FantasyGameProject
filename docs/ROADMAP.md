# Emberwake roadmap

## Milestone 1 · The First Crossing

A complete, local-first campaign: original world, exact rules, three keepers, three realms, deterministic combat, seeded connected routes, story/economy encounters, six relics, persistent lore, endings, responsive illustrated UI, and automated gameplay validation.

## Milestone 2 · Roads Rekindled

Implemented independent strategic systems informed by the documented Heroes III/VCMI research: three productive waylight types, nine keeper-specific lessons (two choices per expedition), free route scouting with exact enemy patterns, distinct lane/elite threats, and version 1 save migration with original rules preserved. A reproducible 90-campaign matrix covers both rulesets, all keepers, and three route plans. See `docs/DESIGN_RESEARCH.md` and `docs/BALANCE_REPORT.json`.

## Milestone 3 · The Lost Atlas

Implemented a complete second expedition over a curated real OSM region: fantasy cartography, persistent fog, connected geographic roads, seventeen discoverable sites, twelve encounters, optional resource detours, recognition clues and a one-time knowledge bonus. Original campaigns and journals remain compatible. The OSM database and original source are bundled and attributed under ODbL. See `docs/LOST_ATLAS.md` for research, scope and architecture.

The next Atlas work should follow human playtesting: tune how much terrain each road reveals, whether the next-encounter bearing is clear, and whether the optional paths feel rewarding. Then author a second region with different geography (river crossings rather than a coast), and add geographically meaningful route alternatives. Arbitrary worldwide imports need a separate robust ingestion/connectivity pipeline before they can be offered.

## Next useful improvements

1. **Playtest the decisions.** Gather human feedback on combat clarity, difficulty, and route incentives. Use the recorded seed/keeper/route matrix as a baseline before adjusting stats; automated search currently wins all 90 samples. The bounded test player proves legal winning paths; it is not evidence of novice difficulty or overall balance.
2. **Expand encounter variety.** Add chapter-specific stories and further enemy identities, keeping costs and intentions exact. The three ordinary lane patterns and elite pattern are already distinct. Avoid adding currencies before the existing decisions are interesting.
3. **Clarify the moment-to-moment experience.** Improve damage feedback, keyboard discovery, mobile map readability, and the explanation of guard/focus interactions. Keep reduced-motion support and verify all changes with real browser tests.
4. **Save migrations.** Validated journal export/import is implemented. Maintain the existing v1-to-v2 migration tests when the format changes so players can keep their stories across versions. Never silently clear a compatible save when changing content.
5. **Optional atmosphere.** User-initiated, muted-by-default ambient sound and richer local artwork. The game must remain playable without audio or external network services.
6. **Hosting.** The game has an owner-only Sites deployment. Preserve that audience and existing project identity when publishing updates. The built application needs no gameplay backend.

## Design boundaries

- No timers, daily obligations, real-money mechanics, or punishments for leaving.
- No invisible combat randomness. Show the consequences before commitment.
- No permanent power grind. Returning players earn perspective and variety.
- Keep runs short, the choices legible, and the world specific.

## Autonomous-work continuity

The user authorizes ongoing implementation and PR merges. Establish tested, committed checkpoints regularly and update the handover before ending a session. Check any available quota status periodically; stop at a safe checkpoint if five-hour usage exceeds 90% or weekly usage exceeds 97%. If quota telemetry is not available, say so; do not fabricate percentages or promise automatic stopping at an unobservable threshold. Do not publish cloud environment configuration unless separately asked.
