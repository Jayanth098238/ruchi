'use client';

import { useState } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../lib/config';

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

interface QuestionAnswerProps {
  article: Article;
  onQuestionAsked?: (question: string, answer: string) => void;
}

const QuestionAnswer = ({ article, onQuestionAsked }: QuestionAnswerProps) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [showQnA, setShowQnA] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overview, setOverview] = useState<any>(null);

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    // Validate article data
    if (!article || !article.id) {
      setAnswer('Error: Article information is missing. Please refresh the page and try again.');
      return;
    }

    setAskingQuestion(true);
    try {
      const token = localStorage.getItem('token');
      
      // Ensure article_id is a number
      const articleId = typeof article.id === 'string' ? parseInt(article.id, 10) : article.id;
      
      if (isNaN(articleId)) {
        setAnswer('Error: Invalid article ID. Please refresh the page and try again.');
        setAskingQuestion(false);
        return;
      }

      const requestBody = {
        article_id: articleId,
        question: question.trim()
      };

      console.log('Sending Q&A request:', requestBody); // Debug log

      const response = await fetch(buildApiUrl(API_ENDPOINTS.QNA_ASK), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        setAnswer(data.answer);
        if (onQuestionAsked) {
          onQuestionAsked(question, data.answer);
        }
      } else {
        console.error('Q&A request failed:', response.status, response.statusText);
        try {
          const errorData = await response.json();
          console.error('Error details:', errorData);
          
          if (response.status === 422) {
            // Validation error - show specific field errors
            if (errorData.detail && Array.isArray(errorData.detail)) {
              const fieldErrors = errorData.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
              setAnswer(`Validation error: ${fieldErrors}`);
            } else {
              setAnswer(`Validation error: ${errorData.detail || 'Invalid request format'}`);
            }
          } else if (response.status === 404) {
            setAnswer('This article was not found. It may have been deleted or you may not have access to it.');
          } else if (response.status === 401) {
            setAnswer('Authentication error. Please log in again.');
          } else {
            setAnswer(`Sorry, I could not answer your question: ${errorData.detail || 'Unknown error'}`);
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          setAnswer(`Request failed with status ${response.status}. Please try again.`);
        }
      }
    } catch (err) {
      console.error('Q&A request error:', err);
      setAnswer('An error occurred while processing your question. Please check your internet connection and try again.');
    } finally {
      setAskingQuestion(false);
    }
  };

  const handleOverview = async () => {
    setOverview(null);
    setOverviewLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryText = question.trim() || `What's the market outlook for ${article.sector || 'the sector'} this quarter?`;
      const body = { query: queryText, sector: article.sector || undefined };
      const res = await fetch(buildApiUrl(API_ENDPOINTS.QNA_MARKET_OVERVIEW), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      } else {
        const txt = await res.text();
        setOverview({ error: `Failed to fetch overview: ${txt.slice(0, 200)}` });
      }
    } catch (e: any) {
      setOverview({ error: e?.message || 'Failed to fetch overview' });
    } finally {
      setOverviewLoading(false);
    }
  };

  const toggleQnA = () => {
    setShowQnA(!showQnA);
    if (!showQnA) {
      setQuestion('');
      setAnswer('');
      setOverview(null);
    }
  };

  if (!article) {
    console.warn('QuestionAnswer: No article provided');
    return null;
  }

  // Debug log for article data
  console.log('QuestionAnswer article data:', { id: article.id, title: article.title });



  return (
    <div className="bg-gray-900 border border-gray-800 text-gray-100 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">Ask Questions About This Article</h3>
        <button
          onClick={toggleQnA}
          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-400 font-medium text-sm"
        >
          {showQnA ? 'Hide Q&A' : 'Show Q&A'}
        </button>
      </div>

      {showQnA && (
        <div className="space-y-4">
          {/* Article Preview */}
          <div className="bg-gray-50 dark:bg_BLACK p-3 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Article Context:</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              <strong>ID:</strong> {article.id} | <strong>Title:</strong> {article.title || 'Untitled'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Summary:</strong> {article.summary}
            </p>
          </div>

          {/* Question Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask in natural language: “What's the market outlook for Indian IT this quarter?”"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAskQuestion}
              disabled={!question.trim() || askingQuestion}
              className="bg-gray-600 dark:bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
            >
              {askingQuestion ? 'Processing...' : 'Ask Question'}
            </button>
            <button
              onClick={handleOverview}
              disabled={overviewLoading}
              className="bg-white dark:bg-black text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 px-6 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {overviewLoading ? 'Building Overview...' : 'Overview'}
            </button>
          </div>

          {/* Answer Display */}
          {answer && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Answer:</h4>
              <p className="text-blue-800 dark:text-blue-200">{answer}</p>
            </div>
          )}

          {/* Overview Display */}
          {overview && (
            <div className="bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {overview.error ? (
                <p className="text-red-600 dark:text-red-300">{overview.error}</p>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Mini Research Note</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Query:</strong> {overview.query}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Sector:</strong> {overview.sector}</p>
                  <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{overview.summary}</div>
                  {overview.keywords && overview.keywords.length > 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Keywords:</strong> {overview.keywords.join(', ')}
                    </div>
                  )}
                  {overview.sentiment && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Sentiment:</strong> +{overview.sentiment.positive} / -{overview.sentiment.negative} / ={overview.sentiment.neutral} (Net {overview.sentiment.net})
                    </div>
                  )}
                  {overview.risks && overview.risks.length > 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Risks:</strong>
                      <ul className="list-disc ml-5 mt-1">
                        {overview.risks.map((r: string, i: number) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {overview.sources && overview.sources.length > 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Sources:</strong>
                      <ul className="list-disc ml-5 mt-1">
                        {overview.sources.map((s: any, i: number) => (
                          <li key={i}>
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-300 hover:underline">
                              {s.title || s.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Question Suggestions */}
          <div className="bg_BLACK border border-gray-800 p-4 rounded-lg">
            <h4 className="font-medium text-white mb-3">Suggested Questions:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                "What is the main topic of this article?",
                "What are the key findings?",
                "What is the market impact?",
                "What are the implications for investors?",
                "What are the risks mentioned?",
                "What's the market outlook for Indian IT this quarter?"
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setQuestion(suggestion)}
                  className="text-left text-sm text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-400 p-2 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionAnswer;
