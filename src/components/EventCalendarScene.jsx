import { useMemo, useRef, useState } from 'react';
import AddToCalendar from './AddToCalendar';
import { calendarDateKey, calendarEntries, eventsOnCalendarDay, monthCalendarDays, shiftCalendarMonth, validCalendarMonth } from '../utils/eventCalendarView';
import './EventCalendarScene.css';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dateLabel = (day, options) => new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));

export default function EventCalendarScene({ events, loading, darkMode, title, month, onMonthChange, onSelect }) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const today = calendarDateKey(new Date(), timeZone);
  const entries = useMemo(() => calendarEntries(events, timeZone), [events, timeZone]);
  const days = useMemo(() => monthCalendarDays(month), [month]);
  const byDay = useMemo(() => new Map(days.map(day => [day, eventsOnCalendarDay(entries, day)])), [days, entries]);
  const monthEntries = entries.filter(({ span }) => span.start <= `${month}-31` && span.end >= `${month}-01`);
  const [chosenDay, setChosenDay] = useState(null);
  const selectedDay = chosenDay?.startsWith(month) ? chosenDay
    : today.startsWith(month) ? today
    : days.find(day => day.startsWith(month) && byDay.get(day).length) || `${month}-01`;
  const selectedEvents = byDay.get(selectedDay) || [];
  const agendaRef = useRef(null);
  const time = value => new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(value));

  function chooseDay(day) {
    setChosenDay(day);
    if (!day.startsWith(month)) onMonthChange(day.slice(0, 7));
    if (window.matchMedia('(max-width: 767px)').matches) {
      requestAnimationFrame(() => agendaRef.current?.scrollIntoView({ block: 'nearest' }));
    }
  }

  return (
    <section className={`event-calendar${darkMode ? '' : ' event-calendar--light'}`} style={{ '--calendar-weeks': days.length / 7 }} aria-label={`${title} calendar`} aria-busy={loading}>
      <div className="event-calendar-header">
        <div>
          <p className="event-calendar-eyebrow">{title}</p>
          <h1 aria-live="polite">{dateLabel(`${month}-01`, { month: 'long', year: 'numeric' })}</h1>
          <p className="event-calendar-caption">{loading ? 'Loading events…' : `${monthEntries.length} ${monthEntries.length === 1 ? 'event' : 'events'} this month`} · Times in {timeZone}</p>
        </div>
        <div className="event-calendar-navigation" role="group" aria-label="Calendar navigation">
          <button type="button" onClick={() => { setChosenDay(today); onMonthChange(today.slice(0, 7)); }}>Today</button>
          <label><span className="sr-only">Jump to month</span><input aria-label="Jump to month" type="month" min="1900-01" max="9999-12" value={month} onChange={event => { if (validCalendarMonth(event.target.value)) onMonthChange(event.target.value); }} /></label>
          <button type="button" aria-label="Previous month" disabled={month === '1900-01'} onClick={() => onMonthChange(shiftCalendarMonth(month, -1))}>‹</button>
          <button type="button" aria-label="Next month" disabled={month === '9999-12'} onClick={() => onMonthChange(shiftCalendarMonth(month, 1))}>›</button>
        </div>
      </div>

      {!loading && monthEntries.length === 0 && <p className="event-calendar-empty-month" role="status">No events this month match your filters. Choose another month or adjust the filters.</p>}
      <div className="event-calendar-layout">
        <div className="event-calendar-month" role="table" aria-label={dateLabel(`${month}-01`, { month: 'long', year: 'numeric' })}>
          <div className="event-calendar-weekdays" role="row">{weekdays.map(day => <span key={day} role="columnheader">{day}</span>)}</div>
          {Array.from({ length: days.length / 7 }, (_, week) => (
            <div className="event-calendar-week" role="row" key={week}>
              {days.slice(week * 7, week * 7 + 7).map(day => {
                const items = byDay.get(day);
                return <div className={`event-calendar-day${day.startsWith(month) ? '' : ' is-outside'}${selectedDay === day ? ' is-selected' : ''}${day === today ? ' is-today' : ''}`} key={day} role="cell" data-date={day}>
                  <button type="button" className="event-calendar-date" aria-pressed={selectedDay === day} aria-current={day === today ? 'date' : undefined} aria-label={`${dateLabel(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${items.length} ${items.length === 1 ? 'event' : 'events'}`} onClick={() => chooseDay(day)}>
                    <span>{Number(day.slice(-2))}</span><span className="event-calendar-day-count">{items.length || ''}</span>
                  </button>
                  <div className="event-calendar-day-events">
                    {items.slice(0, 2).map(({ event, span }) => <button key={event.id} type="button" className={`event-calendar-chip${event.eventFormat === 'Online' ? ' is-online' : ''}`} title={`${event.name} · ${event.location}`} onClick={() => { setChosenDay(day); onSelect(event); }}>
                      <span>{span.allDay ? 'All day' : span.start < day ? 'Continues' : time(event.startsAt)}</span><strong>{event.name}</strong>
                    </button>)}
                    {items.length > 2 && <button type="button" className="event-calendar-more" onClick={() => chooseDay(day)}>+{items.length - 2} more</button>}
                  </div>
                </div>;
              })}
            </div>
          ))}
        </div>

        <aside ref={agendaRef} className="event-calendar-agenda" aria-label="Selected day events">
          <p className="event-calendar-eyebrow">Selected day</p>
          <h2>{dateLabel(selectedDay, { weekday: 'short', month: 'short', day: 'numeric' })}</h2>
          <p className="event-calendar-caption" aria-live="polite">{selectedEvents.length} {selectedEvents.length === 1 ? 'event' : 'events'}</p>
          {!loading && selectedEvents.length === 0 && <p className="event-calendar-empty-day">No events on this day match your filters. Select a date with an event count.</p>}
          {selectedEvents.map(({ event, span }) => <article className="event-calendar-agenda-item" key={event.id}>
            <p className="event-calendar-agenda-time">{span.allDay ? 'All day' : `${span.start < selectedDay ? 'Continues' : time(event.startsAt)}${event.endsAt ? ` – ${time(event.endsAt)}` : ''}`}</p>
            <button type="button" className="event-calendar-event-title" onClick={() => onSelect(event)}>{event.name}</button>
            <p>{[event.eventFormat, event.location].filter(Boolean).filter((part, index, parts) => parts.indexOf(part) === index).join(' · ')}</p>
            {span.end > span.start && <p className="event-calendar-span">{dateLabel(span.start, { day: 'numeric', month: 'short' })} – {dateLabel(span.end, { day: 'numeric', month: 'short' })}</p>}
            <div className="event-calendar-event-actions"><button type="button" onClick={() => onSelect(event)}>Details ↗</button><AddToCalendar event={event} /></div>
          </article>)}
          <p className="event-calendar-time-note">Timed events use your time zone. All-day events keep their published dates. Open an event for its original schedule and registration link.</p>
        </aside>
      </div>
    </section>
  );
}
