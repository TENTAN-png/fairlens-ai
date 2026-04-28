import { useState, useMemo } from 'react';
import { Sliders, RefreshCw, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

const COLORS = ['#1a73e8', '#ff9100', '#1e8e3e', '#d93025', '#9334e6', '#12b5cb'];

export default function WhatIfSimulator({ analysisResult, parsedData }) {
  const groups = analysisResult ? Object.entries(analysisResult.groupRates) : [];

  const [adjustments, setAdjustments] = useState(() => {
    const init = {};
    groups.forEach(([g, info]) => { init[g] = Math.round(info.rate * 100); });
    return init;
  });

  const simulatedMetrics = useMemo(() => {
    if (!analysisResult || groups.length === 0) return null;
    const privGroup = analysisResult.meta.privilegedValue;
    const privRate = (adjustments[privGroup] || 50) / 100;
    const unprivRates = groups.filter(([g]) => g !== privGroup).map(([g]) => (adjustments[g] || 50) / 100);
    const avgUnprivRate = unprivRates.length > 0 ? unprivRates.reduce((a, b) => a + b, 0) / unprivRates.length : 0;
    const di = privRate > 0 ? avgUnprivRate / privRate : 0;
    const spd = avgUnprivRate - privRate;
    const diScore = di >= 0.8 && di <= 1.25 ? 50 : di >= 0.7 ? 30 : 10;
    const spdScore = Math.abs(spd) < 0.1 ? 50 : Math.abs(spd) < 0.2 ? 30 : 10;
    const score = diScore + spdScore;
    return { di, spd, score, level: score >= 70 ? 'good' : score >= 40 ? 'warning' : 'danger' };
  }, [adjustments, analysisResult, groups]);

  const chartData = groups.map(([g]) => ({
    group: g,
    original: Math.round((analysisResult?.groupRates[g]?.rate || 0) * 100),
    simulated: adjustments[g] || 0
  }));

  const resetAll = () => {
    const init = {};
    groups.forEach(([g, info]) => { init[g] = Math.round(info.rate * 100); });
    setAdjustments(init);
  };

  if (!analysisResult) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon"><Sliders size={28} /></div>
          <h3>No Analysis Available</h3>
          <p>Run a bias analysis first to use the simulator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>What-If Simulator</h2>
          <p>Adjust group selection rates and watch fairness metrics update in real-time</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={resetAll}>
          <RefreshCw size={14} /> Reset
        </button>
      </div>

      {/* Simulated Score */}
      {simulatedMetrics && (
        <div className={`scorecard ${simulatedMetrics.level}`} style={{ marginBottom: 24 }}>
          <div className="scorecard-score" style={{
            background: simulatedMetrics.level === 'good' ? 'var(--green-bg)' : simulatedMetrics.level === 'warning' ? 'var(--yellow-bg)' : 'var(--red-bg)',
            border: `2px solid ${simulatedMetrics.level === 'good' ? 'var(--green)' : simulatedMetrics.level === 'warning' ? 'var(--yellow)' : 'var(--red)'}`
          }}>
            <span className="score-value" style={{ color: simulatedMetrics.level === 'good' ? 'var(--green)' : simulatedMetrics.level === 'warning' ? 'var(--yellow)' : 'var(--red)' }}>
              {simulatedMetrics.score}
            </span>
          </div>
          <div className="scorecard-info">
            <h3>Simulated Fairness Score</h3>
            <p>DI: {simulatedMetrics.di.toFixed(3)} · SPD: {simulatedMetrics.spd.toFixed(4)}</p>
          </div>
          {simulatedMetrics.level === 'good'
            ? <span className="badge badge-success"><CheckCircle size={10} /> Fair</span>
            : <span className="badge badge-danger"><AlertTriangle size={10} /> Biased</span>}
        </div>
      )}

      {/* Sliders */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title"><Sliders size={16} /> Group Selection Rates</span>
        </div>
        <div style={{ display: 'grid', gap: 20 }}>
          {groups.map(([group, info], i) => (
            <div key={group}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--gray-800)' }}>
                  {group}
                  {group === analysisResult.meta.privilegedValue && <span className="badge badge-info" style={{ marginLeft: 8 }}>Privileged</span>}
                </span>
                <span className="font-mono" style={{ fontSize: '0.875rem', fontWeight: 600, color: COLORS[i % COLORS.length] }}>
                  {adjustments[group]}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={adjustments[group]}
                onChange={e => setAdjustments(prev => ({ ...prev, [group]: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: COLORS[i % COLORS.length] }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs text-tertiary">Original: {Math.round(info.rate * 100)}%</span>
                <span className="text-xs text-tertiary">Δ {adjustments[group] - Math.round(info.rate * 100) > 0 ? '+' : ''}{adjustments[group] - Math.round(info.rate * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><TrendingUp size={16} /> Original vs Simulated</span>
        </div>
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
              <XAxis dataKey="group" tick={{ fontSize: 12, fill: '#5f6368' }} />
              <YAxis unit="%" tick={{ fontSize: 12, fill: '#5f6368' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8eaed', fontSize: 13 }} />
              <Bar dataKey="original" name="Original" fill="#dadce0" radius={[4,4,0,0]} />
              <Bar dataKey="simulated" name="Simulated" radius={[4,4,0,0]}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
