# Workshop explorer

Open `/?view=workshops` or choose **Workshops** in the main content menu.

The page lists products from the public AWS product directory, plus service/feature names in Builder Center's workshop catalog. Selecting a service shows its workshops. Search, category, level, language, duration, sandbox availability and sorting are supported; URL parameters retain selections on reload and when sharing. Service navigation supports browser back/forward. Services with no workshop stay visible, with an optional “Only services with workshops” filter.

## Data refresh

Run `npm run update:workshops` to replace `src/data/workshops.json`. The existing community-feed workflow runs this alongside the other feed refreshes. The page reads the saved snapshot, so it does not depend on live cross-origin requests.

Sources:

- https://builder.aws.com/build/workshops — the public `__bingo-ssr-query-state__` includes the complete English catalog, public workshop URLs and metadata.
- https://aws.amazon.com/products/ — the public product-directory endpoint supplies product names, descriptions, categories and official links.

The importer checks directory completeness, duplicate identifiers and link hosts. It writes atomically and refuses to replace an existing snapshot when either catalog unexpectedly shrinks by more than half. A changed upstream format fails the refresh instead of clearing the existing catalog.

Workshop service tags match product names and parenthetical abbreviations. A small explicit parent map includes feature workshops under their parent service (for example, S3 Tables under S3) without duplicate counts. Unmatched service tags remain separate entries; no fuzzy matching is used. Product entries duplicated in the source are deduplicated by name. Source technology categories are normalized into readable labels, retaining multiple categories where supplied.

Counts cover Builder Center's catalog, not every AWS workshop on the internet. Some directory products are legacy entries. Sandbox availability is shown only when the source explicitly marks it available; it is not a claim that all resources are free.

## Service icons

Cards use locally served official AWS architecture icons, Kiro's brand icon, and the AWS SAM squirrel. `src/data/aws-service-icons.json` maps service IDs to their assets. Features may share a parent service's icon; three entries use official category icons because a dedicated icon was not found. Tooltips identify shared/category icons. New services that are not mapped yet display their initials so a future catalog refresh cannot introduce broken images or misleading logos.

Asset origins, archive entries and checksums are in `public/aws-service-icons/SOURCES.json`; attribution and usage notes are in `public/aws-service-icons/NOTICE.md`. Keep original artwork and colors when adding icons. The archive assets are from AWS's July 2026 pack, with January 2026 and pinned AWS Labs legacy icons for products missing from that release.

## 3D workshop world

The **3D world** button opens `?view=workshops&mode=world` at eye level in a compact cloud district. Rounded server-rack shops have soft cloud rooftops, category-colored signs and their original AWS icons. Tiled streets, mint circuit paths, cream planters, leafy plants and warm street lamps lead between the shops, with a roaming Kiro ghost and a lavender ringed planet above the lanes. Use WASD to walk/strafe, arrow keys to walk/turn, Shift to run, drag to look, and E to interact. Optional **Mouse look** captures the pointer; Escape releases it. Touch users can hold the movement buttons and drag the scene to look.

Every service has one storefront on its primary catalog category's street. The current catalog has 24 streets, including AI & ML, Compute, Storage and Databases. Each street has a category sign and matching path color; the HUD, directory addresses and minimap use the same layout. Streets fill the shortest of three connected lanes so smaller categories do not leave large empty areas. Addresses are independent of directory ordering and filters. Services tagged with additional categories remain discoverable through those directory filters without duplicating their shops.

Use **Streets** to jump to any category, including streets whose shops have no workshops yet. Opening the world with a primary category selected starts on that street. Glass doors slide open as visitors approach. Inside, every workshop has a monitor on a server-backed desk, under curved timber beams and cloud pendant lamps. Warm floor lights mark the central aisle; stools and desktop plants stay within the existing display footprints. Approach an item and press E/tap the interaction prompt to read its description and open its AWS workshop page. Walking back through the exit returns to that storefront. The directory supports search, category filters and fast travel to a shop's entrance. The card view remains available, and the `service` URL restores an occupied shop on reload/history navigation.

Services with no workshops have impassable shutters and a **Closed** sign. This is a catalog availability indicator, not a claim that AWS has discontinued the service. All shops remain in the world; **Open shops only** filters the directory.

The world uses the existing Three.js dependency with a first-person camera, pointer-lock/drag look, collision checks, door triggers and [Raycaster](https://threejs.org/docs/pages/Raycaster.html) item picking. It is lazy loaded separately from the catalog. Nearby detailed storefronts stream in as the player walks; distant buildings use instancing. Rounded geometries are cached and static scenery is merged by material; the tiled floor texture is generated locally. A bounded shadow map follows the visitor and is reused while idle. Interior portals provide room for every workshop while retaining the exterior address. There is no street or shelf pagination. Official icon files remain unmodified.

Use **Call Kiro**, click the nearby 3D character, or press E at its prompt. Kiro comes over and opens a searchable service picker. Choosing a service draws a purple arrow trail on the floor and minimap. Follow with the ordinary walking controls: Kiro walks ahead, waits if the visitor falls behind, and comes back to replan if they stray from the trail. The route ends outside the selected shop, including clearly labelled closed shops. Kiro moves aside at arrival and fades when extremely close to the camera so the doorway stays visible. **Stop guidance**, entering a shop, and fast travel clear the route. Choosing a destination does not move the visitor automatically.

`kiroWorldModel.js` extrudes and bevels the ghost silhouette from the locally saved Kiro SVG, keeping the source icon unchanged. This is a model built for the world, not a downloaded official 3D asset. The guide uses a small street/crossing navigation graph and checks route segments against buildings. Route lines and arrows use instancing. The guide's geometry, SVG-derived meshes, materials and listeners are disposed with the world.

Rendering continues while moving, looking, opening doors or animating Kiro. Reduced-motion preferences disable idle roaming and bobbing; requested guide walks still work. There is no camera bob or auto-flight. Opening a panel, losing focus or hiding the page pauses movement and the guide; a panel releases mouse capture. Pixel ratio is capped, and sustained slow frames reduce rendering resolution and disable real-time shadows. Movement uses small collision-safe substeps so a slow frame does not reduce walking speed or let visitors pass through shutters. Streamed texture resources, event listeners and the WebGL context are disposed when no longer needed. The HTML directory and workshop links remain usable without WebGL. The minimap shows nearby shops, Kiro, the current trail and the player's heading.

## Validation

```sh
node --test scripts/test-workshops.mjs
node scripts/test-workshops-ui.mjs
node scripts/test-workshop-world-ui.mjs
node --test scripts/test-workshop-world-layout.mjs
node --test scripts/test-kiro-world-navigation.mjs
node scripts/test-kiro-world-ui.mjs
npm run build
```

The browser check expects a dev server on port 5175; override with `COMMUNITY_TEST_URL` if needed. Catalog screenshots are saved under the ignored `tmp/workshops/qa/` directory; world screenshots are in `tmp/workshops/walk-qa/`. Layout checks verify category grouping, unique storefronts, street arrivals, every shop entrance, connected cross paths, and clear aisles around every workshop display. Browser checks also cover category shortcuts from both outside and inside a shop.

Kiro checks cover routes to every shop from opposite sides of the world, building avoidance, summoning, waiting, walking the rendered route, arrival, cancellation, closed shops, pausing and motion preferences. Guide screenshots are saved in `tmp/workshops/kiro-qa/`.
