// Run against Vite: node scripts/test-community-ui.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.COMMUNITY_TEST_URL || 'http://127.0.0.1:5173';
const datasetTotal = async (name) => JSON.parse(await readFile(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8')).length.toLocaleString('en-US') + ' entries';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${baseUrl}/?tab=cloud-clubs&view=orbit`);
  await page.waitForFunction(() => document.querySelectorAll('[data-globe-marker]').length > 20);
  const worldCount = await page.locator('[data-globe-marker]').count();
  assert.ok(worldCount < 100, `World view should group 478 source locations, got ${worldCount}`);
  await page.locator('[data-globe-marker="area"]:visible').first().click();
  await page.waitForFunction((previous) => document.querySelectorAll('[data-globe-marker]').length > previous, worldCount);
  await page.waitForTimeout(1000); // Allow the globe's camera/detail changes to settle.
  const zoomedCount = await page.locator('[data-globe-marker]').count();
  assert.ok(zoomedCount > worldCount, `Settled zoom should reveal more locations: ${worldCount} → ${zoomedCount}`);
  console.log(`Earth zoom reveals more locations: ${worldCount} → ${zoomedCount}`);

  await page.getByRole('button', { name: 'Directory', exact: true }).click();
  await page.getByRole('heading', { name: 'Student Builder Groups', exact: true }).waitFor();
  assert.equal(await page.locator('article').count(), 60);
  for (const [tab, heading, dataset] of [['Community Builders', 'Community Builders', 'community-builders'], ['User Groups', 'AWS User Groups', 'user-groups'], ['Heroes', 'AWS Heroes', 'heroes'], ['Community Builders', 'Community Builders', 'community-builders']]) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await page.getByRole('heading', { name: heading, exact: true }).waitFor();
    await page.getByText(await datasetTotal(dataset), { exact: true }).waitFor();
    assert.equal(await page.locator('article').count(), 60);
  }
  await page.getByRole('searchbox').fill('zzzz-no-matching-person');
  await page.getByText('No matching entries', { exact: true }).waitFor();
  console.log('Category switching, cached data, bounded directory and search pass');

  // Exercise the actual popup with a dense cluster, independently of geocoding.
  await page.route('**/profile-performance-test', (route) => route.fulfill({ contentType: 'text/html', body: `
    <div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const reactModule = await import('/node_modules/.vite/deps/react.js');
      const React = reactModule.default || reactModule;
      const domModule = await import('/node_modules/.vite/deps/react-dom_client.js');
      const {createRoot} = domModule.default || domModule;
      const {default: ProfileCard} = await import('/src/components/ProfileCard.jsx');
      const members = Array.from({length:1000}, (_, index) => ({id:String(index),name:'Member '+String(index).padStart(4,'0'),category:'heroes',location:'Singapore',socialLinks:{}}));
      const root = createRoot(document.querySelector('#root'));
      root.render(React.createElement(ProfileCard, {member:members,darkMode:true,onClose:()=>root.unmount()}));
    </script>` }));
  await page.goto(`${baseUrl}/profile-performance-test`);
  await page.getByRole('dialog').waitFor().catch((error) => { throw new Error(errors.join('; ') || error.message); });
  assert.equal(await page.locator('li').count(), 30);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByText('31–60 of 1,000', { exact: true }).waitFor();
  assert.equal(await page.locator('li').count(), 30);
  await page.getByRole('searchbox').fill('Member 0999');
  await page.getByText('1–1 of 1', { exact: true }).waitFor();
  assert.equal(await page.locator('li').count(), 1);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.deepEqual(errors, []);
  console.log('1,000-member popup: 30 mounted rows, pagination, last-record search and Escape pass');
} finally {
  await browser.close();
}
