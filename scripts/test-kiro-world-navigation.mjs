import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildStreetLayout, blockedByShop, shopEntrance, WORLD_START } from '../src/utils/workshopWorldLayout.js';
import { countServiceWorkshops } from '../src/utils/workshops.js';
import { createWorldNavigator, distance2D, pointOnRoute, projectOnRoute, routeLength } from '../src/utils/workshopWorldNavigation.js';
const catalog = JSON.parse(await readFile('src/data/workshops.json', 'utf8'));
const world = buildStreetLayout(catalog.services, countServiceWorkshops(catalog.workshops));
const navigator = createWorldNavigator(world);
function checkRoute(start, target) {
  const route = navigator.route(start, target);
  assert.ok(route.length >= 2, 'A walkable route exists');
  assert.ok(distance2D(route[0], start) < .001 && distance2D(route.at(-1), target) < .001);
  const length = routeLength(route);
  for (let distance = 0; distance <= length; distance += .5) {
    const point = pointOnRoute(route, distance);
    assert.ok(!world.shops.some(shop => blockedByShop(shop, point.x, point.z)), 'Floor trail does not pass through buildings');
  }
  return route;
}
test('Kiro can guide to every open or closed shop from the plaza and the far alley', () => {
  for (const start of [WORLD_START, { x: world.bounds.maxX - 1, z: world.bounds.maxZ - 1 }]) {
    for (const shop of world.shops) checkRoute(start, shopEntrance(shop));
  }
});
test('routes around building corners between streets instead of cutting through shops', () => {
  const start = shopEntrance(world.shops[0]), target = shopEntrance(world.shops.find(shop => shop.avenue === 2));
  const route = checkRoute(start, target);
  assert.ok(route.length > 2, 'Cross-street route has a corner');
  assert.ok(routeLength(route) > distance2D(start, target));
  assert.deepEqual(navigator.route(start, { x: world.bounds.maxX + 1, z: 0 }), []);
});
test('route progress and interpolation respect corners and endpoints', () => {
  const route = [{ x: 0, z: 0 }, { x: 0, z: 10 }, { x: 6, z: 10 }];
  assert.equal(routeLength(route), 16);
  assert.deepEqual(pointOnRoute(route, 12), { x: 2, z: 10 });
  assert.deepEqual(pointOnRoute(route, 100), route.at(-1));
  assert.deepEqual(projectOnRoute(route, { x: 2, z: 12 }), { distance: 2, progress: 12 });
});
