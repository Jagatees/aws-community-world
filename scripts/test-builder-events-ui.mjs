import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.COMMUNITY_TEST_URL || 'http://127.0.0.1:5175';
const events = JSON.parse(await readFile('src/data/builder-events.json', 'utf8'));
const now = new Date('2026-10-17T04:00:00Z');
const singaporeDay = value => new Date(Date.parse(value) + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
const upcoming = events.filter(e => singaporeDay(e.startsAt) > '2026-10-17');
const ended = events.filter(e => Date.parse(e.endsAt) <= now.getTime());
const today = events.filter(e => singaporeDay(e.startsAt) <= '2026-10-17' && Date.parse(e.endsAt) > now.getTime());
const online = events.filter(e => e.eventFormat === 'Online');
const browser = await chromium.launch({ headless: true });
const errors = [];
await mkdir('tmp/builder-events/qa', { recursive: true });
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce', timezoneId: 'Asia/Singapore' });
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(now);
    await page.goto(`${base}/?tab=builder-events&view=list`);
    const panel = page.getByRole('region', { name: 'Builder Center event filters' });
    await page.getByText(`${events.length} entries`, { exact: true }).waitFor();
    const refine = panel.getByRole('button', { name: /^Filters/ });
    assert.equal(await refine.getAttribute('aria-expanded'), 'false');
    assert.equal(await panel.getByRole('searchbox').isVisible(), false);
    const toolbar = await panel.boundingBox();
    assert.ok(toolbar.height <= (mobile ? 96 : 48), 'Collapsed toolbar stays compact');
    assert.equal(await page.locator('article').count(), events.length);
    const status = page.getByRole('group', { name: 'Event status', exact: true });
    assert.deepEqual(await status.getByRole('button').allTextContents(), [`All${events.length}`, `Today${today.length}`, `Upcoming${upcoming.length}`, `Ended${ended.length}`]);
    assert.equal(await status.getByRole('button', { name: `All ${events.length}`, exact: true }).getAttribute('aria-pressed'), 'true');
    for (const [name, value, expected] of [['Today', 'today', today], ['Upcoming', 'upcoming', upcoming], ['Ended', 'ended', ended]]) {
      await status.getByRole('button', { name: `${name} ${expected.length}`, exact: true }).click();
      await page.getByText(`${expected.length} ${expected.length === 1 ? 'entry' : 'entries'}`, { exact: true }).waitFor();
      assert.equal(await page.locator('article').count(), expected.length);
      assert.equal(new URL(page.url()).searchParams.get('eventStatus'), value);
      if (value === 'today') {
        await page.reload();
        await page.getByText(`${expected.length} entries`, { exact: true }).waitFor();
        assert.equal(await status.getByRole('button', { name: `${name} ${expected.length}`, exact: true }).getAttribute('aria-pressed'), 'true');
        assert.ok((await page.locator('article').allTextContents()).some(text => text.includes('2026 Community Day Shenzhen')));
      }
    }
    await status.getByRole('button', { name: `All ${events.length}`, exact: true }).click();
    await page.getByText(`${events.length} entries`, { exact: true }).waitFor();
    await page.screenshot({ path: `tmp/builder-events/qa/${mobile ? 'mobile' : 'desktop'}-directory.png` });
    await panel.getByRole('group', { name: 'Event format' }).getByRole('button', { name: 'Online', exact: true }).click();
    await page.getByText(`${online.length} entries`, { exact: true }).waitFor();
    assert.equal(await refine.getAttribute('aria-expanded'), 'false');
    await refine.click();
    await panel.getByLabel('Location type').selectOption('Online');
    await page.getByText(`${online.length} entries`, { exact: true }).waitFor();
    assert.equal(await page.locator('article').count(), online.length);
    assert.equal(new URL(page.url()).searchParams.get('format'), 'Online');
    await page.reload();
    await page.getByText(`${online.length} entries`, { exact: true }).waitFor();
    await refine.click();
    assert.equal(await panel.getByLabel('Location type').inputValue(), 'Online');
    await panel.getByLabel('Location type').selectOption('all');
    await panel.getByLabel('City', { exact: true }).selectOption('Shenzhen');
    await page.getByText('1 entry', { exact: true }).waitFor();
    assert.match(await page.locator('article').innerText(), /2026 Community Day Shenzhen/);
    assert.equal(await page.locator('article').getByRole('link', { name: 'View event', exact: true }).getAttribute('href'), events.find(e => e.city === 'Shenzhen').profileUrl);
    await page.locator('article').getByRole('button', { name: '2026 Community Day Shenzhen', exact: true }).click();
    const details = page.getByRole('dialog', { name: '2026 Community Day Shenzhen', exact: true });
    await details.getByText('Approximate city location. Check the event page for the venue.', { exact: true }).waitFor();
    assert.match(await details.innerText(), /Asia\/Shanghai/);
    const downloadPromise = page.waitForEvent('download');
    await details.getByRole('button', { name: /Add .* to calendar/ }).click();
    const download = await downloadPromise;
    assert.match(await readFile(await download.path(), 'utf8'), /DTSTART:20261017T010000Z/);
    await details.getByRole('button', { name: 'Close', exact: true }).click();
    await panel.getByLabel('City', { exact: true }).selectOption('');
    await panel.getByRole('searchbox').fill('not-an-existing-event-82914');
    await page.getByText('No entries match “not-an-existing-event-82914”.', { exact: true }).waitFor();
    await panel.getByRole('searchbox').fill('');
    await panel.getByLabel('Sort by').selectOption('latest');
    const newest = [...events].sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0];
    assert.ok((await page.locator('article').first().innerText()).includes(newest.name));
    await panel.getByLabel('Topic', { exact: true }).selectOption('agentic-ai');
    assert.equal(await page.locator('article').count(), events.filter(e => e.tag === 'agentic-ai').length);
    await panel.getByRole('searchbox').focus();
    await page.keyboard.press('Escape');
    assert.equal(await refine.getAttribute('aria-expanded'), 'false');
    assert.equal(await refine.evaluate(element => element === document.activeElement), true);
    await page.reload();
    assert.equal(new URL(page.url()).searchParams.get('tag'), 'agentic-ai');
    if (mobile) {
      await page.getByRole('button', { name: /Filters$/ }).click();
      await page.getByRole('button', { name: 'Clear all', exact: true }).click();
      await page.getByRole('button', { name: 'Close panel', exact: true }).click();
      await page.getByText(`${events.length} entries`, { exact: true }).waitFor();
    }
    await page.goto(`${base}/?tab=builder-events&view=flat&eventStatus=all&format=Online`);
    await page.getByText('These events have no physical map location. Open the directory to explore them.', { exact: true }).waitFor();
    await panel.getByRole('button', { name: 'View directory', exact: true }).click();
    await page.getByText(`${online.length} entries`, { exact: true }).waitFor();
    await page.goto(`${base}/?tab=builder-events&view=sleek&country=China&city=Shenzhen&eventStatus=all`);
    await status.getByRole('button', { name: 'All 1', exact: true }).waitFor();
    await page.locator('canvas').first().waitFor();
    await page.screenshot({ path: `tmp/builder-events/qa/${mobile ? 'mobile' : 'desktop'}-globe.png` });
    assert.equal(new URL(page.url()).searchParams.get('city'), 'Shenzhen');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow');
    if (mobile) {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.screenshot({ path: 'tmp/builder-events/qa/mobile-320-globe.png' });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.close();
    console.log(`${mobile ? 'Mobile' : 'Desktop'} passed: filters, dates, sorting, reload, links, map/directory behavior, and layout.`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
