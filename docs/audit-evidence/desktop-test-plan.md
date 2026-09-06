# Desktop globe QA route matrix

Static test specification only. No browser run is represented by this file.

## Purpose and test boundary

This plan is the smallest desktop suite that still exercises every user-facing renderer, every category-specific marker family, both home modes, the four experiments, the two spotlight aliases, the hidden empty category, the insights route, and the WebGL fallback. It deliberately avoids a full category-by-renderer Cartesian product.

Use `http://localhost:5173` as `BASE`. Run against a production build (`npm run build` then `npm run preview`) when making performance or release decisions; a Vite development server is acceptable for layout and DOM assertions. Preserve query strings exactly because any recognized share query bypasses the splash (`src/App.jsx:83-124`, `src/App.jsx:169-172`).

The seven main view names exposed to users map as follows (`src/App.jsx:224-237`, `src/App.jsx:441-448`):

| Query | UI name | Ready-state selector | Distinct implementation |
|---|---|---|---|
| `view=orbit` | Earth | `canvas` plus renderer-specific marker assertions below | `ClassicGlobeScene` / `globe.gl` |
| `view=classic` | Atlas | `.mapboxgl-map .mapboxgl-canvas` | `MapboxGlobeScene` / Mapbox GL |
| `view=sleek` | Minimal | `[aria-label="Visible globe locations"]` | `GlobeScene` / cobe plus HTML labels |
| `view=flat` | Map | `.mapboxgl-map .mapboxgl-canvas` | `MapboxFlatScene` / Mapbox GL |
| `view=geolibre` | GeoLibre | `.geolibre-scene .maplibregl-map .maplibregl-canvas` | `GeoLibreScene` wrapping the Atlas renderer with MapLibre |
| `view=icons` | Gallery | `.hero-dex` | `ExperimentalHeroDex` |
| `view=list` | Directory | `section[aria-label$=" list"]` | `ListScene` |

`view=experimental` is a separate four-mode lab and `view=insights` / `view=trends` is a non-globe baseline. If WebGL creation fails, the selected WebGL scene is replaced by `svg[aria-label="Flat world map"]` (`src/App.jsx:146-166`, `src/App.jsx:224-252`, `src/components/FlatMapScene.jsx:250`).

## Execution tiers and desktop sizes

Run the matrix in this order. This reduces redundant captures while making the five requested desktop sizes explicit.

| Tier | Sizes | Cases | Goal |
|---|---|---|---|
| A — canonical | **1440x900** | D01-D19 and F01 | Complete behavior/category coverage and scored screenshots |
| B — tight desktop | **1024x768** | Viewport spine D01, D03, D05, D07, D09, D10, D11-Heroes, D12, D15, D19-Hero Orbit; plus risk cases D08, D14, D16, D17 | Header/control fit, face-stack density, modal fit, labels, and experiment picker |
| C — common laptop | **1280x800** | Viewport spine D01, D03, D05, D07, D09, D10, D11-Heroes, D12, D15, D19-Hero Orbit | One representative per distinct renderer plus the collision-prone home and event wrappers |
| D — short laptop | **1366x768** | Viewport spine D01, D03, D05, D07, D09, D10, D11-Heroes, D12, D15, D19-Hero Orbit; plus D17 | Short-height clipping and HUD/control overlap |
| E — wide | **1920x1080** | Viewport spine D01, D03, D05, D07, D09, D10, D11-Heroes, D12, D15, D19-Hero Orbit | Excessive globe scaling, sparse composition, label drift, and max-width behavior |

The Tier B-E subsets are a **viewport spine**, not new product coverage. Only add a missing route at another size when its canonical result fails or its bounding boxes cross a breakpoint.

## Route matrix

Screenshot codes: **E** = essential decision evidence; **C** = capture only on failure or material viewport difference; **—** = assertions and score only. Every essential capture should include the full viewport, not a cropped globe.

| ID | Exact URL | Coverage and actions | Required DOM/semantic assertions | Sizes | Shot |
|---|---|---|---|---|---|
| D01 | `BASE/` | Desktop home, Community mode. Wait for lazy globe, then click **Switch to Event Globe**, wait for the renderer to rebuild, and switch back. Do not click Explore until both modes are recorded. | Community: button `[aria-label="Switch to Event Globe"]`, text `Community Globe`, CTA `Explore the Community Globe`, right-panel `canvas`, and at least one marker image. Event: button `[aria-label="Switch to Community Globe"]`, CTA `Explore the Event Globe`, `canvas`, and event marker nodes. Assert the globe does not invade the left copy/CTA column and remains fully composed at both width extremes. Home uses curated community markers but the real 38 Community Days + 8 Kiro Events for Event mode (`src/components/SplashScreen.jsx:218-277`, `src/components/SplashScreen.jsx:518-678`). | all five | **E** Community + Event at 1440; **E** both at 1024 and 1920; C otherwise |
| D02 | `BASE/?tab=heroes&view=orbit` | Earth + people portrait clusters. Wait for the globe, inspect a multi-person marker, click it, then close the profile/cluster dialog. | A visible `canvas`; `[aria-label="Globe design switcher"]` contains button text `Earth`; at least one `button [data-portrait-cluster-marker]`; its descendant images have `complete && naturalWidth > 0`; marker count badge is an integer; click yields `[role="dialog"][aria-label="Cluster members"]` or a named profile; close with `[aria-label="Close"]`. Three-person face layout is sourced at `src/components/ClassicGlobeScene.jsx:95-149` and used for count >1 at lines 238-242. | 1440 | **E** dense cluster and open dialog |
| D03 | `BASE/?tab=cloud-clubs&view=orbit` | Earth + Student Builder Group leader-face clusters; highest-priority regression for merged/funny faces. Test one dense location at default view, after zoom-in, and after zoom-out. | `button [data-portrait-cluster-marker]` exists. Each cluster has no more than three preview `<img>` nodes plus one numeric badge; images load; faces are distinct where source URLs differ; images remain circular and are not squashed; zoom changes the CSS transform/separation or projected distance without faces clipping outside the 78x58 marker root. Click opens a cluster/profile dialog. Student leader records are converted to portrait previews at `src/components/ClassicGlobeScene.jsx:57-67`; Student Builder Groups are explicitly a portrait category at lines 70-73. | all five | **E** 1024, 1440, 1920; C at 1280/1366 |
| D04 | `BASE/?tab=user-groups&view=orbit` | Earth + no-avatar group semantics. Open one marker. | A marker contains `img[alt$=" flag"]`; flags load and are circular; multi-group points show `+N` rather than invented faces; click opens a cluster or group profile dialog. Earth flag branch is `src/components/ClassicGlobeScene.jsx:277-310`. | 1440 | **E** one dense flag cluster |
| D05 | `BASE/?tab=community-builders&view=classic` | Atlas + portrait groups on the 477-record summary payload. Zoom until a cluster separates; open one. | With a valid token: `.mapboxgl-map`, `.mapboxgl-canvas`, `button [data-portrait-cluster-marker]`, loaded images, numeric badge, and dialog after click. The portrait marker must change `--portrait-separation`/transform as zoom changes. Without a token: assert the exact visible configuration message and mark renderer scoring **blocked**, not failed. Atlas reuses the shared portrait utility (`src/components/MapboxGlobeScene.jsx:119-127`; utility at `src/utils/portraitGroupMarker.js:59-127`). | all five | **E** 1024, 1440, 1920; C otherwise |
| D06 | `BASE/?sg=1` then `BASE/?sl=1` | Student country spotlight aliases. Verify both aliases resolve to Student Builder Groups + Atlas and exercise the special labelled leader marker/country camera. | URL has `sg=1` or `sl=1`; category label is `Student Builder Groups`; design switcher contains `Atlas`; with token, `.mapboxgl-map` and a visible labelled spotlight marker image/initials; the country filter state and camera target are set. Repeat assertions for both aliases, but capture only `sg=1` unless behavior differs. Spotlight forces category and Atlas at `src/App.jsx:95-121`; dedicated leader marker image/initials branch is `src/components/MapboxGlobeScene.jsx:495-528`. | 1440; 1024 if spotlight UI differs | **E** SG at 1440; C SL |
| D07 | `BASE/?tab=community-builders&view=sleek` | Minimal + large Community Builder summary labels. Pan/rotate, zoom twice, select one label. | `[aria-label="Visible globe locations"]`, at least one `.minimal-marker-label`, exactly one `.minimal-marker-label__icon` and `.minimal-marker-label__text` per visible label, and a globe `canvas`. Labels must be screen-bounded, non-overlapping with bottom controls, and update position after motion. Click/focus label opens a profile/cluster dialog. Minimal label DOM is `src/components/GlobeScene.jsx:814-833`. | all five | **E** 1024 and 1440; C other sizes |
| D08 | `BASE/?tab=user-groups&view=sleek&theme=light` | Minimal + flag-derived group labels + light theme. | Minimal selectors above; at least one `.minimal-marker-label__icon--flag`; flag text is a country emoji, not a broken image; text/background has readable contrast; `body`/shell is in light state; URL retains `theme=light` after interaction. Flag assignment is `src/components/GlobeScene.jsx:219` and the visible icon toggle is lines 472-481. | 1024, 1440 | **E** both sizes |
| D09 | `BASE/?tab=cloud-clubs&view=flat` and `BASE/?tab=heroes&view=flat` | Map + legacy stacked-image marker path. The Student variant checks leader images; the Hero variant proves the same stack branch with person portraits. | With token: `.mapboxgl-map`, `.mapboxgl-canvas`, marker buttons with loaded `<img>` nodes; multi-image markers use 24x24 images and negative left margins and show `+N` when above the preview limit. Images must remain distinguishable at 100% and 200% browser zoom. Without token, assert the config message and block scoring. Unlike Earth/Atlas, Map uses overlapping image stacks (`src/components/MapboxFlatScene.jsx:164-181`, lines 225-230), so this case cannot be inferred from D03/D05. | all five for Student; 1440 Hero | **E** Student at 1024 and 1440; **E** Hero at 1440 if stack differs; C elsewhere |
| D10 | `BASE/?tab=user-groups&view=geolibre` | GeoLibre + MapLibre + flag markers; confirms the token-independent Atlas variant. Open a group. | `.geolibre-scene[aria-label="GeoLibre community globe"]`, `.maplibregl-map`, `.maplibregl-canvas`, a loaded `img[alt$=" flag"]`, and dialog after click. No `VITE_MAP_BOX` message even when the Mapbox token is absent. Wrapper is `src/components/GeoLibreScene.jsx:4-8`; token independence is `src/components/MapboxGlobeScene.jsx:571-586`. | all five | **E** 1024 and 1440; C elsewhere |
| D11 | `BASE/?tab=heroes&view=icons`, then replace `tab` with `community-builders`, `user-groups`, `cloud-clubs`, and `kiro-ambassadors` | Gallery's five supported category configurations: photos, 3,036-record stress, country flags, leader images, and one missing-avatar fallback. For each: search a known visible term, move scrub slider, rotate once, open and close a tile. | `.hero-dex[data-category="<tab>"]`, `.hero-dex__hex`, `.hero-dex__scrub-slider[aria-label="Move through archive columns"]`, search input, loaded `.hero-dex__portrait-image` **or** intended `.hero-dex__placeholder`; tile click opens the category record dialog; close, previous, and next controls work. Gallery is intentionally limited to five categories (`src/App.jsx:60-62`, lines 214-216). Tile/slider/dialog DOM is `src/components/ExperimentalHeroDex.jsx:523-633`. | all five for Heroes; 1440 only for four variants | **E** Heroes at 1024/1440/1920; **E** Cloud Clubs and Kiro at 1440; C CB/UG unless failure |
| D12 | `BASE/?tab=cloud-clubs&view=list` | Directory + group/leader card semantics and list pagination. Search and open one card; scroll to load the next page. | `section[aria-label="Student Builder Groups list"]`; `input[placeholder="Search names, places or specialties"]`; initial card count is 1-60; cards are visible in two columns at desktop; search reduces result count; card opens the expected profile; scrolling increases shown items without duplicate keys/visual overlap. Directory root/search are `src/components/ListScene.jsx:160-203`; cards start at lines 213-223. | all five | **E** 1024 and 1440; C elsewhere |
| D13 | `BASE/?tab=kiro-ambassadors&view=orbit` | Small two-person category and missing-image fallback. Open both records. | HUD/category label `Kiro`; expected total 2; no artificial multi-person location merge unless coordinates actually coincide; all rendered images load or show an intentional initials/logo fallback; both records open named dialogs. Also verify Gallery variant via D11. | 1440 | **E** if the missing-avatar fallback is visible; otherwise C |
| D14 | `BASE/?tab=kiro-events&view=orbit` | Normal event category, event marker/profile path, and Events header section. Open one event. | Category label `Kiro Events`, expected total 8, event markers are not portrait clusters, marker click opens a named event dialog with a Join/CTA action, and Header content is Events. | 1024, 1440 | **E** both sizes |
| D15 | `BASE/?tab=community-days&view=orbit` | Custom Community Days wrapper. In its own switcher, test Earth, Atlas, Minimal, Map, GeoLibre, and Directory; test current and past event markers, countdown, and one profile. | `section[aria-label="AWS Community Days globe"]`, `.community-days-controls`, `[aria-label="Community Days view switcher"]`; Earth/Atlas/Map event markers include loaded country flags; visible event tooltip contains `.community-day-countdown[data-countdown-at]` where supplied; past/current styling differs; profile opens. Switching renderers must not create two canvases/maps or strand old markers. Wrapper/control source is `src/components/CommunityDaysScene.jsx:100-175`; countdown sources are `src/components/ClassicGlobeScene.jsx:439`, `src/components/MapboxGlobeScene.jsx:314-317`, and `src/components/MapboxFlatScene.jsx:274`. | all five | **E** Earth at 1024/1440/1920; **E** one Atlas and one Directory state at 1440; C remaining renderers |
| D16 | `BASE/?tab=news&view=orbit`, then `BASE/?tab=news&view=list` | News overlay on Earth, then News Directory behavior. Close/reopen the news panel; select an item on globe and in list. | Earth: `[aria-label="Close news panel"]`, visible heading `Today's AWS Stories`, underlying `canvas`; closing changes outer toggle to `[aria-label="Open news panel"]`; opening restores it. List: `section[aria-label="News list"]`; story actions navigate/read and must not open a person profile. News view is a separate rendering branch at `src/App.jsx:880-920`; panel close selector is `src/components/NewsPanel.jsx:254`. | 1440; 1024 Earth | **E** panel open at 1024 and 1440; C list |
| D17 | `BASE/?tab=aws-ambassadors&view=orbit` | Hidden zero-record category / coming-soon state. | Visible `AWS Ambassador`, `Collecting data coming soon.`, no member/profile marker, no uncaught data error, and background uses the forced Minimal/fallback treatment. Empty-state forcing occurs at `src/App.jsx:221-237` and `src/App.jsx:819-878`. | 1440; 1024/1366 for fit | **E** 1440; C other sizes |
| D18 | `BASE/?tab=community-builders&view=orbit&country=India` | Filter-triggered full 3,036-record Community Builder payload, Earth density/performance, and URL persistence. Open one marker, then clear/reapply country. | Category total/result count changes to the India subset; no loading/error banner remains; portrait cluster semantics match D02; clearing country returns to summary behavior; URL updates without navigation loop. Full payload trigger is `src/App.jsx:208-220`; repeated route values are parsed at lines 79-80 and 106-123. | 1440 | **E** only if density exposes new collision; otherwise C |
| D19 | `BASE/?view=experimental` and `BASE/?view=insights` | Lab: click Country Mosaic, Hero Orbit, Event Reveal, Global Infra and exercise one primary interaction in each. Then load non-globe Insights baseline. | Lab: `.experimental-lab`, `[aria-label="Choose an experiment"]`, exactly four buttons with correct `aria-pressed`; stages identify `.pixel-globe`, `[aria-label="Experimental infinite 3D Hero carousel"]`, `.event-reveal`, and `.global-infra` respectively. No stale prior stage remains. Insights: heading `Community analytics`, `[aria-label="Insights sections"]`, no globe design switcher. Experiment definitions/selection are `src/components/ExperimentalGlobeScene.jsx:236-272`; Insights anchor is `src/components/TrendsDashboard.jsx:495-518`. | all five | **E** all four lab stages at 1440; **E** Hero Orbit at 1024 and 1920; C Insights |
| F01 | `BASE/?tab=heroes&view=orbit` in a browser context with WebGL disabled before app bootstrap | Renderer error/fallback contract. Run once per release, not per viewport. | `svg[aria-label="Flat world map"]`, `[data-marker-interactive="true"]`, `[aria-label="Zoom out flat map"]`, `[aria-label="Zoom in flat map"]`; marker click still opens a profile/cluster. No infinite error-boundary loop. Use 1440 unless a tight-layout fallback bug is suspected. | 1440 | **E** fallback map |

### Mapbox precondition

D05, D06, and D09 require a valid `VITE_MAP_BOX` value to score Atlas/Map functionality. First run a single deliberate token-off smoke: D05 and D09 must show `Add VITE_MAP_BOX ...` (`src/components/MapboxGlobeScene.jsx:918-944`, `src/components/MapboxFlatScene.jsx:549-575`). Do not repeat token-off at every resolution. GeoLibre D10 must still render without the token.

### Why this is not a Cartesian-product test

- Earth is sampled with portrait people, leader portraits, flags, small-person data, events, Community Days, News, and a full-data filter because those are distinct marker or shell branches.
- Atlas is sampled with portrait grouping and the special Student spotlight; GeoLibre separately covers the same marker factory on a different engine.
- Map gets people and Student groups because it still uses its own overlapping-image implementation rather than the newer portrait-group utility.
- Minimal gets text labels and flag labels; these cover its two meaningful visual types.
- Gallery receives all five supported categories because its per-category portrait/placeholder configuration changes materially.
- Directory receives the group/leader path, the event wrapper path, and News's different click behavior.

## Assertions to apply to every case

### 1. Navigation and readiness

1. Set viewport before navigation and start from a clean page state.
2. Navigate to the exact URL; wait for network idle only as a secondary signal. Wait primarily for the route's ready selector.
3. Fail on uncaught page errors, React error-boundary output, repeated WebGL errors, or a `role="alert"` that remains after data settling. Record console warnings separately; expected token-off warnings do not fail the token-off smoke.
4. Confirm the URL retains `tab`, `view`, `theme`, spotlight, and filter state after one interaction. The application writes its canonical state with `history.replaceState` (`src/App.jsx:127-143`).
5. Confirm `[aria-label="Community categories"]` is available on normal desktop content routes and absent only for Experimental/Insights. Do not depend on CSS color alone for category identity (`src/components/TabNav.jsx:131`).

### 2. Global desktop layout

For each executed viewport, evaluate these in the page:

```js
const overflowX = document.documentElement.scrollWidth - window.innerWidth;
const overflowY = document.documentElement.scrollHeight - window.innerHeight;
const visible = (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
};
```

- Require `overflowX <= 1`. Vertical document overflow should be zero for globe/home routes; Directory and Insights may scroll inside their intended content surface.
- Header, category tabs, globe design switcher, zoom controls, Near Me, visible HUD, and open dialogs must be screen-bounded. Allow a 2 px antialiasing tolerance.
- No two visible control groups may overlap. Specifically compare the bottom design switcher against HUD/cards, the News panel against controls, and the Experimental picker against stage UI.
- At 1024x768 and 1366x768, require at least 44x44 CSS pixels for zoom/Near Me buttons where those controls exist (`src/App.jsx:1295-1364`).
- At 1920x1080, reject a composition where the globe/labels are merely enlarged until essential content falls offscreen; score whitespace and balance rather than demanding edge-to-edge fill.

### 3. Image and marker integrity

For every visible marker/gallery/profile image:

```js
const brokenImages = [...document.images].filter(img => {
  const r = img.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && (!img.complete || img.naturalWidth === 0);
});
```

- Require `brokenImages.length === 0` after an agreed image timeout (recommended 8 s on local preview).
- Portrait clusters: at most three face/logo previews; one count badge; no clipped eyes/faces caused by `object-fit`, unexpected rectangular images, or a face rendered under the count badge. At least 60% of each preview circle should remain visually distinguishable at the default camera.
- Student groups: leader photos are previews for the group, not separate student records. Their accessible popup/profile should still identify the group.
- User Groups and Community Days: use country flags, not fabricated portraits. Flag `alt` should end in ` flag` on Earth/Atlas/Map/GeoLibre.
- Missing portraits must show the intended category logo/initials; a broken-image icon is always a failure.
- For multi-person locations, record: visible preview count, total badge number, number of unique loaded image URLs, minimum visible circle diameter, and whether zoom creates more separation. These fields make the face-merging decision reproducible.

### 4. Interaction and state

- Mouse: drag/pan where supported, wheel or controls to zoom, open a marker/tile/card, and close the resulting dialog.
- Keyboard: Tab to the first relevant control/marker; require a visible focus indicator, activate with Enter/Space, close dialogs with the Close button and Escape where implemented.
- Profile/cluster: `[role="dialog"]` has `aria-modal="true"` and a named `aria-label`; cluster dialogs use `Cluster members`; close uses `[aria-label="Close"]` (`src/components/ProfileCard.jsx:609-623`). Focus must not become lost behind the overlay.
- Renderer switch: old canvases/maps/marker overlays are removed before the new scene settles. After two round trips between modes, canvas/map counts should equal the initial settled count rather than grow.
- Rotation/animation: capture marker/globe positions at T0 and T+2 s. Motion should be observable when allowed, but not so fast that a labelled marker crosses a large fraction of the globe during inspection. Run one `prefers-reduced-motion: reduce` check at D02 or D07 and document whether motion actually stops/reduces.
- Browser zoom: repeat D03, D09, D12, and D16 at 200% at 1024x768. No essential control or dialog action may become unreachable.

### 5. Collision measurement

Automate bounding-box overlap for HTML marker/control surfaces; keep visual inspection for canvas content. For two rectangles `a` and `b`, calculate:

```js
const area = r => Math.max(0, r.width) * Math.max(0, r.height);
const intersection = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
const overlapRatio = (a, b) => intersection(a, b) / Math.max(1, Math.min(area(a), area(b)));
```

- Controls/dialogs: fail at any overlap that hides text or click targets; `overlapRatio > 0.05` demands review.
- Minimal labels and Gallery tiles: intentional perspective overlap is acceptable only if the center/active item remains legible and clickable. Record max overlap ratio among the five most central visible items.
- Face clusters: DOM rectangles do not reveal how much each circular image is covered. Use the essential screenshots and the per-avatar transforms as the source of truth.

## Screenshot protocol

File names should be stable and sortable:

`desktop-<case>-<width>x<height>-<state>.png`

Examples: `desktop-d03-1024x768-student-default.png`, `desktop-d03-1024x768-student-zoomed.png`, `desktop-d15-1440x900-community-days-atlas.png`.

For every **E** capture:

1. Wait for fonts, images, and the route ready selector.
2. Let initial entrance animation settle for 1 s; for rotating globes capture at a deterministic inspection moment after the target cluster is visible.
3. Include the header/category and bottom controls in the full-viewport image.
4. For the face-merging cases D02, D03, D05, and D09, add one 2x crop around the most crowded multi-person marker, but retain the full viewport as the primary evidence.
5. If a failure exists only during hover, focus, open dialog, zoom, or mode transition, capture that state and append `-hover`, `-focus`, `-dialog`, `-zoomed`, or `-transition`.

The required minimum evidence set is: both D01 modes; D02; D03 at 1024/1440/1920 plus one zoomed state; D04; D05 at 1024/1440/1920; D06 SG; D07 at 1024/1440; D08 at 1024/1440; D09 Student at 1024/1440 plus Hero if materially different; D10 at 1024/1440; D11 Heroes at 1024/1440/1920 plus Cloud Clubs and Kiro at 1440; D12 at 1024/1440; D14 at 1024/1440; D15 Earth at 1024/1440/1920 plus Atlas and Directory at 1440; D16 panel at 1024/1440; D17 at 1440; all four D19 lab stages at 1440; and F01.

## Weighted scorecard

Score each **distinct view/state**, not just each URL, from 0 to 5. Do not assign a renderer score when an external prerequisite is missing; use `BLOCKED(token)` or `BLOCKED(asset)` and retest.

| Field | Weight | 5 means | 3 means | 0-1 means |
|---|---:|---|---|---|
| Visual clarity | 25% | Faces/flags/labels instantly distinguishable; hierarchy and composition are clean | Readable with minor crowding | Merged/funny faces, clipping, illegible labels, or broken composition |
| Category representation | 20% | Marker correctly communicates a person, leader-backed group, flag group, or event | Correct but generic/ambiguous | Misrepresents the underlying entity or count |
| Responsive desktop fit | 20% | Fits all assigned desktop sizes with balanced scale and no overlap | One minor breakpoint issue | Horizontal overflow, unreachable controls, excessive scale, or lost content |
| Interaction/usability | 15% | Discoverable, predictable, and complete by mouse and keyboard | Works with friction | Cannot open/close/navigate or controls collide |
| Performance/stability | 10% | Settles smoothly, no errors/leaks/jank during switches | Occasional non-blocking hitch | Crash, stuck loader, repeated contexts, severe jank |
| Accessibility | 10% | Named controls/dialogs, focus visible, semantic fallback, contrast adequate | Some gaps but task remains operable | Unnamed/unreachable essential action or unreadable contrast |

Formula:

`weighted score / 100 = (clarity*25 + representation*20 + fit*20 + interaction*15 + stability*10 + accessibility*10) / 5`

Record these columns in the final run report:

| Case/state | Viewport | Renderer | Category | Ready ms | Marker count | Broken images | Max overlap | Console/page errors | Clarity 0-5 | Representation 0-5 | Fit 0-5 | Interaction 0-5 | Stability 0-5 | A11y 0-5 | Weighted /100 | Screenshot | Failure IDs | Recommendation |
|---|---|---|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|

Use recommendations `KEEP`, `KEEP_WITH_CHANGES`, `SIMPLIFY_OR_REPLACE`, or `REMOVE`. Apply these decision rules after the run:

- **KEEP:** weighted score >= 85, no severity-1 failure, and category representation >= 4.
- **KEEP_WITH_CHANGES:** 70-84, or >=85 with a contained severity-2 problem.
- **SIMPLIFY_OR_REPLACE:** 50-69, duplicated value with lower usability, or repeated face/label failure in two assigned desktop sizes.
- **REMOVE:** <50, nonrecoverable crash, essential content inaccessible, or the mode adds no distinct user value and is materially worse than its replacement.

Score Home Community and Home Event separately; score each of the four experiments separately; score Atlas/Map token-on behavior separately from the token-off configuration state.

## Failure severity and exit criteria

- **S1 release blocker:** crash/blank scene; navigation trap; profile cannot close; essential content unreachable; severe horizontal overflow; broken images dominate a category; WebGL failure has no usable fallback.
- **S2 major:** wrong marker semantics/count; merged portraits obscure identity at two or more sizes; controls overlap; Mapbox token present but renderer cannot load; keyboard cannot reach a primary action.
- **S3 moderate:** localized crowding, weak focus/contrast, inconsistent placeholder, noticeable but recoverable jank.
- **S4 polish:** minor spacing, copy, or animation timing issue.

Desktop QA is complete only when:

1. Every D01-D19 case has a score or an explicit prerequisite block.
2. The viewport spine (D01, D03, D05, D07, D09, D10, D11-Heroes, D12, D15, and D19-Hero Orbit) has passed at all five requested desktop sizes.
3. D08, D14, D16, and D17 have also passed at the tight/canonical sizes assigned in the matrix; any observed breakpoint discontinuity is retested at the nearest intermediate size.
4. The token-on Mapbox run and token-off configuration smoke are both recorded.
5. F01 demonstrates the SVG fallback at least once.
6. Every S1/S2 issue has a reproducible exact URL, viewport, assertion/evidence, screenshot, and disposition.
7. The final report compares mobile and desktop results by renderer before a keep/remove decision; a desktop pass cannot cancel a mobile failure.

## Static selector source map

- Route parsing/defaults and spotlight forcing: `src/App.jsx:48-124`
- Renderer selection and full Community Builder payload trigger: `src/App.jsx:196-237`
- Desktop category navigation: `src/App.jsx:713-785`; `src/components/TabNav.jsx:131`
- Globe design, zoom, Near Me, and new-arrival controls: `src/App.jsx:1245-1388`
- Earth portrait markers and User Group flags: `src/components/ClassicGlobeScene.jsx:95-149`, `src/components/ClassicGlobeScene.jsx:238-310`
- Shared Atlas/GeoLibre portrait markers: `src/utils/portraitGroupMarker.js:3-127`; `src/components/MapboxGlobeScene.jsx:119-127`
- Map's distinct overlapping-image implementation: `src/components/MapboxFlatScene.jsx:164-230`
- Minimal visible labels: `src/components/GlobeScene.jsx:472-481`, `src/components/GlobeScene.jsx:814-833`
- Gallery controls/tiles/dialog: `src/components/ExperimentalHeroDex.jsx:440-633`
- Directory root/search/cards: `src/components/ListScene.jsx:160-223`
- Community Days wrapper: `src/components/CommunityDaysScene.jsx:100-175`
- Experiment picker/stages: `src/components/ExperimentalGlobeScene.jsx:236-272`
- Profile dialog semantics: `src/components/ProfileCard.jsx:609-623`
- SVG fallback selectors: `src/components/FlatMapScene.jsx:250`, `src/components/FlatMapScene.jsx:604-618`
