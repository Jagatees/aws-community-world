// Run with the Vite dev server running: node scripts/test-map-overlays.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.MAP_TEST_URL || 'http://127.0.0.1:5173';
const fakeMapModule = `
export class Map {
  constructor() {
    this.handlers = {};
    this.center = { lat: 0, lng: 0 };
    this.zoom = 12;
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
    const scale = 512 * 2 ** this.zoom / 360 * (this.projectionScale ?? 1);
    return { x: 500 + (lng - this.center.lng) * scale, y: 300 - (lat - this.center.lat) * scale };
  }
  triggerRepaint() {
    if (this.repaintPending || this.removed) return;
    this.repaintPending = true;
    this.repaintFrame = requestAnimationFrame(() => {
      this.repaintPending = false;
      if (!this.removed) this.emit('render');
    });
  }
  resize() { this.emit('resize'); this.triggerRepaint(); }
  remove() { this.removed = true; cancelAnimationFrame(this.repaintFrame); }
  flyTo(options = {}) { this.easeTo(options); }
  easeTo(options = {}) {
    if (options.center) this.center = { lng: options.center[0], lat: options.center[1] };
    if (options.zoom !== undefined) this.zoom = options.zoom;
    this.emit('zoom'); this.emit('moveend'); this.triggerRepaint();
  }
  fitBounds(bounds, options = {}) {
    this.lastFitBounds = { bounds, options };
    const [[west, south], [east, north]] = bounds;
    const padding = options.padding ?? 0;
    const scale = 512 / 360;
    const fitZoom = Math.log2(Math.min((1000 - padding * 2) / ((east - west) * scale), (600 - padding * 2) / ((north - south) * scale)));
    this.easeTo({ center: [(west + east) / 2, (south + north) / 2], zoom: Math.max(0, Math.min(options.maxZoom ?? 22, fitZoom)) });
  }
  setFog() {}
  getLayer() { return null; }
  getSource() { return null; }
}
export default { Map };
`;

async function checkClustering(page, componentName) {
  const setZoom = zoom => page.evaluate(value => {
    const map = window.testMaps.at(-1);
    map.zoom = value;
    map.emit('zoom');
    map.triggerRepaint();
  }, zoom);
  const snapshot = () => page.evaluate(() => {
    const buttons = [...document.querySelectorAll('#root button:not([data-cluster-exiting="true"])')];
    return {
      markers: buttons.length,
      represented: buttons.reduce((sum, button) => sum + (button.dataset.mapCluster === 'area'
        ? Number(button.textContent) : Number(button.getAttribute('aria-label')?.match(/^(\d+) members at this location$/)?.[1] ?? 1)), 0),
      exits: document.querySelectorAll('[data-cluster-exiting="true"]').length,
    };
  });
  await page.evaluate(() => {
    window.members = Array.from({ length: 12 }, (_, index) => ({
      id: 'dense-' + index, name: 'Dense ' + index, lat: 0, lng: index * 0.3,
      category: 'heroes', location: 'Dense test area',
    }));
    const map = window.testMaps.at(-1);
    map.center = { lat: 0, lng: 1.65 };
    map.zoom = 3;
    window.renderScene(true, true);
    map.emit('zoom');
    map.triggerRepaint();
  });
  await page.waitForTimeout(400);
  const overview = await snapshot();
  assert.deepEqual(overview, { markers: 1, represented: 12, exits: 0 }, `${componentName}: nearby records must combine into one accurate count`);

  await setZoom(5);
  await page.waitForFunction(() => document.querySelector('[data-cluster-exiting="true"]'));
  const duringSplit = await page.evaluate(() => [...document.querySelectorAll('[data-cluster-exiting="true"]')]
    .every(button => button.inert && button.getAttribute('aria-hidden') === 'true' && button.style.pointerEvents === 'none'));
  assert.equal(duringSplit, true, `${componentName}: exiting counts must be inert and hidden from assistive technology`);
  await page.waitForTimeout(400);
  const city = await snapshot();
  assert.ok(city.markers > overview.markers && city.markers < 12, `${componentName}: zooming in must split into smaller groups`);
  assert.equal(city.represented, 12, `${componentName}: split counts must conserve all records`);
  assert.equal(city.exits, 0);

  await setZoom(7);
  await page.waitForTimeout(400);
  const detail = await snapshot();
  assert.deepEqual(detail, { markers: 12, represented: 12, exits: 0 }, `${componentName}: further zoom must reveal individual source locations`);

  await setZoom(3);
  await page.waitForFunction(() => document.querySelector('[data-cluster-exiting="true"]'));
  await setZoom(7);
  await page.waitForTimeout(400);
  assert.deepEqual(await snapshot(), detail, `${componentName}: rapid zoom reversal must settle without duplicate markers`);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setZoom(3);
  await page.waitForFunction(() => document.querySelector('#root button[data-map-cluster="area"]')?.textContent === '12');
  assert.deepEqual(await snapshot(), overview, `${componentName}: reduced motion must merge immediately without exiting markers`);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  const idle = await page.evaluate(() => {
    const map = window.testMaps.at(-1);
    const before = map.projections;
    for (let frame = 0; frame < 120; frame++) { map.emit('render'); map.emit('zoom'); }
    return map.projections - before;
  });
  assert.equal(idle, 0, `${componentName}: settled overview must skip idle projections`);
  const fractional = await page.evaluate(() => {
    const map = window.testMaps.at(-1);
    const before = map.projections;
    map.zoom = 3.75;
    map.emit('zoom');
    map.zoom = 3;
    map.emit('zoom');
    return map.projections - before;
  });
  assert.equal(fractional, 0, `${componentName}: fractional zoom events must not rebuild clusters`);
  await page.evaluate(() => {
    window.resizedMarker = document.querySelector('#root button');
    window.testMaps.at(-1).emit('resize');
  });
  await page.waitForTimeout(60);
  assert.equal(await page.evaluate(() => window.resizedMarker === document.querySelector('#root button')), true, `${componentName}: resize with unchanged membership must preserve marker DOM`);
  await page.evaluate(() => {
    const map = window.testMaps.at(-1);
    map.projectionScale = 4;
    map.emit('style.load');
    map.triggerRepaint();
  });
  await page.waitForTimeout(400);
  assert.deepEqual(await snapshot(), city, `${componentName}: projection changes must regroup clusters without a zoom change`);
  await page.evaluate(() => {
    const map = window.testMaps.at(-1);
    map.projectionScale = 1;
    map.emit('moveend');
    map.triggerRepaint();
  });
  await page.waitForTimeout(400);
  assert.deepEqual(await snapshot(), overview, `${componentName}: camera movement must refresh screen distances without a zoom change`);
  await setZoom(7);
  await page.waitForFunction(() => document.querySelector('[data-cluster-exiting="true"]'));
  return { zoom3Markers: overview.markers, zoom5Markers: city.markers, zoom7Markers: detail.markers, conservedRecords: detail.represented, rapidReversal: true, reducedMotion: true, projectionRefresh: true, cleanupDuringAnimation: true };
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const [componentName, variant] of [['MapboxGlobeScene', 'mapbox'], ['MapboxGlobeScene', 'geolibre'], ['MapboxFlatScene', 'mapbox']]) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => { if (!errors.includes(error.message)) errors.push(error.message); });
    // Keep source/fixture updates from replacing the mounted
    // test scene halfway through a marker transition.
    await page.routeWebSocket('**', socket => socket.onMessage(() => {}));
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
        window.unmountScene = () => root.render(null);
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
      await new Promise((resolve) => setTimeout(resolve, 400));
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
    await page.waitForTimeout(400);
    const themed = await page.evaluate(() => {
      const map = window.testMaps.at(-1);
      const before = map.projections;
      map.center = { lat: 0, lng: -120 };
      map.emit('render');
      return { projections: map.projections - before, markerPresent: Boolean(document.querySelector('#root button[aria-label="Person 60 — Test location"]')), maps: window.testMaps.length, handlers: map.handlers.render?.size, markers: document.querySelectorAll('#root button').length };
    });
    assert.deepEqual(errors, [], `${componentName}: no browser runtime errors`);
    assert.ok(themed.projections > 0 && themed.markerPresent, `${componentName}: overlay subscriptions must survive theme changes: ${JSON.stringify(themed)}`);
    const clustering = await checkClustering(page, componentName);
    await page.evaluate(() => window.unmountScene());
    await page.waitForTimeout(400);
    const cleaned = await page.evaluate(() => ({
      buttons: document.querySelectorAll('#root button').length,
      handlers: ['zoom', 'moveend', 'resize', 'render'].reduce((sum, name) => sum + (window.testMaps.at(-1).handlers[name]?.size ?? 0), 0),
      styleHandlers: window.testMaps.at(-1).handlers['style.load']?.size ?? 0,
      removed: window.testMaps.at(-1).removed,
    }));
    // The fake map retains the constructor's style callback after remove(); all
    // hook/overlay callbacks must be gone, leaving only that callback on globes.
    assert.deepEqual(cleaned, { buttons: 0, handlers: 0, styleHandlers: componentName === 'MapboxGlobeScene' ? 1 : 0, removed: true }, `${componentName}: unmount must remove markers, owned subscriptions and map`);
    assert.deepEqual(errors, [], `${componentName}: no errors during split/merge or unmount`);
    results.push({ component: componentName, variant, totalLocations: 360, initialVisibleMarkers: initial.visible, idleProjectionsFor120Frames: initial.redundantProjections, movedVisibleMarkers: moved.visible, ...clustering });
    await page.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
