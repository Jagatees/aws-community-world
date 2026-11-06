import { clusterMembersByCoordinates } from './mapCoordinates.js';

// Geographic bins keep frame work bounded even when every person has a unique
// coordinate. Zoom reveals progressively smaller groups; clicks retain all people.
export const GLOBE_CLUSTER_STEPS = [30, 15, 7.5];
// Earth can zoom much closer than Minimal. Reveal detail gradually instead of
// switching straight from regional groups to every portrait on the planet.
export const EARTH_CLUSTER_STEPS = [...GLOBE_CLUSTER_STEPS, 3.75, 1.875, 0];
const EARTH_DETAIL_ALTITUDES = [2.2, 1.5, 1, 0.55, 0.25];
const EARTH_ZOOM_TARGETS = [1.8, 1.2, 0.75, 0.4, 0.18, 0.18];
const ZOOM_HYSTERESIS = 0.05;
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

function buildClusterLevels(members, steps) {
  const locations = clusterMembersByCoordinates(members.filter((member) =>
    Number.isFinite(member.lat) && Number.isFinite(member.lng)
    && member.lat >= -90 && member.lat <= 90 && member.lng >= -180 && member.lng <= 180
  ));
  // Dense portrait groups can be crowded even when many people share a city.
  const validMemberCount = locations.reduce((count, location) => count + location.members.length, 0);
  if (validMemberCount <= INDIVIDUAL_LOCATION_LIMIT) return steps.map(() => locations);
  return steps.map((step) => groupGlobeLocations(locations, step));
}

export function buildGlobeClusterLevels(members) {
  return buildClusterLevels(members, GLOBE_CLUSTER_STEPS);
}

export function buildEarthClusterLevels(members) {
  return buildClusterLevels(members, EARTH_CLUSTER_STEPS);
}

export function getEarthClusterLevel(altitude, previousLevel) {
  // OrbitControls damping and floating-point drift must not repeatedly replace
  // marker layers when the camera rests at a detail boundary.
  if (Number.isInteger(previousLevel) && previousLevel >= 0 && previousLevel < EARTH_CLUSTER_STEPS.length) {
    let level = previousLevel;
    while (level < EARTH_DETAIL_ALTITUDES.length
      && altitude < EARTH_DETAIL_ALTITUDES[level] * (1 - ZOOM_HYSTERESIS)) level += 1;
    while (level > 0
      && altitude >= EARTH_DETAIL_ALTITUDES[level - 1] * (1 + ZOOM_HYSTERESIS)) level -= 1;
    return level;
  }
  const level = EARTH_DETAIL_ALTITUDES.findIndex((threshold) => altitude >= threshold);
  return level === -1 ? EARTH_DETAIL_ALTITUDES.length : level;
}

export function getEarthClusterZoomAltitude(level) {
  return EARTH_ZOOM_TARGETS[level] ?? EARTH_ZOOM_TARGETS[0];
}

export function getGlobeClusterLevel(scale) {
  if (scale >= 2.15) return 2;
  if (scale >= 1.35) return 1;
  return 0;
}
