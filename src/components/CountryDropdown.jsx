import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCountryCode, countryCodeToFlag } from '../utils/countryFlags';

const MENU_WIDTH = 260;
const VIEWPORT_GUTTER = 12;
const MENU_HEIGHT = 330;

export default function CountryDropdown({
  darkMode,
  countries,
  countryCounts = {},
  selectedCountry,
  onCountryChange,
  buttonLabel = 'All Countries',
  className = '',
  buttonStyle = {},
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const maxLeft = Math.max(VIEWPORT_GUTTER, window.innerWidth - MENU_WIDTH - VIEWPORT_GUTTER);
      const belowTop = rect.bottom + 6;
      const aboveTop = rect.top - 6 - MENU_HEIGHT;
      const fitsBelow = belowTop + MENU_HEIGHT + VIEWPORT_GUTTER <= window.innerHeight;
      setMenuPos({
        top: fitsBelow ? belowTop : Math.max(VIEWPORT_GUTTER, aboveTop),
        left: Math.min(Math.max(VIEWPORT_GUTTER, rect.left), maxLeft),
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    function handleOutside(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const border = darkMode ? 'rgba(45, 63, 80, 0.7)' : 'rgba(208, 220, 232, 0.92)';
  const inactiveText = darkMode ? '#DCE7F0' : '#17324B';
  const menuBg = darkMode ? '#1B2836' : '#ffffff';
  const menuHover = darkMode ? 'rgba(255,153,0,0.1)' : 'rgba(255,153,0,0.08)';
  const menuText = darkMode ? '#DCE7F0' : '#17324B';
  const inputBg = darkMode ? 'rgba(9, 19, 28, 0.72)' : 'rgba(240, 247, 255, 0.95)';
  const inputBorder = darkMode ? 'rgba(115, 145, 171, 0.32)' : 'rgba(160, 187, 212, 0.72)';
  const inputPlaceholder = darkMode ? '#7E93A7' : '#6C879F';

  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return countries;

    return countries.filter((country) => {
      const code = getCountryCode(country);
      return (
        country.toLowerCase().includes(normalizedQuery) ||
        code?.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [countries, query]);

  function closeMenu() {
    setQuery('');
    setOpen(false);
  }

  function selectCountry(country) {
    onCountryChange(country);
    closeMenu();
  }

  const menu = open && createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: menuPos.top,
        left: menuPos.left,
        zIndex: 9999,
        minWidth: `${MENU_WIDTH}px`,
        maxHeight: `${MENU_HEIGHT}px`,
        overflow: 'hidden',
        backgroundColor: menuBg,
        border: `1px solid ${border}`,
        borderRadius: '14px',
        boxShadow: '0 18px 36px rgba(0,0,0,0.28)',
        padding: '6px',
      }}
    >
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '6px',
          padding: '8px 10px',
          borderRadius: '10px',
          background: inputBg,
          border: `1px solid ${inputBorder}`,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={inputPlaceholder} strokeWidth="2.4" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 4 4" />
        </svg>
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              closeMenu();
              triggerRef.current?.focus();
            }
          }}
          placeholder="Search country..."
          aria-label="Search countries"
          style={{
            flex: 1,
            minWidth: 0,
            border: 0,
            outline: 0,
            background: 'transparent',
            color: menuText,
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        />
      </label>

      <ul
        role="listbox"
        style={{
          maxHeight: `${MENU_HEIGHT - 58}px`,
          overflowY: 'auto',
          padding: 0,
          margin: 0,
          listStyle: 'none',
        }}
      >
        <CountryOption
          selected={!selectedCountry}
          color={!selectedCountry ? '#FF9900' : menuText}
          menuHover={menuHover}
          selectedCountry={selectedCountry}
          onClick={() => selectCountry(null)}
        >
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🌍</span>
          <span>All Countries</span>
        </CountryOption>

        {filteredCountries.map((country) => {
          const code = getCountryCode(country);
          const flag = code ? countryCodeToFlag(code) : '';
          const count = countryCounts[country] ?? 0;
          const isSelected = selectedCountry === country;

          return (
            <CountryOption
              key={country}
              selected={isSelected}
              color={isSelected ? '#FF9900' : menuText}
              menuHover={menuHover}
              selectedCountry={selectedCountry}
              onClick={() => selectCountry(isSelected ? null : country)}
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1, minWidth: '1.4rem', textAlign: 'center' }}>
                {flag}
              </span>
              <span style={{ flex: 1 }}>{country}</span>
              {count > 0 && <span style={{ fontSize: '0.7rem', opacity: 0.55 }}>{count}</span>}
            </CountryOption>
          );
        })}

        {filteredCountries.length === 0 && (
          <li
            style={{
              padding: '14px 12px',
              color: inputPlaceholder,
              fontSize: '0.8rem',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            No countries found
          </li>
        )}
      </ul>
    </div>,
    document.body
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setQuery('');
          setOpen((value) => !value);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          minHeight: '40px',
          padding: '0 12px',
          borderRadius: 0,
          border: 'none',
          background: 'transparent',
          color: selectedCountry ? '#FF9900' : inactiveText,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          boxShadow: 'none',
          ...buttonStyle,
        }}
      >
        <span>{selectedCountry || buttonLabel}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {menu}
    </>
  );
}

function CountryOption({ selected, color, menuHover, selectedCountry, onClick, children }) {
  return (
    <li
      role="option"
      aria-selected={selected}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: selected ? 700 : 500,
        color,
        background: selected ? 'rgba(255,153,0,0.1)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!selected || selectedCountry) e.currentTarget.style.background = menuHover;
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </li>
  );
}
