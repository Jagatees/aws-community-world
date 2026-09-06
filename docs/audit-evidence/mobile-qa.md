# Mobile globe QA evidence

Audit date: 2026-09-03 (Asia/Singapore)\
Target: `http://localhost:5173/`\
Scope: read-only mobile visual and interaction audit. No production code was changed.

## Executive finding

The home globe and the `sleek` / **Minimal** in-app globe are the strongest mobile experiences. The home globe scales correctly at every requested portrait size, keeps the CTA and totals above the fold, and now rotates through a genuine category mix. Minimal is also the only general-purpose globe that keeps dense datasets understandable, but its HTML marker labels are not clamped to the viewport and are repeatedly cut off at the left or right edge.

The portrait/flag-heavy `orbit` / **Earth** and `classic` / **Atlas** globes should not remain selectable on phones in their current form. On 320-430 px portrait widths they render tens to hundreds of simultaneous DOM markers; faces, logos, flags, `NEW` chips, and count badges cover one another. A cluster tap zooms the Earth globe but does not make the result readable. Student Builder Groups is the clearest failure: the 320 x 568 test rendered 452 marker buttons and 603 visible image elements, with the globe almost entirely covered.

Recommended mobile set:

- Keep the lightweight mixed home globe.
- Make Minimal the sole primary geographic globe.
- Keep Gallery and Directory as complementary non-map views.
- Keep Map only as an optional advanced geography view after marker reduction.
- Hide Earth, Atlas, and GeoLibre on mobile until they use a strict marker budget and non-overlapping cluster representation.
- Keep Experimental in its separate lab section; do not add it to the normal view switcher.

## Test conditions

- Browser: Codex in-app browser.
- Pointer media query in this run: `pointer: coarse = false` (touch behavior was exercised with coordinate drag/tap actions, not real multi-touch hardware).
- Reduced-motion media query in this run: `false`; reduced-motion findings below also include source inspection.
- Portrait sizes: 320 x 568, 360 x 640, 360 x 800, 375 x 812, 390 x 844, 412 x 915, 430 x 932.
- Short landscape size: 667 x 375.
- Repeated reloads and timed rotation samples were used so a single globe angle would not determine the result.

Routes/categories covered:

- Home community and home events: `/`
- Heroes: `?tab=heroes`
- Community Builders: `?tab=community-builders`
- User Groups: `?tab=user-groups`
- Student Builder Groups: `?tab=cloud-clubs`
- Kiro Ambassadors: `?tab=kiro-ambassadors`
- Kiro Events: `?tab=kiro-events`
- Community Days: `?tab=community-days`
- News was checked at `?tab=news&view=sleek` (news panel plus globe).
- AWS Ambassador was checked at `?tab=aws-ambassadors&view=sleek`; it is not exposed in the category sheet and currently shows a zero-data coming-soon state.
- Main views: Earth (`orbit`), Atlas (`classic`), Minimal (`sleek`), Map (`flat`), GeoLibre (`geolibre`), Gallery (`icons`), Directory (`list`).
- Experimental views: Country Mosaic, Hero Orbit, Event Reveal, Global Infra.
- Insights was inspected but is a dashboard, not a globe.

## Responsive matrix

`Clipped labels` is a timed sample of visible Minimal-globe marker labels whose bounding box crossed a viewport edge. The exact count changes as the globe rotates, but the defect reproduced after reload and after manual drag.

| Viewport | Home community | Home events | Minimal dense-category result | Notes |
|---|---|---|---|---|
| 320 x 568 | Pass; all content above fold | Pass | 1-3 labels clipped depending on angle | Stats end about 6 px above bottom; only one home feature card is normally shown |
| 360 x 640 | Pass | Pass | Heroes 1, Builders 2, User Groups 2, Students 2 | Home stats end 7 px above bottom |
| 360 x 800 | Pass | Pass | Heroes 1, Builders 2, User Groups 2, Students 1, Kiro Events 1, Community Days 3 | Taller globe exposes more edge labels |
| 375 x 812 | Pass | Pass | Heroes 1, Builders 2, User Groups 2, Students 1, Kiro Events 1, Community Days 3 | No document overflow |
| 390 x 844 | Pass | Pass | Heroes 1, Builders 2, User Groups 2, Students 2, Community Days 3 | Home can safely show two non-colliding feature cards |
| 412 x 915 | Pass | Pass | Heroes 1, Builders 2, User Groups 2, Students 3, Community Days 3 | Home cards retained a 15 px vertical gap |
| 430 x 932 | Pass | Pass | Heroes 1, Builders 2, User Groups 1, Students 3, Community Days 3 | Home content ends 11 px above bottom |
| 667 x 375 landscape | Home itself fits | Home itself fits | No sampled edge labels, but main app layout fails | Desktop header/tabs replace mobile nav; category/tag rows clip and globe height falls to 232 px |

No tested portrait route produced document-level horizontal scrolling; the marker layers are clipped inside overflow-hidden containers instead, which is why automated scroll-width checks alone appear healthy.

## Category observations in Minimal

| Category | Result | Evidence |
|---|---|---|
| Heroes | Keep with changes | Clear orange dots, country badges, single-name and cluster labels. At least one live label crossed the viewport edge at every portrait width. Dragging can move most labels partially or fully off-screen. |
| Community Builders | Keep with changes | Far clearer than the portrait globes, but long cluster labels clip (usually two at each portrait size). Subtitle correctly distinguishes 2,901 mapped records from 3,036 total. |
| User Groups | Keep with changes | Country badges are appropriate. Cluster label and modal work, but `10 User Groups here · United States` opens groups from Birmingham, Sacramento, San Mateo, Denver, Florida, Mississippi, and New York, so “at this location” is semantically false; it is a country-level grouping. |
| Student Builder Groups | Keep with changes | Country/group representation is much better than overlapping faces. Long labels have the highest persistent edge-clipping rate (up to three in the timed samples). |
| Kiro Ambassadors | Keep / simplify | Only two records; Minimal presents a named marker clearly. Earth/Atlas mostly show an empty globe plus the Kiro sprite, so those modes add little. |
| Kiro Events | Keep | Low marker count and clean display. One edge-clipped label appeared at 360 x 800 and 375 x 812. |
| Community Days | Keep with changes | Geographic display is useful, but three event labels were clipped in most taller portrait samples. |
| News | Keep with changes | Globe and story panel loaded without overflow or runtime errors. The panel dominates the experience, so the globe is secondary rather than the primary navigation surface. |

## Mode comparison and mobile decision

Scores use the requested weighted rubric: visual clarity 25%, usefulness/category representation 20%, responsive layout 20%, interaction 15%, performance/stability 10%, accessibility 10%.

| Experience | Weighted score / 5 | Mobile decision | Evidence |
|---|---:|---|---|
| Home community globe | 4.4 | KEEP WITH CHANGES | Correct scale and above-fold layout at all portrait sizes; genuine mixed markers observed (Hero, User Group, Student Group, Kiro). Fix count semantics and occasional label-free interval. |
| Home events globe | 4.4 | KEEP | Clean dots, no label collisions, CTA and totals fit every portrait size. |
| Minimal | 4.1 | KEEP WITH CHANGES; make primary | Best density management and strongest mobile interaction. Clamp labels and rename country clusters. |
| Earth | 2.0 | SIMPLIFY OR HIDE ON MOBILE | Severe portrait/flag pileups. At 390 x 844, timed samples exposed 63 Hero, 151 Builder, 396 User Group, and 363 Student location buttons; many project beyond edges. |
| Atlas | 2.1 | SIMPLIFY OR HIDE ON MOBILE | Attractive earth texture, but the same DOM marker strategy remains unreadable. Student sample had 129 active location buttons with 88 crossing the viewport. |
| Map | 2.9 | KEEP WITH CHANGES / ADVANCED | Geography is easier to understand than Earth/Atlas, but Europe and other dense regions remain a face stack. Use aggregate bubbles until zoomed. |
| GeoLibre | 2.7 | SIMPLIFY OR HIDE ON MOBILE | Globe is smaller with large unused vertical space; portraits still overlap across a hemisphere. |
| Gallery | 4.1 | KEEP | Strong mobile face-browsing alternative, no overflow, clear search and keyboard-accessible profile buttons. |
| Directory | 4.4 | KEEP | Clearest lookup and accessibility path; no canvas, no marker collision, works for every tested category/event type. |
| Experimental: Country Mosaic | 3.9 | KEEP IN LAB | Responsive across all requested sizes; good progress/replay affordance. It is illustrative rather than a person lookup. |
| Experimental: Hero Orbit | 3.8 | KEEP IN LAB | Much better face separation than Earth/Atlas and every portrait has a named button; still decorative and DOM-heavy. |
| Experimental: Event Reveal | 4.0 | KEEP IN LAB | Strong mobile composition; four-stop tour started and advanced correctly. |
| Experimental: Global Infra | 3.8 | KEEP IN LAB WITH CHANGES | Useful event-region exploration; region chip row visibly cuts the next item at 390 px and depends on horizontal scrolling. |

## Severity findings

### P0

None found.

### P1

1. **Earth and Atlas become marker walls for the four large community datasets.** Faces, placeholder disks, flags, count badges, and `NEW` tags overlap so heavily that the map and individual markers cannot be read. This reproduces from 320 through 430 px. Student Builder Groups at 320 x 568 rendered 452 marker buttons and 603 visible image elements. A cluster tap zoomed successfully but the zoomed view remained a face/count pile.
2. **Minimal marker labels are not viewport-clamped.** Dense categories had one to three labels outside the viewport at every portrait size. A touch-style drag moved several full labels to the far right; they stayed interactable in the DOM but were partly or fully invisible.
3. **Short landscape phones receive a desktop-style layout.** At 667 x 375, the desktop header, category tabs, filters, seven-mode switcher, zoom controls, and Near Me control consume most of the 375 px height. The globe canvas is only 232 px tall, while tab and specialty rows clip horizontally. This is materially less usable than the portrait mobile shell.

### P2

1. **User Group flag fallbacks are broken for France and the United Kingdom.** Reproduced after reload in Earth, Atlas, and Map. Requests use `https://flagcdn.com/w80/fx.png` and `https://flagcdn.com/w80/uk.png`; the expected country codes are `fr` and `gb`. Broken markers appear as empty/dark circles inside already-dense clusters.
2. **Country-level groups are announced as one physical location.** The User Group cluster dialog described above is headed “10 members at this location” even though the entries span multiple US states. Student groups use the same visual pattern. This can make users believe unrelated cities share coordinates.
3. **Home and globe counts use inconsistent semantics.** Home shows 4,911 = 252 Heroes + 3,036 Builders + 599 User Groups + 1,022 Students + 2 Kiro. The live mapped category headers show 250 + 3,036 + 598 + 1,016 + 2 = 4,902. Both surfaces say “worldwide”; only Builders explicitly explains mapped versus total. The nine-record difference should be labelled, reconciled, or consistently described.
4. **Single-person Earth markers have generic accessible names.** Their buttons announce `1 member at this location`; the nested image has the person name, but the button's `aria-label` overrides it. A keyboard user must traverse dozens or hundreds of indistinguishable controls.
5. **Mobile category pills truncate long names.** Community Builders and Student Builder Groups are visibly shortened in the floating bottom chip even when there is adequate vertical space. The accessible label remains complete.

### P3

1. Repeated `THREE.Clock` deprecation warnings occur when three.js views mount. No uncaught JavaScript errors were recorded during the audit.
2. Home rotation occasionally produces a short interval with no visible feature card, even though category dots remain visible.
3. Experimental Global Infra's region chip row exposes only part of the next region at 390 px; scrolling appears intentional but the affordance is weak.

## Shared-location/person preview findings

- **Do not render multiple overlapping faces at one mobile coordinate.** Earth/Atlas demonstrate that face separation offsets do not scale to country-level or dense-city clusters.
- **Use one semantic aggregate badge at broad zoom:** category icon or country flag + count + explicit wording such as `10 User Groups across the United States`.
- **Reveal people/groups after intent:** tap the badge to open the existing scrollable list, or zoom far enough to split true city coordinates.
- **Use a single named portrait only for an actual single-person coordinate.** Its accessible name should be the person's name and category, not `1 member at this location`.
- **Do not choose one person's face to represent unrelated groups.** User Groups and Student Builder Groups should use group/category imagery or flags until a single group is selected.
- **Keep home featured cards curated and sparse.** One card on short phones and up to two on larger phones worked; observed pairs kept a 15-19 px gap and did not merge faces.

## Interaction and accessibility evidence

- Home CTA worked and entered `?view=sleek` with Heroes active.
- Community/Event headline switch worked; event stats and copy updated.
- Category sheet opened as a labelled modal, selecting Student Builder Groups closed it and updated the URL.
- More sheet exposed Earth, Atlas, Minimal, Map, GeoLibre, Gallery, and Directory; it scrolls internally at 320 x 568 and mode selection worked.
- Minimal accepted a touch-style horizontal drag and updated projected marker positions. This also reproduced its edge-clipping bug.
- A single Hero marker opened a correctly labelled profile dialog at 320 x 568.
- A User Group count marker opened a scrollable ten-item cluster dialog at 390 x 844.
- An Earth cluster tap zoomed the globe; the resulting cluster remained visually crowded.
- Multi-touch pinch/zoom was not directly emulated by the available browser controls.
- Minimal explicitly stops auto-rotation for `prefers-reduced-motion`, and the home number animation resolves immediately. Earth uses `useAutoRotate` without a reduced-motion guard; if a reduced-motion user manually selects Earth, it still rotates. Experimental Hero Orbit handles reduced motion, while Event Reveal's globe auto-rotation has no equivalent guard in the inspected implementation.

## Screenshot index

Representative successes:

- [Home community, 390 x 844](./mobile-screenshots/home-community-390x844.png)
- [Home events, 320 x 568](./mobile-screenshots/home-320x568-events.png)
- [Hero Gallery, 320 x 568](./mobile-screenshots/heroes-gallery-320x568.png)
- [Experimental Event Reveal, 390 x 844](./mobile-screenshots/experimental-event-reveal-390x844.png)

Representative failures:

- [Hero Earth crowding, 320 x 568](./mobile-screenshots/heroes-orbit-320x568.png)
- [Hero Earth after cluster tap, 320 x 568](./mobile-screenshots/heroes-orbit-320x568-after-cluster-tap.png)
- [Community Builder Earth crowding, 320 x 568](./mobile-screenshots/builders-orbit-320x568.png)
- [User Group Earth crowding, 320 x 568](./mobile-screenshots/user-groups-orbit-320x568.png)
- [Student Builder Earth crowding, 320 x 568](./mobile-screenshots/students-orbit-320x568.png)
- [Hero Atlas crowding, 320 x 568](./mobile-screenshots/heroes-atlas-320x568.png)
- [Minimal labels after drag, 390 x 844](./mobile-screenshots/heroes-sleek-390x844-after-drag-clipping.png)
- [Short landscape layout, 667 x 375](./mobile-screenshots/heroes-sleek-landscape-667x375.png)
- [User Group Atlas / broken flag area, 390 x 844](./mobile-screenshots/user-groups-atlas-390x844-broken-flags.png)
- [Country-wide cluster described as one location, 390 x 844](./mobile-screenshots/user-groups-sleek-390x844-cluster-dialog.png)

Additional evidence is in [`mobile-screenshots`](./mobile-screenshots/).

## Suggested implementation packages

### Minimal cleanup

- Clamp/flip Minimal labels within viewport bounds.
- Fix `fx`/`uk` flag-code mapping.
- Change country-centroid copy from “at this location” to “across [country]”.
- Reconcile or label mapped-versus-total counts.
- Use person names in single-marker accessible labels.

### Recommended mobile redesign

- Keep Home + Minimal + Gallery + Directory.
- Retain Map only behind an “advanced map” choice.
- Hide Earth, Atlas, and GeoLibre below 768 px.
- Replace all broad-zoom group/person stacks with one category/count badge, splitting only after zoom or selection.
- Add a dedicated landscape mobile shell for short heights.

### Full consolidation

- Build one shared responsive marker policy used by Minimal, Map, and any retained 3D globe: zoom-aware marker budget, screen-space collision avoidance, country/city aggregation, consistent fallbacks, viewport clamping, and shared accessible names.
- Make Gallery/Directory the deterministic fallback for low-power and reduced-motion devices.
