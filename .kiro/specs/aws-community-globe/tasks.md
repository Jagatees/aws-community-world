# Implementation Plan

## Completed

- [x] 1. Project scaffold
  - Vite + React 18, Tailwind CSS, AWS color tokens configured
  - `index.html` with dark background and root mount point
  - AWS RUM initialised in `src/awsRum.js`

- [x] 2. Data layer
  - `src/types.js` — `Member`, `CategoryKey`, `NewsItem`, `NewsData` types
  - `src/data/heroes.json` — real AWS Heroes with `image_url`, `hero_page_url`, `hero_type`, lat/lng
  - `src/data/community-builders.json` — real Community Builders with tags and coordinates
  - `src/data/user-groups.json` — real User Groups with `joinUrl` and coordinates
  - `src/data/cloud-clubs.json` — real Cloud Clubs with `ledBy` leader array and coordinates
  - `src/data/news.json` — AWS Builder news items with coordinates
  - `src/hooks/useCategory.js` — loads + normalises JSON, in-memory cache, `{ members, loading, error }`
  - `src/hooks/useNews.js` — loads news data
  - `src/utils/countryFlags.js` — `getCountryCode`, `countryCodeToFlag`, `formatCountryWithFlag`
  - `src/utils/memberMarkers.js` — marker helpers

- [x] 3. Data normalisation for Heroes
  - `normalizeMembers()` maps `image_url` → `avatarUrl`, `hero_page_url` → `profileUrl`, `hero_type` → `heroType` + `tag`
  - All categories normalised through the same function

- [x] 4. Header component (`src/components/Header.jsx`)
  - AWS wordmark + "Community Globe" title + creator credit
  - Icon links: LinkedIn, AWS Builder article, Telegram, GitHub
  - Dark/light mode toggle button

- [x] 5. Tab navigation (`src/components/TabNav.jsx`)
  - Five tabs: Heroes, Community Builders, User Groups, Cloud Clubs, News
  - Active tab: AWS Orange bottom border, lighter background
  - `CountryDropdown` rendered inline after Cloud Clubs tab
  - Country filter hidden when News tab is active

- [x] 6. Country filter (`src/components/CountryDropdown.jsx`)
  - Custom dropdown (not native `<select>`) — renders via `ReactDOM.createPortal`
  - Positioned with `getBoundingClientRect` to avoid overflow clipping
  - Each option: flag emoji + country name + member count
  - Trigger button shows selected flag + ISO code, or 🌍 All Countries

- [x] 7. Tag filter (`src/components/TagFilter.jsx`)
  - Horizontal scrollable pill strip below tab bar
  - Shown only when active category has tagged members
  - Hidden on News tab

- [x] 8. Globe scenes (lazy-loaded)
  - `src/components/GlobeScene.jsx` — `globe.gl` classic WebGL globe
  - `src/components/ClassicGlobeScene.jsx` — alternative classic implementation
  - `src/components/FlatMapScene.jsx` — 2D flat map
  - All support: `members`, `onMarkerClick`, `flyToTarget`, `zoomCommand`, `darkMode`
  - Auto-rotation with idle detection (`src/hooks/useAutoRotate.js`)
  - Marker clustering for co-located members
  - Per-category marker colours

- [x] 9. Profile card (`src/components/ProfileCard.jsx`)
  - `SingleMemberView` — avatar, name, category badge, hero type, tag, location, action button
  - `CloudClubSingleView` — leader avatar stack, club name, leader names, join button
  - `ClusterListView` — scrollable list with hero type / tag per row
  - Dismisses on outside click or × button
  - Adapts to dark/light mode

- [x] 10. News feed
  - `src/components/NewsPanel.jsx` — slide-in right panel
  - News markers rendered on globe when News tab is active
  - Clicking globe marker highlights item in panel
  - "Locate" button flies globe to news item coordinates
  - Panel toggle button repositions based on open/closed state

- [x] 11. App composition (`src/App.jsx`)
  - All state managed centrally: category, selected member, news items, tag, country, dark mode, globe design, zoom, news panel
  - Globe scenes lazy-loaded with `Suspense` fallback
  - Country centroid fly-to on country filter change
  - Error banner for data load failures
  - Members with lat/lng = 0,0 excluded from rendering

---

## Remaining / Future Work

- [ ] 12. Unit tests
  - [ ] 12.1 `useCategory` hook — load, error, loading states, normalisation
  - [ ] 12.2 `useAutoRotate` hook — rotation, pause on interaction, resume after 3s
  - [ ] 12.3 `TabNav` — tab switching, active state, country dropdown visibility
  - [ ] 12.4 `ProfileCard` — single member, cluster list, cloud club view, close behaviour
  - [ ] 12.5 `countryFlags` utility — flag emoji output, alias resolution, edge cases

- [ ] 13. Enhancements (optional)
  - [ ] 13.1 Search / spotlight — find a member by name across all categories
  - [ ] 13.2 Share link — deep-link to a specific member or country filter
  - [ ] 13.3 Live data — replace static JSON with AWS Builder community API when available
  - [ ] 13.4 PWA support — offline caching of community data
