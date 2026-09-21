'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface Article {
  id: number;
  url: string;
  title: string;
  summary: string;
  sentiment: string;
  sector: string;
  impact_score: number;
  created_at: string;
}

interface ArticlesSidebarProps {
  articles: Article[];
  isOpen: boolean;
  onToggle: () => void;
  onArticleSelect?: (article: Article) => void;
  selectedArticleId?: number;
}

const ArticlesSidebar = ({ 
  articles, 
  isOpen, 
  onToggle, 
  onArticleSelect, 
  selectedArticleId 
}: ArticlesSidebarProps) => {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'POSITIVE':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
      case 'NEGATIVE':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600';
    }
  };

  const getImpactColor = (score: number) => {
    if (score >= 0.7) return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
    if (score >= 0.4) return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
    return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
  };

  const getSectorColor = (sector: string) => {
    const colors = [
      'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700',
      'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700',
      'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700',
      'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-700',
      'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-700'
    ];
    const index = sector.length % colors.length;
    return colors[index];
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed top-20 left-0 z-50 bg-gray-600 dark:bg-gray-500 text-white p-2 rounded-r-lg shadow-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-all duration-300 ${
          isOpen ? 'left-64' : 'left-0'
        }`}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? (
          <ChevronLeftIcon className="h-5 w-5" />
        ) : (
          <ChevronRightIcon className="h-5 w-5" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-900 shadow-xl border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out z-40 ${
          isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gray-600 dark:bg-gray-500 text-white p-4">
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="h-6 w-6" />
              <h2 className="text-lg font-semibold">Your Articles</h2>
            </div>
            <p className="text-gray-100 dark:text-gray-200 text-sm mt-1">
              {articles.length} article{articles.length !== 1 ? 's' : ''} analyzed
            </p>
          </div>

          {/* Articles List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {articles.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">No articles yet</p>
                <p className="text-xs">Analyze some articles to see them here</p>
              </div>
            ) : (
              articles.map((article) => (
                <div
                  key={article.id}
                  className={`bg-white dark:bg-gray-800 border rounded-lg p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedArticleId === article.id
                      ? 'border-gray-500 bg-gray-50 dark:bg-gray-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => onArticleSelect?.(article)}
                >
                  {/* Article Title */}
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
                    {article.title || 'Untitled Article'}
                  </h3>

                  {/* Article URL */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
                    {article.url}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSentimentColor(article.sentiment)}`}>
                      {article.sentiment}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSectorColor(article.sector)}`}>
                      {article.sector}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getImpactColor(article.impact_score)}`}>
                      {article.impact_score.toFixed(2)}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(article.created_at).toLocaleDateString()}
                  </div>

                  {/* Summary Preview */}
                  {article.summary && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                      {article.summary}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black">
            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              <p>Click on an article to view details</p>
              <p className="mt-1">Use Q&A to ask questions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default ArticlesSidebar;
