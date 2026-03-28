import { useEffect, useRef, useCallback } from 'react';
import Globe from 'globe.gl';
import { useAutoRotate } from '../hooks/useAutoRotate';

/** Per-category marker colors (Req 4.2) */
const CATEGORY_COLORS = {
  'heroes': '#FF9900',
  'community-builders': '#1A9C3E',
  'user-groups': '#00A1C9',
  'cloud-clubs': '#BF0816',
};

const CLUSTER_TOLERANCE = 0.5; // degrees (Req 4.4)

/**
 * Groups members that are within CLUSTER_TOLERANCE degrees of each other.
 * Returns an array of cluster objects: { lat, lng, members[] }
 *
 * @param {import('../types.js').Member[]} members
 * @returns {{ lat: number, lng: number, members: import('../types.js').Member[] }[]}
 */
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
 *   onMarkerClick: (member: import('../types.js').Member | import('../types.js').Member[]) => void
 * }} props
 */
export default function GlobeScene({ category, members, onMarkerClick }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const { startLoop, stopLoop, onPointerEvent } = useAutoRotate(globeRef);

  // Initialize globe once on mount (Req 1.1, 7.1)
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
      .showGraticules(false);

    // Use dot-matrix tiles via built-in dotted land
    globe
      .pointOfView({ lat: 20, lng: 0, altitude: 2.5 });

    globeRef.current = globe;
    startLoop();

    return () => {
      stopLoop();
      // globe.gl doesn't expose a destroy method; clear the container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      globeRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Resize globe when container resizes
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

  // Update markers when members or category changes (Req 4.1, 4.2, 4.3, 4.4, 5.1)
  useEffect(() => {
    if (!globeRef.current) return;

    const clusters = clusterMembers(members);
    const color = CATEGORY_COLORS[category] ?? '#FF9900';

    globeRef.current
      .pointsData(clusters)
      .pointLat((d) => d.lat)
      .pointLng((d) => d.lng)
      // Larger dot for clusters (Req 4.4)
      .pointRadius((d) => (d.members.length > 1 ? 0.6 : 0.4))
      .pointColor(() => color)
      .pointAltitude(0.01)
      // Wire click handler (Req 5.1)
      .onPointClick((point) => {
        if (!point) return;
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
      style={{ background: '#0F1923' }}
      onPointerDown={handlePointer}
      onPointerMove={handlePointer}
    />
  );
}
