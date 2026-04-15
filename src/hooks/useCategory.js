import { useState, useEffect } from 'react';

const categoryCache = new Map();
const categoryRequestCache = new Map();

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
    location: item.location ?? '',
    lat: item.lat ?? 0,
    lng: item.lng ?? 0,
    category,
    tag: item.tag ?? item.hero_type ?? item.specialty ?? '',
    heroType: item.hero_type ?? '',
    builderType: item.builderType ?? item.builder_type ?? '',
    specialization: item.specialization ?? item.tag ?? '',
    ledBy: Array.isArray(item.ledBy) ? item.ledBy : [],
  }));
}

/**
 * Loads community member data for the given category key.
 *
 * @param {import('../types').CategoryKey} category
 * @returns {{ members: import('../types').Member[], loading: boolean, error: string|null }}
 */
export function useCategory(category) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!category) return;
    if (category === 'news') {
      setMembers([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const cachedMembers = categoryCache.get(category);

    if (cachedMembers) {
      setMembers(cachedMembers);
      setLoading(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);

    let request = categoryRequestCache.get(category);
    if (!request) {
      request = import(`../data/${category}.json`).then((mod) => {
        const normalized = normalizeMembers(mod.default, category);
        categoryCache.set(category, normalized);
        return normalized;
      });
      categoryRequestCache.set(category, request);
    }

    request
      .then((normalized) => {
        if (!cancelled) {
          setMembers(normalized);
          setLoading(false);
        }
      })
      .catch(() => {
        categoryRequestCache.delete(category);
        if (!cancelled) {
          setError('Could not load community data.');
          setMembers([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [category]);

  return { members, loading, error };
}
