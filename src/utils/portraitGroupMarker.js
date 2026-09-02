import { getMemberImage } from './memberMarkers';

const PREVIEW_COUNT = 3;
const CATEGORY_PLACEHOLDERS = {
  heroes: 'https://d1.awsstatic.com/getting-started-guides/new-heros-nov-2022/AWS-Heroes%20program-community-heroes_logo_dark.efe13e0d50fdf64d8a4524bf876d79a64dd82488.png',
  'community-builders': 'https://3sky.github.io/awscb-content-catalog/Logo.png',
  'cloud-clubs': '/student-builder-group-logo.png',
};

export const PORTRAIT_GROUP_CATEGORIES = new Set(['heroes', 'community-builders', 'cloud-clubs']);

export function getPortraitGroupCount(cluster) {
  if (cluster.members.length === 1 && cluster.members[0]?.clusterOnly) {
    return cluster.members[0].builderCount || 1;
  }
  return cluster.members.length;
}

export function getPortraitGroupMembers(cluster) {
  if (cluster.members.length === 1 && cluster.members[0]?.clusterOnly && cluster.members[0].ledBy?.length) {
    return cluster.members[0].ledBy.map((leader, index) => ({
      ...cluster.members[0],
      id: `${cluster.members[0].id}-preview-${index}`,
      name: leader.name || cluster.members[0].name,
      avatarUrl: leader.imageUrl || '',
      clusterOnly: false,
    }));
  }
  return cluster.members;
}

export function getPortraitPlaceholder(category) {
  return CATEGORY_PLACEHOLDERS[category] || CATEGORY_PLACEHOLDERS.heroes;
}

export function getMapboxPortraitSeparation(zoom) {
  return Math.min(Math.max((zoom - 1.15) / 1.75, 0), 1);
}

function getAvatarLayout(count, index) {
  if (count === 1) {
    return { size: 36, x: 0, y: 0, spreadX: 0, spreadY: 0, zIndex: 2 };
  }

  if (count === 2) {
    return index === 0
      ? { size: 34, x: -10, y: 0, spreadX: -5, spreadY: 0, zIndex: 2 }
      : { size: 34, x: 10, y: 0, spreadX: 5, spreadY: 0, zIndex: 1 };
  }

  const layouts = [
    { size: 34, x: 0, y: 7, spreadX: 0, spreadY: 1, zIndex: 3 },
    { size: 29, x: -16, y: -7, spreadX: -5, spreadY: -2, zIndex: 2 },
    { size: 29, x: 16, y: -7, spreadX: 5, spreadY: -2, zIndex: 1 },
  ];
  return layouts[index];
}

export function createPortraitGroupAvatar(cluster, { category, color, darkMode, separation = 0 }) {
  const previewMembers = getPortraitGroupMembers(cluster).slice(0, PREVIEW_COUNT);
  const placeholderUrl = getPortraitPlaceholder(category);
  const root = document.createElement('div');
  root.dataset.portraitClusterMarker = 'true';
  root.style.setProperty('--portrait-separation', String(separation));
  root.style.position = 'relative';
  root.style.width = '78px';
  root.style.height = '58px';

  previewMembers.forEach((member, index) => {
    const layout = getAvatarLayout(previewMembers.length, index);
    const avatar = document.createElement('div');
    avatar.style.position = 'absolute';
    avatar.style.left = '50%';
    avatar.style.top = '50%';
    avatar.style.width = `${layout.size}px`;
    avatar.style.height = `${layout.size}px`;
    avatar.style.display = 'grid';
    avatar.style.placeItems = 'center';
    avatar.style.overflow = 'hidden';
    avatar.style.borderRadius = '999px';
    avatar.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
    avatar.style.background = category === 'heroes' ? '#232F3E' : (darkMode ? '#152534' : '#FFFFFF');
    avatar.style.boxShadow = index === 0
      ? `0 0 0 1px ${color}, 0 5px 12px rgba(0, 0, 0, ${darkMode ? '.42' : '.24'})`
      : `0 3px 9px rgba(0, 0, 0, ${darkMode ? '.38' : '.2'})`;
    avatar.style.transform = `translate(-50%, -50%) translate(calc(${layout.x}px + var(--portrait-separation) * ${layout.spreadX}px), calc(${layout.y}px + var(--portrait-separation) * ${layout.spreadY}px))`;
    avatar.style.transition = 'transform 90ms linear';
    avatar.style.willChange = 'transform';
    avatar.style.zIndex = String(layout.zIndex);
    const imageUrl = getMemberImage(member);
    const image = document.createElement('img');
    image.src = imageUrl || placeholderUrl;
    image.alt = '';
    image.draggable = false;
    image.style.width = '100%';
    image.style.height = '100%';
    image.style.objectFit = imageUrl ? 'cover' : 'contain';
    image.style.padding = imageUrl ? '0' : '5px';
    avatar.appendChild(image);
    root.appendChild(avatar);
  });

  const countBadge = document.createElement('div');
  countBadge.textContent = String(getPortraitGroupCount(cluster));
  countBadge.style.position = 'absolute';
  countBadge.style.left = '50%';
  countBadge.style.top = '50%';
  countBadge.style.minWidth = '23px';
  countBadge.style.height = '23px';
  countBadge.style.padding = '0 5px';
  countBadge.style.borderRadius = '999px';
  countBadge.style.display = 'grid';
  countBadge.style.placeItems = 'center';
  countBadge.style.background = color;
  countBadge.style.color = category === 'cloud-clubs' ? '#FFFFFF' : '#0F1923';
  countBadge.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
  countBadge.style.fontSize = '9px';
  countBadge.style.fontWeight = '900';
  countBadge.style.lineHeight = '1';
  countBadge.style.boxShadow = `0 3px 8px rgba(0, 0, 0, ${darkMode ? '.38' : '.2'})`;
  countBadge.style.transform = 'translate(calc(11px + var(--portrait-separation) * 4px), calc(8px + var(--portrait-separation) * 2px))';
  countBadge.style.transition = 'transform 90ms linear';
  countBadge.style.willChange = 'transform';
  countBadge.style.zIndex = '4';

  root.appendChild(countBadge);
  return root;
}

export function createPortraitFallback(category, darkMode) {
  const logo = document.createElement('img');
  logo.src = getPortraitPlaceholder(category);
  logo.alt = '';
  logo.draggable = false;
  logo.style.width = '34px';
  logo.style.height = '34px';
  logo.style.padding = '5px';
  logo.style.objectFit = 'contain';
  logo.style.borderRadius = '999px';
  logo.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
  logo.style.background = category === 'heroes' ? '#232F3E' : (darkMode ? '#152534' : '#FFFFFF');
  return logo;
}
