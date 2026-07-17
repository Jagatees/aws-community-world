import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ExperimentalHeroDex.css';

const SOCIAL_LABELS = {
  linkedin: 'LinkedIn',
  github: 'GitHub',
  x: 'X',
  youtube: 'YouTube',
  blog: 'Blog',
  website: 'Website',
  devto: 'DEV',
  facebook: 'Facebook',
  repost: 'Repost',
};

const AWS_HERO_PLACEHOLDER_URL = 'https://a0.awsstatic.com/libra-css/images/logos/aws_smile-header-desktop-en-white_59x35.png';
const AUTO_ORBIT_SPEED = 0.00012;
const SCAN_EXIT_DURATION = 180;
const SCAN_ENTER_DURATION = 360;

function wrapIndex(index, length) {
  if (!length) return 0;
  return ((index % length) + length) % length;
}

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function recordNumber(hero, members) {
  const index = members.findIndex((member) => member.id === hero?.id);
  return String(Math.max(0, index) + 1).padStart(3, '0');
}

function Portrait({ hero, eager = false }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const [loadedUrl, setLoadedUrl] = useState(null);
  const [placeholderFailed, setPlaceholderFailed] = useState(false);
  const imageLoaded = loadedUrl === hero?.avatarUrl;

  if (!hero?.avatarUrl || failedUrl === hero.avatarUrl) {
    return (
      <span className="hero-dex__placeholder">
        {placeholderFailed ? (
          <span className="hero-dex__initials">{initials(hero?.name)}</span>
        ) : (
          <img
            className="hero-dex__placeholder-logo"
            src={AWS_HERO_PLACEHOLDER_URL}
            alt=""
            loading="eager"
            draggable="false"
            onError={() => setPlaceholderFailed(true)}
          />
        )}
        <strong>AWS HEROES</strong>
      </span>
    );
  }

  return (
    <span className={`hero-dex__portrait ${imageLoaded ? 'hero-dex__portrait--loaded' : ''}`}>
      <span className="hero-dex__image-loader" aria-hidden="true">
        <span className="hero-dex__image-loader-mark">AWS</span>
      </span>
      <img
        className="hero-dex__portrait-image"
        src={hero.avatarUrl}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        draggable="false"
        onLoad={() => setLoadedUrl(hero.avatarUrl)}
        onError={() => setFailedUrl(hero.avatarUrl)}
      />
    </span>
  );
}

export default function ExperimentalHeroDex({ members, loading, darkMode }) {
  const [rotation, setRotation] = useState(0);
  const [selectedHero, setSelectedHero] = useState(null);
  const [scanTransition, setScanTransition] = useState(null);
  const [query, setQuery] = useState('');
  const [heroType, setHeroType] = useState('all');
  const rotationRef = useRef(0);
  const targetRotationRef = useRef(0);
  const animationFrameRef = useRef(null);
  const wheelSnapTimerRef = useRef(null);
  const autoOrbitFrameRef = useRef(null);
  const autoOrbitLastTimeRef = useRef(null);
  const autoOrbitEnabledRef = useRef(false);
  const carouselHoveredRef = useRef(false);
  const scanTransitionTimerRef = useRef(null);
  const dragStateRef = useRef(null);
  const dragDistance = useRef(0);
  const suppressClickRef = useRef(false);

  const heroTypes = useMemo(
    () => [...new Set(members.map((member) => member.heroType).filter(Boolean))].sort(),
    [members]
  );

  const filteredHeroes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return members.filter((member) => {
      if (heroType !== 'all' && member.heroType !== heroType) return false;
      if (!normalizedQuery) return true;
      return [member.name, member.heroType, member.location]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [heroType, members, query]);

  const animateRotation = useCallback(() => {
    if (animationFrameRef.current !== null) return;

    const tick = () => {
      const distance = targetRotationRef.current - rotationRef.current;
      const nextRotation = Math.abs(distance) < 0.001
        ? targetRotationRef.current
        : rotationRef.current + distance * 0.14;

      rotationRef.current = nextRotation;
      setRotation(nextRotation);

      if (Math.abs(targetRotationRef.current - nextRotation) > 0.001) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);
  }, []);

  const moveToRotation = useCallback((nextRotation) => {
    targetRotationRef.current = nextRotation;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      rotationRef.current = nextRotation;
      setRotation(nextRotation);
      return;
    }

    animateRotation();
  }, [animateRotation]);

  const stopAutoOrbit = useCallback(() => {
    autoOrbitEnabledRef.current = false;
    autoOrbitLastTimeRef.current = null;
    if (autoOrbitFrameRef.current !== null) window.cancelAnimationFrame(autoOrbitFrameRef.current);
    autoOrbitFrameRef.current = null;
  }, []);

  const runAutoOrbit = useCallback(function orbitFrame(timestamp) {
    if (!autoOrbitEnabledRef.current || carouselHoveredRef.current) {
      autoOrbitFrameRef.current = null;
      autoOrbitLastTimeRef.current = null;
      return;
    }

    const previousTime = autoOrbitLastTimeRef.current ?? timestamp;
    const elapsed = Math.min(40, Math.max(0, timestamp - previousTime));
    autoOrbitLastTimeRef.current = timestamp;

    if (animationFrameRef.current === null && dragStateRef.current === null) {
      const nextRotation = rotationRef.current + elapsed * AUTO_ORBIT_SPEED;
      rotationRef.current = nextRotation;
      targetRotationRef.current = nextRotation;
      setRotation(nextRotation);
    }

    autoOrbitFrameRef.current = window.requestAnimationFrame(orbitFrame);
  }, []);

  const startAutoOrbit = useCallback(() => {
    if (
      carouselHoveredRef.current
      || selectedHero
      || !filteredHeroes.length
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) return;

    autoOrbitEnabledRef.current = true;
    autoOrbitLastTimeRef.current = null;
    if (autoOrbitFrameRef.current === null) {
      autoOrbitFrameRef.current = window.requestAnimationFrame(runAutoOrbit);
    }
  }, [filteredHeroes.length, runAutoOrbit, selectedHero]);

  const pauseCarousel = useCallback(() => {
    carouselHoveredRef.current = true;
    stopAutoOrbit();
  }, [stopAutoOrbit]);

  const resumeCarousel = useCallback(() => {
    carouselHoveredRef.current = false;
    startAutoOrbit();
  }, [startAutoOrbit]);

  const rotate = useCallback((direction) => {
    moveToRotation(Math.round(targetRotationRef.current) + direction);
  }, [moveToRotation]);

  const resetRotation = useCallback(() => {
    if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
    if (wheelSnapTimerRef.current !== null) window.clearTimeout(wheelSnapTimerRef.current);
    animationFrameRef.current = null;
    wheelSnapTimerRef.current = null;
    rotationRef.current = 0;
    targetRotationRef.current = 0;
    setRotation(0);
  }, []);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
    if (wheelSnapTimerRef.current !== null) window.clearTimeout(wheelSnapTimerRef.current);
    if (autoOrbitFrameRef.current !== null) window.cancelAnimationFrame(autoOrbitFrameRef.current);
    if (scanTransitionTimerRef.current !== null) window.clearTimeout(scanTransitionTimerRef.current);
  }, []);

  useEffect(() => {
    if (selectedHero || !filteredHeroes.length) stopAutoOrbit();
    else startAutoOrbit();
    return stopAutoOrbit;
  }, [filteredHeroes.length, selectedHero, startAutoOrbit, stopAutoOrbit]);

  const closeHero = useCallback(() => {
    if (scanTransitionTimerRef.current !== null) window.clearTimeout(scanTransitionTimerRef.current);
    scanTransitionTimerRef.current = null;
    setScanTransition(null);
    setSelectedHero(null);
  }, []);

  const stepSelectedHero = useCallback((direction) => {
    if (!filteredHeroes.length || !selectedHero || scanTransition) return;

    const selectedIndex = filteredHeroes.findIndex((hero) => hero.id === selectedHero.id);
    const nextHero = filteredHeroes[wrapIndex(selectedIndex + direction, filteredHeroes.length)];
    const motion = direction > 0 ? 'next' : 'previous';

    setScanTransition(`exit-${motion}`);
    scanTransitionTimerRef.current = window.setTimeout(() => {
      setSelectedHero(nextHero);
      setScanTransition(`enter-${motion}`);
      scanTransitionTimerRef.current = window.setTimeout(() => {
        scanTransitionTimerRef.current = null;
        setScanTransition(null);
      }, SCAN_ENTER_DURATION);
    }, SCAN_EXIT_DURATION);
  }, [filteredHeroes, scanTransition, selectedHero]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && selectedHero) {
        closeHero();
        return;
      }

      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (/input|select|textarea/i.test(document.activeElement?.tagName ?? '')) return;

      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;

      if (selectedHero) {
        stepSelectedHero(direction);
      } else {
        rotate(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeHero, rotate, selectedHero, stepSelectedHero]);

  const handleWheel = (event) => {
    const primaryDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(primaryDelta) < 0.5) return;

    const rotationDelta = Math.max(-1.15, Math.min(1.15, primaryDelta / 145));
    moveToRotation(targetRotationRef.current + rotationDelta);

    if (wheelSnapTimerRef.current !== null) window.clearTimeout(wheelSnapTimerRef.current);
    wheelSnapTimerRef.current = window.setTimeout(() => {
      wheelSnapTimerRef.current = null;
      moveToRotation(Math.round(targetRotationRef.current));
    }, 130);
  };

  const handlePointerDown = (event) => {
    const now = window.performance.now();
    dragStateRef.current = {
      startX: event.clientX,
      startTarget: targetRotationRef.current,
      lastX: event.clientX,
      lastTime: now,
      velocity: 0,
      pointerId: event.pointerId,
      captured: false,
    };
    dragDistance.current = 0;
    suppressClickRef.current = false;
  };

  const handlePointerMove = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    const now = window.performance.now();
    const elapsed = Math.max(1, now - dragState.lastTime);
    dragState.velocity = (event.clientX - dragState.lastX) / elapsed;
    dragState.lastX = event.clientX;
    dragState.lastTime = now;
    dragDistance.current = event.clientX - dragState.startX;

    if (Math.abs(dragDistance.current) > 6 && !dragState.captured) {
      event.currentTarget.setPointerCapture?.(dragState.pointerId);
      dragState.captured = true;
      suppressClickRef.current = true;
    }

    moveToRotation(dragState.startTarget - dragDistance.current / 126);
  };

  const finishDrag = () => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    suppressClickRef.current = Math.abs(dragDistance.current) > 10;
    const inertia = Math.max(-2.4, Math.min(2.4, -dragState.velocity * 0.9));
    dragStateRef.current = null;
    moveToRotation(Math.round(targetRotationRef.current + inertia));
  };

  const openHero = (hero) => {
    if (suppressClickRef.current || Math.abs(dragDistance.current) > 10) {
      suppressClickRef.current = false;
      return;
    }
    stopAutoOrbit();
    setSelectedHero(hero);
  };

  const selectedIndex = selectedHero
    ? filteredHeroes.findIndex((hero) => hero.id === selectedHero.id)
    : -1;

  return (
    <section className={`hero-dex ${darkMode ? 'hero-dex--dark' : 'hero-dex--light'}`} aria-label="Experimental AWS Heroes archive">
      <div className="hero-dex__grid" aria-hidden="true" />
      <div className="hero-dex__scanline" aria-hidden="true" />

      <header className="hero-dex__masthead">
        <div className="hero-dex__identity">
          <span className="hero-dex__eyebrow"><i /> AWS community // experimental</span>
          <h1>Hero archive</h1>
          <p>Rotate the vault. Open a tile to scan a hero record.</p>
        </div>

        <div className="hero-dex__tools">
          <label className="hero-dex__search">
            <span className="sr-only">Search heroes</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                resetRotation();
              }}
              placeholder="Search name or location"
            />
            <kbd>/</kbd>
          </label>
          <label className="hero-dex__select">
            <span className="sr-only">Filter by hero type</span>
            <select
              value={heroType}
              onChange={(event) => {
                setHeroType(event.target.value);
                resetRotation();
              }}
            >
              <option value="all">All hero types</option>
              {heroTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
          </label>
        </div>
      </header>

      <div
        className="hero-dex__stage"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onMouseEnter={pauseCarousel}
        onMouseLeave={resumeCarousel}
      >
        {loading ? (
          <div className="hero-dex__loading">
            <span className="hero-dex__loader" />
            <p>Indexing hero records</p>
          </div>
        ) : filteredHeroes.length ? (
          <div className="hero-dex__tiles">
            {(() => {
              const columnCount = Math.ceil(filteredHeroes.length / 3);
              const visibleColumnCount = Math.min(19, columnCount);
              return [0, 1, 2].flatMap((row) => {
              const rowDirection = row === 1 ? 1 : -1;
              const rowRotation = rotation * rowDirection;
              const centerColumn = Math.round(rowRotation);
              const startColumn = centerColumn - Math.floor((visibleColumnCount - 1) / 2);
              const visibleColumns = Array.from({ length: visibleColumnCount }, (_, index) => startColumn + index);

              return visibleColumns.map((logicalColumn) => {
              const groupIndex = wrapIndex(logicalColumn, columnCount);
              const memberIndex = groupIndex * 3 + row;
              if (memberIndex >= filteredHeroes.length) return null;

              const hero = filteredHeroes[memberIndex];
              const relativeColumn = logicalColumn - rowRotation;
              const distance = Math.abs(relativeColumn);
              const slotDistance = Math.abs(logicalColumn - centerColumn);
              const slotSide = logicalColumn === centerColumn
                ? (row === 0 ? -1 : row === 2 ? 1 : 0)
                : Math.sign(logicalColumn - centerColumn);
              const angleDegrees = relativeColumn * 13.2;
              const angleRadians = angleDegrees * (Math.PI / 180);
              const cosine = Math.cos(angleRadians);
              const depthRatio = (cosine + 1) / 2;
              const scale = 0.64 + depthRatio * 0.36;
              const yBase = row === 0 ? 18 : row === 1 ? 50 : 82;
              const isCenter = logicalColumn === centerColumn && row === 1;

              return (
                <button
                  type="button"
                  key={hero.id}
                  className={`hero-dex__hex ${isCenter ? 'hero-dex__hex--center' : ''}`}
                  data-carousel-row={row === 0 ? 'top' : row === 1 ? 'middle' : 'bottom'}
                  data-idle-direction={row === 1 ? 'left' : 'right'}
                  style={{
                    '--hex-shift-x': `${Math.sin(angleRadians) * 47}vw`,
                    '--hex-y': `${yBase}%`,
                    '--hex-scale': scale,
                    '--hex-turn': `${-angleDegrees * 0.82}deg`,
                    '--hex-opacity': Math.max(0.08, Math.min(1, (cosine + 0.2) / 1.2)),
                    '--hex-layer': Math.round(80 + cosine * 40),
                    '--slot-delay': `${70 + row * 90 + slotDistance * 28}ms`,
                    '--slot-x': `${slotSide * (row === 1 ? 7.5 : 3.8)}rem`,
                    '--slot-y': row === 0 ? '-6rem' : row === 2 ? '6rem' : '0rem',
                    '--slot-flip': `${slotSide * 78}deg`,
                    '--slot-tilt': `${slotSide * -16}deg`,
                  }}
                  onClick={() => openHero(hero)}
                  aria-label={`Open ${hero.name}, ${hero.heroType}`}
                >
                  <span className="hero-dex__hex-frame">
                    <span className="hero-dex__hex-image"><Portrait hero={hero} eager={distance < 2} /></span>
                    <span className="hero-dex__hex-sheen" />
                  </span>
                  <span className="hero-dex__tooltip">
                    <strong>{hero.name}</strong>
                    <small>{hero.heroType}</small>
                  </span>
                </button>
              );
              });
              });
            })()}
          </div>
        ) : (
          <div className="hero-dex__empty">
            <span>00</span>
            <h2>No records found</h2>
            <button type="button" onClick={() => { setQuery(''); setHeroType('all'); resetRotation(); }}>Clear filters</button>
          </div>
        )}
      </div>

      <footer className="hero-dex__controls">
        <button type="button" onClick={() => rotate(-1)} disabled={!filteredHeroes.length} aria-label="Rotate left">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
        </button>
        <div>
          <span className="hero-dex__drag-icon" aria-hidden="true"><i /><i /><i /></span>
          <p><strong>Drag or scroll</strong><small>Continuous orbit · hover to pause</small></p>
        </div>
        <button type="button" onClick={() => rotate(1)} disabled={!filteredHeroes.length} aria-label="Rotate right">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        </button>
      </footer>

      {selectedHero && (
        <article
          className={`hero-scan ${scanTransition ? `hero-scan--${scanTransition}` : ''}`}
          aria-modal="true"
          role="dialog"
          aria-label={`${selectedHero.name} hero record`}
        >
          <div className="hero-scan__backdrop" aria-hidden="true">
            {[-2, -1, 0, 1, 2].map((offset) => {
              const hero = filteredHeroes[wrapIndex(selectedIndex + offset, filteredHeroes.length)];
              return (
                <span key={hero.id} style={{ '--ghost-offset': offset }}>
                  <Portrait hero={hero} />
                </span>
              );
            })}
          </div>
          <div className="hero-scan__grid" aria-hidden="true" />
          <div className="hero-scan__sweep" aria-hidden="true" />

          <header className="hero-scan__header">
            <button type="button" className="hero-scan__back" onClick={closeHero}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
              Back to archive
            </button>
            <div className="hero-scan__title">
              <span>#{recordNumber(selectedHero, members)}</span>
              <div><p>AWS Hero record</p><h2>{selectedHero.name}</h2></div>
            </div>
            <div className="hero-scan__header-actions">
              <span className="hero-scan__status"><i /> Record online</span>
              <button type="button" className="hero-scan__close" onClick={closeHero} aria-label="Close hero details">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>
          </header>

          <div className="hero-scan__body">
            <aside className="hero-scan__panel hero-scan__panel--left">
              <p className="hero-scan__panel-label">Profile data</p>
              <dl>
                <div><dt>Classification</dt><dd>{selectedHero.heroType || 'AWS Hero'}</dd></div>
                <div><dt>Location</dt><dd>{selectedHero.location || 'Not listed'}</dd></div>
                <div>
                  <dt>Coordinates</dt>
                  <dd className="hero-scan__mono">
                    {Number.isFinite(selectedHero.lat) && Number.isFinite(selectedHero.lng)
                      ? `${selectedHero.lat.toFixed(2)} / ${selectedHero.lng.toFixed(2)}`
                      : 'Not mapped'}
                  </dd>
                </div>
              </dl>
              <div className="hero-scan__locator" aria-hidden="true">
                <span /><span /><span /><i />
              </div>
            </aside>

            <div className="hero-scan__portrait-wrap">
              <div className="hero-scan__reticle" aria-hidden="true"><span /><span /><span /></div>
              <div className="hero-scan__portrait">
                <Portrait key={selectedHero.id} hero={selectedHero} eager />
                <div className="hero-scan__portrait-lines" aria-hidden="true" />
              </div>
              <span className="hero-scan__classification">{selectedHero.heroType || 'AWS Hero'}</span>
            </div>

            <aside className="hero-scan__panel hero-scan__panel--right">
              <p className="hero-scan__panel-label">Connected channels</p>
              <div className="hero-scan__channels">
                {Object.entries(selectedHero.socialLinks ?? {}).length ? (
                  Object.entries(selectedHero.socialLinks).map(([network, url]) => (
                    <a key={network} href={url} target="_blank" rel="noopener noreferrer">
                      <span>{SOCIAL_LABELS[network] ?? network}</span><i>↗</i>
                    </a>
                  ))
                ) : <p>No public social channels listed.</p>}
              </div>
              <div className="hero-scan__signal">
                <span>Profile link</span>
                <div><i /><i /><i /><i /><i /></div>
                <strong>READY</strong>
              </div>
            </aside>
          </div>

          <footer className="hero-scan__footer">
            <button type="button" onClick={() => stepSelectedHero(-1)} disabled={Boolean(scanTransition)} aria-label="Previous hero">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
              Previous
            </button>
            <div className="hero-scan__actions">
              {selectedHero.profileUrl && (
                <a href={selectedHero.profileUrl} target="_blank" rel="noopener noreferrer">Open hero page <span>↗</span></a>
              )}
              {selectedHero.builderProfileUrl && (
                <a className="hero-scan__secondary" href={selectedHero.builderProfileUrl} target="_blank" rel="noopener noreferrer">Builder profile <span>↗</span></a>
              )}
            </div>
            <button type="button" onClick={() => stepSelectedHero(1)} disabled={Boolean(scanTransition)} aria-label="Next hero">
              Next
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
            </button>
          </footer>
        </article>
      )}
    </section>
  );
}
