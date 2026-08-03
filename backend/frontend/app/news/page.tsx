'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import { addToWatchlist, isInWatchlist } from '../utils/helpers';

interface NewsItem {
  title: string;
  url: string;
  source?: string;
  publishedAt?: string;
  description?: string;
  image?: string;
}

const SECTORS = [
  { key: 'general', label: 'General' },
  { key: 'finance', label: 'Finance' },
  { key: 'sports', label: 'Sports' },
  { key: 'technology', label: 'Technology' },
  { key: 'health', label: 'Health' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'science', label: 'Science' },
  { key: 'crypto', label: 'Crypto' },
];

export default function NewsPage() {
  const router = useRouter();
  const [sector, setSector] = useState<string>('general');
  const rawBackendBase = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
  const backendBase = useMemo(() => {
    if (rawBackendBase) return rawBackendBase;
    if (typeof window !== 'undefined' && window.location.port === '3000') {
      // Auto-fallback to FastAPI when running Next dev
      return 'http://127.0.0.1:8000';
    }
    return '';
  }, [rawBackendBase]);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
  }, [router]);

  const fetchNews = async (s: string) => {
    setLoading(true);
    setError('');
    try {
      // Fetch from Python backend proxy to keep API key private
      const url = backendBase ? `${backendBase}/api/news/by-sector?sector=${encodeURIComponent(s)}&limit=20` : `/api/news/by-sector?sector=${encodeURIComponent(s)}&limit=20`;
      const res = await fetch(url);
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        setError(`Non-JSON response (${res.status}): ${text.slice(0, 180)}`);
        return;
      }
      if (res.ok) {
        setItems(data.items || []);
      } else {
        setError(data?.detail || data?.error || 'Failed to load news');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(sector);
  }, [sector]);

  const handleAdd = (item: NewsItem) => {
    addToWatchlist(item);
    // Optionally force a local state change to re-render disabled state
    setItems((prev) => [...prev]);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors">
      <Navbar onLogout={() => { localStorage.removeItem('token'); router.push('/login'); }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live News by Sector</h1>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {SECTORS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSector(s.key)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                  ${sector === s.key
                    ? 'bg-gray-600 dark:bg-gray-500 text-white border-gray-600'
                    : 'bg-gray-50 dark:bg-black text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}
                `}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-6 py-4 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-gray-100 dark:bg-gray-900 rounded-lg animate-pulse" />
            ))
          ) : (
            items.map((item, idx) => (
              <div key={idx} className="block bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:shadow-lg transition overflow-hidden">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {item.source} {item.publishedAt ? `• ${new Date(item.publishedAt).toLocaleString()}` : ''}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{item.title}</div>
                    {item.description && (
                      <div className="text-sm text-gray-700 dark:text-gray-300">{item.description}</div>
                    )}
                  </div>
                </a>
                <div className="px-4 pb-4">
                  <button
                    onClick={() => handleAdd(item)}
                    disabled={isInWatchlist(item)}
                    className={`w-full text-center px-3 py-2 rounded-md text-sm font-medium border transition
                      ${isInWatchlist(item)
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                        : 'bg-gray-600 dark:bg-gray-500 text-white border-gray-600 hover:bg-gray-700 dark:hover:bg-gray-600'}
                    `}
                  >
                    {isInWatchlist(item) ? 'Added to Watchlist' : 'Add to Watchlist'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

