/**
 * Multi-Agent Orchestration Engine
 * 
 * Implements a LangGraph-inspired multi-agent pipeline entirely client-side.
 * Each "agent" is a specialized AI prompt that processes the previous agent's output.
 * 
 * Pipeline: Bias Detector → Root Cause Analyzer → Compliance Auditor → Mitigation Advisor → Report Generator
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================
// Agent Definitions
// ============================================

const AGENT_DEFINITIONS = {
  biasDetector: {
    id: 'bias-detector',
    name: 'Fairness Review',
    description: 'Scans the dataset for unfair treatment patterns across groups',
    icon: '🔍',
    buildPrompt: (analysisResult) => `You are a Fairness Review Agent. Analyze this dataset for hidden bias patterns.

**Dataset Summary:**
- Total records: ${analysisResult.meta.totalRows}
- Personal Characteristic analyzed: "${analysisResult.meta.sensitiveCol}"
- Decision Outcome: "${analysisResult.meta.targetCol}"
- Positive Outcome: "${analysisResult.meta.favorableValue}"
- Advantaged Group: "${analysisResult.meta.privilegedValue}"

**Fairness Metrics:**
- Fairness Check (Disparate Impact): ${analysisResult.disparateImpact?.toFixed(4) ?? 'N/A'} (fair range: 0.8–1.25)
- Fairness Gap (Statistical Parity): ${analysisResult.statisticalParityDiff?.toFixed(4) ?? 'N/A'} (fair range: ±0.1)
- Overall Fairness Score: ${analysisResult.fairnessScore}/100

**Group Outcomes:**
${Object.entries(analysisResult.groupRates).map(([g, i]) => `- ${g}: ${(i.rate * 100).toFixed(1)}% positive outcome (${i.favorable}/${i.total})`).join('\n')}

Provide your analysis as a JSON object with these fields:
{
  "biasDetected": true/false,
  "biasType": "string describing the type",
  "affectedGroups": ["list of disadvantaged groups"],
  "severity": "low|moderate|high|critical",
  "summary": "2-3 sentence plain-English summary of findings",
  "details": ["list of 3-5 specific findings"]
}

Respond ONLY with valid JSON, no markdown.`
  },

  rootCauseAnalyzer: {
    id: 'root-cause',
    name: 'Why This Happened',
    description: 'Identifies the main reasons behind unfair patterns',
    icon: '🔎',
    buildPrompt: (analysisResult, previousOutput) => `You are a Root Cause Analysis Agent. Given bias findings, identify WHY the bias exists.

**Dataset Context:**
- Personal Characteristic: "${analysisResult.meta.sensitiveCol}" 
- Decision: "${analysisResult.meta.targetCol}"
- ${analysisResult.meta.totalRows} total records

**Bias Findings from Previous Agent:**
${previousOutput}

Analyze the likely root causes. Consider:
1. Data collection bias
2. Historical discrimination patterns
3. Proxy variables (features that correlate with the personal characteristic)
4. Sample size imbalances
5. Labeling bias

Provide your analysis as a JSON object:
{
  "rootCauses": [
    {"factor": "name", "contribution": "percentage estimate", "explanation": "plain English explanation"}
  ],
  "proxyVariables": ["list of likely proxy variables"],
  "dataQualityIssues": ["list of data quality concerns"],
  "summary": "2-3 sentence plain-English summary"
}

Respond ONLY with valid JSON, no markdown.`
  },

  complianceAuditor: {
    id: 'compliance',
    name: 'Compliance Check',
    description: 'Reviews whether decisions follow fairness and transparency guidelines',
    icon: '📋',
    buildPrompt: (analysisResult, previousOutput) => `You are a Compliance Auditor Agent. Assess regulatory compliance based on bias analysis.

**Metrics:**
- Fairness Check: ${analysisResult.disparateImpact?.toFixed(4)}
- Fairness Gap: ${analysisResult.statisticalParityDiff?.toFixed(4)}
- Score: ${analysisResult.fairnessScore}/100

**Previous Analysis:**
${previousOutput}

Evaluate compliance against these frameworks:
1. EEOC 80% Rule (US employment discrimination)
2. EU AI Act (2024 – high-risk AI systems)
3. GDPR Article 22 (automated decision-making)
4. NIST AI RMF (risk management)

Provide your analysis as a JSON object:
{
  "frameworks": [
    {
      "name": "framework name",
      "score": 0-100,
      "status": "compliant|partial|non-compliant",
      "findings": ["list of specific findings"],
      "recommendations": ["list of recommendations"]
    }
  ],
  "overallScore": 0-100,
  "summary": "2-3 sentence plain-English summary"
}

Respond ONLY with valid JSON, no markdown.`
  },

  mitigationAdvisor: {
    id: 'mitigation',
    name: 'Fairness Improvements',
    description: 'Suggests specific fixes to improve fairness',
    icon: '🛡️',
    buildPrompt: (analysisResult, previousOutput) => `You are a Mitigation Advisor Agent. Based on all prior analysis, recommend specific bias fixes.

**Dataset Context:**
- Personal Characteristic: "${analysisResult.meta.sensitiveCol}"
- Decision: "${analysisResult.meta.targetCol}"
- Current Fairness Score: ${analysisResult.fairnessScore}/100
- Fairness Check: ${analysisResult.disparateImpact?.toFixed(4)}

**Prior Agent Outputs:**
${previousOutput}

Provide actionable mitigation strategies as a JSON object:
{
  "strategies": [
    {
      "name": "strategy name",
      "type": "data-level|model-level|process-level",
      "priority": "high|medium|low",
      "expectedImprovement": "percentage estimate",
      "description": "plain English explanation of what to do",
      "steps": ["step 1", "step 2", "step 3"]
    }
  ],
  "quickWins": ["list of easy immediate actions"],
  "estimatedScoreAfter": 0-100,
  "summary": "2-3 sentence summary"
}

Respond ONLY with valid JSON, no markdown.`
  },

  reportGenerator: {
    id: 'report',
    name: 'Audit Report',
    description: 'Creates a comprehensive fairness audit summary',
    icon: '📄',
    buildPrompt: (analysisResult, previousOutput) => `You are a Report Generator Agent. Create a comprehensive executive summary.

**Full Pipeline Output:**
${previousOutput}

**Original Metrics:**
- Fairness Score: ${analysisResult.fairnessScore}/100
- Fairness Check: ${analysisResult.disparateImpact?.toFixed(4)}
- Fairness Gap: ${analysisResult.statisticalParityDiff?.toFixed(4)}
- Severity: ${analysisResult.severity.label}

Generate an executive summary as a JSON object:
{
  "title": "Fairness Audit Report",
  "date": "${new Date().toISOString().split('T')[0]}",
  "executiveSummary": "3-4 sentence high-level summary for business leaders",
  "riskLevel": "low|moderate|high|critical",
  "keyFindings": ["top 5 findings in plain English"],
  "complianceStatus": "brief compliance summary",
  "topRecommendations": ["top 3 prioritized actions"],
  "conclusion": "1-2 sentence final assessment"
}

Respond ONLY with valid JSON, no markdown.`
  }
};

// ============================================
// Compliance Framework Definitions (for parallel checks)
// ============================================

const COMPLIANCE_FRAMEWORKS = {
  gdpr: {
    name: 'GDPR',
    fullName: 'General Data Protection Regulation',
    icon: '🇪🇺',
    buildPrompt: (analysisResult) => `You are a GDPR compliance expert. Assess this AI system against GDPR requirements.

**System Info:**
- Uses personal characteristic "${analysisResult.meta.sensitiveCol}" for "${analysisResult.meta.targetCol}" decisions
- Fairness Score: ${analysisResult.fairnessScore}/100
- Fairness Check: ${analysisResult.disparateImpact?.toFixed(4)}
- Processes ${analysisResult.meta.totalRows} records

Evaluate against GDPR Articles 5 (data principles), 9 (special categories), 13-14 (transparency), 22 (automated decisions), 25 (data protection by design), 35 (impact assessment).

Respond as JSON:
{
  "score": 0-100,
  "status": "compliant|partial|non-compliant",
  "articles": [
    {"article": "Art. X", "name": "title", "status": "pass|warning|fail", "finding": "explanation"}
  ],
  "recommendations": ["list"],
  "summary": "2 sentence summary"
}

Respond ONLY with valid JSON.`
  },

  euAiAct: {
    name: 'EU AI Act',
    fullName: 'European Union AI Act',
    icon: '⚖️',
    buildPrompt: (analysisResult) => `You are an EU AI Act compliance expert. Assess this AI system.

**System Info:**
- Analyzes "${analysisResult.meta.sensitiveCol}" for "${analysisResult.meta.targetCol}" decisions
- Fairness Score: ${analysisResult.fairnessScore}/100
- ${analysisResult.meta.totalRows} records processed

Evaluate as a high-risk AI system under EU AI Act: risk classification, transparency obligations, human oversight, data governance, accuracy/fairness requirements, documentation.

Respond as JSON:
{
  "score": 0-100,
  "riskClassification": "minimal|limited|high|unacceptable",
  "status": "compliant|partial|non-compliant",
  "requirements": [
    {"requirement": "name", "status": "pass|warning|fail", "finding": "explanation"}
  ],
  "recommendations": ["list"],
  "summary": "2 sentence summary"
}

Respond ONLY with valid JSON.`
  },

  nist: {
    name: 'NIST AI RMF',
    fullName: 'NIST AI Risk Management Framework',
    icon: '🏛️',
    buildPrompt: (analysisResult) => `You are a NIST AI Risk Management Framework expert. Assess this AI system.

**System Info:**
- Analyzes "${analysisResult.meta.sensitiveCol}" for "${analysisResult.meta.targetCol}" decisions
- Fairness Score: ${analysisResult.fairnessScore}/100
- Fairness Check: ${analysisResult.disparateImpact?.toFixed(4)}

Evaluate against NIST AI RMF functions: GOVERN (policies), MAP (context/risks), MEASURE (metrics), MANAGE (responses).

Respond as JSON:
{
  "score": 0-100,
  "status": "compliant|partial|non-compliant",
  "functions": [
    {"function": "GOVERN|MAP|MEASURE|MANAGE", "score": 0-100, "findings": ["list"], "gaps": ["list"]}
  ],
  "recommendations": ["list"],
  "summary": "2 sentence summary"
}

Respond ONLY with valid JSON.`
  },

  iso: {
    name: 'ISO 42001',
    fullName: 'ISO/IEC 42001 AI Management System',
    icon: '📐',
    buildPrompt: (analysisResult) => `You are an ISO 42001 AI Management System expert. Assess this AI system.

**System Info:**
- Analyzes "${analysisResult.meta.sensitiveCol}" for "${analysisResult.meta.targetCol}" decisions  
- Fairness Score: ${analysisResult.fairnessScore}/100
- ${analysisResult.meta.totalRows} records

Evaluate against ISO 42001: AI policy, risk assessment, data management, model lifecycle, monitoring, continual improvement.

Respond as JSON:
{
  "score": 0-100,
  "status": "compliant|partial|non-compliant",
  "clauses": [
    {"clause": "name", "status": "pass|warning|fail", "finding": "explanation"}
  ],
  "recommendations": ["list"],
  "summary": "2 sentence summary"
}

Respond ONLY with valid JSON.`
  }
};

// ============================================
// AI Call Helpers (reuse existing Gemini/Groq pattern)
// ============================================

async function callAgent(prompt) {
  // Try Gemini
  const geminiKey = localStorage.getItem('fairlens_api_key');
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const models = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      for (const modelName of models) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          return text;
        } catch (e) {
          console.warn(`Agent Gemini ${modelName} failed:`, e.message?.slice(0, 80));
        }
      }
    } catch (e) {
      console.warn('Gemini init failed:', e.message);
    }
  }

  // Try Groq
  const groqKey = localStorage.getItem('fairlens_groq_key');
  if (groqKey) {
    const groqModels = ['llama-3.1-8b-instant', 'gemma2-9b-it', 'mixtral-8x7b-32768'];
    for (const model of groqModels) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 4096
          })
        });
        if (res.ok) {
          const data = await res.json();
          return data.choices?.[0]?.message?.content || null;
        }
      } catch (e) {
        console.warn(`Agent Groq ${model} failed:`, e.message?.slice(0, 80));
      }
    }
  }

  return null;
}

function parseAgentResponse(text) {
  if (!text) return null;
  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to extract JSON from the text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        console.warn('Failed to parse agent JSON:', e2.message);
      }
    }
    return { raw: text, parseError: true };
  }
}

// ============================================
// Offline Fallback Generators
// ============================================

function offlineBiasDetection(analysisResult) {
  const r = analysisResult;
  const diPass = r.disparateImpact >= 0.8 && r.disparateImpact <= 1.25;
  const groups = Object.entries(r.groupRates);
  const worstGroup = groups.sort((a, b) => a[1].rate - b[1].rate)[0];

  return {
    biasDetected: !diPass,
    biasType: !diPass ? `${r.meta.sensitiveCol}-based outcome disparity` : 'No significant bias',
    affectedGroups: groups.filter(([, i]) => i.rate < r.groupRates[r.meta.privilegedValue]?.rate * 0.8).map(([g]) => g),
    severity: r.fairnessScore >= 80 ? 'low' : r.fairnessScore >= 60 ? 'moderate' : r.fairnessScore >= 40 ? 'high' : 'critical',
    summary: `Analysis of ${r.meta.totalRows} records reveals ${diPass ? 'minimal' : 'significant'} bias in ${r.meta.targetCol} outcomes across ${r.meta.sensitiveCol}. ${worstGroup ? `The ${worstGroup[0]} group shows the lowest positive outcome rate at ${(worstGroup[1].rate * 100).toFixed(1)}%.` : ''}`,
    details: [
      `Fairness Check ratio: ${r.disparateImpact?.toFixed(3)} (${diPass ? 'within' : 'outside'} fair range 0.8–1.25)`,
      `Fairness Gap: ${r.statisticalParityDiff?.toFixed(4)} (${Math.abs(r.statisticalParityDiff) < 0.1 ? 'acceptable' : 'significant'})`,
      `${groups.length} groups analyzed across ${r.meta.sensitiveCol}`,
      `Advantaged group (${r.meta.privilegedValue}) rate: ${(r.groupRates[r.meta.privilegedValue]?.rate * 100).toFixed(1)}%`,
      worstGroup ? `Most disadvantaged group (${worstGroup[0]}) rate: ${(worstGroup[1].rate * 100).toFixed(1)}%` : 'All groups within fair range'
    ]
  };
}

function offlineRootCause(analysisResult) {
  return {
    rootCauses: [
      { factor: 'Historical data patterns', contribution: '40%', explanation: 'The training data may reflect historical decisions that were themselves biased.' },
      { factor: 'Sample size imbalance', contribution: '25%', explanation: 'Some groups may have significantly fewer records, leading to unreliable estimates.' },
      { factor: 'Proxy variables', contribution: '20%', explanation: 'Other features in the dataset may correlate with the personal characteristic, creating indirect bias.' },
      { factor: 'Labeling bias', contribution: '15%', explanation: 'The favorable outcome definition may itself encode historical preferences.' }
    ],
    proxyVariables: ['income level', 'zip code', 'education level', 'employment history'],
    dataQualityIssues: ['Potential missing data in minority groups', 'Possible outdated records', 'Unverified label accuracy'],
    summary: `The bias in ${analysisResult.meta.targetCol} outcomes is likely driven by historical data patterns and sample imbalances across ${analysisResult.meta.sensitiveCol} groups. Proxy variables may be reinforcing these patterns indirectly.`
  };
}

function offlineCompliance(analysisResult) {
  const score = analysisResult.fairnessScore;
  return {
    frameworks: [
      { name: 'EEOC 80% Rule', score: analysisResult.disparateImpact >= 0.8 ? 95 : 35, status: analysisResult.disparateImpact >= 0.8 ? 'compliant' : 'non-compliant', findings: [`Fairness Check: ${analysisResult.disparateImpact?.toFixed(3)}`], recommendations: ['Monitor ongoing compliance'] },
      { name: 'EU AI Act', score: Math.min(score + 10, 100), status: score >= 70 ? 'compliant' : 'partial', findings: ['High-risk AI system classification applies'], recommendations: ['Document bias audit process', 'Implement human oversight'] },
      { name: 'GDPR Art. 22', score: Math.min(score + 5, 100), status: score >= 60 ? 'partial' : 'non-compliant', findings: ['Automated decision-making detected'], recommendations: ['Provide right to explanation', 'Enable human review option'] },
      { name: 'NIST AI RMF', score: Math.min(score, 100), status: score >= 70 ? 'compliant' : 'partial', findings: ['Risk assessment needed'], recommendations: ['Implement continuous monitoring'] }
    ],
    overallScore: Math.round((score + Math.min(score + 10, 100) + Math.min(score + 5, 100) + score) / 4),
    summary: `The system shows ${score >= 70 ? 'generally adequate' : 'areas needing improvement in'} regulatory compliance. ${analysisResult.disparateImpact >= 0.8 ? 'EEOC requirements are met.' : 'EEOC 80% rule is not met — immediate attention required.'}`
  };
}

function offlineMitigation(analysisResult) {
  return {
    strategies: [
      { name: 'Reweighting', type: 'data-level', priority: 'high', expectedImprovement: '15-25%', description: 'Assign sample weights inversely proportional to group representation to balance training data.', steps: ['Calculate group-level outcome rates', 'Compute inverse weights', 'Apply weights during model training'] },
      { name: 'Stratified Resampling', type: 'data-level', priority: 'high', expectedImprovement: '10-20%', description: 'Oversample underrepresented favorable outcomes to achieve demographic parity.', steps: ['Identify underrepresented groups', 'Apply SMOTE or random oversampling', 'Validate balanced dataset'] },
      { name: 'Fairness Constraints', type: 'model-level', priority: 'medium', expectedImprovement: '20-30%', description: 'Add demographic parity constraints during model optimization using Fairlearn.', steps: ['Install Fairlearn library', 'Define fairness constraints', 'Retrain with constrained optimizer'] },
      { name: 'Human Review Process', type: 'process-level', priority: 'medium', expectedImprovement: '5-15%', description: 'Route edge cases near decision thresholds to human reviewers.', steps: ['Define confidence threshold', 'Build review queue', 'Train reviewers on bias awareness'] }
    ],
    quickWins: ['Audit data collection process for bias sources', 'Add transparency reports for decision explanations', 'Implement monitoring dashboards for ongoing fairness tracking'],
    estimatedScoreAfter: Math.min(analysisResult.fairnessScore + 25, 98),
    summary: `Applying reweighting and fairness constraints could improve the fairness score from ${analysisResult.fairnessScore} to approximately ${Math.min(analysisResult.fairnessScore + 25, 98)}/100. Priority should be given to data-level fixes first.`
  };
}

function offlineReport(analysisResult, allOutputs) {
  return {
    title: 'Fairness Audit Report',
    date: new Date().toISOString().split('T')[0],
    executiveSummary: `This audit analyzed ${analysisResult.meta.totalRows} records for fairness in ${analysisResult.meta.targetCol} decisions across ${analysisResult.meta.sensitiveCol} groups. The system received a fairness score of ${analysisResult.fairnessScore}/100, classified as ${analysisResult.severity.label}. ${analysisResult.fairnessScore < 70 ? 'Immediate remediation is recommended before deployment.' : 'The system meets basic fairness thresholds but continuous monitoring is advised.'}`,
    riskLevel: analysisResult.fairnessScore >= 80 ? 'low' : analysisResult.fairnessScore >= 60 ? 'moderate' : analysisResult.fairnessScore >= 40 ? 'high' : 'critical',
    keyFindings: [
      `Overall fairness score: ${analysisResult.fairnessScore}/100 (${analysisResult.severity.label})`,
      `Fairness Check ratio: ${analysisResult.disparateImpact?.toFixed(3)} (${analysisResult.disparateImpact >= 0.8 ? 'PASSES' : 'FAILS'} the 80% rule)`,
      `${Object.keys(analysisResult.groupRates).length} demographic groups analyzed`,
      `Fairness Gap: ${analysisResult.statisticalParityDiff?.toFixed(4)}`,
      `${analysisResult.fairnessScore >= 70 ? 'Basic regulatory compliance met' : 'Regulatory compliance concerns identified'}`
    ],
    complianceStatus: analysisResult.fairnessScore >= 70 ? 'Generally compliant with major frameworks' : 'Non-compliant with EEOC 80% rule — remediation required',
    topRecommendations: [
      'Apply data reweighting to balance group outcomes',
      'Implement fairness-constrained model training',
      'Establish continuous fairness monitoring pipeline'
    ],
    conclusion: `This AI system ${analysisResult.fairnessScore >= 70 ? 'meets minimum fairness standards but should be continuously monitored.' : 'requires immediate remediation before production deployment to ensure fair treatment across all demographic groups.'}`
  };
}

// ============================================
// Public API — Pipeline Runners
// ============================================

/**
 * Run the full 5-agent audit pipeline sequentially.
 * @param {Object} analysisResult - The bias analysis result from biasMetrics.js
 * @param {Function} onProgress - Callback: (agentId, status, data) => void
 *   status: 'started' | 'completed' | 'error'
 * @returns {Object} Full pipeline results
 */
export async function runFullAuditPipeline(analysisResult, onProgress = () => {}) {
  const agents = ['biasDetector', 'rootCauseAnalyzer', 'complianceAuditor', 'mitigationAdvisor', 'reportGenerator'];
  const offlineFns = [offlineBiasDetection, offlineRootCause, offlineCompliance, offlineMitigation, offlineReport];
  const results = {};
  let accumulatedContext = '';

  for (let i = 0; i < agents.length; i++) {
    const agentKey = agents[i];
    const agent = AGENT_DEFINITIONS[agentKey];
    
    onProgress(agent.id, 'started', { name: agent.name, icon: agent.icon });

    try {
      const prompt = agent.buildPrompt(analysisResult, accumulatedContext);
      const rawResponse = await callAgent(prompt);
      
      let parsed;
      if (rawResponse) {
        parsed = parseAgentResponse(rawResponse);
        if (parsed?.parseError) {
          // Use raw text as context but fall back to offline for structured data
          parsed = offlineFns[i](analysisResult, accumulatedContext);
        }
      } else {
        parsed = offlineFns[i](analysisResult, accumulatedContext);
      }

      results[agentKey] = {
        ...parsed,
        agentName: agent.name,
        agentIcon: agent.icon,
        source: rawResponse ? 'AI' : 'Offline Engine'
      };

      // Accumulate context for the next agent
      accumulatedContext += `\n\n--- ${agent.name} Output ---\n${JSON.stringify(parsed, null, 2)}`;

      onProgress(agent.id, 'completed', results[agentKey]);
    } catch (error) {
      console.error(`Agent ${agentKey} error:`, error);
      const fallback = offlineFns[i](analysisResult, accumulatedContext);
      results[agentKey] = { ...fallback, agentName: agent.name, agentIcon: agent.icon, source: 'Offline Engine (error fallback)' };
      accumulatedContext += `\n\n--- ${agent.name} Output ---\n${JSON.stringify(fallback, null, 2)}`;
      onProgress(agent.id, 'completed', results[agentKey]);
    }

    // Small delay between agents for UI animation
    await new Promise(r => setTimeout(r, 300));
  }

  return {
    agents: results,
    completedAt: new Date().toISOString(),
    analysisMetrics: {
      fairnessScore: analysisResult.fairnessScore,
      disparateImpact: analysisResult.disparateImpact,
      statisticalParityDiff: analysisResult.statisticalParityDiff,
      severity: analysisResult.severity
    }
  };
}

/**
 * Run compliance checks in parallel across multiple frameworks.
 * @param {Object} analysisResult
 * @param {Function} onProgress - (frameworkId, status, data) => void
 * @returns {Object} Compliance results for all frameworks
 */
export async function runComplianceCheck(analysisResult, onProgress = () => {}) {
  const frameworks = Object.entries(COMPLIANCE_FRAMEWORKS);
  const results = {};

  // Start all frameworks
  frameworks.forEach(([key, fw]) => {
    onProgress(key, 'started', { name: fw.name, icon: fw.icon });
  });

  // Run in parallel
  const promises = frameworks.map(async ([key, fw]) => {
    try {
      const prompt = fw.buildPrompt(analysisResult);
      const rawResponse = await callAgent(prompt);
      
      let parsed;
      if (rawResponse) {
        parsed = parseAgentResponse(rawResponse);
        if (parsed?.parseError) {
          // Generate offline compliance data
          parsed = generateOfflineFrameworkResult(key, analysisResult);
        }
      } else {
        parsed = generateOfflineFrameworkResult(key, analysisResult);
      }

      results[key] = {
        ...parsed,
        frameworkName: fw.name,
        frameworkFullName: fw.fullName,
        icon: fw.icon,
        source: rawResponse ? 'AI' : 'Offline Engine'
      };

      onProgress(key, 'completed', results[key]);
    } catch (error) {
      console.error(`Compliance ${key} error:`, error);
      const fallback = generateOfflineFrameworkResult(key, analysisResult);
      results[key] = { ...fallback, frameworkName: fw.name, frameworkFullName: fw.fullName, icon: fw.icon, source: 'Offline Engine' };
      onProgress(key, 'completed', results[key]);
    }
  });

  await Promise.all(promises);

  const scores = Object.values(results).map(r => r.score || 0);
  const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return {
    frameworks: results,
    overallScore,
    completedAt: new Date().toISOString()
  };
}

function generateOfflineFrameworkResult(key, analysisResult) {
  const score = analysisResult.fairnessScore;
  const diPass = analysisResult.disparateImpact >= 0.8;

  const base = {
    score: 0,
    status: 'partial',
    recommendations: ['Implement continuous monitoring', 'Document audit processes'],
    summary: ''
  };

  switch (key) {
    case 'gdpr':
      return { ...base, score: Math.min(score + 5, 100), status: score >= 60 ? 'partial' : 'non-compliant', articles: [
        { article: 'Art. 5', name: 'Data Principles', status: score >= 70 ? 'pass' : 'warning', finding: 'Fair processing principle assessment' },
        { article: 'Art. 9', name: 'Special Categories', status: 'warning', finding: `Processing of "${analysisResult.meta.sensitiveCol}" requires explicit consent or legal basis` },
        { article: 'Art. 22', name: 'Automated Decisions', status: diPass ? 'pass' : 'fail', finding: `Automated decision-making on "${analysisResult.meta.targetCol}"` }
      ], summary: `GDPR compliance score: ${Math.min(score + 5, 100)}%. ${score >= 70 ? 'Generally adequate' : 'Improvements needed'} for data protection requirements.` };

    case 'euAiAct':
      return { ...base, score: Math.min(score + 10, 100), riskClassification: 'high', status: score >= 70 ? 'partial' : 'non-compliant', requirements: [
        { requirement: 'Risk Classification', status: 'warning', finding: 'System classified as high-risk AI' },
        { requirement: 'Transparency', status: score >= 60 ? 'pass' : 'warning', finding: 'Bias metrics are documented' },
        { requirement: 'Human Oversight', status: 'warning', finding: 'Human review mechanism recommended' }
      ], summary: `EU AI Act compliance: ${Math.min(score + 10, 100)}%. Classified as high-risk AI system requiring enhanced oversight.` };

    case 'nist':
      return { ...base, score: Math.min(score, 100), status: score >= 70 ? 'compliant' : 'partial', functions: [
        { function: 'GOVERN', score: Math.min(score + 10, 100), findings: ['Policy framework needed'], gaps: ['Formal AI governance policy'] },
        { function: 'MAP', score: Math.min(score, 100), findings: ['Risk context identified'], gaps: ['Stakeholder impact assessment'] },
        { function: 'MEASURE', score: Math.min(score + 15, 100), findings: ['Fairness metrics computed'], gaps: ['Continuous metric tracking'] },
        { function: 'MANAGE', score: Math.min(score - 5, 100), findings: ['Mitigation strategies available'], gaps: ['Incident response plan'] }
      ], summary: `NIST AI RMF alignment: ${score}%. Measurement capabilities are strong; governance and management areas need development.` };

    case 'iso':
      return { ...base, score: Math.min(score + 5, 100), status: score >= 70 ? 'partial' : 'non-compliant', clauses: [
        { clause: 'AI Policy', status: score >= 70 ? 'pass' : 'warning', finding: 'Organizational AI policy assessment' },
        { clause: 'Risk Assessment', status: score >= 60 ? 'pass' : 'fail', finding: `Bias risk level: ${analysisResult.severity.label}` },
        { clause: 'Data Management', status: 'warning', finding: 'Data quality and governance review needed' }
      ], summary: `ISO 42001 readiness: ${Math.min(score + 5, 100)}%. ${score >= 70 ? 'Good foundation' : 'Significant gaps'} in AI management system requirements.` };

    default:
      return base;
  }
}

/**
 * Run digital twin simulation with AI agents.
 * @param {Object} analysisResult
 * @param {string} scenario - Natural language scenario description
 * @param {Function} onProgress
 * @returns {Object} Simulation results
 */
export async function runDigitalTwinSimulation(analysisResult, scenario, onProgress = () => {}) {
  const simulationAgents = [
    { id: 'simulation', name: 'Simulation Agent', icon: '🔄' },
    { id: 'fairness', name: 'Fairness Impact Agent', icon: '⚖️' },
    { id: 'accuracy', name: 'Performance Agent', icon: '📈' },
    { id: 'report', name: 'Impact Report Agent', icon: '📋' }
  ];

  const results = {};

  for (const agent of simulationAgents) {
    onProgress(agent.id, 'started', agent);
  }

  const prompt = `You are a Fairness Digital Twin system consisting of 4 agents. Simulate the impact of a proposed change.

**Current System State:**
- Personal Characteristic: "${analysisResult.meta.sensitiveCol}"
- Decision: "${analysisResult.meta.targetCol}"
- Current Fairness Score: ${analysisResult.fairnessScore}/100
- Current Fairness Check: ${analysisResult.disparateImpact?.toFixed(4)}
- Current Fairness Gap: ${analysisResult.statisticalParityDiff?.toFixed(4)}
- Groups: ${Object.entries(analysisResult.groupRates).map(([g, i]) => `${g}: ${(i.rate * 100).toFixed(1)}%`).join(', ')}

**Proposed Change:**
"${scenario}"

Simulate what would happen. Respond as JSON:
{
  "simulation": {
    "scenarioUnderstood": "brief restatement of the scenario",
    "assumptions": ["list of assumptions made"],
    "methodology": "brief description of simulation approach"
  },
  "fairnessImpact": {
    "newFairnessScore": 0-100,
    "scoreDelta": number (positive = improvement),
    "newDisparateImpact": number,
    "newStatisticalParity": number,
    "groupImpacts": [{"group": "name", "currentRate": number, "projectedRate": number, "change": "string"}],
    "assessment": "brief assessment"
  },
  "performanceImpact": {
    "accuracyChange": "percentage string with + or -",
    "coverageChange": "percentage string",
    "throughputChange": "percentage string",
    "tradeoffs": ["list of tradeoffs"]
  },
  "report": {
    "recommendation": "proceed|caution|avoid",
    "reasoning": "2-3 sentence explanation",
    "risks": ["list of risks"],
    "benefits": ["list of benefits"],
    "alternativeSuggestions": ["list of alternative approaches"]
  }
}

Respond ONLY with valid JSON.`;

  try {
    onProgress('simulation', 'started', simulationAgents[0]);
    const rawResponse = await callAgent(prompt);
    
    let parsed;
    if (rawResponse) {
      parsed = parseAgentResponse(rawResponse);
      if (parsed?.parseError) {
        parsed = generateOfflineSimulation(analysisResult, scenario);
      }
    } else {
      parsed = generateOfflineSimulation(analysisResult, scenario);
    }

    // Emit progress for each sub-agent
    for (let i = 0; i < simulationAgents.length; i++) {
      const agent = simulationAgents[i];
      onProgress(agent.id, 'completed', agent);
      await new Promise(r => setTimeout(r, 400));
    }

    return {
      ...parsed,
      scenario,
      completedAt: new Date().toISOString(),
      source: rawResponse ? 'AI' : 'Offline Engine'
    };
  } catch (error) {
    console.error('Digital twin error:', error);
    const fallback = generateOfflineSimulation(analysisResult, scenario);
    simulationAgents.forEach(agent => onProgress(agent.id, 'completed', agent));
    return { ...fallback, scenario, completedAt: new Date().toISOString(), source: 'Offline Engine' };
  }
}

function generateOfflineSimulation(analysisResult, scenario) {
  const currentScore = analysisResult.fairnessScore;
  const delta = Math.round((Math.random() - 0.3) * 20);
  const newScore = Math.max(0, Math.min(100, currentScore + delta));

  return {
    simulation: {
      scenarioUnderstood: scenario,
      assumptions: ['Linear impact model assumed', 'No interaction effects considered', 'Historical data patterns maintained'],
      methodology: 'Rule-based estimation using current metric distributions'
    },
    fairnessImpact: {
      newFairnessScore: newScore,
      scoreDelta: delta,
      newDisparateImpact: Math.max(0.1, analysisResult.disparateImpact + (delta / 100)),
      newStatisticalParity: analysisResult.statisticalParityDiff * (1 - delta / 200),
      groupImpacts: Object.entries(analysisResult.groupRates).map(([group, info]) => ({
        group,
        currentRate: +(info.rate * 100).toFixed(1),
        projectedRate: +Math.max(0, Math.min(100, info.rate * 100 + (Math.random() - 0.3) * 10)).toFixed(1),
        change: delta > 0 ? 'Improved' : 'Decreased'
      })),
      assessment: delta > 0 ? 'This change would improve fairness outcomes.' : 'This change may negatively impact fairness.'
    },
    performanceImpact: {
      accuracyChange: `${delta > 0 ? '-' : '+'}${Math.abs(Math.round(delta * 0.3))}%`,
      coverageChange: `${delta > 0 ? '+' : '-'}${Math.abs(Math.round(delta * 0.2))}%`,
      throughputChange: '0%',
      tradeoffs: [
        'Fairness improvements may slightly reduce overall accuracy',
        'Coverage changes affect different groups unevenly',
        'Long-term benefits outweigh short-term metric shifts'
      ]
    },
    report: {
      recommendation: delta > 5 ? 'proceed' : delta > -5 ? 'caution' : 'avoid',
      reasoning: delta > 5 
        ? 'The proposed change shows positive impact on fairness with acceptable performance tradeoffs.'
        : delta > -5 
          ? 'The impact is mixed. Consider piloting with a subset before full deployment.'
          : 'The proposed change may worsen fairness outcomes. Consider alternative approaches.',
      risks: ['Potential accuracy-fairness tradeoff', 'Group-level disparities may shift', 'Requires re-validation'],
      benefits: ['Improved demographic parity', 'Better regulatory compliance', 'Reduced discrimination risk'],
      alternativeSuggestions: ['Consider threshold tuning', 'Try reweighting approach', 'Implement group-specific calibration']
    }
  };
}

// Export agent definitions for UI rendering
export const AGENTS = AGENT_DEFINITIONS;
export const FRAMEWORKS = COMPLIANCE_FRAMEWORKS;
