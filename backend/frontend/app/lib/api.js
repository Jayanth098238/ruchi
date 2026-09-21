import { buildApiUrl, API_ENDPOINTS } from './config';

export async function analyzeArticle(text) {
  const res = await fetch(`${buildApiUrl(API_ENDPOINTS.GET_ARTICLE)}?text=${encodeURIComponent(text)}`);
  if (!res.ok) throw new Error('Failed to fetch');
  return await res.json();
}
