// Run against Vite: node scripts/test-minimal-globe-animation.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.COMMUNITY_TEST_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.routeWebSocket('**', socket => socket.onMessage(() => {}));
  await page.route('**/src/components/GlobeScene.jsx*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    assert.ok(source.includes('wakeRendererRef.current = wakeRenderer;'));
    await route.fulfill({ response, body: source
      .replace('wakeRendererRef.current = wakeRenderer;', `wakeRendererRef.current = wakeRenderer;
        window.testMinimalSetScale = value => { scaleRef.current = value; autoRotateEnabledRef.current = false; wakeRenderer(); };
      `)
      .replace('const clusterAnimating = hasGlobeClusterTransitions(clusterRecords);', `
        const clusterAnimating = hasGlobeClusterTransitions(clusterRecords);
        window.minimalFrames ||= [];
        window.minimalFrames.push({ time: renderTime, animating: clusterAnimating,
          records: clusterRecords.map(record => ({ lat: record.lat, lng: record.lng, targetLat: record.cluster.lat,
            targetLng: record.cluster.lng, alpha: record.alpha, exiting: record.exiting, complete: record.complete,
            approximate: Boolean(record.cluster.isApproximate), count: record.members.length })) });
        window.testMinimalCanvas = markerCanvasRef.current;
      `)
      .replace(/projectedMarkersRef\.current = projected\.filter\([^;]+;/, `
        projectedMarkersRef.current = projected.filter(marker => !marker.exiting);
        window.testMinimalHitTargets = projectedMarkersRef.current.map(record => ({ exiting: record.exiting }));
      `),
    });
  });
  await page.route('**/minimal-animation-test', route => route.fulfill({
    contentType: 'text/html', body: `<style>#root > div{width:1100px;height:700px;position:relative}</style>
    <div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => type => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    const reactModule = await import('/node_modules/.vite/deps/react.js');
    const React = reactModule.default || reactModule;
    const domModule = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { createRoot } = domModule.default || domModule;
    const { default: Scene } = await import('/src/components/GlobeScene.jsx');
    window.members = Array.from({length:240}, (_, index) => ({id:index, name:'Person '+index,
      lat:(index % 10)*0.5, lng:-110+Math.floor(index/10)*1.2, category:'heroes', location:'Testland'}));
    window.clicked = [];
    const root = createRoot(document.getElementById('root'));
    root.render(React.createElement(Scene, {category:'heroes', members:window.members, darkMode:true,
      onMarkerClick:payload => window.clicked.push(payload)}));
    </script>`,
  }));
  await page.goto(`${baseUrl}/minimal-animation-test`);
  await page.waitForFunction(() => window.minimalFrames?.at(-1)?.records.length > 0);
  await page.evaluate(() => window.testMinimalSetScale(0.95));
  await page.waitForTimeout(60);
  const snapshot = () => page.evaluate(() => {
    const frame = window.minimalFrames.at(-1);
    const active = frame.records.filter(record => !record.exiting);
    return { animating: frame.animating, active: active.length, count: active.reduce((sum, record) => sum + record.count, 0),
      exits: frame.records.filter(record => record.exiting && !record.complete).length,
      exact: active.every(record => record.lat === record.targetLat && record.lng === record.targetLng),
      approximate: active.some(record => record.approximate), frames: window.minimalFrames.length };
  });
  const overview = await snapshot();
  assert.equal(overview.count, 240);
  assert.ok(overview.active < 20);
  await page.evaluate(() => window.testMinimalSetScale(1.6));
  await page.waitForFunction(() => window.minimalFrames.at(-1)?.animating);
  await page.waitForTimeout(60);
  const moving = await page.evaluate(() => {
    const frame = window.minimalFrames.at(-1);
    return { children: frame.records.some(record => !record.exiting && Math.abs(record.lng - record.targetLng) > 0.001),
      ghostSafe: window.testMinimalHitTargets.every(record => !record.exiting),
      canvas: window.testMinimalCanvas.toDataURL() };
  });
  assert.equal(moving.children, true, 'Minimal children must travel from their previous parent');
  assert.equal(moving.ghostSafe, true, 'outgoing dots must never remain click targets');
  await page.waitForTimeout(450);
  const regional = await snapshot();
  assert.equal(regional.count, 240);
  assert.equal(regional.animating, false);
  assert.equal(regional.exits, 0);
  assert.ok(regional.active > overview.active);
  assert.notEqual(await page.evaluate(() => window.testMinimalCanvas.toDataURL()), moving.canvas,
    'marker canvas must render animation frames after the zoom input stops');
  const frames = regional.frames;
  await page.waitForTimeout(100);
  assert.equal((await snapshot()).frames, frames, 'settled manually zoomed Minimal globe must pause the GPU loop');

  await page.evaluate(() => window.testMinimalSetScale(0.95));
  await page.waitForFunction(() => window.minimalFrames.at(-1)?.animating);
  await page.waitForTimeout(60);
  assert.equal(await page.evaluate(() => window.minimalFrames.at(-1).records.some(record => record.exiting
    && Math.abs(record.lng - record.targetLng) > 0.001 && record.alpha > 0 && record.alpha < 1)), true,
    'merge must move and fade outgoing children');
  await page.evaluate(() => window.testMinimalSetScale(2.82));
  await page.waitForTimeout(500);
  const exact = await snapshot();
  assert.equal(exact.active, 240);
  assert.equal(exact.count, 240);
  assert.equal(exact.approximate, false);
  assert.equal(exact.exact, true);
  assert.equal(exact.exits, 0);

  await page.evaluate(() => window.testMinimalSetScale(0.95));
  await page.waitForFunction(() => window.minimalFrames.at(-1)?.animating);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => !window.minimalFrames.at(-1)?.animating);
  const reduced = await snapshot();
  assert.equal(reduced.count, 240);
  assert.equal(reduced.exits, 0);
  await page.evaluate(() => window.testMinimalSetScale(1.6));
  await page.waitForFunction(() => window.minimalFrames.at(-1)?.records.filter(record => !record.exiting).length > 2);
  assert.equal((await snapshot()).animating, false);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ renderer: 'Cobe Minimal', overview: overview.active, regional: regional.active,
    exactLocations: exact.active, count: exact.count, actualCanvasAnimation: true, rapidReverse: true,
    reducedMotion: true, idleGpuPaused: true }, null, 2));
} finally {
  await browser.close();
}
