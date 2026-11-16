# Emberwake rules

This document is the contract for the pure state engine in `src/game/engine.ts`. New expeditions use **ruleset 3 · The Long Night**, described first. Journals from earlier versions keep ruleset 1 or 2 for the rest of their expedition; those rules follow unchanged below.

## Ruleset 3 · The Long Night

### Expedition

Twelve crossings in three realms. In each realm: a waylight guardian (three lanes, three different enemies), two crossings arranged by the seed, then the bell guardian. The second crossing is always one story, one elite and one ordinary battle in a seeded order; the third always contains a sanctuary and a trader plus either a story or an elite, so every route can reach a sanctuary or a trader before the guardian. Lane movement is unchanged: all lanes at the start of a realm, otherwise the same or a neighbouring lane. A story scene never repeats within one expedition. Lost Atlas charts keep their fixed encounter kinds and use the same combat, relics and scenes.

Keepers start as before (Warden 48/7/2, Seer 36/6/0, Wayfarer 40/6/1 health/attack/armor), with 35 coins and two flasks. The Seer starts every battle with 1 extra focus.

### A turn

1. **Your action.** Strike, Guard, keeper skill, keeper technique or flask. An unavailable action changes nothing.
2. Weakness counts down by one (not after a flask, which removes it).
3. **Poison** deals its stacks to the enemy, ignoring guard, then fades by 1.
4. **Frost** costs you its stacks, ignoring guard and armor, then melts by 1.
5. **The enemy acts**, unless it is staggered and this is the action it loses. Each hit deals `max(0, damage + fury − armor)`; multi-hit attacks apply armor to every hit; your guard absorbs the total. Then its other effects apply: guard, healing, fury, focus drain, weakness, frost.
6. Regrowth heals the enemy. A guardian at or below half health changes to its second pattern, starting from its first intention; the action you were shown always resolves first.
7. Unused guard is discarded (the Oathkeeper’s Buckle keeps up to 6).

The interface shows the current and the following intention. The line under each action is produced by running the engine on that action, so it cannot disagree with the result.

### Poise, stagger and perfect guards

Every enemy has poise. Each of your hits reduces it by the damage of that hit before enemy guard is subtracted (Shield bash ×2, Bell Clapper ×1.5). At zero the enemy is **staggered**: it loses its next action — the intention is skipped, not delayed — and takes ×1.5 hit damage (×2 with the Executioner’s Chime) until it next acts. Poise then refills at 130% of its previous maximum, rounded up, and cannot be worn while the enemy is staggered.

A **perfect guard** is an attack whose whole damage was absorbed by your guard. It wears poise by the amount blocked. If that breaks poise, the enemy loses its following action and stays exposed until the action after that.

### Actions

| Action                      | Effect                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Strike                      | Deal attack; +1 focus. Wayfarer heals 2. Costs thorns health against thorned enemies (never the last point). |
| Guard                       | Gain `9 + armor` guard (Seer +4); +2 focus.                                                                  |
| Flask                       | Restore 16; remove frost and weakness. Refused at full health with neither.                                  |
| Warden · Sundering blow (3) | `2 × attack + 3` damage; +5 guard.                                                                           |
| Warden · Shield bash (2)    | Damage equal to her Guard value; double poise damage. Not a Strike.                                          |
| Seer · Starfire (3)         | `2 × attack + 7`, ignoring guard and plating.                                                                |
| Seer · Foresee (2)          | Guard equal to the incoming damage. Refused when nothing is incoming.                                        |
| Wayfarer · Nightbloom (2)   | `attack + 2` damage; +5 poison.                                                                              |
| Wayfarer · Quicken (2)      | The enemy takes twice its poison stacks at once; stacks remain. Refused without poison.                      |

Weakened hits deal 75%, rounded down; stagger multiplies next, rounded down; plating then subtracts (minimum 1).

### Enemies

The bestiary in `src/game/bestiary.ts` is the single source of every enemy’s health, poise, pattern, traits and second phase; scouting and the codex read the same data. Traits: **thorns N**, **regrowth N**, **plated N**. Intentions may carry `hits`, `guard`, `heal`, `drain`, `fury` (added permanently to every later hit), `weak` and `frost`.

### Relics, lessons, traders, scenes

After a victory choose one of three relics or recover 12 health. Offers are drawn without repetition from the relics this expedition can find and the keeper does not carry, weighted by rarity: battles 60/33/7 (common/uncommon/rare), elites 12/50/38, guardians 0/45/55, traders 40/40/20, scene gifts 45/40/15. The draw uses integer arithmetic on the seed only. Relic effects are exactly their descriptions in `RELICS`.

After the first and second bell choose one of three lessons (each keeper has four; the seed hides one for the first choice). Traders stock three relics (40 / 55 / 75 coins by rarity) besides a flask (14), 20 health (18) and +2 attack (35); each once per visit. Sanctuaries offer rest (20 health), a flask, or +2 attack for 30 coins. Scenes have two or three options with every cost and reward stated; an option is refused if it cannot be paid in coins, flasks, health (at least 1 must remain) or maximum health.

### Dusk

A chosen level 0–8 applies all rules up to that level: (1) enemies +10% health; (2) elites and guardians hit 2 harder; (3) one starting flask; (4) poise +25%; (5) every enemy hits 1 harder; (6) rest restores 6 less; (7) trader prices +20%; (8) enemies a further +15% health and guardians begin with 2 fury. Completing an expedition at a keeper’s deepest open level opens the next.

### The Atlas as a day's walk (v0.8)

Ruleset-3 Atlas expeditions count days. One day's lamp oil is a distance in real metres: a seventh of the shortest road through all twelve encounters, never less than the chart's longest single road, rounded up to 100 m. Walking a road spends its length; a road longer than the remaining oil cannot be started. Entering an encounter, gathering a gift and naming the city cost no oil.

**Make camp** starts the next day with full oil. At dawn each Dawnwell restores 2 health and each Cinder Kiln pays 4 coins; on these charts waylights do not also pay when an encounter is entered. Each night adds 2% health to every enemy not yet fought, to a maximum of 30%; scouting shows the current figure. Completing the expedition before day 12 scores 15 per day to spare.

Five **wayside finds** lie on five different roads chosen by the seed: two purses (+14 coins), two bundles of herbs (restore 8 health) and one oil flask (a third of a day's oil, today only). A find is gathered the first time its road is walked, in either direction.

The **route planner** (`atlasRoute`) returns the shortest route over roads the keeper knows — roads already walked and roads whose both ends are charted. `atlas-walk` follows it one road at a time and stops where the oil runs out. Atlas journals begun before v0.8 have no day counter and keep free walking.

#### The hearth-wagon (v0.9)

Each evening, **Make camp** opens one choice, never both: build one of six works onto the wagon, or rest by its fire for 8 health. A work is built once, paid for in coins, and stays for the expedition. The next day then dawns.

| Work             | Cost | Effect                                                   |
| ---------------- | ---- | -------------------------------------------------------- |
| The iron stove   | 20   | Every dawn restores 4 health.                            |
| The dew-still    | 25   | Every dawn fills one flask, if you carry fewer than two. |
| The whetwheel    | 35   | Gain 2 attack at once.                                   |
| The lamp-rack    | 20   | A day’s lamp oil carries you a quarter farther.          |
| The toll-box     | 30   | Every dawn collects 6 coins.                             |
| The ward-lantern | 40   | Only every second night toughens your enemies.           |

At dawn the lamp oil is refilled (to the rack's longer day, if built), then waylights and works pay: each Dawnwell restores 2 health, the stove 4, each Cinder Kiln pays 4 coins, the toll-box 6, and the dew-still fills a flask if fewer than two are carried. A work built tonight pays at the very next dawn. With the ward-lantern only every second night (rounded up) counts toward the 2% health gained by enemies not yet fought.

### Free order and guarded troves (v0.10)

On Atlas charts begun from v0.10 the three encounters of a realm may be entered in any order; the realm's bell guardian opens only when all three are done, and later realms stay sealed until it falls. `atlas.done` records the sites entered in order, and a journal is accepted only if that list replays as a legal sequence (each site open when entered; path, position and bells agreeing). Charts begun earlier keep the strict order.

On those charts the three side sites are **guarded troves**. A trove cannot be gathered; from its site the keeper may _challenge_ its guardian, an ordinary enemy of the realm reached so far (scoutable; toughened by nights like any enemy). Winning grants the site's old gift (18 coins; a flask; 12 health and +1 attack) and a choice of three relics drawn with elite weights, or 12 health. A trove fight does not advance the road, pays no battle coins, frees no waylight and never offers a lesson. Losing it ends the expedition like any fight.

### Records

`src/game/meta.ts`. Score = 10 per crossing + 150 per bell + 40 per elite + 5 per stagger + 3 per perfect guard + 100 for naming an Atlas city + (on completion) 300 and 2 per remaining health, all multiplied by `1 + 0.2 × dusk`. Deeds are judged on every saved step; twelve of them add one relic each to the pool of future expeditions. Records never change a keeper’s starting statistics. Unreadable records in a journal are dropped without rejecting the journal.

---

# Rulesets 1 and 2 (earlier journals)

Before v0.7, new expeditions used ruleset 2. Imported or resumed version 1 expeditions keep the classic ruleset for their entire run. Base actions, chapter structure, relics, bosses, and prices are shared; the new waylights, lessons, and lane patterns below apply only to ruleset 2.

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
