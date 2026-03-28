import { useState, useEffect } from 'react';

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
          setMembers(mod.default);
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
