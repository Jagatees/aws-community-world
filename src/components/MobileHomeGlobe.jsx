import { useEffect, useRef, useState } from 'react';

const FEATURED_COMMUNITY_MARKERS = [
  {
    name: 'Eric Hammond',
    role: 'AWS Hero',
    location: [36.7014631, -118.755997],
    image: 'https://avatars.builderprofile.aws.dev/33vCwXSpdxwSBdTJ8TUDXJ6fAhd.webp',
  },
  {
    name: 'Ahmed Bebars',
    role: 'AWS Hero',
    location: [43.1561681, -75.8449946],
    image: 'https://avatars.builderprofile.aws.dev/2txHZkGOcPLHIJePpB9WYeBQm0A.webp',
  },
  {
    name: 'Evandro Pires',
    role: 'AWS Hero',
    location: [-27.0628367, -51.114965],
    image: 'https://avatars.builderprofile.aws.dev/2rdAqmtWNzU4osBkrPD4YCeNXG5.webp',
  },
  {
    name: 'Johannes Koch',
    role: 'AWS Hero',
    location: [50.6080651, 9.0284647],
    image: 'https://avatars.builderprofile.aws.dev/36KBlzxUDq2hYEnJ9XOXyZ95ksu.webp',
  },
  {
    name: 'Adeline Makokha',
    role: 'AWS Hero',
    location: [1.4419683, 38.4313975],
    image: 'https://avatars.builderprofile.aws.dev/2wgFP8OQQF2IVoiQjgp9sXvvA5u.webp',
  },
  {
    name: 'Bhuvaneswari Subramani',
    role: 'AWS Hero',
    location: [14.9562045, 75.7896741],
    image: 'https://avatars.builderprofile.aws.dev/313RMAfKSMMsye5jT8OnybwA2ES.webp',
  },
  {
    name: 'Steve Teo',
    role: 'AWS Hero',
    location: [1.357107, 103.8194992],
    image: 'https://avatars.builderprofile.aws.dev/2omF42CTAVY7WPOgXj1Hsq0XEcJ.webp',
  },
  {
    name: 'Peter Sbarski',
    role: 'AWS Hero',
    location: [-24.7761086, 134.755],
    image: 'https://avatars.builderprofile.aws.dev/3683uy1NlM1Da5NNhCQpShuXRzX.webp',
  },
];

const COMMUNITY_MARKERS = [
  { location: [37.8, -122.4], size: 0.055 },
  { location: [40.7, -74], size: 0.07 },
  { location: [19.4, -99.1], size: 0.035 },
  { location: [-23.5, -46.6], size: 0.065 },
  { location: [51.5, -0.1], size: 0.045 },
  { location: [50.1, 8.7], size: 0.035 },
  { location: [6.5, 3.4], size: 0.04 },
  { location: [25.2, 55.3], size: 0.045 },
  { location: [12.9, 77.6], size: 0.07 },
  { location: [1.35, 103.8], size: 0.06 },
  { location: [35.7, 139.7], size: 0.055 },
  { location: [-33.9, 151.2], size: 0.05 },
  ...FEATURED_COMMUNITY_MARKERS.map(({ location }) => ({
    location,
    size: 0.052,
    color: [1, 0.58, 0.04],
  })),
];

const EVENT_MARKERS = [
  { location: [47.6, -122.3], size: 0.06 },
  { location: [33.7, -84.4], size: 0.045 },
  { location: [-34.6, -58.4], size: 0.04 },
  { location: [52.5, 13.4], size: 0.055 },
  { location: [48.9, 2.35], size: 0.04 },
  { location: [24.7, 46.7], size: 0.04 },
  { location: [19.1, 72.9], size: 0.065 },
  { location: [1.35, 103.8], size: 0.07 },
  { location: [13.8, 100.5], size: 0.04 },
  { location: [35.7, 139.7], size: 0.055 },
  { location: [-6.2, 106.8], size: 0.04 },
  { location: [-33.9, 151.2], size: 0.05 },
];

const MAX_PIXEL_RATIO = 1.25;
const MAP_SAMPLES = 9000;
const ROTATION_SPEED = 0.0022;
const GLOBE_SCALE = 1.3;
const GLOBE_OFFSET_RATIO = 0.4;
const GLOBE_THETA = 0.16;
const MAX_VISIBLE_LABELS = 2;

function projectMarker([latitude, longitude], phi, width, height) {
  const latitudeRadians = latitude * Math.PI / 180;
  const longitudeRadians = longitude * Math.PI / 180;
  const cosLatitude = Math.cos(latitudeRadians);
  const worldX = cosLatitude * Math.cos(longitudeRadians);
  const worldY = Math.sin(latitudeRadians);
  const worldZ = -cosLatitude * Math.sin(longitudeRadians);
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const cosTheta = Math.cos(GLOBE_THETA);
  const sinTheta = Math.sin(GLOBE_THETA);

  const viewX = worldX * cosPhi + worldZ * sinPhi;
  const viewY = worldX * sinPhi * sinTheta + worldY * cosTheta - worldZ * cosPhi * sinTheta;
  const viewZ = -worldX * sinPhi * cosTheta + worldY * sinTheta + worldZ * cosPhi * cosTheta;
  const radius = GLOBE_SCALE * 0.4 * height;

  return {
    x: width / 2 + viewX * radius,
    y: height / 2 - viewY * radius + GLOBE_SCALE * height * GLOBE_OFFSET_RATIO / 2,
    depth: viewZ,
  };
}

export default function MobileHomeGlobe({ isEvents = false }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const labelRefs = useRef([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return undefined;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const size = { width: 1, height: 1 };
    const cssSize = { width: 1, height: 1 };
    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let phi = -0.35;
    let globe = null;
    let cancelled = false;
    let isIntersecting = true;
    let rendererPaused = false;

    const updateSize = () => {
      cssSize.width = Math.max(1, container.clientWidth);
      cssSize.height = Math.max(1, container.clientHeight);
      size.width = Math.max(1, Math.round(cssSize.width * pixelRatio));
      size.height = Math.max(1, Math.round(cssSize.height * pixelRatio));
    };
    updateSize();

    const positionLabels = () => {
      if (isEvents) return;

      const maxLabelY = cssSize.height < 700
        ? cssSize.height * 0.62
        : cssSize.height * 0.72;
      const projected = FEATURED_COMMUNITY_MARKERS.map((marker, index) => ({
        index,
        ...projectMarker(marker.location, phi, cssSize.width, cssSize.height),
      }));
      const visibleIndexes = new Set(projected
        .filter(({ x, y, depth }) => (
          depth > 0.28 &&
          x > 42 &&
          x < cssSize.width - 42 &&
          y > 110 &&
          y < maxLabelY
        ))
        .sort((first, second) => second.depth - first.depth)
        .slice(0, MAX_VISIBLE_LABELS)
        .map(({ index }) => index));

      projected.forEach(({ index, x, y, depth }) => {
        const label = labelRefs.current[index];
        if (!label) return;
        const visible = visibleIndexes.has(index);
        const markerScale = 0.92 + Math.max(0, depth) * 0.08;
        label.style.opacity = visible ? '1' : '0';
        label.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, calc(-100% - 0.75rem)) scale(${markerScale})`;
      });
    };

    const syncRendererVisibility = () => {
      const shouldPause = document.hidden || !isIntersecting;
      if (!globe || rendererPaused === shouldPause) return;
      rendererPaused = shouldPause;
      globe.toggle();
    };

    const resizeObserver = new ResizeObserver(updateSize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isIntersecting = entry?.isIntersecting ?? true;
      syncRendererVisibility();
    }, { threshold: 0.01 });

    resizeObserver.observe(container);
    intersectionObserver.observe(container);
    document.addEventListener('visibilitychange', syncRendererVisibility);

    import('cobe')
      .then(({ default: createGlobe }) => {
        if (cancelled) return;
        globe = createGlobe(canvas, {
          devicePixelRatio: pixelRatio,
          width: size.width,
          height: size.height,
          phi,
          theta: GLOBE_THETA,
          dark: 1,
          diffuse: 1.1,
          mapSamples: MAP_SAMPLES,
          mapBrightness: 6,
          mapBaseBrightness: 0.11,
          baseColor: [0.08, 0.16, 0.24],
          markerColor: [1, 0.45, 0],
          glowColor: [0.2, 0.56, 0.9],
          scale: GLOBE_SCALE,
          offset: [0, Math.round(size.height * GLOBE_OFFSET_RATIO)],
          markers: isEvents ? EVENT_MARKERS : COMMUNITY_MARKERS,
          opacity: 1,
          onRender: (state) => {
            if (!reducedMotionQuery.matches) phi += ROTATION_SPEED;
            state.width = size.width;
            state.height = size.height;
            state.phi = phi;
            state.theta = GLOBE_THETA;
            state.offset = [0, Math.round(size.height * GLOBE_OFFSET_RATIO)];
            positionLabels();
          },
        });
        syncRendererVisibility();
      })
      .catch((error) => {
        console.warn('Mobile home globe could not start.', error);
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', syncRendererVisibility);
      globe?.destroy();
    };
  }, [isEvents]);

  return (
    <div
      ref={containerRef}
      className={`mobile-home-globe${failed ? ' mobile-home-globe--fallback' : ''}`}
      role="img"
      aria-label={isEvents
        ? 'A rotating globe showing AWS community events around the world'
        : 'A rotating globe showing AWS community members around the world'}
    >
      {!failed && <canvas ref={canvasRef} aria-hidden="true" />}
      {!failed && !isEvents && (
        <div className="mobile-home__marker-layer" aria-hidden="true">
          {FEATURED_COMMUNITY_MARKERS.map((marker, index) => (
            <div
              key={marker.name}
              ref={(element) => { labelRefs.current[index] = element; }}
              className="mobile-home__person-marker"
            >
              <img
                src={marker.image}
                alt=""
                loading="eager"
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
              />
              <span>
                <strong>{marker.name}</strong>
                <small>{marker.role}</small>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
