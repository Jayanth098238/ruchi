from fastapi import APIRouter

router = APIRouter()

@router.get("/{company_name}")
def company_info(company_name: str):
    # Placeholder logic
    return {"company": company_name, "news_count": 12, "sector": "IT"}
