import { useState, useCallback, useMemo } from 'react';
import Header from './components/Header';
import TabNav from './components/TabNav';
import CobeGlobeScene from './components/GlobeScene';
import ClassicGlobeScene from './components/ClassicGlobeScene';
import FlatMapScene from './components/FlatMapScene';
import ProfileCard from './components/ProfileCard';
import TagFilter from './components/TagFilter';
import { useCategory } from './hooks/useCategory';

export default function App() {
  const [activeCategory, setActiveCategory] = useState('heroes');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [globeDesign, setGlobeDesign] = useState('cobe');
  const [spotlightMember, setSpotlightMember] = useState(null);
  const [exploreHistory, setExploreHistory] = useState([]);
  const [exploreIndex, setExploreIndex] = useState(-1);
  const [exploreMembersKey, setExploreMembersKey] = useState('');

  const { error, members, loading } = useCategory(activeCategory);
  const ActiveGlobeScene =
    globeDesign === 'classic'
      ? ClassicGlobeScene
      : globeDesign === 'flat'
        ? FlatMapScene
        : CobeGlobeScene;

  const tags = useMemo(() => {
    const set = new Set(members.map((m) => m.tag).filter(Boolean));
    return [...set].sort();
  }, [members]);
  const hasTagFilters = tags.length > 0;

  // Derive country list from the last segment of location string (e.g. "Tokyo, Japan" → "Japan")
  const countries = useMemo(() => {
    const set = new Set(
      members
        .map((m) => {
          if (!m.location) return null;
          const parts = m.location.split(',');
          return parts[parts.length - 1].trim();
        })
        .filter(Boolean)
    );
    return [...set].sort();
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (m.lat === 0 && m.lng === 0) return false;
      if (selectedTag && m.tag !== selectedTag) return false;
      if (selectedCountry) {
        const parts = m.location?.split(',') ?? [];
        const country = parts[parts.length - 1]?.trim();
        if (country !== selectedCountry) return false;
      }
      return true;
    });
  }, [members, selectedTag, selectedCountry]);

  // When country changes, compute centroid of matching members to fly to
  const flyToTarget = useMemo(() => {
    if (!selectedCountry) return null;
    const matching = members.filter((m) => {
      if (m.lat === 0 && m.lng === 0) return false;
      const parts = m.location?.split(',') ?? [];
      return parts[parts.length - 1]?.trim() === selectedCountry;
    });
    if (!matching.length) return null;
    const lat = matching.reduce((s, m) => s + m.lat, 0) / matching.length;
    const lng = matching.reduce((s, m) => s + m.lng, 0) / matching.length;
    return { lat, lng };
  }, [selectedCountry, members]);

  const isEmpty = !loading && !error && filteredMembers.length === 0;
  const filteredMembersKey = useMemo(
    () => filteredMembers.map((member) => member.id).join('|'),
    [filteredMembers]
  );
  const activeSpotlightMember = useMemo(
    () =>
      spotlightMember && filteredMembers.some((member) => member.id === spotlightMember.id)
        ? spotlightMember
        : null,
    [spotlightMember, filteredMembers]
  );
  const effectiveFlyToTarget = activeSpotlightMember
    ? { lat: activeSpotlightMember.lat, lng: activeSpotlightMember.lng }
    : flyToTarget;
  const canGoBackExplore =
    exploreMembersKey === filteredMembersKey && exploreIndex > 0;

  const handleMarkerClick = useCallback((member) => {
    setSelectedMember(member);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedMember(null);
  }, []);

  const handleCategoryChange = useCallback((category) => {
    setSelectedMember(null);
    setSelectedTag(null);
    setSpotlightMember(null);
    setActiveCategory(category);
  }, []);

  const pickRandomMember = useCallback((excludeIds = []) => {
    if (!filteredMembers.length) return null;

    const pool = filteredMembers.filter((member) => !excludeIds.includes(member.id));
    const source = pool.length ? pool : filteredMembers;
    return source[Math.floor(Math.random() * source.length)] ?? null;
  }, [filteredMembers]);

  const focusMember = useCallback((member) => {
    if (!member) return;
    setSpotlightMember(member);
    setSelectedMember(member);
  }, []);

  const handleExplorePrevious = useCallback(() => {
    if (exploreMembersKey !== filteredMembersKey || exploreIndex <= 0) return;

    const nextIndex = exploreIndex - 1;
    const nextMember = exploreHistory[nextIndex];
    setExploreIndex(nextIndex);
    focusMember(nextMember);
  }, [exploreHistory, exploreIndex, exploreMembersKey, filteredMembersKey, focusMember]);

  const handleExploreNext = useCallback(() => {
    if (!filteredMembers.length) return;

    let history = exploreHistory;
    let index = exploreIndex;

    if (exploreMembersKey !== filteredMembersKey) {
      history = [];
      index = -1;
      setExploreMembersKey(filteredMembersKey);
      setExploreHistory([]);
      setExploreIndex(-1);
    }

    if (index < history.length - 1) {
      const nextIndex = index + 1;
      const nextMember = history[nextIndex];
      setExploreIndex(nextIndex);
      focusMember(nextMember);
      return;
    }

    const seenIds = history.map((member) => member.id);
    const nextMember = pickRandomMember(seenIds);
    if (!nextMember) return;

    const nextHistory = [...history, nextMember];
    setExploreMembersKey(filteredMembersKey);
    setExploreHistory(nextHistory);
    setExploreIndex(nextHistory.length - 1);
    focusMember(nextMember);
  }, [
    exploreHistory,
    exploreIndex,
    exploreMembersKey,
    filteredMembers,
    filteredMembersKey,
    focusMember,
    pickRandomMember,
  ]);

  const filterBarBg = darkMode ? 'rgba(15, 25, 35, 0.55)' : 'rgba(255, 255, 255, 0.58)';
  const exploreBg = darkMode ? 'rgba(8, 16, 24, 0.78)' : 'rgba(255, 255, 255, 0.86)';
  const exploreBorder = darkMode ? 'rgba(76, 109, 138, 0.45)' : 'rgba(160, 187, 212, 0.85)';
  const exploreText = darkMode ? '#DCE7F0' : '#17324B';

  return (
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

      <div className="relative z-10 flex flex-col min-h-0 flex-1">
      <Header
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        globeDesign={globeDesign}
        onGlobeDesignChange={setGlobeDesign}
      />
      <TabNav
        activeCategory={activeCategory}
        onChange={handleCategoryChange}
        darkMode={darkMode}
        countries={countries}
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
      />

      {hasTagFilters && (
        <div
          className="flex items-center gap-2 px-4 py-2 overflow-x-auto"
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

      {error && (
        <div
          role="alert"
          className="px-4 py-2 text-sm text-center"
          style={{ backgroundColor: '#BF0816', color: '#FFFFFF' }}
        >
          {error}
        </div>
      )}

      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <ActiveGlobeScene
          category={activeCategory}
          members={filteredMembers}
          onMarkerClick={handleMarkerClick}
          cardOpen={!!selectedMember}
          darkMode={darkMode}
          flyToTarget={effectiveFlyToTarget}
        />
        {!!filteredMembers.length && (
          <div className="absolute left-1/2 bottom-5 -translate-x-1/2 z-20 flex items-center gap-3">
            <button
              type="button"
              onClick={handleExplorePrevious}
              disabled={!canGoBackExplore}
              className="h-12 w-12 rounded-full text-xl font-semibold transition-opacity"
              style={{
                color: exploreText,
                background: exploreBg,
                border: `1px solid ${exploreBorder}`,
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                opacity: canGoBackExplore ? 1 : 0.45,
                cursor: canGoBackExplore ? 'pointer' : 'not-allowed',
              }}
              aria-label="Previous random spotlight"
            >
              ←
            </button>

            <button
              type="button"
              onClick={handleExploreNext}
              className="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
              style={{
                color: exploreText,
                background: exploreBg,
                border: `1px solid ${exploreBorder}`,
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
              }}
              aria-label="Go to a random visible member"
            >
              Random Spotlight
            </button>

            <button
              type="button"
              onClick={handleExploreNext}
              className="h-12 w-12 rounded-full text-xl font-semibold"
              style={{
                color: exploreText,
                background: exploreBg,
                border: `1px solid ${exploreBorder}`,
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
              }}
              aria-label="Next random spotlight"
            >
              →
            </button>
          </div>
        )}
        {isEmpty && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ color: '#8B9BAA' }}
          >
            <span style={{ fontSize: '2.5rem' }}>🌐</span>
            <p className="mt-3 text-sm">No results for the selected filters.</p>
          </div>
        )}
      </div>

      {selectedMember && (
        <ProfileCard member={selectedMember} onClose={handleClose} darkMode={darkMode} />
      )}
      </div>
    </div>
  );
}
