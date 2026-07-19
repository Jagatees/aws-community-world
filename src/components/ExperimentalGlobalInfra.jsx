import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'globe.gl';
import * as THREE from 'three';
import { geoCentroid } from 'd3-geo';
import { feature as topoFeature } from 'topojson-client';
import countriesTopo from 'world-atlas/countries-110m.json';
import trackedCommunityDays from '../data/community-days.json';
import officialSupplement from '../data/community-days-2026-supplement.json';

const EARTH_COUNTRIES = topoFeature(countriesTopo, countriesTopo.objects.countries).features;
const COUNTRY_COLORS = ['#76d9ec', '#8ccff3', '#9fbbf5', '#b1a7f2', '#c29bee'];
const TODAY = new Date().toISOString().slice(0, 10);

const EVENT_CORRECTIONS = {
  'cameroon-buea-2026': { location: 'Yaoundé, Cameroon', lat: 3.848, lng: 11.502 },
  'libya-2026': { date: '2026-09-26', profileUrl: 'https://www.meetup.com/aws-user-group-community-bulder-libya/events/313813783/' },
  'manila-aug-2026': { date: '2026-10-10', endDate: undefined },
  'netherlands-2026': { date: '2026-09-20' },
  'miami-2026': { name: 'AWS Community Day South Florida' },
};

const GEOGRAPHY_CONFIG = [
  { id: 'north-america', label: 'North America', center: { lat: 38, lng: -101, altitude: 1.58 }, countries: ['Canada', 'Panama', 'United States'] },
  { id: 'south-america', label: 'South America', center: { lat: -18, lng: -61, altitude: 1.75 }, countries: ['Argentina', 'Bolivia', 'Brazil', 'Colombia', 'Ecuador'] },
  { id: 'europe', label: 'Europe', center: { lat: 51, lng: 11, altitude: 1.62 }, countries: ['Armenia', 'Bulgaria', 'Germany', 'Greece', 'Hungary', 'Italy', 'Malta', 'Netherlands', 'Poland', 'Slovenia', 'Spain', 'Switzerland', 'United Kingdom'] },
  { id: 'middle-east', label: 'Middle East', center: { lat: 27, lng: 43, altitude: 1.72 }, countries: ['Bahrain', 'Israel', 'Saudi Arabia', 'United Arab Emirates'] },
  { id: 'africa', label: 'Africa', center: { lat: 4, lng: 20, altitude: 1.72 }, countries: ['Cameroon', 'Kenya', 'Libya', 'Nigeria'] },
  { id: 'asia-pacific', label: 'Asia Pacific', center: { lat: 25, lng: 105, altitude: 1.66 }, countries: ['China', 'Hong Kong', 'India', 'Malaysia', 'Philippines', 'Singapore'] },
  { id: 'anz', label: 'Australia and New Zealand', center: { lat: -30, lng: 152, altitude: 1.68 }, countries: ['Australia', 'New Zealand'] },
];

const ALL_COMMUNITY_DAYS = [...trackedCommunityDays, ...officialSupplement]
  .map((event) => ({ ...event, ...(EVENT_CORRECTIONS[event.id] || {}) }))
  .filter((event) => event.date?.startsWith('2026-'))
  .map((event) => ({
    ...event,
    status: (event.endDate || event.date) < TODAY ? 'past' : 'upcoming',
  }));

function sortEvents(first, second) {
  if (first.status !== second.status) return first.status === 'upcoming' ? -1 : 1;
  return first.status === 'upcoming'
    ? first.date.localeCompare(second.date)
    : second.date.localeCompare(first.date);
}

const GEOGRAPHIES = GEOGRAPHY_CONFIG.map((geography) => ({
  ...geography,
  events: ALL_COMMUNITY_DAYS
    .filter((event) => geography.countries.includes(event.country))
    .sort(sortEvents),
}));

function countryColor(country) {
  const longitude = geoCentroid(country)[0];
  if (!Number.isFinite(longitude)) return COUNTRY_COLORS[2];
  const normalized = Math.min(0.999, Math.max(0, (longitude + 180) / 360));
  return COUNTRY_COLORS[Math.floor(normalized * COUNTRY_COLORS.length)];
}

function formatEventDate(event) {
  const format = (date) => new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short' })
    .format(new Date(`${date}T00:00:00`));
  return event.endDate ? `${format(event.date)}–${format(event.endDate)}` : format(event.date);
}

export default function ExperimentalGlobalInfra() {
  const globeLayerRef = useRef(null);
  const globeRef = useRef(null);
  const [activeGeographyId, setActiveGeographyId] = useState(GEOGRAPHIES[0].id);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [eventsOpen, setEventsOpen] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const activeGeography = useMemo(
    () => GEOGRAPHIES.find((geography) => geography.id === activeGeographyId) || GEOGRAPHIES[0],
    [activeGeographyId],
  );
  const selectedEvent = activeGeography.events.find((event) => event.id === selectedEventId) || null;
  const upcomingCount = activeGeography.events.filter((event) => event.status === 'upcoming').length;
  const pastCount = activeGeography.events.length - upcomingCount;
  const totalUpcoming = ALL_COMMUNITY_DAYS.filter((event) => event.status === 'upcoming').length;
  const totalPast = ALL_COMMUNITY_DAYS.length - totalUpcoming;

  const showGeography = useCallback((geography) => {
    setActiveGeographyId(geography.id);
    setSelectedEventId(null);
    setEventsOpen(true);
    globeRef.current
      ?.pointsData(geography.events)
      .ringsData([])
      .pointOfView(geography.center, 900);
  }, []);

  const showEvent = useCallback((event) => {
    setSelectedEventId(event.id);
    globeRef.current
      ?.ringsData([event])
      .pointOfView({ lat: event.lat, lng: event.lng, altitude: 1.45 }, 750);
  }, []);

  useEffect(() => {
    if (!globeLayerRef.current) return undefined;
    const layer = globeLayerRef.current;
    const globe = Globe()(layer)
      .backgroundColor('rgba(0,0,0,0)')
      .globeMaterial(new THREE.MeshPhongMaterial({ color: '#e8ebff', shininess: 8 }))
      .showAtmosphere(true)
      .atmosphereColor('#80c8f3')
      .atmosphereAltitude(0.12)
      .showGraticules(false)
      .polygonsData(EARTH_COUNTRIES)
      .polygonCapColor(countryColor)
      .polygonSideColor(() => 'rgba(145, 154, 218, 0.44)')
      .polygonStrokeColor(() => 'rgba(255, 255, 255, 0.72)')
      .polygonAltitude(0.008)
      .pointsData(GEOGRAPHIES[0].events)
      .pointLat('lat')
      .pointLng('lng')
      .pointColor((event) => event.status === 'upcoming' ? '#ff9900' : '#66717e')
      .pointAltitude((event) => event.status === 'upcoming' ? 0.028 : 0.014)
      .pointRadius((event) => event.status === 'upcoming' ? 0.27 : 0.19)
      .pointsMerge(false)
      .ringsData([])
      .ringLat('lat')
      .ringLng('lng')
      .ringColor(() => (progress) => `rgba(255, 153, 0, ${Math.max(0, 1 - progress)})`)
      .ringMaxRadius(2.6)
      .ringPropagationSpeed(1.9)
      .ringRepeatPeriod(800)
      .pointOfView(GEOGRAPHIES[0].center);

    const controls = globe.controls();
    if (controls) {
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.autoRotate = false;
      controls.minDistance = globe.getGlobeRadius() * 1.25;
      controls.maxDistance = globe.getGlobeRadius() * 3.1;
    }
    globe.renderer()?.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    globeRef.current = globe;

    const resize = () => globe.width(Math.max(1, layer.clientWidth)).height(Math.max(1, layer.clientHeight));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(layer);

    return () => {
      observer.disconnect();
      const renderer = globe.renderer?.();
      globe._destructor?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      globeRef.current = null;
      layer.replaceChildren();
    };
  }, []);

  return (
    <section className="global-infra" aria-label="Interactive AWS Community Day 2026 explorer">
      <header className="global-infra__intro">
        <span>AWS COMMUNITY DAYS 2026</span>
        <strong>{ALL_COMMUNITY_DAYS.length} community-led events around the world</strong>
      </header>

      <div className="global-infra__geographies" role="tablist" aria-label="Community Day geographies">
        {GEOGRAPHIES.map((geography) => (
          <button
            key={geography.id}
            type="button"
            role="tab"
            aria-selected={geography.id === activeGeography.id}
            className={geography.id === activeGeography.id ? 'is-active' : ''}
            onClick={() => showGeography(geography)}
          >
            {geography.label}
          </button>
        ))}
      </div>

      <div className="global-infra__layout">
        <aside className="global-infra__panel">
          <div className="global-infra__panel-heading">
            <span>AWS Community Days 2026</span>
            <h2>{activeGeography.label}</h2>
          </div>

          <div className="global-infra__accordion">
            <button type="button" aria-expanded={eventsOpen} onClick={() => setEventsOpen((open) => !open)}>
              <span>Community Day events</span><b>{activeGeography.events.length}</b><i>{eventsOpen ? '−' : '+'}</i>
            </button>
            {eventsOpen && (
              <div className="global-infra__region-list">
                {activeGeography.events.length ? activeGeography.events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className={event.id === selectedEventId ? 'is-selected' : ''}
                    onClick={() => showEvent(event)}
                  >
                    <span className={event.status === 'past' ? 'is-past' : ''} aria-hidden="true" />
                    <b>{event.name}</b>
                    <small>{formatEventDate(event)}</small>
                  </button>
                )) : <p className="global-infra__empty">No 2026 Community Days announced here yet.</p>}
              </div>
            )}
            <div className="global-infra__legend"><span>● Upcoming</span><span>○ Past</span></div>
          </div>

          <div className="global-infra__accordion global-infra__accordion--edges">
            <button type="button" aria-expanded={timelineOpen} onClick={() => setTimelineOpen((open) => !open)}>
              <span>Event timeline</span><b>{activeGeography.events.length}</b><i>{timelineOpen ? '−' : '+'}</i>
            </button>
            {timelineOpen && <p>{upcomingCount} upcoming and {pastCount} past event{pastCount === 1 ? '' : 's'} in {activeGeography.label}.</p>}
          </div>

          <div className="global-infra__metrics">
            <span><b>{ALL_COMMUNITY_DAYS.length}</b> 2026 events</span>
            <span><b>{totalUpcoming}</b> upcoming</span>
            <span><b>{totalPast}</b> already happened</span>
          </div>
        </aside>

        <div className="global-infra__visual">
          <div ref={globeLayerRef} className="global-infra__globe" aria-hidden="true" />
          <div className="global-infra__globe-label" aria-live="polite">
            <span>{selectedEvent ? `${selectedEvent.status.toUpperCase()} · ${formatEventDate(selectedEvent)}` : '2026 EVENTS'}</span>
            <strong>{selectedEvent?.name || activeGeography.label}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
