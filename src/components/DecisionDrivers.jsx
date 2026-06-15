import { useMemo, useState } from 'react';
import { Target, Loader, Play, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { generateAIInsights } from '../utils/geminiAPI';
import { getSHAPExplanation, isBackendAvailable } from '../utils/backendAPI';


export default function DecisionDrivers({ parsedData, analysisResult }) {
  const [aiNarrative, setAiNarrative] = useState('');
  const [loading, setLoading] = useState(false);
  const [shapDrivers, setShapDrivers] = useState(null);  // real SHAP when backend online
  const [shapLoading, setShapLoading] = useState(false);
  const [shapSource, setShapSource] = useState('statistical'); // 'shap' | 'statistical'

  const drivers = useMemo(() => {
    if (!parsedData?.data?.length || !analysisResult) return null;
    const { data, columns } = parsedData;
    const target = analysisResult.meta.targetCol;
    const sensitive = analysisResult.meta.sensitiveCol;
    const favorable = analysisResult.meta.favorableValue;
    const featureCols = columns.filter(c => c !== target && c !== sensitive);

    // Compute point-biserial correlation approximation for each feature
    const results = featureCols.map(col => {
      const isNumeric = data.some(r => !isNaN(r[col]) && r[col] !== '' && r[col] !== null);
      let importance = 0;
      let direction = 'neutral';

      if (isNumeric) {
        const favorable_vals = data.filter(r => String(r[target]) === String(favorable)).map(r => parseFloat(r[col])).filter(v => !isNaN(v));
        const unfavorable_vals = data.filter(r => String(r[target]) !== String(favorable)).map(r => parseFloat(r[col])).filter(v => !isNaN(v));
        if (favorable_vals.length > 0 && unfavorable_vals.length > 0) {
          const mean_f = favorable_vals.reduce((a, b) => a + b, 0) / favorable_vals.length;
          const mean_u = unfavorable_vals.reduce((a, b) => a + b, 0) / unfavorable_vals.length;
          const allVals = [...favorable_vals, ...unfavorable_vals];
          const mean_all = allVals.reduce((a, b) => a + b, 0) / allVals.length;
          const std = Math.sqrt(allVals.reduce((s, v) => s + (v - mean_all) ** 2, 0) / allVals.length) || 1;
          importance = Math.min(Math.abs(mean_f - mean_u) / std, 1);
          direction = mean_f > mean_u ? 'positive' : 'negative';
        }
      } else {
        // Categorical: compute Cramér's V approximation
        const groups = {};
        data.forEach(r => {
          const key = `${r[col]}_${String(r[target]) === String(favorable) ? '1' : '0'}`;
          groups[key] = (groups[key] || 0) + 1;
        });
        const uniqueVals = new Set(data.map(r => r[col]));
        const totalOutcomes = data.filter(r => String(r[target]) === String(favorable)).length;
        let chiSq = 0;
        uniqueVals.forEach(val => {
          const obs1 = groups[`${val}_1`] || 0;
          const obs0 = groups[`${val}_0`] || 0;
          const total = obs1 + obs0;
          if (total > 0) {
            const exp1 = total * (totalOutcomes / data.length);
            const exp0 = total - exp1;
            if (exp1 > 0) chiSq += ((obs1 - exp1) ** 2) / exp1;
            if (exp0 > 0) chiSq += ((obs0 - exp0) ** 2) / exp0;
          }
        });
        importance = Math.min(Math.sqrt(chiSq / (data.length * (Math.min(uniqueVals.size, 2) - 1 || 1))), 1);
        direction = 'categorical';
      }

      return { column: col, importance: +(importance * 100).toFixed(1), direction, isNumeric };
    }).sort((a, b) => b.importance - a.importance);

    return results;
  }, [parsedData, analysisResult]);

  const fetchSHAP = async () => {
    if (!parsedData?.file || !analysisResult) return;
    setShapLoading(true);
    try {
      const result = await getSHAPExplanation(
        parsedData.file,
        analysisResult.meta.targetCol,
        analysisResult.meta.sensitiveCol
      );
      // Map SHAP format to same shape as local drivers
      const mapped = (result.featureImportances || []).map(f => ({
        column:     f.feature,
        importance: f.importance,
        direction:  f.direction || 'neutral',
        isNumeric:  true,
        shapValue:  f.shapValue,
        description: f.description,
      }));
      setShapDrivers(mapped);
      setShapSource('shap');
    } catch (e) {
      console.warn('SHAP fetch failed:', e.message);
    } finally {
      setShapLoading(false);
    }
  };

  const getAINarrative = async () => {
    if (!drivers) return;
    setLoading(true);
    try {
      const activeDrivers = shapDrivers || drivers;
      const top5 = activeDrivers.slice(0, 5);
      const prompt = `You are explaining to a business user which factors most influence "${analysisResult.meta.targetCol}" decisions.

Top factors (by influence strength):
${top5.map((d, i) => `${i + 1}. "${d.column}" — Influence: ${d.importance}%, Direction: ${d.direction}`).join('\n')}

The personal characteristic being checked is "${analysisResult.meta.sensitiveCol}".

Write a simple 4-5 sentence explanation. Use phrases like "appears to influence", "may be contributing to", "drives decisions more than expected". No technical terms like SHAP, correlation, or chi-squared.`;
      const result = await generateAIInsights(prompt);
      setAiNarrative(result || 'Unable to generate narrative.');
    } catch { setAiNarrative('AI narrative unavailable.'); }
    setLoading(false);
  };

  if (!drivers) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon"><Target size={28} /></div>
          <h3>No Analysis Available</h3>
          <p>Run a fairness analysis first to see what drives decisions.</p>
        </div>
      </div>
    );
  }

  const displayDrivers = (shapDrivers || drivers || []).slice(0, 10);
  const colors = ['#1a73e8', '#1557b0', '#4285f4', '#12b5cb', '#9334e6', '#1e8e3e', '#f9ab00', '#ff9100', '#d93025', '#80868b'];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Key Decision Drivers</h2>
        <p>Understand which factors most influence "{analysisResult.meta.targetCol}" decisions</p>
      </div>

      {/* Source Badge + SHAP Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{
          padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
          background: shapSource === 'shap' ? 'var(--green-bg)' : 'var(--blue-bg)',
          color: shapSource === 'shap' ? 'var(--green)' : 'var(--blue)',
          border: `1px solid ${shapSource === 'shap' ? '#86efac' : 'var(--blue)'}`,
        }}>
          {shapSource === 'shap' ? '✅ Powered by SHAP (Python)' : '📊 Statistical Analysis'}
        </span>
        {isBackendAvailable() && (
          <button className="btn btn-primary" onClick={fetchSHAP} disabled={shapLoading} style={{ fontSize: '0.8125rem' }}>
            {shapLoading ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Running SHAP...</> : <><Zap size={13} /> Run SHAP Analysis</>}
          </button>
        )}
      </div>

      {/* Bar Chart */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title"><Target size={16} /> Top Factors Affecting Decisions</span>
        </div>
        <div style={{ height: Math.max(250, displayDrivers.length * 36) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayDrivers} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--gray-400)" />
              <YAxis dataKey="column" type="category" width={140} tick={{ fontSize: 11 }} stroke="var(--gray-400)" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="importance" radius={[0, 4, 4, 0]} name="Influence Strength">
                {displayDrivers.map((d, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Factor Cards */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Decision Impact Details</span>
        </div>
        {displayDrivers.map((d, i) => (
          <div key={i} className="agent-cause-card">
            <div className="agent-cause-header">
              <span className="agent-cause-name">{d.column}</span>
              <span className="agent-cause-pct">{d.importance}%</span>
            </div>
            <p className="agent-cause-desc">
              {d.importance > 60 ? 'Very strong influence on decisions.' : d.importance > 30 ? 'Moderate influence on decisions.' : 'Mild influence on decisions.'}
              {' '}{d.direction === 'positive' ? 'Higher values tend toward positive outcomes.' : d.direction === 'negative' ? 'Higher values tend toward negative outcomes.' : 'Relationship varies across categories.'}
            </p>
            <div className="agent-cause-bar">
              <div className="agent-cause-bar-fill" style={{ width: `${d.importance}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* AI Narrative */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">AI Explanation</span>
          <button className="btn btn-primary btn-sm" onClick={getAINarrative} disabled={loading}>
            {loading ? <Loader size={14} className="spin-icon" /> : <Play size={14} />}
            {loading ? 'Generating...' : 'Explain in Plain English'}
          </button>
        </div>
        {aiNarrative ? (
          <div className="ai-insights-content" style={{ whiteSpace: 'pre-wrap' }}>{aiNarrative}</div>
        ) : (
          <p className="text-sm text-secondary" style={{ padding: '16px 0' }}>Click to get a plain-English explanation of what's driving decisions.</p>
        )}
      </div>
    </div>
  );
}
