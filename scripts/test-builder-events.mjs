import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fetchEvents, normalizeEvent, validCoordinates } from './update-builder-events.mjs';
import { matchesBuilderEventFilters, readEventFilters, sortBuilderEvents } from '../src/utils/builderEvents.js';
import { isUpcomingEvent } from '../src/utils/upcomingEvents.js';
import { createEventCalendar } from '../src/utils/eventCalendar.js';

const fixture = {
  eventId: 'test-event', title: 'Cloud event', eventCategory: 'EVENT', status: 'PUBLISHED', privacy: 'PUBLIC', eventType: 'IN_PERSON',
  startTime: Date.parse('2026-10-17T01:00:00Z'), endTime: Date.parse('2026-10-17T12:00:00Z'), timezone: 'Asia/Shanghai',
  location: { addressDetails: { city: 'Shenzhen', state: 'Guangdong', country: 'CN', addressVisibility: 'REGISTERED_ONLY',
    streetAddress: 'attendee-only address', geoPosition: { latitude: 22.5, longitude: 114 } }, meetingUrl: 'https://private.example/meeting' },
  organizerId: 'internal-id', tag: 'agentic-ai',
};
const event = normalizeEvent(fixture, { lat: 22.54, lng: 114.06, coordinatePrecision: 'city' });
assert.equal(event.country, 'China');
assert.equal(event.lat, 22.54, 'Attendee-only coordinates must not be used');
assert.match(event.eventDate, /9:00/);
assert.match(event.eventDate, /Asia\/Shanghai/);
assert.equal(event.startsAt, '2026-10-17T01:00:00.000Z');
assert.ok(!JSON.stringify(event).includes('attendee-only') && !JSON.stringify(event).includes('private.example') && !JSON.stringify(event).includes('internal-id'));
assert.equal(normalizeEvent({ ...fixture, privacy: 'PRIVATE' }).access, 'Approval required');
const online = normalizeEvent({ ...fixture, eventType: 'VIRTUAL' }, { lat: 12, lng: 77 });
assert.equal(online.lat, 0);
assert.equal(online.country, '');
assert.equal(online.location, 'Online');
const unknown = normalizeEvent({ ...fixture, location: {} });
assert.equal(unknown.location, 'Location TBA');
assert.equal(unknown.coordinatePrecision, null);
const publicVenue = structuredClone(fixture);
publicVenue.location.addressDetails.addressVisibility = 'PUBLIC';
assert.equal(normalizeEvent(publicVenue).coordinatePrecision, 'venue');
assert.throws(() => normalizeEvent({ ...fixture, endTime: 0 }), /Invalid/);
assert.throws(() => normalizeEvent({ ...fixture, startTime: null }), /Invalid/);
assert.equal(isUpcomingEvent(event, new Date('2026-10-17T11:59:00Z')), true);
assert.equal(isUpcomingEvent(event, new Date('2026-10-17T12:01:00Z')), false);
assert.match(createEventCalendar(event), /DTSTART:20261017T010000Z/);

// A DynamoDB-style filtered page can be empty and still have more results.
const pages = [
  { entityInfoWithMetadataList: [], nextToken: 'next-1' },
  { entityInfoWithMetadataList: [fixture], nextToken: 'next-2' },
  { entityInfoWithMetadataList: [fixture, { ...fixture, eventId: 'invite', privacy: 'INVITE_ONLY' }] },
];
const requests = [];
const fetched = await fetchEvents(async url => {
  requests.push(url);
  return { ok: true, json: async () => pages.shift() };
});
assert.equal(fetched.length, 1);
assert.equal(requests[1].searchParams.get('nextToken'), 'next-1');
assert.equal(requests[2].searchParams.get('nextToken'), 'next-2');
await assert.rejects(fetchEvents(async () => ({ ok: true, json: async () => ({ entityInfoWithMetadataList: [], nextToken: 'repeated' }) })), /Repeated/);
await assert.rejects(fetchEvents(async () => ({ ok: false, status: 503 })), /503/);
await assert.rejects(fetchEvents(async () => ({ ok: true, json: async () => ({ error: 'bad schema' }) })), /Unrecognized/);

const events = JSON.parse(await readFile(new URL('../src/data/builder-events.json', import.meta.url)));
assert.ok(events.length > 0);
assert.equal(new Set(events.map(e => e.id)).size, events.length);
for (const item of events) {
  assert.ok(item.name && item.sourceUrl.startsWith('https://builder.aws.com/connect/event/'));
  assert.ok(Date.parse(item.endsAt) >= Date.parse(item.startsAt));
  assert.ok(item.eventFormat === 'Online' ? item.lat === 0 && item.lng === 0 : !item.coordinatePrecision || validCoordinates(item.lat, item.lng));
}
const filters = readEventFilters(new URLSearchParams('format=Online&sort=latest'));
assert.equal(events.filter(e => matchesBuilderEventFilters(e, filters)).length, events.filter(e => e.eventFormat === 'Online').length);
const sorted = sortBuilderEvents(events, 'latest');
assert.ok(sorted.every((e, i) => i === 0 || e.startsAt <= sorted[i - 1].startsAt));
assert.deepEqual(readEventFilters(new URLSearchParams('format=bogus&sort=bogus')), { format: 'all', city: '', sort: 'soonest' });
console.log(`Passed import pagination, failure handling, visibility, timezone/calendar, filtering, and ${events.length} saved event checks.`);
