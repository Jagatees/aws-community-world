// Start Vite before running this browser regression check.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.COMMUNITY_TEST_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${baseUrl}/?tab=kiro-events&view=sleek`);
  await page.getByRole('tab', { name: 'AWS Builder Lofts', exact: true }).click();
  const cities = page.getByRole('navigation', { name: 'Choose a Builder Loft' });
  await cities.waitFor();
  assert.equal(await cities.getByRole('button').count(), 4);
  await page.getByRole('heading', { name: 'San Francisco', exact: true }).waitFor();
  assert.match(await page.getByRole('link', { name: 'Explore events' }).getAttribute('href'), /^https:\/\/events\.builder\.aws\.com\//);
  await cities.getByRole('button').filter({ hasText: 'Berlin' }).click();
  await page.getByRole('heading', { name: 'Berlin', exact: true }).waitFor();
  await page.getByText('Venue address to be announced', { exact: false }).waitFor();
  assert.match(await page.getByRole('link', { name: 'Read announcement', exact: true }).getAttribute('href'), /^https:\/\/aws\.amazon\.com\//);
  await page.getByRole('group', { name: 'Builder Lofts view', exact: true }).getByRole('button', { name: 'Directory', exact: true }).click();
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
  await page.getByRole('button', { name: 'Change category. Current category: Kiro Events' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'AWS Builder Lofts', exact: true }).click();
  await cities.waitFor();
  assert.equal(await cities.getByRole('button').count(), 4);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false);
  assert.deepEqual(errors, []);
  console.log('Mobile category navigation and page width pass; no browser errors');
} finally {
  await browser.close();
}
