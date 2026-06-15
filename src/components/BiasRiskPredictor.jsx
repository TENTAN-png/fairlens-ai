import { useState, useMemo } from 'react';
import { Zap, AlertTriangle, CheckCircle, TrendingUp, Loader, Play } from 'lucide-react';
import { generateAIInsights } from '../utils/geminiAPI';

export default function BiasRiskPredictor({ parsedData, analysisResult }) {
  const [aiExplanation, setAiExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  const riskReport = useMemo(() => {
    if (!parsedData?.data?.length || !parsedData?.columns?.length) return null;
    const { data, columns } = parsedData;
    const totalRows = data.length;
    const risks = [];
    let riskScore = 0;

    // 1. Check for sensitive columns
    const sensitiveKeywords = ['gender', 'sex', 'race', 'ethnicity', 'age', 'religion', 'disability', 'marital'];
    const sensitiveFound = columns.filter(c => sensitiveKeywords.some(k => c.toLowerCase().includes(k)));
    if (sensitiveFound.length > 0) {
      riskScore += 15;
      risks.push({ factor: 'Personal characteristics detected', level: 'warning', detail: `Found: ${sensitiveFound.join(', ')}. These columns could lead to unfair treatment.`, score: 15 });
    }

    // 2. Check for group imbalance
    const categoricalCols = columns.filter(c => {
      const unique = new Set(data.map(r => r[c])).size;
      return unique >= 2 && unique <= 20;
    });
    for (const col of categoricalCols.slice(0, 5)) {
      const groups = {};
      data.forEach(r => { const v = String(r[col] ?? ''); groups[v] = (groups[v] || 0) + 1; });
      const counts = Object.values(groups);
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      const ratio = min / max;
      if (ratio < 0.3) {
        riskScore += 10;
        risks.push({ factor: `Imbalanced groups in "${col}"`, level: 'danger', detail: `Smallest group is only ${(ratio * 100).toFixed(0)}% the size of the largest. Severely imbalanced.`, score: 10 });
      } else if (ratio < 0.6) {
        riskScore += 5;
        risks.push({ factor: `Moderate imbalance in "${col}"`, level: 'warning', detail: `Group sizes vary significantly. Ratio: ${(ratio * 100).toFixed(0)}%.`, score: 5 });
      }
    }

    // 3. Missing data risk
    const totalCells = totalRows * columns.length;
    const missingCells = data.reduce((s, r) => s + columns.filter(c => r[c] === null || r[c] === undefined || r[c] === '' || r[c] === 'NA').length, 0);
    const missingPct = (missingCells / totalCells) * 100;
    if (missingPct > 10) {
      riskScore += 15;
      risks.push({ factor: 'High missing data rate', level: 'danger', detail: `${missingPct.toFixed(1)}% of data is missing. This could introduce systematic bias.`, score: 15 });
    } else if (missingPct > 3) {
      riskScore += 5;
      risks.push({ factor: 'Moderate missing data', level: 'warning', detail: `${missingPct.toFixed(1)}% missing. Check if missing data is concentrated in specific groups.`, score: 5 });
    }

    // 4. Small dataset risk
    if (totalRows < 100) {
      riskScore += 15;
      risks.push({ factor: 'Very small dataset', level: 'danger', detail: `Only ${totalRows} records. Statistical conclusions may be unreliable.`, score: 15 });
    } else if (totalRows < 500) {
      riskScore += 5;
      risks.push({ factor: 'Small dataset', level: 'warning', detail: `${totalRows} records. Consider collecting more data for robust analysis.`, score: 5 });
    }

    // 5. If we have an analysis result, check actual metrics
    if (analysisResult) {
      if (analysisResult.disparateImpact < 0.8 || analysisResult.disparateImpact > 1.25) {
        riskScore += 20;
        risks.push({ factor: 'Fairness Check failed', level: 'danger', detail: `Fairness ratio is ${analysisResult.disparateImpact?.toFixed(3)}, outside the fair range (0.8-1.25).`, score: 20 });
      }
      if (Math.abs(analysisResult.statisticalParityDiff) > 0.1) {
        riskScore += 10;
        risks.push({ factor: 'Significant Fairness Gap', level: 'danger', detail: `Gap of ${analysisResult.statisticalParityDiff?.toFixed(4)} exceeds the ±0.1 threshold.`, score: 10 });
      }
    }

    riskScore = Math.min(riskScore, 100);
    const riskLevel = riskScore <= 20 ? 'Low' : riskScore <= 50 ? 'Medium' : 'High';
    const riskColor = riskScore <= 20 ? 'var(--green)' : riskScore <= 50 ? 'var(--yellow)' : 'var(--red)';

    return { risks, riskScore, riskLevel, riskColor, sensitiveFound, totalRows };
  }, [parsedData, analysisResult]);

  const getAIExplanation = async () => {
    if (!riskReport) return;
    setLoading(true);
    try {
      const prompt = `You are a fairness risk advisor. Based on these dataset risk factors, provide a plain-English explanation of the risks and what the user should do. Be concise (3-4 bullet points).

Risk Level: ${riskReport.riskLevel} (${riskReport.riskScore}/100)
Risk Factors:
${riskReport.risks.map(r => `- ${r.factor}: ${r.detail}`).join('\n')}

Dataset has ${riskReport.totalRows} rows.
${riskReport.sensitiveFound.length > 0 ? `Personal characteristics found: ${riskReport.sensitiveFound.join(', ')}` : 'No obvious personal characteristics.'}

Provide simple, actionable advice. No technical jargon.`;
      const result = await generateAIInsights(prompt);
      setAiExplanation(result || 'Unable to generate AI explanation. Review the risk factors above for guidance.');
    } catch {
      setAiExplanation('AI explanation unavailable. Review the risk factors listed above.');
    }
    setLoading(false);
  };

  if (!riskReport) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon"><Zap size={28} /></div>
          <h3>No Dataset Loaded</h3>
          <p>Upload a dataset first to predict fairness risks.</p>
        </div>
      </div>
    );
  }

  const r = riskReport;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Bias Risk Predictor</h2>
        <p>Predict fairness risks before running a detailed analysis</p>
      </div>

      {/* Risk Level Card */}
      <div className={`scorecard ${r.riskLevel === 'Low' ? 'good' : r.riskLevel === 'Medium' ? 'warning' : 'danger'}`} style={{ marginBottom: 24 }}>
        <div className="scorecard-score" style={{ background: r.riskLevel === 'Low' ? 'var(--green-bg)' : r.riskLevel === 'Medium' ? 'var(--yellow-bg)' : 'var(--red-bg)', border: `2px solid ${r.riskColor}` }}>
          <span className="score-value" style={{ color: r.riskColor, fontSize: '1.25rem' }}>{r.riskLevel}</span>
        </div>
        <div className="scorecard-info">
          <h3>Predicted Risk: {r.riskLevel}</h3>
          <p>Risk Score: {r.riskScore}/100 — {r.risks.length} risk factor{r.risks.length !== 1 ? 's' : ''} identified</p>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title"><AlertTriangle size={16} /> Risk Factors</span>
        </div>
        {r.risks.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <CheckCircle size={24} style={{ color: 'var(--green)', marginBottom: 8 }} />
            <p className="text-sm text-secondary">No significant risk factors detected. Your dataset appears well-structured.</p>
          </div>
        ) : (
          r.risks.map((risk, i) => (
            <div key={i} className="risk-factor-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                {risk.level === 'danger'
                  ? <AlertTriangle size={16} style={{ color: 'var(--red)' }} />
                  : <AlertTriangle size={16} style={{ color: 'var(--yellow)' }} />}
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{risk.factor}</span>
                <span className={`badge badge-${risk.level === 'danger' ? 'danger' : 'warning'}`} style={{ marginLeft: 'auto' }}>
                  +{risk.score} risk
                </span>
              </div>
              <div style={{ paddingLeft: 26 }}>
                <p className="text-sm text-secondary" style={{ margin: 0 }}>{risk.detail}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Explanation */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><TrendingUp size={16} /> AI Risk Explanation</span>
          <button className="btn btn-primary btn-sm" onClick={getAIExplanation} disabled={loading}>
            {loading ? <Loader size={14} className="spin-icon" /> : <Play size={14} />}
            {loading ? 'Analyzing...' : 'Get AI Explanation'}
          </button>
        </div>
        {aiExplanation ? (
          <div className="ai-insights-content" style={{ whiteSpace: 'pre-wrap' }}>{aiExplanation}</div>
        ) : (
          <p className="text-sm text-secondary" style={{ padding: '16px 0' }}>
            Click "Get AI Explanation" for a plain-English summary of your risk factors and recommended actions.
          </p>
        )}
      </div>
    </div>
  );
}
