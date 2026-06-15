"""
Router: /api/analyze
Full fairness analysis of uploaded CSV/Excel using real metrics.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import io
from typing import Optional

router = APIRouter()


def compute_fairness_metrics(df: pd.DataFrame, sensitive_col: str,
                              target_col: str, favorable_value: str,
                              privileged_value: str) -> dict:
    """Compute disparate impact, statistical parity, group rates, and fairness score."""

    if sensitive_col not in df.columns:
        raise ValueError(f"Column '{sensitive_col}' not found in dataset")
    if target_col not in df.columns:
        raise ValueError(f"Column '{target_col}' not found in dataset")

    df = df.copy()
    df[target_col] = df[target_col].astype(str)
    df[sensitive_col] = df[sensitive_col].astype(str)

    groups = df[sensitive_col].unique()
    group_rates = {}
    for group in groups:
        group_df = df[df[sensitive_col] == group]
        n_total = len(group_df)
        n_fav = (group_df[target_col] == favorable_value).sum()
        group_rates[str(group)] = {
            "total": int(n_total),
            "favorable": int(n_fav),
            "rate": float(n_fav / n_total) if n_total > 0 else 0.0,
        }

    priv_rate = group_rates.get(privileged_value, {}).get("rate", 0)
    unpriv_rates = [v["rate"] for k, v in group_rates.items() if k != privileged_value]
    avg_unpriv = float(np.mean(unpriv_rates)) if unpriv_rates else 0.0

    disparate_impact = float(avg_unpriv / priv_rate) if priv_rate > 0 else None
    stat_parity = float(avg_unpriv - priv_rate)

    # Fairness score (0–100)
    di_score = 100
    if disparate_impact is not None:
        if disparate_impact >= 0.8 and disparate_impact <= 1.25:
            di_score = 100
        elif disparate_impact >= 0.7 or disparate_impact <= 1.35:
            di_score = 70
        elif disparate_impact >= 0.6 or disparate_impact <= 1.5:
            di_score = 45
        else:
            di_score = 20

    spd_score = max(0, 100 - abs(stat_parity) * 500)
    fairness_score = int(0.6 * di_score + 0.4 * spd_score)

    severity = (
        {"level": "good",     "label": "✅ Good — No significant bias detected"}     if fairness_score >= 80 else
        {"level": "warning",  "label": "⚠️ Warning — Moderate bias detected"}        if fairness_score >= 60 else
        {"level": "danger",   "label": "🚨 High Risk — Significant bias detected"}   if fairness_score >= 40 else
        {"level": "critical", "label": "🔴 Critical — Severe bias detected"}
    )

    return {
        "disparateImpact": disparate_impact,
        "statisticalParityDiff": stat_parity,
        "fairnessScore": fairness_score,
        "groupRates": group_rates,
        "severity": severity,
        "meta": {
            "totalRows": len(df),
            "columns": list(df.columns),
            "sensitiveCol": sensitive_col,
            "targetCol": target_col,
            "favorableValue": favorable_value,
            "privilegedValue": privileged_value,
        },
    }


@router.post("/csv")
async def analyze_csv(
    file: UploadFile = File(...),
    sensitive_col: str = Form(...),
    target_col: str = Form(...),
    favorable_value: str = Form(...),
    privileged_value: str = Form(...),
):
    """Analyze a CSV or Excel file for fairness metrics."""
    content = await file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif file.filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {str(e)}")

    try:
        result = compute_fairness_metrics(df, sensitive_col, target_col, favorable_value, privileged_value)
        return JSONResponse(content={"success": True, "data": result})
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/json")
async def analyze_json(payload: dict):
    """Analyze pre-parsed data sent as JSON from the frontend."""
    try:
        records = payload.get("records", [])
        if not records:
            raise HTTPException(status_code=422, detail="No records provided")
        df = pd.DataFrame(records)
        result = compute_fairness_metrics(
            df,
            payload["sensitiveCol"],
            payload["targetCol"],
            payload["favorableValue"],
            payload["privilegedValue"],
        )
        return JSONResponse(content={"success": True, "data": result})
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
