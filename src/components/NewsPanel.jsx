import { useState, useMemo, useEffect, useRef } from 'react';

function formatPublishedAt(value) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function isToday(dateString) {
  if (!dateString) return false;
  try {
    const date = new Date(dateString);
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  } catch {
    return false;
  }
}

function NewsCard({ item, darkMode, selected, onSelect, cardRef }) {
  const cardBg = darkMode ? 'rgba(12, 21, 31, 0.76)' : 'rgba(255, 255, 255, 0.9)';
  const cardBorder = selected ? '#FF9900' : darkMode ? 'rgba(62, 95, 123, 0.42)' : 'rgba(160, 187, 212, 0.72)';
  const headingColor = darkMode ? '#FFFFFF' : '#0F1923';
  const bodyColor = darkMode ? '#DCE7F0' : '#17324B';
  const mutedColor = darkMode ? '#8B9BAA' : '#5a7a99';

  return (
    <article
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(item);
        }
      }}
      className="overflow-hidden rounded-2xl"
      style={{
        background: cardBg,
        border: `1.5px solid ${cardBorder}`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: selected
          ? darkMode
            ? '0 0 0 3px rgba(255,153,0,0.18)'
            : '0 0 0 3px rgba(255,153,0,0.14)'
          : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
      }}
    >
      {item.imageUrl ? (
        <div className="h-36 w-full overflow-hidden">
          <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          {item.authorAvatarUrl ? (
            <img
              src={item.authorAvatarUrl}
              alt={item.authorName}
              className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
              style={{ border: '2px solid #FF9900' }}
            />
          ) : (
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: '#FF9900', color: '#0F1923' }}
            >
              {item.authorName?.slice(0, 2).toUpperCase() || 'BC'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: bodyColor }}>
              {item.authorName || 'AWS Builder Center'}
            </p>
            <p className="text-xs" style={{ color: mutedColor }}>
              {item.location || 'Builder Center'}
            </p>
          </div>
        </div>

        <h3 className="text-base font-bold leading-tight" style={{ color: headingColor }}>
          {item.title}
        </h3>

        <p className="text-sm leading-6" style={{ color: mutedColor }}>
          {item.description}
        </p>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {item.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  background: darkMode ? 'rgba(255,153,0,0.14)' : 'rgba(255,153,0,0.12)',
                  color: '#FF9900',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="text-xs font-semibold" style={{ color: mutedColor }}>
            {formatPublishedAt(item.publishedAt)}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs font-semibold" style={{ color: mutedColor }}>
            <span>{item.likesCount} likes</span>
            <span>{item.commentsCount} comments</span>
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: '#FF9900', color: '#0F1923' }}
            onClick={(e) => e.stopPropagation()}
          >
            Open
          </a>
        </div>
      </div>
    </article>
  );
}

function EmptyFeed({ darkMode }) {
  const mutedColor = darkMode ? '#8B9BAA' : '#5a7a99';
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <span style={{ fontSize: '2rem' }}>📭</span>
      <p className="text-sm font-semibold" style={{ color: mutedColor }}>
        No stories published today yet.
      </p>
      <p className="text-xs" style={{ color: mutedColor }}>
        Check back later — the feed refreshes every hour.
      </p>
    </div>
  );
}

export default function NewsPanel({ darkMode, news, loading, selectedItems = [], onSelectItem, onLocate, onClose }) {
  const [activeTab, setActiveTab] = useState('latest');
  const selectedCardRef = useRef(null);

  const titleColor = darkMode ? '#FFFFFF' : '#0F1923';
  const bodyColor = darkMode ? '#A7BDCF' : '#537190';
  const panelBg = darkMode ? 'rgba(8, 16, 24, 0.92)' : 'rgba(252, 254, 255, 0.96)';
  const panelBorder = darkMode ? 'rgba(74, 108, 136, 0.54)' : 'rgba(150, 179, 205, 0.82)';
  const tabActiveBg = darkMode ? 'rgba(255,153,0,0.15)' : 'rgba(255,153,0,0.12)';
  const tabBorder = darkMode ? 'rgba(62, 95, 123, 0.42)' : 'rgba(160, 187, 212, 0.72)';

  const selectedId = selectedItems[0]?.id ?? null;

  const todayLatest = useMemo(
    () => (news?.latest ?? []).filter((item) => isToday(item.publishedAt)),
    [news],
  );
  const todayTrending = useMemo(
    () => (news?.trending ?? []).filter((item) => isToday(item.publishedAt)),
    [news],
  );

  const activeItems = activeTab === 'latest' ? todayLatest : todayTrending;

  // Switch tab to one that contains the selected item (if current tab doesn't have it)
  useEffect(() => {
    if (!selectedId) return;
    const inLatest = todayLatest.some((i) => i.id === selectedId);
    const inTrending = todayTrending.some((i) => i.id === selectedId);
    if (!inLatest && !inTrending) return;
    const currentHasIt = activeTab === 'latest' ? inLatest : inTrending;
    if (!currentHasIt) {
      setActiveTab(inLatest ? 'latest' : 'trending');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, todayLatest, todayTrending]);

  // Scroll selected card into view after it renders (including after tab switch)
  useEffect(() => {
    if (!selectedId) return;
    const timer = setTimeout(() => {
      selectedCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
    return () => clearTimeout(timer);
  }, [selectedId, activeTab]);

  function tabStyle(tab) {
    const active = activeTab === tab;
    return {
      backgroundColor: active ? tabActiveBg : 'transparent',
      color: active ? '#FF9900' : bodyColor,
      border: `1px solid ${active ? '#FF9900' : tabBorder}`,
      fontWeight: active ? '700' : '500',
    };
  }

  // Card click = highlight + fly globe. Click again to deselect.
  function handleCardSelect(item) {
    if (selectedId === item.id) {
      onSelectItem?.(null);
    } else {
      onLocate?.(item);
    }
  }

  return (
    <aside
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
      style={{
        background: panelBg,
        borderLeft: `1px solid ${panelBorder}`,
        boxShadow: darkMode ? '-18px 0 50px rgba(0, 0, 0, 0.22)' : '-12px 0 40px rgba(86, 116, 145, 0.08)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
    >
      {/* Header */}
      <div className="border-b p-5 md:p-6" style={{ borderColor: panelBorder }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#FF9900' }}>
              Builder Center News
            </p>
            <h1 className="mt-2 text-2xl font-bold" style={{ color: titleColor }}>
              Today&apos;s AWS Stories
            </h1>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors"
              style={{ color: bodyColor, background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
              aria-label="Close news panel"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        <p className="mt-2 text-sm leading-6" style={{ color: bodyColor }}>
          Click any story to fly the globe to that author&apos;s location.
        </p>
        <p className="mt-1 text-xs font-semibold" style={{ color: bodyColor }}>
          Updated {news?.updatedAt ? formatPublishedAt(news.updatedAt) : 'just now'}
        </p>

        {/* Tabs */}
        <div className="mt-4 flex gap-2">
          {[['latest', todayLatest.length], ['trending', todayTrending.length]].map(([tab, count]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="flex-1 rounded-full px-4 py-2 text-sm capitalize transition-colors"
              style={tabStyle(tab)}
            >
              {tab}
              {count > 0 && (
                <span
                  className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{
                    background: activeTab === tab ? '#FF9900' : tabBorder,
                    color: activeTab === tab ? '#0F1923' : bodyColor,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
        {loading && !news ? (
          <div
            className="rounded-2xl px-4 py-8 text-sm font-semibold"
            style={{
              color: bodyColor,
              background: darkMode ? 'rgba(12, 21, 31, 0.76)' : 'rgba(255, 255, 255, 0.9)',
              border: `1px solid ${panelBorder}`,
            }}
          >
            Loading Builder Center news...
          </div>
        ) : activeItems.length === 0 ? (
          <EmptyFeed darkMode={darkMode} />
        ) : (
          <div className="grid gap-4">
            {activeItems.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                darkMode={darkMode}
                selected={selectedId === item.id}
                onSelect={handleCardSelect}
                cardRef={selectedId === item.id ? selectedCardRef : null}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
