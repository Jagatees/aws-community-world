function tokenizeName(name) {
  return String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function compactPlaceLabel(value) {
  const words = String(value ?? '')
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean);

  if (!words.length) return '';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export function getMemberImage(member) {
  if (member.avatarUrl) return member.avatarUrl;
  if (Array.isArray(member.ledBy)) {
    const leaderImage = member.ledBy.find((leader) => leader?.imageUrl)?.imageUrl;
    if (leaderImage) return leaderImage;
  }
  return '';
}

export function getMemberBadgeLabel(member) {
  const words = tokenizeName(member?.name);
  if (!words.length) return 'AWS';

  if (member?.category === 'user-groups') {
    const locationLabel = compactPlaceLabel(String(member?.location ?? '').split(',')[0]);
    if (locationLabel) return locationLabel;

    const filtered = words.filter((word) => !['aws', 'user', 'group'].includes(word.toLowerCase()));
    const source = filtered.length ? filtered : words;

    if (source.length === 1) {
      return source[0].slice(0, 3).toUpperCase();
    }

    return source
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}
