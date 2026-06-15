"""
Router: /api/agents
LangGraph multi-agent audit pipeline.
Agents: DataAgent → BiasAgent → ComplianceAgent → ReportAgent
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import os, json, asyncio

router = APIRouter()

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_KEY   = os.getenv("GROQ_API_KEY", "")


# ── Data Models ───────────────────────────────────────────────────────────────
class AgentAuditRequest(BaseModel):
    sensitiveCol:     str
    targetCol:        str
    favorableValue:   str
    privilegedValue:  str
    fairnessScore:    Optional[int]   = None
    disparateImpact:  Optional[float] = None
    statParityDiff:   Optional[float] = None
    groupRates:       Optional[dict]  = None
    totalRows:        Optional[int]   = None
    riskLevel:        Optional[str]   = None
    language:         Optional[str]   = "English"


class AgentResult(BaseModel):
    agent:    str
    status:   str   # "passed" | "warning" | "failed"
    score:    int
    findings: List[str]
    actions:  List[str]


# ── LLM helper ────────────────────────────────────────────────────────────────
async def _call_llm(prompt: str, language: str = "English") -> str:
    """Call Gemini, then Groq, then return offline text."""
    sys_note = ""
    if language != "English":
        sys_note = f"\n\nIMPORTANT: Respond entirely in {language}. Translate all headings and bullet points."

    # Try Gemini
    if GEMINI_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_KEY)
            model  = genai.GenerativeModel("gemini-2.0-flash-lite")
            result = model.generate_content(prompt + sys_note)
            return result.text
        except Exception:
            pass

    # Try Groq
    if GROQ_KEY:
        try:
            import httpx
            messages = []
            if language != "English":
                messages.append({"role": "system", "content": f"Respond entirely in {language}."})
            messages.append({"role": "user", "content": prompt})
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"},
                    json={"model": "llama-3.3-70b-versatile", "messages": messages, "max_tokens": 1024},
                )
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"]
        except Exception:
            pass

    return None


# ── Individual Agents ─────────────────────────────────────────────────────────
async def run_data_agent(req: AgentAuditRequest) -> dict:
    """Agent 1: Analyses dataset quality and sensitive attribute exposure."""
    score = 100
    findings, actions = [], []

    if req.totalRows and req.totalRows < 100:
        score -= 20
        findings.append(f"Small dataset ({req.totalRows} rows) — results may not be statistically significant")
        actions.append("Collect more data (minimum 500 rows recommended for reliable fairness testing)")

    if req.groupRates:
        sizes = [v.get("total", 0) for v in req.groupRates.values()]
        if max(sizes, default=1) > 0:
            ratio = min(sizes) / max(sizes)
            if ratio < 0.3:
                score -= 25
                findings.append(f"Significant group size imbalance detected (ratio: {ratio:.2f})")
                actions.append("Apply SMOTE or data reweighting to balance group representation")

    status = "passed" if score >= 80 else "warning" if score >= 60 else "failed"
    prompt = f"""You are a Data Quality AI Agent. Analyse this dataset for fairness:
- Sensitive attribute: {req.sensitiveCol}
- Target outcome: {req.targetCol}
- Rows: {req.totalRows or 'unknown'}
- Group rates: {json.dumps(req.groupRates or {})}
Write 2-3 bullet point findings about data quality. Be concise and non-technical."""

    insight = await _call_llm(prompt, req.language)
    if insight:
        findings.insert(0, insight.strip())

    return {"agent": "🔍 Data Quality Agent", "status": status, "score": score,
            "findings": findings[:4], "actions": actions[:3]}


async def run_bias_agent(req: AgentAuditRequest) -> dict:
    """Agent 2: Evaluates bias metrics against EEOC / EU AI Act thresholds."""
    score = req.fairnessScore or 70
    findings, actions = [], []
    di = req.disparateImpact
    spd = req.statParityDiff

    if di is not None:
        if di < 0.8:
            findings.append(f"⚠️ Fairness Check Score {di:.3f} violates the 80% EEOC rule (must be ≥0.8)")
            actions.append("Apply ExponentiatedGradient with DemographicParity constraint via Fairlearn")
        elif di > 1.25:
            findings.append(f"⚠️ Reverse bias detected — fairness score {di:.3f} exceeds 1.25 threshold")
            actions.append("Investigate why the unprivileged group is over-selected")
        else:
            findings.append(f"✅ Fairness Check Score {di:.3f} is within the acceptable range (0.8–1.25)")

    if spd is not None:
        if abs(spd) > 0.1:
            findings.append(f"⚠️ Fairness Gap of {spd:.3f} exceeds the ±0.1 warning threshold")
            actions.append("Use ThresholdOptimizer to equalise decision rates across groups")
        else:
            findings.append(f"✅ Fairness Gap {spd:.3f} is within acceptable limits (±0.1)")

    status = "passed" if score >= 80 else "warning" if score >= 60 else "failed"

    prompt = f"""You are a Bias Detection AI Agent. Results:
- Disparate Impact: {di}
- Statistical Parity Diff: {spd}  
- Fairness Score: {score}/100
- Risk Level: {req.riskLevel or 'Unknown'}
Write 2 bullet point findings about bias risk. Be plain and non-technical."""

    insight = await _call_llm(prompt, req.language)
    if insight:
        findings.insert(0, insight.strip())

    return {"agent": "⚖️ Bias Detection Agent", "status": status, "score": score,
            "findings": findings[:4], "actions": actions[:3]}


async def run_compliance_agent(req: AgentAuditRequest) -> dict:
    """Agent 3: Checks against GDPR, EU AI Act, EEOC, and NIST AI RMF."""
    score = 100
    findings, actions = [], []
    fs = req.fairnessScore or 70
    di = req.disparateImpact

    # EEOC 80% rule
    if di is not None and di < 0.8:
        score -= 30
        findings.append("❌ Fails EEOC 80% Rule — adverse impact on protected groups detected")
        actions.append("Document bias analysis and mitigation plan for legal compliance")
    else:
        findings.append("✅ Passes EEOC 80% Rule check")

    # EU AI Act
    if fs < 70:
        score -= 25
        findings.append("⚠️ May not meet EU AI Act Article 9 (risk management) requirements")
        actions.append("Conduct conformity assessment under EU AI Act before deployment")
    else:
        findings.append("✅ EU AI Act threshold met (fairness score ≥ 70)")

    # GDPR
    findings.append("📋 GDPR Article 22: Automated decision-making must have human oversight")
    actions.append("Ensure humans can review and override any AI decision")

    status = "passed" if score >= 80 else "warning" if score >= 60 else "failed"

    prompt = f"""You are a Regulatory Compliance AI Agent. Fairness Score: {fs}/100.
Check compliance with: GDPR, EU AI Act 2024, EEOC 80% Rule, NIST AI RMF.
Write 2 bullet point compliance findings. Be specific and actionable."""

    insight = await _call_llm(prompt, req.language)
    if insight:
        findings.insert(0, insight.strip())

    return {"agent": "📋 Compliance Agent", "status": status, "score": score,
            "findings": findings[:4], "actions": actions[:3]}


async def run_report_agent(req: AgentAuditRequest, agent_scores: list) -> dict:
    """Agent 4: Synthesises all agent findings into an executive report."""
    avg_score = int(sum(agent_scores) / len(agent_scores)) if agent_scores else 70
    findings, actions = [], []

    overall_status = "passed" if avg_score >= 80 else "warning" if avg_score >= 60 else "failed"
    findings.append(f"Overall governance score: {avg_score}/100 — {overall_status.upper()}")
    actions.append("Download the full PDF audit report for stakeholder distribution")
    actions.append("Schedule a re-audit in 30 days to track improvements")

    prompt = f"""You are an AI Governance Report Agent. 
Overall system score: {avg_score}/100.
Sensitive attribute: {req.sensitiveCol}, Target: {req.targetCol}, Fairness Score: {req.fairnessScore}/100.
Write a 3-sentence executive summary for a non-technical CEO. Focus on: current state, main risk, recommended next step."""

    insight = await _call_llm(prompt, req.language)
    if insight:
        findings.insert(0, insight.strip())

    return {"agent": "📊 Report Agent", "status": overall_status, "score": avg_score,
            "findings": findings[:3], "actions": actions[:3]}


# ── Main Audit Endpoint ───────────────────────────────────────────────────────
@router.post("/audit")
async def run_multi_agent_audit(req: AgentAuditRequest):
    """Run all 4 agents in parallel and return consolidated audit results."""
    try:
        # Run agents concurrently
        data_res, bias_res, comp_res = await asyncio.gather(
            run_data_agent(req),
            run_bias_agent(req),
            run_compliance_agent(req),
        )
        agent_scores = [data_res["score"], bias_res["score"], comp_res["score"]]
        report_res   = await run_report_agent(req, agent_scores)

        all_agents   = [data_res, bias_res, comp_res, report_res]
        overall_score = int(sum(a["score"] for a in all_agents) / len(all_agents))
        passed = sum(1 for a in all_agents if a["status"] == "passed")
        warned = sum(1 for a in all_agents if a["status"] == "warning")
        failed = sum(1 for a in all_agents if a["status"] == "failed")

        return JSONResponse(content={
            "success": True,
            "data": {
                "overallScore":  overall_score,
                "agentsPassed":  passed,
                "agentsWarned":  warned,
                "agentsFailed":  failed,
                "agents":        all_agents,
                "recommendation": (
                    "System is ready for deployment — maintain regular monitoring"
                    if overall_score >= 80 else
                    "Improvements required before deployment — review agent findings"
                    if overall_score >= 60 else
                    "Significant fairness issues detected — do not deploy until resolved"
                ),
            },
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent audit failed: {str(e)}")
