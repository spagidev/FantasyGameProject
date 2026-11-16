# Emberwake round two · The Living Map (v0.8)

Round one (`IMPROVEMENT_PLAN.md`) fixed the fight. This round fixes the journey around it. The brief: make the game intuitive, captivating and enjoyable, taking inspiration — not rules, names or assets — from **Heroes of Might and Magic III** and from **OpenStreetMap as Mapy.com presents it**.

## What still falls short after v0.7

| #   | Observation                                                                                                        | Consequence                                               |
| --- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| 1   | On the Lost Atlas, walking is free and one road at a time. You press “north · 602 paces” buttons until you arrive. | The real map is scenery, not a decision. It is also slow. |
| 2   | The three side gifts are always worth fetching, because nothing is spent to fetch them.                            | No trade-off, so no exploration _choice_.                 |
| 3   | A chart is forgotten when the run ends. Sixteen real cities, and nothing records which you have walked or named.   | The most distinctive feature has no long-term pull.       |
| 4   | 21 enemies share four tinted portraits; relics are line icons; story scenes have no picture.                       | The new content does not _look_ new.                      |
| 5   | Status chips explain themselves only on mouse hover.                                                               | Phone players cannot learn what Fury or Plated means.     |
| 6   | Action titles show base damage (“Deal 7”) while the result line shows the true figure.                             | Two numbers for one thing.                                |
| 7   | A won fight cuts straight to the reward screen.                                                                    | The best moment of a fight has no beat.                   |

## What we borrow, and how it becomes Emberwake’s own

**From Heroes III — the adventure map as the game’s clock.** A hero has movement for the day; the map is strewn with things worth a detour; mines pay every morning; time matters. In Emberwake:

- **Lamp oil.** A keeper walks a fixed distance of real road per day (the chart’s true metres). When the oil runs low she makes camp, and a new day dawns.
- **Dawn pays.** Rekindled waylights pay at dawn on the Atlas (health, coins), like a mine — the earlier you free one, the more mornings it pays.
- **Night costs.** Each night the dark gathers: enemies not yet fought grow slightly tougher, and the score rewards arriving in fewer days. Camping is never free, never fatal.
- **Things on the road.** Seeded wayside finds lie on the roads themselves — a purse, a spring, a cairn of whetstones — collected by walking that stretch. Detours now cost daylight, so they are choices.

**From OpenStreetMap and Mapy.com — the map as a tool you trust.** Mapy.com’s strength is the outdoor map: marked trails, clear pictograms, and a planner that answers “how far, how long” before you set off. In Emberwake:

- **A route planner.** Select any charted landmark: the shortest known route is drawn on the map with its distance, walking time and whether today’s oil reaches it. One button walks it.
- **Waymarks.** Roads you have walked are painted with trail blazes in the manner of Central European hiking marks; landmarks get pictogram pins.
- **Real units.** Distances in metres and kilometres, walking time at 4 km/h, a proper scale bar.
- **The atlas passport.** Every real city you chart is stamped in the Chronicle: walked, completed, named. After naming a city, links open the same place on OpenStreetMap and Mapy.com.
- Attribution and the ODbL data download stay exactly where they are.

## Work

1. **Art pipeline with fallbacks.** Portraits per enemy, painted relic icons, map pictograms and scene illustrations are loaded from `src/art/**` when present and fall back to today’s graphics when not. `docs/ART_BRIEF.md` is a self-contained brief for an image-producing agent.
2. **Atlas engine v2.** Days, lamp oil, camp, dawn income, gathering night, wayside finds; route planning in the engine (`atlasRoute`) so tests and interface share it. Earlier Atlas journals continue without days.
3. **Atlas interface.** Planner, blazes, pins, day and oil meter, kilometre labels, passport tab, real-map links.
4. **Clarity.** Tap-to-explain glossary for every chip, effective numbers on action titles, a short victory beat with the spoils.
5. Tests for all of it; rules, README and handover updated.

## Not in this round

Free-order encounters on the Atlas (the bell wards keep the story in order), new keepers, multiplayer, any server-side records.
