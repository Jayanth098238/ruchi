'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Common/Navbar';
import { buildApiUrl, API_ENDPOINTS } from '../lib/config';
import CurrencyChart from '../components/Finance/CurrencyChart';
import CommodityChart from '../components/Finance/CommodityChart';

type NewsItem = {
  title: string | null;
  url: string | null;
  image?: string | null;
  source?: string | null;
  publishedAt?: string | null;
  description?: string | null;
};

function Section({ title, query, limit = 6 }: { title: string; query?: string; limit?: number }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(buildApiUrl(API_ENDPOINTS.NEWS_HEADLINES));
        if (query) url.searchParams.set('q', query);
        url.searchParams.set('limit', String(limit));
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Failed to fetch news');
        const data = await res.json();
        if (!cancelled) setItems((data?.items as NewsItem[]) || []);
      } catch (e:any) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [query, limit]);

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 12 }}>{title}</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
      {!loading && !error && (
        <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, listStyle: 'none', padding: 0 }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
              <a href={item.url || '#'} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{item.title}</div>
                {item.description && <div style={{ fontSize: 14, color: '#4b5563' }}>{item.description}</div>}
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>{item.source || ''}</div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function FinancePage() {
  const router = useRouter();
  return (
    <div style={{ background: '#000000', minHeight: '100vh' }}>
      <Navbar onLogout={() => { localStorage.removeItem('token'); router.push('/login'); }} />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', color: '#e5e7eb' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 24 }}>Finance</h1>

        {/* Global Finance News */}
        <Section title="Global Finance News" query="finance OR economy OR macro" />
        <Section title="Currency fluctuations (USD, EUR, INR, etc.)" query="USD OR EUR OR INR OR GBP OR JPY OR currency OR forex" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 16 }}>
          <CurrencyChart base="USD" symbol="EUR" title="USD/EUR" />
          <CurrencyChart base="USD" symbol="INR" title="USD/INR" />
          <CurrencyChart base="EUR" symbol="INR" title="EUR/INR" />
        </div>

        {/* Gold prediction only */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 16 }}>
          <CommodityChart commodity="gold" currency="INR" unit="gram" title="Gold (INR per gram) - Last 30 days" height={160} />
        </div>
      </main>
    </div>
  );
}


