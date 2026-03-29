/**
 * @param {{
 *   tags: string[],
 *   selected: string | null,
 *   onChange: (tag: string | null) => void,
 *   darkMode: boolean
 * }} props
 */
export default function TagFilter({ tags, selected, onChange, darkMode }) {
  if (!tags.length) return null;

  const inactiveColor = darkMode ? '#8B9BAA' : '#5a7a99';
  const inactiveBorder = darkMode ? '#2D3F50' : '#b0c8e0';

  const btnBase = {
    borderRadius: '999px',
    padding: '3px 12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 0.15s, color 0.15s',
    flexShrink: 0,
  };

  const activeStyle = { ...btnBase, backgroundColor: '#FF9900', color: '#0F1923', border: '1px solid #FF9900' };
  const inactiveStyle = { ...btnBase, backgroundColor: 'transparent', color: inactiveColor, border: `1px solid ${inactiveBorder}` };

  return (
    <>
      <button style={selected === null ? activeStyle : inactiveStyle} onClick={() => onChange(null)}>
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          style={selected === tag ? activeStyle : inactiveStyle}
          onClick={() => onChange(selected === tag ? null : tag)}
        >
          {tag}
        </button>
      ))}
    </>
  );
}
