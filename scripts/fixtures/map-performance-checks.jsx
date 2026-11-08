import React, { useEffect } from 'react';
import StudentGroupProfileCard from '../../src/components/StudentGroupProfileCard';
import { useCategory } from '../../src/hooks/useCategory';
import { createRoot } from 'react-dom/client';
import Globe from '../../src/components/MapboxGlobeScene';
import Flat from '../../src/components/MapboxFlatScene';
import groups from '../../src/data/cloud-clubs.json';

const report = document.getElementById('report');
const results = [];
const wait = (milliseconds = 400) => new Promise(resolve => setTimeout(resolve, milliseconds));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const buttons = () => [...document.querySelectorAll('#root button:not([data-cluster-exiting="true"])')];
const maps = window.testMaps = [];
const errors = [];
window.addEventListener('error', event => errors.push(event.message));
const root = createRoot(document.getElementById('root'));

async function checkScene(Scene, variant, spotlight) {
  const clicks = [];
  const members = spotlight ? [
    { id: 'near', name: 'Near campus', lat: 0, lng: 0, category: 'cloud-clubs', location: 'Testland' },
    { id: 'far', name: 'Far campus', lat: 0, lng: 140, category: 'cloud-clubs', location: 'Testland' },
  ] : groups.filter(group => group.location.endsWith('India'));
  const render = (darkMode = false, alternate = false) => root.render(<Scene
    key={`${variant}-${spotlight}`} category="cloud-clubs" members={members}
    variant={variant} darkMode={darkMode}
    countrySpotlight={spotlight ? { nonce: 1, country: 'Testland', center: { lat: 0, lng: 0 }, zoom: 12, pitch: 50, bearing: 0, members } : null}
    onMarkerClick={value => clicks.push({ alternate, members: Array.isArray(value) ? value : [value] })}
  />);
  render();
  await wait();
  let map = maps.at(-1);
  if (!spotlight) {
    map.center = { lat: 20, lng: 78 };
    map.zoom = 3;
    map.emit('zoom');
    map.triggerRepaint();
    await wait();
    const count = buttons().length;
    assert(count > 0 && count < 50, `India should have fewer than 50 overview buttons; got ${count}`);
    const area = document.querySelector('[data-map-cluster="area"]');
    assert(area && !area.querySelector('img'), 'overview clusters must be image-free count buttons');
    const before = map.projections;
    for (let i = 0; i < 120; i++) map.emit('render');
    assert(map.projections === before, 'idle render events must not reproject markers');
    area.click();
    await wait();
    assert(map.zoom > 3 && map.lastFitBounds?.options.maxZoom === 12, 'clicking a region must fit its source locations and zoom in');
    assert(clicks.length === 0, 'approximate regions should zoom before opening profiles');
    map.zoom = 12;
    const campus = members.find(member => member.lat !== 0 || member.lng !== 0);
    map.center = { lat: campus.lat, lng: campus.lng };
    map.emit('zoom');
    map.triggerRepaint();
    await wait();
    assert(!document.querySelector('[data-map-cluster="area"]'), 'campus zoom must use exact locations');
    const first = buttons()[0];
    render(false, true);
    await wait();
    assert(first === buttons()[0], 'callback changes must preserve marker DOM');
    first.click();
    await wait();
    assert(clicks.at(-1)?.alternate && clicks.at(-1)?.members.length > 0, 'exact-location clicks must use the latest callback and keep members');
    const payload = clicks.at(-1).members;
    const expected = members.filter(member => member.lat === payload[0].lat && member.lng === payload[0].lng);
    assert(expected.length === payload.length && expected.every(member => payload.includes(member)), 'exact-location click must retain every colocated group');
    results.push({ variant, overviewButtons: count, idleProjections: 0, campusButtons: buttons().length });
  } else {
    assert(buttons().length === 1 && buttons()[0].textContent.includes('Near campus'), 'offscreen spotlight cards should never be attached');
    const nearElement = buttons()[0];
    map.center = { lat: 0, lng: 140 };
    map.emit('render');
    assert(buttons().length === 1 && buttons()[0].textContent.includes('Far campus'), 'panning should detach old and reveal new spotlight cards');
    map.center = { lat: 0, lng: 0 };
    map.emit('render');
    assert(buttons()[0] === nearElement, 'revisiting a spotlight should reuse its card');
    render(false, true);
    await wait();
    buttons()[0].click();
    assert(clicks.at(-1)?.alternate && clicks.at(-1)?.members[0].id === 'near', 'spotlights must retain profile identity and latest callback');
    results.push({ variant, spotlightVisibleButtons: buttons().length, reused: true });
  }
  render(true, true);
  await wait();
  map = maps.at(-1);
  map.center = { lat: 0, lng: 0 };
  map.emit('render');
  assert(map.handlers.zoom?.size === (Scene === Globe ? 2 : 1), 'main and spotlight zoom subscriptions must survive theme changes without duplicates');
  root.render(null);
  await wait();
  assert(map.removed && map.handlers.zoom.size === 0, 'unmount must clean up map and zoom subscription');
  assert((map.handlers['style.load']?.size ?? 0) === (Scene === Globe ? 1 : 0), 'unmount must clean up hook and overlay style subscriptions');
}

async function checkAnimatedClusters(Scene, variant) {
  const members = Array.from({ length: 12 }, (_, index) => ({
    id: `dense-${index}`, name: `Dense ${index}`, lat: 0, lng: index * 0.3,
    category: 'heroes', location: 'Dense test area',
  }));
  const originalMatchMedia = window.matchMedia;
  let reducedMotion = false;
  window.matchMedia = function(query) {
    if (query === '(prefers-reduced-motion: reduce)') return { matches: reducedMotion };
    return originalMatchMedia.call(window, query);
  };
  const snapshot = () => ({
    markers: buttons().length,
    represented: buttons().reduce((sum, button) => sum + (button.dataset.mapCluster === 'area'
      ? Number(button.textContent) : Number(button.getAttribute('aria-label')?.match(/^(\d+) members at this location$/)?.[1] ?? 1)), 0),
    exits: document.querySelectorAll('[data-cluster-exiting="true"]').length,
  });
  try {
    root.render(<Scene key={`animation-${variant}`} category="heroes" members={members} variant={variant} onMarkerClick={() => {}} />);
    await wait();
    const map = maps.at(-1);
    map.center = { lat: 0, lng: 1.65 };
    const zoomTo = zoom => { map.zoom = zoom; map.emit('zoom'); map.triggerRepaint(); };
    zoomTo(3);
    await wait();
    const overview = snapshot();
    assert(overview.markers === 1 && overview.represented === 12, 'overview must combine all twelve records into one count');

    zoomTo(5);
    await wait(60);
    const exiting = [...document.querySelectorAll('[data-cluster-exiting="true"]')];
    assert(exiting.length > 0 && exiting.every(button => button.inert && button.getAttribute('aria-hidden') === 'true'), 'split animations must make outgoing markers inert and inaccessible');
    await wait();
    const city = snapshot();
    assert(city.markers > 1 && city.markers < 12 && city.represented === 12 && city.exits === 0, 'city groups must conserve counts and remove completed outgoing markers');
    zoomTo(7);
    await wait();
    const detail = snapshot();
    assert(detail.markers === 12 && detail.represented === 12 && detail.exits === 0, 'detail zoom must reveal every individual source marker');

    zoomTo(3);
    await wait(60);
    zoomTo(7);
    await wait();
    assert(JSON.stringify(snapshot()) === JSON.stringify(detail), 'rapid zoom reversal must settle without duplicate markers');
    reducedMotion = true;
    zoomTo(3);
    await wait(60);
    assert(JSON.stringify(snapshot()) === JSON.stringify(overview), 'reduced motion must merge immediately without outgoing animations');
    const before = map.projections;
    for (let index = 0; index < 120; index++) { map.emit('render'); map.emit('zoom'); }
    assert(map.projections === before, 'settled overview must skip projection work for idle zoom/render events');
    map.projectionScale = 4;
    map.emit('style.load');
    map.triggerRepaint();
    await wait(60);
    assert(JSON.stringify(snapshot()) === JSON.stringify(city), 'style projection changes must regroup without a zoom change');
    map.projectionScale = 1;
    map.emit('moveend');
    map.triggerRepaint();
    await wait(60);
    assert(JSON.stringify(snapshot()) === JSON.stringify(overview), 'camera movement must refresh screen distances at the same zoom');
    reducedMotion = false;
    zoomTo(7);
    await wait(60);
    assert(document.querySelector('[data-cluster-exiting="true"]'), 'cleanup check must run during an active transition');
    results.push({ variant, zoom3Markers: overview.markers, zoom5Markers: city.markers, zoom7Markers: detail.markers, conservedRecords: 12, rapidReversal: true, reducedMotion: true, projectionRefresh: true, cleanupDuringAnimation: true });
  } finally {
    window.matchMedia = originalMatchMedia;
    root.render(null);
    await wait();
    assert(!document.querySelector('[data-cluster-exiting="true"]'), 'unmount must clean up transition markers');
  }
}

let categoryState;
function SummaryProbe() {
  const result = useCategory('cloud-clubs');
  useEffect(() => { categoryState = result; }, [result]);
  return <p>Loading summary test</p>;
}

async function checkStudentDetails() {
  root.render(<SummaryProbe />);
  for (let attempt = 0; attempt < 100 && (!categoryState || categoryState.loading); attempt++) await wait(80);
  assert(categoryState?.members.length === groups.length, 'summary must contain every SBG');
  assert(categoryState.members.every(member => member.ledBy.length === 0 && !member.profileUrl), 'map must start with summaries only');
  const source = groups.find(group => group.ledBy?.some(leader => leader.socialLinks?.linkedin) && group.profileUrl);
  const summary = categoryState.members.find(member => member.id === source.id);
  root.render(<StudentGroupProfileCard member={summary} darkMode={false} onClose={() => {}} />);
  for (let attempt = 0; attempt < 100 && !document.querySelector('#root a'); attempt++) await wait(80);
  const hrefs = [...document.querySelectorAll('#root a')].map(link => link.href);
  assert(hrefs.includes(source.profileUrl), 'profile must restore the original group link');
  assert(source.ledBy.some(leader => hrefs.includes(leader.socialLinks?.linkedin)), 'profile must restore leader social links');
  assert(document.getElementById('root').textContent.includes(source.name), 'profile must match the selected group');
  results.push({ studentSummaryCount: categoryState.members.length, profileAndLeaderLinksRestored: true });
  root.render(null);
  await wait();
}

try {
  await checkScene(Globe, 'mapbox', false);
  await checkScene(Globe, 'geolibre', false);
  await checkScene(Flat, 'flat', false);
  await checkScene(Globe, 'mapbox', true);
  await checkAnimatedClusters(Globe, 'mapbox');
  await checkAnimatedClusters(Globe, 'geolibre');
  await checkAnimatedClusters(Flat, 'flat');
  await checkStudentDetails();
  assert(errors.length === 0, errors.join('\n'));
  report.textContent = 'PASS\n' + JSON.stringify(results, null, 2);
} catch (error) {
  report.textContent = 'FAIL\n' + error.stack;
}
