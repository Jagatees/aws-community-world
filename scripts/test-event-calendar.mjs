import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEventCalendar } from '../src/utils/eventCalendar.js';
import { buildSubmissionUrl } from '../src/utils/communitySubmission.js';

test('all-day multi-day event uses exclusive end across a year boundary', () => {
  const ics = createEventCalendar({ name: 'Community Day', category: 'community-days', date: '2026-12-31', endDate: '2027-01-02' });
  assert.match(ics, /DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270103/);
});
test('timed events preserve absolute instants and escape/fold UTF-8 safely', () => {
  const name = 'Singapore, builders; ' + '🌏'.repeat(60) + '\nEND:VEVENT';
  const ics = createEventCalendar({ name, startsAt: '2026-10-01T18:00:00+08:00', endsAt: '2026-10-01T19:30:00+08:00', category: 'kiro-events' });
  assert.match(ics, /DTSTART:20261001T100000Z/);
  assert.match(ics, /DTEND:20261001T113000Z/);
  assert.equal(ics.split('\r\n').filter(line => line === 'END:VEVENT').length, 1);
  assert.ok(ics.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
  assert.ok(ics.replaceAll('\r\n ', '').includes('Singapore\\, builders\\;'));
  assert.equal(createEventCalendar({ name: 'Unknown date' }), null);
});
test('submission drafts preserve text and reject non-web source links', () => {
  const fields = { kind: 'event', name: 'Builders & friends', category: 'Kiro Event', location: 'Online', source: 'https://kiro.dev/events/', notes: 'A\nB' };
  const url = new URL(buildSubmissionUrl(fields));
  assert.equal(url.origin, 'https://github.com');
  assert.equal(url.searchParams.get('title'), '[Missing event] Builders & friends');
  assert.match(url.searchParams.get('body'), /A\nB/);
  assert.throws(() => buildSubmissionUrl({ ...fields, source: 'javascript:alert(1)' }));
});
