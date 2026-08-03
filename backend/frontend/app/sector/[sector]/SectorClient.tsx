"use client";

import { useState, useEffect } from 'react';
import Navbar from '../../components/Common/Navbar.js';
import Footer from '../../components/Common/Footer.js';
import { buildApiUrl, API_ENDPOINTS } from '../../lib/config.js';

interface SectorClientProps {
  sector: string;
}

export default function SectorClient({ sector }: SectorClientProps) {
  const [sectorData, setSectorData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sector) return;
    const fetchSectorData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required.');
          setLoading(false);
          return;
        }
        const response = await fetch(
          buildApiUrl(`${API_ENDPOINTS.SECTOR}/${sector}/deep-research`),
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Failed to fetch sector data');
        }
        const data = await response.json();
        setSectorData(data.data || data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSectorData();
  }, [sector]);

  const renderChart = (dataKey: string, title: string) => {
    if (!sectorData || !sectorData.length) return null;
    const values = sectorData.map((p) => p[dataKey]);
    const first = values[0];
    const last = values[values.length - 1];
    const changePct = ((last - first) / Math.abs(first)) * 100;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
        <div className="flex justify-between items-baseline mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <div className="flex items-center gap-4">
            <span className={`text-sm font-medium ${changePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {changePct.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">Chart visualization will be displayed here</div>
        </div>
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Range: {min.toFixed(2)} – {max.toFixed(2)} over the last {sectorData.length} days
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar onLogout={() => {}} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Deep Research: {sector.replace(/-/g, ' ')} Sector
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Comprehensive sector performance analysis with historical data and trends.
        </p>
        {loading && <div className="text-center p-8 text-gray-500">Loading sector data...</div>}
        {error && (
          <div className="text-center p-4 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-lg">
            {error}
          </div>
        )}
        {sectorData && !error && (
          <div className="space-y-8">
            {renderChart('Rank A: Real-Time Performance', 'Real-Time Sector Performance')}
            {renderChart('Rank B: 1 Day Performance', '1-Day Sector Performance')}
            {renderChart('Rank C: 5 Day Performance', '5-Day Sector Performance')}
            {renderChart('Rank D: 1 Month Performance', '1-Month Sector Performance')}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}