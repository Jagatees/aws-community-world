# Cross-device decision options — draft pending desktop QA

Audit synthesis date: 2026-09-03\
Inputs: [`inventory.md`](./inventory.md), [`architecture-recommendations.md`](./architecture-recommendations.md), [`data-performance-accessibility.md`](./data-performance-accessibility.md), and [`mobile-qa.md`](./mobile-qa.md).\
Status: mobile recommendations are evidence-backed; desktop keep/remove choices remain provisional until the live desktop matrix is complete.

## Outcome so far

The evidence supports a narrower product with one semantic marker policy and device-appropriate renderers:

```text
validated Member records
        |
        v
derived MarkerModel + location accuracy + represented count
        |
        +--> Home preview adapter
        +--> Minimal mobile/low-power adapter
        +--> Rich desktop globe adapter (renderer pending desktop QA)
        +--> One flat/vector location adapter
        +--> Directory/Gallery detail views
```

The project does not need one rendering engine everywhere. It does need one definition of what a marker represents. Today the same underlying record can be a face pile in Earth, a leader collage in Atlas, a different image stack in Map, a dot/label in Minimal, and a card in Directory. That inconsistency is the source of the funniest-looking face merges, misleading group identity, divergent counts, repeated fallbacks, and a multiplied QA burden.

The cross-device product direction already supported by evidence is:

- **Mobile core:** Home + Minimal + Directory, with Gallery retained as a secondary visual browse experience. Map may remain temporarily as an advanced view; Earth, Atlas, and GeoLibre should leave the mobile primary chooser until marker density is redesigned.
- **Desktop core:** Directory is confirmed. A rich signature globe should remain, but desktop QA must decide whether Earth or Atlas earns that role. Minimal should remain as the low-power/reduced-motion option. One flat/vector map job should remain, not both Map and GeoLibre as permanent peer choices.
- **Experimental:** keep it separate from the core product. Country Mosaic is the clearest standalone lab idea. Hero Orbit duplicates spectacle/browsing, Event Reveal is a dated hardcoded tour, and Global Infra's best ideas belong inside Community Days.

## Confirmed evidence versus desktop-dependent decisions

### Confirmed now

| Evidence | Consequence |
|---|---|
| Home community/events fit all seven requested portrait sizes and retain CTA/stats above the fold. | Keep both home experiences; changes should target data semantics, not replace the mobile composition. |
| The curated home set is balanced across five categories, but Steve Teo and AWS UG Singapore share one exact coordinate. | Keep the mix; resolve that overlap with one explicit mixed cluster or distinct verified coordinates. Do not silently jitter. |
| Minimal was the only geographic renderer that remained understandable across all large mobile categories. | Keep Minimal as the mobile default and reduced-motion/low-power renderer. |
| Minimal labels cross viewport edges after normal rotation and touch-style drag. | A screen-space placement/clamping policy is required before calling Minimal finished. |
| Earth/Atlas showed severe face/flag/count pileups from 320-430 px. At 320 x 568, Student Groups produced 452 marker buttons and 603 visible images. | Hide Earth/Atlas from the mobile primary chooser now; do not spend time polishing individual overlaps before defining aggregate markers. |
| GeoLibre uses the Atlas marker system, displayed a small portrait-crowded globe with large unused space, and lacks a distinct mobile job. | Remove GeoLibre from the mobile chooser. Keep its provider strategy only as a candidate for the future canonical vector map. |
| Gallery and Directory had no responsive overflow in the tested mobile categories; Directory is the simplest and most accessible path. | Keep Directory on both devices. Keep Gallery as secondary on mobile unless real touch/focus testing finds a blocker. |
| User Group flags repeatedly requested invalid `fx.png` and `uk.png` URLs; marker image renderers lack a shared error fallback. | Fix codes immediately and centralize local fallback behavior in MarkerModel/render adapters. |
| Country-centroid group clusters say “members at this location,” while the opened list spans multiple cities/states. | MarkerModel must carry location precision/scope and generate truthful copy such as “10 groups across the United States.” |
| Community Builder pre-aggregates can show 37 summary rows even though they represent 318 people. | `representedCount` must sum source counts; renderer code may not infer count from `members.length`. |
| Cross-country exact-coordinate groups affect 105/250 plotted Heroes and 2,321/2,901 plotted Community Builders. | Coordinate validation and an explicit approximate/unmapped state are prerequisites for honest person-level markers. |
| Earth/Mapbox modes ship very large renderer chunks and hundreds of DOM marker trees; Minimal is dramatically lighter. | Device defaults and public mode count are performance decisions, not merely visual preferences. |
| Reduced-motion behavior is strongest in Minimal; Earth, Mapbox/GeoLibre, and multiple experiments are incomplete. | Directory/Minimal must be automatic safe paths; any retained renderer must implement the same motion contract. |
| Short landscape at 667 x 375 switches to a desktop-like shell and leaves only 232 px for the globe. | Add a height/orientation-aware mobile shell; width-only breakpoints are insufficient. |

### Must wait for desktop QA

| Open decision | Desktop evidence required |
|---|---|
| **Earth or Atlas as the rich signature desktop globe** | Compare face separation, cluster expansion, keyboard names, performance, and visual composition at 1024, 1280, 1366, 1440, and 1920. |
| **Keep Atlas as a specialized Student Group spotlight** | Validate Singapore/Sri Lanka spotlights and confirm they offer unique value beyond a flat/vector map. Also verify Mapbox token and attribution requirements. |
| **Map versus GeoLibre for the single detailed location job** | Compare navigation clarity, marker density, token/provider failure, payload, and desktop fit. Static evidence favors one token-free implementation but does not identify the winning current UI. |
| **Gallery as a desktop core or secondary view** | Validate its custom carousel focus order, profile modal behavior, and full Community Builder payload on desktop. |
| **Desktop home renderer** | Confirm the 14 curated markers remain legible, the duplicate Singapore coordinate is visible, and the `globe.gl` load/rotation cost earns its richer first impression. |
| **Community Days default desktop renderer** | Compare Earth, Atlas, Minimal, and Directory for date/status clarity, not just visual spectacle. |
| **Exact removal timing for duplicate renderers** | Do not delete a renderer before the replacement covers deep links, spotlights, filters, selection, fallback, and required provider behavior. |

## Proposed shared `MarkerModel`

Keep the normalized `Member` type as the source record. Derive a renderer-independent marker model after validation, filtering, and grouping; do not force engines to interpret raw category fields independently.

```ts
type MarkerKind = 'person' | 'group' | 'aggregate' | 'event' | 'story';
type LocationPrecision = 'verified-point' | 'city' | 'region' | 'country' | 'approximate' | 'unknown';

type MarkerModel = {
  id: string;                         // stable across renderer switches
  category: CategoryKey;
  kind: MarkerKind;
  coordinates: { lat: number; lng: number } | null;
  location: {
    label: string;
    country?: string;
    precision: LocationPrecision;
    source?: string;
  };
  memberIds: string[];
  representedCount: number;           // sum(builderCount) for summaries; never implicit array length
  title: string;
  subtitle?: string;
  visual: {
    categoryColor: string;
    portraitUrl?: string;
    localBadgeUrl: string;
    flagCode?: string;
    dateLabel?: string;
    status?: 'upcoming' | 'past' | 'live';
  };
  action: {
    type: 'open-record' | 'open-cluster' | 'open-news';
    targetIds: string[];
  };
  accessibilityLabel: string;
};
```

### Non-negotiable marker policy

1. **Person:** show one face only when `kind=person`, `representedCount=1`, and location precision is sufficiently trustworthy. Accessible name: `Name, role, place`.
2. **Group:** use the group's own identity when available; otherwise use a local program/category badge or country flag. A leader portrait may appear inside the opened detail, not as the group's overview identity.
3. **Aggregate:** show one badge/flag plus a count. Do not preview multiple faces at overview scale. Copy must reflect precision: `29 Heroes with approximate US locations`, `10 User Groups across the United States`, or `4 people near Seattle`.
4. **Event:** show a date/status pin; never reuse person/avatar semantics.
5. **Story:** use an article/author marker that always opens the News surface, not a person profile.
6. **Missing image:** fall back synchronously to a shipped local badge/initial asset. No broken-image icon and no remote placeholder as the final fallback.
7. **Bad coordinates:** reject impossible country/coordinate pairs from person-level plotting. Preserve those records in Directory and totals with an `unmapped` or `approximate` label.
8. **Counts:** `representedCount` comes from the data pipeline. Renderers may format it but may not recompute it.
9. **Stable selection:** switching renderer retains the same selected MarkerModel/action target rather than reconstructing category-specific detail behavior.
10. **Motion/accessibility:** each adapter consumes the same motion policy, keyboard label, focus behavior, and visibility state.

### Grouping and placement policy

- Validate country consistency before spatial grouping.
- Preserve location precision from ingestion rather than inferring it only from coordinate equality.
- Group only compatible records: same category, same location scope, same country, and a deliberate spatial bucket. Exact coordinate equality alone is not sufficient when the input coordinate is a country centroid.
- Retain a separate `sourceRecordCount` if needed for debugging, but never display it as the represented person/group count.
- Provide renderer hints derived centrally: `overview`, `expanded`, `selected`, and `hiddenByCollision`.
- Run screen-space collision handling after geographic projection. Labels must flip, clamp, or hide before crossing viewport/control safe areas.
- Define marker budgets rather than rendering every DOM marker: provisional mobile budget 8 labels plus bounded canvas dots; provisional desktop budget 18 labels/interactive markers plus aggregated dots. Desktop QA should tune the rich-globe budget.

### Category mapping

| Category | Overview identity | Expanded/detail identity |
|---|---|---|
| Heroes | Person portrait only for trustworthy single-person points; otherwise Hero badge + count | Individual portraits/names in list |
| Community Builders | Builder badge + represented count for summaries/coarse coordinates | Person portraits after validated expansion |
| User Groups | Country flag or User Group badge + group count | Group names and Join actions |
| Student Builder Groups | Student program/institution badge + group count | Group identity first; leader faces inside detail only |
| Kiro Ambassadors | Single portrait or local Kiro fallback | Named ambassador card |
| Kiro Events | Kiro event/date badge | Event detail/CTA |
| Community Days | Country flag + date/status | Event name, date, status, location |
| News | Story/author glyph | News panel/article card |

## Proposed product decisions

### Mobile — supported now

| Experience | Decision | Implementation meaning |
|---|---|---|
| Home community | **KEEP WITH CHANGES** | Keep current lightweight Cobe layout and curated mix; fix duplicate Singapore placement, count semantics, and failed-image fallback. |
| Home events | **KEEP** | Preserve the clean dot-only composition; replace anonymous hardcoded event locations with a small derived real-event model when data pipeline work lands. |
| Minimal | **KEEP WITH CHANGES** | Primary geographic view. Add MarkerModel, viewport-safe labels, truthful scope copy, and stable selection. |
| Earth | **SIMPLIFY OR REPLACE** | Remove from mobile chooser now. Reintroduce only if it renders aggregate badges under a strict budget and passes device testing. |
| Atlas | **SIMPLIFY OR REPLACE** | Remove general Atlas from mobile chooser. A focused country spotlight may remain if desktop/spotlight QA proves unique value. |
| Map | **SIMPLIFY OR REPLACE** | Preserve the flat-map user job, not the current marker stack/provider duplication. Temporary advanced option is acceptable while replacement is built. |
| GeoLibre | **REMOVE FROM MOBILE CHOOSER** | Keep code only as a provider candidate until the one-vector-map decision is made. |
| Gallery | **KEEP WITH CHANGES** | Runtime mobile fit was good; retain as secondary visual browse, then validate focus order and replace any group leader-as-group semantics. |
| Directory | **KEEP** | Make it a persistent `Browse list` action and universal fallback, not the last of seven equal modes. |
| Experimental section | **REMOVE FROM MOBILE CORE** | Keep deep-linkable lab access if portfolio needs it; do not treat four experiments as supported mobile product modes. |
| AWS Ambassadors | **KEEP HIDDEN** | Do not expose an empty category; Directory/globe decision resumes only when data exists. |

### Desktop — provisional pending live results

| Experience | Provisional decision | What could change it |
|---|---|---|
| Home community/events | **KEEP WITH CHANGES** | Replace only if desktop QA finds scale, overlap, or load cost severe enough to outweigh the entry experience. |
| Earth | **KEEP WITH CHANGES candidate** | Loses signature-globe role if desktop face separation/performance is materially worse than Atlas after aggregate marker rules. |
| Atlas | **KEEP SPECIALIZED candidate** | Remove from primary chooser if it duplicates Earth without better place discovery; retain internally for spotlights if required. |
| Minimal | **KEEP WITH CHANGES** | Expected to remain low-power/reduced-motion choice even if not desktop default. |
| Map | **REPLACE current implementation candidate** | Could survive if desktop QA proves it is uniquely clear and Mapbox dependency is accepted. |
| GeoLibre | **MOVE TO LAB OR USE AS REPLACEMENT candidate** | Keep first-class only if it wins the one-vector-map comparison. |
| Gallery | **KEEP WITH CHANGES candidate** | Downgrade to secondary if focus/performance/full-data behavior fails. |
| Directory | **KEEP** | Confirmed by architecture/data evidence; desktop QA should find defects, not revisit its product role. |
| Community Days regional ideas | **MERGE** | Bring Global Infra's useful regional navigation into Community Days rather than retain another globe lifecycle. |

### Experimental disposition — product decision, not purely visual

| Experiment | Decision | Rationale |
|---|---|---|
| Country Mosaic | **KEEP IN LAB WITH CHANGES** | Answers a distinct country-distribution question and has a reduced-motion path. |
| Hero Orbit | **ARCHIVE / REMOVE FROM LIVE PRODUCT** | Non-geographic portrait orbit duplicates Earth spectacle and Gallery browsing; mobile fit alone does not create a unique job. |
| Event Reveal | **ARCHIVE / REMOVE FROM LIVE PRODUCT** | Four hardcoded dated stops and an external texture make it a campaign/demo artifact, not durable discovery. Preserve a recorded demo if desired. |
| Global Infra | **MERGE, THEN REMOVE STANDALONE** | Regional tabs and event summaries are useful; its name and separate globe duplicate Community Days. |

## Work items, dependencies, and effort

Effort bands assume one developer familiar with the repository, include implementation and focused browser QA, and exclude manual source-data research outside the repository:

- **S:** 0.25-2 developer-days.
- **M:** 3-6 developer-days.
- **L:** 7-15 developer-days.
- **XL:** 16+ developer-days.

| Work item | Size | Estimate | Dependencies | Risk/notes |
|---|---:|---:|---|---|
| Fix `fx`/`uk` flag mapping and add local flag/badge error fallback | S | 0.5-1 day | Local fallback asset choice | Low risk; add deterministic test cases. |
| Correct `representedCount` for pre-aggregated Community Builders | S | 0.5-1 day | Decide whether all categories expose source counts | High correctness value; ensure filters do not double-count. |
| Change country-centroid labels/dialog headings to `across [country]` | S | 0.5-1 day | Location-precision metadata or conservative category rules | Avoid promising more precision than data supplies. |
| Clamp/flip Minimal labels around viewport and UI safe areas | M | 2-4 days | Define safe-area boxes for header/HUD/nav/dialog | Collision changes may reduce label count; test rotations, drag, all sizes. |
| Resolve curated Singapore home overlap and centralize home totals | S | 1-2 days | Verified coordinates or explicit mixed-cluster decision; generated metadata | Do not silently jitter approximate points. |
| Fix single-marker accessible names and view-switcher state | S | 1-2 days | Shared a11y label rules | Keyboard order remains a separate density issue. |
| Add motion/visibility contract to Earth and retained map engines | M | 3-5 days | Retained renderer decision | Include elapsed-time rotation; current Earth speed depends on refresh rate. |
| Add landscape mobile shell | M | 2-4 days | Product decision on controls available in short landscape | Must test 667x375 and modern 844x390 hardware-equivalent view. |
| Gate mobile public modes and elevate Browse list | S | 1-2 days | Approve mobile product set | Preserve existing deep links with a clear fallback/redirect strategy. |
| Implement derived MarkerModel + unit tests | L | 7-10 days | Schema/policy approval; represented-count fix; location precision | Avoid an engine-shaped abstraction; keep Member as source record. |
| Migrate Minimal and Home to MarkerModel | M | 4-6 days | MarkerModel core | Lowest-risk proving ground before rich renderer migration. |
| Migrate chosen rich desktop globe to MarkerModel | L | 7-12 days | Desktop renderer choice; clustering policy | Visual regression risk is high; retain before/after evidence. |
| Migrate/replace flat vector map | L | 7-12 days | Mapbox vs MapLibre/SVG provider choice | Includes token, attribution, spotlight, and fallback decisions. |
| Validate/rebuild Hero and Builder coordinates | XL | 10-25 days | Authoritative location source or review process | Automated geocoding alone can introduce new errors; preserve provenance. |
| Split Mapbox/MapLibre modules and experiment chunks | M | 3-5 days | Renderer retention decision | Do after product pruning to avoid optimizing deleted code. |
| Add route/category/view regression harness | L | 7-12 days | Stable ready selectors and approved supported matrix | Include screenshot/overflow/image/count/a11y assertions. |
| Merge Global Infra concepts into Community Days | M | 4-6 days | Community Days desktop UX decision | Remove standalone experiment only after parity. |
| Archive/deep-link removed experiments and modes | S-M | 2-4 days | Portfolio/deep-link policy | Avoid breaking shared URLs without an intentional redirect/legacy page. |

## Three implementation packages

### Package 1 — Minimal cleanup

**Goal:** repair correctness and visible mobile defects without changing the renderer architecture.\
**Estimate:** **S-M, 5-8 developer-days**.

Scope:

1. Fix France/UK flag codes and add local fallbacks.
2. Fix Community Builder aggregate counts.
3. Use truthful country/city cluster copy.
4. Clamp Minimal labels and respect header/HUD/bottom-nav safe areas.
5. Reconcile `all records` versus `mapped records` wording/totals.
6. Fix Earth single-person accessible labels and switcher pressed state.
7. Resolve the home Singapore overlap and failed-image branch.
8. Add focused tests for flag mapping, represented counts, and label-copy rules.

What it does not solve:

- Earth/Atlas face walls and hundreds of DOM markers.
- Cross-country coordinate corruption.
- Seven-mode product complexity.
- Mapbox/MapLibre duplication and payload.

Shipping decision: acceptable as an immediate patch, but mobile Earth/Atlas/GeoLibre should still be hidden in the same release if scope approval allows.

### Package 2 — Recommended redesign

**Goal:** focus the product and implement the shared semantic layer before further globe polish.\
**Estimate:** **L, 16-24 developer-days**, plus any manual coordinate cleanup.

Scope:

1. Everything in Minimal cleanup.
2. Approve and implement MarkerModel, represented-count, precision, fallback, and action contracts.
3. Migrate Home and Minimal first.
4. Make mobile modes Home + Minimal + Gallery + Directory; keep Map only as an explicitly advanced temporary view.
5. Add short-landscape mobile navigation/layout.
6. Make Directory a persistent, named fallback.
7. After desktop QA, migrate only the winning rich desktop globe to aggregate badges/counts.
8. Reduce the desktop primary chooser to rich globe + Minimal + Directory + one detailed location view.
9. Move Country Mosaic to a clearly labelled lab; archive Hero Orbit/Event Reveal; plan Global Infra merge.
10. Add route-level browser checks for the supported matrix.

Dependencies:

- Desktop renderer decision.
- Approval of public mode removals and deep-link behavior.
- Category-level identity policy, especially leader portraits for Student Groups.
- Choice of local fallback assets.

Expected benefit: resolves the user's face-merging concern at the semantic source, removes the worst mobile modes, and cuts future QA breadth before expensive renderer work.

### Package 3 — Full consolidation

**Goal:** production-grade data integrity, one cross-renderer marker contract, one rich globe, one lightweight globe, one detailed map, and one accessible directory.\
**Estimate:** **XL, 35-55 developer-days**, potentially more if coordinate provenance is manual.

Scope:

1. Everything in Recommended redesign.
2. Build a versioned data-validation/generation pipeline with coordinate provenance, precision, country consistency, image health metadata, and generated totals.
3. Review/rebuild corrupted Hero/Builder locations and keep unverified records off person-level maps.
4. Migrate the winning rich globe and chosen flat/vector map fully to MarkerModel.
5. Remove redundant Earth/Atlas/Map/GeoLibre marker implementations after parity.
6. Split retained engines into separate lazy chunks; remove unused runtime/provider dependencies.
7. Merge Global Infra regional discovery into Community Days.
8. Establish automated screenshot, interaction, reduced-motion, broken-image, route-state, and WebGL-fallback coverage.
9. Add lightweight product telemetry for view/category usage before future mode expansion.

Dependencies:

- Authoritative data-source access and a policy for uncertain locations.
- Map provider decision, token budget, attribution compliance, and fallback choice.
- Stable visual design for badges/counts/detail expansion.
- Product owner approval to delete or archive duplicate modes.

Expected benefit: lowest long-term maintenance and clearest user story. Primary risk is migration breadth; phase by renderer and keep old deep links mapped until parity is verified.

## Recommended order of operations

1. Finish desktop QA and select the rich desktop globe plus one detailed map job.
2. Approve the core mode set and experiment disposition before optimizing bundles.
3. Ship Minimal cleanup, including mobile mode gating.
4. Implement MarkerModel and prove it in Home + Minimal.
5. Migrate the chosen desktop globe; compare before/after screenshots at the exact worst coordinate stacks.
6. Migrate or replace the detailed map.
7. Run data correction in parallel, but do not block honest aggregate/approximate markers on perfect geocoding.
8. Remove old renderers only after route, selection, spotlight, fallback, and accessibility parity.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Fewer public modes reduce the portfolio “wow” factor. | Preserve selected demonstrations under a clearly labelled lab or recorded case study; focus the product chooser on user jobs. |
| Badge/count clusters feel less personal than faces. | Use portraits immediately after selection/expansion and in Gallery/Directory, where identity is legible. |
| A shared model becomes a lowest-common-denominator abstraction. | Keep engine-specific geometry in adapters; share semantics, counts, actions, fallback, a11y, and precision only. |
| Coordinate cleanup changes public totals or removes people from the map. | Separate directory totals from mapped totals and explain the distinction; do not remove records from Directory. |
| Provider consolidation breaks Student spotlights. | Treat spotlight parity as a release gate; Atlas may remain an internal specialized renderer. |
| Deep links to removed modes break. | Canonicalize to the nearest supported view and optionally retain `/lab` legacy routes. |
| Label clamping hides too much data. | Prioritize selected/closest/unique markers; Directory remains the exhaustive path. |
| Remote avatar/flag outages still leak through. | Make the final fallback local and test `onerror`/unavailable responses. |
| Full-data Builder Gallery remains expensive. | Retain summary for geography, paginate/virtualize visual browse, and lazy-load full records only on explicit browse intent. |

## Decisions needed from the product owner

These can be decided now:

1. Approve **Minimal + Gallery + Directory** as the supported mobile in-app views, with Earth/Atlas/GeoLibre hidden and Map temporarily advanced.
2. Approve **no overlapping faces for aggregates or groups**; person portraits belong to single verified people and expanded details.
3. Approve truthful `mapped`, `approximate`, `across country`, and `unmapped` language even when it exposes data limitations.
4. Approve Directory as the persistent accessibility/fallback action.
5. Approve Country Mosaic as the main retained lab idea; archive Hero Orbit and Event Reveal; merge Global Infra into Community Days.

These should wait for desktop QA:

6. Choose Earth or Atlas as the rich desktop default.
7. Decide whether Atlas remains internally for Student country spotlights.
8. Choose Mapbox, MapLibre, or the SVG path for the single detailed/flat location experience.
9. Decide whether Gallery is a desktop primary action or a secondary browse experience.
10. Confirm whether the desktop home globe's richer `globe.gl` cost is worth keeping versus a shared lightweight home renderer.

## Draft recommendation

Unless desktop QA contradicts the rich-renderer comparison, choose **Package 2 — Recommended redesign**. Package 1 is useful as an immediate correctness patch but knowingly preserves duplicated marker systems. Package 3 is the cleanest destination, yet its data-repair and provider-migration scope should be split into follow-on phases after MarkerModel proves itself in Home and Minimal.
