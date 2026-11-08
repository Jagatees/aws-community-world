// Run with Vite: node scripts/test-svg-map-clusters.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.MAP_TEST_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/svg-cluster-test', route => route.fulfill({ contentType: 'text/html', body: `
    <div id="root" style="width:1000px;height:650px"></div><script type="module">
    import '/src/index.css';
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    const reactModule = await import('/node_modules/.vite/deps/react.js');
    const React = reactModule.default || reactModule;
    const domModule = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { createRoot } = domModule.default || domModule;
    const { default: Scene } = await import('/src/components/FlatMapScene.jsx');
    const members = Array.from({ length: 20 }, (_, index) => ({ id: index, name: 'Person ' + index, lat: 0, lng: index - 9.5, category: 'heroes' }));
    window.clicked = [];
    const root = createRoot(document.getElementById('root'));
    window.renderScene = target => root.render(React.createElement(Scene, { category: 'heroes', members, lightweight: true, darkMode: true, flyToTarget: target, onMarkerClick: payload => window.clicked.push(payload) }));
    window.renderScene();
    </script>` }));
  await page.goto(`${baseUrl}/svg-cluster-test`);
  const activeSelector = '[data-svg-cluster-key]';
  await page.locator(activeSelector).first().waitFor();
  await page.waitForTimeout(400);
  const state = () => page.evaluate(() => ({
    total: [...document.querySelectorAll('[data-cluster-count]')].reduce((sum, node) => sum + Number(node.dataset.clusterCount), 0),
    markers: document.querySelectorAll('[data-svg-cluster-key]').length,
    ghosts: document.querySelectorAll('[data-map-cluster-exiting]').length,
  }));
  const initial = await state();
  assert.equal(initial.total, 20);
  assert.ok(initial.markers < 20);

  await page.getByRole('button', { name: 'Zoom in flat map', exact: true }).click();
  await page.getByText('Zoom 1.4x', { exact: true }).waitFor();
  const splitting = await page.evaluate(() => {
    const animations = document.getAnimations().filter(animation => animation.effect?.target.closest('svg'));
    const moving = animations.some(animation => {
      const frames = animation.effect.getKeyframes();
      return frames[0].transform !== frames.at(-1).transform;
    });
    return {
      moving,
      animations: animations.length,
      ghostsSafe: [...document.querySelectorAll('[data-map-cluster-exiting]')].every(node => node.getAttribute('aria-hidden') === 'true' && !node.querySelector('[data-marker-interactive]')),
    };
  });
  assert.ok(splitting.animations > 0 && splitting.moving, 'split must animate marker positions');
  assert.equal(splitting.ghostsSafe, true, 'decorative old clusters must not duplicate click targets');
  assert.equal((await state()).total, 20);
  await page.waitForTimeout(380);
  const detailed = await state();
  assert.ok(detailed.markers > initial.markers);
  assert.equal(detailed.ghosts, 0);

  await page.getByRole('button', { name: 'Zoom out flat map', exact: true }).click();
  await page.getByText('Zoom 1.0x', { exact: true }).waitFor();
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('[data-map-cluster-exiting]')].some(node => node.getAnimations().some(animation => {
    const frames = animation.effect.getKeyframes();
    return frames[0].transform !== frames.at(-1).transform;
  }))), 'merging children must travel toward their new parent');
  await page.waitForTimeout(380);
  assert.deepEqual(await state(), initial);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Zoom in flat map', exact: true }).click();
  await page.getByText('Zoom 1.4x', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => animation.effect?.target.closest('svg')).length), 0);
  assert.equal((await state()).total, 20);

  // A URL/search focus must yield to the cluster just selected on the map.
  await page.evaluate(() => window.renderScene({ lat: 0, lng: 35 }));
  await page.waitForTimeout(50);
  const selectedIds = await page.locator('[data-map-cluster="area"]').first().evaluate(node => node.parentNode.dataset.svgClusterKey.split('|'));
  await page.locator('[data-map-cluster="area"]').first().press('Enter');
  await page.waitForTimeout(50);
  const centered = await page.evaluate(selected => {
    const xs = [...document.querySelectorAll('[data-svg-cluster-key]')]
      .filter(node => node.dataset.svgClusterKey.split('|').some(id => selected.includes(id)))
      .map(node => node.transform.baseVal.consolidate().matrix.e);
    return { average: xs.reduce((sum, x) => sum + x, 0) / xs.length, markers: xs.length, clicked: window.clicked.length };
  }, selectedIds);
  assert.ok(centered.average > 350 && centered.average < 650, `selected area must recenter even after search focus: ${JSON.stringify(centered)}`);
  assert.equal(centered.clicked, 0, 'area cluster opens map detail before member profiles');
  assert.ok((await state()).total > 0);
  assert.deepEqual(errors, []);
  console.log('SVG/mobile: counts, animated split/merge, cleanup, reduced motion, keyboard and cluster recenter passed');
} finally {
  await browser.close();
}
