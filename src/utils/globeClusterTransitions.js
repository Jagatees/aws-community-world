export const GLOBE_CLUSTER_TRANSITION_MS = 420;

function strongestOwner(members, owners) {
  const counts = new Map();
  let best;
  let highest = 0;
  for (const member of members) {
    const owner = owners.get(member);
    if (!owner) continue;
    const count = (counts.get(owner) ?? 0) + 1;
    counts.set(owner, count);
    if (count > highest) { best = owner; highest = count; }
  }
  return best;
}

function createRecord(cluster) {
  return { ...cluster, cluster, lat: cluster.lat, lng: cluster.lng, alpha: 1, exiting: false, complete: false, transition: null };
}

function startTransition(record, from, now, exiting = false) {
  record.exiting = exiting;
  record.complete = false;
  record.lat = from.lat;
  record.lng = from.lng;
  record.alpha = exiting ? from.alpha : Math.min(0.35, from.alpha);
  record.transition = {
    start: now, fromLat: from.lat, fromLng: from.lng, fromAlpha: record.alpha,
    toLat: record.cluster.lat, toLng: record.cluster.lng, toAlpha: exiting ? 0 : 1,
  };
  return record;
}

// Display positions belong to these records. Never mutate a source cluster or
// member: the same precomputed cluster may be revisited after a fast reversal.
export function reconcileGlobeClusters(previous, nextClusters, now = performance.now(), animate = true) {
  sampleGlobeClusters(previous, now);
  const old = previous.filter(record => !record.exiting && !record.complete);
  const oldByMember = new Map();
  old.forEach(record => record.cluster.members.forEach(member => oldByMember.set(member, record)));
  const nextByMember = new Map();
  const reused = new Set();
  const next = nextClusters.map(cluster => {
    const source = strongestOwner(cluster.members, oldByMember);
    let record;
    const same = source && source.cluster.lat === cluster.lat && source.cluster.lng === cluster.lng
      && Boolean(source.cluster.isApproximate) === Boolean(cluster.isApproximate)
      && Boolean(source.cluster.compactOverview) === Boolean(cluster.compactOverview)
      && source.cluster.members.length === cluster.members.length
      && cluster.members.every(member => oldByMember.get(member) === source);
    if (same) {
      record = source;
      reused.add(source);
      const { lat, lng, alpha, transition } = record;
      Object.assign(record, cluster, { cluster, lat, lng, alpha, transition });
      if (!animate) Object.assign(record, { lat: cluster.lat, lng: cluster.lng, alpha: 1, transition: null });
    } else {
      record = createRecord(cluster);
      if (animate && source) startTransition(record, source, now);
    }
    cluster.members.forEach(member => nextByMember.set(member, record));
    return record;
  });
  if (!animate) return next;
  for (const record of old) {
    if (reused.has(record)) continue;
    const target = strongestOwner(record.cluster.members, nextByMember);
    if (!target) continue;
    const from = { lat: record.lat, lng: record.lng, alpha: record.alpha };
    startTransition(record, from, now, true);
    record.transition.toLat = target.cluster.lat;
    record.transition.toLng = target.cluster.lng;
    next.push(record);
  }
  return next;
}

// Records and their array stay stable while a transition is sampled. Renderers
// can update geometry each frame without recreating HTML nodes or click targets.
export function sampleGlobeClusters(records, now = performance.now()) {
  for (const record of records) {
    const transition = record.transition;
    if (!transition) continue;
    const progress = Math.max(0, Math.min(1, (now - transition.start) / GLOBE_CLUSTER_TRANSITION_MS));
    const eased = 1 - (1 - progress) ** 3;
    const longitudeDelta = ((transition.toLng - transition.fromLng + 180) % 360 + 360) % 360 - 180;
    record.lat = transition.fromLat + (transition.toLat - transition.fromLat) * eased;
    record.lng = transition.fromLng + longitudeDelta * eased;
    record.alpha = transition.fromAlpha + (transition.toAlpha - transition.fromAlpha) * eased;
    if (progress === 1) {
      record.lat = transition.toLat;
      record.lng = transition.toLng;
      record.alpha = transition.toAlpha;
      record.transition = null;
      record.complete = record.exiting;
    }
  }
  return records;
}

export function hasGlobeClusterTransitions(records) {
  return records.some(record => Boolean(record.transition));
}
