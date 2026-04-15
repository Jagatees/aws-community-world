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
        role="tablist"
        aria-label="Community categories"
        style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none' }}
      >
        {TABS.map(({ label, key }) => {
          const isActive = key === activeCategory;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(key)}
              style={{
                padding: '12px 20px',
                background: isActive ? activeBg : 'transparent',
                color: isActive ? activeText : inactiveText,
                border: 'none',
                borderBottom: isActive ? '3px solid #FF9900' : '3px solid transparent',
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
