import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clusterScreenLocations } from '../src/utils/screenMapClusters.js';
import { clusterMembersByCoordinates } from '../src/utils/mapCoordinates.js';
import { getRepresentedMemberCount } from '../src/utils/memberCounts.js';

test('screen radius joins nearby points across cells and keeps every source member', () => {
  const members = [
    { id: 'west', lat: 20, lng: 47 },
    { id: 'east', lat: 20, lng: 49 },
    { id: 'far', lat: 20, lng: 140 },
    { id: 'same-place', lat: 20, lng: 49 },
  ];
  const original = JSON.stringify(members);
  const locations = clusterMembersByCoordinates(members);
  const clusters = clusterScreenLocations(locations, ([x, y]) => ({ x, y }));
  assert.equal(clusters.length, 2);
  assert.deepEqual(clusters[0].members.map(member => member.id), ['west', 'east', 'same-place']);
  assert.equal(clusters[0].isApproximate, true);
  assert.equal(clusters[0].lat, members[0].lat);
  assert.equal(clusters[0].lng, members[0].lng);
  assert.equal(clusters.reduce((count, cluster) => count + getRepresentedMemberCount(cluster.members), 0), members.length);
  assert.equal(JSON.stringify(members), original);
  assert.equal(locations[0].members.length, 1);
});

test('radius is Euclidean and source overrides stay outside nearby clusters', () => {
  const members = [
    { id: 'origin', lat: 0, lng: 0 },
    { id: 'diagonal', lat: 40, lng: 40 },
    { id: 'separate', lat: 0, lng: 0, forceSeparateMarker: true },
    { id: 'summary', lat: 0, lng: 1, clusterOnly: true, builderCount: 150 },
  ];
  const clusters = clusterScreenLocations(clusterMembersByCoordinates(members), point => point);
  assert.equal(clusters.length, 4, 'diagonal distance exceeds 48px despite being within one grid cell');
  assert.equal(clusters.reduce((count, cluster) => count + getRepresentedMemberCount(cluster.members), 0), 153);
  assert.ok(clusters.every(cluster => !cluster.isApproximate));
});

test('zoom splits and merges conserve counts, with exact source locations at maximum detail', () => {
  const members = Array.from({ length: 100 }, (_, index) => ({ id: index, lat: index % 10, lng: Math.floor(index / 10) }));
  const locations = clusterMembersByCoordinates(members);
  const sizes = [];
  for (const scale of [1, 10, 100, 10, 1]) {
    const clusters = clusterScreenLocations(locations, ([x, y]) => [x * scale, y * scale]);
    assert.equal(new Set(clusters.flatMap(cluster => cluster.members).map(member => member.id)).size, members.length);
    assert.equal(clusters.reduce((count, cluster) => count + cluster.members.length, 0), members.length);
    assert.ok(clusters.every(cluster => cluster.members.some(member => member.lat === cluster.lat && member.lng === cluster.lng)));
    sizes.push(clusters.length);
  }
  assert.ok(sizes[0] < sizes[1] && sizes[1] < sizes[2]);
  assert.equal(sizes[0], sizes[4]);
  assert.equal(sizes[1], sizes[3]);
  assert.equal(clusterScreenLocations(locations, point => point, 0).length, locations.length);
});

test('unprojectable locations retain their members without contaminating nearby groups', () => {
  const locations = clusterMembersByCoordinates([{ id: 'hidden', lat: 1, lng: 1 }, { id: 'shown', lat: 2, lng: 2 }]);
  const clusters = clusterScreenLocations(locations, ([x, y]) => x === 1 ? null : [x, y]);
  assert.equal(clusters.length, 2);
  assert.equal(clusters.flatMap(cluster => cluster.members).length, 2);
  assert.equal(clusters[1].x, 2);
});
