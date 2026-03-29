import { useState, useCallback, useMemo } from 'react';
import Header from './components/Header';
import TabNav from './components/TabNav';
import GlobeScene from './components/GlobeScene';
import ProfileCard from './components/ProfileCard';
import TagFilter from './components/TagFilter';
import { useCategory } from './hooks/useCategory';

/**
 * Root application component.
 * Manages active category and selected member state (Req 3.2, 5.1, 6.2).
 */
export default function App() {
  /** @type {[import('./types').CategoryKey, Function]} */
  const [activeCategory, setActiveCategory] = useState('heroes');

  /** @type {[import('./types').Member | import('./types').Member[] | null, Function]} */
  const [selectedMember, setSelectedMember] = useState(null);

  /** @type {[string | null, Function]} */
  const [selectedTag, setSelectedTag] = useState(null);

  // Surface data load errors from the active category (Req 6.2)
  const { error, members, loading } = useCategory(activeCategory);

  // Derive unique tags from current category members
  const tags = useMemo(() => {
    const set = new Set(members.map((m) => m.tag).filter(Boolean));
    return [...set].sort();
  }, [members]);

  // Apply tag filter, and drop members with no real coordinates (lat/lng 0,0)
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

  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', backgroundColor: '#0F1923', overflow: 'hidden' }}
    >
      <Header />
      <TabNav activeCategory={activeCategory} onChange={handleCategoryChange} />
      <TagFilter tags={tags} selected={selectedTag} onChange={setSelectedTag} />

      {/* Error banner (Req 6.2) */}
      {error && (
        <div
          role="alert"
          className="px-4 py-2 text-sm text-center"
          style={{ backgroundColor: '#BF0816', color: '#FFFFFF' }}
        >
          {error}
        </div>
      )}

      {/* Globe fills remaining space */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <GlobeScene
          category={activeCategory}
          members={filteredMembers}
          onMarkerClick={handleMarkerClick}
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

      {/* Profile card overlay (Req 5.1) */}
      {selectedMember && (
        <ProfileCard member={selectedMember} onClose={handleClose} />
      )}
    </div>
  );
}
