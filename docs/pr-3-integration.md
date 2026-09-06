# PR #3 integration audit

Audited on 6 September 2026 against main `704d5ac` and PR head `d5a2128`.

The UI contribution was adapted into main in `49ccac1`, with Pamuda Uposath De Alwis Goonatilake credited as co-author. This includes Student Builder Group labels, the 0.6–3 Minimal zoom range, archive leader avatars and profile/social links, scrubber and position indicator, navigation, title casing, and scoped scrollbar styles. Re-merging the older branch would reintroduce superseded data and UI code.

The missing ITUM group was dropped by the September directory refresh. Its Meetup group remains available, and the leader's website still identifies his ITUM role:

- https://www.meetup.com/aws-sbg-at-itum/
- https://www.naamiahmed.dev/

Restored the contribution's record, leader links, and coordinates (6.808281, 79.993129), including its Sri Lanka spotlight entry. The current dataset now includes all 11 contributed Sri Lanka locations; some current directory names and IDs differ from the older PR.

`src/data/student-builder-group-additions.json` explicitly records this verified supplement and its verification date. The refresh script includes it when absent upstream. A returning upstream entry takes precedence, matching by normalized Meetup URL to avoid duplicates. Upstream completeness is checked before additions are applied. Remove or update the supplement if a later source check establishes that the group has closed or moved.

GeoLibre files are optional generated local exports under `tmp/geolibre`, not runtime assets. Keep the current generator and regenerate exports from the corrected source data instead of checking in the PR's obsolete generated file. The PR's actual globe patch changes labels and zoom limits; it does not implement a hard-coded single 11-group marker. Current coordinate-accurate marker behavior is retained.

Validation:

- `node --test scripts/test-student-group-additions.mjs`
- `npm run lint`
- `npm run build`
- Run the production preview on port 4183, then `node scripts/test-pr3-ui.mjs`: desktop/mobile directory, 11 groups, restored record, archive search, leader/social links, keyboard scrubber, previous/next controls and Minimal canvas; no runtime errors.
