import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SECTOR_KEYWORDS = {
    "Technology": ["software", "tech", "AI", "artificial intelligence", "cloud", "digital", "computer", "internet", "app", "platform"],
    "Finance": ["bank", "finance", "loan", "investment", "stock", "market", "trading", "cryptocurrency", "bitcoin", "financial"],
    "Healthcare": ["medicine", "drug", "healthcare", "medical", "pharmaceutical", "hospital", "patient", "treatment", "vaccine"],
    "Energy": ["oil", "gas", "energy", "renewable", "solar", "wind", "electricity", "power", "fuel", "petroleum"],
    "Retail": ["retail", "e-commerce", "shopping", "store", "consumer", "product", "brand", "marketplace"],
    "Manufacturing": ["manufacturing", "factory", "production", "industrial", "machinery", "automotive", "steel", "chemical"],
    "Real Estate": ["real estate", "property", "housing", "construction", "mortgage", "rental", "development"],
    "Transportation": ["transport", "logistics", "shipping", "airline", "railway", "freight", "delivery", "mobility"],
    "Media": ["media", "entertainment", "news", "publishing", "broadcasting", "content", "streaming", "social media"],
    "Education": ["education", "learning", "school", "university", "training", "course", "student", "academic"]
}

def classify_sector(text: str) -> str:
    try:
        text_lower = text.lower()
        sector_scores = {}
        
        for sector, keywords in SECTOR_KEYWORDS.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            if score > 0:
                sector_scores[sector] = score
        
        if sector_scores:
            # Return the sector with the highest score
            best_sector = max(sector_scores, key=sector_scores.get)
            logger.info(f"Classified text as {best_sector} with score {sector_scores[best_sector]}")
            return best_sector
        
        return "Other"
    except Exception as e:
        logger.error(f"Error in sector classification: {e}")
        return "Other"
