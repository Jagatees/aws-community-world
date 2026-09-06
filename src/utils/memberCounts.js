/** Count people represented by individual records and pre-aggregated builder records. */
export function getRepresentedMemberCount(value) {
  const members = Array.isArray(value) ? value : [value];
  let count = 0;
  for (const member of members) {
    if (!member) continue;
    count += Number.isFinite(member.builderCount) && member.builderCount > 0
      ? member.builderCount
      : 1;
  }
  return count;
}
