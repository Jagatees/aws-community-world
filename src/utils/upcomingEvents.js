/** Keep ongoing events through their published end date/time. */
export function isUpcomingEvent(event, now = new Date()) {
  if (event.date || event.calendarAllDay) {
    const lastDay = (event.endDate || event.endsAt || event.date || event.startsAt || '').slice(0, 10);
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return /^\d{4}-\d{2}-\d{2}$/.test(lastDay) && Number.isFinite(Date.parse(lastDay)) && lastDay >= today;
  }
  const endTime = Date.parse(event.endsAt || event.startsAt);
  return Number.isFinite(endTime) && endTime >= now.getTime();
}

export function matchesEventStatus(event, status = 'all', now = new Date()) {
  if (status === 'all') return true;
  const lastDate = event.endDate || event.endsAt || event.date || event.startsAt;
  // Undated events belong only in All, never in Ended by default.
  if (!lastDate || !Number.isFinite(Date.parse(lastDate))) return false;
  return status === 'upcoming' ? isUpcomingEvent(event, now) : !isUpcomingEvent(event, now);
}
