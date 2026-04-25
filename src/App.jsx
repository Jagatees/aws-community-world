import { lazy, Suspense, useState, useCallback, useMemo } from 'react';
import Header from './components/Header';
import TabNav from './components/TabNav';
import NewsPanel from './components/NewsPanel';
import ProfileCard from './components/ProfileCard';
import TagFilter from './components/TagFilter';
import { useCategory } from './hooks/useCategory';
import { useNews } from './hooks/useNews';

const SplashScreen = lazy(() => import('./components/SplashScreen'));
const CobeGlobeScene = lazy(() => import('./components/GlobeScene'));
const ClassicGlobeScene = lazy(() => import('./components/ClassicGlobeScene'));
const MapboxGlobeScene = lazy(() => import('./components/MapboxGlobeScene'));
const MapboxFlatScene = lazy(() => import('./components/MapboxFlatScene'));

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const [activeCategory, setActiveCategory] = useState('heroes');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedNewsItems, setSelectedNewsItems] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [globeDesign, setGlobeDesign] = useState('orbit');
  const [zoomCommand, setZoomCommand] = useState({ direction: null, nonce: 0 });
  const [newsPanelOpen, setNewsPanelOpen] = useState(true);
  const [flyToOverride, setFlyToOverride] = useState(null);
  const [nearMeTarget, setNearMeTarget] = useState(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeError, setNearMeError] = useState(null);
  const [nearMeHover, setNearMeHover] = useState(false);
  // Only fly when the user explicitly pressed Locate, not on every selection
  const selectedNewsFlyTarget = flyToOverride;
  const isNewsView = activeCategory === 'news';

  const { error, members, loading } = useCategory(activeCategory);
  const { news, loading: newsLoading, error: newsError } = useNews(isNewsView);
  const ActiveGlobeScene =
    globeDesign === 'classic'
      ? MapboxGlobeScene
      : globeDesign === 'flat'
        ? MapboxFlatScene
        : globeDesign === 'sleek'
          ? CobeGlobeScene
          : ClassicGlobeScene;

  const tags = useMemo(() => {
    const set = new Set(members.map((member) => member.tag).filter(Boolean));
    return [...set].sort();
  }, [members]);
  const hasTagFilters = tags.length > 0;

  const countries = useMemo(() => {
    const set = new Set(
      members
        .map((member) => {
          if (!member.location) return null;
          const parts = member.location.split(',');
          return parts[parts.length - 1].trim();
        })
        .filter(Boolean)
    );
    return [...set].sort();
  }, [members]);

  const countryCounts = useMemo(() => {
    const counts = {};
    members.forEach((member) => {
      if (!member.location) return;
      const parts = member.location.split(',');
      const country = parts[parts.length - 1].trim();
      counts[country] = (counts[country] ?? 0) + 1;
    });
    return counts;
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      if (member.lat === 0 && member.lng === 0) return false;
      if (selectedTag && member.tag !== selectedTag) return false;
      if (selectedCountry) {
        const parts = member.location?.split(',') ?? [];
        const country = parts[parts.length - 1]?.trim();
        if (country !== selectedCountry) return false;
      }
      return true;
    });
  }, [members, selectedTag, selectedCountry]);

  const flyToTarget = useMemo(() => {
    if (!selectedCountry) return null;

    const matching = members.filter((member) => {
      if (member.lat === 0 && member.lng === 0) return false;
      const parts = member.location?.split(',') ?? [];
      return parts[parts.length - 1]?.trim() === selectedCountry;
    });

    if (!matching.length) return null;

    const lat = matching.reduce((sum, member) => sum + member.lat, 0) / matching.length;
    const lng = matching.reduce((sum, member) => sum + member.lng, 0) / matching.length;
    return { lat, lng };
  }, [selectedCountry, members]);
  const resolvedFlyToTarget = nearMeTarget ?? flyToTarget;

  const isEmpty = !loading && !error && filteredMembers.length === 0;
  const activeError = isNewsView ? newsError : error;
  const newsItems = useMemo(() => {
    const seen = new Set();
    return [...(news?.latest ?? []), ...(news?.trending ?? [])].filter((item) => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [news]);
  const newsMarkers = useMemo(() => {
    return newsItems
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng) && (item.lat !== 0 || item.lng !== 0))
      .map((item) => ({
        id: `news-${item.id}`,
        name: item.title,
        avatarUrl: item.authorAvatarUrl,
        profileUrl: item.url,
        location: item.location,
        lat: item.lat,
        lng: item.lng,
        category: 'news',
        tag: item.tags[0] ?? 'Builder Center',
        newsItem: item,
      }));
  }, [newsItems]);
  const filterBarBg = darkMode ? 'rgba(15, 25, 35, 0.55)' : 'rgba(255, 255, 255, 0.58)';
  const styleControlBg = darkMode ? 'rgba(8, 16, 24, 0.78)' : 'rgba(255, 255, 255, 0.86)';
  const styleControlBorder = darkMode ? 'rgba(76, 109, 138, 0.45)' : 'rgba(160, 187, 212, 0.85)';
  const styleControlText = darkMode ? '#DCE7F0' : '#17324B';
  const globeLoadingBg = darkMode ? 'rgba(7, 16, 25, 0.76)' : 'rgba(255, 255, 255, 0.8)';
  const globeLoadingBorder = darkMode ? 'rgba(62, 95, 123, 0.4)' : 'rgba(160, 187, 212, 0.72)';
  const globeLoadingText = darkMode ? '#A7BDCF' : '#537190';

  function designButtonStyles(design) {
    const active = globeDesign === design;
    return {
      backgroundColor: active ? '#FF9900' : 'transparent',
      color: active ? '#0F1923' : styleControlText,
    };
  }

  function designButtonLabel(design) {
    if (design === 'classic') return 'Mapbox';
    if (design === 'orbit') return 'Orbit';
    if (design === 'sleek') return 'Sleek';
    return design.charAt(0).toUpperCase() + design.slice(1);
  }

  const handleSplashStart = useCallback(() => {
    setSplashExiting(true);
    setTimeout(() => setShowSplash(false), 700);
  }, []);

  const handleMarkerClick = useCallback((member) => {
    setSelectedMember(member);
  }, []);

  const handleNewsMarkerClick = useCallback((payload) => {
    const items = (Array.isArray(payload) ? payload : [payload])
      .map((entry) => entry.newsItem ?? entry)
      .filter(Boolean);
    setSelectedNewsItems(items);
    if (items.length > 0) setNewsPanelOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedMember(null);
  }, []);

  const handleCategoryChange = useCallback((category) => {
    setSelectedMember(null);
    setSelectedNewsItems([]);
    setSelectedTag(null);
    setSelectedCountry(null);
    setActiveCategory(category);
    if (category === 'news') setNewsPanelOpen(true);
  }, []);

  const triggerZoom = useCallback((direction) => {
    setZoomCommand((current) => ({ direction, nonce: current.nonce + 1 }));
  }, []);

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) {
      setNearMeError('Geolocation is not available in this browser.');
      return;
    }

    setNearMeLoading(true);
    setNearMeError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNearMeTarget({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          nonce: Date.now(),
        });
        setNearMeLoading(false);
      },
      (error) => {
        setNearMeError(error?.message || 'Could not get your location.');
        setNearMeLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Highlight only — no globe fly (used when clicking title/image in panel)
  const handleSelectNewsItem = useCallback((item) => {
    setSelectedNewsItems(item ? [item] : []);
  }, []);

  // Locate = highlight + fly globe to location (used when pressing Locate button)
  const handleLocateNewsItem = useCallback((item) => {
    setSelectedNewsItems(item ? [item] : []);
    if (item && Number.isFinite(item.lat) && Number.isFinite(item.lng) && (item.lat !== 0 || item.lng !== 0)) {
      setFlyToOverride({ lat: item.lat, lng: item.lng, nonce: Date.now() });
    }
  }, []);

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', position: 'relative' }}>
    <div
      className={`relative flex flex-col ${darkMode ? 'aws-shell-bg-dark' : 'aws-shell-bg-light'}`}
      style={{ height: '100dvh', overflow: 'hidden' }}
    >
      <div className="aws-shell-pattern" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: darkMode
            ? 'linear-gradient(180deg, rgba(9, 17, 26, 0.08) 0%, rgba(9, 17, 26, 0.36) 100%)'
            : 'linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(214, 229, 241, 0.22) 100%)',
        }}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Header
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((value) => !value)}
        />
        <TabNav
          activeCategory={activeCategory}
          onChange={handleCategoryChange}
          darkMode={darkMode}
          countries={isNewsView ? [] : countries}
          countryCounts={isNewsView ? {} : countryCounts}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
        />

        {!isNewsView && hasTagFilters && (
          <div
            className="flex items-center gap-2 overflow-x-auto px-4 py-2"
            style={{
              backgroundColor: filterBarBg,
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              scrollbarWidth: 'none',
              flexShrink: 0,
              borderBottom: darkMode ? '1px solid rgba(45, 63, 80, 0.55)' : '1px solid rgba(208, 220, 232, 0.8)',
            }}
          >
            <TagFilter tags={tags} selected={selectedTag} onChange={setSelectedTag} darkMode={darkMode} />
          </div>
        )}

        {activeError && (
          <div
            role="alert"
            className="px-4 py-2 text-center text-sm"
            style={{ backgroundColor: '#BF0816', color: '#FFFFFF' }}
          >
            {activeError}
          </div>
        )}

        <div className="relative flex-1" style={{ minHeight: 0 }}>
          {isNewsView ? (
            <div className="relative h-full min-h-0">
              {/* Globe — always fills the full area */}
              <div className="absolute inset-0">
                <Suspense
                  fallback={(
                    <div
                      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${darkMode ? 'aws-globe-bg-dark' : 'aws-globe-bg-light'}`}
                    >
                      <div className="aws-globe-pattern" />
                      <div
                        className="relative z-10 rounded-full px-4 py-2 text-sm font-semibold"
                        style={{
                          color: globeLoadingText,
                          background: globeLoadingBg,
                          border: `1px solid ${globeLoadingBorder}`,
                          backdropFilter: 'blur(14px)',
                          WebkitBackdropFilter: 'blur(14px)',
                        }}
                      >
                        Loading globe...
                      </div>
                    </div>
                  )}
                >
                  <ActiveGlobeScene
                    category="news"
                    members={newsMarkers}
                    onMarkerClick={handleNewsMarkerClick}
                    cardOpen={selectedNewsItems.length > 0}
                    darkMode={darkMode}
                    flyToTarget={selectedNewsFlyTarget ?? resolvedFlyToTarget}
                    zoomCommand={zoomCommand}
                  />
                </Suspense>

                {/* Globe controls */}
                <div
                  className="absolute bottom-5 z-20"
                  style={{ left: newsPanelOpen ? '50%' : '50%', transform: 'translateX(-50%)' }}
                >
                  <div className="flex items-stretch gap-3">
                    <div
                      className="flex items-center rounded-full p-1"
                      style={{
                        background: styleControlBg,
                        border: `1px solid ${styleControlBorder}`,
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                      }}
                      aria-label="Globe design switcher"
                    >
                      {['orbit', 'classic', 'sleek', 'flat'].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setGlobeDesign(d)}
                          className="rounded-full px-3 py-1 text-xs font-semibold transition-colors capitalize"
                          style={designButtonStyles(d)}
                        >
                          {designButtonLabel(d)}
                        </button>
                      ))}
                    </div>

                    <div
                      className="flex items-center rounded-full p-1"
                      style={{
                        background: styleControlBg,
                        border: `1px solid ${styleControlBorder}`,
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                      }}
                      aria-label="Zoom controls"
                    >
                      {[['out', '-'], ['in', '+']].map(([dir, label]) => (
                        <button
                          key={dir}
                          type="button"
                          onClick={() => triggerZoom(dir)}
                          className="rounded-full px-3 py-1 text-sm font-semibold transition-colors"
                          style={{
                            color: styleControlText,
                            minWidth: '2.5rem',
                            minHeight: '2.1rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          aria-label={`Zoom ${dir}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleNearMe}
                      onMouseEnter={() => setNearMeHover(true)}
                      onMouseLeave={() => setNearMeHover(false)}
                      className="rounded-full px-4 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: nearMeLoading ? '#53657A' : nearMeHover ? '#FF9900' : 'transparent',
                        color: nearMeLoading ? '#A7BDCF' : nearMeHover ? '#0F1923' : styleControlText,
                        minHeight: '2.1rem',
                        border: `1px solid ${nearMeHover && !nearMeLoading ? '#FF9900' : styleControlBorder}`,
                        transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                      }}
                      aria-label="Near me"
                    >
                      {nearMeLoading ? 'Locating...' : 'Near Me'}
                    </button>
                  </div>
                </div>

                {!newsLoading && newsMarkers.length === 0 && (
                  <div
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                    style={{ color: '#8B9BAA' }}
                  >
                    <span style={{ fontSize: '2.5rem' }}>🌍</span>
                    <p className="mt-3 text-sm">No mapped news locations available yet.</p>
                  </div>
                )}
              </div>

              {/* News panel toggle button (always visible) */}
              <button
                type="button"
                onClick={() => setNewsPanelOpen((v) => !v)}
                className="absolute z-30 flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold shadow-lg transition-all"
                style={{
                  top: '1rem',
                  right: newsPanelOpen ? 'calc(min(460px, 100vw) + 0.75rem)' : '1rem',
                  background: styleControlBg,
                  border: `1px solid ${newsPanelOpen ? '#FF9900' : styleControlBorder}`,
                  color: newsPanelOpen ? '#FF9900' : styleControlText,
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  transition: 'right 0.3s ease',
                }}
                aria-label={newsPanelOpen ? 'Close news panel' : 'Open news panel'}
              >
                {newsPanelOpen ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Hide News
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    News Feed
                  </>
                )}
              </button>

              {/* News panel — slides in from right, overlays the globe */}
              <div
                className="absolute inset-y-0 right-0 z-20 flex flex-col"
                style={{
                  width: 'min(460px, 100vw)',
                  transform: newsPanelOpen ? 'translateX(0)' : 'translateX(100%)',
                  transition: 'transform 0.3s ease',
                  borderLeft: `1px solid ${darkMode ? 'rgba(74, 108, 136, 0.36)' : 'rgba(150, 179, 205, 0.64)'}`,
                  pointerEvents: newsPanelOpen ? 'auto' : 'none',
                }}
              >
                <NewsPanel
                  darkMode={darkMode}
                  news={news}
                  loading={newsLoading}
                  selectedItems={selectedNewsItems}
                  onSelectItem={handleSelectNewsItem}
                  onLocate={handleLocateNewsItem}
                  onClose={() => setNewsPanelOpen(false)}
                />
              </div>
            </div>
          ) : (
            <>
              <Suspense
                fallback={(
                  <div
                    className={`relative flex h-full w-full items-center justify-center overflow-hidden ${darkMode ? 'aws-globe-bg-dark' : 'aws-globe-bg-light'}`}
                  >
                    <div className="aws-globe-pattern" />
                    <div
                      className="relative z-10 rounded-full px-4 py-2 text-sm font-semibold"
                      style={{
                        color: globeLoadingText,
                        background: globeLoadingBg,
                        border: `1px solid ${globeLoadingBorder}`,
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                      }}
                    >
                      Loading globe...
                    </div>
                  </div>
                )}
              >
                <ActiveGlobeScene
                  category={activeCategory}
                  members={filteredMembers}
                  onMarkerClick={handleMarkerClick}
                  cardOpen={!!selectedMember}
                  darkMode={darkMode}
                  flyToTarget={resolvedFlyToTarget}
                  zoomCommand={zoomCommand}
                />
              </Suspense>

              <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
                <div className="flex items-stretch gap-3">
                  <div
                    className="flex items-center rounded-full p-1"
                    style={{
                      background: styleControlBg,
                      border: `1px solid ${styleControlBorder}`,
                      backdropFilter: 'blur(14px)',
                      WebkitBackdropFilter: 'blur(14px)',
                    }}
                    aria-label="Globe design switcher"
                  >
                    <button
                      type="button"
                      onClick={() => setGlobeDesign('orbit')}
                      className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                      style={designButtonStyles('orbit')}
                    >
                      Orbit
                    </button>
                    <button
                      type="button"
                      onClick={() => setGlobeDesign('classic')}
                      className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                      style={designButtonStyles('classic')}
                    >
                      {designButtonLabel('classic')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGlobeDesign('sleek')}
                      className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                      style={designButtonStyles('sleek')}
                    >
                      Sleek
                    </button>
                    <button
                      type="button"
                      onClick={() => setGlobeDesign('flat')}
                      className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                      style={designButtonStyles('flat')}
                    >
                      Flat
                    </button>
                  </div>

                  <div
                    className="flex items-center rounded-full p-1"
                    style={{
                      background: styleControlBg,
                      border: `1px solid ${styleControlBorder}`,
                      backdropFilter: 'blur(14px)',
                      WebkitBackdropFilter: 'blur(14px)',
                    }}
                    aria-label="Zoom controls"
                  >
                    <button
                      type="button"
                      onClick={() => triggerZoom('out')}
                      className="rounded-full px-3 py-1 text-sm font-semibold transition-colors"
                      style={{
                        color: styleControlText,
                        minWidth: '2.5rem',
                        minHeight: '2.1rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      aria-label="Zoom out"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerZoom('in')}
                      className="rounded-full px-3 py-1 text-sm font-semibold transition-colors"
                      style={{
                        color: styleControlText,
                        minWidth: '2.5rem',
                        minHeight: '2.1rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      aria-label="Zoom in"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleNearMe}
                    onMouseEnter={() => setNearMeHover(true)}
                    onMouseLeave={() => setNearMeHover(false)}
                    className="rounded-full px-4 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: nearMeLoading ? '#53657A' : nearMeHover ? '#FF9900' : 'transparent',
                      color: nearMeLoading ? '#A7BDCF' : nearMeHover ? '#0F1923' : styleControlText,
                      minHeight: '2.1rem',
                      border: `1px solid ${nearMeHover && !nearMeLoading ? '#FF9900' : styleControlBorder}`,
                      transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                    }}
                    aria-label="Near me"
                  >
                    {nearMeLoading ? 'Locating...' : 'Near Me'}
                  </button>
                </div>
              </div>

              {isEmpty && (
                <div
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                  style={{ color: '#8B9BAA' }}
                >
                  <span style={{ fontSize: '2.5rem' }}>🌐</span>
                  <p className="mt-3 text-sm">No results for the selected filters.</p>
                </div>
              )}
            </>
          )}
        </div>

        {!isNewsView && selectedMember && (
          <ProfileCard member={selectedMember} onClose={handleClose} darkMode={darkMode} />
        )}

        {nearMeError && (
          <div
            className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold"
            style={{
              background: 'rgba(191, 8, 22, 0.92)',
              color: '#FFFFFF',
              boxShadow: '0 10px 22px rgba(0, 0, 0, 0.28)',
            }}
          >
            {nearMeError}
          </div>
        )}
      </div>
    </div>

    {showSplash && (
      <Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: '#07111a' }} />}>
        <SplashScreen onStart={handleSplashStart} exiting={splashExiting} />
      </Suspense>
    )}
    </div>
  );
}
