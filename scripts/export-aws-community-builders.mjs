import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_FILE = join(ROOT, 'src', 'data', 'community-builders.json');
const GEO_CACHE_FILE = join(__dirname, '.geo-cache.json');
const RAW_OUTPUT_FILE = join(ROOT, 'aws-community-builders.json');

const geoCache = existsSync(GEO_CACHE_FILE)
  ? JSON.parse(readFileSync(GEO_CACHE_FILE, 'utf8'))
  : {};

function saveGeoCache() {
  writeFileSync(GEO_CACHE_FILE, JSON.stringify(geoCache, null, 2));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readExistingBuilders() {
  if (!existsSync(OUTPUT_FILE)) {
    return [];
  }

  try {
    const raw = JSON.parse(readFileSync(OUTPUT_FILE, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch (error) {
    console.warn(`Could not read existing builders file: ${error.message}`);
    return [];
  }
}

function getLocationCountry(location) {
  return location.split(',').at(-1)?.trim().toLowerCase() || '';
}

function normalizeCountry(country) {
  const aliases = {
    'hong kong sar': 'hong kong',
    korea: 'south korea',
    myanmar: 'myanmar (burma)',
    'palestinian authority': 'palestine',
    türkiye: 'turkiye',
  };

  return aliases[country] || country;
}

function countLocationSegments(location) {
  return location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function hasCoordinates(entry) {
  return Number.isFinite(entry?.lat)
    && Number.isFinite(entry?.lng)
    && !(Number(entry.lat) === 0 && Number(entry.lng) === 0);
}

function shouldPreferLegacyLocation(currentLocation, legacyLocation) {
  if (!legacyLocation) {
    return false;
  }

  if (!currentLocation) {
    return true;
  }

  if (currentLocation === legacyLocation) {
    return false;
  }

  const currentCountry = normalizeCountry(getLocationCountry(currentLocation));
  const legacyCountry = normalizeCountry(getLocationCountry(legacyLocation));

  if (!currentCountry || !legacyCountry || currentCountry !== legacyCountry) {
    return false;
  }

  return countLocationSegments(legacyLocation) > countLocationSegments(currentLocation);
}

function mergeExistingLocations(builders, existingBuilders) {
  const existingByProfileUrl = new Map(
    existingBuilders
      .filter((builder) => builder?.profileUrl)
      .map((builder) => [builder.profileUrl, builder]),
  );

  return builders.map((builder) => {
    const existingBuilder = existingByProfileUrl.get(builder.profile_url);
    if (!existingBuilder) {
      return builder;
    }

    const preferredLocation = shouldPreferLegacyLocation(builder.location, existingBuilder.location)
      ? existingBuilder.location
      : builder.location;

    const preferredCoordinates = preferredLocation === existingBuilder.location && hasCoordinates(existingBuilder)
      ? { lat: Number(existingBuilder.lat), lng: Number(existingBuilder.lng) }
      : {};

    return {
      ...builder,
      location: preferredLocation,
      ...preferredCoordinates,
    };
  });
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

  const searchQueries = [query];
  const parts = query
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    searchQueries.push(parts[0]);
  }

  try {
    for (const searchQuery of searchQueries) {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;
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

async function getLocationFilterButton(page) {
  const buttons = page.locator('button[class*="button-trigger"]');
  const count = await buttons.count();

  for (let i = 0; i < count; i += 1) {
    const button = buttons.nth(i);
    const text = (await button.textContent())?.trim() || '';
    if (
      text.includes('Location')
      || text.includes('All countries')
      || text.includes('All locations')
    ) {
      return button;
    }
  }

  return buttons.nth(2);
}

async function getFilterOptions(page) {
  return page
    .locator('[role="option"]')
    .evaluateAll((nodes) => nodes
      .map((node) => {
        const titleNode = node.querySelector('span[title]');
        return (
          titleNode?.getAttribute('title')
          || node.textContent?.trim()
          || ''
        ).trim();
      })
      .filter(Boolean));
}

async function getVisibleBuilderProfiles(page) {
  return page.evaluate(() => (
    Array.from(document.querySelectorAll('a[href^="/community/@"]'))
      .map((element) => {
        const href = element.getAttribute('href') || '';
        if (!href) {
          return null;
        }

        return {
          name: element.textContent?.trim() || '',
          profile_url: new URL(href, window.location.origin).toString(),
        };
      })
      .filter(Boolean)
  ));
}

async function buildLocationsFromFilter(page, builders) {
  const locationButton = await getLocationFilterButton(page);

  await locationButton.click();
  const rawOptions = await getFilterOptions(page);
  await page.keyboard.press('Escape');

  const locations = rawOptions.filter((value) => value !== 'All countries' && value !== 'All locations');
  const inferredLocations = new Map();

  for (const location of locations) {
    await locationButton.click();
    await page.getByRole('option', { name: location, exact: true }).click();
    await page.waitForTimeout(400);
    await loadAllProfiles(page);

    const visibleBuilders = await getVisibleBuilderProfiles(page);
    for (const builder of visibleBuilders) {
      inferredLocations.set(builder.profile_url, location);
    }
  }

  return builders.map((builder) => ({
    ...builder,
    location: inferredLocations.get(builder.profile_url) || builder.location || '',
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
    const coords = hasCoordinates(builder)
      ? { lat: Number(builder.lat), lng: Number(builder.lng) }
      : await geocode(builder.location);

    enrichedBuilders.push({
      ...builder,
      lat: coords.lat,
      lng: coords.lng,
    });
  }

  return enrichedBuilders;
}

function buildStableId(profileUrl, existingId) {
  if (existingId) {
    return existingId;
  }

  const hash = createHash('sha1').update(profileUrl).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-');
}

function shapeForDataFile(builders, existingBuilders) {
  const existingByProfileUrl = new Map(
    existingBuilders
      .filter((builder) => builder?.profileUrl)
      .map((builder) => [builder.profileUrl, builder]),
  );

  return builders.map((builder) => {
    const existingBuilder = existingByProfileUrl.get(builder.profile_url);

    return {
      id: buildStableId(builder.profile_url, existingBuilder?.id),
      name: builder.name,
      avatarUrl: builder.image_url,
      category: 'community-builders',
      location: builder.location,
      tag: builder.specialization,
      builderType: builder.builder_type,
      specialization: builder.specialization,
      profileUrl: builder.profile_url,
      lat: builder.lat,
      lng: builder.lng,
    };
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
    await page.goto('https://builder.aws.com/community/community-builders', {
      waitUntil: 'networkidle',
      timeout: 120_000,
    });

    await dismissCookieBanner(page);
    await page.waitForTimeout(1_500);
    await loadAllProfiles(page);

    const builders = await buildLocationsFromFilter(
      page,
      await extractBuilders(page),
    );
    const existingBuilders = readExistingBuilders();
    const mergedBuilders = mergeExistingLocations(builders, existingBuilders);
    const buildersWithCoordinates = await addCoordinates(mergedBuilders);
    const dataFileBuilders = shapeForDataFile(buildersWithCoordinates, existingBuilders);

    writeFileSync(RAW_OUTPUT_FILE, `${JSON.stringify(buildersWithCoordinates, null, 2)}\n`);
    writeFileSync(OUTPUT_FILE, `${JSON.stringify(dataFileBuilders, null, 2)}\n`);
    console.log(`Saved ${dataFileBuilders.length} community builders to ${OUTPUT_FILE}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
