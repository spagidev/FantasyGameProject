# Emberwake · safe checkpoint

## User goal and standing authorization

Build and improve a simple, attractive, replayable turn-based fantasy browser game. Establish the lore first, keep the rules logical and explicit, and pursue implementation autonomously. The user pre-approves PR merges. Do not publish cloud environment changes without a new request.

The user asks to stop at a saved checkpoint if five-hour quota usage exceeds 90% or weekly usage exceeds 97%. No quota/usage-status tool or reliable remaining-quota signal is exposed in this session; tool discovery has been checked repeatedly. Do not invent usage numbers. Commit regularly and preserve this handover if a limit becomes visible.

## Current implementation

The First Crossing is a complete campaign with three keepers, twelve encounters across three realms, explicit enemy intentions, guard/focus/poison combat, connected seeded routes, stories, camps, traders, six relics, two endings, and a persistent nine-entry chronicle. There are no timers, accounts, purchases, or required external runtime services. Original SVG landscapes/characters and bundled local fonts work on desktop and mobile.

- Start with `docs/LORE.md` and `docs/RULES.md`.
- Pure game transitions: `src/game/engine.ts`.
- Browser save validation and run-count accounting: `src/game/storage.ts`.
- UI: `src/App.tsx`, `src/components/`, `src/styles.css`.
- Versioned local save: `emberwake.save.v1`.
- `docs/ROADMAP.md` lists useful follow-up work and design boundaries.

## Environment and commands

Existing checkout: `/workspace/FantasyGameProject`. Use it directly; no new worktree is needed. Node 24.22.1, npm 11.9.0, system Chromium `/usr/bin/chromium`.

```sh
cd /workspace/FantasyGameProject
npm ci --cache /workspace/.npm-cache
npm run dev -- --port 5173
npm run check
npm run format:check
```

`npm`'s default home cache is not writable in the cloud sandbox; use the workspace cache when installing. The browser tests fall back to Playwright's installed Chromium on systems without `/usr/bin/chromium`. GitHub CI installs it explicitly.

## Validation evidence

- 22 engine/storage/campaign tests passed, including legal victories with all three keepers.
- Production TypeScript/Vite build passed.
- Complete browser suite: 9/9 passed, including all three full campaigns, both endings, exact save/resume, mobile layout, corrupt/blocked storage handling, keyboard turns, dialog focus, and automated WCAG A/AA checks for lobby/combat.
- Desktop and mobile screenshots were visually inspected.
- Runtime dependency audit found no vulnerabilities.
- Formatting check passes. Chronicle contrast fixes receive a targeted browser accessibility check.

These demonstrate the implemented campaign works; they do not establish perfect balance or novice usability. The test player's bounded search is not human playtest feedback. No public hosting target has been deployed.

## Remote state

The repository initially had no commits or remote branches. Read-only HTTPS Git access works. GitHub API access via `gh api repos/spagidev/FantasyGameProject` returns Forbidden; `gh auth status` reports its supplied token unusable. Do not print or extract credentials. Test the scoped Git push before assuming it shares the API restriction. Record the actual push result and commit below before ending the session.

## Continuation prompt

> Continue autonomous development of Emberwake in `/workspace/FantasyGameProject`. Read HANDOVER.md, docs/LORE.md, docs/RULES.md, and docs/ROADMAP.md; inspect git status/log and preserve existing work. Check whether reliable five-hour/weekly quota status is now available, stopping above 90%/97% respectively at a tested, committed checkpoint with an updated handover. The user pre-approves PR merges. Do not publish cloud environment changes. Run the existing checks, then tackle the next useful roadmap item, maintaining the deterministic rules, local saves, accessibility, and visual quality. Do not ask routine implementation questions. If GitHub access is blocked, keep progressing locally, commit changes, and report the precise external blocker.
