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
 * @param {{ activeCategory: CategoryKey; onChange: (category: CategoryKey) => void }} props
 */
export default function TabNav({ activeCategory, onChange }) {
  return (
    <nav
      role="tablist"
      aria-label="Community categories"
      style={{ backgroundColor: '#1B2836', borderBottom: '1px solid #2D3F50', display: 'flex' }}
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
              background: isActive ? '#243447' : 'transparent',
              color: isActive ? '#FFFFFF' : '#8B9BAA',
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
