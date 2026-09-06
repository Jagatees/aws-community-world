// Explicitly verified community additions can outlive gaps in the upstream directory.
// A returning upstream entry wins, so additions do not overwrite refreshed details.
const key = (url) => String(url || '').trim().replace(/\/+$/, '').toLowerCase();

export function includeStudentGroupAdditions(groups, additions) {
  const result = [...groups];
  const seen = new Set(groups.map((group) => key(group.joinUrl)).filter(Boolean));
  for (const addition of additions) {
    const url = key(addition.joinUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push(addition);
  }
  return result;
}
