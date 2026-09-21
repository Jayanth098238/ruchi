export function formatNumber(num) {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return String(num);
}

// Basic client-side watchlist storage for news items
// Stored under localStorage key 'news_watchlist' as an array of objects
export const WATCHLIST_STORAGE_KEY = 'news_watchlist';

export function getWatchlist() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function isInWatchlist(item) {
  const list = getWatchlist();
  const id = item?.url || item?.title;
  return !!list.find((x) => (x.url || x.title) === id);
}

export function addToWatchlist(item) {
  if (typeof window === 'undefined') return;
  const list = getWatchlist();
  const id = item?.url || item?.title;
  if (!id) return;
  if (list.find((x) => (x.url || x.title) === id)) return; // dedupe
  const toStore = {
    title: item.title,
    url: item.url,
    source: item.source || null,
    publishedAt: item.publishedAt || null,
    description: item.description || null,
    image: item.image || null,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify([toStore, ...list]));
}

export function removeFromWatchlist(id) {
  if (typeof window === 'undefined') return;
  const list = getWatchlist();
  const filtered = list.filter((x) => (x.url || x.title) !== id);
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(filtered));
}
