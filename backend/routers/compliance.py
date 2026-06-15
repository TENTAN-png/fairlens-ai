"""
Router: /api/compliance
EU AI Act, GDPR, EEOC, NIST AI RMF compliance checking.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class ComplianceRequest(BaseModel):
    fairnessScore:       Optional[int]   = 70
    disparateImpact:     Optional[float] = None
    statParityDiff:      Optional[float] = None
    hasExplainability:   Optional[bool]  = True
    hasHumanOversight:   Optional[bool]  = True
    hasAuditTrail:       Optional[bool]  = True
    hasDataPrivacy:      Optional[bool]  = True
    sensitiveColsCount:  Optional[int]   = 0
    riskDomain:          Optional[str]   = "general"  # "hiring" | "credit" | "healthcare" | "general"


FRAMEWORKS = {
    "EEOC 80% Rule": {
        "description": "US Equal Employment Opportunity Commission adverse impact standard",
        "link": "https://www.eeoc.gov/",
        "checks": [
            ("Disparate Impact ≥ 0.8", lambda r: r.disparateImpact is None or r.disparateImpact >= 0.8, "critical"),
            ("Disparate Impact ≤ 1.25", lambda r: r.disparateImpact is None or r.disparateImpact <= 1.25, "high"),
            ("Fairness Score ≥ 70", lambda r: (r.fairnessScore or 0) >= 70, "high"),
        ],
    },
    "EU AI Act 2024": {
        "description": "European Union Artificial Intelligence Act — high-risk AI requirements",
        "link": "https://artificialintelligenceact.eu/",
        "checks": [
            ("Risk Management System",       lambda r: (r.fairnessScore or 0) >= 60, "critical"),
            ("Data Governance (Article 10)", lambda r: r.hasDataPrivacy, "critical"),
            ("Transparency (Article 13)",    lambda r: r.hasExplainability, "high"),
            ("Human Oversight (Article 14)", lambda r: r.hasHumanOversight, "critical"),
            ("Accuracy & Robustness",        lambda r: (r.fairnessScore or 0) >= 70, "high"),
        ],
    },
    "GDPR": {
        "description": "General Data Protection Regulation — EU data protection law",
        "link": "https://gdpr.eu/",
        "checks": [
            ("Article 22 — No pure automated decisions", lambda r: r.hasHumanOversight, "critical"),
            ("Article 5 — Data minimisation",            lambda r: (r.sensitiveColsCount or 0) <= 3, "medium"),
            ("Article 25 — Privacy by design",          lambda r: r.hasDataPrivacy, "high"),
            ("Audit Trail / Accountability",             lambda r: r.hasAuditTrail, "high"),
        ],
    },
    "NIST AI RMF": {
        "description": "US National Institute of Standards & Technology AI Risk Management Framework",
        "link": "https://www.nist.gov/artificial-intelligence",
        "checks": [
            ("GOVERN — Oversight Policies", lambda r: r.hasHumanOversight and r.hasAuditTrail, "high"),
            ("MAP — Bias & Risk Mapping",   lambda r: (r.fairnessScore or 0) >= 60, "high"),
            ("MEASURE — Fairness Metrics",  lambda r: r.disparateImpact is not None, "medium"),
            ("MANAGE — Mitigation Plans",   lambda r: (r.fairnessScore or 0) >= 70, "high"),
        ],
    },
    "ISO/IEC 42001": {
        "description": "International AI Management System Standard",
        "link": "https://www.iso.org/standard/81230.html",
        "checks": [
            ("AI Governance System",         lambda r: r.hasAuditTrail, "high"),
            ("Fairness & Non-discrimination",lambda r: (r.fairnessScore or 0) >= 70, "high"),
            ("Transparency & Explainability",lambda r: r.hasExplainability, "medium"),
        ],
    },
}

SEVERITY_WEIGHT = {"critical": 20, "high": 10, "medium": 5}


def run_compliance_checks(req: ComplianceRequest) -> dict:
    framework_results = []
    total_score = 0
    max_score   = 0

    for fw_name, fw in FRAMEWORKS.items():
        checks_out = []
        fw_score   = 0
        fw_max     = 0

        for check_label, check_fn, severity in fw["checks"]:
            weight = SEVERITY_WEIGHT[severity]
            try:
                passed = bool(check_fn(req))
            except Exception:
                passed = False

            fw_max   += weight
            max_score += weight
            if passed:
                fw_score   += weight
                total_score += weight

            checks_out.append({
                "label":    check_label,
                "passed":   passed,
                "severity": severity,
                "weight":   weight,
            })

        fw_pct = round(fw_score / fw_max * 100) if fw_max > 0 else 0
        status = "compliant" if fw_pct >= 80 else "partial" if fw_pct >= 50 else "non-compliant"

        framework_results.append({
            "name":        fw_name,
            "description": fw["description"],
            "link":        fw["link"],
            "score":       fw_pct,
            "status":      status,
            "checks":      checks_out,
            "passedCount": sum(1 for c in checks_out if c["passed"]),
            "totalChecks": len(checks_out),
        })

    overall_pct = round(total_score / max_score * 100) if max_score > 0 else 0
    overall_status = "compliant" if overall_pct >= 80 else "partial" if overall_pct >= 50 else "non-compliant"

    # Risk-domain specific warnings
    domain_notes = []
    if req.riskDomain == "hiring":
        domain_notes.append("Hiring AI is considered HIGH-RISK under EU AI Act Annex III — requires conformity assessment")
        domain_notes.append("EEOC 80% Rule applies — failure may result in discrimination charges")
    elif req.riskDomain == "credit":
        domain_notes.append("Credit scoring is HIGH-RISK — EU AI Act requires human review of all adverse decisions")
        domain_notes.append("Fair Credit Reporting Act (FCRA) also applies in US contexts")
    elif req.riskDomain == "healthcare":
        domain_notes.append("Healthcare AI is CRITICAL-RISK — requires CE marking in EU and FDA clearance in US")

    return {
        "overallScore":  overall_pct,
        "overallStatus": overall_status,
        "frameworks":    framework_results,
        "domainNotes":   domain_notes,
        "summary": (
            f"✅ System is compliant with {sum(1 for f in framework_results if f['status'] == 'compliant')}/{len(framework_results)} frameworks"
            if overall_pct >= 80 else
            f"⚠️ Partial compliance — {sum(1 for f in framework_results if f['status'] != 'compliant')} framework(s) need attention"
        ),
    }


@router.post("/check")
async def compliance_check(req: ComplianceRequest):
    try:
        result = run_compliance_checks(req)
        return JSONResponse(content={"success": True, "data": result})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
