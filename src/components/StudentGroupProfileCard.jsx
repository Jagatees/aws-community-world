import { useMemo, useState } from 'react';
import { useCategory } from '../hooks/useCategory';
import ProfileCard from './ProfileCard';

function Details({ member, onClose, darkMode, onRetry }) {
  const { members, loading, error } = useCategory('cloud-clubs', true);
  const hydrated = useMemo(() => {
    const byId = new Map(members.map(group => [group.id, group]));
    // Keep the spotlight's verified campus coordinates, while restoring all
    // leader profiles and links from the original dataset.
    const resolve = group => ({ ...group, ...byId.get(group.id), lat: group.lat, lng: group.lng });
    return Array.isArray(member) ? member.map(resolve) : resolve(member);
  }, [member, members]);

  if (loading || error) return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') {
        const buttons = [...event.currentTarget.querySelectorAll('button')];
        const index = buttons.indexOf(document.activeElement);
        event.preventDefault();
        buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
      }
    }}>
      <div role="dialog" aria-modal="true" aria-label="Student group details" className="rounded-2xl p-6 shadow-xl" style={{ background: darkMode ? '#0F1923' : '#FFFFFF', color: darkMode ? '#FFFFFF' : '#0F1923' }}>
        <p role={error ? 'alert' : 'status'}>{error ? 'Could not load group details. Please try again.' : 'Loading group details…'}</p>
        <div className="mt-4 flex gap-4">
          {error && <button type="button" onClick={onRetry} className="rounded-lg bg-orange-500 px-4 py-2">Try again</button>}
          <button type="button" autoFocus onClick={onClose} className="rounded-lg border px-4 py-2">Close</button>
        </div>
      </div>
    </div>
  );
  return <ProfileCard member={hydrated} onClose={onClose} darkMode={darkMode} />;
}

export default function StudentGroupProfileCard(props) {
  const [attempt, setAttempt] = useState(0);
  return <Details key={attempt} {...props} onRetry={() => setAttempt(value => value + 1)} />;
}
