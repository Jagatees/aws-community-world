import assert from 'node:assert/strict';
import { parseDateLine, parseItems } from './update-kiro-events.mjs';

const cases = [
  ['Nov 16, 2026–Jan 17, 2027 UTC', '2026-11-16T00:00:00.000Z', '2027-01-17T23:59:59.000Z', true],
  ['Dec 31, 2026 - Jan 1, 2027', '2026-12-31T00:00:00.000Z', '2027-01-01T23:59:59.000Z', true],
  ['Dec 31, 2026–Jan 1, 2027 10:00 PM-1:00 AM UTC', '2026-12-31T22:00:00.000Z', '2027-01-01T01:00:59.000Z', false],
  ['Nov 11, 2026 6:00 PM-7:00 PM UTC', '2026-11-11T18:00:00.000Z', '2026-11-11T19:00:59.000Z', false],
  ['Nov 14, 2026 9:00 AM-2:00 PM', '2026-11-14T09:00:00.000Z', '2026-11-14T14:00:59.000Z', false],
  ['Nov 16, 2026 5:30 PM UTC', '2026-11-16T17:30:00.000Z', '2026-11-16T23:59:59.000Z', false],
  ['Oct 30–Dec 4, 2026 UTC', '2026-10-30T00:00:00.000Z', '2026-12-04T23:59:59.000Z', true],
  ['Nov 30–Dec 4, 2026', '2026-11-30T00:00:00.000Z', '2026-12-04T23:59:59.000Z', true],
  ['Jan 7–9, 2027', '2027-01-07T00:00:00.000Z', '2027-01-09T23:59:59.000Z', true],
  ['Jan 7-9, 2027', '2027-01-07T00:00:00.000Z', '2027-01-09T23:59:59.000Z', true],
  ['Nov 16, 2026', '2026-11-16T00:00:00.000Z', '2026-11-16T23:59:59.000Z', true],
  ['  Nov  16, 2026–Jan 17, 2027  UTC  ', '2026-11-16T00:00:00.000Z', '2027-01-17T23:59:59.000Z', true],
];
for (const [input, startsAt, endsAt, dateOnly] of cases) {
  assert.deepEqual(parseDateLine(input, 2030), {
    startsAt, endsAt, endDateKey: endsAt.slice(0, 10), dateOnly,
  }, input);
}

// Regression fixture: the description that stopped the 2026-11-07 refresh.
const [item] = parseItems(`<rss><channel><item>
  <title>Cross-year programme</title><link>https://example.com/event</link>
  <description><![CDATA[Nov 16, 2026–Jan 17, 2027 UTC

A hands-on programme.]]></description>
</item></channel></rss>`);
assert.equal(item.summary, 'A hands-on programme.');
const { endDateKey, dateOnly } = parseDateLine(item.dateLine, 2026);
assert.equal(dateOnly, true);
assert.ok(endDateKey >= '2027-01-17', 'Keep the event through its final local date');
assert.ok(endDateKey < '2027-01-18', 'Expire the event after its final local date');
assert.throws(() => parseDateLine('Date to be announced', 2026), /Existing data was preserved/);
assert.throws(() => parseDateLine('Nov 16, 2026–Jan 17', 2026), /Existing data was preserved/);
console.log(`Passed ${cases.length} Kiro date cases, RSS extraction, expiry, and malformed-date checks.`);
