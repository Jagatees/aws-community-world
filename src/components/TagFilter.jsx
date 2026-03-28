/**
 * TagFilter — renders a scrollable row of tag pills for filtering members.
 *
 * @param {{
 *   tags: string[],
 *   selected: string | null,
 *   onChange: (tag: string | null) => void
 * }} props
 */
export default function TagFilter({ tags, selected, onChange }) {
  if (!tags.length) return null;

  const btnBase = {
    border: '1px solid #2D3F50',
    borderRadius: '999px',
    padding: '3px 12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 0.15s, color 0.15s',
  };

  const activeStyle = { ...btnBase, backgroundColor: '#FF9900', color: '#0F1923', borderColor: '#FF9900' };
  const inactiveStyle = { ...btnBase, backgroundColor: 'transparent', color: '#8B9BAA' };

  return (
    <div
      className="flex gap-2 px-4 py-2 overflow-x-auto"
      style={{ backgroundColor: '#0F1923', scrollbarWidth: 'none' }}
      aria-label="Filter by tag"
    >
      <button
        style={selected === null ? activeStyle : inactiveStyle}
        onClick={() => onChange(null)}
      >
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
    </div>
  );
}
