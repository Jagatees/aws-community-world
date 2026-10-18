import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.COMMUNITY_TEST_URL || 'http://127.0.0.1:5175';
const browser = await chromium.launch({ headless: true });
const errors = [];
await mkdir('tmp/calendar-qa', { recursive: true });
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce', timezoneId: 'Asia/Singapore' });
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-10-17T04:00:00Z'));
    await page.goto(`${base}/?tab=builder-events&view=list&eventStatus=all`);
    await page.getByRole('button', { name: 'View calendar', exact: true }).click();
    const calendar = page.getByRole('region', { name: 'Builder Center Events calendar', exact: true });
    await calendar.getByRole('heading', { name: 'October 2026', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('view'), 'calendar');
    assert.equal(new URL(page.url()).searchParams.get('eventStatus'), 'all');
    await calendar.getByText(/Times in Asia\/Singapore/).waitFor();
    await calendar.getByRole('button', { name: /^Saturday, October 17, 2026,/ }).click();
    const agenda = calendar.getByRole('complementary', { name: 'Selected day events' });
    await agenda.getByRole('button', { name: 'AWS Girls Peru - Agentic AI Day', exact: true }).waitFor();
    await agenda.getByRole('button', { name: '2026 Community Day Shenzhen', exact: true }).click();
    const details = page.getByRole('dialog', { name: '2026 Community Day Shenzhen', exact: true });
    await details.getByRole('link', { name: 'View event', exact: true }).waitFor();
    await details.getByRole('button', { name: 'Close', exact: true }).click();
    await calendar.getByRole('button', { name: 'Next month', exact: true }).click();
    await calendar.getByRole('heading', { name: 'November 2026', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('month'), '2026-11');
    await page.reload();
    await calendar.getByRole('heading', { name: 'November 2026', exact: true }).waitFor();
    await calendar.getByRole('button', { name: 'Previous month', exact: true }).click();
    await calendar.getByRole('heading', { name: 'October 2026', exact: true }).waitFor();
    await calendar.getByLabel('Jump to month', { exact: true }).fill('2027-01');
    await calendar.getByText('No events this month match your filters. Choose another month or adjust the filters.', { exact: true }).waitFor();
    await calendar.getByRole('button', { name: 'Today', exact: true }).click();
    await calendar.getByRole('heading', { name: 'October 2026', exact: true }).waitFor();
    await calendar.evaluate(element => { element.scrollTop = 0; });
    await page.screenshot({ path: `tmp/calendar-qa/${mobile ? 'mobile' : 'desktop'}.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (mobile) {
      await page.getByRole('button', { name: 'More', exact: true }).click();
      await page.getByRole('group', { name: 'Globe view', exact: true }).getByRole('button', { name: 'Directory', exact: true }).click();
      await page.getByText('48 entries', { exact: true }).waitFor();
    } else {
      await page.getByRole('group', { name: 'Globe design switcher' }).getByRole('button', { name: 'Directory', exact: true }).click();
      await page.getByText('48 entries', { exact: true }).waitFor();
    }
    await page.goto(`${base}/?tab=builder-events&view=calendar&country=China&city=Shenzhen&month=2026-10&eventStatus=all`);
    await calendar.getByText('1 event this month · Times in Asia/Singapore', { exact: true }).waitFor();
    assert.equal(await calendar.locator('.event-calendar-chip').count(), 1);
    await page.goto(`${base}/?tab=builder-events&view=calendar&format=Online&month=2026-10&eventStatus=all&theme=light`);
    await calendar.getByRole('heading', { name: 'October 2026', exact: true }).waitFor();
    await page.locator('.event-calendar-chip.is-online').first().waitFor({ state: 'attached' });
    assert.equal(await page.locator('.event-calendar-chip:not(.is-online)').count(), 0);
    await page.screenshot({ path: `tmp/calendar-qa/${mobile ? 'mobile' : 'desktop'}-light.png` });
    await page.goto(`${base}/?tab=builder-events&view=calendar&eventStatus=today&month=2026-10`);
    await calendar.getByRole('heading', { name: 'October 2026', exact: true }).waitFor();
    const todayFilter = page.getByRole('group', { name: 'Event status', exact: true }).getByRole('button', { name: /^Today / });
    assert.equal(await todayFilter.getAttribute('aria-pressed'), 'true');
    await calendar.locator('[data-date="2026-10-17"] .event-calendar-chip').filter({ hasText: '2026 Community Day Shenzhen' }).waitFor({ state: 'attached' });
    assert.equal(new URL(page.url()).searchParams.get('eventStatus'), 'today');
    await page.reload();
    await calendar.getByRole('heading', { name: 'October 2026', exact: true }).waitFor();
    assert.equal(await todayFilter.getAttribute('aria-pressed'), 'true');
    await page.goto(`${base}/?tab=kiro-events&view=calendar&month=2027-01&eventStatus=all`);
    const kiro = page.getByRole('region', { name: 'Kiro Events calendar' });
    await kiro.getByText('1 event this month · Times in Asia/Singapore', { exact: true }).waitFor();
    for (const day of ['2027-01-07', '2027-01-08', '2027-01-09']) assert.equal(await kiro.locator(`[data-date="${day}"] .event-calendar-chip`).count(), 1);
    assert.equal(await kiro.locator('[data-date="2027-01-10"] .event-calendar-chip').count(), 0);
    await page.goto(`${base}/?tab=community-days&view=calendar&month=2026-08&eventStatus=all&country=Philippines`);
    const community = page.getByRole('region', { name: 'Community Days calendar' });
    await community.getByText('1 event this month · Times in Asia/Singapore', { exact: true }).waitFor();
    for (const day of ['2026-08-22', '2026-08-23']) assert.equal(await community.locator(`[data-date="${day}"] .event-calendar-chip`).count(), 1);
    if (mobile) {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.screenshot({ path: 'tmp/calendar-qa/mobile-320.png' });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.goto(`${base}/?tab=heroes&view=calendar`);
    await page.locator('[role="tab"]').filter({ hasText: /^Heroes$/ }).waitFor({ state: 'attached' });
    await page.waitForURL(url => url.searchParams.get('view') !== 'calendar');
    assert.notEqual(new URL(page.url()).searchParams.get('view'), 'calendar');
    await page.close();
    console.log(`${mobile ? 'Mobile' : 'Desktop'} calendar navigation, filters, details, URL persistence, multi-day events, empty states, and layout passed.`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
