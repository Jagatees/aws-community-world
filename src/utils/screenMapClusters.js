// Group in rendered pixels, including neighbours across hash-cell boundaries.
// A cluster stays anchored to a source coordinate so zooming never changes data.
export function clusterScreenLocations(locations, project, radius = 48) {
  const clusters = [];
  const cells = new Map();
  const canGroup = Number.isFinite(radius) && radius > 0;

  for (const location of locations) {
    const point = project([location.lng, location.lat]);
    const x = Array.isArray(point) ? point[0] : point?.x;
    const y = Array.isArray(point) ? point[1] : point?.y;
    const projected = { ...location, x, y, members: [...location.members], isApproximate: false };
    if (!canGroup || !Number.isFinite(x) || !Number.isFinite(y)
      || location.forceSeparateMarker
      || location.members.some(member => member.clusterOnly || member.builderCount)) {
      clusters.push(projected);
      continue;
    }

    const column = Math.floor(x / radius);
    const row = Math.floor(y / radius);
    let nearest = null;
    let distanceSquared = radius * radius;
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (const candidate of cells.get(`${column + dx}:${row + dy}`) ?? []) {
          const distance = (candidate.x - x) ** 2 + (candidate.y - y) ** 2;
          if (distance <= distanceSquared) {
            nearest = candidate;
            distanceSquared = distance;
          }
        }
      }
    }
    if (nearest) {
      nearest.members.push(...location.members);
      nearest.isApproximate = true;
    } else {
      const key = `${column}:${row}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(projected);
      clusters.push(projected);
    }
  }
  return clusters;
}
