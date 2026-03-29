/**
 * AWS User Groups Scraper
 *
 * Scrapes https://builder.aws.com/community/user-groups using Playwright,
 * geocodes locations via Nominatim, and writes to src/data/user-groups.json.
 *
 * Usage:
 *   node scripts/scrape-user-groups.mjs
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

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Probe page structure ──────────────────────────────────────────────────────
async function probeStructure(page) {
  return page.evaluate(() => {
    const cards = document.querySelectorAll('[class*="_card_"]');
    const first = cards[0];
    if (!first) return { error: 'no cards found', bodyText: document.body.innerText.substring(0, 500) };
    return {
      cardCount: cards.length,
      firstCardHtml: first.innerHTML.substring(0, 3000),
      firstCardText: first.textContent.trim().substring(0, 300),
    };
  });
}

// ── Extract user groups ───────────────────────────────────────────────────────
async function extractUserGroups(page) {
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[class*="_card_"]'));
    const results = [];

    for (const card of cards) {
      // Group name — try heading elements first, then img alt
      const heading = card.querySelector('h1, h2, h3, h4, h5, h6');
      let name = heading?.textContent?.trim() || '';

      // Fallback: img alt (some cards use avatar img alt as name)
      if (!name) {
        const img = card.querySelector('img[alt]');
        name = img?.alt?.trim() || '';
      }

      if (!name || name.length < 2) continue;

      // Location
      const locationEl =
        card.querySelector('[class*="_location-text_"]') ||
        card.querySelector('[class*="location"]') ||
        card.querySelector('[class*="city"]') ||
        card.querySelector('[class*="region"]');
      const location = locationEl?.textContent?.trim() || '';

      // Join / profile link — prefer user-groups href, fallback to any anchor
      const anchor =
        card.querySelector('a[href*="/community/user-groups/"]') ||
        card.querySelector('a[href]');
      const profilePath = anchor?.getAttribute('href') || '';
      const joinUrl = profilePath
        ? profilePath.startsWith('http')
          ? profilePath
          : `https://builder.aws.com${profilePath}`
        : '';

      // Slug-based id
      const slug = profilePath.split('/').filter(Boolean).pop() || '';
      const id = slug || `ug-${results.length + 1}`;

      results.push({ id, name, location, joinUrl });
    }

    return results;
  });
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

  console.log('\nNavigating to user-groups page...');
  await page.goto('https://builder.aws.com/community/user-groups', {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await dismissCookieBanner(page);
  await page.waitForTimeout(2000);

  // Probe structure first
  const probe = await probeStructure(page);
  if (probe.error) {
    console.error('Page probe failed:', probe.error);
    console.log('Body text sample:', probe.bodyText);
    await browser.close();
    process.exit(1);
  }
  console.log(`  → Found ${probe.cardCount} cards initially`);

  // Load all pages
  process.stdout.write('  Loading all groups...');
  await loadAll(page);
  console.log(' done');

  const rawGroups = await extractUserGroups(page);
  console.log(`  → ${rawGroups.length} user groups extracted`);

  if (rawGroups.length === 0) {
    // Dump HTML for debugging
    const html = await page.content();
    writeFileSync(join(__dirname, '_debug-user-groups.html'), html);
    console.error('  No groups found. Saved page HTML to scripts/_debug-user-groups.html for inspection.');
    await browser.close();
    process.exit(1);
  }

  // Geocode
  process.stdout.write(`  Geocoding ${rawGroups.length} locations`);
  const groups = [];
  for (const g of rawGroups) {
    const coords = await geocode(g.location);
    groups.push({ ...g, lat: coords.lat, lng: coords.lng });
    process.stdout.write('.');
  }
  console.log(' done');

  writeFileSync(join(DATA_DIR, 'user-groups.json'), JSON.stringify(groups, null, 2));
  console.log(`  ✓ Saved ${groups.length} groups → src/data/user-groups.json`);

  await browser.close();
  console.log('\n✅ Scrape complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
