# Emberwake improvement plan · The Long Night (v0.7)

Written 2026-11-15 after reading the whole codebase, playing the v0.6 build in a browser, and simulating 1,800 campaigns against the v0.6 engine. The goal: make the game **more logical, more playable and worth replaying**, without breaking the existing design boundaries (no timers, no hidden rolls, no paid mechanics, no permanent power grind, old journals keep working).

## 1. Diagnosis of v0.6

Measured with the real engine (`newRun` + `transition`), 200 seeds per keeper:

| Simple player                      | Warden | Seer | Wayfarer | Combat turns in a whole campaign |
| ---------------------------------- | ------ | ---- | -------- | -------------------------------- |
| Strike only                        | 0 %    | 0 %  | 0 %      | ~12                              |
| Skill when affordable, else Strike | 37 %   | 3 %  | 21 %     | ~20                              |
| …plus an emergency flask           | 56 %   | 9 %  | 60 %     | ~27                              |

What this and a hands-on session show:

| #   | Problem                                                                                                                                                                                                                                                                                | Why it hurts                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | **Fights last 2–3 turns.** A whole campaign is ~25 combat clicks. Enemy patterns have three steps and almost never loop, so “read the pattern” — the central promise — is never exercised.                                                                                             | No tactical arc, no tension, nothing to master.    |
| 2   | **One solved line.** Guard the heavy hit, Strike otherwise, Skill at 3 focus. There is no second question to answer in any turn.                                                                                                                                                       | Every fight plays identically.                     |
| 3   | **No enemy identity.** All ordinary enemies share one of three lane patterns; names are cosmetic.                                                                                                                                                                                      | Nothing to learn or recognise.                     |
| 4   | **No build variety.** Six relics, a relic after every fight: by the last realm every run owns the same set. Lessons are flat +numbers.                                                                                                                                                 | The 2nd run is the 1st run.                        |
| 5   | **No route variety.** Every seed has the same layout: battle → elite/story → trader/camp → boss, in the same lanes. Only three story scenes exist.                                                                                                                                     | “A different road each time” is not true.          |
| 6   | **Broken economy.** Coins only matter on the centre lane (trader) or for one camp upgrade; elsewhere they pile up unused.                                                                                                                                                              | A currency with nothing to buy is not a decision.  |
| 7   | **Nothing to come back for.** Nine chronicle pages, all obtainable in two wins. No score, no harder mode, no goals, no records.                                                                                                                                                        | No reason for a third run.                         |
| 8   | **Balance cliffs.** The Seer wins 9 % of simple runs where the others win ~58 %.                                                                                                                                                                                                       | One keeper feels unfair, two feel easy.            |
| 9   | **Weak feedback.** Numbers change silently: no hit feedback, no preview of what an action will actually do, the result of a turn must be read from a log in the sidebar.                                                                                                               | Hard to learn, not satisfying.                     |
| 10  | **Layout wastes the screen.** During play a large decorative headline pushes the board down; on a 1360×800 laptop the action buttons are below the fold, and on a phone half the first screen is chrome.                                                                               | You scroll every turn.                             |
| 11  | **Illogical details.** Guard pays more focus than attacking with no risk; unused guard, coins on dead lanes, “relic or heal” when all relics are owned, a trader and a camp that both sell the same attack upgrade at different prices; Atlas walking is free so detours cost nothing. | Rules that do not hang together read as arbitrary. |

## 2. Design pillars for v0.7

1. **Every turn asks a real question.** Longer fights, enemies with identities, and one new interlocking system (poise) that makes _when_ you hit as important as _how hard_.
2. **Still no hidden rolls.** Everything stays deterministic and previewed. Variety comes from seeded content, not dice.
3. **Runs differ, builds differ.** More relics than one run can hold, with synergies; seeded route layouts; many more story scenes.
4. **Mastery, not grind.** Returning players get harder nights, records, goals and _new toys_ — never bigger starting numbers.
5. **Respect what exists.** Version 1 and 2 journals load and continue under their own rules. The Lost Atlas keeps its geography and gains the new combat.

## 3. The plan

### Phase 1 · A deeper engine (ruleset 3)

- **Poise and stagger.** Every enemy has a visible poise bar. Hit damage wears it down; when it breaks the enemy is _staggered_: it loses its next action and takes +50 % hit damage until it acts again, then recovers with tougher poise. Breaking on the heavy blow instead of on a harmless turn is the new core timing skill.
- **Perfect guard.** Fully absorbing an attack turns the blocked damage into poise damage. Guard stops being a passive pause and becomes a way to set up a break.
- **A second technique per keeper.** Warden _Shield bash_ (hits for her guard value, double poise damage), Seer _Foresee_ (guard exactly the incoming blow), Wayfarer _Quicken_ (poison triggers twice now). Five actions, each the right answer somewhere.
- **A real bestiary.** ~21 enemies with their own patterns and traits (multi-hit, thorns, frost, weakening, self-buffing, healing), two elites per realm, and bosses with a second phase at half health. Fights last 5–9 turns.
- **26 relics with rarities and synergies** (poison-on-guard, carry-over guard, cheaper skills, stagger payoffs, once-per-run survival…), offered three at a time; elites and guardians offer better ones.
- **Seeded routes.** The middle of every realm is laid out by the seed: second fights, elites, stories, camps and traders move between lanes, with a guaranteed safe option before each guardian.
- **Twelve story scenes** with conditional options, and matching chronicle pages.
- **An economy with sinks.** Traders stock three seeded relics alongside supplies; camps keep rest / brew / temper.
- **Legacy preserved.** Rulesets 1 and 2 keep their exact rules, tests and saves.
- Balance by simulation: three scripted player skill levels × three keepers × many seeds, recorded in `docs/BALANCE_REPORT.json`.

### Phase 2 · A board you can read and feel

- Compact in-run header so the whole fight fits on one laptop screen and one phone screen.
- **Exact previews on every action** (computed by the real engine): damage dealt, damage taken, kills, breaks.
- Poise bar, status chips, “now / next” intent strip.
- Floating damage numbers, hit flashes, stagger and perfect-guard call-outs (disabled under reduced motion).
- Keyboard throughout: 1–5 in combat, 1–3 and Enter on choices.

### Phase 3 · Reasons to return

- **Score** with a visible breakdown and per-keeper bests.
- **Dusk levels** (0–8): each win unlocks a harder night for that keeper, every modifier listed before you start.
- **Deeds**: ~20 goals; each unlocks a relic or story for future runs (variety, never power).
- **Codex**: relics found, enemies defeated with their patterns, run history, records.
- **Today’s road**: an optional date-seeded run to compare against your own best. No streak penalties.
- One-click “walk again”.

### Phase 4 · Atmosphere and coherence

- Opt-in synthesized sound (muted by default): strikes, guards, breaks, and a bell for every guardian.
- First-run guidance inside the first fight instead of a wall of text.
- Atlas: new combat, relics and scenes on the existing charts.
- Rewrite `RULES.md`, README, handover and “How to play” to match; keep all tests green.

## 4. What is deliberately not in scope

- No card/deck system, no multi-enemy targeting: the five-action duel is the game’s identity and stays readable on a phone.
- No new painted artwork (existing portraits are re-used with tints for new enemies).
- No accounts, servers, leaderboards or telemetry. Records are local and editable, as before.

## 5. Order of work and checkpoints

Each phase ends in a tested, pushed commit: unit tests → strict build → browser tests. Phase 1 lands first because everything else presents it.
