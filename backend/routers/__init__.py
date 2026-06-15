"""FairLens AI backend routers package."""
from . import analysis, health_check, bias_risk, shap_explainer, fairness_improve, synthetic_data, agents, compliance, model_inspection

__all__ = [
    "analysis", "health_check", "bias_risk", "shap_explainer",
    "fairness_improve", "synthetic_data", "agents", "compliance", "model_inspection"
]
