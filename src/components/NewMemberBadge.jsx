export default function NewMemberBadge({ compact = false, overIcon = false, darkMode = true, style }) {
  return (
    <span
      data-new-member-badge="true"
      title="New in this directory"
      className={`inline-flex items-center justify-center rounded-full font-black leading-none ${compact ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-1 text-[10px]'}`}
      style={{
        backgroundColor: '#FF9900',
        color: '#0F1923',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        ...(overIcon ? {
          position: 'absolute', top: '-8px', right: '-8px', zIndex: 20,
          border: `2px solid ${darkMode ? '#0B1824' : '#FFFFFF'}`,
          pointerEvents: 'none',
        } : {}),
        ...style,
      }}
    >
      NEW
    </span>
  );
}
