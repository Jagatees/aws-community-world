import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_FILE = join(ROOT, 'aws-builder-heroes.json');
const GEO_CACHE_FILE = join(__dirname, '.geo-cache.json');

const geoCache = existsSync(GEO_CACHE_FILE)
  ? JSON.parse(readFileSync(GEO_CACHE_FILE, 'utf8'))
  : {};

function saveGeoCache() {
  writeFileSync(GEO_CACHE_FILE, JSON.stringify(geoCache, null, 2));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocode(query) {
  if (!query) {
    return { lat: 0, lng: 0 };
  }

  const key = query.trim().toLowerCase();
  if (geoCache[key]) {
    return geoCache[key];
  }

  // Nominatim asks clients to avoid bursts, so keep requests serialized.
  await sleep(1_100);

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'aws-community-world-heroes-export/1.0',
      },
    });
    const results = await response.json();

    if (Array.isArray(results) && results.length > 0) {
      const coords = {
        lat: Number.parseFloat(results[0].lat),
        lng: Number.parseFloat(results[0].lon),
      };
      geoCache[key] = coords;
      saveGeoCache();
      return coords;
    }
  } catch (error) {
    console.warn(`Geocoding failed for "${query}": ${error.message}`);
  }

  const fallback = { lat: 0, lng: 0 };
  geoCache[key] = fallback;
  saveGeoCache();
  return fallback;
}

async function addCoordinates(heroes) {
  const enrichedHeroes = [];

  for (const hero of heroes) {
    const coords = await geocode(hero.location);
    enrichedHeroes.push({
      ...hero,
      lat: coords.lat,
      lng: coords.lng,
    });
  }

  return enrichedHeroes;
}

async function dismissCookieBanner(page) {
  const selectors = [
    'button[data-id="awsccc-cb-btn-decline"]',
    'button:has-text("Decline")',
  ];

  for (const selector of selectors) {
    try {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 2_000 })) {
        await button.click();
        await page.waitForTimeout(500);
        return;
      }
    } catch {
      // Ignore missing cookie prompts.
    }
  }
}

async function loadAllHeroes(page) {
  let previousCount = await page.locator('[class*="_card_"]').count();

  while (true) {
    const button = page.locator('button:has-text("Load more")').first();
    const isVisible = await button.isVisible({ timeout: 2_000 }).catch(() => false);

    if (!isVisible) {
      return;
    }

    await button.scrollIntoViewIfNeeded();
    await button.click();

    await page
      .waitForFunction(
        (count) => document.querySelectorAll('[class*="_card_"]').length > count,
        previousCount,
        { timeout: 15_000 },
      )
      .catch(() => {});

    await page.waitForTimeout(1_000);

    const nextCount = await page.locator('[class*="_card_"]').count();
    if (nextCount <= previousCount) {
      return;
    }

    previousCount = nextCount;
  }
}

async function getVisibleHeroNames(page) {
  return page.evaluate(() => (
    Array.from(document.querySelectorAll('a[href^="/community/heroes/"] span'))
      .map((element) => element.textContent?.trim() || '')
      .filter(Boolean)
  ));
}

async function enrichMissingLocationsFromFilter(page, heroes) {
  const missingNames = new Set(
    heroes.filter((hero) => !hero.location).map((hero) => hero.name),
  );

  if (missingNames.size === 0) {
    return heroes;
  }

  // The page currently renders one breadcrumb overflow trigger before
  // the two filter buttons, so the location picker is the third trigger.
  const locationButton = page.locator('button[class*="button-trigger"]').nth(2);

  await locationButton.click();
  const locations = await page
    .locator('[role="option"] span[title]')
    .evaluateAll((nodes) => nodes
      .map((node) => node.getAttribute('title') || '')
      .filter(Boolean)
      .filter((value) => value !== 'All locations'));
  await page.keyboard.press('Escape');

  const inferredLocations = new Map();

  for (const location of locations) {
    if (missingNames.size === 0) {
      break;
    }

    await locationButton.click();
    await page.getByRole('option', { name: location, exact: true }).click();
    await page.waitForTimeout(300);
    await loadAllHeroes(page);

    const visibleNames = await getVisibleHeroNames(page);
    for (const name of visibleNames) {
      if (!missingNames.has(name)) {
        continue;
      }

      inferredLocations.set(name, location);
      missingNames.delete(name);
    }
  }

  await locationButton.click();
  await page.getByRole('option', { name: 'All locations', exact: true }).click();
  await page.waitForTimeout(300);

  return heroes.map((hero) => ({
    ...hero,
    location: hero.location || inferredLocations.get(hero.name) || '',
  }));
}

async function extractHeroes(page) {
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[class*="_card_"]'));
    const results = [];

    for (const card of cards) {
      const image = card.querySelector('img[alt]');
      const link = card.querySelector('a[href^="/community/heroes/"]');
      const badge = card.querySelector('[class*="_badge_"]');
      const locationText = card.querySelector('[class*="_location-text_"]');

      const name =
        image?.getAttribute('alt')?.trim() ||
        link?.textContent?.trim() ||
        '';

      const heroPath = link?.getAttribute('href') || '';
      if (!name || !heroPath) {
        continue;
      }

      results.push({
        name,
        hero_type: badge?.textContent?.trim() || '',
        location: locationText?.textContent?.trim() || '',
        image_url: image?.getAttribute('src') || '',
        hero_page_url: new URL(heroPath, window.location.origin).toString(),
      });
    }

    return Array.from(
      new Map(results.map((hero) => [hero.hero_page_url, hero])).values(),
    ).sort((a, b) => a.name.localeCompare(b.name));
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 1200 },
  });

  try {
    await page.goto('https://builder.aws.com/community/heroes', {
      waitUntil: 'networkidle',
      timeout: 120_000,
    });

    await dismissCookieBanner(page);
    await page.waitForTimeout(1_500);
    await loadAllHeroes(page);

    const heroes = await enrichMissingLocationsFromFilter(
      page,
      await extractHeroes(page),
    );
    const heroesWithCoordinates = await addCoordinates(heroes);
    writeFileSync(OUTPUT_FILE, `${JSON.stringify(heroesWithCoordinates, null, 2)}\n`);

    console.log(`Saved ${heroesWithCoordinates.length} heroes to ${OUTPUT_FILE}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
