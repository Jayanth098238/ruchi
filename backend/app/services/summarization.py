from transformers import pipeline
from app.config import SUMMARIZATION_MODEL
import logging
import re
import os
import requests
from typing import List, Optional
from sentence_transformers import SentenceTransformer, util
import numpy as np
from collections import Counter

# Optional NLTK imports with fallback
NLTK_AVAILABLE = False
try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize
    from nltk.tag import pos_tag
    NLTK_AVAILABLE = True
    
    # Download required NLTK data (only once)
    try:
        nltk.data.find('tokenizers/punkt')
        nltk.data.find('corpora/stopwords')
        nltk.data.find('taggers/averaged_perceptron_tagger')
    except LookupError:
        try:
            nltk.download('punkt', quiet=True)
            nltk.download('stopwords', quiet=True)
            nltk.download('averaged_perceptron_tagger', quiet=True)
            nltk.download('punkt_tab', quiet=True)
            nltk.download('averaged_perceptron_tagger_eng', quiet=True)
        except Exception as e:
            logger.warning(f"Failed to download NLTK data: {e}")
            NLTK_AVAILABLE = False
            
except ImportError:
    logger.warning("NLTK not available. Using fallback keyword extraction.")
    NLTK_AVAILABLE = False

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
SUMMARIZATION_PROVIDER = os.getenv("SUMMARIZATION_PROVIDER", "").lower()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Enhanced summarization settings
SUMMARY_LENGTH = os.getenv("SUMMARY_LENGTH", "medium")  # short, medium, long
USE_EXTRACTIVE = os.getenv("USE_EXTRACTIVE_SUMMARY", "true").lower() == "true"
EXTRACTIVE_MODEL = os.getenv("EXTRACTIVE_MODEL", "all-MiniLM-L6-v2")

# Initialize models
summarizer = None
extractive_model = None

try:
    summarizer = pipeline("summarization", model=SUMMARIZATION_MODEL, device=-1)
    logger.info(f"Summarization model loaded successfully: {SUMMARIZATION_MODEL}")
except Exception as e:
    logger.error(f"Failed to load summarization model: {e}")
    summarizer = None

def _get_extractive_model():
    """Lazy load extractive summarization model"""
    global extractive_model
    if extractive_model is None and USE_EXTRACTIVE:
        try:
            extractive_model = SentenceTransformer(EXTRACTIVE_MODEL, device="cpu")
            logger.info(f"Extractive model loaded: {EXTRACTIVE_MODEL}")
        except Exception as e:
            logger.error(f"Failed to load extractive model: {e}")
            extractive_model = None
    return extractive_model

def _clean_text(text: str) -> str:
    """Clean and preprocess text for better summarization"""
    # Remove extra whitespace and normalize
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Remove URLs
    text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
    
    # Remove email addresses
    text = re.sub(r'\S+@\S+', '', text)
    
    # Remove excessive punctuation
    text = re.sub(r'[.]{3,}', '...', text)
    text = re.sub(r'[!]{2,}', '!', text)
    text = re.sub(r'[?]{2,}', '?', text)
    
    # Remove common boilerplate phrases
    boilerplate_patterns = [
        r'click here to read more',
        r'read the full article',
        r'subscribe to our newsletter',
        r'follow us on',
        r'share this article',
        r'advertisement',
        r'sponsored content'
    ]
    
    for pattern in boilerplate_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    return text.strip()

def _split_into_sentences(text: str) -> List[str]:
    """Split text into sentences for extractive summarization"""
    # Simple sentence splitting - can be improved with spaCy or NLTK
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 10]
    return sentences

def _extractive_summarize(text: str, num_sentences: int = 3) -> str:
    """Create extractive summary by selecting most important sentences"""
    model = _get_extractive_model()
    if model is None:
        return _fallback_summary(text)
    
    sentences = _split_into_sentences(text)
    if len(sentences) <= num_sentences:
        return '. '.join(sentences) + '.'
    
    try:
        # Encode sentences
        sentence_embeddings = model.encode(sentences)
        
        # Calculate sentence importance based on similarity to the whole text
        text_embedding = model.encode([text])
        similarities = util.cos_sim(sentence_embeddings, text_embedding).numpy().flatten()
        
        # Get top sentences
        top_indices = np.argsort(similarities)[-num_sentences:]
        top_indices = sorted(top_indices)  # Maintain original order
        
        summary_sentences = [sentences[i] for i in top_indices]
        return '. '.join(summary_sentences) + '.'
        
    except Exception as e:
        logger.error(f"Extractive summarization failed: {e}")
        return _fallback_summary(text)

def _get_summary_params(length: str) -> dict:
    """Get summarization parameters based on desired length"""
    params = {
        "short": {"max_length": 80, "min_length": 20, "num_sentences": 2},
        "medium": {"max_length": 150, "min_length": 40, "num_sentences": 3},
        "long": {"max_length": 250, "min_length": 80, "num_sentences": 5}
    }
    return params.get(length, params["medium"])

def _abstractive_summarize(text: str, length: str = "medium") -> str:
    """Create abstractive summary using transformer model"""
    if summarizer is None:
        return _fallback_summary(text)
    
    params = _get_summary_params(length)
    
    try:
        # Handle long texts by chunking
        max_input_length = 1024  # Most models can handle this
        
        if len(text) <= max_input_length:
            summary = summarizer(
                text, 
                max_length=params["max_length"], 
                min_length=params["min_length"], 
                do_sample=False,
                truncation=True
            )
            return summary[0]['summary_text']
        else:
            # For longer texts, use a multi-stage approach
            return _multi_stage_summarize(text, length)
            
    except Exception as e:
        logger.error(f"Abstractive summarization failed: {e}")
        return _fallback_summary(text)

def _multi_stage_summarize(text: str, length: str = "medium") -> str:
    """Handle long texts with multi-stage summarization"""
    params = _get_summary_params(length)
    chunk_size = 800
    
    # Split text into chunks
    chunks = []
    words = text.split()
    
    for i in range(0, len(words), chunk_size):
        chunk = ' '.join(words[i:i + chunk_size])
        chunks.append(chunk)
    
    if len(chunks) == 1:
        # Direct summarization for single chunk to avoid recursion
        try:
            summary = summarizer(
                chunks[0], 
                max_length=params["max_length"], 
                min_length=params["min_length"], 
                do_sample=False,
                truncation=True
            )
            return summary[0]['summary_text']
        except Exception as e:
            logger.error(f"Single chunk summarization failed: {e}")
            return _fallback_summary(chunks[0])
    
    # Summarize each chunk
    chunk_summaries = []
    for chunk in chunks:
        try:
            summary = summarizer(
                chunk, 
                max_length=100, 
                min_length=20, 
                do_sample=False,
                truncation=True
            )
            chunk_summaries.append(summary[0]['summary_text'])
        except Exception as e:
            logger.warning(f"Failed to summarize chunk: {e}")
            # Use simple fallback for this chunk to avoid recursion
            chunk_summaries.append(_fallback_summary(chunk))
    
    # Combine and summarize the chunk summaries
    combined_summary = ' '.join(chunk_summaries)
    
    if len(combined_summary) <= 1024:
        try:
            final_summary = summarizer(
                combined_summary,
                max_length=params["max_length"],
                min_length=params["min_length"],
                do_sample=False,
                truncation=True
            )
            return final_summary[0]['summary_text']
        except Exception as e:
            logger.error(f"Final summarization failed: {e}")
            return _fallback_summary(combined_summary)
    else:
        return _fallback_summary(combined_summary)

def _openai_summarize(text: str, length: str = "medium") -> str:
    """Use OpenAI API for summarization"""
    if not OPENAI_API_KEY:
        return _abstractive_summarize(text, length)
    
    length_instructions = {
        "short": "in 1-2 sentences",
        "medium": "in 2-4 sentences", 
        "long": "in 4-6 sentences"
    }
    
    instruction = length_instructions.get(length, length_instructions["medium"])
    
    # Truncate text to fit in prompt
    max_text_length = 3000
    if len(text) > max_text_length:
        text = text[:max_text_length] + "..."
    
    prompt = f"""Please provide a clear, concise summary of the following article {instruction}. Focus on the main points, key facts, and important conclusions:

Article:
{text}

Summary:"""

    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENAI_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 300,
            },
            timeout=30,
        )
        
        if response.ok:
            data = response.json()
            summary = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            if summary:
                return summary
                
    except Exception as e:
        logger.error(f"OpenAI summarization failed: {e}")
    
    # Fallback to local models
    return _abstractive_summarize(text, length)

def _fallback_summary(text: str) -> str:
    """Intelligent fallback when models fail"""
    sentences = _split_into_sentences(text)
    
    if len(sentences) <= 3:
        return '. '.join(sentences) + '.'
    
    # Take first sentence, middle sentence, and last sentence
    # This often captures introduction, main point, and conclusion
    indices = [0, len(sentences) // 2, -1]
    summary_sentences = [sentences[i] for i in indices if i < len(sentences)]
    
    return '. '.join(summary_sentences) + '.'

def summarize_article(text: str, length: str = None) -> str:
    """
    Enhanced article summarization with multiple strategies
    
    Args:
        text: Article text to summarize
        length: Summary length - 'short', 'medium', or 'long'
    
    Returns:
        Article summary
    """
    if not text or len(text.strip()) < 50:
        return text.strip()
    
    # Use global setting if length not specified
    if length is None:
        length = SUMMARY_LENGTH
    
    # Clean the text
    cleaned_text = _clean_text(text)
    
    try:
        # Choose summarization method based on configuration
        if SUMMARIZATION_PROVIDER == "openai":
            return _openai_summarize(cleaned_text, length)
        elif USE_EXTRACTIVE and len(cleaned_text) < 500:
            # Use advanced extractive for shorter texts
            params = _get_summary_params(length)
            return _advanced_extractive_summarize(cleaned_text, params["num_sentences"])
        else:
            # Use hybrid approach (best of both worlds)
            return _hybrid_summarize(cleaned_text, length)
            
    except Exception as e:
        logger.error(f"All summarization methods failed: {e}")
        return _fallback_summary(cleaned_text)

def _extract_keywords(text: str, num_keywords: int = 10) -> List[str]:
    """Extract important keywords from text"""
    if NLTK_AVAILABLE:
        try:
            # Tokenize and get POS tags
            tokens = word_tokenize(text.lower())
            pos_tags = pos_tag(tokens)
            
            # Get stopwords
            try:
                stop_words = set(stopwords.words('english'))
            except:
                stop_words = set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])
            
            # Filter for important words (nouns, adjectives, verbs)
            important_words = []
            for word, pos in pos_tags:
                if (len(word) > 2 and 
                    word not in stop_words and 
                    word.isalpha() and
                    pos.startswith(('NN', 'JJ', 'VB'))):
                    important_words.append(word)
            
            # Count frequency and return top keywords
            word_freq = Counter(important_words)
            return [word for word, _ in word_freq.most_common(num_keywords)]
            
        except Exception as e:
            logger.warning(f"NLTK keyword extraction failed: {e}")
    
    # Fallback keyword extraction without NLTK
    try:
        # Simple stopwords list
        stop_words = set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
            'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'my', 'your', 'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who', 'when', 'where',
            'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
            'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now'
        ])
        
        # Extract words (4+ characters, alphabetic only)
        words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
        
        # Filter out stopwords and count frequency
        filtered_words = [word for word in words if word not in stop_words]
        word_freq = Counter(filtered_words)
        
        return [word for word, _ in word_freq.most_common(num_keywords)]
        
    except Exception as e:
        logger.error(f"Fallback keyword extraction failed: {e}")
        return []

def _calculate_sentence_scores(sentences: List[str], keywords: List[str]) -> List[float]:
    """Calculate importance scores for sentences based on keywords and position"""
    scores = []
    total_sentences = len(sentences)
    
    for i, sentence in enumerate(sentences):
        score = 0.0
        sentence_lower = sentence.lower()
        
        # Keyword frequency score
        keyword_count = sum(1 for keyword in keywords if keyword in sentence_lower)
        score += keyword_count * 2
        
        # Position score (first and last sentences are often important)
        if i == 0:
            score += 1.5  # First sentence bonus
        elif i == total_sentences - 1:
            score += 1.0  # Last sentence bonus
        elif i < total_sentences * 0.3:
            score += 0.5  # Early sentences bonus
        
        # Length score (avoid very short or very long sentences)
        sentence_length = len(sentence.split())
        if 10 <= sentence_length <= 30:
            score += 0.5
        elif sentence_length < 5:
            score -= 0.5
        
        # Numeric data bonus (often contains important facts)
        if re.search(r'\d+', sentence):
            score += 0.3
        
        # Question or exclamation penalty (often less informative)
        if sentence.strip().endswith(('?', '!')):
            score -= 0.2
        
        scores.append(score)
    
    return scores

def _advanced_extractive_summarize(text: str, num_sentences: int = 3) -> str:
    """Advanced extractive summarization using keyword analysis and sentence scoring"""
    sentences = _split_into_sentences(text)
    if len(sentences) <= num_sentences:
        return '. '.join(sentences) + '.'
    
    try:
        # Extract keywords
        keywords = _extract_keywords(text, 15)
        
        # Calculate sentence scores
        scores = _calculate_sentence_scores(sentences, keywords)
        
        # Get top sentences
        sentence_scores = list(zip(sentences, scores, range(len(sentences))))
        sentence_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Select top sentences and sort by original order
        selected = sentence_scores[:num_sentences]
        selected.sort(key=lambda x: x[2])  # Sort by original position
        
        summary_sentences = [item[0] for item in selected]
        return '. '.join(summary_sentences) + '.'
        
    except Exception as e:
        logger.error(f"Advanced extractive summarization failed: {e}")
        return _fallback_summary(text)

def _hybrid_summarize(text: str, length: str = "medium") -> str:
    """Hybrid approach combining extractive and abstractive methods"""
    params = _get_summary_params(length)
    
    try:
        # First, use extractive to get key sentences
        key_sentences = _advanced_extractive_summarize(text, params["num_sentences"] + 2)
        
        # Then use abstractive on the extracted content if it's still long
        if len(key_sentences) > 500 and summarizer is not None:
            try:
                summary = summarizer(
                    key_sentences,
                    max_length=params["max_length"],
                    min_length=params["min_length"],
                    do_sample=False,
                    truncation=True
                )
                return summary[0]['summary_text']
            except Exception as e:
                logger.warning(f"Abstractive refinement failed: {e}")
                return key_sentences
        
        return key_sentences
        
    except Exception as e:
        logger.error(f"Hybrid summarization failed: {e}")
        return _fallback_summary(text)

def get_summary_with_options(text: str) -> dict:
    """
    Get summaries of different lengths for comparison
    
    Returns:
        Dictionary with short, medium, and long summaries
    """
    return {
        "short": summarize_article(text, "short"),
        "medium": summarize_article(text, "medium"), 
        "long": summarize_article(text, "long")
    }

def get_detailed_summary_analysis(text: str) -> dict:
    """
    Get comprehensive summary analysis including keywords and different methods
    
    Returns:
        Dictionary with summaries, keywords, and metadata
    """
    try:
        keywords = _extract_keywords(text, 10)
        sentences = _split_into_sentences(text)
        
        # Get summaries using different methods
        extractive_summary = _advanced_extractive_summarize(text, 3)
        hybrid_summary = _hybrid_summarize(text, "medium")
        
        # Try abstractive if available
        abstractive_summary = None
        if summarizer is not None:
            try:
                abstractive_summary = _abstractive_summarize(text, "medium")
            except Exception:
                pass
        
        return {
            "summaries": {
                "extractive": extractive_summary,
                "hybrid": hybrid_summary,
                "abstractive": abstractive_summary,
                "recommended": hybrid_summary  # Hybrid is usually best
            },
            "keywords": keywords,
            "metadata": {
                "original_length": len(text),
                "sentence_count": len(sentences),
                "word_count": len(text.split()),
                "avg_sentence_length": len(text.split()) / len(sentences) if sentences else 0
            }
        }
        
    except Exception as e:
        logger.error(f"Detailed analysis failed: {e}")
        return {
            "summaries": {
                "recommended": summarize_article(text, "medium")
            },
            "keywords": [],
            "metadata": {}
        }
