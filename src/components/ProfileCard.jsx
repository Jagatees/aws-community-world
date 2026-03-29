import { useEffect, useRef } from 'react';

/** Category label map for the badge */
const CATEGORY_LABELS = {
  'heroes': 'Hero',
  'community-builders': 'Community Builder',
  'user-groups': 'User Group',
  'cloud-clubs': 'Cloud Club',
};

/**
 * Fallback avatar when image fails to load (Req 5.2 / error handling)
 * @param {React.SyntheticEvent<HTMLImageElement>} e
 */
function handleAvatarError(e) {
  e.currentTarget.src =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%232D3F50'/%3E%3Ccircle cx='32' cy='26' r='12' fill='%238B9BAA'/%3E%3Cellipse cx='32' cy='54' rx='20' ry='14' fill='%238B9BAA'/%3E%3C/svg%3E";
}

/**
 * Single member card body (Req 5.1, 5.2, 5.3)
 * @param {{ member: import('../types.js').Member }} props
 */
function SingleMemberView({ member }) {
  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      {/* Avatar */}
      <img
        src={member.avatarUrl}
        alt={member.name}
        onError={handleAvatarError}
        className="w-16 h-16 rounded-full object-cover border-2"
        style={{ borderColor: '#FF9900' }}
      />

      {/* Name */}
      <h2 className="text-white text-lg font-bold text-center leading-tight">
        {member.name}
      </h2>

      {/* Category badge */}
      <span
        className="text-xs font-semibold px-3 py-1 rounded-full"
        style={{ backgroundColor: '#FF9900', color: '#0F1923' }}
      >
        {CATEGORY_LABELS[member.category] ?? member.category}
      </span>

      {/* Location */}
      <p className="text-sm" style={{ color: '#8B9BAA' }}>
        📍 {member.location}
      </p>

      {/* CTA button — "Join" for groups/clubs, "Follow" for people */}
      {(() => {
        const isGroup = member.category === 'user-groups' || member.category === 'cloud-clubs';
        const label = isGroup ? 'Join' : 'Follow';
        const url = member.profileUrl || member.joinUrl;
        const btnStyle = {
          borderColor: '#FF9900',
          color: '#FF9900',
        };
        return url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 px-5 py-1.5 rounded text-sm font-semibold border transition-colors"
            style={btnStyle}
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
 * Cluster list view — shown when multiple members share a location (Req 5.5)
 * @param {{ members: import('../types.js').Member[] }} props
 */
function ClusterListView({ members }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <h2 className="text-white text-base font-bold mb-2 text-center">
        {members.length} members at this location
      </h2>
      <ul
        className="overflow-y-auto flex flex-col gap-2 pr-1"
        style={{ maxHeight: '260px' }}
      >
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-3 rounded-lg p-2"
            style={{ backgroundColor: '#0F1923' }}
          >
            <img
              src={m.avatarUrl}
              alt={m.name}
              onError={handleAvatarError}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold truncate">{m.name}</p>
              <p className="text-xs truncate" style={{ color: '#8B9BAA' }}>
                {m.location}
              </p>
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
 *   onClose: () => void
 * }} props
 */
export default function ProfileCard({ member, onClose }) {
  const cardRef = useRef(null);
  const isCluster = Array.isArray(member);

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
    /* Full-screen overlay backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
    >
      {/* Card */}
      <div
        ref={cardRef}
        className="relative p-5 w-72"
        style={{
          backgroundColor: '#1B2836',
          border: '1px solid #2D3F50',
          borderRadius: '12px',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={isCluster ? 'Cluster members' : (member.name ?? 'Member profile')}
      >
        {/* Close button (Req 5.4) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-lg leading-none transition-colors"
          style={{ color: '#8B9BAA' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#8B9BAA')}
          aria-label="Close"
        >
          ×
        </button>

        {isCluster ? (
          <ClusterListView members={member} />
        ) : (
          <SingleMemberView member={member} />
        )}
      </div>
    </div>
  );
}
