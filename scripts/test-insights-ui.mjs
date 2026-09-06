// Requires a running Vite server. Override COMMUNITY_TEST_URL when needed.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const history = JSON.parse(await readFile(new URL('../src/data/community-growth-history.json', import.meta.url)));
const baseUrl = process.env.COMMUNITY_TEST_URL || 'http://127.0.0.1:5173';
const core = ['community-builders', 'heroes', 'user-groups', 'cloud-clubs'];
const categories = [['all', 'The whole community'], ['community-builders', 'Builders'], ['heroes', 'Heroes'], ['user-groups', 'User groups'], ['cloud-clubs', 'Student groups'], ['community-days', 'Community Days'], ['kiro-events', 'Kiro events']];
const totalFor = (snapshot, id) => id === 'all' ? core.reduce((sum, key) => sum + snapshot.categories[key].total, 0) : snapshot.categories[id].total;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseUrl}/?view=insights&theme=dark`);
  const dashboard = page.getByRole('main', { name: 'AWS community analytics' });
  await dashboard.waitFor();
  assert.equal(await dashboard.locator('canvas').count(), 0, 'The observatory does not start a WebGL renderer');
  const date = page.getByRole('combobox', { name: 'Choose snapshot month' });
  const datasets = page.getByRole('navigation', { name: 'Choose a directory' });

  const selectObservation = async (index, label) => {
    await datasets.getByRole('button').filter({ hasText: 'The whole community' }).click();
    await dashboard.locator('.obs-chart-point').nth(index).focus();
    await page.keyboard.press('Enter');
    await datasets.getByRole('button').filter({ hasText: label }).click();
  };
  const months = [...new Set(history.snapshots.map(s => s.date.slice(0, 7)))];
  assert.equal(await date.locator('option').count(), months.length);
  for (const month of months) {
    await date.selectOption(month);
    const expected = history.snapshots.filter(s => s.date.startsWith(month)).at(-1);
    assert.equal(Number((await dashboard.locator('.obs-hero-metric > strong').innerText()).replace(/[^0-9]/g, '')), totalFor(expected, 'all'));
  }
  for (const [id, label] of categories) {
    await datasets.getByRole('button').filter({ hasText: label }).click();
    for (const index of [history.snapshots.length - 1, 0]) {
      await selectObservation(index, label);
      const displayed = await dashboard.locator('.obs-hero-metric > strong').innerText();
      assert.equal(Number(displayed.replace(/[^0-9]/g, '')), totalFor(history.snapshots[index], id), `${id} snapshot ${index} total`);
      if (index === 0) {
        assert.match(await dashboard.locator('.obs-metric-caption').innerText(), /Baseline/);
        assert.equal(await page.getByRole('button', { name: 'Previous month', exact: true }).isDisabled(), true);
      }
      if (!totalFor(history.snapshots[index], id)) {
        assert.match(await dashboard.locator('.obs-record-note').innerText(), /not yet tracked/);
      }
    }
    const trackedCount = history.snapshots.filter(snapshot => totalFor(snapshot, id) > 0).length;
    assert.match(await dashboard.locator('.obs-reach-strip').innerText(), new RegExp(`${trackedCount}\\s+saved observations`));
  }
  await datasets.getByRole('button').filter({ hasText: 'User groups' }).click();
  const coverageIndex = history.snapshots.findIndex((snapshot, index) => index > 0 && history.snapshots[index - 1].categories['user-groups'].coveragePercent === 0 && snapshot.categories['user-groups'].coveragePercent === 100);
  assert.ok(coverageIndex >= 0, 'A restored-coverage snapshot exists for this regression check');
  await selectObservation(coverageIndex, 'User groups');
  assert.match(await dashboard.locator('.obs-region-coverage').innerText(), /0% to 100%/);
  await datasets.getByRole('button').filter({ hasText: 'Builders' }).click();
  const lowIndex = history.snapshots.findIndex((snapshot, index) => index > 0 && snapshot.categories['community-builders'].changes.quality.comparable === false && snapshot.categories['community-builders'].changes.quality.confidence !== 'baseline');
  assert.ok(lowIndex >= 0, 'A source discontinuity exists for this regression check');
  await selectObservation(lowIndex, 'Builders');
  await page.getByText('A source change deserves a closer look', { exact: true }).waitFor();
  assert.match(await dashboard.locator('.obs-record-note').innerText(), /source change/);
  await page.getByRole('button', { name: 'Back to latest', exact: true }).click();
  const europe = dashboard.locator('.obs-map-marker').filter({ has: page.locator('text', { hasText: 'Europe' }) });
  await europe.focus();
  await page.keyboard.press('Enter');
  assert.equal(await europe.getAttribute('aria-pressed'), 'true');
  assert.match(await dashboard.locator('.obs-map-selection').innerText(), /Europe/);
  await dashboard.locator('.obs-chart-point').first().focus();
  await page.keyboard.press('Enter');
  assert.equal(await date.inputValue(), history.snapshots[0].date.slice(0, 7));
  assert.match(await dashboard.locator('.obs-event-outlook').innerText(), /As of/);
  assert.match(await dashboard.locator('.obs-event-note').innerText(), /latest saved snapshot/);
  console.log('Historical totals across seven views, baseline/untracked states, source warnings, keyboard map/chart selection, and dated event outlook pass');

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [, label] of categories) {
      await datasets.getByRole('button').filter({ hasText: label }).click();
      const overflow = await dashboard.evaluate(el => el.scrollWidth > el.clientWidth + 1);
      assert.equal(overflow, false, `${label} overflows at ${width}px`);
    }
  }
  assert.deepEqual(errors, []);
  console.log('Seven views at 320/390/768/1024/1440px pass without horizontal page overflow or browser errors');
} finally {
  await browser.close();
}
