# Emberwake rules · v1

This document is the contract for the pure state engine in `src/game/engine.ts`.

## Expedition

A run has a reproducible seed, one keeper, and 12 encounters in three chapters. Each chapter has four depths: combat, a story/elite choice, a camp/trader choice, and a mandatory boss. At each depth there are three lanes. All lanes are accessible at the first depth of each chapter; otherwise only the same or neighboring lane is reachable. Moving forward commits to that encounter. Routes never move backward. Lane affects enemies and rewards, and preview cards show the exact cost/reward or enemy before entry.

Runs start at full health, with 35 coins, two flasks, no relics, and no upgrades. Warden: 48 health, 7 attack, 2 armor. Seer: 36 health, 6 attack, 0 armor. Wayfarer: 40 health, 6 attack, 1 armor. Health is capped at max health, coins and focus never go below zero. Death ends the run immediately. A victorious final battle offers two narrative endings.

## Turn order

Combat is deterministic and turn based: no accuracy rolls, critical hits, hidden dice, or timers. A battle starts with 2 focus (maximum 5), no guard, and no poison. The enemy's next move and exact raw damage are visible. Each valid player action consumes one turn, including a flask. Invalid/unaffordable actions do nothing.

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

After a nonfinal victory choose exactly one available unique relic or recover 12 health. Three relics are deterministically offered from the remaining pool. If all are owned, only recovery remains. Final victory leads directly to the ending choice.

## Encounters and economy

Story scenes have two explicit, deterministic options. Rewards and prices appear before choosing. A choice that costs health is unavailable unless health would remain at least 1. A coin cost is unavailable when unaffordable. No scene can be farmed.

At camp choose one: heal 18, gain 1 flask (cap 5), or forge +2 attack for 30 coins. One camp action advances the route. At a trader, each of the following may be bought once per visit, then leave freely: flask 14 coins, heal 20 for 18 coins, +2 attack for 35 coins. Purchases and flasks respect caps; ineffective purchases are disabled.

## Persistence and fairness

Every successful state transition autosaves locally in the browser, alongside discovered lore, completed runs, and victories. Refreshing resumes the same encounter and seed. Saves are versioned and validated on load; incompatible/corrupt run saves are ignored without crashing. Storage failures show a warning and allow play to continue in memory. Abandoning a run requires confirmation. There is no server, account, telemetry, or paid mechanic. Local saves are editable and are not a competitive scoreboard.
