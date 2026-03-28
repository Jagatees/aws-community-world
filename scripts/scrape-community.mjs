/**
 * AWS Community Globe — Data Scraper
 *
 * Scrapes the AWS Heroes page from builder.aws.com using Playwright,
 * geocodes member locations via Nominatim (OpenStreetMap), and writes
 * the results to src/data/heroes.json.
 *
 * Usage:
 *   npm run scrape
 */

import { chromium } from 'playwright';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');
const GEO_CACHE_FILE = join(__dirname, '.geo-cache.json');

// ── Geo cache ─────────────────────────────────────────────────────────────────
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

// ── Scraper ───────────────────────────────────────────────────────────────────

async function dismissCookieBanner(page) {
  try {
    const btn = page.locator('[data-testid="cancel-button"]');
    if (await btn.isVisible({ timeout: 4000 })) {
      await btn.click();
      await page.waitForTimeout(500);
    }
  } catch { /* ignore */ }
}

async function loadAll(page) {
  let clicks = 0;
  while (true) {
    try {
      const btn = page.locator('button:has-text("Load more")');
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      clicks++;
      process.stdout.write(` [+${clicks}]`);
      await page.waitForTimeout(2000);
    } catch {
      break;
    }
  }
}

/**
 * Extract members using the exact selectors from the live page HTML:
 *  - Card:     [class*="_card_"]
 *  - Name:     img[alt] inside the card (avatar alt text = hero name)
 *  - Location: [class*="_location-text_"] inside the card
 *  - Avatar:   img[src] inside the card
 *  - Profile:  a[href*="/community/heroes/"] inside the card
 *  - Tag:      button[class*="_badge_"] inside the card
 */
async function extractMembers(page, category) {
  return page.evaluate((cat) => {
    const cards = Array.from(document.querySelectorAll('[class*="_card_"]'));
    const results = [];

    for (const card of cards) {
      // Avatar img — alt attribute is the hero's name
      const img = card.querySelector('img[alt]');
      const name = img?.alt?.trim() || '';
      if (!name || name.length < 2) continue;

      const avatarUrl = img?.src || '';

      // Location text element
      const locationEl = card.querySelector('[class*="_location-text_"]');
      const location = locationEl?.textContent?.trim() || '';

      // Profile link
      const anchor = card.querySelector('a[href*="/community/heroes/"]');
      const profilePath = anchor?.getAttribute('href') || '';
      const profileUrl = profilePath ? `https://builder.aws.com${profilePath}` : '';

      // Slug from URL
      const slug = profilePath.split('/').filter(Boolean).pop() || '';
      const id = slug || `${cat}-${results.length + 1}`;

      // Hero type badge
      const badge = card.querySelector('[class*="_badge_"]');
      const tag = badge?.textContent?.trim() || '';

      results.push({ id, name, avatarUrl, category: cat, location, tag, profileUrl });
    }

    return results;
  }, category);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // ── Heroes (public page) ──────────────────────────────────────────────────
  process.stdout.write('\nScraping heroes...');
  await page.goto('https://builder.aws.com/community/heroes', {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await dismissCookieBanner(page);
  await page.waitForTimeout(1500);
  await loadAll(page);
  console.log();

  const rawHeroes = await extractMembers(page, 'heroes');
  console.log(`  → ${rawHeroes.length} heroes found`);

  if (rawHeroes.length > 0) {
    process.stdout.write(`  Geocoding ${rawHeroes.length} locations`);
    const heroes = [];
    for (const m of rawHeroes) {
      const coords = await geocode(m.location);
      heroes.push({ ...m, lat: coords.lat, lng: coords.lng });
      process.stdout.write('.');
    }
    console.log(' done');
    writeFileSync(join(DATA_DIR, 'heroes.json'), JSON.stringify(heroes, null, 2));
    console.log(`  ✓ Saved → src/data/heroes.json`);
  }

  await browser.close();
  console.log('\n✅ Scrape complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
