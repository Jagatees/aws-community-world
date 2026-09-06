# Skeptical architecture and product review

Audit date: 2026-09-03. This review is based on static repository evidence, especially `docs/audit-evidence/inventory.md`. It does not substitute for the mobile/desktop visual and performance measurements being gathered elsewhere. Recommendations that depend on actual rendering quality are explicitly marked **Inference**.

## Project Type

**Production-deployed portfolio piece.**

The repository has a live URL, automated deployment, analytics, real community data, lazy loading, GPU cleanup, route state, and multiple graceful fallbacks. Those are stronger than a toy experiment. However, the primary product behavior is still showcase-oriented: seven user-selectable presentation modes, a public experiment lab, hardcoded showcase sequences, no checked-in automated tests, an empty hidden category, and several independently implemented versions of the same marker problem. That makes “portfolio piece” a more accurate classification than “production app” or a tightly scoped MVP.

Evidence:

- Amplify builds and publishes `dist` (`amplify.yml:1-13`).
- The live app includes Vercel Analytics and Speed Insights (`src/main.jsx:1-19`).
- The main view layer is lazy-loaded and has a WebGL error boundary (`src/App.jsx:13-22`, `src/App.jsx:146-167`, `src/App.jsx:248-255`).
- No checked-in test/spec files were found; Playwright appears as a development dependency rather than an application test suite (`package.json:53`).
- The header exposes Community, Events, Insights, and Experimental as peer content sections (`src/components/Header.jsx:3-8`).

## What This Project Seems To Be

The apparent user goal is to discover AWS community people, groups, events, and stories geographically, then open a useful profile, group, article, or event page. The apparent portfolio goal is broader: demonstrate multiple WebGL, mapping, animation, and data-visualization techniques in one product.

Those two goals currently compete. Discovery benefits from a small number of predictable views; the portfolio goal benefits from demonstrating many renderers. The current design treats renderer choice as a user feature, so users see implementation variety that primarily serves the portfolio narrative.

## Overbuilt Or Underbuilt

**Overall: overbuilt in presentation breadth, underbuilt in consolidation and validation.**

The data model and category scope are reasonable. Five community categories, three event/news categories, a list view, filtering, and one strong geographic visualization fit the product. Seven selectable presentations plus four experiments do not.

Static complexity indicators:

- The main orchestrator, core renderers, experiment implementations, and marker utilities total roughly **8,808 source lines / 350 KB before CSS and datasets**. `App.jsx` alone is 1,468 lines.
- Earth, Atlas/GeoLibre, Map, Minimal, and SVG fallback all consume the same category/coordinate model, but each owns substantial marker/rendering behavior.
- Earth duplicates portrait-cluster code that already exists in `portraitGroupMarker.js`; Map and SVG fallback implement further variants (`src/components/ClassicGlobeScene.jsx:50-176`, `src/utils/portraitGroupMarker.js:59-143`, `src/components/MapboxFlatScene.jsx:42-290`, `src/components/FlatMapScene.jsx`).
- `CATEGORY_COLORS` is repeated across the orchestrator and five renderer modules.
- The two home globes use different engines and different event data: desktop loads 46 real records while mobile renders 12 anonymous hardcoded event dots (`src/components/SplashScreen.jsx:230-252`, `src/components/MobileHomeGlobe.jsx:34-47`).
- The experimental route statically imports all four experiment implementations into its lazy chunk (`src/components/ExperimentalGlobeScene.jsx:1-9`), limiting the value of lazy-loading at the experiment level. This is a bundling inference; a production bundle measurement should confirm it.

The project is simultaneously **underbuilt** in the areas that matter if it is treated as a production app:

- No automated regression coverage for route/category/view combinations.
- No single marker presentation contract across renderers.
- Limited evidence that every renderer respects reduced motion and keyboard operation.
- Several external runtime dependencies: Mapbox token/styles, MapLibre styles/tiles, remote flags, remote portraits, and one experimental unpkg texture.
- No product telemetry in the repo demonstrating that users choose or benefit from seven views.

## Core assumptions to challenge

### Assumption 1: users want to choose a renderer

**Observation:** The primary control offers Earth, Atlas, Minimal, Map, GeoLibre, Gallery, and Directory (`src/App.jsx:59-62`, `src/App.jsx:1247-1293`).

**Why weak:** “Find a Builder near me” and “browse Heroes” are user jobs. “Choose between Mapbox and MapLibre” is an implementation concern. The public names obscure some of that, but seven options still impose evaluation cost before users understand the data.

**Stronger alternative:** Offer two primary jobs—Explore geographically and Browse directory—with one automatic renderer per device. Keep one optional “Visual modes” area for portfolio demonstrations.

**Tradeoff:** Less technology is visible in the core product. The portfolio can preserve those demos under Experimental without presenting them as equal product choices.

### Assumption 2: more globe implementations increase product value

**Observation:** Earth, Atlas, Minimal, GeoLibre, and three experiments all render globes, while Map and SVG fallback render flat geography.

**Why weak:** The modes frequently display the same records with different surface treatment. Each renderer duplicates lifecycle, resize, zoom, clustering, labels, accessibility, error handling, and QA work.

**Stronger alternative:** Define one canonical rich desktop globe, one lightweight/mobile globe, and one non-globe directory. Use the SVG/flat map only as a fallback or focused location tool.

**Tradeoff:** A few niche benefits—satellite texture, vector map, token-free alternative—cannot all remain first-class. That is a deliberate simplification.

### Assumption 3: overlapping faces are a good universal cluster metaphor

**Observation:** Heroes, Community Builders, and Student Builder Groups are explicitly portrait-cluster categories. Earth and Atlas preview three faces plus a count (`src/components/ClassicGlobeScene.jsx:24-35`, `src/components/ClassicGlobeScene.jsx:233-242`, `src/utils/portraitGroupMarker.js:59-127`).

**Why weak:** Static data shows stacks as large as 29 Heroes, 318 raw Community Builders, and 49 Student Builder Groups at one exact coordinate. A three-face preview cannot truthfully represent those collections. It is especially misleading for Student Builder Groups, where the faces are leaders rather than the group itself.

**Stronger alternative:** Use category badge + count for groups and dense locations. Reserve a single face for an individual record only. Reveal representative people after the cluster is opened.

**Tradeoff:** The globe becomes less portrait-heavy but clearer and more stable.

### Assumption 4: Atlas and GeoLibre are meaningfully separate products

**Observation:** Both use `MapboxGlobeScene`; GeoLibre is a ten-line wrapper passing `variant="geolibre"` (`src/components/GeoLibreScene.jsx:1-9`). The shared component imports both Mapbox GL and MapLibre GL at module scope (`src/components/MapboxGlobeScene.jsx:1-3`).

**Why weak:** They share the same marker builder and user task. Their meaningful differences are provider, basemap, token requirement, and some projection treatment. Exposing both creates a full second QA matrix without creating a second user job.

**Stronger alternative:** Choose one vector map provider as the product mode. Keep Mapbox only where its 3D country spotlight is essential, or move GeoLibre to Experimental while provider strategy is decided.

**Tradeoff:** Choosing MapLibre may reduce Mapbox-specific polish; choosing Mapbox retains token and external-account dependency.

### Assumption 5: all experiments should remain public peers

**Observation:** Experimental is in the same header menu as Community, Events, and Insights, and contains four modes (`src/components/Header.jsx:3-8`, `src/components/ExperimentalGlobeScene.jsx:236-272`).

**Why weak:** Two experiments duplicate existing product views, one uses hardcoded dated events, and “Global Infra” actually visualizes Community Days. Public placement increases perceived product scope and testing obligation.

**Stronger alternative:** Keep the lab explicitly beta/desktop-only, deep-link it rather than make it a peer section, and retain only experiments that answer a new question.

**Tradeoff:** Experimental work becomes less discoverable but stops weakening the clarity of the main product.

## Mode-by-mode assessment

The following ratings combine source evidence with static product inference. Runtime smoothness, actual visual quality, and real user behavior remain to be validated.

### Decision matrix

| Mode | Desktop | Mobile | Core reasoning |
| --- | --- | --- | --- |
| Earth (`orbit`) | **KEEP WITH CHANGES** | **SIMPLIFY OR REPLACE** | Strongest signature globe and portrait discovery; heavy/face-dense for small screens |
| Atlas (`classic`) | **KEEP WITH CHANGES** | **SIMPLIFY OR REPLACE** | Useful precision and country spotlights; token/provider/failure cost and overlap with Earth/GeoLibre |
| Minimal (`sleek`) | **KEEP WITH CHANGES** | **KEEP WITH CHANGES** | Lowest-complexity globe, responsive and reduced-motion-aware; lacks portrait detail but that is a strength at overview scale |
| Map (`flat`) | **SIMPLIFY OR REPLACE** | **SIMPLIFY OR REPLACE** | A 2D view is valuable, but a second Mapbox implementation is not the simplest way to provide it |
| GeoLibre (`geolibre`) | **SIMPLIFY OR REPLACE** | **REMOVE** | Token-free value, but duplicates Atlas's user job and marker component |
| Gallery (`icons`) | **KEEP WITH CHANGES** | **SIMPLIFY OR REPLACE** | Distinct visual browsing value on large screens; complex carousel interaction is poorly matched to phones |
| Directory (`list`) | **KEEP** | **KEEP** | Clearest, most accessible, most resilient way to find/open records |
| Experiment lab | **KEEP WITH CHANGES** | **REMOVE** | Appropriate portfolio sandbox on desktop only after reducing scope and clarifying beta status |

### Earth

**User value:** High on desktop. It is the clearest embodiment of “AWS community around the world” and supports direct profile discovery.

**Duplication:** High. It has its own portrait group implementation rather than using the shared helper.

**Cost/risk:** `globe.gl` is a substantial engine with Three.js/WebGL lifecycle work, but it uses local globe textures and does not require a token (`src/components/ClassicGlobeScene.jsx:1-3`, `src/components/ClassicGlobeScene.jsx:501-510`). The installed `globe.gl.min.js` distribution is about 1.8 MB uncompressed; this is illustrative, not the final application chunk size.

**Accessibility potential:** Medium. HTML marker buttons have accessible labels, but `useAutoRotate` does not itself inspect reduced motion (`src/hooks/useAutoRotate.js:3-54`). The application defaults reduced-motion users to Minimal, but a user can switch back to Earth. **Inference:** rotation and dense overlay targets may remain problematic for keyboard/motion-sensitive users.

**Recommendation:** Desktop keep, but replace multi-face cluster previews with a truthful badge/count system and import one shared marker contract. Mobile should not be a primary option; use Minimal and provide details after selection.

### Atlas

**User value:** Medium-high on desktop where precise vector geography and Student Group country spotlights matter.

**Duplication:** High relative to GeoLibre and Earth. Atlas/GeoLibre at least share their marker builder.

**Cost/risk:** High. It requires a Mapbox token and remote styles. The installed Mapbox distribution is about 1.77 MB uncompressed before application code; this is illustrative, not bundle output. Missing token produces an unavailable state (`src/components/MapboxGlobeScene.jsx:571-599`, `src/components/MapboxGlobeScene.jsx:918-930`).

**Accessibility potential:** Medium. DOM buttons can expose marker names, but map navigation and visual horizon behavior remain pointer-oriented. **Inference:** screen-reader users still need Directory for reliable access.

**Recommendation:** Keep on desktop only if country spotlights and precise navigation are product priorities. Present it as a specialized “Detailed map/3D” action, not a peer default. On mobile, replace the general Atlas view with Minimal or a focused flat detail map.

### Minimal

**User value:** High for overview, especially mobile. It communicates global distribution without pretending every marker can show a face.

**Duplication:** Medium. It is a separate renderer/label system, but it serves a distinct performance and density role.

**Cost/risk:** Lowest of the globe engines. The installed `cobe` ESM distribution is approximately 6 KB before its transitive graphics/runtime costs. It caps pixel ratio and samples by device and has no token dependency (`src/components/GlobeScene.jsx:39-42`, `src/components/GlobeScene.jsx:77-90`).

**Accessibility potential:** Best among the globe modes. It checks reduced motion, caps visible labels, updates `aria-hidden`, and only makes visible labels keyboard-focusable (`src/components/GlobeScene.jsx:33-38`, `src/components/GlobeScene.jsx:338-341`, `src/components/GlobeScene.jsx:443-517`).

**Recommendation:** Keep as mobile default and as desktop low-power/reduced-motion option. Improve label selection semantics and ensure the Directory is one action away.

### Map

**User value:** Medium. A flat map is familiar and better for regional lookup than a rotating globe.

**Duplication:** Very high. It recreates cluster marker markup and Mapbox lifecycle in a separate 593-line component (`src/components/MapboxFlatScene.jsx:42-290`, `src/components/MapboxFlatScene.jsx:302-370`). The application already ships an interactive SVG fallback.

**Cost/risk:** High for the value delivered because it requires the same Mapbox token/style dependency as Atlas.

**Accessibility potential:** Medium. Marker DOM buttons are possible, but the 2D map still depends on visual position and pointer pan/zoom.

**Recommendation:** Replace it with one token-free flat map built from the existing SVG fallback or the chosen MapLibre stack. Do not maintain separate Mapbox-flat and SVG-flat marker systems.

### GeoLibre

**User value:** Medium-low as currently presented. Token-free vector geography is strategically useful, but “GeoLibre” describes a technology choice rather than a user benefit.

**Duplication:** Very high in product scope, lower in source because it wraps Atlas's marker component.

**Cost/risk:** Medium-high. It imports MapLibre plus remote styles/tiles, and the shared module also imports Mapbox at top level. The installed MapLibre main/shared/worker distributions total over 1 MB uncompressed; again, that is illustrative rather than measured app bundle cost.

**Accessibility potential:** Similar to Atlas. The app disables Near Me/zoom controls for GeoLibre in its outer navigation (`src/App.jsx:736-762`, `src/App.jsx:1295-1364`), so it is functionally underbuilt as a peer view.

**Recommendation:** Remove it from the mobile chooser. On desktop, either make MapLibre the canonical replacement for Atlas/Map or move GeoLibre to Experimental. Keeping both providers as permanent first-class modes is not justified by a distinct user job.

### Gallery

**User value:** High for visually browsing people; lower for groups/events. It is meaningfully different from a map.

**Duplication:** Medium. It owns its own profile-detail overlay rather than reusing `ProfileCard` (`src/components/ExperimentalHeroDex.jsx:602-710`).

**Cost/risk:** Medium. It only renders up to 19 visible columns per row, which limits live tile count (`src/components/ExperimentalHeroDex.jsx:488-554`). However, opening Gallery for Community Builders forces the full 3,036-record dataset rather than the summary (`src/App.jsx:208-220`).

**Accessibility potential:** Medium-high in source: real buttons, search, range control, arrow buttons, reduced-motion checks, and keyboard handling exist (`src/components/ExperimentalHeroDex.jsx:186-220`, `src/components/ExperimentalHeroDex.jsx:226-362`, `src/components/ExperimentalHeroDex.jsx:438-600`). **Inference:** the custom modal and spatial carousel still require focus-order/focus-trap validation.

**Recommendation:** Keep on desktop only after renaming it to “People” or “Visual directory,” reusing the common detail card, and limiting it to categories where portraits represent the record. On mobile replace it with a conventional portrait grid or Directory.

### Directory

**User value:** Very high. It directly supports search, scanning, opening profiles, understanding group leaders, and using the product without spatial navigation (`src/components/ListScene.jsx:27-63`, `src/components/ListScene.jsx:149-180`).

**Duplication:** Low and justified. It is the non-visual fallback for every category.

**Cost/risk:** Low. Pagination limits initial cards to 60 (`src/components/ListScene.jsx:4`, `src/components/ListScene.jsx:149-160`). It avoids WebGL, tokens, map tiles, and coordinate validity.

**Accessibility potential:** Highest. Native document flow, buttons, links, form control, and headings are easier to navigate than spatial canvases.

**Recommendation:** Keep on both desktop and mobile. Elevate it from one of seven equivalent modes to the persistent “Browse list” alternative. It should be the recovery path for missing WebGL, motion preference, inaccessible map controls, and unmapped records.

## Experiment lab assessment

### Lab container

**Desktop: KEEP WITH CHANGES. Mobile: REMOVE.**

The lab is legitimate for a portfolio piece, but it should be explicitly non-core. Keep it desktop-only, deep-linkable, and separately lazy-load each experiment. Do not require the core product QA matrix to guarantee four showcase experiments on seven phone sizes.

### Country Mosaic

**Desktop: KEEP WITH CHANGES. Mobile: SIMPLIFY OR REPLACE.**

This is the strongest experiment because it answers a genuinely different question: how User Groups distribute across countries. It uses all 598 mapped User Groups and has a low-power/reduced-motion path (`src/components/ExperimentalPixelMap.jsx:7-23`, `src/components/ExperimentalPixelMap.jsx:74-83`, `src/components/ExperimentalPixelMap.jsx:213`). On mobile, offer a static or simplified country chart/map rather than the full reveal animation.

### Hero Orbit

**Desktop: REMOVE. Mobile: REMOVE.**

It combines a decorative `cobe` globe with CSS3D portrait rings but does not map portraits geographically (`src/components/ExperimentalGlobeScene.jsx:59-143`). It duplicates Earth's spectacle and Gallery's browsing without being better at either. If kept for portfolio history, archive it outside the product navigation.

### Event Reveal

**Desktop: REMOVE FROM PRODUCT. Mobile: REMOVE.**

The four tour stops and August 2026 content are hardcoded, and its globe texture is loaded from unpkg (`src/components/ExperimentalEventReveal.jsx:6-46`, `src/components/ExperimentalEventReveal.jsx:122-146`). It is a marketing animation, not a durable event-discovery tool. Preserve a recorded demo if it matters to the portfolio; do not maintain it as live application behavior.

### Global Infra

**Desktop: SIMPLIFY OR REPLACE. Mobile: REMOVE.**

The implementation is a capable Community Day geography explorer, not “Global Infra” (`src/components/ExperimentalGlobalInfra.jsx:7-38`, `src/components/ExperimentalGlobalInfra.jsx:161-235`). Merge its best ideas—regional tabs and 2026 event summaries—into Community Days as a desktop “Regions” view. Delete the separate globe after the merge. This yields unique user value without another renderer lifecycle.

## Home globe assessment

Although not one of the seven main modes, the home globe is strategically important and currently doubles implementation cost.

- **Desktop: KEEP WITH CHANGES.** Keep the rich first impression, but treat it as decorative/representative and make the curated sample explicit. It already limits itself to 14 records (`src/data/home-community-markers.js:41-149`).
- **Mobile: KEEP WITH CHANGES.** The dedicated `cobe` composition is justified by device constraints. Replace the anonymous event dots with a small actual event sample or remove labels/stats that imply exact data representation.
- **Architecture:** Share a home marker/event model and category metadata across both renderers. The engines may remain different; the data semantics should not.

## Better Options

### Option A: minimal cleanup

**Current choice:** Seven equal view options, four equal experiments.

**Change:** Keep all code but reduce public navigation:

- Mobile primary: Minimal + Directory.
- Desktop primary: Earth + Directory + Atlas.
- Move Map, GeoLibre, Gallery, and Experimental behind “More visualizations.”
- Hide the lab on mobile.
- Replace group/large-cluster face stacks with badges and counts.

**Tradeoff / switching cost:** Low-to-medium. Mostly navigation, marker semantics, and testing. Technical duplication remains.

### Option B: recommended consolidation

**Current choice:** Four production geographic renderers plus SVG fallback.

**Change:** Standardize on:

1. Earth for rich desktop exploration.
2. Minimal for mobile, reduced motion, and low power.
3. Directory for universal access.
4. One token-free flat/vector map for precise regional navigation and fallback.

Keep Mapbox only as an internal Student Group spotlight implementation if its 3D capability is essential. Remove general Map and GeoLibre duplication after the new token-free map is ready. Keep Gallery as a desktop-only portrait experience outside the map switcher.

**Tradeoff / switching cost:** Medium. Requires a renderer contract and migration of marker semantics, but substantially reduces long-term QA and provider failure surface.

### Option C: portfolio-first split

**Current choice:** Product and renderer showcase coexist in one navigation hierarchy.

**Change:** Make `/` the focused community product with Earth/Minimal/Directory, and move technology demonstrations to `/lab` with independent deep links and explicit experimental support expectations.

**Tradeoff / switching cost:** Medium. More route structure and messaging, but it resolves the product-versus-portfolio conflict cleanly.

## Target architecture

A credible consolidated shape is:

```text
Category data -> normalize Member -> filter -> exact-coordinate groups
                                   |
                                   v
                          shared MarkerModel
                 (kind, count, label, image/badge, action)
                    /             |              \
          Earth desktop     Minimal mobile     Directory
                 \             |              /
                  shared selection/detail contract
```

The missing abstraction is not “one globe engine.” Different engines can be justified by devices. The missing abstraction is one semantic `MarkerModel` and one selection/detail contract. That would prevent a Student Builder Group from appearing as a person in one renderer and a badge in another.

Suggested marker rules:

- Individual person: one portrait, name, role.
- Group: program/category badge or institution/group identity, never an arbitrary leader face at overview scale.
- Dense location: count + category badge; portraits appear only after expansion.
- Event: date/status pin.
- News: story/author marker, but open the News panel rather than pretending it is a person.
- Missing image: deterministic program badge, not a remote placeholder dependency.

## What I Would Do Next

The highest-leverage next decision is product scope, not another renderer fix:

1. Approve **Minimal + Directory as the mobile product**.
2. Approve **Earth + Directory as the desktop core**, with Atlas retained only if country spotlights justify it.
3. Move all other modes out of the primary switcher before investing in their polish.
4. Define the shared `MarkerModel` and change groups/dense clusters from face piles to badge/count markers.
5. Use browser/performance evidence to choose the one remaining flat/vector implementation.

This sequence avoids paying to polish modes that may be removed.

## What To Keep

- The category/data scope and normalized `Member` shape.
- Exact-coordinate clustering as a baseline, provided its presentation becomes truthful.
- Earth as the signature desktop experience.
- Minimal as the mobile/performance/reduced-motion experience.
- Directory as the universal access and discovery path.
- Community Builder summary data; it is a sound response to a 3,036-record directory.
- Country Mosaic's data idea, not necessarily its current animation.
- Atlas country spotlights if visual QA confirms they materially improve Student Group discovery.
- The existing lazy-loading and GPU cleanup discipline.

## Decision summary

The current seven-mode chooser is **overbuilt** for the apparent product. The strongest product is not “seven ways to render the same coordinates”; it is “a beautiful globe that makes the AWS community discoverable, with a fast and accessible list when geography is not enough.”

Static recommendation:

- Core desktop: **Earth + Directory**, optionally specialized Atlas.
- Core mobile: **Minimal + Directory**.
- Consolidate Map and GeoLibre into one token-free location view or remove both from primary navigation.
- Keep Gallery desktop-only and outside the geographic view switcher.
- Keep only Country Mosaic and the useful regional ideas from Global Infra; remove Hero Orbit and Event Reveal from the live product.
- Stop using overlapping people as the default visual for groups and large clusters.

Visual QA may change individual keep/remove calls, but it is unlikely to change the architectural conclusion: seven production-facing modes create more maintenance and decision cost than user value.
