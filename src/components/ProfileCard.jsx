import { useEffect, useRef, useState } from 'react';

const CATEGORY_LABELS = {
  heroes: 'Hero',
  'community-builders': 'Community Builder',
  'user-groups': 'User Group',
  'cloud-clubs': 'Student Builder Group',
  'kiro-ambassadors': 'Kiro Ambassador',
  'aws-ambassadors': 'AWS Ambassador',
  'kiro-events': 'Kiro Event',
};

const SOCIAL_LINK_META = [
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'github', label: 'GitHub' },
  { key: 'x', label: 'X' },
  { key: 'devto', label: 'DEV' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'repost', label: 'AWS re:Post' },
  { key: 'blog', label: 'Blog' },
  { key: 'website', label: 'Website' },
];

function SocialIcon({ type }) {
  const commonProps = {
    'aria-hidden': true,
    className: 'h-4 w-4',
    fill: 'none',
    viewBox: '0 0 24 24',
  };

  switch (type) {
    case 'linkedin':
      return (
        <svg {...commonProps} fill="currentColor">
          <path d="M5.2 8.3H2.4V21h2.8V8.3ZM3.8 2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6ZM8.2 8.3H11V10h.1c.4-.8 1.4-2.1 4.1-2.1 4.4 0 5.2 2.8 5.2 6.6V21h-2.9v-5.8c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1V21H8.2V8.3Z" />
        </svg>
      );
    case 'github':
      return (
        <svg {...commonProps} fill="currentColor">
          <path fillRule="evenodd" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 2.9.9.1-.7.4-1.1.7-1.4-2.3-.3-4.7-1.1-4.7-5A3.9 3.9 0 0 1 6.7 8.6c-.1-.3-.5-1.3.1-2.8 0 0 .9-.3 2.8 1.1a9.7 9.7 0 0 1 5.1 0c1.9-1.3 2.8-1.1 2.8-1.1.6 1.5.2 2.5.1 2.8a3.9 3.9 0 0 1 1.1 2.7c0 3.9-2.4 4.7-4.7 5 .4.3.7 1 .7 2V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" clipRule="evenodd" />
        </svg>
      );
    case 'x':
      return (
        <svg {...commonProps} fill="currentColor">
          <path d="M18.6 3h3.1l-6.8 7.8L23 21h-6.4l-5-6.6L5.8 21H2.7l7.4-8.5L2.3 3h6.6l4.5 5.9L18.6 3Zm-1.1 16h1.7L8 4.9H6.2L17.5 19Z" />
        </svg>
      );
    case 'devto':
      return (
        <svg {...commonProps} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          <path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...commonProps} fill="currentColor">
          <path d="M22.5 7.1a2.8 2.8 0 0 0-2-2C18.7 4.6 12 4.6 12 4.6s-6.7 0-8.5.5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1 12a29 29 0 0 0 .5 4.9 2.8 2.8 0 0 0 2 2c1.8.5 8.5.5 8.5.5s6.7 0 8.5-.5a2.8 2.8 0 0 0 2-2A29 29 0 0 0 23 12a29 29 0 0 0-.5-4.9ZM9.8 15.4V8.6l5.8 3.4-5.8 3.4Z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg {...commonProps} fill="currentColor">
          <path d="M13.8 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5H17V3.6c-.8-.1-1.6-.2-2.4-.2-2.4 0-4.1 1.5-4.1 4.2v2.3H7.8V13h2.7v8h3.3Z" />
        </svg>
      );
    case 'repost':
      return (
        <svg {...commonProps} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          <path d="M17 3.5 20.5 7 17 10.5M3.5 11V9a2 2 0 0 1 2-2h15M7 20.5 3.5 17 7 13.5M20.5 13v2a2 2 0 0 1-2 2h-15" />
        </svg>
      );
    case 'blog':
      return (
        <svg {...commonProps} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          <path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M14 3v5h5M8 13h8M8 17h6" />
        </svg>
      );
    default:
      return (
        <svg {...commonProps} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18" />
        </svg>
      );
  }
}

function LoadingSpinner({ size = 16 }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '999px',
        border: '2px solid rgba(255, 153, 0, 0.24)',
        borderTopColor: '#FF9900',
        animation: 'aws-spinner 0.75s linear infinite',
      }}
    />
  );
}

function LoadingAvatarImage({ src, alt, className, style, wrapperClassName = '', spinnerSize = 16 }) {
  if (!src) return null;

  return (
    <LoadingAvatarImageContent
      key={src}
      src={src}
      alt={alt}
      className={className}
      style={style}
      wrapperClassName={wrapperClassName}
      spinnerSize={spinnerSize}
    />
  );
}

function LoadingAvatarImageContent({ src, alt, className, style, wrapperClassName = '', spinnerSize = 16 }) {
  const [loading, setLoading] = useState(Boolean(src));
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <span
      className={`relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full ${wrapperClassName}`}
      style={{
        backgroundColor: '#0F1923',
        ...style,
      }}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size={spinnerSize} />
        </span>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoading(false)}
        onError={() => {
          setFailed(true);
          setLoading(false);
        }}
        className={className}
        style={{
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.18s ease',
        }}
      />
    </span>
  );
}

function NewMemberBadge({ compact = false }) {
  return (
    <span
      title="New community builder"
      className={`inline-flex items-center justify-center rounded-full font-black leading-none ${compact ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-1 text-[10px]'}`}
      style={{
        backgroundColor: '#FF9900',
        color: '#0F1923',
        letterSpacing: '0.04em',
      }}
    >
      NEW
    </span>
  );
}

function SocialLinks({ socialLinks, darkMode, compact = false }) {
  const links = SOCIAL_LINK_META
    .map((meta) => ({ ...meta, url: socialLinks?.[meta.key] }))
    .filter((link) => link.url);

  if (!links.length) return null;

  const borderColor = darkMode ? 'rgba(139, 155, 170, 0.42)' : 'rgba(90, 122, 153, 0.38)';
  const textColor = darkMode ? '#DCE7F0' : '#17324B';
  const backgroundColor = darkMode ? 'rgba(15, 25, 35, 0.48)' : 'rgba(240, 247, 255, 0.82)';

  return (
    <div
      className={compact ? 'mt-2 flex flex-wrap gap-1' : 'flex max-w-sm flex-wrap justify-center gap-2'}
      aria-label="Public social links"
    >
      {links.map((link) => (
        <a
          key={link.key}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          title={link.label}
          aria-label={`Open ${link.label} for this member`}
          className={`inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${compact ? 'h-7 w-7' : 'h-9 w-9'}`}
          style={{
            border: `1px solid ${borderColor}`,
            color: textColor,
            backgroundColor,
            outlineColor: '#FF9900',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.borderColor = '#FF9900';
            event.currentTarget.style.color = '#FF9900';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.borderColor = borderColor;
            event.currentTarget.style.color = textColor;
          }}
        >
          <SocialIcon type={link.key} />
        </a>
      ))}
    </div>
  );
}

function StudentLeaderSocialLinks({ member, darkMode, compact = false }) {
  const leaders = Array.isArray(member.ledBy)
    ? member.ledBy.filter((leader) => leader?.socialLinks && Object.keys(leader.socialLinks).length > 0)
    : [];

  if (!leaders.length) return null;

  const nameColor = darkMode ? '#DCE7F0' : '#17324B';
  const cardBg = darkMode ? 'rgba(15, 25, 35, 0.45)' : 'rgba(240, 247, 255, 0.82)';
  const borderColor = darkMode ? 'rgba(62, 95, 123, 0.36)' : 'rgba(150, 179, 205, 0.48)';

  return (
    <div className={compact ? 'mt-2 flex flex-col gap-1.5' : 'flex flex-col gap-2'}>
      {leaders.map((leader, index) => (
        <div
          key={leader.profileUrl || `${leader.name || 'leader'}-${index}`}
          className={compact ? 'rounded-lg px-2 py-1.5' : 'rounded-xl px-3 py-2.5'}
          style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
        >
          <p className={compact ? 'text-[11px] font-semibold' : 'text-xs font-semibold'} style={{ color: nameColor }}>
            {leader.name || 'Student Builder Group leader'}
          </p>
          <SocialLinks socialLinks={leader.socialLinks} darkMode={darkMode} compact />
        </div>
      ))}
    </div>
  );
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
          <LoadingAvatarImage
            key={`${imageUrl}-${index}`}
            src={imageUrl}
            alt={getLeaderNames(member)[index] || fallbackName}
            className={`${avatarSizeClass} rounded-full object-cover`}
            wrapperClassName={index > 0 ? overlapClass : ''}
            style={{ border: '2px solid #FF9900', zIndex: leaderImages.length - index }}
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
    <LoadingAvatarImage
      src={imageUrl}
      alt={getPrimaryLeader(member)?.name || fallbackName}
      className={`${avatarSizeClass} rounded-full object-cover`}
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
            <LoadingAvatarImage
              src={leader.imageUrl}
              alt={leader.name || 'Student Builder Group leader'}
              className={`${avatarSize} rounded-full object-cover`}
              spinnerSize={14}
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
      <StudentLeaderSocialLinks member={member} darkMode={darkMode} />
    </div>
  );
}

function SingleMemberView({ member, darkMode }) {
  const nameColor = darkMode ? '#FFFFFF' : '#0F1923';
  const mutedColor = darkMode ? '#8B9BAA' : '#5a7a99';
  const isGroup = member.category === 'user-groups' || member.category === 'cloud-clubs';
  const isEvent = member.category === 'kiro-events';
  const isHero = member.category === 'heroes';
  const label = isEvent ? (member.ctaLabel || 'Join Event') : isGroup ? 'Join' : isHero ? 'View Profile' : 'Follow';
  const url = member.profileUrl || member.joinUrl;

  if (member.category === 'cloud-clubs') {
    return <CloudClubSingleView member={member} darkMode={darkMode} url={url} />;
  }

  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      {member.avatarUrl && (
        <LoadingAvatarImage
          src={member.avatarUrl}
          alt={member.name}
          className="h-16 w-16 rounded-full object-cover"
          style={{ border: '2px solid #FF9900' }}
          spinnerSize={18}
        />
      )}
      <h2 className="text-center text-lg font-bold leading-tight" style={{ color: nameColor }}>
        {member.name}
      </h2>
      {member.isNew && <NewMemberBadge />}
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
      {isEvent && member.eventDate && (
        <p className="text-sm font-semibold" style={{ color: '#FF9900' }}>
          {member.eventDate}
        </p>
      )}
      {member.location && (
        <p className="text-sm" style={{ color: mutedColor }}>
          {member.location}
        </p>
      )}
      <SocialLinks socialLinks={member.socialLinks} darkMode={darkMode} />
      {isEvent && member.description && (
        <p className="max-w-sm text-center text-sm leading-6" style={{ color: mutedColor }}>
          {member.description}
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
    <div className="flex w-full min-w-0 flex-col gap-1 overflow-hidden">
      <h2 className="mb-2 text-center text-base font-bold" style={{ color: nameColor }}>
        {members.length} members at this location
      </h2>
      <ul className="flex max-h-[360px] flex-col gap-2 overflow-y-auto overflow-x-hidden pr-1">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-start gap-3 rounded-lg p-3"
            style={{ backgroundColor: itemBg }}
          >
            <LeaderAvatarStack member={m} fallbackName={m.name} fallbackImageUrl={m.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight" style={{ color: nameColor }}>
                <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="min-w-0 break-words">{m.name}</span>
                  {m.isNew && <NewMemberBadge compact />}
                </span>
              </p>
              {m.category === 'cloud-clubs' && getLeaderNames(m).length > 0 && (
                <p className="text-xs font-medium" style={{ color: '#FF9900' }}>
                  Led by {getLeaderNames(m).join(', ')}
                </p>
              )}
              {m.category === 'cloud-clubs' && (
                <StudentLeaderSocialLinks member={m} darkMode={darkMode} compact />
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
              <SocialLinks socialLinks={m.socialLinks} darkMode={darkMode} compact />
            </div>
            {(m.profileUrl || m.joinUrl) && (
              <a
                href={m.profileUrl || m.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex-shrink-0 rounded border px-3 py-1 text-xs font-semibold"
                style={{ borderColor: '#FF9900', color: '#FF9900' }}
              >
                {m.category === 'kiro-events' ? (m.ctaLabel || 'Join Event') : m.category === 'user-groups' || m.category === 'cloud-clubs' ? 'Join' : 'Follow'}
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

    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
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
        className="relative w-[min(92vw,540px)] p-5"
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
