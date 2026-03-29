# AWS Community Globe

An interactive experience for discovering the AWS community around the world.

This project helps people explore AWS Community Heroes, Community Builders, User Groups, and Cloud Clubs across countries and regions through a more visual and interactive map experience.

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
- Explore AWS Community Heroes, Community Builders, User Groups, and Cloud Clubs
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

## Available Scripts

- `npm run dev` starts the local development server
- `npm run build` creates a production build
- `npm run preview` previews the production build locally
- `npm run lint` runs ESLint
- `npm run scrape` runs the scraping pipeline entry script

## Status

This project is still actively being improved. The core idea is already in place, and I am continuing to refine the experience, interactions, and data quality.

## Build In Public

I’m building a new way to discover the AWS community around the world.

The goal is simple: make it easier to find the people and communities shaping AWS locally and globally.

Still in progress, but I’m excited about the idea of making community discovery more interactive and useful for everyone in the ecosystem.
