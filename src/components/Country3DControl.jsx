import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CaretDownIcon,
  CubeIcon,
  GitPullRequestIcon,
  GlobeHemisphereWestIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react';
import {
  COUNTRY_3D_CONTRIBUTION_URL,
  COUNTRY_SPOTLIGHTS,
} from '../config/countrySpotlights';
import { getCountryFlagUrl } from '../utils/memberMarkers';
import './Country3DControl.css';

const MENU_WIDTH = 348;
const MENU_HEIGHT = 438;
const VIEWPORT_GUTTER = 12;

export default function Country3DControl({
  activeCountry,
  countries,
  countryCounts,
  darkMode,
  onExit,
  onOpenCountry,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [previewCountry, setPreviewCountry] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return countries;
    return countries.filter((country) => country.toLowerCase().includes(normalizedQuery));
  }, [countries, query]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const availableWidth = Math.min(MENU_WIDTH, window.innerWidth - VIEWPORT_GUTTER * 2);
    const maxLeft = Math.max(VIEWPORT_GUTTER, window.innerWidth - availableWidth - VIEWPORT_GUTTER);
    const aboveTop = rect.top - MENU_HEIGHT - 8;
    const belowTop = rect.bottom + 8;
    const top = aboveTop >= VIEWPORT_GUTTER
      ? aboveTop
      : Math.min(belowTop, Math.max(VIEWPORT_GUTTER, window.innerHeight - MENU_HEIGHT - VIEWPORT_GUTTER));

    setMenuPosition({
      top,
      left: Math.min(Math.max(VIEWPORT_GUTTER, rect.right - availableWidth), maxLeft),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());

    function handlePointerDown(event) {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
    setQuery('');
    setPreviewCountry(null);
  }

  function openCountry(country) {
    closeMenu();
    onOpenCountry(country);
  }

  const previewSpotlight = previewCountry ? COUNTRY_SPOTLIGHTS[previewCountry] : null;
  const hint = previewCountry
    ? previewSpotlight
      ? previewSpotlight.contributor
        ? `${previewCountry} 3D was contributed by ${previewSpotlight.contributor.name}.`
        : `${previewCountry} 3D is ready. Open the local community view.`
      : `Help build ${previewCountry} in 3D. Know accurate community locations? Send a PR.`
    : 'Singapore and Sri Lanka are ready. Help map the next country.';

  if (activeCountry) {
    return (
      <button
        type="button"
        className="country-3d-trigger country-3d-trigger--active"
        onClick={onExit}
        aria-label={`Exit ${activeCountry} 3D view`}
      >
        <CubeIcon size={17} weight="fill" aria-hidden="true" />
        <span>{activeCountry} · Global View</span>
      </button>
    );
  }

  const menu = open && createPortal(
    <section
      ref={menuRef}
      className={`country-3d-menu ${darkMode ? 'country-3d-menu--dark' : 'country-3d-menu--light'}`}
      style={{ top: menuPosition.top, left: menuPosition.left }}
      role="dialog"
      aria-label="Country 3D views"
    >
      <div className="country-3d-menu__header">
        <div className="country-3d-menu__title">
          <CubeIcon size={19} weight="fill" aria-hidden="true" />
          <div>
            <h2>Country 3D</h2>
            <p>Explore local communities or help build one.</p>
          </div>
        </div>
        <label className="country-3d-search">
          <MagnifyingGlassIcon size={15} weight="bold" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search countries"
            aria-label="Search country 3D views"
          />
        </label>
      </div>

      <ul className="country-3d-list" aria-describedby="country-3d-hint">
        {filteredCountries.map((country) => {
          const spotlight = COUNTRY_SPOTLIGHTS[country];
          const flagUrl = getCountryFlagUrl(country);
          const count = countryCounts[country] ?? 0;

          return (
            <li
              key={country}
              className={`country-3d-row ${spotlight ? 'country-3d-row--ready' : 'country-3d-row--contribute'}`}
              onMouseEnter={() => setPreviewCountry(country)}
              onMouseLeave={() => setPreviewCountry(null)}
              onFocusCapture={() => setPreviewCountry(country)}
            >
              <span className="country-3d-row__flag" aria-hidden="true">
                <GlobeHemisphereWestIcon size={17} weight="duotone" />
                {flagUrl ? <img src={flagUrl} alt="" draggable="false" /> : null}
              </span>
              <span className="country-3d-row__name">
                <strong>{country}</strong>
                <small>{count.toLocaleString()} student {count === 1 ? 'group' : 'groups'}</small>
              </span>
              {spotlight ? (
                <button type="button" onClick={() => openCountry(country)}>
                  <CubeIcon size={15} weight="fill" aria-hidden="true" />
                  Open 3D
                </button>
              ) : (
                <a
                  href={COUNTRY_3D_CONTRIBUTION_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Help build a 3D view for ${country}`}
                >
                  <GitPullRequestIcon size={15} weight="bold" aria-hidden="true" />
                  Help build
                </a>
              )}
            </li>
          );
        })}

        {filteredCountries.length === 0 ? (
          <li className="country-3d-empty">No matching countries</li>
        ) : null}
      </ul>

      <p id="country-3d-hint" className="country-3d-menu__hint" aria-live="polite">
        {hint}
      </p>
    </section>,
    document.body
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="country-3d-trigger"
        onClick={() => {
          setQuery('');
          setPreviewCountry(null);
          setOpen((current) => !current);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CubeIcon size={17} weight="fill" aria-hidden="true" />
        <span>Country 3D</span>
        <CaretDownIcon size={12} weight="bold" aria-hidden="true" />
      </button>
      {menu}
    </>
  );
}
