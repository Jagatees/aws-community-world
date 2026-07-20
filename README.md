# AWS Globe

An interactive world for discovering the people, groups, events, and stories that make up the global AWS community.

[Open the live globe](https://awscommunityglobe.click/) · [Report an issue](https://github.com/Jagatees/aws-community-world/issues)

![AWS Globe preview](public/preview.jpg)

## About the project

AWS information lives across community directories, event pages, and publishing platforms. AWS Globe brings those sources into one visual experience so people can discover members nearby, explore events worldwide, and read the latest Builder Center news.

The project is built in public and is not an official AWS product.

## Explore

### Community

- **Heroes** — browse AWS Heroes by specialization and location.
- **Community Builders** — explore Builders worldwide, including country-level summaries and public Builder profiles.
- **User Groups** — find local AWS User Groups represented by country flags.
- **Student Builder Groups** — discover university and student-led AWS communities and their leaders.
- **Kiro Ambassadors** — an early view of the growing Kiro community.

### Events and news

- **Kiro Events** — discover upcoming Kiro events and open their registration pages.
- **Community Days** — explore upcoming and previous AWS Community Days around the world.
- **Builder News** — read the latest and trending posts from AWS Builder Center in a map-linked news panel.
- **AWS Community Day Singapore** — a dedicated agenda, venue, map, and session-planning experience at `/community-day-singapore/`.

## View modes

The floating view switcher uses product-facing names instead of renderer names:

| View | Internal renderer | Best for |
| --- | --- | --- |
| **Earth** | `globe.gl` | Photorealistic exploration, profile markers, and avatar clustering |
| **Atlas** | Mapbox globe | Vector geography, precise navigation, and Mapbox-powered 3D scenes |
| **Minimal** | `cobe` | A lightweight, low-detail globe overview |
| **Map** | Mapbox flat map | Familiar two-dimensional geographic browsing |
| **Gallery** | Custom React archive | Visually browsing profiles without using a map |
| **Directory** | Custom React list | Scanning and opening records in a conventional list |

The selected view is shown by a fluid sliding control and is stored in the URL, so a specific view can be shared.

## Interaction highlights

- **Community insights dashboard** — open Insights from the main content dropdown to animate through historical snapshots, record movement, datasets, and regions.
- **Merged profile clusters** — nearby Heroes, Community Builders, and Student Builder Groups combine into a segmented circular avatar on Earth and Atlas.
- **Zoom-driven separation** — merged portraits smoothly separate as the camera moves closer.
- **Program-specific fallbacks** — missing photos use the official AWS Community Hero, AWS Community Builder, or Student Builder Group artwork.
- **Smart cluster totals** — Community Builder country summaries retain their complete Builder count while previewing real member portraits.
- **Region, country, and specialty filters** — narrow the globe without losing the current view.
- **Near Me** — use browser geolocation to move the map toward the visitor's location.
- **Profile details** — open people, group leaders, social links, Builder profiles, event pages, and registration links.
- **Live route state** — tab, filters, view, theme, and special views are reflected in query parameters.
- **Singapore 3D spotlight** — Student Builder Groups include a focused Mapbox-powered Singapore experience.
- **Responsive controls** — touch-friendly zoom, navigation, filtering, and view switching.
- **Graceful fallbacks** — the app can fall back to a flat SVG world map when WebGL is unavailable.

## Current data snapshot

The checked-in data currently contains:

| Dataset | Records |
| --- | ---: |
| AWS Heroes | 252 |
| AWS Community Builders | 3,037 |
| AWS User Groups | 575 |
| AWS Student Builder Groups | 896 |
| AWS Community Days | 38 |
| Kiro Events | 8 |
| Builder News | 10 latest + 10 trending |

Counts change as the data scripts are run and new directory snapshots are committed.

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

Earth, Minimal, Gallery, Directory, and the SVG fallback run without an environment file.

### Enable Mapbox views

Atlas, Map, and Mapbox-powered 3D experiences require a public Mapbox token. Copy `.env.example` to `.env.local` and replace the example value:

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
| `npm run update:growth-history` | Capture or replace today's regional directory snapshot |
| `npm run build:community-builder-summary` | Rebuild the lightweight country-level Community Builder dataset |

## Data pipeline

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

Community directory and Kiro event refresh commands are currently run manually. Additional scheduled workflows can be added later after their scraping reliability and source-change handling are proven.

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
