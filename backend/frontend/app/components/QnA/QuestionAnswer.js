'use client';

import { useState } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../lib/config';

const QuestionAnswer = ({ article, onQuestionAsked }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [showQnA, setShowQnA] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    setAskingQuestion(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(API_ENDPOINTS.QNA_ASK), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          article_id: article.id,
          question: question
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAnswer(data.answer);
        if (onQuestionAsked) {
          onQuestionAsked(question, data.answer);
        }
      } else {
        const errorData = await response.json();
        setAnswer(`Sorry, I could not answer your question: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      setAnswer('An error occurred while processing your question.');
    } finally {
      setAskingQuestion(false);
    }
  };

  const handleOverview = async () => {
    setOverview(null);
    setOverviewLoading(true);
    try {
      const token = localStorage.getItem('token');
      const body = { article_id: article?.id, sector: article?.sector };
      const res = await fetch(buildApiUrl(API_ENDPOINTS.QNA_ARTICLE_OVERVIEW), {
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
    } catch (e) {
      setOverview({ error: 'Failed to fetch overview' });
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleExport = async () => {
    if (!overview || overview.error) {
      return alert('Build the Overview first to export.');
    }
    const text = formatOverviewForExport(overview);

    const to = window.prompt('Enter recipient email address:');
    if (!to) return;

    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const subject = `Article Overview: ${overview?.title || article?.title || 'Article'}`;
      const filename = 'article_overview.pdf';
      const res = await fetch(buildApiUrl(API_ENDPOINTS.QNA_EXPORT_NOTE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ to_email: to, subject, note_text: text, filename })
      });
      if (res.ok) {
        alert('Email sent successfully.');
      } else {
        const txt = await res.text();
        alert(`Failed to send email: ${txt.slice(0, 200)}`);
      }
    } catch (e) {
      alert('Failed to send email.');
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async () => {
    if (!overview || overview.error) {
      return alert('Build the Overview first to download.');
    }
    const text = formatOverviewForExport(overview);
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(API_ENDPOINTS.QNA_DOWNLOAD_OVERVIEW), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ note_text: text, filename: 'article_overview.pdf' })
      });
      if (!res.ok) {
        const txt = await res.text();
        alert(`Failed to download PDF: ${txt.slice(0, 200)}`);
        setDownloading(false);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'article_overview.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const formatOverviewForExport = (ov) => {
    if (!ov || ov.error) return '';
    const parts = [];
    parts.push(`Title: ${ov.title || ''}`);
    parts.push(`Sector: ${ov.sector || ''}`);
    if (ov.keywords?.length) parts.push(`Keywords: ${ov.keywords.join(', ')}`);
    if (ov.summary) parts.push(`\nSummary (\u223c200 words):\n${ov.summary}`);
    if (ov.explanation) parts.push(`\nExplanation:\n${ov.explanation}`);
    if (ov.additional_info) {
      parts.push(`\nAdditional Info:`);
      Object.entries(ov.additional_info).forEach(([k, v]) => parts.push(`- ${k}: ${v ?? ''}`));
    }
    return parts.join('\n');
  };

  const toggleQnA = () => {
    setShowQnA(!showQnA);
    if (!showQnA) {
      setQuestion('');
      setAnswer('');
      setOverview(null);
    }
  };

  if (!article) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Ask Questions About This Article</h3>
        <button
          onClick={toggleQnA}
          className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
        >
          {showQnA ? 'Hide Q&A' : 'Show Q&A'}
        </button>
      </div>

      {showQnA && (
        <div className="space-y-4">
          {/* Article Preview */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Article Context:</h4>
            <p className="text-sm text-gray-600 mb-2">
              <strong>Title:</strong> {article.title || 'Untitled'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Summary:</strong> {article.summary}
            </p>
          </div>

          {/* Question Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask in natural language: “What's the market outlook for Indian IT this quarter?”"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAskQuestion}
              disabled={!question.trim() || askingQuestion}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {askingQuestion ? 'Processing...' : 'Ask Question'}
            </button>
            <button
              onClick={handleOverview}
              disabled={overviewLoading}
              className="bg-white text-gray-800 border border-gray-300 px-6 py-2 rounded-md hover:bg-gray-100"
            >
              {overviewLoading ? 'Building Overview...' : 'Overview'}
            </button>
          </div>

          {/* Answer Display */}
          {answer && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Answer:</h4>
              <p className="text-blue-800">{answer}</p>
            </div>
          )}

          {/* Overview Display */}
          {overview && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              {overview.error ? (
                <p className="text-red-600">{overview.error}</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900">Article Overview</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="bg-white text-gray-800 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-100"
                      >
                        {downloading ? 'Preparing...' : 'Download PDF'}
                      </button>
                      <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="bg-white text-gray-800 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-100"
                      >
                        {exporting ? 'Sending...' : 'Email PDF'}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600"><strong>Title:</strong> {overview.title}</p>
                  <p className="text-sm text-gray-600"><strong>Sector:</strong> {overview.sector}</p>
                  {overview.keywords && overview.keywords.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <strong>Keywords:</strong> {overview.keywords.join(', ')}
                    </div>
                  )}
                  {overview.summary && (
                    <div className="text-gray-900 whitespace-pre-wrap">
                      <strong>Summary (~200 words):</strong>
                      <div className="mt-1">{overview.summary}</div>
                    </div>
                  )}
                  {overview.explanation && (
                    <div className="text-gray-900 whitespace-pre-wrap">
                      <strong>Explanation:</strong>
                      <div className="mt-1">{overview.explanation}</div>
                    </div>
                  )}
                  {overview.additional_info && (
                    <div className="text-sm text-gray-600">
                      <strong>Additional Info:</strong>
                      <ul className="list-disc ml-5 mt-1">
                        {Object.entries(overview.additional_info).map(([k, v]) => (
                          <li key={k}>{k}: {String(v || '')}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Question Suggestions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Suggested Questions:</h4>
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
                  className="text-left text-sm text-indigo-600 hover:text-indigo-800 p-2 rounded hover:bg-indigo-50 transition-colors"
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
