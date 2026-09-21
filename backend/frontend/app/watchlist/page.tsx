'use client';

import { useEffect, useState } from 'react';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import { getWatchlist, removeFromWatchlist } from '../utils/helpers';
import { useRouter } from 'next/navigation';

interface WatchItem {
  title: string;
  url: string;
  source?: string | null;
  publishedAt?: string | null;
  description?: string | null;
  image?: string | null;
  savedAt?: string | null;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const router = useRouter();

  const load = () => {
    setItems(getWatchlist());
  };

  useEffect(() => {
    load();
  }, []);

  const handleRemove = (id: string) => {
    removeFromWatchlist(id);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors">
      <Navbar onLogout={() => { localStorage.removeItem('token'); router.push('/login'); }} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Watchlist</h1>
        </div>

        {items.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-600 dark:text-gray-300">
            No saved news yet. Go to the News page and add some.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((item) => (
              <div key={item.url || item.title} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <a href={item.url || '#'} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {item.source || 'Unknown Source'} {item.publishedAt ? `• ${new Date(item.publishedAt).toLocaleString()}` : ''}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{item.title}</div>
                    {item.description && (
                      <div className="text-sm text-gray-700 dark:text-gray-300">{item.description}</div>
                    )}
                    {item.savedAt && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">Saved {new Date(item.savedAt).toLocaleString()}</div>
                    )}
                  </div>
                </a>
                <div className="px-4 pb-4 flex gap-3">
                  <button
                    onClick={() => handleRemove(item.url || item.title)}
                    className="w-full text-center px-3 py-2 rounded-md text-sm font-medium border transition bg_WHITE dark:bg_BLACK text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
