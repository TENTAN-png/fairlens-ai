import { useState } from 'react';
import { Wand2, TrendingUp, CheckCircle, Loader, ArrowRight, Sparkles, RefreshCw, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { generateAIInsights } from '../utils/geminiAPI';

const TECHNIQUES = [
  {
    id: 'reweigh',
    label: 'Data Reweighting',
    description: 'Assign different importance weights to records so all groups are treated equally.',
    improvementRange: [8, 18],
    bestFor: 'Sampling bias, class imbalance',
    effort: 'Low',
    color: 'var(--blue)',
  },
  {
    id: 'smote',
    label: 'Balanced Data Generation',
    description: 'Create new synthetic records for underrepresented groups to balance the dataset.',
    improvementRange: [12, 22],
    bestFor: 'Minority group underrepresentation',
    effort: 'Low',
    color: 'var(--green)',
  },
  {
    id: 'threshold',
    label: 'Decision Threshold Tuning',
    description: 'Adjust the decision cut-off point separately for each group to equalize outcomes.',
    improvementRange: [6, 14],
    bestFor: 'Prediction fairness gaps',
    effort: 'Medium',
    color: 'var(--purple)',
  },
  {
    id: 'fairlearn',
    label: 'Fairness Constraints (Fairlearn)',
    description: 'Apply mathematical fairness rules during model training to enforce equal opportunity.',
    improvementRange: [15, 28],
    bestFor: 'Persistent structural bias',
    effort: 'High',
    color: 'var(--amber)',
  },
  {
    id: 'calibration',
    label: 'Prediction Calibration',
    description: 'Post-process model outputs to ensure confidence scores are equally reliable across groups.',
    improvementRange: [5, 12],
    bestFor: 'Reliability differences between groups',
    effort: 'Low',
    color: 'var(--cyan)',
  },
];

function effortColor(effort) {
  return effort === 'Low' ? 'var(--green)' : effort === 'Medium' ? 'var(--amber)' : 'var(--red)';
}

export default function AutoImprovementEngine({ analysisResult }) {
  const [selected, setSelected] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const baseFairness = analysisResult?.fairnessScore ?? 54;

  const toggleTechnique = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    setResults(null);
    setAiPlan('');
  };

  const handleApply = () => {
    if (selected.length === 0) return;
    setLoading(true);
    setTimeout(() => {
      const techniques = TECHNIQUES.filter(t => selected.includes(t.id));
      // Simulate combined improvement (diminishing returns)
      let totalImprovement = 0;
      techniques.forEach((t, i) => {
        const [min, max] = t.improvementRange;
        const gain = min + Math.random() * (max - min);
        totalImprovement += gain * Math.pow(0.75, i); // diminishing returns
      });
      totalImprovement = Math.round(Math.min(totalImprovement, 100 - baseFairness));
      const improvedScore = Math.min(100, baseFairness + totalImprovement);
      const dims = [
        { name: 'Fairness', before: baseFairness, after: improvedScore },
        { name: 'Equity', before: Math.round(baseFairness * 0.9), after: Math.round(improvedScore * 0.93) },
        { name: 'Balance', before: Math.round(baseFairness * 0.85), after: Math.round(improvedScore * 0.9) },
        { name: 'Compliance', before: Math.round(baseFairness * 0.95), after: Math.round(improvedScore * 0.96) },
      ];
      setResults({ improvedScore, totalImprovement, dims, techniques });
      setLoading(false);
    }, 2000);
  };

  const handleGetAIPlan = async () => {
    setAiLoading(true);
    try {
      const names = TECHNIQUES.filter(t => selected.includes(t.id)).map(t => t.label).join(', ');
      const prompt = `You are a fairness engineering expert. A team wants to improve their AI system's fairness score from ${baseFairness}/100 using these techniques: ${names}.

Write a brief, plain-language implementation plan (4-5 steps) for a non-technical manager. Focus on what each step means in practice, not technical details. Keep it under 200 words.`;
      const res = await generateAIInsights(prompt);
      setAiPlan(res);
    } catch {
      setAiPlan('Unable to generate plan. Please check your API key in Settings.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Automated Improvement Engine</h2>
        <p>Select fairness improvement techniques and instantly see projected impact on your AI system</p>
      </div>

      {/* Current Score */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center', minWidth: 100 }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: baseFairness >= 70 ? 'var(--green)' : baseFairness >= 50 ? 'var(--yellow)' : 'var(--red)', lineHeight: 1 }}>{baseFairness}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 4 }}>Current Fairness Score</div>
        </div>
        <ArrowRight size={24} color="var(--gray-400)" />
        <div style={{ textAlign: 'center', minWidth: 100 }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: results ? 'var(--green)' : 'var(--gray-300)', lineHeight: 1 }}>
            {results ? results.improvedScore : '?'}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 4 }}>Projected Improved Score</div>
        </div>
        {results && (
          <>
            <div style={{ textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--green)', lineHeight: 1 }}>+{results.totalImprovement}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 4 }}>Points Gained</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>
                +{((results.totalImprovement / Math.max(1, baseFairness)) * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 4 }}>Improvement %</div>
            </div>
          </>
        )}
      </div>

      {/* Technique Selection */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title"><Wand2 size={16} /> Choose Improvement Techniques</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{selected.length} selected</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TECHNIQUES.map(t => {
            const isSelected = selected.includes(t.id);
            return (
              <div
                key={t.id}
                onClick={() => toggleTechnique(t.id)}
                style={{
                  padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${isSelected ? t.color : 'var(--gray-200)'}`,
                  background: isSelected ? 'var(--blue-bg)' : 'var(--white)',
                  transition: 'all 0.2s', display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 6,
                  border: `2px solid ${isSelected ? t.color : 'var(--gray-300)'}`,
                  background: isSelected ? t.color : 'transparent', flexShrink: 0, marginTop: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSelected && <CheckCircle size={12} color="white" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: isSelected ? 'var(--blue-dark)' : 'var(--gray-800)' }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginTop: 3, lineHeight: 1.5 }}>{t.description}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 4 }}>Best for: {t.bestFor}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                    background: `${t.color}20`, color: t.color,
                  }}>+{t.improvementRange[0]}–{t.improvementRange[1]} pts</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: effortColor(t.effort) }}>{t.effort} effort</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={handleApply} disabled={selected.length === 0 || loading}>
            {loading ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Applying...</> : <><TrendingUp size={14} /> Apply & Project Results</>}
          </button>
          <button className="btn btn-secondary" onClick={() => { setSelected([]); setResults(null); setAiPlan(''); }}>
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title"><BarChart3 size={16} /> Projected Improvement by Dimension</span>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={results.dims}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--gray-400)" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="var(--gray-400)" />
                  <Tooltip />
                  <Bar dataKey="before" name="Current" fill="var(--red)" radius={[4, 4, 0, 0]} opacity={0.6} />
                  <Bar dataKey="after" name="Projected" fill="var(--green)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--red)', opacity: 0.6 }} /> Current Score
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--green)' }} /> After Improvement
              </div>
            </div>
          </div>

          {/* Applied Techniques Summary */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title"><CheckCircle size={16} /> Applied Techniques</span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {results.techniques.map(t => (
                <div key={t.id} style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: 'var(--green-bg)', border: '1px solid #86efac',
                  fontSize: '0.875rem', fontWeight: 500, color: 'var(--green)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <CheckCircle size={14} /> {t.label}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* AI Implementation Plan */}
      {selected.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Sparkles size={16} /> AI-Powered Implementation Plan</span>
            <button className="btn btn-primary" onClick={handleGetAIPlan} disabled={aiLoading} style={{ fontSize: '0.8125rem' }}>
              {aiLoading ? 'Generating...' : 'Generate Plan'}
            </button>
          </div>
          {aiPlan ? (
            <div style={{ padding: '12px 0', fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--gray-700)' }}>
              {aiPlan}
            </div>
          ) : (
            <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--gray-400)' }}>
              <Sparkles size={24} style={{ display: 'block', margin: '0 auto 10px' }} />
              <p style={{ fontSize: '0.875rem' }}>Click "Generate Plan" to get a step-by-step implementation guide for your selected techniques</p>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
