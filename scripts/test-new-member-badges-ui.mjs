// Run against Vite: node scripts/test-new-member-badges-ui.mjs
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.COMMUNITY_TEST_URL || 'http://127.0.0.1:5173';
const outputDir = 'tmp/new-member-badges-qa';
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, args:['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  // Exercise failed-image fallbacks as well as badge placement.
  await page.route('https://avatars.builderprofile.aws.dev/**', (route) => route.abort());
  const errors = [];
  page.on('pageerror', (error) => { errors.push(error.message); console.error(error.message); });
  await page.route('**/new-member-badge-test', (route) => route.fulfill({ contentType: 'text/html', body: `
    <style>html,body,#root { width:100%;height:100%;margin:0;background:#0b1824 }</style>
    <div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      await import('/src/index.css');
      const reactModule = await import('/node_modules/.vite/deps/react.js');
      const React = reactModule.default || reactModule;
      const domModule = await import('/node_modules/.vite/deps/react-dom_client.js');
      const {createRoot} = domModule.default || domModule;
      const source = (await import('/src/data/heroes.json')).default;
      // Use real profiles with controlled test-only status and co-located coordinates.
      // Source data and member identities are never changed by this test.
      const members = source.slice(0, 2).map((member, index) => ({
        ...member, avatarUrl:member.image_url, profileUrl:member.hero_page_url, heroType:member.hero_type,
        category:'heroes', lat:20, lng:0, isNew:index === 0,
      }));
      window.badgeTestMembers = members;
      const root = createRoot(document.querySelector('#root'));
      const components = {
        earth: 'ClassicGlobeScene', minimal: 'GlobeScene', map: 'FlatMapScene',
        gallery: 'ExperimentalHeroDex', directory: 'ListScene', profile: 'ProfileCard',
      };
      const fillText = CanvasRenderingContext2D.prototype.fillText;
      window.newBadgeDraws = 0;
      CanvasRenderingContext2D.prototype.fillText = function(text, ...args) {
        if (text === 'NEW') window.newBadgeDraws++;
        return fillText.call(this, text, ...args);
      };
      window.renderBadgeTest = async (scene, status = true, profile = 'cluster', category = 'heroes') => {
        const {default: Component} = await import('/src/components/' + components[scene] + '.jsx');
        const fixtures = members.map((member, index) => ({...member, category, isNew:status && index === 0}));
        window.newBadgeDraws = 0;
        root.render(React.createElement(Component, {
          key: scene + profile + category,
          category, members:fixtures, member:profile === 'single' ? fixtures[0] : fixtures,
          loading:false, darkMode:true, cardOpen:true,
          flyToTarget:{lat:20,lng:0}, onMarkerClick:()=>{}, onItemClick:()=>{}, onClose:()=>{},
        }));
      };
      window.badgeTestReady = true;
    </script>` }));
  await page.goto(`${baseUrl}/new-member-badge-test`);
  await page.waitForFunction(() => window.badgeTestReady);
  const semantics = await page.evaluate(async () => {
    const {hasNewMember} = await import('/src/utils/memberMarkers.js');
    const {getPortraitGroupMembers} = await import('/src/utils/portraitGroupMarker.js');
    return {
      mixed: hasNewMember({members:[{isNew:false},{isNew:true}]}),
      old: hasNewMember([{isNew:false},{isNew:false}]),
      summary: hasNewMember({clusterOnly:true,newBuilderCount:2}),
      cleared: hasNewMember({clusterOnly:true,isNew:false,newBuilderCount:2}),
      previews: getPortraitGroupMembers({members:[{clusterOnly:true,isNew:true,ledBy:[{name:'First',isNew:true},{name:'Second'}]}]}).map((m) => m.isNew),
    };
  });
  assert.deepEqual(semantics, { mixed:true, old:false, summary:true, cleared:false, previews:[true,false] });

  for (const scene of ['earth', 'map', 'gallery', 'directory', 'profile']) {
    await page.evaluate((value) => window.renderBadgeTest(value), scene);
    await page.locator('[data-new-member-badge="true"]').first().waitFor({ state:'visible' }).catch(async (error) => { await page.screenshot({animations:'disabled',path:`${outputDir}/failed-${scene}.png`}); console.error(await page.locator('body').innerText()); throw error; });
    assert.equal(await page.locator('[data-new-member-badge="true"]').count(), 1, `${scene}: mixed cluster marks only the new record/group`);
    if (scene === 'profile') {
      assert.ok(await page.locator('[data-new-member-badge]').evaluate((badge) => {
        const badgeRect = badge.getBoundingClientRect();
        const rowRect = badge.closest('li').getBoundingClientRect();
        return badgeRect.left >= rowRect.left && badgeRect.top >= rowRect.top && badgeRect.right <= rowRect.right;
      }), 'Profile badge must not be clipped when the portrait fails');
    }
    await page.screenshot({ animations:'disabled', path:`${outputDir}/${scene}.png` });
    if (scene === 'gallery') {
      await page.locator('.hero-dex__hex').filter({has:page.locator('[data-new-member-badge]')}).click();
      await page.getByRole('dialog').locator('[data-new-member-badge]').waitFor({state:'visible'});
      await page.screenshot({animations:'disabled',path:`${outputDir}/gallery-profile.png`});
      await page.getByRole('button', {name:'Close hero details'}).click();
    }
    await page.evaluate((value) => window.renderBadgeTest(value, false), scene);
    await page.waitForFunction(() => !document.querySelector('[data-new-member-badge="true"]'));
    console.log(scene + ': new badge visible; existing members and cleared flags have no badge');
  }
  for (const category of ['heroes','cloud-clubs']) {
    await page.evaluate((value) => window.renderBadgeTest('profile', true, 'single', value), category);
    await page.getByRole('dialog').locator('[data-new-member-badge]').waitFor({state:'visible'});
    assert.equal(await page.getByRole('dialog').locator('[data-new-member-badge]').count(), 1);
  }
  await page.evaluate(() => window.renderBadgeTest('minimal'));
  await page.waitForFunction(() => window.newBadgeDraws > 0);
  await page.locator('.minimal-marker-label[data-new-member="true"]:visible').waitFor();
  await page.screenshot({animations:'disabled',path:`${outputDir}/minimal.png`});
  await page.evaluate(() => window.renderBadgeTest('minimal', false));
  await page.waitForFunction(() => document.querySelector('.minimal-marker-label[data-new-member="false"][data-visible="true"]'));
  // Clear the instrumentation after the render settles, then confirm no new badge draws.
  await page.evaluate(() => {window.newBadgeDraws = 0;});
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => window.newBadgeDraws), 0);
  assert.equal(await page.locator('.minimal-marker-label[data-new-member="true"]:visible').count(), 0);
  console.log('Minimal: canvas badge and accessible label honor new/cleared cluster status');
  await page.setViewportSize({width:390,height:844});
  for (const scene of ['minimal', 'gallery', 'directory', 'profile']) {
    await page.evaluate((value) => window.renderBadgeTest(value), scene);
    if (scene === 'minimal') await page.waitForFunction(() => window.newBadgeDraws > 0);
    else await page.locator('[data-new-member-badge]').first().waitFor({state:'visible'});
    await page.screenshot({animations:'disabled',path:`${outputDir}/mobile-${scene}.png`});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), scene + ': no mobile overflow');
  }
  console.log('Mobile Minimal, Gallery, Directory and Profile badges fit the 390px viewport');
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
