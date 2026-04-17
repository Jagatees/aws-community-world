# Kiro Specs-First Evidence (Slide Screenshot)

## 1) Design Spec Snapshot
**File:** `.kiro/specs/aws-community-globe/design.md`

- Defines project **Overview** and scope before coding
- Documents **Architecture** (App, TabNav, GlobeScene, ProfileCard, DataLayer)
- Lists component responsibilities and interfaces
- Defines data model (`CategoryKey`, `Member`)
- Captures error handling and testing strategy

```md
## Architecture
App --> Header
App --> TabNav
App --> GlobeScene
App --> ProfileCard

DataLayer --> HeroesData
DataLayer --> BuildersData
DataLayer --> UserGroupsData
DataLayer --> CloudClubsData
```

## 2) Task Plan Snapshot
**File:** `.kiro/specs/aws-community-globe/tasks.md`

- Build broken into milestones (scaffold, data, UI, globe, interactions, integration, tests)
- Clear done/not-done state with checkboxes
- Requirements mapped per task for traceability

```md
- [x] 5.2 Implement auto-rotation with idle detection
- [x] 5.4 Implement marker clustering for co-located members
- [x] 7. Wire everything together in App
- [ ] 8.1 Write unit tests for useCategory hook
```

## 3) One-Line Talk Track (Use on Slide)
"I used a Specs-First Kiro workflow: first I locked architecture and requirements in `design.md`, then executed phased delivery in `tasks.md` with traceable progress."

## 4) Screenshot Tip
Open this file in VS Code preview and capture the top half (sections 1 + 2) for your deck.
