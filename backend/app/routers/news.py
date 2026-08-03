import os
import logging
from typing import Optional

import requests
from fastapi import APIRouter, HTTPException, Query

import xml.etree.ElementTree as ET
from html import unescape

import re


logger = logging.getLogger(__name__)
router = APIRouter()


BBC_RSS = {
    "general": "https://feeds.bbci.co.uk/news/rss.xml",
    "world": "https://feeds.bbci.co.uk/news/world/rss.xml",
    "business": "https://feeds.bbci.co.uk/news/business/rss.xml",
    "technology": "https://feeds.bbci.co.uk/news/technology/rss.xml",
    "science": "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    "entertainment": "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    "health": "https://feeds.bbci.co.uk/news/health/rss.xml",
    "sports": "https://feeds.bbci.co.uk/sport/rss.xml",
}

NEWS_API_URL = "https://newsapi.org/v2/top-headlines"
NEWS_API_KEY = os.getenv("NEWS_API_KEY")









def _fetch_bbc_rss_simple(sector: str, limit: int = 20):
    alias = {
        "finance": "business",
        "business": "business",
        "sports": "sports",
        "technology": "technology",
        "tech": "technology",
        "health": "health",
        "entertainment": "entertainment",
        "science": "science",
        "general": "general",
        "world": "world",
        "crypto": "business",
    }
    key = alias.get(sector.lower(), "general")
    feed_url = BBC_RSS.get(key, BBC_RSS["general"])

    try:
        resp = requests.get(feed_url, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"RSS request error for {feed_url}: {e}")
        raise HTTPException(status_code=502, detail=f"RSS request error: {e}")

    try:
        root = ET.fromstring(resp.content)
    except Exception as e:
        logger.error(f"RSS parse error for {feed_url}: {e}")
        raise HTTPException(status_code=502, detail="Failed to parse RSS")

    items = []
    for it in root.findall('.//item'):
        title = (it.findtext('title') or '').strip()
        link = (it.findtext('link') or '').strip()
        description = (it.findtext('description') or '').strip()
        pub = (it.findtext('pubDate') or '').strip()
        # Strip basic HTML tags and entities from description
        if description:
            description = unescape(description)
            description = re.sub(r'<[^>]+>', '', description)
        items.append({
            "title": title,
            "url": link,
            "source": "BBC News",
            "publishedAt": pub,
            "description": description,
        })
        if len(items) >= limit:
            break
    return items

def _fallback_bbc_by_query(query: Optional[str], limit: int = 10):
    """Fallback: fetch BBC general feed and filter by simple keyword matching.

    Supports rudimentary handling of "OR" queries by splitting on ' OR '.
    """
    try:
        items = _fetch_bbc_rss_simple(sector="general", limit=50)
    except Exception:
        return []

    if not query:
        return items[:limit]

    # Normalize and split query on logical ORs
    terms = [t.strip() for t in re.split(r"\s+OR\s+", query, flags=re.IGNORECASE) if t.strip()]
    lowered_terms = [t.lower() for t in terms]

    filtered = []
    for it in items:
        hay = f"{(it.get('title') or '').lower()}\n{(it.get('description') or '').lower()}"
        if any(term in hay for term in lowered_terms):
            filtered.append(it)
        if len(filtered) >= limit:
            break
    # If nothing matched, just return top items to avoid empty UI
    return filtered or items[:limit]

def _fetch_headlines(query: Optional[str] = None, category: Optional[str] = None, limit: int = 5, country: str = "us"):
    if not NEWS_API_KEY:
        logger.warning("NEWS_API_KEY not set; returning sample headlines")
        # Minimal fallback sample data
        return [
            {
                "title": "Sample: Markets rally as tech leads gains",
                "url": "https://example.com/sample-1",
                "urlToImage": "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1600&auto=format&fit=crop",
                "source": {"name": "Example"},
                "publishedAt": None,
                "description": None,
            },
            {
                "title": "Sample: Central bank hints at rate pause",
                "url": "https://example.com/sample-2",
                "urlToImage": "https://images.unsplash.com/photo-1559526324-593bc073d938?q=80&w=1600&auto=format&fit=crop",
                "source": {"name": "Example"},
                "publishedAt": None,
                "description": None,
            },
            {
                "title": "Sample: Energy prices ease amid supply outlook",
                "url": "https://example.com/sample-3",
                "urlToImage": "https://images.unsplash.com/photo-1509395176047-4a66953fd231?q=80&w=1600&auto=format&fit=crop",
                "source": {"name": "Example"},
                "publishedAt": None,
                "description": None,
            },
        ][:limit]

    params = {
        "apiKey": NEWS_API_KEY,
        "pageSize": max(1, min(limit, 20)),
        "country": country,
    }
    if category:
        params["category"] = category
    if query:
        params["q"] = query

    try:
        # Log safe params (exclude API key) for debugging
        safe_params = {k: v for k, v in params.items() if k != "apiKey"}
        logger.info(f"Fetching headlines with params: {safe_params}")

        resp = requests.get(NEWS_API_URL, params=params, timeout=20)
        if not resp.ok:
            # Try to return provider error details
            try:
                j = resp.json()
                msg = j.get("message") or j.get("error") or j
            except Exception:
                msg = resp.text
            logger.error(f"News provider returned {resp.status_code}: {msg}")
            raise HTTPException(status_code=502, detail=f"Upstream error ({resp.status_code}): {msg}")
        data = resp.json()
        if data.get("status") != "ok":
            logger.error(f"Unexpected provider payload: {data}")
            raise HTTPException(status_code=502, detail=data)
        return data.get("articles", [])
    except requests.RequestException as e:
        logger.error(f"Request error fetching headlines: {e}")
        raise HTTPException(status_code=502, detail=f"Request error: {e}")


@router.get("/headlines")
def get_headlines(
    q: Optional[str] = Query(None, description="Search query for headlines"),
    limit: int = Query(5, ge=1, le=20),
    country: str = Query("us", min_length=2, max_length=2),
):
    """Fetch top headlines and return a trimmed payload suitable for the frontend."""
    try:
        articles = _fetch_headlines(query=q, category=None, limit=limit, country=country)
        # Normalize fields used by the frontend
        items = []
        for a in articles:
            items.append(
                {
                    "title": a.get("title"),
                    "url": a.get("url"),
                    "image": a.get("urlToImage"),
                    "source": (a.get("source") or {}).get("name"),
                    "publishedAt": a.get("publishedAt"),
                    "description": a.get("description"),
                }
            )
        return {"items": items}
    except HTTPException as e:
        logger.warning(f"Headlines provider failed ({e.status_code}). Falling back to BBC filter.")
        fallback_items = _fallback_bbc_by_query(q, limit)
        return {"items": fallback_items}
    except Exception as e:
        logger.error(f"Unexpected error in /headlines: {e}")
        fallback_items = _fallback_bbc_by_query(q, limit)
        return {"items": fallback_items}

@router.get("/by-sector")
def get_by_sector(
    sector: str = Query("general", description="Sector/category key"),
    limit: int = Query(20, ge=1, le=20),
    country: str = Query("us", min_length=2, max_length=2),
):
    mapping = {
        "general": {"category": "general"},
        "finance": {"category": "business"},
        "business": {"category": "business"},
        "sports": {"category": "sports"},
        "technology": {"category": "technology"},
        "tech": {"category": "technology"},
        "health": {"category": "health"},
        "entertainment": {"category": "entertainment"},
        "science": {"category": "science"},
        "crypto": {"category": "business", "q": "crypto OR cryptocurrency OR bitcoin"},
    }
    # Use BBC RSS feeds (simple, text-only)
    try:
        items = _fetch_bbc_rss_simple(sector=sector, limit=limit)
    except HTTPException as e:
        logger.error(f"BBC RSS error: {e.detail}")
        items = []
    except Exception as e:
        logger.error(f"Unexpected error in by-sector: {e}")
        items = []
    return {"items": items}

@router.get("/status")
def news_status():
    """Health/status for news proxy (does not expose the key)."""
    return {"has_key": bool(NEWS_API_KEY), "provider": "newsapi.org"}
