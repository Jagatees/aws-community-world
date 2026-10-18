export function calendarDateKey(value, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).formatToParts(date);
  const part = type => parts.find(item => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function validCalendarMonth(value) {
  return /^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/.test(value || '');
}

export function shiftCalendarMonth(month, offset) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function monthCalendarDays(month) {
  const [year, number] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, number - 1, 1));
  const weekday = (first.getUTCDay() + 6) % 7; // Monday first.
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((weekday + days) / 7) * 7 }, (_, index) =>
    new Date(Date.UTC(year, number - 1, 1 - weekday + index)).toISOString().slice(0, 10));
}

function dateOnly(value) {
  const key = String(value || '').slice(0, 10);
  const date = new Date(`${key}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key ? key : null;
}

export function eventCalendarSpan(event, timeZone) {
  const allDay = Boolean(event.date || event.calendarAllDay || event.category === 'community-days');
  if (allDay) {
    const start = dateOnly(event.date || event.startsAt);
    const end = dateOnly(event.endDate || event.endsAt || event.date || event.startsAt);
    return start && end && end >= start ? { start, end, allDay: true } : null;
  }
  const start = Date.parse(event.startsAt);
  const end = Date.parse(event.endsAt || event.startsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  // An event ending at midnight does not occupy the following day.
  return { start: calendarDateKey(start, timeZone), end: calendarDateKey(Math.max(start, end - 1), timeZone), allDay: false };
}

export function calendarEntries(events, timeZone) {
  return events.map(event => ({ event, span: eventCalendarSpan(event, timeZone) })).filter(entry => entry.span)
    .sort((a, b) => a.span.start.localeCompare(b.span.start) || Number(b.span.allDay) - Number(a.span.allDay) || (Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt) || a.event.name.localeCompare(b.event.name)));
}

export function eventsOnCalendarDay(entries, day) {
  return entries.filter(({ span }) => span.start <= day && span.end >= day);
}
