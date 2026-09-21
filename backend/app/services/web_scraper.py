import requests
from bs4 import BeautifulSoup
from typing import Optional, Tuple
import re
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def scrape_article(url: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Scrape article content and title from a given URL
    Returns: (title, text_content)
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        logger.info(f"Attempting to scrape: {url}")
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "header", "footer", "aside"]):
            script.decompose()
        
        # Try to find title
        title = None
        title_tag = soup.find('title')
        if title_tag:
            title = title_tag.get_text().strip()
            logger.info(f"Found title: {title[:50]}...")
        
        # Try to find main content
        # Common selectors for article content
        content_selectors = [
            'article',
            '[class*="article"]',
            '[class*="content"]',
            '[class*="post"]',
            '[class*="story"]',
            'main',
            '.entry-content',
            '.post-content',
            '.article-content',
            '.story-content',
            '.news-content',
            '[role="main"]'
        ]
        
        content = None
        for selector in content_selectors:
            content_elem = soup.select_one(selector)
            if content_elem:
                content = content_elem.get_text()
                logger.info(f"Found content using selector: {selector}")
                break
        
        # If no specific content found, get body text
        if not content:
            content = soup.get_text()
            logger.info("Using body text as fallback")
        
        # Clean up the text
        if content:
            # Remove extra whitespace and normalize
            content = re.sub(r'\s+', ' ', content).strip()
            # Remove very short lines (likely navigation/menu items)
            lines = [line.strip() for line in content.split('\n') if len(line.strip()) > 20]
            content = ' '.join(lines)
            
            # Limit content length to avoid memory issues
            if len(content) > 10000:
                content = content[:10000]
                logger.info("Content truncated to 10000 characters")
        
        if not content or len(content.strip()) < 100:
            logger.warning("Extracted content is too short or empty")
            return title, None
            
        logger.info(f"Successfully scraped content: {len(content)} characters")
        return title, content
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error scraping {url}: {str(e)}")
        return None, None
    except Exception as e:
        logger.error(f"Unexpected error scraping {url}: {str(e)}")
        return None, None
