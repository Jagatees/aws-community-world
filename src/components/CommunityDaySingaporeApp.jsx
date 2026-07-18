import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, Bell, CalendarBlank, CaretLeft, CaretRight, CheckCircle,
  Clock, List, MapPin, Moon, NavigationArrow, Star, Sun, X,
} from '@phosphor-icons/react';
import { EVENT, ROUTES, SESSIONS, TRACKS } from '../data/community-day-singapore-agenda';
import './CommunityDaySingaporeApp.css';

const FAVOURITES_KEY = 'community-day-singapore-favourites';
const REMINDER_LEAD_MS = 5 * 60 * 1000;

function sessionDate(session) {
  return new Date(`${EVENT.date}T${session.start}:00+08:00`);
}

function getStoredFavourites() {
  try {
    const value = JSON.parse(localStorage.getItem(FAVOURITES_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function minutesBetween(start, end) {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
}

function formatTime(value) {
  const [hour, minute] = value.split(':').map(Number);
  return new Intl.DateTimeFormat('en-SG', { hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(2026, 0, 1, hour, minute));
}

function showReminder(session) {
  const options = {
    body: `${session.title} starts at ${formatTime(session.start)} in ${session.room}.`,
    icon: '/favicon.png',
    tag: `community-day-${session.id}`,
  };
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SHOW_COMMUNITY_DAY_REMINDER', title: 'Starting in 5 minutes', options });
  } else if (Notification.permission === 'granted') {
    new Notification('Starting in 5 minutes', options);
  }
}

export default function CommunityDaySingaporeApp() {
  const [view, setView] = useState('list');
  const [status, setStatus] = useState('upcoming');
  const [track, setTrack] = useState('all');
  const [section, setSection] = useState('schedule');
  const [favourites, setFavourites] = useState(getStoredFavourites);
  const [notice, setNotice] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [routeId, setRouteId] = useState('downtown');
  const [routeStep, setRouteStep] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [theme, setTheme] = useState(() => (
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  ));
  const timers = useRef(new Map());

  useEffect(() => {
    document.title = `${EVENT.name} · Live`;
    navigator.serviceWorker?.register('/community-day-sw.js').catch(() => {});
    const clock = setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favourites));
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return undefined;

    const activeTimers = timers.current;
    favourites.forEach((id) => {
      const session = SESSIONS.find((item) => item.id === id);
      if (!session) return;
      const scheduleNextCheck = () => {
        const delay = sessionDate(session).getTime() - REMINDER_LEAD_MS - Date.now();
        if (delay <= 0) return;
        const nextDelay = Math.min(delay, 24 * 60 * 60 * 1000);
        activeTimers.set(id, setTimeout(() => {
          if (delay <= nextDelay) showReminder(session);
          else scheduleNextCheck();
        }, nextDelay));
      };
      scheduleNextCheck();
    });
    return () => activeTimers.forEach((timer) => clearTimeout(timer));
  }, [favourites]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const filteredSessions = useMemo(() => {
    return SESSIONS.filter((session) => {
      if (track !== 'all' && session.track !== track) return false;
      const start = sessionDate(session).getTime();
      if (status === 'favourites') return favourites.includes(session.id);
      if (status === 'past') return start < currentTime;
      return start >= currentTime;
    });
  }, [currentTime, favourites, status, track]);

  async function toggleFavourite(session) {
    const isFavourite = favourites.includes(session.id);
    if (isFavourite) {
      setFavourites((items) => items.filter((id) => id !== session.id));
      setNotice({ tone: 'neutral', text: `Removed “${session.title}” from favourites.` });
      return;
    }

    let permission = 'unsupported';
    if ('Notification' in window) {
      permission = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;
    }
    setFavourites((items) => [...items, session.id]);
    if (permission === 'granted') {
      setNotice({ tone: 'success', text: 'Favourite saved. We’ll notify you 5 minutes before it starts while this site is open.' });
    } else if (permission === 'denied') {
      setNotice({ tone: 'warning', text: 'Favourite saved. Notifications are blocked in your browser settings.' });
    } else {
      setNotice({ tone: 'warning', text: 'Favourite saved. This browser does not support event notifications.' });
    }
  }

  const emptyCopy = status === 'favourites'
    ? 'Star a session to build your personal agenda.'
    : status === 'past'
      ? 'No past sessions for this event yet.'
      : 'No sessions match this filter.';
  const route = ROUTES[routeId];

  return (
    <div className="cd-app" data-theme={theme}>
      <header className="cd-header">
        <div className="cd-topbar">
          <a className="cd-wordmark" href="/community-day-singapore" aria-label="AWS Community Day Singapore home">
            <span className="cd-wordmark-aws">AWS</span>
            <span className="cd-wordmark-rule" />
            <span>Community Day<br />Singapore</span>
          </a>
          <div className="cd-header-actions">
            <button className="cd-theme-toggle" type="button" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
              {theme === 'dark' ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
            </button>
            <a className="cd-register" href="https://www.awsugsg.dev/" target="_blank" rel="noreferrer">Event site <ArrowRight size={16} weight="bold" /></a>
          </div>
        </div>
      </header>

      <section className="cd-hero" aria-labelledby="community-day-title">
        <div className="cd-hero-copy">
          <p className="cd-kicker">Built by the community</p>
          <h1 id="community-day-title">AWS builders, together.</h1>
          <p className="cd-hero-summary">Plan your day, save talks, find the venue and get there on time.</p>
          <div className="cd-hero-facts">
            <span><strong>22</strong><small>Aug 2026</small></span>
            <span><strong>09:00</strong><small>Doors open</small></span>
            <span><strong>Level 5</strong><small>AWS Singapore</small></span>
          </div>
        </div>
        <div className="cd-hero-media">
          <img src="/community-day-singapore-hero.webp" alt="Singapore downtown towers and sheltered walkways at blue hour" />
        </div>
      </section>

      <main className="cd-main">
        {section === 'schedule' && (
          <>
            <div className="cd-controls">
              <div className="cd-segment cd-view-toggle" aria-label="Schedule view">
                <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="List view"><List size={18} /></button>
                <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')} aria-label="Calendar view"><CalendarBlank size={18} /></button>
              </div>
              <div className="cd-segment cd-status-toggle" aria-label="Session filter">
                {['upcoming', 'favourites', 'past'].map((item) => (
                  <button key={item} className={status === item ? 'active' : ''} onClick={() => setStatus(item)}>
                    {item === 'favourites' && <Star size={13} weight={status === item ? 'fill' : 'regular'} />} {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="cd-track-scroll" aria-label="Track filters">
              {TRACKS.map((item) => (
                <button key={item.id} className={`cd-track cd-track-${item.id} ${track === item.id ? 'active' : ''}`} onClick={() => setTrack(item.id)}>
                  <span />{item.label}
                </button>
              ))}
            </div>

            <section className="cd-schedule-shell">
              <div className="cd-day-heading">
                <div><h2>Saturday</h2><p>{filteredSessions.length} sessions <span>Programme preview</span></p></div>
                <div className="cd-date-chip"><small>AUG</small><strong>22</strong></div>
              </div>
              <p className="cd-agenda-note">Speaker and talk details will appear here when the public agenda is announced.</p>

              {!filteredSessions.length ? (
                <div className="cd-empty"><CalendarBlank size={30} /><p>{emptyCopy}</p></div>
              ) : view === 'list' ? (
                <div className="cd-session-list">
                  {filteredSessions.map((session) => (
                    <article className="cd-session-row" key={session.id}>
                      <button className="cd-session-open" onClick={() => setSelectedSession(session)}>
                        <div className="cd-session-time"><strong>{formatTime(session.start)}</strong><small>{minutesBetween(session.start, session.end)}m</small></div>
                        <div className="cd-session-copy">
                          <span className={`cd-session-type track-${session.track}`}>{session.type}</span>
                          <h3>{session.title}</h3>
                          <p><span className={`cd-dot track-${session.track}`} />{session.speaker} · {session.room}</p>
                        </div>
                        <CaretRight size={16} className="cd-row-arrow" />
                      </button>
                      <button className={`cd-star ${favourites.includes(session.id) ? 'active' : ''}`} onClick={() => toggleFavourite(session)} aria-label={`${favourites.includes(session.id) ? 'Remove' : 'Add'} ${session.title} ${favourites.includes(session.id) ? 'from' : 'to'} favourites`}>
                        <Star size={20} weight={favourites.includes(session.id) ? 'fill' : 'regular'} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="cd-calendar-grid">
                  {filteredSessions.map((session) => (
                    <button key={session.id} className={`cd-calendar-card track-${session.track}`} onClick={() => setSelectedSession(session)}>
                      <span>{formatTime(session.start)} · {session.room}</span><strong>{session.title}</strong><small>{session.speaker}</small>
                      <Star size={16} weight={favourites.includes(session.id) ? 'fill' : 'regular'} />
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {section === 'venue' && (
          <section className="cd-venue">
            <div className="cd-map">
              <iframe
                title="Map showing AWS Singapore at 2 Central Boulevard"
                src="https://www.openstreetmap.org/export/embed.html?bbox=103.8448%2C1.2742%2C103.8585%2C1.2852&layer=mapnik&marker=1.2797%2C103.8517"
                loading="lazy"
              />
            </div>
            <div className="cd-venue-card">
              <span className="cd-venue-icon"><MapPin size={22} weight="fill" /></span>
              <div><p>Event venue</p><h2>{EVENT.venue}</h2><span>{EVENT.address}</span></div>
              <a href={EVENT.mapUrl} target="_blank" rel="noreferrer">Open map <ArrowRight size={15} /></a>
            </div>
            <div className="cd-info-card"><NavigationArrow size={20} /><div><strong>Arriving by MRT?</strong><p>Downtown MRT Exit E is the simplest route. Open Getting here for step-by-step directions.</p></div></div>
          </section>
        )}

        {section === 'directions' && (
          <section className="cd-directions">
            <div className="cd-route-map">
              <iframe
                title={`Map from ${route.station} to AWS Singapore`}
                src="https://www.openstreetmap.org/export/embed.html?bbox=103.8465%2C1.2742%2C103.8567%2C1.2840&layer=mapnik&marker=1.2797%2C103.8517"
                loading="lazy"
              />
              <div className="cd-route-map-caption"><span>{route.code}</span><strong>{route.station}</strong><ArrowRight size={18} /><strong>AWS Singapore</strong></div>
            </div>
            <div className="cd-route-sheet">
              <h2>MRT route</h2>
              <div className="cd-route-tabs">
                {Object.entries(ROUTES).map(([id, item]) => <button key={id} className={routeId === id ? 'active' : ''} onClick={() => { setRouteId(id); setRouteStep(0); }}><b>{item.code}</b><span>{item.station}<small>{routeId === id ? 'Selected' : 'Alternative'}</small></span></button>)}
              </div>
              <p className="cd-route-note"><strong>Selected</strong> {route.note}</p>
              <div className="cd-step-head"><span>Step {routeStep + 1} of {route.steps.length}</span><button onClick={() => setRouteStep(0)}>Restart</button></div>
              <article className="cd-step-card">
                <div className="cd-step-visual"><NavigationArrow size={36} weight="fill" /><span>{route.steps[routeStep].label}</span></div>
                <div><span>{route.steps[routeStep].label}</span><h3>{route.steps[routeStep].title}</h3><p>{route.steps[routeStep].detail}</p></div>
              </article>
              <div className="cd-step-progress">{route.steps.map((_, index) => <span key={index} className={index <= routeStep ? 'active' : ''} />)}</div>
              <div className="cd-step-actions">
                <button disabled={routeStep === 0} onClick={() => setRouteStep((step) => Math.max(0, step - 1))}><CaretLeft size={18} /></button>
                <button onClick={() => setRouteStep((step) => Math.min(route.steps.length - 1, step + 1))}>{routeStep === route.steps.length - 1 ? 'Arrived' : 'Next step'} <CaretRight size={18} /></button>
              </div>
            </div>
          </section>
        )}

      </main>

      <nav className="cd-bottom-nav" aria-label="Event companion navigation">
        <button className={section === 'schedule' ? 'active' : ''} onClick={() => setSection('schedule')}><CalendarBlank size={18} />Schedule</button>
        <button className={section === 'venue' ? 'active' : ''} onClick={() => setSection('venue')}><MapPin size={18} />Venue map</button>
        <button className={section === 'directions' ? 'active' : ''} onClick={() => setSection('directions')}><NavigationArrow size={18} />Getting here</button>
      </nav>

      {notice && <div className={`cd-toast ${notice.tone}`} role="status">{notice.tone === 'success' ? <CheckCircle size={20} weight="fill" /> : <Bell size={20} />}<span>{notice.text}</span><button onClick={() => setNotice(null)} aria-label="Dismiss"><X size={16} /></button></div>}

      {selectedSession && (
        <div className="cd-modal" role="dialog" aria-modal="true" aria-label={selectedSession.title}>
          <button className="cd-modal-backdrop" onClick={() => setSelectedSession(null)} aria-label="Close session details" />
          <div className="cd-modal-card">
            <button className="cd-modal-close" onClick={() => setSelectedSession(null)} aria-label="Close"><X size={18} /></button>
            <span className={`cd-session-type track-${selectedSession.track}`}>{selectedSession.type}</span>
            <h2>{selectedSession.title}</h2>
            <p className="cd-modal-speaker">{selectedSession.speaker}</p>
            <div className="cd-modal-meta"><span><Clock size={17} />{formatTime(selectedSession.start)} to {formatTime(selectedSession.end)}</span><span><MapPin size={17} />{selectedSession.room}</span></div>
            <p className="cd-modal-copy">Full talk and speaker details will be added when the official programme is announced.</p>
            <button className={`cd-modal-star ${favourites.includes(selectedSession.id) ? 'active' : ''}`} onClick={() => toggleFavourite(selectedSession)}><Star size={19} weight={favourites.includes(selectedSession.id) ? 'fill' : 'regular'} />{favourites.includes(selectedSession.id) ? 'Saved to favourites' : 'Favourite & remind me'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
