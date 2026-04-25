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

function getPrimaryLeader(member) {
  return Array.isArray(member.ledBy) ? member.ledBy.find((leader) => leader?.name || leader?.imageUrl) ?? null : null;
}

function getLeaderNames(member) {
  return Array.isArray(member.ledBy)
    ? member.ledBy.map((leader) => leader?.name).filter(Boolean)
    : [];
}

function getLeaderImages(member) {
  return Array.isArray(member.ledBy)
    ? member.ledBy.map((leader) => leader?.imageUrl).filter(Boolean)
    : [];
}

function LeaderAvatarStack({ member, fallbackName, fallbackImageUrl, size = 'md' }) {
  const leaderImages = getLeaderImages(member).slice(0, 2);
  const avatarSizeClass = size === 'sm' ? 'h-10 w-10' : 'h-12 w-12';
  const overlapClass = size === 'sm' ? '-ml-3' : '-ml-4';

  if (leaderImages.length >= 2) {
    return (
      <div className="flex flex-shrink-0 items-center">
        {leaderImages.map((imageUrl, index) => (
          <img
            key={`${imageUrl}-${index}`}
            src={imageUrl}
            alt={getLeaderNames(member)[index] || fallbackName}
            onError={handleAvatarError}
            className={`${avatarSizeClass} ${index > 0 ? overlapClass : ''} rounded-full object-cover`}
            style={{ border: '2px solid #FF9900', backgroundColor: '#0F1923', zIndex: leaderImages.length - index }}
          />
        ))}
      </div>
    );
  }

  const imageUrl = leaderImages[0] || fallbackImageUrl;
  if (!imageUrl) {
    return null;
  }

  return (
    <img
      src={imageUrl}
      alt={getPrimaryLeader(member)?.name || fallbackName}
      onError={handleAvatarError}
      className={`${avatarSizeClass} flex-shrink-0 rounded-full object-cover`}
      style={{ border: '2px solid #FF9900' }}
    />
  );
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

function LedByMeta({ member, darkMode, compact = false }) {
  const leaders = Array.isArray(member.ledBy) ? member.ledBy.filter((leader) => leader?.name || leader?.imageUrl) : [];
  if (!leaders.length) {
    return null;
  }

  const labelColor = darkMode ? '#DCE7F0' : '#17324B';
  const cardBg = darkMode ? 'rgba(15, 25, 35, 0.55)' : 'rgba(240, 247, 255, 0.9)';
  const borderColor = darkMode ? 'rgba(62, 95, 123, 0.42)' : 'rgba(150, 179, 205, 0.55)';
  const wrapperClassName = compact ? 'mt-1 flex flex-col gap-1.5' : 'flex w-full flex-col gap-2 text-left';
  const avatarSize = compact ? 'h-7 w-7' : 'h-9 w-9';

  return (
    <div className={wrapperClassName}>
      {leaders.map((leader, index) => (
        <div
          key={`${leader.name || 'leader'}-${index}`}
          className="flex items-start gap-2 rounded-lg px-2 py-2"
          style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
        >
          {leader.imageUrl ? (
            <img
              src={leader.imageUrl}
              alt={leader.name || 'Cloud Club leader'}
              onError={handleAvatarError}
              className={`${avatarSize} flex-shrink-0 rounded-full object-cover`}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            {leader.name ? (
              <p className={compact ? 'text-xs font-semibold' : 'text-sm font-semibold'} style={{ color: labelColor }}>
                {leader.name}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function CloudClubSingleView({ member, darkMode, url }) {
  const nameColor = darkMode ? '#FFFFFF' : '#0F1923';
  const mutedColor = darkMode ? '#8B9BAA' : '#5a7a99';
  const leaderColor = '#FF9900';
  const leaderNames = getLeaderNames(member);
  const cardBg = darkMode ? 'rgba(15, 25, 35, 0.55)' : 'rgba(240, 247, 255, 0.9)';
  const borderColor = darkMode ? 'rgba(62, 95, 123, 0.42)' : 'rgba(150, 179, 205, 0.55)';

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div
        className="flex items-start gap-3 rounded-xl p-3"
        style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
      >
        <LeaderAvatarStack member={member} fallbackName={member.name} fallbackImageUrl={member.avatarUrl} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold leading-tight" style={{ color: nameColor }}>
            {member.name}
          </h2>
          {leaderNames.length > 0 && (
            <p className="mt-1 text-sm font-semibold" style={{ color: leaderColor }}>
              Led by {leaderNames.join(', ')}
            </p>
          )}
          {member.location && (
            <p className="mt-0.5 text-sm" style={{ color: mutedColor }}>
              {member.location}
            </p>
          )}
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 rounded border px-4 py-1.5 text-sm font-semibold transition-colors"
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
            Join
          </a>
        )}
      </div>
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

  if (member.category === 'cloud-clubs') {
    return <CloudClubSingleView member={member} darkMode={darkMode} url={url} />;
  }

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
      <LedByMeta member={member} darkMode={darkMode} />
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
            <LeaderAvatarStack member={m} fallbackName={m.name} fallbackImageUrl={m.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: nameColor }}>
                {m.name}
              </p>
              {m.category === 'cloud-clubs' && getLeaderNames(m).length > 0 && (
                <p className="text-xs font-medium" style={{ color: '#FF9900' }}>
                  Led by {getLeaderNames(m).join(', ')}
                </p>
              )}
              {m.heroType && (
                <p className="text-xs font-medium" style={{ color: '#FF9900' }}>
                  {m.heroType}
                </p>
              )}
              <CommunityBuilderMeta member={m} darkMode={darkMode} compact />
              {m.category !== 'cloud-clubs' && <LedByMeta member={m} darkMode={darkMode} compact />}
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
      style={{
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 2000,
        animation: 'backdrop-in 0.2s ease both',
      }}
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
          animation: 'modal-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both',
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
