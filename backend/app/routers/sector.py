from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from app.services.fake_news import predict_fake_news, train_fake_news

router = APIRouter()

class PredictRequest(BaseModel):
    texts: List[str]

@router.post("/fake-news/predict")
def fake_news_predict(req: PredictRequest):
    if not req.texts:
        raise HTTPException(status_code=400, detail="texts must be a non-empty list")
    preds = predict_fake_news(req.texts)
    return {"items": preds}

class TrainRequest(BaseModel):
    dataset: str | None = "liar"
    output_dir: str | None = "models/fake_news"

@router.post("/fake-news/train")
def fake_news_train(req: TrainRequest):
    result = train_fake_news(model_out_dir=req.output_dir or "models/fake_news", dataset_name=req.dataset or "liar")
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("error") or "Training failed")
    return result

@router.get("/{sector_name}")
def sector_info(sector_name: str):
    # Placeholder logic (kept)
    return {"sector": sector_name, "top_companies": ["Apple", "Microsoft"]}

