# Art brief 2 for Emberwake v0.9

A self-contained task for an agent that can generate images and commit files. **Image files only.** The game already loads these by name and falls back gracefully when one is missing.

---

## PROMPT (copy everything below this line)

You are working in the repository `spagidev/FantasyGameProject` (the browser game **Emberwake**), starting from the `main` branch. Create **only** the image files listed below, in the exact folders named, plus one line added to `src/art/NOTICE.md`. Do not change, rename or delete any other file (including `.gitkeep` files).

### Style

Open `src/art/sites/camp.webp`, `src/art/sites/well.webp`, `src/art/relics/vigil.webp`, `src/art/scenes/smith.webp` and `src/art/foes/pilgrim.webp` first. Match them exactly: painterly, hand-illustrated dark-fairy-tale fantasy; forest green, moss, warm parchment, antique copper and candle-gold with small ember-orange accents; melancholy, quiet, kind. **No text, letters, numbers, watermarks, signatures, borders or frames.** Original work only.

### Technical rules

WebP only. Icons: lossless or high-quality WebP **with transparent background**. Paintings: lossy WebP around quality 72. Exact pixel sizes and size ceilings per group below. Everything you add must total **under 600 KB**. Commit only the final WebP files.

### 1. Wagon works → `src/art/works/` — 6 files, 128 × 128 px, transparent, ≤ 6 KB each

Single painted objects that could be bolted onto a small travelling wagon; same treatment as the map pictograms in `src/art/sites/`.

| File             | Object                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| `stove.webp`     | A small pot-bellied iron stove made from an old bell, door glowing      |
| `still.webp`     | A copper dew-still with a coiled tube dripping into a flask, two moths  |
| `wheel.webp`     | A foot-treadle whetstone wheel throwing a few sparks                    |
| `rack.webp`      | A wooden rack hung with six small lit lanterns                          |
| `strongbox.webp` | A wooden toll-box with a coin slot and a little brass bell on top       |
| `ward.webp`      | A tall ward-lantern on a pole, its glass etched, giving cool pale light |

### 2. Province crests → `src/art/provinces/` — 8 files, 160 × 160 px, transparent, ≤ 9 KB each

Heraldic-feeling emblems without shields' lettering: one clear painted motif inside a simple round or lozenge field, as if stamped in a traveller's passport. They must read at 48 px.

| File         | Province and motif                                                                |
| ------------ | --------------------------------------------------------------------------------- |
| `SK-BL.webp` | The Reedmarch — a plain crown resting among river reeds                           |
| `SK-TA.webp` | The Belled Plain — three slender spires over a steaming spring                    |
| `SK-TC.webp` | The Castled Narrows — a castle on a cliff above a river, a well-rope hanging down |
| `SK-NI.webp` | The Old Seat — a small round stone chapel on a hill                               |
| `SK-ZI.webp` | The Tinkers’ Fells — a mended pot bound in wire against steep green hills         |
| `SK-BC.webp` | The Copper Heart — crossed miner’s hammer and pick over a wooden clapper board    |
| `SK-PV.webp` | The Wooden Spires — a shingled wooden church spire beneath a high peak            |
| `SK-KI.webp` | The Eastern Lantern — one lit cathedral window with a vine of withered grapes     |

### 3. Paintings → `src/art/scenes/` — 4 files, 720 × 405 px, ≤ 36 KB each

Wide, atmospheric, subject right of centre, calmer and darker on the left third. No one looking at the viewer.

| File                    | Scene                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `wagon.webp`            | A small covered hearth-wagon at dusk beside a road, a stove-pipe smoking, lanterns lit, no people      |
| `journal-warden.webp`   | An open journal on a great wooden door laid flat as a table, a ring of old keys beside it, candlelight |
| `journal-seer.webp`     | An open journal of hand-drawn star charts under a brass astrolabe, a window showing a starless sky     |
| `journal-wayfarer.webp` | An open journal beside a courier’s satchel spilling sealed letters, one pressed flower, on a milestone |

### 4. Provenance and delivery

Append one line to `src/art/NOTICE.md` stating that the works, province crests and four paintings were generated for Emberwake v0.9 in the same manner as the earlier illustrations. Work on a new branch `art/v0.9-illustrations` and open a pull request to `main` titled “art: v0.9 illustrations”, listing the number of files per folder and the total size. Before finishing, verify every file name, pixel size and size ceiling, that the total is under 600 KB, and that `git status` shows no modified source files.
