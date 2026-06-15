import { useState, useEffect, useRef } from 'react';
import {
  Activity, Zap, AlertTriangle, CheckCircle, RefreshCw,
  TrendingUp, TrendingDown, Radio, Clock, Shield, BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const STREAM_INTERVAL = 2500; // ms between simulated decisions

function generateDecision(id) {
  const types = ['Hiring', 'Loan', 'Healthcare', 'Education', 'Credit'];
  const groups = ['Group A', 'Group B', 'Group C', 'Group D'];
  const outcomes = ['Approved', 'Rejected', 'Under Review'];
  const risk = Math.random();
  const fairnessScore = Math.round(60 + Math.random() * 35);
  return {
    id,
    timestamp: new Date().toLocaleTimeString(),
    type: types[Math.floor(Math.random() * types.length)],
    group: groups[Math.floor(Math.random() * groups.length)],
    outcome: outcomes[Math.floor(Math.random() * outcomes.length)],
    fairnessScore,
    risk: risk > 0.7 ? 'High' : risk > 0.4 ? 'Medium' : 'Low',
    riskColor: risk > 0.7 ? 'var(--red)' : risk > 0.4 ? 'var(--yellow)' : 'var(--green)',
    flagged: risk > 0.72,
  };
}

function generateTrendPoint(i, prevScore) {
  const score = Math.max(50, Math.min(98, prevScore + (Math.random() - 0.5) * 8));
  return {
    t: new Date().toLocaleTimeString(),
    fairness: Math.round(score),
    risk: Math.round(100 - score + Math.random() * 10),
    compliance: Math.round(score * 0.9 + Math.random() * 5),
  };
}

export default function RealTimeMonitoring() {
  const [isLive, setIsLive] = useState(false);
  const [decisions, setDecisions] = useState([]);
  const [trendData, setTrendData] = useState([
    { t: '10:00', fairness: 78, risk: 22, compliance: 82 },
    { t: '10:05', fairness: 75, risk: 25, compliance: 80 },
    { t: '10:10', fairness: 82, risk: 18, compliance: 84 },
    { t: '10:15', fairness: 79, risk: 21, compliance: 81 },
    { t: '10:20', fairness: 76, risk: 24, compliance: 79 },
    { t: '10:25', fairness: 80, risk: 20, compliance: 83 },
  ]);
  const [stats, setStats] = useState({ total: 0, flagged: 0, avgFairness: 0 });
  const [alertLog, setAlertLog] = useState([]);
  const idRef = useRef(1);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startMonitoring = () => {
    setIsLive(true);
    intervalRef.current = setInterval(() => {
      const decision = generateDecision(idRef.current++);
      setDecisions(prev => [decision, ...prev].slice(0, 30));
      setTrendData(prev => {
        const last = prev[prev.length - 1];
        const newPoint = generateTrendPoint(prev.length, last.fairness);
        return [...prev.slice(-19), newPoint];
      });
      setStats(prev => {
        const newTotal = prev.total + 1;
        const newFlagged = prev.flagged + (decision.flagged ? 1 : 0);
        return {
          total: newTotal,
          flagged: newFlagged,
          avgFairness: Math.round((prev.avgFairness * (newTotal - 1) + decision.fairnessScore) / newTotal),
        };
      });
      if (decision.flagged) {
        setAlertLog(prev => [{
          id: decision.id,
          time: decision.timestamp,
          message: `⚠️ High-risk ${decision.type} decision detected for ${decision.group}`,
          risk: decision.risk,
        }, ...prev].slice(0, 10));
      }
    }, STREAM_INTERVAL);
  };

  const stopMonitoring = () => {
    setIsLive(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const resetAll = () => {
    stopMonitoring();
    setDecisions([]);
    setStats({ total: 0, flagged: 0, avgFairness: 0 });
    setAlertLog([]);
    setTrendData([
      { t: '10:00', fairness: 78, risk: 22, compliance: 82 },
      { t: '10:05', fairness: 75, risk: 25, compliance: 80 },
      { t: '10:10', fairness: 82, risk: 18, compliance: 84 },
      { t: '10:15', fairness: 79, risk: 21, compliance: 81 },
      { t: '10:20', fairness: 76, risk: 24, compliance: 79 },
      { t: '10:25', fairness: 80, risk: 20, compliance: 83 },
    ]);
    idRef.current = 1;
  };

  const currentFairness = trendData[trendData.length - 1]?.fairness ?? 0;
  const flagRate = stats.total > 0 ? ((stats.flagged / stats.total) * 100).toFixed(1) : '0.0';

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Real-Time AI Monitoring Center</h2>
        <p>Live dashboard tracking fairness, risk, and compliance trends across all active AI decision streams</p>
      </div>

      {/* Status Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px',
        borderRadius: 10, background: isLive ? 'var(--green-bg)' : 'var(--gray-100)',
        border: `1px solid ${isLive ? 'var(--green)' : 'var(--gray-200)'}`,
        marginBottom: 20, flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: isLive ? 'var(--green)' : 'var(--gray-400)',
            animation: isLive ? 'pulse-live 1.5s ease-in-out infinite' : 'none'
          }} />
          <span style={{ fontWeight: 600, color: isLive ? 'var(--green)' : 'var(--gray-600)' }}>
            {isLive ? 'LIVE — Monitoring Active' : 'Monitoring Paused'}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        {!isLive ? (
          <button className="btn btn-primary" onClick={startMonitoring} style={{ gap: 6 }}>
            <Radio size={14} /> Start Live Monitoring
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={stopMonitoring} style={{ gap: 6 }}>
            <AlertTriangle size={14} /> Pause
          </button>
        )}
        <button className="btn btn-secondary" onClick={resetAll} style={{ gap: 6 }}>
          <RefreshCw size={14} /> Reset
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--blue)' }}>{stats.total}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginTop: 4 }}>Decisions Monitored</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: stats.flagged > 0 ? 'var(--red)' : 'var(--green)' }}>{stats.flagged}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginTop: 4 }}>Flagged Decisions</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: parseFloat(flagRate) > 20 ? 'var(--red)' : 'var(--amber)' }}>{flagRate}%</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginTop: 4 }}>Flag Rate</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: currentFairness >= 75 ? 'var(--green)' : currentFairness >= 60 ? 'var(--yellow)' : 'var(--red)' }}>
            {currentFairness}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginTop: 4 }}>Live Fairness Score</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--blue)' }}>
            {stats.avgFairness || currentFairness}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginTop: 4 }}>Avg Fairness Score</div>
        </div>
      </div>

      {/* Live Trend Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title"><TrendingUp size={16} /> Live Fairness & Risk Trends</span>
            {isLive && <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--green)', fontWeight: 600 }}>
              <Radio size={12} /> Updating live
            </span>}
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="fairGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--red)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--red)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="var(--gray-400)" />
                <YAxis domain={[40, 100]} tick={{ fontSize: 11 }} stroke="var(--gray-400)" />
                <Tooltip />
                <Area type="monotone" dataKey="fairness" stroke="var(--blue)" fill="url(#fairGrad)" strokeWidth={2} name="Fairness" dot={false} />
                <Area type="monotone" dataKey="compliance" stroke="var(--green)" fill="none" strokeWidth={1.5} name="Compliance" dot={false} strokeDasharray="4 4" />
                <Area type="monotone" dataKey="risk" stroke="var(--red)" fill="url(#riskGrad)" strokeWidth={1.5} name="Risk %" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alert Log */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><AlertTriangle size={16} /> Live Alert Log</span>
            {alertLog.length > 0 && <span style={{ background: 'var(--red)', color: 'white', borderRadius: 20, padding: '2px 7px', fontSize: '0.6875rem', fontWeight: 700 }}>{alertLog.length}</span>}
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alertLog.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--gray-500)' }}>
                <CheckCircle size={20} style={{ display: 'block', margin: '0 auto 8px', color: 'var(--green)' }} />
                <span style={{ fontSize: '0.8125rem' }}>No alerts yet</span>
              </div>
            ) : alertLog.map((alert, i) => (
              <div key={i} style={{
                padding: '8px 10px', borderRadius: 6, fontSize: '0.75rem',
                background: 'var(--red-bg)', border: '1px solid #fca5a5'
              }}>
                <div style={{ fontWeight: 600, color: 'var(--red)' }}>{alert.message}</div>
                <div style={{ color: 'var(--gray-500)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} /> {alert.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Decision Stream */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Activity size={16} /> Live Decision Stream</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Last {Math.min(decisions.length, 30)} decisions</span>
        </div>
        {decisions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-400)' }}>
            <Radio size={32} style={{ display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 500, marginBottom: 4 }}>No decisions yet</p>
            <p style={{ fontSize: '0.8125rem' }}>Click "Start Live Monitoring" to begin tracking AI decisions</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                  {['Time', 'Type', 'Group', 'Outcome', 'Fairness', 'Risk', 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decisions.map((d, i) => (
                  <tr key={d.id} style={{
                    borderBottom: '1px solid var(--gray-100)',
                    background: d.flagged ? '#fff5f5' : i === 0 ? '#f0f7ff' : 'transparent',
                    animation: i === 0 ? 'fadeInRow 0.4s ease' : 'none',
                  }}>
                    <td style={{ padding: '7px 12px', color: 'var(--gray-500)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{d.timestamp}</td>
                    <td style={{ padding: '7px 12px', fontWeight: 500 }}>{d.type}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--gray-600)' }}>{d.group}</td>
                    <td style={{ padding: '7px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 12,
                        background: d.outcome === 'Approved' ? 'var(--green-bg)' : d.outcome === 'Rejected' ? 'var(--red-bg)' : 'var(--amber-bg)',
                        color: d.outcome === 'Approved' ? 'var(--green)' : d.outcome === 'Rejected' ? 'var(--red)' : 'var(--amber-dark)',
                        fontSize: '0.75rem', fontWeight: 600
                      }}>{d.outcome}</span>
                    </td>
                    <td style={{ padding: '7px 12px', fontWeight: 700, color: d.fairnessScore >= 75 ? 'var(--green)' : d.fairnessScore >= 60 ? 'var(--yellow)' : 'var(--red)' }}>{d.fairnessScore}</td>
                    <td style={{ padding: '7px 12px' }}>
                      <span style={{ color: d.riskColor, fontWeight: 600 }}>{d.risk}</span>
                    </td>
                    <td style={{ padding: '7px 12px' }}>
                      {d.flagged ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--red)', fontWeight: 600, fontSize: '0.75rem' }}>
                          <AlertTriangle size={12} /> Flagged
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--green)', fontSize: '0.75rem' }}>
                          <CheckCircle size={12} /> Clear
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-live {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes fadeInRow {
          from { opacity: 0; background-color: #bfdbfe; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
