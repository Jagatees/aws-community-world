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
  const [darkMode, setDarkMode] = useState(true);

  const { error, members, loading } = useCategory(activeCategory);

  const tags = useMemo(() => {
    const set = new Set(members.map((m) => m.tag).filter(Boolean));
    return [...set].sort();
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (m.lat === 0 && m.lng === 0) return false;
      if (selectedTag && m.tag !== selectedTag) return false;
      return true;
    });
  }, [members, selectedTag]);

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
      <Header darkMode={darkMode} onToggleDark={() => setDarkMode((d) => !d)} />
      <TabNav activeCategory={activeCategory} onChange={handleCategoryChange} darkMode={darkMode} />
      <TagFilter tags={tags} selected={selectedTag} onChange={setSelectedTag} darkMode={darkMode} />

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
        />
        {isEmpty && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ color: '#8B9BAA' }}
          >
            <span style={{ fontSize: '2.5rem' }}>🌐</span>
            <p className="mt-3 text-sm">No public data available for this category yet.</p>
          </div>
        )}
      </div>

      {selectedMember && (
        <ProfileCard member={selectedMember} onClose={handleClose} darkMode={darkMode} />
      )}
    </div>
  );
}
