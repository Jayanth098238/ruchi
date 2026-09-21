'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getApiUrl, API_ENDPOINTS } from '../../../utils/api';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import SectorChart from '../../../components/SectorChart';

const SectorPage = () => {
    const params = useParams();
    const sector = typeof params.sector === 'string' ? params.sector : '';
    const [sectorData, setSectorData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (sector) {
            const fetchSectorData = async () => {
                setLoading(true);
                setError(null);
                try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                        setError("Authentication required.");
                        setLoading(false);
                        return;
                    }

                    const response = await fetch(getApiUrl(`${API_ENDPOINTS.SECTOR}/${sector}/deep-research`), {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.detail || 'Failed to fetch sector data');
                    }

                    const data = await response.json();
                    if (data.message) {
                        setError(data.message);
                    } else {
                        setSectorData(data);
                    }
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };

            fetchSectorData();
        }
    }, [sector]);

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Deep Research: {sector.replace('%20', ' ')} Sector
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    Real-time and historical sector performance data from Alpha Vantage.
                </p>

                {loading && <div className="text-center text-gray-500">Loading sector data...</div>}
                {error && <div className="text-center text-red-500 bg-red-100 dark:bg-red-900/20 p-4 rounded-lg">{error}</div>}
                
                {sectorData && !error && (
                    <SectorChart 
                        data={sectorData} 
                        dataKey="Rank B: 1 Day Performance"
                        title="1-Day Sector Performance"
                    />
                )}
            </main>
            <Footer />
        </div>
    );
};

export default SectorPage;
