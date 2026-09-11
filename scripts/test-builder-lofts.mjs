// Start Vite before running this browser regression check.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseUrl = process.env.COMMUNITY_TEST_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
await mkdir('tmp/lofts-panel-qa', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${baseUrl}/?tab=kiro-events&view=sleek`);
  await page.getByRole('tab', { name: 'Builder Lofts', exact: true }).click();
  const cities = page.getByRole('navigation', { name: 'Choose a Builder Loft' });
  await cities.waitFor();
  assert.equal(await cities.getByRole('button').count(), 4);
  await page.getByRole('heading', { name: 'San Francisco', exact: true }).waitFor();
  assert.match(await page.getByRole('link', { name: 'Explore events' }).getAttribute('href'), /^https:\/\/events\.builder\.aws\.com\//);
  await cities.getByRole('button').filter({ hasText: 'Berlin' }).click();
  await page.getByRole('heading', { name: 'Berlin', exact: true }).waitFor();
  await page.getByText('Venue address to be announced', { exact: false }).waitFor();
  assert.match(await page.getByRole('link', { name: 'Read announcement', exact: true }).getAttribute('href'), /^https:\/\/aws\.amazon\.com\//);
  const panel = page.getByRole('complementary', { name: 'Explore Builder Lofts' });
  const map = page.locator('.lofts-map');
  const initialMapWidth = (await map.boundingBox()).width;
  await page.getByRole('button', { name: 'Hide Lofts', exact: true }).click();
  await panel.waitFor({ state: 'hidden' });
  assert.equal((await map.boundingBox()).width, initialMapWidth);
  assert.equal(await page.locator('#lofts-panel').getAttribute('inert'), '');
  await page.screenshot({ path: 'tmp/lofts-panel-qa/desktop-hidden.png' });
  await page.getByRole('button', { name: 'Explore Lofts', exact: true }).click();
  await panel.waitFor();
  await page.getByRole('heading', { name: 'Berlin', exact: true }).waitFor();
  await page.getByRole('group', { name: 'Loft status', exact: true }).getByRole('button', { name: 'Open', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.lofts-city').length === 1);
  assert.equal(new URL(page.url()).searchParams.get('tag'), 'Open');
  await page.getByRole('group', { name: 'Loft status', exact: true }).getByRole('button', { name: 'All', exact: true }).click();
  await page.keyboard.press('Escape');
  await panel.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Explore Lofts', exact: true }).click();
  await panel.waitFor();
  await page.screenshot({ path: 'tmp/lofts-panel-qa/desktop-open.png' });
  await page.getByRole('group', { name: 'Globe design switcher', exact: true }).getByRole('button', { name: 'Directory', exact: true }).click();
  await page.locator('.lofts-directory').waitFor();
  assert.equal(await page.locator('.lofts-directory article').count(), 4);
  assert.equal(await page.locator('canvas').count(), 0);

  for (const [query, expectedCityCount] of [['tag=Open', 1], ['tag=Announced', 3], ['country=Germany', 1], ['country=Singapore', 0]]) {
    await page.goto(`${baseUrl}/?tab=builder-lofts&view=list&${query}`);
    if (expectedCityCount === 0) await page.getByRole('heading', { name: 'No lofts in this view' }).waitFor();
    else {
      await page.locator('.lofts-directory').waitFor();
      assert.equal(await page.locator('.lofts-directory article').count(), expectedCityCount);
    }
  }
  console.log('Desktop tab, city details, official links, directory, status/country filters and empty state pass');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/?tab=kiro-events&view=sleek`);
  await page.getByRole('button', { name: 'Categories', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Builder Lofts', exact: true }).click();
  await cities.waitFor();
  assert.equal(await cities.getByRole('button').count(), 4);
  await page.getByRole('button', { name: 'Close lofts panel', exact: true }).click();
  await panel.waitFor({ state: 'hidden' });
  await page.screenshot({ path: 'tmp/lofts-panel-qa/mobile-hidden.png' });
  await page.getByRole('button', { name: 'Explore Lofts', exact: true }).click();
  await panel.waitFor();
  await page.getByRole('group', { name: 'Loft status', exact: true }).getByRole('button', { name: 'Announced', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.lofts-city').length === 3);
  await page.screenshot({ path: 'tmp/lofts-panel-qa/mobile-open.png' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false);
  assert.deepEqual(errors, []);
  await page.goto(`${baseUrl}/?tab=news&view=sleek`);
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('group', { name: 'Globe view' }).getByRole('button', { name: 'Directory', exact: true }).click();
  await page.getByRole('heading', { name: 'Builder Center News', exact: true }).waitFor();
  await page.setViewportSize({ width: 820, height: 817 });
  await page.goto(`${baseUrl}/?tab=builder-lofts&view=sleek&theme=light`);
  await cities.waitFor();
  const views = page.getByRole('group', { name: 'Globe design switcher', exact: true });
  await views.getByRole('button', { name: 'Directory', exact: true }).waitFor();
  const viewBox = await views.boundingBox();
  assert.ok(viewBox.x >= 0 && viewBox.x + viewBox.width <= 820);
  await page.screenshot({ path: 'tmp/lofts-panel-qa/tablet-light.png' });
  await page.goto(`${baseUrl}/?tab=news&view=sleek`);
  await page.getByRole('button', { name: 'Close news panel', exact: true }).click();
  await views.getByRole('button', { name: 'Directory', exact: true }).click();
  await page.getByRole('heading', { name: 'Builder Center News', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('Mobile category navigation and page width pass; no browser errors');
} finally {
  await browser.close();
}
