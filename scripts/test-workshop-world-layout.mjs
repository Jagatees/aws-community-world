import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { AVENUE_SPACING, BLOCK_SPACING, DISPLAY_HALF_DEPTH, DISPLAY_HALF_WIDTH, ROOM_HALF_WIDTH, buildStreetLayout, blockedByShop, shopEntrance, shopLocalPosition, interiorLayout, streetAtPosition, streetEntrance } from '../src/utils/workshopWorldLayout.js';
import { countServiceWorkshops, filterServices, DEFAULT_WORKSHOP_FILTERS } from '../src/utils/workshops.js';
const catalog = JSON.parse(await readFile('src/data/workshops.json', 'utf8'));
const counts = countServiceWorkshops(catalog.workshops);
const world = buildStreetLayout(filterServices(catalog, DEFAULT_WORKSHOP_FILTERS), counts);
const layout = world.shops;

test('each category has one continuous street and each service has exactly one shop', () => {
  assert.deepEqual(world.streets.map(street => street.category).sort(), [...new Set(catalog.services.map(service => service.category))].sort());
  assert.equal(new Set(layout.map(shop => shop.id)).size, catalog.services.length);
  for (const street of world.streets) {
    const shops = layout.filter(shop => shop.streetId === street.id);
    assert.equal(shops.length, street.shopCount);
    assert.equal(shops.filter(shop => shop.count).length, street.openCount);
    for (const shop of shops) {
      assert.equal(shop.category, street.category);
      assert.ok(shop.z > street.startZ && shop.z < street.endZ);
    }
    const entrance = streetEntrance(street);
    assert.ok(!layout.some(shop => blockedByShop(shop, entrance.x, entrance.z)));
    assert.equal(streetAtPosition(world.streets, entrance.x, entrance.z).id, street.id, 'Arriving on a street identifies the selected category');
    assert.ok(entrance.z >= world.bounds.minZ && entrance.z <= world.bounds.maxZ);
  }
  const reordered = buildStreetLayout([...catalog.services].reverse(), counts);
  assert.deepEqual(reordered.shops.map(shop => [shop.id, shop.x, shop.z]), layout.map(shop => [shop.id, shop.x, shop.z]), 'Directory ordering does not move storefronts');
});

test('every service gets a unique walkable address on connected avenues', () => {
  assert.equal(layout.length, catalog.services.length);
  assert.equal(new Set(layout.map(shop => `${shop.x},${shop.z}`)).size, layout.length);
  for (const shop of layout) {
    const entrance = shopEntrance(shop);
    const local = shopLocalPosition(shop, entrance.x, entrance.z);
    assert.ok(Math.abs(local.x) < .001 && Math.abs(local.z - 7.2) < .001);
    assert.ok(!layout.some(other => blockedByShop(other, entrance.x, entrance.z)), 'Every entrance is reachable outside walls');
    assert.ok(blockedByShop(shop, shop.x, shop.z), 'Solid building centers are not walkable');
    const door = shopEntrance(shop, 4.3);
    assert.equal(blockedByShop(shop, door.x, door.z), !shop.count, 'Only stocked shops have passable doorways');
  }
});
test('compact cloud lanes keep their cross paths clear between every row of shops', () => {
  for (let row = 0; row < world.maxRows; row++) {
    const z = row * BLOCK_SPACING - BLOCK_SPACING / 2;
    for (let x = 0; x <= AVENUE_SPACING * 2; x += .5) {
      assert.ok(!layout.some(shop => blockedByShop(shop, x, z)), `Cross path is obstructed at ${x}, ${z}`);
    }
  }
});
test('every workshop has an item, with a clear central aisle and room to reach the last display', () => {
  for (const shop of layout.filter(shop => shop.count)) {
    const stock = catalog.workshops.filter(item => item.serviceIds.includes(shop.id));
    const room = interiorLayout(stock);
    assert.equal(room.displays.length, stock.length);
    assert.equal(new Set(room.displays.map(item => `${item.x},${item.z}`)).size, stock.length);
    for (const item of room.displays) {
      assert.ok(Math.abs(item.x) - DISPLAY_HALF_WIDTH > 1.2, 'Keep a central walking aisle clear');
      assert.ok(Math.abs(item.x) + DISPLAY_HALF_WIDTH < ROOM_HALF_WIDTH - .5, 'Outer displays remain reachable from the wall side');
      assert.ok(item.z - DISPLAY_HALF_DEPTH > 8 - room.depth + 1, 'Leave room behind the final row');
      assert.ok(!room.displays.some(other => other.id !== item.id && Math.abs(other.x - item.x) < 2 * DISPLAY_HALF_WIDTH && Math.abs(other.z - item.z) < 2 * DISPLAY_HALF_DEPTH), 'Display collision volumes do not overlap');
    }
  }
});
