import { useState, useMemo, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, Clock, ShieldCheck, Milestone } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine } from 'recharts';
import { getHistoryAsync } from '../utils/auditHistory';

const MOCK_HISTORICAL_DATA = [
  { date: '2026-04-01', score: 68, dataset: 'CreditRisk_v1_raw.csv', event: 'Initial Raw Dataset Upload' },
  { date: '2026-04-15', score: 72, dataset: 'CreditRisk_v1.1_cleaned.csv', event: 'Removed proxy attributes' },
  { date: '2026-05-01', score: 79, dataset: 'CreditRisk_v2_balanced.csv', event: 'Synthetic oversampling' },
  { date: '2026-05-15', score: 83, dataset: 'CreditRisk_v2.1_audit.csv', event: 'Mitigation pipeline run' },
  { date: '2026-06-01', score: 94, dataset: 'CreditRisk_Final_Release.csv', event: 'FairLens Certified release' },
  { date: '2026-06-14', score: 91, dataset: 'CreditRisk_Prod_Daily.csv', event: 'Production monitoring run' }
];

export default function FairnessTimeline() {
  const [history, setHistory] = useState([]);
  const [viewMode, setViewMode] = useState('monthly'); // weekly | monthly

  useEffect(() => {
    async function loadHistory() {
      try {
        const raw = await getHistoryAsync();
        if (raw && raw.length >= 2) {
          const formatted = raw.map(h => ({
            date: h.savedAt ? new Date(h.savedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            score: typeof h.overallScore === 'number' ? h.overallScore : h.fairnessScore || 75,
            dataset: h.fileName || h.datasetName || 'Audit Dataset',
            event: h.notes || 'System Audit'
          })).reverse();
          setHistory(formatted);
        } else {
          setHistory(MOCK_HISTORICAL_DATA);
        }
      } catch (err) {
        console.error('Failed to load audit history', err);
        setHistory(MOCK_HISTORICAL_DATA);
      }
    }
    loadHistory();
  }, []);

  const timelineStats = useMemo(() => {
    if (history.length === 0) return { avg: 0, peak: 0, trend: 'stable', change: 0 };
    const scores = history.map(h => h.score);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const peak = Math.max(...scores);
    const latest = scores[scores.length - 1];
    const initial = scores[0];
    const diff = latest - initial;
    let trend = 'stable';
    if (diff > 3) trend = 'improving';
    if (diff < -3) trend = 'declining';

    return { avg, peak, latest, trend, change: diff };
  }, [history]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Fairness Timeline Explorer</h2>
        <p>Monitor historical compliance changes and track AI system remediation progress over time.</p>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="text-xs text-secondary">Current Score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{timelineStats.latest || 0}/100</span>
            {timelineStats.change !== 0 && (
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: timelineStats.change > 0 ? 'var(--green)' : 'var(--red)' }}>
                {timelineStats.change > 0 ? `+${timelineStats.change}` : timelineStats.change} since initial
              </span>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="text-xs text-secondary">Historical Average</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{timelineStats.avg}/100</span>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="text-xs text-secondary">Peak Fairness</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{timelineStats.peak}/100</span>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="text-xs text-secondary">Progress Trend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            {timelineStats.trend === 'improving' ? (
              <TrendingUp size={24} style={{ color: 'var(--green)' }} />
            ) : timelineStats.trend === 'declining' ? (
              <TrendingDown size={24} style={{ color: 'var(--red)' }} />
            ) : (
              <Clock size={24} style={{ color: 'var(--yellow)' }} />
            )}
            <span style={{ fontSize: '1.125rem', fontWeight: 'bold', textTransform: 'capitalize' }}>
              {timelineStats.trend}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title"><Calendar size={16} /> Fairness Trend Chart</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setViewMode('weekly')}
              className={`preset-scenario-btn ${viewMode === 'weekly' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`preset-scenario-btn ${viewMode === 'monthly' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              Monthly
            </button>
          </div>
        </div>

        <div style={{ width: '100%', height: 320, padding: '10px 0' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="var(--text-secondary)"
                style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
              <YAxis
                domain={[0, 100]}
                stroke="var(--text-secondary)"
                style={{ fontSize: '0.75rem' }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                  borderRadius: 8
                }}
                labelStyle={{ fontWeight: 'bold', fontSize: '0.75rem' }}
              />
              <ReferenceLine y={80} stroke="var(--green)" strokeDasharray="3 3" label={{ value: 'Regulatory Target (80%)', fill: 'var(--green)', fontSize: 10, position: 'insideBottomRight' }} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--accent)"
                strokeWidth={3}
                dot={{ r: 6, fill: 'var(--accent)', stroke: 'var(--card-bg)', strokeWidth: 2 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Milestones */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Milestone size={16} /> Audit Trail & System Milestones</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {history.slice().reverse().map((h, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 16,
                padding: '12px 16px',
                borderLeft: '2px solid var(--border)',
                position: 'relative'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: -5,
                  top: 16,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: h.score >= 80 ? 'var(--green)' : h.score >= 60 ? 'var(--yellow)' : 'var(--red)'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{h.event}</span>
                  <span className="text-xs text-tertiary" style={{ fontFamily: 'monospace' }}>{h.date}</span>
                </div>
                <div className="text-sm text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Dataset: <code>{h.dataset}</code></span>
                  <span>•</span>
                  <span style={{
                    fontWeight: 600,
                    color: h.score >= 80 ? 'var(--green)' : h.score >= 60 ? 'var(--yellow)' : 'var(--red)'
                  }}>
                    Fairness score: {h.score}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
