export const DEFAULT_EVENT_FILTERS = { format: 'all', city: '', sort: 'soonest' };

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
