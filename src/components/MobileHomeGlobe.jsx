import { useEffect, useRef, useState } from 'react';

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

export default function MobileHomeGlobe({ isEvents = false }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return undefined;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const size = { width: 1, height: 1 };
    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let phi = -0.35;
    let globe = null;
    let cancelled = false;
    let isIntersecting = true;
    let rendererPaused = false;

    const updateSize = () => {
      size.width = Math.max(1, Math.round(container.clientWidth * pixelRatio));
      size.height = Math.max(1, Math.round(container.clientHeight * pixelRatio));
    };
    updateSize();

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
          theta: 0.16,
          dark: 1,
          diffuse: 1.1,
          mapSamples: MAP_SAMPLES,
          mapBrightness: 6,
          mapBaseBrightness: 0.11,
          baseColor: [0.08, 0.16, 0.24],
          markerColor: [1, 0.45, 0],
          glowColor: [0.2, 0.56, 0.9],
          scale: 1.75,
          offset: [0, Math.round(size.height * 0.15)],
          markers: isEvents ? EVENT_MARKERS : COMMUNITY_MARKERS,
          opacity: 1,
          onRender: (state) => {
            if (!reducedMotionQuery.matches) phi += ROTATION_SPEED;
            state.width = size.width;
            state.height = size.height;
            state.phi = phi;
            state.theta = 0.16;
            state.offset = [0, Math.round(size.height * 0.15)];
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
    </div>
  );
}
