# SBG map performance

Mapbox globe, MapLibre globe and Mapbox flat views group nearby source locations within a 48-pixel radius at integer zoom levels. A 300ms animation moves markers out of their previous cluster when splitting and into the new cluster when merging. Cluster clicks fit the bounds of their source members, including groups crossing the international date line. At zoom 12, markers return to exact source coordinates; exact-location groups retain all members in their profile list. Community Day expansion, country summary records and explicit separate-marker requests retain their existing behavior. Reduced-motion preferences skip cluster animation.

The SVG/mobile fallback uses the same screen-distance grouping, adjusts for the displayed SVG size, and animates split/merge without loading a WebGL renderer or decoding bulk portraits. Its maximum zoom reveals exact source locations. Counts represent the active category's members or groups, including pre-aggregated builder counts; each source record remains in exactly one active cluster.

The default Earth globe and the Minimal globe also animate their geographic cluster levels. Over 420ms, children move from the previous parent coordinate to their source anchors; outgoing children move into a new parent when merging. Animation uses separate display records, preserves source coordinates, keeps exiting markers decorative, and handles rapid zoom reversal. Earth updates existing CSS2D object positions through the globe renderer's latitude accessor; Minimal continues rendering until the movement finishes. Both respect reduced motion, and Minimal reveals exact source locations at its closest zoom.

Country spotlights (currently Singapore and Sri Lanka) also use this clustering. Spotlight cards are created when visible, detached when offscreen, and reused when revisited. Camera movement no longer writes styles to hidden spotlight cards. The existing hidden-tab and unchanged-camera guards remain active. India uses the regular country filter; this change does not introduce an India 3D spotlight or infer new campus coordinates.

The SBG map loads a build-time summary generated directly from `cloud-clubs.json`. It retains IDs, coordinates, country/location, filters, new-arrival flags and a portrait. Full group and leader details load through the existing category cache when opening profiles, searching, viewing new arrivals, or opening the directory/gallery. Profile loading supports dismissal, failure feedback and retry. Future data refreshes automatically regenerate the summary during the Vite build.

## Geographic-grid baseline

Source baseline: `49a0a69`. Dataset: 1,626 SBGs, including 735 in India (729 have mapped coordinates; six remain accessible through the directory).

The following measurements describe the previous geographic-grid implementation, retained as a pure utility regression. Current screen-distance cluster counts depend on viewport size and map projection; these baseline counts are not measurements of the screen-distance renderer.

| India mapped dataset | Exact locations | Overview markers (zoom 3) | City markers (zoom 5) | Campus markers (zoom 12) |
| --- | ---: | ---: | ---: | ---: |
| Current: 729 groups | 249 | 15 | 106 | 249 |
| Simulated 2x: 1,458 groups | 498 | 15 | 106 | 498 |
| Simulated 5x: 3,645 groups | 1,245 | 15 | 112 | 1,245 |

Growth fixtures add distinct IDs and small coordinate offsets. Every input record is retained exactly once at every tested zoom, and source coordinates remain unchanged. Explicit separate markers and source country summaries bypass aggregation. The new screen-distance grouping checks adjacent hash cells so nearby points can combine across cell boundaries.

Production build data chunks:

- Full SBG data: 1,105.78 kB minified, 197.31 kB gzip.
- Map summary: 360.20 kB minified, 100.62 kB gzip.
- Initial SBG data transfer reduction: approximately 49% with gzip. This is the data chunk only, not the whole page. A first profile click downloads the full dataset; subsequent clicks reuse it.

## Verification

```sh
npm ci
node --test scripts/test-map-clusters.mjs scripts/test-globe-clusters.mjs scripts/test-student-group-additions.mjs
node --test scripts/test-screen-map-clusters.mjs scripts/test-map-marker-transitions.mjs
node --test scripts/test-globe-cluster-transitions.mjs
npm run build
node scripts/build-map-performance-checks.mjs
```

With the Vite dev server running, open `/tmp/map-performance-checks/built/index.html`. The self-running browser fixture displays PASS/FAIL. It uses the real React components with fake map engines to verify all three map variants: image-free overview counts, click-to-zoom, exact-location click membership, current callbacks, zero redundant projections over 120 idle render events, spotlight visibility/reuse, theme changes, subscription cleanup, and summary-to-profile hydration including leader social links. It does not contact a map provider or require a token. The original Playwright overlay regression now starts at campus zoom to continue testing exact-location behavior.

With Vite running, `node scripts/test-map-overlays.mjs` also checks split/merge count conservation, rapid zoom reversal, reduced motion, fractional zoom, and cleanup during an active transition. `node scripts/test-svg-map-clusters.mjs` verifies actual SVG marker motion, keyboard activation and cluster recentering; `node scripts/test-mobile-flat-map.mjs` covers iPhone and iPad browser layouts without heavy renderers.

`node scripts/test-earth-clusters.mjs` exercises the real Earth renderer, including intermediate CSS2D world positions for splits and merges, preserved counts, consecutive cluster clicks, rapid reversal, reduced motion and no idle HTML-layer rebuilding.

`node scripts/test-minimal-globe-animation.mjs` checks real Cobe and marker-canvas frames, split/merge motion after zoom input stops, exact source locations at closest zoom, reduced motion and idle GPU pausing.

A local Mapbox flat smoke test verified satellite tile loading, numbered student-group clusters and click-to-fit expansion into smaller groups. Real-device GPU frame rates, mobile thermals, CDN headers and concurrent-visitor capacity are not measured by these checks. Renderer bundle sizes still trigger Vite's existing large-chunk warning.
