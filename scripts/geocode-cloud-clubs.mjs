/**
 * Geocodes cloud-clubs.json entries that are missing lat/lng.
 * Reads src/data/cloud-clubs.json, adds lat/lng via Nominatim, writes back.
 *
 * Usage:
 *   node scripts/geocode-cloud-clubs.mjs
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CC_FILE = join(ROOT, 'src', 'data', 'cloud-clubs.json');
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

async function geocode(location) {
  if (!location) return { lat: 0, lng: 0 };
  const key = location.trim().toLowerCase();
  if (geoCache[key]) return geoCache[key];

  await sleep(1100);

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
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
    console.warn(`  Geocode failed for "${location}": ${e.message}`);
  }

  const fallback = { lat: 0, lng: 0 };
  geoCache[key] = fallback;
  saveGeoCache();
  return fallback;
}

async function main() {
  // Strip UTF-8 BOM if present
  const raw = readFileSync(CC_FILE, 'utf8').replace(/^\uFEFF/, '');
  const clubs = JSON.parse(raw);

  const toProcess = clubs.filter(
    (c) => c.location && !['virtual', 'online', ''].includes(c.location.toLowerCase())
  );
  const virtual = clubs.filter(
    (c) => !c.location || ['virtual', 'online', ''].includes(c.location.toLowerCase())
  );

  console.log(`\nGeocoding ${toProcess.length} clubs (${virtual.length} virtual skipped)...`);

  const results = [];
  let i = 0;
  for (const c of toProcess) {
    i++;
    if (c.lat !== undefined && c.lng !== undefined) {
      results.push(normalize(c, c.lat, c.lng));
      process.stdout.write('.');
      continue;
    }
    const coords = await geocode(c.location);
    results.push(normalize(c, coords.lat, coords.lng));
    process.stdout.write('.');
    if (i % 50 === 0) console.log(` ${i}/${toProcess.length}`);
  }

  for (const c of virtual) {
    results.push(normalize(c, 0, 0));
  }

  console.log(`\n\nWriting ${results.length} clubs...`);
  writeFileSync(CC_FILE, JSON.stringify(results, null, 2));
  console.log('✅ Done → src/data/cloud-clubs.json');
}

function normalize(c, lat, lng) {
  return {
    id: c.id ?? c.name.replace(/\s+/g, '-').toLowerCase().slice(0, 60),
    name: c.name,
    avatarUrl: '',
    category: 'cloud-clubs',
    location: c.location ?? '',
    joinUrl: c.joinUrl ?? '',
    profileUrl: c.joinUrl ?? '',
    lat,
    lng,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
