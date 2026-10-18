import { useState } from 'react';
import { CalendarBlankIcon, FunnelIcon, ListBulletsIcon } from '@phosphor-icons/react';
import EventStatusFilter from './EventStatusFilter';
import './BuilderEventFilters.css';

const FORMATS = ['In person', 'Online', 'Hybrid'];

export default function BuilderEventFilters({ category = 'builder-events', members, results, filters, onChange, searchQuery, onSearchChange, selectedTag, onTagChange, darkMode, isListView, onOpenDirectory, isCalendarView, onOpenCalendar, eventStatus, eventStatusCounts, onEventStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const isKiro = category === 'kiro-events';
  const sourceName = isKiro ? 'Kiro' : 'Builder Center';
  const cities = [...new Set([...members.map(event => event.city), filters.city].filter(Boolean))].sort();
  const tags = [...new Set([...members.flatMap(event => event.tags?.length ? event.tags : [event.tag]), selectedTag].filter(Boolean))].sort();
  const mapped = results.filter(event => Number.isFinite(event.lat) && Number.isFinite(event.lng) && (event.lat !== 0 || event.lng !== 0)).length;
  const online = results.filter(event => event.eventFormat === 'Online').length;
  const checkedAt = members[0]?.verifiedAt ? new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium' }).format(new Date(members[0].verifiedAt)) : '';
  const activeCount = [filters.format !== 'all', Boolean(filters.city), Boolean(selectedTag), Boolean(searchQuery), filters.sort !== 'soonest'].filter(Boolean).length;

  return (
    <section className={`builder-event-filters${isKiro ? ' builder-event-filters--kiro' : ''}${darkMode ? '' : ' builder-event-filters--light'}${expanded ? ' is-expanded' : ''}`} aria-label={`${sourceName} event filters`}>
      <div className="builder-event-toolbar">
        <div className="builder-event-quick-filters">
          <EventStatusFilter value={eventStatus} counts={eventStatusCounts} onChange={onEventStatusChange} darkMode={darkMode} />
          {isKiro ? <div className="builder-event-formats" role="group" aria-label="Event topic">
            <button type="button" aria-pressed={!selectedTag} onClick={() => onTagChange(null)}>All topics</button>
            {tags.map(tag => <button key={tag} type="button" aria-pressed={selectedTag === tag} onClick={() => onTagChange(selectedTag === tag ? null : tag)}>{tag.replaceAll('-', ' ')}</button>)}
          </div> : <div className="builder-event-formats" role="group" aria-label="Event format">
            {['all', ...FORMATS].map(format => (
              <button key={format} type="button" aria-pressed={filters.format === format} onClick={() => onChange({ ...filters, format, city: '' })}>
                {format === 'all' ? 'All formats' : format}
              </button>
            ))}
          </div>}
        </div>
        <div className="builder-event-tools">
          <button className="builder-event-refine" type="button" aria-expanded={expanded} aria-controls="builder-event-details" onClick={() => setExpanded(!expanded)}>
            <FunnelIcon size={14} aria-hidden="true" /><span>Filters{activeCount ? ` (${activeCount})` : ''}</span>
          </button>
          {!isListView && <button className="builder-event-view" type="button" onClick={onOpenDirectory} aria-label="View directory" title="View directory"><ListBulletsIcon size={17} aria-hidden="true" /></button>}
          {!isCalendarView && <button className="builder-event-view" type="button" onClick={onOpenCalendar} aria-label="View calendar" title="View calendar"><CalendarBlankIcon size={17} aria-hidden="true" /></button>}
        </div>
      </div>
      <div id="builder-event-details" className="builder-event-details" hidden={!expanded} onKeyDown={event => {
        if (event.key === 'Escape') {
          setExpanded(false);
          event.currentTarget.closest('section').querySelector('.builder-event-refine').focus();
        }
      }}>
        <div className="builder-event-fields">
          <label className="builder-event-search">Find an event<input type="search" aria-label={`Find a ${sourceName} event`} placeholder="Search events, places or topics" value={searchQuery} onChange={event => onSearchChange(event.target.value)} /></label>
          {!isKiro && <label>Location type<select aria-label="Location type" value={filters.format} onChange={event => onChange({ ...filters, format: event.target.value, city: '' })}><option value="all">All formats</option>{FORMATS.map(format => <option key={format}>{format}</option>)}</select></label>}
          {!isKiro && <label>City<select aria-label="City" value={filters.city} onChange={event => onChange({ ...filters, city: event.target.value })}><option value="">All cities</option>{cities.map(city => <option key={city}>{city}</option>)}</select></label>}
          <label>Topic<select aria-label="Topic" value={selectedTag || ''} onChange={event => onTagChange(event.target.value || null)}><option value="">All topics</option>{tags.map(tag => <option key={tag} value={tag}>{tag.replaceAll('-', ' ')}</option>)}</select></label>
          <label>Sort by<select aria-label="Sort by" value={filters.sort} onChange={event => onChange({ ...filters, sort: event.target.value })}><option value="soonest">Date: earliest first</option><option value="latest">Date: latest first</option><option value="name">Event name</option></select></label>
        </div>
        <div className="builder-event-summary">
          <p aria-live="polite"><strong>{results.length} {results.length === 1 ? 'event' : 'events'}</strong><span> · {mapped} on globe{!isKiro && ` · ${online} online`}</span></p>
          {activeCount > 0 && <button type="button" onClick={() => { onChange({ format: 'all', city: '', sort: 'soonest' }); onSearchChange(''); onTagChange(null); }}>Reset event filters</button>}
          <a href={isKiro ? 'https://kiro.dev/events/' : 'https://builder.aws.com/connect/events'} target="_blank" rel="noopener noreferrer">{isKiro ? 'Kiro Events' : 'AWS Builder Center'} ↗</a>
        </div>
        <p className="builder-event-location-note">{isKiro ? 'Pins may represent a city or country. Check the event page for venue details.' : <>Pins: published venues or approximate cities (<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>). Online / TBA: directory.{checkedAt && ` Updated ${checkedAt}.`}</>}</p>
      </div>
    </section>
  );
}
