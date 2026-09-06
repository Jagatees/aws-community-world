import { useEffect, useRef, useState } from 'react';
import MobileHomeGlobe from './MobileHomeGlobe';
import { HOME_COMMUNITY_MARKERS } from '../data/home-community-markers';
import './SplashScreen.css';
import kiroEvents from '../data/kiro-events.json';
import kiroAmbassadors from '../data/kiro-ambassadors.json';

const COMMUNITY_STATS = [
  { label: 'Heroes', count: 252, color: '#FF9900' },
  { label: 'Community Builders', count: 3036, color: '#1A9C3E' },
  { label: 'User Groups', count: 599, color: '#00A1C9' },
  { label: 'Student Builder Groups', count: 1022, color: '#BF0816' },
  { label: 'Kiro Ambassadors', count: kiroAmbassadors.length, color: '#8B5CF6' },
];

const EVENT_STATS = [
  { label: 'Kiro Events', count: kiroEvents.length, color: '#8B5CF6' },
  { label: 'Community Days', count: 38, color: '#FF9900' },
];

const HOME_GLOBE_ROTATION_SPEED = 0.018;
const EVENT_GLOBE_ROTATION_SPEED = 0.035;

function AnimatedNumber({ target, duration = 1800, delay = 0 }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotionQuery.matches) {
      const reducedMotionFrame = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(reducedMotionFrame);
    }

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

function createAvatarElement(marker) {
  const wrapper = document.createElement('div');
  wrapper.title = `${marker.name} · ${marker.role}`;
  wrapper.style.cssText = `
    position: relative;
    width: 30px;
    height: 30px;
    pointer-events: none;
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  `;

  const face = document.createElement('span');
  face.style.cssText = `
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    overflow: hidden;
    border: 2px solid ${marker.color};
    border-radius: 50%;
    color: #FFFFFF;
    background: #0d1e2e;
    box-shadow: 0 4px 12px rgba(0,0,0,0.55), 0 0 0 3px rgba(${marker.rgb},0.16);
    font: 800 ${marker.badge.length > 2 ? '7px' : '9px'}/1 Arial, sans-serif;
    letter-spacing: -0.02em;
  `;

  const categoryDot = document.createElement('span');
  categoryDot.style.cssText = `
    position: absolute;
    right: -1px;
    bottom: -1px;
    width: 8px;
    height: 8px;
    border: 2px solid #071522;
    border-radius: 50%;
    background: ${marker.color};
  `;

  const showBadge = () => {
    face.textContent = marker.badge;
  };

  if (!marker.image) {
    showBadge();
    wrapper.append(face, categoryDot);
    return wrapper;
  }

  const img = document.createElement('img');
  img.src = marker.image;
  img.alt = marker.name;
  img.draggable = false;
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
  img.onerror = () => {
    img.remove();
    showBadge();
  };
  face.appendChild(img);
  wrapper.append(face, categoryDot);
  return wrapper;
}

function createEventElement(event) {
  const isKiro = event.category === 'kiro-events';
  const color = isKiro ? '#8B5CF6' : '#FF9900';
  const dateValue = event.date || event.startsAt;
  const date = dateValue ? new Date(dateValue.includes('T') ? dateValue : `${dateValue}T12:00:00`) : null;
  const day = date && !Number.isNaN(date.getTime()) ? date.getDate() : '--';
  const wrapper = document.createElement('div');
  wrapper.title = event.name;
  wrapper.style.cssText = `
    position: relative;
    width: 40px;
    height: 46px;
    display: grid;
    place-items: start center;
    pointer-events: none;
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
    filter: drop-shadow(0 7px 8px rgba(0,0,0,0.5));
  `;

  const pin = document.createElement('span');
  pin.style.cssText = `
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid ${color};
    border-radius: 50% 50% 50% 5px;
    background: linear-gradient(135deg, ${color} 0 16%, rgba(8, 22, 36, 0.98) 17% 100%);
    box-shadow: 0 0 0 4px ${color}24, inset 0 0 0 1px rgba(255,255,255,0.1);
    transform: rotate(-45deg);
  `;

  const face = document.createElement('span');
  face.style.cssText = `
    width: 25px;
    height: 25px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    transform: rotate(45deg);
    color: #FFFFFF;
    line-height: 1;
  `;

  const brand = document.createElement('span');
  brand.style.cssText = `
    color: ${color};
    font-size: ${isKiro ? '5px' : '6px'};
    font-weight: 900;
    letter-spacing: 0.08em;
  `;
  brand.textContent = isKiro ? 'KIRO' : 'AWS';

  const dateNumber = document.createElement('span');
  dateNumber.style.cssText = `
    display: grid;
    place-items: center;
    min-width: 15px;
    height: 12px;
    border-radius: 3px;
    background: rgba(255,255,255,0.1);
    font-size: 10px;
    font-weight: 900;
  `;
  dateNumber.textContent = `${day}`;

  const pulse = document.createElement('span');
  pulse.style.cssText = `
    position: absolute;
    left: 50%;
    bottom: 1px;
    width: 14px;
    height: 4px;
    border-radius: 50%;
    background: ${color};
    opacity: 0.28;
    transform: translateX(-50%);
    filter: blur(2px);
  `;

  face.append(brand, dateNumber);
  pin.appendChild(face);
  wrapper.append(pin, pulse);
  return wrapper;
}

function shuffled(values) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function OrbitGlobe({ isEvents }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const rafRef = useRef(null);
  const timersRef = useRef([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let cancelled = false;

    // Event data stays lazy; the home globe uses the small balanced preview set.
    const markerDataPromise = isEvents
      ? Promise.all([
        import('../data/community-days.json'),
        import('../data/kiro-events.json'),
      ]).then(([{ default: communityDays }, { default: kiroEvents }]) => [
        ...communityDays.map((event) => ({ ...event, category: 'community-days' })),
        ...kiroEvents.map((event) => ({ ...event, category: 'kiro-events' })),
      ])
      : Promise.resolve(HOME_COMMUNITY_MARKERS);

    Promise.all([
      import('globe.gl'),
      markerDataPromise,
    ]).then(([{ default: Globe }, markerData]) => {
      if (cancelled || !containerRef.current) return;

      const validMarkers = markerData.filter((marker) => (
        Number.isFinite(Number(marker.lat)) &&
        Number.isFinite(Number(marker.lng)) &&
        !(Number(marker.lat) === 0 && Number(marker.lng) === 0)
      ));
      const markers = isEvents ? shuffled(validMarkers) : validMarkers;

      let globe;
      try {
        globe = Globe()(container);
      } catch (error) {
        console.warn('Splash globe failed, using static fallback.', error);
        if (!cancelled) setFailed(true);
        return;
      }

      globe
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(true)
        .atmosphereColor('#4a90d9')
        .atmosphereAltitude(0.18)
        .globeImageUrl('/textures/earth-blue-marble.jpg')
        .bumpImageUrl('/textures/earth-topology.png')
        .showGraticules(false)
        .pointOfView({ lat: 20, lng: 0, altitude: 2.2 })
        .htmlElementsData(markers)
        .htmlLat('lat')
        .htmlLng('lng')
        .htmlAltitude(0.06)
        .htmlTransitionDuration(0)
        .htmlElement(isEvents ? createEventElement : createAvatarElement);

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
            lng: pov.lng + (isEvents ? EVENT_GLOBE_ROTATION_SPEED : HOME_GLOBE_ROTATION_SPEED),
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
    }).catch((error) => {
      console.warn('Splash globe assets failed, using static fallback.', error);
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      timersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
        window.clearInterval(timerId);
      });
      timersRef.current = [];
      if (globeRef.current?._observer) globeRef.current._observer.disconnect();
      const renderer = globeRef.current?.renderer?.();
      globeRef.current?._destructor?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      container.innerHTML = '';
      globeRef.current = null;
    };
  }, [isEvents]);

  if (failed) {
    return (
      <div
        aria-hidden="true"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: 'radial-gradient(circle at center, rgba(55, 97, 135, 0.34), rgba(9, 17, 26, 0.08) 58%, transparent 76%)',
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    />
  );
}

const MOBILE_COMMUNITY_STATS = [
  { key: 'heroes', count: 252, label: 'Heroes' },
  { key: 'builders', count: 3036, label: 'Builders', fullLabel: 'Community Builders' },
  { key: 'groups', count: 599, label: 'User groups', fullLabel: 'User Groups' },
  { key: 'students', count: 1022, label: 'Students', fullLabel: 'Student Builder Groups' },
  { key: 'kiro', count: kiroAmbassadors.length, label: 'Kiro', fullLabel: 'Kiro Ambassadors' },
];

const MOBILE_EVENT_STATS = [
  { key: 'kiro', count: kiroEvents.length, label: 'Kiro events', fullLabel: 'Kiro Events' },
  { key: 'community-days', count: 38, label: 'Community days', fullLabel: 'Community Days' },
];

function MobileSplashHome({ onStart, exiting, activeSection, onSectionChange }) {
  const isEvents = activeSection === 'events';
  const stats = isEvents ? MOBILE_EVENT_STATS : MOBILE_COMMUNITY_STATS;
  const total = stats.reduce((sum, stat) => sum + stat.count, 0);

  return (
    <section
      className={`mobile-home${exiting ? ' mobile-home--exiting' : ''}`}
      aria-labelledby="mobile-home-title"
    >
      <div className="mobile-home__ambient" aria-hidden="true" />

      <main className="mobile-home__main">
        <div className="mobile-home__globe-stage">
          <MobileHomeGlobe isEvents={isEvents} />
        </div>

        <div className="mobile-home__copy">
          <span className="mobile-home__eyebrow">AWS</span>
          <h1 id="mobile-home-title">
            <button
              type="button"
              className="mobile-home__headline-mode"
              onClick={() => onSectionChange?.(isEvents ? 'community' : 'events')}
              aria-label={`Switch to ${isEvents ? 'Community' : 'Events'} Globe`}
            >
              <span className="mobile-home__click-hint" aria-hidden="true">Click me</span>
              {isEvents ? 'Event' : 'Community'}
            </button>{' '}
            <span>Globe</span>
          </h1>
          <p>{isEvents
            ? 'Meetups, community days and builder events — all around the world.'
            : 'People, groups and events — all around the world.'}</p>
        </div>

        <button type="button" className="mobile-home__enter" onClick={onStart}>
          Enter the Globe
          <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11M10 5l4 4-4 4" /></svg>
        </button>

        <section
          className={`mobile-home__stats${isEvents ? ' mobile-home__stats--events' : ''}`}
          aria-label={isEvents ? 'Event totals' : 'Community totals'}
        >
          <div className="mobile-home__stats-total">
            <strong><AnimatedNumber key={`${activeSection}-total`} target={total} duration={1600} /></strong>
            <p>{isEvents ? 'Events worldwide' : 'Community members worldwide'}</p>
          </div>
          <dl className="mobile-home__stats-breakdown">
            {stats.map((stat, index) => (
              <div
                key={stat.key}
                className={`mobile-home__stat mobile-home__stat--${stat.key}`}
                aria-label={`${stat.count.toLocaleString()} ${stat.fullLabel ?? stat.label}`}
              >
                <dt>
                  <strong>
                    <AnimatedNumber
                      key={`${activeSection}-${stat.key}`}
                      target={stat.count}
                      duration={1350}
                      delay={180 + index * 80}
                    />
                  </strong>
                </dt>
                <dd>{stat.label}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </section>
  );
}

export default function SplashScreen({ onStart, exiting, activeSection = 'community', onSectionChange }) {
  const [showGlobe, setShowGlobe] = useState(false);
  const [useMobileHome] = useState(() => (
    window.matchMedia('(max-width: 767px), (pointer: coarse) and (max-width: 1023px)').matches
  ));
  const [allowInteractiveGlobe] = useState(() => (
    !window.matchMedia('(max-width: 767px), (pointer: coarse), (prefers-reduced-motion: reduce)').matches
  ));
  const isEvents = activeSection === 'events';
  const stats = isEvents ? EVENT_STATS : COMMUNITY_STATS;
  const total = stats.reduce((sum, stat) => sum + stat.count, 0);

  useEffect(() => {
    if (exiting || !allowInteractiveGlobe) return undefined;

    let cancelled = false;
    let timeoutId = 0;
    const show = () => {
      if (!cancelled) setShowGlobe(true);
    };

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(show, { timeout: 1200 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    timeoutId = window.setTimeout(show, 650);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [allowInteractiveGlobe, exiting]);

  if (useMobileHome) {
    return (
      <MobileSplashHome
        onStart={onStart}
        exiting={exiting}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />
    );
  }

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
          AWS
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
          <button
            key={activeSection}
            type="button"
            className="section-mode-switch splash-section-switch"
            onClick={() => onSectionChange?.(isEvents ? 'community' : 'events')}
            aria-label={`Switch to ${isEvents ? 'Community' : 'Event'} Globe`}
            title={`Switch to ${isEvents ? 'Community' : 'Event'} Globe`}
          >
            {isEvents ? 'Event' : 'Community'}
          </button>{' '}
          <span>Globe</span>
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
            <AnimatedNumber key={activeSection} target={total} duration={1600} />
          </div>
          <div
            style={{
              color: '#8B9BAA',
              fontSize: '0.95rem',
              fontWeight: 500,
              marginTop: '0.4rem',
            }}
          >
            {isEvents ? 'Upcoming events worldwide' : 'Community members worldwide'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '2.5rem' }}>
          {stats.map((stat, i) => (
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
                {stat.countLabel ?? <AnimatedNumber target={stat.count} duration={1400} delay={200 + i * 80} />}
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
          Explore the {isEvents ? 'Event' : 'Community'} Globe
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
        {showGlobe && !exiting ? <OrbitGlobe isEvents={isEvents} /> : (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '12%',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 30%, rgba(74, 144, 217, 0.38), rgba(8, 18, 30, 0.96) 58%, rgba(2, 6, 12, 1) 72%)',
              boxShadow: 'inset -42px -30px 80px rgba(0, 0, 0, 0.68), 0 0 70px rgba(74, 144, 217, 0.2)',
              opacity: 0.82,
            }}
          />
        )}
      </div>
    </div>
  );
}
