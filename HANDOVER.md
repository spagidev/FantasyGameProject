# Emberwake · Roads Rekindled checkpoint (v0.2.0)

## Standing instructions and stop signal

The user wants autonomous development of an attractive, replayable, turn-based fantasy browser game, with original lore and explicit rules, and pre-approves PR merges. They requested broad inspiration from Heroes of Might and Magic III, without copying exact content. Do not publish cloud environment configuration without a new request.

The user requests a safe stop above 90% five-hour quota usage or 97% weekly usage. No reliable quota-status tool is exposed; discovery has been checked repeatedly. The user reported 51% at the beginning of this enhancement session. Their latest reply is **“8% save your work now”**. This is an explicit instruction to stop feature work and save immediately, regardless of whether that percentage describes usage or remaining allowance. Resume new development only when the user asks. Do not invent quota readings.

## Implemented

The First Crossing remains a complete twelve-encounter campaign through three realms, with three keepers, deterministic guard/focus/poison combat, connected seeded routes, stories, camps, traders, six relics, two endings, and a persistent nine-entry chronicle. Responsive original SVG artwork, local fonts, keyboard controls, native dialogs, autosave, and portable validated journals are included. No accounts, purchases, timers, telemetry, or external runtime services.

**Roads Rekindled (v0.2):**

- The first battle in each realm guards a **waylight**: Dawnwell (heal 2 per later crossing), Cinder Kiln (4 coins per later crossing), or Moth Observatory (+1 opening focus, capped at 5). Ownership stacks and lasts one expedition. Only legal player-initiated travel pays benefits; no idle rewards.
- After each of the first two boss rewards, pick an unlearned **keeper lesson**. Three per keeper, nine total; two per run. Effects specialize defense, focus, skill damage, poison, healing, or victory supplies.
- **Free scouting** of any map node shows exact repeating intentions, rewards, and site benefits. Only reachable next-depth nodes permit travel.
- Normal enemy lanes and elites have distinct deterministic patterns. Boss patterns are unchanged.
- Shared engine helpers calculate UI skill/guard/focus/healing values.
- Relics, sites, and lessons appear in a shared supplies panel below the main game area, keeping the desktop sidebar compact and mobile vitality near combat.

## Research

Read `docs/DESIGN_RESEARCH.md`. It contains pinned links to VCMI documentation/source actually inspected, limitations, and the mapping to independent Emberwake mechanics. Community wiki, Wikipedia, and GOG reads were blocked by the network proxy. The references establish technical mechanics; explanations of enduring appeal are explicitly design hypotheses, not player-retention research. No code or assets from Heroes III or VCMI were copied. The temporary read-only research checkout is `/tmp/emberwake-research/vcmi`; it is not a project repository.

## Saves and compatibility

Current payload format: **2**, storage key `emberwake.save.v2`. If absent, the loader checks `emberwake.save.v1`, validates and normalizes it, and preserves the original slot as a backup. Version 1 expeditions receive `ruleset: 1` and keep their exact turn, health, enemy, inventory, profile, original future patterns, and original progression. They do not gain sites or lessons. New runs use `ruleset: 2`. Both formats can be imported; exports use format 2 while preserving the campaign's ruleset. A fixed original-format journal fixture lives in `tests/fixtures/v1-journal.json`.

## Validation

- **38 engine/storage/strategy tests passed**, including all nine lesson effects, income timing, caps, invalid actions, migration, and classic campaign completion.
- **13/13 full browser tests passed** after feature implementation: three full campaigns and both endings, two lessons/three waylights per new campaign, elite/trader purchases, journal portability, exact reload, v1 migration/backup, scouting reachability, mobile layout, blocked/corrupt storage, keyboard controls, and accessibility checks.
- **90/90 simulation campaigns won** across 2 rulesets × 3 keepers × 3 route plans × 5 fixed seeds. `npm run balance` regenerates `docs/BALANCE_REPORT.json`; each keeper/route group must have at least one winning seed. This is a strong search player, not novice feedback. The campaign is forgiving under that policy; do not call it balanced or addictive without human playtests.
- Production TypeScript/Vite build passed after the final supplies-panel layout polish. Small label-contrast issues uncovered by that layout were corrected. The five affected browser checks (lobby, combat/save-resume, mobile, scouting, classic migration) then passed 5/5 in 9.3 seconds. Formatting and diff checks passed before the final commit.
- New desktop map/scouting and mobile screenshots were inspected. Latest optional captures are under `/tmp/emberwake-v02-*.png`. The README image still represents the first release's visual style.
- No public hosting deployment or remote CI result is claimed.

## Commands and environment

Use the existing checkout `/workspace/FantasyGameProject`; no worktree is needed. Node 24.22.1, npm 11.9.0, system Chromium `/usr/bin/chromium`.

```sh
cd /workspace/FantasyGameProject
npm ci --cache /workspace/.npm-cache
npm run dev -- --port 5173
npm run check
npm run format:check
npm run balance  # optional; regenerates the tracked report, ~25 seconds
```

The default home npm cache is not writable in the cloud sandbox. The Vite development server was running on port 5173; restart it in a future instance. CI installs Playwright Chromium, and local tests use system Chromium when present. No new environment configuration draft was saved or published.

## Remote history

Normal HTTPS Git reads and pushes work. GitHub API access through `gh` returned Forbidden, so no PR creation or CI status is claimed. Existing remote checkpoint before this enhancement: `1b28ac3`. Research was committed locally as `10dfef7`. The implementation checkpoint is committed with the message “feat: deepen expeditions with waylights, scouting, and keeper lessons”; inspect `git log` and compare `git rev-parse HEAD` with `git ls-remote origin refs/heads/main` for its exact hash. Never force-push.

## Next useful work after the user resumes

1. Human playtest the new route/lesson choices, especially whether the site economy is clear and whether the campaign needs an optional harder mode. The automated policy wins every sampled run.
2. Expand chapter-specific narrative scenes and enemy identity. Avoid new currencies or a large army/town system before validating existing choices.
3. Add focused browser checks for the lesson-selection screen, including save/reload before choosing and each keeper's upgraded action text. Engine effects and full-run browser progression are already covered.
4. Preserve the v1 fixture and migration tests in every future format change.

## Handover prompt

> Resume autonomous development of Emberwake in /workspace/FantasyGameProject. Read HANDOVER.md, docs/LORE.md, docs/RULES.md, docs/DESIGN_RESEARCH.md, and docs/ROADMAP.md. Inspect Git status/log and preserve existing work. The previous session stopped because I explicitly said “save your work now”; I now authorize continuation. Check any available five-hour and weekly quota status, save regular tested checkpoints, and stop above 90%/97% respectively. The user pre-approves PR merges. Continue broad strategic inspiration without copying Heroes III content or VCMI code/assets. Maintain original lore, deterministic visible rules, local saves, classic-run compatibility, accessibility, and visual quality. Do not publish cloud environment configuration. Start from the next useful work in this handover rather than rebuilding completed features.
