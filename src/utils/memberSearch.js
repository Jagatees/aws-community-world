// Keep the globe, directory and cluster searches consistent. Leaders are
// structured records: joining ledBy itself produces "[object Object]".
export function getMemberSearchText(member) {
  const leaderNames = Array.isArray(member.ledBy)
    ? member.ledBy.map((leader) => typeof leader === 'string' ? leader : leader?.name)
    : [];

  return [
    member.name,
    member.title,
    member.authorName,
    member.location,
    member.country,
    member.city,
    member.address,
    member.tag,
    member.tags,
    member.heroType,
    member.hero_type,
    member.builderType,
    member.specialization,
    member.organization,
    member.company,
    member.role,
    member.description,
    member.eventFormat,
    member.offerings,
    member.recognitionStatus,
    ...leaderNames,
  ].flat().filter((value) => typeof value === 'string').join(' ').toLocaleLowerCase();
}

// A result at one mapped location should be visible even if it is on the
// far side of the globe. Leave geographically scattered searches at overview.
export function getSearchFocusTarget(members) {
  const first = members[0];
  if (!first || !Number.isFinite(first.lat) || !Number.isFinite(first.lng)
    || (first.lat === 0 && first.lng === 0)) return null;
  return members.every((member) => member.lat === first.lat && member.lng === first.lng)
    ? { lat: first.lat, lng: first.lng }
    : null;
}
