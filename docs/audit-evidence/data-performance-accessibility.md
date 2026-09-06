# Globe data, performance, and accessibility audit

Audit date: 2026-09-03 (Asia/Singapore)\
Scope: static code/data analysis plus a production build. No browser was used, so visual and runtime behavior described as an inference is explicitly labelled.\
Working tree: includes the local, uncommitted home-rotation changes in `src/components/MobileHomeGlobe.jsx` and `src/components/SplashScreen.jsx`.

## Executive result

The project is a polished showcase/MVP, but the data foundation is not yet reliable enough for a globe to imply precise worldwide placement. The highest-leverage work is data validation and marker semantics, not another renderer redesign.

1. **P1 — coordinate integrity is the dominant correctness problem.** Of the 2,901 non-zero Community Builder records, 2,321 are in an exact-coordinate group that also contains a different parsed country. The same test affects 105 of 250 plotted Heroes. Different countries cannot truthfully share an exact coordinate, so at least some records in those groups are misplaced.
2. **P1 — the Community Builder summary undercounts merged markers.** The 477 summary records collapse to 199 exact-coordinate markers. When more than one `clusterOnly` record shares a coordinate, the displayed cluster count is the number of summary records, not the sum of their `builderCount` values. At the India centroid the UI can say `37` even though those 37 summary records represent 318 builders.
3. **P1 — the curated home set still contains an exact overlap.** Steve Teo and AWS UG Singapore both use `1.357107, 103.8194992`; desktop creates two HTML markers at the same point. Mobile collision logic hides one label, but the underlying dots still coincide.
4. **P2 — heavyweight globe modes carry substantial payload and DOM work.** `globe.gl` is 1,776.81 kB minified / 501.17 kB gzip. The combined Mapbox/MapLibre scene path is approximately 2,733.95 kB minified / 729.43 kB gzip of JavaScript before styles, data, tiles, and images. The same scene creates hundreds of DOM marker buttons and updates every one on map render.
5. **P2 — reduced motion and image failure behavior are inconsistent.** The Sleek/Cobe globe is the strongest implementation: it respects live reduced-motion changes and pauses off-screen. Earth/globe.gl, Mapbox fly animations, and Hero Orbit do not consistently do so. Several marker renderers also lack `img.onerror` fallbacks.

## Project type and scope judgement

- **Observation:** the app exposes eight selectable views (`orbit`, `classic`, `sleek`, `flat`, `geolibre`, `icons`, `list`, and `experimental`) over multiple datasets (`src/App.jsx:59-64`, `src/App.jsx:214-237`). In the UI, `orbit` is labelled **Earth** and renders `ClassicGlobeScene`/globe.gl; `classic` is labelled **Atlas** and renders `MapboxGlobeScene`; `sleek` is labelled **Minimal** and renders the Cobe `GlobeScene` (`src/App.jsx:224-237`, `:441-449`).
- **Inference:** this is a showcase/MVP, not a production directory: the breadth of visual modes exceeds the maturity of its coordinate validation and accessibility contract.
- **Judgement:** the rendering layer is overbuilt relative to the data layer. Keep one lightweight globe plus one accessible directory as first-class experiences; treat the other renderers as experiments until the data contract is fixed.

## Dataset inventory and coordinate quality

`Plotted` applies the app's current zero-coordinate exclusion (`src/App.jsx:316-330`). `Markers` is the number of unique exact coordinates after `clusterMembersByCoordinates` (`src/utils/mapCoordinates.js:10-42`).

| Dataset | Records | Source size | Plotted | Exact-coordinate markers | Marker/record ratio | Zero coordinates | Shared coordinate groups | Largest exact stack |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Heroes | 252 | 164.6 KiB | 250 | 84 | 33.6% | 2 | 44 | 29 |
| Community Builders (full) | 3,036 | 1,881.1 KiB | 2,901 | 199 | 6.9% | 135 | 155 | 318 |
| Community Builder summary | 477 summary records / 2,901 builders | 502.7 KiB | 477 | 199 | 41.7% | 0 | 72 | 37 summary records |
| User Groups | 599 | 221.0 KiB | 598 | 489 | 81.8% | 1 | 58 | 22 |
| Student Builder Groups | 1,022 | 854.4 KiB | 1,016 | 478 | 47.0% | 6 | 142 | 49 |
| Kiro Ambassadors | 2 | 0.5 KiB | 2 | 2 | 100% | 0 | 0 | 1 |
| Kiro Events | 8 | 7.2 KiB | 8 | 7 | 87.5% | 0 | 1 | 2 |
| Community Days | 38 | 8.3 KiB | 38 | 38 | 100% | 0 | 0 | 1 |
| AWS Ambassadors | 0 | 4 bytes | 0 | 0 | — | 0 | 0 | 0 |

### Coordinate hot spots

These are exact duplicates, not proximity clusters.

| Dataset and coordinate | Records at point | Example source locations/names | Finding |
|---|---:|---|---|
| Community Builders `22.3511148, 78.6677428` | 318 people / 37 summary records | India states plus United States, Canada, Bahrain, Germany, Singapore, Australia, Sweden, United Kingdom, and Unknown | **Confirmed corruption or stale coordinate assignment.** At least the non-India records cannot belong at India's centroid. |
| Community Builders `39.7837304, -100.445882` | 109 people / 33 summary records | United States plus Japan, Mexico, Nepal, Sri Lanka, UAE, Argentina, Germany, India, Colombia, Ghana, Hong Kong, Brazil, Nigeria, Peru, Poland, Singapore, Slovakia, Vietnam | **Confirmed corruption or stale coordinate assignment.** |
| Community Builders `36.5748441, 139.2394179` | 249 people / 3 summary records | Japan, United States, Unknown | Mixed-country exact stack. |
| Heroes `39.7837304, -100.445882` | 29 | Unknown, United States, Taiwan, Serbia, Spain | Mixed-country exact stack. |
| User Groups `35.6768601, 139.7638947` | 22 | Multiple Tokyo/Japan groups | Likely legitimate coarse city placement, but one marker represents 22 organizations. |
| Student Builder Groups `19.7389230, 77.4593879` | 49 | Institutions across India, first record says Rajampet | Coarse/incorrect institutional placement; a face stack would imply a precision the data does not have. |

Cross-country duplicate test:

| Dataset | Exact-coordinate groups containing multiple parsed countries | Records in those groups |
|---|---:|---:|
| Heroes | 16 | 105 of 250 plotted (42.0%) |
| Community Builders | 67 | 2,321 of 2,901 plotted (80.0%) |
| Community Builder summary | 67 | 338 of 477 summary records (70.9%) |
| User Groups | 0 | 0 |
| Student Builder Groups | 0 | 0 |
| Kiro Ambassadors / Events / Community Days | 0 | 0 |

This test is conservative: it catches impossible cross-country stacks but not same-country mistakes such as many distant universities receiving one national/city fallback point.

### Why the Community Builder count is wrong after a second clustering pass

- The summary generator groups by `location + rounded coordinates` and stores the real number in `builderCount` (`scripts/build-community-builder-summary.mjs:15-58`).
- The UI then groups those summary records again using only exact coordinates (`src/utils/mapCoordinates.js:25-39`).
- `getPortraitGroupCount` uses `builderCount` only when the resulting marker contains exactly one summary record; otherwise it returns `cluster.members.length` (`src/utils/portraitGroupMarker.js:12-17`).
- The Cobe label has the same issue because it always uses `cluster.members.length` (`src/components/GlobeScene.jsx:199-217`).

**Concrete example:** 37 Community Builder summary records at the India centroid represent 318 builders. The multi-record marker count resolves to 37. This is a correctness failure, not merely a crowded design.

**Recommendation:** fix the coordinate pipeline first, then define a single `representedCount(cluster)` that sums `builderCount` for `clusterOnly` entries. Do not mix pre-aggregated records and person records without an explicit aggregation contract.

## Identity and image coverage

`Usable portrait` follows the project's current rule that Builder Profile default-avatar paths are not portraits (`src/utils/memberMarkers.js:26-55`). `Flag coverage` uses the current country parser/mapping.

| Dataset | Direct images | Default-avatar values | Records with a usable portrait (direct or leader) | Flag coverage | Practical marker identity |
|---|---:|---:|---:|---:|---|
| Heroes | 252/252 | 8 | 244/252 (96.8%) | 238/252 (94.4%) | Individual face is usually appropriate. |
| Community Builders | 3,036/3,036 | 356 | 2,680/3,036 (88.3%) | 2,858/3,036 (94.1%) | Face is appropriate only at verified individual coordinates. |
| Builder summary | 0 direct; 991 leader previews | 96 leader previews | 440/477 (92.2%) | 450/477 (94.3%) | A count/category badge is semantically safer than implying three leaders own the location. |
| User Groups | 0/599 | 0 | 0/599 | 598/599 (99.8%) | Flag or group badge is appropriate; no faces exist. |
| Student Builder Groups | 0/1,022; 1,021 leader values | 621 leader values | 398/1,022 (38.9%) | 1,009/1,022 (98.7%) | A school/group badge should be the default. Only 38.9% can show a real leader face. |
| Kiro Ambassadors | 1/2 | 0 | 1/2 (50%) | 2/2 | Mixed face/initial fallback. |
| Kiro Events | 8/8 local icon | 0 | 8/8 | 3/8 (not relevant to icon) | Event badge is appropriate. |
| Community Days | 0/38 | 0 | 0/38 | 38/38 | Flag/date badge is appropriate. |

Additional observations:

- The raw data contains 1,081 references to `/assets/default-avatar-light-LR35u67I.svg`, and that file is not shipped under `public/`. This does **not** currently cause 1,081 broken requests because `isUsableMemberImage` intentionally suppresses it (`src/utils/memberMarkers.js:50-55`). Keep this guard and enforce it at ingest time instead of retaining known-unusable URLs.
- The shipped fallback assets exist: `/ambassadors/eric-gozippy.jpg`, `/kiro-ambassador-icon.svg`, and `/student-builder-group-logo.png`.
- Remote portrait URLs are overwhelmingly on `avatars.builderprofile.aws.dev`: 244 Hero images, 2,680 full Builder images, 895 summary preview values, and 400 Student leader values. These were not live-request tested in this static audit.
- The Hero and Community Builder placeholder logos are remote third-party dependencies (`src/utils/portraitGroupMarker.js:4-8`, duplicated in `src/components/ClassicGlobeScene.jsx:27-35`). If either host fails or blocks embedding, the fallback itself breaks.
- `createPortraitGroupAvatar` and `createPortraitFallback` set image sources but no error handler (`src/utils/portraitGroupMarker.js:59-100`, `:130-142`). Classic duplicates the same gap (`src/components/ClassicGlobeScene.jsx:95-147`, `:314-347`). Flag images also have no failure fallback (`src/components/ClassicGlobeScene.jsx:244-291`, `src/components/MapboxGlobeScene.jsx:128-176`).
- Desktop splash avatars do recover to a category badge on error (`src/components/SplashScreen.jsx:95-116`). Mobile home avatars instead hide the failed `<img>` but do not render the badge because the badge exists only in the no-image branch (`src/components/MobileHomeGlobe.jsx:251-260`). **Inference:** a failed mobile home portrait leaves an empty marker shell.

### Static estimate of DOM marker/image pressure

The table simulates the default unfiltered Earth/globe.gl and Atlas/Mapbox marker creation logic. Browser caching reduces network transfers for duplicate URLs, but it does not remove the DOM elements or per-frame placement work.

| Category | Marker buttons | Image elements | Remote portrait elements | Placeholder image elements | External flag elements | Unique image/flag keys |
|---|---:|---:|---:|---:|---:|---:|
| Heroes | 84 | 153 | 149 | 4 | 0 | 149 |
| Community Builder summary | 199 | 453 | 438 | 15 | 0 | 426 |
| User Groups | 489 | 0 | 0 | 0 | 488 | 108 |
| Student Builder Groups | 478 | 697 | 282 | 415 | 0 | 282 |
| Kiro Ambassadors | 2 | 1 | 0 | 0 | 0 | 1 |
| Kiro Events | 7 | 8 | 0 | 0 | 0 | 1 |
| Community Days | 38 | 0 | 0 | 0 | 38 | 26 |

The portrait layouts intentionally preview up to three faces (`src/utils/portraitGroupMarker.js:3`, `:59-104`). For organizations and coarse coordinate clusters, that visual choice is both heavier and less truthful than one category badge plus a count.

## Curated home-globe data

- **Good:** the home set is deliberately small, avoiding multi-megabyte category downloads before entry (`src/data/home-community-markers.js:41-43`, `src/components/SplashScreen.jsx:230-244`).
- It has 14 records balanced across five categories: 3 Heroes, 3 Community Builders, 3 User Groups, 3 Student Builder Groups, and 2 Kiro Ambassadors. Seven have images and seven use category badges.
- **Problem:** Steve Teo (`src/data/home-community-markers.js:112-119`) and AWS UG Singapore (`:128-134`) have identical coordinates. Desktop passes both directly to `globe.gl` (`src/components/SplashScreen.jsx:247-277`), so the HTML markers occupy the same point. Mobile collision filtering prevents both labels appearing simultaneously (`src/components/MobileHomeGlobe.jsx:128-159`) but the Cobe dots still coincide (`:22-31`).
- **Recommendation:** keep the balanced home dataset, but enforce unique display coordinates or a deliberate mixed-category cluster badge. Do not use jitter without indicating approximate placement.
- **Maintenance risk:** home totals are manually duplicated twice in `SplashScreen.jsx` (`:6-17` and `:363-374`) instead of derived from a versioned data summary. They currently match the source files but can silently drift after data refresh.

## Production build evidence

Command: `npm run build`\
Result: passed with Vite's `Some chunks are larger than 500 kB` warning.

Largest relevant chunks:

| Asset | Minified | Gzip | Interpretation |
|---|---:|---:|---|
| `globe.gl` | 1,776.81 kB | 501.17 kB | Loaded by desktop splash, the UI's Earth view, and experiments. |
| `mapbox-gl` | 1,735.32 kB | 470.00 kB | Loaded by Mapbox globe/map paths. |
| `MapboxGlobeScene` | 998.63 kB | 259.43 kB | Includes the scene plus MapLibre-side implementation. |
| Full Community Builders | 1,561.04 kB | 298.84 kB | Loaded for directory/gallery/new/filter paths. |
| Student Builder Groups | 693.76 kB | 127.90 kB | Category data. |
| Builder summary | 379.81 kB | 48.96 kB | Sensible default optimization, but still large. |
| User Groups | 179.71 kB | 28.65 kB | Category data. |
| Heroes | 138.80 kB | 29.75 kB | Category data. |
| Cobe runtime (`index.esm`) | 11.61 kB | 5.54 kB | Much smaller renderer path. |

Local Earth textures add another 1,840.0 KiB uncompressed: `earth-blue-marble.jpg` is 1,427.6 KiB and `earth-topology.png` is 369.4 KiB.

### Performance observations

- **Strong implementation:** Cobe/Sleek caps device pixel ratio and map samples by mobile/desktop, uses a fixed label pool, pauses when off-screen/hidden, and uses elapsed-time rotation (`src/components/GlobeScene.jsx:27-35`, `:337-371`, `:375-437`, `:439-521`, `:525-559`). Mobile home uses an even lower 1.25 DPR / 9,000 samples and pauses on intersection/visibility (`src/components/MobileHomeGlobe.jsx:49-60`, `:162-177`).
- **Moderate risk in Sleek:** every render projects all clusters, sorts them, draws all visible markers, then sorts label candidates again (`src/components/GlobeScene.jsx:418-450`). This is up to 489 clusters for User Groups and 478 for Student Groups. It is still materially lighter than hundreds of DOM portraits.
- **High payload:** `MapboxGlobeScene` eagerly imports both `mapbox-gl` and `maplibre-gl` in one lazy scene (`src/components/MapboxGlobeScene.jsx:1-5`). Selecting either Atlas/Mapbox or GeoLibre therefore pulls a combined implementation path. Split the engines into separate dynamic modules.
- **High per-frame DOM work:** Mapbox creates a marker DOM tree for every exact-coordinate cluster (`src/components/MapboxGlobeScene.jsx:713-758`) and loops all markers on every map `render`, `move`, `zoom`, and `resize` (`:838-891`). For User Groups this is 489 buttons and 488 flag images; for Student Groups, 478 buttons and 697 nested image elements.
- **Earth/globe.gl:** creates HTML marker trees for all clusters (`src/components/ClassicGlobeScene.jsx:622-687`) and starts an additional requestAnimationFrame rotation loop (`:488-523`). There is no intersection/document-visibility pause in application code.
- **Frame-rate-dependent rotation:** `useAutoRotate` adds a constant `0.15` longitude units on every frame rather than multiplying by elapsed time (`src/hooks/useAutoRotate.js:3-27`). A 120 Hz screen rotates approximately twice as fast as a 60 Hz screen and performs twice as many `pointOfView` calls.
- **Desktop home cost:** after an idle callback, it loads `globe.gl`, the two large Earth textures, and runs a continuous RAF even though the globe is non-interactive (`src/components/SplashScreen.jsx:241-307`). The 14-marker data optimization is good, but the renderer dominates the cost.
- **Experimental Hero Orbit:** instantiates a button/image and Three CSS3D object for every Hero, two CSS3D renderers, a 22,000-sample Cobe globe, and a second perpetual RAF (`src/components/ExperimentalGlobeScene.jsx:70-107`, `:145-204`). It also rebuilds the entire scene when `cardOpen` changes because the effect depends on it (`:213`). Keep this experimental, not a primary globe.
- **Good data loading:** categories are dynamically imported and cached; the default Builder globe uses the summary until a directory/gallery/filter requires full records (`src/hooks/useCategory.js:3-14`, `:51-61`, `:88-140`; `src/App.jsx:217-220`).

## Reduced-motion behavior

| Experience | Observation | Assessment |
|---|---|---|
| Mobile home Cobe | Stops changing `phi` when reduced motion is active (`src/components/MobileHomeGlobe.jsx:105`, `:200-203`). | Good, though the Cobe render loop still exists and preference changes are not listened for. |
| Desktop splash | Suppresses the interactive globe entirely when reduced motion is active (`src/components/SplashScreen.jsx:452-486`). | Good. |
| Sleek/Cobe category globe | Disables auto-rotation, reacts to preference changes, and removes label transitions (`src/components/GlobeScene.jsx:337-342`, `:536-559`; `src/components/GlobeScene.css:125-128`). | Best implementation. |
| Earth/globe.gl | `useAutoRotate` never reads reduced-motion (`src/hooks/useAutoRotate.js`). | **P2 failure** when a user manually chooses Earth despite the responsive default favoring Sleek (`src/App.jsx:66-71`). |
| Mapbox / GeoLibre | No reduced-motion check. Several programmatic movements use animated `flyTo` and explicitly set `essential: true` (`src/components/MapboxGlobeScene.jsx:730-748`, `:806-816`, `:894-904`). | **P2 failure/inference:** essential animations are intended to run even when reduced motion is requested. |
| Experimental Hero Orbit | Globe rotation and CSS3D RAF run continuously without reduced-motion or visibility checks (`src/components/ExperimentalGlobeScene.jsx:165-204`). | **P2 failure.** |
| Experimental Event Reveal | Starts auto-rotation and a perpetual CSS3D RAF without reduced-motion handling (`src/components/ExperimentalEventReveal.jsx:122-159`, `:176-211`). | **P2 failure.** |
| Experimental Country Mosaic | Detects reduced motion and jumps to completed state (`src/components/ExperimentalPixelMap.jsx:213-218`, `:415-425`). | Good. |
| HUD live ring | `live-ring` runs continuously; nearby reduced-motion blocks do not disable it (`src/index.css:417-421`, `:636-653`). | P3 polish issue. |

## Accessibility findings

### What is working

- The mobile home globe has a concise `role="img"` label and hides its canvas/visual labels from assistive technology (`src/components/MobileHomeGlobe.jsx:229-267`).
- Earth/globe.gl and Atlas/Mapbox marker roots are native buttons with labels (`src/components/ClassicGlobeScene.jsx:194-214`, `src/components/MapboxGlobeScene.jsx:67-96`). Mapbox's single-member label includes name and location.
- Sleek exposes the current visible labels as native buttons, assigns names, and removes hidden labels from tab order (`src/components/GlobeScene.jsx:472-520`, `:814-835`).
- List/Directory is available as a non-spatial alternative, and mobile view controls expose pressed state in `MobileNavigation.jsx`.

### What should change

1. **View-switcher state is not announced on desktop.** The design buttons in `src/App.jsx:1282-1292` and Community Days buttons in `src/components/CommunityDaysScene.jsx:143-165` do not set `aria-pressed`, `aria-current`, or a radio-group state. The surrounding plain `div` has `aria-label` but no group role. A keyboard/screen-reader user cannot reliably determine the active globe view.
2. **Sleek supports selection but not keyboard globe navigation.** The primary canvas has no accessible name or keyboard pan/rotate operation (`src/components/GlobeScene.jsx:792-808`). Only the currently visible 8 mobile / 18 desktop labels enter the tab order (`:439-451`). The Directory is therefore the essential accessibility path and should be labelled as such.
3. **Earth/globe.gl labels are too generic.** A single marker is announced as `1 member at this location`, without the person's/group's name or actual location (`src/components/ClassicGlobeScene.jsx:200-204`). Atlas/Mapbox already demonstrates the better single-member label (`src/components/MapboxGlobeScene.jsx:73-82`).
4. **Desktop splash semantics are noisy.** The globe container has no role/label, while portrait images have real-name alt text and badge-only markers expose text inside otherwise decorative, pointer-disabled markers (`src/components/SplashScreen.jsx:55-116`, `:355-360`). Either hide the entire decorative globe or expose one deliberate summary/list—not an accidental mixture.
5. **Hero Orbit can leave non-front portraits keyboard-focusable.** Layout changes `pointerEvents` based on depth but does not update `tabIndex` or `aria-hidden` for back-layer portraits (`src/components/ExperimentalGlobeScene.jsx:109-142`). **Inference:** a keyboard user can tab to a portrait that is visually behind the globe.
6. **Map engine container naming is weak.** `MapboxGlobeScene` returns an unlabeled map container and overlay (`src/components/MapboxGlobeScene.jsx:918-945`). GeoLibre wraps it in a labelled section, but Mapbox/Atlas usage does not. Add a stable map label and instructions, or mark the map canvas decorative while exposing markers/list separately.
7. **Potential attribution/compliance issue:** Mapbox and GeoLibre disable the built-in attribution control (`src/components/MapboxGlobeScene.jsx:588-599`; flat map does the same at `src/components/MapboxFlatScene.jsx:339`), and no visible replacement was found. Verify provider requirements before keeping these views.

## Severity-ranked actions

### P0

No P0 issue was established by static analysis.

### P1

1. Validate/rebuild Hero and Community Builder coordinates; reject impossible country-coordinate pairs during data update.
2. Fix represented counts when `clusterOnly` summaries share coordinates. Add tests for the 37-record/318-builder India example.
3. Remove or deliberately cluster the duplicate Singapore records in the home preview.

### P2

1. Use category/group badges plus counts for summary Community Builders and Student/User Groups; reserve faces for verified person-level coordinates.
2. Add a single local fallback chain for every marker image and flag. Fix the mobile home error branch.
3. Split Mapbox and MapLibre modules; do not import both engines for one selected view.
4. Add reduced-motion behavior and visibility pausing to Earth/globe.gl, Mapbox/GeoLibre, and experiments; make rotation elapsed-time based.
5. Add `aria-pressed`/group semantics to view switchers, improve Earth/globe.gl labels, and make Directory the clearly named accessible alternative.

### P3

1. Derive home totals from generated metadata rather than maintaining duplicate literals.
2. Disable the HUD pulse under reduced motion.
3. Remove known default-avatar URLs at ingest and report image coverage in generated metadata.
4. Review duplicate organization names (four Student group names) and recurring event names; IDs are unique, so this is a data-review item rather than proven duplication.

## Recommended keep/remove implications from this sub-audit

- **Keep as the default on mobile:** Sleek/Cobe. It has the smallest renderer, the best motion handling, visibility pausing, bounded labels, and canvas markers.
- **Keep as the accessible counterpart on all devices:** Directory/List.
- **Keep with changes on desktop:** at most one rich Earth renderer after coordinate repair. Earth/globe.gl is expensive but simpler than shipping both Mapbox and MapLibre. If rich basemap detail is essential, keep one map engine and lazy-load it explicitly.
- **Do not use face stacks for aggregate organizations or coarse country-centroid data.** Use a category badge, represented count, and expandable list.
- **Keep GeoLibre/Mapbox and Hero Orbit experimental until** payload, reduced-motion, attribution, and DOM-marker issues are resolved.
- **AWS Ambassadors has no marker experience to evaluate:** the dataset is empty and the app renders a coming-soon state (`src/App.jsx:819-879`). Do not count it as a working globe category.

## Reproduction commands

All commands were run from `D:\Github-Local\aws-community-world` in PowerShell.

### Production bundle

```powershell
npm run build
```

### Source dataset sizes and record counts

```powershell
$rows = @(Get-ChildItem src\data\*.json | Sort-Object Name | ForEach-Object {
  $obj = (Get-Content -Raw $_.FullName) | ConvertFrom-Json
  [PSCustomObject]@{
    File = $_.Name
    Count = if ($obj -is [System.Array]) { $obj.Count } else { 1 }
    Bytes = $_.Length
    KiB = [math]::Round($_.Length / 1KB, 1)
  }
})
$rows | Format-Table -AutoSize
```

### Plotted counts and exact-coordinate markers

```powershell
node --input-type=module -e 'import fs from "node:fs"; const names=["heroes","community-builders","community-builders-clusters","user-groups","cloud-clubs","kiro-ambassadors","kiro-events","community-days","aws-ambassadors"]; for(const name of names){const a=JSON.parse(fs.readFileSync(`src/data/${name}.json`,"utf8"));const plotted=a.filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng)&&(x.lat!==0||x.lng!==0));const coords=new Set(plotted.map(x=>`${x.lat}|${x.lng}`));console.log(`${name}\t${a.length}\t${plotted.length}\t${coords.size}\t${((coords.size/Math.max(plotted.length,1))*100).toFixed(1)}%`)}'
```

### Cross-country exact-coordinate test

```powershell
node --input-type=module -e 'import fs from "node:fs"; const names=["heroes","community-builders","community-builders-clusters","user-groups","cloud-clubs","kiro-ambassadors","kiro-events","community-days"]; for(const name of names){const a=JSON.parse(fs.readFileSync(`src/data/${name}.json`,"utf8"));const m=new Map;for(const x of a){if(x.lat===0&&x.lng===0)continue;const k=`${x.lat}|${x.lng}`;const v=m.get(k)||[];v.push(x);m.set(k,v)}const country=x=>x.country||String(x.location||"").split(",").at(-1)?.trim()||"Unknown";const cross=[...m.entries()].filter(([,v])=>new Set(v.map(country)).size>1);console.log(JSON.stringify({dataset:name,groups:cross.length,records:cross.reduce((n,[,v])=>n+v.length,0)}))}'
```

### Known local image paths

```powershell
node --input-type=module -e 'import fs from "node:fs"; const names=["heroes","community-builders","community-builders-clusters","user-groups","cloud-clubs","kiro-ambassadors","kiro-events","community-days"]; const refs=new Map; for(const name of names){const a=JSON.parse(fs.readFileSync(`src/data/${name}.json`,"utf8"));for(const x of a){for(const u of [x.avatarUrl,x.image_url,...(x.ledBy||[]).map(l=>l.imageUrl)]){if(typeof u==="string"&&u.startsWith("/"))refs.set(u,(refs.get(u)||0)+1)}}}for(const [u,count] of [...refs].sort())console.log({url:u,count,exists:fs.existsSync(`public${u}`)})'
```

## Limits of this evidence

- No browser, network waterfall, CPU profile, screen reader, or live endpoint health test was run in this sub-audit.
- Payload sizes are Vite build output, not full page-transfer totals. Tiles, remote avatars, flags, cache state, HTTP compression, and device GPU/CPU will change runtime cost.
- Cross-country exact-coordinate groups prove that the group cannot be wholly correct; they do not identify which individual record owns the coordinate. Same-country coordinate errors require source-level validation or reverse geocoding.
- Accessibility findings are code-based. Confirm the final priority with keyboard-only, reduced-motion, and screen-reader tests in the integrated QA pass.
