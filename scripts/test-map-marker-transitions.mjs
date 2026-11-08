import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getMapMarkerPosition, hasMapMarkerTransitions, reconcileMapMarkers } from '../src/utils/mapMarkerTransitions.js';

const members = [0, 10, 20].map(lng => ({ id: `person-${lng}`, lat: 0, lng }));
const map = { project: ([lng, lat]) => ({ x: lng * 10, y: lat * 10 }) };
function element() {
  return { isConnected: true, style: {}, dataset: {}, setAttribute(name, value) { this[name] = value; }, remove() { this.isConnected = false; } };
}
function marker(people, lng = people[0].lng) {
  return { cluster: { lat: 0, lng, members: people }, element: element() };
}
const destination = entry => map.project([entry.cluster.lng, entry.cluster.lat]);
const activeCount = entries => entries.filter(entry => !entry.exiting).reduce((count, entry) => count + entry.cluster.members.length, 0);

test('splitting retains every member while children travel outward and old count becomes decorative', () => {
  const parent = marker(members);
  const entries = reconcileMapMarkers([parent], members.map(member => marker([member])), { now: 0 });
  assert.equal(activeCount(entries), 3);
  assert.equal(parent.element.inert, true);
  assert.equal(parent.element['aria-hidden'], 'true');
  const child = entries[2];
  assert.equal(getMapMarkerPosition(child, map, destination(child), 0).x, 0);
  const halfway = getMapMarkerPosition(child, map, destination(child), 150).x;
  assert.ok(halfway > 0 && halfway < 200);
  entries.forEach(entry => getMapMarkerPosition(entry, map, destination(entry), 300));
  assert.equal(getMapMarkerPosition(child, map, destination(child), 300).x, 200);
  assert.equal(parent.element.isConnected, false);
  assert.equal(hasMapMarkerTransitions(entries), false);
});

test('merging moves outgoing children into their new parent and preserves unchanged marker DOM', () => {
  const children = members.map(member => marker([member]));
  const untouched = marker([{ id: 'other', lat: 0, lng: 80 }]);
  const merged = reconcileMapMarkers([...children, untouched], [marker(members), marker(untouched.cluster.members)], { now: 0 });
  assert.equal(activeCount(merged), 4);
  assert.equal(merged[1].element, untouched.element);
  const exiting = merged.find(entry => entry.exiting && entry.cluster.lng === 20);
  assert.equal(getMapMarkerPosition(exiting, map, destination(exiting), 0).x, 200);
  const halfway = getMapMarkerPosition(exiting, map, destination(exiting), 150).x;
  assert.ok(halfway > 0 && halfway < 200);
  merged.forEach(entry => getMapMarkerPosition(entry, map, destination(entry), 300));
  assert.equal(exiting.element.isConnected, false);
  assert.equal(untouched.element.isConnected, true);
});

test('rapid reversal starts at the current interpolated location and removes earlier exits', () => {
  const firstParent = marker(members);
  const split = reconcileMapMarkers([firstParent], members.map(member => marker([member])), { now: 0 });
  const midpoint = getMapMarkerPosition(split[2], map, destination(split[2]), 150).x;
  const reversed = reconcileMapMarkers(split, [marker(members)], { now: 150 });
  const outgoing = reversed.find(entry => entry.exiting && entry.cluster.lng === 20);
  assert.equal(getMapMarkerPosition(outgoing, map, destination(outgoing), 150).x, midpoint);
  assert.equal(firstParent.element.isConnected, false);
  assert.equal(activeCount(reversed), 3);
  reversed.forEach(entry => getMapMarkerPosition(entry, map, destination(entry), 450));
  assert.equal(hasMapMarkerTransitions(reversed), false);
});

test('disabled animation immediately replaces old elements without transitional duplicates', () => {
  const old = marker(members);
  const next = members.map(member => marker([member]));
  assert.equal(reconcileMapMarkers([old], next, { animate: false }), next);
  assert.equal(old.element.isConnected, false);
  assert.equal(hasMapMarkerTransitions(next), false);
  assert.equal(activeCount(next), members.length);
});

test('animation endpoints follow the current camera and spotlight height', () => {
  const old = marker(members);
  old.heightOffset = 120;
  const child = marker([members[2]]);
  child.heightOffset = 144;
  const entries = reconcileMapMarkers([old], [child], { now: 0 });
  const movedMap = { project: ([lng, lat]) => ({ x: lng * 20 + 50, y: lat * 20 + 80 }) };
  const point = { x: 450, y: -64 };
  assert.deepEqual(getMapMarkerPosition(entries[0], movedMap, point, 0), { x: 50, y: -40 });
  assert.deepEqual(getMapMarkerPosition(entries[0], movedMap, point, 300), point);
});

test('a regrouped spotlight refreshes its card when the stem height changes', () => {
  const old = marker([members[0]]);
  old.heightOffset = 120;
  const next = marker([members[0]]);
  next.heightOffset = 144;
  const entries = reconcileMapMarkers([old], [next], { now: 0 });
  assert.equal(entries[0].element, next.element);
  assert.notEqual(entries[0].element, old.element);
  assert.deepEqual(getMapMarkerPosition(entries[0], map, { x: 0, y: -144 }, 0), { x: 0, y: -120 });
  entries.forEach(entry => getMapMarkerPosition(entry, map, destination(entry), 300));
  assert.equal(old.element.isConnected, false);
});
