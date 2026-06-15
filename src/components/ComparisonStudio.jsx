import { useState } from 'react';
import {
  GitCompare, ArrowRight, TrendingUp, TrendingDown,
  Upload, CheckCircle, Info, BarChart3, Sparkles
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { generateAIInsights } from '../utils/geminiAPI';

const DEMO_BEFORE = {
  label: 'Before Improvement',
  fairness: 54,
  transparency: 61,
  privacy: 70,
  explainability: 48,
  accountability: 57,
  compliance: 62,
  gapScore: 24,
  riskLevel: 'High',
};

const DEMO_AFTER = {
  label: 'After Improvement',
  fairness: 82,
  transparency: 86,
  privacy: 88,
  explainability: 79,
  accountability: 83,
  compliance: 87,
  gapScore: 8,
  riskLevel: 'Low',
};

function DeltaBadge({ before, after }) {
  const delta = after - before;
  if (delta === 0) return <span style={{ color: 'var(--gray-500)' }}>—</span>;
  return (
    <span style={{ color: delta > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 4 }}>
      {delta > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {delta > 0 ? '+' : ''}{delta}
    </span>
  );
}

const DIMS = [
  { key: 'fairness', label: 'Fairness Score' },
  { key: 'transparency', label: 'Transparency' },
  { key: 'privacy', label: 'Privacy' },
  { key: 'explainability', label: 'Explainability' },
  { key: 'accountability', label: 'Accountability' },
  { key: 'compliance', label: 'Compliance' },
];

export default function ComparisonStudio({ analysisResult }) {
  const [mode, setMode] = useState('demo'); // 'demo' | 'manual'
  const [before, setBefore] = useState(DEMO_BEFORE);
  const [after, setAfter] = useState(DEMO_AFTER);
  const [aiSummary, setAiSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const radarData = DIMS.map(d => ({
    subject: d.label,
    Before: before[d.key],
    After: after[d.key],
  }));

  const barData = DIMS.map(d => ({
    name: d.label.split(' ')[0],
    Before: before[d.key],
    After: after[d.key],
    Improvement: after[d.key] - before[d.key],
  }));

  const overallBefore = Math.round(DIMS.reduce((s, d) => s + (before[d.key] || 0), 0) / DIMS.length);
  const overallAfter = Math.round(DIMS.reduce((s, d) => s + (after[d.key] || 0), 0) / DIMS.length);
  const overallImprovement = overallAfter - overallBefore;
  const improvementPct = ((overallImprovement / Math.max(1, overallBefore)) * 100).toFixed(1);

  const handleGetAISummary = async () => {
    setLoading(true);
    try {
      const prompt = `You are an AI governance expert. Compare these two AI fairness assessments and provide a brief, human-friendly improvement summary:

BEFORE: Fairness ${before.fairness}, Transparency ${before.transparency}, Privacy ${before.privacy}, Explainability ${before.explainability}, Accountability ${before.accountability}, Compliance ${before.compliance}
AFTER:  Fairness ${after.fairness}, Transparency ${after.transparency}, Privacy ${after.privacy}, Explainability ${after.explainability}, Accountability ${after.accountability}, Compliance ${after.compliance}

Provide a 3-4 sentence executive summary noting what improved most, what still needs attention, and the overall governance improvement. Use plain, non-technical language.`;
      const result = await generateAIInsights(prompt);
      setAiSummary(result);
    } catch {
      setAiSummary('Unable to generate summary. Please check your API key in Settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualInput = (phase, key, value) => {
    const v = Math.min(100, Math.max(0, parseInt(value) || 0));
    if (phase === 'before') setBefore(prev => ({ ...prev, [key]: v }));
    else setAfter(prev => ({ ...prev, [key]: v }));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Fairness Comparison Studio</h2>
        <p>Compare AI fairness performance before and after improvements to measure real progress</p>
      </div>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          className={`btn ${mode === 'demo' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setMode('demo'); setBefore(DEMO_BEFORE); setAfter(DEMO_AFTER); setAiSummary(''); }}
        >
          <BarChart3 size={14} /> Demo Example
        </button>
        <button
          className={`btn ${mode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setMode('manual'); setAiSummary(''); }}
        >
          <Upload size={14} /> Enter My Scores
        </button>
      </div>

      {/* Manual Input Mode */}
      {mode === 'manual' && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title"><Upload size={16} /> Enter Your Scores (0–100)</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--gray-600)' }}>Dimension</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--red)' }}>Before</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--green)' }}>After</th>
                </tr>
              </thead>
              <tbody>
                {DIMS.map(d => (
                  <tr key={d.key} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>{d.label}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input type="number" min="0" max="100"
                        value={before[d.key]}
                        onChange={e => handleManualInput('before', d.key, e.target.value)}
                        style={{
                          width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--gray-300)',
                          textAlign: 'center', fontWeight: 600, color: 'var(--red)'
                        }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input type="number" min="0" max="100"
                        value={after[d.key]}
                        onChange={e => handleManualInput('after', d.key, e.target.value)}
                        style={{
                          width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--gray-300)',
                          textAlign: 'center', fontWeight: 600, color: 'var(--green)'
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Banner */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16, marginBottom: 20
      }}>
        <div className="card" style={{ textAlign: 'center', borderTop: '3px solid var(--red)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6, textTransform: 'uppercase' }}>Before</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--red)', lineHeight: 1 }}>{overallBefore}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 4 }}>Average Score</div>
          <div style={{
            display: 'inline-block', marginTop: 8, padding: '2px 10px', borderRadius: 20,
            background: 'var(--red-bg)', color: 'var(--red)', fontSize: '0.75rem', fontWeight: 600
          }}>{before.riskLevel} Risk</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <ArrowRight size={28} color="var(--blue)" />
            <div style={{ marginTop: 8, fontSize: '1.5rem', fontWeight: 700, color: overallImprovement > 0 ? 'var(--green)' : 'var(--red)' }}>
              {overallImprovement > 0 ? '+' : ''}{overallImprovement} pts
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
              {overallImprovement > 0 ? '+' : ''}{improvementPct}% improvement
            </div>
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center', borderTop: '3px solid var(--green)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6, textTransform: 'uppercase' }}>After</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--green)', lineHeight: 1 }}>{overallAfter}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 4 }}>Average Score</div>
          <div style={{
            display: 'inline-block', marginTop: 8, padding: '2px 10px', borderRadius: 20,
            background: 'var(--green-bg)', color: 'var(--green)', fontSize: '0.75rem', fontWeight: 600
          }}>{after.riskLevel} Risk</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Radar */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><GitCompare size={16} /> Multi-Dimension Comparison</span>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="var(--gray-300)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--gray-600)', fontWeight: 600 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} />
                <Radar name="Before" dataKey="Before" stroke="var(--red)" fill="var(--red)" fillOpacity={0.2} strokeWidth={2} dot={{ r: 4, fill: 'var(--white)', stroke: 'var(--red)', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'var(--red)', stroke: 'var(--white)' }} />
                <Radar name="After" dataKey="After" stroke="var(--green)" fill="var(--green)" fillOpacity={0.35} strokeWidth={2} dot={{ r: 4, fill: 'var(--white)', stroke: 'var(--green)', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'var(--green)', stroke: 'var(--white)' }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Tooltip wrapperStyle={{ outline: 'none' }} contentStyle={{ borderRadius: 8, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-2)', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(4px)' }} itemStyle={{ fontSize: 13, fontWeight: 600 }} labelStyle={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><BarChart3 size={16} /> Score by Dimension</span>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--gray-400)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--gray-400)" />
                <Tooltip />
                <Legend />
                <Bar dataKey="Before" fill="var(--red)" radius={[4, 4, 0, 0]} opacity={0.7} />
                <Bar dataKey="After" fill="var(--green)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Score Table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title"><CheckCircle size={16} /> Detailed Comparison</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--gray-200)', background: 'var(--gray-100)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Dimension</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--red)' }}>Before</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--green)' }}>After</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Change</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Progress</th>
              </tr>
            </thead>
            <tbody>
              {DIMS.map(d => {
                const bVal = before[d.key];
                const aVal = after[d.key];
                const delta = aVal - bVal;
                return (
                  <tr key={d.key} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{d.label}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--red)' }}>{bVal}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--green)' }}>{aVal}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <DeltaBadge before={bVal} after={aVal} />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--gray-200)', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${bVal}%`, background: '#fca5a5', transition: 'width 0.6s ease' }} />
                          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${aVal}%`, background: delta >= 0 ? 'var(--green)' : 'var(--red)', opacity: 0.8, transition: 'width 0.6s ease' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)', minWidth: 28 }}>{aVal}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Summary */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Sparkles size={16} /> AI Improvement Summary</span>
          <button className="btn btn-primary" onClick={handleGetAISummary} disabled={loading} style={{ fontSize: '0.8125rem' }}>
            {loading ? 'Analyzing...' : 'Generate Summary'}
          </button>
        </div>
        {aiSummary ? (
          <div style={{ padding: '14px 0', fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--gray-700)' }}>
            {aiSummary}
          </div>
        ) : (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--gray-400)' }}>
            <Sparkles size={24} style={{ display: 'block', margin: '0 auto 10px' }} />
            <p style={{ fontSize: '0.875rem' }}>Click "Generate Summary" to get an AI-powered analysis of the improvements</p>
          </div>
        )}
      </div>
    </div>
  );
}
