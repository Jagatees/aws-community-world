# Feeds, calendars, and community suggestions

## Daily refresh

The existing `.github/workflows/update-builder-news.yml` now runs as **Update Community Feeds**, daily at 01:00 UTC / 09:00 Singapore time, with manual dispatch available. It refreshes Builder News, Kiro RSS, and growth history, validates a production build, and commits changed data only. Full git history is fetched so rebuilding Insights does not erase older observations. Concurrent runs are serialized.

The schedule becomes active when the workflow is on the default branch and GitHub Actions is enabled. No remote workflow or deployment was triggered from this local task. GitHub schedules can be delayed; the displayed site receives changes through the repository's configured deployment pipeline.

The first local refresh found four upcoming Kiro events. RSS response/date validation protects the saved data against malformed feeds. Country/city inference for newly encountered event formats should still be reviewed.

## Add to Calendar

Kiro event profiles, Kiro/Community Day directory listings, and Insights event listings offer `.ics` downloads. Timed events preserve UTC instants. Date-only events use all-day entries, and multi-day events use the iCalendar exclusive end date. When Kiro does not supply a timezone, the calendar entry conservatively uses the published date rather than inventing a timezone. Original schedule text and the official event URL remain in the description.

Calendar export uses no third-party service or calendar-account permission. Users import the downloaded file into their calendar; this is not a live calendar subscription.

## Missing profiles and events

The header's **＋ Suggest** button (＋ on mobile) opens an accessible form for a profile/group or event, its category, public source URL, location, date, and optional notes. **Review on GitHub** opens a prefilled public issue in `Jagatees/aws-community-world`. The user must sign in and explicitly submit on GitHub. The site does not claim a suggestion was sent or automatically add unverified entries.

GitHub Issues was confirmed enabled for the repository. The form uses no API token, private contact details, or new backend.

## Verification

`node --test scripts/test-event-calendar.mjs` covers timed/all-day exports, year boundaries, escaping, UTF-8 folding, and submission URL encoding. Browser QA covers downloads, event profiles, both event categories, Insights, mobile form scrolling, GitHub draft handoff, and Escape dismissal. Test GitHub navigation is intercepted; no test issue is posted.
