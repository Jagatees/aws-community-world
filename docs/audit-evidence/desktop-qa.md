# Desktop globe QA evidence

Audit date: 2026-09-03 (Asia/Singapore)\
Target: `http://localhost:5173/`\
Scope: read-only visual, interaction, responsive, and DOM audit in the Codex in-app browser. No production code was changed.

## Executive finding

Desktop has enough room for a signature globe, but extra pixels do not solve the current marker model. Earth and Atlas remain visually attractive surfaces while Heroes, Builders, User Groups, and Student Builder Groups form dense portrait or flag walls over Europe, Asia, and North America. The flat Map makes the geography easier to read but spreads the same marker wall across the whole viewport. Minimal is the clearest geographic view, Gallery is the strongest visual people browser, and Directory is the most useful and accessible lookup surface.

Recommended desktop set:

- Keep the mixed home Community and Event globes.
- Keep Earth as the single rich signature globe only after replacing broad-zoom face stacks with semantic count badges.
- Keep Minimal as the clear, low-cost, reduced-motion-friendly globe.
- Keep Gallery and Directory.
- Keep one geographic map job, not Map, Atlas, and GeoLibre as three permanent peers. Retain Atlas only where its Singapore/Sri Lanka spotlight behavior is needed; rebuild Map around server/data aggregation; remove GeoLibre as a separate user-facing choice.
- Keep Country Mosaic in the lab. Archive Hero Orbit and Event Reveal from the live product. Rename and move Global Infra into Community Days because it is a Community Days explorer, not an infrastructure map.

## Test conditions and coverage

- Browser: Codex in-app browser.
- Desktop viewport spine: 1024 x 768, 1280 x 800, 1366 x 768, 1440 x 900, and 1920 x 1080.
- Home Community was inspected at every desktop size; Home Events at 1440 x 900; Minimal at every desktop size; all seven selectable modes at 1440 x 900 using multiple dense categories.
- All exposed categories were opened at 1440 x 900: Heroes, Community Builders, User Groups, Student Builder Groups, Kiro Ambassadors, Kiro Events, Community Days, News, and the hidden/empty AWS Ambassadors route.
- Both Student Builder Group spotlights (`?sg=1`, `?sl=1`) and all four Experimental views were tested.
- Timed waits, reloads, and repeat screenshots were used to avoid judging a single loading frame or globe angle.
- DOM checks covered document overflow, broken image elements, marker/image/button counts, visible label bounds, route state, switcher semantics, Directory search, profile-dialog opening, and console warnings/errors.

The WebGL-unavailable SVG fallback was inspected statically but was not forced in the browser. It is not a selectable mode; that path needs a dedicated automated fault-injection test before a renderer refactor ships.

## Viewport matrix

| Viewport | Home Community | Minimal main globe | Navigation and controls | Result |
|---|---|---|---|---|
| 1024 x 768 | Fits; no overflow or broken images | Fits; six visible labels, none outside the sampled viewport | Seven-mode switcher fits but is already information-dense | Pass with density caveat |
| 1280 x 800 | Fits | Fits; no sampled label overflow | Stable | Pass |
| 1366 x 768 | Fits | Fits; no sampled label overflow | Stable | Pass |
| 1440 x 900 | Fits; final animated total reaches 4,911 | Fits; representative cross-mode/category testing performed here | Stable | Pass |
| 1920 x 1080 | Fits; additional whitespace is balanced | Fits; ten visible labels, none outside the sampled viewport | Stable | Pass |

Desktop did not produce document-level horizontal overflow in the tested states. The important failures are marker occlusion and misleading aggregation, not page overflow.

## Mode results and weighted scores

Scores use the requested weights: visual clarity 25%, usefulness/representation 20%, responsive layout 20%, interaction 15%, performance/stability 10%, and accessibility 10%.

| Experience | Visual | Useful | Responsive | Interaction | Perf/stability | A11y | Weighted / 5 | Desktop decision |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Home Community | 4.5 | 4.6 | 4.6 | 3.6 | 3.2 | 3.2 | **4.1** | KEEP WITH CHANGES |
| Home Events | 4.2 | 4.2 | 4.5 | 3.5 | 3.2 | 3.1 | **3.9** | KEEP WITH CHANGES |
| Earth | 2.8 | 3.4 | 4.1 | 3.5 | 2.4 | 2.2 | **3.2** | KEEP WITH CHANGES |
| Atlas | 2.7 | 3.4 | 3.8 | 3.5 | 1.8 | 2.2 | **3.0** | SIMPLIFY OR REPLACE |
| Minimal | 4.2 | 4.3 | 4.7 | 4.1 | 4.7 | 3.6 | **4.3** | KEEP WITH CHANGES |
| Map | 2.7 | 4.0 | 4.0 | 3.7 | 1.9 | 2.3 | **3.3** | SIMPLIFY OR REPLACE |
| GeoLibre | 2.2 | 2.7 | 2.9 | 2.6 | 2.0 | 2.1 | **2.5** | REMOVE AS A PEER MODE |
| Gallery | 4.5 | 4.0 | 4.4 | 4.2 | 3.2 | 4.2 | **4.2** | KEEP |
| Directory | 4.3 | 5.0 | 4.8 | 4.8 | 4.6 | 4.7 | **4.7** | KEEP |
| Experimental: Country Mosaic | 4.3 | 3.2 | 4.2 | 3.5 | 4.0 | 2.5 | **3.7** | KEEP WITH CHANGES, LAB ONLY |
| Experimental: Hero Orbit | 3.7 | 2.6 | 4.0 | 3.8 | 2.0 | 3.9 | **3.4** | REMOVE / ARCHIVE |
| Experimental: Event Reveal | 4.3 | 2.4 | 4.1 | 3.2 | 2.5 | 2.2 | **3.3** | REMOVE / ARCHIVE |
| Experimental: Global Infra | 4.1 | 4.0 | 4.2 | 4.0 | 2.7 | 3.2 | **3.9** | KEEP WITH CHANGES; MOVE/RENAME |

## Category observations

| Category | Best desktop presentation | Finding |
|---|---|---|
| Heroes | Minimal + Gallery + Directory; Earth after aggregation | Earth/Atlas produce a recognizable but unreadable belt of faces. A 29-person exact-coordinate stack is one of many ambiguous clusters. |
| Community Builders | Minimal + Gallery + Directory | The Earth screenshot shows portrait circles and empty-looking fallback disks covering the globe. Default summary data also undercounts some merged coordinate groups. |
| User Groups | Minimal + aggregated Map + Directory | Flags are semantically better than portraits, but 488 flag images/buttons in Atlas/Map are a wall rather than navigation. France, UK, and historical Yugoslavia codes can produce broken images. |
| Student Builder Groups | Minimal + Gallery + Directory; spotlights after fixes | Global Earth/Map is the worst desktop density state. Use a group badge/count, never a pile of leaders. Only 38.9% of rows have a usable leader portrait. |
| Kiro Ambassadors | Home mix + Directory/Minimal | Two records do not justify a dedicated rich globe. Earth looked mostly empty, with the decorative Kiro sprite floating away from the globe. |
| Kiro Events | Minimal/Earth + Directory | Eight events remain legible. Event icon/date semantics should replace avatar-stack semantics consistently. |
| Community Days | Earth/Minimal + Directory; renamed regional explorer | Thirty-eight current events are geographically useful and comparatively readable. The Experimental regional explorer is the strongest future direction. |
| News | News panel/Directory, globe secondary | The 460 px side panel is the real product. The globe adds location context but should not compete with story discovery. |
| AWS Ambassadors | No globe until data exists | The direct route is empty and not exposed in the category chooser. Keep a simple coming-soon state outside the globe selector or remove the route until data is ready. |

## Evidence by mode

### Home

- At 1440 x 900 after a 5.2-second wait, the count animation settled at 4,911 with no overflow or broken images.
- The 14 curated markers included Heroes, Community Builders, User Groups, Student Builder Groups, and both Kiro Ambassadors. The home therefore does not read as Heroes-only.
- Marker titles identified all five categories. One to two sparse featured labels are appropriate; shared Singapore coordinates must not blend Steve Teo's portrait with the User Group badge.
- Event mode used all 46 event records on desktop and remained clean, although nearby date pins still overlap in dense regions.

### Earth and Atlas

- Heroes, Builders, and Students use overlapping portrait previews. The desktop viewport makes individual circles larger, but dense regions still become a wall.
- User Groups rendered 488 image elements and 514 buttons in Atlas; only a fraction are visually separable.
- Atlas adds a glow/texture treatment but does not change the marker policy, so it repeats Earth's core problem at a substantially higher loading cost.
- Cluster zoom works, but visual QA on mobile confirmed it does not reliably resolve the wall. Desktop still needs a strict broad-zoom marker budget.

### Minimal

- Clear at every desktop viewport in the spine and the only geographic mode where Heroes, Builders, User Groups, and Student Groups remain interpretable at world scale.
- It avoids portraits and uses bounded label pools. Desktop samples did not reproduce the mobile edge clipping, but labels still overlap each other in dense North American views.
- Country-centroid aggregation is mislabeled as “here” or “at this location” even when members span a country.

### Map, GeoLibre, Gallery, and Directory

- Map makes country geography explicit, but User Groups and Students still cover major regions with 400-500 DOM controls. Aggregate bubbles should be the default until zoomed.
- GeoLibre rendered a very small globe with large empty areas at 1440 x 900 while preserving the same marker crowding. It has no distinct user task that offsets another permanent renderer choice.
- Gallery is polished and gives faces enough separation. Student Groups honestly show a reusable group badge when no leader image exists. It is a browse experience, not a map.
- Directory search for “Singapore” returned three Heroes immediately; selecting a name opened a correctly labelled profile dialog. The result list has strong semantics and is the most reliable fallback.
- The design switcher exposes no `aria-pressed` or `aria-current` state on its seven buttons, so assistive technology cannot identify the active view.

### Spotlights and experiments

- Singapore spotlight: four groups, no broken images, but the pale basemap was almost blank in the captured state and labels are truncated.
- Sri Lanka spotlight: ten groups, clear country map, but Colombo-area labels collide in a stack.
- Country Mosaic is visually distinctive and more honest about country-level aggregation, but its animated canvas has limited accessibility and is not a person lookup.
- Hero Orbit exposes named portrait buttons but duplicates Gallery with heavier Three/CSS3D spectacle and no geographic meaning.
- Event Reveal's four-stop tour ran correctly, but the data is hardcoded and the experience is a campaign demo rather than a durable event browser.
- Global Infra is actually a 52-row Community Days regional explorer. Its event list + region focus is valuable; its name and placement are not.

## Console and interaction checks

- No uncaught JavaScript errors were observed in the desktop pass.
- The console repeatedly logged `THREE.Clock` deprecation warnings when Three-based scenes mounted.
- Community/Event home toggle, CTA, category navigation, mode navigation, Directory search, profile dialog opening, Experiment selection, and Event Reveal start/advance all worked.
- Pointer-driven rotation was observed on the globe modes. The source audit found no reduced-motion guard or hidden-document pause in Earth; Minimal has both.
- Mapbox attribution is present on Map but controls/attribution behavior needs a license/compliance review in the globe variants where attribution controls are disabled.

## Screenshot index and reproduction

All screenshots were captured in the in-app browser at the named viewport after the route had settled. Reloading and waiting reproduced the density and broken-image findings.

Representative successes:

- [Home Community, settled count, 1440 x 900](./desktop-screenshots/home-community-final-1440x900.png) — `/`
- [Home Events, 1440 x 900](./desktop-screenshots/home-events-1440x900.png) — `/`, Event toggle active
- [Minimal Heroes, 1024 x 768](./desktop-screenshots/heroes-minimal-1024x768.png) — `/?tab=heroes&view=sleek`
- [Gallery Heroes, 1440 x 900](./desktop-screenshots/heroes-gallery-1440x900.png) — `/?tab=heroes&view=icons`
- [Directory Heroes, 1440 x 900](./desktop-screenshots/heroes-directory-1440x900.png) — `/?tab=heroes&view=list`
- [Community Days Earth, 1440 x 900](./desktop-screenshots/community-days-earth-1440x900.png) — `/?tab=community-days&view=orbit`
- [Sri Lanka Student spotlight, 1440 x 900](./desktop-screenshots/students-spotlight-sri-lanka-1440x900.png) — `/?sl=1`

Representative failures:

- [Heroes Earth face wall, 1440 x 900](./desktop-screenshots/heroes-earth-1440x900.png) — `/?tab=heroes&view=orbit`
- [Builders Earth face/fallback wall, 1440 x 900](./desktop-screenshots/builders-earth-1440x900.png) — `/?tab=community-builders&view=orbit`
- [Students Earth group/leader wall, 1440 x 900](./desktop-screenshots/students-earth-1440x900.png) — `/?tab=cloud-clubs&view=orbit`
- [User Groups Atlas flag wall, 1440 x 900](./desktop-screenshots/user-groups-atlas-1440x900.png) — `/?tab=user-groups&view=classic`
- [User Groups Map flag wall, 1440 x 900](./desktop-screenshots/user-groups-map-1440x900.png) — `/?tab=user-groups&view=flat`
- [Students Map leader/group wall, 1440 x 900](./desktop-screenshots/students-map-1440x900.png) — `/?tab=cloud-clubs&view=flat`
- [GeoLibre undersized and crowded, 1440 x 900](./desktop-screenshots/user-groups-geolibre-1440x900.png) — `/?tab=user-groups&view=geolibre`
- [Singapore Student spotlight blank/label collision, 1440 x 900](./desktop-screenshots/students-spotlight-singapore-1440x900.png) — `/?sg=1`

Experimental evidence:

- [Country Mosaic](./desktop-screenshots/experimental-country-mosaic-1440x900.png)
- [Hero Orbit](./desktop-screenshots/experimental-default-1440x900.png)
- [Event Reveal, running](./desktop-screenshots/experimental-event-reveal-running-1440x900.png)
- [Global Infra / Community Days explorer](./desktop-screenshots/experimental-global-infra-1440x900.png)

## Desktop recommendation summary

1. Preserve the home identity and category mix.
2. Make Minimal the default geographic view and Directory the guaranteed accessible alternative.
3. Keep exactly one rich 3D globe: Earth, after a shared aggregated-marker redesign.
4. Retain Atlas only as an implementation detail for country spotlights until those views move to the common map adapter.
5. Replace Map's raw marker stacks with aggregate layers; remove GeoLibre from the user-facing peer selector.
6. Keep Gallery as a browse mode, not a globe mode.
7. Move the useful Global Infra regional explorer into Community Days under an accurate name; keep Country Mosaic in the lab and archive Hero Orbit/Event Reveal.
