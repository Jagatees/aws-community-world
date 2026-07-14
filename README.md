# AWS Community Globe

An interactive experience for discovering the AWS community around the world.

This project helps people explore AWS Community Heroes, Community Builders, User Groups, and Student Builder Groups across countries and regions through a more visual and interactive map experience.

## Why I Built This

I wanted to make it easier to discover the people and communities shaping AWS locally and globally.

Today, a lot of community discovery happens across separate pages, directories, and platforms. That works, but it is not always the easiest way to understand how broad, active, and connected the AWS community really is.

This project is my attempt to turn community discovery into something more:

- visual
- intuitive
- interactive
- useful for people trying to find nearby communities or explore other regions

Whether someone wants to find a local AWS User Group, discover Community Builders in another country, or simply see how wide the AWS ecosystem really is, this project is designed to make that journey easier.

## What It Does

- Browse AWS community members and groups through an interactive world experience
- Explore AWS Community Heroes, Community Builders, User Groups, and Student Builder Groups
- Filter by country and tag
- Switch between multiple map experiences: Classic globe, Sleek globe, and Flat map
- Open profile cards for people and communities
- Jump to random visible members with spotlight controls

## Tech Stack

- React 19
- Vite
- Tailwind CSS 4
- `globe.gl` for the classic 3D globe
- `cobe` for the lightweight sleek globe mode
- `d3-geo`, `topojson-client`, and `world-atlas` for the flat map view
- Node.js scripts for scraping, geocoding, and preparing community data

## Project Goals

- Make AWS community discovery more accessible
- Show the global reach of the AWS ecosystem in a more engaging way
- Help people find relevant communities by region and interest
- Build something useful in public while learning through iteration

## Running Locally

```bash
npm install
npm run dev
```

Then open:

```bash
http://localhost:5173
```

No environment file or AWS credentials are required to run the app. The default 3D globe works without additional configuration.

The Satellite and Flat map views optionally use Mapbox. To enable them, copy `.env.example` to `.env.local` and add your own public Mapbox token:

```env
VITE_MAP_BOX=pk.your_mapbox_public_token_here
```

Keep `.env.local` private; it is ignored by Git.

## Available Scripts

- `npm run dev` starts the local development server
- `npm run build` creates a production build
- `npm run preview` previews the production build locally
- `npm run lint` runs ESLint
- `npm run scrape` runs the scraping pipeline entry script
- `npm run update:community-data` scrapes the AWS Heroes, Community Builders, User Groups, and Student Builder Groups directories, handles pagination, geocodes new locations, adds public social links from Builder Center profiles, and rebuilds the Community Builder cluster summary
- `npm run update:builder-profiles` refreshes only the optional public social links shown on Community Builder, Hero, and Student Builder Group leader cards
- `npm run update:news` refreshes the Builder Center news feed
- `npm run update:kiro-events` refreshes Kiro event data

## Automated Data Refresh

GitHub Actions keeps the app data fresh:

- Builder Center news refreshes once per day.
- Kiro events refresh once per day.
- AWS community directory data refreshes once per day from:
  - `https://builder.aws.com/community/heroes`
  - `https://builder.aws.com/community/community-builders`
  - `https://builder.aws.com/community/user-groups`
  - `https://builder.aws.com/community/student-builder-groups`

The community-data runner loads all available directory rows before saving, including pages with "Load more", "View More", or similar pagination buttons. It preserves the JSON shapes used by the app tabs and commits updates to `src/data/*.json` plus the geocoding cache.

Manual handling should only be needed if AWS changes the page markup/selectors, requires login, presents a captcha, or blocks headless browser access. In that case, inspect the failed GitHub Actions logs, update `scripts/update-community-data.mjs` selectors/extraction logic, and run the workflow manually after the fix.

## Status

This project is still actively being improved. The core idea is already in place, and I am continuing to refine the experience, interactions, and data quality.

## Build In Public

I’m building a new way to discover the AWS community around the world.

The goal is simple: make it easier to find the people and communities shaping AWS locally and globally.

Still in progress, but I’m excited about the idea of making community discovery more interactive and useful for everyone in the ecosystem.
