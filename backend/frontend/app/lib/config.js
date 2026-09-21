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
};