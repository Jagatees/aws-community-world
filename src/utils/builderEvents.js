export const DEFAULT_EVENT_FILTERS = { format: 'all', city: '', sort: 'soonest' };

/** Convert Kiro RSS items into the shared event shape used by Builder Center Events. */
export function normalizeKiroEvent(event) {
  const location = typeof event.location === 'string' ? event.location.trim() : '';
  const isOnline = /^(online|virtual)$/i.test(location) || Boolean(event.isLivestream);
  const placeParts = location.split(',').map(part => part.trim()).filter(Boolean);
  const country = isOnline ? '' : placeParts.length > 1 ? placeParts.at(-1) : location;
  const city = !isOnline && placeParts.length > 1 ? placeParts[0] : '';
  return {
    ...event,
    id: `kiro-${event.id}`,
    category: 'builder-events',
    eventFormat: isOnline ? 'Online' : 'In person',
    city,
    country,
    countryCode: '',
    tags: event.tag ? [event.tag] : [],
    access: 'See event page',
    sourceUrl: event.source || 'https://kiro.dev/events/feed.rss',
    sourceLabel: 'Kiro Events feed',
    coordinatePrecision: isOnline ? null : placeParts.length > 1 ? 'city' : 'country',
    coordinateSource: isOnline ? '' : 'Kiro RSS location',
    lat: isOnline ? 0 : event.lat,
    lng: isOnline ? 0 : event.lng,
  };
}

export function readEventFilters(params) {
  return {
    format: ['In person', 'Online', 'Hybrid'].includes(params.get('format')) ? params.get('format') : 'all',
    city: params.get('city')?.trim() || '',
    sort: ['latest', 'name'].includes(params.get('sort')) ? params.get('sort') : 'soonest',
  };
}

export function matchesBuilderEventFilters(event, filters) {
  return (filters.format === 'all' || event.eventFormat === filters.format) && (!filters.city || event.city === filters.city);
}

export function sortBuilderEvents(events, sort = 'soonest') {
  return [...events].sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name)
    : (sort === 'latest' ? -1 : 1) * (Date.parse(a.startsAt) - Date.parse(b.startsAt)) || a.name.localeCompare(b.name));
}
