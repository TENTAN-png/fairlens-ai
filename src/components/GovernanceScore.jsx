import { useState, useMemo } from 'react';
import { ShieldCheck, Info, CheckSquare, Square, RefreshCw, BarChart, FileText } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { generateAIInsights } from '../utils/geminiAPI';

const INITIAL_PILLARS = {
  Fairness: [
    { label: 'Algorithmic bias audit conducted on latest data', checked: true },
    { label: 'Disparate impact ratio exceeds 80% regulatory rule', checked: false },
    { label: 'Multi-group representation balance verified', checked: true },
    { label: 'Oversampling or synthetic data used to reduce imbalance', checked: false }
  ],
  Transparency: [
    { label: 'Model card created and model parameters documented', checked: true },
    { label: 'Dataset source origin and consumer consent verified', checked: true },
    { label: 'Audit history trail logged to immutable storage', checked: false },
    { label: 'System architecture map available for stakeholders', checked: false }
  ],
  Explainability: [
    { label: 'Feature importance rankings (drivers) generated', checked: true },
    { label: 'Decisions translated into plain-English narratives', checked: false },
    { label: 'Counterfactual decision testing completed', checked: false }
  ],
  Privacy: [
    { label: 'GDPR / compliance safety checks completed', checked: false },
    { label: 'Explicit sensitive columns marked and sanitized', checked: true },
    { label: 'Access logs encrypted and restricted to admins', checked: true }
  ],
  Accountability: [
    { label: 'Human-in-the-loop fallback gate configured', checked: false },
    { label: 'Real-time alert policies defined and active', checked: true },
    { label: 'Continuous monitoring pipeline set up', checked: false }
  ]
};

export default function GovernanceScore() {
  const [pillars, setPillars] = useState(INITIAL_PILLARS);
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');

  const toggleCheck = (pillarName, index) => {
    const list = [...pillars[pillarName]];
    list[index].checked = !list[index].checked;
    setPillars(prev => ({
      ...prev,
      [pillarName]: list
    }));
  };

  const scores = useMemo(() => {
    const entries = Object.entries(pillars);
    const scoresObj = {};
    let totalScore = 0;
    entries.forEach(([name, items]) => {
      const checkedCount = items.filter(i => i.checked).length;
      const score = Math.round((checkedCount / items.length) * 100);
      scoresObj[name] = score;
      totalScore += score;
    });
    scoresObj.overall = Math.round(totalScore / entries.length);
    return scoresObj;
  }, [pillars]);

  const chartData = useMemo(() => {
    return [
      { subject: 'Fairness', value: scores.Fairness, fullMark: 100 },
      { subject: 'Transparency', value: scores.Transparency, fullMark: 100 },
      { subject: 'Explainability', value: scores.Explainability, fullMark: 100 },
      { subject: 'Privacy', value: scores.Privacy, fullMark: 100 },
      { subject: 'Accountability', value: scores.Accountability, fullMark: 100 }
    ];
  }, [scores]);

  const runAIEvaluation = async () => {
    setLoading(true);
    setAiAnalysis('');

    const checklistSummary = Object.entries(pillars)
      .map(([name, list]) => {
        const met = list.filter(i => i.checked).map(i => i.label);
        const unmet = list.filter(i => !i.checked).map(i => i.label);
        return `${name} Pillar (Score: ${scores[name]}/100):\n- Completed: ${met.join(', ') || 'None'}\n- Deficiencies: ${unmet.join(', ') || 'None'}`;
      })
      .join('\n\n');

    const prompt = `You are an AI Governance and Risk specialist. Analyze this organization's AI alignment scorecard:

${checklistSummary}

Overall Governance Rating: ${scores.overall}/100

Identify:
1. Critical governance vulnerabilities
2. Recommended mitigation actions for each deficient pillar
3. A 2-sentence summary of their current compliance posture.

Format your response as a professional executive brief. Use bullet points and bold headers. Keep it compact.`;

    try {
      const response = await generateAIInsights(prompt);
      setAiAnalysis(response);
    } catch {
      setAiAnalysis('Failed to load AI governance brief. Please check API settings.');
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>AI Governance Scorecard</h2>
        <p>Evaluate and record model trust alignment across the five fundamental pillars of Responsible AI.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
        {/* Radar Chart Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card-header" style={{ width: '100%' }}>
            <span className="card-title"><BarChart size={16} /> Governance Radar Profile</span>
          </div>

          <div style={{ width: '100%', height: 260, display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                const radarColor = scores.overall >= 80 ? 'var(--green)' : scores.overall >= 50 ? 'var(--amber)' : 'var(--red)';
                return (
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                    <PolarGrid stroke="var(--gray-300)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--gray-600)', fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} />
                    <Radar name="Trust Index" dataKey="value" stroke={radarColor} fill={radarColor} fillOpacity={0.35} strokeWidth={2} dot={{ r: 4, fill: 'var(--white)', stroke: radarColor, strokeWidth: 2 }} activeDot={{ r: 6, fill: radarColor, stroke: 'var(--white)' }} />
                    <Tooltip wrapperStyle={{ outline: 'none' }} contentStyle={{ borderRadius: 8, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-2)', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(4px)' }} itemStyle={{ fontSize: 13, fontWeight: 600 }} labelStyle={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }} />
                  </RadarChart>
                );
              })()}
            </ResponsiveContainer>
          </div>

          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <span className="text-xs text-secondary">Trust Alignment Index</span>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: scores.overall >= 80 ? 'var(--green)' : scores.overall >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
              {scores.overall}/100
            </div>
          </div>
        </div>

        {/* AI Brief Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title"><ShieldCheck size={16} /> Executive Governance Brief</span>
            <button className="btn btn-secondary btn-sm" onClick={runAIEvaluation} disabled={loading}>
              {loading ? <RefreshCw size={14} className="spin-icon" /> : <FileText size={14} />}
              {loading ? 'Analyzing...' : 'Generate AI Brief'}
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {aiAnalysis ? (
              <div className="text-sm" style={{ whiteSpace: 'pre-line', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                {aiAnalysis}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', textAlign: 'center', padding: 20 }}>
                <ShieldCheck size={36} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Click "Generate AI Brief" to get a Gemini-powered audit breakdown based on your checklist status.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checklist Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.entries(pillars).map(([pillarName, list]) => {
          const score = scores[pillarName];
          return (
            <div key={pillarName} className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title" style={{ fontSize: '1rem', fontWeight: 600 }}>{pillarName} Pillar</span>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  color: score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--yellow)' : 'var(--red)'
                }}>
                  {score}% Completed
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {list.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleCheck(pillarName, idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 10,
                      borderRadius: 6,
                      background: 'var(--card-active-bg)',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    {item.checked ? (
                      <CheckSquare size={18} style={{ color: 'var(--accent)' }} />
                    ) : (
                      <Square size={18} style={{ color: 'var(--text-tertiary)' }} />
                    )}
                    <span className="text-sm" style={{
                      color: item.checked ? 'var(--text-primary)' : 'var(--text-secondary)',
                      textDecoration: item.checked ? 'none' : 'none'
                    }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
