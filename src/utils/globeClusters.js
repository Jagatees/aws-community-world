import { clusterMembersByCoordinates } from './mapCoordinates.js';

// Geographic bins keep frame work bounded even when every person has a unique
// coordinate. Zoom reveals progressively smaller groups; clicks retain all people.
export const GLOBE_CLUSTER_STEPS = [18, 9, 4.5];
const INDIVIDUAL_LOCATION_LIMIT = 128;

export function groupGlobeLocations(locations, cellDegrees) {
  if (!Number.isFinite(cellDegrees) || cellDegrees <= 0) return locations;
  const groups = [];
  const cells = new Map();
  const latitudeCells = Math.ceil(180 / cellDegrees);

  for (const location of locations) {
    // Summary markers drill into one country in App. Keep that contract, as well
    // as explicit source requests for a separate marker.
    if (location.forceSeparateMarker || location.members.some((member) => member.clusterOnly || member.builderCount)) {
      groups.push(location);
      continue;
    }

    const longitude = ((location.lng + 180) % 360 + 360) % 360;
    const row = Math.min(latitudeCells - 1, Math.floor((location.lat + 90) / cellDegrees));
    const key = `${row}:${Math.floor(longitude / cellDegrees)}`;
    const existing = cells.get(key);
    if (existing) {
      for (const member of location.members) existing.members.push(member);
      existing.isApproximate = true;
    } else {
      // Anchor to a real source location, without modifying member coordinates.
      const group = { ...location, members: [...location.members], isApproximate: false };
      cells.set(key, group);
      groups.push(group);
    }
  }
  return groups;
}

export function buildGlobeClusterLevels(members) {
  const locations = clusterMembersByCoordinates(members.filter((member) =>
    Number.isFinite(member.lat) && Number.isFinite(member.lng)
    && member.lat >= -90 && member.lat <= 90 && member.lng >= -180 && member.lng <= 180
  ));
  // Dense portrait groups can be crowded even when many people share a city.
  if (members.length <= INDIVIDUAL_LOCATION_LIMIT) return [locations, locations, locations];
  return GLOBE_CLUSTER_STEPS.map((step) => groupGlobeLocations(locations, step));
}

export function getGlobeClusterLevel(scale) {
  if (scale >= 2.15) return 2;
  if (scale >= 1.35) return 1;
  return 0;
}
