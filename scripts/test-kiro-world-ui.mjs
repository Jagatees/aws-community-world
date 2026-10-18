import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { distance2D } from '../src/utils/workshopWorldNavigation.js';

const base = process.env.COMMUNITY_TEST_URL || 'http://127.0.0.1:5175';
const catalog = JSON.parse(await readFile('src/data/workshops.json', 'utf8'));
const bedrock = catalog.services.find(service => service.name === 'Amazon Bedrock');
const ec2 = catalog.services.find(service => service.name === 'Amazon EC2');
const closed = catalog.services.find(service => !catalog.workshops.some(item => item.serviceIds.includes(service.id)));
const browser = await chromium.launch(); const errors = [];
await mkdir('tmp/workshops/kiro-qa', { recursive: true });
const position = (page, kind = 'player') => page.locator(`[data-${kind}]`).evaluate(node => ({ x: Number(node.getAttribute('cx')), z: Number(node.getAttribute('cy')) }));
const heading = page => page.locator('.world-map svg > path').last().evaluate(node => { const [x, z] = node.getAttribute('d').split(' l')[1].split(' ').map(Number); return Math.atan2(-x, -z); });
async function key(page, name, duration) { await page.locator('.world-canvas canvas').focus(); await page.keyboard.down(name); await page.waitForTimeout(duration); await page.keyboard.up(name); await page.waitForTimeout(220); }
async function choose(page, service) {
  await page.getByRole('button', { name: 'Call Kiro', exact: true }).click();
  await page.getByRole('region', { name: 'Kiro service guide' }).waitFor();
  await page.getByRole('textbox', { name: 'Find a service for Kiro' }).fill(service.name);
  await page.locator(`[data-guide-service="${service.id}"]`).click();
  await page.locator('[data-guide-route]').waitFor();
}
async function followFloorRoute(page) {
  const points = await page.locator('[data-guide-route]').getAttribute('points');
  const route = points.split(' ').map(point => { const [x, z] = point.split(',').map(Number); return { x, z }; });
  // Follow actual rendered waypoints with the same keyboard controls as a visitor.
  for (const target of route.slice(1)) {
    for (let tries = 0; tries < 65; tries++) {
      const current = await position(page); if (distance2D(current, target) < .65) break;
      const desired = Math.atan2(current.x - target.x, current.z - target.z), yaw = await heading(page);
      const difference = Math.atan2(Math.sin(desired - yaw), Math.cos(desired - yaw));
      if (Math.abs(difference) > .14) await key(page, difference > 0 ? 'ArrowLeft' : 'ArrowRight', Math.max(120, Math.min(650, Math.abs(difference) / 1.7 * 850)));
      else await key(page, 'w', Math.min(650, distance2D(current, target) / 3.5 * 750));
    }
    const final = await position(page);
    if (distance2D(final, target) >= .8) { await page.screenshot({ path: 'tmp/workshops/kiro-qa/route-failure.png' }); console.log({ route, target, final, heading: await heading(page), guide: await page.locator('.world-kiro').textContent() }); }
    assert.ok(distance2D(final, target) < .8, 'Visitor can walk along every floor-path leg');
  }
}

try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
    page.setDefaultTimeout(20000); page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/?view=workshops&mode=world`); await page.locator('[data-kiro]').waitFor();
    const startPlayer = await position(page), startKiro = await position(page, 'kiro');
    await page.waitForTimeout(1000);
    assert.ok(distance2D(startKiro, await position(page, 'kiro')) < .05, 'Reduced motion disables unrequested roaming');
    await choose(page, ec2);
    assert.ok(distance2D(startPlayer, await position(page)) < .1, 'Calling Kiro and choosing a guide destination does not teleport the user');
    assert.ok(distance2D(startKiro, await position(page, 'kiro')) > .5, 'Kiro physically comes closer when called');
    await page.locator('.world-kiro[data-waiting="true"]').waitFor().catch(async error => { await page.screenshot({ path: 'tmp/workshops/kiro-qa/waiting-failure.png' }); console.log({ mobile, player: await position(page), kiro: await position(page, 'kiro'), mode: await page.locator('.world-kiro').getAttribute('data-mode'), message: await page.locator('.world-kiro').textContent(), visibility: await page.evaluate(() => ({ focus: document.hasFocus(), visibility: document.visibilityState })) }); throw error; });
    await page.waitForTimeout(250); const waiting = await position(page, 'kiro');
    await page.waitForTimeout(500);
    assert.ok(distance2D(waiting, await position(page, 'kiro')) < .1, 'Kiro waits rather than leaving the visitor behind');
    await page.screenshot({ path: `tmp/workshops/kiro-qa/${mobile ? 'mobile' : 'desktop'}-waiting.png` });
    await page.getByRole('button', { name: 'Stop guidance', exact: true }).click();
    assert.equal(await page.locator('[data-guide-route]').count(), 0, 'Stopping removes the trail');
    await choose(page, bedrock);
    await followFloorRoute(page);
    await page.locator('.world-kiro[data-mode="arrived"]').waitFor();
    await page.waitForFunction(() => { const read = name => { const el = document.querySelector(`[data-${name}]`); return [Number(el.getAttribute('cx')), Number(el.getAttribute('cy'))]; }; const [px, pz] = read('player'), [kx, kz] = read('kiro'); return Math.hypot(px - kx, pz - kz) > 1.5; });
    assert.ok((await page.locator('.world-kiro').textContent()).includes(bedrock.name));
    await page.screenshot({ path: `tmp/workshops/kiro-qa/${mobile ? 'mobile' : 'desktop'}-arrived.png` });
    await page.getByRole('button', { name: new RegExp(`Enter ${bedrock.name}`) }).click();
    await page.getByRole('button', { name: 'Exit shop', exact: true }).waitFor();
    assert.equal(await page.locator('[data-guide-route]').count(), 0);
    await page.getByRole('button', { name: 'Exit shop', exact: true }).click();
    await choose(page, closed);
    assert.ok((await page.locator('.world-kiro').textContent()).includes('Closed'), 'Closed destinations remain clearly labelled');
    await page.getByRole('button', { name: 'Streets', exact: true }).click();
    const beforePause = await position(page, 'kiro'); await page.waitForTimeout(600);
    assert.ok(distance2D(beforePause, await position(page, 'kiro')) < .1, 'Opening a panel pauses the guide');
    await page.getByRole('button', { name: 'Visit Compute Street', exact: true }).click();
    assert.equal(await page.locator('[data-guide-route]').count(), 0, 'Fast travel clears the previous route');
    await page.getByRole('button', { name: 'Call Kiro', exact: true }).click();
    await page.getByRole('region', { name: 'Kiro service guide' }).waitFor();
    await page.getByRole('textbox', { name: 'Find a service for Kiro' }).fill('zzzz-no-such-service');
    assert.equal(await page.locator('[data-guide-service]').count(), 0);
    if (mobile) { await page.setViewportSize({ width: 320, height: 568 }); assert.ok(await page.locator('.walking-world').evaluate(node => node.scrollWidth <= node.clientWidth)); }
    await page.close();
  }
  const roam = await browser.newPage({ viewport: { width: 1200, height: 850 } }); roam.on('pageerror', error => errors.push(error.message));
  await roam.goto(`${base}/?view=workshops&mode=world`); await roam.locator('[data-kiro]').waitFor();
  const from = await position(roam, 'kiro'); await roam.waitForTimeout(4500);
  assert.ok(distance2D(from, await position(roam, 'kiro')) > .2, 'Kiro roams when reduced motion is off');
  await roam.close(); assert.deepEqual(errors, []);
} finally { await browser.close(); }
console.log('Kiro passed: summon, real walking route, waiting, arrival, open/closed shops, cancel, pause, fast travel, reduced motion, roaming and mobile layout.');
