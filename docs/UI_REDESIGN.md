# Emberwake · The illuminated atlas (v0.5)

## Direction

Make the game feel like a carefully illustrated field atlas: warm paper, dark forest ink, antique copper, generous serif typography, human character portraits and original painted world art. Use quiet ornament and material contrast to give the interface identity. Make the actual next decision more prominent than atmospheric copy.

## Interaction plan

- A cinematic, illustrated opening introduces the world; a direct prepare action leads into the expedition builder.
- Keep both campaign types, region input, all eight Slovak shortcuts, offline chart, all three keepers, seed input, errors and cancellation. Organize setup into numbered journey/keeper/departure sections, with useful character information beside the portraits.
- During a run, shorten the introduction into a context header. Give the map/encounter most of the space, with keeper condition and the field journal beside it. On mobile put condition before the board and keep it visible while choosing actions.
- Put the Atlas objective above the chart. Preserve fog, scale, north, zoom, source attribution/download, landmarks, roads, scouting, wards, gifts, clues, recognition and comparison link.
- Improve the combat arena, exact enemy intent and action cards; preserve keyboard shortcuts, values and disabled states. Maintain all stories, shops, camp options, rewards, talents, endings and inventories.
- Treat the Chronicle as a collection of recovered book pages; restyle journal import/export and all dialogs with clear type, comfortable controls and reliable focus behavior.
- Consolidate the accumulated stylesheet into a coherent responsive design system. Keep visible focus, touch targets, contrast, reduced motion and screen-reader announcements.

## Verification

The game engine, save format, generation service and economy are outside this redesign. Existing unit and full-browser campaigns are the behavioral baseline. Inspect desktop/mobile screenshots of setup, map, combat, reward/lesson, Chronicle and dialogs; run the existing accessibility and persistence checks. Save GitHub checkpoints and publish to the same owner-only Site.

## Completed verification · 12 November 2026

- 53 unit/engine/service/storage tests pass with no rule or save-format changes.
- All 18 real Chromium cases are validated, including complete campaigns for all keepers, Atlas completion/recognition, regional setup/errors/cancellation, both journal formats and import/export.
- The new presentation case checks 17 desktop/mobile scenes for WCAG 2 A/AA accessibility and horizontal overflow, and captures screenshots for visual review. A small Atlas seal contrast failure found in the full run was corrected and the affected case passed on rerun.
- Desktop and mobile setup, route/Atlas, combat, rewards, lessons, Chronicle and dialogs were visually reviewed. No gameplay features were removed.
- Production build verifies HTML, JavaScript, API routing and every bundled WebP illustration with the correct MIME type. Fonts and art require no third-party image requests during play.
