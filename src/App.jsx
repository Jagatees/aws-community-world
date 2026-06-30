import { lazy, Suspense, useState, useCallback, useEffect, useMemo } from 'react';
import Header from './components/Header';
import TabNav from './components/TabNav';
import NewsPanel from './components/NewsPanel';
import ProfileCard from './components/ProfileCard';
import TagFilter from './components/TagFilter';
import KiroAvatarOverlay from './components/KiroAvatarOverlay';
import GlobeErrorBoundary from './components/GlobeErrorBoundary';
import { useCategory } from './hooks/useCategory';
import { useNews } from './hooks/useNews';
import communityBuilderMeta from './data/community-builders-meta.json';

const SplashScreen = lazy(() => import('./components/SplashScreen'));

const CATEGORY_COLORS = {
  heroes: '#FF9900',
  'community-builders': '#1A9C3E',
  'user-groups': '#00A1C9',
  'cloud-clubs': '#BF0816',
  'aws-community-day-singapore': '#FF9900',
  'kiro-ambassadors': '#8B5CF6',
  'kiro-events': '#7B61FF',
  'aws-ambassadors': '#2D72D2',
};

const CATEGORY_LABELS = {
  heroes: 'Heroes',
  'community-builders': 'Community Builders',
  'user-groups': 'User Groups',
  'cloud-clubs': 'Student Builder Groups',
  'aws-community-day-singapore': 'AWS Community Day Singapore',
  'kiro-ambassadors': 'Kiro',
  'kiro-events': 'Kiro Events',
  'aws-ambassadors': 'AWS Ambassador',
};

const SINGAPORE_CENTER = { lat: 1.3521, lng: 103.8198 };
const SINGAPORE_SCHOOL_COORDS = [
  { match: 'Nanyang Polytechnic', lat: 1.3799, lng: 103.8493 },
  { match: 'Singapore Institute of Management', lat: 1.3297, lng: 103.7754 },
  { match: 'Singapore Institute of Technology', lat: 1.4126, lng: 103.9101 },
  { match: 'Singapore Management University', lat: 1.2966, lng: 103.8501 },
  { match: 'National University of Singapore', lat: 1.2966, lng: 103.7764 },
];

const DEFAULT_ROUTE_STATE = {
  activeCategory: 'heroes',
  selectedTag: null,
  selectedCountry: null,
  globeDesign: 'orbit',
  darkMode: true,
  singaporeSpotlight: false,
};

const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_LABELS));
const GLOBE_DESIGNS = ['orbit', 'classic', 'sleek', 'flat'];
const VALID_GLOBE_DESIGNS = new Set(GLOBE_DESIGNS);

function getRouteStateFromUrl() {
  if (typeof window === 'undefined') return DEFAULT_ROUTE_STATE;

  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const view = params.get('view');
  const theme = params.get('theme');
  const spotlight = params.get('sg') === '1';
  const hasShareState = ['tab', 'tag', 'country', 'view', 'theme', 'sg'].some((key) => params.has(key));

  return {
    activeCategory: spotlight ? 'cloud-clubs' : VALID_CATEGORIES.has(tab) ? tab : DEFAULT_ROUTE_STATE.activeCategory,
    selectedTag: params.get('tag') || DEFAULT_ROUTE_STATE.selectedTag,
    selectedCountry: params.get('country') || (spotlight ? 'Singapore' : DEFAULT_ROUTE_STATE.selectedCountry),
    globeDesign: spotlight ? 'classic' : VALID_GLOBE_DESIGNS.has(view) ? view : DEFAULT_ROUTE_STATE.globeDesign,
    darkMode: theme === 'light' ? false : DEFAULT_ROUTE_STATE.darkMode,
    singaporeSpotlight: spotlight,
    hasShareState,
  };
}

function writeRouteStateToUrl({ activeCategory, selectedTag, selectedCountry, globeDesign, darkMode, singaporeSpotlight }) {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams();
  if (activeCategory !== DEFAULT_ROUTE_STATE.activeCategory) params.set('tab', activeCategory);
  if (selectedTag) params.set('tag', selectedTag);
  if (selectedCountry) params.set('country', selectedCountry);
  if (globeDesign !== DEFAULT_ROUTE_STATE.globeDesign) params.set('view', globeDesign);
  if (!darkMode) params.set('theme', 'light');
  if (singaporeSpotlight) params.set('sg', '1');

  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl !== currentUrl) window.history.replaceState(null, '', nextUrl);
}

function canCreateWebGlContext() {
  if (typeof document === 'undefined') return true;

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    gl?.getExtension?.('WEBGL_lose_context')?.loseContext?.();
    return Boolean(gl);
  } catch {
    return false;
  }
}

const CobeGlobeScene = lazy(() => import('./components/GlobeScene'));
const ClassicGlobeScene = lazy(() => import('./components/ClassicGlobeScene'));
const MapboxGlobeScene = lazy(() => import('./components/MapboxGlobeScene'));
const MapboxFlatScene = lazy(() => import('./components/MapboxFlatScene'));
const SvgFlatMapScene = lazy(() => import('./components/FlatMapScene'));
const AwsCommunityDaySingaporeScene = lazy(() => import('./components/AwsCommunityDaySingaporeScene'));

export default function App() {
  const [routeState] = useState(() => getRouteStateFromUrl());
  const [showSplash, setShowSplash] = useState(!routeState.hasShareState);
  const [splashExiting, setSplashExiting] = useState(false);
  const [activeCategory, setActiveCategory] = useState(routeState.activeCategory);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedNewsItems, setSelectedNewsItems] = useState([]);
  const [selectedTag, setSelectedTag] = useState(routeState.selectedTag);
  const [selectedCountry, setSelectedCountry] = useState(routeState.selectedCountry);
  const [darkMode, setDarkMode] = useState(routeState.darkMode);
  const [globeDesign, setGlobeDesign] = useState(routeState.globeDesign);
  const [zoomCommand, setZoomCommand] = useState({ direction: null, nonce: 0 });
  const [newsPanelOpen, setNewsPanelOpen] = useState(routeState.activeCategory === 'news');
  const [flyToOverride, setFlyToOverride] = useState(null);
  const [nearMeTarget, setNearMeTarget] = useState(routeState.singaporeSpotlight ? { ...SINGAPORE_CENTER, nonce: 1 } : null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeError, setNearMeError] = useState(null);
  const [nearMeHover, setNearMeHover] = useState(false);
  const [singaporeSpotlight, setSingaporeSpotlight] = useState(routeState.singaporeSpotlight ? { nonce: 1 } : null);
  const [webGlAvailable] = useState(canCreateWebGlContext);
  // Only fly when the user explicitly pressed Locate, not on every selection
  const selectedNewsFlyTarget = flyToOverride;
  const isCommunityDayView = activeCategory === 'aws-community-day-singapore';
  const isNewsView = activeCategory === 'news';
  const globeReady = !showSplash;

  const isCommunityBuilderView = activeCategory === 'community-builders';
  const loadFullCommunityBuilders = isCommunityBuilderView && Boolean(selectedTag || selectedCountry);
  const { error, members, loading } = useCategory(activeCategory, loadFullCommunityBuilders);
  const isKiroView = activeCategory === 'kiro-ambassadors' && members.length === 0 && !loading;
  const isAwsAmbassadorView = activeCategory === 'aws-ambassadors' && members.length === 0 && !loading;
  const { news, loading: newsLoading, error: newsError } = useNews(isNewsView);
  const ActiveGlobeScene =
    !webGlAvailable
      ? SvgFlatMapScene
      : globeDesign === 'classic'
      ? MapboxGlobeScene
      : globeDesign === 'flat'
        ? MapboxFlatScene
        : globeDesign === 'sleek'
          ? CobeGlobeScene
          : ClassicGlobeScene;

  function renderInteractiveScene(Scene, props, resetKey) {
    return (
      <GlobeErrorBoundary
        resetKey={resetKey}
        fallback={<SvgFlatMapScene {...props} />}
      >
        <Scene {...props} />
      </GlobeErrorBoundary>
    );
  }

  const tags = useMemo(() => {
    if (isCommunityBuilderView) return communityBuilderMeta.tags ?? [];

    const set = new Set(members.map((member) => member.tag).filter(Boolean));
    return [...set].sort();
  }, [isCommunityBuilderView, members]);
  const hasTagFilters = tags.length > 0;

  const countries = useMemo(() => {
    if (isCommunityBuilderView) return communityBuilderMeta.countries ?? [];

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
  }, [isCommunityBuilderView, members]);

  const countryCounts = useMemo(() => {
    if (isCommunityBuilderView) return communityBuilderMeta.countryCounts ?? {};

    const counts = {};
    members.forEach((member) => {
      if (!member.location) return;
      const parts = member.location.split(',');
      const country = parts[parts.length - 1].trim();
      counts[country] = (counts[country] ?? 0) + 1;
    });
    return counts;
  }, [isCommunityBuilderView, members]);

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

  const singaporeSpotlightMembers = useMemo(() => {
    if (activeCategory !== 'cloud-clubs') return [];

    return members
      .filter((member) => member.location?.includes('Singapore'))
      .map((member, index) => {
        const school = SINGAPORE_SCHOOL_COORDS.find((entry) => member.name.includes(entry.match));
        return {
          ...member,
          lat: school?.lat ?? member.lat,
          lng: school?.lng ?? member.lng,
          spotlightIndex: index,
        };
      });
  }, [activeCategory, members]);

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
  const hudCount = isCommunityBuilderView && !loadFullCommunityBuilders
    ? (communityBuilderMeta.total ?? filteredMembers.length)
    : filteredMembers.length;
  const hudSubLabel = isCommunityBuilderView && !loadFullCommunityBuilders
    ? `${(communityBuilderMeta.mappedTotal ?? filteredMembers.length).toLocaleString()} mapped across ${members.length.toLocaleString()} locations`
    : selectedTag || selectedCountry
      ? `filtered / ${members.length.toLocaleString()} total`
      : 'members worldwide';
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
      cursor: 'pointer',
      minWidth: '52px',
      minHeight: '44px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      touchAction: 'manipulation',
    };
  }

  function designButtonLabel(design) {
    if (design === 'classic') return 'Mapbox';
    if (design === 'orbit') return 'Orbit';
    if (design === 'sleek') return 'Sleek';
    return design.charAt(0).toUpperCase() + design.slice(1);
  }

  function renderLoadingSpinner(size = 20) {
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

  function renderGlobeLoading(message = 'Loading globe...') {
    return (
      <div
        className={`relative flex h-full w-full items-center justify-center overflow-hidden ${darkMode ? 'aws-globe-bg-dark' : 'aws-globe-bg-light'}`}
      >
        <div className="aws-globe-pattern" />
        <div
          className="relative z-10 flex items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold"
          style={{
            color: globeLoadingText,
            background: globeLoadingBg,
            border: `1px solid ${globeLoadingBorder}`,
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          {renderLoadingSpinner(18)}
          {message}
        </div>
      </div>
    );
  }

  const handleSplashStart = useCallback(() => {
    setSplashExiting(true);
    setTimeout(() => setShowSplash(false), 700);
  }, []);

  const handleMarkerClick = useCallback((member) => {
    const cluster = Array.isArray(member)
      ? member.find((entry) => entry?.clusterOnly || entry?.builderCount || entry?.name?.includes('Community Builders in'))
      : member;
    if (
      activeCategory === 'community-builders' &&
      (cluster?.clusterOnly || cluster?.builderCount || cluster?.name?.includes('Community Builders in'))
    ) {
      const parts = cluster.location?.split(',') ?? [];
      setSelectedCountry(cluster.country || parts[parts.length - 1]?.trim() || cluster.location);
      return;
    }

    setSelectedMember(member);
  }, [activeCategory]);

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
    setSingaporeSpotlight(null);
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

  const handleSingaporeSpotlight = useCallback(() => {
    if (singaporeSpotlight) {
      setSelectedTag(null);
      setSelectedCountry(null);
      setNearMeTarget(null);
      setSingaporeSpotlight(null);
      setGlobeDesign('orbit');
      return;
    }

    setSelectedTag(null);
    setSelectedCountry('Singapore');
    setNearMeTarget({ ...SINGAPORE_CENTER, nonce: Date.now() });
    setGlobeDesign('classic');
    setSingaporeSpotlight({ nonce: Date.now() });
  }, [singaporeSpotlight]);

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

  useEffect(() => {
    writeRouteStateToUrl({
      activeCategory,
      selectedTag,
      selectedCountry,
      globeDesign,
      darkMode,
      singaporeSpotlight: Boolean(singaporeSpotlight),
    });
  }, [activeCategory, darkMode, globeDesign, selectedCountry, selectedTag, singaporeSpotlight]);

  useEffect(() => {
    const handlePopState = () => {
      const nextRouteState = getRouteStateFromUrl();
      setSelectedMember(null);
      setSelectedNewsItems([]);
      setActiveCategory(nextRouteState.activeCategory);
      setSelectedTag(nextRouteState.selectedTag);
      setSelectedCountry(nextRouteState.selectedCountry);
      setGlobeDesign(nextRouteState.globeDesign);
      setDarkMode(nextRouteState.darkMode);
      setNewsPanelOpen(nextRouteState.activeCategory === 'news');
      setNearMeTarget(nextRouteState.singaporeSpotlight ? { ...SINGAPORE_CENTER, nonce: Date.now() } : null);
      setSingaporeSpotlight(nextRouteState.singaporeSpotlight ? { nonce: Date.now() } : null);
      if (nextRouteState.hasShareState) setShowSplash(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
          countries={isCommunityDayView || isNewsView || isKiroView || isAwsAmbassadorView ? [] : countries}
          countryCounts={isCommunityDayView || isNewsView || isKiroView || isAwsAmbassadorView ? {} : countryCounts}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
        />

        {!isCommunityDayView && !isNewsView && !isKiroView && !isAwsAmbassadorView && hasTagFilters && (
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
          {isCommunityDayView ? (
            <Suspense fallback={renderGlobeLoading()}>
              <AwsCommunityDaySingaporeScene darkMode={darkMode} />
            </Suspense>
          ) : isKiroView || isAwsAmbassadorView ? (
            <div className="relative h-full min-h-0 overflow-hidden">
              <div className="absolute inset-0">
                {globeReady ? (
                  <Suspense fallback={renderGlobeLoading()}>
                    <div key={globeDesign} style={{ width: '100%', height: '100%', animation: 'globe-scene-in 0.4s ease both' }}>
                      {renderInteractiveScene(
                        webGlAvailable ? CobeGlobeScene : SvgFlatMapScene,
                        {
                          category: isAwsAmbassadorView ? 'aws-ambassadors' : 'kiro-ambassadors',
                          members: [],
                          onMarkerClick: handleMarkerClick,
                          cardOpen: false,
                          darkMode,
                          flyToTarget: resolvedFlyToTarget,
                          zoomCommand,
                        },
                        `${isAwsAmbassadorView ? 'aws-ambassadors' : 'kiro-ambassadors'}-${globeDesign}-${darkMode}`
                      )}
                    </div>
                  </Suspense>
                ) : (
                  <div className={`relative h-full w-full overflow-hidden ${darkMode ? 'aws-globe-bg-dark' : 'aws-globe-bg-light'}`}>
                    <div className="aws-globe-pattern" />
                  </div>
                )}
              </div>
              <div
                className="pointer-events-none absolute inset-0 z-10"
                style={{
                  background: isAwsAmbassadorView
                    ? darkMode
                      ? 'radial-gradient(circle at center, rgba(7, 17, 26, 0.02) 0%, rgba(7, 17, 26, 0.44) 78%)'
                      : 'radial-gradient(circle at center, rgba(245, 250, 255, 0.02) 0%, rgba(230, 241, 250, 0.46) 78%)'
                    : darkMode
                      ? 'radial-gradient(circle at center, rgba(7, 17, 26, 0.22) 0%, rgba(7, 17, 26, 0.72) 72%)'
                      : 'radial-gradient(circle at center, rgba(245, 250, 255, 0.08) 0%, rgba(230, 241, 250, 0.74) 72%)',
                }}
              />
              <div
                className={`pointer-events-none relative z-20 mx-auto flex h-full max-w-md flex-col items-center px-6 text-center ${isAwsAmbassadorView ? 'justify-end pb-24' : 'justify-center'}`}
                style={{
                  color: darkMode ? '#DCE7F0' : '#17324B',
                }}
              >
                {!isAwsAmbassadorView && (
                  <div className="kiro-buddy-sprite mb-4" role="img" aria-label="Kiro Ambassador working" />
                )}
                <h1 className="text-2xl font-bold" style={{ color: darkMode ? '#FFFFFF' : '#0F1923' }}>
                  {isAwsAmbassadorView ? 'AWS Ambassador' : 'Kiro'}
                </h1>
                <p className="mt-3 text-sm font-semibold" style={{ color: darkMode ? '#DCE7F0' : '#17324B' }}>
                  {isAwsAmbassadorView ? 'Collecting data coming soon.' : 'Ambassador coming soon.'}
                </p>
                <p className="mt-2 max-w-sm text-sm leading-6" style={{ color: darkMode ? '#8B9BAA' : '#5a7a99' }}>
                  {isAwsAmbassadorView
                    ? 'Working on finding AWS Ambassadors to add to the globe.'
                    : 'Working on finding all ambassadors to add to the globe.'}
                </p>
              </div>
            </div>
          ) : isNewsView ? (
            <div className="relative h-full min-h-0">
              {/* Globe — always fills the full area */}
              <div className="absolute inset-0">
                {globeReady ? (
                  <Suspense
                    fallback={renderGlobeLoading()}
                  >
                    <div key={globeDesign} style={{ width: '100%', height: '100%', animation: 'globe-scene-in 0.4s ease both' }}>
                      {renderInteractiveScene(
                        ActiveGlobeScene,
                        {
                          category: 'news',
                          members: newsMarkers,
                          onMarkerClick: handleNewsMarkerClick,
                          cardOpen: selectedNewsItems.length > 0,
                          darkMode,
                          flyToTarget: selectedNewsFlyTarget ?? resolvedFlyToTarget,
                          zoomCommand,
                        },
                        `news-${globeDesign}-${darkMode}`
                      )}
                    </div>
                  </Suspense>
                ) : (
                  <div className={`relative h-full w-full overflow-hidden ${darkMode ? 'aws-globe-bg-dark' : 'aws-globe-bg-light'}`}>
                    <div className="aws-globe-pattern" />
                  </div>
                )}

                {globeReady && newsLoading && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <div
                      className="flex items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold"
                      style={{
                        color: globeLoadingText,
                        background: globeLoadingBg,
                        border: `1px solid ${globeLoadingBorder}`,
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                      }}
                    >
                      {renderLoadingSpinner(18)}
                      Loading news...
                    </div>
                  </div>
                )}

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
                      {GLOBE_DESIGNS.map((d) => (
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
                            minWidth: '44px',
                            minHeight: '44px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            touchAction: 'manipulation',
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
                        minHeight: '44px',
                        border: `1px solid ${nearMeHover && !nearMeLoading ? '#FF9900' : styleControlBorder}`,
                        transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                        cursor: nearMeLoading ? 'wait' : 'pointer',
                        touchAction: 'manipulation',
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
                  cursor: 'pointer',
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
              {globeReady ? (
                <Suspense
                  fallback={renderGlobeLoading()}
                >
                  <div key={`${globeDesign}-${singaporeSpotlight?.nonce ?? 'global'}`} style={{ width: '100%', height: '100%', animation: 'globe-scene-in 0.4s ease both' }}>
                    {renderInteractiveScene(
                      ActiveGlobeScene,
                      {
                        category: activeCategory,
                        members: filteredMembers,
                        onMarkerClick: handleMarkerClick,
                        cardOpen: !!selectedMember,
                        darkMode,
                        flyToTarget: resolvedFlyToTarget,
                        zoomCommand,
                        singaporeSpotlight: activeCategory === 'cloud-clubs' ? {
                          ...singaporeSpotlight,
                          members: singaporeSpotlightMembers,
                        } : null,
                      },
                      `${activeCategory}-${globeDesign}-${selectedTag ?? 'all'}-${selectedCountry ?? 'all'}-${darkMode}-${singaporeSpotlight?.nonce ?? 'global'}`
                    )}
                    {activeCategory === 'kiro-ambassadors' && !loading && <KiroAvatarOverlay />}
                  </div>
                </Suspense>
              ) : (
                <div className={`relative h-full w-full overflow-hidden ${darkMode ? 'aws-globe-bg-dark' : 'aws-globe-bg-light'}`}>
                  <div className="aws-globe-pattern" />
                </div>
              )}

              {globeReady && loading && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                  <div
                    className="flex items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold"
                    style={{
                      color: globeLoadingText,
                      background: globeLoadingBg,
                      border: `1px solid ${globeLoadingBorder}`,
                      backdropFilter: 'blur(14px)',
                      WebkitBackdropFilter: 'blur(14px)',
                    }}
                  >
                    {renderLoadingSpinner(18)}
                    Loading people...
                  </div>
                </div>
              )}

              <div
                className="absolute top-4 left-4 z-20 pointer-events-none"
                style={{
                  background: darkMode ? 'rgba(8, 16, 24, 0.78)' : 'rgba(255, 255, 255, 0.86)',
                  border: `1px solid ${darkMode ? 'rgba(62, 95, 123, 0.4)' : 'rgba(160, 187, 212, 0.72)'}`,
                  borderRadius: '12px',
                  padding: '10px 14px',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  minWidth: '110px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                  <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '10px', height: '10px', flexShrink: 0 }}>
                    <span style={{
                      position: 'absolute',
                      width: '10px', height: '10px',
                      borderRadius: '50%',
                      backgroundColor: CATEGORY_COLORS[activeCategory] ?? '#FF9900',
                      animation: 'live-ring 2s ease-out infinite',
                    }} />
                    <span style={{
                      width: '8px', height: '8px',
                      borderRadius: '50%',
                      backgroundColor: CATEGORY_COLORS[activeCategory] ?? '#FF9900',
                      display: 'block',
                      position: 'relative',
                    }} />
                  </span>
                  <span style={{ color: darkMode ? '#A7BDCF' : '#537190', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {CATEGORY_LABELS[activeCategory] ?? activeCategory}
                  </span>
                </div>

                {loading ? (
                  <div style={{ width: '3.5rem', height: '1.8rem', borderRadius: '4px', background: darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }} />
                ) : (
                  <div
                    key={hudCount}
                    style={{
                      color: darkMode ? '#FFFFFF' : '#0F1923',
                      fontSize: '1.55rem',
                      fontWeight: 900,
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                      animation: 'count-pop 0.35s ease both',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {hudCount.toLocaleString()}
                  </div>
                )}

                <div style={{ color: darkMode ? '#536475' : '#7a9ab8', fontSize: '0.68rem', marginTop: '3px', fontWeight: 500 }}>
                  {hudSubLabel}
                </div>
              </div>

              {activeCategory === 'kiro-ambassadors' && (
                <a
                  href="https://kiro.dev/events/submit/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-4 right-4 z-20 rounded-full px-4 py-2 text-xs font-bold transition-colors"
                  style={{
                    background: darkMode ? 'rgba(8, 16, 24, 0.82)' : 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #7B61FF',
                    color: darkMode ? '#FFFFFF' : '#241A47',
                    boxShadow: darkMode ? '0 14px 32px rgba(0, 0, 0, 0.28)' : '0 14px 30px rgba(60, 77, 120, 0.14)',
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#7B61FF';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = darkMode ? 'rgba(8, 16, 24, 0.82)' : 'rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.color = darkMode ? '#FFFFFF' : '#241A47';
                  }}
                >
                  Submit Event Here
                </a>
              )}

              <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
                <div className="flex items-stretch gap-3">
                  {!singaporeSpotlight && (
                    <>
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
                        {GLOBE_DESIGNS.map((design) => (
                          <button
                            key={design}
                            type="button"
                            onClick={() => setGlobeDesign(design)}
                            className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                            style={designButtonStyles(design)}
                          >
                            {designButtonLabel(design)}
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
                        <button
                          type="button"
                          onClick={() => triggerZoom('out')}
                          className="rounded-full px-3 py-1 text-sm font-semibold transition-colors"
                          style={{
                            color: styleControlText,
                            minWidth: '44px',
                            minHeight: '44px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            touchAction: 'manipulation',
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
                            minWidth: '44px',
                            minHeight: '44px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            touchAction: 'manipulation',
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
                          minHeight: '44px',
                          border: `1px solid ${nearMeHover && !nearMeLoading ? '#FF9900' : styleControlBorder}`,
                          transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                          cursor: nearMeLoading ? 'wait' : 'pointer',
                          touchAction: 'manipulation',
                        }}
                        aria-label="Near me"
                      >
                        {nearMeLoading ? 'Locating...' : 'Near Me'}
                      </button>
                    </>
                  )}

                  {activeCategory === 'cloud-clubs' && (
                    <button
                      type="button"
                      onClick={handleSingaporeSpotlight}
                      className="rounded-full px-4 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: singaporeSpotlight ? '#BF0816' : 'transparent',
                        color: singaporeSpotlight ? '#FFFFFF' : styleControlText,
                        minHeight: '44px',
                        border: `1px solid ${singaporeSpotlight ? '#BF0816' : styleControlBorder}`,
                        transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                        cursor: 'pointer',
                        touchAction: 'manipulation',
                      }}
                      aria-label="Singapore 3D spotlight"
                    >
                      {singaporeSpotlight ? 'Global View' : 'Singapore 3D'}
                    </button>
                  )}
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

        {!isNewsView && !isKiroView && !isAwsAmbassadorView && selectedMember && (
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
