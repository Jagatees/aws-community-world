import { useState, useEffect } from 'react';

const categoryCache = new Map();
const categoryRequestCache = new Map();
const EMPTY_MEMBERS = [];

const DATA_LOADERS = {
  heroes: () => import('../data/heroes.json'),
  'community-builders': () => import('../data/community-builders.json'),
  'user-groups': () => import('../data/user-groups.json'),
  'cloud-clubs': () => import('../data/cloud-clubs.json'),
  'kiro-ambassadors': () => import('../data/kiro-ambassadors.json'),
  'kiro-events': () => import('../data/kiro-events.json'),
  'community-days': () => import('../data/community-days.json'),
  'builder-lofts': () => import('../data/builder-lofts.json'),
  'aws-ambassadors': () => import('../data/aws-ambassadors.json'),
};

/**
 * Normalize raw JSON entries into the common Member shape.
 * @param {any[]} raw
 * @param {string} category
 * @returns {import('../types').Member[]}
 */
function normalizeMembers(raw, category) {
  return raw.map((item, i) => ({
    id: item.id ?? `${category}-${i}`,
    name: item.name ?? '',
    avatarUrl: item.avatarUrl ?? item.image_url ?? '',
    profileUrl: item.profileUrl ?? item.hero_page_url ?? item.joinUrl ?? '',
    builderProfileUrl: item.builderProfileUrl ?? '',
    location: item.location ?? '',
    lat: item.lat ?? 0,
    lng: item.lng ?? 0,
    category,
    tag: item.tag ?? item.hero_type ?? item.specialty ?? (category === 'kiro-ambassadors' ? 'Ambassadors' : ''),
    heroType: item.hero_type ?? '',
    builderType: item.builderType ?? item.builder_type ?? '',
    specialization: item.specialization ?? item.tag ?? '',
    ledBy: Array.isArray(item.ledBy) ? item.ledBy : [],
    isNew: Boolean(item.isNew),
    eventDate: item.eventDate ?? '',
    date: item.date,
    endDate: item.endDate,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    calendarAllDay: item.calendarAllDay,
    description: item.description ?? '',
    ctaLabel: item.ctaLabel ?? '',
    country: item.country ?? '',
    ...(category === 'kiro-ambassadors' ? {
      sourceUrl: item.sourceUrl,
      verifiedAt: item.verifiedAt,
      coordinatePrecision: item.coordinatePrecision,
    } : {}),
    ...(category === 'builder-lofts' ? {
      city: item.city,
      status: item.status,
      address: item.address,
      accessNote: item.accessNote,
      coordinatePrecision: item.coordinatePrecision,
      offerings: item.offerings ?? [],
      announcementDate: item.announcementDate,
      sourceUrl: item.sourceUrl,
      verifiedAt: item.verifiedAt,
    } : {}),
    builderCount: item.builderCount ?? 0,
    clusterOnly: Boolean(item.clusterOnly),
    forceSeparateMarker: Boolean(item.forceSeparateMarker),
    socialLinks: item.socialLinks && typeof item.socialLinks === 'object' ? item.socialLinks : {},
  }));
}

async function loadCategoryData(category, loadFullCommunityBuilders) {
  if (category === 'community-builders' && !loadFullCommunityBuilders) {
    const mod = await import('../data/community-builders-clusters.json');
    return normalizeMembers(mod.default, category);
  }

  const loader = DATA_LOADERS[category];
  if (!loader) return [];

  const mod = await loader();
  return normalizeMembers(mod.default, category);
}

/**
 * Loads community member data for the given category key.
 *
 * @param {import('../types').CategoryKey} category
 * @param {boolean} loadFullCommunityBuilders
 * @returns {{ members: import('../types').Member[], loading: boolean, error: string|null }}
 */
export function useCategory(category, loadFullCommunityBuilders = false) {
  const [result, setResult] = useState(null);
  const enabled = Boolean(category && category !== 'news');
  const cacheKey = `${category}:${loadFullCommunityBuilders ? 'full' : 'summary'}`;

  useEffect(() => {
    if (!enabled || categoryCache.has(cacheKey)) return;

    let cancelled = false;

    let request = categoryRequestCache.get(cacheKey);
    if (!request) {
      request = loadCategoryData(category, loadFullCommunityBuilders).then((normalized) => {
        categoryCache.set(cacheKey, normalized);
        categoryRequestCache.delete(cacheKey);
        return normalized;
      });
      categoryRequestCache.set(cacheKey, request);
    }

    request
      .then((normalized) => {
        if (!cancelled) {
          setResult({ cacheKey, members: normalized, error: null });
        }
      })
      .catch(() => {
        categoryRequestCache.delete(cacheKey);
        if (!cancelled) {
          setResult({ cacheKey, members: EMPTY_MEMBERS, error: 'Could not load community data.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, category, enabled, loadFullCommunityBuilders]);

  // Never hand a new renderer the previous category's members while its data loads.
  // Cached tabs are ready on the first render, without an extra animation-frame delay.
  const members = enabled ? categoryCache.get(cacheKey) : EMPTY_MEMBERS;
  const currentResult = enabled && result?.cacheKey === cacheKey ? result : null;
  return {
    members: members ?? currentResult?.members ?? EMPTY_MEMBERS,
    loading: enabled && !members && !currentResult,
    error: currentResult?.error ?? null,
  };
}
