# Requirements: AWS Community Globe

## Overview

An interactive 3D globe web application that visualises the global AWS Builder community — Heroes, Community Builders, User Groups, Cloud Clubs, and AWS news — on a real-time, explorable globe. Built with React + Vite, styled with Tailwind CSS and AWS brand tokens.

---

## Functional Requirements

### 1. Globe Visualisation

- **1.1** The app shall render an interactive 3D globe as the primary UI surface.
- **1.2** Three globe styles shall be available: Classic (globe.gl), Sleek (cobe), and Flat (2D map).
- **1.3** The globe shall auto-rotate when idle and pause on user interaction.
- **1.4** Auto-rotation shall resume 3 seconds after the last pointer interaction.
- **1.5** The user shall be able to zoom in and out via on-screen + / − controls.
- **1.6** The globe shall fly to a target location when a country filter or news item is located.

### 2. Category Navigation

- **2.1** A tab bar shall provide navigation between: Heroes, Community Builders, User Groups, Cloud Clubs, and News.
- **2.2** Switching tabs shall clear the active member selection, tag filter, and country filter.
- **2.3** The active tab shall be visually highlighted with an AWS Orange bottom border.

### 3. Community Member Markers

- **3.1** Each community member with valid coordinates shall be rendered as a marker on the globe.
- **3.2** Marker colour shall differ per category:
  - Heroes → AWS Orange `#FF9900`
  - Community Builders → Green `#1A9C3E`
  - User Groups → AWS Blue `#00A1C9`
  - Cloud Clubs → Red `#BF0816`
- **3.3** Members sharing the same coordinates shall be clustered into a single larger marker.
- **3.4** Clicking a marker shall open a profile card for that member or cluster.

### 4. Profile Card

- **4.1** The profile card shall display: avatar, name, category badge, location, and a link button.
- **4.2** For Heroes, the card shall additionally show the hero type (e.g. "Serverless Hero") and a "View Profile" link to their AWS Builder page.
- **4.3** For Community Builders, the card shall show their specialisation tag.
- **4.4** For Cloud Clubs, the card shall show the club leader(s) with avatar(s) and a "Join" link.
- **4.5** For User Groups, the card shall show a "Join" link.
- **4.6** When a cluster is clicked, the card shall show a scrollable list of all members at that location, each with avatar, name, hero type / tag, and location.
- **4.7** The card shall close when the × button is clicked or when the user clicks outside it.

### 5. Country Filter

- **5.1** A custom dropdown shall appear in the tab bar, next to the Cloud Clubs tab, listing all countries present in the active category.
- **5.2** Each country option shall display its flag emoji and full country name.
- **5.3** Selecting a country shall filter markers to that country and fly the globe to the centroid of matching members.
- **5.4** The dropdown shall render via a portal so it is never clipped by parent overflow containers.
- **5.5** The country filter shall be hidden when the News tab is active.

### 6. Tag / Specialisation Filter

- **6.1** When the active category has members with tags (e.g. hero types, builder specialisations), a horizontal tag filter strip shall appear below the tab bar.
- **6.2** Selecting a tag shall filter markers to members with that tag.
- **6.3** The tag filter shall be hidden when the News tab is active.

### 7. News Feed

- **7.1** A "News" tab shall load AWS Builder community news items from a local JSON data file.
- **7.2** News items with coordinates shall be rendered as markers on the globe.
- **7.3** A slide-in news panel shall appear on the right side of the screen when the News tab is active.
- **7.4** The news panel shall list articles with title, author avatar, tags, publish date, and like/comment counts.
- **7.5** Clicking a news marker on the globe shall highlight the corresponding item(s) in the news panel.
- **7.6** A "Locate" button on each news item shall fly the globe to that item's coordinates.
- **7.7** The news panel shall be togglable via a hide/show button.

### 8. Header & Social Links

- **8.1** The header shall display the AWS wordmark, app title "Community Globe", and a creator credit.
- **8.2** The header shall include icon links to: LinkedIn, AWS Builder article, Telegram group, and GitHub repository.
- **8.3** A dark/light mode toggle shall be present in the header.

### 9. Dark / Light Mode

- **9.1** The app shall support dark mode (default) and light mode.
- **9.2** All components — globe, cards, tabs, dropdowns, panels — shall adapt to the active mode.

### 10. Data Layer

- **10.1** Community data shall be loaded from static JSON files: `heroes.json`, `community-builders.json`, `user-groups.json`, `cloud-clubs.json`, `news.json`.
- **10.2** Heroes data shall be normalised from `image_url` / `hero_page_url` / `hero_type` fields into the common `Member` shape.
- **10.3** Loaded data shall be cached in memory so switching back to a previously visited tab does not re-fetch.
- **10.4** A load error shall display a dismissible error banner above the globe.

### 11. Performance & UX

- **11.1** Globe scenes shall be lazy-loaded to reduce initial bundle size.
- **11.2** Members with `lat: 0, lng: 0` shall be excluded from globe rendering.
- **11.3** AWS RUM (Real User Monitoring) shall be initialised for performance tracking.
