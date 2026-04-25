import { useEffect, useRef, useState } from 'react';

const STATS = [
  { label: 'Heroes', count: 263, color: '#FF9900' },
  { label: 'Community Builders', count: 2494, color: '#1A9C3E' },
  { label: 'User Groups', count: 608, color: '#00A1C9' },
  { label: 'Cloud Clubs', count: 623, color: '#BF0816' },
];

const TOTAL = 3988;

const GLOBE_MARKERS = [
  { lat: 40.7128, lng: -74.006 }, { lat: 37.7749, lng: -122.4194 },
  { lat: 47.6062, lng: -122.3321 }, { lat: 43.6532, lng: -79.3832 },
  { lat: 19.4326, lng: -99.1332 }, { lat: 33.749, lng: -84.388 },
  { lat: 41.8781, lng: -87.6298 }, { lat: 29.7604, lng: -95.3698 },
  { lat: 45.5017, lng: -73.5673 }, { lat: 51.5074, lng: -0.1278 },
  { lat: 48.8566, lng: 2.3522 }, { lat: 52.52, lng: 13.405 },
  { lat: 41.9028, lng: 12.4964 }, { lat: 40.4168, lng: -3.7038 },
  { lat: 52.3676, lng: 4.9041 }, { lat: 59.3293, lng: 18.0686 },
  { lat: 48.2082, lng: 16.3738 }, { lat: 50.0755, lng: 14.4378 },
  { lat: 53.3498, lng: -6.2603 }, { lat: 55.9533, lng: -3.1883 },
  { lat: 47.3769, lng: 8.5417 }, { lat: 50.8503, lng: 4.3517 },
  { lat: 60.1699, lng: 24.9384 }, { lat: 55.7558, lng: 37.6173 },
  { lat: 35.6762, lng: 139.6503 }, { lat: 31.2304, lng: 121.4737 },
  { lat: 22.3193, lng: 114.1694 }, { lat: 1.3521, lng: 103.8198 },
  { lat: 28.6139, lng: 77.209 }, { lat: 12.9716, lng: 77.5946 },
  { lat: 19.076, lng: 72.8777 }, { lat: 37.5665, lng: 126.978 },
  { lat: 25.2048, lng: 55.2708 }, { lat: 24.774, lng: 46.7388 },
  { lat: 3.139, lng: 101.6869 }, { lat: 13.7563, lng: 100.5018 },
  { lat: -33.8688, lng: 151.2093 }, { lat: -37.8136, lng: 144.9631 },
  { lat: -36.8485, lng: 174.7633 }, { lat: -23.5505, lng: -46.6333 },
  { lat: -34.6037, lng: -58.3816 }, { lat: -12.0464, lng: -77.0428 },
  { lat: 4.711, lng: -74.0721 }, { lat: -0.1807, lng: -78.4678 },
  { lat: -26.2041, lng: 28.0473 }, { lat: 6.5244, lng: 3.3792 },
  { lat: 30.0444, lng: 31.2357 }, { lat: -1.2921, lng: 36.8219 },
  { lat: 33.9716, lng: -6.8498 }, { lat: 59.9139, lng: 10.7522 },
];

function AnimatedNumber({ target, duration = 1800, delay = 0 }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf;
    const timeoutId = setTimeout(() => {
      let startTime = null;
      function tick(now) {
        if (!startTime) startTime = now;
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);

  return <span>{value.toLocaleString()}</span>;
}

function OrbitGlobe() {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Dynamic import keeps globe.gl out of the main bundle
    import('globe.gl').then(({ default: Globe }) => {
      if (!containerRef.current) return;

      const globe = Globe()(container);
      globe
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(true)
        .atmosphereColor('#4a90d9')
        .atmosphereAltitude(0.18)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .showGraticules(false)
        .pointOfView({ lat: 20, lng: 0, altitude: 2.2 })
        .pointsData(GLOBE_MARKERS)
        .pointLat('lat')
        .pointLng('lng')
        .pointColor(() => '#FF9900')
        .pointAltitude(0.012)
        .pointRadius(0.38);

      const controls = globe.controls();
      if (controls) {
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.enableRotate = false;
        controls.minDistance = globe.getGlobeRadius() * 1.01;
      }

      globeRef.current = globe;

      const tick = () => {
        if (globeRef.current) {
          const pov = globeRef.current.pointOfView();
          globeRef.current.pointOfView({
            lat: pov.lat,
            lng: pov.lng + 0.15,
            altitude: pov.altitude,
          });
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      const observer = new ResizeObserver(() => {
        if (globeRef.current && containerRef.current) {
          globeRef.current
            .width(containerRef.current.clientWidth)
            .height(containerRef.current.clientHeight);
        }
      });
      observer.observe(container);

      globeRef.current._observer = observer;
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (globeRef.current?._observer) globeRef.current._observer.disconnect();
      container.innerHTML = '';
      globeRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    />
  );
}

export default function SplashScreen({ onStart, exiting }) {
  return (
    <div
      className="absolute inset-0 z-50 flex overflow-hidden aws-shell-bg-dark"
      style={{
        transition: 'opacity 0.65s cubic-bezier(0.4, 0, 0.2, 1), filter 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: exiting ? 0 : 1,
        filter: exiting ? 'brightness(1.5)' : 'brightness(1)',
        pointerEvents: exiting ? 'none' : 'auto',
      }}
    >
      <div className="aws-shell-pattern" />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 80% at 75% 50%, rgba(0, 161, 201, 0.1) 0%, transparent 70%)',
        }}
      />

      {/* Left panel */}
      <div
        className="relative z-10 flex flex-col justify-center px-10 lg:px-16 xl:px-20"
        style={{
          width: '48%',
          minWidth: '300px',
          flexShrink: 0,
          transition: 'opacity 0.35s ease, transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: exiting ? 0 : 1,
          transform: exiting ? 'translateX(-50px)' : 'translateX(0)',
        }}
      >
        <div
          style={{
            color: '#FF9900',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: '0.6rem',
          }}
        >
          AWS Community
        </div>

        <h1
          style={{
            color: '#FFFFFF',
            fontSize: 'clamp(1.9rem, 3.5vw, 3rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            margin: 0,
            marginBottom: '1rem',
          }}
        >
          Community Globe
        </h1>

        <div
          style={{
            width: '2.8rem',
            height: '3px',
            backgroundColor: '#FF9900',
            borderRadius: '2px',
            marginBottom: '2rem',
          }}
        />

        <div style={{ marginBottom: '1.75rem' }}>
          <div
            style={{
              color: '#FFFFFF',
              fontSize: 'clamp(3rem, 5.5vw, 4.8rem)',
              fontWeight: 900,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}
          >
            <AnimatedNumber target={TOTAL} duration={1600} />
          </div>
          <div
            style={{
              color: '#8B9BAA',
              fontSize: '0.95rem',
              fontWeight: 500,
              marginTop: '0.4rem',
            }}
          >
            Community members worldwide
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '2.5rem' }}>
          {STATS.map((stat, i) => (
            <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: stat.color,
                  flexShrink: 0,
                  boxShadow: `0 0 6px ${stat.color}80`,
                }}
              />
              <span
                style={{
                  color: stat.color,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: '3.5rem',
                  fontSize: '0.95rem',
                }}
              >
                <AnimatedNumber target={stat.count} duration={1400} delay={200 + i * 80} />
              </span>
              <span style={{ color: '#8B9BAA', fontSize: '0.88rem' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onStart}
          style={{
            backgroundColor: '#FF9900',
            color: '#0F1923',
            fontWeight: 700,
            fontSize: '0.95rem',
            padding: '0.8rem 1.8rem',
            borderRadius: '9999px',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            width: 'fit-content',
            boxShadow: '0 4px 22px rgba(255, 153, 0, 0.38)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 153, 0, 0.55)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.boxShadow = '0 4px 22px rgba(255, 153, 0, 0.38)';
          }}
        >
          Explore the Globe
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M2.5 7.5h10M8.5 3.5l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div style={{ marginTop: '2rem', color: '#3D5168', fontSize: '0.72rem', letterSpacing: '0.04em' }}>
          Data from AWS Builder Center
        </div>
      </div>

      {/* Right panel — orbit globe */}
      <div
        className="relative flex-1"
        style={{
          minWidth: 0,
          transition: 'transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: exiting ? 'scale(1.06)' : 'scale(1)',
        }}
      >
        <OrbitGlobe />
      </div>
    </div>
  );
}
