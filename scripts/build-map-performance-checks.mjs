// Build a browser fixture with fake map engines (no API key or external tiles).
// Run this, serve the repository with Vite, then open
// /tmp/map-performance-checks/built/index.html. The page reports PASS or FAIL.
import { build } from 'vite';
import { studentGroupSummaryPlugin } from './student-group-summary.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve('tmp/map-performance-checks');
await mkdir(root, { recursive: true });
const existing = await readFile('scripts/test-map-overlays.mjs', 'utf8');
let fake = existing.split('const fakeMapModule = `')[1].split('`;')[0];
fake = fake.replace('constructor() {', 'constructor(options = {}) {')
  .replace('this.zoom = 12;', 'this.zoom = options.zoom ?? 12;');
await writeFile(resolve(root, 'fake-map.js'), fake);
await writeFile(resolve(root, 'index.html'), '<meta charset="utf-8"><pre id="report">Running…</pre><div id="root" style="width:1000px;height:600px"></div><script type="module" src="/scripts/fixtures/map-performance-checks.jsx"></script>');
await build({
  configFile: false, root, base: './',
  resolve: { alias: {
    'mapbox-gl': resolve(root, 'fake-map.js'), 'maplibre-gl': resolve(root, 'fake-map.js'),
  } },
  plugins: [studentGroupSummaryPlugin(), {
    name: 'fixture',
    resolveId(id) {
      if (id.endsWith('.css')) return '\0empty-css';
      if (id === '/scripts/fixtures/map-performance-checks.jsx') return resolve('scripts/fixtures/map-performance-checks.jsx');
    },
    load(id) { if (id === '\0empty-css') return ''; },
  }],
  define: { 'import.meta.env.VITE_MAP_BOX': JSON.stringify('fixture-token') },
  esbuild: { jsx: 'automatic' },
  build: { outDir: 'built', target: 'esnext' },
});
