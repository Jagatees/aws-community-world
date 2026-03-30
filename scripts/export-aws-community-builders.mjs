import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_FILE = join(ROOT, 'aws-community-builders.json');
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

  await sleep(1_100);

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'aws-community-world-builders-export/1.0',
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

async function loadAllProfiles(page) {
  while (true) {
    const button = page.locator('button:has-text("Load more")').first();
    const isVisible = await button.isVisible({ timeout: 2_000 }).catch(() => false);

    if (!isVisible) {
      return;
    }

    const previousCount = await page.locator('[class*="_profile_"]').count();

    await button.scrollIntoViewIfNeeded();
    await button.click();

    await page
      .waitForFunction(
        (count) => document.querySelectorAll('[class*="_profile_"]').length > count,
        previousCount,
        { timeout: 15_000 },
      )
      .catch(() => {});

    await page.waitForTimeout(800);
  }
}

async function getVisibleBuilderNames(page) {
  return page.evaluate(() => (
    Array.from(document.querySelectorAll('a[href^="/community/@"]'))
      .map((element) => element.textContent?.trim() || '')
      .filter(Boolean)
  ));
}

async function enrichMissingLocationsFromFilter(page, builders) {
  const missingNames = new Set(
    builders.filter((builder) => !builder.location).map((builder) => builder.name),
  );

  if (missingNames.size === 0) {
    return builders;
  }

  // One breadcrumb overflow button is rendered before Category and Location.
  const locationButton = page.locator('button[class*="button-trigger"]').nth(2);

  await locationButton.click();
  const locations = await page
    .locator('[role="option"] span[title]')
    .evaluateAll((nodes) => nodes
      .map((node) => node.getAttribute('title') || '')
      .filter(Boolean)
      .filter((value) => value !== 'All countries'));
  await page.keyboard.press('Escape');

  const inferredLocations = new Map();

  for (const location of locations) {
    if (missingNames.size === 0) {
      break;
    }

    await locationButton.click();
    await page.getByRole('option', { name: location, exact: true }).click();
    await page.waitForTimeout(300);
    await loadAllProfiles(page);

    const visibleNames = await getVisibleBuilderNames(page);
    for (const name of visibleNames) {
      if (!missingNames.has(name)) {
        continue;
      }

      inferredLocations.set(name, location);
      missingNames.delete(name);
    }
  }

  await locationButton.click();
  await page.getByRole('option', { name: 'All countries', exact: true }).click();
  await page.waitForTimeout(300);

  return builders.map((builder) => ({
    ...builder,
    location: builder.location || inferredLocations.get(builder.name) || '',
  }));
}

async function extractBuilders(page) {
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[class*="_profile_"]'));
    const results = [];

    for (const card of cards) {
      const image = card.querySelector('img[alt]');
      const profileLink = card.querySelector('a[href^="/community/@"]');
      const badge = card.querySelector('[class*="_badge_"]');
      const textBlocks = Array.from(card.querySelectorAll('small, [class*="_ellipse-text_"]'))
        .map((element) => element.textContent?.trim() || '')
        .filter(Boolean);

      const name = profileLink?.textContent?.trim() || image?.getAttribute('alt')?.trim() || '';
      const profilePath = profileLink?.getAttribute('href') || '';

      if (!name || !profilePath) {
        continue;
      }

      const filteredTextBlocks = textBlocks.filter((value) => value !== name);
      const specialization = filteredTextBlocks.find((value) => value !== 'Community Builder') || '';
      const location = filteredTextBlocks.at(-1) === specialization ? '' : (filteredTextBlocks.at(-1) || '');

      results.push({
        name,
        builder_type: badge?.textContent?.trim() || 'Community Builder',
        specialization,
        location,
        image_url: image?.getAttribute('src') || '',
        profile_url: new URL(profilePath, window.location.origin).toString(),
      });
    }

    return Array.from(
      new Map(results.map((builder) => [builder.profile_url, builder])).values(),
    ).sort((a, b) => a.name.localeCompare(b.name));
  });
}

async function addCoordinates(builders) {
  const enrichedBuilders = [];

  for (const builder of builders) {
    const coords = await geocode(builder.location);
    enrichedBuilders.push({
      ...builder,
      lat: coords.lat,
      lng: coords.lng,
    });
  }

  return enrichedBuilders;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 1200 },
  });

  try {
    await page.goto('https://builder.aws.com/community/community-builders', {
      waitUntil: 'networkidle',
      timeout: 120_000,
    });

    await dismissCookieBanner(page);
    await page.waitForTimeout(1_500);
    await loadAllProfiles(page);

    const builders = await enrichMissingLocationsFromFilter(
      page,
      await extractBuilders(page),
    );
    const buildersWithCoordinates = await addCoordinates(builders);

    writeFileSync(OUTPUT_FILE, `${JSON.stringify(buildersWithCoordinates, null, 2)}\n`);
    console.log(`Saved ${buildersWithCoordinates.length} community builders to ${OUTPUT_FILE}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
