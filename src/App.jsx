import { useState, useCallback, useMemo } from 'react';
import Header from './components/Header';
import TabNav from './components/TabNav';
import GlobeScene from './components/GlobeScene';
import ProfileCard from './components/ProfileCard';
import TagFilter from './components/TagFilter';
import { useCategory } from './hooks/useCategory';

export default function App() {
  const [activeCategory, setActiveCategory] = useState('heroes');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [globeStyle, setGlobeStyle] = useState('realistic');

  const { error, members, loading } = useCategory(activeCategory);

  const tags = useMemo(() => {
    const set = new Set(members.map((m) => m.tag).filter(Boolean));
    return [...set].sort();
  }, [members]);

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

  const handleMarkerClick = useCallback((member) => {
    setSelectedMember(member);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedMember(null);
  }, []);

  const handleCategoryChange = useCallback((category) => {
    setSelectedMember(null);
    setSelectedTag(null);
    setActiveCategory(category);
  }, []);

  const bg = darkMode ? '#0F1923' : '#e8f0f7';

  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', backgroundColor: bg, overflow: 'hidden' }}
    >
      <Header darkMode={darkMode} onToggleDark={() => setDarkMode((d) => !d)} globeStyle={globeStyle} onToggleGlobeStyle={() => setGlobeStyle((s) => s === 'realistic' ? 'neon' : 'realistic')} />
      <TabNav
        activeCategory={activeCategory}
        onChange={handleCategoryChange}
        darkMode={darkMode}
        countries={countries}
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
      />

      {/* Filter bar — tag pills only */}
      <div
        className="flex items-center gap-2 px-4 py-2 overflow-x-auto"
        style={{ backgroundColor: darkMode ? '#0F1923' : '#e8f0f7', scrollbarWidth: 'none', flexShrink: 0 }}
      >
        <TagFilter tags={tags} selected={selectedTag} onChange={setSelectedTag} darkMode={darkMode} />
      </div>

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
        <GlobeScene
          category={activeCategory}
          members={filteredMembers}
          onMarkerClick={handleMarkerClick}
          cardOpen={!!selectedMember}
          darkMode={darkMode}
          flyToTarget={flyToTarget}
          globeStyle={globeStyle}
        />
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
  );
}
