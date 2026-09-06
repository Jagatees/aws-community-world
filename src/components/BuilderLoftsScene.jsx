import { createElement, useCallback, useState } from 'react';
import { ArrowUpRight, Buildings, CaretRight, GlobeHemisphereWest, MapPin, Minus, Plus } from '@phosphor-icons/react';
import './BuilderLoftsScene.css';

function LoftStatus({ status }) {
  return (
    <span className={`loft-status loft-status--${status === 'open' ? 'open' : 'announced'}`}>
      <span aria-hidden="true" />
      {status === 'open' ? 'Open' : 'Announced'}
    </span>
  );
}

function LoftDetails({ loft, directory = false }) {
  const isOpen = loft.status === 'open';
  const officialUrl = loft.profileUrl || loft.sourceUrl;
  const verifiedDate = loft.verifiedAt
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${loft.verifiedAt}T00:00:00Z`))
    : null;
  return (
    <article className={`loft-detail${directory ? ' loft-detail--directory' : ''}`}>
      <div className="loft-detail-topline">
        <span className="loft-building-icon"><Buildings size={24} weight="duotone" aria-hidden="true" /></span>
        <LoftStatus status={loft.status} />
      </div>
      <div className="loft-detail-heading">
        <span className="loft-detail-country">{loft.country}</span>
        <h3>{loft.city || loft.name}</h3>
      </div>
      {loft.description && <p className="loft-detail-description">{loft.description}</p>}
      {loft.accessNote && <p className="loft-access-note">{loft.accessNote}</p>}
      {loft.offerings?.length > 0 && (
        <ul className="loft-offerings" aria-label="At this loft">
          {loft.offerings.map((offering) => <li key={offering}>{offering}</li>)}
        </ul>
      )}
      <div className="loft-address">
        <MapPin size={17} weight="duotone" aria-hidden="true" />
        <p>{loft.address || 'Venue address to be announced'}
          {loft.coordinatePrecision === 'city' && <span>Map pin is approximate and shows the city.</span>}
        </p>
      </div>
      {officialUrl && (
        <a className={`loft-official-link${isOpen ? ' loft-official-link--open' : ''}`} href={officialUrl} target="_blank" rel="noopener noreferrer">
          {loft.ctaLabel || (isOpen ? 'Explore this loft' : 'Read the announcement')}
          <ArrowUpRight size={18} aria-hidden="true" />
        </a>
      )}
      {loft.sourceUrl && <p className="loft-verification"><a href={loft.sourceUrl} target="_blank" rel="noopener noreferrer">AWS source <ArrowUpRight size={11} aria-hidden="true" /></a>{verifiedDate && <span>Verified {verifiedDate}</span>}</p>}
    </article>
  );
}

export default function BuilderLoftsScene({
  members = [],
  loading = false,
  darkMode,
  Scene,
  renderScene = (ActiveScene, props) => createElement(ActiveScene, props),
  globeDesign,
  globeDesigns = [],
  globeDesignLabel = (view) => view,
  onDesignChange,
  zoomCommand,
  onZoom,
  flyToTarget,
}) {
  const [selection, setSelection] = useState(null);
  const selectedLoft = members.find((loft) => loft.id === selection?.id) || members[0];
  const memberKey = members.map((loft) => loft.id).join('|');
  // A manual city choice takes precedence until a parent filter changes the map target or visible cities.
  const resolvedTarget = selection?.externalTarget === flyToTarget && selection?.memberKey === memberKey
    ? selection.target
    : flyToTarget;
  const isDirectory = globeDesign === 'list';
  const openCount = members.filter((loft) => loft.status === 'open').length;
  const announcedCount = members.filter((loft) => loft.status === 'announced').length;

  const selectLoft = useCallback((payload) => {
    const loft = Array.isArray(payload) ? payload[0] : payload;
    if (!loft || !members.some((member) => member.id === loft.id)) return;
    setSelection({
      id: loft.id,
      target: { lat: loft.lat, lng: loft.lng },
      externalTarget: flyToTarget,
      memberKey,
    });
  }, [flyToTarget, memberKey, members]);

  return (
    <section className={`builder-lofts${darkMode ? ' builder-lofts--dark' : ''}${isDirectory ? ' builder-lofts--directory' : ''}`} aria-labelledby="builder-lofts-title">
      <header className="lofts-heading">
        <div>
          <h1 id="builder-lofts-title">AWS Builder <span>Lofts</span><Buildings size={27} weight="duotone" aria-hidden="true" /></h1>
          <p>Free spaces to meet, learn and build with the AWS community.</p>
        </div>
        {!loading && members.length > 0 && <div className="lofts-network-status" aria-label={`${openCount} open lofts and ${announcedCount} announced lofts in this view`}>
          <span><i className="lofts-open-dot" aria-hidden="true" />{openCount} open</span>
          <span><i className="lofts-announced-dot" aria-hidden="true" />{announcedCount} announced</span>
        </div>}
      </header>

      <div className="lofts-content">
        {!isDirectory && <div className="lofts-map" aria-label="Builder Loft locations around the world">
          <div className="lofts-map-scene">
            {Scene && renderScene(Scene, {
              category: 'builder-lofts',
              members,
              onMarkerClick: selectLoft,
              darkMode,
              cardOpen: false,
              flyToTarget: resolvedTarget,
              zoomCommand,
            }, `builder-lofts-${globeDesign}`)}
          </div>
          <div className="lofts-map-caption"><GlobeHemisphereWest size={16} aria-hidden="true" /> Select a city to explore its loft</div>
          {onZoom && globeDesign !== 'geolibre' && <div className="lofts-zoom" role="group" aria-label="Loft map zoom">
            <button type="button" onClick={() => onZoom('in')} aria-label="Zoom in"><Plus size={18} /></button>
            <button type="button" onClick={() => onZoom('out')} aria-label="Zoom out"><Minus size={18} /></button>
          </div>}
        </div>}

        {loading ? (
          <div className="lofts-state" role="status">
            <Buildings size={36} weight="duotone" aria-hidden="true" />
            <h2>Finding the lofts</h2>
            <p>Loading the global directory.</p>
            <div className="lofts-skeleton" aria-hidden="true"><span /><span /><span /></div>
          </div>
        ) : members.length === 0 ? (
          <div className="lofts-state" role="status">
            <GlobeHemisphereWest size={40} weight="duotone" aria-hidden="true" />
            <h2>No lofts in this view</h2>
            <p>Try another region, country or status to explore the network.</p>
          </div>
        ) : isDirectory ? (
          <div className="lofts-directory" aria-label="Builder Loft directory">
            {members.map((loft) => <LoftDetails key={loft.id} loft={loft} directory />)}
          </div>
        ) : (
          <aside className="lofts-panel" aria-label="Explore Builder Lofts">
            <div className="lofts-panel-heading"><h2>Explore the lofts</h2><span>{members.length} {members.length === 1 ? 'location' : 'locations'}</span></div>
            <nav className="lofts-city-list" aria-label="Choose a Builder Loft">
              {members.map((loft) => (
                <button key={loft.id} className="lofts-city" type="button" onClick={() => selectLoft(loft)} aria-pressed={selectedLoft?.id === loft.id}>
                  <span className="lofts-city-name">{loft.city || loft.name}<span>{loft.country}</span></span>
                  <LoftStatus status={loft.status} />
                  <CaretRight size={14} aria-hidden="true" />
                </button>
              ))}
            </nav>
            {selectedLoft && <div className="lofts-selected-detail" aria-live="polite" aria-atomic="true"><LoftDetails loft={selectedLoft} /></div>}
          </aside>
        )}
      </div>

      <footer className="lofts-toolbar">
        <p>City pins show approximate locations.</p>
        <div className="lofts-view-switcher" role="group" aria-label="Builder Lofts view">
          {globeDesigns.map((view) => <button key={view} type="button" aria-pressed={globeDesign === view} onClick={() => onDesignChange?.(view)}>{globeDesignLabel(view)}</button>)}
        </div>
        <span className="lofts-source-note">Locations from official AWS sources</span>
      </footer>
    </section>
  );
}
