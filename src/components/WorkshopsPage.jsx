import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftIcon, ArrowRightIcon, ArrowSquareOutIcon, BookOpenIcon,
  ClockIcon, CubeIcon, GlobeIcon, MagnifyingGlassIcon, MoonIcon, SunIcon, XIcon,
} from '@phosphor-icons/react';
import catalog from '../data/workshops.json';
import serviceIcons from '../data/aws-service-icons.json';
import { DEFAULT_WORKSHOP_FILTERS, WORKSHOP_LEVELS, countServiceWorkshops, filterServices, filterWorkshops, languageName } from '../utils/workshops';
import './WorkshopsPage.css';

const COUNTS = countServiceWorkshops(catalog.workshops);
const CATEGORIES = [...new Set(catalog.services.flatMap(service => service.categories))].sort();
const LANGUAGES = [...new Set(catalog.workshops.flatMap(workshop => workshop.languages))].sort((a, b) => languageName(a).localeCompare(languageName(b)));
const PAGE_SIZE = 24;
const WorkshopWorld = lazy(() => import('./WorkshopWorld'));
const updated = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(catalog.checkedAt));

function ServiceIcon({ service }) {
  const [failed, setFailed] = useState(false);
  const icon = serviceIcons[service.id];
  const initials = service.name.replace(/^(Amazon|AWS)\s+/, '').split(/\s+/).slice(0, 3).map(word => word[0]).join('');
  const title = icon ? `${icon.iconName} ${icon.kind === 'category' ? 'category' : 'icon'}${['parent', 'family'].includes(icon.kind) ? ' · shared service family icon' : ''}` : service.name;
  return <span className="workshop-service-icon" data-icon-kind={icon?.kind || 'fallback'} title={title} aria-hidden="true">
    {icon && !failed ? <img src={icon.src} width="64" height="64" alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} /> : <span className="workshop-service-initials">{initials}</span>}
  </span>;
}

function Select({ label, value, onChange, children }) {
  return <label className="workshop-select"><span>{label}</span><select aria-label={label} value={value} onChange={event => onChange(event.target.value)}>{children}</select></label>;
}

function Results({ items, servicesView, onService, onShowAll, selectedService, filtersActive, onReset }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  if (!items.length) return <div className="workshop-empty">
    <BookOpenIcon size={32} aria-hidden="true" />
    <h2>{selectedService && !filtersActive ? `No workshops for ${selectedService.name} yet` : `No ${servicesView ? 'services' : 'workshops'} match these filters`}</h2>
    <p>{selectedService && !filtersActive ? 'This service is in the AWS directory, but has no matching workshop in the current Builder Center catalog.' : 'Try a different search or clear the filters to see more.'}</p>
    <div>{filtersActive && <button type="button" className="workshop-button" onClick={onReset}>Clear filters</button>}<button type="button" className="workshop-button secondary" onClick={onShowAll}>Browse all workshops <ArrowRightIcon /></button></div>
  </div>;
  return <>
    <div className={servicesView ? 'workshop-service-grid' : 'workshop-results'}>
      {items.slice(0, visible).map(item => servicesView ? <button type="button" key={item.id} className="workshop-service" onClick={() => onService(item.id)} aria-label={`${item.name}, ${COUNTS.get(item.id) || 0} workshops`} title={[item.name, item.description].filter(Boolean).join('\n')}>
        <ServiceIcon service={item} />
        <h3>{item.name}</h3>
        <span className="workshop-service-bottom" data-empty={!COUNTS.get(item.id)}><span>{COUNTS.get(item.id) || 0} {(COUNTS.get(item.id) || 0) === 1 ? 'workshop' : 'workshops'}</span><ArrowRightIcon size={14} /></span>
      </button> : <article key={item.id} className="workshop-result">
        <div className="workshop-result-copy">
          <div className="workshop-meta"><span className={`workshop-level level-${item.level}`}>{item.level ? `${item.level} · ${WORKSHOP_LEVELS[item.level]}` : 'Level not listed'}</span><span><ClockIcon size={15} />{item.durationHours ? `${item.durationHours} ${item.durationHours === 1 ? 'hour' : 'hours'}` : 'Self-paced'}</span>{item.sandboxAvailable && <span>Sandbox available</span>}</div>
          <h3><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}<ArrowSquareOutIcon size={17} aria-label="opens in a new tab" /></a></h3>
          <p>{item.description}</p>
          <div className="workshop-tags">{item.services.slice(0, 4).map(name => <span key={name}>{name}</span>)}{item.services.length > 4 && <span title={item.services.slice(4).join(', ')}>+{item.services.length - 4} services</span>}</div>
          <div className="workshop-languages"><GlobeIcon size={14} aria-hidden="true" />{item.languages.map(languageName).join(', ') || 'Language not listed'}</div>
        </div>
        <a className="workshop-open" href={item.url} target="_blank" rel="noopener noreferrer">Open workshop <ArrowSquareOutIcon size={17} aria-label="opens in a new tab" /></a>
      </article>)}
    </div>
    <div className="workshop-pagination"><span>Showing {Math.min(visible, items.length)} of {items.length} {servicesView ? 'services & features' : 'workshops'}</span>{visible < items.length && <button type="button" className="workshop-button secondary" onClick={() => setVisible(count => count + PAGE_SIZE)}>Show more {servicesView ? 'services' : 'workshops'} <ArrowRightIcon size={17} /></button>}</div>
  </>;
}

export default function WorkshopsPage({ darkMode, onThemeChange, filters, onChange, searchQuery }) {
  const scrollRef = useRef(null);
  const headingRef = useRef(null);
  const service = catalog.services.find(item => item.id === filters.service);
  const servicesView = filters.browse === 'services' && !filters.service;
  const items = useMemo(() => servicesView ? filterServices(catalog, filters, searchQuery) : filterWorkshops(catalog, filters, searchQuery), [filters, searchQuery, servicesView]);
  const hasFilters = Boolean(searchQuery || filters.category || filters.level || filters.language || filters.duration || filters.sandbox || filters.withWorkshops);
  const navigate = (next) => {
    onChange(next, { search: '', navigate: true });
    scrollRef.current?.scrollTo({ top: 0 });
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const showServices = () => navigate({ ...DEFAULT_WORKSHOP_FILTERS });
  const showAll = () => navigate({ ...DEFAULT_WORKSHOP_FILTERS, browse: 'workshops', sort: 'updated' });
  const set = patch => onChange({ ...filters, ...patch });
  const clearFilters = () => onChange({ ...DEFAULT_WORKSHOP_FILTERS, service: filters.service, browse: filters.browse, sort: filters.sort }, { search: '' });

  if (filters.mode === 'world') return <Suspense fallback={<div className="workshop-world-loading" role="status">Opening the workshop world…</div>}>
    <WorkshopWorld darkMode={darkMode} onThemeChange={onThemeChange} filters={filters} onChange={onChange} searchQuery={searchQuery} />
  </Suspense>;

  return <main className="workshops-page" data-theme={darkMode ? 'dark' : 'light'} ref={scrollRef} aria-label="AWS workshop explorer">
    <div className="workshops-inner">
      <div className="workshop-topline"><span><BookOpenIcon size={17} /> WORKSHOP EXPLORER</span><div className="workshop-view-actions"><button type="button" className="workshop-button secondary" onClick={() => onChange({ ...filters, mode: 'world' }, { navigate: true, search: servicesView ? searchQuery : '' })}><CubeIcon size={18} /> 3D world</button><button type="button" className="workshop-theme" onClick={() => onThemeChange(!darkMode)} aria-label={`Switch to ${darkMode ? 'light' : 'dark'} theme`}>{darkMode ? <SunIcon size={20} /> : <MoonIcon size={20} />}</button></div></div>
      {filters.service && <button type="button" className="workshop-back" onClick={showServices}><ArrowLeftIcon size={16} /> All services</button>}
      <div className="workshop-heading">
        <div><h1 ref={headingRef} tabIndex={-1}>{filters.service ? service?.name || 'Service not found' : <>Find a workshop.<br /><span>Start with a service.</span></>}</h1><p>{filters.service ? service?.description || (service ? 'Hands-on learning for this AWS service or feature.' : 'This service link is not in the current catalog. Browse the directory to find a service.') : 'Pick the AWS service you want to learn. Find a hands-on workshop and start building.'}</p>{service?.url && <a className="workshop-service-link" href={service.url} target="_blank" rel="noopener noreferrer">Explore this service on AWS <ArrowSquareOutIcon size={14} /></a>}</div>
        {!filters.service && <div className="workshop-catalog-size"><strong>{catalog.workshops.length}</strong><span>workshops to explore</span><small>Across {catalog.productCount} AWS products<br />and {catalog.services.length - catalog.productCount} more services & features</small></div>}
      </div>
      {!filters.service && <div className="workshop-browse" role="group" aria-label="Browse catalog by"><button type="button" aria-pressed={servicesView} onClick={showServices}>AWS services <span>{catalog.services.length}</span></button><button type="button" aria-pressed={!servicesView} onClick={showAll}>All workshops <span>{catalog.workshops.length}</span></button></div>}
      <div className="workshop-toolbar">
        <div className="workshop-search"><MagnifyingGlassIcon size={20} aria-hidden="true" /><input aria-label={servicesView ? 'Search AWS services' : 'Search workshops'} placeholder={servicesView ? 'Search services — try S3, Bedrock, Lambda…' : 'Search workshops, topics or services…'} value={searchQuery} onChange={event => onChange(filters, { search: event.target.value })} />{searchQuery && <button type="button" aria-label="Clear search" onClick={() => onChange(filters, { search: '' })}><XIcon size={17} /></button>}</div>
        {!filters.service && <Select label="Category" value={filters.category} onChange={category => set({ category })}><option value="">All categories</option>{CATEGORIES.map(category => <option key={category}>{category}</option>)}</Select>}
        <Select label="Sort by" value={servicesView ? (filters.sort === 'title' ? 'title' : 'popular') : (filters.sort === 'popular' ? 'updated' : filters.sort)} onChange={sort => set({ sort })}>{servicesView ? <option value="popular">Most workshops</option> : <option value="updated">Recently updated</option>}<option value="title">Name: A–Z</option>{!servicesView && <option value="duration">Shortest first</option>}</Select>
      </div>
      <div className="workshop-filter-row">
        {servicesView ? <label className="workshop-check"><input type="checkbox" checked={filters.withWorkshops} onChange={event => set({ withWorkshops: event.target.checked })} /> Only services with workshops</label> : <>
          <Select label="Level" value={filters.level} onChange={level => set({ level })}><option value="">All levels</option>{Object.entries(WORKSHOP_LEVELS).map(([value, label]) => <option key={value} value={value}>{value} · {label}</option>)}</Select>
          <Select label="Language" value={filters.language} onChange={language => set({ language })}><option value="">All languages</option>{LANGUAGES.map(code => <option key={code} value={code}>{languageName(code)}</option>)}</Select>
          <Select label="Duration" value={filters.duration} onChange={duration => set({ duration })}><option value="">Any duration</option><option value="short">Up to 1 hour</option><option value="medium">Over 1 to 3 hours</option><option value="long">Over 3 hours</option></Select>
          <label className="workshop-check"><input type="checkbox" checked={filters.sandbox} onChange={event => set({ sandbox: event.target.checked })} /> Sandbox available</label>
        </>}
        {hasFilters && <button type="button" className="workshop-clear" onClick={clearFilters}>Clear filters <XIcon size={13} /></button>}
      </div>
      <div className="workshop-results-label"><h2>{servicesView ? 'Explore AWS services' : service ? 'Workshops for this service' : 'Explore workshops'}</h2><span role="status" aria-live="polite">{items.length} {servicesView ? 'services & features' : `workshop${items.length === 1 ? '' : 's'}`}</span></div>
      <Results key={JSON.stringify([filters, searchQuery])} items={items} servicesView={servicesView} selectedService={service} onService={id => navigate({ ...DEFAULT_WORKSHOP_FILTERS, service: id, sort: 'updated' })} onShowAll={showAll} filtersActive={hasFilters} onReset={clearFilters} />
      <footer className="workshop-footer"><p>Workshops from <a href={catalog.sourceUrl} target="_blank" rel="noopener noreferrer">AWS Builder Center <ArrowSquareOutIcon size={12} /></a> · Services from the <a href={catalog.servicesSourceUrl} target="_blank" rel="noopener noreferrer">AWS product directory <ArrowSquareOutIcon size={12} /></a></p><p>Checked {updated}. Counts reflect this catalog; some services have no listed workshops. Workshops open on AWS.</p></footer>
    </div>
  </main>;
}
