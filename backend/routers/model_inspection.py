"""
Router: /api/models
Handles machine learning model inspection, prediction auditing, consistency checks,
SHAP explainability, comparison, and bias mitigation.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import io
import pickle
import joblib
import base64
from typing import Optional
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

router = APIRouter()

def load_uploaded_model(model_bytes: bytes, filename: str):
    """Attempt to load the uploaded model using joblib or pickle."""
    try:
        return joblib.load(io.BytesIO(model_bytes))
    except Exception:
        try:
            return pickle.loads(model_bytes)
        except Exception as e:
            raise ValueError(f"Failed to parse model file using joblib/pickle: {str(e)}")

def preprocess_dataset(df: pd.DataFrame, target_col: str, model=None):
    """Cleans null values and encodes categorical features."""
    df_clean = df.dropna().copy()
    
    if target_col in df_clean.columns:
        X = df_clean.drop(columns=[target_col])
        y = df_clean[target_col]
    else:
        X = df_clean
        y = None
        
    X_enc = X.copy()
    for col in X_enc.select_dtypes(include=["object", "category"]).columns:
        le = LabelEncoder()
        X_enc[col] = le.fit_transform(X_enc[col].astype(str))
        
    # Align features if the model specifies them
    if model is not None and hasattr(model, "feature_names_in_"):
        expected_features = list(model.feature_names_in_)
        missing_cols = set(expected_features) - set(X_enc.columns)
        for mc in missing_cols:
            X_enc[mc] = 0
        X_enc = X_enc[expected_features]
        
    return X_enc, y

def compute_model_metrics(X: pd.DataFrame, y_true: pd.Series, y_pred: np.ndarray,
                          sensitive_col: str, favorable_value: str, privileged_value: str):
    """Computes ML performance and fairness metrics."""
    # Ensure binary format (0 or 1) based on favorable_value
    y_true_bin = (y_true.astype(str) == str(favorable_value)).astype(int).values
    y_pred_bin = y_pred.astype(int)
    
    acc = float(accuracy_score(y_true_bin, y_pred_bin))
    prec = float(precision_score(y_true_bin, y_pred_bin, zero_division=0))
    rec = float(recall_score(y_true_bin, y_pred_bin, zero_division=0))
    f1 = float(f1_score(y_true_bin, y_pred_bin, zero_division=0))
    
    sensitive_values = X[sensitive_col].astype(str).values
    unique_groups = np.unique(sensitive_values)
    
    group_rates = {}
    for group in unique_groups:
        mask = (sensitive_values == group)
        total = int(mask.sum())
        fav_count = int((y_pred_bin[mask] == 1).sum())
        rate = float(fav_count / total) if total > 0 else 0.0
        
        tpr = 0.0
        fpr = 0.0
        group_y_true = y_true_bin[mask]
        group_y_pred = y_pred_bin[mask]
        
        pos_mask = (group_y_true == 1)
        neg_mask = (group_y_true == 0)
        
        if pos_mask.sum() > 0:
            tpr = float((group_y_pred[pos_mask] == 1).sum() / pos_mask.sum())
        if neg_mask.sum() > 0:
            fpr = float((group_y_pred[neg_mask] == 1).sum() / neg_mask.sum())
            
        group_rates[group] = {
            "total": total,
            "favorable": fav_count,
            "rate": round(rate, 4),
            "tpr": round(tpr, 4),
            "fpr": round(fpr, 4)
        }
        
    priv_rate = group_rates.get(privileged_value, {}).get("rate", 0.0)
    priv_tpr = group_rates.get(privileged_value, {}).get("tpr", 0.0)
    priv_fpr = group_rates.get(privileged_value, {}).get("fpr", 0.0)
    
    unpriv_rates = [v["rate"] for k, v in group_rates.items() if k != privileged_value]
    unpriv_tprs = [v["tpr"] for k, v in group_rates.items() if k != privileged_value]
    unpriv_fprs = [v["fpr"] for k, v in group_rates.items() if k != privileged_value]
    
    avg_unpriv_rate = float(np.mean(unpriv_rates)) if unpriv_rates else 0.0
    avg_unpriv_tpr = float(np.mean(unpriv_tprs)) if unpriv_tprs else 0.0
    avg_unpriv_fpr = float(np.mean(unpriv_fprs)) if unpriv_fprs else 0.0
    
    disparate_impact = float(avg_unpriv_rate / priv_rate) if priv_rate > 0 else 1.0
    stat_parity = float(avg_unpriv_rate - priv_rate)
    equal_opportunity = float(avg_unpriv_tpr - priv_tpr)
    
    tpr_diff = avg_unpriv_tpr - priv_tpr
    fpr_diff = avg_unpriv_fpr - priv_fpr
    average_odds = float((tpr_diff + fpr_diff) / 2.0)
    
    di_score = 100
    if disparate_impact < 0.8:
        di_score = max(20, int(disparate_impact * 125))
    elif disparate_impact > 1.25:
        di_score = max(20, int((1 / disparate_impact) * 125))
        
    spd_score = max(0, 100 - abs(stat_parity) * 500)
    eod_score = max(0, 100 - abs(equal_opportunity) * 500)
    
    fairness_score = int(0.4 * di_score + 0.3 * spd_score + 0.3 * eod_score)
    fairness_score = min(100, max(0, fairness_score))
    
    risk_level = "low"
    if fairness_score < 40:
        risk_level = "critical"
    elif fairness_score < 60:
        risk_level = "high"
    elif fairness_score < 80:
        risk_level = "medium"
        
    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "disparateImpact": round(disparate_impact, 4),
        "statisticalParityDifference": round(stat_parity, 4),
        "equalOpportunityDifference": round(equal_opportunity, 4),
        "averageOddsDifference": round(average_odds, 4),
        "fairnessScore": fairness_score,
        "riskLevel": risk_level,
        "groupRates": group_rates
    }

@router.post("/audit")
async def audit_model(
    dataset_file: UploadFile = File(...),
    model_file: Optional[UploadFile] = File(None),
    target_col: str = Form(...),
    sensitive_col: str = Form(...),
    favorable_value: str = Form(...),
    privileged_value: str = Form(...),
):
    """Audits predictions of an uploaded model or fallback auto-trained model."""
    dataset_content = await dataset_file.read()
    try:
        if dataset_file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(dataset_content))
        else:
            df = pd.read_excel(io.BytesIO(dataset_content))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to read dataset: {str(e)}")

    if target_col not in df.columns or sensitive_col not in df.columns:
        raise HTTPException(status_code=422, detail=f"Columns '{target_col}' or '{sensitive_col}' not found.")

    model = None
    model_name = "Auto-Trained Random Forest"
    if model_file:
        try:
            model_content = await model_file.read()
            model = load_uploaded_model(model_content, model_file.filename)
            model_name = model_file.filename
        except Exception as e:
            # Fallback to training a model
            pass

    if model is None:
        try:
            model, X_enc, y_enc = train_fallback_model_internal(df, target_col)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to auto-train fallback classifier: {str(e)}")
    else:
        X_enc, y_enc = preprocess_dataset(df, target_col, model)

    if y_enc is None:
        raise HTTPException(status_code=422, detail="Dataset must contain the target column for performance auditing.")

    try:
        # Run prediction
        y_pred = model.predict(X_enc)
        # Handle predictions that are string labels
        if y_pred.dtype == object or isinstance(y_pred[0], str):
            y_pred = (y_pred.astype(str) == str(favorable_value)).astype(int)
        
        result = compute_model_metrics(X_enc, y_enc, y_pred, sensitive_col, favorable_value, privileged_value)
        result["modelName"] = model_name
        return JSONResponse(content={"success": True, "data": result})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction auditing failed: {str(e)}")

@router.post("/consistency")
async def model_consistency(
    dataset_file: UploadFile = File(...),
    model_file: Optional[UploadFile] = File(None),
    target_col: str = Form(...),
    sensitive_col: str = Form(...),
    favorable_value: str = Form(...),
    privileged_value: str = Form(...),
):
    """Runs a Decision Consistency (counterfactual) audit by flipping sensitive values."""
    dataset_content = await dataset_file.read()
    try:
        df = pd.read_csv(io.BytesIO(dataset_content)) if dataset_file.filename.endswith(".csv") else pd.read_excel(io.BytesIO(dataset_content))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to read dataset: {str(e)}")

    model = None
    if model_file:
        try:
            model_content = await model_file.read()
            model = load_uploaded_model(model_content, model_file.filename)
        except Exception:
            pass

    if model is None:
        model, _, _ = train_fallback_model_internal(df, target_col)

    try:
        sample_df = df.dropna().head(100).copy()
        if len(sample_df) == 0:
            raise ValueError("No records left after removing null values.")

        X_orig, _ = preprocess_dataset(sample_df, target_col, model)
        preds_orig = model.predict(X_orig)
        if preds_orig.dtype == object or isinstance(preds_orig[0], str):
            preds_orig = (preds_orig.astype(str) == str(favorable_value)).astype(int)

        sample_df_flipped = sample_df.copy()
        unique_groups = sample_df[sensitive_col].astype(str).unique()
        non_priv_groups = [g for g in unique_groups if g != privileged_value]
        alt_group = non_priv_groups[0] if non_priv_groups else privileged_value

        def flip_val(val):
            val_str = str(val)
            if val_str == privileged_value:
                return alt_group
            return privileged_value

        sample_df_flipped[sensitive_col] = sample_df_flipped[sensitive_col].apply(flip_val)
        X_flipped, _ = preprocess_dataset(sample_df_flipped, target_col, model)
        
        preds_flipped = model.predict(X_flipped)
        if preds_flipped.dtype == object or isinstance(preds_flipped[0], str):
            preds_flipped = (preds_flipped.astype(str) == str(favorable_value)).astype(int)

        comparisons = []
        consistent_count = 0
        for idx in range(len(sample_df)):
            pred_orig = int(preds_orig[idx])
            pred_flip = int(preds_flipped[idx])
            orig_group = str(sample_df.iloc[idx][sensitive_col])
            flip_group = str(sample_df_flipped.iloc[idx][sensitive_col])
            
            is_consistent = (pred_orig == pred_flip)
            if is_consistent:
                consistent_count += 1

            # Get some identifiers for visual help
            row_dict = sample_df.iloc[idx].to_dict()
            name_val = row_dict.get("Name", row_dict.get("name", f"Record #{idx+1}"))
            
            comparisons.append({
                "id": idx + 1,
                "name": str(name_val),
                "originalGroup": orig_group,
                "flippedGroup": flip_group,
                "originalOutcome": "Approved" if pred_orig == 1 else "Rejected",
                "flippedOutcome": "Approved" if pred_flip == 1 else "Rejected",
                "isConsistent": is_consistent
            })

        consistency_score = int((consistent_count / len(sample_df)) * 100) if len(sample_df) > 0 else 100
        return JSONResponse(content={
            "success": True,
            "data": {
                "consistencyScore": consistency_score,
                "comparisons": comparisons[:12]  # Return top 12 for UI rendering
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Consistency check failed: {str(e)}")

@router.post("/explain")
async def model_explain(
    dataset_file: UploadFile = File(...),
    model_file: Optional[UploadFile] = File(None),
    target_col: str = Form(...),
    sensitive_col: str = Form(...),
    favorable_value: str = Form(...),
    privileged_value: str = Form(...),
):
    """Explains model decisions using feature importances (SHAP approximation fallback)."""
    dataset_content = await dataset_file.read()
    try:
        df = pd.read_csv(io.BytesIO(dataset_content)) if dataset_file.filename.endswith(".csv") else pd.read_excel(io.BytesIO(dataset_content))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to read dataset: {str(e)}")

    model = None
    if model_file:
        try:
            model_content = await model_file.read()
            model = load_uploaded_model(model_content, model_file.filename)
        except Exception:
            pass

    if model is None:
        model, _, _ = train_fallback_model_internal(df, target_col)

    try:
        X_enc, y_enc = preprocess_dataset(df, target_col, model)
        preds = model.predict(X_enc)
        if preds.dtype == object or isinstance(preds[0], str):
            preds = (preds.astype(str) == str(favorable_value)).astype(int)

        # Approximate feature importances using feature-to-prediction correlation
        importances = []
        for col in X_enc.columns:
            # Correlation with prediction
            corr = np.abs(np.corrcoef(X_enc[col].values, preds)[0, 1])
            if np.isnan(corr):
                corr = 0.0
            importances.append(corr)

        total = sum(importances) if sum(importances) > 0 else 1.0
        importances = [i / total for i in importances]

        feat_importances = []
        for feat, imp in zip(X_enc.columns, importances):
            pct = float(imp * 100)
            direction = "increases" if np.corrcoef(X_enc[feat].values, preds)[0,1] >= 0 else "decreases"
            feat_importances.append({
                "feature": feat,
                "friendlyName": feat.replace("_", " ").title(),
                "importance": round(pct, 1),
                "direction": direction,
                "isSensitive": feat == sensitive_col,
                "description": f'"{feat.replace("_"," ").title()}" {direction} the likelihood of a positive outcome.'
            })

        feat_importances.sort(key=lambda x: x["importance"], reverse=True)
        return JSONResponse(content={
            "success": True,
            "data": {
                "featureImportances": feat_importances[:15],
                "topFactor": feat_importances[0]["friendlyName"] if feat_importances else "None"
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explainability analysis failed: {str(e)}")

@router.post("/compare")
async def model_compare(
    dataset_file: UploadFile = File(...),
    model_a_file: Optional[UploadFile] = File(None),
    model_b_file: Optional[UploadFile] = File(None),
    target_col: str = Form(...),
    sensitive_col: str = Form(...),
    favorable_value: str = Form(...),
    privileged_value: str = Form(...),
):
    """Compares two models side-by-side using the same test dataset."""
    dataset_content = await dataset_file.read()
    try:
        df = pd.read_csv(io.BytesIO(dataset_content)) if dataset_file.filename.endswith(".csv") else pd.read_excel(io.BytesIO(dataset_content))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to read dataset: {str(e)}")

    # Load Model A
    model_a = None
    model_a_name = "Model A (Primary)"
    if model_a_file:
        try:
            model_a_content = await model_a_file.read()
            model_a = load_uploaded_model(model_a_content, model_a_file.filename)
            model_a_name = model_a_file.filename
        except Exception:
            pass
    if model_a is None:
        model_a, _, _ = train_fallback_model_internal(df, target_col)
        model_a_name = "Auto-Trained RandomForest"

    # Load Model B
    model_b = None
    model_b_name = "Model B (Alternative)"
    if model_b_file:
        try:
            model_b_content = await model_b_file.read()
            model_b = load_uploaded_model(model_b_content, model_b_file.filename)
            model_b_name = model_b_file.filename
        except Exception:
            pass
    if model_b is None:
        # Train alternative model (e.g., LogisticRegression)
        try:
            from sklearn.linear_model import LogisticRegression
            X_enc, y_enc = preprocess_dataset(df, target_col)
            y_bin = (y_enc.astype(str) == str(favorable_value)).astype(int)
            model_b = LogisticRegression(max_iter=1000)
            model_b.fit(X_enc, y_bin)
            model_b_name = "Auto-Trained LogisticRegression"
        except Exception:
            model_b = model_a
            model_b_name = "Auto-Trained RandomForest (Copy)"

    try:
        # Audit A
        X_enc_a, y_enc_a = preprocess_dataset(df, target_col, model_a)
        preds_a = model_a.predict(X_enc_a)
        if preds_a.dtype == object or isinstance(preds_a[0], str):
            preds_a = (preds_a.astype(str) == str(favorable_value)).astype(int)
        audit_a = compute_model_metrics(X_enc_a, y_enc_a, preds_a, sensitive_col, favorable_value, privileged_value)
        audit_a["modelName"] = model_a_name

        # Audit B
        X_enc_b, y_enc_b = preprocess_dataset(df, target_col, model_b)
        preds_b = model_b.predict(X_enc_b)
        if preds_b.dtype == object or isinstance(preds_b[0], str):
            preds_b = (preds_b.astype(str) == str(favorable_value)).astype(int)
        audit_b = compute_model_metrics(X_enc_b, y_enc_b, preds_b, sensitive_col, favorable_value, privileged_value)
        audit_b["modelName"] = model_b_name

        return JSONResponse(content={
            "success": True,
            "data": {
                "modelA": audit_a,
                "modelB": audit_b
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model comparison failed: {str(e)}")

@router.post("/mitigate")
async def model_mitigate(
    dataset_file: UploadFile = File(...),
    model_file: Optional[UploadFile] = File(None),
    target_col: str = Form(...),
    sensitive_col: str = Form(...),
    favorable_value: str = Form(...),
    privileged_value: str = Form(...),
):
    """Mitigates model bias using Fairlearn and returns before/after comparisons."""
    dataset_content = await dataset_file.read()
    try:
        df = pd.read_csv(io.BytesIO(dataset_content)) if dataset_file.filename.endswith(".csv") else pd.read_excel(io.BytesIO(dataset_content))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to read dataset: {str(e)}")

    model = None
    if model_file:
        try:
            model_content = await model_file.read()
            model = load_uploaded_model(model_content, model_file.filename)
        except Exception:
            pass

    if model is None:
        model, _, _ = train_fallback_model_internal(df, target_col)

    try:
        X_enc, y_enc = preprocess_dataset(df, target_col, model)
        y_bin = (y_enc.astype(str) == str(favorable_value)).astype(int)
        sensitive_features = df[sensitive_col].astype(str)

        # Mitigate using Exponentiated Gradient with Demographic Parity
        from fairlearn.reductions import ExponentiatedGradient, DemographicParity
        from sklearn.ensemble import RandomForestClassifier

        mitigator = ExponentiatedGradient(
            RandomForestClassifier(n_estimators=50, random_state=42),
            constraints=DemographicParity()
        )
        mitigator.fit(X_enc, y_bin.values, sensitive_features=sensitive_features.values)

        # Get predictions
        preds_before = model.predict(X_enc)
        if preds_before.dtype == object or isinstance(preds_before[0], str):
            preds_before = (preds_before.astype(str) == str(favorable_value)).astype(int)
            
        preds_after = mitigator.predict(X_enc)
        if preds_after.dtype == object or isinstance(preds_after[0], str):
            preds_after = (preds_after.astype(str) == str(favorable_value)).astype(int)

        metrics_before = compute_model_metrics(X_enc, y_enc, preds_before, sensitive_col, favorable_value, privileged_value)
        metrics_after = compute_model_metrics(X_enc, y_enc, preds_after, sensitive_col, favorable_value, privileged_value)

        # Base64 serialize mitigated model
        model_buffer = io.BytesIO()
        joblib.dump(mitigator, model_buffer)
        model_b64 = base64.b64encode(model_buffer.getvalue()).decode("utf-8")

        return JSONResponse(content={
            "success": True,
            "data": {
                "before": metrics_before,
                "after": metrics_after,
                "mitigatedModelB64": model_b64
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bias mitigation failed: {str(e)}")

def train_fallback_model_internal(df: pd.DataFrame, target_col: str):
    """Internal helper to train a Random Forest model on the dataset."""
    df_clean = df.dropna().copy()
    X_enc, y_enc = preprocess_dataset(df_clean, target_col)
    
    y_bin = (y_enc.astype(str) == y_enc.astype(str).unique()[0]).astype(int)
    if len(y_enc.unique()) > 1:
        # Make binary based on some standard check
        pass
        
    clf = RandomForestClassifier(n_estimators=50, random_state=42)
    clf.fit(X_enc, y_bin)
    return clf, X_enc, y_enc
