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
  'aws-community-day-singapore': '#FF9900',
  'news': '#FF9900',
};

const CLUSTER_TOLERANCE = 0.5;
const MAX_CLUSTER_AVATARS = 4;
const MARKER_ALTITUDE = 0.06;
const MIN_CAMERA_DISTANCE_FACTOR = 1.01;
const CLASSIC_ZOOM_SPEED = 0.65;
const CLASSIC_DAMPING_FACTOR = 0.14;

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
    const existing = clusters.find(
      (cluster) =>
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

function createClusterElement(cluster, { color, darkMode, onClick, onWheel }) {
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
    .slice(0, MAX_CLUSTER_AVATARS);

  if (communityDay) {
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

  if (!communityDay && !userGroupFlagUrl && images.length > 0 && cluster.members.length > MAX_CLUSTER_AVATARS) {
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
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
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

    if (zoomCommand.direction === 'in' && typeof controls.dollyIn === 'function') {
      controls.dollyIn(1.25);
    } else if (zoomCommand.direction === 'out' && typeof controls.dollyOut === 'function') {
      controls.dollyOut(1.25);
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
      : clusterMembers(members);
    const color = CATEGORY_COLORS[category] ?? '#FF9900';

    globeRef.current
      .pointsData([])
      .htmlElementsData(clusters)
      .htmlLat((point) => point.lat)
      .htmlLng((point) => point.lng)
      .htmlAltitude(() => MARKER_ALTITUDE)
      .htmlTransitionDuration(0)
      .htmlElement((point) =>
        createClusterElement(point, {
          color,
          darkMode,
          onWheel: (event) => {
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
          },
          onClick: () => {
            if (category === 'community-days' && point.members.length > 1) {
              globeRef.current.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.3 }, 800);
              return;
            }
            globeRef.current.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.8 }, 800);
            const payload = point.members.length === 1 ? point.members[0] : point.members;
            onMarkerClick(payload);
          },
        })
      );
  }, [members, category, darkMode, onMarkerClick, communityDaysExpanded]);

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
