import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── API Keys ────────────────────────────────────────────────────────────────
// Priority: localStorage (user-set) → env var (built-in) → null
const BUILTIN_GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const BUILTIN_GROQ_KEY   = import.meta.env.VITE_GROQ_API_KEY || '';
const geminiKey = localStorage.getItem('fairlens_api_key') || BUILTIN_GEMINI_KEY;
const groqKey   = localStorage.getItem('fairlens_groq_key') || BUILTIN_GROQ_KEY;

function looksLikeGroqKey(key) {
  return key?.startsWith('gsk_') || false;
}

let genAI = null;
if (geminiKey) {
  try { genAI = new GoogleGenerativeAI(geminiKey); } catch { genAI = null; }
}

let groqApiKey = groqKey || null;

// ─── Model Lists ─────────────────────────────────────────────────────────────
const GEMINI_MODELS = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'];
const GROQ_MODELS   = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it', 'mixtral-8x7b-32768'];

// ─── Init ────────────────────────────────────────────────────────────────────
export function initGeminiAPI(apiKey) {
  if (!apiKey) return;
  if (looksLikeGroqKey(apiKey)) {
    // Auto-route mis-pasted Groq keys
    groqApiKey = apiKey;
    localStorage.setItem('fairlens_groq_key', apiKey);
    return;
  }
  try { genAI = new GoogleGenerativeAI(apiKey); } catch { genAI = null; }
}

export function initGroqAPI(apiKey) {
  if (!apiKey) return;
  groqApiKey = apiKey;
}

export function isGeminiReady() { return genAI !== null || groqApiKey !== null; }
export function isGroqReady()   { return groqApiKey !== null; }

// ─── Try Gemini ───────────────────────────────────────────────────────────────
async function tryGemini(prompt, language = 'English') {
  if (!genAI) {
    console.warn('FairLens: Gemini not initialized (genAI is null). Key in localStorage:', localStorage.getItem('fairlens_api_key')?.slice(0, 8) + '...');
    return null;
  }
  for (const modelName of GEMINI_MODELS) {
    try {
      console.log(`FairLens: Trying Gemini model "${modelName}"...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const config = {};
      if (language !== 'English') {
        config.systemInstruction = `You are a professional AI fairness scanner. Respond entirely in ${language}. Translate all headings, summaries, metrics, and bullet points. Do not output any English.`;
      }
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...config,
      });
      console.log(`FairLens: ✅ Gemini "${modelName}" succeeded`);
      return result.response.text();
    } catch (e) {
      console.warn(`FairLens: ❌ Gemini ${modelName} failed:`, e.message?.slice(0, 200));
    }
  }
  return null;
}

// ─── Try Groq ─────────────────────────────────────────────────────────────────
async function tryGroq(prompt, language = 'English') {
  if (!groqApiKey) return null;
  for (const model of GROQ_MODELS) {
    try {
      const messages = [];
      if (language !== 'English') {
        messages.push({
          role: 'system',
          content: `You are a professional AI fairness assistant. Respond entirely in ${language}. Translate all headings, summaries, and bullet points.`,
        });
      }
      messages.push({ role: 'user', content: prompt });

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4096 }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.warn(`Groq ${model} failed: ${res.status} — ${err.slice(0, 100)}`);
        continue;
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (e) {
      console.warn(`Groq ${model} error: ${e.message?.slice(0, 100)}`);
    }
  }
  return null;
}

// ─── Fallback Chain: Gemini → Groq → Offline ─────────────────────────────────
async function generateWithFallback(prompt, offlineFn, language = 'English') {
  const geminiResult = await tryGemini(prompt, language);
  if (geminiResult) return { text: geminiResult, source: 'Gemini AI' };

  const groqResult = await tryGroq(prompt, language);
  if (groqResult) return { text: groqResult, source: 'Groq AI (Llama)' };

  return { text: offlineFn(), source: 'FairLens Offline Engine' };
}

// ─── Offline Fallbacks ────────────────────────────────────────────────────────
function generateOfflineInsights(r) {
  const di  = r.disparateImpact;
  const spd = r.statisticalParityDiff;
  const groups = r.groupRates;
  const meta   = r.meta;
  const diPass  = di  !== null && di  >= 0.8 && di  <= 1.25;
  const spdPass = spd !== null && Math.abs(spd) < 0.1;
  const groupEntries = Object.entries(groups).sort((a, b) => b[1].rate - a[1].rate);
  const bestGroup  = groupEntries[0];
  const worstGroup = groupEntries[groupEntries.length - 1];
  const rateGap = bestGroup && worstGroup
    ? ((bestGroup[1].rate - worstGroup[1].rate) * 100).toFixed(1)
    : '0';

  return `### 🔍 Bias Summary

Analysis of **${meta.totalRows} records** shows ${r.severity.level === 'good' ? 'minimal' : r.severity.level === 'warning' ? 'moderate' : 'significant'} bias in **${meta.targetCol}** outcomes across **${meta.sensitiveCol}**.
The privileged group (**${meta.privilegedValue}**) has a selection rate of **${(groups[meta.privilegedValue]?.rate * 100 || 0).toFixed(1)}%**.
${r.severity.level !== 'good' ? `The ${rateGap}% gap suggests ${meta.sensitiveCol} is influencing outcomes unfairly.` : 'Rates are within acceptable fairness thresholds.'}

### 📊 Metric Interpretation

**Fairness Check Score: ${di?.toFixed(4) ?? 'N/A'}**
${diPass ? '✅ PASSES — ratio is within the acceptable range (0.8–1.25)' : `⚠️ FAILS — ratio of ${di?.toFixed(3)} indicates adverse impact`}

**Fairness Gap: ${spd?.toFixed(4) ?? 'N/A'}**
${spdPass ? '✅ Within acceptable range' : `⚠️ Gap of ${spd?.toFixed(3)} indicates ${spd && spd < 0 ? 'bias against unprivileged groups' : 'reverse disparity'}`}

### ⚠️ Key Findings

${groupEntries.map(([group, info], i) => {
  const rate = (info.rate * 100).toFixed(1);
  const isPriv = group === meta.privilegedValue;
  const comparison = isPriv ? '(reference group)' :
    info.rate >= (groups[meta.privilegedValue]?.rate ?? 0) * 0.8 ? '✅ within fair range' : '⚠️ below fairness threshold';
  return `${i + 1}. **${group}**: ${rate}% favorable outcome rate (${info.favorable}/${info.total}) — ${comparison}`;
}).join('\n')}

### 🛡️ Improvement Recommendations

1. **Reweighting**: Assign sample weights inversely proportional to group representation to balance training contributions.
2. **Stratified Resampling**: Oversample underrepresented favorable outcomes for demographic parity.
3. **Fairness Constraints**: Use Fairlearn to add demographic parity constraints during optimization.
4. **Post-Processing**: Equalize true positive and false positive rates across groups.
5. **Regular Auditing**: Recompute fairness metrics monthly; alert if score drops below 85.

### 📋 Regulatory Compliance

- **EEOC 80% Rule (US)**: Score below 0.8 is prima facie evidence of discrimination
- **EU AI Act (2024)**: Hiring/credit/justice AI mandates bias audits and transparency
- **GDPR Article 22 (EU)**: Right not to be subject to purely automated decisions`;
}

function generateOfflineMitigationCode(r) {
  return `### Fairness Improvement Code Snippets

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

### 2. Balanced Resampling

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

*Generated by FairLens AI*`;
}

// ─── Prompt Builders ──────────────────────────────────────────────────────────
function buildInsightsPrompt(r) {
  return `You are a fairness and bias expert AI assistant analyzing a dataset for hidden discrimination.

**Dataset Info:**
- Total rows: ${r.meta.totalRows}
- Sensitive attribute: "${r.meta.sensitiveCol}"
- Target/outcome: "${r.meta.targetCol}"
- Favorable outcome: "${r.meta.favorableValue}"
- Privileged group: "${r.meta.privilegedValue}"

**Metrics:**
- Fairness Check Score: ${r.disparateImpact?.toFixed(4) ?? 'N/A'} (ideal: 1.0, bias: <0.8 or >1.25)
- Fairness Gap: ${r.statisticalParityDiff?.toFixed(4) ?? 'N/A'} (ideal: 0, bias: |gap|>0.1)
- Overall Fairness Score: ${r.fairnessScore}/100
- Severity: ${r.severity.label}

**Group Rates:**
${Object.entries(r.groupRates).map(([g, i]) => `- ${g}: ${(i.rate*100).toFixed(1)}% (${i.favorable}/${i.total})`).join('\n')}

Provide structured analysis with sections: ### 🔍 Bias Summary, ### 📊 Metric Interpretation, ### ⚠️ Key Findings, ### 🛡️ Improvement Recommendations, ### 📋 Regulatory Compliance. Use plain, non-technical language for HR managers and compliance officers. Use markdown.`;
}

function buildCodePrompt(r) {
  return `You are a fairness engineering expert. Given: sensitive="${r.meta.sensitiveCol}", target="${r.meta.targetCol}", fairness score=${r.fairnessScore}/100.
Provide Python code for: 1) Dataset reweighting 2) SMOTE oversampling 3) Post-processing calibration. Use pandas/sklearn.`;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function generateBiasInsights(analysisResult, language = 'English') {
  let prompt = buildInsightsPrompt(analysisResult);
  if (language !== 'English') prompt += `\n\nIMPORTANT: Respond entirely in ${language}. Translate everything.`;
  const { text, source } = await generateWithFallback(prompt, () => generateOfflineInsights(analysisResult), language);
  return `*Powered by ${source}*\n\n${text}`;
}

export async function generateMitigationCode(analysisResult) {
  const prompt = buildCodePrompt(analysisResult);
  const { text, source } = await generateWithFallback(prompt, () => generateOfflineMitigationCode(analysisResult));
  return `*Powered by ${source}*\n\n${text}`;
}

export async function generateWithFallbackChat(prompt) {
  const g = await tryGemini(prompt);
  if (g) return g;
  const q = await tryGroq(prompt);
  if (q) return q;
  return "I'm currently offline. Please add a valid Gemini API key (starts with AIza or AQ.) from Google AI Studio, or a Groq API key (starts with gsk_) from console.groq.com in Settings.";
}

export async function generateAIInsights(prompt) {
  return generateWithFallbackChat(prompt);
}
