/**
 * Geocodes community-builders.json entries.
 * Reads src/data/community-builders.json, adds lat/lng via Nominatim, writes back.
 *
 * Usage:
 *   node scripts/geocode-community-builders.mjs
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CB_FILE = join(ROOT, 'src', 'data', 'community-builders.json');
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

async function geocode(query) {
  if (!query) return { lat: 0, lng: 0 };
  const key = query.trim().toLowerCase();
  if (geoCache[key]) return geoCache[key];

  await sleep(1100);

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

function locationQuery(c) {
  // Use state/province for US/CA for better precision, otherwise just country
  if (c.stateProvince && ['US', 'CA'].includes(c.countryCode)) {
    return `${c.stateProvince}, ${c.country}`;
  }
  return c.country ?? '';
}

async function main() {
  const raw = readFileSync(CB_FILE, 'utf8').replace(/^\uFEFF/, '');
  const builders = JSON.parse(raw);

  console.log(`\nGeocoding ${builders.length} community builders...`);

  const results = [];
  let i = 0;
  for (const c of builders) {
    i++;
    if (c.lat !== undefined && c.lng !== undefined) {
      results.push(normalize(c, c.lat, c.lng));
      process.stdout.write('.');
      continue;
    }
    const query = locationQuery(c);
    const coords = await geocode(query);
    results.push(normalize(c, coords.lat, coords.lng));
    process.stdout.write('.');
    if (i % 50 === 0) console.log(` ${i}/${builders.length}`);
  }

  console.log(`\n\nWriting ${results.length} builders...`);
  writeFileSync(CB_FILE, JSON.stringify(results, null, 2));
  console.log('✅ Done → src/data/community-builders.json');
}

function normalize(c, lat, lng) {
  const location = c.stateProvince
    ? `${c.stateProvince}, ${c.country}`
    : (c.country ?? '');
  return {
    id: c.builderProfileId ?? c.alias,
    name: c.name,
    avatarUrl: c.avatarUrl ?? '',
    category: 'community-builders',
    location,
    tag: c.headline ?? '',
    profileUrl: c.profileUrl ?? '',
    lat,
    lng,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
