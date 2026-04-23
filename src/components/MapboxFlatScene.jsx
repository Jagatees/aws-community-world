import { useEffect, useMemo, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getMemberBadgeLabel, getMemberImage } from '../utils/memberMarkers';

const CATEGORY_COLORS = {
  heroes: '#FF9900',
  'community-builders': '#1A9C3E',
  'user-groups': '#00A1C9',
  'cloud-clubs': '#BF0816',
  'aws-ambassadors': '#2D72D2',
  news: '#FF9900',
  events: '#7B61FF',
};

const CLUSTER_TOLERANCE = 0.5;
const MAX_CLUSTER_AVATARS = 4;
const TOKEN = import.meta.env.VITE_MAP_BOX ?? '';
const MAPBOX_STYLE_URL = 'mapbox://styles/mapbox/satellite-streets-v12';

function getHeatColor(size) {
  if (size >= 12) return '#BF0816';
  if (size >= 7) return '#FF9900';
  if (size >= 4) return '#F2CC0C';
  return '#2D72D2';
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

function createClusterElement(cluster, { color, darkMode, onClick }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute(
    'aria-label',
    `${cluster.members.length} member${cluster.members.length > 1 ? 's' : ''} at this location`
  );
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.position = 'absolute';
  button.style.left = '0';
  button.style.top = '0';
  button.style.padding = '0';
  button.style.border = '0';
  button.style.background = 'transparent';
  button.style.cursor = 'pointer';
  button.style.pointerEvents = 'auto';
  button.style.transform = 'translate(-50%, -50%)';
  button.style.filter = 'drop-shadow(0 10px 22px rgba(0, 0, 0, 0.42))';
  button.style.willChange = 'transform, opacity';

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
  button.onpointerdown = (event) => event.stopPropagation();
  button.onpointerup = (event) => event.stopPropagation();
  button.onclick = (event) => {
    event.stopPropagation();
    onClick();
  };

  return button;
}

export default function MapboxFlatScene({
  category,
  members,
  onMarkerClick,
  darkMode,
  flyToTarget,
  zoomCommand,
  heatmapEnabled = false,
}) {
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const resizeTimerRef = useRef(null);

  const clusters = useMemo(() => clusterMembers(members), [members]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !TOKEN) return;

    mapboxgl.accessToken = TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE_URL,
      projection: 'equirectangular',
      renderWorldCopies: true,
      center: [0, 20],
      zoom: 1.05,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    mapRef.current = map;
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    const scheduleResize = () => {
      if (resizeTimerRef.current) {
        window.clearTimeout(resizeTimerRef.current);
      }

      let raf1 = 0;
      let raf2 = 0;

      const runResize = () => {
        map.resize();
        map.triggerRepaint();
      };

      raf1 = window.requestAnimationFrame(() => {
        runResize();
        raf2 = window.requestAnimationFrame(runResize);
      });

      resizeTimerRef.current = window.setTimeout(runResize, 120);

      return () => {
        window.cancelAnimationFrame(raf1);
        window.cancelAnimationFrame(raf2);
        if (resizeTimerRef.current) {
          window.clearTimeout(resizeTimerRef.current);
          resizeTimerRef.current = null;
        }
      };
    };

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
      map.triggerRepaint();
    });
    resizeObserver.observe(containerRef.current);
    const cleanupResize = scheduleResize();

    return () => {
      cleanupResize();
      resizeObserver.disconnect();
      markersRef.current.forEach(({ element }) => element.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let raf1 = 0;
    let raf2 = 0;

    const resizeMap = () => {
      map.resize();
      map.triggerRepaint();
    };

    raf1 = window.requestAnimationFrame(() => {
      resizeMap();
      raf2 = window.requestAnimationFrame(resizeMap);
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [category, members.length, darkMode, heatmapEnabled]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    markersRef.current.forEach(({ element }) => element.remove());
    markersRef.current = [];

    markersRef.current = clusters.map((cluster) => {
      const color = heatmapEnabled ? getHeatColor(cluster.members.length) : CATEGORY_COLORS[category] ?? '#FF9900';
      const element = createClusterElement(cluster, {
        color,
        darkMode,
        onClick: () => {
          const map = mapRef.current;
          if (!map) return;

          if (cluster.members.length > 1 && map.getZoom() < 2.4) {
            map.easeTo({
              center: [cluster.lng, cluster.lat],
              zoom: Math.min(map.getZoom() + 0.9, 4.0),
              duration: 650,
            });
            return;
          }

          map.flyTo({
            center: [cluster.lng, cluster.lat],
            zoom: Math.max(map.getZoom(), 2.8),
            duration: 850,
            essential: true,
          });

          const payload = cluster.members.length === 1 ? cluster.members[0] : cluster.members;
          onMarkerClick(payload);
        },
      });

      overlay.appendChild(element);
      return { cluster, element };
    });

    return () => {
      markersRef.current.forEach(({ element }) => element.remove());
      markersRef.current = [];
    };
  }, [clusters, category, darkMode, heatmapEnabled, onMarkerClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    const updateOverlay = () => {
      const width = map.getCanvas().clientWidth;
      const height = map.getCanvas().clientHeight;

      markersRef.current.forEach(({ cluster, element }) => {
        const project = map.project([cluster.lng, cluster.lat]);
        const visible = project.x >= -80 && project.x <= width + 80 && project.y >= -80 && project.y <= height + 80;

        element.style.transform = `translate(-50%, -50%) translate(${project.x}px, ${project.y}px)`;
        element.style.opacity = visible ? '1' : '0';
        element.style.visibility = visible ? 'visible' : 'hidden';
        element.style.pointerEvents = visible ? 'auto' : 'none';
        element.style.zIndex = String(Math.round(project.y * 1000));
      });
    };

    map.on('render', updateOverlay);
    map.on('move', updateOverlay);
    map.on('zoom', updateOverlay);
    map.on('resize', updateOverlay);
    updateOverlay();

    return () => {
      map.off('render', updateOverlay);
      map.off('move', updateOverlay);
      map.off('zoom', updateOverlay);
      map.off('resize', updateOverlay);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToTarget) return;

    map.flyTo({
      center: [flyToTarget.lng, flyToTarget.lat],
      zoom: Math.max(map.getZoom(), 2.4),
      duration: 900,
      essential: true,
    });
  }, [flyToTarget]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zoomCommand?.direction) return;

    if (zoomCommand.direction === 'in') {
      map.zoomIn({ duration: 250 });
    } else if (zoomCommand.direction === 'out') {
      map.zoomOut({ duration: 250 });
    }
  }, [zoomCommand]);

  return (
    <div className={`relative h-full w-full overflow-hidden ${darkMode ? 'aws-globe-bg-dark' : 'aws-globe-bg-light'}`}>
      <div className="aws-globe-pattern" />

      {!TOKEN ? (
        <div className="relative z-10 flex h-full items-center justify-center p-6">
          <div
            className="max-w-md rounded-[24px] px-5 py-4 text-center"
            style={{
              background: darkMode ? 'rgba(7, 16, 25, 0.82)' : 'rgba(255, 255, 255, 0.88)',
              border: `1px solid ${darkMode ? 'rgba(76, 109, 138, 0.4)' : 'rgba(160, 187, 212, 0.72)'}`,
              color: darkMode ? '#DCE7F0' : '#17324B',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            Add <code>VITE_MAP_BOX</code> to your local env file to enable the Mapbox world view.
          </div>
        </div>
      ) : (
        <>
          <div ref={containerRef} className="absolute inset-0 z-10 h-full w-full" />
          <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-20" />
        </>
      )}

      <div
        className="pointer-events-none absolute left-5 top-5 z-30 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase"
        style={{
          color: darkMode ? '#A7BDCF' : '#537190',
          background: darkMode ? 'rgba(7, 16, 25, 0.62)' : 'rgba(255, 255, 255, 0.74)',
          border: `1px solid ${darkMode ? 'rgba(62, 95, 123, 0.42)' : 'rgba(150, 179, 205, 0.7)'}`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        Flat
      </div>
    </div>
  );
}
