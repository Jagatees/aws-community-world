# Globe implementation and data inventory

Static audit performed on 2026-09-03 against commit `b9ffc50` and the current working tree. No browser was used for this inventory. Counts below were measured by parsing the checked-in JSON files directly; a “mapped” row has finite coordinates and is not at `[0, 0]`, matching the main application's filtering rule in `src/App.jsx:327-329`.

## Executive inventory

The application does not have one globe. It has:

- Two independent home/splash globe implementations: a desktop `globe.gl` version and a mobile `cobe` version (`src/components/SplashScreen.jsx:218-277`, `src/components/SplashScreen.jsx:452-496`, `src/components/MobileHomeGlobe.jsx:91-212`).
- Five selectable main map/globe render paths: Earth, Atlas, Minimal, Map, and GeoLibre (`src/App.jsx:224-237`, `src/App.jsx:441-449`).
- Two selectable non-globe presentations: Gallery and Directory (`src/App.jsx:1117-1138`).
- One WebGL failure/no-WebGL SVG fallback (`src/App.jsx:146-167`, `src/App.jsx:248-255`, `src/components/FlatMapScene.jsx:45-75`).
- One special Community Days wrapper which reuses the active main renderer but owns its own event transformation and controls (`src/components/CommunityDaysScene.jsx:24-32`, `src/components/CommunityDaysScene.jsx:47-83`, `src/components/CommunityDaysScene.jsx:99-189`).
- One Experimental section containing four distinct visualizations, three of which are globes (`src/components/ExperimentalGlobeScene.jsx:236-272`).
- One Student Builder Group country-spotlight mode for Singapore and Sri Lanka that switches Atlas from a globe to a pitched Mapbox Mercator scene (`src/config/countrySpotlights.js:1-45`, `src/components/MapboxGlobeScene.jsx:571-597`, `src/components/MapboxGlobeScene.jsx:790-835`).
- One Insights dashboard which is a separate section, not a globe (`src/App.jsx:199-205`, `src/App.jsx:798-802`).

The main category renderers share data normalization and exact-coordinate clustering, but their marker visuals are not one shared component. Earth has a local portrait-cluster implementation, Atlas/GeoLibre use `portraitGroupMarker.js`, Map has another local marker stack, Minimal uses dots and text labels, and the SVG fallback renders its own SVG marker structure.

## Runtime, build, and package structure

- React 19.2.4, Vite 8.0.1, ES modules, and Tailwind CSS 4.2.2 (`package.json:2-5`, `package.json:23`, `package.json:34-36`, `package.json:55`).
- Globe/map engines:
  - `globe.gl` 2.45.1 (`package.json:29`).
  - `cobe` 0.6.4 (`package.json:27`).
  - Mapbox GL JS 3.22.0 (`package.json:32`).
  - MapLibre GL 6.2.0 (`package.json:33`).
  - Three.js 0.183.2 (`package.json:37`).
  - `d3-geo`, `topojson-client`, and `world-atlas` support the SVG fallback and experimental country mosaic (`package.json:28`, `package.json:38-39`).
- All large scene modules are lazy-loaded from `App.jsx`; the core category hook also dynamically imports datasets (`src/App.jsx:13-22`, `src/App.jsx:159-167`, `src/hooks/useCategory.js:6-15`).
- Vite emits two HTML entries: the main app and `/community-day-singapore/` (`vite.config.js:7-15`). The special path is selected manually from `window.location.pathname`, without React Router (`src/main.jsx:7-12`).
- AWS Amplify runs `npm ci`, then `npm run build`, and publishes `dist` (`amplify.yml:1-13`).
- `VITE_MAP_BOX` is required for Atlas and Map; GeoLibre does not require that token (`src/components/MapboxGlobeScene.jsx:24-33`, `src/components/MapboxGlobeScene.jsx:571-593`, `src/components/MapboxFlatScene.jsx:20-22`, `src/components/MapboxFlatScene.jsx:325-340`). If the Mapbox token is missing, the Mapbox components render their own unavailable state rather than throwing into the SVG error fallback (`src/components/MapboxGlobeScene.jsx:918-930`).
- No checked-in unit, integration, or component test files were found. Playwright is a development dependency and the README describes it as a browser-verification/data-collection tool (`package.json:53`, `README.md:80-88`).

## Navigation and routes

### Page paths

| Path | Experience | Globe relevance |
| --- | --- | --- |
| `/` | Main application | Home splash plus all community, event, insights, and experimental views |
| `/community-day-singapore/` | Dedicated event agenda application | Separate non-globe page; it does not use the main globe scene (`src/main.jsx:9-12`, `src/components/CommunityDaySingaporeRoute.jsx:1-10`) |

### Query-state routing

The main application reads query parameters directly. Recognized state includes `tab`, `view`, `theme`, `tag`, repeated `region`, repeated `country`, `new`, and spotlight flags `sg=1` / `sl=1` (`src/App.jsx:83-124`, `src/config/countrySpotlights.js:22-53`). Any recognized query parameter suppresses the home splash (`src/App.jsx:102-104`, `src/App.jsx:169-172`). State is written back with `history.replaceState` (`src/App.jsx:127-143`).

Useful audit URLs:

- `/?tab=heroes&view=orbit` — Heroes / Earth.
- `/?tab=community-builders&view=sleek` — Community Builders / Minimal.
- `/?tab=user-groups&view=classic` — User Groups / Atlas.
- `/?tab=cloud-clubs&view=flat` — Student Builder Groups / Map.
- `/?tab=kiro-ambassadors&view=geolibre` — Kiro Ambassadors / GeoLibre.
- `/?tab=kiro-events&view=orbit` — Kiro Events / Earth.
- `/?tab=community-days&view=sleek` — Community Days / Minimal.
- `/?tab=news&view=orbit` — News / Earth.
- `/?tab=aws-ambassadors` — hidden empty AWS Ambassador placeholder.
- `/?sg=1` and `/?sl=1` — Student Builder Group country spotlights; routing forces `cloud-clubs` + `classic` (`src/App.jsx:95-119`).
- `/?view=experimental` — Experimental lab; routing forces Heroes (`src/App.jsx:92-113`).
- `/?view=insights` or `/?view=trends` — Insights dashboard; routing forces Heroes but renders no globe (`src/App.jsx:92-121`, `src/App.jsx:798-802`).

### Section and category navigation

The header exposes four top-level sections: Community, Events, Insights, and Experimental (`src/components/Header.jsx:3-8`, `src/components/Header.jsx:89-119`). Switching to Experimental or Insights forces the active category to Heroes; Community resets to Heroes and Events resets to Kiro Events (`src/App.jsx:539-554`).

Visible Community tabs on both desktop and mobile:

1. Heroes
2. Community Builders
3. User Groups
4. Student Builder Groups (`cloud-clubs` internally)
5. Kiro Ambassadors

Evidence: `src/components/TabNav.jsx:7-13` and `src/components/MobileNavigation.jsx:20-26`.

Visible Event tabs on both desktop and mobile:

1. Kiro Events
2. Community Days
3. News

Evidence: `src/components/TabNav.jsx:15-19` and `src/components/MobileNavigation.jsx:28-32`.

`aws-ambassadors` is a valid route/data key and has renderer colors, but it is absent from both tab lists (`src/App.jsx:24-46`, `src/App.jsx:59`, `src/hooks/useCategory.js:14`). It is therefore direct-URL-only. Because its dataset is empty, the app forces an empty Minimal globe background and “Collecting data coming soon” overlay instead of honoring the requested design (`src/App.jsx:221-237`, `src/App.jsx:819-879`).

### Responsive defaults

- Default desktop view is `orbit` / Earth.
- Screens up to 767 px, coarse pointers, and reduced-motion users default to `sleek` / Minimal (`src/App.jsx:48-70`).
- The home splash itself switches to the dedicated mobile implementation at max-width 767 px, or for coarse pointers up to 1023 px (`src/components/SplashScreen.jsx:452-459`, `src/components/SplashScreen.jsx:488-496`).

## Category and dataset inventory

### User-facing category datasets

| Category | File | Rows | Mapped | Coordinate groups | Shared-coordinate groups / rows | Largest exact stack | Portrait/image source | Default globe payload |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Heroes | `src/data/heroes.json` | 252 | 250 | 84 | 43 / 209 | 29 | `image_url` present on all 252 | All 250 mapped Heroes |
| Community Builders | `src/data/community-builders.json` | 3,036 | 2,901 | 199 | 154 / 2,856 | 318 | `avatarUrl` present on all 3,036 | 477 summary records from `community-builders-clusters.json`, not the full file |
| User Groups | `src/data/user-groups.json` | 599 | 598 | 489 | 58 / 167 | 22 | No avatars; marker code derives country flags | All 598 mapped groups |
| Student Builder Groups | `src/data/cloud-clubs.json` | 1,022 | 1,016 | 478 | 141 / 679 | 49 | Top-level `avatarUrl` empty; 1,008 records have `ledBy`, with 1,021 leader images | All 1,016 mapped groups |
| Kiro Ambassadors | `src/data/kiro-ambassadors.json` | 2 | 2 | 2 | 0 / 0 | 1 | One of two has `avatarUrl` | Both ambassadors |
| Kiro Events | `src/data/kiro-events.json` | 8 | 8 | 7 | 1 / 2 | 2 | `avatarUrl` present on all 8 | All events |
| Community Days | `src/data/community-days.json` | 38 | 38 | 38 | 0 / 0 | 1 | No portrait; country flag/date/countdown marker | Special wrapper transforms all 38 |
| News | `src/data/news.json` | 20 combined rows | 20 | 14 | 4 / 10 | 4 | All 20 have `authorAvatarUrl`; 14 have article `imageUrl` | App deduplicates by `id`, then maps author avatar to globe marker |
| AWS Ambassadors | `src/data/aws-ambassadors.json` | 0 | 0 | 0 | 0 / 0 | 0 | None | Empty “coming soon” experience |

“Coordinate groups” counts unique non-zero `[lat, lng]` pairs. “Shared-coordinate rows” counts all rows that belong to an exact-coordinate group of size greater than one. This is the data pressure behind overlapping people/group previews. Clustering is exact-coordinate only; nearby-but-not-identical points remain separate (`src/utils/mapCoordinates.js:1-42`).

### Community Builder summary payload

`community-builders-clusters.json` has 477 synthetic summary records across 199 unique coordinates. Every record has `clusterOnly: true` and `ledBy`; the `builderCount` values sum to 2,901 mapped Builders. There are 991 leader preview images. The app uses this smaller payload for the unfiltered globe and loads all 3,036 individual records only for Directory, Gallery, “new”, or active tag/region/country filters (`src/hooks/useCategory.js:51-61`, `src/App.jsx:208-220`). `community-builders-meta.json` supplies the 3,036 total, 2,901 mapped total, one new member, tags, countries, and country counts without loading the full directory (`src/App.jsx:259-289`, `src/App.jsx:365-385`).

### Other checked-in globe-adjacent data

| File | Rows / shape | Used by |
| --- | --- | --- |
| `src/data/home-community-markers.js` | 14 curated records: 3 Heroes, 3 Community Builders, 3 User Groups, 3 Student Builder Groups, 2 Kiro Ambassadors | Desktop and mobile Community home globe (`src/components/SplashScreen.jsx:1-4`, `src/components/MobileHomeGlobe.jsx:1-5`) |
| `src/data/community-days-2026-supplement.json` | 14 events | Experimental Global Infra only; combined with the 38 main Community Days records for 52 unique 2026 event IDs (`src/components/ExperimentalGlobalInfra.jsx:7-38`) |
| `src/data/community-growth-history.json` | Object with 19 snapshots and analytics | Insights dashboard, not a globe (`src/components/TrendsDashboard.jsx`) |
| `src/data/community-builders-meta.json` | Metadata object | Community Builder totals and filters |

### Normalized marker schema

`useCategory` normalizes all category JSON into a common `Member` shape. It maps `image_url` to `avatarUrl`, `hero_page_url` / `joinUrl` to `profileUrl`, category-specific tags, `ledBy`, event fields, summary counts, and `forceSeparateMarker` (`src/hooks/useCategory.js:17-48`). The declared type covers nine category keys and optional person, group, event, and cluster fields (`src/types.js:1-29`).

Image selection is centralized only at the data-helper level: `getMemberImage` prefers a usable top-level `avatarUrl`, then the first usable `ledBy[].imageUrl`; known upstream default-avatar paths are treated as missing (`src/utils/memberMarkers.js:26-33`, `src/utils/memberMarkers.js:50-56`). User-group flags are derived from the last location segment (`src/utils/memberMarkers.js:35-48`).

## Home/splash globes

### Desktop home and Event Globe: `SplashScreen` / `OrbitGlobe`

- Engine: `globe.gl` with local blue-marble and topology textures (`src/components/SplashScreen.jsx:241-277`).
- Community data: the 14-record balanced preview set, not the full datasets (`src/components/SplashScreen.jsx:230-239`).
- Community markers: 30 px circular face or category-badge marker with category-colored border and dot (`src/components/SplashScreen.jsx:55-117`).
- Event data: all 38 Community Days plus all 8 Kiro Events, tagged by category and shuffled each mount (`src/components/SplashScreen.jsx:230-252`).
- Event marker: custom map pin with Kiro/Community Day styling and a date number (`src/components/SplashScreen.jsx:119-207`).
- Interactions: decorative only; zoom, pan, and rotate controls are disabled (`src/components/SplashScreen.jsx:279-285`).
- Community and event rotation speeds are separate constants (`src/components/SplashScreen.jsx:19-20`).

### Mobile home and Event Globe: `MobileHomeGlobe`

- Engine: lazy-loaded `cobe` with a 1.25 pixel-ratio cap and 9,000 map samples (`src/components/MobileHomeGlobe.jsx:49-52`, `src/components/MobileHomeGlobe.jsx:179-212`).
- Community dots: 12 hardcoded generic locations plus all 14 curated home records, for 26 dots total; colors cycle across the five home categories (`src/components/MobileHomeGlobe.jsx:4-32`).
- Community labels: HTML cards for the curated records only, capped at two visible cards with depth, edge, vertical, and collision filtering (`src/components/MobileHomeGlobe.jsx:57-60`, `src/components/MobileHomeGlobe.jsx:122-159`, `src/components/MobileHomeGlobe.jsx:239-267`).
- Event dots: 12 hardcoded locations rather than the actual event datasets, with no event card labels (`src/components/MobileHomeGlobe.jsx:34-47`, `src/components/MobileHomeGlobe.jsx:198-210`).
- Reduced motion freezes rotation, and offscreen/hidden-document rendering is paused (`src/components/MobileHomeGlobe.jsx:105-112`, `src/components/MobileHomeGlobe.jsx:162-177`, `src/components/MobileHomeGlobe.jsx:200-203`).
- This splash renderer is independent of the main Minimal renderer even though both use `cobe`.

## Main selectable view inventory

The internal values and product labels are defined in `src/App.jsx:59-61` and `src/App.jsx:441-449`. Experimental is excluded from the design switcher and belongs to the header's section menu; Gallery is omitted only for categories outside the five community categories (`src/App.jsx:62`, `src/App.jsx:214-216`).

| Product label | `view` value | Component / engine | Marker model | Scope and dependencies |
| --- | --- | --- | --- | --- |
| Earth | `orbit` | `ClassicGlobeScene.jsx` / `globe.gl` | HTML portrait clusters for Heroes, Builders, Student Groups; country flags for User Groups; event/other stacks; count badges | All normal categories; no Mapbox token required |
| Atlas | `classic` | `MapboxGlobeScene.jsx` / Mapbox GL | HTML overlay markers projected over the Mapbox globe; shared portrait helper for portrait categories | All normal categories; requires `VITE_MAP_BOX`; owns country spotlights |
| Minimal | `sleek` | `GlobeScene.jsx` / `cobe` | Category-colored dots plus pooled, collision-filtered text/flag labels; no portrait images | All normal categories; default on mobile/coarse/reduced-motion |
| Map | `flat` | `MapboxFlatScene.jsx` / Mapbox GL equirectangular map | HTML marker stacks over a flat projection | All normal categories; requires `VITE_MAP_BOX` |
| GeoLibre | `geolibre` | `GeoLibreScene.jsx` -> `MapboxGlobeScene.jsx` / MapLibre GL | Same overlay-marker builder as Atlas, but `variant="geolibre"` and GeoLibre styles | All normal categories; no Mapbox token (`src/components/GeoLibreScene.jsx:1-9`) |
| Gallery | `icons` | `ExperimentalHeroDex.jsx` / custom React UI | Three-row rotating archive of portraits/flags/fallback art; not geographic | Heroes, Community Builders, User Groups, Student Builder Groups, Kiro Ambassadors only (`src/components/ExperimentalHeroDex.jsx:79-105`) |
| Directory | `list` | `ListScene.jsx` / custom React UI | Searchable cards, 60 records per page; not geographic | All categories including News and Community Days (`src/components/ListScene.jsx:4-15`, `src/components/ListScene.jsx:149-171`) |

Renderer selection evidence: `src/App.jsx:224-237`. Gallery/Directory branching evidence: `src/App.jsx:1117-1138`. The active renderer receives the same filtered `members` array and category in the normal branch (`src/App.jsx:1139-1163`).

### Earth details

- Creates a textured `globe.gl` Earth and uses shared auto-rotation behavior (`src/components/ClassicGlobeScene.jsx:476-522`, `src/hooks/useAutoRotate.js:3-54`).
- Exact-coordinate clusters are turned into HTML overlay elements (`src/components/ClassicGlobeScene.jsx:622-642`).
- Heroes, Community Builders, and Student Builder Groups are classified as portrait-group categories (`src/components/ClassicGlobeScene.jsx:24-35`). Multi-person clusters preview up to three overlapping portraits and a total badge, then spread as altitude decreases (`src/components/ClassicGlobeScene.jsx:41-48`, `src/components/ClassicGlobeScene.jsx:95-176`, `src/components/ClassicGlobeScene.jsx:565-576`).
- User Groups use country flags and a count badge (`src/components/ClassicGlobeScene.jsx:194-204`, `src/components/ClassicGlobeScene.jsx:277-313`).
- Clicking a multi-portrait cluster first zooms, then opens the cluster once sufficiently close (`src/components/ClassicGlobeScene.jsx:657-680`).
- Earth duplicates its portrait-group implementation locally rather than importing `src/utils/portraitGroupMarker.js`.

### Atlas and GeoLibre details

- Both routes use `MapboxGlobeScene`; `GeoLibreScene` is only an accessibility/styling wrapper passing `variant="geolibre"` (`src/components/GeoLibreScene.jsx:1-9`).
- Atlas selects Mapbox, GeoLibre selects MapLibre; Atlas uses globe projection except in country spotlight mode, while GeoLibre applies its own globe projection/tile treatment (`src/components/MapboxGlobeScene.jsx:571-615`).
- Both share `createPortraitGroupAvatar` and related helpers from `portraitGroupMarker.js` (`src/components/MapboxGlobeScene.jsx:6-8`, `src/components/MapboxGlobeScene.jsx:119-200`).
- The shared portrait helper previews three members and layers a total badge (`src/utils/portraitGroupMarker.js:3-16`, `src/utils/portraitGroupMarker.js:59-127`).
- The Mapbox/MapLibre overlay hides markers behind the globe horizon and outside the screen (`src/components/MapboxGlobeScene.jsx:840-865`).
- Singapore/Sri Lanka Student Group spotlights produce individual elevated avatar/label elements and hide the underlying country markers (`src/components/MapboxGlobeScene.jsx:468-547`, `src/components/MapboxGlobeScene.jsx:782-835`, `src/components/MapboxGlobeScene.jsx:848-876`).

### Minimal details

- Uses `cobe` for the earth surface, but draws markers itself on a second canvas and creates text labels from a fixed DOM pool (`src/components/GlobeScene.jsx:235-290`, `src/components/GlobeScene.jsx:357-416`, `src/components/GlobeScene.jsx:443-520`).
- Multi-record coordinates become larger dots and labels such as “29 Heroes here”; flags appear only when the cluster resolves to one country (`src/components/GlobeScene.jsx:205-223`, `src/components/GlobeScene.jsx:274-289`).
- Label capacity is 18 on desktop and 8 on mobile (`src/components/GlobeScene.jsx:33-38`).
- It intentionally has no person/group images, so it does not share the overlapping-face visual problem of Earth/Atlas/Map.

### Map details

- Uses Mapbox's equirectangular projection and world copies (`src/components/MapboxFlatScene.jsx:302-340`).
- Exact-coordinate clusters receive a custom local HTML stack, not `portraitGroupMarker.js` (`src/components/MapboxFlatScene.jsx:42-75`, `src/components/MapboxFlatScene.jsx:318-323`, `src/components/MapboxFlatScene.jsx:430-477`).
- Cluster clicks zoom first at low zoom and then open the record/cluster (`src/components/MapboxFlatScene.jsx:436-466`).

### SVG fallback details

- Used immediately when WebGL cannot be created and as `GlobeErrorBoundary`'s fallback for scene errors (`src/App.jsx:146-167`, `src/App.jsx:224-255`, `src/components/GlobeErrorBoundary.jsx:3-30`).
- Uses Natural Earth projection, TopoJSON countries, exact-coordinate clusters, its own zoom/pan state, and SVG portrait/flag/badge markup (`src/components/FlatMapScene.jsx:1-27`, `src/components/FlatMapScene.jsx:45-119`).
- It is not a selectable normal `view` value; `flat` means the Mapbox Map, not this fallback.

## Event-specific behavior

### Kiro Events

Kiro Events follows the normal category branch and can use Earth, Atlas, Minimal, Map, GeoLibre, or Directory. Gallery is filtered out because `kiro-events` is not in `ICON_VIEW_CATEGORIES` (`src/App.jsx:62-64`, `src/App.jsx:214-216`). Its eight records carry `avatarUrl`, registration/profile fields, times, tags, and location. Exact-coordinate clustering creates one two-event stack.

### Community Days

Community Days uses `CommunityDaysScene` instead of the normal branch (`src/App.jsx:803-818`). The wrapper:

- Imports the 38-row main dataset directly (`src/components/CommunityDaysScene.jsx:1-4`).
- Adds status, formatted date, countdown fields, category, and tag; it applies region/country filters (`src/components/CommunityDaysScene.jsx:45-83`).
- Offers Earth, Atlas, Minimal, Map, GeoLibre, and Directory; it excludes Gallery and Experimental (`src/components/CommunityDaysScene.jsx:24-29`, `src/components/CommunityDaysScene.jsx:138-165`).
- Reuses the current active main scene component for all geographic views (`src/components/CommunityDaysScene.jsx:99-117`).
- Opens official event sites directly instead of the main Profile Card (`src/components/CommunityDaysScene.jsx:85-88`).

### News

News is loaded by `useNews`, not `useCategory`. The app deduplicates latest/trending rows by `id`, maps `authorAvatarUrl` to `avatarUrl`, and attaches the source row as `newsItem` (`src/App.jsx:386-410`). It reuses the active main renderer or Directory, then opens a side panel when a marker is selected (`src/App.jsx:880-918`, `src/App.jsx:1092-1114`). Gallery is unavailable, while the five geographic views plus Directory are available.

## Experimental section

The Experimental section is reachable through the header menu and via `?view=experimental`; it is not one of the normal design-switcher buttons. Entering it always loads Heroes as the active main dataset (`src/components/Header.jsx:3-8`, `src/App.jsx:539-543`). Its internal picker exposes:

1. **Country Mosaic** — a custom 2D canvas, not a globe. It imports all User Groups directly, maps 598 non-zero rows into country tiles, and animates individual group pixels (`src/components/ExperimentalPixelMap.jsx:1-7`, `src/components/ExperimentalPixelMap.jsx:26-38`, `src/components/ExperimentalPixelMap.jsx:74-83`).
2. **Hero Orbit** — `cobe` globe plus Three.js CSS3D rings populated from the current Heroes data (`src/components/ExperimentalGlobeScene.jsx:1-20`, `src/components/ExperimentalGlobeScene.jsx:59-76`, `src/components/ExperimentalGlobeScene.jsx:243-272`). This is the default experiment.
3. **Event Reveal** — a `globe.gl` cinematic using four hardcoded tour stops and an external unpkg texture; globe input is disabled while a scripted tour controls points/rings/cards (`src/components/ExperimentalEventReveal.jsx:1-46`, `src/components/ExperimentalEventReveal.jsx:118-158`, `src/components/ExperimentalEventReveal.jsx:300-320`).
4. **Global Infra** — a `globe.gl` Community Day explorer using 52 combined 2026 event rows (38 main + 14 supplement), seven hardcoded geography groups, polygon country shapes, points, and rings (`src/components/ExperimentalGlobalInfra.jsx:1-38`, `src/components/ExperimentalGlobalInfra.jsx:47-52`, `src/components/ExperimentalGlobalInfra.jsx:102-159`, `src/components/ExperimentalGlobalInfra.jsx:161-235`). Despite its label, it currently visualizes Community Days rather than AWS service infrastructure.

## Shared versus distinct implementation map

### Shared pieces

- `App.jsx` is the single state/router/orchestrator for the main experience (`src/App.jsx:169-237`).
- `useCategory` owns lazy data loading, normalization, and per-category request caching (`src/hooks/useCategory.js:3-15`, `src/hooks/useCategory.js:51-61`, `src/hooks/useCategory.js:71-143`).
- `clusterMembersByCoordinates` is used by Earth, Atlas/GeoLibre, Map, Minimal, and SVG fallback. It merges only identical coordinates and respects `forceSeparateMarker` (`src/utils/mapCoordinates.js:10-42`).
- `memberMarkers.js` provides image selection, country derivation/flags, initials/badge labels, and “NEW” badges (`src/utils/memberMarkers.js:26-48`, `src/utils/memberMarkers.js:58-124`).
- `portraitGroupMarker.js` is shared by Atlas and GeoLibre only (`src/components/MapboxGlobeScene.jsx:6-8`).
- `ProfileCard` is the common selected-record destination for normal non-event categories; Community Days opens a URL directly and News opens its own panel (`src/App.jsx:1435-1438`, `src/components/CommunityDaysScene.jsx:85-88`, `src/App.jsx:512-518`).
- Category data and view state are shared across desktop and mobile; navigation UI differs (`src/App.jsx:713-768`).

### Distinct or duplicated pieces

- Desktop and mobile home globes do not share a renderer, marker positioning, event data source, or fallback implementation.
- Earth reimplements portrait grouping locally (`src/components/ClassicGlobeScene.jsx:50-176`), while Atlas/GeoLibre use `portraitGroupMarker.js`; the layouts are similar but can drift.
- Map builds its own marker stack and does not use the portrait-group helper (`src/components/MapboxFlatScene.jsx:42-75`).
- SVG fallback renders marker stacks independently in JSX (`src/components/FlatMapScene.jsx`).
- Minimal contains an entirely separate canvas marker and DOM-label system (`src/components/GlobeScene.jsx`).
- `CATEGORY_COLORS` is duplicated in `App.jsx`, `GlobeScene.jsx`, `ClassicGlobeScene.jsx`, `MapboxGlobeScene.jsx`, `MapboxFlatScene.jsx`, and `FlatMapScene.jsx`; home has another `HOME_CATEGORY_STYLES` source. It is visually consistent today but is not structurally centralized.
- Event presentation is split between desktop splash pins, mobile splash generic dots, the normal renderer marker branches, the Community Days wrapper, News panel logic, Event Reveal, and Global Infra.
- The Experimental components load some datasets directly and do not flow through `useCategory`.

## Marker semantics by category and renderer

| Category | Earth | Atlas / GeoLibre | Minimal | Map | SVG fallback | Gallery |
| --- | --- | --- | --- | --- | --- | --- |
| Heroes | Up to 3 overlapping faces + count | Up to 3 overlapping faces + count | Dot + name/count label | Image stack + count | SVG image stack + count | Portrait/archive card |
| Community Builders | Summary leader faces + full `builderCount` | Summary leader faces + full `builderCount` | Summary dot + count label | Summary image stack/count | SVG image stack/count | Full individual records because Gallery triggers full load |
| User Groups | Country flag + count | Country flag + count | Dot + flag/text label | Country flag + count | Country flag/badge | Country flag or initials |
| Student Builder Groups | Up to 3 leader faces + count | Up to 3 leader faces + count; country spotlights add individual leaders | Dot + name/count label | Leader image stack + count | SVG leader-image stack + count | Leader image/fallback logo |
| Kiro Ambassadors | Avatar/fallback stack | Avatar/fallback stack | Dot + text label | Avatar/fallback stack | SVG stack | Portrait/fallback icon |
| Kiro Events | Avatar stack | Avatar stack | Dot + event/count label | Avatar stack | SVG stack | Not available |
| Community Days | Country flag + date/countdown tooltip | Country flag + date/countdown tooltip | Dot + event/count label | Country flag + tooltip | SVG marker | Not available |
| News | Author-avatar stack | Author-avatar stack | Dot + story/count label | Author-avatar stack | SVG stack | Not available |

The portrait-group category set is explicitly Heroes, Community Builders, and Student Builder Groups (`src/utils/portraitGroupMarker.js:4-10`, `src/components/ClassicGlobeScene.jsx:27-35`). This means Kiro, Kiro Events, and News use the generic image-stack branch rather than the newer portrait-cluster behavior.

## Static audit implications for visual QA

These are inventory-derived test priorities, not final design recommendations:

1. **Community Builders are the most severe density case.** The raw file puts 318 people on one exact coordinate; the default globe mitigates payload size with 477 summary records, but those still collapse to 199 coordinate clusters. Test summary and full-data states separately because selecting a filter, “new”, Gallery, or Directory changes the loaded data path.
2. **Student Builder Groups are the most likely “group represented by faces” issue.** The groups have no top-level avatar, but 1,021 `ledBy` portraits feed `getMemberImage`; 679 mapped rows participate in shared-coordinate groups and the largest stack is 49. Earth/Atlas deliberately preview leader faces for a group marker.
3. **Heroes also have substantial shared-location density.** 209 of 250 mapped rows share a coordinate, with a maximum exact stack of 29.
4. **User Groups should be evaluated as flag/count markers, not missing-avatar failures.** All top-level avatars are empty by design and the renderers derive flags.
5. **The mobile Event splash is not data-representative.** It renders 12 hardcoded anonymous dots, while desktop renders 46 real event records.
6. **Atlas and Map need token-aware testing.** A no-token state is expected and is not equivalent to WebGL fallback.
7. **Reduced-motion testing changes both renderer selection and motion.** A reduced-motion user defaults to Minimal, and the mobile splash freezes rotation.
8. **AWS Ambassadors is a hidden empty route, not a complete category.** It should be recorded separately from Kiro Ambassadors, which now has two actual records.
9. **GeoLibre is a wrapper variant of Atlas, not an entirely separate marker system.** Visual differences should be attributed to MapLibre basemap/projection treatment, not marker-builder divergence.
10. **Country Mosaic, Gallery, Directory, and Insights are not globes.** They should be compared as alternatives to a globe rather than scored as globe renderers unless the audit rubric intentionally includes alternative presentation modes.

## Complete static test scope derived from this inventory

For a full visual audit, the minimum distinct states are:

- Home Community: desktop and mobile implementations.
- Home Events: desktop and mobile implementations.
- Five visible community categories across Earth, Atlas, Minimal, Map, GeoLibre, Gallery, and Directory where supported.
- Three event categories across Earth, Atlas, Minimal, Map, GeoLibre, and Directory, with Community Days exercised through its wrapper and News with its panel open/closed.
- Community Builders twice: default summary data and a state that forces full data.
- Student Builder Groups global plus both `sg=1` and `sl=1` country spotlights.
- Hidden `aws-ambassadors` empty route.
- WebGL-unavailable SVG fallback.
- Atlas/Map with and without a Mapbox token.
- Experimental: Country Mosaic, Hero Orbit, Event Reveal, and Global Infra.
- Insights as a non-globe alternative.
- Reduced-motion behavior.

This inventory identifies the code paths and data pressure. It does not make keep/remove decisions; those require the separate mobile, desktop, performance, and accessibility evidence requested by the overall audit.
