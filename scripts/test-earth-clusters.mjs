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
  // Keep a source edit from replacing the mounted real renderer halfway
  // through the sampled transition.
  await page.routeWebSocket('**', socket => socket.onMessage(() => {}));
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
        category:'cloud-clubs', members, darkMode, cardOpen:true,
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

  // Keep the full synthetic area inside the camera so its displayed counts can
  // be compared throughout a split, a merge, and a rapid zoom reversal.
  await page.evaluate(() => {
    window.animationMembers = Array.from({length:180}, (_, index) => ({
      id:'animated-' + index, name:'Animated group ' + index, lat:0, lng:index * 0.035,
      category:'cloud-clubs', avatarUrl:'/student-builder-group-logo.png', location:'Dense test area',
    }));
    window.originalAnimationMembers = JSON.stringify(window.animationMembers);
    window.renderScene(true, true, window.animationMembers);
    window.testGlobe.pointOfView({lat:0,lng:3.13,altitude:2.5}, 0);
  });
  await settle();
  const animationSnapshot = () => page.evaluate(() => {
    const points = window.testGlobe.htmlElementsData();
    const active = points.filter(point => !point.exiting);
    return {
      markers:active.length,
      represented:active.reduce((count, point) => count + point.members.length, 0),
      exits:points.filter(point => point.exiting).length,
    };
  });
  const animatedOverview = await animationSnapshot();
  assert.deepEqual(animatedOverview, {markers:1, represented:180, exits:0}, 'dense world overview should combine every source record');
  const clicksBeforeArea = await page.evaluate(() => window.clicked.length);
  await page.locator('[data-globe-marker="area"]').click();
  await settle();
  assert.ok(await page.evaluate(() => window.testGlobe.pointOfView().altitude < 2.2), 'an area click must advance Earth to the next detail level');
  await page.locator('[data-globe-marker="area"]').click();
  await settle();
  assert.ok(await page.evaluate(() => window.testGlobe.pointOfView().altitude < 1.5), 'reused area DOM must use its current detail level on the next click');
  assert.equal(await page.evaluate(() => window.clicked.length), clicksBeforeArea, 'area clicks should reveal detail before opening member profiles');
  await page.evaluate(() => window.testGlobe.pointOfView({lat:0,lng:3.13,altitude:2.5}, 0));
  await settle();
  await page.emulateMedia({reducedMotion:'no-preference'});

  const sampleTransition = altitude => page.evaluate(async nextAltitude => {
    const globe = window.testGlobe;
    const samples = [];
    const distance = (first, second) => Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);
    const sample = () => {
      const points = globe.htmlElementsData();
      const moving = points.flatMap(point => {
        const source = point.cluster ?? point;
        const object = point.__threeObjHtml;
        if (!object || source.lng < 3) return [];
        const altitudeAccessor = globe.htmlAltitude();
        const markerAltitude = typeof altitudeAccessor === 'function' ? altitudeAccessor(point) : altitudeAccessor;
        const origin = globe.getCoords(0, 0, markerAltitude);
        const target = globe.getCoords(source.lat, source.lng, markerAltitude);
        return [{
          id:source.members[0].id, exiting:Boolean(point.exiting),
          sourceLng:source.lng, renderedLng:point.lng,
          fromOrigin:distance(object.position, origin), fromSource:distance(object.position, target),
        }];
      });
      const exits = [...document.querySelectorAll('[data-cluster-exiting="true"]')];
      // Reconciliation may prepare outgoing records between paints. Count the
      // currently rendered, accessible marker nodes rather than that staged data.
      const rendered = [...document.querySelectorAll('[data-globe-marker]')]
        .filter(element => !element.inert && element.getAttribute('aria-hidden') !== 'true');
      samples.push({
        represented:rendered.reduce((count, element) => count + Number(element.getAttribute('aria-label')?.match(/^(\d+) groups/)?.[1] ?? 0), 0),
        moving,
        exitsSafe:exits.every(element => element.inert && element.getAttribute('aria-hidden') === 'true' && element.style.pointerEvents === 'none'),
      });
    };
    let running = true;
    // globe.gl applies its public data setters in a debounced next task. Read
    // after that commit instead of halfway through the current RAF callbacks.
    const sampleFrame = () => { setTimeout(sample, 0); if (running) requestAnimationFrame(sampleFrame); };
    requestAnimationFrame(sampleFrame);
    globe.pointOfView({lat:0,lng:3.13,altitude:nextAltitude}, 0);
    await new Promise(resolve => setTimeout(resolve, 560));
    running = false;
    sample();
    return samples;
  }, altitude);

  const splitSamples = await sampleTransition(0.8);
  assert.ok(splitSamples.some(sample => sample.moving.some(point => !point.exiting
    && point.renderedLng > 0.001 && point.renderedLng < point.sourceLng - 0.001
    && point.fromOrigin > 0.001 && point.fromSource > 0.001)),
  'Earth split must move real CSS2D objects through intermediate world coordinates');
  assert.ok(splitSamples.every(sample => sample.represented === 180), `every committed animated split frame must preserve represented members: ${splitSamples.map(sample => sample.represented).join(',')}`);
  assert.ok(splitSamples.every(sample => sample.exitsSafe), 'outgoing Earth markers must be decorative and inert');
  const animatedRegional = await animationSnapshot();
  assert.deepEqual(animatedRegional, {markers:2, represented:180, exits:0}, 'split must settle into smaller accurate groups');
  assert.ok(splitSamples.at(-1).moving.every(point => point.fromSource < 0.0001), 'settled CSS2D objects must reach their actual source coordinates');

  const mergeSamples = await sampleTransition(2.5);
  assert.ok(mergeSamples.some(sample => sample.moving.some(point => point.exiting
    && point.renderedLng > 0.001 && point.renderedLng < point.sourceLng - 0.001
    && point.fromOrigin > 0.001 && point.fromSource > 0.001)),
  'Earth merge must move outgoing CSS2D objects toward their new parent');
  assert.ok(mergeSamples.every(sample => sample.represented === 180), 'every animated merge frame must preserve represented members');
  assert.deepEqual(await animationSnapshot(), animatedOverview, 'merging must remove outgoing nodes and return to the original count');

  await page.evaluate(async () => {
    window.testGlobe.pointOfView({lat:0,lng:3.13,altitude:0.8}, 0);
    await new Promise(resolve => setTimeout(resolve, 90));
    window.testGlobe.pointOfView({lat:0,lng:3.13,altitude:2.5}, 0);
  });
  await page.waitForTimeout(500);
  assert.deepEqual(await animationSnapshot(), animatedOverview, 'rapid reversal must settle without duplicate counts or lingering exits');

  await page.evaluate(() => window.testGlobe.pointOfView({lat:0,lng:3.13,altitude:0.8}, 0));
  await page.waitForFunction(() => window.testGlobe.htmlElementsData().some(point => point.exiting));
  await page.emulateMedia({reducedMotion:'reduce'});
  const interruptedMotion = await page.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const points = window.testGlobe.htmlElementsData();
    return {
      represented:points.filter(point => !point.exiting).reduce((count, point) => count + point.members.length, 0),
      exits:points.filter(point => point.exiting).length,
      visibleOutgoingNodes:[...document.querySelectorAll('[data-cluster-exiting="true"]')].filter(element => {
        const style = getComputedStyle(element);
        return Number(style.opacity) > 0.001 && style.display !== 'none' && style.visibility !== 'hidden';
      }).length,
      settled:points.every(point => !point.transition && point.lat === point.cluster.lat && point.lng === point.cluster.lng),
    };
  });
  assert.deepEqual(interruptedMotion, {represented:180, exits:0, visibleOutgoingNodes:0, settled:true},
    'enabling reduced motion during a split must settle on the next rendered frames without visible outgoing nodes');
  await settle();
  assert.equal(await page.locator('[data-cluster-exiting="true"]').count(), 0, 'native outgoing nodes must finish detaching after reduced motion is enabled');
  assert.deepEqual(await animationSnapshot(), animatedRegional, 'reduced motion must split immediately without outgoing animation nodes');
  await page.evaluate(() => window.testGlobe.pointOfView({lat:0,lng:3.13,altitude:0.18}, 0));
  await settle();
  const animatedDetail = await animationSnapshot();
  assert.deepEqual(animatedDetail, {markers:180, represented:180, exits:0}, 'close Earth zoom must reveal all exact source locations in the area');
  assert.equal(await page.evaluate(() => JSON.stringify(window.animationMembers) === window.originalAnimationMembers), true,
    'animated movement must never mutate source member coordinates');

  const animationIdle = await page.evaluate(() => window.testDataUpdates);
  await page.evaluate(() => {
    for (let index = 0; index < 120; index += 1) window.testGlobe.controls().dispatchEvent({type:'change'});
  });
  await settle();
  assert.equal(await page.evaluate(() => window.testDataUpdates), animationIdle, 'settled animation must not rebuild the HTML layer while idle');
  assert.deepEqual(errors, [], 'Earth interactions must not throw browser errors');
  console.log(JSON.stringify({syntheticLocations:360, overview, regional, close, cachedDom:true, newestCallback:true, idleDataUpdates:0,
    animatedWorldPositions:true, splitMergeCounts:180, rapidReversal:true, reducedMotion:true}, null, 2));
} finally {
  await browser.close();
}
