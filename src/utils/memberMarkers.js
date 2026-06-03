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
  if (member?.clusterOnly && member?.builderCount) {
    if (member.builderCount >= 1000) return `${Math.round(member.builderCount / 100) / 10}K`;
    return String(member.builderCount);
  }

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

export function hasNewMember(value) {
  const members = Array.isArray(value) ? value : [value];
  return members.some((member) => member?.isNew);
}

export function createNewMemberBadgeElement(darkMode) {
  const badge = document.createElement('span');
  badge.textContent = 'NEW';
  badge.title = 'New community builder';
  badge.style.position = 'absolute';
  badge.style.right = '-8px';
  badge.style.top = '-8px';
  badge.style.minWidth = '28px';
  badge.style.height = '16px';
  badge.style.padding = '0 6px';
  badge.style.borderRadius = '999px';
  badge.style.display = 'inline-flex';
  badge.style.alignItems = 'center';
  badge.style.justifyContent = 'center';
  badge.style.background = '#FF9900';
  badge.style.color = '#0F1923';
  badge.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
  badge.style.fontSize = '8px';
  badge.style.fontWeight = '900';
  badge.style.lineHeight = '1';
  badge.style.letterSpacing = '0.04em';
  badge.style.zIndex = '20';
  badge.style.pointerEvents = 'none';
  return badge;
}
