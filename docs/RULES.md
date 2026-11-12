# Emberwake rules · Roads Rekindled (ruleset 2)

This document is the contract for the pure state engine in `src/game/engine.ts`.

New expeditions use ruleset 2. Imported or resumed version 1 expeditions keep the classic ruleset for their entire run. Base actions, chapter structure, relics, bosses, and prices are shared; the new waylights, lessons, and lane patterns below apply only to ruleset 2.

## Expedition

A run has a reproducible seed, one keeper, and 12 encounters in three chapters. Each chapter has four depths: combat, a story/elite choice, a camp/trader choice, and a mandatory boss. At each depth there are three lanes. All lanes are accessible at the first depth of each chapter; otherwise only the same or neighboring lane is reachable. Moving forward commits to that encounter. Routes never move backward. Lane affects enemies and rewards, and preview cards show the exact cost/reward or enemy before entry.

Runs start at full health, with 35 coins, two flasks, no relics, and no upgrades. Warden: 48 health, 7 attack, 2 armor. Seer: 36 health, 6 attack, 0 armor. Wayfarer: 40 health, 6 attack, 1 armor. Health is capped at max health, coins and focus never go below zero. Death ends the run immediately. A victorious final battle offers two narrative endings.

## Turn order

Combat is deterministic and turn based: no accuracy rolls, critical hits, hidden dice, or timers. A battle starts with 2 focus plus any observatory and lesson bonuses (maximum 5), no guard, and no poison. The enemy's next move and exact raw damage are visible. Each valid player action consumes one turn, including a flask. Invalid/unaffordable actions do nothing.

1. Resolve the player's action. Damage consumes enemy guard before health.
2. If the enemy survives, poison deals its full stack as direct health loss, then loses one stack. If it dies, combat ends before its action.
3. Resolve the telegraphed enemy action. Damage is `max(0, raw damage − keeper armor)`, then consumes player guard before health. Focus drain and enemy guard/heal moves are also explicit in the intent.
4. If alive, discard remaining player guard, increment the turn, and show the next intent. Enemy guard persists until consumed. Enemy healing cannot exceed its original maximum health. Focus persists within a fight, resets next fight.

### Universal actions

- **Strike:** deal attack damage and gain 1 focus (cap 5). Wayfarer heals 2, even when damage hits guard.
- **Guard:** gain `9 + armor` guard, gain 2 focus, and with the Briar Charm deal 3 damage. Guard lasts for this enemy action only.
- **Flask:** consume one flask, restore 16 health. Enemies still act. Maximum inventory: 5.

### Keeper actions

- Warden **Sundering blow**, cost 3: deal `attack × 2 + 3`, gain 5 guard.
- Seer **Starfire**, cost 3: deal `attack × 2 + 7`; ignores enemy guard. Seer's Guard gives 4 extra guard.
- Wayfarer **Nightbloom**, cost 2: deal `attack + 2`, apply 5 poison stacks. Reapplications add stacks. Poison ticks immediately after the action.

### Relics (unique per run, effects stack across different relics)

- **Briar Charm:** Guard also deals 3 damage.
- **Dawn Shard:** +2 attack.
- **Mothglass:** gain 1 additional focus on Strike.
- **Pilgrim's Thread:** heal 5 after each won battle.
- **Iron Psalm:** +1 armor.
- **Hearthseed:** +10 maximum health and heal 10 on pickup.

## Enemies and rewards

Enemies cycle through a fixed, visible pattern. Chapter scales base health and damage. Elite enemies have more health/damage and give 32 coins plus a relic choice. Ordinary enemies give 18 coins plus a relic choice. Bosses have distinct patterns, give 45 coins plus a relic choice, and ring their chapter's bell. Damage and maximum health are fixed at battle creation; enemy guard and healing do not change the damage telegraph.

Chapters use zero-based index `c = 0, 1, 2`; lanes use `l = 0, 1, 2`. Ordinary enemies have `24 + 11c + 2l` health and base damage `6 + 3c`. Elites have `35 + 13c` health and base damage `8 + 3c`. The classic ruleset uses the same pattern for both: base-damage strike → gain `5 + 2c` enemy guard (no damage) → base-damage + 5 heavy strike. Names vary by seed; their numeric rules do not.

In ruleset 2, use `D` for the enemy's base damage:

| Route                                    | Repeating intentions (raw values)                                       |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| Dawnwell (left ordinary battle)          | `D` damage → gain `5 + 2c` guard → `D + 5` damage                       |
| Cinder Kiln (center ordinary battle)     | `D − 1` damage → `D − 1` damage → `D + 3` damage                        |
| Moth Observatory (right ordinary battle) | `D − 1` damage and drain 1 focus → gain `6 + 2c` guard → `D + 4` damage |
| Elite encounter                          | `D` damage and drain 1 focus → gain `8 + 2c` guard → `D + 6` damage     |

Scouting any visible map node is free and shows the full repeating pattern before commitment. Only the currently reachable next-depth nodes allow travel from their scout preview. Scouting does not advance the seed, trigger income, spend supplies, or advance the expedition.

| Guardian              | Health | Repeating intentions (raw values)                |
| --------------------- | ------ | ------------------------------------------------ |
| The Bellwether        | 48     | 9 damage → gain 8 guard → 16 damage              |
| The Oathless Sentinel | 64     | 12 damage → gain 12 guard → 20 damage            |
| The Hollow King       | 84     | 15 damage and drain 1 focus → heal 8 → 24 damage |

Focus drain resolves even if all damage is guarded, but a player kill or poison kill prevents the entire enemy action. All enemy patterns start at their first intention when entering battle.

After a nonfinal victory choose exactly one available unique relic or recover 12 health. Three relics are deterministically offered from the remaining pool. If all are owned, only recovery remains. Final victory leads directly to the ending choice.

## Waylights · ruleset 2

The ordinary battle at the first depth of each realm guards a waylight. Its type is determined by lane and visible before travel. Winning frees that site automatically, in addition to the normal coins and relic choice. There are exactly three opportunities per run. Sites of the same type stack; losing to a guardian never grants its site.

| Site             | Recurring benefit                                                                 |
| ---------------- | --------------------------------------------------------------------------------- |
| Dawnwell         | Restore 2 health on each future legal crossing, capped at maximum health          |
| Cinder Kiln      | Gain 4 coins on each future legal crossing                                        |
| Moth Observatory | Start each future battle with 1 extra focus, with total opening focus capped at 5 |

Health and coin benefits resolve once when entering an encounter, before combat initializes. A newly freed site begins contributing on the **next** crossing. Rewards, lesson choices, purchases, rest actions, rejected moves, scouting, reloads, and time spent away produce no income. Site ownership resets with the expedition.

## Remembered lessons · ruleset 2

After the first and second bell guardians, choose the normal relic/recovery reward, then choose exactly one unlearned lesson belonging to your keeper before moving on. Three are initially available; the second choice has two remaining alternatives. A lesson lasts this expedition and cannot be learned twice. The final guardian leads to the ending instead of another lesson.

| Keeper   | Lesson                  | Exact effect                                                                                                              |
| -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Warden   | The living gate         | Guard absorbs 4 additional damage                                                                                         |
| Warden   | Sunsteel resolve        | Sundering blow deals 5 additional damage                                                                                  |
| Warden   | An unbroken vow         | Strike generates 1 additional focus, stacking with Mothglass before the cap of 5                                          |
| Seer     | The first constellation | Start battles with 1 additional focus, stacking with observatories before the cap of 5                                    |
| Seer     | A falling star          | Starfire deals 5 additional piercing damage                                                                               |
| Seer     | The quiet moon          | Gain 1 armor immediately and permanently for this run; Guard absorbs 2 additional damage on top of its armor contribution |
| Wayfarer | A patient garden        | Nightbloom applies 7 poison instead of 5                                                                                  |
| Wayfarer | Sap of the old wood     | Strike heals 3 instead of 2, even when it hits enemy guard                                                                |
| Wayfarer | A road shared           | Each later victory gives 6 additional coins and heals 2, stacking with Pilgrim's Thread                                   |

UI action values use the engine's `guardAmount`, `skillDamage`, `strikeFocus`, `strikeHealing`, and `poisonAmount` helpers. Lesson effects are applied once per valid transition; reloading an unchosen lesson never applies its effect.

## Encounters and economy

Story scenes have two explicit, deterministic options. Rewards and prices appear before choosing. A choice that costs health is unavailable unless health would remain at least 1. A coin cost is unavailable when unaffordable. No scene can be farmed.

| Scene               | First option                 | Second option                      |
| ------------------- | ---------------------------- | ---------------------------------- |
| The ferryman’s fare | Lose 6 health, gain 2 attack | Gain 15 coins and restore 5 health |
| Letters to the lost | Gain 22 coins                | Restore 14 health                  |
| The moth archivist  | Pay 15 coins, gain 2 attack  | Gain 1 flask                       |

Both options discover the scene's lore. Positive healing and flask rewards respect their caps; a full inventory does not prevent choosing a story option for its narrative result. Attack upgrades persist only for the current expedition.

At camp choose one: heal 18, gain 1 flask (cap 5), or forge +2 attack for 30 coins. One camp action advances the route. At a trader, each of the following may be bought once per visit, then leave freely: flask 14 coins, heal 20 for 18 coins, +2 attack for 35 coins. Purchases and flasks respect caps; ineffective purchases are disabled.

## Persistence and fairness

Every successful state transition autosaves locally in the browser, alongside discovered lore, completed runs, and victories. Refreshing resumes the same encounter and seed. Saves are versioned and validated on load; incompatible/corrupt run saves are ignored without crashing. Storage failures show a warning and allow play to continue in memory. Abandoning a run requires confirmation. There is no server, account, telemetry, or paid mechanic. Local saves are editable and are not a competitive scoreboard.

The journal menu exports the complete local save as JSON. Import accepts version 1 and version 2 journals up to 64 KB, validates the same invariants as local saves, and previews the keeper and profile before replacement. Selecting a file never replaces progress; the player must choose **Restore this journal**. Imported histories replace rather than merge, avoiding duplicate completed-run counts. Nothing is uploaded. A player with blocked storage can still export the current in-memory journal.

Current saves use `emberwake.save.v2`. If that slot does not exist, the game checks the previous `emberwake.save.v1` slot. A valid old save is normalized to format 2 with `ruleset: 1`, empty site/lesson lists, and unchanged health, coins, enemy, focus, turn, and profile. Future battles in that run use the original patterns and original progression. The old storage slot remains untouched as a backup. Starting a new run always uses ruleset 2. Format versions are separate from the campaign ruleset so an exported classic crossing remains classic when imported elsewhere.

## The Lost Atlas · optional format-2 exploration state

Selecting Lost Atlas starts a ruleset-2 run with an additional version-1 `atlas` object. The original First Crossing omits that object and retains its existing lane choices. Existing v1 and v2 journals are accepted unchanged.

On the Atlas, `atlas-move` is legal only in the map phase and only along an edge adjacent to the current location. Movement increments roads walked and records newly visited sites/road IDs, but gives no health, coins, focus or waylight income. Fog is derived deterministically from the visited positions and traversed road geometry. A charted site may be inspected; it cannot be entered from a distance.

Each of the twelve encounters has a geographic location, depth and lane. The next encounter is enterable only at its location; later encounters are sealed, and earlier ones cannot be replayed. Actual encounter entry uses the existing engine, including one-time waylight crossing income, combat, rewards, talents, camp and trader rules. Movement and map naming/collection are blocked during encounters and after the ending. The Atlas can be unfolded during an encounter without advancing it.

The Arena of Echoes gives 18 coins once; the Porcelain Spring gives one flask once (requires fewer than five flasks); the Rose Hearth heals up to 12 and adds one attack once. Walking past a gift does not collect it. Collected sites remain exhausted across revisits and journal reloads.

Players may submit one nonempty place name per bell count (0, 1, 2, 3) while in the map phase. Correct recognition, including supported alternative spelling, gives two attack once and reveals the hidden haven’s location. Wrong guesses change no stats; the next bell opens another attempt. Recognition does not collect the haven or move the player. It is optional; all three keepers have a tested complete path without it.

The region, positions, site IDs, road IDs, collection IDs, attempt stages, strings and counters are bounded and validated when reading a journal. Original bundled-chart journals remain small; v0.4 permits journals up to 2 MB to include generated geography. Map data is a checked-in OSM-derived historical chart; it is never downloaded from community tile services during play.

## Regional Atlas · v0.4

An explicitly selected country/administrative region resolves to an OSM area. Cities/towns are queried by **area membership**, not merely by a rectangular bounding box. The seed chooses a candidate among the returned city nodes. At most two city extracts are attempted; rejected, ambiguous, unavailable or too-sparse maps leave the current save unchanged. Cancellation does not create an expedition. The original offline chart remains a separate explicit choice.

A regional chart carries its matched area, immutable projected geography, connected 17-site / 24-road graph, terrain-based clues, city aliases and provenance with the run. All twelve existing encounters, side gifts, movement/ward rules and recognition bonuses are unchanged. Only the chosen city aliases are accepted for recognition. Country and region names are clues, not answers. Accents, case and punctuation are normalized; non-Latin names are supported.

Generated geography is validated for finite coordinates, bounded geometry/string counts, distinct site anchors, valid road endpoints and graph connectivity. The journal cap is 2 MB. Save/reload/export uses the same geometry and never rerolls or fetches a different city. Combat transitions share immutable geography rather than cloning its geometry every turn.
