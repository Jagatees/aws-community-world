import { useMemo, useState } from 'react';
import {
  ArrowLeftIcon, ArrowSquareOutIcon, BookOpenIcon,
  CalendarBlankIcon, ClockIcon, MapPinIcon, UsersThreeIcon,
} from '@phosphor-icons/react';
import catalog from '../data/workshops.json';
import builderEvents from '../data/builder-events.json';
import kiroEvents from '../data/kiro-events.json';
import userGroups from '../data/user-groups.json';
import serviceIcons from '../data/aws-service-icons.json';
import learningPathData from '../data/learning-paths.json';
import AddToCalendar from './AddToCalendar';
import { normalizeKiroEvent } from '../utils/builderEvents.js';
import { BEDROCK_MODEL_CATALOG_URL } from '../utils/learningPaths.js';
import { countServiceWorkshops, WORKSHOP_LEVELS } from '../utils/workshops.js';
import { getRegionForCountry, getRegionLabel, REGIONS } from '../utils/countryRegions.js';
import './BuildPathPlanner.css';

const workshopCounts = countServiceWorkshops(catalog.workshops);
const availableServices = catalog.services
  .filter(service => workshopCounts.get(service.id))
  .sort((a, b) => (workshopCounts.get(b.id) || 0) - (workshopCounts.get(a.id) || 0) || a.name.localeCompare(b.name));
const allEvents = [
  ...builderEvents,
  ...kiroEvents.map(normalizeKiroEvent),
].filter(event => event.startsAt && event.endsAt && event.sourceUrl);
const countries = [...new Set([
  ...allEvents.map(event => event.country),
  ...userGroups.map(group => group.location?.split(',').at(-1)?.trim()),
].filter(country => country && getRegionForCountry(country)))].sort((a, b) => a.localeCompare(b));

function regionFromTimeZone() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const prefix = timeZone.split('/')[0];
  if (prefix === 'America') return 'north-america';
  if (prefix === 'Europe') return 'europe';
  if (prefix === 'Africa') return 'africa';
  if (prefix === 'Asia') return 'asia';
  if (prefix === 'Australia' || prefix === 'Pacific') return 'oceania';
  return 'all';
}

function groupRegion(group) {
  const country = group.location?.split(',').at(-1)?.trim();
  return getRegionForCountry(country);
}

function eventMatchesRegion(event, region, country) {
  if (event.eventFormat === 'Online') return true;
  if (country) return event.country?.toLocaleLowerCase() === country.toLocaleLowerCase();
  if (region === 'all') return true;
  return getRegionForCountry(event.country) === region;
}

function eventTime(event) {
  const start = new Date(event.startsAt);
  if (event.calendarAllDay) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(start);
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      timeZone: event.timeZone || undefined,
    }).format(start);
  } catch {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(start);
  }
}

function matchingWorkshops(serviceId, level) {
  const matches = catalog.workshops.filter(workshop => workshop.serviceIds.includes(serviceId));
  const preferred = matches.filter(workshop => workshop.level === level);
  return [...(preferred.length ? preferred : matches)].sort((a, b) =>
    Math.abs(Number(a.level) - Number(level)) - Math.abs(Number(b.level) - Number(level))
    || (a.durationHours ?? Infinity) - (b.durationHours ?? Infinity)
    || (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0)
  ).slice(0, 2);
}

function matchingEvents(region, country, format, service) {
  const now = Date.now();
  const upcoming = allEvents.filter(event => Date.parse(event.endsAt) >= now
    && (format === 'all' || event.eventFormat === format)
    && eventMatchesRegion(event, region, country));
  const terms = [service.name.replace(/^(Amazon|AWS)\s+/i, ''), ...(service.aliases || [])]
    .map(term => term.trim().toLocaleLowerCase()).filter(term => term.length > 3);
  const score = event => {
    const text = [event.name, event.description, ...(event.tags || []), event.tag].join(' ').toLocaleLowerCase();
    return terms.reduce((total, term) => total + Number(text.includes(term)), 0);
  };
  return upcoming.sort((a, b) => score(b) - score(a) || Date.parse(a.startsAt) - Date.parse(b.startsAt)).slice(0, 2);
}

function SelectField({ label, value, onChange, children }) {
  return <label className="path-field"><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)}>{children}</select></label>;
}

function ServiceBadge({ service }) {
  const icon = serviceIcons[service.id];
  return <span className="path-service-icon">{icon?.src ? <img src={icon.src} alt="" /> : service.name.slice(0, 2).toUpperCase()}</span>;
}

export default function BuildPathPlanner({ darkMode, onBack, initialServiceId = '' }) {
  const [serviceId, setServiceId] = useState(() => availableServices.find(service => service.id === initialServiceId)?.id
    || availableServices.find(service => service.id === 'amazon-bedrock-1')?.id
    || availableServices[0]?.id || '');
  const [level, setLevel] = useState('100');
  const [region, setRegion] = useState(regionFromTimeZone);
  const [country, setCountry] = useState('');
  const [format, setFormat] = useState('all');
  const countryOptions = countries.filter(item => region === 'all' || getRegionForCountry(item) === region);
  const service = availableServices.find(item => item.id === serviceId) || availableServices[0];
  const workshops = useMemo(() => service ? matchingWorkshops(service.id, level) : [], [service, level]);
  const events = useMemo(() => service ? matchingEvents(region, country, format, service) : [], [region, country, format, service]);
  const groups = useMemo(() => userGroups
    .filter(group => group.joinUrl && (country
      ? group.location?.split(',').at(-1)?.trim().toLocaleLowerCase() === country.toLocaleLowerCase()
      : region === 'all' || groupRegion(group) === region))
    .slice(0, 2), [region, country]);
  const regionName = country || (region === 'all' ? 'Anywhere' : getRegionLabel(region));
  const featuredPath = learningPathData.paths[0];
  const featuredSteps = featuredPath.steps.flatMap(step => {
    const workshop = catalog.workshops.find(item => item.id === step.workshopId);
    return workshop ? [{ ...step, workshop }] : [];
  });
  const featuredHours = featuredSteps.reduce((total, step) => total + (step.workshop.durationHours || 0), 0);
  const refreshedDate = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'Asia/Singapore' })
    .format(new Date(learningPathData.refreshedAt));

  return <main className="path-planner" data-theme={darkMode ? 'dark' : 'light'}>
    <div className="path-inner">
      <div className="path-topline"><span>YOUR NEXT AWS BUILD</span><button type="button" onClick={onBack}><ArrowLeftIcon size={16} /> Back to workshops</button></div>
      <header className="path-heading">
        <div><span className="path-kicker">A learning route, built around you</span><h1>Build My Path</h1><p>Choose a service and we’ll connect real AWS workshops, upcoming community events, and builders in your region.</p></div>
        <div className="path-step-count"><span>01 — 03</span><strong>Learn · Meet · Connect</strong><i><b /></i></div>
      </header>

      <section className="path-choices" aria-label="Personalize your learning path">
        <SelectField label="AWS service" value={serviceId} onChange={setServiceId}>
          {availableServices.map(item => <option key={item.id} value={item.id}>{item.name} · {workshopCounts.get(item.id)} workshops</option>)}
        </SelectField>
        <SelectField label="Experience level" value={level} onChange={setLevel}>
          {Object.entries(WORKSHOP_LEVELS).map(([value, label]) => <option key={value} value={value}>{value} · {label}</option>)}
        </SelectField>
        <SelectField label="Your region" value={region} onChange={value => { setRegion(value); setCountry(''); }}>
          <option value="all">Anywhere</option>{REGIONS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </SelectField>
        <SelectField label="Country / area" value={country} onChange={setCountry}>
          <option value="">{region === 'all' ? 'All countries' : `All ${getRegionLabel(region)} countries`}</option>
          {countryOptions.map(item => <option key={item} value={item}>{item}</option>)}
        </SelectField>
        <SelectField label="Event format" value={format} onChange={setFormat}>
          <option value="all">Any format</option><option value="Online">Online</option><option value="In person">In person</option><option value="Hybrid">Hybrid</option>
        </SelectField>
      </section>

      <section className="path-featured" aria-labelledby="path-featured-title">
        <div className="path-featured-heading">
          <div><span className="path-featured-kicker">AI-CURATED PATH · REFRESHED MONTHLY</span><h2 id="path-featured-title">{featuredPath.title}</h2><p>{featuredPath.description}</p></div>
          <a href={featuredPath.modelCatalogUrl || BEDROCK_MODEL_CATALOG_URL} target="_blank" rel="noopener noreferrer">Explore current Bedrock models <ArrowSquareOutIcon size={14} /></a>
        </div>
        <div className="path-featured-meta"><span>{featuredSteps.length} workshops</span><i>·</i><span>{featuredHours} hours</span><i>·</i><span>Catalog reviewed {refreshedDate}</span></div>
        <ol className="path-featured-steps">
          {featuredSteps.map((step, index) => <li key={step.id}>
            <span className="path-featured-number">{String(index + 1).padStart(2, '0')}</span>
            <div className="path-featured-copy"><strong>{step.label}</strong><h3>{step.workshop.title}</h3><p>{step.rationale}</p></div>
            <a href={step.workshop.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${step.workshop.title}`}>Open workshop <ArrowSquareOutIcon size={14} /></a>
          </li>)}
        </ol>
        <p className="path-featured-note">Choose the latest model available in your AWS Region from the live Bedrock catalog. Workshop matches refresh on the first of each month.</p>
      </section>

      {service && <div className="path-results-heading"><div><ServiceBadge service={service} /><span><small>YOUR PATH FOR</small><strong>{service.name}</strong></span></div><span>{regionName} <i>·</i> {WORKSHOP_LEVELS[level]}</span></div>}

      <section className="path-steps" aria-label="Recommended learning path">
        <article className="path-step path-step-workshop">
          <div className="path-step-marker"><BookOpenIcon size={18} /></div>
          <div className="path-step-title"><span>01 · LEARN</span><h2>Start with a workshop</h2><p>Hands-on learning matched to your service and level.</p></div>
          <div className="path-recommendations">
            {workshops.length ? workshops.map(workshop => <div className="path-recommendation" key={workshop.id}>
              <div className="path-recommendation-meta"><span>{WORKSHOP_LEVELS[workshop.level] || `Level ${workshop.level}`}</span><span><ClockIcon size={13} /> {workshop.durationHours ? `${workshop.durationHours} hr${workshop.durationHours === 1 ? '' : 's'}` : 'Self-paced'}</span></div>
              <h3>{workshop.title}</h3><p>{workshop.sandboxAvailable ? 'Free sandbox available' : workshop.languages?.length ? `${workshop.languages[0].toUpperCase()} language` : 'Open workshop on AWS'}</p>
              <a href={workshop.url} target="_blank" rel="noopener noreferrer">Open workshop <ArrowSquareOutIcon size={14} /></a>
            </div>) : <div className="path-empty">No workshop is listed for this service yet. <a href={catalog.sourceUrl} target="_blank" rel="noopener noreferrer">Browse the AWS catalog <ArrowSquareOutIcon size={13} /></a></div>}
          </div>
        </article>

        <article className="path-step path-step-event">
          <div className="path-step-marker"><CalendarBlankIcon size={18} /></div>
          <div className="path-step-title"><span>02 · MEET</span><h2>Join the community</h2><p>Find a real upcoming event near you or online.</p></div>
          <div className="path-recommendations">
            {events.length ? events.map(event => <div className="path-recommendation" key={event.id}>
              <div className="path-recommendation-meta"><span>{event.eventFormat || 'Community event'}</span><span><ClockIcon size={13} /> {eventTime(event)}</span></div>
              <h3>{event.name}</h3><p>{event.location || event.country || 'Location details on event page'}{event.sourceLabel ? ` · ${event.sourceLabel}` : ''}</p>
              <div className="path-link-row"><a href={event.sourceUrl || event.profileUrl} target="_blank" rel="noopener noreferrer">View event <ArrowSquareOutIcon size={14} /></a><AddToCalendar event={event} /></div>
            </div>) : <div className="path-empty">No upcoming events match these choices. Try another region or format, or <a href="/?tab=builder-events">browse all events <ArrowSquareOutIcon size={13} /></a>.</div>}
          </div>
        </article>

        <article className="path-step path-step-group">
          <div className="path-step-marker"><UsersThreeIcon size={18} /></div>
          <div className="path-step-title"><span>03 · CONNECT</span><h2>Meet local builders</h2><p>Keep learning with an AWS User Group in {regionName.toLowerCase()}.</p></div>
          <div className="path-recommendations">
            {groups.length ? groups.map(group => <div className="path-recommendation path-group-recommendation" key={group.id}>
              <div className="path-recommendation-meta"><span>AWS USER GROUP</span><span><MapPinIcon size={13} /> {group.location}</span></div>
              <h3>{group.name}</h3><p>Learn together with builders in your community.</p>
              <a href={group.joinUrl} target="_blank" rel="noopener noreferrer">Find the group <ArrowSquareOutIcon size={14} /></a>
            </div>) : <div className="path-empty">No group is listed for {regionName}. <a href="/?tab=user-groups">Browse all AWS User Groups <ArrowSquareOutIcon size={13} /></a></div>}
          </div>
        </article>
      </section>

      <footer className="path-footnote">Recommendations use the current AWS workshop catalog, published event listings, and AWS User Group directory. Each link opens its source.</footer>
    </div>
  </main>;
}
