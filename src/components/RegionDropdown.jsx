import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getRegionLabel } from '../utils/countryRegions';

const MENU_WIDTH = 230;
const VIEWPORT_GUTTER = 12;

export default function RegionDropdown({ darkMode, regions, regionCounts = {}, selectedRegions = [], onRegionChange }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const maxLeft = Math.max(VIEWPORT_GUTTER, window.innerWidth - MENU_WIDTH - VIEWPORT_GUTTER);
    setMenuPos({
      top: rect.bottom + 6,
      left: Math.min(Math.max(VIEWPORT_GUTTER, rect.left), maxLeft),
    });
  }, [open]);

  useEffect(() => {
    function handleOutside(event) {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, []);

  const border = darkMode ? 'rgba(45, 63, 80, 0.7)' : 'rgba(208, 220, 232, 0.92)';
  const text = darkMode ? '#DCE7F0' : '#17324B';
  const muted = darkMode ? '#8B9BAA' : '#5A7A99';
  const menuBg = darkMode ? '#1B2836' : '#FFFFFF';
  const hover = darkMode ? 'rgba(255,153,0,0.1)' : 'rgba(255,153,0,0.08)';

  function toggleRegion(region) {
    if (!region) {
      onRegionChange([]);
      return;
    }

    onRegionChange(
      selectedRegions.includes(region)
        ? selectedRegions.filter((selected) => selected !== region)
        : [...selectedRegions, region]
    );
  }

  const triggerLabel = selectedRegions.length === 0
    ? 'All Regions'
    : selectedRegions.length === 1
      ? getRegionLabel(selectedRegions[0])
      : `${selectedRegions.length} Regions`;

  const menu = open && createPortal(
    <ul
      ref={menuRef}
      role="listbox"
      aria-label="Regions"
      aria-multiselectable="true"
      style={{
        position: 'fixed',
        top: menuPos.top,
        left: menuPos.left,
        zIndex: 9999,
        width: `${MENU_WIDTH}px`,
        margin: 0,
        padding: '6px',
        listStyle: 'none',
        backgroundColor: menuBg,
        border: `1px solid ${border}`,
        borderRadius: '14px',
        boxShadow: '0 18px 36px rgba(0,0,0,0.28)',
      }}
    >
      <RegionOption
        label="All Regions"
        icon="ALL"
        count={Object.values(regionCounts).reduce((sum, count) => sum + count, 0)}
        selected={selectedRegions.length === 0}
        text={text}
        muted={muted}
        hover={hover}
        onClick={() => toggleRegion(null)}
      />
      {regions.map((region) => (
        <RegionOption
          key={region.id}
          label={region.label}
          icon={region.icon}
          count={regionCounts[region.id] ?? 0}
          selected={selectedRegions.includes(region.id)}
          text={text}
          muted={muted}
          hover={hover}
          onClick={() => toggleRegion(region.id)}
        />
      ))}
    </ul>,
    document.body
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="px-3 py-1 text-xs"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          minHeight: '40px',
          border: 'none',
          background: 'transparent',
          color: selectedRegions.length ? '#FF9900' : text,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
        }}
      >
        <span>{triggerLabel}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {menu}
    </>
  );
}

function RegionOption({ label, icon, count, selected, text, muted, hover, onClick }) {
  return (
    <li
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-xs"
      style={{ color: selected ? '#FF9900' : text, background: selected ? 'rgba(255,153,0,0.1)' : 'transparent', fontWeight: selected ? 700 : 500 }}
      onMouseEnter={(event) => { event.currentTarget.style.background = hover; }}
      onMouseLeave={(event) => { event.currentTarget.style.background = selected ? 'rgba(255,153,0,0.1)' : 'transparent'; }}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[9px] font-black tracking-tight"
        style={{ color: selected ? '#0F1923' : '#FF9900', background: selected ? '#FF9900' : 'rgba(255,153,0,0.12)' }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {count > 0 ? <span style={{ color: muted, fontVariantNumeric: 'tabular-nums' }}>{count.toLocaleString()}</span> : null}
      <span
        className="flex h-4 w-4 items-center justify-center rounded border text-[10px]"
        style={{ borderColor: selected ? '#FF9900' : muted, color: selected ? '#FF9900' : 'transparent' }}
        aria-hidden="true"
      >
        ✓
      </span>
    </li>
  );
}
