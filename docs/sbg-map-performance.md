# SBG map performance

This change reduces the cost of growing directories in Mapbox globe, MapLibre globe and Mapbox flat views. Nearby source locations become count buttons at overview zoom, progressively separate at integer zoom boundaries, and return to exact source coordinates at zoom 12. Count buttons zoom in; exact-location groups retain all members in their profile list. Community Day expansion, country summary records and explicit separate-marker requests retain their existing behavior.

Country spotlights (currently Singapore and Sri Lanka) also use this clustering. Spotlight cards are created when visible, detached when offscreen, and reused when revisited. Camera movement no longer writes styles to hidden spotlight cards. The existing hidden-tab and unchanged-camera guards remain active. India uses the regular country filter; this change does not introduce an India 3D spotlight or infer new campus coordinates.

The SBG map loads a build-time summary generated directly from `cloud-clubs.json`. It retains IDs, coordinates, country/location, filters, new-arrival flags and a portrait. Full group and leader details load through the existing category cache when opening profiles, searching, viewing new arrivals, or opening the directory/gallery. Profile loading supports dismissal, failure feedback and retry. Future data refreshes automatically regenerate the summary during the Vite build.

## Measurements

Source baseline: `49a0a69`. Dataset: 1,626 SBGs, including 735 in India (729 have mapped coordinates; six remain accessible through the directory).

| India mapped dataset | Exact locations | Overview markers (zoom 3) | City markers (zoom 5) | Campus markers (zoom 12) |
| --- | ---: | ---: | ---: | ---: |
| Current: 729 groups | 249 | 15 | 106 | 249 |
| Simulated 2x: 1,458 groups | 498 | 15 | 106 | 498 |
| Simulated 5x: 3,645 groups | 1,245 | 15 | 112 | 1,245 |

Growth fixtures add distinct IDs and small coordinate offsets. Every input record is retained exactly once at every tested zoom, and source coordinates remain unchanged. Nearby groups can straddle grid boundaries; these are geographic grid clusters, not an administrative region classification or a hard global marker limit. Explicit separate markers and source country summaries bypass aggregation.

Production build data chunks:

- Full SBG data: 1,105.78 kB minified, 197.31 kB gzip.
- Map summary: 360.20 kB minified, 100.62 kB gzip.
- Initial SBG data transfer reduction: approximately 49% with gzip. This is the data chunk only, not the whole page. A first profile click downloads the full dataset; subsequent clicks reuse it.

## Verification

```sh
npm ci
node --test scripts/test-map-clusters.mjs scripts/test-globe-clusters.mjs scripts/test-student-group-additions.mjs
npm run build
node scripts/build-map-performance-checks.mjs
```

With the Vite dev server running, open `/tmp/map-performance-checks/built/index.html`. The self-running browser fixture displays PASS/FAIL. It uses the real React components with fake map engines to verify all three map variants: image-free overview counts, click-to-zoom, exact-location click membership, current callbacks, zero redundant projections over 120 idle render events, spotlight visibility/reuse, theme changes, subscription cleanup, and summary-to-profile hydration including leader social links. It does not contact a map provider or require a token. The original Playwright overlay regression now starts at campus zoom to continue testing exact-location behavior.

The browser environment used for this change fell back to the SVG map because WebGL was unavailable. Real GPU frame rates, Mapbox tile loading, mobile thermals, CDN headers and concurrent-visitor capacity are not measured by these checks. Before production rollout, smoke-test Earth/Map views and the Singapore/Sri Lanka spotlights with a valid Mapbox token on a mid-range Android phone, including pan/zoom, filters, profile clicks and directory switching. Renderer bundle sizes still trigger Vite's existing large-chunk warning. Native GPU marker layers, adaptive rendering quality and infrastructure/load testing remain separate follow-up work.
