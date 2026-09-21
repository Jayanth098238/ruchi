<<<<<<< HEAD
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  SIGNUP: '/api/auth/signup',
  ME: '/api/auth/me',

  ANALYZE_URL: '/api/analyze/url',
  MY_ARTICLES: '/api/analyze/my-articles',
  GET_ARTICLE: '/api/analyze',

  QNA_ASK: '/api/qna/ask',
};

export const buildApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/')
    ? endpoint.slice(1)
    : endpoint;

  return `${API_BASE_URL}/${cleanEndpoint}`;
=======
// API Configuration
// This file centralizes the API base URL configuration

// In development, the backend runs on localhost:8000
// In production, you might want to change this to your deployed backend URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Helper function to build full API URLs
export const buildApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/api/auth/login',
  SIGNUP: '/api/auth/signup',
  ME: '/api/auth/me',
  
  // Analysis
  ANALYZE_URL: '/api/analyze/url',
  MY_ARTICLES: '/api/analyze/my-articles',
  GET_ARTICLE: '/api/analyze',
  
  // Q&A
  QNA_ASK: '/api/qna/ask',
  QNA_TEST: '/api/qna/test',
  QNA_MARKET_OVERVIEW: '/api/qna/market-overview',
  QNA_ARTICLE_NOTE: '/api/qna/article-research-note',
  QNA_EXPORT_NOTE: '/api/qna/export-note',
  QNA_ARTICLE_OVERVIEW: '/api/qna/article-overview',
  QNA_DOWNLOAD_OVERVIEW: '/api/qna/download-overview',
  
  // News
  NEWS_HEADLINES: '/api/news/headlines',
  NEWS_BY_SECTOR: '/api/news/by-sector',
  NEWS_STATUS: '/api/news/status',
  
  // Company & Sector
  COMPANY: '/api/company',
  SECTOR: '/api/sector',

  // Fake News
  FAKE_NEWS_PREDICT: '/api/sector/fake-news/predict',
  FAKE_NEWS_TRAIN: '/api/sector/fake-news/train'
>>>>>>> c933d578a2791be289466d4e6cfee98cfc91080e
};