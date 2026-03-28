import { useRef, useCallback } from 'react';

const IDLE_TIMEOUT_MS = 3000;
const ROTATION_SPEED = 0.15; // degrees per frame

/**
 * Provides auto-rotation logic for a globe.gl instance.
 * Returns handlers to attach to the globe container and a startRotation function.
 *
 * @param {React.RefObject<any>} globeRef - ref to the globe.gl instance
 * @returns {{ onPointerEvent: () => void }}
 */
export function useAutoRotate(globeRef) {
  const idleTimerRef = useRef(null);
  const isIdleRef = useRef(true);
  const rafRef = useRef(null);

  const rotate = useCallback(() => {
    if (isIdleRef.current && globeRef.current) {
      const pov = globeRef.current.pointOfView();
      globeRef.current.pointOfView({ lat: pov.lat, lng: pov.lng + ROTATION_SPEED, altitude: pov.altitude });
    }
    rafRef.current = requestAnimationFrame(rotate);
  }, [globeRef]);

  const startLoop = useCallback(() => {
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(rotate);
    }
  }, [rotate]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const onPointerEvent = useCallback(() => {
    // Pause rotation on interaction
    isIdleRef.current = false;

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // Resume after idle timeout
    idleTimerRef.current = setTimeout(() => {
      isIdleRef.current = true;
    }, IDLE_TIMEOUT_MS);
  }, []);

  return { startLoop, stopLoop, onPointerEvent };
}
