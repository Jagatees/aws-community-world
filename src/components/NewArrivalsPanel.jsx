import { useState } from 'react';
import { MapPinIcon, SparkleIcon, XIcon } from '@phosphor-icons/react';
import {
  getMemberBadgeLabel,
  getMemberCountryFlagUrl,
  getMemberImage,
} from '../utils/memberMarkers';

const CATEGORY_LABELS = {
  heroes: 'AWS Heroes',
  'community-builders': 'Community Builders',
  'user-groups': 'User Groups',
  'cloud-clubs': 'Student Builder Groups',
};

function ArrivalAvatar({ member, darkMode }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = member.category === 'user-groups'
    ? getMemberCountryFlagUrl(member)
    : getMemberImage(member);
  const showImage = imageUrl && !failed;

  return (
    <span
      className="new-arrivals-avatar"
      style={{
        background: darkMode ? '#122333' : '#E8F1F8',
        borderColor: darkMode ? 'rgba(255, 153, 0, 0.42)' : 'rgba(183, 106, 0, 0.34)',
        color: darkMode ? '#FFFFFF' : '#17324B',
      }}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt=""
          onError={() => setFailed(true)}
          className={member.category === 'user-groups' ? 'new-arrivals-flag' : ''}
        />
      ) : getMemberBadgeLabel(member)}
    </span>
  );
}

export default function NewArrivalsPanel({
  category,
  members,
  loading,
  darkMode,
  onClose,
  onLocate,
  onSelect,
}) {
  const surface = darkMode ? 'rgba(8, 18, 28, 0.96)' : 'rgba(248, 252, 255, 0.97)';
  const border = darkMode ? 'rgba(104, 137, 164, 0.44)' : 'rgba(143, 173, 200, 0.65)';
  const text = darkMode ? '#FFFFFF' : '#0F1923';
  const muted = darkMode ? '#8B9BAA' : '#5A7895';

  return (
    <aside
      className="new-arrivals-panel"
      style={{ background: surface, borderColor: border, color: text }}
      role="region"
      aria-label={`New ${CATEGORY_LABELS[category] ?? 'community members'}`}
    >
      <header className="new-arrivals-header">
        <div className="new-arrivals-heading-icon" aria-hidden="true">
          <SparkleIcon size={17} weight="fill" />
        </div>
        <div className="min-w-0 flex-1">
          <h2>New this month</h2>
          <p>{CATEGORY_LABELS[category] ?? 'Community'} · {loading ? 'Loading' : `${members.length} found`}</p>
        </div>
        <button
          type="button"
          className="new-arrivals-close"
          onClick={onClose}
          aria-label="Close new arrivals"
          style={{ color: muted, borderColor: border }}
        >
          <XIcon size={16} weight="bold" />
        </button>
      </header>

      <div className="new-arrivals-list" aria-live="polite">
        {loading ? (
          Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="new-arrivals-skeleton" style={{ borderColor: border }}>
              <span />
              <div><i /><i /></div>
            </div>
          ))
        ) : members.length === 0 ? (
          <div className="new-arrivals-empty">
            <SparkleIcon size={22} weight="duotone" />
            <strong>No new arrivals here</strong>
            <span>Try another community category.</span>
          </div>
        ) : members.map((member) => {
          const canLocate = Number.isFinite(member.lat)
            && Number.isFinite(member.lng)
            && (member.lat !== 0 || member.lng !== 0);

          return (
            <article
              key={member.id}
              className="new-arrivals-row"
              style={{ borderColor: border }}
            >
              <button
                type="button"
                className="new-arrivals-member"
                onClick={() => onSelect(member)}
                aria-label={`Open ${member.name}`}
              >
                <ArrivalAvatar member={member} darkMode={darkMode} />
                <span className="new-arrivals-copy">
                  <strong>{member.name}</strong>
                  <small style={{ color: muted }}>{member.location || 'Location not listed'}</small>
                  {member.tag ? <em>{member.tag}</em> : null}
                </span>
                <span className="new-arrivals-badge">NEW</span>
              </button>
              {canLocate ? (
                <button
                  type="button"
                  className="new-arrivals-locate"
                  onClick={() => onLocate(member)}
                  aria-label={`Locate ${member.name} on the globe`}
                  title="Locate on globe"
                >
                  <MapPinIcon size={15} weight="fill" />
                  Locate
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </aside>
  );
}
