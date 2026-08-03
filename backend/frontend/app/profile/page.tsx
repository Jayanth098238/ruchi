'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import QuestionAnswer from '../components/QnA/QuestionAnswer';
import {
  UserIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ClockIcon,
  PencilIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  created_at: string;
}

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

interface UserStats {
  totalArticles: number;
  averageImpactScore: number;
  topSectors: string[];
  sentimentDistribution: { [key: string]: number };
  recentActivity: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    username: ''
  });
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Load user profile and articles
    loadUserProfile();
    loadUserArticles();
  }, [router]);

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setEditForm({
          full_name: userData.full_name || '',
          username: userData.username || ''
        });
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      setError('An error occurred while loading profile');
    }
  };

  const loadUserArticles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/analyze/my-articles', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const articlesData = await response.json();
        setArticles(articlesData);
        calculateUserStats(articlesData);
      }
    } catch (err) {
      console.error('Error loading articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateUserStats = (articlesData: Article[]) => {
    if (articlesData.length === 0) {
      setUserStats({
        totalArticles: 0,
        averageImpactScore: 0,
        topSectors: [],
        sentimentDistribution: {},
        recentActivity: 'No activity yet'
      });
      return;
    }

    const totalArticles = articlesData.length;
    const averageImpactScore = articlesData.reduce((sum, article) => sum + article.impact_score, 0) / totalArticles;
    
    // Count sectors
    const sectorCounts: { [key: string]: number } = {};
    articlesData.forEach(article => {
      sectorCounts[article.sector] = (sectorCounts[article.sector] || 0) + 1;
    });
    const topSectors = Object.entries(sectorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([sector]) => sector);

    // Count sentiments
    const sentimentDistribution: { [key: string]: number } = {};
    articlesData.forEach(article => {
      sentimentDistribution[article.sentiment] = (sentimentDistribution[article.sentiment] || 0) + 1;
    });

    // Recent activity
    const latestArticle = articlesData.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    const recentActivity = latestArticle ? 
      `Last analyzed: ${new Date(latestArticle.created_at).toLocaleDateString()}` : 
      'No recent activity';

    setUserStats({
      totalArticles,
      averageImpactScore: Math.round(averageImpactScore * 100) / 100,
      topSectors,
      sentimentDistribution,
      recentActivity
    });
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditForm({
      full_name: user?.full_name || '',
      username: user?.username || ''
    });
    setEditMode(false);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        setEditMode(false);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to update profile');
      }
    } catch (err) {
      setError('An error occurred while updating profile');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 dark:border-gray-400 mx-auto mb-4"></div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Loading Profile...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center transition-colors">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Profile not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors">
      <Navbar onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Your Profile</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">Manage your account and view your analysis insights</p>
        </div>
        
        {error && (
          <div className="mb-8 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-6 py-4 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}
        
        {/* User Stats Section */}
        {userStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-shadow duration-300">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-600 dark:text-gray-400 mb-2">{userStats.totalArticles}</div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Articles</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Analyzed</div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-shadow duration-300">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">{userStats.averageImpactScore}</div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg Impact Score</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Market Significance</div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-shadow duration-300">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {userStats.topSectors.length > 0 ? userStats.topSectors[0] : 'N/A'}
                </div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Top Sector</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Most Analyzed</div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-shadow duration-300">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                  {userStats.recentActivity.split(':')[0]}
                </div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Activity</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last Analysis</div>
              </div>
            </div>
          </div>
        )}

        {/* Sentiment Distribution */}
        {userStats && userStats.sentimentDistribution && Object.keys(userStats.sentimentDistribution).length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 mb-12 border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-center mb-6">
              <ChartBarIcon className="h-8 w-8 text-gray-600 dark:text-gray-400 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sentiment Analysis Overview</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {Object.entries(userStats.sentimentDistribution).map(([sentiment, count]) => (
                <div key={sentiment} className="text-center p-6 bg-gray-50 dark:bg-black rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 transform hover:-translate-y-1 shadow-md">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                    sentiment === 'POSITIVE' ? 'bg-green-100 dark:bg-green-900' :
                    sentiment === 'NEGATIVE' ? 'bg-red-100 dark:bg-red-900' : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <span className={`text-2xl font-bold ${
                      sentiment === 'POSITIVE' ? 'text-green-600 dark:text-green-400' :
                      sentiment === 'NEGATIVE' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'
                    }`}>
                      {count}
                    </span>
                  </div>
                  <div className="text-lg font-medium text-gray-700 dark:text-gray-300 capitalize mb-2">{sentiment}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {sentiment === 'POSITIVE' ? 'Bullish Articles' :
                     sentiment === 'NEGATIVE' ? 'Bearish Articles' : 'Neutral Articles'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Account Information */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 mb-12 border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all duration-300">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center">
              <UserIcon className="h-7 w-7 text-gray-600 dark:text-gray-400 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Information</h2>
            </div>
            {!editMode && (
              <button
                onClick={handleEdit}
                className="bg-gray-600 dark:bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200 flex items-center"
              >
                <PencilIcon className="h-5 w-5 mr-2" />
                Edit Profile
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Email Address
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-black text-gray-500 dark:text-gray-400"
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Email cannot be changed</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Username
              </label>
              {editMode ? (
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                />
              ) : (
                <input
                  type="text"
                  value={user.username}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-black text-gray-500 dark:text-gray-400"
                />
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Full Name
              </label>
              {editMode ? (
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                />
              ) : (
                <input
                  type="text"
                  value={user.full_name || 'Not provided'}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-black text-gray-500 dark:text-gray-400"
                />
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Member Since
              </label>
              <input
                type="text"
                value={new Date(user.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                disabled
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-black text-gray-500 dark:text-gray-400"
              />
            </div>
          </div>
          
          {editMode && (
            <div className="flex justify-end space-x-4 mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={handleCancel}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-gray-600 dark:bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>

        {/* QnA Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 mb-12 border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-center mb-6">
            <DocumentTextIcon className="h-8 w-8 text-gray-600 dark:text-gray-400 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ask Questions About Your Articles</h2>
          </div>
          
          {articles.length > 0 ? (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-900/20 p-6 rounded-xl border border-gray-100 dark:border-gray-800">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select Article
                </label>
                <select
                  value={selectedArticle?.id || ''}
                  onChange={(e) => {
                    const article = articles.find(a => a.id === parseInt(e.target.value));
                    setSelectedArticle(article || null);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-gray-500 focus:border-gray-500 shadow-sm bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                >
                  <option value="">Choose an article to ask questions about...</option>
                  {articles.map((article) => (
                    <option key={article.id} value={article.id}>
                      {article.title || article.url.substring(0, 60)}...
                    </option>
                  ))}
                </select>
              </div>

              {selectedArticle && (
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                  <QuestionAnswer 
                    article={selectedArticle} 
                    onQuestionAsked={(question, answer) => {
                      console.log('Question asked:', question, 'Answer:', answer);
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-black rounded-xl">
              <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No articles yet</h3>
              <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">Analyze some articles first to use the Q&A feature</p>
            </div>
          )}
        </div>

        {/* Recent Articles */}
        {articles.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all duration-300">
            <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center">
                <DocumentTextIcon className="h-7 w-7 text-gray-600 dark:text-gray-400 mr-3" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Articles</h2>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">Your latest analyzed articles and insights</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {articles.slice(0, 5).map((article) => (
                <div key={article.id} className="px-8 py-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">
                        {article.title || 'Untitled Article'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 break-all">{article.url}</p>
                      
                      {/* Article Summary */}
                      {article.summary && (
                        <div className="bg-gray-50 dark:bg-black p-4 rounded-lg mb-4 border border-gray-100 dark:border-gray-800">
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{article.summary}</p>
                        </div>
                      )}
                      
                      {/* Analysis Tags */}
                      <div className="flex flex-wrap gap-3 mb-4">
                        <span className={`px-3 py-2 rounded-full text-sm font-medium border shadow-sm ${
                          article.sentiment === 'POSITIVE' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700' :
                          article.sentiment === 'NEGATIVE' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                        }`}>
                          {article.sentiment}
                        </span>
                        <span className="px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-700 shadow-sm">
                          {article.sector}
                        </span>
                        <span className="px-3 py-2 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300 rounded-full text-sm font-medium border border-purple-200 dark:border-purple-700 shadow-sm">
                          Impact: {article.impact_score.toFixed(2)}
                        </span>
                      </div>
                      
                      
                      {/* Quick Actions */}
                      <div className="flex space-x-4">
                        <button 
                          onClick={() => window.open(article.url, '_blank')}
                          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 font-medium text-sm hover:underline"
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                          Read Original
                        </button>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(article.url);
                          }}
                          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 font-medium text-sm hover:underline"
                        >
                          <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                          Copy URL
                        </button>
                      </div>
                    </div>



                    
                    
                    <div className="text-right ml-6">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        {new Date(article.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(article.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}