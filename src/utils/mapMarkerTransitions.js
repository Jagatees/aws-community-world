export const MAP_CLUSTER_ANIMATION_MS = 300;

function progress(transition, now) {
  const value = Math.min(1, Math.max(0, (now - transition.start) / MAP_CLUSTER_ANIMATION_MS));
  return { value, eased: 1 - (1 - value) ** 3 };
}

function interpolateLocation(from, to, amount) {
  const longitude = ((to.lng - from.lng + 540) % 360) - 180;
  return { lat: from.lat + (to.lat - from.lat) * amount, lng: from.lng + longitude * amount };
}

function currentLocation(marker, now) {
  if (!marker.transition) return marker.cluster;
  return interpolateLocation(marker.transition.from, marker.transition.to, progress(marker.transition, now).eased);
}

function currentOffset(marker, now) {
  if (!marker.transition) return marker.heightOffset ?? 0;
  const { fromOffset = 0, toOffset = 0 } = marker.transition;
  return fromOffset + (toOffset - fromOffset) * progress(marker.transition, now).eased;
}

function strongestMatch(members, lookup) {
  const matches = new Map();
  let best;
  let bestCount = 0;
  for (const member of members) {
    const match = lookup.get(member);
    if (!match) continue;
    const count = (matches.get(match) ?? 0) + 1;
    matches.set(match, count);
    if (count > bestCount) { best = match; bestCount = count; }
  }
  return best;
}

export function removeMapMarkers(markers) {
  markers.forEach(marker => marker.element?.remove());
}

// Match using source member identity, never coordinates: several independent
// records can legitimately occupy the same location. Keep unchanged DOM cached.
export function reconcileMapMarkers(previous, next, { animate = true, now = performance.now() } = {}) {
  const old = previous.filter(marker => !marker.exiting);
  previous.filter(marker => marker.exiting).forEach(marker => marker.element?.remove());
  if (!animate) {
    removeMapMarkers(old);
    return next;
  }
  const oldByMember = new Map();
  const nextByMember = new Map();
  old.forEach(marker => marker.cluster.members.forEach(member => oldByMember.set(member, marker)));
  next.forEach(marker => marker.cluster.members.forEach(member => nextByMember.set(member, marker)));
  const reused = new Set();
  const active = next.map(marker => {
    const source = strongestMatch(marker.cluster.members, oldByMember);
    if (!source) return marker;
    const same = source.heightOffset === marker.heightOffset
      && source.cluster.members.length === marker.cluster.members.length
      && marker.cluster.members.every(member => oldByMember.get(member) === source);
    if (same) {
      reused.add(source);
      // An ongoing transition continues through camera events and quick reversals.
      return { ...source, ...marker, element: source.element, portrait: source.portrait,
        countdown: source.countdown, x: source.x, y: source.y, separation: source.separation,
        transition: source.transition };
    }
    marker.transition = { from: currentLocation(source, now), to: marker.cluster,
      fromOffset: currentOffset(source, now), toOffset: marker.heightOffset ?? 0, start: now };
    return marker;
  });
  for (const marker of old) {
    if (reused.has(marker)) continue;
    const target = strongestMatch(marker.cluster.members, nextByMember);
    if (!target || !marker.element?.isConnected) {
      marker.element?.remove();
      continue;
    }
    marker.exiting = true;
    marker.transition = { from: currentLocation(marker, now), to: target.cluster,
      fromOffset: currentOffset(marker, now), toOffset: target.heightOffset ?? 0, start: now };
    marker.element.inert = true;
    marker.element.setAttribute('aria-hidden', 'true');
    marker.element.dataset.clusterExiting = 'true';
    marker.element.style.pointerEvents = 'none';
    active.push(marker);
  }
  return active;
}

export function hasMapMarkerTransitions(markers) {
  return markers.some(marker => marker.transition);
}

// Project both endpoints against the current camera, so zooming and panning
// during a split do not leave animation paths attached to stale screen pixels.
export function getMapMarkerPosition(marker, map, destination, now = performance.now()) {
  const transition = marker.transition;
  if (!transition) return destination;
  const { value, eased } = progress(transition, now);
  if (value === 1) {
    marker.transition = null;
    if (marker.exiting) {
      marker.element?.remove();
      marker.disposed = true;
    } else if (marker.element) marker.element.style.opacity = '';
    return destination;
  }
  const from = map.project([transition.from.lng, transition.from.lat]);
  const to = marker.exiting ? map.project([transition.to.lng, transition.to.lat]) : destination;
  from.y -= transition.fromOffset ?? 0;
  if (marker.exiting) to.y -= transition.toOffset ?? 0;
  if (marker.element) marker.element.style.opacity = String(marker.exiting ? 1 - eased : 0.25 + 0.75 * eased);
  return { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased };
}
