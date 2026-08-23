import { createElement, useEffect, useMemo, useState } from 'react';
import {
  CheckIcon,
  CrosshairIcon,
  DotsThreeCircleIcon,
  FunnelIcon,
  GithubLogoIcon,
  GlobeHemisphereWestIcon,
  LinkedinLogoIcon,
  MoonIcon,
  SparkleIcon,
  SquaresFourIcon,
  SunIcon,
  TelegramLogoIcon,
  XIcon,
} from '@phosphor-icons/react';
import CountryDropdown from './CountryDropdown';
import TagFilter from './TagFilter';

const COMMUNITY_CATEGORIES = [
  { key: 'heroes', label: 'Heroes', accent: '#FF9900' },
  { key: 'community-builders', label: 'Community Builders', accent: '#1A9C3E' },
  { key: 'user-groups', label: 'User Groups', accent: '#00A1C9' },
  { key: 'cloud-clubs', label: 'Student Builder Groups', accent: '#BF0816' },
  { key: 'kiro-ambassadors', label: 'Kiro Ambassadors', accent: '#8B5CF6' },
];

const EVENT_CATEGORIES = [
  { key: 'kiro-events', label: 'Kiro Events', accent: '#7B61FF' },
  { key: 'community-days', label: 'Community Days', accent: '#FF9900' },
  { key: 'news', label: 'News', accent: '#FF9900' },
];

const EXTERNAL_LINKS = [
  {
    label: 'Creator',
    description: 'Connect on LinkedIn',
    href: 'https://www.linkedin.com/in/jagatees',
    Icon: LinkedinLogoIcon,
  },
  {
    label: 'AWSome Updates',
    description: 'Tech news on Telegram',
    href: 'https://t.me/awsomeupdates',
    Icon: TelegramLogoIcon,
  },
  {
    label: 'GitHub',
    description: 'View the project source',
    href: 'https://github.com/Jagatees/aws-community-world',
    Icon: GithubLogoIcon,
  },
];

const NAV_ITEMS = [
  { key: 'explore', label: 'Explore', Icon: GlobeHemisphereWestIcon },
  { key: 'categories', label: 'Categories', Icon: SquaresFourIcon },
  { key: 'filters', label: 'Filters', Icon: FunnelIcon },
  { key: 'more', label: 'More', Icon: DotsThreeCircleIcon },
];

export default function MobileNavigation({
  darkMode,
  section,
  activeCategory,
  activeLabel,
  resultCount,
  onCategoryChange,
  regions = [],
  regionCounts = {},
  selectedRegions = [],
  onRegionChange,
  countries = [],
  countryCounts = {},
  selectedCountries = [],
  onCountryChange,
  tags = [],
  selectedTag,
  onTagChange,
  globeDesign,
  globeDesigns = [],
  onGlobeDesignChange,
  globeDesignLabel,
  onNearMe,
  nearMeLoading,
  canUseNearMe,
  onThemeChange,
  newOnly,
  newMemberCount,
  canShowNewArrivals,
  onNewOnlyToggle,
}) {
  const [openPanel, setOpenPanel] = useState(null);
  const categories = section === 'events' ? EVENT_CATEGORIES : COMMUNITY_CATEGORIES;
  const accent = categories.find((category) => category.key === activeCategory)?.accent ?? '#FF9900';
  const filterCount = selectedRegions.length + selectedCountries.length + (selectedTag ? 1 : 0) + (newOnly ? 1 : 0);
  const hasLocationFilters = regions.length > 0 || countries.length > 0;
  const hasFilters = hasLocationFilters || tags.length > 0;
  const formattedCount = Number.isFinite(resultCount) ? resultCount.toLocaleString() : null;

  useEffect(() => {
    if (!openPanel) return undefined;

    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpenPanel(null);
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [openPanel]);

  const panelTitle = useMemo(() => {
    if (openPanel === 'categories') return 'Choose a category';
    if (openPanel === 'filters') return 'Filter the globe';
    if (openPanel === 'more') return 'More options';
    return '';
  }, [openPanel]);

  function togglePanel(panel) {
    setOpenPanel((current) => current === panel ? null : panel);
  }

  function clearFilters() {
    onRegionChange([]);
    onCountryChange([]);
    onTagChange(null);
    if (newOnly) onNewOnlyToggle();
  }

  return (
    <div
      className={`mobile-navigation${openPanel ? ' is-open' : ''}`}
      style={{
        '--mobile-nav-accent': accent,
        '--mobile-nav-surface': darkMode ? 'rgba(9, 22, 33, 0.96)' : 'rgba(250, 253, 255, 0.96)',
        '--mobile-nav-surface-soft': darkMode ? 'rgba(25, 42, 57, 0.82)' : 'rgba(232, 241, 249, 0.9)',
        '--mobile-nav-border': darkMode ? 'rgba(112, 148, 177, 0.35)' : 'rgba(126, 159, 187, 0.48)',
        '--mobile-nav-text': darkMode ? '#F5F8FA' : '#0F1923',
        '--mobile-nav-muted': darkMode ? '#8FA4B6' : '#5A7892',
      }}
    >
      {openPanel && (
        <button
          type="button"
          className="mobile-navigation-backdrop"
          aria-label="Close navigation panel"
          onClick={() => setOpenPanel(null)}
        />
      )}

      {!openPanel && (
        <div className="mobile-navigation-floating-actions">
          <button
            type="button"
            className="mobile-active-category"
            onClick={() => togglePanel('categories')}
            aria-label={`Change category. Current category: ${activeLabel}`}
          >
            <span className="mobile-active-category-dot" aria-hidden="true" />
            <span>{activeLabel}</span>
            {formattedCount && <strong>{formattedCount}</strong>}
          </button>

          {canUseNearMe && (
            <button
              type="button"
              className="mobile-near-me"
              onClick={onNearMe}
              disabled={nearMeLoading}
              aria-label={nearMeLoading ? 'Finding your location' : 'Find community near me'}
            >
              <CrosshairIcon size={19} weight={nearMeLoading ? 'duotone' : 'bold'} aria-hidden="true" />
              <span>{nearMeLoading ? 'Locating' : 'Near me'}</span>
            </button>
          )}
        </div>
      )}

      {openPanel && (
        <section
          className="mobile-navigation-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-navigation-title"
        >
          <div className="mobile-sheet-handle" aria-hidden="true" />
          <header className="mobile-sheet-header">
            <div>
              <span>{section === 'events' ? 'Events' : 'Community'}</span>
              <h2 id="mobile-navigation-title">{panelTitle}</h2>
            </div>
            <button type="button" onClick={() => setOpenPanel(null)} aria-label="Close panel">
              <XIcon size={19} weight="bold" aria-hidden="true" />
            </button>
          </header>

          <div className="mobile-sheet-content">
            {openPanel === 'categories' && (
              <div className="mobile-category-list" role="list">
                {categories.map((category) => {
                  const selected = category.key === activeCategory;
                  return (
                    <button
                      key={category.key}
                      type="button"
                      className={selected ? 'is-selected' : ''}
                      style={{ '--category-accent': category.accent }}
                      onClick={() => {
                        onCategoryChange(category.key);
                        setOpenPanel(null);
                      }}
                      aria-pressed={selected}
                    >
                      <span className="mobile-category-mark" aria-hidden="true" />
                      <span>{category.label}</span>
                      {selected && <CheckIcon size={18} weight="bold" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            )}

            {openPanel === 'filters' && (
              <>
                <div className="mobile-sheet-section-heading">
                  <div>
                    <h3>Location</h3>
                    <p>Choose one or more regions, then narrow by country.</p>
                  </div>
                  {filterCount > 0 && <button type="button" onClick={clearFilters}>Clear all</button>}
                </div>

                {regions.length > 0 && (
                  <div className="mobile-region-grid" role="group" aria-label="Regions">
                    {regions.map((region) => {
                      const selected = selectedRegions.includes(region.id);
                      return (
                        <button
                          key={region.id}
                          type="button"
                          className={selected ? 'is-selected' : ''}
                          onClick={() => onRegionChange(
                            selected
                              ? selectedRegions.filter((value) => value !== region.id)
                              : [...selectedRegions, region.id]
                          )}
                          aria-pressed={selected}
                        >
                          <span>{region.label}</span>
                          <small>{(regionCounts[region.id] ?? 0).toLocaleString()}</small>
                        </button>
                      );
                    })}
                  </div>
                )}

                {countries.length > 0 && (
                  <div className="mobile-country-control">
                    <CountryDropdown
                      darkMode={darkMode}
                      countries={countries}
                      countryCounts={countryCounts}
                      selectedCountries={selectedCountries}
                      onCountryChange={onCountryChange}
                      multiSelect
                      buttonLabel="All countries"
                      allLabel="All countries"
                      buttonStyle={{
                        width: '100%',
                        minHeight: '48px',
                        justifyContent: 'space-between',
                        border: '1px solid var(--mobile-nav-border)',
                        borderRadius: '0.75rem',
                        background: 'var(--mobile-nav-surface-soft)',
                        color: selectedCountries.length ? '#FF9900' : 'var(--mobile-nav-text)',
                      }}
                    />
                  </div>
                )}

                {tags.length > 0 && (
                  <div className="mobile-tag-filter">
                    <div className="mobile-sheet-section-heading">
                      <div>
                        <h3>Specialty</h3>
                        <p>Show members with a specific community focus.</p>
                      </div>
                    </div>
                    <div className="mobile-tag-list">
                      <TagFilter tags={tags} selected={selectedTag} onChange={onTagChange} darkMode={darkMode} />
                    </div>
                  </div>
                )}

                {!hasFilters && (
                  <div className="mobile-empty-state">
                    <FunnelIcon size={24} weight="duotone" aria-hidden="true" />
                    <strong>No filters for this view</strong>
                    <span>Choose another category to explore location and specialty filters.</span>
                  </div>
                )}
              </>
            )}

            {openPanel === 'more' && (
              <>
                <div className="mobile-sheet-section-heading">
                  <div>
                    <h3>View</h3>
                    <p>Choose how the community is displayed.</p>
                  </div>
                </div>
                <div className="mobile-view-grid" role="group" aria-label="Globe view">
                  {globeDesigns.map((design) => {
                    const selected = design === globeDesign;
                    return (
                      <button
                        key={design}
                        type="button"
                        className={selected ? 'is-selected' : ''}
                        onClick={() => {
                          onGlobeDesignChange(design);
                          setOpenPanel(null);
                        }}
                        aria-pressed={selected}
                      >
                        {globeDesignLabel(design)}
                        {selected && <CheckIcon size={15} weight="bold" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mobile-preference-list">
                  <button type="button" onClick={() => onThemeChange(!darkMode)}>
                    <span className="mobile-preference-icon">
                      {darkMode
                        ? <SunIcon size={20} weight="duotone" aria-hidden="true" />
                        : <MoonIcon size={20} weight="duotone" aria-hidden="true" />}
                    </span>
                    <span>
                      <strong>{darkMode ? 'Use light theme' : 'Use dark theme'}</strong>
                      <small>Switch the entire experience</small>
                    </span>
                  </button>

                  {canShowNewArrivals && (
                    <button type="button" onClick={onNewOnlyToggle} aria-pressed={newOnly}>
                      <span className="mobile-preference-icon">
                        <SparkleIcon size={20} weight="fill" aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{newOnly ? 'Show everyone' : `Show new arrivals (${newMemberCount})`}</strong>
                        <small>{newOnly ? 'Remove the new-arrivals filter' : 'See who recently joined'}</small>
                      </span>
                      {newOnly && <CheckIcon size={18} weight="bold" aria-hidden="true" />}
                    </button>
                  )}
                </div>

                <div className="mobile-sheet-section-heading mobile-links-heading">
                  <div><h3>Project links</h3></div>
                </div>
                <div className="mobile-project-links">
                  {EXTERNAL_LINKS.map(({ label, description, href, Icon }) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer">
                      {createElement(Icon, { size: 20, weight: 'fill', 'aria-hidden': true })}
                      <span><strong>{label}</strong><small>{description}</small></span>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <nav className="mobile-bottom-navigation" aria-label="Primary mobile navigation">
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const selected = key === 'explore' ? !openPanel : openPanel === key;
          const badge = key === 'filters' && filterCount > 0 ? filterCount : null;
          return (
            <button
              key={key}
              type="button"
              className={selected ? 'is-selected' : ''}
              onClick={() => key === 'explore' ? setOpenPanel(null) : togglePanel(key)}
              aria-current={selected ? 'page' : undefined}
              aria-expanded={key === 'explore' ? undefined : openPanel === key}
            >
              <span className="mobile-nav-icon">
                {createElement(Icon, { size: 22, weight: selected ? 'fill' : 'regular', 'aria-hidden': true })}
                {badge && <small>{badge > 9 ? '9+' : badge}</small>}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
