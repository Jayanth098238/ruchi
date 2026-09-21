from transformers import pipeline
from sentence_transformers import SentenceTransformer, util
import logging
import os
import requests
import re
from collections import Counter

# Optional NLTK imports with fallback
NLTK_AVAILABLE = False
try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize, sent_tokenize
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
        except Exception as e:
            logger.warning(f"Failed to download NLTK data: {e}")
            NLTK_AVAILABLE = False
            
except ImportError:
    logger.warning("NLTK not available. Using fallback keyword extraction.")
    NLTK_AVAILABLE = False

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration for LLM provider
QNA_PROVIDER = os.getenv("QNA_PROVIDER", "").lower()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
HF_QA_MODEL = os.getenv("QNA_HF_MODEL", "deepset/roberta-base-squad2")

# RAG configuration
QNA_USE_RAG = os.getenv("QNA_USE_RAG", "true").lower() == "true"
QNA_EMBED_MODEL = os.getenv("QNA_EMBED_MODEL", "all-MiniLM-L6-v2")
RAG_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "700"))
RAG_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "120"))
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "3"))

# Initialize the question-answering pipeline lazily if not using OpenAI
qa_pipeline = None
if QNA_PROVIDER != "openai":
    try:
        # Force CPU by default to avoid CUDA dependency issues; change if you want GPU
        qa_pipeline = pipeline("question-answering", model=HF_QA_MODEL, device=-1)
        logger.info(f"Question-answering model loaded: {HF_QA_MODEL}")
    except Exception as e:
        logger.error(f"Failed to load question-answering model '{HF_QA_MODEL}': {e}")
        qa_pipeline = None

# Lazy embedder
_embedder = None

def _ensure_embedder():
    global _embedder
    if _embedder is None:
        try:
            _embedder = SentenceTransformer(QNA_EMBED_MODEL, device="cpu")
            logger.info(f"Embeddings model loaded: {QNA_EMBED_MODEL}")
        except Exception as e:
            logger.error(f"Failed to load embeddings model '{QNA_EMBED_MODEL}': {e}")
            _embedder = None
    return _embedder


def _extract_keywords(text: str, num_keywords: int = 10) -> list:
    """Extract important keywords from text using NLTK when available"""
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
            'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
        ])
        
        # Extract words (3+ characters, alphabetic only)
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        
        # Filter out stopwords and count frequency
        filtered_words = [word for word in words if word not in stop_words]
        word_freq = Counter(filtered_words)
        
        # Return top keywords
        return [word for word, _ in word_freq.most_common(num_keywords)]
    except Exception as e:
        logger.warning(f"Fallback keyword extraction failed: {e}")
        # Last resort: just split and filter by length
        words = [w for w in text.lower().split() if len(w) > 3]
        return words[:num_keywords]


def _classify_question(question: str) -> dict:
    """Classify the question type and extract key information"""
    question_lower = question.lower()
    question_info = {
        "type": "general",
        "keywords": [],
        "focus": ""
    }
    
    # Extract keywords using NLP
    question_info["keywords"] = _extract_keywords(question, 5)
    
    # Classify question type
    if NLTK_AVAILABLE:
        try:
            tokens = word_tokenize(question_lower)
            pos_tags = pos_tag(tokens)
            
            # Check for question words
            q_words = ["what", "when", "where", "who", "why", "how", "which"]
            for word, pos in pos_tags[:3]:  # Usually question words appear early
                if word in q_words:
                    question_info["type"] = word
                    break
            
            # Extract focus (what the question is about)
            # For "what is X" questions, X is the focus
            if question_info["type"] == "what" and "is" in tokens:
                is_index = tokens.index("is")
                if is_index < len(tokens) - 1:
                    # Get everything after "is"
                    focus = " ".join(tokens[is_index + 1:]).rstrip("?.,!")
                    question_info["focus"] = focus
            
            # For "when did X" questions, X is the focus
            elif question_info["type"] == "when" and "did" in tokens:
                did_index = tokens.index("did")
                if did_index < len(tokens) - 1:
                    focus = " ".join(tokens[did_index + 1:]).rstrip("?.,!")
                    question_info["focus"] = focus
            
            # For other question types, try to extract noun phrases
            elif not question_info["focus"]:
                # Simple noun phrase extraction
                noun_phrases = []
                current_phrase = []
                for word, pos in pos_tags:
                    if pos.startswith('JJ') or pos.startswith('NN'):  # Adjective or noun
                        current_phrase.append(word)
                    elif current_phrase:  # End of a phrase
                        if any(pos.startswith('NN') for w, pos in current_phrase):
                            noun_phrases.append(" ".join([w for w, _ in current_phrase]))
                        current_phrase = []
                
                if current_phrase and any(pos.startswith('NN') for w, pos in current_phrase):
                    noun_phrases.append(" ".join([w for w, _ in current_phrase]))
                
                if noun_phrases:
                    # Use the longest noun phrase as focus
                    question_info["focus"] = max(noun_phrases, key=len)
        
        except Exception as e:
            logger.warning(f"Question classification with NLTK failed: {e}")
    
    # Fallback classification without NLTK
    if not question_info["focus"]:
        # Simple pattern matching
        patterns = [
            (r"what\s+is\s+(.+)\??$", "what"),
            (r"what\s+are\s+(.+)\??$", "what"),
            (r"when\s+(.+)\??$", "when"),
            (r"where\s+(.+)\??$", "where"),
            (r"who\s+(.+)\??$", "who"),
            (r"why\s+(.+)\??$", "why"),
            (r"how\s+(.+)\??$", "how")
        ]
        
        for pattern, q_type in patterns:
            match = re.search(pattern, question_lower)
            if match:
                question_info["type"] = q_type
                question_info["focus"] = match.group(1).strip()
                break
    
    return question_info


def _chunk_text(text: str, size: int, overlap: int):
    if size <= 0:
        return [text]
    chunks = []
    start = 0
    n = len(text)
    while start < n:
        end = min(n, start + size)
        chunks.append(text[start:end])
        if end == n:
            break
        start = max(end - overlap, start + 1)
    return chunks


def _rag_answer(article_text: str, question: str) -> str:
    if qa_pipeline is None:
        return None
    embedder = _ensure_embedder()
    if embedder is None:
        return None

    # Chunk the article
    chunks = _chunk_text(article_text, RAG_CHUNK_SIZE, RAG_CHUNK_OVERLAP)
    # Embed chunks and question
    try:
        chunk_embs = embedder.encode(chunks, convert_to_tensor=True, normalize_embeddings=True)
        q_emb = embedder.encode([question], convert_to_tensor=True, normalize_embeddings=True)[0]
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        return None

    # Similarity and retrieve top-k
    sims = util.cos_sim(q_emb, chunk_embs)[0]  # shape: [num_chunks]
    topk = min(RAG_TOP_K, len(chunks))
    top_scores, top_idx = sims.topk(k=topk)

    # Run QA over top chunks and pick best by score
    best_answer = None
    best_score = -1.0
    for i in top_idx.tolist():
        ctx = chunks[i]
        try:
            res = qa_pipeline(question=question, context=ctx)
            if res and 'answer' in res:
                score = float(res.get('score', 0.0) or 0.0)
                ans = (res.get('answer') or '').strip()
                if ans and score > best_score:
                    best_score = score
                    best_answer = ans
        except Exception as e:
            logger.warning(f"QA over chunk failed: {e}")
            continue

    # Threshold to avoid nonsense
    if best_answer and best_score >= 0.25:
        return best_answer
    return None

def answer_question(article_text: str, question: str) -> str:
    """
    Answer a question based on the article content using AI.
    Uses local Transformers QA with optional RAG retrieval for better accuracy.
    """
    try:
        if not article_text or not question:
            return "Please provide both article content and a question."

        # Analyze the question to better understand what's being asked
        question_info = _classify_question(question)

        # OpenAI path if explicitly enabled (not required for you)
        if QNA_PROVIDER == "openai":
            return _answer_with_openai(article_text, question)

        # Ensure we have at least a fallback
        if qa_pipeline is None:
            return _fallback_answer(article_text, question, question_info)

        # RAG path: retrieve top-k chunks and run QA on them
        if QNA_USE_RAG:
            rag_ans = _rag_answer(article_text, question)
            if rag_ans:
                return rag_ans
            # If RAG failed, continue to single-context QA as a fallback

        # Single-context QA fallback: select a relevant section and answer
        max_length = 700  # Characters
        if len(article_text) > max_length:
            context = _find_relevant_section(article_text, question, question_info, max_length)
        else:
            context = article_text

        result = qa_pipeline(question=question, context=context)
        if result and 'answer' in result:
            answer = (result['answer'] or '').strip()
            confidence = float(result.get('score', 0) or 0)
            if answer and confidence >= 0.3:
                return answer

        # Fallback
        return _fallback_answer(article_text, question, question_info)

    except Exception as e:
        logger.error(f"Error in question answering: {e}")
        return _fallback_answer(article_text, question, question_info)

def _find_relevant_section(article_text: str, question: str, question_info: dict, max_length: int) -> str:
    """
    Find the most relevant section of the article for the question using NLP techniques.
    """
    # Use the extracted keywords from question classification
    relevant_words = question_info["keywords"]
    
    # If we have a focus, add it to the relevant words
    if question_info["focus"]:
        focus_words = _extract_keywords(question_info["focus"], 3)
        relevant_words.extend(focus_words)
    
    # Fallback if no relevant words found
    if not relevant_words:
        question_words = question.lower().split()
        relevant_words = [word for word in question_words if len(word) > 3]

    if not relevant_words:
        return article_text[:max_length]

    # Use NLTK sentence tokenization if available
    if NLTK_AVAILABLE:
        try:
            sentences = sent_tokenize(article_text)
            sentence_scores = []
            
            for i, sentence in enumerate(sentences):
                # Score based on keyword matches
                keyword_score = sum(1 for word in relevant_words if word.lower() in sentence.lower())
                
                # Position bias - favor first and last sentences slightly
                position_score = 0
                if i < len(sentences) * 0.2:  # First 20% of sentences
                    position_score = 0.5
                elif i > len(sentences) * 0.8:  # Last 20% of sentences
                    position_score = 0.3
                
                # Combined score
                total_score = keyword_score + position_score
                sentence_scores.append((i, sentence, total_score))
            
            # Sort by score
            sentence_scores.sort(key=lambda x: x[2], reverse=True)
            
            # Take top sentences up to max_length
            top_sentences = []
            current_length = 0
            
            # First, include sentences in original order up to max_length
            selected_indices = [s[0] for s in sentence_scores[:10]]  # Take top 10 scoring sentences
            selected_indices.sort()  # Sort by original position
            
            for idx in selected_indices:
                if current_length + len(sentences[idx]) <= max_length:
                    top_sentences.append(sentences[idx])
                    current_length += len(sentences[idx])
                else:
                    break
            
            if top_sentences:
                return " ".join(top_sentences)
            
        except Exception as e:
            logger.warning(f"NLTK sentence analysis failed: {e}")
    
    # Fallback to sliding window approach if NLTK fails or isn't available
    best_start = 0
    best_score = 0

    for i in range(0, len(article_text) - max_length, max_length // 2):
        section = article_text[i:i + max_length]
        score = sum(1 for word in relevant_words if word.lower() in section.lower())

        if score > best_score:
            best_score = score
            best_start = i

    return article_text[best_start:best_start + max_length]

def _fallback_answer(article_text: str, question: str, question_info: dict) -> str:
    """
    Enhanced fallback answer method using NLP techniques.
    """
    question_type = question_info["type"]
    focus = question_info["focus"]
    keywords = question_info["keywords"]
    
    # Use NLTK for better sentence tokenization if available
    if NLTK_AVAILABLE:
        try:
            sentences = sent_tokenize(article_text)
        except Exception:
            sentences = article_text.split('.')
    else:
        sentences = article_text.split('.')
    
    # Clean up sentences
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
    
    # Handle different question types with enhanced matching
    if question_type == "what":
        # For "what" questions, look for sentences containing the focus
        if focus:
            focus_words = focus.lower().split()
            relevant_sentences = []
            
            for sentence in sentences:
                sentence_lower = sentence.lower()
                # Count how many focus words appear in the sentence
                matches = sum(1 for word in focus_words if word in sentence_lower)
                if matches > 0:
                    relevant_sentences.append((sentence, matches))
            
            if relevant_sentences:
                # Return the sentence with the most matches
                best_sentence = max(relevant_sentences, key=lambda x: x[1])[0]
                return best_sentence.strip() + "."
        
        # If no focus or no matches, use keywords
        relevant_sentences = []
        for sentence in sentences:
            sentence_lower = sentence.lower()
            matches = sum(1 for word in keywords if word in sentence_lower)
            if matches > 0:
                relevant_sentences.append((sentence, matches))
        
        if relevant_sentences:
            best_sentence = max(relevant_sentences, key=lambda x: x[1])[0]
            return best_sentence.strip() + "."
        
        return f"Based on the article, I don't have specific information about {focus or 'your question'}."

    elif question_type == "when":
        # Enhanced time-related words
        time_words = ["today", "yesterday", "tomorrow", "recently", "announced", "released", 
                     "last", "next", "year", "month", "week", "day", "hour", "minute", "second",
                     "january", "february", "march", "april", "may", "june", "july", "august", 
                     "september", "october", "november", "december", "jan", "feb", "mar", "apr",
                     "jun", "jul", "aug", "sep", "oct", "nov", "dec", "quarter", "fiscal"]
        
        # Look for sentences with both time words and focus/keywords
        relevant_sentences = []
        
        for sentence in sentences:
            sentence_lower = sentence.lower()
            
            # Check for time words
            time_score = sum(1 for word in time_words if word in sentence_lower)
            
            # Check for focus/keywords
            focus_score = 0
            if focus:
                focus_score = sum(1 for word in focus.lower().split() if word in sentence_lower)
            
            keyword_score = sum(1 for word in keywords if word in sentence_lower)
            
            # Combined score with priority on time words
            total_score = (time_score * 2) + focus_score + keyword_score
            
            if total_score > 0:
                relevant_sentences.append((sentence, total_score))
        
        if relevant_sentences:
            best_sentence = max(relevant_sentences, key=lambda x: x[1])[0]
            return best_sentence.strip() + "."
        
        return "The article doesn't specify exact timing information."

    elif question_type == "where":
        # Enhanced location-related words
        location_words = ["in", "at", "from", "to", "location", "headquarters", "based", "located",
                         "region", "country", "city", "state", "province", "area", "district", "zone",
                         "north", "south", "east", "west", "central"]
        
        # Similar approach as "when" questions
        relevant_sentences = []
        
        for sentence in sentences:
            sentence_lower = sentence.lower()
            
            # Check for location words
            location_score = sum(1 for word in location_words if word in sentence_lower)
            
            # Check for focus/keywords
            focus_score = 0
            if focus:
                focus_score = sum(1 for word in focus.lower().split() if word in sentence_lower)
            
            keyword_score = sum(1 for word in keywords if word in sentence_lower)
            
            # Combined score with priority on location words
            total_score = (location_score * 2) + focus_score + keyword_score
            
            if total_score > 0:
                relevant_sentences.append((sentence, total_score))
        
        if relevant_sentences:
            best_sentence = max(relevant_sentences, key=lambda x: x[1])[0]
            return best_sentence.strip() + "."
        
        return "The article doesn't specify location information."

    elif question_type == "how":
        # Enhanced process-related words
        process_words = ["by", "through", "using", "with", "via", "method", "process", "procedure",
                        "step", "approach", "technique", "strategy", "plan", "implemented", "developed",
                        "created", "built", "designed", "established", "formed"]
        
        # Similar approach as above
        relevant_sentences = []
        
        for sentence in sentences:
            sentence_lower = sentence.lower()
            
            # Check for process words
            process_score = sum(1 for word in process_words if word in sentence_lower)
            
            # Check for focus/keywords
            focus_score = 0
            if focus:
                focus_score = sum(1 for word in focus.lower().split() if word in sentence_lower)
            
            keyword_score = sum(1 for word in keywords if word in sentence_lower)
            
            # Combined score with priority on process words
            total_score = (process_score * 2) + focus_score + keyword_score
            
            if total_score > 0:
                relevant_sentences.append((sentence, total_score))
        
        if relevant_sentences:
            best_sentence = max(relevant_sentences, key=lambda x: x[1])[0]
            return best_sentence.strip() + "."
        
        return "The article describes the situation but doesn't provide detailed process information."

    elif question_type == "why":
        # Enhanced reason-related words
        reason_words = ["because", "due to", "as a result", "therefore", "since", "reason", "cause",
                       "led to", "resulted in", "consequence", "impact", "effect", "influence", 
                       "motivated by", "driven by", "in order to", "so that", "purpose"]
        
        # Similar approach as above
        relevant_sentences = []
        
        for sentence in sentences:
            sentence_lower = sentence.lower()
            
            # Check for reason words
            reason_score = sum(1 for word in reason_words if word in sentence_lower)
            
            # Check for focus/keywords
            focus_score = 0
            if focus:
                focus_score = sum(1 for word in focus.lower().split() if word in sentence_lower)
            
            keyword_score = sum(1 for word in keywords if word in sentence_lower)
            
            # Combined score with priority on reason words
            total_score = (reason_score * 2) + focus_score + keyword_score
            
            if total_score > 0:
                relevant_sentences.append((sentence, total_score))
        
        if relevant_sentences:
            best_sentence = max(relevant_sentences, key=lambda x: x[1])[0]
            return best_sentence.strip() + "."
        
        return "The article presents the information but doesn't explicitly state the reasons."

    else:  # General or other question types
        # Use focus and keywords to find relevant sentences
        relevant_sentences = []
        
        for sentence in sentences:
            sentence_lower = sentence.lower()
            
            # Score based on focus and keywords
            focus_score = 0
            if focus:
                focus_score = sum(1 for word in focus.lower().split() if word in sentence_lower)
            
            keyword_score = sum(1 for word in keywords if word in sentence_lower)
            
            total_score = focus_score + keyword_score
            
            if total_score > 0:
                relevant_sentences.append((sentence, total_score))
        
        if relevant_sentences:
            # Return the most relevant sentence
            best_sentence = max(relevant_sentences, key=lambda x: x[1])[0]
            return best_sentence.strip() + "."
        
        # If no specific answer found, provide a summary
        if len(sentences) > 2:
            # Return first sentence as a summary
            return sentences[0].strip() + "."
        else:
            summary = article_text[:200] + "..." if len(article_text) > 200 else article_text
            return f"Based on the article content: {summary}"

def _answer_with_openai(article_text: str, question: str) -> str:
    if not OPENAI_API_KEY:
        return _fallback_answer(article_text, question, _classify_question(question))
    try:
        # Fit context to a safe size for prompt
        max_ctx = 3500
        context = article_text[:max_ctx]
        prompt = (
            "You are a helpful assistant. Answer the user's question based only on the article text.\n"
            "If the answer cannot be found in the article, say you don't have enough information.\n\n"
            f"Article:\n{context}\n\nQuestion: {question}\nAnswer:"
        )
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENAI_MODEL,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2,
                "max_tokens": 256,
            },
            timeout=20,
        )
        if not resp.ok:
            return _fallback_answer(article_text, question, _classify_question(question))
        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        return content or _fallback_answer(article_text, question, _classify_question(question))
    except Exception as e:
        logger.error(f"OpenAI answer error: {e}")
        return _fallback_answer(article_text, question, _classify_question(question))

