import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEventCalendar } from '../src/utils/eventCalendar.js';
import { buildSubmissionUrl } from '../src/utils/communitySubmission.js';
import { getEventStatus, isUpcomingEvent, matchesEventStatus } from '../src/utils/upcomingEvents.js';

test('event filters distinguish ended, ongoing, future and undated entries', () => {
  const now = new Date(2026, 8, 11, 23, 59, 59);
  const past = { date: '2026-09-10' };
  const ongoing = { date: '2026-09-10', endDate: '2026-09-11' };
  const future = { date: '2026-09-12' };
  for (const event of [past, ongoing, future, {}]) assert.equal(matchesEventStatus(event, 'all', now), true);
  assert.equal(matchesEventStatus(past, 'ended', now), true);
  assert.equal(matchesEventStatus(past, 'upcoming', now), false);
  assert.equal(matchesEventStatus(ongoing, 'upcoming', now), false);
  assert.equal(matchesEventStatus(ongoing, 'today', now), true);
  assert.equal(matchesEventStatus(ongoing, 'ended', now), false);
  assert.equal(matchesEventStatus(future, 'upcoming', now), true);
  assert.equal(matchesEventStatus({}, 'ended', now), false);
  assert.equal(matchesEventStatus({}, 'upcoming', now), false);
  assert.equal(matchesEventStatus({}, 'today', now), false);
  assert.equal(matchesEventStatus(ongoing, 'ended', new Date(2026, 8, 12)), true);
});

test('Today and Upcoming use the calendar viewer time zone', () => {
  const now = new Date('2026-10-16T16:30:00Z');
  const event = { startsAt: '2026-10-17T07:30:00Z', endsAt: '2026-10-17T09:00:00Z' };
  assert.equal(getEventStatus(event, now, 'Asia/Singapore'), 'today');
  assert.equal(getEventStatus(event, now, 'America/Los_Angeles'), 'upcoming');
  assert.equal(getEventStatus(event, new Date(event.endsAt), 'Asia/Singapore'), 'ended');
  assert.equal(getEventStatus({ startsAt: '2026-10-18T00:00:00+08:00', endsAt: '2026-10-18T01:00:00+08:00' }, now, 'Asia/Singapore'), 'upcoming');
});

test('overnight and multi-day events stay in Today until they end', () => {
  const event = { startsAt: '2026-10-16T22:00:00+08:00', endsAt: '2026-10-17T02:00:00+08:00' };
  assert.equal(getEventStatus(event, new Date('2026-10-17T01:00:00+08:00'), 'Asia/Singapore'), 'today');
  assert.equal(getEventStatus(event, new Date('2026-10-17T02:00:00+08:00'), 'Asia/Singapore'), 'ended');
  const multiDay = { date: '2026-10-16', endDate: '2026-10-18' };
  assert.equal(getEventStatus(multiDay, new Date('2026-10-18T23:59:59+08:00'), 'Asia/Singapore'), 'today');
  assert.equal(getEventStatus(multiDay, new Date('2026-10-19T00:00:00+08:00'), 'Asia/Singapore'), 'ended');
});

test('status handles DST, exclusive midnight endings, and invalid dates', () => {
  const event = { startsAt: '2026-11-01T06:15:00Z', endsAt: '2026-11-01T07:00:00Z' };
  assert.equal(getEventStatus(event, new Date('2026-11-01T05:30:00Z'), 'America/New_York'), 'today');
  const midnightEnd = { startsAt: '2026-10-16T22:00:00+08:00', endsAt: '2026-10-17T00:00:00+08:00' };
  assert.equal(getEventStatus(midnightEnd, new Date('2026-10-17T00:00:00+08:00'), 'Asia/Singapore'), 'ended');
  for (const bad of [{}, { date: '2026-02-30' }, { startsAt: 'invalid' }, { startsAt: '2026-10-18T00:00:00Z', endsAt: '2026-10-17T00:00:00Z' }]) {
    assert.equal(getEventStatus(bad), null);
    assert.equal(matchesEventStatus(bad, 'all'), true);
  }
});

test('homepage counts keep ongoing all-day events and exclude past or undated events', () => {
  const now = new Date(2026, 8, 11, 17, 30);
  assert.equal(isUpcomingEvent({ date: '2026-09-10' }, now), false);
  assert.equal(isUpcomingEvent({ date: '2026-09-11' }, now), true);
  assert.equal(isUpcomingEvent({ date: '2026-09-10', endDate: '2026-09-12' }, now), true);
  assert.equal(isUpcomingEvent({ startsAt: '2026-09-11T00:00:00Z', calendarAllDay: true }, now), true);
  assert.equal(isUpcomingEvent({}, now), false);
  assert.equal(isUpcomingEvent({ date: 'unknown' }, now), false);
});

test('homepage timed events expire at the published end instant', () => {
  const event = { startsAt: '2026-09-11T09:00:00+08:00', endsAt: '2026-09-11T10:00:00+08:00' };
  assert.equal(isUpcomingEvent(event, new Date('2026-09-11T01:30:00Z')), true);
  assert.equal(isUpcomingEvent(event, new Date('2026-09-11T02:00:01Z')), false);
  assert.equal(isUpcomingEvent({ startsAt: 'invalid' }), false);
});

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
