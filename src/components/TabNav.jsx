/**
 * @typedef {import('../types.js').CategoryKey} CategoryKey
 */

/** @type {{ label: string; key: CategoryKey }[]} */
const TABS = [
  { label: 'Heroes', key: 'heroes' },
  { label: 'Community Builders', key: 'community-builders' },
  { label: 'User Groups', key: 'user-groups' },
  { label: 'Cloud Clubs', key: 'cloud-clubs' },
];

/**
 * @param {{
 *   activeCategory: CategoryKey;
 *   onChange: (category: CategoryKey) => void;
 *   darkMode: boolean;
 *   countries: string[];
 *   selectedCountry: string | null;
 *   onCountryChange: (country: string | null) => void;
 * }} props
 */
export default function TabNav({ activeCategory, onChange, darkMode, countries, selectedCountry, onCountryChange }) {
  const surface = darkMode ? '#1B2836' : '#ffffff';
  const border = darkMode ? '#2D3F50' : '#d0dce8';
  const activeBg = darkMode ? '#243447' : '#f0f7ff';
  const activeText = darkMode ? '#FFFFFF' : '#0F1923';
  const inactiveText = darkMode ? '#8B9BAA' : '#5a7a99';
  const selectBg = darkMode ? '#0F1923' : '#f0f7ff';

  return (
    <nav
      role="tablist"
      aria-label="Community categories"
      style={{
        backgroundColor: surface,
        borderBottom: `1px solid ${border}`,
        display: 'flex',
        alignItems: 'center',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
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

      {/* Divider */}
      <span style={{ width: '1px', height: '20px', backgroundColor: border, margin: '0 8px', flexShrink: 0 }} />

      {/* Global country filter */}
      <select
        value={selectedCountry ?? ''}
        onChange={(e) => onCountryChange(e.target.value || null)}
        aria-label="Filter by country"
        style={{
          backgroundColor: selectBg,
          color: selectedCountry ? '#FF9900' : inactiveText,
          border: `1px solid ${selectedCountry ? '#FF9900' : border}`,
          borderRadius: '999px',
          padding: '4px 28px 4px 12px',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
          flexShrink: 0,
          marginRight: '12px',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238B9BAA' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
        }}
      >
        <option value="">🌍 All Countries</option>
        {countries.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </nav>
  );
}
