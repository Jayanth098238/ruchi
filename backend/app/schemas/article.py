from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ArticleBase(BaseModel):
    url: str

class ArticleCreate(ArticleBase):
    pass

class ArticleResponse(ArticleBase):
    id: int
    user_id: int
    title: Optional[str] = None
    text: Optional[str] = None
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    sector: Optional[str] = None
    impact_score: Optional[float] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ArticleAnalysis(BaseModel):
    url: str
    title: Optional[str] = None
    summary: str
    sentiment: str
    sector: str
    impact_score: float
