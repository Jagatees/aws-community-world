# Scrapbook assets

The Scrapbook view uses original cute AWS community illustrations made with the built-in ImageGen tool. The brief was a playful paper scrapbook with Kiro and friendly AWS service characters, plus community badges. The generated artwork is illustrative fan art. An editable welcome spread introduces the scrapbook; the remaining pages start blank for visitors’ own notes, photos and stickers.

## Generated sticker set

One transparent sticker sheet was generated with `transparent_background: true`. The existing Kiro icon was converted to a 512 px PNG and supplied as the identity reference. Six individual stickers were cropped from that single original sheet and saved as transparent WebP files in `public/scrapbook/`.

| File | Sheet cell | Scene | Dimensions |
| --- | --- | --- | --- |
| `kiro-lambda.webp` | Top left | Kiro and an orange Lambda cube high-five | 533 × 367 |
| `kiro-rocket.webp` | Top center | Kiro rides an orange rocket | 483 × 406 |
| `kiro-gaming.webp` | Top right | Kiro and a storage bucket share a controller | 471 × 348 |
| `cloud-friends.webp` | Bottom left | Database, compute and cloud friends hold hands | 550 × 314 |
| `kiro-world.webp` | Bottom center | Kiro hugs a globe | 445 × 424 |
| `kiro-love.webp` | Bottom right | Kiro holds a heart beside an AI cloud | 512 × 348 |

All six WebP files have alpha channels. The dimensions above describe the delivered individual crops, not the sheet requested in the prompt. The handmade Hero, Community Builder and Student Builder Group badges are composed by the interface and are separate from this generated set.

### Generation prompt

The exact prompt used for the single sticker sheet:

> Use case: illustration-story. Create a premium cute die-cut vinyl STICKER SHEET for an AWS community scrapbook. Reference image provides Kiro mascot identity: friendly WHITE rounded ghost with two BLACK oval eyes, short wavy bottom. Maintain that identity, add tiny purple shadows and rosy cheek details. Output on genuinely transparent background, 1536x1024 landscape, exactly SIX SEPARATE sticker illustrations in a strict 3 columns x 2 rows layout, each centered within its equally sized cell, 60px empty gutter between illustrations, no sticker crossing cells, plenty of transparent border. Chunky white die-cut outlines, ink outlines in warm dark navy, tactile hand-painted illustration, pastel lavender, AWS orange, coral and sage. TOP LEFT: Kiro ghost and a cute orange cube with Lambda symbol high-fiving each other with tiny stars. TOP CENTER: Kiro sitting in a tiny orange rocket, purple exhaust, cloud trail. TOP RIGHT: Kiro and an adorable red-orange storage bucket with face sharing a game controller. BOTTOM LEFT: happy blue database cylinder, orange compute cube and pink cloud holding hands. BOTTOM CENTER: Kiro in orange explorer hoodie hugging a small globe, happy community feeling. BOTTOM RIGHT: Kiro ghost holding a purple heart beside a smiling lavender AI cloud. Each illustration is one separate coherent sticker. No text, no background, no UI, no photograph. Original fan-art style, charming not corporate. Bold readable silhouettes even at small size. Transparent alpha background absolutely required. Save output into project assets if possible.

## Local fonts and licenses

The view bundles Caveat Semibold for handwritten text and DM Sans Regular/Bold for supporting text. Both families are distributed under the SIL Open Font License 1.1. Their full copyright notices and license text are bundled alongside the font files:

| Family | Font files | Bundled license | Official source |
| --- | --- | --- | --- |
| Caveat | `public/scrapbook/fonts/caveat-semibold.ttf` | `public/scrapbook/fonts/caveat-OFL.txt` | [Google Fonts Caveat OFL](https://github.com/google/fonts/blob/main/ofl/caveat/OFL.txt) |
| DM Sans | `public/scrapbook/fonts/dm-sans-regular.ttf`, `public/scrapbook/fonts/dm-sans-bold.ttf` | `public/scrapbook/fonts/dmsans-OFL.txt` | [Google Fonts DM Sans OFL](https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt) |

The license files were downloaded directly from the official Google Fonts repository on 22 October 2026. Both requests returned HTTP 200; the files were checked for the correct family copyright notice and the complete OFL 1.1 text.

## Blank book editor

The Scrapbook dropdown opens the front cover at `?view=scrapbook&spread=0`. The first spread welcomes visitors with editable text and Kiro/community stickers. The remaining four spreads start blank; position 6 is the closed back cover. Click a cover to open or reopen it. The welcome appears once in an empty first spread and does not overwrite existing contributions or return after deletion.

Click or tap a paper page to create a note at that spot. The inline controls change its font, size and color; the move handle repositions it. Choose a sticker in the drawer, then click the paper to place it. Select an existing sticker to move, rotate or remove it. Press Escape to cancel placement or finish a note.

Use Photo to choose a local image, then click the paper to place it. Photos can be moved, resized, renamed by clicking their caption or pencil control, and removed. Enter or blur saves a photo name; Escape restores its previous name. Photos are resized before saving, with eight photos and a two-million-character image budget across the book.

Notes, stickers and photos each support independently toggled heart and thumbs-up reactions. Counts represent this browser's own reactions. Controls appear on hover/focus on desktop and remain visible on touch devices.

Contributions and reactions save in the current browser and synchronize between open tabs. The v2 storage model preserves previously added v1 stickers and keeps each item's page and position consistent across desktop and mobile layouts. Empty draft placeholders are not saved.

Model checks: `node --test scripts/test-scrapbook-book.mjs`.

## 100-sticker library

The library contains exactly 100 designs: the original 24, 20 new cute illustrations, 24 funny builder phrases, and 32 country travel stamps. The pure-data catalog in `src/data/scrapbook.js` is shared by the drawer and saved-book validation, so every design survives a reload and existing sticker IDs remain valid. Search and category filters browse the full set; the placement limit remains 30 stickers per spread.

The 20 new illustrations were generated individually with the built-in ImageGen tool and `transparent_background: true`. Their transparent margins were trimmed, the artwork resized to at most 512 px per edge, and the results saved with preserved alpha as `public/scrapbook/stickers/*.webp`. Exact prompts are recorded in `docs/scrapbook-sticker-prompts.json`. Ten later prompts also include a small white Kiro ghost companion in the illustration.

Every cute illustration and funny phrase carries a purple Kiro seal made with the existing local Kiro SVG. The interface attaches the seal to the complete sticker, including its placement preview, so it moves and rotates with the artwork. The original six word stickers also receive this seal. The seal is composed by the interface and is not baked into the new WebP source files.

The 32 country illustrations are original native SVG postage stamps with distinct local motifs, a small flag, an AWS COMMUNITY heading, and an embedded Kiro seal. Their final artwork is saved as `public/scrapbook/stickers/country-*.svg` and described in `src/data/scrapbookCountries.js`; `branded: true` avoids adding a second seal. Funny phrase stickers extend the existing native handwritten badge system.

Library and persistence checks: `node --test scripts/test-scrapbook-book.mjs scripts/test-scrapbook-catalog.mjs`. These verify the exact count and category split, all original IDs, all 100 designs saving and reloading, local asset availability, and visible transparent raster artwork.
