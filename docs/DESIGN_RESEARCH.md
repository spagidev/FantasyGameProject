# Why the road should matter

Research conducted 2026-11-11 for Emberwake's second milestone. The brief is broad inspiration from the long life of **Heroes of Might and Magic III**, with independent rules, writing, names, art, and implementation.

## Sources actually consulted

Direct access to Wikipedia, the Heroes community wiki, and GOG's product/review page returned proxy 403 responses. Rather than imply those articles were read, this research uses **VCMI**, the open-source recreation of the Heroes III engine, as a technical primary reference. Its documentation distinguishes original-game behavior from VCMI additions. Technical descriptions establish mechanics; they do not prove why individual players stayed or provide retention statistics.

Sources are pinned to VCMI commit `5d048de14cb4d56e8cbfe3a221e10e88d9332e36`, inspected through read-only Git:

1. [Project overview](https://github.com/vcmi/vcmi/blob/5d048de14cb4d56e8cbfe3a221e10e88d9332e36/docs/Readme.md): an actively maintained recreation with releases, modding support, and editor tools. Evidence of continued community activity, not a count of the original game's players.
2. [Mine objects](https://github.com/vcmi/vcmi/blob/5d048de14cb4d56e8cbfe3a221e10e88d9332e36/docs/modders/Map_Objects/Mine.md) and [dwellings](https://github.com/vcmi/vcmi/blob/5d048de14cb4d56e8cbfe3a221e10e88d9332e36/docs/modders/Map_Objects/Dwelling.md): productive adventure-map sites, guardians, resource generation, recruitment, and growth.
3. [Hero progression source](https://github.com/vcmi/vcmi/blob/5d048de14cb4d56e8cbfe3a221e10e88d9332e36/lib/mapObjects/CGHeroInstance.cpp): primary/secondary skill progression, learning restrictions, and skills interacting with hero state.
4. [Random map generation](https://github.com/vcmi/vcmi/blob/5d048de14cb4d56e8cbfe3a221e10e88d9332e36/docs/developers/RMG_Description.md) and [map templates](https://github.com/vcmi/vcmi/blob/5d048de14cb4d56e8cbfe3a221e10e88d9332e36/docs/modders/Random_Map_Template.md): connected regions, guarded connections, treasure values, and configurable distributions. This describes VCMI's implementation rather than claiming its generation algorithm is the 1999 implementation.
5. [Map editor](https://github.com/vcmi/vcmi/blob/5d048de14cb4d56e8cbfe3a221e10e88d9332e36/docs/modders/Map_Editor.md), [rewardable objects](https://github.com/vcmi/vcmi/blob/5d048de14cb4d56e8cbfe3a221e10e88d9332e36/docs/modders/Map_Objects/Rewardable.md), and [changelog](https://github.com/vcmi/vcmi/blob/5d048de14cb4d56e8cbfe3a221e10e88d9332e36/ChangeLog.md): authored scenarios, bounded/revisitable rewards, player choice, and continuing community development.
6. [Mechanics and differences](https://github.com/vcmi/vcmi/blob/5d048de14cb4d56e8cbfe3a221e10e88d9332e36/docs/players/Game_Mechanics.md): explicitly identifies VCMI additions and later-series features. For example, the displayed stack queue is attributed to Heroes V; it is **not** treated here as an original Heroes III invention.

No source code or game assets from these projects are incorporated into Emberwake.

## Design interpretation

The lasting appeal plausibly comes from **interlocking decisions**, more than any single feature:

| Observed structure                           | Why it may sustain interest (interpretation)                                                        | Independent application in Emberwake                                                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Battles secure productive sites              | A tactical cost now changes the value of later turns; early investments have time to pay off        | Rescue one **waylight** in each realm: health along the road, expedition income, or stronger opening focus                                                                            |
| Hero skills change what an army can do       | Players form plans around a particular build rather than receiving only larger numbers              | Choose a keeper-specific **remembered lesson** after each of the first two bells; three alternatives per keeper, two choices per run                                                  |
| Valuable destinations behind guardians       | Map knowledge makes preparation and risk assessment rewarding                                       | Free **scouting** of visible nodes, including exact enemy patterns, site benefits, and whether the route is presently reachable                                                       |
| Different threats reward different responses | Winning is about preserving resources, not merely finding one repeatable attack                     | Different normal-enemy lane patterns and elite focus pressure; keep all intentions deterministic and visible                                                                          |
| Authored and generated maps coexist          | Familiar systems can produce fresh strategic situations, while authored encounters provide identity | Stable seeded routes and readable encounter data; preserve the existing narrative and seed sharing                                                                                    |
| Long-lived editors/mods/community tooling    | Players can eventually make their own reasons to return                                             | Keep content data separate from the rule engine; portable journals already preserve player investment. A full map editor is a later project, not a promised feature in this milestone |

These are testable design hypotheses, not proven causal claims about decades of player retention. Human playtests must assess whether the new choices are comprehensible and enjoyable.

## Scope of Roads Rekindled

Keep Emberwake's twelve-encounter structure and single-keeper battles. Add strategic consequences between battles without introducing an army simulator, town production screens, extra currencies, or real-time obligations. All passive income occurs on **player-initiated crossings**, never while the player is away.

An early waylight should offer more future value than a late one; a late route must still have a clear benefit. Health, coins, and opening focus serve different plans. Scouting should expose the tradeoff before commitment. Talent effects and UI values must come from the same rules used to resolve combat.

## Compatibility and validation plan

Version 1 journals and in-progress campaigns keep their original rules, enemy patterns, and exact turns. New campaigns use the second ruleset and version 2 save format. The legacy storage slot is retained as a backup when first migrated. Test both formats, complete campaigns with each keeper, nondefault routes, passive-income timing, talent ownership, exact reloads, and mobile/scouting accessibility. Use a reproducible seed/keeper matrix as a regression check; automated success is not a substitute for human difficulty feedback.
