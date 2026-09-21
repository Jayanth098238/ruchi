'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildApiUrl } from '../../lib/config';

type Point = { date: string; value: number };

function simpleForecast(points: Point[], daysAhead: number): Point[] {
  if (points.length < 2) return [];
  const n = Math.min(points.length, 14);
  const recent = points.slice(-n);
  const xs = recent.map((_, i) => i);
  const ys = recent.map(p => p.value);
  const xMean = xs.reduce((a,b)=>a+b,0)/xs.length;
  const yMean = ys.reduce((a,b)=>a+b,0)/ys.length;
  const num = xs.reduce((acc, x, i) => acc + (x - xMean) * (ys[i] - yMean), 0);
  const den = xs.reduce((acc, x) => acc + (x - xMean) * (x - xMean), 0) || 1;
  const slope = num / den;
  const intercept = yMean - slope * xMean;
  const lastDate = new Date(recent[recent.length - 1].date);
  const forecasts: Point[] = [];
  for (let d = 1; d <= daysAhead; d++) {
    const nextX = xs.length - 1 + d;
    const nextVal = intercept + slope * nextX;
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + d);
    forecasts.push({ date: nextDate.toISOString().slice(0,10), value: Number(nextVal.toFixed(2)) });
  }
  return forecasts;
}

export default function CommodityChart({ commodity, currency, title, height: customHeight, unit }: { commodity: 'gold' | 'oil'; currency: 'INR' | 'USD'; title: string; height?: number; unit?: 'ounce' | 'gram' }) {
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<Point[]>([]);
  const [days, setDays] = useState<number>(30);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [customDays, setCustomDays] = useState<string>("");
  const [customPrediction, setCustomPrediction] = useState<Point | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(buildApiUrl('/api/commodities/timeseries'));
        url.searchParams.set('commodity', commodity);
        url.searchParams.set('currency', currency);
        url.searchParams.set('days', String(days));
        if (unit) url.searchParams.set('unit', unit);
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Failed to fetch commodity');
        const data = await res.json();
        const pts: Point[] = (data?.points || []).map((p: any) => ({ date: p.date, value: Number(p.value) }));
        if (!cancelled) setPoints(pts);
      } catch (e:any) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [commodity, currency, days]);

  const stats = useMemo(() => {
    if (points.length === 0) return { changePct: 0, min: 0, max: 0 };
    const first = points[0].value;
    const last = points[points.length - 1].value;
    const changePct = ((last - first) / (first || 1)) * 100;
    const min = Math.min(...points.map(p => p.value));
    const max = Math.max(...points.map(p => p.value));
    return { changePct, min, max };
  }, [points]);

  // Chart
  const width = 360;
  const height = customHeight || 200;
  const padding = 28;
  const allPoints = points.concat(forecast);
  const minVal = Math.min(...allPoints.map(p => p.value), stats.min || 0);
  const maxVal = Math.max(...allPoints.map(p => p.value), stats.max || 1);
  const xScale = (i: number) => padding + (i * (width - 2 * padding)) / Math.max(allPoints.length - 1, 1);
  const yScale = (v: number) => height - padding - ((v - minVal) * (height - 2 * padding)) / Math.max(maxVal - minVal, 1);
  const pathActual = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(p.value)}`).join(' ');
  const pathForecast = forecast.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xScale(idx + points.length - 1)} ${yScale(p.value)}`).join(' ');

  const latestVal = points.length ? points[points.length - 1].value : null;
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  function handleMouseMove(evt: React.MouseEvent<SVGSVGElement, MouseEvent>) {
    const rect = (evt.target as SVGElement).closest('svg')!.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    // invert xScale approximately
    const idx = Math.round(((x - padding) * Math.max(allPoints.length - 1, 1)) / Math.max(width - 2 * padding, 1));
    if (!Number.isFinite(idx)) return;
    const clamped = Math.max(0, Math.min(points.length - 1, idx));
    setHoverIdx(clamped);
  }

  function handleClick() {
    if (hoverIdx != null) setSelectedIdx(hoverIdx);
  }

  function handleCustomPredict() {
    const n = parseInt(customDays, 10);
    if (!Number.isFinite(n) || n <= 0 || n > 30) {
      setCustomPrediction(null);
      return;
    }
    const f = simpleForecast(points, n);
    if (f.length > 0) setCustomPrediction(f[f.length - 1]);
  }

  return (
    <div style={{ border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {latestVal !== null && <span style={{ fontSize: 12, color: '#93c5fd' }}>{currencySymbol}{latestVal.toFixed(2)}</span>}
          <span style={{ fontSize: 12, color: (stats.changePct >= 0 ? '#34d399' : '#f87171') }}>{stats.changePct.toFixed(2)}%</span>
          <select value={days} onChange={(e)=>setDays(Number(e.target.value))} style={{ background: '#0b1220', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 6, padding: '4px 8px' }}>
            <option value={30}>30d</option>
            <option value={60}>60d</option>
            <option value={90}>90d</option>
          </select>
        </div>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
      {!loading && !error && (
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} onMouseMove={handleMouseMove} onMouseLeave={()=>setHoverIdx(null)} onClick={handleClick} style={{ cursor: 'crosshair' }}>
          <path d={pathActual} fill="none" stroke="#60a5fa" strokeWidth={2} />
          {forecast.length > 0 && <path d={pathForecast} fill="none" stroke="#fbbf24" strokeDasharray="4 4" strokeWidth={2} />}
          {hoverIdx != null && points[hoverIdx] && (
            <>
              <line x1={xScale(hoverIdx)} y1={padding} x2={xScale(hoverIdx)} y2={height - padding} stroke="#374151" strokeDasharray="2 2" />
              <circle cx={xScale(hoverIdx)} cy={yScale(points[hoverIdx].value)} r={3} fill="#93c5fd" />
            </>
          )}
          {selectedIdx != null && points[selectedIdx] && (
            <>
              <line x1={xScale(selectedIdx)} y1={padding} x2={xScale(selectedIdx)} y2={height - padding} stroke="#6b7280" strokeDasharray="4 2" />
              <circle cx={xScale(selectedIdx)} cy={yScale(points[selectedIdx].value)} r={4} fill="#10b981" />
            </>
          )}
        </svg>
      )}
      {!loading && !error && latestVal !== null && (
        <div style={{ marginTop: 8, fontSize: 13, color: '#e5e7eb' }}>
          Current: {currencySymbol}{latestVal.toFixed(2)} per {commodity === 'gold' && unit === 'gram' ? 'gram' : 'unit'}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={() => setForecast(simpleForecast(points, 3))} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #374151', background: '#0b1220', color: '#e5e7eb' }}>Predict 3 days</button>
        <button onClick={() => setForecast(simpleForecast(points, 4))} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #374151', background: '#0b1220', color: '#e5e7eb' }}>Predict 4 days</button>
        {forecast.length > 0 && <button onClick={() => setForecast([])} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #374151', background: '#0b1220', color: '#e5e7eb' }}>Clear</button>}
        <input value={customDays} onChange={(e)=>setCustomDays(e.target.value)} placeholder="Days" inputMode="numeric" style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #374151', background: '#0b1220', color: '#e5e7eb', width: 80 }} />
        <button onClick={handleCustomPredict} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #374151', background: '#0b1220', color: '#e5e7eb' }}>Predict</button>
      </div>
      {!loading && !error && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
          Last {days} days in {currency}. Forecast uses a simple trend extrapolation for quick guidance.
        </div>
      )}
      {selectedIdx != null && points[selectedIdx] && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#e5e7eb' }}>
          {points[selectedIdx].date}: {currencySymbol}{points[selectedIdx].value.toFixed(2)}
        </div>
      )}
      {customPrediction && (
        <div style={{ marginTop: 8, fontSize: 14, color: '#93c5fd' }}>
          Predicted: {customPrediction.date} → {currencySymbol}{customPrediction.value.toFixed(2)}
        </div>
      )}
    </div>
  );
}


