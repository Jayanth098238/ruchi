from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.models.article import Article
from app.services import qna_service
from app.services import summarization, sentiment
from app.routers import news as news_router
from app.services.auth import verify_token
from app.services import email_service
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import Response
from pydantic import BaseModel
import logging
from typing import Optional, List, Dict

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

class QuestionRequest(BaseModel):
    article_id: int
    question: str

class MarketOverviewRequest(BaseModel):
    query: str
    sector: Optional[str] = None
    limit: int = 20

class ArticleResearchNoteRequest(BaseModel):
    article_url: Optional[str] = None
    title: Optional[str] = None
    sector: Optional[str] = None
    query: Optional[str] = None
    limit: int = 15

class ExportNoteRequest(BaseModel):
    to_email: str
    subject: str
    note_text: str
    filename: Optional[str] = "research_note.doc"

class ArticleOverviewRequest(BaseModel):
    article_id: int
    sector: Optional[str] = None

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    email = verify_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

@router.post("/ask", response_model=dict)
def ask_question(
    request: QuestionRequest, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Ask a question about a specific article.
    """
    try:
        # Get the article from database
        article = db.query(Article).filter(
            Article.id == request.article_id, 
            Article.user_id == current_user.id
        ).first()
        
        if not article:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Article not found or access denied"
            )
        
        # Get the answer using the QnA service
        answer = qna_service.answer_question(article.text, request.question)
        
        logger.info(f"Question answered for user {current_user.id}, article {article.id}")
        
        return {
            "answer": answer,
            "article_id": article.id,
            "question": request.question,
            "confidence": "high"  # You can add confidence scoring here
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in question answering: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your question"
        )

@router.post("/market-overview")
def market_overview(
    request: MarketOverviewRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate a mini research note: pulls sector news, summarizes earnings, sentiment, risks, and returns sources."""
    try:
        # Determine sector from query if not explicitly provided
        sector_hint = (request.sector or "").strip() or _infer_sector_from_query(request.query)
        if not sector_hint:
            sector_hint = "technology" if "it" in request.query.lower() else "general"

        # Fetch recent news via existing news by-sector helper
        items_payload = news_router._fetch_bbc_rss_simple(sector=sector_hint, limit=min(max(request.limit, 1), 20))
        articles = items_payload or []
        if not articles:
            raise HTTPException(status_code=502, detail="No news items available for overview")

        # Build a combined corpus for summarization
        combined_text = "\n\n".join(
            [f"Title: {a.get('title','')}. {a.get('description') or ''}" for a in articles]
        )

        # Summaries at different lengths
        analysis = summarization.get_detailed_summary_analysis(combined_text)

        # Simple sentiment/risks extraction
        sentiments: List[str] = []
        risks: List[str] = []
        for a in articles:
            desc = (a.get('description') or a.get('title') or '')
            s = sentiment.analyze_sentiment(desc)
            sentiments.append(s)
            if any(k in desc.lower() for k in ["risk", "pressure", "headwind", "slowdown", "decline", "weak"]):
                risks.append(desc.strip())

        pos = sum(1 for s in sentiments if s == "POSITIVE")
        neg = sum(1 for s in sentiments if s == "NEGATIVE")
        neu = sum(1 for s in sentiments if s not in ("POSITIVE", "NEGATIVE"))

        sentiment_overview = {
            "positive": pos,
            "negative": neg,
            "neutral": neu,
            "net": pos - neg,
        }

        # Top sources (titles and urls)
        sources = [
            {"title": a.get("title"), "url": a.get("url"), "source": a.get("source")}
            for a in articles[:10]
        ]

        note = {
            "query": request.query,
            "sector": sector_hint,
            "summary": analysis.get("summaries", {}).get("recommended") or analysis.get("summaries", {}).get("hybrid"),
            "keywords": analysis.get("keywords", []),
            "sentiment": sentiment_overview,
            "risks": risks[:5],
            "sources": sources,
        }
        return note
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Market overview error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate market overview")

def _infer_sector_from_query(query: str) -> Optional[str]:
    q = (query or "").lower()
    mappings = {
        "it": "technology",
        "tech": "technology",
        "technology": "technology",
        "finance": "finance",
        "bank": "finance",
        "health": "health",
        "healthcare": "health",
        "entertainment": "entertainment",
        "sports": "sports",
        "science": "science",
        "crypto": "crypto",
    }
    for key, val in mappings.items():
        if key in q:
            return val
    return None

@router.post("/article-research-note")
def article_research_note(
    request: ArticleResearchNoteRequest,
    current_user: User = Depends(get_current_user),
):
    """Create a mini research note around a specific article, aggregating recent sector news."""
    try:
        # Determine sector hint
        sector_hint = (request.sector or "").strip() or _infer_sector_from_query(request.title or "") or _infer_sector_from_query(request.query or "") or "general"

        # Pull sector news for context
        sector_items = news_router._fetch_bbc_rss_simple(sector=sector_hint, limit=min(max(request.limit, 1), 20)) or []

        # Build corpus: include article title, and sector items descriptions
        corpus_parts: List[str] = []
        if request.title:
            corpus_parts.append(f"Primary Article: {request.title}")
        for it in sector_items:
            corpus_parts.append(f"{it.get('title','')}. {it.get('description') or ''}")
        combined_text = "\n\n".join(corpus_parts)[:8000]

        if not combined_text:
            raise HTTPException(status_code=502, detail="Insufficient content to build research note")

        # Generate summary and keywords
        analysis = summarization.get_detailed_summary_analysis(combined_text)

        # Sentiment sweep
        sentiments = [sentiment.analyze_sentiment((it.get('description') or it.get('title') or '')) for it in sector_items]
        pos = sum(1 for s in sentiments if s == "POSITIVE")
        neg = sum(1 for s in sentiments if s == "NEGATIVE")
        neu = sum(1 for s in sentiments if s not in ("POSITIVE", "NEGATIVE"))
        sentiment_overview = {"positive": pos, "negative": neg, "neutral": neu, "net": pos - neg}

        # Risk hints
        risks: List[str] = []
        for it in sector_items:
            desc = (it.get('description') or it.get('title') or '')
            if any(k in desc.lower() for k in ["risk", "pressure", "headwind", "slowdown", "decline", "weak", "ban", "probe", "sanction"]):
                risks.append(desc.strip())

        sources = [
            {"title": it.get("title"), "url": it.get("url"), "source": it.get("source")}
            for it in sector_items[:10]
        ]

        note = {
            "title": request.title,
            "sector": sector_hint,
            "summary": analysis.get("summaries", {}).get("recommended") or analysis.get("summaries", {}).get("hybrid"),
            "keywords": analysis.get("keywords", []),
            "sentiment": sentiment_overview,
            "risks": risks[:8],
            "sources": sources,
            "more_info": {
                "article_url": request.article_url,
                "sector_feed": f"/api/news/by-sector?sector={sector_hint}",
            },
        }
        return note
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Article research note error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create research note")

@router.post("/export-note")
def export_note(
    request: ExportNoteRequest,
    current_user: User = Depends(get_current_user),
):
    """Email the note as a PDF if possible, else .doc (HTML)."""
    try:
        # Prefer PDF if available; fall back to .doc HTML
        pdf_bytes = email_service.build_pdf_bytes_from_text(request.note_text)
        if pdf_bytes:
            email_service.send_email_with_attachment(
                to_email=request.to_email,
                subject=request.subject,
                body_text="Attached is your article overview (PDF).",
                attachment_bytes=pdf_bytes,
                filename=(request.filename or "article_overview.pdf").replace('.doc', '.pdf'),
                content_type="application/pdf",
            )
        else:
            html = f"""
            <html><head><meta charset='utf-8'></head><body>
            <pre style='font-family:Segoe UI, Roboto, Arial, sans-serif; white-space:pre-wrap;'>{request.note_text}</pre>
            </body></html>
            """.strip()
            data = html.encode('utf-8')
            email_service.send_email_with_attachment(
                to_email=request.to_email,
                subject=request.subject,
                body_text="Attached is your article overview (DOC).",
                attachment_bytes=data,
                filename=request.filename or "article_overview.doc",
                content_type="application/msword",
            )
        return {"status": "sent"}
    except Exception as e:
        logger.error(f"Export note email error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")

@router.post("/article-overview")
def article_overview(
    request: ArticleOverviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return a structured overview for a specific article: title, sector, keywords, ~200-word summary, explanation, and additional info."""
    try:
        article = db.query(Article).filter(
            Article.id == request.article_id,
            Article.user_id == current_user.id
        ).first()
        if not article:
            raise HTTPException(status_code=404, detail="Article not found or access denied")

        text = (article.text or "").strip()
        if not text:
            raise HTTPException(status_code=422, detail="Article has no content to analyze")

        # Sector: prefer provided, else from article metadata if available
        sector_value = (request.sector or getattr(article, 'sector', None) or '').strip() or _infer_sector_from_query(article.title or '') or 'general'

        # Use detailed analysis for keywords
        analysis = summarization.get_detailed_summary_analysis(text)
        keywords = analysis.get("keywords", [])

        # Build ~200-word summary
        base_summary = summarization.summarize_article(text, "long")
        summary_words = base_summary.split()
        if len(summary_words) > 210:
            summary_200 = " ".join(summary_words[:200]) + "..."
        else:
            summary_200 = base_summary

        # Build a more complete explanation: context, what happened, where, implications, and what to watch
        explain_source = analysis.get("summaries", {}).get("hybrid") or analysis.get("summaries", {}).get("extractive") or summary_200
        where_hints = []
        for token in ["India", "US", "USA", "Europe", "UK", "China", "Bengaluru", "Mumbai", "Delhi", "Hyderabad"]:
            if (article.title or "").find(token) != -1 or text.find(token) != -1:
                where_hints.append(token)
        where_text = (", ".join(sorted(set(where_hints))) or "location not specified")
        explanation = (
            f"Context and What Happened:\n{explain_source}\n\n"
            f"Where:\n{where_text}.\n\n"
            f"Implications for {sector_value.title()}:\nThis affects the sector via demand, pricing, and execution risks. Watch for management commentary, guidance changes, and follow-on disclosures.\n\n"
            f"What to Monitor Next:\nEarnings updates, regulatory notes, large client wins/losses, macro data impacting {sector_value}."
        )

        additional_info = {
            "article_url": getattr(article, 'url', None),
            "created_at": getattr(article, 'created_at', None),
            "length_chars": len(text),
        }

        return {
            "title": article.title,
            "sector": sector_value,
            "keywords": keywords,
            "summary": summary_200,
            "explanation": explanation,
            "additional_info": additional_info,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Article overview error: {e}")
        raise HTTPException(status_code=500, detail="Failed to build article overview")

class DownloadNoteRequest(BaseModel):
    note_text: str
    filename: Optional[str] = "article_overview.pdf"

@router.post("/download-overview")
def download_overview_pdf(request: DownloadNoteRequest, current_user: User = Depends(get_current_user)):
    """Return a PDF built from provided text, for direct browser download (no email)."""
    try:
        pdf_bytes = email_service.build_pdf_bytes_from_text(request.note_text or "")
        if not pdf_bytes:
            raise HTTPException(status_code=500, detail="PDF generation not available on server")
        filename = request.filename or "article_overview.pdf"
        headers = {
            "Content-Disposition": f"attachment; filename=\"{filename}\"",
        }
        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download overview PDF error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

@router.get("/test")
def test_qna():
    """
    Test endpoint to verify QnA service is working
    """
    try:
        test_article = "Apple Inc. announced today that they are launching a new AI-powered iPhone with advanced features. The company expects strong sales growth and positive market reception. The new device will be available starting next month."
        test_question = "What did Apple announce?"
        
        answer = qna_service.answer_question(test_article, test_question)
        
        return {
            "status": "success",
            "message": "QnA service is working",
            "test": {
                "question": test_question,
                "answer": answer
            }
        }
    except Exception as e:
        logger.error(f"QnA test failed: {e}")
        return {
            "status": "error",
            "message": f"QnA test failed: {str(e)}"
        }
