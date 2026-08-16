/**
 * Groups records only when their source coordinates are identical.
 *
 * Nearby records remain separate so every marker is placed at the latitude
 * and longitude supplied by its source JSON entry.
 *
 * @param {import('../types').Member[]} members
 * @returns {{ lat: number, lng: number, members: import('../types').Member[], forceSeparateMarker?: boolean }[]}
 */
export function clusterMembersByCoordinates(members) {
  const clusters = [];
  const clustersByCoordinates = new Map();

  for (const member of members) {
    if (member.forceSeparateMarker) {
      clusters.push({
        lat: member.lat,
        lng: member.lng,
        members: [member],
        forceSeparateMarker: true,
      });
      continue;
    }

    const coordinateKey = `${member.lat}:${member.lng}`;
    const existing = clustersByCoordinates.get(coordinateKey);

    if (existing) {
      existing.members.push(member);
      continue;
    }

    const cluster = {
      lat: member.lat,
      lng: member.lng,
      members: [member],
    };
    clustersByCoordinates.set(coordinateKey, cluster);
    clusters.push(cluster);
  }

  return clusters;
}
