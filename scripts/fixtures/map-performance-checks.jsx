import React, { useEffect } from 'react';
import StudentGroupProfileCard from '../../src/components/StudentGroupProfileCard';
import { useCategory } from '../../src/hooks/useCategory';
import { createRoot } from 'react-dom/client';
import Globe from '../../src/components/MapboxGlobeScene';
import Flat from '../../src/components/MapboxFlatScene';
import groups from '../../src/data/cloud-clubs.json';

const report = document.getElementById('report');
const results = [];
const wait = () => new Promise(resolve => setTimeout(resolve, 80));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const buttons = () => [...document.querySelectorAll('#root button')];
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
    assert(map.zoom === 5, 'clicking a region must zoom in');
    assert(clicks.length === 0, 'approximate regions should zoom before opening profiles');
    map.zoom = 12;
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
  assert(map.handlers.zoom?.size === 1, 'zoom subscription must survive theme changes without duplicates');
  root.render(null);
  await wait();
  assert(map.removed && map.handlers.zoom.size === 0, 'unmount must clean up map and zoom subscription');
}

let categoryState;
function SummaryProbe() {
  const result = useCategory('cloud-clubs');
  useEffect(() => { categoryState = result; }, [result]);
  return <p>Loading summary test</p>;
}

async function checkStudentDetails() {
  root.render(<SummaryProbe />);
  for (let attempt = 0; attempt < 100 && (!categoryState || categoryState.loading); attempt++) await wait();
  assert(categoryState?.members.length === groups.length, 'summary must contain every SBG');
  assert(categoryState.members.every(member => member.ledBy.length === 0 && !member.profileUrl), 'map must start with summaries only');
  const source = groups.find(group => group.ledBy?.some(leader => leader.socialLinks?.linkedin) && group.profileUrl);
  const summary = categoryState.members.find(member => member.id === source.id);
  root.render(<StudentGroupProfileCard member={summary} darkMode={false} onClose={() => {}} />);
  for (let attempt = 0; attempt < 100 && !document.querySelector('#root a'); attempt++) await wait();
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
  await checkStudentDetails();
  assert(errors.length === 0, errors.join('\n'));
  report.textContent = 'PASS\n' + JSON.stringify(results, null, 2);
} catch (error) {
  report.textContent = 'FAIL\n' + error.stack;
}
