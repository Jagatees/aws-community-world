import { useRef, useCallback, useEffect } from 'react';

const IDLE_TIMEOUT_MS = 3000;
const ROTATION_DEGREES_PER_SECOND = 9;
const ROTATION_INTERVAL_MS = 1000 / 30;

export function useAutoRotate(globeRef) {
  const idleTimerRef = useRef(null);
  const isIdleRef = useRef(true);
  const isPausedRef = useRef(false);
  const rafRef = useRef(null);
  const runningRef = useRef(false);
  const reducedMotionRef = useRef(false);

  const cancelFrame = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const scheduleLoop = useCallback(() => {
    if (rafRef.current !== null || !runningRef.current || !isIdleRef.current
      || isPausedRef.current || reducedMotionRef.current || document.hidden) return;
    let previousTime = null;
    const tick = (time) => {
      if (previousTime === null) previousTime = time;
      const elapsed = time - previousTime;
      if (elapsed >= ROTATION_INTERVAL_MS) {
        previousTime = time;
        if (globeRef.current) {
          const pov = globeRef.current.pointOfView();
          globeRef.current.pointOfView({
            lat: pov.lat,
            lng: pov.lng + ROTATION_DEGREES_PER_SECOND * Math.min(elapsed, 100) / 1000,
            altitude: pov.altitude,
          });
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [globeRef]);

  const startLoop = useCallback(() => {
    runningRef.current = true;
    scheduleLoop();
  }, [scheduleLoop]);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    cancelFrame();
  }, [cancelFrame]);

  const onPointerEvent = useCallback(() => {
    isIdleRef.current = false;
    cancelFrame();
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      isIdleRef.current = true;
      scheduleLoop();
    }, IDLE_TIMEOUT_MS);
  }, [cancelFrame, scheduleLoop]);

  const pause = useCallback(() => {
    isPausedRef.current = true;
    cancelFrame();
  }, [cancelFrame]);

  const resume = useCallback(() => {
    isPausedRef.current = false;
    scheduleLoop();
  }, [scheduleLoop]);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reducedMotionRef.current = motion.matches;
      cancelFrame();
      scheduleLoop();
    };
    update();
    motion.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      motion.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      clearTimeout(idleTimerRef.current);
      cancelFrame();
    };
  }, [cancelFrame, scheduleLoop]);

  return { startLoop, stopLoop, onPointerEvent, pause, resume };
}
