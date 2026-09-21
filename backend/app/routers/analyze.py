from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.models.article import Article
from app.schemas.article import ArticleCreate, ArticleResponse, ArticleAnalysis
from app.services import summarization, sentiment, sector_classification, impact_scoring
from app.services.web_scraper import scrape_article
from app.services.auth import verify_token
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional
from pydantic import BaseModel
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

class SummaryRequest(BaseModel):
    text: str
    length: Optional[str] = "medium"  # short, medium, long

class SummaryResponse(BaseModel):
    summary: str
    length: str
    method: str

class MultipleSummaryResponse(BaseModel):
    short: str
    medium: str
    long: str

class DetailedSummaryResponse(BaseModel):
    summaries: dict
    keywords: List[str]
    metadata: dict

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

@router.get("/test")
def test_analysis():
    """Test endpoint to verify analysis services are working"""
    try:
        test_text = "Apple Inc. announced today that they are launching a new AI-powered iPhone with advanced features. The company expects strong sales growth and positive market reception."
        
        # Test each service
        summary = summarization.summarize_article(test_text)
        sentiment_label = sentiment.analyze_sentiment(test_text)
        sector = sector_classification.classify_sector(test_text)
        impact = impact_scoring.compute_impact(sentiment_label)
        
        return {
            "status": "success",
            "message": "All analysis services are working",
            "test_results": {
                "summary": summary,
                "sentiment": sentiment_label,
                "sector": sector,
                "impact_score": impact
            }
        }
    except Exception as e:
        logger.error(f"Test analysis failed: {e}")
        return {
            "status": "error",
            "message": f"Analysis test failed: {str(e)}"
        }

@router.post("/url", response_model=ArticleAnalysis)
def analyze_article_url(article: ArticleCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        logger.info(f"Starting analysis for URL: {article.url}")
        
        # Scrape the article content
        title, text_content = scrape_article(article.url)
        
        if not text_content:
            logger.error(f"Failed to extract content from URL: {article.url}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract content from the provided URL. Please check if the URL is accessible and contains readable content."
            )
        
        logger.info(f"Content extracted successfully. Length: {len(text_content)} characters")
        
        # Analyze the content
        logger.info("Starting content analysis...")
        
        try:
            summary = summarization.summarize_article(text_content)
            logger.info("Summarization completed")
        except Exception as e:
            logger.error(f"Summarization failed: {e}")
            summary = text_content[:200] + "..." if len(text_content) > 200 else text_content
        
        try:
            sentiment_label = sentiment.analyze_sentiment(text_content)
            logger.info(f"Sentiment analysis completed: {sentiment_label}")
        except Exception as e:
            logger.error(f"Sentiment analysis failed: {e}")
            sentiment_label = "NEUTRAL"
        
        try:
            sector = sector_classification.classify_sector(text_content)
            logger.info(f"Sector classification completed: {sector}")
        except Exception as e:
            logger.error(f"Sector classification failed: {e}")
            sector = "Other"
        
        try:
            impact = impact_scoring.compute_impact(sentiment_label)
            logger.info(f"Impact scoring completed: {impact}")
        except Exception as e:
            logger.error(f"Impact scoring failed: {e}")
            impact = 0.5
        
        # Save to database
        try:
            db_article = Article(
                user_id=current_user.id,
                url=article.url,
                title=title,
                text=text_content,
                summary=summary,
                sentiment=sentiment_label,
                sector=sector,
                impact_score=impact
            )
            
            db.add(db_article)
            db.commit()
            db.refresh(db_article)
            logger.info("Article saved to database successfully")
        except Exception as e:
            logger.error(f"Failed to save article to database: {e}")
            # Continue without saving to database
        
        logger.info("Analysis completed successfully")
        
        return ArticleAnalysis(
            url=article.url,
            title=title,
            summary=summary,
            sentiment=sentiment_label,
            sector=sector,
            impact_score=impact
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error in article analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during analysis. Please try again later."
        )

@router.get("/my-articles", response_model=List[ArticleResponse])
def get_user_articles(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        articles = db.query(Article).filter(Article.user_id == current_user.id).order_by(Article.created_at.desc()).all()
        logger.info(f"Retrieved {len(articles)} articles for user {current_user.id}")
        return articles
    except Exception as e:
        logger.error(f"Error retrieving articles: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve articles"
        )

@router.get("/{article_id}", response_model=ArticleResponse)
def get_article(article_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        article = db.query(Article).filter(Article.id == article_id, Article.user_id == current_user.id).first()
        if not article:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Article not found"
            )
        return article
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving article {article_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve article"
        )

@router.post("/summarize", response_model=SummaryResponse)
def create_summary(
    request: SummaryRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Create a summary of provided text with specified length
    """
    try:
        if not request.text or len(request.text.strip()) < 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text must be at least 20 characters long"
            )
        
        if request.length not in ["short", "medium", "long"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Length must be 'short', 'medium', or 'long'"
            )
        
        summary = summarization.summarize_article(request.text, request.length)
        
        # Determine method used (simplified)
        method = "abstractive"
        if len(request.text) < 500:
            method = "extractive"
        
        logger.info(f"Summary created for user {current_user.id}, length: {request.length}")
        
        return SummaryResponse(
            summary=summary,
            length=request.length,
            method=method
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create summary"
        )

@router.post("/summarize/all-lengths", response_model=MultipleSummaryResponse)
def create_multiple_summaries(
    request: SummaryRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Create summaries of provided text in all available lengths
    """
    try:
        if not request.text or len(request.text.strip()) < 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text must be at least 20 characters long"
            )
        
        summaries = summarization.get_summary_with_options(request.text)
        
        logger.info(f"Multiple summaries created for user {current_user.id}")
        
        return MultipleSummaryResponse(
            short=summaries["short"],
            medium=summaries["medium"],
            long=summaries["long"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating multiple summaries: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create summaries"
        )

@router.post("/{article_id}/re-summarize")
def re_summarize_article(
    article_id: int,
    length: str = Query("medium", regex="^(short|medium|long)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Re-summarize an existing article with a different length
    """
    try:
        article = db.query(Article).filter(
            Article.id == article_id, 
            Article.user_id == current_user.id
        ).first()
        
        if not article:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Article not found"
            )
        
        # Create new summary
        new_summary = summarization.summarize_article(article.text, length)
        
        # Update the article with new summary
        article.summary = new_summary
        db.commit()
        db.refresh(article)
        
        logger.info(f"Article {article_id} re-summarized with length: {length}")
        
        return {
            "message": "Article re-summarized successfully",
            "new_summary": new_summary,
            "length": length,
            "article_id": article_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error re-summarizing article {article_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to re-summarize article"
        )

@router.post("/analyze-summary", response_model=DetailedSummaryResponse)
def analyze_summary(
    request: SummaryRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed summary analysis with keywords and multiple methods
    """
    try:
        if not request.text or len(request.text.strip()) < 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text must be at least 20 characters long"
            )
        
        analysis = summarization.get_detailed_summary_analysis(request.text)
        
        logger.info(f"Detailed summary analysis created for user {current_user.id}")
        
        return DetailedSummaryResponse(
            summaries=analysis["summaries"],
            keywords=analysis["keywords"],
            metadata=analysis["metadata"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating detailed summary analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create detailed summary analysis"
        )
