'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import SummaryCard from '../components/Dashboard/SummaryCard';
import QuestionAnswer from '../components/QnA/QuestionAnswer';
import ArticlesSidebar from '../components/Common/ArticlesSidebar';
import SummaryOptions from '../components/Summary/SummaryOptions';
import { buildApiUrl, API_ENDPOINTS } from '../lib/config';

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

export default function Dashboard() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<Article | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Load user's articles
    loadArticles();
  }, [router]);

  const loadArticles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(API_ENDPOINTS.MY_ARTICLES), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setArticles(data);
      }
    } catch (err) {
      console.error('Error loading articles:', err);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCurrentAnalysis(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(API_ENDPOINTS.ANALYZE_URL), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentAnalysis(data);
        setUrl('');
        // Reload articles to show the new one
        await loadArticles();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Analysis failed');
      }
    } catch (err) {
      setError('An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const handleArticleSelect = (article: Article) => {
    setSelectedArticle(article);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'POSITIVE':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'NEGATIVE':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getImpactColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600 bg-green-100 border-green-200';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const getSectorColor = (sector: string) => {
    const colors = [
      'text-blue-600 bg-blue-100 border-blue-200',
      'text-purple-600 bg-purple-100 border-purple-200',
      'text-indigo-600 bg-indigo-100 border-indigo-200',
      'text-pink-600 bg-pink-100 border-pink-200',
      'text-orange-600 bg-orange-100 border-orange-200'
    ];
    const index = sector.length % colors.length;
    return colors[index];
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors">
      <Navbar onLogout={handleLogout} />
      
      {/* Articles Sidebar */}
      <ArticlesSidebar
        articles={articles}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onArticleSelect={handleArticleSelect}
        selectedArticleId={selectedArticle?.id}
      />
      
      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">News Analysis Dashboard</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/news')}
                className="hidden sm:inline-flex bg-gray-600 dark:bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Live News by Sector
              </button>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden bg-gray-600 dark:bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                {sidebarOpen ? 'Hide Articles' : 'Show Articles'}
              </button>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden bg-gray-600 dark:bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              {sidebarOpen ? 'Hide Articles' : 'Show Articles'}
            </button>
          </div>
          
          {/* Quick Stats */}
          {articles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-gray-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Articles</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{articles.length}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Positive Articles</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {articles.filter(a => a.sentiment === 'POSITIVE').length}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Negative Articles</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {articles.filter(a => a.sentiment === 'NEGATIVE').length}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                      <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Sectors Covered</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {new Set(articles.map(a => a.sector)).size}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Article Analysis Form */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-8 border border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Analyze News Article</h2>
            <form onSubmit={handleAnalyze} className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Article URL
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" />
                    </svg>
                  </div>
                  <input
                    type="url"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/news-article"
                    required
                    className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !url}
                className="w-full sm:w-auto bg-gray-600 dark:bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 flex items-center justify-center transition-colors"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : 'Analyze Article'}
              </button>
            </form>
            
            {error && (
              <div className="mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Current Analysis Result */}
          {currentAnalysis && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-8 border border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Analysis Result</h2>
              
              {/* Article Title */}
              {currentAnalysis.title && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Article Title</h3>
                  <p className="text-gray-700 dark:text-gray-300 text-lg">{currentAnalysis.title}</p>
                </div>
              )}

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {currentAnalysis.impact_score.toFixed(2)}
                  </div>
                  <div className="text-sm font-medium text-blue-700">Impact Score</div>
                  <div className="text-xs text-blue-600 mt-1">
                    {currentAnalysis.impact_score >= 0.7 ? 'High Impact' : 
                     currentAnalysis.impact_score >= 0.4 ? 'Medium Impact' : 'Low Impact'}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600 mb-2 capitalize">
                    {currentAnalysis.sentiment}
                  </div>
                  <div className="text-sm font-medium text-green-700">Sentiment</div>
                  <div className="text-xs text-green-600 mt-1">
                    {currentAnalysis.sentiment === 'POSITIVE' ? 'Bullish Outlook' : 
                     currentAnalysis.sentiment === 'NEGATIVE' ? 'Bearish Outlook' : 'Neutral Stance'}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                  <div className="text-xl font-bold text-purple-600 mb-2">
                    {currentAnalysis.sector}
                  </div>
                  <div className="text-sm font-medium text-purple-700">Sector</div>
                  <div className="text-xs text-purple-600 mt-1">Market Classification</div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
                  <div className="text-2xl font-bold text-orange-600 mb-2">
                    {new Date().toLocaleDateString()}
                  </div>
                  <div className="text-sm font-medium text-orange-700">Analyzed</div>
                  <div className="text-xs text-orange-600 mt-1">Today</div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 dark:bg-black p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">AI-Generated Summary</h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{currentAnalysis.summary}</p>
              </div>

              {/* Analysis Insights */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Key Insights</h4>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Impact Score: {currentAnalysis.impact_score >= 0.7 ? 'High market significance' : 
                                     currentAnalysis.impact_score >= 0.4 ? 'Moderate market impact' : 'Limited market impact'}
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Sentiment: {currentAnalysis.sentiment === 'POSITIVE' ? 'Positive market sentiment detected' : 
                                 currentAnalysis.sentiment === 'NEGATIVE' ? 'Negative market sentiment detected' : 'Neutral market sentiment'}
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      Sector: {currentAnalysis.sector} - Relevant for sector-specific analysis
                    </li>
                  </ul>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Recommendations</h4>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                      {currentAnalysis.impact_score >= 0.7 ? 'High priority analysis recommended' : 
                       currentAnalysis.impact_score >= 0.4 ? 'Moderate priority analysis' : 'Standard analysis sufficient'}
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                      {currentAnalysis.sentiment === 'POSITIVE' ? 'Consider bullish strategies' : 
                       currentAnalysis.sentiment === 'NEGATIVE' ? 'Consider defensive strategies' : 'Monitor for changes'}
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-pink-500 rounded-full mr-2"></span>
                      Track {currentAnalysis.sector} sector performance
                    </li>
                  </ul>
                </div>
              </div>
              
              {/* Enhanced Summary Options for Current Analysis */}
              <div className="mt-6">
                <SummaryOptions 
                  article={currentAnalysis} 
                  onSummaryUpdated={(newSummary, length) => {
                    setCurrentAnalysis(prev => prev ? {...prev, summary: newSummary} : null);
                    console.log('Summary updated for current analysis:', length, newSummary);
                  }}
                />
              </div>

              {/* QnA Component for Current Analysis */}
              <div className="mt-6">
                <QuestionAnswer 
                  article={currentAnalysis} 
                  onQuestionAsked={(question, answer) => {
                    console.log('Question asked about current analysis:', question, 'Answer:', answer);
                  }}
                />
              </div>
            </div>
          )}

          {/* Selected Article Details */}
          {selectedArticle && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-8 border border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Selected Article Details</h2>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Article Title</h3>
                <p className="text-gray-700 dark:text-gray-300 text-lg">{selectedArticle.title || 'Untitled'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-all">{selectedArticle.url}</p>
              </div>

              {/* Article Summary */}
              {selectedArticle.summary && (
                <div className="bg-gray-50 dark:bg-black p-6 rounded-lg mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Summary</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedArticle.summary}</p>
                </div>
              )}

              {/* Analysis Tags */}
              <div className="flex flex-wrap gap-3 mb-6">
                <span className={`px-3 py-2 rounded-full text-sm font-medium border ${getSentimentColor(selectedArticle.sentiment)}`}>
                  {selectedArticle.sentiment}
                </span>
                <span className={`px-3 py-2 rounded-full text-sm font-medium border ${getSectorColor(selectedArticle.sector)}`}>
                  {selectedArticle.sector}
                </span>
                <span className={`px-3 py-2 rounded-full text-sm font-medium border ${getImpactColor(selectedArticle.impact_score)}`}>
                  Impact: {selectedArticle.impact_score.toFixed(2)}
                </span>
                <span className="px-3 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                  {new Date(selectedArticle.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Enhanced Summary Options for Selected Article */}
              <div className="mt-6">
                <SummaryOptions 
                  article={selectedArticle} 
                  onSummaryUpdated={(newSummary, length) => {
                    setSelectedArticle(prev => prev ? {...prev, summary: newSummary} : null);
                    // Also update in articles list
                    setArticles(prev => prev.map(article => 
                      article.id === selectedArticle.id 
                        ? {...article, summary: newSummary}
                        : article
                    ));
                    console.log('Summary updated for selected article:', length, newSummary);
                  }}
                />
              </div>

              {/* QnA Component for Selected Article */}
              <div className="mt-6">
                <QuestionAnswer 
                  article={selectedArticle} 
                  onQuestionAsked={(question, answer) => {
                    console.log('Question asked about selected article:', question, 'Answer:', answer);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
