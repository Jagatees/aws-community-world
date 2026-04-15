import { useEffect, useState } from 'react';

const newsCache = { data: null };
let newsRequest = null;

/**
 * @param {boolean} enabled
 * @returns {{ news: import('../types').NewsData|null, loading: boolean, error: string|null }}
 */
export function useNews(enabled) {
  const [news, setNews] = useState(newsCache.data);
  const [loading, setLoading] = useState(enabled && !newsCache.data);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    if (newsCache.data) {
      setNews(newsCache.data);
      setLoading(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);

    if (!newsRequest) {
      newsRequest = import('../data/news.json').then((mod) => {
        newsCache.data = mod.default;
        return mod.default;
      });
    }

    newsRequest
      .then((payload) => {
        if (!cancelled) {
          setNews(payload);
          setLoading(false);
        }
      })
      .catch(() => {
        newsRequest = null;
        if (!cancelled) {
          setError('Could not load Builder Center news.');
          setNews(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { news, loading, error };
}
