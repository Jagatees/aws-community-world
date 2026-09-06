import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { test } from 'node:test';
import { buildGlobeClusterLevels, getGlobeClusterLevel, groupGlobeLocations } from '../src/utils/globeClusters.js';
import { clusterMembersByCoordinates } from '../src/utils/mapCoordinates.js';
import { getRepresentedMemberCount } from '../src/utils/memberCounts.js';

test('large global data is bounded and every person survives each zoom level', () => {
  const members = Array.from({ length: 20000 }, (_, index) => ({
    id: index,
    lat: -89.9 + ((index * 0.61803398875) % 1) * 179.8,
    lng: -179.9 + ((index * 0.41421356237) % 1) * 359.8,
  }));
  const original = JSON.stringify(members);
  const levels = buildGlobeClusterLevels(members);
  for (const [index, maxGroups] of [200, 800, 3200].entries()) {
    assert.ok(levels[index].length <= maxGroups);
    const retained = levels[index].flatMap((cluster) => cluster.members);
    assert.equal(retained.length, members.length);
    assert.equal(new Set(retained).size, members.length);
    assert.equal(getRepresentedMemberCount(retained), 20000);
    assert.ok(levels[index].every((cluster) => cluster.members.some((member) =>
      member.lat === cluster.lat && member.lng === cluster.lng)));
  }
  assert.ok(levels[0].length < levels[1].length && levels[1].length < levels[2].length);
  assert.equal(JSON.stringify(members), original);
});

test('coordinate overlaps, country summaries and explicit separate markers retain their semantics', () => {
  const members = [
    { id: 'first', lat: 1, lng: 1 },
    { id: 'same-location', lat: 1, lng: 1 },
    { id: 'nearby', lat: 2, lng: 2 },
    { id: 'separate', lat: 1, lng: 1, forceSeparateMarker: true },
    { id: 'summary', lat: 3, lng: 3, clusterOnly: true, builderCount: 318 },
  ];
  const locations = clusterMembersByCoordinates(members);
  assert.equal(groupGlobeLocations(locations, 0), locations);
  assert.equal(groupGlobeLocations(locations, -1), locations);
  const grouped = groupGlobeLocations(locations, 18);
  assert.equal(grouped.length, 3);
  const approximate = grouped.find((cluster) => cluster.isApproximate);
  assert.deepEqual(approximate.members.map((member) => member.id), ['first', 'same-location', 'nearby']);
  assert.equal(grouped.find((cluster) => cluster.forceSeparateMarker).members[0].id, 'separate');
  assert.equal(grouped.find((cluster) => cluster.members[0].clusterOnly).members.length, 1);
  assert.equal(getRepresentedMemberCount(grouped.flatMap((cluster) => cluster.members)), 322);
  assert.equal(locations[0].members.length, 2, 'the input clusters must not be mutated');
});

test('small filtered sets remain at exact source locations', () => {
  const members = [{ lat: 1, lng: 1 }, { lat: 1.01, lng: 1.01 }];
  for (const level of buildGlobeClusterLevels(members)) {
    assert.equal(level.length, 2);
    assert.equal(level[0].isApproximate, undefined);
  }
});

test('poles and the antimeridian produce valid cells; invalid coordinates are excluded', () => {
  const pole = { lat: 90, lng: 180, members: [{ id: 'east' }] };
  const groups = groupGlobeLocations([pole, { lat: 90, lng: -180, members: [{ id: 'west' }] }], 18);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].members.length, 2);
  assert.deepEqual(buildGlobeClusterLevels([
    { lat: NaN, lng: 10 }, { lat: 91, lng: 10 }, { lat: 10, lng: 181 },
  ]), [[], [], []]);
  assert.equal(getGlobeClusterLevel(0.6), 0);
  assert.equal(getGlobeClusterLevel(1.35), 1);
  assert.equal(getGlobeClusterLevel(2.15), 2);
  assert.equal(getGlobeClusterLevel(3), 2);
});

test('real community datasets retain all mapped records at every detail level', async () => {
  for (const file of ['heroes', 'community-builders', 'user-groups', 'cloud-clubs']) {
    const members = JSON.parse(await readFile(new URL(`../src/data/${file}.json`, import.meta.url), 'utf8'));
    const mapped = members.filter((member) => Number.isFinite(member.lat) && Number.isFinite(member.lng)
      && Math.abs(member.lat) <= 90 && Math.abs(member.lng) <= 180);
    const started = performance.now();
    const levels = buildGlobeClusterLevels(members);
    if (file === 'heroes') assert.ok(levels[0].length < clusterMembersByCoordinates(mapped).length, 'crowded Hero cities must group at world zoom');
    const buildMs = performance.now() - started;
    for (const level of levels) assert.equal(level.reduce((sum, cluster) => sum + cluster.members.length, 0), mapped.length);
    process.stdout.write(`${file}: ${mapped.length} records, ${clusterMembersByCoordinates(mapped).length} exact locations -> ${levels.map((level) => level.length).join('/')} zoom groups; ${buildMs.toFixed(2)}ms build\n`);
  }
});
