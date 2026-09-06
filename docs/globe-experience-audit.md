# AWS Community Globe experience audit

Audit completed: 2026-09-04 (Asia/Singapore)\
Workspace: `D:\Github-Local\aws-community-world`\
Method: four-agent parallel audit (inventory/architecture, mobile visual QA, desktop visual QA, and data/performance/accessibility), followed by primary-agent evidence review and cross-device synthesis.\
Constraints observed: current working tree preserved; no production code changed for the audit; no commit or push performed.

Supporting evidence:

- [Implementation and dataset inventory](./audit-evidence/inventory.md)
- [Skeptical architecture review](./audit-evidence/architecture-recommendations.md)
- [Mobile visual QA](./audit-evidence/mobile-qa.md)
- [Desktop visual QA](./audit-evidence/desktop-qa.md)
- [Data, performance, and accessibility audit](./audit-evidence/data-performance-accessibility.md)
- [External asset health check](./audit-evidence/external-assets.md)

## 1. Executive summary

The strongest product is not “seven ways to render the same coordinates.” It is a focused community-discovery experience with a beautiful but honest geographic overview, a visual people browser, and a dependable directory.

The current project is a polished production-deployed portfolio piece. Its presentation layer is overbuilt—seven public modes plus four experiments—while its coordinate validation, aggregation contract, fallback behavior, accessibility, and regression coverage are underbuilt. More renderer polish will not fix the central issue: each renderer currently decides for itself what a marker means.

The recommended direction is **Package 2 — Recommended redesign**:

- **Mobile:** Home + Minimal + Gallery + Directory. Keep Map only as an explicitly advanced temporary view. Hide Earth, Atlas, and GeoLibre until aggregation is redesigned.
- **Desktop:** Home + Earth + Minimal + Gallery + Directory + one future detailed vector map. Keep Atlas internally only for the two Student country spotlights until that job migrates. Remove GeoLibre as a peer mode.

**Decision recorded 4 September 2026:** the mobile and desktop mode sets above are approved. The first shippable slice now gates the public choosers and legacy routes accordingly, labels the temporary mobile map as `Advanced Map`, preserves Atlas for country spotlights, and uses the compact shell through 767px plus short landscape phones. Earth aggregation and the future detailed-map redesign remain follow-on work in Package 2.
- **Markers:** never blend or overlap faces for groups or aggregates. Use one semantic badge/flag + truthful count at overview scale, then show people/groups after selection or zoom.
- **Data:** validate coordinate/country consistency and carry a real `representedCount`. Today a marker can say 37 Builders where its source summaries represent 318.
- **Experiments:** retain Country Mosaic in a clearly labelled lab; archive Hero Orbit and Event Reveal; move and rename Global Infra as a Community Days regional explorer.

No P0 issue was found. The most important P1 issues are marker walls, incorrect/coarse coordinates, Builder aggregate undercounting, mobile label clipping, the short-landscape layout, and the duplicate Singapore home coordinate.

## 2. Complete inventory

### Routes and application surfaces

| Route/state | Experience | Notes |
|---|---|---|
| `/` | Home Community / Event globe | Desktop uses `SplashScreen` + `globe.gl`; mobile uses `MobileHomeGlobe` + Cobe |
| `/?tab=<category>&view=<mode>` | Main community/event experience | URL state is managed directly in `App.jsx`, not React Router |
| `/?sg=1` | Singapore Student Builder spotlight | Forces Student Groups + Atlas/Mercator spotlight |
| `/?sl=1` | Sri Lanka Student Builder spotlight | Forces Student Groups + Atlas/Mercator spotlight |
| `/?view=experimental` | Four-experience lab | Forces Heroes for the normal dataset context |
| `/community-day-singapore/` | Dedicated event agenda | Separate non-globe application; outside this globe audit |

Recognized URL state also includes `theme`, `tag`, repeated `region`, repeated `country`, and `new`. Any recognized query parameter bypasses the home splash.

### Selectable modes, components, and engines

| Product label | Query value | Component / engine | Marker behavior | Scope |
|---|---|---|---|---|
| Earth | `orbit` | `ClassicGlobeScene.jsx` / `globe.gl` | Up to three overlapping portraits + count; flags/events use separate branches | All normal categories |
| Atlas | `classic` | `MapboxGlobeScene.jsx` / Mapbox GL | HTML overlays; shared portrait helper; owns country spotlights | All normal categories; Mapbox token |
| Minimal | `sleek` | `GlobeScene.jsx` / Cobe | Canvas dots + bounded HTML label pool; no portraits | All normal categories; mobile/reduced-motion default |
| Map | `flat` | `MapboxFlatScene.jsx` / Mapbox GL | Flat equirectangular map with another marker-stack implementation | All normal categories; Mapbox token |
| GeoLibre | `geolibre` | `GeoLibreScene.jsx` → `MapboxGlobeScene.jsx` / MapLibre | Same overlay-marker system as Atlas | All normal categories; token-free provider |
| Gallery | `icons` | `ExperimentalHeroDex.jsx` / React UI | Three-row portrait/flag/badge archive; not geographic | Five community categories |
| Directory | `list` | `ListScene.jsx` / React UI | Searchable cards, 60-row paging; not geographic | Every category, including News/Events |
| SVG fallback | automatic | `FlatMapScene.jsx` / SVG + D3 | Independent stacked marker implementation | WebGL failure/error boundary only; not selectable |

Shared infrastructure includes `useCategory`, `clusterMembersByCoordinates`, `memberMarkers.js`, `ProfileCard`, and the common filtered `members` array. Marker presentation is not actually shared: Earth, Atlas/GeoLibre, Map, Minimal, SVG fallback, Gallery, and both home renderers each make substantial independent decisions.

### Category and dataset inventory

| Category | Source | Rows | Plotted | Exact-coordinate markers | Shared rows | Largest exact stack | Current overview identity |
|---|---|---:|---:|---:|---:|---:|---|
| Heroes | `heroes.json` | 252 | 250 | 84 | 209 | 29 | Faces |
| Community Builders | `community-builders.json` | 3,036 | 2,901 | 199 | 2,856 | 318 | Summary leader faces/count; default payload is 477 summaries |
| User Groups | `user-groups.json` | 599 | 598 | 489 | 167 | 22 | Country flags/count |
| Student Builder Groups | `cloud-clubs.json` | 1,022 | 1,016 | 478 | 679 | 49 | Leader faces or group fallback/count |
| Kiro Ambassadors | `kiro-ambassadors.json` | 2 | 2 | 2 | 0 | 1 | One face + one fallback |
| Kiro Events | `kiro-events.json` | 8 | 8 | 7 | 2 | 2 | Kiro event icon/avatar |
| Community Days | `community-days.json` | 38 | 38 | 38 | 0 | 1 | Flag/date/status |
| News | `news.json` | 20 | 20 | 14 | 10 | 4 | Author avatar → News panel |
| AWS Ambassadors | `aws-ambassadors.json` | 0 | 0 | 0 | 0 | 0 | Hidden coming-soon state |

The Home Community set is intentionally curated: 14 records comprising three Heroes, three Builders, three User Groups, three Student Groups, and both Kiro Ambassadors. Desktop Home Events uses all 46 current event records; mobile Home Events uses 12 anonymous hardcoded locations.

### Experimental inventory

| Experiment | Implementation | Actual job |
|---|---|---|
| Country Mosaic | `ExperimentalPixelMap.jsx`, 2D canvas | Country distribution of 598 mapped User Groups |
| Hero Orbit | `ExperimentalGlobeScene.jsx`, Cobe + Three CSS3D | Non-geographic portrait carousel around a globe |
| Event Reveal | `ExperimentalEventReveal.jsx`, `globe.gl` | Scripted four-stop hardcoded event tour |
| Global Infra | `ExperimentalGlobalInfra.jsx`, `globe.gl` | 52-row Community Days regional explorer, despite its name |

Insights is a dashboard, not a globe, and was excluded from globe scoring.

## 3. Mobile and desktop test matrices

### Mobile viewport matrix

The mobile agent tested Home, every public category, every normal mode where supported, all four experiments, and a short landscape viewport. `Clipped` is a timed Minimal-label sample; the exact number changes during rotation but reproduced after reload and drag.

| Viewport | Home Community | Home Events | Minimal dense categories | Main finding |
|---|---|---|---|---|
| 320 x 568 | Pass; one featured card | Pass | 1–3 clipped labels | Earth Student state: 452 marker buttons / 603 visible images |
| 360 x 640 | Pass | Pass | Heroes 1, Builders 2, Groups 2, Students 2 clipped | No document overflow; marker layers clip internally |
| 360 x 800 | Pass | Pass | 1–3 clipped labels across categories | Taller canvas exposes more edge labels |
| 375 x 812 | Pass | Pass | 1–3 clipped labels | Stable above-fold layout |
| 390 x 844 | Pass; up to two cards with 15 px gap | Pass | 1–3 clipped labels | User Group cluster dialog verified |
| 412 x 915 | Pass; two cards can fit | Pass | 1–3 clipped labels | No document overflow |
| 430 x 932 | Pass | Pass | 1–3 clipped labels | No document overflow |
| 667 x 375 landscape | Home fits | Home fits | Globe canvas only 232 px high | Desktop shell activates; tabs, filters, and controls clip |

Important mobile interactions verified: Community/Event toggle, Home CTA, category sheet, More/mode sheet, Minimal drag, profile selection, cluster dialog, Earth cluster zoom, Directory/Gallery browse, experiment switching, and Event Reveal tour. True multi-touch pinch and a screen reader were not available.

### Desktop viewport matrix

| Viewport | Home Community | Minimal | Navigation/overflow | Result |
|---|---|---|---|---|
| 1024 x 768 | Fits | Fits; six visible labels, none outside sample | Seven-mode control fits but is dense | Pass with marker-density caveat |
| 1280 x 800 | Fits | Fits | Stable, no document overflow | Pass |
| 1366 x 768 | Fits | Fits | Stable, no document overflow | Pass |
| 1440 x 900 | Fits; total settles at 4,911 | All seven modes and all categories sampled here | Stable shell | Pass; cross-mode failures visible |
| 1920 x 1080 | Fits | Fits; ten visible labels | Extra whitespace balanced | Pass |

Desktop interactions verified: Home toggle/CTA, category and mode navigation, Directory search, result selection/profile dialog, experiment switching, and Event Reveal start/advance. No uncaught JavaScript error was observed; repeated `THREE.Clock` deprecation warnings were recorded.

### Cross-mode visual coverage at 1440 x 900

`Live` means inspected in the browser; `Code/data` means the same route path and marker branch were traced statically and supported by another live category sample. This distinguishes direct evidence from inference.

| Surface | Heroes | Builders | User Groups | Student Groups | Kiro | Events/News |
|---|---|---|---|---|---|---|
| Home | Live mixed set | Live mixed set | Live mixed set | Live mixed set | Live mixed set | Live Event globe |
| Earth | Live | Live | Mobile live + code/data | Live | Live | Kiro Events, Community Days, News live |
| Atlas | Live | Mobile live + code/data | Live | Spotlights live | Code/data | Code/data |
| Minimal | Live | Live | Live | Live | Live | Mobile live + code/data |
| Map | Code/data | Code/data | Live | Live | Code/data | Code/data |
| GeoLibre | Live | Code/data | Live | Code/data | Code/data | Code/data |
| Gallery | Live | Live | Mobile live + code/data | Live | Code/data | Unsupported |
| Directory | Live | Code/data | Live | Mobile live + code/data | Code/data | Code/data |
| Experimental | Hero Orbit live | — | Country Mosaic live | — | — | Event Reveal + Global Infra live |

## 4. Weighted score table

Weights: visual clarity 25%, usefulness/category representation 20%, responsive layout 20%, interaction/usability 15%, performance/stability 10%, accessibility 10%.

| Experience | Mobile / 5 | Mobile decision | Desktop / 5 | Desktop decision |
|---|---:|---|---:|---|
| Home Community | **4.4** | KEEP WITH CHANGES | **4.1** | KEEP WITH CHANGES |
| Home Events | **4.4** | KEEP | **3.9** | KEEP WITH CHANGES |
| Minimal | **4.1** | KEEP WITH CHANGES | **4.3** | KEEP WITH CHANGES |
| Earth | **2.0** | SIMPLIFY OR REPLACE | **3.2** | KEEP WITH CHANGES |
| Atlas | **2.1** | SIMPLIFY OR REPLACE | **3.0** | SIMPLIFY OR REPLACE |
| Map | **2.9** | SIMPLIFY OR REPLACE | **3.3** | SIMPLIFY OR REPLACE |
| GeoLibre | **2.7** | REMOVE | **2.5** | REMOVE AS A PEER MODE |
| Gallery | **4.1** | KEEP | **4.2** | KEEP |
| Directory | **4.4** | KEEP | **4.7** | KEEP |
| Country Mosaic | **3.9** | KEEP IN LAB | **3.7** | KEEP WITH CHANGES, LAB ONLY |
| Hero Orbit | **3.8** | REMOVE FROM LIVE PRODUCT | **3.4** | REMOVE / ARCHIVE |
| Event Reveal | **4.0** | REMOVE FROM LIVE PRODUCT | **3.3** | REMOVE / ARCHIVE |
| Global Infra | **3.8** | REMOVE AS STANDALONE | **3.9** | KEEP CONCEPT; MOVE/RENAME |

The experimental removal calls are product decisions, not claims that the compositions look bad. Hero Orbit and Event Reveal score reasonably because they are polished; they should still leave the live product because they duplicate stronger jobs or depend on hardcoded campaign content.

## 5. Screenshot evidence and reproduction details

Screenshots encode category and viewport in each filename. The visual QA reports contain the full indexes.

### Representative successful states

- [Mobile Home Community, 390 x 844](./audit-evidence/mobile-screenshots/home-community-390x844.png) — `/`, Community active
- [Mobile Home Events, 320 x 568](./audit-evidence/mobile-screenshots/home-320x568-events.png) — `/`, Event active
- [Mobile Hero Gallery, 320 x 568](./audit-evidence/mobile-screenshots/heroes-gallery-320x568.png) — `/?tab=heroes&view=icons`
- [Desktop Home Community after count settled, 1440 x 900](./audit-evidence/desktop-screenshots/home-community-final-1440x900.png) — `/`, 5.2-second wait
- [Desktop Minimal Heroes, 1024 x 768](./audit-evidence/desktop-screenshots/heroes-minimal-1024x768.png) — `/?tab=heroes&view=sleek`
- [Desktop Hero Gallery, 1440 x 900](./audit-evidence/desktop-screenshots/heroes-gallery-1440x900.png) — `/?tab=heroes&view=icons`
- [Desktop Hero Directory, 1440 x 900](./audit-evidence/desktop-screenshots/heroes-directory-1440x900.png) — `/?tab=heroes&view=list`
- [Desktop Community Days Earth, 1440 x 900](./audit-evidence/desktop-screenshots/community-days-earth-1440x900.png) — `/?tab=community-days&view=orbit`

### Representative failures

- [Mobile Student Earth marker wall, 320 x 568](./audit-evidence/mobile-screenshots/students-orbit-320x568.png)
- [Mobile Heroes Earth after cluster zoom, 320 x 568](./audit-evidence/mobile-screenshots/heroes-orbit-320x568-after-cluster-tap.png)
- [Mobile Minimal labels clipped after drag, 390 x 844](./audit-evidence/mobile-screenshots/heroes-sleek-390x844-after-drag-clipping.png)
- [Mobile short-landscape shell, 667 x 375](./audit-evidence/mobile-screenshots/heroes-sleek-landscape-667x375.png)
- [Mobile country-wide cluster described as one location, 390 x 844](./audit-evidence/mobile-screenshots/user-groups-sleek-390x844-cluster-dialog.png)
- [Desktop Heroes Earth face wall, 1440 x 900](./audit-evidence/desktop-screenshots/heroes-earth-1440x900.png)
- [Desktop Builders Earth face/fallback wall, 1440 x 900](./audit-evidence/desktop-screenshots/builders-earth-1440x900.png)
- [Desktop Students Earth leader/group wall, 1440 x 900](./audit-evidence/desktop-screenshots/students-earth-1440x900.png)
- [Desktop User Groups Atlas flag wall, 1440 x 900](./audit-evidence/desktop-screenshots/user-groups-atlas-1440x900.png)
- [Desktop User Groups Map flag wall, 1440 x 900](./audit-evidence/desktop-screenshots/user-groups-map-1440x900.png)
- [Desktop GeoLibre undersized/crowded globe, 1440 x 900](./audit-evidence/desktop-screenshots/user-groups-geolibre-1440x900.png)
- [Desktop Singapore Student spotlight, 1440 x 900](./audit-evidence/desktop-screenshots/students-spotlight-singapore-1440x900.png)

Failures were rechecked after navigation/reload and timed waits. The exact number of visible labels changes with rotation; marker-wall, bad-code, and label-boundary defects persisted. The settled Home screenshot separates count-animation timing from correctness.

## 6. Problems by severity

### P0

None established.

### P1

1. **Dense community categories become marker walls.** Earth/Atlas/Map render hundreds of face, placeholder, flag, count, and `NEW` elements. At 320 x 568, Student Earth produced 452 marker buttons and 603 visible image elements. Desktop adds room but does not restore readable identity.
2. **Coordinate integrity is not reliable enough for person-level precision.** Exact-coordinate groups spanning different parsed countries include 105/250 plotted Heroes (42%) and 2,321/2,901 plotted Builders (80%).
3. **Community Builder aggregate counts can be wrong.** At the India centroid, 37 summary rows represent 318 Builders; after a second coordinate merge, the UI can display 37.
4. **Minimal labels are not viewport-safe on phones.** One to three labels crossed an edge at every portrait width; dragging can leave interactable labels partly or fully invisible.
5. **Short landscape phones use the wrong shell.** At 667 x 375 the desktop header, tabs, filters, seven modes, zoom, and Near Me control leave a 232 px-high globe and clipped rows.
6. **The Home preview contains a true overlap.** Steve Teo and AWS UG Singapore share `1.357107, 103.8194992`; desktop stacks two HTML markers and mobile hides one label while dots still coincide.

### P2

1. **Broken country flags.** `France → FX` and `United Kingdom → UK` generate confirmed 404 Flagcdn URLs and affect 29 User Group marker clusters. Desktop live QA also saw three `yu.png` failures from obsolete Yugoslavia coding.
2. **Group identity is misleading.** Student Groups use leader faces even though the record is an institution/group and only 398/1,022 rows (38.9%) have a usable leader portrait.
3. **Location copy overstates precision.** Country-centroid aggregates say “at this location” while the opened rows span many states/cities.
4. **Counts use inconsistent scopes.** Home shows 4,911 total records while plotted category headers sum to 4,902; only Builders explains mapped versus total.
5. **Image fallback is fragmented.** Rich marker paths lack final `onerror` fallbacks; a mobile Home portrait failure can leave an empty shell. Some fallback images are remote dependencies.
6. **Reduced-motion/visibility behavior is inconsistent.** Minimal is strong; Earth, Mapbox/GeoLibre, Hero Orbit, and Event Reveal are not. Earth rotation is frame-rate-dependent.
7. **Desktop switcher state is not announced.** Its buttons expose neither `aria-pressed` nor `aria-current`; Earth single-person buttons announce only “1 member at this location.”
8. **Renderer payload and DOM cost are high.** The Mapbox/MapLibre path imports both engines and may update hundreds of DOM marker trees on every render/move/zoom.
9. **Provider attribution needs review.** Some Mapbox/MapLibre constructors disable built-in attribution without a clearly verified replacement.

### P3

1. Repeated `THREE.Clock` deprecation warnings occur when Three-based scenes mount.
2. Mobile category pills truncate long names even when accessible names are complete.
3. Home rotation can briefly show no featured card, although dots remain visible.
4. The HUD live ring is not disabled under reduced motion.
5. Global Infra's mobile region chips partially reveal the next item without a strong scroll affordance.
6. Known unusable default-avatar URLs remain in source data even though runtime guards suppress them.

## 7. Shared-location and overlapping-face findings

Overlapping/blended faces do not work as the universal cluster metaphor. They are visually ambiguous, do not scale beyond two or three people, misrepresent organizations as their leaders, and become unusable when the coordinate is a country centroid rather than a verified point.

| Situation | Recommended overview marker | After user intent |
|---|---|---|
| One verified person | One portrait, category ring, name-aware accessible label | Open the profile |
| One group/institution | Group identity if available; otherwise local program/category badge | Open group detail; show leaders inside detail only |
| Dense verified city | Category badge + represented count + city wording | Zoom/split only if screen-space collision passes; expandable list always available |
| Country/coarse/approximate stack | Flag or category badge + count + “across/approximately in [country]” | Open a sorted country list; do not imply one point |
| Event | Date/status pin | Event card/CTA |
| News story | Story/author glyph | News panel/article card |
| Home mixed overlap | One explicit mixed cluster or verified separate coordinates | One card on short phones; at most two non-colliding cards on larger phones |

Specific choices:

- **One representative profile:** only for a true single-person point. Do not use one person's face as shorthand for unrelated people/groups.
- **Category badge:** default for Community Builder summaries, Student Groups, missing group art, and mixed/coarse aggregates.
- **Cluster with count:** default at world/country scale. Count must be `representedCount`, not array length.
- **Rotating representative:** do not use as cluster identity; it makes meaning unstable and accessibility unpredictable.
- **Expandable group preview:** yes, after tap/click. Reuse a single list/detail contract.
- **Multiple separated markers:** only at a sufficiently close zoom, with verified coordinates and screen-space collision handling.
- **No marker until category entry:** appropriate for the Home page beyond its small curated sample. Do not put all 4,900+ records on the Home globe.

## 8. Data and broken-avatar findings

- Heroes have 244/252 usable portraits (96.8%); Builders 2,680/3,036 (88.3%); Student Groups only 398/1,022 (38.9%). This supports faces for verified individual people, not global Student/Builder aggregates.
- The Builder summary is a good payload optimization, but a summary record must carry its count through later grouping.
- User Groups have no avatars by design. Flags or a User Group badge are correct; a broken flag must fall back locally.
- The current country-code generator allows later aliases to overwrite canonical `FR`/`GB`. Use a vetted ISO mapping and test every dataset country. Historical `YU` rows need data review rather than a made-up modern flag.
- Four sampled Builder Profile avatar URLs, both remote placeholder logos, and the experimental unpkg textures were healthy during the audit. This is a bounded sample, not proof that thousands of portraits are healthy.
- Builder Profile `.webp` URLs returned valid `image/jpeg`, so any future optimizer must trust response/content rather than suffix.
- The remote Community Builder placeholder is 171 kB for a tiny marker and has a short cache lifetime. Replace it with an optimized, licensed local asset plus initials fallback.
- Experimental Event Reveal's two unpkg textures are byte-identical to the already shipped local files. Use the local copies to remove ~1.84 MB of duplicate third-party transfer and version drift.

## 9. Performance and accessibility findings

### Performance

Production build passed with Vite's large-chunk warning.

| Asset/path | Minified | Gzip | Assessment |
|---|---:|---:|---|
| `globe.gl` | 1,776.81 kB | 501.17 kB | Justifiable for one signature desktop globe, not multiple duplicate jobs |
| `mapbox-gl` | 1,735.32 kB | 470.00 kB | Expensive for a peer mode; provider/token cost remains |
| `MapboxGlobeScene` path | 998.63 kB | 259.43 kB | Imports Mapbox + MapLibre-side code together |
| Full Builders dataset | 1,561.04 kB | 298.84 kB | Load only for explicit Directory/Gallery/filter intent |
| Student Groups dataset | 693.76 kB | 127.90 kB | Large and image-heavy |
| Cobe runtime | 11.61 kB | 5.54 kB | Strong mobile/low-power foundation |

Earth textures add ~1.84 MiB uncompressed. Cobe/Minimal caps DPR/samples, uses a fixed label pool, elapsed-time rotation, and pauses while hidden/offscreen. Earth creates all HTML marker trees and runs an additional continuous, frame-rate-dependent rotation loop without the same pause contract. Mapbox variants can create roughly 489 marker buttons/488 flag images for User Groups or 478 buttons/697 images for Students, then revisit them on map render.

### Accessibility

What works:

- Mobile Home has a concise image role/label and hides purely visual detail.
- Minimal exposes only visible labels as native buttons and responds to reduced-motion changes.
- Gallery portraits have named buttons.
- Directory uses headings, a searchbox, articles, buttons, and links; it is the strongest universal path.
- Profile and cluster dialogs have meaningful headings and actions.

What must change:

- Give the desktop design selector a group role and selected state.
- Name Earth single markers as `Name, role, place`, not “1 member at this location.”
- Treat the globe canvas as either a deliberately labelled interactive surface or decorative, with Directory always adjacent.
- Stop animated rotation/fly-to for reduced motion across retained engines; pause rendering when hidden.
- Remove hidden/back-facing Hero Orbit portraits from tab order if that experiment remains archived/viewable.
- Provide visible, compliant provider attribution where required.
- Run a final keyboard-only, reduced-motion, and screen-reader pass after redesign; this audit did not use a screen reader or real touch hardware.

## 10. Separate mobile and desktop recommendations

### Mobile

1. Keep the current Home composition and balanced category mix. One card on short phones; dynamically allow a second only when collision checks pass.
2. Make Minimal the only primary geographic globe.
3. Keep Gallery as a secondary visual browse experience and Directory as the persistent `Browse list` action.
4. Hide Earth, Atlas, and GeoLibre from the mobile chooser now. Do not wait for them to become perfect before reducing scope.
5. Keep Map only as `Advanced map` during migration; aggregate by country/region until zoomed.
6. Add a height/orientation-aware short-landscape shell.
7. Keep experiments out of the mobile core. Country Mosaic may remain deep-linkable in the lab.

### Desktop

1. Keep Home Community and Events; share their data semantics even if desktop/mobile keep different engines.
2. Keep Earth as the one rich signature globe, after aggregate marker redesign and motion/a11y fixes.
3. Keep Minimal as the clear/default geographic overview and low-power/reduced-motion option.
4. Keep Gallery as `Visual browse` and Directory as the persistent universal path.
5. Retain Atlas internally only for Singapore/Sri Lanka spotlights while those jobs are migrated. Do not keep general Atlas as an equal peer.
6. Replace current Map marker stacks with one aggregate vector map. Choose Mapbox, MapLibre, or the SVG-derived path based on provider/token/attribution needs.
7. Remove GeoLibre from the public peer selector.
8. Move the regional Event list/globe from Global Infra into Community Days under an accurate name.

## 11. Keep/change/replace/remove decision table

| Surface | Mobile | Desktop | Concrete disposition |
|---|---|---|---|
| Home Community | KEEP WITH CHANGES | KEEP WITH CHANGES | Preserve layout/mix; fix Singapore overlap, totals, and failed-image fallback |
| Home Events | KEEP | KEEP WITH CHANGES | Derive mobile dots from real events; reduce desktop date-pin collisions |
| Earth | SIMPLIFY OR REPLACE | KEEP WITH CHANGES | Hide on phones; retain one desktop signature renderer with aggregate badges |
| Atlas | SIMPLIFY OR REPLACE | SIMPLIFY OR REPLACE | Remove general peer mode; temporarily retain spotlight implementation |
| Minimal | KEEP WITH CHANGES | KEEP WITH CHANGES | Primary geographic view; clamp labels and adopt shared MarkerModel |
| Map | SIMPLIFY OR REPLACE | SIMPLIFY OR REPLACE | Keep the detailed-map job, replace raw DOM marker wall |
| GeoLibre | REMOVE | REMOVE AS PEER | Provider may survive behind the future map; public mode should not |
| Gallery | KEEP | KEEP | Rename/position as visual browse; group identity before leader identity |
| Directory | KEEP | KEEP | Elevate to persistent accessible fallback |
| Singapore/Sri Lanka spotlights | KEEP SPECIALIZED WITH CHANGES | KEEP SPECIALIZED WITH CHANGES | Fix label collisions/truncation and Singapore basemap state; migrate later |
| Kiro Ambassadors dedicated globe | SIMPLIFY | SIMPLIFY | Two records do not warrant every renderer; keep in mix + Directory/Minimal |
| AWS Ambassadors | KEEP HIDDEN | KEEP HIDDEN | No globe until data exists; retain or remove simple coming-soon route |
| Country Mosaic | KEEP IN LAB | KEEP IN LAB WITH CHANGES | Distinct distribution question; improve accessible equivalent |
| Hero Orbit | REMOVE FROM LIVE PRODUCT | REMOVE / ARCHIVE | Duplicates Gallery/Earth without geography; preserve recording/deep link if desired |
| Event Reveal | REMOVE FROM LIVE PRODUCT | REMOVE / ARCHIVE | Hardcoded four-stop campaign demo; preserve recording if desired |
| Global Infra | REMOVE AS STANDALONE | KEEP CONCEPT; MOVE/RENAME | Merge into Community Days as regional explorer, then delete standalone experiment |

## 12. Proposed ideal globe system

The project does not need one graphics engine everywhere. It needs one definition of marker truth.

```text
source records
    |
    v
validate coordinates, country, image, precision, source count
    |
    v
shared MarkerModel + grouping + selection contract
    |
    +-- Home adapter: 14 curated mixed markers / real event sample
    +-- Minimal adapter: mobile, low-power, reduced-motion
    +-- Earth adapter: one rich desktop signature globe
    +-- Vector-map adapter: detailed regional exploration
    +-- Gallery adapter: visual identity browsing
    +-- Directory adapter: exhaustive and accessible discovery
```

Minimum `MarkerModel` fields:

- stable ID, category, and `kind`: person, group, aggregate, event, or story;
- coordinates plus precision: verified point, city, region, country, approximate, or unknown;
- member/source IDs and explicit `representedCount`;
- truthful title/subtitle and category color;
- portrait only when semantically valid; otherwise local badge/flag/date/status;
- one action contract: open record, open cluster, or open News;
- one accessible label used by every renderer.

Central rules:

1. Validate country consistency before spatial grouping.
2. Do not group solely because records share exact coordinates when that point is a known centroid/fallback.
3. Enforce marker budgets at overview scale, then collision-test in screen space.
4. Clamp/flip/hide labels around viewport and control safe areas.
5. Preserve selection when switching renderer.
6. Use a deterministic local fallback at the end of every image chain.
7. Share motion, visibility, focus, count, and copy rules across adapters.

## 13. Estimated implementation effort

Estimates assume one developer familiar with the repository and include focused browser QA. Manual authoritative location research can expand the coordinate work.

| Recommendation/work item | Size | Estimate | Dependencies |
|---|---:|---:|---|
| Canonical flag mapping (`FR`, `GB`) + historical-code review + local fallback | S | 0.5–1 day | Fallback asset policy |
| Correct Builder `representedCount` and tests | S | 0.5–1 day | Count semantics approval |
| Truthful country/city/approximate cluster wording | S | 0.5–1 day | Location precision rules |
| Resolve Home Singapore overlap and derive totals/event sample | S | 1–2 days | Verified coordinate or mixed-cluster choice |
| Fix single-marker names and switcher selection semantics | S | 1–2 days | Shared accessibility labels |
| Gate mobile/public modes and elevate Directory | S | 1–2 days | Approve supported mode set + redirects |
| Clamp/flip Minimal labels around UI safe areas | M | 2–4 days | Safe-area and priority rules |
| Add short-landscape mobile shell | M | 2–4 days | Mobile control-set decision |
| Shared motion/visibility contract for retained renderers | M | 3–5 days | Retained renderer decision |
| Implement MarkerModel, grouping policy, and unit tests | L | 7–10 days | Schema, precision, count, fallback approvals |
| Migrate Home + Minimal to MarkerModel | M | 4–6 days | MarkerModel core |
| Migrate Earth to aggregate markers | L | 7–12 days | Desktop signature-globe approval |
| Replace/migrate the detailed vector map | L | 7–12 days | Mapbox/MapLibre/SVG provider choice |
| Repair Hero/Builder coordinate provenance | XL | 10–25 days | Authoritative source/review process |
| Split retained provider/experiment bundles | M | 3–5 days | Product pruning first |
| Merge Global Infra concepts into Community Days | M | 4–6 days | Community Days interaction design |
| Archive modes/experiments and maintain deep-link redirects | S–M | 2–4 days | Legacy-link policy |
| Add route/category/view visual regression harness | L | 7–12 days | Stable ready selectors and supported matrix |

## 14. Risks and tradeoffs

| Risk/tradeoff | Mitigation |
|---|---|
| Fewer modes reduce portfolio “wow” factor | Keep a clearly separate lab and recorded demos; focus the product on user jobs |
| Badge/count clusters feel less personal | Reveal portraits immediately in Gallery, Directory, and expanded details where identity is legible |
| Shared model becomes lowest-common-denominator | Share semantics/actions/a11y only; leave engine geometry inside adapters |
| Coordinate cleanup removes dots or changes totals | Keep every record in Directory; distinguish total, mapped, approximate, and unmapped |
| Provider consolidation breaks spotlights | Make Singapore/Sri Lanka parity a release gate; keep Atlas internally until replacement passes |
| Removed deep links break saved URLs | Canonical redirect to nearest supported mode; optional `/lab` legacy routes |
| Label collision policy hides data | Prioritize selected/nearest/unique labels; Directory remains exhaustive |
| Remote portraits fail later | Final fallback is always local, deterministic, and tested |
| Full Builder Gallery is expensive | Lazy-load on explicit browse intent, paginate/virtualize, keep summary for geography |
| Aggregate redesign is blocked by perfect geocoding | Mark questionable records approximate/unmapped now; repair provenance in parallel |

## 15. Three implementation packages

### Package 1 — Minimal cleanup

**Estimate: 5–8 developer-days.**

- Fix canonical flags and local fallback behavior.
- Fix Builder represented counts.
- Use truthful scope wording and reconcile total/mapped labels.
- Clamp Minimal labels.
- Fix Home overlap/failure branch, single-marker names, and switcher state.
- Hide Earth/Atlas/GeoLibre on mobile and add focused unit/browser checks.

This repairs visible correctness but leaves duplicate renderer logic, coordinate corruption, and desktop marker walls.

### Package 2 — Recommended redesign

**Estimate: 16–24 developer-days, plus manual coordinate cleanup.**

- Everything in Minimal cleanup.
- Implement the shared MarkerModel and prove it in Home + Minimal.
- Ship mobile Home + Minimal + Gallery + Directory; Map remains temporary Advanced.
- Add short-landscape shell.
- Migrate Earth as the only rich desktop globe with aggregate badges.
- Reduce desktop chooser to Earth + Minimal + Gallery + Directory + one detailed-map job.
- Keep Atlas internally only for spotlight parity.
- Keep Country Mosaic in lab, archive Hero Orbit/Event Reveal, plan Global Infra merge.
- Add supported-route regression checks.

This directly fixes the face-merging problem at the semantic source and reduces future QA breadth before expensive provider consolidation.

### Package 3 — Full consolidation

**Estimate: 35–55 developer-days, potentially more with manual data provenance.**

- Everything in Recommended redesign.
- Versioned data validation/generation with coordinate provenance, precision, image health, and generated totals.
- Repair Hero/Builder coordinates and mark unresolved rows unmapped/approximate.
- Migrate the winning rich globe and detailed map fully to MarkerModel.
- Remove redundant marker/render paths after route, spotlight, fallback, and selection parity.
- Split retained engine chunks and remove unused dependencies.
- Merge Community Days regional exploration.
- Add screenshot, interaction, reduced-motion, image-failure, route-state, and WebGL-fallback automation.
- Add lightweight usage telemetry before any future mode expansion.

This is the cleanest destination but should be phased after MarkerModel proves itself.

## 16. Decisions requiring approval

1. Approve **Package 2 — Recommended redesign** as the target scope, with Package 1 allowed as the first shippable slice.
2. Approve the mobile core: **Home + Minimal + Gallery + Directory**, with Map temporary Advanced and Earth/Atlas/GeoLibre hidden.
3. Approve the desktop core: **Home + Earth + Minimal + Gallery + Directory + one detailed map**, with Atlas internal only for spotlights during migration.
4. Approve **no overlapping faces for groups or aggregates**; portraits are for one verified person or expanded detail.
5. Approve truthful language and states: total, mapped, approximate, across-country, and unmapped.
6. Choose the future detailed-map provider/job: **Mapbox**, **MapLibre**, or an **SVG-derived token-free map**. Recommendation: prototype MapLibre versus the SVG path after MarkerModel; do not expose provider names as modes.
7. Approve Directory as the permanent accessible/fallback action and Gallery as a non-geographic visual browse mode.
8. Approve experiment disposition: **keep Country Mosaic in lab; archive Hero Orbit and Event Reveal; merge Global Infra into Community Days**.
9. Decide whether removed modes retain `/lab` legacy deep links or redirect immediately to the nearest supported view. Recommendation: preserve lab deep links for one release, then redirect.
10. Approve authoritative coordinate cleanup as a parallel data workstream; unresolved people remain in Directory but not as precise person-level dots.

No implementation, commit, or push should begin until these decisions are confirmed.
