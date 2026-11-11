# Emberwake roadmap

## Milestone 1 · The First Crossing

A complete, local-first campaign: original world, exact rules, three keepers, three realms, deterministic combat, seeded connected routes, story/economy encounters, six relics, persistent lore, endings, responsive illustrated UI, and automated gameplay validation.

## Next useful improvements

1. **Playtest the decisions.** Gather human feedback on combat clarity, difficulty, and route incentives. Run a seed/keeper balance matrix and record results before adjusting stats. The bounded test player proves legal winning paths; it is not evidence of novice difficulty or overall balance.
2. **Expand encounter variety.** Add several chapter-specific stories and ordinary enemy patterns, keeping costs and intentions exact. Avoid adding currencies before the existing decisions are interesting.
3. **Clarify the moment-to-moment experience.** Improve damage feedback, keyboard discovery, mobile map readability, and the explanation of guard/focus interactions. Keep reduced-motion support and verify all changes with real browser tests.
4. **Save portability.** Add validated export/import and migration tests so players can keep their stories across browsers. Never silently clear a compatible save when changing content.
5. **Optional atmosphere.** User-initiated, muted-by-default ambient sound and richer local artwork. The game must remain playable without audio or external network services.
6. **Static hosting.** Choose a public hosting target if requested. The built application needs no backend. Deployment and real public availability must be reported only after verification.

## Design boundaries

- No timers, daily obligations, real-money mechanics, or punishments for leaving.
- No invisible combat randomness. Show the consequences before commitment.
- No permanent power grind. Returning players earn perspective and variety.
- Keep runs short, the choices legible, and the world specific.

## Autonomous-work continuity

The user authorizes ongoing implementation and PR merges. Establish tested, committed checkpoints regularly and update the handover before ending a session. Check any available quota status periodically; stop at a safe checkpoint if five-hour usage exceeds 90% or weekly usage exceeds 97%. If quota telemetry is not available, say so; do not fabricate percentages or promise automatic stopping at an unobservable threshold. Do not publish cloud environment configuration unless separately asked.
