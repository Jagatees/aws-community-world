import { useEffect, useState } from 'react';

const NEWS_URL = new URL('../data/news.json', import.meta.url);
const HOURLY_REFRESH_MS = 60 * 60 * 1000;
const MAX_LATEST_ITEMS = 10;

const newsCache = { data: null, loadedAt: 0 };
let newsRequest = null;

/**
 * @param {boolean} enabled
 * @returns {{ news: import('../types').NewsData|null, loading: boolean, error: string|null }}
 */
async function fetchNewsPayload() {
  const response = await fetch(`${NEWS_URL.href}${NEWS_URL.href.includes('?') ? '&' : '?'}t=${Date.now()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to load news feed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();

  return {
    ...payload,
    latest: Array.isArray(payload?.latest) ? payload.latest.slice(0, MAX_LATEST_ITEMS) : [],
    trending: Array.isArray(payload?.trending) ? payload.trending.slice(0, MAX_LATEST_ITEMS) : [],
  };
}

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
    let intervalId = null;

    const syncNews = async (forceRefresh = false) => {
      try {
        if (!forceRefresh && newsCache.data) {
          setNews(newsCache.data);
          setLoading(false);
          setError(null);
          return;
        }

        if (!newsRequest || forceRefresh) {
          newsRequest = fetchNewsPayload().then((payload) => {
            newsCache.data = payload;
            newsCache.loadedAt = Date.now();
            return payload;
          });
        }

        setLoading(true);
        setError(null);

        const payload = await newsRequest;
        if (!cancelled) {
          setNews(payload);
          setLoading(false);
        }
      } catch {
        newsRequest = null;
        if (!cancelled) {
          setError('Could not load Builder Center news.');
          setNews(null);
          setLoading(false);
        }
      }
    };

    syncNews();
    intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      syncNews(true);
    }, HOURLY_REFRESH_MS);

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [enabled]);

  return { news, loading, error };
}
