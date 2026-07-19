import { useRef, useLayoutEffect, useEffect } from 'react';
import CountryDropdown from './CountryDropdown';
import RegionDropdown from './RegionDropdown';

/** @typedef {import('../types.js').CategoryKey} CategoryKey */

const COMMUNITY_TABS = [
  { label: 'Heroes', key: 'heroes' },
  { label: 'Community Builders', key: 'community-builders' },
  { label: 'User Groups', key: 'user-groups' },
  { label: 'Student Builder Groups', key: 'cloud-clubs' },
  { label: 'Kiro Ambassadors', key: 'kiro-ambassadors' },
];

const EVENT_TABS = [
  { label: 'Kiro Events', key: 'kiro-events' },
  { label: 'Community Days', key: 'community-days' },
  { label: 'News', key: 'news' },
];

const CATEGORY_ACCENTS = {
  heroes: '#FF9900',
  'community-builders': '#1A9C3E',
  'user-groups': '#00A1C9',
  'cloud-clubs': '#BF0816',
  'kiro-ambassadors': '#8B5CF6',
  'kiro-events': '#7B61FF',
  'community-days': '#FF9900',
  news: '#FF9900',
};

/**
 * @param {{
 *   activeCategory: CategoryKey;
 *   onChange: (category: CategoryKey) => void;
 *   darkMode: boolean;
 *   countries: string[];
 *   countryCounts: Record<string, number>;
 *   selectedRegions: string[];
 *   onRegionChange: (regions: string[]) => void;
 *   selectedCountries: string[];
 *   onCountryChange: (countries: string[]) => void;
 *   section: 'community' | 'events';
 * }} props
 */
export default function TabNav({
  activeCategory,
  onChange,
  darkMode,
  countries,
  countryCounts = {},
  regions = [],
  regionCounts = {},
  selectedRegions,
  onRegionChange,
  selectedCountries,
  onCountryChange,
  section = 'community',
}) {
  const surface = darkMode ? 'rgba(27, 40, 54, 0.62)' : 'rgba(255, 255, 255, 0.72)';
  const border = darkMode ? 'rgba(45, 63, 80, 0.7)' : 'rgba(208, 220, 232, 0.92)';
  const activeBg = darkMode ? 'rgba(36, 52, 71, 0.88)' : 'rgba(240, 247, 255, 0.94)';
  const activeText = darkMode ? '#FFFFFF' : '#0F1923';
  const inactiveText = darkMode ? '#8B9BAA' : '#5a7a99';
  const divider = darkMode ? 'rgba(115, 145, 171, 0.34)' : 'rgba(134, 162, 190, 0.5)';
  const activeAccent = CATEGORY_ACCENTS[activeCategory] ?? '#FF9900';
  const hasFilters = regions.length > 0 || countries.length > 0;

  const navRef = useRef(null);
  const indicatorRef = useRef(null);
  const buttonRefs = useRef({});
  const isFirstRender = useRef(true);

  useLayoutEffect(() => {
    const activeBtn = buttonRefs.current[activeCategory];
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    if (!activeBtn || !nav || !indicator) return;

    const btnRect = activeBtn.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const left = btnRect.left - navRect.left + nav.scrollLeft;
    const width = btnRect.width;

    if (isFirstRender.current) {
      // Snap into place on first render — no animation
      indicator.style.transition = 'none';
      indicator.style.left = `${left}px`;
      indicator.style.width = `${width}px`;
      isFirstRender.current = false;
    } else {
      indicator.style.transition = 'left 0.28s cubic-bezier(0.4, 0, 0.2, 1), width 0.28s cubic-bezier(0.4, 0, 0.2, 1)';
      indicator.style.left = `${left}px`;
      indicator.style.width = `${width}px`;
    }

    activeBtn.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [activeCategory]);

  // Re-measure on darkMode change (fonts/sizes can shift)
  useEffect(() => {
    const activeBtn = buttonRefs.current[activeCategory];
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    if (!activeBtn || !nav || !indicator) return;

    const btnRect = activeBtn.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    indicator.style.transition = 'none';
    indicator.style.left = `${btnRect.left - navRect.left + nav.scrollLeft}px`;
    indicator.style.width = `${btnRect.width}px`;
  }, [darkMode, activeCategory]);

  return (
    <div
      className={`category-nav-shell${hasFilters ? ' has-filters' : ''}`}
      style={{
        '--category-nav-surface': surface,
        '--category-nav-border': border,
        '--category-active-bg': activeBg,
        '--category-accent': activeAccent,
        backgroundColor: surface,
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${border}`,
      }}
    >
      <nav
        ref={navRef}
        role="tablist"
        aria-label="Community categories"
        className="category-tab-list"
        style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none', position: 'relative' }}
      >
        {/* Sliding indicator bar */}
        <div
          ref={indicatorRef}
          aria-hidden="true"
          className="category-tab-indicator"
          style={{
            position: 'absolute',
            bottom: 0,
            height: '3px',
            backgroundColor: activeAccent,
            borderRadius: '2px 2px 0 0',
            pointerEvents: 'none',
            boxShadow: `0 0 8px color-mix(in srgb, ${activeAccent} 65%, transparent)`,
          }}
        />

        {(section === 'events' ? EVENT_TABS : COMMUNITY_TABS).map(({ label, key }) => {
          const isActive = key === activeCategory;
          return (
            <button
              key={key}
              ref={(el) => { buttonRefs.current[key] = el; }}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(key)}
              className="category-tab-button"
              style={{
                padding: '12px 20px',
                background: 'transparent',
                color: isActive ? activeText : inactiveText,
                border: 'none',
                borderBottom: '3px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: isActive ? '600' : '400',
                transition: 'color 0.2s, background 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          );
        })}
      </nav>

      {hasFilters && (
        <div
          className="category-filter-list"
          style={{
            marginLeft: '10px',
            marginRight: '12px',
            paddingLeft: '14px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0',
            borderLeft: `1px solid ${divider}`,
          }}
        >
            {regions.length > 0 && (
              <RegionDropdown
                darkMode={darkMode}
                regions={regions}
                regionCounts={regionCounts}
                selectedRegions={selectedRegions}
                onRegionChange={onRegionChange}
              />
            )}
            {countries.length > 0 && (
              <CountryDropdown
                darkMode={darkMode}
                countries={countries}
                countryCounts={countryCounts}
                selectedCountries={selectedCountries}
                onCountryChange={onCountryChange}
                multiSelect
                className="px-3 py-1 text-xs"
                buttonStyle={{
                  color: selectedCountries.length ? activeAccent : inactiveText,
                  background: 'transparent',
                }}
              />
            )}
        </div>
      )}
    </div>
  );
}
