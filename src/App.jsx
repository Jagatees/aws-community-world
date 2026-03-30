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
  const [globeDesign, setGlobeDesign] = useState('classic');

  const { error, members, loading } = useCategory(activeCategory);
  const ActiveGlobeScene =
    globeDesign === 'classic'
      ? ClassicGlobeScene
      : globeDesign === 'flat'
        ? FlatMapScene
        : CobeGlobeScene;

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

  const isEmpty = !loading && !error && filteredMembers.length === 0;
  const filterBarBg = darkMode ? 'rgba(15, 25, 35, 0.55)' : 'rgba(255, 255, 255, 0.58)';
  const styleControlBg = darkMode ? 'rgba(8, 16, 24, 0.78)' : 'rgba(255, 255, 255, 0.86)';
  const styleControlBorder = darkMode ? 'rgba(76, 109, 138, 0.45)' : 'rgba(160, 187, 212, 0.85)';
  const styleControlText = darkMode ? '#DCE7F0' : '#17324B';

  function designButtonStyles(design) {
    const active = globeDesign === design;
    return {
      backgroundColor: active ? '#FF9900' : 'transparent',
      color: active ? '#0F1923' : styleControlText,
    };
  }

  const handleMarkerClick = useCallback((member) => {
    setSelectedMember(member);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedMember(null);
  }, []);

  const handleCategoryChange = useCallback((category) => {
    setSelectedMember(null);
    setSelectedTag(null);
    setSelectedCountry(null);
    setActiveCategory(category);
  }, []);

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

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Header
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((value) => !value)}
        />
        <TabNav
          activeCategory={activeCategory}
          onChange={handleCategoryChange}
          darkMode={darkMode}
          countries={countries}
          countryCounts={countryCounts}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
        />

        {hasTagFilters && (
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

        {error && (
          <div
            role="alert"
            className="px-4 py-2 text-center text-sm"
            style={{ backgroundColor: '#BF0816', color: '#FFFFFF' }}
          >
            {error}
          </div>
        )}

        <div className="relative flex-1" style={{ minHeight: 0 }}>
          <ActiveGlobeScene
            category={activeCategory}
            members={filteredMembers}
            onMarkerClick={handleMarkerClick}
            cardOpen={!!selectedMember}
            darkMode={darkMode}
            flyToTarget={flyToTarget}
          />
          <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
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
                onClick={() => setGlobeDesign('classic')}
                className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                style={designButtonStyles('classic')}
              >
                Classic
              </button>
              <button
                type="button"
                onClick={() => setGlobeDesign('cobe')}
                className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                style={designButtonStyles('cobe')}
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
        </div>

        {selectedMember && (
          <ProfileCard member={selectedMember} onClose={handleClose} darkMode={darkMode} />
        )}
      </div>
    </div>
  );
}
