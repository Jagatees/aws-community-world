import { useRef, useCallback } from 'react';

const IDLE_TIMEOUT_MS = 3000;
const ROTATION_SPEED = 0.15;

export function useAutoRotate(globeRef) {
  const idleTimerRef = useRef(null);
  const isIdleRef = useRef(true);
  const isPausedRef = useRef(false);
  const rafRef = useRef(null);

  const startLoop = useCallback(() => {
    if (!rafRef.current) {
      const tick = () => {
        if (isIdleRef.current && !isPausedRef.current && globeRef.current) {
          const pov = globeRef.current.pointOfView();
          globeRef.current.pointOfView({
            lat: pov.lat,
            lng: pov.lng + ROTATION_SPEED,
            altitude: pov.altitude,
          });
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    }
  }, [globeRef]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const onPointerEvent = useCallback(() => {
    isIdleRef.current = false;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      isIdleRef.current = true;
    }, IDLE_TIMEOUT_MS);
  }, []);

  const pause = useCallback(() => {
    isPausedRef.current = true;
  }, []);

  const resume = useCallback(() => {
    isPausedRef.current = false;
  }, []);

  return { startLoop, stopLoop, onPointerEvent, pause, resume };
}
