import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');
const GEO_CACHE_FILE = join(__dirname, '.geo-cache.json');

const PAGES = {
  heroes: 'https://builder.aws.com/community/heroes',
  communityBuilders: 'https://builder.aws.com/community/community-builders',
  userGroups: 'https://builder.aws.com/community/user-groups',
  studentBuilderGroups: 'https://builder.aws.com/community/student-builder-groups',
};

const DRY_RUN = process.env.COMMUNITY_DATA_DRY_RUN === '1';
const ONLY = new Set(
  (process.env.COMMUNITY_DATA_ONLY || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const MAX_LOAD_CLICKS = Number.parseInt(process.env.COMMUNITY_DATA_MAX_LOAD_CLICKS || '200', 10);

const geoCache = existsSync(GEO_CACHE_FILE)
  ? JSON.parse(readFileSync(GEO_CACHE_FILE, 'utf8'))
  : {};

function saveGeoCache() {
  writeFileSync(GEO_CACHE_FILE, `${JSON.stringify(geoCache, null, 2)}\n`);
}

function readJson(filePath, fallback = []) {
  if (!existsSync(filePath)) return fallback;

  try {
    return JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    console.warn(`Could not read ${filePath}: ${error.message}`);
    return fallback;
  }
}

function writeJson(fileName, data) {
  const filePath = join(DATA_DIR, fileName);
  if (DRY_RUN) {
    console.log(`[dry-run] Would save ${data.length} records to src/data/${fileName}`);
    return;
  }

  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Saved ${data.length} records to src/data/${fileName}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasCoordinates(entry) {
  return Number.isFinite(entry?.lat)
    && Number.isFinite(entry?.lng)
    && !(Number(entry.lat) === 0 && Number(entry.lng) === 0);
}

async function geocode(location) {
  if (!location || ['virtual', 'online'].includes(location.toLowerCase())) {
    return { lat: 0, lng: 0 };
  }

  const key = location.trim().toLowerCase();
  if (geoCache[key]) return geoCache[key];

  await sleep(1_100);

  const searchQueries = [location];
  const parts = location.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) searchQueries.push(parts[0]);

  for (const query of searchQueries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'aws-community-world-scraper/1.0' },
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
  }

  const fallback = { lat: 0, lng: 0 };
  geoCache[key] = fallback;
  saveGeoCache();
  return fallback;
}

async function addCoordinates(records) {
  const enriched = [];

  for (const record of records) {
    const coords = hasCoordinates(record)
      ? { lat: Number(record.lat), lng: Number(record.lng) }
      : DRY_RUN
        ? { lat: 0, lng: 0 }
      : await geocode(record.location);

    enriched.push({ ...record, lat: coords.lat, lng: coords.lng });
  }

  return enriched;
}

async function dismissCookieBanner(page) {
  const selectors = [
    'button[data-id="awsccc-cb-btn-decline"]',
    '[data-testid="cancel-button"]',
    'button:has-text("Decline")',
  ];

  for (const selector of selectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await button.click();
      await page.waitForTimeout(500);
      return;
    }
  }
}

async function loadAll(page, itemSelector) {
  let previousCount = await page.locator(itemSelector).count().catch(() => 0);

  for (let clicks = 0; clicks < MAX_LOAD_CLICKS; clicks += 1) {
    const button = page
      .locator('button:has-text("Load more"), button:has-text("View More"), button:has-text("View more"), button:has-text("Show more")')
      .first();
    const isVisible = await button.isVisible({ timeout: 2_000 }).catch(() => false);

    if (!isVisible) return;

    await button.scrollIntoViewIfNeeded();
    await button.click();
    await page.waitForTimeout(1_000);
    await page.waitForFunction(
      (selector, count) => document.querySelectorAll(selector).length > count,
      itemSelector,
      previousCount,
      { timeout: 15_000 },
    ).catch(() => {});

    const nextCount = await page.locator(itemSelector).count().catch(() => previousCount);
    if (nextCount <= previousCount) return;

    previousCount = nextCount;
    process.stdout.write(` [+${clicks + 1}]`);
  }

  if (MAX_LOAD_CLICKS >= 200) {
    throw new Error(`Stopped after too many pagination clicks for ${page.url()}`);
  }

  console.log(` [stopped after ${MAX_LOAD_CLICKS} pagination clicks]`);
}

async function gotoDirectoryPage(page, url, itemSelector) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
  await dismissCookieBanner(page);
  await page.waitForTimeout(1_500);
  await loadAll(page, itemSelector);
  console.log();
}

function stableId(value) {
  const hash = createHash('sha1').update(value).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-');
}

function existingBy(existingRecords, key) {
  return new Map(existingRecords.filter((record) => record?.[key]).map((record) => [record[key], record]));
}

function normalizedLookupValue(value) {
  return String(value ?? '').trim().toLowerCase();
}

function locationKey(record) {
  return [
    normalizedLookupValue(record?.name),
    normalizedLookupValue(record?.location),
  ].join('|');
}

function mergeCoordinates(records, existingRecords, key) {
  const existing = existingBy(existingRecords, key);
  const existingByNameLocation = new Map(
    existingRecords
      .filter(hasCoordinates)
      .map((record) => [locationKey(record), record]),
  );

  return records.map((record) => {
    const previous = existing.get(record[key]) || existingByNameLocation.get(locationKey(record));
    if (!previous || !hasCoordinates(previous)) return record;

    return {
      ...record,
      lat: Number(previous.lat),
      lng: Number(previous.lng),
    };
  });
}

async function scrapeHeroes(page) {
  process.stdout.write('Scraping heroes...');
  await gotoDirectoryPage(page, PAGES.heroes, '[class*="_card_"]');

  const rawHeroes = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[class*="_card_"]'));
    const results = [];

    for (const card of cards) {
      const image = card.querySelector('img[alt]');
      const link = card.querySelector('a[href^="/community/heroes/"]');
      const badge = card.querySelector('[class*="_badge_"]');
      const locationText = card.querySelector('[class*="_location-text_"]');
      const name = image?.getAttribute('alt')?.trim() || link?.textContent?.trim() || '';
      const heroPath = link?.getAttribute('href') || '';

      if (!name || !heroPath) continue;

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

  const existing = readJson(join(DATA_DIR, 'heroes.json'));
  const existingMap = existingBy(existing, 'hero_page_url');
  const withCoordinates = await addCoordinates(mergeCoordinates(rawHeroes, existing, 'hero_page_url'));
  const heroes = withCoordinates.map((hero) => {
    const previous = existingMap.get(hero.hero_page_url);
    return {
      id: previous?.id || stableId(hero.hero_page_url),
      ...hero,
      isNew: Boolean(previous?.isNew) || !previous,
    };
  });
  if (!DRY_RUN && heroes.length < 50) throw new Error(`Heroes scrape returned only ${heroes.length} records`);
  writeJson('heroes.json', heroes);
}

async function scrapeCommunityBuilders(page) {
  process.stdout.write('Scraping community builders...');
  await gotoDirectoryPage(page, PAGES.communityBuilders, '[class*="_profile_"]');

  const scrapedBuilders = await page.evaluate(() => {
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

      if (!name || !profilePath) continue;

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

  const rawBuilders = await enrichBuilderLocationsFromFilter(page, scrapedBuilders);
  const existing = readJson(join(DATA_DIR, 'community-builders.json'));
  const existingMap = existingBy(existing, 'profileUrl');
  const withCoordinates = await addCoordinates(
    mergeCoordinates(rawBuilders, existing.map((builder) => ({
      ...builder,
      profile_url: builder.profileUrl,
    })), 'profile_url'),
  );

  const builders = withCoordinates.map((builder) => {
    const previous = existingMap.get(builder.profile_url);
    return {
      id: previous?.id || stableId(builder.profile_url),
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
      isNew: Boolean(previous?.isNew) || !previous,
    };
  });

  if (!DRY_RUN && builders.length < 100) throw new Error(`Community Builders scrape returned only ${builders.length} records`);
  writeJson('community-builders.json', builders);
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
        if (!href) return null;

        return {
          name: element.textContent?.trim() || '',
          profile_url: new URL(href, window.location.origin).toString(),
        };
      })
      .filter(Boolean)
  ));
}

async function enrichBuilderLocationsFromFilter(page, builders) {
  const missingCount = builders.filter((builder) => !builder.location).length;
  if (missingCount === 0) return builders;

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
    await loadAll(page, '[class*="_profile_"]');

    const visibleBuilders = await getVisibleBuilderProfiles(page);
    for (const builder of visibleBuilders) {
      inferredLocations.set(builder.profile_url, location);
    }
  }

  return builders.map((builder) => ({
    ...builder,
    location: builder.location || inferredLocations.get(builder.profile_url) || '',
  }));
}

function extractDirectoryGroups(kind) {
  const joinLinks = Array.from(document.querySelectorAll('a[href]'))
    .filter((link) => link.textContent?.trim() === 'Join');
  const results = [];

  function itemContainer(joinLink) {
    let current = joinLink.parentElement;

    while (current && current !== document.body) {
      const lines = current.innerText
        ?.split('\n')
        .map((line) => line.trim())
        .filter(Boolean) || [];
      const titleCount = lines.filter((line) => /^AWS (?:(?:User|Student Builder|Cloud) (?:Group|Builder Group|Club)|SBG) at /i.test(line)).length;
      const joinCount = current.querySelectorAll('a[href]').length
        ? Array.from(current.querySelectorAll('a[href]')).filter((link) => link.textContent?.trim() === 'Join').length
        : 0;

      if (
        joinCount === 1
        && lines.length >= 3
        && (kind === 'user' || titleCount === 1)
      ) return current;
      current = current.parentElement;
    }

    return joinLink.parentElement;
  }

  for (const joinLink of joinLinks) {
    const container = itemContainer(joinLink);
    if (!container) continue;

    const rawLines = container.innerText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const name = rawLines.find((line) => /^AWS (?:(?:User|Student Builder|Cloud) (?:Group|Builder Group|Club)|SBG) at /i.test(line))
      || (kind === 'user' ? rawLines.find((line) => line !== 'Join') : '')
      || '';
    const joinUrl = joinLink.getAttribute('href') || '';
    if (!name || !joinUrl || joinUrl.startsWith('#')) continue;

    const lines = rawLines
      .filter((line) => line !== 'Join' && line !== 'Led by');
    const location = lines.find((line) => line !== name && !line.includes('Join')) || '';

    const ledBy = [];
    if (kind === 'student') {
      const leadersByHref = new Map();
      for (const link of Array.from(container.querySelectorAll('a[href^="/community/@"]'))) {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim() || '';
        const image = link.querySelector('img[alt]');
        const existing = leadersByHref.get(href) || {};

        leadersByHref.set(href, {
          name: text || existing.name || image?.getAttribute('alt')?.trim() || '',
          imageUrl: image?.getAttribute('src') || existing.imageUrl || '',
        });
      }

      for (const leader of leadersByHref.values()) {
        if (leader.name) ledBy.push(leader);
      }
    }

    results.push({
      name,
      joinUrl,
      profileUrl: joinUrl,
      location,
      ledBy,
    });
  }

  return Array.from(new Map(results.map((group) => [group.joinUrl, group])).values());
}

async function scrapeUserGroups(page) {
  process.stdout.write('Scraping user groups...');
  await gotoDirectoryPage(page, PAGES.userGroups, 'a[href]');

  const rawGroups = await page.evaluate(extractDirectoryGroups, 'user');
  const existing = readJson(join(DATA_DIR, 'user-groups.json'));
  const existingMap = existingBy(existing, 'joinUrl');
  const existingByNameLocation = new Map(existing.map((group) => [locationKey(group), group]));
  const withCoordinates = await addCoordinates(mergeCoordinates(rawGroups, existing, 'joinUrl'));
  const groups = withCoordinates.map((group) => {
    const previous = existingMap.get(group.joinUrl) || existingByNameLocation.get(locationKey(group));
    return {
      id: previous?.id || stableId(group.joinUrl),
      name: group.name,
      avatarUrl: '',
      category: 'user-groups',
      location: group.location,
      joinUrl: group.joinUrl,
      profileUrl: group.profileUrl,
      lat: group.lat,
      lng: group.lng,
      isNew: Boolean(previous?.isNew) || !previous,
    };
  });

  if (!DRY_RUN && groups.length < 100) throw new Error(`User Groups scrape returned only ${groups.length} records`);
  writeJson('user-groups.json', groups);
}

async function scrapeStudentBuilderGroups(page) {
  process.stdout.write('Scraping student builder groups...');
  await gotoDirectoryPage(page, PAGES.studentBuilderGroups, 'a[href]');

  const rawGroups = await page.evaluate(extractDirectoryGroups, 'student');
  const existing = readJson(join(DATA_DIR, 'cloud-clubs.json'));
  const existingMap = existingBy(existing, 'joinUrl');
  const existingByNameLocation = new Map(existing.map((group) => [locationKey(group), group]));
  const withCoordinates = await addCoordinates(mergeCoordinates(rawGroups, existing, 'joinUrl'));
  const groups = withCoordinates.map((group) => {
    const previous = existingMap.get(group.joinUrl) || existingByNameLocation.get(locationKey(group));
    return {
      id: previous?.id || stableId(group.joinUrl),
      name: group.name,
      avatarUrl: '',
      category: 'cloud-clubs',
      location: group.location,
      joinUrl: group.joinUrl,
      profileUrl: group.profileUrl,
      ledBy: group.ledBy,
      lat: group.lat,
      lng: group.lng,
      isNew: Boolean(previous?.isNew) || !previous,
    };
  });

  if (!DRY_RUN && groups.length < 50) throw new Error(`Student Builder Groups scrape returned only ${groups.length} records`);
  writeJson('cloud-clubs.json', groups);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 1200 },
  });

  try {
    if (ONLY.size === 0 || ONLY.has('heroes')) await scrapeHeroes(page);
    if (ONLY.size === 0 || ONLY.has('community-builders')) await scrapeCommunityBuilders(page);
    if (ONLY.size === 0 || ONLY.has('user-groups')) await scrapeUserGroups(page);
    if (ONLY.size === 0 || ONLY.has('student-builder-groups')) await scrapeStudentBuilderGroups(page);
  } finally {
    await browser.close();
  }

  console.log('Community data refresh complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
