import { useEffect, useRef, useCallback, useState } from 'react';
import Globe from 'globe.gl';
import { useAutoRotate } from '../hooks/useAutoRotate';
import { createNewMemberBadgeElement, getCountryFlagUrl, getMemberBadgeLabel, getMemberCountry, getMemberCountryFlagUrl, getMemberImage, hasNewMember } from '../utils/memberMarkers';

const CATEGORY_COLORS = {
  'heroes': '#FF9900',
  'community-builders': '#1A9C3E',
  'user-groups': '#00A1C9',
  'cloud-clubs': '#BF0816',
  'kiro-ambassadors': '#8B5CF6',
  'kiro-events': '#7B61FF',
  'community-days': '#FF9900',
  'aws-ambassadors': '#2D72D2',
  'news': '#FF9900',
};

const CLUSTER_TOLERANCE = 0.5;
const MAX_CLUSTER_AVATARS = 4;
const MARKER_ALTITUDE = 0.06;
const MIN_CAMERA_DISTANCE_FACTOR = 1.01;
const CLASSIC_ZOOM_SPEED = 0.65;
const CLASSIC_DAMPING_FACTOR = 0.14;
const HERO_CLUSTER_PREVIEW_COUNT = 3;
const HERO_CLUSTER_SEPARATION_START_ALTITUDE = 2.05;
const HERO_CLUSTER_SEPARATION_END_ALTITUDE = 1.2;
const AWS_HERO_PLACEHOLDER_URL = 'https://d1.awsstatic.com/getting-started-guides/new-heros-nov-2022/AWS-Heroes%20program-community-heroes_logo_dark.efe13e0d50fdf64d8a4524bf876d79a64dd82488.png';
const COMMUNITY_BUILDER_PLACEHOLDER_URL = 'https://3sky.github.io/awscb-content-catalog/Logo.png';
const STUDENT_BUILDER_PLACEHOLDER_URL = '/student-builder-group-logo.png';
const PORTRAIT_GROUP_CATEGORIES = new Set(['heroes', 'community-builders', 'cloud-clubs']);
const CATEGORY_PLACEHOLDER_URLS = {
  heroes: AWS_HERO_PLACEHOLDER_URL,
  'community-builders': COMMUNITY_BUILDER_PLACEHOLDER_URL,
  'cloud-clubs': STUDENT_BUILDER_PLACEHOLDER_URL,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getHeroClusterSeparation(altitude) {
  return clamp(
    (HERO_CLUSTER_SEPARATION_START_ALTITUDE - altitude)
      / (HERO_CLUSTER_SEPARATION_START_ALTITUDE - HERO_CLUSTER_SEPARATION_END_ALTITUDE),
    0,
    1
  );
}

function getPortraitGroupCount(cluster) {
  if (cluster.members.length === 1 && cluster.members[0]?.clusterOnly) {
    return cluster.members[0].builderCount || 1;
  }
  return cluster.members.length;
}

function getPortraitGroupMembers(cluster) {
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

function getPortraitCategoryLabel(category) {
  if (category === 'community-builders') return 'Community Builders';
  if (category === 'cloud-clubs') return 'Student Builder Groups';
  return 'Heroes';
}

function getSectorPath(index, count) {
  if (count <= 1) return 'M 50 0 A 50 50 0 1 1 49.99 0 Z';

  const startAngle = -Math.PI / 2 + (index / count) * Math.PI * 2;
  const endAngle = -Math.PI / 2 + ((index + 1) / count) * Math.PI * 2;
  const startX = 50 + Math.cos(startAngle) * 50;
  const startY = 50 + Math.sin(startAngle) * 50;
  const endX = 50 + Math.cos(endAngle) * 50;
  const endY = 50 + Math.sin(endAngle) * 50;
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M 50 50 L ${startX} ${startY} A 50 50 0 ${largeArc} 1 ${endX} ${endY} Z`;
}

function createHeroGroupAvatar(cluster, { category, color, darkMode, separation = 0 }) {
  const previewMembers = getPortraitGroupMembers(cluster).slice(0, HERO_CLUSTER_PREVIEW_COUNT);
  const placeholderUrl = CATEGORY_PLACEHOLDER_URLS[category] || AWS_HERO_PLACEHOLDER_URL;
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const root = document.createElement('div');
  root.dataset.portraitClusterMarker = 'true';
  root.style.setProperty('--hero-separation', String(separation));
  root.style.position = 'relative';
  root.style.width = '76px';
  root.style.height = '64px';

  const segmented = document.createElementNS(svgNamespace, 'svg');
  segmented.setAttribute('viewBox', '0 0 100 100');
  segmented.setAttribute('aria-hidden', 'true');
  segmented.style.position = 'absolute';
  segmented.style.left = '50%';
  segmented.style.top = '50%';
  segmented.style.width = '46px';
  segmented.style.height = '46px';
  segmented.style.overflow = 'visible';
  segmented.style.opacity = 'calc(1 - var(--hero-separation))';
  segmented.style.transform = 'translate(-50%, -50%) scale(calc(1 - var(--hero-separation) * .08))';
  segmented.style.transition = 'opacity 80ms linear';

  const defs = document.createElementNS(svgNamespace, 'defs');
  segmented.appendChild(defs);
  previewMembers.forEach((member, index) => {
    const clipId = `${cluster.heroClusterId}-sector-${index}`.replace(/[^a-zA-Z0-9_-]/g, '-');
    const clip = document.createElementNS(svgNamespace, 'clipPath');
    clip.id = clipId;
    const sector = document.createElementNS(svgNamespace, 'path');
    sector.setAttribute('d', getSectorPath(index, previewMembers.length));
    clip.appendChild(sector);
    defs.appendChild(clip);

    const group = document.createElementNS(svgNamespace, 'g');
    group.setAttribute('clip-path', `url(#${clipId})`);
    const imageUrl = getMemberImage(member);
    if (imageUrl) {
      const image = document.createElementNS(svgNamespace, 'image');
      image.setAttribute('href', imageUrl);
      image.setAttribute('x', '0');
      image.setAttribute('y', '0');
      image.setAttribute('width', '100');
      image.setAttribute('height', '100');
      image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      group.appendChild(image);
    } else {
      const fallback = document.createElementNS(svgNamespace, 'rect');
      fallback.setAttribute('width', '100');
      fallback.setAttribute('height', '100');
      fallback.setAttribute('fill', category === 'heroes' ? '#232F3E' : (darkMode ? '#152534' : '#FFFFFF'));
      group.appendChild(fallback);
      const logo = document.createElementNS(svgNamespace, 'image');
      logo.setAttribute('href', placeholderUrl);
      logo.setAttribute('x', '18');
      logo.setAttribute('y', '25');
      logo.setAttribute('width', '64');
      logo.setAttribute('height', '50');
      logo.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      group.appendChild(logo);
    }
    segmented.appendChild(group);
  });

  if (previewMembers.length > 1) {
    previewMembers.forEach((_, index) => {
      const separator = document.createElementNS(svgNamespace, 'path');
      separator.setAttribute('d', getSectorPath(index, previewMembers.length));
      separator.setAttribute('fill', 'none');
      separator.setAttribute('stroke', darkMode ? '#F8FAFC' : '#172A3A');
      separator.setAttribute('stroke-width', '3.5');
      separator.setAttribute('stroke-linejoin', 'round');
      separator.setAttribute('vector-effect', 'non-scaling-stroke');
      segmented.appendChild(separator);
    });
  }

  const outline = document.createElementNS(svgNamespace, 'circle');
  outline.setAttribute('cx', '50');
  outline.setAttribute('cy', '50');
  outline.setAttribute('r', '48');
  outline.setAttribute('fill', 'none');
  outline.setAttribute('stroke', darkMode ? '#0B1824' : '#FFFFFF');
  outline.setAttribute('stroke-width', '5');
  segmented.appendChild(outline);

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
    avatar.style.background = index % 2 === 0 ? color : (darkMode ? '#23384A' : '#DCEAF5');
    avatar.style.boxShadow = `0 2px 9px ${darkMode ? 'rgba(0,0,0,.42)' : 'rgba(23,50,75,.25)'}`;
    avatar.style.opacity = 'var(--hero-separation)';
    avatar.style.transform = `translate(-50%, -50%) translate(calc(${x}px * var(--hero-separation)), calc(${y}px * var(--hero-separation))) scale(calc(.82 + var(--hero-separation) * .18))`;
    avatar.style.willChange = 'transform, opacity';
    const imageUrl = getMemberImage(member);
    if (imageUrl) {
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = '';
      image.draggable = false;
      image.style.width = '100%';
      image.style.height = '100%';
      image.style.objectFit = 'cover';
      avatar.appendChild(image);
    } else {
      const logo = document.createElement('img');
      logo.src = placeholderUrl;
      logo.alt = '';
      logo.draggable = false;
      logo.style.width = '100%';
      logo.style.height = '100%';
      logo.style.padding = '5px';
      logo.style.objectFit = 'contain';
      logo.style.background = category === 'heroes' ? '#232F3E' : (darkMode ? '#152534' : '#FFFFFF');
      avatar.appendChild(logo);
    }
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
  countBadge.style.transform = 'translate(calc(8px + var(--hero-separation) * 17px), calc(8px + var(--hero-separation) * 10px))';
  countBadge.style.willChange = 'transform';

  root.appendChild(segmented);
  root.appendChild(countBadge);
  return root;
}

function formatLiveCountdown(targetValue, prefix = '') {
  const difference = new Date(targetValue).getTime() - Date.now();
  if (!Number.isFinite(difference) || difference <= 0) return `${prefix}Happening today`;

  const totalSeconds = Math.floor(difference / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${prefix}${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s to go`;
}

function clusterMembers(members) {
  const clusters = [];
  for (const member of members) {
    if (member.forceSeparateMarker) {
      clusters.push({ lat: member.lat, lng: member.lng, members: [member], forceSeparateMarker: true });
      continue;
    }

    const existing = clusters.find(
      (cluster) =>
        !cluster.forceSeparateMarker &&
        Math.abs(cluster.lat - member.lat) <= CLUSTER_TOLERANCE &&
        Math.abs(cluster.lng - member.lng) <= CLUSTER_TOLERANCE
    );

    if (existing) {
      existing.members.push(member);
    } else {
      clusters.push({ lat: member.lat, lng: member.lng, members: [member] });
    }
  }

  return clusters;
}

function getHeroClusterId(category, cluster) {
  return `${category}-${cluster.lat.toFixed(3)}-${cluster.lng.toFixed(3)}-${getPortraitGroupCount(cluster)}`;
}

function createClusterElement(cluster, { category, color, darkMode, portraitCluster, clusterSeparation, onClick, onWheel }) {
  const communityDay = cluster.members.find((member) => member.category === 'community-days');
  const userGroup = cluster.members.find((member) => member.category === 'user-groups');
  const userGroupFlagUrl = userGroup ? getMemberCountryFlagUrl(userGroup) : '';
  const isPastCommunityDay = Boolean(communityDay) && cluster.members.every((member) => member.eventStatus === 'past');
  const markerColor = isPastCommunityDay ? '#D22C2C' : color;
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', communityDay
    ? `${cluster.members.length} Community Day${cluster.members.length > 1 ? 's' : ''} at this location`
    : `${cluster.members.length} member${cluster.members.length > 1 ? 's' : ''} at this location`);
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.position = 'relative';
  button.style.padding = '0';
  button.style.border = '0';
  button.style.background = 'transparent';
  button.style.cursor = 'pointer';
  button.style.pointerEvents = 'auto';
  button.style.transform = 'translate(-50%, -50%)';
  button.style.filter = darkMode
    ? 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.45))'
    : 'drop-shadow(0 8px 16px rgba(23, 50, 75, 0.22))';
  const frame = document.createElement('div');
  frame.style.display = 'flex';
  frame.style.alignItems = 'center';
  frame.style.justifyContent = 'center';
  frame.style.position = 'relative';
  frame.style.minWidth = cluster.members.length > 1 ? '52px' : '34px';
  frame.style.minHeight = cluster.members.length > 1 ? '40px' : '34px';

  if (communityDay) {
    frame.style.borderRadius = '999px';
    frame.style.boxShadow = isPastCommunityDay
      ? '0 0 0 10px rgba(210, 44, 44, 0.15)'
      : '0 0 0 8px rgba(255, 153, 0, 0.12)';
  }

  const images = cluster.members
    .map((member) => ({ src: getMemberImage(member), name: member.name }))
    .filter((member) => member.src)
    .slice(0, portraitCluster ? HERO_CLUSTER_PREVIEW_COUNT : MAX_CLUSTER_AVATARS);

  if (portraitCluster && getPortraitGroupCount(cluster) > 1) {
    frame.style.width = '76px';
    frame.style.height = '64px';
    frame.appendChild(createHeroGroupAvatar(cluster, { category, color, darkMode, separation: clusterSeparation }));
    button.title = `${getPortraitGroupCount(cluster)} ${getPortraitCategoryLabel(category)}. Click to zoom in.`;
  } else if (communityDay) {
    const flag = document.createElement('img');
    flag.src = getCountryFlagUrl(communityDay.country);
    flag.alt = `${communityDay.country} flag`;
    flag.width = 30;
    flag.height = 30;
    flag.style.width = '30px';
    flag.style.height = '30px';
    flag.style.objectFit = 'cover';
    flag.style.borderRadius = '999px';
    flag.style.border = `3px solid ${markerColor}`;
    flag.style.background = markerColor;
    frame.appendChild(flag);

    if (cluster.members.length > 1) {
      const countBadge = document.createElement('div');
      countBadge.textContent = `+${cluster.members.length - 1}`;
      countBadge.style.position = 'absolute';
      countBadge.style.right = '-8px';
      countBadge.style.bottom = '-6px';
      countBadge.style.minWidth = '20px';
      countBadge.style.height = '20px';
      countBadge.style.padding = '0 5px';
      countBadge.style.borderRadius = '999px';
      countBadge.style.display = 'flex';
      countBadge.style.alignItems = 'center';
      countBadge.style.justifyContent = 'center';
      countBadge.style.background = markerColor;
      countBadge.style.color = '#FFFFFF';
      countBadge.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
      countBadge.style.fontSize = '10px';
      countBadge.style.fontWeight = '800';
      frame.appendChild(countBadge);
    }
  } else if (userGroupFlagUrl) {
    const flag = document.createElement('img');
    flag.src = userGroupFlagUrl;
    flag.alt = `${getMemberCountry(userGroup)} flag`;
    flag.width = 30;
    flag.height = 30;
    flag.draggable = false;
    flag.style.width = '30px';
    flag.style.height = '30px';
    flag.style.objectFit = 'cover';
    flag.style.borderRadius = '999px';
    flag.style.border = `3px solid ${color}`;
    flag.style.background = color;
    flag.style.boxShadow = `0 0 0 2px ${darkMode ? '#0B1824' : '#FFFFFF'}`;
    frame.appendChild(flag);

    if (cluster.members.length > 1) {
      const countBadge = document.createElement('div');
      countBadge.textContent = `+${cluster.members.length - 1}`;
      countBadge.style.position = 'absolute';
      countBadge.style.right = '-6px';
      countBadge.style.bottom = '-6px';
      countBadge.style.minWidth = '20px';
      countBadge.style.height = '20px';
      countBadge.style.padding = '0 5px';
      countBadge.style.borderRadius = '999px';
      countBadge.style.display = 'flex';
      countBadge.style.alignItems = 'center';
      countBadge.style.justifyContent = 'center';
      countBadge.style.background = color;
      countBadge.style.color = '#0F1923';
      countBadge.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
      countBadge.style.fontSize = '10px';
      countBadge.style.fontWeight = '800';
      countBadge.style.lineHeight = '1';
      frame.appendChild(countBadge);
    }
  } else if (portraitCluster && images.length === 0) {
    const logo = document.createElement('img');
    logo.src = CATEGORY_PLACEHOLDER_URLS[category];
    logo.alt = getPortraitCategoryLabel(category);
    logo.width = 34;
    logo.height = 34;
    logo.draggable = false;
    logo.style.width = '34px';
    logo.style.height = '34px';
    logo.style.padding = '6px';
    logo.style.objectFit = 'contain';
    logo.style.borderRadius = '999px';
    logo.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
    logo.style.background = category === 'heroes' ? '#232F3E' : (darkMode ? '#152534' : '#FFFFFF');
    frame.appendChild(logo);
  } else if (images.length > 0) {
    images.forEach((member, index) => {
      const img = document.createElement('img');
      img.src = member.src;
      img.alt = member.name;
      img.width = images.length > 1 ? 24 : 30;
      img.height = images.length > 1 ? 24 : 30;
      img.draggable = false;
      img.style.width = `${img.width}px`;
      img.style.height = `${img.height}px`;
      img.style.objectFit = 'cover';
      img.style.borderRadius = '999px';
      img.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
      img.style.background = darkMode ? '#152534' : '#F0F7FF';
      img.style.marginLeft = index === 0 ? '0' : '-10px';
      img.style.transform = `translateY(${index % 2 === 0 ? '-2px' : '2px'})`;
      img.style.zIndex = String(images.length - index);
      frame.appendChild(img);
    });
  } else {
    const extraCount = Math.max(0, cluster.members.length - 1);
    const badge = document.createElement('div');
    badge.textContent = getMemberBadgeLabel(cluster.members[0]);
    badge.style.width = '34px';
    badge.style.height = '34px';
    badge.style.borderRadius = '999px';
    badge.style.background = color;
    badge.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.color = '#0F1923';
    badge.style.fontSize = '10px';
    badge.style.fontWeight = '800';
    badge.style.lineHeight = '1';
    badge.style.letterSpacing = '0.04em';
    frame.appendChild(badge);

    if (extraCount > 0) {
      const countBadge = document.createElement('div');
      countBadge.textContent = `+${extraCount}`;
      countBadge.style.position = 'absolute';
      countBadge.style.right = '-4px';
      countBadge.style.bottom = '-4px';
      countBadge.style.minWidth = '20px';
      countBadge.style.height = '20px';
      countBadge.style.padding = '0 5px';
      countBadge.style.borderRadius = '999px';
      countBadge.style.display = 'flex';
      countBadge.style.alignItems = 'center';
      countBadge.style.justifyContent = 'center';
      countBadge.style.background = color;
      countBadge.style.color = '#0F1923';
      countBadge.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
      countBadge.style.fontSize = '10px';
      countBadge.style.fontWeight = '800';
      countBadge.style.lineHeight = '1';
      frame.appendChild(countBadge);
    }
  }

  if (!portraitCluster && !communityDay && !userGroupFlagUrl && images.length > 0 && cluster.members.length > MAX_CLUSTER_AVATARS) {
    const badge = document.createElement('div');
    badge.textContent = `+${cluster.members.length - MAX_CLUSTER_AVATARS}`;
    badge.style.position = 'absolute';
    badge.style.right = '-4px';
    badge.style.bottom = '-4px';
    badge.style.minWidth = '20px';
    badge.style.height = '20px';
    badge.style.padding = '0 5px';
    badge.style.borderRadius = '999px';
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.background = color;
    badge.style.color = '#0F1923';
    badge.style.border = `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`;
    badge.style.fontSize = '10px';
    badge.style.fontWeight = '800';
    badge.style.lineHeight = '1';
    frame.appendChild(badge);
  }

  if (hasNewMember(cluster.members)) {
    frame.appendChild(createNewMemberBadgeElement(darkMode));
  }

  button.appendChild(frame);

  if (communityDay) {
    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.left = '50%';
    tooltip.style.bottom = 'calc(100% + 18px)';
    tooltip.style.width = 'min(280px, 72vw)';
    tooltip.style.padding = '12px 14px';
    tooltip.style.borderRadius = '12px';
    tooltip.style.background = darkMode ? 'rgba(8, 16, 24, 0.96)' : 'rgba(255, 255, 255, 0.97)';
    tooltip.style.border = `1px solid ${isPastCommunityDay ? 'rgba(210,44,44,.62)' : 'rgba(255,153,0,.58)'}`;
    tooltip.style.color = darkMode ? '#FFFFFF' : '#0F1923';
    tooltip.style.boxShadow = '0 14px 32px rgba(0,0,0,.34)';
    tooltip.style.transform = 'translate(-50%, 6px)';
    tooltip.style.opacity = '0';
    tooltip.style.visibility = 'hidden';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.transition = 'opacity 160ms ease, transform 160ms ease, visibility 160ms ease';
    tooltip.style.zIndex = '30';
    tooltip.innerHTML = `
      <strong style="display:block;font-size:13px;line-height:1.3">${communityDay.name}</strong>
      <span style="display:block;margin-top:4px;font-size:11px;color:${darkMode ? '#A7BDCF' : '#537190'}">${communityDay.eventDateLabel} · ${communityDay.location}</span>
      <span class="community-day-countdown" data-countdown-at="${communityDay.countdownAt || ''}" data-countdown-prefix="${communityDay.countdownPrefix || ''}" style="display:block;margin-top:8px;font-size:11px;font-weight:800;color:${markerColor}">${communityDay.countdownLabel}</span>
    `;
    button.appendChild(tooltip);
    const showTooltip = () => {
      tooltip.style.opacity = '1';
      tooltip.style.visibility = 'visible';
      tooltip.style.transform = 'translate(-50%, 0)';
    };
    const hideTooltip = () => {
      tooltip.style.opacity = '0';
      tooltip.style.visibility = 'hidden';
      tooltip.style.transform = 'translate(-50%, 6px)';
    };
    button.onmouseenter = showTooltip;
    button.onmouseleave = hideTooltip;
    button.onfocus = showTooltip;
    button.onblur = hideTooltip;
  }
  button.onpointerdown = (event) => {
    event.stopPropagation();
  };
  button.onpointerup = (event) => {
    event.stopPropagation();
  };
  button.onwheel = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onWheel?.(event);
  };
  button.onclick = (event) => {
    event.stopPropagation();
    onClick();
  };

  return button;
}

export default function ClassicGlobeScene({
  category,
  members,
  onMarkerClick,
  cardOpen,
  darkMode,
  flyToTarget,
  zoomCommand,
}) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const [communityDaysExpanded, setCommunityDaysExpanded] = useState(false);
  const { startLoop, stopLoop, onPointerEvent, pause, resume } = useAutoRotate(globeRef);

  useEffect(() => {
    if (cardOpen) pause();
    else resume();
  }, [cardOpen, pause, resume]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.style.touchAction = 'none';
    container.style.overscrollBehavior = 'none';

    const globe = Globe()(container);
    globe
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#4a90d9')
      .atmosphereAltitude(0.15)
      .globeImageUrl('/textures/earth-blue-marble.jpg')
      .bumpImageUrl('/textures/earth-topology.png')
      .showGraticules(false)
      .pointOfView({ lat: 20, lng: 0, altitude: 2.5 });

    const controls = globe.controls();
    if (controls) {
      controls.minDistance = globe.getGlobeRadius() * MIN_CAMERA_DISTANCE_FACTOR;
      controls.zoomSpeed = CLASSIC_ZOOM_SPEED;
      controls.enableDamping = true;
      controls.dampingFactor = CLASSIC_DAMPING_FACTOR;
      controls.zoomToCursor = false;
    }

    globeRef.current = globe;
    startLoop();

    // Keep the CSS2D avatar overlay below app popups/cards.
    requestAnimationFrame(() => {
      const canvas = container.querySelector('canvas');
      if (canvas) {
        canvas.style.touchAction = 'none';
        canvas.style.overscrollBehavior = 'none';
      }
      const overlayLayers = container.querySelectorAll('div[style*="pointer-events: none"]');
      overlayLayers.forEach((layer) => {
        layer.style.zIndex = '1';
      });
    });

    return () => {
      stopLoop();
      const renderer = globe.renderer?.();
      globe._destructor?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      container.innerHTML = '';
      globeRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const globe = globeRef.current;
    const controls = globe?.controls();
    if (!globe || !controls || category !== 'community-days') return undefined;

    const updateExpansion = () => setCommunityDaysExpanded(globe.pointOfView().altitude <= 1.55);
    controls.addEventListener('change', updateExpansion);
    const frame = window.requestAnimationFrame(updateExpansion);
    return () => {
      window.cancelAnimationFrame(frame);
      controls.removeEventListener('change', updateExpansion);
    };
  }, [category]);

  useEffect(() => {
    const globe = globeRef.current;
    const controls = globe?.controls();
    if (!globe || !controls || !PORTRAIT_GROUP_CATEGORIES.has(category)) return undefined;

    const updateHeroClustersForZoom = () => {
      const altitude = globe.pointOfView().altitude;
      const separation = getHeroClusterSeparation(altitude);
      containerRef.current?.querySelectorAll('[data-portrait-cluster-marker]').forEach((marker) => {
        marker.style.setProperty('--hero-separation', separation.toFixed(3));
      });
    };
    controls.addEventListener('change', updateHeroClustersForZoom);
    const frame = window.requestAnimationFrame(updateHeroClustersForZoom);
    return () => {
      window.cancelAnimationFrame(frame);
      controls.removeEventListener('change', updateHeroClustersForZoom);
    };
  }, [category]);

  useEffect(() => {
    if (!globeRef.current || !containerRef.current) return;

    const observer = new ResizeObserver(() => {
      if (globeRef.current && containerRef.current) {
        globeRef.current
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!globeRef.current || !flyToTarget) return;
    globeRef.current.pointOfView({ lat: flyToTarget.lat, lng: flyToTarget.lng, altitude: 1.5 }, 1000);
  }, [flyToTarget]);

  useEffect(() => {
    if (!globeRef.current || !zoomCommand?.direction) return;
    const controls = globeRef.current.controls();
    if (!controls) return;

    if (zoomCommand.direction === 'in' && typeof controls.dollyOut === 'function') {
      controls.dollyOut(1.25);
    } else if (zoomCommand.direction === 'out' && typeof controls.dollyIn === 'function') {
      controls.dollyIn(1.25);
    }

    controls.update?.();
    onPointerEvent();
  }, [zoomCommand, onPointerEvent]);

  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.backgroundColor('rgba(0,0,0,0)');
  }, [darkMode]);

  useEffect(() => {
    if (!globeRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const clusters = category === 'community-days' && communityDaysExpanded
      ? members.map((member) => ({ lat: member.lat, lng: member.lng, members: [member] }))
      : clusterMembers(members).map((cluster) => (
        PORTRAIT_GROUP_CATEGORIES.has(category)
          ? { ...cluster, heroClusterId: getHeroClusterId(category, cluster) }
          : cluster
      ));
    const color = CATEGORY_COLORS[category] ?? '#FF9900';

    globeRef.current
      .pointsData([])
      .htmlElementsData(clusters)
      .htmlLat((point) => point.lat)
      .htmlLng((point) => point.lng)
      .htmlAltitude(() => MARKER_ALTITUDE)
      .htmlTransitionDuration(0)
      .htmlElement((point) => {
        const forwardWheel = (event) => {
          const wheelTarget = container.querySelector('canvas');
          if (!wheelTarget) return;
          wheelTarget.dispatchEvent(new WheelEvent('wheel', {
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            deltaMode: event.deltaMode,
            clientX: event.clientX,
            clientY: event.clientY,
            bubbles: true,
            cancelable: true,
          }));
        };

        return createClusterElement(point, {
          category,
          color,
          darkMode,
          portraitCluster: PORTRAIT_GROUP_CATEGORIES.has(category),
          clusterSeparation: PORTRAIT_GROUP_CATEGORIES.has(category)
            ? getHeroClusterSeparation(globeRef.current.pointOfView().altitude)
            : 0,
          onWheel: forwardWheel,
          onClick: () => {
            if (PORTRAIT_GROUP_CATEGORIES.has(category) && getPortraitGroupCount(point) > 1) {
              const altitude = globeRef.current.pointOfView().altitude;
              if (altitude > 1.45) {
                globeRef.current.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.28 }, 700);
              } else {
                onMarkerClick(point.members);
              }
              onPointerEvent();
              return;
            }
            if (category === 'community-days' && point.members.length > 1) {
              globeRef.current.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.3 }, 800);
              return;
            }
            globeRef.current.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.8 }, 800);
            const payload = point.members.length === 1 ? point.members[0] : point.members;
            onMarkerClick(payload);
          },
        });
      });
  }, [members, category, darkMode, onMarkerClick, communityDaysExpanded, onPointerEvent]);

  useEffect(() => {
    if (category !== 'community-days' || !containerRef.current) return undefined;
    const updateCountdowns = () => {
      containerRef.current?.querySelectorAll('.community-day-countdown[data-countdown-at]').forEach((countdown) => {
        countdown.textContent = formatLiveCountdown(countdown.dataset.countdownAt, countdown.dataset.countdownPrefix);
      });
    };
    updateCountdowns();
    const interval = window.setInterval(updateCountdowns, 1000);
    return () => window.clearInterval(interval);
  }, [category, communityDaysExpanded]);

  const handlePointer = useCallback(() => onPointerEvent(), [onPointerEvent]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${darkMode ? 'aws-globe-bg-dark' : 'aws-globe-bg-light'}`}
      onPointerDown={handlePointer}
      onPointerMove={handlePointer}
    >
      <div className="aws-globe-pattern" />
    </div>
  );
}
