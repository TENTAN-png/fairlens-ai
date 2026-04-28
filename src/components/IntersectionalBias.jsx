import { useState, useMemo } from 'react';
import { Layers, AlertTriangle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#1a73e8', '#ff9100', '#1e8e3e', '#d93025', '#9334e6', '#12b5cb'];

export default function IntersectionalBias({ parsedData, analysisResult }) {
  const [col1, setCol1] = useState('');
  const [col2, setCol2] = useState('');
  const [targetCol, setTargetCol] = useState(analysisResult?.meta?.targetCol || '');
  const [favorableVal, setFavorableVal] = useState(analysisResult?.meta?.favorableValue || '');

  const columns = parsedData?.columns || [];
  const getUnique = (col) => [...new Set((parsedData?.data || []).map(r => r[col]).filter(v => v != null))];

  const intersectionalResults = useMemo(() => {
    if (!col1 || !col2 || !targetCol || !favorableVal || !parsedData) return null;

    const groups = {};
    parsedData.data.forEach(row => {
      const key = `${row[col1]} × ${row[col2]}`;
      if (!groups[key]) groups[key] = { total: 0, favorable: 0 };
      groups[key].total++;
      if (String(row[targetCol]) === String(favorableVal)) groups[key].favorable++;
    });

    return Object.entries(groups)
      .map(([group, info]) => ({
        group,
        total: info.total,
        favorable: info.favorable,
        rate: info.total > 0 ? +(info.favorable / info.total * 100).toFixed(1) : 0
      }))
      .filter(g => g.total >= 3)
      .sort((a, b) => b.rate - a.rate);
  }, [col1, col2, targetCol, favorableVal, parsedData]);

  const maxRate = intersectionalResults ? Math.max(...intersectionalResults.map(r => r.rate)) : 0;
  const minRate = intersectionalResults ? Math.min(...intersectionalResults.map(r => r.rate)) : 0;
  const gap = maxRate - minRate;

  if (!parsedData) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon"><Layers size={28} /></div>
          <h3>No Data Loaded</h3>
          <p>Upload a dataset to analyze intersectional bias.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Intersectional Bias</h2>
        <p>Analyze bias across combinations of protected attributes</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><span className="card-title">Select Attributes</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div className="input-group">
            <label className="input-label">Attribute 1</label>
            <select className="input" value={col1} onChange={e => setCol1(e.target.value)}>
              <option value="">Select...</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Attribute 2</label>
            <select className="input" value={col2} onChange={e => setCol2(e.target.value)}>
              <option value="">Select...</option>
              {columns.filter(c => c !== col1).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Outcome</label>
            <select className="input" value={targetCol} onChange={e => { setTargetCol(e.target.value); setFavorableVal(''); }}>
              <option value="">Select...</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Favorable Value</label>
            <select className="input" value={favorableVal} onChange={e => setFavorableVal(e.target.value)} disabled={!targetCol}>
              <option value="">Select...</option>
              {targetCol && getUnique(targetCol).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      {intersectionalResults && intersectionalResults.length > 0 && (
        <div className="animate-in">
          {/* Gap indicator */}
          <div className={`scorecard ${gap > 20 ? 'danger' : gap > 10 ? 'warning' : 'good'}`} style={{ marginBottom: 24 }}>
            <div className="scorecard-score" style={{
              background: gap > 20 ? 'var(--red-bg)' : gap > 10 ? 'var(--yellow-bg)' : 'var(--green-bg)',
              border: `2px solid ${gap > 20 ? 'var(--red)' : gap > 10 ? 'var(--yellow)' : 'var(--green)'}`
            }}>
              <span className="score-value" style={{ color: gap > 20 ? 'var(--red)' : gap > 10 ? 'var(--yellow)' : 'var(--green)', fontSize: '1.25rem' }}>
                {gap.toFixed(1)}%
              </span>
            </div>
            <div className="scorecard-info">
              <h3>Intersectional Disparity Gap</h3>
              <p>Between best group ({intersectionalResults[0]?.group}: {maxRate}%) and worst group ({intersectionalResults[intersectionalResults.length-1]?.group}: {minRate}%)</p>
            </div>
          </div>

          {/* Chart */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><span className="card-title">Selection Rate by Intersectional Group</span></div>
            <div style={{ height: Math.max(280, intersectionalResults.length * 36) }}>
              <ResponsiveContainer>
                <BarChart data={intersectionalResults} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
                  <XAxis type="number" unit="%" tick={{ fontSize: 11, fill: '#5f6368' }} />
                  <YAxis type="category" dataKey="group" width={160} tick={{ fontSize: 11, fill: '#5f6368' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8eaed', fontSize: 13 }} />
                  <Bar dataKey="rate" name="Rate (%)" radius={[0,4,4,0]}>
                    {intersectionalResults.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="card">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Group</th><th>Total</th><th>Favorable</th><th>Rate</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {intersectionalResults.map(r => (
                    <tr key={r.group}>
                      <td><strong>{r.group}</strong></td>
                      <td>{r.total}</td>
                      <td>{r.favorable}</td>
                      <td className="font-mono">{r.rate}%</td>
                      <td>
                        {r.rate >= maxRate * 0.8
                          ? <span className="badge badge-success"><CheckCircle size={10} /> Fair</span>
                          : <span className="badge badge-danger"><AlertTriangle size={10} /> Disparity</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
