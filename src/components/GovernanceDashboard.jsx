import { useState, useEffect } from 'react';
import {
  BarChart3, Shield, AlertTriangle, TrendingUp, TrendingDown,
  Activity, CheckCircle, ArrowRight, Zap, Users, Building2
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const DEPARTMENTS = [
  { name: 'HR & Recruiting', score: 82, trend: '+3%' },
  { name: 'Finance & Lending', score: 67, trend: '-5%' },
  { name: 'Operations', score: 91, trend: '+1%' },
  { name: 'Customer Service', score: 78, trend: '+2%' },
];

const TREND_DATA = [
  { month: 'Jan', score: 72, risk: 28 },
  { month: 'Feb', score: 75, risk: 25 },
  { month: 'Mar', score: 71, risk: 29 },
  { month: 'Apr', score: 78, risk: 22 },
  { month: 'May', score: 80, risk: 20 },
  { month: 'Jun', score: 76, risk: 24 },
];

const BENCHMARK = [
  { label: 'Your Score', value: 0, color: 'var(--blue)' },
  { label: 'Industry Avg', value: 72, color: 'var(--gray-400)' },
  { label: 'Top Performers', value: 91, color: 'var(--green)' },
];

export default function GovernanceDashboard({ analysisResult, onNavigate }) {
  const [alerts, setAlerts] = useState([]);

  const fairnessScore = analysisResult?.fairnessScore ?? 0;
  const riskLevel = fairnessScore >= 80 ? 'Low' : fairnessScore >= 60 ? 'Moderate' : fairnessScore >= 40 ? 'High' : 'Critical';
  const riskColor = fairnessScore >= 80 ? 'var(--green)' : fairnessScore >= 60 ? 'var(--yellow)' : 'var(--red)';

  const benchmarkData = BENCHMARK.map(b => b.label === 'Your Score' ? { ...b, value: fairnessScore } : b);

  useEffect(() => {
    // Load alerts from localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('fairlens_alerts') || '[]');
      setAlerts(stored.slice(0, 5));
    } catch { setAlerts([]); }
  }, []);

  // Generate trend data incorporating actual score
  const trendData = TREND_DATA.map((d, i) => i === TREND_DATA.length - 1 ? { ...d, score: fairnessScore, risk: 100 - fairnessScore } : d);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Governance Dashboard</h2>
        <p>Real-time overview of your organization's AI fairness and governance posture</p>
      </div>

      {/* Top Metrics Row */}
      <div className="dashboard-metrics-row">
        {/* Fairness Health Score */}
        <div className="dashboard-gauge-card">
          <div className="dashboard-gauge">
            <svg viewBox="0 0 120 120" className="gauge-svg">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--gray-200)" strokeWidth="8" />
              <circle cx="60" cy="60" r="50" fill="none" stroke={riskColor} strokeWidth="8"
                strokeDasharray={`${(fairnessScore / 100) * 314} 314`}
                strokeLinecap="round" transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dasharray 1s ease' }} />
            </svg>
            <div className="gauge-value">
              <span className="gauge-number" style={{ color: riskColor }}>{fairnessScore}</span>
              <span className="gauge-label">/ 100</span>
            </div>
          </div>
          <h4>Fairness Health Score</h4>
          <p className="text-xs text-secondary">Overall fairness across all analyses</p>
        </div>

        {/* Risk Level */}
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ background: fairnessScore >= 80 ? 'var(--green-bg)' : fairnessScore >= 60 ? 'var(--yellow-bg)' : 'var(--red-bg)' }}>
            <Shield size={20} style={{ color: riskColor }} />
          </div>
          <span className="dashboard-stat-value" style={{ color: riskColor }}>{riskLevel}</span>
          <span className="dashboard-stat-label">Risk Level</span>
        </div>

        {/* Analyses Count */}
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ background: 'var(--blue-bg)' }}>
            <Activity size={20} style={{ color: 'var(--blue)' }} />
          </div>
          <span className="dashboard-stat-value">{analysisResult ? '1' : '0'}</span>
          <span className="dashboard-stat-label">Active Analyses</span>
        </div>

        {/* Compliance */}
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ background: 'var(--amber-bg)' }}>
            <CheckCircle size={20} style={{ color: 'var(--amber-dark)' }} />
          </div>
          <span className="dashboard-stat-value">{analysisResult ? (fairnessScore >= 70 ? 'Passing' : 'Needs Work') : '—'}</span>
          <span className="dashboard-stat-label">Compliance Status</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="dashboard-charts-row">
        {/* Trend Chart */}
        <div className="card" style={{ flex: 2 }}>
          <div className="card-header">
            <span className="card-title"><TrendingUp size={16} /> Monthly Fairness Trend</span>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--gray-400)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="var(--gray-400)" />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="var(--blue)" strokeWidth={2} dot={{ r: 4, fill: 'var(--blue)' }} name="Fairness Score" />
                <Line type="monotone" dataKey="risk" stroke="var(--red)" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Risk %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Benchmark */}
        <div className="card" style={{ flex: 1 }}>
          <div className="card-header">
            <span className="card-title"><BarChart3 size={16} /> Benchmark</span>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={benchmarkData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="var(--gray-400)" />
                <YAxis dataKey="label" type="category" width={100} tick={{ fontSize: 11 }} stroke="var(--gray-400)" />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Score">
                  {benchmarkData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Department Scores + Alerts */}
      <div className="dashboard-bottom-row">
        {/* Department Scores */}
        <div className="card" style={{ flex: 1 }}>
          <div className="card-header">
            <span className="card-title"><Building2 size={16} /> Department Fairness</span>
          </div>
          {DEPARTMENTS.map((dept, i) => (
            <div key={i} className="dashboard-dept-row">
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{dept.name}</span>
                <div className="compliance-progress-bar" style={{ marginTop: 4 }}>
                  <div className="compliance-progress-fill" style={{
                    width: `${dept.score}%`,
                    background: dept.score >= 80 ? 'var(--green)' : dept.score >= 60 ? 'var(--yellow)' : 'var(--red)'
                  }} />
                </div>
              </div>
              <span className="font-mono" style={{ fontSize: '0.875rem', fontWeight: 600, color: dept.score >= 80 ? 'var(--green)' : dept.score >= 60 ? 'var(--yellow)' : 'var(--red)' }}>
                {dept.score}
              </span>
              <span className="text-xs" style={{ color: dept.trend.startsWith('+') ? 'var(--green)' : 'var(--red)' }}>
                {dept.trend}
              </span>
            </div>
          ))}
        </div>

        {/* Recent Alerts */}
        <div className="card" style={{ flex: 1 }}>
          <div className="card-header">
            <span className="card-title"><AlertTriangle size={16} /> Recent Alerts</span>
          </div>
          {alerts.length > 0 ? (
            alerts.slice(0, 4).map((alert, i) => (
              <div key={i} className="dashboard-alert-row">
                <div className={`dashboard-alert-dot ${alert.severity || 'info'}`} />
                <div style={{ flex: 1 }}>
                  <span className="text-sm">{alert.message || alert.title}</span>
                  <span className="text-xs text-tertiary" style={{ display: 'block' }}>
                    {alert.timestamp ? new Date(alert.timestamp).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <CheckCircle size={20} style={{ color: 'var(--green)', margin: '0 auto 8px', display: 'block' }} />
              <span className="text-sm text-secondary">No active alerts</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-title"><Zap size={16} /> Quick Actions</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('/analyze')}>
            <BarChart3 size={14} /> Analyze Dataset
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('/audit')}>
            <Users size={14} /> Multi-Agent Audit
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('/compliance')}>
            <Shield size={14} /> Compliance Check
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('/governance-score')}>
            <Activity size={14} /> Governance Score
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('/certification')}>
            <CheckCircle size={14} /> Get Certified
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('/benchmark')}>
            <TrendingUp size={14} /> Benchmark
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('/monitoring')}>
            <Activity size={14} /> Live Monitoring
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('/deployment-check')}>
            <Shield size={14} /> Deployment Check
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('/improvement')}>
            <TrendingUp size={14} /> Auto-Improve
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('/relationships')}>
            <BarChart3 size={14} /> Relationship Map
          </button>
        </div>
      </div>
    </div>
  );
}
