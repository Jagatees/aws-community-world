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
 * @param {{ activeCategory: CategoryKey; onChange: (category: CategoryKey) => void; darkMode: boolean }} props
 */
export default function TabNav({ activeCategory, onChange, darkMode }) {
  const surface = darkMode ? '#1B2836' : '#ffffff';
  const border = darkMode ? '#2D3F50' : '#d0dce8';
  const activeBg = darkMode ? '#243447' : '#f0f7ff';
  const activeText = darkMode ? '#FFFFFF' : '#0F1923';
  const inactiveText = darkMode ? '#8B9BAA' : '#5a7a99';

  return (
    <nav
      role="tablist"
      aria-label="Community categories"
      style={{ backgroundColor: surface, borderBottom: `1px solid ${border}`, display: 'flex' }}
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
            }}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}
