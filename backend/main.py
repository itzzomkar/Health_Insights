from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import auth, analysis, chat, upload

app = FastAPI(
    title="HIA - Health Insights Agent API",
    description="Backend API for the Health Insights Agent Kaggle Capstone",
    version="1.0.0"
)

import os

# Configure CORS for React frontend (Vite defaults to 5173)
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])

@app.get("/")
async def root():
    return {"message": "HIA API is running"}
