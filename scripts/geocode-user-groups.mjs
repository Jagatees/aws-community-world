/**
 * Geocodes user-groups.json entries that are missing lat/lng.
 * Reads src/data/user-groups.json, adds lat/lng via Nominatim, writes back.
 *
 * Usage:
 *   node scripts/geocode-user-groups.mjs
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const UG_FILE = join(ROOT, 'src', 'data', 'user-groups.json');
const GEO_CACHE_FILE = join(__dirname, '.geo-cache.json');

const geoCache = existsSync(GEO_CACHE_FILE)
  ? JSON.parse(readFileSync(GEO_CACHE_FILE, 'utf8'))
  : {};

function saveGeoCache() {
  writeFileSync(GEO_CACHE_FILE, JSON.stringify(geoCache, null, 2));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocode(location, country) {
  const query = [location, country].filter(Boolean).join(', ');
  if (!query) return { lat: 0, lng: 0 };

  const key = query.trim().toLowerCase();
  if (geoCache[key]) return geoCache[key];

  await sleep(1100); // Nominatim rate limit: 1 req/sec

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'aws-community-globe-scraper/1.0' },
    });
    const data = await res.json();
    if (data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geoCache[key] = coords;
      saveGeoCache();
      return coords;
    }
  } catch (e) {
    console.warn(`  Geocode failed for "${query}": ${e.message}`);
  }

  const fallback = { lat: 0, lng: 0 };
  geoCache[key] = fallback;
  saveGeoCache();
  return fallback;
}

async function main() {
  // Strip UTF-8 BOM if present before parsing
const raw = readFileSync(UG_FILE, 'utf8').replace(/^\uFEFF/, '');
const groups = JSON.parse(raw);

  // Normalize: skip virtual/unknown locations, add lat/lng, unify field names
  const toProcess = groups.filter(
    (g) => g.location && !['virtual', 'online', ''].includes(g.location.toLowerCase())
  );
  const virtual = groups.filter(
    (g) => !g.location || ['virtual', 'online', ''].includes(g.location.toLowerCase())
  );

  console.log(`\nGeocoding ${toProcess.length} groups (${virtual.length} virtual skipped)...`);

  const results = [];
  let i = 0;
  for (const g of toProcess) {
    i++;
    if (g.lat !== undefined && g.lng !== undefined) {
      // Already geocoded
      results.push(normalize(g, g.lat, g.lng));
      process.stdout.write('.');
      continue;
    }
    const coords = await geocode(g.location, g.country);
    results.push(normalize(g, coords.lat, coords.lng));
    process.stdout.write('.');
    if (i % 50 === 0) console.log(` ${i}/${toProcess.length}`);
  }

  // Add virtual ones with 0,0 (filtered out by the globe)
  for (const g of virtual) {
    results.push(normalize(g, 0, 0));
  }

  console.log(`\n\nWriting ${results.length} groups...`);
  writeFileSync(UG_FILE, JSON.stringify(results, null, 2));
  console.log('✅ Done → src/data/user-groups.json');
}

function normalize(g, lat, lng) {
  return {
    id: g.id,
    name: g.name,
    avatarUrl: '',
    category: 'user-groups',
    location: [g.location, g.country].filter(Boolean).join(', '),
    joinUrl: g.joinUrl ?? g.link ?? '',
    profileUrl: g.joinUrl ?? g.link ?? '',
    lat,
    lng,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
