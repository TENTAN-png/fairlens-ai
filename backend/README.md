---
title: FairLens AI Backend
emoji: ⚖️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: FastAPI ML backend for FairLens AI Governance Platform
---

# FairLens AI — FastAPI Backend

Responsible AI Governance Platform backend powered by:
- **SHAP** — Real explainability
- **XGBoost** — Bias risk prediction  
- **Fairlearn** — Fairness mitigation
- **CTGAN/SDV** — Synthetic data generation
- **Gemini/Groq** — AI-powered multi-agent audit

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET  /api/ping` | Health check |
| `POST /api/analyze/csv` | Fairness analysis from CSV |
| `POST /api/health/` | Dataset health report |
| `POST /api/bias-risk/predict` | XGBoost bias risk |
| `POST /api/shap/explain` | Real SHAP values |
| `POST /api/improve/reweigh` | Fairlearn mitigation |
| `POST /api/synthetic/generate` | CTGAN synthetic data |
| `POST /api/agents/audit` | 4-agent parallel audit |
| `POST /api/compliance/check` | EEOC/GDPR/EU AI Act |

**Docs:** `/api/docs`

## Frontend
Deployed at: [fairlens-ai-8d166.web.app](https://fairlens-ai-8d166.web.app)
