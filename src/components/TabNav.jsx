import { useRef, useLayoutEffect, useEffect } from 'react';
import CountryDropdown from './CountryDropdown';

/** @typedef {import('../types.js').CategoryKey} CategoryKey */

const TABS = [
  { label: 'Heroes', key: 'heroes' },
  { label: 'Community Builders', key: 'community-builders' },
  { label: 'User Groups', key: 'user-groups' },
  { label: 'Cloud Clubs', key: 'cloud-clubs' },
  { label: 'News', key: 'news' },
];

/**
 * @param {{
 *   activeCategory: CategoryKey;
 *   onChange: (category: CategoryKey) => void;
 *   darkMode: boolean;
 *   countries: string[];
 *   countryCounts: Record<string, number>;
 *   selectedCountry: string | null;
 *   onCountryChange: (country: string | null) => void;
 * }} props
 */
export default function TabNav({
  activeCategory,
  onChange,
  darkMode,
  countries,
  countryCounts = {},
  selectedCountry,
  onCountryChange,
}) {
  const surface = darkMode ? 'rgba(27, 40, 54, 0.62)' : 'rgba(255, 255, 255, 0.72)';
  const border = darkMode ? 'rgba(45, 63, 80, 0.7)' : 'rgba(208, 220, 232, 0.92)';
  const activeBg = darkMode ? 'rgba(36, 52, 71, 0.88)' : 'rgba(240, 247, 255, 0.94)';
  const activeText = darkMode ? '#FFFFFF' : '#0F1923';
  const inactiveText = darkMode ? '#8B9BAA' : '#5a7a99';
  const divider = darkMode ? 'rgba(115, 145, 171, 0.34)' : 'rgba(134, 162, 190, 0.5)';

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
      style={{
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
        style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none', position: 'relative' }}
      >
        {/* Sliding indicator bar */}
        <div
          ref={indicatorRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 0,
            height: '3px',
            backgroundColor: '#FF9900',
            borderRadius: '2px 2px 0 0',
            pointerEvents: 'none',
            boxShadow: '0 0 8px rgba(255, 153, 0, 0.55)',
          }}
        />

        {TABS.map(({ label, key }) => {
          const isActive = key === activeCategory;
          return (
            <button
              key={key}
              ref={(el) => { buttonRefs.current[key] = el; }}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(key)}
              style={{
                padding: '12px 20px',
                background: isActive ? activeBg : 'transparent',
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

        {!!countries.length && (
          <div
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
            <CountryDropdown
              darkMode={darkMode}
              countries={countries}
              countryCounts={countryCounts}
              selectedCountry={selectedCountry}
              onCountryChange={onCountryChange}
              className="px-3 py-1 text-xs"
              buttonStyle={{
                color: selectedCountry ? '#FF9900' : inactiveText,
                background: 'transparent',
              }}
            />
          </div>
        )}
      </nav>
    </div>
  );
}
