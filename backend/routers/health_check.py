"""
Router: /api/health
Dataset Health Check — missing values, duplicates, class imbalance, sensitive data detection.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import io, re

router = APIRouter()

SENSITIVE_PATTERNS = [
    r'\b(ssn|social.?security)\b',
    r'\b(passport)\b',
    r'\b(credit.?card|card.?number)\b',
    r'\b(phone|mobile|tel)\b',
    r'\b(email|e-mail)\b',
    r'\b(address|zip.?code|postal)\b',
    r'\b(gender|sex|race|ethnicity|religion|nationality)\b',
    r'\b(salary|income|wage)\b',
    r'\b(dob|date.?of.?birth|birth.?date|age)\b',
]


def detect_sensitive_columns(columns: list) -> list:
    found = []
    for col in columns:
        col_lower = col.lower()
        for pat in SENSITIVE_PATTERNS:
            if re.search(pat, col_lower):
                found.append(col)
                break
    return found


def compute_health_report(df: pd.DataFrame) -> dict:
    n_rows, n_cols = df.shape

    # Missing values
    missing = df.isnull().sum()
    missing_pct = (missing / n_rows * 100).round(2)
    missing_cols = {col: {"count": int(missing[col]), "pct": float(missing_pct[col])}
                    for col in df.columns if missing[col] > 0}
    total_missing_pct = float(missing.sum() / (n_rows * n_cols) * 100)

    # Duplicates
    n_duplicates = int(df.duplicated().sum())
    duplicate_pct = round(n_duplicates / n_rows * 100, 2)

    # Sensitive columns
    sensitive = detect_sensitive_columns(list(df.columns))

    # Class imbalance per categorical column
    imbalance_issues = []
    for col in df.select_dtypes(include=["object", "category"]).columns:
        vc = df[col].value_counts(normalize=True)
        if len(vc) >= 2:
            ratio = vc.min() / vc.max()
            if ratio < 0.3:
                imbalance_issues.append({
                    "column": col,
                    "dominant_class": str(vc.index[0]),
                    "dominant_pct": round(float(vc.iloc[0]) * 100, 1),
                    "minority_pct": round(float(vc.iloc[-1]) * 100, 1),
                    "balance_ratio": round(float(ratio), 3),
                })

    # Data quality score
    missing_penalty = min(40, total_missing_pct * 2)
    dup_penalty = min(20, duplicate_pct * 2)
    imbalance_penalty = min(20, len(imbalance_issues) * 5)
    sensitive_penalty = min(10, len(sensitive) * 2)
    health_score = max(0, round(100 - missing_penalty - dup_penalty - imbalance_penalty - sensitive_penalty))

    risk_level = "Low" if health_score >= 80 else "Medium" if health_score >= 60 else "High"

    # Per-column stats
    column_stats = []
    for col in df.columns:
        dtype = str(df[col].dtype)
        n_unique = int(df[col].nunique())
        n_null = int(df[col].isnull().sum())
        is_sensitive = col in sensitive
        column_stats.append({
            "name": col,
            "type": dtype,
            "uniqueValues": n_unique,
            "missingCount": n_null,
            "missingPct": round(n_null / n_rows * 100, 1),
            "isSensitive": is_sensitive,
        })

    return {
        "healthScore": health_score,
        "riskLevel": risk_level,
        "totalRows": n_rows,
        "totalColumns": n_cols,
        "missingValuesPct": round(total_missing_pct, 2),
        "missingColumns": missing_cols,
        "duplicateRows": n_duplicates,
        "duplicatePct": duplicate_pct,
        "sensitiveColumns": sensitive,
        "imbalanceIssues": imbalance_issues,
        "columnStats": column_stats,
        "recommendations": _build_recommendations(
            total_missing_pct, n_duplicates, imbalance_issues, sensitive, health_score
        ),
    }


def _build_recommendations(missing_pct, n_dup, imbalance, sensitive, score):
    recs = []
    if missing_pct > 5:
        recs.append({"severity": "high", "text": f"Fill or remove missing values ({missing_pct:.1f}% of data is missing)"})
    if n_dup > 0:
        recs.append({"severity": "medium", "text": f"Remove {n_dup} duplicate records before analysis"})
    if imbalance:
        recs.append({"severity": "high", "text": f"Class imbalance detected in {len(imbalance)} column(s) — consider resampling"})
    if sensitive:
        recs.append({"severity": "medium", "text": f"Sensitive columns found: {', '.join(sensitive[:3])} — review before sharing"})
    if score < 60:
        recs.append({"severity": "high", "text": "Overall data quality is low — clean the dataset before running fairness analysis"})
    if not recs:
        recs.append({"severity": "low", "text": "Dataset looks healthy. Proceed with fairness analysis."})
    return recs


@router.post("/")
async def dataset_health(file: UploadFile = File(...)):
    content = await file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif file.filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Only CSV and Excel files supported")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {str(e)}")

    report = compute_health_report(df)
    return JSONResponse(content={"success": True, "data": report})
