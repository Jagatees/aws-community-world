/**
 * Geocodes heroes.json entries.
 * Usage: node scripts/geocode-heroes.mjs
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FILE = join(ROOT, 'src', 'data', 'heroes.json');
const GEO_CACHE_FILE = join(__dirname, '.geo-cache.json');

const geoCache = existsSync(GEO_CACHE_FILE)
  ? JSON.parse(readFileSync(GEO_CACHE_FILE, 'utf8'))
  : {};

function saveGeoCache() {
  writeFileSync(GEO_CACHE_FILE, JSON.stringify(geoCache, null, 2));
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function geocode(query) {
  if (!query) return { lat: 0, lng: 0 };
  const key = query.trim().toLowerCase();
  if (geoCache[key]) return geoCache[key];
  await sleep(1100);
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'aws-community-globe-scraper/1.0' } });
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

function locationQuery(h) {
  if (h.directoryLocation && h.directoryLocation !== h.country) return h.directoryLocation;
  if (h.stateProvince && ['US', 'CA'].includes(h.countryCode)) return `${h.stateProvince}, ${h.country}`;
  return h.country ?? '';
}

async function main() {
  const raw = readFileSync(FILE, 'utf8').replace(/^\uFEFF/, '');
  const heroes = JSON.parse(raw);

  console.log(`\nGeocoding ${heroes.length} heroes...`);
  const results = [];
  let i = 0;
  for (const h of heroes) {
    i++;
    if (h.lat !== undefined && h.lng !== undefined) {
      results.push(normalize(h, h.lat, h.lng));
      process.stdout.write('.');
      continue;
    }
    const coords = await geocode(locationQuery(h));
    results.push(normalize(h, coords.lat, coords.lng));
    process.stdout.write('.');
    if (i % 50 === 0) console.log(` ${i}/${heroes.length}`);
  }

  console.log(`\n\nWriting ${results.length} heroes...`);
  writeFileSync(FILE, JSON.stringify(results, null, 2));
  console.log('✅ Done → src/data/heroes.json');
}

function normalize(h, lat, lng) {
  return {
    id: h.builderProfileId ?? h.alias,
    name: h.name,
    avatarUrl: h.avatarUrl ?? '',
    category: 'heroes',
    location: h.directoryLocation || h.country || '',
    tag: h.headline ?? '',
    profileUrl: h.profileUrl ?? '',
    lat,
    lng,
  };
}

main().catch((err) => { console.error(err); process.exit(1); });
