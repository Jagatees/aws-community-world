import { useEffect, useRef, useState } from 'react';

const STATS = [
  { label: 'Heroes', count: 263, color: '#FF9900' },
  { label: 'Community Builders', count: 2494, color: '#1A9C3E' },
  { label: 'User Groups', count: 608, color: '#00A1C9' },
  { label: 'Cloud Clubs', count: 623, color: '#BF0816' },
];

const TOTAL = 3988;

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

function createAvatarElement(hero) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 2px solid #FF9900;
    overflow: hidden;
    pointer-events: none;
    background: #0d1e2e;
    box-shadow: 0 4px 12px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,153,0,0.25);
    transform: translate(-50%, -50%);
  `;
  const img = document.createElement('img');
  img.src = hero.image_url;
  img.alt = hero.name;
  img.draggable = false;
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
  img.onerror = () => { wrapper.style.display = 'none'; };
  wrapper.appendChild(img);
  return wrapper;
}

function OrbitGlobe() {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Load globe.gl and heroes data in parallel — both are separate lazy chunks
    Promise.all([
      import('globe.gl'),
      import('../data/heroes.json'),
    ]).then(([{ default: Globe }, { default: heroesRaw }]) => {
      if (!containerRef.current) return;

      // Take a geographically spread sample: every 3rd hero, up to 80
      const markers = heroesRaw
        .filter(h => h.image_url && h.lat && h.lng && !(h.lat === 0 && h.lng === 0))
        .filter((_, i) => i % 3 === 0)
        .slice(0, 80);

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
        .htmlElementsData(markers)
        .htmlLat('lat')
        .htmlLng('lng')
        .htmlAltitude(0.06)
        .htmlTransitionDuration(0)
        .htmlElement(createAvatarElement);

      const controls = globe.controls();
      if (controls) {
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.enableRotate = false;
        controls.minDistance = globe.getGlobeRadius() * 1.01;
      }

      // Keep the avatar overlay layer below app z-index
      requestAnimationFrame(() => {
        container.querySelectorAll('div[style*="pointer-events: none"]').forEach((el) => {
          el.style.zIndex = '1';
        });
      });

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

      {/* Right panel — orbit globe with real hero avatars */}
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
