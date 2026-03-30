import { useEffect, useRef } from 'react';

const CATEGORY_LABELS = {
  heroes: 'Hero',
  'community-builders': 'Community Builder',
  'user-groups': 'User Group',
  'cloud-clubs': 'Cloud Club',
};

function handleAvatarError(e) {
  e.currentTarget.style.display = 'none';
}

function CommunityBuilderMeta({ member, darkMode, compact = false }) {
  if (member.category !== 'community-builders') {
    return null;
  }

  const mutedColor = darkMode ? '#8B9BAA' : '#5a7a99';
  const accentColor = '#FF9900';
  const className = compact ? 'mt-1 flex flex-col gap-0.5' : 'flex flex-col items-center gap-1 text-center';

  return (
    <div className={className}>
      {member.tag && (
        <p className="text-xs font-semibold" style={{ color: accentColor }}>
          {member.tag}
        </p>
      )}
      {member.specialization && (
        <p className="text-xs" style={{ color: mutedColor }}>
          Specialization: {member.specialization}
        </p>
      )}
    </div>
  );
}

function SingleMemberView({ member, darkMode }) {
  const nameColor = darkMode ? '#FFFFFF' : '#0F1923';
  const mutedColor = darkMode ? '#8B9BAA' : '#5a7a99';
  const isGroup = member.category === 'user-groups' || member.category === 'cloud-clubs';
  const isHero = member.category === 'heroes';
  const label = isGroup ? 'Join' : isHero ? 'View Profile' : 'Follow';
  const url = member.profileUrl || member.joinUrl;

  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      {member.avatarUrl && (
        <img
          src={member.avatarUrl}
          alt={member.name}
          onError={handleAvatarError}
          className="h-16 w-16 rounded-full border-2 object-cover"
          style={{ borderColor: '#FF9900' }}
        />
      )}
      <h2 className="text-center text-lg font-bold leading-tight" style={{ color: nameColor }}>
        {member.name}
      </h2>
      <span
        className="rounded-full px-3 py-1 text-xs font-semibold"
        style={{ backgroundColor: '#FF9900', color: '#0F1923' }}
      >
        {CATEGORY_LABELS[member.category] ?? member.category}
      </span>
      {isHero && member.heroType && (
        <span className="text-xs font-medium" style={{ color: mutedColor }}>
          {member.heroType}
        </span>
      )}
      <CommunityBuilderMeta member={member} darkMode={darkMode} />
      {member.location && (
        <p className="text-sm" style={{ color: mutedColor }}>
          {member.location}
        </p>
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 rounded border px-5 py-1.5 text-sm font-semibold transition-colors"
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
      )}
    </div>
  );
}

function ClusterListView({ members, darkMode }) {
  const nameColor = darkMode ? '#FFFFFF' : '#0F1923';
  const mutedColor = darkMode ? '#8B9BAA' : '#5a7a99';
  const itemBg = darkMode ? '#0F1923' : '#f0f7ff';

  return (
    <div className="flex w-full flex-col gap-1">
      <h2 className="mb-2 text-center text-base font-bold" style={{ color: nameColor }}>
        {members.length} members at this location
      </h2>
      <ul className="flex max-h-[260px] flex-col gap-2 overflow-y-auto pr-1">
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
                className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: nameColor }}>
                {m.name}
              </p>
              {m.heroType && (
                <p className="text-xs font-medium" style={{ color: '#FF9900' }}>
                  {m.heroType}
                </p>
              )}
              <CommunityBuilderMeta member={m} darkMode={darkMode} compact />
              <p className="text-xs" style={{ color: mutedColor }}>
                {m.location}
              </p>
            </div>
            {(m.profileUrl || m.joinUrl) && (
              <a
                href={m.profileUrl || m.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 rounded border px-3 py-1 text-xs font-semibold"
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

export default function ProfileCard({ member, onClose, darkMode }) {
  const cardRef = useRef(null);
  const isCluster = Array.isArray(member);

  const cardBg = darkMode ? 'rgba(27, 40, 54, 0.88)' : 'rgba(255, 255, 255, 0.94)';
  const cardBorder = darkMode ? 'rgba(45, 63, 80, 0.8)' : 'rgba(208, 220, 232, 0.95)';

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
        className="relative w-96 p-5"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: '12px',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          boxShadow: darkMode
            ? '0 24px 60px rgba(0, 0, 0, 0.45)'
            : '0 24px 60px rgba(80, 112, 145, 0.18)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={isCluster ? 'Cluster members' : (member.name ?? 'Member profile')}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-lg leading-none transition-colors"
          style={{ color: '#8B9BAA' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = darkMode ? '#FFFFFF' : '#0F1923';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#8B9BAA';
          }}
          aria-label="Close"
        >
          x
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
