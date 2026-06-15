"""
Router: /api/improve
Real Fairlearn-based fairness mitigation — reweighting, threshold optimization,
and exponentiated gradient with demographic parity / equalized odds constraints.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import io

router = APIRouter()


@router.post("/reweigh")
async def apply_reweighing(
    file: UploadFile = File(...),
    sensitive_col: str = Form(...),
    target_col: str = Form(...),
    favorable_value: str = Form(...),
    privileged_value: str = Form(...),
):
    """Apply Fairlearn reweighing and return before/after fairness metrics."""
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content)) if file.filename.endswith(".csv") else pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        from sklearn.linear_model import LogisticRegression
        from sklearn.preprocessing import LabelEncoder
        from fairlearn.reductions import ExponentiatedGradient, DemographicParity

        df = df.dropna()
        df_enc = df.copy()

        # Encode
        for col in df_enc.select_dtypes(include=["object", "category"]).columns:
            le = LabelEncoder()
            df_enc[col] = le.fit_transform(df_enc[col].astype(str))

        X = df_enc.drop(columns=[target_col])
        y = (df[target_col].astype(str) == favorable_value).astype(int)
        sensitive = df[sensitive_col].astype(str)

        # Baseline — no fairness constraint
        base_model = LogisticRegression(max_iter=1000)
        base_model.fit(X, y)
        y_pred_base = base_model.predict(X)

        # Fairlearn ExponentiatedGradient with DemographicParity
        constraint = DemographicParity()
        mitigator = ExponentiatedGradient(LogisticRegression(max_iter=500), constraint)
        mitigator.fit(X, y, sensitive_features=sensitive)
        y_pred_fair = mitigator.predict(X)

        def group_rates(y_pred, sensitive):
            rates = {}
            for g in sensitive.unique():
                mask = sensitive == g
                rates[str(g)] = {
                    "rate": round(float(y_pred[mask].mean()), 4),
                    "count": int(mask.sum()),
                }
            return rates

        before_rates = group_rates(y_pred_base, sensitive)
        after_rates  = group_rates(y_pred_fair, sensitive)

        # Compute DI and SPD before/after
        priv_before = before_rates.get(privileged_value, {}).get("rate", 0)
        priv_after  = after_rates.get(privileged_value, {}).get("rate", 0)

        unpriv_before = [v["rate"] for k, v in before_rates.items() if k != privileged_value]
        unpriv_after  = [v["rate"] for k, v in after_rates.items()  if k != privileged_value]

        di_before = float(np.mean(unpriv_before) / priv_before) if priv_before > 0 else None
        di_after  = float(np.mean(unpriv_after) / priv_after)   if priv_after > 0  else None

        spd_before = float(np.mean(unpriv_before) - priv_before)
        spd_after  = float(np.mean(unpriv_after)  - priv_after)

        def di_to_score(di):
            if di is None: return 50
            if 0.8 <= di <= 1.25: return 100
            if 0.7 <= di <= 1.35: return 70
            if 0.6 <= di <= 1.5:  return 45
            return 20

        score_before = int(0.6 * di_to_score(di_before) + 0.4 * max(0, 100 - abs(spd_before) * 500))
        score_after  = int(0.6 * di_to_score(di_after)  + 0.4 * max(0, 100 - abs(spd_after) * 500))

        return JSONResponse(content={
            "success": True,
            "data": {
                "method": "Fairlearn ExponentiatedGradient + DemographicParity",
                "before": {
                    "fairnessScore": score_before,
                    "disparateImpact": round(di_before, 4) if di_before else None,
                    "statisticalParityDiff": round(spd_before, 4),
                    "groupRates": before_rates,
                },
                "after": {
                    "fairnessScore": score_after,
                    "disparateImpact": round(di_after, 4) if di_after else None,
                    "statisticalParityDiff": round(spd_after, 4),
                    "groupRates": after_rates,
                },
                "improvement": score_after - score_before,
                "improvementPct": round((score_after - score_before) / max(1, score_before) * 100, 1),
            },
        })

    except ImportError:
        raise HTTPException(status_code=503, detail="Fairlearn not installed. Run: pip install fairlearn")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mitigation failed: {str(e)}")


@router.post("/threshold")
async def threshold_optimizer(
    file: UploadFile = File(...),
    sensitive_col: str = Form(...),
    target_col: str = Form(...),
    favorable_value: str = Form(...),
):
    """Find optimal decision thresholds per group using Fairlearn ThresholdOptimizer."""
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content)) if file.filename.endswith(".csv") else pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        from sklearn.linear_model import LogisticRegression
        from sklearn.preprocessing import LabelEncoder
        from fairlearn.postprocessing import ThresholdOptimizer

        df = df.dropna()
        df_enc = df.copy()
        for col in df_enc.select_dtypes(include=["object", "category"]).columns:
            le = LabelEncoder()
            df_enc[col] = le.fit_transform(df_enc[col].astype(str))

        X = df_enc.drop(columns=[target_col])
        y = (df[target_col].astype(str) == favorable_value).astype(int)
        sensitive = df[sensitive_col].astype(str)

        base = LogisticRegression(max_iter=1000).fit(X, y)

        optimizer = ThresholdOptimizer(
            estimator=base,
            constraints="demographic_parity",
            predict_method="predict_proba",
            objective="balanced_accuracy_score",
        )
        optimizer.fit(X, y, sensitive_features=sensitive)

        # Get optimal thresholds per group
        thresholds = {}
        if hasattr(optimizer, 'interpolated_thresholder_') and hasattr(optimizer.interpolated_thresholder_, 'interpolation_dict'):
            for group, data in optimizer.interpolated_thresholder_.interpolation_dict.items():
                thresholds[str(group)] = {
                    "p0": round(float(data.get("p0", 0)), 3),
                    "p1": round(float(data.get("p1", 0)), 3),
                    "operation0": str(data.get("operation0", "")),
                    "operation1": str(data.get("operation1", "")),
                }

        return JSONResponse(content={
            "success": True,
            "data": {
                "method": "Fairlearn ThresholdOptimizer (Demographic Parity)",
                "thresholds": thresholds,
                "message": "Apply group-specific decision thresholds to equalize outcome rates",
            },
        })

    except ImportError:
        raise HTTPException(status_code=503, detail="Fairlearn not installed. Run: pip install fairlearn")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Threshold optimization failed: {str(e)}")
