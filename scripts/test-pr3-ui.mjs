import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:4183';
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${origin}/?tab=cloud-clubs&view=list&country=Sri%20Lanka`);
    await page.getByText('11 entries', { exact: true }).waitFor();
    assert.equal(await page.locator('article').count(), 11);
    await page.getByRole('button', { name: /AWS Student Builder Group at Institute of Technology, University of Moratuwa/ }).click();
    await page.getByRole('button', { name: 'Close', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.goto(`${origin}/?tab=cloud-clubs&view=icons&country=Sri%20Lanka`);
    const slider = page.getByRole('slider', { name: 'Move through archive columns' });
    await slider.waitFor();
    await slider.focus(); await slider.press('End');
    assert.equal(await slider.inputValue(), await slider.getAttribute('max'));
    await slider.press('Home');
    await page.getByRole('textbox', { name: 'Search student builder groups' }).fill('Institute of Technology, University of Moratuwa');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Open AWS Student Builder Group at Institute of Technology, University of Moratuwa,/ }).click();
    await page.getByText('Naami Ahmed', { exact: true }).waitFor();
    assert.ok(await page.getByRole('link', { name: /Builder profile/ }).count());
    assert.ok(await page.getByRole('link', { name: /GitHub/ }).count());
    await page.getByRole('button', { name: 'Close hero details' }).click();
    await page.getByRole('textbox', { name: 'Search student builder groups' }).fill('');
    await page.getByRole('button', { name: /^Open AWS Student Builder Group/ }).first().click();
    await page.getByRole('button', { name: 'Next hero', exact: true }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Previous hero', exact: true }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Close hero details' }).click();
    await page.goto(`${origin}/?tab=cloud-clubs&view=sleek&country=Sri%20Lanka`);
    await page.locator('canvas').first().waitFor();
    await page.waitForTimeout(1500);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: 11 groups, ITUM leader, archive slider and navigation, Minimal globe; no runtime errors`);
    await page.close();
  }
} finally { await browser.close(); }


