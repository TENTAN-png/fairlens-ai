/**
 * FairLens AI — Backend API Client
 * Connects the React frontend to the FastAPI Python backend.
 * Falls back gracefully to browser-only analysis if the backend is offline.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
let backendAvailable = null; // null=unknown, true=online, false=offline

// ── Connectivity Check ────────────────────────────────────────────────────────
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/ping`, { signal: AbortSignal.timeout(3000) });
    backendAvailable = res.ok;
    return res.ok;
  } catch {
    backendAvailable = false;
    return false;
  }
}

export function isBackendAvailable() { return backendAvailable === true; }

// ── Generic request helper ────────────────────────────────────────────────────
async function apiPost(path, body, isFormData = false) {
  const opts = {
    method: 'POST',
    body: isFormData ? body : JSON.stringify(body),
  };
  if (!isFormData) opts.headers = { 'Content-Type': 'application/json' };

  const res = await fetch(`${BACKEND_URL}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

// ── Fairness Analysis ─────────────────────────────────────────────────────────
/**
 * Send a CSV file to the backend for real fairness analysis.
 * @param {File} file - CSV or Excel file
 * @param {object} config - { sensitiveCol, targetCol, favorableValue, privilegedValue }
 */
export async function analyzeDataset(file, config) {
  const form = new FormData();
  form.append('file', file);
  form.append('sensitive_col',    config.sensitiveCol);
  form.append('target_col',       config.targetCol);
  form.append('favorable_value',  config.favorableValue);
  form.append('privileged_value', config.privilegedValue);

  const res = await apiPost('/api/analyze/csv', form, true);
  return res.data;
}

// ── Dataset Health ────────────────────────────────────────────────────────────
export async function analyzeDatasetHealth(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await apiPost('/api/health/', form, true);
  return res.data;
}

// ── Bias Risk Prediction ──────────────────────────────────────────────────────
export async function predictBiasRisk(metrics) {
  const res = await apiPost('/api/bias-risk/predict', {
    totalRows:             metrics.totalRows || 0,
    numColumns:            metrics.numColumns || 0,
    misssingValuesPct:     metrics.missingValuesPct || 0,
    duplicatePct:          metrics.duplicatePct || 0,
    numSensitiveColumns:   metrics.numSensitiveColumns || 0,
    numImbalancedColumns:  metrics.numImbalancedColumns || 0,
    disparateImpact:       metrics.disparateImpact,
    statisticalParityDiff: metrics.statisticalParityDiff,
    fairnessScore:         metrics.fairnessScore,
  });
  return res.data;
}

// ── SHAP Explainability ───────────────────────────────────────────────────────
export async function getSHAPExplanation(file, targetCol, sensitiveCol) {
  const form = new FormData();
  form.append('file',          file);
  form.append('target_col',    targetCol);
  form.append('sensitive_col', sensitiveCol);
  const res = await apiPost('/api/shap/explain', form, true);
  return res.data;
}

// ── Fairness Improvement (Fairlearn) ─────────────────────────────────────────
export async function applyFairlearnMitigation(file, config) {
  const form = new FormData();
  form.append('file',             file);
  form.append('sensitive_col',    config.sensitiveCol);
  form.append('target_col',       config.targetCol);
  form.append('favorable_value',  config.favorableValue);
  form.append('privileged_value', config.privilegedValue);
  const res = await apiPost('/api/improve/reweigh', form, true);
  return res.data;
}

// ── Synthetic Data (CTGAN) ───────────────────────────────────────────────────
export async function generateSyntheticData(file, config, nRows = 500, method = 'auto') {
  const form = new FormData();
  form.append('file',            file);
  form.append('sensitive_col',   config.sensitiveCol);
  form.append('target_col',      config.targetCol);
  form.append('favorable_value', config.favorableValue);
  form.append('n_rows',          nRows.toString());
  form.append('method',          method);
  const res = await apiPost('/api/synthetic/generate', form, true);
  return res.data;
}

// ── Multi-Agent Audit ────────────────────────────────────────────────────────
export async function runMultiAgentAudit(analysisResult, language = 'English') {
  const res = await apiPost('/api/agents/audit', {
    sensitiveCol:    analysisResult.meta?.sensitiveCol,
    targetCol:       analysisResult.meta?.targetCol,
    favorableValue:  analysisResult.meta?.favorableValue,
    privilegedValue: analysisResult.meta?.privilegedValue,
    fairnessScore:   analysisResult.fairnessScore,
    disparateImpact: analysisResult.disparateImpact,
    statParityDiff:  analysisResult.statisticalParityDiff,
    groupRates:      analysisResult.groupRates,
    totalRows:       analysisResult.meta?.totalRows,
    riskLevel:       analysisResult.severity?.level,
    language,
  });
  return res.data;
}

// ── Compliance Check ─────────────────────────────────────────────────────────
export async function checkCompliance(analysisResult, options = {}) {
  const res = await apiPost('/api/compliance/check', {
    fairnessScore:      analysisResult.fairnessScore,
    disparateImpact:    analysisResult.disparateImpact,
    statParityDiff:     analysisResult.statisticalParityDiff,
    hasExplainability:  options.hasExplainability  ?? true,
    hasHumanOversight:  options.hasHumanOversight  ?? true,
    hasAuditTrail:      options.hasAuditTrail       ?? true,
    hasDataPrivacy:     options.hasDataPrivacy      ?? true,
    sensitiveColsCount: options.sensitiveColsCount  ?? 1,
    riskDomain:         options.riskDomain          ?? 'general',
  });
  return res.data;
}

// ── Model Inspection ──────────────────────────────────────────────────────────
export async function auditModel(datasetFile, modelFile, config) {
  const form = new FormData();
  form.append('dataset_file',     datasetFile);
  if (modelFile) form.append('model_file', modelFile);
  form.append('sensitive_col',    config.sensitiveCol);
  form.append('target_col',       config.targetCol);
  form.append('favorable_value',  config.favorableValue);
  form.append('privileged_value', config.privilegedValue);
  const res = await apiPost('/api/models/audit', form, true);
  return res.data;
}

export async function checkModelConsistency(datasetFile, modelFile, config) {
  const form = new FormData();
  form.append('dataset_file',     datasetFile);
  if (modelFile) form.append('model_file', modelFile);
  form.append('sensitive_col',    config.sensitiveCol);
  form.append('target_col',       config.targetCol);
  form.append('favorable_value',  config.favorableValue);
  form.append('privileged_value', config.privilegedValue);
  const res = await apiPost('/api/models/consistency', form, true);
  return res.data;
}

export async function explainModel(datasetFile, modelFile, config) {
  const form = new FormData();
  form.append('dataset_file',     datasetFile);
  if (modelFile) form.append('model_file', modelFile);
  form.append('sensitive_col',    config.sensitiveCol);
  form.append('target_col',       config.targetCol);
  form.append('favorable_value',  config.favorableValue);
  form.append('privileged_value', config.privilegedValue);
  const res = await apiPost('/api/models/explain', form, true);
  return res.data;
}

export async function compareModels(datasetFile, modelAFile, modelBFile, config) {
  const form = new FormData();
  form.append('dataset_file',     datasetFile);
  if (modelAFile) form.append('model_a_file', modelAFile);
  if (modelBFile) form.append('model_b_file', modelBFile);
  form.append('sensitive_col',    config.sensitiveCol);
  form.append('target_col',       config.targetCol);
  form.append('favorable_value',  config.favorableValue);
  form.append('privileged_value', config.privilegedValue);
  const res = await apiPost('/api/models/compare', form, true);
  return res.data;
}

export async function mitigateModel(datasetFile, modelFile, config) {
  const form = new FormData();
  form.append('dataset_file',     datasetFile);
  if (modelFile) form.append('model_file', modelFile);
  form.append('sensitive_col',    config.sensitiveCol);
  form.append('target_col',       config.targetCol);
  form.append('favorable_value',  config.favorableValue);
  form.append('privileged_value', config.privilegedValue);
  const res = await apiPost('/api/models/mitigate', form, true);
  return res.data;
}

// ── Backend Status for UI ─────────────────────────────────────────────────────
export { BACKEND_URL };

