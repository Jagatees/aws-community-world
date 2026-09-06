const escapeText = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const dateKey = value => /^\d{4}-\d{2}-\d{2}/.test(value ?? '') ? value.slice(0, 10) : null;
const stamp = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
function foldLine(line) {
  const encoder = new TextEncoder();
  let result = '', length = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (length + bytes > 75) { result += '\r\n '; length = 1; }
    result += char; length += bytes;
  }
  return result;
}

export function getCalendarDates(event) {
  const start = dateKey(event.date || event.startsAt);
  if (!start || !Number.isFinite(Date.parse(start))) return null;
  // Community Days publish dates, not start times. Never export invented noon times.
  const allDay = event.category === 'community-days' || event.calendarAllDay === true || !event.startsAt;
  if (allDay) {
    const last = dateKey(event.endDate || event.endsAt) || start;
    if (!Number.isFinite(Date.parse(last)) || last < start) return null;
    const exclusiveEnd = new Date(`${last}T00:00:00Z`);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
    return [`DTSTART;VALUE=DATE:${start.replaceAll('-', '')}`, `DTEND;VALUE=DATE:${exclusiveEnd.toISOString().slice(0, 10).replaceAll('-', '')}`];
  }
  if (!Number.isFinite(Date.parse(event.startsAt))) return null;
  const values = [`DTSTART:${stamp(event.startsAt)}`];
  if (event.endsAt && Date.parse(event.endsAt) > Date.parse(event.startsAt)) values.push(`DTEND:${stamp(event.endsAt)}`);
  return values;
}

export function createEventCalendar(event, now = new Date()) {
  const dates = getCalendarDates(event);
  if (!dates) return null;
  const url = event.profileUrl || event.joinUrl || event.url || '';
  const description = [event.description, event.eventDate, 'Check the official event page for schedule changes.', /^https?:\/\//i.test(url) ? url : ''].filter(Boolean).join('\n');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AWS Community World//Events//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${escapeText(encodeURIComponent(event.id || `${event.name}-${event.date || event.startsAt}`))}@aws-community-world`,
    `DTSTAMP:${stamp(now)}`, ...dates, `SUMMARY:${escapeText(event.name)}`, `LOCATION:${escapeText(event.location)}`, `DESCRIPTION:${escapeText(description)}`,
    'END:VEVENT', 'END:VCALENDAR'];
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
