import { useEffect, useRef, useCallback } from 'react';
import Globe from 'globe.gl';
import { useAutoRotate } from '../hooks/useAutoRotate';

const CATEGORY_COLORS = {
  'heroes': '#FF9900',
  'community-builders': '#1A9C3E',
  'user-groups': '#00A1C9',
  'cloud-clubs': '#BF0816',
};

const CLUSTER_TOLERANCE = 0.5;

function clusterMembers(members) {
  const clusters = [];
  for (const member of members) {
    const existing = clusters.find(
      (c) =>
        Math.abs(c.lat - member.lat) <= CLUSTER_TOLERANCE &&
        Math.abs(c.lng - member.lng) <= CLUSTER_TOLERANCE
    );
    if (existing) {
      existing.members.push(member);
    } else {
      clusters.push({ lat: member.lat, lng: member.lng, members: [member] });
    }
  }
  return clusters;
}

/**
 * @param {{
 *   category: import('../types.js').CategoryKey,
 *   members: import('../types.js').Member[],
 *   onMarkerClick: (member: import('../types.js').Member | import('../types.js').Member[]) => void,
 *   cardOpen: boolean,
 *   darkMode: boolean
 * }} props
 */
export default function GlobeScene({ category, members, onMarkerClick, cardOpen, darkMode }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const { startLoop, stopLoop, onPointerEvent, pause, resume } = useAutoRotate(globeRef);

  // Pause rotation while card is open
  useEffect(() => {
    if (cardOpen) pause();
    else resume();
  }, [cardOpen, pause, resume]);

  // Initialize globe once
  useEffect(() => {
    if (!containerRef.current) return;

    const globe = Globe()(containerRef.current);
    globe
      .backgroundColor('#0F1923')
      .showAtmosphere(true)
      .atmosphereColor('#4a90d9')
      .atmosphereAltitude(0.15)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .showGraticules(false)
      .pointOfView({ lat: 20, lng: 0, altitude: 2.5 });

    globeRef.current = globe;
    startLoop();

    return () => {
      stopLoop();
      if (containerRef.current) containerRef.current.innerHTML = '';
      globeRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Resize observer
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

  // Update globe background when dark mode changes
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.backgroundColor(darkMode ? '#0F1923' : '#c8dff0');
  }, [darkMode]);

  // Update markers
  useEffect(() => {
    if (!globeRef.current) return;
    const clusters = clusterMembers(members);
    const color = CATEGORY_COLORS[category] ?? '#FF9900';

    globeRef.current
      .pointsData(clusters)
      .pointLat((d) => d.lat)
      .pointLng((d) => d.lng)
      .pointRadius((d) => (d.members.length > 1 ? 0.6 : 0.4))
      .pointColor(() => color)
      .pointAltitude(0.01)
      .onPointClick((point) => {
        if (!point) return;
        // Fly to the clicked point
        globeRef.current.pointOfView(
          { lat: point.lat, lng: point.lng, altitude: 1.8 },
          800 // ms transition
        );
        const payload = point.members.length === 1 ? point.members[0] : point.members;
        onMarkerClick(payload);
      });
  }, [members, category, onMarkerClick]);

  const handlePointer = useCallback(() => {
    onPointerEvent();
  }, [onPointerEvent]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: darkMode ? '#0F1923' : '#c8dff0' }}
      onPointerDown={handlePointer}
      onPointerMove={handlePointer}
    />
  );
}
