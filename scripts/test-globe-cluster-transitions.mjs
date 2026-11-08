import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reconcileGlobeClusters, sampleGlobeClusters, hasGlobeClusterTransitions, GLOBE_CLUSTER_TRANSITION_MS } from '../src/utils/globeClusterTransitions.js';

const people = [0, 10, 20].map(lng => Object.freeze({ id: lng, lat: 0, lng }));
const cluster = (members, properties = {}) => Object.freeze({ lat: members[0].lat, lng: members[0].lng, members: Object.freeze([...members]), ...properties });
const total = records => records.filter(record => !record.exiting).reduce((sum, record) => sum + record.members.length, 0);
const duration = GLOBE_CLUSTER_TRANSITION_MS;

test('globe split moves children from parent toward source coordinates without changing source clusters', () => {
  const parent = cluster(people, { isApproximate: true });
  const sources = people.map(person => cluster([person]));
  const initial = reconcileGlobeClusters([], [parent], 0);
  const split = reconcileGlobeClusters(initial, sources, 0);
  assert.equal(total(split), 3);
  assert.equal(split.filter(record => record.exiting).length, 1);
  assert.equal(split[2].lng, 0);
  assert.equal(sampleGlobeClusters(split, duration / 2), split);
  assert.ok(split[2].lng > 0 && split[2].lng < 20);
  assert.equal(sources[2].lng, 20);
  sampleGlobeClusters(split, duration);
  assert.equal(split[2].lng, 20);
  assert.equal(split.at(-1).complete, true);
  assert.equal(split.at(-1).alpha, 0);
  assert.equal(hasGlobeClusterTransitions(split), false);
});

test('merging moves outgoing children into their new parent while active counts stay exact', () => {
  const sources = people.map(person => cluster([person]));
  const merged = reconcileGlobeClusters(reconcileGlobeClusters([], sources, 0), [cluster(people)], 0);
  assert.equal(total(merged), 3);
  const outgoing = merged.find(record => record.exiting && record.cluster.lng === 20);
  sampleGlobeClusters(merged, duration / 2);
  assert.ok(outgoing.lng > 0 && outgoing.lng < 20);
  sampleGlobeClusters(merged, duration);
  assert.equal(outgoing.lng, 0);
  assert.equal(outgoing.complete, true);
});

test('fast reversal samples the current position and removes old decorative exits', () => {
  const parent = cluster(people, { isApproximate: true });
  const split = reconcileGlobeClusters(reconcileGlobeClusters([], [parent], 0), people.map(person => cluster([person])), 0);
  sampleGlobeClusters(split, duration / 3);
  const before = split[2].lng;
  const reversed = reconcileGlobeClusters(split, [parent], duration / 3);
  const outgoing = reversed.find(record => record.exiting && record.cluster.lng === 20);
  assert.equal(outgoing.lng, before);
  assert.equal(total(reversed), 3);
  assert.equal(reversed.filter(record => record.cluster === parent).length, 1);
  sampleGlobeClusters(reversed, duration * 2);
  assert.equal(hasGlobeClusterTransitions(reversed), false);
});

test('unchanged groups retain record identity and refresh metadata; style changes create a fresh record', () => {
  const first = cluster(people, { detailLevel: 0, compactOverview: true });
  const initial = reconcileGlobeClusters([], [first], 0);
  const next = cluster(people, { detailLevel: 1, compactOverview: true });
  const refreshed = reconcileGlobeClusters(initial, [next], 10);
  assert.equal(refreshed[0], initial[0]);
  assert.equal(refreshed[0].cluster, next);
  assert.equal(refreshed[0].detailLevel, 1);
  assert.equal(hasGlobeClusterTransitions(refreshed), false);
  const detailed = reconcileGlobeClusters(refreshed, [cluster(people, { compactOverview: false })], 20);
  assert.notEqual(detailed[0], initial[0]);
});

test('reduced motion settles immediately and longitude interpolation follows the short date-line arc', () => {
  const first = cluster(people, { lng: 179 });
  const second = cluster([people[0]], { lng: -179 });
  const initial = reconcileGlobeClusters([], [first], 0);
  const animated = reconcileGlobeClusters(initial, [second], 0);
  sampleGlobeClusters(animated, duration / 2);
  assert.ok(animated[0].lng > 179 && animated[0].lng < 181);
  const settled = reconcileGlobeClusters(animated, [second], duration / 2, false);
  assert.equal(settled.length, 1);
  assert.equal(settled[0].lng, -179);
  assert.equal(settled[0].alpha, 1);
  assert.equal(hasGlobeClusterTransitions(settled), false);
});
