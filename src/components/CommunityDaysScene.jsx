import { createElement, useCallback, useMemo } from 'react';
import ListScene from './ListScene';
import communityDays from '../data/community-days.json';
import { getRegionForCountry } from '../utils/countryRegions';

function formatDate(event) {
  const formatter = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' });
  const start = formatter.format(new Date(`${event.date}T12:00:00`));
  if (!event.endDate) return start;
  return `${start} – ${formatter.format(new Date(`${event.endDate}T12:00:00`))}`;
}

function countdownTo(date, now) {
  const difference = new Date(`${date}T00:00:00`).getTime() - now.getTime();
  if (difference <= 0) return 'Happening today';
  const totalSeconds = Math.floor(difference / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s to go`;
}

const COMMUNITY_DAY_VIEWS = ['orbit', 'classic', 'sleek', 'flat', 'geolibre', 'list'];

function viewLabel(view) {
  if (view === 'classic') return 'Mapbox';
  if (view === 'geolibre') return 'GeoLibre';
  return view.charAt(0).toUpperCase() + view.slice(1);
}

export default function CommunityDaysScene({
  darkMode,
  Scene: ActiveScene,
  globeDesign,
  onDesignChange,
  zoomCommand,
  onZoom,
  onNearMe,
  nearMeLoading,
  flyToTarget,
  selectedRegions = [],
  selectedCountries = [],
}) {
  const now = useMemo(() => new Date(), []);

  const events = useMemo(() => {
    const upcomingByCountry = new Map();
    communityDays
      .filter((event) => new Date(`${event.endDate || event.date}T23:59:59`) >= now)
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((event) => {
        if (!upcomingByCountry.has(event.country)) upcomingByCountry.set(event.country, event);
      });

    return communityDays.map((event) => {
      const eventEnded = new Date(`${event.endDate || event.date}T23:59:59`) < now;
      const nextLocalEvent = upcomingByCountry.get(event.country);
      const countdownLabel = eventEnded
        ? nextLocalEvent
          ? `Next in ${event.country}: ${countdownTo(nextLocalEvent.date, now)}`
          : `Ended · stay tuned for the next ${event.country} Community Day`
        : countdownTo(event.date, now);
      const countdownEvent = eventEnded ? nextLocalEvent : event;

      return {
        ...event,
        category: 'community-days',
        eventStatus: eventEnded ? 'past' : 'upcoming',
        eventDateLabel: formatDate(event),
        eventDate: formatDate(event),
        tag: eventEnded ? 'Ended' : 'Upcoming',
        countdownLabel,
        countdownAt: countdownEvent ? `${countdownEvent.date}T00:00:00` : '',
        countdownPrefix: eventEnded && nextLocalEvent ? `Next in ${event.country}: ` : '',
        avatarUrl: '',
      };
    }).filter((event) => {
      if (selectedRegions.length && !selectedRegions.includes(getRegionForCountry(event.country))) return false;
      if (selectedCountries.length && !selectedCountries.includes(event.country)) return false;
      return true;
    });
  }, [now, selectedCountries, selectedRegions]);

  const openOfficialSite = useCallback((payload) => {
    const event = Array.isArray(payload) ? payload[0] : payload;
    if (event?.profileUrl) window.open(event.profileUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const panelBackground = darkMode ? 'rgba(8, 16, 24, 0.84)' : 'rgba(255, 255, 255, 0.9)';
  const panelBorder = darkMode ? 'rgba(92, 120, 145, 0.46)' : 'rgba(150, 179, 205, 0.72)';
  const heading = darkMode ? '#FFFFFF' : '#0F1923';
  const muted = darkMode ? '#A7BDCF' : '#537190';
  const controlBackground = darkMode ? 'rgba(8, 16, 24, 0.86)' : 'rgba(255, 255, 255, 0.92)';
  const controlText = darkMode ? '#DCE7F0' : '#17324B';
  const isListView = globeDesign === 'list';
  const isGeoLibreView = globeDesign === 'geolibre';

  return (
    <section className="relative h-full min-h-0 overflow-hidden" aria-label="AWS Community Days globe">
      {isListView ? (
        <ListScene
          category="community-days"
          members={events}
          darkMode={darkMode}
          onItemClick={openOfficialSite}
        />
      ) : (
        createElement(ActiveScene, {
          category: 'community-days',
          members: events,
          onMarkerClick: openOfficialSite,
          darkMode,
          zoomCommand,
          flyToTarget,
        })
      )}

      {!isListView && <div
        className="pointer-events-none absolute left-4 top-4 z-20 min-w-[110px] rounded-xl px-3.5 py-2.5"
        style={{ background: panelBackground, border: `1px solid ${panelBorder}`, backdropFilter: 'blur(14px)' }}
      >
        <div className="mb-1.5 flex items-center gap-2">
          <span className="relative inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center">
            <span className="absolute h-2.5 w-2.5 rounded-full bg-[#FF9900] [animation:live-ring_2s_ease-out_infinite]" />
            <span className="relative block h-2 w-2 rounded-full bg-[#FF9900]" />
          </span>
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.08em]" style={{ color: darkMode ? '#A7BDCF' : '#537190' }}>
            Community Days
          </span>
        </div>
        <div className="text-[1.55rem] font-black leading-none tracking-[-0.02em] tabular-nums" style={{ color: heading }}>
          {events.length.toLocaleString()}
        </div>
        <div className="mt-1 text-[0.68rem] font-medium" style={{ color: muted }}>events worldwide</div>
      </div>}

      <div className="community-days-controls absolute bottom-3 left-1/2 z-30 -translate-x-1/2 sm:bottom-5">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-stretch sm:gap-3">
          <div
            className="flex items-center rounded-full p-1"
            style={{ background: controlBackground, border: `1px solid ${panelBorder}`, backdropFilter: 'blur(14px)' }}
            aria-label="Community Days view switcher"
          >
            {COMMUNITY_DAY_VIEWS.map((view) => {
              const active = globeDesign === view;
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => onDesignChange(view)}
                  className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                  style={{
                    minWidth: '52px',
                    minHeight: '44px',
                    color: active ? '#0F1923' : controlText,
                    background: active ? '#FF9900' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {viewLabel(view)}
                </button>
              );
            })}
          </div>

          {!isListView && !isGeoLibreView && (
            <>
              <div
                className="flex items-center rounded-full p-1"
                style={{ background: controlBackground, border: `1px solid ${panelBorder}`, backdropFilter: 'blur(14px)' }}
                aria-label="Zoom controls"
              >
                <button type="button" onClick={() => onZoom('out')} aria-label="Zoom out" className="min-h-11 min-w-11 rounded-full text-sm font-bold" style={{ color: controlText }}>−</button>
                <button type="button" onClick={() => onZoom('in')} aria-label="Zoom in" className="min-h-11 min-w-11 rounded-full text-sm font-bold" style={{ color: controlText }}>+</button>
              </div>
              <button
                type="button"
                onClick={onNearMe}
                disabled={nearMeLoading}
                className="min-h-11 rounded-full px-4 text-xs font-bold transition-colors"
                style={{ background: controlBackground, border: `1px solid ${panelBorder}`, color: controlText, cursor: nearMeLoading ? 'wait' : 'pointer' }}
              >
                {nearMeLoading ? 'Locating…' : 'Near Me'}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
