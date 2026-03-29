import { useEffect, useRef } from 'react';

/** Category label map for the badge */
const CATEGORY_LABELS = {
  'heroes': 'Hero',
  'community-builders': 'Community Builder',
  'user-groups': 'User Group',
  'cloud-clubs': 'Cloud Club',
};

/**
 * Hide avatar entirely if it fails to load
 * @param {React.SyntheticEvent<HTMLImageElement>} e
 */
function handleAvatarError(e) {
  e.currentTarget.style.display = 'none';
}

/**
 * Single member card body
 * @param {{ member: import('../types.js').Member, darkMode: boolean }} props
 */
function SingleMemberView({ member, darkMode }) {
  const nameColor = darkMode ? '#FFFFFF' : '#0F1923';
  const mutedColor = darkMode ? '#8B9BAA' : '#5a7a99';
  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      {member.avatarUrl && (
        <img
          src={member.avatarUrl}
          alt={member.name}
          onError={handleAvatarError}
          className="w-16 h-16 rounded-full object-cover border-2"
          style={{ borderColor: '#FF9900' }}
        />
      )}
      <h2 className="text-lg font-bold text-center leading-tight" style={{ color: nameColor }}>
        {member.name}
      </h2>
      <span
        className="text-xs font-semibold px-3 py-1 rounded-full"
        style={{ backgroundColor: '#FF9900', color: '#0F1923' }}
      >
        {CATEGORY_LABELS[member.category] ?? member.category}
      </span>
      <p className="text-sm" style={{ color: mutedColor }}>
        📍 {member.location}
      </p>
      {(() => {
        const isGroup = member.category === 'user-groups' || member.category === 'cloud-clubs';
        const label = isGroup ? 'Join' : 'Follow';
        const url = member.profileUrl || member.joinUrl;
        return url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 px-5 py-1.5 rounded text-sm font-semibold border transition-colors"
            style={{ borderColor: '#FF9900', color: '#FF9900' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FF9900';
              e.currentTarget.style.color = '#0F1923';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#FF9900';
            }}
          >
            {label}
          </a>
        ) : null;
      })()}
    </div>
  );
}

/**
 * Cluster list view
 * @param {{ members: import('../types.js').Member[], darkMode: boolean }} props
 */
function ClusterListView({ members, darkMode }) {
  const nameColor = darkMode ? '#FFFFFF' : '#0F1923';
  const mutedColor = darkMode ? '#8B9BAA' : '#5a7a99';
  const itemBg = darkMode ? '#0F1923' : '#f0f7ff';
  return (
    <div className="flex flex-col gap-1 w-full">
      <h2 className="text-base font-bold mb-2 text-center" style={{ color: nameColor }}>
        {members.length} members at this location
      </h2>
      <ul className="overflow-y-auto flex flex-col gap-2 pr-1" style={{ maxHeight: '260px' }}>
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-3 rounded-lg p-2"
            style={{ backgroundColor: itemBg }}
          >
            {m.avatarUrl && (
              <img
                src={m.avatarUrl}
                alt={m.name}
                onError={handleAvatarError}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" style={{ color: nameColor }}>{m.name}</p>
              <p className="text-xs truncate" style={{ color: mutedColor }}>{m.location}</p>
            </div>
            {(m.profileUrl || m.joinUrl) && (
              <a
                href={m.profileUrl || m.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold px-3 py-1 rounded border flex-shrink-0"
                style={{ borderColor: '#FF9900', color: '#FF9900' }}
              >
                {m.category === 'user-groups' || m.category === 'cloud-clubs' ? 'Join' : 'Follow'}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * ProfileCard — overlay card for a clicked marker (Req 5.1–5.5, 7.5)
 *
 * @param {{
 *   member: import('../types.js').Member | import('../types.js').Member[],
 *   onClose: () => void,
 *   darkMode: boolean
 * }} props
 */
export default function ProfileCard({ member, onClose, darkMode }) {
  const cardRef = useRef(null);
  const isCluster = Array.isArray(member);

  const cardBg = darkMode ? '#1B2836' : '#ffffff';
  const cardBorder = darkMode ? '#2D3F50' : '#d0dce8';

  // Close on outside click (Req 5.4)
  useEffect(() => {
    function handleOutsideClick(e) {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
    >
      <div
        ref={cardRef}
        className="relative p-5 w-72"
        style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '12px' }}
        role="dialog"
        aria-modal="true"
        aria-label={isCluster ? 'Cluster members' : (member.name ?? 'Member profile')}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-lg leading-none transition-colors"
          style={{ color: '#8B9BAA' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = darkMode ? '#FFFFFF' : '#0F1923')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#8B9BAA')}
          aria-label="Close"
        >
          ×
        </button>

        {isCluster ? (
          <ClusterListView members={member} darkMode={darkMode} />
        ) : (
          <SingleMemberView member={member} darkMode={darkMode} />
        )}
      </div>
    </div>
  );
}
