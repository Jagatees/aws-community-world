import { GLOBE_MODES } from '../config/sections';

export default function HomeSectionCycle({ activeSection, onChange, mobile = false }) {
  const index = Math.max(0, GLOBE_MODES.findIndex((section) => section.id === activeSection));
  const current = GLOBE_MODES[index];
  const next = GLOBE_MODES[(index + 1) % GLOBE_MODES.length];

  return (
    <button
      type="button"
      className={`home-section-trigger ${mobile ? 'mobile-home__headline-mode' : 'section-mode-switch splash-section-switch'}`}
      aria-label={`${current.label} preview. Switch to ${next.label}`}
      title={`Next: ${next.label}`}
      onClick={() => onChange(next.id)}
    >
      {mobile && <span className="mobile-home__click-hint" aria-hidden="true">Tap to switch</span>}
      {current.id === 'events' ? 'Event' : current.label}
    </button>
  );
}
