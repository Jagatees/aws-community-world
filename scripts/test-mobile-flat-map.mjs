// Run against Vite or its production preview. BROWSER=webkit exercises Safari's engine.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, webkit, devices } from 'playwright';

const baseUrl = process.env.MAP_TEST_URL || 'http://127.0.0.1:5173';
const browser = await (process.env.BROWSER === 'webkit' ? webkit : chromium).launch();
const mapSelector = 'svg[aria-label="Flat world map"]';
await mkdir('tmp', { recursive: true });

try {
  for (const deviceName of ['iPhone 13', 'iPad Pro 11']) {
    const page = await browser.newPage(devices[deviceName]);
    const errors = [];
    const heavyRequests = [];
    // Headless machines may have no GPU. Advertise WebGL support so this
    // verifies proactive touch routing, rather than the existing no-WebGL fallback.
    if (process.env.BROWSER !== 'webkit') await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (!this.isConnected && type === 'webgl') return { getExtension: () => null };
        return getContext.call(this, type, ...args);
      };
    });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (/mapbox|globe\.gl|three\.module/i.test(request.url())) heavyRequests.push(request.url());
    });
    await page.route('**/*', (route) => new URL(route.request().url()).origin === new URL(baseUrl).origin ? route.continue() : route.abort());
    const assertLightMap = async () => {
      await page.locator(`${mapSelector} [data-marker-interactive]`).first().waitFor().catch((error) => {
        throw new Error(errors.join('; ') || error.message);
      });
      assert.equal(await page.locator('canvas').count(), 0, 'Flat view must not mount a WebGL canvas on touch devices');
      assert.equal(await page.locator(`${mapSelector} image, ${mapSelector} filter`).count(), 0, 'Map must avoid bulk portrait decoding and SVG blur surfaces');
    };

    await page.goto(`${baseUrl}/?view=flat`);
    await assertLightMap();
    await page.getByRole('button', { name: 'Zoom in flat map', exact: true }).click();
    await page.getByText('Zoom 1.4x', { exact: true }).waitFor();
    // Verify drag distance in screen pixels after scaling the SVG to a phone.
    const svg = page.locator(mapSelector);
    const bounds = await svg.boundingBox();
    const x = bounds.x + bounds.width * 0.45;
    const y = bounds.y + bounds.height * 0.9;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 20, y, { steps: 5 });
    await page.mouse.up();
    const shift = await svg.locator(':scope > g').evaluate((group) => group.transform.baseVal.consolidate().matrix.e);
    assert.ok(Math.abs(shift * bounds.width / 1000 - 20) < 2, `Pan should follow a 20px drag, got ${shift}`);
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await page.getByText('Zoom 1.0x', { exact: true }).waitFor();
    await page.screenshot({ path: `tmp/flat-map-${deviceName.replaceAll(' ', '-')}.png`, animations: 'disabled' });

    if (deviceName === 'iPhone 13') {
      await page.getByRole('button', { name: 'More', exact: true }).click();
      await page.getByRole('button', { name: 'Directory', exact: true }).click();
      await page.getByRole('heading', { name: 'AWS Heroes', exact: true }).waitFor();
      await page.getByRole('button', { name: 'More', exact: true }).click();
      await page.getByRole('button', { name: 'Map', exact: true }).click();
      await assertLightMap();
      await page.setViewportSize({ width: 844, height: 390 });
      await assertLightMap();
      await page.setViewportSize(devices[deviceName].viewport);
    }

    await page.goto(`${baseUrl}/?view=flat&country=Singapore`);
    await assertLightMap();
    // Select the cluster, then its members after zooming into the location.
    for (let attempt = 0; attempt < 4 && await page.getByRole('dialog').count() === 0; attempt += 1) {
      await page.locator(`${mapSelector} [data-marker-interactive]`).last().tap();
    }
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    for (const category of ['community-builders', 'user-groups', 'cloud-clubs', 'community-days', 'builder-lofts']) {
      await page.goto(`${baseUrl}/?view=flat&tab=${category}`);
      await assertLightMap();
    }
    await page.goto(`${baseUrl}/?view=flat&theme=light`);
    await assertLightMap();
    await page.reload();
    await assertLightMap();
    assert.deepEqual(heavyRequests, [], 'Touch flat view must never download satellite/WebGL renderers');
    assert.deepEqual(errors, [], 'No browser runtime errors');
    console.log(`${deviceName}: direct public links, zoom, pan, reset, profiles, categories, theme and reload passed`);
    await page.close();
  }
} finally {
  await browser.close();
}
