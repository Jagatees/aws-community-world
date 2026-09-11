import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.COMMUNITY_TEST_URL || 'http://127.0.0.1:5174';
const records = JSON.parse(await readFile(new URL('../src/data/aws-ambassadors.json', import.meta.url), 'utf8'));
const mappedCount = records.filter((record) => record.country).length;
const browser = await chromium.launch({ headless: true });
await mkdir('tmp/ambassadors-qa', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${baseUrl}/?tab=heroes&view=list`);
  await page.getByRole('tab', { name: 'Ambassadors', exact: true }).click();
  await page.getByRole('heading', { name: 'Ambassadors', exact: true }).waitFor();
  await page.getByText(`${records.length} entries`, { exact: true }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('tab'), 'aws-ambassadors');
  assert.equal(await page.locator('article').count(), 60);
  await page.getByRole('searchbox').fill('Karthik Rajan');
  await page.getByRole('button', { name: 'Karthik Rajan', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.getByText('Approximate country location.', { exact: true }).waitFor();
  assert.match(await page.getByRole('dialog').getByRole('link', { name: 'View partner', exact: true }).getAttribute('href'), /^https:\/\/partners.amazonaws.com\//);
  await page.screenshot({ path: 'tmp/ambassadors-qa/profile.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('searchbox').fill('');
  await page.screenshot({ path: 'tmp/ambassadors-qa/directory.png' });
  await page.getByRole('button', { name: 'All Countries', exact: true }).click();
  await page.getByRole('searchbox').last().fill('Singapore');
  // Country options expose their count as part of the accessible name.
  await page.getByRole('option', { name: /Singapore/ }).click();
  await page.keyboard.press('Escape');
  const singaporeCount = records.filter((record) => record.country === 'Singapore').length;
  await page.getByText(`${singaporeCount} entries`, { exact: true }).waitFor();
  await page.reload();
  await page.getByText(`${singaporeCount} entries`, { exact: true }).waitFor();
  await page.goto(`${baseUrl}/?tab=aws-ambassadors&view=icons`);
  await page.getByText('AWS Ambassador archive', { exact: true }).waitFor();
  await page.screenshot({ path: 'tmp/ambassadors-qa/gallery.png' });
  await page.goto(`${baseUrl}/?tab=aws-ambassadors&view=orbit`);
  await page.getByText(`Ambassadors · ${mappedCount} mapped / ${records.length} profiles`, { exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll('[data-globe-marker]').length > 0);
  await page.waitForTimeout(1500); // Let portrait requests and the camera settle for visual QA.
  await page.screenshot({ path: 'tmp/ambassadors-qa/earth.png' });
  assert.deepEqual(errors, []);
  console.log('Desktop tab, directory, search, profile links, country filters, URL reload, Gallery and Earth passed.');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  mobile.on('pageerror', (error) => errors.push(error.message));
  await mobile.goto(`${baseUrl}/?tab=heroes&view=list`);
  await mobile.getByRole('button', { name: 'Categories', exact: true }).click();
  await mobile.getByRole('button', { name: 'Ambassadors', exact: true }).click();
  await mobile.getByRole('heading', { name: 'Ambassadors', exact: true }).waitFor();
  await mobile.getByText(`${records.length} entries`, { exact: true }).waitFor();
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await mobile.screenshot({ path: 'tmp/ambassadors-qa/mobile-directory.png' });
  await mobile.goto(`${baseUrl}/?tab=aws-ambassadors&view=flat`);
  await mobile.getByText(`Ambassadors · ${mappedCount} mapped / ${records.length} profiles`, { exact: true }).waitFor();
  await mobile.getByRole('button', { name: 'Zoom in flat map', exact: true }).waitFor();
  await mobile.waitForTimeout(1000); // Capture the rendered map, after the lazy module loads.
  await mobile.screenshot({ path: 'tmp/ambassadors-qa/mobile-map.png' });
  assert.deepEqual(errors, []);
  console.log('Mobile category selection, Directory and Map passed without runtime errors or horizontal overflow.');
} finally {
  await browser.close();
}
