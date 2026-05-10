import { useEffect, useRef, useState } from 'react';

const ANIMATIONS = [
  'working',
  'done',
  'waiting',
  'idle',
  'error',
];

export default function KiroAvatarOverlay() {
  const [animationIndex, setAnimationIndex] = useState(0);
  const orbitRef = useRef(null);
  const animationName = ANIMATIONS[animationIndex];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setAnimationIndex((current) => (current + 1) % ANIMATIONS.length);
    }, 3200);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const orbit = orbitRef.current;
    if (!orbit) return;

    const maxOffset = 95;
    const repelRadius = 190;

    function setOffset(x, y) {
      orbit.style.setProperty('--kiro-repel-x', `${x}px`);
      orbit.style.setProperty('--kiro-repel-y', `${y}px`);
    }

    function handlePointerMove(event) {
      const rect = orbit.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = centerX - event.clientX;
      const dy = centerY - event.clientY;
      const distance = Math.hypot(dx, dy);

      if (distance > repelRadius || distance === 0) {
        setOffset(0, 0);
        return;
      }

      const force = Math.pow((repelRadius - distance) / repelRadius, 1.35);
      const offset = Math.min(maxOffset, maxOffset * force);
      setOffset((dx / distance) * offset, (dy / distance) * offset);
    }

    function handlePointerLeave() {
      setOffset(0, 0);
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  return (
    <div className="kiro-avatar-overlay" aria-hidden="true">
      <div ref={orbitRef} className="kiro-avatar-orbit">
        <span
          key={animationName}
          className="kiro-avatar-sprite"
          style={{ backgroundImage: `url('/kiro/kiro-${animationName}-strip.png')` }}
        />
      </div>
    </div>
  );
}
