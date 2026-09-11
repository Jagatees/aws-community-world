import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.COMMUNITY_TEST_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
await mkdir('tmp/event-status-qa', { recursive: true });
const errors = [];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 320, height: 568 } : { width: 1440, height: 900 },
      isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce', timezoneId: 'Asia/Singapore',
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-09-11T04:00:00Z'));
    await page.goto(`${baseUrl}/?tab=community-days&view=list`);
    const filter = page.getByRole('group', { name: 'Event status', exact: true });
    await filter.getByRole('button', { name: 'All 38', exact: true }).waitFor();
    await page.getByText('38 entries', { exact: true }).waitFor();
    for (const [label, count, status] of [['Upcoming', 26, 'upcoming'], ['Ended', 12, 'ended'], ['All', 38, 'all']]) {
      await filter.getByRole('button', { name: `${label} ${count}`, exact: true }).click();
      await page.getByText(`${count} entries`, { exact: true }).waitFor();
      assert.equal(await page.locator('article').count(), count);
      assert.equal(new URL(page.url()).searchParams.get('eventStatus'), status === 'all' ? null : status);
      assert.equal(await filter.getByRole('button', { name: `${label} ${count}`, exact: true }).getAttribute('aria-pressed'), 'true');
    }
    await filter.getByRole('button', { name: 'Ended 12', exact: true }).click();
    await page.reload();
    await page.getByText('12 entries', { exact: true }).waitFor();
    assert.equal(await filter.getByRole('button', { name: 'Ended 12', exact: true }).getAttribute('aria-pressed'), 'true');
    if (mobile) {
      await page.getByRole('button', { name: 'More', exact: true }).click();
      await page.getByRole('group', { name: 'Globe view' }).getByRole('button', { name: 'Minimal', exact: true }).click();
    } else {
      await page.getByRole('group', { name: 'Community Days view switcher' }).getByRole('button', { name: 'Minimal', exact: true }).click();
    }
    const scene = page.getByRole('region', { name: 'AWS Community Days globe', exact: true });
    await scene.getByText('Ended events worldwide', { exact: true }).waitFor();
    await scene.getByText('12', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('eventStatus'), 'ended');
    if (mobile) assert.equal(await page.locator('.mobile-active-category strong').innerText(), '12');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `tmp/event-status-qa/${mobile ? 'mobile' : 'desktop'}.png` });

    // A location with only a past event must have no upcoming results in either view.
    await page.goto(`${baseUrl}/?tab=community-days&view=list&country=Singapore&region=asia&eventStatus=upcoming`);
    await filter.getByRole('button', { name: 'All 1', exact: true }).waitFor();
    await page.getByText('No events match these filters.', { exact: true }).waitFor();
    await filter.getByRole('button', { name: 'Ended 1', exact: true }).click();
    await page.getByText('1 entry', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('country'), 'Singapore');
    if (mobile) {
      await page.getByRole('button', { name: /Filters$/ }).click();
      await page.getByRole('button', { name: 'Clear all', exact: true }).click();
      await page.getByRole('button', { name: 'Close panel', exact: true }).click();
      await page.getByText('38 entries', { exact: true }).waitFor();
      assert.equal(new URL(page.url()).searchParams.has('eventStatus'), false);
    }

    await page.goto(`${baseUrl}/?tab=kiro-events&view=list&eventStatus=ended`);
    await filter.getByRole('button', { name: 'All 4', exact: true }).waitFor();
    await page.getByText('No events match these filters.', { exact: true }).waitFor();
    await filter.getByRole('button', { name: 'Upcoming 4', exact: true }).click();
    await page.getByText('4 entries', { exact: true }).waitFor();
    await page.goto(`${baseUrl}/?tab=builder-lofts`);
    assert.equal(await filter.count(), 0);
    await page.close();
    console.log(`${mobile ? 'Mobile' : 'Desktop'}: status counts, directory results, map counts, URL reload, location combinations and empty states passed.`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
