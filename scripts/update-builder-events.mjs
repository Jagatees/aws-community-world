import { readFile, writeFile, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const EVENTS_API = 'https://api.builder.aws.com/sms/entities';
const outputPath = new URL('../src/data/builder-events.json', import.meta.url);
const cachePath = new URL('./.builder-events-geo-cache.json', import.meta.url);
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const formats = { IN_PERSON: 'In person', VIRTUAL: 'Online', HYBRID: 'Hybrid' };
const userAgent = 'aws-community-world/1.0 (https://github.com/Jagatees/aws-community-world)';

export function validCoordinates(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0);
}

function plainText(value = '') {
  return String(value).replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)')
    .replace(/<[^>]*>/g, '').replace(/\*\*|__/g, '').replace(/^#{1,6}\s+/gm, '').replace(/\\([&*_])/g, '$1').trim();
}

export function normalizeEvent(event, coordinates = {}, checkedAt = new Date().toISOString()) {
  if (!event.eventId || !event.title?.trim() || !formats[event.eventType] || !Number.isFinite(event.startTime) || !Number.isFinite(event.endTime) || event.endTime < event.startTime) {
    throw new Error(`Invalid Builder Center event: ${event.eventId || 'missing ID'}. Existing data preserved.`);
  }
  const online = event.eventType === 'VIRTUAL';
  const address = online ? {} : event.location?.addressDetails ?? {};
  const country = /^[A-Z]{2}$/.test(address.country || '') ? countryNames.of(address.country) : '';
  const city = address.city?.trim() || '';
  // Never retain attendee-only addresses, meeting links, or organizer IDs.
  const publishedPosition = address.addressVisibility === 'PUBLIC' ? address.geoPosition : null;
  const coords = publishedPosition && validCoordinates(publishedPosition.latitude, publishedPosition.longitude)
    ? { lat: publishedPosition.latitude, lng: publishedPosition.longitude, coordinatePrecision: 'venue', coordinateSource: 'AWS Builder Center' }
    : coordinates;
  const mapped = !online && validCoordinates(coords.lat, coords.lng);
  const timeZone = event.timezone || 'UTC';
  const formatter = new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short', timeZone });
  const sourceUrl = `https://builder.aws.com/connect/event/${encodeURIComponent(event.eventId)}`;
  return {
    id: `builder-event-${event.eventId}`, name: event.title.trim().replace(/\s+/g, ' '), category: 'builder-events',
    avatarUrl: /^https:\/\//.test(event.coverImageUrl || '') ? event.coverImageUrl : '',
    profileUrl: sourceUrl, sourceUrl, sourceLabel: 'AWS Builder Center',
    description: plainText(event.description),
    startsAt: new Date(event.startTime).toISOString(), endsAt: new Date(event.endTime).toISOString(), timeZone,
    eventDate: `${formatter.formatRange(new Date(event.startTime), new Date(event.endTime))} (${timeZone})`,
    eventFormat: formats[event.eventType], tag: event.tag || '', tags: event.tag ? [event.tag] : [],
    country, countryCode: address.country || '', city,
    location: online ? 'Online' : [city, address.state, country].filter(Boolean).join(', ') || 'Location TBA',
    lat: mapped ? coords.lat : 0, lng: mapped ? coords.lng : 0,
    coordinatePrecision: mapped ? coords.coordinatePrecision || 'city' : null,
    coordinateSource: mapped ? coords.coordinateSource || 'OpenStreetMap / Nominatim' : null,
    access: event.privacy === 'PRIVATE' ? 'Approval required' : 'Public',
    ctaLabel: 'View event', organizerAlias: event.organizerAlias || '',
    registrationCount: event.registrationCount ?? 0, isLoftEvent: Boolean(event.isLoftEvent), verifiedAt: checkedAt,
  };
}

export async function fetchEvents(fetchImpl = fetch) {
  const events = new Map();
  const tokens = new Set();
  let nextToken;
  for (let page = 0; page < 100; page++) {
    const url = new URL(EVENTS_API);
    url.search = new URLSearchParams({ eventCategory: 'EVENT', eventStatus: 'PUBLISHED', pageSize: '100', ...(nextToken ? { nextToken } : {}) });
    const response = await fetchImpl(url, { headers: { accept: 'application/json', 'User-Agent': userAgent }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Builder Center returned HTTP ${response.status}; existing data preserved.`);
    const payload = await response.json();
    if (!Array.isArray(payload.entityInfoWithMetadataList)) throw new Error('Unrecognized event response; existing data preserved.');
    for (const event of payload.entityInfoWithMetadataList) {
      if (event.status !== 'PUBLISHED' || event.eventCategory !== 'EVENT' || !['PUBLIC', 'PRIVATE'].includes(event.privacy)) continue;
      if (!event.eventId) throw new Error('Missing event ID; existing data preserved.');
      events.set(event.eventId, event);
    }
    nextToken = payload.nextToken;
    if (!nextToken) return [...events.values()];
    if (tokens.has(nextToken)) throw new Error('Repeated event pagination token; existing data preserved.');
    tokens.add(nextToken);
  }
  throw new Error('Event pagination limit reached; existing data preserved.');
}

async function readJson(url, fallback) {
  try { return JSON.parse(await readFile(url, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

async function main() {
  const events = await fetchEvents();
  if (!events.length) throw new Error('Empty event feed; existing data preserved.');
  const previous = await readJson(outputPath, []);
  if (events.length < previous.length / 2 && !process.argv.includes('--allow-large-removal')) throw new Error('Feed shrank by over half. Review the source before using --allow-large-removal.');
  const cache = await readJson(cachePath, {});
  const checkedAt = new Date().toISOString();
  const result = [];
  for (const event of events) {
    // Validate before geocoding or replacing any output.
    const normalized = normalizeEvent(event, {}, checkedAt);
    let coordinates = {};
    if (normalized.eventFormat !== 'Online' && !normalized.coordinatePrecision && normalized.city && normalized.countryCode) {
      const address = event.location.addressDetails;
      const key = [normalized.city, address.state, normalized.countryCode].filter(Boolean).join(', ').toLowerCase();
      coordinates = cache[key] || {};
      if (!validCoordinates(coordinates.lat, coordinates.lng)) {
        await new Promise(resolve => setTimeout(resolve, 1100));
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.search = new URLSearchParams({ city: normalized.city, ...(address.state ? { state: address.state } : {}), countrycodes: normalized.countryCode.toLowerCase(), format: 'json', limit: '1' });
        try {
          const response = await fetch(url, { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(20000) });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const [place] = await response.json();
          if (place && validCoordinates(Number(place.lat), Number(place.lon))) {
            coordinates = { lat: Number(place.lat), lng: Number(place.lon), coordinatePrecision: 'city', coordinateSource: 'OpenStreetMap / Nominatim' };
            cache[key] = coordinates;
          }
        } catch (error) { console.warn(`Could not map ${key}: ${error.message}`); }
      }
    }
    result.push(normalizeEvent(event, coordinates, checkedAt));
  }
  result.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.name.localeCompare(b.name));
  await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
  const temporary = new URL('./builder-events.json.tmp', outputPath);
  await writeFile(temporary, `${JSON.stringify(result, null, 2)}\n`);
  await rename(temporary, outputPath);
  console.log(`Imported ${result.length} Builder Center events: ${result.filter(e => e.coordinatePrecision).length} mapped, ${result.filter(e => e.eventFormat === 'Online').length} online, ${result.filter(e => !e.coordinatePrecision && e.eventFormat !== 'Online').length} without confirmed coordinates.`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
