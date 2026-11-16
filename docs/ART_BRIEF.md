# Art brief for Emberwake v0.8

This file is a complete, self-contained task for an agent that can generate images and commit files. **It asks for image files only.** The game already contains the code that picks these files up; any file that is missing simply falls back to the current graphics, so partial delivery is fine.

---

## PROMPT (copy everything below this line)

You are working in the repository `spagidev/FantasyGameProject` (a browser game called **Emberwake**). Your task is **only** to create image files and put them in the exact folders named below. Do **not** change any `.ts`, `.tsx`, `.css`, `.json`, `.html` or config file. Do not rename or delete existing files. The game's code already looks for these files by name.

### 1. Look first

Open `public/art/keepers.webp`, `public/art/adversaries.webp`, `public/art/realms.webp` and `public/art/emberwake-world.webp`. Everything you make must look like it belongs with them:

- Painterly, hand-illustrated dark-fairy-tale fantasy. Soft brushwork, visible texture, no photo-realism, no anime, no pixel art, no 3D render look.
- Palette: deep forest green (`#16362f`), moss, warm parchment (`#f5f0e5`), antique copper and candle-gold (`#d7b77f`), with small accents of ember orange. Cold accents (pale blue, violet) only where a subject calls for it.
- Mood: melancholy, quiet, kind. A world without a sun, lit by embers, moths and candlelight. Nothing gory, nothing sexualised, no weapons pointed at the viewer.
- **No text, letters, numbers, watermarks, signatures, borders or UI frames in any image.**
- Original work only. Do not imitate any existing game's characters, logos or art.

### 2. Technical rules for every file

- Format: **WebP**. Lossy for paintings (quality about 72), lossless-alpha WebP for icons that need transparency.
- Exact pixel sizes and file-size ceilings are given per group. Stay under the ceiling; reduce quality before you reduce size.
- File names are lower-case, exactly as listed, with the `.webp` extension.
- Total size of everything you add must stay **under 1.5 MB**.
- If you generate larger masters, do not commit them. Commit only the final WebP files.

### 3. Enemy portraits → `src/art/foes/`

**21 files, 400 × 500 px (portrait 4:5), ≤ 32 KB each.** Head-and-shoulders or half-figure, centred, facing slightly toward the viewer's left, dark atmospheric background that fades to near-black forest green at the bottom edge (the game overlays a health bar there). Each must be clearly distinguishable from the others in silhouette and colour.

The Sunken Reach — a drowned forest village, black water, moss, moths:

| File              | Subject                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `watcher.webp`    | Drowned Watcher: a hooded, waterlogged sentry of rags and river-weed, slow and heavy, a rusted lantern long gone out.               |
| `pilgrim.webp`    | Ashbound Pilgrim: a thin walker wrapped in scorched prayer-cloth, two small embers cupped in its hands, ash drifting off its robes. |
| `revenant.webp`   | Mire Revenant: a bog-preserved figure half-sunk in peat, pale cold hands reaching, frost on the reeds around it.                    |
| `eater.webp`      | Lantern-eater: a tall thin shape made mostly of pale moths clustered where a face should be, a stolen lantern-light glowing inside. |
| `thornbound.webp` | The Thornbound (elite): an old gate-warden whom a black briar hedge has grown through; roses bloom from the armour joints.          |
| `tollkeeper.webp` | The Tollkeeper (elite): a stag-skulled ferryman's clerk with an abacus of knucklebones and a heavy ledger chained to its belt.      |
| `bellwether.webp` | The Bellwether (guardian): a great antlered stag-spirit with a cracked bronze bell hung from its neck, moss on its antlers.         |

The Glass March — an army turned to stained glass, guarding an erased border; cool light, violet and pale blue glass, lead lines:

| File             | Subject                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `soldier.webp`   | Glassbound Soldier: an infantryman of stained-glass plates and lead seams, shield raised, a candle burning inside the chest.  |
| `standard.webp`  | The Pale Standard: a bannerman, almost colourless glass, holding high a tattered white standard that seems to glow.           |
| `knight.webp`    | Shattered Knight: a cracked glass knight with a great two-handed sword, pieces of the helm missing, light leaking out.        |
| `wisp.webp`      | Mirror Wisp: no body — a drifting knot of mirror shards and refracted light in rainbow slivers.                               |
| `captain.webp`   | The Glass Captain (elite): an officer in ornate rose-window armour, a commander's sash, stern and upright.                    |
| `chorister.webp` | The Chorister (elite): a robed singer of frosted glass, mouth open in song, hoarfrost spreading from its hymnal.              |
| `sentinel.webp`  | The Oathless Sentinel (guardian): a towering glass guardian with a standard fused to its back and a visor that shows no face. |

The Rootbound Crown — a palace grown upside down into the roots of the world; roots, gold leaf, old velvet, deep shadow:

| File             | Subject                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `shade.webp`     | Rootbound Shade: a shadow held together by living roots that knit and re-knit across its chest.                                  |
| `crownless.webp` | Crownless Keeper: a fallen ember-carrier like the heroes, hood up, carrying a dead lantern on a chain, face in shadow.           |
| `herald.webp`    | Forgotten Herald: a court herald with a long ceremonial trumpet and a scroll that unrolls into darkness, tabard without a crest. |
| `courtier.webp`  | Hollow Courtier: an elegant masked noble whose court dress is woven from thorned briars, a thin knife held behind the back.      |
| `hand.webp`      | The King's Hand (elite): a gauntleted executor in black-and-gold plate, holding a sealed warrant, a heavy key-ring at the hip.   |
| `unnamed.webp`   | The Unnamed (elite): a figure whose face and edges are smudged away like an erased drawing; where it stands the paint is bare.   |
| `king.webp`      | The Hollow King (guardian): a gaunt, sorrowful old king on a throne of roots, a crown too large, cradling a faint ember of sun.  |

### 4. Relic icons → `src/art/relics/`

**28 files, 128 × 128 px, transparent background (alpha), ≤ 6 KB each.** A single painted object, centred, filling about 80% of the frame, soft warm rim-light, readable at 32 px. Same painterly style as the portraits, no drop shadow box, no frame.

| File              | Object                                                   |
| ----------------- | -------------------------------------------------------- |
| `briar.webp`      | A small charm of twisted black briar with one red rose   |
| `dawn.webp`       | A warm glowing shard of amber-gold crystal               |
| `mothglass.webp`  | A round lens of pale glass with a moth pressed inside    |
| `thread.webp`     | A spool of red pilgrim's thread, one end trailing        |
| `psalm.webp`      | A small iron plate hammered with musical notation marks  |
| `hearthseed.webp` | A glowing seed in a pinch of dark soil                   |
| `kindling.webp`   | A short knife with a blade like a struck match           |
| `whetstone.webp`  | A grey whetstone with faint ripples like sound           |
| `dew.webp`        | A tiny bottle of silver liquid, stoppered with wax       |
| `ferrycoin.webp`  | An old coin stamped with a sun, worn smooth              |
| `vigil.webp`      | A short lit candle in a brass saucer                     |
| `bellrope.webp`   | A frayed knotted bell-rope with a brass ring             |
| `censer.webp`     | A hanging censer trailing violet smoke                   |
| `clapper.webp`    | A bronze bell clapper                                    |
| `wick.webp`       | A nearly burnt-out candle stub with a fierce small flame |
| `thornmail.webp`  | A scrap of chainmail woven with thorns                   |
| `lantern.webp`    | A small lantern with moths circling it                   |
| `buckle.webp`     | A heavy belt buckle shaped like a closed gate            |
| `echo.webp`       | A small hand-bell with a ghostly second outline          |
| `gravebloom.webp` | A pale flower growing from a bone                        |
| `sprig.webp`      | A sprig of rowan with red berries                        |
| `scale.webp`      | A small pair of brass merchant's scales                  |
| `chime.webp`      | A single silver tubular chime on a black cord            |
| `hourglass.webp`  | An hourglass whose sand hangs motionless mid-fall        |
| `lodestar.webp`   | A star-shaped compass needle floating above a brass disc |
| `cinder.webp`     | A glowing cinder in the shape of a feather               |
| `idol.webp`       | A small faceless idol of grey ash                        |
| `mirror.webp`     | A jagged shard of stained glass reflecting a sky         |

### 5. Map pictograms → `src/art/sites/`

**17 files, 128 × 128 px, transparent background, ≤ 6 KB each.** These sit on a parchment map like the pictograms of a hiking map, but painted: one clear object each, strong silhouette, warm outline so it reads on both light parchment and dark green. Viewed slightly from above, like pieces on a board.

| File                   | Pictogram                                                       |
| ---------------------- | --------------------------------------------------------------- |
| `battle.webp`          | Two crossed worn swords over a small shield                     |
| `elite.webp`           | A horned helm with a single glowing eye-slit                    |
| `boss.webp`            | A great bronze bell in a stone arch                             |
| `event.webp`           | An open letter with a feather quill                             |
| `camp.webp`            | A small tent beside a campfire                                  |
| `shop.webp`            | A trader's stall hung with lanterns                             |
| `well.webp`            | A stone well with a soft green glow (the Dawnwell)              |
| `kiln.webp`            | A small brick kiln with an orange mouth (the Cinder Kiln)       |
| `lens.webp`            | A little domed observatory with moths (the Moth Observatory)    |
| `chest.webp`           | A small iron-bound chest, lid ajar, coins glinting              |
| `spring.webp`          | A porcelain fountain bowl with clear water                      |
| `haven.webp`           | A hearth in a ring of roses                                     |
| `lookout.webp`         | A signal beacon tower with a flame                              |
| `origin.webp`          | A city gate with a portcullis and a single torch                |
| `keeper-warden.webp`   | Board-piece token: a hooded woman with a door-shield, full body |
| `keeper-seer.webp`     | Board-piece token: an old man with a staff and astrolabe        |
| `keeper-wayfarer.webp` | Board-piece token: a young woman with a courier's satchel       |

### 6. Scene illustrations → `src/art/scenes/`

**15 files, 720 × 405 px (16:9), ≤ 36 KB each.** Wide atmospheric paintings with the subject off-centre to the right and darker, calmer paint on the left third (the game may fade that side). No people looking straight at the viewer.

| File               | Scene                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `ferryman.webp`    | An old ferryman beside a boat crowded with lit candles, on a black river with no far bank     |
| `letters.webp`     | A fallen milestone with a satchel of undelivered letters, one pressed flower                  |
| `moths.webp`       | Thousands of pale moths settling into the shape of a woman among burnt library shelves        |
| `founder.webp`     | A ghostly bell-founder pouring glowing bronze into a mould in a ruined foundry                |
| `hedge.webp`       | A wall of black briars across a road, with one arch of red roses standing open                |
| `lamplighter.webp` | A woman on a ladder lighting street lamps along a street that has no houses                   |
| `well.webp`        | A stone well standing in the middle of a road, an empty bucket waiting on its rim             |
| `wager.webp`       | A stained-glass soldier with a grounded sword blocking a path, a small campfire at his feet   |
| `library.webp`     | A palace library swallowed by roots, books closed inside the wood like amber                  |
| `face.webp`        | A hollow figure wearing a king's mask sitting politely on a milestone at dusk                 |
| `map.webp`         | A moth-eaten map nailed to a signpost at a marsh's edge, a red cross drawn on it              |
| `smith.webp`       | A very old smith at a glowing forge under a fallen stone arch                                 |
| `dawn.webp`        | Ending: a thousand windows opening in a cliff city as a soft sunrise spreads                  |
| `hearth.webp`      | Ending: a library built around a great hearth, people reading by firelight under a starry sky |
| `fallen.webp`      | Defeat: a single ember glowing on a dark forest road, a keeper's cloak laid beside it         |

### 7. Provenance

Add one new file `src/art/NOTICE.md` stating: these images were generated for Emberwake in (month, year), are original, depict fictional subjects from the game's own lore, and contain no third-party material. This is the only non-image file you may add.

### 8. Deliver

- Work on a new branch named `art/v0.8-illustrations`, commit only the files described above, and open a pull request to `main` titled “art: v0.8 illustrations”.
- In the PR description, list how many files you delivered in each of the four folders and the total size.
- Before finishing, verify: every file name matches a name in this brief exactly; every image has the stated pixel size; no file exceeds its ceiling; the four folders together are under 1.5 MB; `git status` shows no modified source files.
