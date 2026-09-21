'use client';

import { useState } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../lib/config';

interface Article {
  id: number;
  url: string;
  title: string;
  summary: string;
  text?: string;
  sentiment: string;
  sector: string;
  impact_score: number;
  created_at: string;
}

interface SummaryOptionsProps {
  article: Article;
  onSummaryUpdated?: (newSummary: string, length: string) => void;
}

const SummaryOptions = ({ article, onSummaryUpdated }: SummaryOptionsProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedLength, setSelectedLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [showOptions, setShowOptions] = useState(false);
  const [summaries, setSummaries] = useState<{
    short?: string;
    medium?: string;
    long?: string;
  }>({});
  const [error, setError] = useState('');

  const handleRegenerateSummary = async (length: 'short' | 'medium' | 'long') => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`${API_ENDPOINTS.ANALYZE_URL.replace('/url', '')}/${article.id}/re-summarize?length=${length}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSummaries(prev => ({
          ...prev,
          [length]: data.new_summary
        }));
        
        if (onSummaryUpdated) {
          onSummaryUpdated(data.new_summary, length);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to regenerate summary');
      }
    } catch (err) {
      setError('An error occurred while regenerating the summary');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAllLengths = async () => {
    if (!article.text) {
      setError('Article text not available for re-summarization');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`${API_ENDPOINTS.ANALYZE_URL.replace('/url', '')}/summarize/all-lengths`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: article.text
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSummaries({
          short: data.short,
          medium: data.medium,
          long: data.long
        });
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to generate summaries');
      }
    } catch (err) {
      setError('An error occurred while generating summaries');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSummary = () => {
    return summaries[selectedLength] || article.summary;
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Article Summary</h3>
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-400 font-medium text-sm"
        >
          {showOptions ? 'Hide Options' : 'Summary Options'}
        </button>
      </div>

      {/* Current Summary */}
      <div className="bg-gray-50 dark:bg-black p-4 rounded-lg mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Summary ({selectedLength})
          </span>
          {summaries[selectedLength] && (
            <span className="text-xs text-green-600 dark:text-green-400">Updated</span>
          )}
        </div>
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
          {getCurrentSummary()}
        </p>
      </div>

      {showOptions && (
        <div className="space-y-4">
          {/* Length Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Summary Length
            </label>
            <div className="flex space-x-2">
              {(['short', 'medium', 'long'] as const).map((length) => (
                <button
                  key={length}
                  onClick={() => setSelectedLength(length)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedLength === length
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {length.charAt(0).toUpperCase() + length.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleRegenerateSummary(selectedLength)}
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 text-sm"
            >
              {loading ? 'Generating...' : `Generate ${selectedLength} Summary`}
            </button>
            
            <button
              onClick={handleGenerateAllLengths}
              disabled={loading || !article.text}
              className="bg-gray-600 dark:bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 text-sm"
            >
              {loading ? 'Generating...' : 'Generate All Lengths'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* All Summaries Preview */}
          {Object.keys(summaries).length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Generated Summaries:</h4>
              {(['short', 'medium', 'long'] as const).map((length) => (
                summaries[length] && (
                  <div key={length} className="bg-gray-50 dark:bg-black p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {length} Summary
                      </span>
                      <button
                        onClick={() => setSelectedLength(length)}
                        className="text-xs text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-400"
                      >
                        Use This
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {summaries[length]}
                    </p>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Summary Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Summary Tips:</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• <strong>Short:</strong> 1-2 sentences, key point only</li>
              <li>• <strong>Medium:</strong> 2-4 sentences, main points and context</li>
              <li>• <strong>Long:</strong> 4-6 sentences, comprehensive overview</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryOptions;