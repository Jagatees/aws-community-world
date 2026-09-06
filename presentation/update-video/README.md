# AWS Globe September update video

72-second landscape video, 1920 × 1080, 30 fps. Captions are part of the video. It includes a quiet original procedural instrumental and no voiceover.

Latest shared video: `../exports/aws-globe-new-update.mp4`. The render command regenerates `aws-globe-update-v3.mp4`.

## Contents

- 00:00 — Introduction
- 00:05 — Mobile home, before and after
- 00:13 — Mobile globe markers and contribution control, before and after
- 00:20 — Grouped globe markers and zoom
- 00:28 — Redesigned Insights
- 00:36 — AWS Builder Lofts
- 00:43 — Expanded Kiro Ambassador directory
- 00:48 — Calendar downloads and RSS refresh configuration
- 00:55 — Missing-profile and event suggestions
- 01:02 — Mobile exploration and responsive Insights
- 01:07 — Closing card

## Capture provenance

Inside-the-globe before: commit `a88f832` (6 July 2026). Home-screen before: commit `971b5a2` (24 August 2026). Both were exported into an isolated temporary directory. Current: local working tree on 6 September 2026, including unpublished changes. Both mobile versions were captured at 390 × 844. Desktop captures are 1440 × 900. Browser chrome is excluded. Most captures use the app's supported reduced-motion preference for legible controls; home recordings enable rotation. Version 2 uses moving phone captures, scrolling, menus, form interactions, and frame-based camera movement. Directory totals can differ between versions; the comparison concerns layout, not member growth.

The video accurately distinguishes the open San Francisco Loft from the three announced cities. Calendar buttons download ICS files. The submission form prepares a GitHub issue for the visitor to review and submit. Daily RSS automation is configured locally and only activates after the workflow is published. No quantitative performance improvement is claimed.

## Edit and render

Run `npm ci` here, then `npm run render`. If Remotion needs a browser, supply its `--browser-executable` option with your installed Chrome executable. The original render used Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` and `--concurrency=4 --crf=18 --codec=h264`.

Source: `src/index.tsx`. Screens and clips: `public/`. `make-audio.mjs` regenerates the original soundtrack without third-party samples. The title animation is copied from the remocn registry: https://remocn.dev/docs/typography/mask-reveal-up and https://remocn.dev/r/mask-reveal-up.json.

Verification: inspect exported frames across the complete timeline, validate MP4 video/audio streams and duration with FFmpeg, and decode the final file for errors.




## Version 3
All new-feature sections use action recordings: zoom and drag the globe; change Insights month, dataset and region; switch Loft cities; open an ambassador profile; open an event and download its ICS; and type into the suggestion form. Phone Insights scrolls through the page. The old July and August comparisons use still images. The orange pointer and calendar-download confirmation are recording annotations; the download message is shown only after an actual successful download. Example form text is illustrative and was not submitted. Initial loading frames were trimmed, and action recordings were retimed to fit their scenes.
