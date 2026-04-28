import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
let groqApiKey = null;

// Gemini models to try
const GEMINI_MODELS = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'];

// Groq models to try (fast + free tier is generous)
const GROQ_MODELS = ['llama-3.1-8b-instant', 'gemma2-9b-it', 'mixtral-8x7b-32768'];

/**
 * Initialize APIs
 */
export function initGeminiAPI(apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

export function initGroqAPI(apiKey) {
  groqApiKey = apiKey;
}

export function isGeminiReady() {
  return genAI !== null;
}

export function isGroqReady() {
  return groqApiKey !== null;
}

/**
 * Try Gemini models (fail fast)
 */
async function tryGemini(prompt) {
  if (!genAI) return null;
  for (const modelName of GEMINI_MODELS) {
    try {
      console.log(`Trying Gemini: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      console.warn(`Gemini ${modelName} failed: ${e.message?.slice(0, 80)}`);
    }
  }
  return null;
}

/**
 * Try Groq models (fail fast)
 */
async function tryGroq(prompt) {
  if (!groqApiKey) return null;
  for (const model of GROQ_MODELS) {
    try {
      console.log(`Trying Groq: ${model}...`);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4096
        })
      });
      if (!res.ok) {
        const err = await res.text();
        console.warn(`Groq ${model} failed: ${res.status} ${err.slice(0, 80)}`);
        continue;
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (e) {
      console.warn(`Groq ${model} failed: ${e.message?.slice(0, 80)}`);
    }
  }
  return null;
}

/**
 * Try Gemini → Groq → Offline fallback
 */
async function generateWithFallback(prompt, offlineFn) {
  // 1. Try Gemini
  const geminiResult = await tryGemini(prompt);
  if (geminiResult) return { text: geminiResult, source: 'Gemini AI' };

  // 2. Try Groq
  const groqResult = await tryGroq(prompt);
  if (groqResult) return { text: groqResult, source: 'Groq AI (Llama)' };

  // 3. Offline fallback
  console.log('All APIs failed — using offline analysis');
  return { text: offlineFn(), source: 'FairLens Offline Engine' };
}

/**
 * Generate offline bias insights from computed metrics
 */
function generateOfflineInsights(r) {
  const di = r.disparateImpact;
  const spd = r.statisticalParityDiff;
  const groups = r.groupRates;
  const meta = r.meta;
  const diPass = di !== null && di >= 0.8 && di <= 1.25;
  const spdPass = spd !== null && Math.abs(spd) < 0.1;
  const groupEntries = Object.entries(groups).sort((a, b) => b[1].rate - a[1].rate);
  const bestGroup = groupEntries[0];
  const worstGroup = groupEntries[groupEntries.length - 1];
  const rateGap = bestGroup && worstGroup ? ((bestGroup[1].rate - worstGroup[1].rate) * 100).toFixed(1) : '0';

  return `### 🔍 Bias Summary

The analysis of **${meta.totalRows} records** reveals ${r.severity.level === 'good' ? 'minimal' : r.severity.level === 'warning' ? 'moderate' : 'significant'} bias in the **${meta.targetCol}** outcomes across the **${meta.sensitiveCol}** attribute. The privileged group (**${meta.privilegedValue}**) shows a selection rate of **${(groups[meta.privilegedValue]?.rate * 100 || 0).toFixed(1)}%** for the favorable outcome (**${meta.favorableValue}**), while unprivileged groups average a ${spd && spd < 0 ? 'lower' : 'comparable'} rate. ${r.severity.level !== 'good' ? `This ${rateGap}% gap suggests that ${meta.sensitiveCol} is influencing outcomes in a potentially discriminatory way.` : 'The rates are within acceptable fairness thresholds.'}

### 📊 Metric Interpretation

**Disparate Impact Ratio: ${di?.toFixed(4) ?? 'N/A'}**
- This measures the ratio of favorable outcome rates between unprivileged and privileged groups
- The EEOC "80% rule" considers values below **0.8** as evidence of adverse impact
- ${diPass ? `✅ **PASSES** the 80% rule — the ratio of ${di?.toFixed(3)} is within the acceptable range (0.8–1.25)` : `⚠️ **FAILS** the 80% rule — a ratio of ${di?.toFixed(3)} ${di && di < 0.8 ? 'falls below the 0.8 threshold, indicating adverse impact against unprivileged groups' : 'exceeds 1.25, indicating reverse disparity'}`}

**Statistical Parity Difference: ${spd?.toFixed(4) ?? 'N/A'}**
- The raw difference in selection rates: P(favorable | unprivileged) − P(favorable | privileged)
- Values beyond **±0.1** are generally considered significant
- ${spdPass ? `✅ Within acceptable range` : `⚠️ The difference of ${spd?.toFixed(3)} indicates ${spd && spd < 0 ? 'bias against unprivileged groups' : 'reverse disparity'}`}

### ⚠️ Key Findings

${groupEntries.map(([group, info], i) => {
  const rate = (info.rate * 100).toFixed(1);
  const isPriv = group === meta.privilegedValue;
  const comparison = isPriv ? '(reference group)' :
    info.rate >= groups[meta.privilegedValue]?.rate * 0.8 ? '✅ within fair range' : '⚠️ below fairness threshold';
  return `${i + 1}. **${group}**: ${rate}% favorable outcome rate (${info.favorable}/${info.total}) — ${comparison}`;
}).join('\n')}

### 🛡️ Mitigation Recommendations

1. **Reweighting (Data-Level)**: Assign sample weights inversely proportional to group representation × outcome rate to balance contributions during training.
2. **Stratified Resampling (Data-Level)**: Oversample underrepresented favorable outcomes to achieve demographic parity in training data.
3. **Fairness Constraints (Model-Level)**: Use Fairlearn or AI Fairness 360 to add demographic parity constraints during optimization.
4. **Calibrated Equalized Odds (Model-Level)**: Post-process predictions to equalize true positive and false positive rates across groups.
5. **Human-in-the-Loop (Process-Level)**: Route divergent predictions to human reviewers for manual assessment.
6. **Regular Auditing (Process-Level)**: Recompute fairness metrics monthly; alert if DI drops below 0.85.

### 📋 Regulatory Compliance

- **EEOC 80% Rule (US)**: DI below 0.8 is prima facie evidence of discrimination
- **EU AI Act (2024)**: Hiring/credit/justice AI mandates bias audits and transparency
- **GDPR Article 22 (EU)**: Right to not be subject to purely automated decisions`;
}

function generateOfflineMitigationCode(r) {
  return `### Bias Mitigation Code Snippets

Python code to address **${r.meta.sensitiveCol}** bias on **${r.meta.targetCol}** outcomes.

---

### 1. Dataset Reweighting

\`\`\`python
import pandas as pd
import numpy as np

def compute_sample_weights(df, sensitive_col='${r.meta.sensitiveCol}', target_col='${r.meta.targetCol}', favorable='${r.meta.favorableValue}'):
    weights = np.ones(len(df))
    overall_rate = (df[target_col] == favorable).mean()
    
    for group in df[sensitive_col].unique():
        mask = df[sensitive_col] == group
        group_rate = (df.loc[mask, target_col] == favorable).mean()
        if group_rate > 0:
            weights[mask & (df[target_col] == favorable)] = overall_rate / group_rate
    return weights

# Usage: model.fit(X, y, sample_weight=compute_sample_weights(df))
\`\`\`

### 2. Oversampling Underrepresented Groups

\`\`\`python
from sklearn.utils import resample

def balanced_resample(df, sensitive_col='${r.meta.sensitiveCol}', target_col='${r.meta.targetCol}', favorable='${r.meta.favorableValue}'):
    target_rate = max(g[target_col].eq(favorable).mean() for _, g in df.groupby(sensitive_col))
    parts = []
    for val, group in df.groupby(sensitive_col):
        fav = group[group[target_col] == favorable]
        unfav = group[group[target_col] != favorable]
        n_needed = int(target_rate * len(group))
        if len(fav) > 0 and n_needed > len(fav):
            fav = resample(fav, n_samples=n_needed, replace=True, random_state=42)
        parts.append(pd.concat([fav, unfav]))
    return pd.concat(parts, ignore_index=True)
\`\`\`

### 3. Post-Processing Calibration

\`\`\`python
import numpy as np

def calibrate_predictions(y_pred, sensitive, privileged='${r.meta.privilegedValue}'):
    calibrated = y_pred.copy()
    priv_rate = y_pred[sensitive == privileged].mean()
    unpriv_rate = y_pred[sensitive != privileged].mean()
    if unpriv_rate > 0 and unpriv_rate < priv_rate:
        calibrated[sensitive != privileged] = np.clip(y_pred[sensitive != privileged] * (priv_rate / unpriv_rate), 0, 1)
    return calibrated
\`\`\`

*Generated by FairLens AI*`;
}

// ============================================
// Build the prompts
// ============================================

function buildInsightsPrompt(analysisResult) {
  return `You are a fairness and bias expert AI assistant analyzing a dataset for hidden discrimination.

**Dataset Info:**
- Total rows: ${analysisResult.meta.totalRows}
- Sensitive attribute: "${analysisResult.meta.sensitiveCol}"
- Target/outcome: "${analysisResult.meta.targetCol}"
- Favorable outcome: "${analysisResult.meta.favorableValue}"
- Privileged group: "${analysisResult.meta.privilegedValue}"

**Metrics:**
- Disparate Impact Ratio: ${analysisResult.disparateImpact?.toFixed(4) ?? 'N/A'} (ideal: 1.0, bias: <0.8 or >1.25)
- Statistical Parity Difference: ${analysisResult.statisticalParityDiff?.toFixed(4) ?? 'N/A'} (ideal: 0, bias: |SPD|>0.1)
- Fairness Score: ${analysisResult.fairnessScore}/100
- Severity: ${analysisResult.severity.label}

**Group Rates:**
${Object.entries(analysisResult.groupRates).map(([g, i]) => `- ${g}: ${(i.rate*100).toFixed(1)}% (${i.favorable}/${i.total})`).join('\n')}

Provide analysis with: ### 🔍 Bias Summary, ### 📊 Metric Interpretation, ### ⚠️ Key Findings, ### 🛡️ Mitigation Recommendations, ### 📋 Regulatory Compliance. Use markdown.`;
}

function buildCodePrompt(analysisResult) {
  return `You are a bias expert. Given: sensitive="${analysisResult.meta.sensitiveCol}", target="${analysisResult.meta.targetCol}", DI=${analysisResult.disparateImpact?.toFixed(4)}, SPD=${analysisResult.statisticalParityDiff?.toFixed(4)}, Score=${analysisResult.fairnessScore}/100.

Provide Python code for: 1) Dataset reweighting 2) SMOTE oversampling 3) Post-processing calibration. Use pandas/sklearn.`;
}

// ============================================
// Public API
// ============================================

export async function generateBiasInsights(analysisResult, language = 'English') {
  let prompt = buildInsightsPrompt(analysisResult);
  if (language !== 'English') {
    prompt += `\n\nIMPORTANT: Respond entirely in ${language}.`;
  }
  const { text, source } = await generateWithFallback(prompt, () => generateOfflineInsights(analysisResult));
  return `*Powered by ${source}*\n\n${text}`;
}

export async function generateMitigationCode(analysisResult) {
  const prompt = buildCodePrompt(analysisResult);
  const { text, source } = await generateWithFallback(prompt, () => generateOfflineMitigationCode(analysisResult));
  return `*Powered by ${source}*\n\n${text}`;
}

export async function generateWithFallbackChat(prompt) {
  const geminiResult = await tryGemini(prompt);
  if (geminiResult) return geminiResult;
  const groqResult = await tryGroq(prompt);
  if (groqResult) return groqResult;
  return 'I\'m currently offline. Please check your API keys in Settings, or try again later.';
}
