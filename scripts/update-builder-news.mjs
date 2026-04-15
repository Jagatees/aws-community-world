import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'news.json');
const GEO_CACHE_PATH = path.join(__dirname, '.geo-cache.json');
const FEED_API_URL = 'https://api.builder.aws.com/cs/content/feed';
const PROFILE_API_URL = 'https://api.builder.aws.com/ums/getProfileByAlias';
const geoCache = existsSync(GEO_CACHE_PATH) ? JSON.parse(readFileSync(GEO_CACHE_PATH, 'utf8')) : {};

function buildHeaders() {
  return {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
    origin: 'https://builder.aws.com',
    referer: 'https://builder.aws.com/',
    'user-agent': 'Mozilla/5.0 (compatible; aws-community-world-news-bot/1.0)',
    'x-amz-user-agent': 'aws-sdk-js/1.0.0 ua/2.1 os/Linux lang/js md/nodejs api/bingocontent#1.0.0',
    'amz-sdk-request': 'attempt=1; max=3',
    'amz-sdk-invocation-id': crypto.randomUUID(),
    'builder-session-token': 'dummy',
  };
}

async function fetchJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchFeed(sortOrder) {
  return fetchJson(FEED_API_URL, {
    contentType: 'ARTICLE',
    sort: {
      article: {
        sortOrder,
      },
    },
  });
}

async function fetchProfile(alias) {
  if (!alias) return null;
  try {
    const payload = await fetchJson(PROFILE_API_URL, { alias });
    return payload.profile ?? null;
  } catch {
    return null;
  }
}

function normalizeLocation(profile) {
  const display = profile?.location?.displayLocation ?? {};
  const parts = [display.city, display.stateProvince, display.countryRegion].filter(Boolean);
  return parts.join(', ');
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeLocation(location) {
  if (!location) return { lat: 0, lng: 0 };

  const key = location.trim().toLowerCase();
  if (geoCache[key]) return geoCache[key];

  await sleep(1100);

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'aws-community-world-news-bot/1.0' },
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
    // Ignore and fall back to 0/0 below.
  }

  const fallback = { lat: 0, lng: 0 };
  geoCache[key] = fallback;
  return fallback;
}

async function saveGeoCache() {
  await writeFile(GEO_CACHE_PATH, `${JSON.stringify(geoCache, null, 2)}\n`, 'utf8');
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const itemId = item.id ?? item.contentId;
    if (!itemId || seen.has(itemId)) return false;
    seen.add(itemId);
    return true;
  });
}

async function enrichItem(item) {
  const article = item.contentTypeSpecificResponse?.article ?? {};
  const author = item.author ?? {};
  const profile = await fetchProfile(author.alias);
  const location = normalizeLocation(profile);
  const coords = await geocodeLocation(location);

  return {
    id: item.contentId,
    title: String(item.title ?? 'Untitled Builder Center post').trim(),
    description: article.description ?? item.description ?? item.markdownDescription ?? '',
    url: `https://builder.aws.com${item.contentId}`,
    imageUrl: article.heroImageUrl ?? '',
    authorName: author.preferredName ?? author.alias ?? 'AWS Builder Center',
    authorAlias: author.alias ?? '',
    authorAvatarUrl: author.avatarUrl ?? '',
    location,
    lat: coords.lat,
    lng: coords.lng,
    tags: Array.isArray(article.tags) ? article.tags : [],
    publishedAt: item.lastPublishedAt ? new Date(item.lastPublishedAt).toISOString() : new Date(item.createdAt).toISOString(),
    likesCount: item.likesCount ?? 0,
    commentsCount: item.commentsCount ?? 0,
  };
}

async function main() {
  const [latestPayload, trendingPayload] = await Promise.all([
    fetchFeed('NEWEST'),
    fetchFeed('TRENDING_SCORE'),
  ]);

  const latest = await Promise.all(dedupe((latestPayload.feedContents ?? []).slice(0, 20)).map(enrichItem));
  const trending = await Promise.all(dedupe((trendingPayload.feedContents ?? []).slice(0, 20)).map(enrichItem));

  const output = {
    updatedAt: new Date().toISOString(),
    latest,
    trending,
  };

  await saveGeoCache();
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Updated Builder Center news at ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
