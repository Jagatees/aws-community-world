# Kiro Ambassador additions

Verified against publicly available professional profiles and first-party statements on 6 September 2026. Five additions bring the local directory from two to seven records. This is a sourced community directory, not a claim to represent the complete official roster.

| Person | Map location | Ambassador evidence | Location evidence |
| --- | --- | --- | --- |
| Asad Mohiuddin | United Kingdom; approximate country pin | [Official Kiro introduction](https://kiro.dev/blog/introducing-kiro-ambassadors/) and [personal announcement](https://www.linkedin.com/posts/asadmohiuddin99_kiro-ai-aws-activity-7458273008609026048-EQXS) | [Professional profile](https://uk.linkedin.com/in/asadmohiuddin99) |
| Gilang Ilsan Tama Lubis | South Tangerang, Indonesia; approximate city pin | [Professional profile and announcement](https://id.linkedin.com/in/gilang-ilsan-tama-lubis-39a24a122) | Same profile lists Tangerang Selatan, Banten, Indonesia |
| Sergio Dennis Rodríguez Inclán | Bolivia; approximate country pin | [Personal announcement](https://www.linkedin.com/posts/srinclan_buildwithkiro-kiroambassador-aws-activity-7485706754438189056-a4GV) | Same announcement identifies his local community in Bolivia; no city asserted |
| Alejandro Lázaro Chueca | Zaragoza, Spain; approximate city pin | [Personal website](https://www.playingaws.com/about/) | [Professional profile](https://es.linkedin.com/in/alejandro-lazaro-chueca) |
| Ricardo Gulias | São Paulo, Brazil; approximate city pin | [Author bio on AWS Builder Center](https://builder.aws.com/content/3D6DxKr47HkYZkCY7d2efzYTu1B/no-more-surprise-bills-what-cloudfronts-flatrate-pricing-really-changes) | [Professional profile](https://br.linkedin.com/in/gulias) |

Some LinkedIn direct fetches returned 429/999; their public search-indexed profile text supplied the cited evidence. Likes, comments, applications, and reposts alone were not treated as ambassador acceptance. Existing Eric and James records were retained. Alejandro's existing Builder directory avatar was reused; no portraits were invented.

Each addition retains `sourceUrl`, `locationSourceUrl`, `coordinatePrecision`, and `verifiedAt` in `src/data/kiro-ambassadors.json`. Individual profile cards display an evidence link and approximate location note.

## Kiro Events refresh audit

`scripts/update-kiro-events.mjs` reads `https://kiro.dev/events/feed.rss`, filters expired events and writes the local JSON. `npm run update:kiro-events` also rebuilds growth history. The browser loads that saved JSON rather than polling RSS.

The feed returned HTTP 200 with five items and `lastBuildDate` 4 September 2026 17:38:28 GMT when checked. No Kiro refresh workflow was found in `.github/workflows`; the existing daily workflow only updates Builder News. This audit did not add a scheduler or rewrite event history.
