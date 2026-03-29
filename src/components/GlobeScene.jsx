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

// Solid black 1x1 pixel data URL for the neon globe texture
const BLACK_TEXTURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export default function GlobeScene({ category, members, onMarkerClick, cardOpen, darkMode, flyToTarget, globeStyle }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const countriesRef = useRef([]);
  const hoveredRef = useRef(null);
  const { startLoop, stopLoop, onPointerEvent, pause, resume } = useAutoRotate(globeRef);

  const isNeon = globeStyle === 'neon';

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
      .showGraticules(false)
      .pointOfView({ lat: 20, lng: 0, altitude: 2.5 });

    globeRef.current = globe;
    startLoop();

    // Load country GeoJSON for neon polygon layer
    fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then((r) => r.json())
      .then((geo) => {
        countriesRef.current = geo.features;
        // Apply polygons if already in neon mode
        if (globeRef.current) applyPolygons(globeRef.current, false);
      })
      .catch(() => {});

    return () => {
      stopLoop();
      if (containerRef.current) containerRef.current.innerHTML = '';
      globeRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyPolygons(globe, neon) {
    if (neon && countriesRef.current.length) {
      globe
        .polygonsData(countriesRef.current)
        .polygonCapColor((d) => d === hoveredRef.current ? 'rgba(255,153,0,0.25)' : 'rgba(0,0,0,0)')
        .polygonSideColor(() => 'rgba(0,0,0,0)')
        .polygonStrokeColor(() => '#FF9900')
        .polygonAltitude((d) => d === hoveredRef.current ? 0.02 : 0.005)
        .onPolygonHover((d) => {
          hoveredRef.current = d;
          // Re-apply to trigger color update
          globe.polygonCapColor((feat) => feat === hoveredRef.current ? 'rgba(255,153,0,0.25)' : 'rgba(0,0,0,0)');
          globe.polygonAltitude((feat) => feat === hoveredRef.current ? 0.02 : 0.005);
        });
    } else {
      globe.polygonsData([]);
    }
  }

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

  // Fly to country
  useEffect(() => {
    if (!globeRef.current || !flyToTarget) return;
    globeRef.current.pointOfView({ lat: flyToTarget.lat, lng: flyToTarget.lng, altitude: 1.5 }, 1000);
  }, [flyToTarget]);

  // Switch globe style
  useEffect(() => {
    if (!globeRef.current) return;
    if (isNeon) {
      globeRef.current
        .globeImageUrl(BLACK_TEXTURE)
        .bumpImageUrl(null)
        .backgroundColor('#000000')
        .atmosphereColor('#FF9900')
        .atmosphereAltitude(0.12);
      applyPolygons(globeRef.current, true);
    } else {
      globeRef.current
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundColor(darkMode ? '#0F1923' : '#c8dff0')
        .atmosphereColor('#4a90d9')
        .atmosphereAltitude(0.15);
      applyPolygons(globeRef.current, false);
    }
  }, [isNeon]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dark mode background (only in realistic mode)
  useEffect(() => {
    if (!globeRef.current || isNeon) return;
    globeRef.current.backgroundColor(darkMode ? '#0F1923' : '#c8dff0');
  }, [darkMode, isNeon]);

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
        globeRef.current.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.8 }, 800);
        const payload = point.members.length === 1 ? point.members[0] : point.members;
        onMarkerClick(payload);
      });
  }, [members, category, onMarkerClick]);

  const handlePointer = useCallback(() => onPointerEvent(), [onPointerEvent]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: isNeon ? '#000000' : (darkMode ? '#0F1923' : '#c8dff0') }}
      onPointerDown={handlePointer}
      onPointerMove={handlePointer}
    />
  );
}
