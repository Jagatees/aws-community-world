import { createEventCalendar, getCalendarDates } from '../utils/eventCalendar';

export default function AddToCalendar({ event }) {
  if (!getCalendarDates(event)) return null;
  function download() {
    const content = createEventCalendar(event);
    const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(event.name || 'event').replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 100)}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <button type="button" className="calendar-download" onClick={download} aria-label={`Add ${event.name} to calendar`} title="Download for Google Calendar, Apple Calendar or Outlook">＋ Add to Calendar</button>;
}
