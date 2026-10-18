import assert from 'node:assert/strict';
import { calendarDateKey, calendarEntries, eventCalendarSpan, eventsOnCalendarDay, monthCalendarDays, shiftCalendarMonth, validCalendarMonth } from '../src/utils/eventCalendarView.js';

assert.equal(calendarDateKey('2026-10-16T20:00:00Z', 'Asia/Singapore'), '2026-10-17');
assert.equal(calendarDateKey('2026-10-17T01:00:00Z', 'America/Lima'), '2026-10-16');
assert.equal(calendarDateKey('bad-date', 'UTC'), null);
assert.equal(validCalendarMonth('2026-13'), false);
assert.equal(validCalendarMonth('2026-02'), true);
assert.equal(validCalendarMonth('garbage'), false);
assert.equal(shiftCalendarMonth('2026-12', 1), '2027-01');
assert.equal(shiftCalendarMonth('2027-01', -1), '2026-12');
const october = monthCalendarDays('2026-10');
assert.equal(october[0], '2026-09-28');
assert.equal(october.at(-1), '2026-11-01');
assert.equal(october.length, 35);
assert.ok(monthCalendarDays('2028-02').includes('2028-02-29'));
assert.ok(!monthCalendarDays('2027-02').includes('2027-02-29'));

const timed = { id: 'timed', name: 'Overnight', startsAt: '2026-10-16T15:30:00Z', endsAt: '2026-10-16T16:30:00Z' };
assert.deepEqual(eventCalendarSpan(timed, 'Asia/Singapore'), { start: '2026-10-16', end: '2026-10-17', allDay: false });
assert.deepEqual(eventCalendarSpan({ ...timed, endsAt: '2026-10-16T16:00:00Z' }, 'Asia/Singapore'), { start: '2026-10-16', end: '2026-10-16', allDay: false });
const allDay = { id: 'all-day', name: 'Conference', date: '2026-12-31', endDate: '2027-01-02' };
assert.deepEqual(eventCalendarSpan(allDay, 'America/Los_Angeles'), { start: '2026-12-31', end: '2027-01-02', allDay: true });
const kiro = { id: 'kiro', name: 'All-day Kiro', calendarAllDay: true, startsAt: '2027-01-07T00:00:00Z', endsAt: '2027-01-09T23:59:59Z' };
assert.deepEqual(eventCalendarSpan(kiro, 'Asia/Singapore'), { start: '2027-01-07', end: '2027-01-09', allDay: true });
assert.equal(eventCalendarSpan({ date: '2026-02-30' }, 'UTC'), null);
assert.equal(eventCalendarSpan({ ...timed, endsAt: '2026-10-01T00:00:00Z' }, 'UTC'), null);
const entries = calendarEntries([timed, allDay, kiro, { id: 'invalid', startsAt: '' }], 'Asia/Singapore');
assert.equal(entries.length, 3);
assert.equal(eventsOnCalendarDay(entries, '2026-10-17')[0].event.id, 'timed');
assert.equal(eventsOnCalendarDay(entries, '2027-01-01')[0].event.id, 'all-day');
assert.equal(eventsOnCalendarDay(entries, '2027-01-03').length, 0);
// Fall-back DST repeats an hour but still belongs to one local day.
assert.deepEqual(eventCalendarSpan({ startsAt: '2026-11-01T05:30:00Z', endsAt: '2026-11-01T06:30:00Z' }, 'America/New_York'), { start: '2026-11-01', end: '2026-11-01', allDay: false });
console.log('Calendar date boundaries, timezone conversion, leap years, multi-day events, midnight ends, and DST passed.');
