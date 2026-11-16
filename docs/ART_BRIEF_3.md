# Art brief 3 for Emberwake v0.11

A self-contained task for an agent that can generate images and commit files. **Image files only.** The game already loads these by name and falls back to a line icon when one is missing.

---

## PROMPT (copy everything below this line)

You are working in the repository `spagidev/FantasyGameProject` (the browser game **Emberwake**), starting from the `main` branch. Create **only** the eight image files below in `src/art/relics/`, plus one line appended to `src/art/NOTICE.md`. Do not change, rename or delete any other file.

**Style.** Open `src/art/relics/vigil.webp`, `src/art/relics/thread.webp`, `src/art/relics/clapper.webp` and `src/art/relics/ferrycoin.webp` first and match them exactly: one painted object, centred, filling about 80% of the frame, soft warm rim-light, painterly dark-fairy-tale style, forest green / parchment / copper / candle-gold palette. Readable at 32 px. **No text, letters, numbers, frames or drop-shadow boxes.** Original work only.

**Technical.** WebP with transparent background, **128 × 128 px, ≤ 6 KB each**, total under 50 KB. Commit only the final files.

| File                | Object                                                                               |
| ------------------- | ------------------------------------------------------------------------------------ |
| `offcut.webp`       | A curled offcut of beaten gold, as trimmed from a crown, with one small set stone    |
| `spa.webp`          | A stoppered clay flask beaded with warm condensation, a wisp of steam at the neck    |
| `wellrope.webp`     | A coil of old well-rope with a small wooden bucket handle tied at one end            |
| `chapelstone.webp`  | A squared cornerstone block with a carved cross, moss on one edge                    |
| `wire.webp`         | A tinker’s coil of bright wire twisted around a pair of small pliers                 |
| `clapperboard.webp` | A miners’ wooden clapper board with its striking mallet, a copper coin beside it     |
| `joinery.webp`      | Two wooden beams locked in a dovetail joint, no nails, grain clearly visible         |
| `window.webp`       | A small arched cathedral window panel glowing warm gold from behind, a grape tendril |

Append to `src/art/NOTICE.md` one line stating that eight province relic icons were generated for Emberwake v0.11 in the same manner as the earlier illustrations. Work on a new branch `art/v0.11-relics` and open a pull request to `main` titled “art: v0.11 province relics”, listing the files and total size. Before finishing, verify every name, the 128 × 128 size, transparency, the 6 KB ceiling, and that `git status` shows no modified source files.
