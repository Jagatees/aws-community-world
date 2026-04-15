import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCountryCode, countryCodeToFlag } from '../utils/countryFlags';

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
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 6,
        left: rect.left,
      });
    }
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
  const menu = open && createPortal(
    <ul
      ref={menuRef}
      role="listbox"
      style={{
        position: 'fixed',
        top: menuPos.top,
        left: menuPos.left,
        zIndex: 9999,
        minWidth: '240px',
        maxHeight: '300px',
        overflowY: 'auto',
        backgroundColor: menuBg,
        border: `1px solid ${border}`,
        borderRadius: '14px',
        boxShadow: '0 18px 36px rgba(0,0,0,0.28)',
        padding: '6px',
        margin: 0,
        listStyle: 'none',
      }}
    >
      <li
        role="option"
        aria-selected={!selectedCountry}
        onClick={() => {
          onCountryChange(null);
          setOpen(false);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 12px',
          borderRadius: '10px',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: !selectedCountry ? 700 : 500,
          color: !selectedCountry ? '#FF9900' : menuText,
          background: !selectedCountry ? 'rgba(255,153,0,0.1)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (selectedCountry) e.currentTarget.style.background = menuHover;
        }}
        onMouseLeave={(e) => {
          if (selectedCountry) e.currentTarget.style.background = 'transparent';
        }}
      >
        <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🌍</span>
        <span>All Countries</span>
      </li>

      {countries.map((country) => {
        const code = getCountryCode(country);
        const flag = code ? countryCodeToFlag(code) : '';
        const count = countryCounts[country] ?? 0;
        const isSelected = selectedCountry === country;

        return (
          <li
            key={country}
            role="option"
            aria-selected={isSelected}
            onClick={() => {
              onCountryChange(isSelected ? null : country);
              setOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: isSelected ? 700 : 500,
              color: isSelected ? '#FF9900' : menuText,
              background: isSelected ? 'rgba(255,153,0,0.1)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.background = menuHover;
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1, minWidth: '1.4rem', textAlign: 'center' }}>
              {flag}
            </span>
            <span style={{ flex: 1 }}>{country}</span>
            {count > 0 && <span style={{ fontSize: '0.7rem', opacity: 0.55 }}>{count}</span>}
          </li>
        );
      })}
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
