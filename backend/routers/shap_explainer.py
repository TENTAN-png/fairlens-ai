"""
Router: /api/shap
Real SHAP explainability — trains a model on uploaded data and computes SHAP values.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import io

router = APIRouter()


@router.post("/explain")
async def shap_explain(
    file: UploadFile = File(...),
    target_col: str = Form(...),
    sensitive_col: str = Form(...),
):
    """
    Train a gradient boosting model on the dataset, compute SHAP values,
    and return feature importances with plain-language descriptions.
    """
    content = await file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {str(e)}")

    if target_col not in df.columns:
        raise HTTPException(status_code=422, detail=f"Target column '{target_col}' not found")

    try:
        import shap
        from sklearn.ensemble import GradientBoostingClassifier
        from sklearn.preprocessing import LabelEncoder
        from sklearn.model_selection import train_test_split

        df = df.dropna()
        if len(df) < 10:
            raise HTTPException(status_code=422, detail="Not enough data after removing nulls (need ≥10 rows)")

        # Encode categoricals
        df_enc = df.copy()
        le_map = {}
        for col in df_enc.select_dtypes(include=["object", "category"]).columns:
            le = LabelEncoder()
            df_enc[col] = le.fit_transform(df_enc[col].astype(str))
            le_map[col] = le

        X = df_enc.drop(columns=[target_col])
        y = df_enc[target_col]

        # Ensure binary target
        if y.nunique() > 2:
            median = y.median()
            y = (y >= median).astype(int)

        feature_names = list(X.columns)

        # Train lightweight GBM
        model = GradientBoostingClassifier(n_estimators=50, max_depth=3, random_state=42)
        model.fit(X, y)

        # SHAP values
        explainer  = shap.TreeExplainer(model)
        shap_vals  = explainer.shap_values(X)

        # Mean absolute SHAP per feature
        mean_shap = np.abs(shap_vals).mean(axis=0)
        total     = mean_shap.sum()

        importances = []
        for i, feat in enumerate(feature_names):
            pct = float(mean_shap[i] / total * 100) if total > 0 else 0
            direction = "increases" if float(shap_vals[:, i].mean()) > 0 else "decreases"
            friendly  = feat.replace("_", " ").title()
            importances.append({
                "feature":        feat,
                "friendlyName":   friendly,
                "shapValue":      round(float(mean_shap[i]), 4),
                "importance":     round(pct, 1),
                "direction":      direction,
                "isSensitive":    feat == sensitive_col,
                "description":    f'"{friendly}" {direction} the likelihood of a favorable outcome by {pct:.1f}%',
            })

        importances.sort(key=lambda x: x["importance"], reverse=True)

        return JSONResponse(content={
            "success": True,
            "data": {
                "featureImportances": importances[:15],  # top 15
                "topFactor":          importances[0]["friendlyName"] if importances else "—",
                "totalFeatures":      len(feature_names),
                "modelAccuracy":      round(float(model.score(X, y)) * 100, 1),
            },
        })

    except ImportError:
        # SHAP not installed — return sklearn feature importances as fallback
        from sklearn.ensemble import GradientBoostingClassifier
        from sklearn.preprocessing import LabelEncoder

        df = df.dropna()
        df_enc = df.copy()
        for col in df_enc.select_dtypes(include=["object", "category"]).columns:
            le = LabelEncoder()
            df_enc[col] = le.fit_transform(df_enc[col].astype(str))

        X = df_enc.drop(columns=[target_col])
        y = df_enc[target_col]
        if y.nunique() > 2:
            y = (y >= y.median()).astype(int)

        model = GradientBoostingClassifier(n_estimators=50, max_depth=3, random_state=42)
        model.fit(X, y)

        fi = model.feature_importances_
        feature_names = list(X.columns)
        total = fi.sum()
        importances = []
        for feat, imp in zip(feature_names, fi):
            pct = float(imp / total * 100) if total > 0 else 0
            importances.append({
                "feature":      feat,
                "friendlyName": feat.replace("_", " ").title(),
                "importance":   round(pct, 1),
                "isSensitive":  feat == sensitive_col,
                "description":  f'"{feat.replace("_"," ").title()}" influences decisions by {pct:.1f}%',
            })

        importances.sort(key=lambda x: x["importance"], reverse=True)
        return JSONResponse(content={
            "success": True,
            "data": {
                "featureImportances": importances[:15],
                "topFactor":          importances[0]["friendlyName"] if importances else "—",
                "totalFeatures":      len(feature_names),
                "note":               "SHAP not available — using sklearn feature importances",
            },
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SHAP analysis failed: {str(e)}")
