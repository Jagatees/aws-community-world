// Run with the Vite dev server running: node scripts/test-map-overlays.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.MAP_TEST_URL || 'http://127.0.0.1:5173';
const fakeMapModule = `
export class Map {
  constructor() {
    this.handlers = {};
    this.center = { lat: 0, lng: 0 };
    this.zoom = 3;
    this.projections = 0;
    this.removed = false;
    this.dragRotate = this.touchZoomRotate = { enable() {}, disable() {}, enableRotation() {}, disableRotation() {} };
    window.testMaps.push(this);
  }
  on(name, callback) { (this.handlers[name] ||= new Set()).add(callback); }
  off(name, callback) { this.handlers[name]?.delete(callback); }
  emit(name) { this.handlers[name]?.forEach((callback) => callback()); }
  getCenter() { return this.center; }
  getZoom() { return this.zoom; }
  getPitch() { return 0; }
  getBearing() { return 0; }
  getCanvas() { return { clientWidth: 1000, clientHeight: 600 }; }
  project([lng, lat]) {
    this.projections += 1;
    return { x: 500 + (lng - this.center.lng) * 10, y: 300 - lat * 10 };
  }
  triggerRepaint() { queueMicrotask(() => { if (!this.removed) this.emit('render'); }); }
  resize() {}
  remove() { this.removed = true; }
  flyTo() {}
  easeTo() {}
  setFog() {}
  getLayer() { return null; }
  getSource() { return null; }
}
export default { Map };
`;

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const [componentName, variant] of [['MapboxGlobeScene', 'mapbox'], ['MapboxGlobeScene', 'geolibre'], ['MapboxFlatScene', 'mapbox']]) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', (route) => new URL(route.request().url()).origin === new URL(baseUrl).origin ? route.continue() : route.abort());
    await page.route('**/node_modules/.vite/deps/mapbox-gl.js*', (route) => route.fulfill({ contentType: 'text/javascript', body: fakeMapModule }));
    await page.route('**/node_modules/.vite/deps/maplibre-gl.js*', (route) => route.fulfill({ contentType: 'text/javascript', body: fakeMapModule }));
    await page.route(`**/src/components/${componentName}.jsx*`, async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      await route.fulfill({ response, body: source.replace(/const TOKEN = [^;]+;/, "const TOKEN = 'test-token';") });
    });
    await page.route('**/map-overlay-test', (route) => route.fulfill({
      contentType: 'text/html',
      body: `<div id="root"></div><script type="module">
        import RefreshRuntime from '/@react-refresh';
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;
        window.testMaps = [];
        window.clicked = [];
        window.members = Array.from({ length: 360 }, (_, index) => ({
          id: 'person-' + index, name: 'Person ' + index, lat: 0, lng: index - 180,
          category: 'heroes', location: 'Test location'
        }));
        window.members.push({ ...window.members[180], id: 'same-location', name: 'Same location' });
        const reactModule = await import('/node_modules/.vite/deps/react.js');
        const React = reactModule.default || reactModule;
        const domModule = await import('/node_modules/.vite/deps/react-dom_client.js');
        const { createRoot } = domModule.default || domModule;
        const { default: Scene } = await import('/src/components/${componentName}.jsx');
        const root = createRoot(document.getElementById('root'));
        window.renderScene = (darkMode = false, alternate = false) => root.render(React.createElement(Scene, {
          category: 'heroes', members: window.members, darkMode, variant: '${variant}',
          onMarkerClick: (payload) => window.clicked.push({ alternate, ids: (Array.isArray(payload) ? payload : [payload]).map((member) => member.id) })
        }));
        window.renderScene();
      </script>`,
    }));
    await page.goto(`${baseUrl}/map-overlay-test`);
    await page.waitForFunction(() => document.querySelectorAll('#root button').length > 0).catch((error) => {
      throw new Error(`${componentName}: ${errors.join('; ') || error.message}`);
    });
    const initial = await page.evaluate(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const map = window.testMaps.at(-1);
      const visible = document.querySelectorAll('#root button').length;
      const firstMarker = document.querySelector('#root button');
      window.firstMarker = firstMarker;
      const before = map.projections;
      for (let frame = 0; frame < 120; frame += 1) {
        map.emit('render');
        map.emit('move');
        map.emit('zoom');
      }
      return { visible, redundantProjections: map.projections - before };
    });
    assert.ok(initial.visible > 0 && initial.visible < 360, `${componentName}: only visible locations should have DOM markers`);
    assert.equal(initial.redundantProjections, 0, `${componentName}: idle render/move/zoom events must not reproject all members`);
    await page.evaluate(() => window.renderScene(false, true));
    await page.waitForTimeout(50);
    assert.equal(await page.evaluate(() => window.firstMarker === document.querySelector('#root button')), true, `${componentName}: callback updates must preserve marker DOM`);
    await page.evaluate(() => document.querySelector('#root button[aria-label="2 members at this location"]').click());
    const clicked = await page.evaluate(() => window.clicked.at(-1));
    assert.deepEqual(clicked, { alternate: true, ids: ['person-180', 'same-location'] }, `${componentName}: groups must keep every member and use the newest callback`);
    const moved = await page.evaluate(() => {
      const map = window.testMaps.at(-1);
      const before = map.projections;
      map.center = { lat: 0, lng: 140 };
      map.emit('render');
      return {
        projections: map.projections - before,
        visible: document.querySelectorAll('#root button').length,
        markerPresent: Boolean(document.querySelector('#root button[aria-label="Person 320 — Test location"]')),
        groupPresent: Boolean(document.querySelector('#root button[aria-label="2 members at this location"]')),
      };
    });
    assert.ok(moved.projections > 0, `${componentName}: camera movement should refresh marker positions`);
    assert.equal(moved.markerPresent, true, `${componentName}: panning must reveal a previously offscreen member`);
    assert.equal(moved.groupPresent, false, `${componentName}: offscreen markers must leave the DOM`);
    const revisited = await page.evaluate(() => {
      const map = window.testMaps.at(-1);
      map.center = { lat: 0, lng: 0 };
      map.emit('render');
      return window.firstMarker === document.querySelector('#root button');
    });
    assert.equal(revisited, true, `${componentName}: revisited markers should reuse their cached DOM`);
    await page.evaluate(() => window.renderScene(true, true));
    await page.waitForTimeout(80);
    const themed = await page.evaluate(() => {
      const map = window.testMaps.at(-1);
      const before = map.projections;
      map.center = { lat: 0, lng: -120 };
      map.emit('render');
      return { projections: map.projections - before, markerPresent: Boolean(document.querySelector('#root button[aria-label="Person 60 — Test location"]')), maps: window.testMaps.length, handlers: map.handlers.render?.size, markers: document.querySelectorAll('#root button').length };
    });
    assert.deepEqual(errors, [], `${componentName}: no browser runtime errors`);
    assert.ok(themed.projections > 0 && themed.markerPresent, `${componentName}: overlay subscriptions must survive theme changes: ${JSON.stringify(themed)}`);
    results.push({ component: componentName, variant, totalLocations: 360, initialVisibleMarkers: initial.visible, idleProjectionsFor120Frames: initial.redundantProjections, movedVisibleMarkers: moved.visible });
    await page.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
