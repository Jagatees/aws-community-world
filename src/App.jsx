import { lazy, Suspense, useState, useCallback, useEffect, useMemo } from 'react';
import { SparkleIcon } from '@phosphor-icons/react';
import Header from './components/Header';
import TabNav from './components/TabNav';
import MobileNavigation from './components/MobileNavigation';
import NewsPanel from './components/NewsPanel';
import ProfileCard from './components/ProfileCard';
import TagFilter from './components/TagFilter';
import KiroAvatarOverlay from './components/KiroAvatarOverlay';
import ListScene from './components/ListScene';
import GlobeErrorBoundary from './components/GlobeErrorBoundary';
import NewArrivalsPanel from './components/NewArrivalsPanel';
import Country3DControl from './components/Country3DControl';
import IconArchiveScene from './components/ExperimentalHeroDex';
import { useCategory } from './hooks/useCategory';
import { useNews } from './hooks/useNews';
import communityBuilderMeta from './data/community-builders-meta.json';
import { getRegionForCountry, REGIONS } from './utils/countryRegions';
import { COUNTRY_SPOTLIGHTS, getCountrySpotlightFromParams } from './config/countrySpotlights';

const SplashScreen = lazy(() => import('./components/SplashScreen'));
const InsightsDashboard = lazy(() => import('./components/TrendsDashboard'));

const CATEGORY_COLORS = {
  heroes: '#FF9900',
  'community-builders': '#1A9C3E',
  'user-groups': '#00A1C9',
  'cloud-clubs': '#BF0816',
  'kiro-ambassadors': '#8B5CF6',
  'kiro-events': '#7B61FF',
  'community-days': '#FF9900',
  'aws-ambassadors': '#2D72D2',
  news: '#FF9900',
};

const CATEGORY_LABELS = {
  heroes: 'Heroes',
  'community-builders': 'Community Builders',
  'user-groups': 'User Groups',
  'cloud-clubs': 'Student Builder Groups',
  'kiro-ambassadors': 'Kiro',
  'kiro-events': 'Kiro Events',
  'community-days': 'Community Days',
  'aws-ambassadors': 'AWS Ambassador',
  news: 'News',
};

const DEFAULT_ROUTE_STATE = {
  activeCategory: 'heroes',
  selectedTag: null,
  selectedRegions: [],
  selectedCountries: [],
  globeDesign: 'orbit',
  darkMode: true,
  countrySpotlight: null,
  newOnly: false,
};

const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_LABELS));
const GLOBE_DESIGNS = ['orbit', 'classic', 'sleek', 'flat', 'geolibre', 'icons', 'list', 'experimental'];
const VALID_GLOBE_DESIGNS = new Set([...GLOBE_DESIGNS, 'insights']);
const ICON_VIEW_CATEGORIES = new Set(['heroes', 'community-builders', 'user-groups', 'cloud-clubs', 'kiro-ambassadors']);
const EVENT_CATEGORIES = new Set(['kiro-events', 'community-days', 'news']);
const NEW_ARRIVAL_CATEGORIES = new Set(['heroes', 'community-builders', 'user-groups', 'cloud-clubs']);

function getResponsiveDefaultGlobeDesign() {
  if (typeof window === 'undefined') return DEFAULT_ROUTE_STATE.globeDesign;
  return window.matchMedia('(max-width: 767px), (pointer: coarse), (prefers-reduced-motion: reduce)').matches
    ? 'sleek'
    : DEFAULT_ROUTE_STATE.globeDesign;
}

function getMemberCountry(member) {
  if (member?.country) return member.country;
  const parts = member?.location?.split(',') ?? [];
  return parts[parts.length - 1]?.trim() || null;
}

function getRouteSelections(params, key) {
  return [...new Set(params.getAll(key).map((value) => value.trim()).filter(Boolean))];
}

function getRouteStateFromUrl() {
  if (typeof window === 'undefined') return DEFAULT_ROUTE_STATE;

  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const view = params.get('view');
  const theme = params.get('theme');
  const spotlight = getCountrySpotlightFromParams(params);
  const newOnly = params.get('new') === '1';
  const experimental = view === 'experimental';
  const insights = view === 'insights' || view === 'trends';
  const defaultGlobeDesign = getResponsiveDefaultGlobeDesign();
  const resolvedCategory = experimental || insights
    ? 'heroes'
    : spotlight
      ? 'cloud-clubs'
      : VALID_CATEGORIES.has(tab)
        ? tab
        : DEFAULT_ROUTE_STATE.activeCategory;
  const spotlightKeys = Object.values(COUNTRY_SPOTLIGHTS).map(({ queryKey }) => queryKey);
  const hasShareState = ['tab', 'tag', 'region', 'country', 'view', 'theme', 'new', ...spotlightKeys]
    .some((key) => params.has(key));

  return {
    activeCategory: resolvedCategory,
    selectedTag: experimental || insights ? null : params.get('tag') || DEFAULT_ROUTE_STATE.selectedTag,
    selectedRegions: experimental || insights ? [] : spotlight ? [getRegionForCountry(spotlight.country)] : getRouteSelections(params, 'region'),
    selectedCountries: experimental || insights ? [] : spotlight ? [spotlight.country] : getRouteSelections(params, 'country'),
    globeDesign: experimental
      ? 'experimental'
      : insights
      ? 'insights'
      : spotlight
      ? 'classic'
      : VALID_GLOBE_DESIGNS.has(view)
        ? view
        : defaultGlobeDesign,
    darkMode: theme === 'light' ? false : DEFAULT_ROUTE_STATE.darkMode,
    countrySpotlight: experimental || insights ? null : spotlight?.country ?? null,
    newOnly: !experimental && !insights && NEW_ARRIVAL_CATEGORIES.has(resolvedCategory) && newOnly,
    hasShareState,
  };
}

function writeRouteStateToUrl({ activeCategory, selectedTag, selectedRegions, selectedCountries, globeDesign, darkMode, countrySpotlight, newOnly }) {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams();
  if (activeCategory !== DEFAULT_ROUTE_STATE.activeCategory) params.set('tab', activeCategory);
  if (selectedTag) params.set('tag', selectedTag);
  selectedRegions.forEach((region) => params.append('region', region));
  selectedCountries.forEach((country) => params.append('country', country));
  if (globeDesign !== DEFAULT_ROUTE_STATE.globeDesign) params.set('view', globeDesign);
  if (!darkMode) params.set('theme', 'light');
  const spotlightQueryKey = COUNTRY_SPOTLIGHTS[countrySpotlight]?.queryKey;
  if (spotlightQueryKey) params.set(spotlightQueryKey, '1');
  if (newOnly) params.set('new', '1');

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
const CommunityDaysScene = lazy(() => import('./components/CommunityDaysScene'));
const ExperimentalGlobeScene = lazy(() => import('./components/ExperimentalGlobeScene'));
const GeoLibreScene = lazy(() => import('./components/GeoLibreScene'));

export default function App() {
  const [routeState] = useState(() => getRouteStateFromUrl());
  const [showSplash, setShowSplash] = useState(!routeState.hasShareState);
  const [splashExiting, setSplashExiting] = useState(false);
  const [activeCategory, setActiveCategory] = useState(routeState.activeCategory);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedNewsItems, setSelectedNewsItems] = useState([]);
  const [selectedTag, setSelectedTag] = useState(routeState.selectedTag);
  const [selectedRegions, setSelectedRegions] = useState(routeState.selectedRegions);
  const [selectedCountries, setSelectedCountries] = useState(routeState.selectedCountries);
  const [darkMode, setDarkMode] = useState(routeState.darkMode);
  const [globeDesign, setGlobeDesign] = useState(routeState.globeDesign);
  const [zoomCommand, setZoomCommand] = useState({ direction: null, nonce: 0 });
  const [newsPanelOpen, setNewsPanelOpen] = useState(routeState.activeCategory === 'news');
  const [flyToOverride, setFlyToOverride] = useState(null);
  const [nearMeTarget, setNearMeTarget] = useState(
    routeState.countrySpotlight
      ? { ...COUNTRY_SPOTLIGHTS[routeState.countrySpotlight].center, nonce: 1 }
      : null
  );
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeError, setNearMeError] = useState(null);
  const [nearMeHover, setNearMeHover] = useState(false);
  const [newOnly, setNewOnly] = useState(routeState.newOnly);
  const [countrySpotlight, setCountrySpotlight] = useState(
    routeState.countrySpotlight ? { country: routeState.countrySpotlight, nonce: 1 } : null
  );
  const [webGlAvailable] = useState(canCreateWebGlContext);
  // Only fly when the user explicitly pressed Locate, not on every selection
  const selectedNewsFlyTarget = flyToOverride;
  const isCommunityDaysView = activeCategory === 'community-days';
  const isNewsView = activeCategory === 'news';
  const activeSection = globeDesign === 'experimental'
    ? 'experimental'
    : globeDesign === 'insights'
      ? 'insights'
      : EVENT_CATEGORIES.has(activeCategory) ? 'events' : 'community';
  const globeReady = !showSplash;

  const isCommunityBuilderView = activeCategory === 'community-builders';
  const isListView = globeDesign === 'list';
  const isIconView = globeDesign === 'icons';
  const isGeoLibreView = globeDesign === 'geolibre';
  const isExperimentalView = globeDesign === 'experimental';
  const isInsightsView = globeDesign === 'insights';
  const availableGlobeDesigns = GLOBE_DESIGNS.filter(
    (design) => design !== 'experimental' && (design !== 'icons' || ICON_VIEW_CATEGORIES.has(activeCategory))
  );
  const loadFullCommunityBuilders = isCommunityBuilderView && (
    isListView || isIconView || newOnly || Boolean(selectedTag || selectedRegions.length || selectedCountries.length)
  );
  const { error, members, loading } = useCategory(activeCategory, loadFullCommunityBuilders);
  const isKiroView = activeCategory === 'kiro-ambassadors' && members.length === 0 && !loading && !isListView;
  const isAwsAmbassadorView = activeCategory === 'aws-ambassadors' && members.length === 0 && !loading && !isListView;
  const { news, loading: newsLoading, error: newsError } = useNews(isNewsView);
  const ActiveGlobeScene =
    isGeoLibreView
      ? GeoLibreScene
      : !webGlAvailable
      ? SvgFlatMapScene
      : globeDesign === 'experimental'
        ? ExperimentalGlobeScene
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
        .map(getMemberCountry)
        .filter(Boolean)
    );
    return [...set].sort();
  }, [isCommunityBuilderView, members]);

  const countryCounts = useMemo(() => {
    if (isCommunityBuilderView) return communityBuilderMeta.countryCounts ?? {};

    const counts = {};
    members.forEach((member) => {
      if (!member.location) return;
      const country = getMemberCountry(member);
      if (!country) return;
      counts[country] = (counts[country] ?? 0) + 1;
    });
    return counts;
  }, [isCommunityBuilderView, members]);

  const regionCounts = useMemo(() => {
    const counts = {};
    Object.entries(countryCounts).forEach(([country, count]) => {
      const region = getRegionForCountry(country);
      if (region) counts[region] = (counts[region] ?? 0) + count;
    });
    return counts;
  }, [countryCounts]);

  const regions = useMemo(
    () => REGIONS.filter((region) => (regionCounts[region.id] ?? 0) > 0),
    [regionCounts]
  );

  const regionCountries = useMemo(
    () => selectedRegions.length
      ? countries.filter((country) => selectedRegions.includes(getRegionForCountry(country)))
      : countries,
    [countries, selectedRegions]
  );
  const country3dCountries = useMemo(
    () => countries.filter((country) => Boolean(getRegionForCountry(country))),
    [countries]
  );

  const directoryMembers = useMemo(() => {
    return members.filter((member) => {
      if (newOnly && !member.isNew) return false;
      if (selectedTag && member.tag !== selectedTag) return false;
      const country = getMemberCountry(member);
      if (selectedRegions.length && !selectedRegions.includes(getRegionForCountry(country))) return false;
      if (selectedCountries.length && !selectedCountries.includes(country)) return false;
      return true;
    });
  }, [members, newOnly, selectedTag, selectedRegions, selectedCountries]);

  const filteredMembers = useMemo(
    () => directoryMembers.filter((member) => member.lat !== 0 || member.lng !== 0),
    [directoryMembers]
  );

  const countrySpotlightMembers = useMemo(() => {
    if (activeCategory !== 'cloud-clubs' || !countrySpotlight?.country) return [];

    const spotlight = COUNTRY_SPOTLIGHTS[countrySpotlight.country];
    if (!spotlight) return [];

    return members
      .filter((member) => getMemberCountry(member) === spotlight.country)
      .map((member, index) => ({
        ...member,
        ...(spotlight.memberCoordinates?.[member.id] ?? {}),
        spotlightIndex: index,
      }));
  }, [activeCategory, countrySpotlight, members]);

  const flyToTarget = useMemo(() => {
    if (!selectedCountries.length) return null;

    const selectedCountrySet = new Set(selectedCountries);

    const matching = members.filter((member) => {
      if (member.lat === 0 && member.lng === 0) return false;
      return selectedCountrySet.has(getMemberCountry(member));
    });

    if (!matching.length) return null;

    const lat = matching.reduce((sum, member) => sum + member.lat, 0) / matching.length;
    const lng = matching.reduce((sum, member) => sum + member.lng, 0) / matching.length;
    return { lat, lng };
  }, [selectedCountries, members]);
  const resolvedFlyToTarget = nearMeTarget ?? flyToTarget;

  const displayedMembers = isListView ? directoryMembers : filteredMembers;
  const newMemberCount = isCommunityBuilderView && !loadFullCommunityBuilders
    ? (communityBuilderMeta.newTotal ?? 0)
    : members.filter((member) => member.isNew).length;
  const newArrivals = useMemo(
    () => directoryMembers
      .filter((member) => member.isNew)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [directoryMembers]
  );
  const isEmpty = !loading && !error && displayedMembers.length === 0;
  const hudCount = isCommunityBuilderView && !loadFullCommunityBuilders
    ? (communityBuilderMeta.total ?? filteredMembers.length)
    : filteredMembers.length;
  const hudSubLabel = newOnly
    ? 'new this month'
    : isCommunityBuilderView && !loadFullCommunityBuilders
    ? `${(communityBuilderMeta.mappedTotal ?? filteredMembers.length).toLocaleString()} mapped across ${members.length.toLocaleString()} locations`
    : selectedTag || selectedRegions.length || selectedCountries.length
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
  const viewControlBg = 'rgba(12, 25, 36, 0.9)';
  const viewControlBorder = 'rgba(104, 148, 180, 0.38)';
  const viewControlText = '#B7C6D2';
  const viewControlShadow = '0 14px 34px rgba(3, 12, 21, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.04)';
  const globeLoadingBg = darkMode ? 'rgba(7, 16, 25, 0.76)' : 'rgba(255, 255, 255, 0.8)';
  const globeLoadingBorder = darkMode ? 'rgba(62, 95, 123, 0.4)' : 'rgba(160, 187, 212, 0.72)';
  const globeLoadingText = darkMode ? '#A7BDCF' : '#537190';

  function designButtonStyles(design) {
    const active = globeDesign === design;
    return {
      position: 'relative',
      zIndex: 1,
      backgroundColor: 'transparent',
      color: active ? '#FFD54A' : viewControlText,
      cursor: 'pointer',
      minWidth: '64px',
      minHeight: '40px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      touchAction: 'manipulation',
      transition: 'color 220ms ease, transform 160ms ease',
    };
  }

  function designButtonLabel(design) {
    if (design === 'classic') return 'Atlas';
    if (design === 'orbit') return 'Earth';
    if (design === 'sleek') return 'Minimal';
    if (design === 'flat') return 'Map';
    if (design === 'geolibre') return 'GeoLibre';
    if (design === 'icons') return 'Gallery';
    if (design === 'list') return 'Directory';
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
      setSelectedCountries([cluster.country || parts[parts.length - 1]?.trim() || cluster.location]);
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
    setSelectedRegions([]);
    setSelectedCountries([]);
    setCountrySpotlight(null);
    setNewOnly(false);
    setActiveCategory(category);
    if (EVENT_CATEGORIES.has(category) || category === 'kiro-ambassadors') {
      setGlobeDesign(getResponsiveDefaultGlobeDesign());
    }
    if (category === 'news') setNewsPanelOpen(true);
  }, []);

  const handleSectionChange = useCallback((section) => {
    if (section === 'experimental') {
      handleCategoryChange('heroes');
      setGlobeDesign('experimental');
      return;
    }

    if (section === 'insights') {
      handleCategoryChange('heroes');
      setGlobeDesign('insights');
      return;
    }

    handleCategoryChange(section === 'events' ? 'kiro-events' : 'heroes');
    setGlobeDesign(getResponsiveDefaultGlobeDesign());
  }, [handleCategoryChange]);

  const handleRegionChange = useCallback((regions) => {
    setSelectedRegions(regions);
    if (regions.length) {
      setSelectedCountries((current) => (
        current.filter((country) => regions.includes(getRegionForCountry(country)))
      ));
    }
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

  const handleNewOnlyToggle = useCallback(() => {
    const next = !newOnly;
    setSelectedMember(null);
    setNearMeTarget(null);
    setNearMeError(null);

    if (next) {
      setSelectedTag(null);
      setSelectedRegions([]);
      setSelectedCountries([]);
      setCountrySpotlight(null);
    }

    setNewOnly(next);
  }, [newOnly]);

  const handleLocateNewArrival = useCallback((member) => {
    if (!Number.isFinite(member?.lat) || !Number.isFinite(member?.lng)) return;
    if (member.lat === 0 && member.lng === 0) return;

    setNearMeTarget({ lat: member.lat, lng: member.lng, nonce: Date.now() });
  }, []);

  const handleCountrySpotlight = useCallback((country) => {
    setNewOnly(false);

    if (countrySpotlight) {
      setSelectedTag(null);
      setSelectedRegions([]);
      setSelectedCountries([]);
      setNearMeTarget(null);
      setCountrySpotlight(null);
      setGlobeDesign('orbit');
      return;
    }

    const spotlight = COUNTRY_SPOTLIGHTS[country];
    if (!spotlight) return;

    setSelectedTag(null);
    setSelectedRegions([getRegionForCountry(country)]);
    setSelectedCountries([country]);
    setNearMeTarget({ ...spotlight.center, nonce: Date.now() });
    setGlobeDesign('classic');
    setCountrySpotlight({ country, nonce: Date.now() });
  }, [countrySpotlight]);

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
      selectedRegions,
      selectedCountries,
      globeDesign,
      darkMode,
      countrySpotlight: countrySpotlight?.country ?? null,
      newOnly,
    });
  }, [activeCategory, countrySpotlight?.country, darkMode, globeDesign, newOnly, selectedCountries, selectedRegions, selectedTag]);

  useEffect(() => {
    const handlePopState = () => {
      const nextRouteState = getRouteStateFromUrl();
      setSelectedMember(null);
      setSelectedNewsItems([]);
      setActiveCategory(nextRouteState.activeCategory);
      setSelectedTag(nextRouteState.selectedTag);
      setSelectedRegions(nextRouteState.selectedRegions);
      setSelectedCountries(nextRouteState.selectedCountries);
      setGlobeDesign(nextRouteState.globeDesign);
      setDarkMode(nextRouteState.darkMode);
      setNewsPanelOpen(nextRouteState.activeCategory === 'news');
      setNewOnly(nextRouteState.newOnly);
      const spotlight = COUNTRY_SPOTLIGHTS[nextRouteState.countrySpotlight];
      setNearMeTarget(spotlight ? { ...spotlight.center, nonce: Date.now() } : null);
      setCountrySpotlight(
        nextRouteState.countrySpotlight
          ? { country: nextRouteState.countrySpotlight, nonce: Date.now() }
          : null
      );
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
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
        {!isExperimentalView && !isInsightsView && (
          <TabNav
            activeCategory={activeCategory}
            onChange={handleCategoryChange}
            darkMode={darkMode}
            countries={isKiroView || isAwsAmbassadorView ? [] : regionCountries}
            countryCounts={isKiroView || isAwsAmbassadorView ? {} : countryCounts}
            regions={isKiroView || isAwsAmbassadorView ? [] : regions}
            regionCounts={isKiroView || isAwsAmbassadorView ? {} : regionCounts}
            selectedRegions={selectedRegions}
            onRegionChange={handleRegionChange}
            selectedCountries={selectedCountries}
            onCountryChange={setSelectedCountries}
            section={activeSection}
          />
        )}

        {!showSplash && !isExperimentalView && !isInsightsView && (
          <MobileNavigation
            darkMode={darkMode}
            section={activeSection}
            activeCategory={activeCategory}
            activeLabel={CATEGORY_LABELS[activeCategory] ?? activeCategory}
            resultCount={isNewsView ? newsItems.length : hudCount}
            onCategoryChange={handleCategoryChange}
            regions={isKiroView || isAwsAmbassadorView ? [] : regions}
            regionCounts={isKiroView || isAwsAmbassadorView ? {} : regionCounts}
            selectedRegions={selectedRegions}
            onRegionChange={handleRegionChange}
            countries={isKiroView || isAwsAmbassadorView ? [] : regionCountries}
            countryCounts={isKiroView || isAwsAmbassadorView ? {} : countryCounts}
            selectedCountries={selectedCountries}
            onCountryChange={setSelectedCountries}
            tags={!isCommunityDaysView && !isNewsView && !isKiroView && !isAwsAmbassadorView && hasTagFilters ? tags : []}
            selectedTag={selectedTag}
            onTagChange={setSelectedTag}
            globeDesign={globeDesign}
            globeDesigns={availableGlobeDesigns}
            onGlobeDesignChange={setGlobeDesign}
            globeDesignLabel={designButtonLabel}
            onNearMe={handleNearMe}
            nearMeLoading={nearMeLoading}
            canUseNearMe={!isListView && !isIconView && !isGeoLibreView}
            onThemeChange={setDarkMode}
            newOnly={newOnly}
            newMemberCount={newMemberCount}
            canShowNewArrivals={NEW_ARRIVAL_CATEGORIES.has(activeCategory) && (newMemberCount > 0 || newOnly)}
            onNewOnlyToggle={handleNewOnlyToggle}
          />
        )}

        {!isExperimentalView && !isInsightsView && !isCommunityDaysView && !isNewsView && activeCategory !== 'kiro-ambassadors' && !isKiroView && !isAwsAmbassadorView && hasTagFilters && (
          <div
            className="desktop-tag-filter-bar flex items-center gap-2 overflow-x-auto px-4 py-2"
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

        {activeError && !isInsightsView && (
          <div
            role="alert"
            className="px-4 py-2 text-center text-sm"
            style={{ backgroundColor: '#BF0816', color: '#FFFFFF' }}
          >
            {activeError}
          </div>
        )}

        <div className="relative flex-1" style={{ minHeight: 0 }}>
          {isInsightsView ? (
            <Suspense fallback={renderGlobeLoading('Loading community insights...')}>
              <InsightsDashboard darkMode={darkMode} />
            </Suspense>
          ) : isCommunityDaysView ? (
            <Suspense fallback={renderGlobeLoading('Loading Community Days...')}>
              <CommunityDaysScene
                darkMode={darkMode}
                Scene={ActiveGlobeScene}
                globeDesign={globeDesign}
                onDesignChange={setGlobeDesign}
                zoomCommand={zoomCommand}
                onZoom={triggerZoom}
                onNearMe={handleNearMe}
                nearMeLoading={nearMeLoading}
                flyToTarget={resolvedFlyToTarget}
                selectedRegions={selectedRegions}
                selectedCountries={selectedCountries}
              />
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
                {isListView ? (
                  <ListScene
                    key="news-list"
                    category="news"
                    newsItems={newsItems}
                    loading={newsLoading}
                    darkMode={darkMode}
                  />
                ) : globeReady ? (
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

                {!isListView && globeReady && newsLoading && (
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
                  className="mobile-globe-controls absolute bottom-5 z-20"
                  style={{ left: newsPanelOpen ? '50%' : '50%', transform: 'translateX(-50%)' }}
                >
                  <div className="flex items-stretch gap-3">
                    <div
                      className="grid items-center rounded-full p-1"
                      style={{
                        position: 'relative',
                        '--design-count': availableGlobeDesigns.length,
                        gridTemplateColumns: `repeat(${availableGlobeDesigns.length}, minmax(64px, 1fr))`,
                        background: viewControlBg,
                        border: `1px solid ${viewControlBorder}`,
                        boxShadow: viewControlShadow,
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                      }}
                      aria-label="Globe design switcher"
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: '4px',
                          top: '4px',
                          bottom: '4px',
                          width: `calc((100% - 8px) / ${availableGlobeDesigns.length})`,
                          borderRadius: '999px',
                          background: '#0B111B',
                          boxShadow: 'inset 0 0 0 1px #FF9900, 0 5px 16px rgba(3, 12, 21, 0.38)',
                          transform: `translate3d(${Math.max(0, availableGlobeDesigns.indexOf(globeDesign)) * 100}%, 0, 0)`,
                          transition: 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
                          willChange: 'transform',
                          pointerEvents: 'none',
                        }}
                      />
                      {availableGlobeDesigns.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setGlobeDesign(d)}
                          className="rounded-full px-3 py-1 text-xs font-semibold capitalize active:scale-[0.97]"
                          style={designButtonStyles(d)}
                        >
                          {designButtonLabel(d)}
                        </button>
                      ))}
                    </div>

                    <div
                      className={`${isListView || isGeoLibreView ? 'hidden' : 'flex'} items-center rounded-full p-1`}
                      style={{
                        background: viewControlBg,
                        border: `1px solid ${viewControlBorder}`,
                        boxShadow: viewControlShadow,
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
                          className="map-zoom-button rounded-full px-3 py-1 text-sm font-semibold"
                          style={{
                            color: viewControlText,
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
                      className={`${isListView || isGeoLibreView ? 'hidden' : ''} rounded-full px-4 py-1 text-xs font-semibold`}
                      style={{
                        backgroundColor: nearMeLoading ? '#182735' : nearMeHover ? '#182B3A' : viewControlBg,
                        color: nearMeLoading ? '#6F8291' : nearMeHover ? '#FFD54A' : viewControlText,
                        minHeight: '44px',
                        border: `1px solid ${nearMeHover && !nearMeLoading ? '#FF9900' : viewControlBorder}`,
                        boxShadow: viewControlShadow,
                        transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                        cursor: nearMeLoading ? 'wait' : 'pointer',
                        touchAction: 'manipulation',
                        whiteSpace: 'nowrap',
                      }}
                      aria-label="Near me"
                    >
                      {nearMeLoading ? 'Locating...' : 'Near Me'}
                    </button>
                  </div>
                </div>

                {!isListView && !newsLoading && newsMarkers.length === 0 && (
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
                className={`${isListView ? 'hidden' : 'flex'} absolute z-30 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold shadow-lg transition-all`}
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
                className={`${isListView ? 'hidden' : 'flex'} absolute inset-y-0 right-0 z-20 flex-col`}
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
              {isIconView ? (
                <IconArchiveScene
                  key={`${activeCategory}-${selectedTag ?? 'all'}-${selectedRegions.join('|') || 'all-regions'}-${selectedCountries.join('|') || 'all'}-icons`}
                  category={activeCategory}
                  members={directoryMembers}
                  loading={loading}
                  darkMode={darkMode}
                />
              ) : isListView ? (
                <ListScene
                  key={`${activeCategory}-${selectedTag ?? 'all'}-${selectedRegions.join('|') || 'all-regions'}-${selectedCountries.join('|') || 'all'}-list`}
                  category={activeCategory}
                  members={directoryMembers}
                  loading={loading}
                  darkMode={darkMode}
                  onItemClick={handleMarkerClick}
                />
              ) : globeReady ? (
                <Suspense
                  fallback={renderGlobeLoading()}
                >
                  <div key={`${globeDesign}-${countrySpotlight?.country ?? 'global'}-${countrySpotlight?.nonce ?? 0}`} style={{ width: '100%', height: '100%', animation: 'globe-scene-in 0.4s ease both' }}>
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
                        countrySpotlight: activeCategory === 'cloud-clubs' && countrySpotlight ? {
                          ...COUNTRY_SPOTLIGHTS[countrySpotlight.country],
                          ...countrySpotlight,
                          members: countrySpotlightMembers,
                        } : null,
                      },
                      `${activeCategory}-${globeDesign}-${selectedTag ?? 'all'}-${selectedRegions.join('|') || 'all-regions'}-${selectedCountries.join('|') || 'all'}-${darkMode}-${countrySpotlight?.country ?? 'global'}-${countrySpotlight?.nonce ?? 0}`
                    )}
                    {activeCategory === 'kiro-ambassadors' && !loading && <KiroAvatarOverlay />}
                  </div>
                </Suspense>
              ) : (
                <div className={`relative h-full w-full overflow-hidden ${darkMode ? 'aws-globe-bg-dark' : 'aws-globe-bg-light'}`}>
                  <div className="aws-globe-pattern" />
                </div>
              )}

              {!isListView && !isIconView && globeReady && loading && (
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

              {!isExperimentalView && <div
                className={`${isListView || isIconView ? 'hidden' : ''} absolute top-4 left-4 z-20 pointer-events-none`}
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
              </div>}

              <div className="mobile-globe-controls absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
                <div className="flex items-stretch gap-3">
                  {!countrySpotlight && !isExperimentalView && (
                    <>
                      <div
                        className="grid items-center rounded-full p-1"
                        style={{
                          position: 'relative',
                          '--design-count': availableGlobeDesigns.length,
                          gridTemplateColumns: `repeat(${availableGlobeDesigns.length}, minmax(64px, 1fr))`,
                          background: viewControlBg,
                          border: `1px solid ${viewControlBorder}`,
                          boxShadow: viewControlShadow,
                          backdropFilter: 'blur(14px)',
                          WebkitBackdropFilter: 'blur(14px)',
                        }}
                        aria-label="Globe design switcher"
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            left: '4px',
                            top: '4px',
                            bottom: '4px',
                            width: `calc((100% - 8px) / ${availableGlobeDesigns.length})`,
                            borderRadius: '999px',
                            background: '#0B111B',
                            boxShadow: 'inset 0 0 0 1px #FF9900, 0 5px 16px rgba(3, 12, 21, 0.38)',
                            transform: `translate3d(${Math.max(0, availableGlobeDesigns.indexOf(globeDesign)) * 100}%, 0, 0)`,
                            transition: 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
                            willChange: 'transform',
                            pointerEvents: 'none',
                          }}
                        />
                        {availableGlobeDesigns.map((design) => (
                          <button
                            key={design}
                            type="button"
                            onClick={() => setGlobeDesign(design)}
                            className="rounded-full px-3 py-1 text-xs font-semibold active:scale-[0.97]"
                            style={designButtonStyles(design)}
                          >
                            {designButtonLabel(design)}
                          </button>
                        ))}
                      </div>

                      <div
                            className={`${isListView || isIconView || isGeoLibreView ? 'hidden' : 'flex'} items-center rounded-full p-1`}
                        style={{
                          background: viewControlBg,
                          border: `1px solid ${viewControlBorder}`,
                          boxShadow: viewControlShadow,
                          backdropFilter: 'blur(14px)',
                          WebkitBackdropFilter: 'blur(14px)',
                        }}
                        aria-label="Zoom controls"
                      >
                        <button
                          type="button"
                          onClick={() => triggerZoom('out')}
                          className="map-zoom-button rounded-full px-3 py-1 text-sm font-semibold"
                          style={{
                            color: viewControlText,
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
                          className="map-zoom-button rounded-full px-3 py-1 text-sm font-semibold"
                          style={{
                            color: viewControlText,
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
                      className={`${isListView || isIconView || isGeoLibreView ? 'hidden' : ''} rounded-full px-4 py-1 text-xs font-semibold`}
                        style={{
                          backgroundColor: nearMeLoading ? '#182735' : nearMeHover ? '#182B3A' : viewControlBg,
                          color: nearMeLoading ? '#6F8291' : nearMeHover ? '#FFD54A' : viewControlText,
                          minHeight: '44px',
                          border: `1px solid ${nearMeHover && !nearMeLoading ? '#FF9900' : viewControlBorder}`,
                          boxShadow: viewControlShadow,
                          transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                          cursor: nearMeLoading ? 'wait' : 'pointer',
                          touchAction: 'manipulation',
                          whiteSpace: 'nowrap',
                        }}
                        aria-label="Near me"
                      >
                        {nearMeLoading ? 'Locating...' : 'Near Me'}
                      </button>

                      {NEW_ARRIVAL_CATEGORIES.has(activeCategory) && (newMemberCount > 0 || newOnly) ? (
                        <button
                          type="button"
                          onClick={handleNewOnlyToggle}
                          className="new-arrivals-toggle rounded-full px-4 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: newOnly ? '#FF9900' : viewControlBg,
                            color: newOnly ? '#0F1923' : viewControlText,
                            minHeight: '44px',
                            border: `1px solid ${newOnly ? '#FF9900' : viewControlBorder}`,
                            boxShadow: viewControlShadow,
                            transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.15s ease',
                            cursor: 'pointer',
                            touchAction: 'manipulation',
                            whiteSpace: 'nowrap',
                          }}
                          aria-label={`${newOnly ? 'Show all' : 'Show'} new ${CATEGORY_LABELS[activeCategory] ?? 'community members'}`}
                          aria-pressed={newOnly}
                        >
                          <SparkleIcon size={14} weight="fill" aria-hidden="true" />
                          <span>{newOnly ? 'Show All' : `New ${newMemberCount}`}</span>
                        </button>
                      ) : null}
                    </>
                  )}

                  {activeCategory === 'cloud-clubs' && (
                    <Country3DControl
                      activeCountry={countrySpotlight?.country ?? null}
                      countries={country3dCountries}
                      countryCounts={countryCounts}
                      darkMode={darkMode}
                      onExit={() => handleCountrySpotlight(countrySpotlight?.country)}
                      onOpenCountry={handleCountrySpotlight}
                    />
                  )}
                </div>
              </div>

              {!isListView && isEmpty && (
                <div
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                  style={{ color: '#8B9BAA' }}
                >
                  <span style={{ fontSize: '2.5rem' }}>🌐</span>
                  <p className="mt-3 text-sm">{newOnly ? 'No new arrivals in this category.' : 'No results for the selected filters.'}</p>
                </div>
              )}

              {newOnly && !isListView && !isIconView ? (
                <NewArrivalsPanel
                  category={activeCategory}
                  members={newArrivals}
                  loading={loading}
                  darkMode={darkMode}
                  onClose={handleNewOnlyToggle}
                  onLocate={handleLocateNewArrival}
                  onSelect={handleMarkerClick}
                />
              ) : null}
            </>
          )}

        </div>

        {!isInsightsView && !isNewsView && !isKiroView && !isAwsAmbassadorView && selectedMember && (
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
        <SplashScreen
          onStart={handleSplashStart}
          exiting={splashExiting}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
      </Suspense>
    )}
    </div>
  );
}
