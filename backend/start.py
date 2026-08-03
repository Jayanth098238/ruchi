#!/usr/bin/env python3
"""
Startup script for Equity Research AI Backend
"""

import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables (prioritize backend/.env explicitly)
load_dotenv()
from pathlib import Path
backend_dir = Path(__file__).resolve().parent
load_dotenv(backend_dir.joinpath('.env'), override=True)

if __name__ == "__main__":
    # Get configuration from environment variables
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "true").lower() == "true"
    
    print(f"Starting Equity Research AI Backend...")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Reload: {reload}")
    print(f"Database: {os.getenv('DATABASE_URL', 'sqlite:///./articles.db')}")
    print(f"API Documentation: http://{host}:{port}/docs")
    print(f"Frontend: http://{host}:{port}")
    print("-" * 50)
    
    # Start the server
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )
