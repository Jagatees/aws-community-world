// Run with Vite: node scripts/test-earth-clusters.mjs
// Exercise the real globe.gl renderer so its visibility and DOM lifecycle are covered.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.COMMUNITY_TEST_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/src/components/ClassicGlobeScene.jsx*', async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    assert.ok(source.includes('globeRef.current = globe;'), 'the test must instrument the real renderer');
    await route.fulfill({ response, body: source.replace('globeRef.current = globe;', `
      globeRef.current = globe;
      window.testGlobe = globe;
      window.testDataUpdates = 0;
      const originalHtmlElementsData = globe.htmlElementsData;
      globe.htmlElementsData = function (...args) {
        if (args.length) window.testDataUpdates += 1;
        return originalHtmlElementsData.apply(this, args);
      };
    `) });
  });
  await page.route('**/earth-cluster-test', (route) => route.fulfill({
    contentType: 'text/html',
    body: `<style>#root > div { width:1200px; height:720px; position:relative; }</style>
      <div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const reactModule = await import('/node_modules/.vite/deps/react.js');
      const React = reactModule.default || reactModule;
      const domModule = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { createRoot } = domModule.default || domModule;
      const { default: Scene } = await import('/src/components/ClassicGlobeScene.jsx');
      window.members = Array.from({length:360}, (_, index) => ({
        id:'group-' + index, name:'Group ' + index, lat:0, lng:index - 180,
        category:'cloud-clubs', avatarUrl:'/student-builder-group-logo.png', location:'Test location'
      }));
      window.members.push({...window.members[180], id:'same-location'});
      window.clicked = [];
      const root = createRoot(document.getElementById('root'));
      window.renderScene = (darkMode = false, alternate = false, members = window.members) => root.render(React.createElement(Scene, {
        category:'cloud-clubs', members, darkMode,
        onMarkerClick:payload => window.clicked.push({alternate, ids:(Array.isArray(payload) ? payload : [payload]).map(member => member.id)})
      }));
      window.renderScene();
    </script>`,
  }));
  await page.goto(`${baseUrl}/earth-cluster-test`);
  await page.waitForFunction(() => window.testGlobe?.htmlElementsData().length > 0).catch((error) => {
    throw new Error(errors.join('; ') || error.message);
  });
  const settle = () => page.waitForTimeout(180);
  await settle();
  const overview = await page.evaluate(() => ({
    markers:window.testGlobe.htmlElementsData().length,
    images:document.querySelectorAll('[data-globe-marker] img').length,
  }));
  assert.ok(overview.markers > 0 && overview.markers < 20, 'world view should mount only a few visible area groups');
  assert.equal(overview.images, 0, 'dense overview groups should not create portraits');

  // The old implementation jumped to all 360 locations below altitude 1.
  await page.evaluate(() => window.testGlobe.pointOfView({lat:0,lng:0,altitude:0.8}, 0));
  await settle();
  const regional = await page.evaluate(() => ({
    markers:window.testGlobe.htmlElementsData().length,
    approximate:window.testGlobe.htmlElementsData().some(point => point.isApproximate),
    images:document.querySelectorAll('[data-globe-marker] img').length,
  }));
  assert.ok(regional.markers > 0 && regional.markers < 100, 'regional zoom must keep a bounded visible marker set');
  assert.equal(regional.approximate, true, 'regional zoom should retain geographic groups');
  assert.equal(regional.images, 0, 'dense regional groups should remain compact count badges');

  await page.evaluate(() => window.testGlobe.pointOfView({lat:0,lng:0,altitude:0.18}, 0));
  await page.locator('[data-globe-marker="location"][aria-label="2 groups at this location"]').waitFor();
  await settle();
  const close = await page.evaluate(() => {
    window.centerMarker = document.querySelector('[aria-label="2 groups at this location"]');
    return {markers:window.testGlobe.htmlElementsData().length, approximate:window.testGlobe.htmlElementsData().some(point => point.isApproximate)};
  });
  assert.ok(close.markers > 0 && close.markers < 100, 'close zoom should mount exact locations only around the camera');
  assert.equal(close.approximate, false, 'close zoom must eventually expose source coordinates');
  await page.evaluate(() => window.renderScene(false, true));
  await settle();
  assert.equal(await page.evaluate(() => window.centerMarker === document.querySelector('[aria-label="2 groups at this location"]')), true,
    'callback changes must preserve existing marker DOM');
  await page.evaluate(() => window.centerMarker.click());
  assert.deepEqual(await page.evaluate(() => window.clicked.at(-1)), { alternate:true, ids:['group-180','same-location'] },
    'exact-location selection should retain every member and use the newest callback');

  await page.evaluate(() => window.testGlobe.pointOfView({lat:0,lng:120,altitude:0.18}, 0));
  await settle();
  assert.equal(await page.evaluate(() => window.testGlobe.htmlElementsData().some(point => point.members.some(member => member.id === 'group-180'))), false,
    'turning the globe must remove offscreen data from the HTML layer');
  assert.equal(await page.evaluate(() => window.testGlobe.htmlElementsData().some(point => point.members.some(member => member.id === 'group-300'))), true,
    'turning the globe must reveal previously offscreen source locations');
  await page.evaluate(() => window.testGlobe.pointOfView({lat:0,lng:0,altitude:0.18}, 0));
  await settle();
  assert.equal(await page.evaluate(() => window.centerMarker === document.querySelector('[aria-label="2 groups at this location"]')), true,
    'returning to a location should reuse its cached marker');
  const beforeIdle = await page.evaluate(() => window.testDataUpdates);
  await page.evaluate(() => {
    for (let index = 0; index < 120; index += 1) window.testGlobe.controls().dispatchEvent({type:'change'});
  });
  await settle();
  assert.equal(await page.evaluate(() => window.testDataUpdates), beforeIdle, 'unchanged visible membership must not rebuild the HTML layer');

  await page.evaluate(() => window.renderScene(true, true));
  await settle();
  assert.equal(await page.evaluate(() => window.centerMarker !== document.querySelector('[aria-label="2 groups at this location"]')), true,
    'theme changes should refresh marker appearance');
  await page.evaluate(() => window.renderScene(true, true, [{...window.members[180], id:'filtered', forceSeparateMarker:true}]));
  await settle();
  assert.deepEqual(await page.evaluate(() => window.testGlobe.htmlElementsData().flatMap(point => point.members.map(member => member.id))), ['filtered'],
    'filter updates must remove stale groups and preserve explicit standalone markers');
  assert.deepEqual(errors, [], 'Earth interactions must not throw browser errors');
  console.log(JSON.stringify({syntheticLocations:360, overview, regional, close, cachedDom:true, newestCallback:true, idleDataUpdates:0}, null, 2));
} finally {
  await browser.close();
}
