import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { test } from 'node:test';
import { clusterMembersByCoordinates } from '../src/utils/mapCoordinates.js';
import { clusterMapLocations, getMapClusterStep } from '../src/utils/mapClusters.js';
import { summarizeStudentGroups } from './student-group-summary.mjs';

const groups = JSON.parse(readFileSync(new URL('../src/data/cloud-clubs.json', import.meta.url)));
const india = groups.filter(group => group.location?.endsWith('India') && (group.lat !== 0 || group.lng !== 0));

test('India growth preserves every group, source coordinate and click payload at all zoom levels', () => {
  for (const factor of [1, 2, 5]) {
    // New IDs and slightly different campus coordinates, rather than duplicates
    // that would make clustering artificially easy.
    const members = Array.from({ length: factor }, (_, copy) => india.map(group => ({
      ...group, id: `${group.id}-${copy}`, lat: group.lat + copy * 0.015, lng: group.lng + copy * 0.015,
    }))).flat();
    const original = JSON.stringify(members);
    const locations = clusterMembersByCoordinates(members);
    const counts = [];
    const start = performance.now();
    for (const zoom of [0, 3, 5, 8, 12]) {
      const clusters = clusterMapLocations(locations, getMapClusterStep(zoom), 'cloud-clubs');
      const retained = clusters.flatMap(cluster => cluster.members);
      assert.equal(retained.length, members.length);
      assert.equal(new Set(retained.map(member => member.id)).size, members.length);
      assert.ok(clusters.every(cluster => cluster.members.some(member => member.lat === cluster.lat && member.lng === cluster.lng)));
      counts.push(clusters.length);
      if (zoom === 12) assert.equal(clusters, locations, 'campus zoom must return exact source locations');
    }
    assert.equal(JSON.stringify(members), original);
    assert.ok(counts[1] < locations.length / 2, 'country overview must significantly reduce marker count');
    console.log(`India ${factor}x: ${members.length} groups / ${locations.length} locations -> ${counts.join('/')} markers at zoom 0/3/5/8/12 (${(performance.now() - start).toFixed(2)}ms total)`);
  }
});

test('zoom boundaries, source overrides and event expansion remain predictable', () => {
  assert.equal(getMapClusterStep(3.01), getMapClusterStep(3.99));
  assert.equal(getMapClusterStep(4), getMapClusterStep(3) / 2);
  assert.equal(getMapClusterStep(12), 0);
  assert.equal(getMapClusterStep(NaN), 45);
  const members = [
    { id: 'a', lat: 1, lng: 1 }, { id: 'b', lat: 1.01, lng: 1.01 },
    { id: 'separate', lat: 1, lng: 1, forceSeparateMarker: true },
    { id: 'summary', lat: 1, lng: 2, builderCount: 100, clusterOnly: true },
  ];
  const locations = clusterMembersByCoordinates(members);
  const clusters = clusterMapLocations(locations, getMapClusterStep(1), 'heroes');
  assert.deepEqual(clusters.find(cluster => cluster.isApproximate).members.map(member => member.id), ['a', 'b']);
  assert.equal(clusters.find(cluster => cluster.forceSeparateMarker).members.length, 1);
  assert.equal(clusters.find(cluster => cluster.members[0].clusterOnly).members[0].builderCount, 100);
  assert.equal(clusterMapLocations(locations, 45, 'community-days'), locations);
});

test('SBG map summary preserves identities, filters and portraits without profile details', () => {
  const summary = summarizeStudentGroups(groups);
  assert.equal(summary.length, groups.length);
  summary.forEach((entry, index) => {
    const source = groups[index];
    for (const field of ['id', 'name', 'lat', 'lng', 'location', 'country', 'isNew', 'tag', 'forceSeparateMarker']) {
      assert.equal(entry[field], source[field]);
    }
    assert.equal(entry.ledBy, undefined);
    assert.equal(entry.profileUrl, undefined);
  });
  assert.equal(summarizeStudentGroups([{ avatarUrl: '/assets/default-avatar-a.png', ledBy: [{ imageUrl: 'https://example.com/portrait.webp' }] }])[0].avatarUrl, 'https://example.com/portrait.webp');
  const fullBytes = Buffer.byteLength(JSON.stringify(groups));
  const summaryBytes = Buffer.byteLength(JSON.stringify(summary));
  assert.ok(summaryBytes < fullBytes * 0.65);
  console.log(`SBG minified JSON: ${fullBytes} -> ${summaryBytes} bytes (${(100 * (1 - summaryBytes / fullBytes)).toFixed(1)}% reduction before compression)`);
});
