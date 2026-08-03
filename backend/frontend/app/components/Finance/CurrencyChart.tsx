'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildApiUrl } from '../../lib/config';

type SeriesPoint = { date: string; value: number };

function computeStats(points: SeriesPoint[]) {
  if (points.length === 0) return { changePct: 0, min: 0, max: 0 };
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const changePct = ((last - first) / first) * 100;
  const values = points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { changePct, min, max };
}

export default function CurrencyChart({ base, symbol, title }: { base: string; symbol: string; title?: string }) {
  const [points, setPoints] = useState<SeriesPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number>(90);
  const [showExplain, setShowExplain] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(buildApiUrl('/api/forex/timeseries'));
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        url.searchParams.set('base', base);
        url.searchParams.set('symbols', symbol);
        url.searchParams.set('start_date', start.toISOString().slice(0,10));
        url.searchParams.set('end_date', end.toISOString().slice(0,10));
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Failed fetching forex data');
        const data = await res.json();
        const rates = data?.rates || {};
        const series: SeriesPoint[] = Object.keys(rates)
          .sort()
          .map((date: string) => ({ date, value: Number(rates[date]?.[symbol]) }))
          .filter(p => !Number.isNaN(p.value));
        if (!cancelled) setPoints(series);
      } catch (e:any) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [base, symbol, days]);

  const { changePct, min, max } = useMemo(() => computeStats(points), [points]);

  // Basic responsive SVG line chart
  const width = 360;
  const height = 160;
  const padding = 28;
  const xScale = (i: number) => padding + (i * (width - 2 * padding)) / Math.max(points.length - 1, 1);
  const yScale = (v: number) => {
    const domainMin = min === max ? min - 1 : min;
    const domainMax = min === max ? max + 1 : max;
    return height - padding - ((v - domainMin) * (height - 2 * padding)) / (domainMax - domainMin);
  };

  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(p.value)}`)
      .join(' ');
  }, [points, min, max]);

  const latestVal = points.length ? points[points.length - 1].value : null;

  return (
    <div style={{ border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>{title || `${base}/${symbol}`}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {latestVal !== null && <span style={{ fontSize: 12, color: '#93c5fd' }}>{latestVal.toFixed(4)}</span>}
          <span style={{ fontSize: 12, color: changePct >= 0 ? '#34d399' : '#f87171' }}>{changePct.toFixed(2)}%</span>
          <select value={days} onChange={(e)=>setDays(Number(e.target.value))} style={{ background: '#0b1220', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 6, padding: '4px 8px' }}>
            <option value={30}>30d</option>
            <option value={60}>60d</option>
            <option value={90}>90d</option>
          </select>
          <button onClick={()=>setShowExplain(v=>!v)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #374151', background: '#0b1220', color: '#e5e7eb' }}>{showExplain ? 'Hide' : 'Explain'}</button>
        </div>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
      {!loading && !error && (
        <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
          <path d={pathD} fill="none" stroke="#60a5fa" strokeWidth={2} />
        </svg>
      )}
      {!loading && !error && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
          Range {min.toFixed(4)} – {max.toFixed(4)} over last ~{days} days
        </div>
      )}
      {!loading && !error && showExplain && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#e5e7eb' }}>
          {changePct >= 0 ? 'Uptrend' : 'Downtrend'}: {Math.abs(changePct).toFixed(2)}% over the selected period. Latest value {latestVal?.toFixed(4)} sits {((latestVal || 0) - min >= (max - (latestVal || 0)) ? 'closer to the recent lows' : 'closer to the recent highs')}. Wider ranges indicate higher volatility.
        </div>
      )}
    </div>
  );
}


