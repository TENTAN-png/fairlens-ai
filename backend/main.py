"""
FairLens AI — FastAPI Backend
Responsible AI Governance Platform powered by:
- XGBoost    (bias risk prediction)
- SHAP       (explainability)
- Fairlearn  (bias mitigation)
- CTGAN/SDV  (synthetic data generation)
- LangGraph  (multi-agent orchestration)
- Gemini API (AI insights)
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os

from routers import (
    analysis,
    health_check,
    bias_risk,
    shap_explainer,
    fairness_improve,
    synthetic_data,
    agents,
    compliance,
    model_inspection,
)

app = FastAPI(
    title="FairLens AI API",
    description="Responsible AI Governance Platform — Backend API",
    version="4.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",                    # Vite dev server
        "http://localhost:4173",                    # Vite preview
        "https://fairlens-ai-8d166.web.app",        # Firebase Hosting
        "https://fairlens-ai-8d166.firebaseapp.com",# Firebase alt URL
        "https://*.vercel.app",                     # Vercel (if used)
        os.getenv("FRONTEND_URL", "*"),             # Custom override
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(analysis.router,       prefix="/api/analyze",    tags=["Analysis"])
app.include_router(health_check.router,   prefix="/api/health",     tags=["Dataset Health"])
app.include_router(bias_risk.router,      prefix="/api/bias-risk",  tags=["Bias Risk Prediction"])
app.include_router(shap_explainer.router, prefix="/api/shap",       tags=["Explainability"])
app.include_router(fairness_improve.router, prefix="/api/improve",  tags=["Fairness Improvement"])
app.include_router(synthetic_data.router, prefix="/api/synthetic",  tags=["Synthetic Data"])
app.include_router(agents.router,         prefix="/api/agents",     tags=["Multi-Agent Audit"])
app.include_router(compliance.router,     prefix="/api/compliance", tags=["Compliance"])
app.include_router(model_inspection.router, prefix="/api/models",    tags=["Model Inspection"])


@app.get("/")
def root():
    return {
        "name": "FairLens AI Backend",
        "version": "4.0.0",
        "status": "running",
        "docs": "/api/docs",
        "endpoints": [
            "/api/analyze",
            "/api/health",
            "/api/bias-risk",
            "/api/shap",
            "/api/improve",
            "/api/synthetic",
            "/api/agents/audit",
            "/api/compliance",
            "/api/models",
        ],
    }


@app.get("/api/ping")
def ping():
    return {"status": "ok", "message": "FairLens AI backend is alive"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
