import { useState, useEffect } from 'react';

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

    let cancelled = false;
    setLoading(true);
    setError(null);

    import(`../data/${category}.json`)
      .then((mod) => {
        if (!cancelled) {
          setMembers(normalizeMembers(mod.default, category));
          setLoading(false);
        }
      })
      .catch(() => {
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
