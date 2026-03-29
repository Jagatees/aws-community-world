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

export default function ClassicGlobeScene({
  category,
  members,
  onMarkerClick,
  cardOpen,
  darkMode,
  flyToTarget,
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

    globeRef.current = globe;
    startLoop();

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
    if (!globeRef.current) return;
    globeRef.current.backgroundColor('rgba(0,0,0,0)');
  }, [darkMode]);

  useEffect(() => {
    if (!globeRef.current) return;

    const clusters = clusterMembers(members);
    const color = CATEGORY_COLORS[category] ?? '#FF9900';

    globeRef.current
      .pointsData(clusters)
      .pointLat((point) => point.lat)
      .pointLng((point) => point.lng)
      .pointRadius((point) => (point.members.length > 1 ? 0.6 : 0.4))
      .pointColor(() => color)
      .pointAltitude(0.01)
      .onPointClick((point) => {
        if (!point) return;
        globeRef.current.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.8 }, 800);
        const payload = point.members.length === 1 ? point.members[0] : point.members;
        onMarkerClick(payload);
      });
  }, [members, category, onMarkerClick]);

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
