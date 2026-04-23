import { useEffect, useRef, useCallback } from 'react';
import Globe from 'globe.gl';
import { useAutoRotate } from '../hooks/useAutoRotate';
import { getMemberBadgeLabel, getMemberImage } from '../utils/memberMarkers';

const CATEGORY_COLORS = {
  'heroes': '#FF9900',
  'community-builders': '#1A9C3E',
  'user-groups': '#00A1C9',
  'cloud-clubs': '#BF0816',
  'news': '#FF9900',
};

const CLUSTER_TOLERANCE = 0.5;
const MAX_CLUSTER_AVATARS = 4;
const MARKER_ALTITUDE = 0.06;
const MIN_CAMERA_DISTANCE_FACTOR = 1.01;
const CLASSIC_ZOOM_SPEED = 0.65;
const CLASSIC_DAMPING_FACTOR = 0.14;

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
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', `${cluster.members.length} member${cluster.members.length > 1 ? 's' : ''} at this location`);
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

  const images = cluster.members
    .map((member) => ({ src: getMemberImage(member), name: member.name }))
    .filter((member) => member.src)
    .slice(0, MAX_CLUSTER_AVATARS);

  if (images.length > 0) {
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

  if (cluster.members.length > MAX_CLUSTER_AVATARS) {
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

  button.appendChild(frame);
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
  const { startLoop, stopLoop, onPointerEvent, pause, resume } = useAutoRotate(globeRef);

  useEffect(() => {
    if (cardOpen) pause();
    else resume();
  }, [cardOpen, pause, resume]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const globe = Globe()(container);
    globe
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#4a90d9')
      .atmosphereAltitude(0.15)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
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
    if (!globeRef.current) return;

    const clusters = clusterMembers(members);
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
            globeRef.current.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.8 }, 800);
            const payload = point.members.length === 1 ? point.members[0] : point.members;
            onMarkerClick(payload);
          },
        })
      );
  }, [members, category, darkMode, onMarkerClick]);

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
