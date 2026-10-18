import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.COMMUNITY_TEST_URL || 'http://127.0.0.1:5175';
const catalog = JSON.parse(await readFile('src/data/workshops.json', 'utf8'));
const bedrock = catalog.services.find(item => item.name === 'Amazon Bedrock');
const stock = catalog.workshops.filter(item => item.serviceIds.includes(bedrock.id));
const closed = catalog.services.find(service => !catalog.workshops.some(item => item.serviceIds.includes(service.id)));
const browser = await chromium.launch();
const errors = [];
await mkdir('tmp/workshops/walk-qa', { recursive: true });
const position = page => page.locator('[data-player]').evaluate(node => ({ x: Number(node.getAttribute('cx')), z: Number(node.getAttribute('cy')) }));
async function walk(page, key, milliseconds) { await page.locator('.world-canvas canvas').focus(); await page.keyboard.down(key); await page.waitForTimeout(milliseconds); await page.keyboard.up(key); await page.waitForTimeout(220); }
async function directory(page, name = 'Find a shop') { await page.getByRole('button', { name, exact: true }).click(); await page.getByRole('region', { name: 'World directory' }).waitFor(); }

try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
    page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
    const label = mobile ? 'mobile' : 'desktop';
    await page.goto(`${base}/?view=workshops&category=AI+%26+Machine+Learning`);
    await page.getByRole('button', { name: '3D world', exact: true }).click();
    await page.locator('[data-player]').waitFor();
    assert.equal(new URL(page.url()).searchParams.get('mode'), 'world');
    if (!mobile) {
      await page.getByRole('button', { name: 'Mouse look', exact: true }).click();
      await page.waitForFunction(() => Boolean(document.pointerLockElement));
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.pointerLockElement);
    }
    await page.screenshot({ path: `tmp/workshops/walk-qa/${label}-street.png` });
    const start = await position(page);
    if (mobile) {
      const client = await page.context().newCDPSession(page);
      const pad = await page.getByRole('button', { name: 'Walk forward', exact: true }).boundingBox();
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pad.x + pad.width / 2, y: pad.y + pad.height / 2, id: 1 }] });
      await page.waitForTimeout(1000);
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(220); await client.detach();
    } else await walk(page, 'w', 1000);
    const moved = await position(page);
    assert.ok(moved.z > start.z + .3, `${label}: movement advances along the street`);
    await page.waitForTimeout(350);
    assert.ok(Math.abs((await position(page)).z - moved.z) < .4, 'Releasing controls stops walking');
    await page.getByRole('button', { name: 'Streets', exact: true }).click();
    await page.getByRole('region', { name: 'Category streets' }).waitFor();
    assert.equal(await page.locator('[data-street]').count(), new Set(catalog.services.map(service => service.category)).size);
    await page.getByRole('button', { name: 'Visit Storage Street', exact: true }).click();
    await page.locator('.world-location h2').filter({ hasText: /^Storage Street$/ }).waitFor();
    assert.equal(await page.getByRole('region', { name: 'Category streets' }).count(), 0);
    await page.screenshot({ path: `tmp/workshops/walk-qa/${label}-category-street.png` });
    await directory(page);
    assert.equal(await page.getByRole('combobox', { name: 'Shop category' }).inputValue(), 'AI & Machine Learning');
    await page.getByRole('combobox', { name: 'Shop category' }).selectOption('');
    await page.getByRole('textbox', { name: 'Find a service shop' }).fill('Bedrock');
    const beforeSearch = await position(page);
    await page.getByRole('textbox', { name: 'Find a service shop' }).press('w');
    assert.deepEqual(await position(page), beforeSearch, 'Typing in the directory never moves the player');
    await page.getByRole('textbox', { name: 'Find a service shop' }).fill('Bedrock');
    await page.locator(`[data-shop="${bedrock.id}"]`).click();
    await page.getByRole('button', { name: new RegExp(`Enter ${bedrock.name}`) }).waitFor();
    await page.screenshot({ path: `tmp/workshops/walk-qa/${label}-door.png` });
    assert.equal(new URL(page.url()).searchParams.get('service'), null, 'Fast travel stops outside the shop');
    // Physically cross the open doorway with forward movement, without clicking Enter.
    await page.locator('.world-canvas canvas').focus(); await page.keyboard.down('w');
    await page.waitForURL(url => url.searchParams.get('service') === bedrock.id);
    await page.keyboard.up('w');
    await page.getByRole('button', { name: 'Exit shop', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('service'), bedrock.id);
    await page.screenshot({ path: `tmp/workshops/walk-qa/${label}-inside.png` });
    await page.locator('.world-canvas canvas').focus(); await page.keyboard.down('w');
    await page.locator('.world-interaction button').filter({ hasText: 'Explore workshop' }).waitFor();
    await page.keyboard.up('w');
    const itemPrompt = page.locator('.world-interaction button');
    await itemPrompt.waitFor();
    const itemTitle = await itemPrompt.locator('strong').textContent();
    await page.locator('.world-canvas canvas').focus(); await page.keyboard.press('e');
    const item = stock.find(workshop => workshop.title === itemTitle);
    assert.ok(item, 'Nearby item is a real workshop belonging to this service');
    const link = page.getByRole('link', { name: 'Open workshop', exact: true }); await link.waitFor();
    assert.equal(await link.getAttribute('href'), item.url); assert.equal(await link.getAttribute('target'), '_blank');
    await page.screenshot({ path: `tmp/workshops/walk-qa/${label}-item.png` });
    await page.getByRole('button', { name: 'Keep exploring the shop', exact: true }).click();
    await directory(page, 'Workshops');
    assert.deepEqual((await page.locator('[data-workshop-item]').evaluateAll(nodes => nodes.map(node => node.dataset.workshopItem))).sort(), stock.map(item => item.id).sort(), 'All workshop items are accessible without shelf pagination');
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await page.getByRole('button', { name: 'Streets', exact: true }).click();
    await page.getByRole('button', { name: 'Visit Compute Street', exact: true }).click();
    await page.locator('.world-location h2').filter({ hasText: /^Compute Street$/ }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('service'), null, 'Jumping to a category exits the current shop');
    await directory(page);
    await page.locator(`[data-shop="${bedrock.id}"]`).click();
    await page.getByRole('button', { name: new RegExp(`Enter ${bedrock.name}`) }).click();
    await page.getByRole('button', { name: 'Exit shop', exact: true }).waitFor();
    await page.reload(); await page.getByRole('button', { name: 'Exit shop', exact: true }).waitFor();
    // The entrance is behind the player on reload. Walking backward leaves through it.
    await page.locator('.world-canvas canvas').focus(); await page.keyboard.down('s');
    await page.waitForURL(url => !url.searchParams.get('service')); await page.keyboard.up('s');
    await page.getByRole('button', { name: 'Find a shop', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('service'), null);
    await directory(page); await page.getByRole('textbox', { name: 'Find a service shop' }).fill(closed.name);
    await page.locator(`[data-shop="${closed.id}"]`).click();
    await page.getByRole('button', { name: new RegExp(`${closed.name} is closed`) }).waitFor();
    await walk(page, 'w', 3200);
    const blocked = await position(page);
    await walk(page, 'w', 700);
    const stillBlocked = await position(page);
    assert.ok(Math.hypot(stillBlocked.x - blocked.x, stillBlocked.z - blocked.z) < .1, 'Closed shutter blocks further movement');
    assert.equal(new URL(page.url()).searchParams.get('service'), null);
    await page.keyboard.press('e'); await page.getByRole('region', { name: 'Closed shop' }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Open workshop', exact: true }).count(), 0);
    await page.screenshot({ path: `tmp/workshops/walk-qa/${label}-closed.png` });
    await page.getByRole('button', { name: 'Keep walking', exact: true }).click();
    await page.getByRole('button', { name: 'Streets', exact: true }).click();
    await page.getByRole('button', { name: 'Visit Space Street', exact: true }).click();
    await page.locator('.world-location h2').filter({ hasText: /^Space Street$/ }).waitFor();
    assert.ok((await page.locator('.world-location p').textContent()).includes('0 open shops'));
    await directory(page); await page.getByRole('checkbox', { name: 'Open shops only' }).check();
    await page.getByRole('heading', { name: 'No shops match', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
    await page.locator('[data-player]').waitFor();
    assert.equal(await page.locator('.walking-world').evaluate(el => el.scrollWidth <= el.clientWidth), true);
    if (mobile) { await page.setViewportSize({ width: 320, height: 568 }); assert.equal(await page.locator('.walking-world').evaluate(el => el.scrollWidth <= el.clientWidth), true); }
    await page.getByRole('button', { name: 'Card view', exact: true }).click();
    await page.getByRole('heading', { name: 'Explore AWS services', exact: true }).waitFor();
    await page.goBack(); await page.getByRole('heading', { name: 'Workshop world', exact: true }).waitFor();
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }

const fallbackBrowser = await chromium.launch({ args: ['--disable-webgl'] });
try {
  const page = await fallbackBrowser.newPage();
  await page.goto(`${base}/?view=workshops&mode=world`);
  await page.getByRole('button', { name: 'Open directory', exact: true }).click();
  await page.locator(`[data-shop="${bedrock.id}"]`).click();
  await page.locator('[data-workshop-item]').first().click();
  assert.ok(await page.getByRole('link', { name: 'Open workshop', exact: true }).getAttribute('href'));
} finally { await fallbackBrowser.close(); }
console.log('Walkable world passed: keyboard/touch movement, physical entry and exit, workshop interaction, all inventory, closed-door collision, filters, themes, history, mobile layout, and WebGL fallback.');
