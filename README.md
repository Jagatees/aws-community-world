# AWS Globe

An interactive world for discovering the people, groups, events, and stories that make up the global AWS community.

[Open the live globe](https://awscommunityglobe.click/) · [Report an issue](https://github.com/Jagatees/aws-community-world/issues)

![AWS Globe preview](public/preview.jpg)

## About the project

AWS information lives across community directories, event pages, and publishing platforms. AWS Globe brings those sources into one visual experience so people can discover members nearby, explore events worldwide, and read the latest Builder Center news.

The project is built in public and is not an official AWS product.

## Explore

### Community

The community tabs use this order on desktop and mobile:

- **Heroes** — browse AWS Heroes by specialization and location.
- **Community Builders** — explore Builders worldwide, including country-level summaries and public Builder profiles.
- **User Groups** — find local AWS User Groups represented by country flags.
- **Student Builder Groups** — discover university and student-led AWS communities and their leaders.
- **Kiro Ambassadors** — an early view of the growing Kiro community.
- **Golden Jackets** — discover publicly documented recipients, with gold markers, recognition sources, and clearly labeled alumni. This is a growing directory, with all profiles available in Directory and Gallery.
- **Ambassadors** — explore the AWS partner community, with portraits, roles, partner links, and country filters. Profiles without confirmed countries remain searchable in Directory and Gallery.

### Events and news

- **Kiro Events** — discover upcoming Kiro events and open their registration pages.
- **Community Days** — explore upcoming and previous AWS Community Days around the world.
- **Builder Lofts** — explore AWS builder spaces in San Francisco, Berlin, Hyderabad, and São Paulo, with open/announced status, offerings, access information, and official links.
- **News** — read the latest and trending posts from AWS Builder Center in a map-linked news panel.
- **AWS Community Day Singapore** — a dedicated agenda, venue, map, and session-planning experience at `/community-day-singapore/`.

## View modes

The floating view switcher uses product-facing names instead of renderer names:

| View | Internal renderer | Best for |
| --- | --- | --- |
| **Earth** | `globe.gl` | Photorealistic exploration, profile markers, and avatar clustering |
| **Minimal** | `cobe` | A lightweight, low-detail globe overview |
| **Map** | Mapbox flat map / SVG map | Familiar two-dimensional geographic browsing, with a lightweight SVG map on mobile |
| **Gallery** | Custom React archive | Visually browsing profiles without using a map |
| **Directory** | Custom React list | Scanning and opening records in a conventional list |

The selected view is shown by a fluid sliding control and is stored in the URL, so a specific view can be shared.

Desktop offers Earth, Minimal, Map, Gallery, and Directory. Mobile offers Minimal, Map, Gallery, and Directory. Gallery is available for all seven community categories. Atlas remains the Mapbox globe renderer used by country spotlights; it is not a standard view-switcher option. Dedicated event experiences can provide their own view controls.

## Interaction highlights

- **Community insights dashboard** — open Insights from the main content dropdown to animate through historical snapshots, record movement, datasets, and regions.
- **Merged profile clusters** — nearby Heroes, Community Builders, and Student Builder Groups combine into a segmented circular avatar on Earth and Atlas.
- **Zoom-driven separation** — merged portraits smoothly separate as the camera moves closer.
- **Program-specific fallbacks** — missing photos use the official AWS Community Hero, AWS Community Builder, or Student Builder Group artwork.
- **Smart cluster totals** — Community Builder country summaries retain their complete Builder count while previewing real member portraits.
- **Region, country, and specialty filters** — narrow the globe without losing the current view.
- **Near Me** — use browser geolocation to move the map toward the visitor's location.
- **Profile details** — open people, group leaders, social links, Builder profiles, event pages, and registration links.
- **Searchable cluster popups** — selections of 10 or more entries show search across names, locations, specialties, organizations, roles, and group leaders. Selections above 30 entries use 30-row pages with Previous/Next controls and result counts. Searching resets to the first page. This applies across all seven community tabs.
- **Recognition and location sources** — Ambassador and Golden Jacket profiles link to their public sources. Pins use approximate locations, and profiles without confirmed countries stay available in Directory and Gallery.
- **Community suggestions** — use Suggest to prepare a missing profile or event for review on GitHub, including Golden Jacket recipients.
- **Live route state** — tab, filters, view, theme, and special views are reflected in query parameters.
- **Singapore 3D spotlight** — Student Builder Groups include a focused Mapbox-powered Singapore experience.
- **Responsive controls** — touch-friendly zoom, navigation, filtering, and view switching.
- **Graceful fallbacks** — the app can fall back to a flat SVG world map when WebGL is unavailable.

## Current data snapshot

The checked-in data currently contains:

| Dataset | Records |
| --- | ---: |
| AWS Heroes | 252 |
| AWS Community Builders | 3,036 |
| AWS User Groups | 599 |
| AWS Student Builder Groups | 1,023 |
| Kiro Ambassadors | 7 |
| Golden Jackets | 68 |
| Ambassadors | 360 |
| AWS Community Days | 38 |
| Kiro Events | 4 |
| Builder Lofts | 4 |
| Builder News | 10 latest + 10 trending |

Golden Jackets currently has 64 mapped profiles across five countries and includes two labeled alumni. Ambassadors has 134 mapped profiles across 18 countries. For these two categories, the globe counts mapped profiles; Directory and Gallery include profiles without confirmed locations. Golden Jacket recognition does not assert that every certification remains current.

Counts reflect the checked-in JSON files and change as refresh scripts are run.

## Tech stack

- React 19 and Vite 8
- Tailwind CSS 4
- `globe.gl` for the photorealistic Earth view
- Mapbox GL JS for Atlas, Map, and 3D spotlight experiences
- `cobe` for the Minimal globe
- `d3-geo`, `topojson-client`, and `world-atlas` for the WebGL fallback map
- Phosphor Icons
- Playwright-based data collection and browser verification
- Vercel Analytics and Speed Insights
- AWS Amplify hosting configuration

## Running locally

Requirements:

- Node.js 22 or newer
- npm

Install dependencies and start Vite:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Example routes:

- Ambassadors: `/?tab=aws-ambassadors`
- Golden Jackets: `/?tab=golden-jackets`
- Golden Jacket directory: `/?tab=golden-jackets&view=list`
- Builder Lofts: `/?tab=builder-lofts`

The shortened navigation labels do not change the existing route keys.

Earth, Minimal, Gallery, Directory, and the SVG fallback run without an environment file.

### Enable Mapbox views

The desktop Mapbox map and Mapbox-powered globe/3D experiences use a public Mapbox token. The lightweight SVG map does not require one. Copy `.env.example` to `.env.local` and replace the example value:

```env
VITE_MAP_BOX=pk.your_mapbox_public_token_here
```

Do not commit `.env.local`; it is ignored by Git.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Vite development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the project |
| `npm run scrape` | Run the community scraping entry script |
| `npm run update:community-data` | Refresh community directories, enrich profiles, geocode new locations, and rebuild Community Builder summaries |
| `npm run update:builder-profiles` | Refresh optional public social links from Builder profiles |
| `npm run update:news` | Refresh the Builder Center latest and trending feeds |
| `npm run update:kiro-events` | Refresh Kiro event data |
| `npm run update:aws-ambassadors` | Refresh the official AWS Ambassador directory, preserving country-level location provenance |
| `npm run update:golden-jackets` | Refresh documented Golden Jacket recipients from reviewed AWS biographies and Golden Jackets Brazil |
| `npm run update:growth-history` | Capture or replace today's regional directory snapshot |
| `npm run build:community-builder-summary` | Rebuild the lightweight country-level Community Builder dataset |

## Data pipeline

Golden Jackets combine explicit recipient statements in [AWS Ambassador biographies](https://aws.amazon.com/partners/ambassadors/) with the recipient and alumni sections of [Golden Jackets Brazil](https://goldenjacketsbrazil.com/), an independent community directory. Certification counts alone are not used as proof of recognition. Challengers and rising members are excluded; alumni are labeled separately. This is a growing directory of recognition history, not a complete global list or a current certification-status check. Known cross-source identities are merged, and each profile retains its source and source-check date. Brazil locations use the existing city geocoding cache, falling back to an explicitly labeled country center. Profiles without confirmed countries remain off the map. Refresh with `npm run update:golden-jackets`; validate with `node scripts/test-golden-jackets.mjs` and `node scripts/test-golden-jackets-ui.mjs` (Vite port 5174, or `COMMUNITY_TEST_URL`).

AWS Ambassadors are refreshed separately from the [official AWS partner directory](https://aws.amazon.com/partners/ambassadors/) using `npm run update:aws-ambassadors`. Pins represent approximate country centers, based on explicit source tags or reviewed location statements in the official biographies. Broad regions such as APAC and EMEA are never converted into guessed countries. Profiles without a confirmed country remain searchable in Directory and Gallery. The refresh rejects incomplete responses and duplicate IDs before replacing the dataset; biography-based location mappings expire if the supporting text changes. Run `node scripts/test-aws-ambassadors.mjs` for data checks and `node scripts/test-aws-ambassadors-ui.mjs` against Vite on port 5174 (or set `COMMUNITY_TEST_URL`) for browser checks.

The source datasets live in [`src/data`](src/data). The scripts in [`scripts`](scripts) handle scraping, enrichment, geocoding, normalization, and summary generation.

The main community refresh targets these public AWS Builder Center directories:

- [AWS Heroes](https://builder.aws.com/community/heroes)
- [AWS Community Builders](https://builder.aws.com/community/community-builders)
- [AWS User Groups](https://builder.aws.com/community/user-groups)
- [AWS Student Builder Groups](https://builder.aws.com/community/student-builder-groups)

The refresh pipeline handles paginated directory interfaces such as “Load more” and “View More,” preserves the JSON shape expected by the app, and avoids replacing usable portraits with Builder Center's unshipped default-avatar paths.

### Regional snapshot history

[`src/data/community-growth-history.json`](src/data/community-growth-history.json) is the lightweight data store for the Community Insights dashboard. The generator reconstructs meaningful historical states from Git, adds the current working-tree state, and records totals, regional coverage, identity additions/removals, continuity, confidence flags, and upcoming-event signals for Heroes, Community Builders, User Groups, Student Builder Groups, Kiro Events, and Community Days.

Community and Kiro refresh commands rebuild this file automatically. Analytically identical commits are collapsed, and a same-day refresh replaces the working snapshot instead of creating a duplicate. Run `npm run update:growth-history` after any other manual dataset update that should be reflected in Insights. The default snapshot date uses `Asia/Singapore`; `GROWTH_SNAPSHOT_DATE=YYYY-MM-DD` can be supplied for a controlled backfill.

Identity comparisons use stable public IDs where available and normalized names otherwise, including normalization across the Cloud Club to Student Builder Group rename. The dashboard labels large source or scraper discontinuities so they are not presented as verified membership churn. These snapshots measure records captured from public AWS sources; they are not attendance or engagement analytics.

### Automation status

The repository currently includes one scheduled GitHub Actions workflow:

- **Builder News** runs daily at 01:00 UTC and commits changes to `src/data/news.json` when the feed changes.

The same daily workflow refreshes Kiro events and Insights history, validates the production build, and commits changed feed data. Community directories, Ambassadors, and Golden Jackets are refreshed manually with their respective commands. Builder Lofts is a curated dataset.

## Project structure

```text
src/
  components/   UI, maps, globes, cards, directories, and event experiences
  data/         Checked-in community, event, and news datasets
  hooks/        Category loading, news loading, and globe rotation behavior
  utils/        Flags, regions, marker helpers, and portrait clustering
scripts/        Scraping, enrichment, geocoding, export, and summary scripts
public/         Static images, icons, sprites, and social preview assets
api/            Serverless endpoints used by dedicated experiences
```

## Production and deployment

```bash
npm run lint
npm run build
npm run preview
```

[`amplify.yml`](amplify.yml) installs dependencies with `npm ci`, builds the Vite app, and publishes the `dist/` directory. The production site is available at [awscommunityglobe.click](https://awscommunityglobe.click/).

## Contributing

Issues and focused pull requests are welcome. Useful contributions include:

- correcting community or event data
- improving accessibility and mobile behavior
- making scrapers more resilient to source changes
- improving map performance and marker clarity
- adding reliable tests for interactions and data normalization

Please run `npm run lint` and `npm run build` before opening a pull request.

## Status

AWS Globe reached **Version 1.0** in July 2026. The globe remains actively maintained, and Experimental is intentionally a playground for new ideas and surprise features. Data completeness depends on public source availability, geocoding quality, and upstream page structures.
