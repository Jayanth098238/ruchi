# Repository Info

- **Project Root**: e:\\mainproject
- **Backend**: FastAPI-based app in `backend/app`
- **Key Services**:
  - **summarization**: `backend/app/services/summarization.py` — hybrid abstractive/extractive summarization with multi-stage chunking.
  - **qna_service**: `backend/app/services/qna_service.py` — local Transformers QA with optional RAG retrieval.
  - **sentiment**: `backend/app/services/sentiment.py` — sentiment analysis.
  - **entity_extraction**: `backend/app/services/entity_extraction.py`
  - **sector_classification**: `backend/app/services/sector_classification.py`
  - **impact_scoring**: `backend/app/services/impact_scoring.py`
  - **web_scraper**: `backend/app/services/web_scraper.py`
- **Config**: `backend/app/config.py` — environment-configured models and keys.
- **Frontend**: Next.js app in `backend/frontend` (prebuilt output in `out` and `.next`).
- **Tests**: Various scripts in project root and `backend/test_qna.py`.

## Notable Environment Variables
- **SUMMARIZATION_MODEL** (default: `sshleifer/distilbart-cnn-12-6`)
- **SUMMARIZATION_PROVIDER** (`openai` to use API; default: local HF)
- **USE_EXTRACTIVE_SUMMARY** (default: `true`)
- **EXTRACTIVE_MODEL** (default: `all-MiniLM-L6-v2`)
- **OPENAI_API_KEY**, **OPENAI_MODEL** (e.g., `gpt-4o-mini`)
- **QNA_USE_RAG**, **QNA_EMBED_MODEL**, **RAG_CHUNK_SIZE**, **RAG_CHUNK_OVERLAP**, **RAG_TOP_K`**

## How to Run
- Python venv located at `venv/`.
- Backend entrypoint: `backend/start.py`.
- Requirements: `backend/requirements.txt`.

## Notes
- CPU-first configuration for HF pipelines (device=-1) for portability.
- Graceful fallbacks and logging are implemented across services.