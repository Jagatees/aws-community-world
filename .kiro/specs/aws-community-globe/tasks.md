# Implementation Plan

- [x] 1. Scaffold the Vite + React project with Tailwind CSS









  - Initialize a new Vite React project in the workspace root
  - Install dependencies: `globe.gl`, `tailwindcss`, `postcss`, `autoprefixer`
  - Configure Tailwind with the AWS color tokens (background, surface, orange, blue)
  - Set up `index.html` with dark background and the root mount point
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 2. Create static community data files





- [x] 2.1 Define the Member TypeScript interface and CategoryKey type


  - Create `src/types.ts` with `Member`, `CategoryKey`, and `CategoryData` interfaces
  - _Requirements: 6.1, 6.3_

- [x] 2.2 Seed JSON data files for all four categories


  - Create `src/data/heroes.json`, `community-builders.json`, `user-groups.json`, `cloud-clubs.json`
  - Each file contains 10–15 mock members with realistic lat/lng coordinates spread globally
  - _Requirements: 6.1, 6.3_



- [x] 2.3 Implement a `useCategory` data hook




  - Write `src/hooks/useCategory.ts` that loads the correct JSON file based on the active category key
  - Handle load errors and return `{ members, error, loading }` state
  - _Requirements: 6.1, 6.2_

- [x] 3. Build the Header component





  - Create `src/components/Header.tsx` with AWS wordmark text and app subtitle
  - Style using AWS color tokens: dark surface background, white text, orange accent
  - _Requirements: 7.3_

- [x] 4. Build the TabNav component





- [x] 4.1 Implement TabNav with four category tabs


  - Create `src/components/TabNav.tsx` accepting `activeCategory` and `onChange` props
  - Render four buttons: Heroes, Community Builders, User Groups, Cloud Clubs
  - _Requirements: 3.1, 3.3, 3.4_

- [x] 4.2 Style active and inactive tab states

  - Active tab: AWS Orange bottom border (3px), white text, lighter surface background
  - Inactive tab: muted text, no border, dark surface
  - _Requirements: 3.3, 7.2, 7.4_

- [x] 5. Build the GlobeScene component





- [x] 5.1 Render the base globe using globe.gl


  - Create `src/components/GlobeScene.tsx` wrapping the `globe.gl` canvas
  - Configure globe colors: land dots `#2D3F50`, background `#0F1923`, atmosphere glow
  - _Requirements: 1.1, 7.1_

- [x] 5.2 Implement auto-rotation with idle detection


  - Add a `useAutoRotate` hook in `src/hooks/useAutoRotate.ts`
  - Rotate the globe's longitude on each animation frame while in idle state
  - Reset a 3-second idle timer on any pointer event; resume rotation after timeout
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 5.3 Render category markers on the globe

  - Pass `members` array from `useCategory` to globe.gl `pointsData`
  - Map each member's `lat`/`lng` to globe point coordinates
  - Apply per-category marker colors as defined in the design
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5.4 Implement marker clustering for co-located members

  - Group members sharing the same lat/lng (within 0.5 degree tolerance) into clusters
  - Render clusters as a single larger marker dot
  - Pass the full cluster array on click
  - _Requirements: 4.4, 5.5_

- [x] 5.5 Wire marker click to profile card callback

  - Attach globe.gl `onPointClick` handler to call `onMarkerClick` prop with the clicked member or cluster array
  - _Requirements: 5.1_

- [x] 6. Build the ProfileCard component





- [x] 6.1 Implement single-member profile card layout


  - Create `src/components/ProfileCard.tsx`
  - Render avatar (circular 64px), name, category badge, location, follow button, close button
  - Style with dark surface `#1B2836`, white text, AWS Orange accents, 12px border-radius
  - _Requirements: 5.1, 5.2, 5.3, 7.5_

- [x] 6.2 Implement cluster list view in the profile card

  - When `member` prop is an array, render a scrollable list of member entries
  - Each entry shows avatar, name, and location
  - _Requirements: 5.5_

- [x] 6.3 Implement dismiss behavior

  - Close card when the × button is clicked
  - Close card when user clicks outside the card overlay
  - _Requirements: 5.4_

- [x] 7. Wire everything together in App





  - Create `src/App.tsx` managing `activeCategory` and `selectedMember` state
  - Compose Header, TabNav, GlobeScene, and ProfileCard
  - Pass category to GlobeScene; pass onMarkerClick to set selectedMember
  - Pass onClose to ProfileCard to clear selectedMember
  - Handle data load error state by showing an error banner above the globe
  - _Requirements: 3.2, 5.1, 6.2_

- [ ] 8.1 Write unit tests for useCategory hook
  - Test successful data load, error state, and loading state transitions
  - _Requirements: 6.1, 6.2_

- [ ] 8.2 Write unit tests for useAutoRotate hook
  - Test that rotation starts in idle state, pauses on interaction, and resumes after 3 seconds
  - _Requirements: 1.2, 1.3, 1.4_

- [ ] 8.3 Write component tests for TabNav
  - Test tab rendering, active state styling, and onChange callback
  - _Requirements: 3.1, 3.3, 3.4_

- [ ] 8.4 Write component tests for ProfileCard
  - Test single member render, cluster list render, and close behavior
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
