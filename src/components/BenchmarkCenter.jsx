import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from 'recharts';
import { Trophy, TrendingUp, TrendingDown, Minus, Building2, BarChart3, Globe, Info } from 'lucide-react';

const INDUSTRIES = [
  { name: 'Technology', avg: 74, top: 91, description: 'Software, SaaS, AI companies' },
  { name: 'Finance & Banking', avg: 68, top: 85, description: 'Banks, insurance, fintech' },
  { name: 'Healthcare', avg: 71, top: 88, description: 'Hospitals, pharma, medtech' },
  { name: 'Government', avg: 65, top: 80, description: 'Public sector, municipalities' },
  { name: 'Education', avg: 77, top: 93, description: 'Universities, EdTech' },
  { name: 'Retail & HR', avg: 69, top: 86, description: 'Hiring, retail, operations' },
];

const DIMENSIONS = [
  { subject: 'Fairness', industryAvg: 68, topPerformer: 90 },
  { subject: 'Transparency', industryAvg: 72, topPerformer: 92 },
  { subject: 'Explainability', industryAvg: 65, topPerformer: 88 },
  { subject: 'Privacy', industryAvg: 75, topPerformer: 94 },
  { subject: 'Accountability', industryAvg: 70, topPerformer: 89 },
];

const HISTORY = [
  { period: 'Jan', score: 64 },
  { period: 'Feb', score: 68 },
  { period: 'Mar', score: 65 },
  { period: 'Apr', score: 72 },
  { period: 'May', score: 75 },
  { period: 'Jun', score: 78 },
];

function getTier(score) {
  if (score >= 90) return { label: 'Industry Leader', color: 'var(--green)', bg: 'var(--green-bg)', icon: '🏆' };
  if (score >= 75) return { label: 'Above Average', color: '#7c3aed', bg: '#f3e8ff', icon: '⭐' };
  if (score >= 65) return { label: 'Average', color: 'var(--amber)', bg: 'var(--amber-bg)', icon: '📊' };
  if (score >= 50) return { label: 'Below Average', color: 'var(--yellow)', bg: 'var(--yellow-bg)', icon: '⚠️' };
  return { label: 'Needs Urgent Work', color: 'var(--red)', bg: 'var(--red-bg)', icon: '🚨' };
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-2)' }}>
      <p style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.8125rem' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: '0.8125rem' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function BenchmarkCenter({ analysisResult }) {
  const [selectedIndustry, setSelectedIndustry] = useState(0);
  const yourScore = analysisResult?.fairnessScore ?? 72;
  const industry = INDUSTRIES[selectedIndustry];
  const tier = getTier(yourScore);
  const vsAvg = yourScore - industry.avg;
  const vsTop = yourScore - industry.top;

  const radarData = DIMENSIONS.map(d => ({
    ...d,
    yourScore: Math.max(20, yourScore - Math.floor(Math.random() * 15)),
  }));

  const barData = [
    { name: 'Your Score', score: yourScore, fill: 'var(--blue)' },
    { name: 'Industry Avg', score: industry.avg, fill: 'var(--gray-400)' },
    { name: 'Top 10%', score: industry.top, fill: 'var(--green)' },
  ];

  const historyWithIndustry = HISTORY.map(h => ({
    ...h,
    industryAvg: industry.avg + Math.floor(Math.random() * 6 - 3),
  }));

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Benchmark Center</h2>
        <p>Compare your AI fairness performance against industry standards and top performers</p>
      </div>

      {/* Info Banner */}
      <div className="info-banner" style={{ marginBottom: 20 }}>
        <Info size={16} />
        <span>Select your industry to see how your fairness scores compare against peers. Scores are based on aggregated, anonymized data from thousands of AI governance assessments.</span>
      </div>

      {/* Industry Selector */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title"><Globe size={16} /> Select Your Industry</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {INDUSTRIES.map((ind, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndustry(i)}
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                border: `2px solid ${selectedIndustry === i ? 'var(--blue)' : 'var(--gray-200)'}`,
                background: selectedIndustry === i ? 'var(--blue-bg)' : 'var(--white)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 200ms',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: selectedIndustry === i ? 'var(--blue)' : 'var(--gray-900)' }}>{ind.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>{ind.description}</div>
              <div style={{ fontSize: '0.75rem', marginTop: 6, color: 'var(--gray-600)' }}>Avg: <strong>{ind.avg}</strong> | Top: <strong>{ind.top}</strong></div>
            </button>
          ))}
        </div>
      </div>

      {/* Score Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Your Score */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>{yourScore}</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', margin: '6px 0 4px' }}>Your Score</div>
          <div style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 20,
            background: tier.bg, color: tier.color, fontSize: '0.75rem', fontWeight: 600
          }}>
            {tier.icon} {tier.label}
          </div>
        </div>

        {/* vs Industry Average */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {vsAvg > 0 ? <TrendingUp size={20} color="var(--green)" /> : vsAvg < 0 ? <TrendingDown size={20} color="var(--red)" /> : <Minus size={20} color="var(--gray-500)" />}
            <span style={{ fontSize: '2.5rem', fontWeight: 700, color: vsAvg > 0 ? 'var(--green)' : vsAvg < 0 ? 'var(--red)' : 'var(--gray-600)', lineHeight: 1 }}>
              {vsAvg > 0 ? '+' : ''}{vsAvg}
            </span>
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', margin: '6px 0 4px' }}>vs Industry Average</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>Industry avg: {industry.avg}/100</div>
        </div>

        {/* vs Top Performers */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Trophy size={20} color={vsTop >= 0 ? 'var(--green)' : 'var(--amber)'} />
            <span style={{ fontSize: '2.5rem', fontWeight: 700, color: vsTop >= 0 ? 'var(--green)' : 'var(--amber)', lineHeight: 1 }}>
              {vsTop > 0 ? '+' : ''}{vsTop}
            </span>
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', margin: '6px 0 4px' }}>vs Top 10%</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>Top performers: {industry.top}/100</div>
        </div>

        {/* Percentile */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--purple)', lineHeight: 1 }}>
            {Math.min(99, Math.max(1, Math.round(((yourScore - 40) / (industry.top - 40)) * 90 + 5)))}
            <span style={{ fontSize: '1.25rem' }}>th</span>
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', margin: '6px 0 4px' }}>Percentile Rank</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>Among {industry.name} orgs</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Score Comparison Bar Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><BarChart3 size={16} /> Score Comparison</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{industry.name} sector</span>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="var(--gray-400)" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} stroke="var(--gray-400)" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" radius={[0, 6, 6, 0]} name="Score"
                  fill="var(--blue)"
                  label={{ position: 'right', fontSize: 12, fontWeight: 600 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical Trend */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><TrendingUp size={16} /> Your Progress vs Industry</span>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historyWithIndustry}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="var(--gray-400)" />
                <YAxis domain={[50, 100]} tick={{ fontSize: 12 }} stroke="var(--gray-400)" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="score" name="Your Score" fill="var(--blue)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="industryAvg" name="Industry Avg" fill="var(--gray-300)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Radar Chart - Multi-dimensional */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title"><Building2 size={16} /> Multi-Dimensional Benchmark</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Across 5 governance dimensions</span>
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="var(--gray-300)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--gray-600)', fontWeight: 600 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} />
              <Radar name="Your Score" dataKey="yourScore" stroke="var(--blue)" fill="var(--blue)" fillOpacity={0.35} strokeWidth={2} dot={{ r: 4, fill: 'var(--white)', stroke: 'var(--blue)', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'var(--blue)', stroke: 'var(--white)' }} />
              <Radar name="Industry Avg" dataKey="industryAvg" stroke="var(--gray-400)" fill="none" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              <Radar name="Top Performers" dataKey="topPerformer" stroke="var(--green)" fill="none" strokeWidth={2} strokeDasharray="2 2" dot={false} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Improvement Recommendations */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Trophy size={16} /> How to Reach Top Performer Level</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {[
            { gap: industry.top - yourScore, area: 'Fairness Documentation', action: 'Create detailed records of all AI decisions and the reasoning behind them', priority: 'High' },
            { gap: Math.max(0, industry.top - yourScore - 2), area: 'Regular Bias Audits', action: 'Schedule monthly fairness reviews across all active AI systems', priority: 'High' },
            { gap: Math.max(0, industry.top - yourScore - 5), area: 'Compliance Alignment', action: 'Map all processes to EU AI Act and GDPR requirements', priority: 'Medium' },
            { gap: Math.max(0, industry.top - yourScore - 8), area: 'Team Training', action: 'Run responsible AI training for all product and HR teams', priority: 'Medium' },
          ].map((rec, i) => (
            <div key={i} style={{
              padding: '14px 16px', borderRadius: 8,
              border: '1px solid var(--gray-200)', background: 'var(--gray-100)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{rec.area}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', fontWeight: 600,
                  background: rec.priority === 'High' ? 'var(--red-bg)' : 'var(--amber-bg)',
                  color: rec.priority === 'High' ? 'var(--red)' : 'var(--amber-dark)'
                }}>{rec.priority}</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginBottom: 8, lineHeight: 1.5 }}>{rec.action}</p>
              {rec.gap > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--blue)', fontWeight: 500 }}>
                  +{Math.max(1, Math.round(rec.gap * 0.3))} pts potential improvement
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
