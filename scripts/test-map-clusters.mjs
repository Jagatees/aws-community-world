import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { test } from 'node:test';
import { clusterMembersByCoordinates } from '../src/utils/mapCoordinates.js';
import { clusterMapLocations, getMapClusterStep, zoomToMapCluster } from '../src/utils/mapClusters.js';
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

function createClickMap({ lng = 0, zoom = 3, width = 1000, height = 600 } = {}) {
  return {
    getCenter: () => ({ lng }),
    getZoom: () => zoom,
    getCanvas: () => ({ clientWidth: width, clientHeight: height }),
    fitBounds(bounds, options) { this.fit = { bounds, options }; },
    easeTo(options) { this.ease = options; },
  };
}

test('cluster clicks fit every valid source location with room for markers', () => {
  const map = createClickMap({ lng: 102 });
  const cluster = { members: [
    { lat: 1, lng: 100 }, { lat: 5, lng: 104 }, { lat: 2, lng: 101 },
    { lat: 95, lng: 150 }, { lat: NaN, lng: 1 }, { lat: 1, lng: Infinity },
  ] };
  const original = structuredClone(cluster);
  zoomToMapCluster(map, cluster);
  assert.deepEqual(map.fit, {
    bounds: [[100, 1], [104, 5]],
    options: { padding: 64, duration: 650, maxZoom: 12 },
  });
  assert.equal(map.ease, undefined);
  assert.deepEqual(cluster, original, 'fitting bounds must not change source locations or membership');
});

test('cluster click bounds use the shortest antimeridian interval near the camera world', () => {
  const cluster = { members: [{ lat: -4, lng: 179 }, { lat: 6, lng: -179 }, { lat: 2, lng: 178 }] };
  for (const [cameraLongitude, expectedWest] of [[179, 178], [-179, -182], [540, 538]]) {
    const map = createClickMap({ lng: cameraLongitude });
    zoomToMapCluster(map, cluster);
    assert.deepEqual(map.fit.bounds, [[expectedWest, -4], [expectedWest + 3, 6]]);
    assert.equal(map.fit.bounds[1][0] - map.fit.bounds[0][0], 3);
  }
});

test('vertical groups fit bounds and use padding that leaves room on mobile', () => {
  const map = createClickMap({ lng: 10, width: 320, height: 568 });
  zoomToMapCluster(map, { members: [{ lat: 1, lng: 10 }, { lat: 2, lng: 10 }] });
  assert.deepEqual(map.fit.bounds, [[10, 1], [10, 2]]);
  assert.equal(map.fit.options.padding, 58);
  assert.ok(map.fit.options.padding * 2 < map.getCanvas().clientWidth);
  assert.equal(map.ease, undefined);
});

test('coincident cluster clicks zoom toward their location without degenerate bounds', () => {
  const map = createClickMap({ lng: 179, zoom: 11.5 });
  zoomToMapCluster(map, { members: [{ lat: 1, lng: 180 }, { lat: 1, lng: -180 }] });
  assert.deepEqual(map.ease, { center: [180, 1], zoom: 12, duration: 650 });
  assert.equal(map.fit, undefined);
  const emptyMap = createClickMap();
  zoomToMapCluster(emptyMap, { members: [{ lat: NaN, lng: 1 }] });
  assert.equal(emptyMap.ease, undefined);
  assert.equal(emptyMap.fit, undefined);
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
