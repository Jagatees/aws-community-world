# Analytics and crowded globe improvements

Implemented locally on 6 September 2026. Existing unrelated workspace edits are preserved.

## What changed

- **Insights observatory:** a new ink-and-amber layout, interactive SVG regional atlas, large directory total, seven dataset views, reporting-date navigation, a time-scaled history chart, ranked regions, and expandable identity/methodology details. The atlas has no animation loop. Baseline snapshots no longer show false growth. Comparisons affected by source changes are identified. The four-directory total is a record count, not a unique-person count. Event totals explicitly retain their saved reporting date. Obsolete dashboard styles were removed from the shared stylesheet.
- **AWS Builder Lofts:** an Events tab with globe and directory views for San Francisco, Berlin, Hyderabad, and São Paulo. Status and country filters, mobile navigation, venue details, and dated official sources are included. San Francisco is open; the other three are announced. All pins represent approximate city locations. See `builder-loft-locations.md` for source and maintenance notes.
- **Earth globe:** zoom-dependent geographic groups replace hundreds of portraits in the world overview. Numeric groups reveal smaller areas and then exact source locations when zoomed. Builder summaries retain their represented counts. Canvas pixel ratio is capped, marker images load lazily, and portrait spacing updates once on their container. Hidden browser tabs pause rendering; rotation respects reduced motion and elapsed time.
- **Minimal globe:** geographic groups bound projection work, marker sprites and trigonometry are cached, and stationary scenes stop drawing until an interaction requires a frame. All member records remain available through group selection.
- **Map and GeoLibre:** DOM markers are created for visible locations and reused. Repeated camera events no longer cause duplicate projections. SVG map country paths and marker metadata are cached.
- **Data and popups:** category changes cannot briefly render the preceding category's people. Cached categories are available immediately. Analytics does not request an unrelated people dataset. Large member popups display 30 records per page with search across the whole group and keyboard dismissal.

## Verification

Commands:

```text
npm run lint
npm run build
node --test scripts/test-globe-clusters.mjs
node scripts/test-map-overlays.mjs
node scripts/test-community-ui.mjs
node scripts/test-builder-lofts.mjs
node scripts/test-insights-ui.mjs
```

Browser scripts require the Vite dev server on port 5173 and Playwright Chromium. Override the server with `MAP_TEST_URL` or `COMMUNITY_TEST_URL` respectively.

The clustering tests check large generated data, source-coordinate overlaps, summaries, separate markers, geographic boundaries, and the real datasets. Each grouping level preserves all supplied valid records. Browser checks cover zoom, category switching, cached tabs, directory search, and a 1,000-record popup with at most 30 list rows.

The synthetic map harness tests all three map-engine variants. Of 360 locations, 117 initially require DOM markers. Sending 120 unchanged render/move/zoom event cycles produces zero additional projections; panning and revisiting retain correct member payloads. This is a workload check, not a live map service benchmark.

An initial before/after check in local headless Chrome at 1440 × 900 and 2× device pixel ratio reduced student-view image elements from **696 to 15**, and user-group image elements from **488 to 8**. These counts precede the further compact-summary-marker refinement. They measure work removed, not guaranteed FPS on another device. Screenshots and raw timing samples are in ignored `tmp/` files.

The Insights browser script checks all seven views against saved historical totals, baseline and untracked states, source discontinuities, keyboard map/chart selection, the event reporting date, and layout widths 320, 390, 768, 1024, and 1440. The Builder Lofts browser script checks desktop/mobile entry points, official links, city selection, directory mode, status/country filters, and empty states.

## Remaining constraints

The production build still reports large optional globe/map engine and data chunks. Separating the optional map engines and reducing portrait/data transfer sizes are further startup improvements. The existing source-coordinate accuracy issues described in `audit-evidence/data-performance-accessibility.md` are not repaired by display grouping; zooming reveals the supplied source locations.

Rendering lifecycle behavior was checked against the installed package documentation and the [Globe.GL rendering API](https://globe.gl/).
