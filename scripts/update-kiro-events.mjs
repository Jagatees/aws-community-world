import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'kiro-events.json');
const GEO_CACHE_PATH = path.join(__dirname, '.geo-cache.json');
const FEED_URL = 'https://kiro.dev/events/feed.rss';
const USER_AGENT = 'aws-community-world-kiro-events-bot/1.0';

const MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const LOCATION_RULES = [
  [/cebu/i, 'Cebu, Philippines'],
  [/cusec/i, 'Canada'],
  [/amsterdam|outsystems/i, 'Amsterdam, Netherlands'],
  [/madrid/i, 'Madrid, Spain'],
  [/kumamoto/i, 'Kumamoto, Japan'],
  [/hackon with amazon/i, 'India'],
  [/bayan|fort bonifacio|philippines/i, 'Taguig, Philippines'],
  [/bekasi/i, 'Bekasi, Indonesia'],
  [/\bLA\b|los angeles|wzk84c1b/i, 'Los Angeles, CA, United States'],
  [/\bNYC\b|new york|lxd25i7a/i, 'New York, NY, United States'],
  [/montreal/i, 'Montreal, Canada'],
  [/ai engineer|world fair/i, 'San Francisco, CA, United States'],
  [/wearedevelopers|world congress|emea/i, 'Berlin, Germany'],
  [/firebase|twitch|office hours|discord|livestream/i, 'Online'],
  [/cutc transform promptathon|cutc26/i, 'Online'],
];

const ONLINE_COORDINATES = [
  { lat: 1.3521, lng: 103.8198 },
  { lat: 37.7749, lng: -122.4194 },
  { lat: 51.5072, lng: -0.1276 },
  { lat: 35.6762, lng: 139.6503 },
  { lat: -33.8688, lng: 151.2093 },
];

const geoCache = existsSync(GEO_CACHE_PATH) ? JSON.parse(readFileSync(GEO_CACHE_PATH, 'utf8')) : {};

function decodeXml(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function stripHtml(value = '') {
  return decodeXml(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => {
    const block = match[1];
    const description = stripHtml(getTag(block, 'description'));
    const [dateLine = '', ...bodyLines] = description.split('\n').map((line) => line.trim()).filter(Boolean);

    return {
      title: getTag(block, 'title'),
      link: getTag(block, 'link'),
      guid: getTag(block, 'guid'),
      pubDate: getTag(block, 'pubDate'),
      category: getTag(block, 'category'),
      dateLine,
      summary: bodyLines.join(' '),
    };
  });
}

function parseMonth(value) {
  return MONTHS[String(value).slice(0, 3).toLowerCase()];
}

function parseDateLine(dateLine, fallbackYear) {
  const normalized = dateLine.replace(/\s+/g, ' ').trim();
  const rangeMatch = normalized.match(/^([A-Z][a-z]{2})\s+(\d{1,2})(?:[–-]([A-Z][a-z]{2})?\s?(\d{1,2}))?,\s*(\d{4})(?:\s+(.*))?$/);
  if (!rangeMatch) {
    throw new Error(`Unrecognized Kiro event date: ${dateLine} (feed year ${fallbackYear}). Existing data was preserved.`);
  }

  const [, startMonthText, startDayText, endMonthText, endDayText, yearText, timeText = ''] = rangeMatch;
  const year = Number(yearText);
  const startMonth = parseMonth(startMonthText);
  const endMonth = endMonthText ? parseMonth(endMonthText) : startMonth;
  const startDay = Number(startDayText);
  const endDay = Number(endDayText || startDayText);

  const startTime = timeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  const endTime = timeText.match(/[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  const utc = /\bUTC\b/i.test(timeText);

  let startHour = 0;
  let startMinute = 0;
  let endHour = 23;
  let endMinute = 59;

  if (startTime) {
    startHour = to24Hour(Number(startTime[1]), startTime[3]);
    startMinute = Number(startTime[2]);
  }

  if (endTime) {
    endHour = to24Hour(Number(endTime[1]), endTime[3] || startTime?.[3]);
    endMinute = Number(endTime[2]);
  }

  const startsAt = new Date(Date.UTC(year, startMonth, startDay, startHour, startMinute, 0));
  const endsAt = new Date(Date.UTC(year, endMonth, endDay, endHour, endMinute, 59));

  return {
    startsAt: utc || startTime ? startsAt.toISOString() : new Date(Date.UTC(year, startMonth, startDay, 0, 0, 0)).toISOString(),
    endsAt: utc || endTime ? endsAt.toISOString() : new Date(Date.UTC(year, endMonth, endDay, 23, 59, 59)).toISOString(),
    endDateKey: `${year}-${String(endMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
    dateOnly: !startTime && !endTime,
  };
}

function to24Hour(hour, suffix) {
  const normalized = String(suffix || '').toUpperCase();
  if (normalized === 'PM' && hour < 12) return hour + 12;
  if (normalized === 'AM' && hour === 12) return 0;
  return hour;
}

function inferLocation(item) {
  const haystack = `${item.title} ${item.link} ${item.summary} ${item.category}`;
  const match = LOCATION_RULES.find(([pattern]) => pattern.test(haystack));
  return match ? match[1] : 'Online';
}

function stableHash(value) {
  let hash = 0;
  for (const char of value) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeLocation(location, id) {
  if (location === 'Online') {
    return ONLINE_COORDINATES[stableHash(id) % ONLINE_COORDINATES.length];
  }

  const key = location.trim().toLowerCase();
  if (geoCache[key]) return geoCache[key];

  await sleep(1100);

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const coords = {
        lat: Number.parseFloat(data[0].lat),
        lng: Number.parseFloat(data[0].lon),
      };
      geoCache[key] = coords;
      return coords;
    }
  } catch {
    // Fall through to the global online spread below.
  }

  const fallback = ONLINE_COORDINATES[stableHash(id) % ONLINE_COORDINATES.length];
  geoCache[key] = fallback;
  return fallback;
}

function buildButtonLabel(category) {
  return category.toLowerCase() === 'livestreams' ? 'Join Live Stream' : 'Join Event';
}

async function main() {
  const response = await fetch(FEED_URL, {
    signal: AbortSignal.timeout(30000),
    headers: { accept: 'application/rss+xml, application/xml, text/xml', 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Could not fetch Kiro events feed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  if (!/<rss[\s>]/i.test(xml) || !/<channel[\s>]/i.test(xml)) throw new Error('Invalid Kiro RSS response; existing data was preserved.');
  const now = process.env.KIRO_EVENTS_NOW ? new Date(process.env.KIRO_EVENTS_NOW) : new Date();
  const todayLocalKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const fallbackYear = now.getUTCFullYear();
  const rawItems = parseItems(xml);
  const upcoming = rawItems.filter((item) => {
    const { endsAt, endDateKey, dateOnly } = parseDateLine(item.dateLine, fallbackYear);
    if (dateOnly) return endDateKey >= todayLocalKey;
    return new Date(endsAt).getTime() >= now.getTime();
  });

  const events = await Promise.all(upcoming.map(async (item, index) => {
    const id = item.guid || item.link || `kiro-event-${index}`;
    const location = inferLocation(item);
    const coords = await geocodeLocation(location, id);
    const { startsAt, endsAt, dateOnly } = parseDateLine(item.dateLine, fallbackYear);

    return {
      id,
      name: item.title,
      avatarUrl: '/kiro-ambassador-icon.svg',
      profileUrl: item.link,
      joinUrl: item.link,
      location,
      lat: coords.lat,
      lng: coords.lng,
      tag: item.category || 'Kiro Event',
      eventDate: item.dateLine,
      startsAt,
      endsAt,
      calendarAllDay: dateOnly || !/\bUTC\b/i.test(item.dateLine),
      description: item.summary,
      ctaLabel: buildButtonLabel(item.category || ''),
      isLivestream: (item.category || '').toLowerCase() === 'livestreams',
      source: FEED_URL,
    };
  }));

  await writeFile(GEO_CACHE_PATH, `${JSON.stringify(geoCache, null, 2)}\n`, 'utf8');
  await writeFile(OUTPUT_PATH, `${JSON.stringify(events, null, 2)}\n`, 'utf8');
  console.log(`Updated ${events.length} Kiro events at ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
