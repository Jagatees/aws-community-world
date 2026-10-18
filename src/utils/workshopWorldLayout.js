export const AVENUE_SPACING = 32;
export const BLOCK_SPACING = 12.8;
export const SHOP_OFFSET = 9.5;
export const LANE_CENTERS = [0, AVENUE_SPACING, AVENUE_SPACING * 2];
export const WORLD_START = { x: 0, z: -9, yaw: Math.PI };
export const ROOM_HALF_WIDTH = 7.4;
export const DISPLAY_HALF_WIDTH = 1.15;
export const DISPLAY_HALF_DEPTH = 1.05;

const STREET_ORDER = ['AI & Machine Learning', 'Compute', 'Storage', 'Databases', 'Analytics', 'Serverless', 'Containers', 'Developer Tools', 'Networking & Content Delivery', 'Security, Identity & Compliance'];
const STREET_NAMES = { 'AI & Machine Learning': 'AI & ML', 'Networking & Content Delivery': 'Networking', 'Security, Identity & Compliance': 'Security', 'Management & Governance': 'Management', 'Cloud Financial Management': 'Cloud Finance', 'Front End Web & Mobile': 'Web & Mobile', 'More services & features': 'Discovery', 'Aerospace & Satellite': 'Space', 'End-User Computing': 'Workspaces', 'Internet of Things': 'IoT' };
const COLORS = { 'AI & Machine Learning': '#1eae94', Compute: '#eb8c32', Containers: '#e89237', Databases: '#ac61bf', Storage: '#88a63e', Analytics: '#9272cd', Serverless: '#e9a23f', 'Application Integration': '#d45e91', 'Security, Identity & Compliance': '#cd5869', 'Networking & Content Delivery': '#8c78c7' };
const STREET_PALETTE = ['#6c9fda', '#cc83ba', '#68adac', '#c9a059', '#9385ce', '#ad8d79'];

export function streetColor(category) {
  const hash = Array.from(category).reduce((value, letter) => value + letter.charCodeAt(0), 0);
  return COLORS[category] || STREET_PALETTE[hash % STREET_PALETTE.length];
}

// One shop per service, on its catalog primary category's street. Pack streets
// into the shortest of three connected lanes instead of adding empty districts.
export function buildStreetLayout(services, counts) {
  const categories = [...new Set(services.map(service => service.category))].sort((a, b) => {
    const rank = category => STREET_ORDER.includes(category) ? STREET_ORDER.indexOf(category) : STREET_ORDER.length;
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  const rows = LANE_CENTERS.map(() => 0), shops = [], streets = [];
  for (const category of categories) {
    const members = services.filter(service => service.category === category).sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0) || a.name.localeCompare(b.name));
    const lane = rows.indexOf(Math.min(...rows)), firstRow = rows[lane], rowCount = Math.ceil(members.length / 2);
    const street = { id: category, category, name: `${STREET_NAMES[category] || category} Street`, color: streetColor(category), lane, x: LANE_CENTERS[lane],
      firstRow, rowCount, startZ: firstRow * BLOCK_SPACING - BLOCK_SPACING / 2, endZ: (firstRow + rowCount) * BLOCK_SPACING - BLOCK_SPACING / 2,
      shopCount: members.length, openCount: members.filter(service => counts.get(service.id)).length, shopIds: members.map(service => service.id) };
    streets.push(street);
    members.forEach((service, index) => {
      const side = index % 2 === 0 ? -1 : 1, block = Math.floor(index / 2);
      shops.push({ ...service, streetId: street.id, streetName: street.name, streetColor: street.color, avenue: lane, block,
        x: street.x + side * SHOP_OFFSET, z: (firstRow + block) * BLOCK_SPACING,
        rotation: side < 0 ? Math.PI / 2 : -Math.PI / 2, count: counts.get(service.id) || 0 });
    });
    rows[lane] += rowCount;
  }
  return { shops, streets, maxRows: Math.max(0, ...rows), bounds: { minX: -SHOP_OFFSET - 8, maxX: LANE_CENTERS.at(-1) + SHOP_OFFSET + 8, minZ: WORLD_START.z - 2, maxZ: Math.max(0, ...rows) * BLOCK_SPACING } };
}

export function buildShopLayout(services, counts) { return buildStreetLayout(services, counts).shops; }

export function streetEntrance(street) { return { x: street.x, z: street.startZ + .6, yaw: Math.PI }; }

export function streetAtPosition(streets, x, z) {
  let nearest = null, minDistance = Infinity;
  for (const street of streets) {
    const distance = Math.hypot(x - street.x, Math.max(street.startZ - z, 0, z - street.endZ));
    if (distance < minDistance) { nearest = street; minDistance = distance; }
  }
  return nearest;
}

export function shopLocalPosition(shop, x, z) {
  const dx = x - shop.x, dz = z - shop.z;
  return { x: Math.cos(shop.rotation) * dx - Math.sin(shop.rotation) * dz, z: Math.sin(shop.rotation) * dx + Math.cos(shop.rotation) * dz };
}

export function shopEntrance(shop, distance = 7.2) {
  return { x: shop.x + Math.sin(shop.rotation) * distance, z: shop.z + Math.cos(shop.rotation) * distance, yaw: shop.rotation };
}

export function blockedByShop(shop, x, z) {
  const local = shopLocalPosition(shop, x, z);
  if (Math.abs(local.x) > 5.35 || Math.abs(local.z) > 4.85) return false;
  return !(shop.count && Math.abs(local.x) < 1.05 && local.z > 3.7);
}

export function interiorLayout(workshops) {
  return { depth: Math.max(14, Math.ceil(workshops.length / 4) * 3.2 + 9.5),
    displays: workshops.map((item, index) => ({ ...item, number: index + 1, x: [-5.25, -2.85, 2.85, 5.25][index % 4], z: -Math.floor(index / 4) * 3.2 })) };
}
