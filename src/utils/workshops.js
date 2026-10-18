export const DEFAULT_WORKSHOP_FILTERS = Object.freeze({
  mode: 'catalog',
  browse: 'services', service: '', category: '', level: '', language: '',
  duration: '', sort: 'popular', withWorkshops: false, sandbox: false,
});

export const WORKSHOP_LEVELS = { '100': 'Foundational', '200': 'Intermediate', '300': 'Advanced', '400': 'Expert' };
const SORTS = ['popular', 'title', 'updated', 'duration'];
const bounded = value => (value || '').trim().slice(0, 160);

export function readWorkshopFilters(params) {
  return {
    mode: params.get('mode') === 'world' ? 'world' : 'catalog',
    browse: params.get('browse') === 'workshops' ? 'workshops' : 'services',
    service: bounded(params.get('service')), category: bounded(params.get('category')),
    level: Object.hasOwn(WORKSHOP_LEVELS, params.get('level')) ? params.get('level') : '',
    language: /^[a-z]{2,3}$/.test(params.get('language') || '') ? params.get('language') : '',
    duration: ['short', 'medium', 'long'].includes(params.get('duration')) ? params.get('duration') : '',
    sort: SORTS.includes(params.get('sort')) ? params.get('sort') : 'popular',
    withWorkshops: params.get('withWorkshops') === '1', sandbox: params.get('sandbox') === '1',
  };
}

export function writeWorkshopParams(params, filters) {
  for (const [key, defaultValue] of Object.entries(DEFAULT_WORKSHOP_FILTERS)) {
    params.delete(key);
    if (filters[key] !== defaultValue && filters[key]) params.set(key, typeof filters[key] === 'boolean' ? '1' : filters[key]);
  }
}

export function languageName(code) {
  try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(code); }
  catch { return code; }
}

const normalize = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function matchesQuery(value, query) {
  const haystack = normalize(value);
  return normalize(query).trim().split(/\s+/).filter(Boolean).every(word => haystack.includes(word));
}

export function countServiceWorkshops(workshops) {
  const counts = new Map();
  for (const workshop of workshops) for (const id of new Set(workshop.serviceIds)) counts.set(id, (counts.get(id) || 0) + 1);
  return counts;
}

export function filterServices(catalog, filters, query = '') {
  const counts = countServiceWorkshops(catalog.workshops);
  return catalog.services.filter(service =>
    (!filters.category || service.categories.includes(filters.category))
    && (!filters.withWorkshops || counts.get(service.id) > 0)
    && matchesQuery([service.name, ...service.aliases, service.description, ...service.categories].join(' '), query)
  ).sort((a, b) => (filters.sort === 'title' ? 0 : (counts.get(b.id) || 0) - (counts.get(a.id) || 0)) || a.name.localeCompare(b.name));
}

export function filterWorkshops(catalog, filters, query = '') {
  const services = new Map(catalog.services.map(service => [service.id, service]));
  return catalog.workshops.filter(workshop => {
    const related = workshop.serviceIds.map(id => services.get(id)).filter(Boolean);
    return (!filters.service || workshop.serviceIds.includes(filters.service))
      && (!filters.category || related.some(service => service.categories.includes(filters.category)))
      && (!filters.level || workshop.level === filters.level)
      && (!filters.language || workshop.languages.includes(filters.language))
      && (!filters.sandbox || workshop.sandboxAvailable)
      && (!filters.duration || (workshop.durationHours != null && (
        filters.duration === 'short' ? workshop.durationHours <= 1
          : filters.duration === 'medium' ? workshop.durationHours > 1 && workshop.durationHours <= 3 : workshop.durationHours > 3
      )))
      && matchesQuery([workshop.title, workshop.description, ...workshop.services, ...workshop.topics, ...related.flatMap(service => [service.name, ...service.aliases])].join(' '), query);
  }).sort((a, b) => {
    if (filters.sort === 'title') return a.title.localeCompare(b.title);
    if (filters.sort === 'duration') return (a.durationHours ?? Infinity) - (b.durationHours ?? Infinity) || a.title.localeCompare(b.title);
    return (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0) || a.title.localeCompare(b.title);
  });
}
