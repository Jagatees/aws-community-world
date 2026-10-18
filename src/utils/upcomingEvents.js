import { calendarDateKey, eventCalendarSpan } from './eventCalendarView.js';

/** Homepage totals include both today's and future events. */
export function isUpcomingEvent(event, now = new Date()) {
  if (event.date || event.calendarAllDay) {
    const lastDay = (event.endDate || event.endsAt || event.date || event.startsAt || '').slice(0, 10);
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return /^\d{4}-\d{2}-\d{2}$/.test(lastDay) && Number.isFinite(Date.parse(lastDay)) && lastDay >= today;
  }
  const endTime = Date.parse(event.endsAt || event.startsAt);
  return Number.isFinite(endTime) && endTime > now.getTime();
}

/** Mutually exclusive date filters, using the same time zone as the calendar. */
export function getEventStatus(event, now = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const span = eventCalendarSpan(event, timeZone);
  if (!span) return null;
  const today = calendarDateKey(now, timeZone);
  if (!today) return null;
  const ended = span.allDay ? span.end < today : Date.parse(event.endsAt || event.startsAt) <= now.getTime();
  if (ended) return 'ended';
  return span.start > today ? 'upcoming' : 'today';
}

export function matchesEventStatus(event, status = 'all', now = new Date(), timeZone) {
  if (status === 'all') return true;
  // Undated or invalid events belong only in All.
  return getEventStatus(event, now, timeZone) === status;
}
