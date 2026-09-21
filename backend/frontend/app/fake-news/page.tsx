"use client";

import React, { useState } from "react";
import { API_ENDPOINTS, buildApiUrl } from "../lib/config";

interface PredictionItem {
  label: string; // e.g., "FAKE" or "REAL"
  score?: number; // optional confidence
}

export default function FakeNewsPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionItem[] | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const payload = { texts: [text].filter(Boolean) };
    if (payload.texts.length === 0) {
      setError("Please enter some news text.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(buildApiUrl(API_ENDPOINTS.FAKE_NEWS_PREDICT), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(data?.detail || `Request failed with ${res.status}`);
      }
      const data = await res.json();
      // Expecting { items: [...] }
      setResult(Array.isArray(data?.items) ? data.items : []);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const renderBadge = (label: string) => {
    const isFake = label?.toLowerCase().includes("fake");
    const color = isFake ? "bg-red-100 text-red-700 border-red-300" : "bg-green-100 text-green-700 border-green-300";
    const text = isFake ? "Fake" : "Real";
    return (
      <span className={`inline-block px-3 py-1 text-sm font-semibold border rounded ${color}`}>{text}</span>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Fake News Checker</h1>
      <p className="text-sm text-gray-600 mb-6">Paste a news snippet below to check if it's likely fake or real.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Enter news text here..."
          className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Checking..." : "Check News"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 border border-red-300 bg-red-50 text-red-700 rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3">Result</h2>
          {result.length === 0 ? (
            <p className="text-gray-600">No prediction returned.</p>
          ) : (
            <ul className="space-y-3">
              {result.map((item, idx) => (
                <li key={idx} className="p-3 border rounded flex items-center justify-between">
                  <span className="text-gray-800">Input {idx + 1}</span>
                  <div className="flex items-center gap-3">
                    {typeof item.score === "number" && (
                      <span className="text-xs text-gray-500">Confidence: {(item.score * 100).toFixed(1)}%</span>
                    )}
                    {renderBadge(item.label)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}