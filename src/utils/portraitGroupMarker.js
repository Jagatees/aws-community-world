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

function getSectorPath(index, count) {
  const startAngle = -Math.PI / 2 + (index / count) * Math.PI * 2;
  const endAngle = -Math.PI / 2 + ((index + 1) / count) * Math.PI * 2;
  const startX = 50 + Math.cos(startAngle) * 50;
  const startY = 50 + Math.sin(startAngle) * 50;
  const endX = 50 + Math.cos(endAngle) * 50;
  const endY = 50 + Math.sin(endAngle) * 50;
  return `M 50 50 L ${startX} ${startY} A 50 50 0 0 1 ${endX} ${endY} Z`;
}

export function createPortraitGroupAvatar(cluster, { category, color, darkMode, separation = 0 }) {
  const previewMembers = getPortraitGroupMembers(cluster).slice(0, PREVIEW_COUNT);
  const placeholderUrl = getPortraitPlaceholder(category);
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const root = document.createElement('div');
  root.dataset.portraitClusterMarker = 'true';
  root.style.setProperty('--portrait-separation', String(separation));
  root.style.position = 'relative';
  root.style.width = '76px';
  root.style.height = '64px';

  const merged = document.createElementNS(svgNamespace, 'svg');
  merged.setAttribute('viewBox', '0 0 100 100');
  merged.setAttribute('aria-hidden', 'true');
  merged.style.position = 'absolute';
  merged.style.left = '50%';
  merged.style.top = '50%';
  merged.style.width = '46px';
  merged.style.height = '46px';
  merged.style.overflow = 'visible';
  merged.style.opacity = 'calc(1 - var(--portrait-separation))';
  merged.style.transform = 'translate(-50%, -50%) scale(calc(1 - var(--portrait-separation) * .08))';

  const defs = document.createElementNS(svgNamespace, 'defs');
  merged.appendChild(defs);
  previewMembers.forEach((member, index) => {
    const clipId = `atlas-${category}-${cluster.lat}-${cluster.lng}-${index}`.replace(/[^a-zA-Z0-9_-]/g, '-');
    const sectorPath = getSectorPath(index, previewMembers.length);
    const clip = document.createElementNS(svgNamespace, 'clipPath');
    clip.id = clipId;
    const clipShape = document.createElementNS(svgNamespace, 'path');
    clipShape.setAttribute('d', sectorPath);
    clip.appendChild(clipShape);
    defs.appendChild(clip);

    const group = document.createElementNS(svgNamespace, 'g');
    group.setAttribute('clip-path', `url(#${clipId})`);
    const imageUrl = getMemberImage(member);
    if (imageUrl) {
      const image = document.createElementNS(svgNamespace, 'image');
      image.setAttribute('href', imageUrl);
      image.setAttribute('width', '100');
      image.setAttribute('height', '100');
      image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      group.appendChild(image);
    } else {
      const background = document.createElementNS(svgNamespace, 'rect');
      background.setAttribute('width', '100');
      background.setAttribute('height', '100');
      background.setAttribute('fill', category === 'heroes' ? '#232F3E' : (darkMode ? '#152534' : '#FFFFFF'));
      group.appendChild(background);
      const logo = document.createElementNS(svgNamespace, 'image');
      logo.setAttribute('href', placeholderUrl);
      logo.setAttribute('x', '18');
      logo.setAttribute('y', '20');
      logo.setAttribute('width', '64');
      logo.setAttribute('height', '60');
      logo.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      group.appendChild(logo);
    }
    merged.appendChild(group);

    const separator = document.createElementNS(svgNamespace, 'path');
    separator.setAttribute('d', sectorPath);
    separator.setAttribute('fill', 'none');
    separator.setAttribute('stroke', darkMode ? '#F8FAFC' : '#172A3A');
    separator.setAttribute('stroke-width', '3.5');
    separator.setAttribute('stroke-linejoin', 'round');
    merged.appendChild(separator);
  });

  const outline = document.createElementNS(svgNamespace, 'circle');
  outline.setAttribute('cx', '50');
  outline.setAttribute('cy', '50');
  outline.setAttribute('r', '48');
  outline.setAttribute('fill', 'none');
  outline.setAttribute('stroke', darkMode ? '#0B1824' : '#FFFFFF');
  outline.setAttribute('stroke-width', '5');
  merged.appendChild(outline);

  previewMembers.forEach((member, index) => {
    const angle = previewMembers.length === 2
      ? (index === 0 ? Math.PI : 0)
      : -Math.PI / 2 + (index / previewMembers.length) * Math.PI * 2;
    const x = Math.cos(angle) * 21;
    const y = Math.sin(angle) * 15;
    const avatar = document.createElement('div');
    avatar.style.position = 'absolute';
    avatar.style.left = '50%';
    avatar.style.top = '50%';
    avatar.style.width = '30px';
    avatar.style.height = '30px';
    avatar.style.display = 'grid';
    avatar.style.placeItems = 'center';
    avatar.style.overflow = 'hidden';
    avatar.style.borderRadius = '999px';
    avatar.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
    avatar.style.background = darkMode ? '#152534' : '#FFFFFF';
    avatar.style.boxShadow = '0 2px 9px rgba(0,0,0,.34)';
    avatar.style.opacity = 'var(--portrait-separation)';
    avatar.style.transform = `translate(-50%, -50%) translate(calc(${x}px * var(--portrait-separation)), calc(${y}px * var(--portrait-separation))) scale(calc(.82 + var(--portrait-separation) * .18))`;
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
  countBadge.style.color = '#0F1923';
  countBadge.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
  countBadge.style.fontSize = '9px';
  countBadge.style.fontWeight = '900';
  countBadge.style.transform = 'translate(calc(8px + var(--portrait-separation) * 17px), calc(8px + var(--portrait-separation) * 10px))';

  root.appendChild(merged);
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
