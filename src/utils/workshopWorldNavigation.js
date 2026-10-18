import { BLOCK_SPACING, LANE_CENTERS, shopEntrance } from './workshopWorldLayout.js';

export const distance2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function routeLength(points) { return points.slice(1).reduce((sum, point, index) => sum + distance2D(points[index], point), 0); }
export function pointOnRoute(points, distance) {
  for (let i = 1; i < points.length; i++) {
    const length = distance2D(points[i - 1], points[i]);
    if (distance <= length && length) { const t = Math.max(0, distance) / length; return { x: points[i - 1].x + (points[i].x - points[i - 1].x) * t, z: points[i - 1].z + (points[i].z - points[i - 1].z) * t }; }
    distance -= length;
  }
  return points.at(-1) || { x: 0, z: 0 };
}
export function projectOnRoute(points, point) {
  let nearest = { distance: Infinity, progress: 0 }, walked = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (length * length))) : 0;
    const distance = distance2D(point, { x: a.x + dx * t, z: a.z + dz * t });
    if (distance < nearest.distance) nearest = { distance, progress: walked + length * t };
    walked += length;
  }
  return nearest;
}

// Exact segment/rectangle intersection prevents a shortcut through a shop corner.
function crossesShop(a, b, shop) {
  let from = 0, to = 1;
  for (const [axis, radius] of [['x', 4.85], ['z', 5.35]]) {
    const min = shop[axis] - radius, max = shop[axis] + radius, delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-9) { if (a[axis] <= min || a[axis] >= max) return false; }
    else { const t1 = (min - a[axis]) / delta, t2 = (max - a[axis]) / delta; from = Math.max(from, Math.min(t1, t2)); to = Math.min(to, Math.max(t1, t2)); if (from >= to) return false; }
  }
  return from < to;
}

export function createWorldNavigator(world) {
  const { shops, bounds, maxRows } = world;
  const inside = point => point.x >= bounds.minX && point.x <= bounds.maxX && point.z >= bounds.minZ && point.z <= bounds.maxZ;
  const clear = (a, b) => inside(a) && inside(b) && !shops.some(shop => crossesShop(a, b, shop));
  const xs = [bounds.minX + 1.5, ...LANE_CENTERS.flatMap((x, i) => i < LANE_CENTERS.length - 1 ? [x, (x + LANE_CENTERS[i + 1]) / 2] : [x]), bounds.maxX - 1.5];
  const zs = [bounds.minZ + .5, ...Array.from({ length: maxRows + 1 }, (_, i) => i * BLOCK_SPACING - BLOCK_SPACING / 2), bounds.maxZ - .5].filter(z => z >= bounds.minZ && z <= bounds.maxZ);
  const nodes = zs.flatMap(z => xs.map(x => ({ x, z }))), edges = nodes.map(() => []);
  function connect(graph, points, a, b) { const cost = distance2D(points[a], points[b]); graph[a].push([b, cost]); graph[b].push([a, cost]); }
  nodes.forEach((node, i) => {
    if (i % xs.length && clear(nodes[i - 1], node)) connect(edges, nodes, i - 1, i);
    if (i >= xs.length && clear(nodes[i - xs.length], node)) connect(edges, nodes, i - xs.length, i);
  });
  function route(start, goal) {
    const a = { x: start.x, z: start.z }, b = { x: goal.x, z: goal.z };
    if (clear(a, b)) return [a, b];
    if (!inside(a) || !inside(b)) return [];
    const points = [...nodes, a, b], graph = edges.map(list => [...list]); graph.push([], []);
    for (const index of [nodes.length, nodes.length + 1]) {
      const nearest = nodes.map((point, i) => ({ i, distance: distance2D(point, points[index]) })).sort((p, q) => p.distance - q.distance).slice(0, 16);
      for (const { i } of nearest) if (clear(points[index], points[i])) connect(graph, points, index, i);
    }
    const startIndex = nodes.length, goalIndex = startIndex + 1;
    const cost = points.map(() => Infinity), previous = points.map(() => -1), pending = new Set([startIndex]); cost[startIndex] = 0;
    while (pending.size) {
      let current = -1, best = Infinity;
      for (const index of pending) { const estimate = cost[index] + distance2D(points[index], b); if (estimate < best) { best = estimate; current = index; } }
      if (current === goalIndex) break;
      pending.delete(current);
      for (const [next, weight] of graph[current]) if (cost[current] + weight < cost[next]) { cost[next] = cost[current] + weight; previous[next] = current; pending.add(next); }
    }
    if (!Number.isFinite(cost[goalIndex])) return [];
    const path = []; for (let index = goalIndex; index !== -1; index = previous[index]) path.unshift(points[index]);
    // Keep only visible corners while retaining collision-free segments.
    const result = [path[0]];
    for (let i = 0; i < path.length - 1;) { let next = path.length - 1; while (next > i + 1 && !clear(path[i], path[next])) next--; result.push(path[next]); i = next; }
    return result;
  }
  return { route, clear, toShop: (start, shop) => route(start, shopEntrance(shop)) };
}
