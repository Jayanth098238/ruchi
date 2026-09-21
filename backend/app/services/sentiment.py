from transformers import pipeline
from app.config import SENTIMENT_MODEL
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    sentiment_analyzer = pipeline("sentiment-analysis", model=SENTIMENT_MODEL)
    logger.info("Sentiment model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load sentiment model: {e}")
    sentiment_analyzer = None

def analyze_sentiment(text: str) -> str:
    try:
        if sentiment_analyzer is None:
            # Fallback: simple keyword-based sentiment
            positive_words = ['positive', 'good', 'great', 'excellent', 'benefit', 'growth', 'profit', 'success']
            negative_words = ['negative', 'bad', 'poor', 'loss', 'decline', 'risk', 'problem', 'failure']
            
            text_lower = text.lower()
            positive_count = sum(1 for word in positive_words if word in text_lower)
            negative_count = sum(1 for word in negative_words if word in text_lower)
            
            if positive_count > negative_count:
                return "POSITIVE"
            elif negative_count > positive_count:
                return "NEGATIVE"
            else:
                return "NEUTRAL"
        
        # Truncate text if it's too long
        if len(text) > 500:
            text = text[:500]
        
        result = sentiment_analyzer(text)[0]
        return result['label']  # "POSITIVE" or "NEGATIVE"
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {e}")
        # Fallback: return neutral
        return "NEUTRAL"
