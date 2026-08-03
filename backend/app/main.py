from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routers import analyze, company, sector, qna, auth, news
from app.routers import forex
from app.routers import commodities
from app.db.database import engine
from app.models import user, article
import os

app = FastAPI(title="Equity Research AI")

# Create database tables
user.Base.metadata.create_all(bind=engine)
article.Base.metadata.create_all(bind=engine)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["analysis"])
app.include_router(company.router, prefix="/api/company", tags=["company"])
app.include_router(sector.router, prefix="/api/sector", tags=["sector"])
app.include_router(qna.router, prefix="/api/qna", tags=["qna"])
app.include_router(news.router, prefix="/api/news", tags=["news"])
app.include_router(forex.router, prefix="/api/forex", tags=["forex"])
app.include_router(commodities.router, prefix="/api/commodities", tags=["commodities"])

# Path to static frontend build output
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "out")
# NOTE: Do not mount StaticFiles at "/" to avoid 404s on client-routed paths like /sector/[slug].
# We will serve files and provide SPA fallback via the catch-all route below.

@app.get("/api/")
def root():
    return {"message": "Equity Research AI Backend Running!"}

# Catch-all route to serve frontend
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    # Don't serve API routes as frontend
    if full_path.startswith("api/"):
        return {"error": "API endpoint not found"}
    
    # Try to serve the file, fallback to index.html for SPA routing
    file_path = os.path.join(frontend_path, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # Fallback to index.html for client-side routing
    index_path = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return {"error": "Frontend not built"}
   
   