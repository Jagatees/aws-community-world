import { useState, useEffect } from 'react';

const categoryCache = new Map();
const categoryRequestCache = new Map();

const DATA_LOADERS = {
  heroes: () => import('../data/heroes.json'),
  'community-builders': () => import('../data/community-builders.json'),
  'user-groups': () => import('../data/user-groups.json'),
  'cloud-clubs': () => import('../data/cloud-clubs.json'),
  'kiro-ambassadors': () => import('../data/kiro-ambassadors.json'),
  'kiro-events': () => import('../data/kiro-events.json'),
  'community-days': () => import('../data/community-days.json'),
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
    description: item.description ?? '',
    ctaLabel: item.ctaLabel ?? '',
    country: item.country ?? '',
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
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!category) return;
    if (category === 'news') {
      const frame = window.requestAnimationFrame(() => {
        setMembers([]);
        setLoading(false);
        setError(null);
      });

      return () => window.cancelAnimationFrame(frame);
    }

    let cancelled = false;
    const cacheKey = `${category}:${loadFullCommunityBuilders ? 'full' : 'summary'}`;
    const cachedMembers = categoryCache.get(cacheKey);

    if (cachedMembers) {
      const frame = window.requestAnimationFrame(() => {
        setMembers(cachedMembers);
        setLoading(false);
        setError(null);
      });

      return () => {
        cancelled = true;
        window.cancelAnimationFrame(frame);
      };
    }

    const loadingFrame = window.requestAnimationFrame(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    });

    let request = categoryRequestCache.get(cacheKey);
    if (!request) {
      request = loadCategoryData(category, loadFullCommunityBuilders).then((normalized) => {
        categoryCache.set(cacheKey, normalized);
        return normalized;
      });
      categoryRequestCache.set(cacheKey, request);
    }

    request
      .then((normalized) => {
        if (!cancelled) {
          setMembers(normalized);
          setLoading(false);
        }
      })
      .catch(() => {
        categoryRequestCache.delete(cacheKey);
        if (!cancelled) {
          setError('Could not load community data.');
          setMembers([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(loadingFrame);
    };
  }, [category, loadFullCommunityBuilders]);

  return { members, loading, error };
}
