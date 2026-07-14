import { useMemo, useState } from 'react';

const PAGE_SIZE = 60;

const CATEGORY_LABELS = {
  heroes: 'AWS Heroes',
  'community-builders': 'Community Builders',
  'user-groups': 'AWS User Groups',
  'cloud-clubs': 'Student Builder Groups',
  'kiro-ambassadors': 'Kiro Ambassadors',
  'kiro-events': 'Kiro Events',
  news: 'Builder Center News',
};

function getInitials(value = '') {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'AWS';
}

function getSearchText(item) {
  return [
    item.name,
    item.title,
    item.authorName,
    item.location,
    item.tag,
    item.heroType,
    item.builderType,
    item.specialization,
    item.description,
    ...(item.tags ?? []),
    ...(item.ledBy ?? []).map((leader) => leader?.name),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function DirectoryCard({ item, category, darkMode, onSelect }) {
  const isNews = category === 'news';
  const title = isNews ? item.title : item.name;
  const imageUrl = isNews ? item.authorAvatarUrl : item.avatarUrl;
  const url = isNews ? item.url : item.profileUrl || item.joinUrl;
  const eyebrow = isNews
    ? item.authorName || 'AWS Builder Center'
    : item.heroType || item.builderType || item.tag || CATEGORY_LABELS[item.category] || CATEGORY_LABELS[category];
  const leaders = (item.ledBy ?? []).map((leader) => leader?.name).filter(Boolean);
  const secondary = leaders.length > 0 ? `Led by ${leaders.join(', ')}` : item.location;
  const cardBg = darkMode ? 'rgba(12, 21, 31, 0.76)' : 'rgba(255, 255, 255, 0.9)';
  const border = darkMode ? 'rgba(62, 95, 123, 0.38)' : 'rgba(160, 187, 212, 0.62)';
  const heading = darkMode ? '#FFFFFF' : '#0F1923';
  const body = darkMode ? '#A7BDCF' : '#537190';

  return (
    <article
      className="group flex min-w-0 items-start gap-4 rounded-2xl p-4 transition-all duration-200"
      style={{ background: cardBg, border: `1px solid ${border}`, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = 'rgba(255, 153, 0, 0.58)';
        event.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = border;
        event.currentTarget.style.transform = '';
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
          style={{ border: '1px solid rgba(255, 153, 0, 0.5)', background: '#0F1923' }}
          loading="lazy"
        />
      ) : (
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-xs font-black"
          style={{ background: 'rgba(255, 153, 0, 0.14)', color: '#FF9900', border: '1px solid rgba(255, 153, 0, 0.32)' }}
          aria-hidden="true"
        >
          {getInitials(title)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: '#FF9900' }}>
          {eyebrow}
        </p>
        {onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="mt-1 block w-full text-left text-base font-bold leading-snug focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: heading, outlineColor: '#FF9900', cursor: 'pointer' }}
          >
            {title}
          </button>
        ) : (
          <h2 className="mt-1 text-base font-bold leading-snug" style={{ color: heading }}>
            {title}
          </h2>
        )}

        {isNews && item.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-5" style={{ color: body }}>
            {item.description}
          </p>
        ) : null}

        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: body }}>
          {secondary ? <span className="truncate">{secondary}</span> : null}
          {item.eventDate ? <span>{item.eventDate}</span> : null}
          {isNews && item.publishedAt ? <span>{formatDate(item.publishedAt)}</span> : null}
          {item.isNew ? <span className="font-bold" style={{ color: '#FF9900' }}>New</span> : null}
        </div>
      </div>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-9 flex-shrink-0 items-center rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: '#FF9900', border: '1px solid rgba(255, 153, 0, 0.55)', outlineColor: '#FF9900' }}
        >
          {isNews ? 'Read' : item.category === 'kiro-events' ? item.ctaLabel || 'Join' : 'Open'}
        </a>
      ) : null}
    </article>
  );
}

export default function ListScene({ category, members = [], newsItems = [], loading = false, darkMode, onItemClick }) {
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const items = category === 'news' ? newsItems : members;

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const result = normalizedQuery ? items.filter((item) => getSearchText(item).includes(normalizedQuery)) : items;
    return [...result].sort((a, b) => (a.name || a.title || '').localeCompare(b.name || b.title || ''));
  }, [items, query]);

  const shownItems = filteredItems.slice(0, visibleCount);
  const title = CATEGORY_LABELS[category] || 'Community directory';
  const surface = darkMode ? 'rgba(7, 16, 25, 0.88)' : 'rgba(245, 250, 255, 0.92)';
  const heading = darkMode ? '#FFFFFF' : '#0F1923';
  const body = darkMode ? '#8B9BAA' : '#5A7A99';
  const inputBg = darkMode ? 'rgba(15, 25, 35, 0.82)' : 'rgba(255, 255, 255, 0.92)';
  const border = darkMode ? 'rgba(62, 95, 123, 0.42)' : 'rgba(160, 187, 212, 0.7)';

  return (
    <section className="relative h-full overflow-y-auto" style={{ background: surface }} aria-label={`${title} list`}>
      <div className="aws-globe-pattern" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-32 pt-6 md:px-8 md:pt-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: '#FF9900' }}>
              Browse without the globe
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.025em] md:text-3xl" style={{ color: heading }}>
              {title}
            </h1>
            <p className="mt-2 text-sm" style={{ color: body }}>
              {loading ? 'Loading entries…' : `${filteredItems.length.toLocaleString()} ${filteredItems.length === 1 ? 'entry' : 'entries'}`}
            </p>
          </div>

          <label className="w-full md:max-w-sm">
            <span className="sr-only">Search {title}</span>
            <div className="flex min-h-11 items-center gap-3 rounded-xl px-4" style={{ background: inputBg, border: `1px solid ${border}` }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ color: body }}>
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="Search names, places or specialties"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                style={{ color: heading }}
              />
            </div>
          </label>
        </div>

        {loading && items.length === 0 ? (
          <div className="mt-8 grid gap-3 lg:grid-cols-2" aria-label="Loading directory">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl" style={{ background: inputBg, border: `1px solid ${border}` }} />
            ))}
          </div>
        ) : shownItems.length > 0 ? (
          <>
            <div className="mt-8 grid gap-3 lg:grid-cols-2">
              {shownItems.map((item) => (
                <DirectoryCard
                  key={item.id || item.url || item.name || item.title}
                  item={item}
                  category={category}
                  darkMode={darkMode}
                  onSelect={category === 'news' ? null : onItemClick}
                />
              ))}
            </div>

            {visibleCount < filteredItems.length ? (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="min-h-11 rounded-xl px-5 text-sm font-bold transition-transform active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ background: '#FF9900', color: '#0F1923', outlineColor: '#FF9900', cursor: 'pointer' }}
                >
                  Show more · {(filteredItems.length - visibleCount).toLocaleString()} remaining
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-12 rounded-2xl px-6 py-14 text-center" style={{ background: inputBg, border: `1px solid ${border}` }}>
            <p className="text-base font-bold" style={{ color: heading }}>
              {query ? 'No matching entries' : 'No entries available yet'}
            </p>
            <p className="mt-2 text-sm" style={{ color: body }}>
              {query ? 'Try a different name, location or specialty.' : 'Check back as the community directory grows.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
