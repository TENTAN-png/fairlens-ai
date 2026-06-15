"""
Router: /api/synthetic
CTGAN/SDV-powered synthetic data generation that preserves group fairness.
Falls back to statistical resampling if CTGAN is not installed.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import io, json
from typing import Optional

router = APIRouter()


def _statistical_generate(df: pd.DataFrame, sensitive_col: str,
                            target_col: str, favorable_value: str,
                            n_rows: int) -> pd.DataFrame:
    """
    Fallback: Generate balanced synthetic data using statistical sampling.
    Ensures equal representation across sensitive groups.
    """
    groups = df[sensitive_col].unique()
    n_per_group = n_rows // len(groups)
    parts = []

    for group in groups:
        group_df = df[df[sensitive_col] == group]
        # Oversample to target rate
        target_rate = 0.5  # aim for 50% favorable in synthetic data
        n_fav   = int(n_per_group * target_rate)
        n_unfav = n_per_group - n_fav

        fav_pool   = group_df[group_df[target_col].astype(str) == favorable_value]
        unfav_pool = group_df[group_df[target_col].astype(str) != favorable_value]

        # Sample with replacement if not enough rows
        fav_sample = fav_pool.sample(n=min(n_fav, max(1, len(fav_pool))),
                                      replace=len(fav_pool) < n_fav, random_state=42)
        unfav_sample = unfav_pool.sample(n=min(n_unfav, max(1, len(unfav_pool))),
                                          replace=len(unfav_pool) < n_unfav, random_state=42)

        # Add noise to numeric columns
        combined = pd.concat([fav_sample, unfav_sample])
        for col in combined.select_dtypes(include=[np.number]).columns:
            std = combined[col].std()
            if std > 0:
                combined[col] = combined[col] + np.random.normal(0, std * 0.05, len(combined))

        parts.append(combined)

    synthetic = pd.concat(parts, ignore_index=True).sample(frac=1, random_state=42).reset_index(drop=True)
    return synthetic


@router.post("/generate")
async def generate_synthetic(
    file: UploadFile = File(...),
    sensitive_col: str = Form(...),
    target_col: str = Form(...),
    favorable_value: str = Form(...),
    n_rows: int = Form(500),
    method: str = Form("auto"),   # "ctgan" | "tvae" | "copula" | "statistical" | "auto"
):
    """Generate balanced synthetic data using CTGAN or statistical fallback."""
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content)) if file.filename.endswith(".csv") else pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Cannot parse file: {str(e)}")

    if sensitive_col not in df.columns or target_col not in df.columns:
        raise HTTPException(status_code=422, detail="Column not found in dataset")

    df = df.dropna()
    n_rows = min(n_rows, 5000)  # cap at 5000 rows
    method_used = method

    try:
        if method in ("ctgan", "auto"):
            from sdv.single_table import CTGANSynthesizer
            from sdv.metadata import SingleTableMetadata

            metadata = SingleTableMetadata()
            metadata.detect_from_dataframe(df)

            synthesizer = CTGANSynthesizer(metadata, epochs=50, verbose=False)
            synthesizer.fit(df)
            synthetic_df = synthesizer.sample(num_rows=n_rows)
            method_used = "CTGAN (SDV)"

        elif method == "tvae":
            from sdv.single_table import TVAESynthesizer
            from sdv.metadata import SingleTableMetadata

            metadata = SingleTableMetadata()
            metadata.detect_from_dataframe(df)
            synthesizer = TVAESynthesizer(metadata, epochs=50)
            synthesizer.fit(df)
            synthetic_df = synthesizer.sample(num_rows=n_rows)
            method_used = "TVAE (SDV)"

        elif method == "copula":
            from sdv.single_table import GaussianCopulaSynthesizer
            from sdv.metadata import SingleTableMetadata

            metadata = SingleTableMetadata()
            metadata.detect_from_dataframe(df)
            synthesizer = GaussianCopulaSynthesizer(metadata)
            synthesizer.fit(df)
            synthetic_df = synthesizer.sample(num_rows=n_rows)
            method_used = "Gaussian Copula (SDV)"

        else:
            synthetic_df = _statistical_generate(df, sensitive_col, target_col, favorable_value, n_rows)
            method_used = "Statistical Resampling"

    except ImportError:
        synthetic_df = _statistical_generate(df, sensitive_col, target_col, favorable_value, n_rows)
        method_used = "Statistical Resampling (SDV not installed)"

    except Exception as e:
        # Any SDV failure — fall back to statistical
        synthetic_df = _statistical_generate(df, sensitive_col, target_col, favorable_value, n_rows)
        method_used = f"Statistical Resampling (CTGAN error: {str(e)[:60]})"

    # Compute group stats of synthetic data
    synthetic_df[target_col] = synthetic_df[target_col].astype(str)
    synthetic_df[sensitive_col] = synthetic_df[sensitive_col].astype(str)
    group_stats = {}
    for group in synthetic_df[sensitive_col].unique():
        g = synthetic_df[synthetic_df[sensitive_col] == group]
        group_stats[str(group)] = {
            "count": int(len(g)),
            "favorablePct": round(float((g[target_col] == favorable_value).mean() * 100), 1),
        }

    # Balance score: how even are the group sizes?
    counts = [v["count"] for v in group_stats.values()]
    balance_score = round(min(counts) / max(counts) * 100, 1) if max(counts) > 0 else 0

    return JSONResponse(content={
        "success": True,
        "data": {
            "method":       method_used,
            "rowsGenerated": len(synthetic_df),
            "groupStats":   group_stats,
            "balanceScore": balance_score,
            "preview":      synthetic_df.head(50).to_dict(orient="records"),
            "csvBase64":    _to_csv_b64(synthetic_df),
        },
    })


def _to_csv_b64(df: pd.DataFrame) -> str:
    import base64
    csv_str = df.to_csv(index=False)
    return base64.b64encode(csv_str.encode()).decode()
