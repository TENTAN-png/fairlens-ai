import { useState, useMemo } from 'react';
import { FlaskConical, Download, Play, CheckCircle, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

export default function SmartDataGenerator({ parsedData }) {
  const [generated, setGenerated] = useState(null);
  const [targetCount, setTargetCount] = useState(500);

  const imbalanceInfo = useMemo(() => {
    if (!parsedData?.data?.length) return null;
    const { data, columns } = parsedData;
    // Find best categorical column for balancing
    const candidates = columns.filter(c => {
      const unique = new Set(data.map(r => r[c])).size;
      return unique >= 2 && unique <= 10;
    });
    if (candidates.length === 0) return null;

    const bestCol = candidates[0];
    const groups = {};
    data.forEach(r => {
      const val = String(r[bestCol] ?? 'Unknown');
      groups[val] = (groups[val] || 0) + 1;
    });
    const maxCount = Math.max(...Object.values(groups));
    const distribution = Object.entries(groups).map(([group, count]) => ({
      group, count, pct: +((count / data.length) * 100).toFixed(1), deficit: maxCount - count
    })).sort((a, b) => a.count - b.count);

    return { column: bestCol, distribution, maxCount, totalRows: data.length, columns };
  }, [parsedData]);

  const generateData = () => {
    if (!imbalanceInfo || !parsedData) return;
    const { data, columns } = parsedData;
    const { column: balanceCol, distribution } = imbalanceInfo;
    const newRows = [];
    const targetPerGroup = Math.ceil(targetCount / distribution.length);

    distribution.forEach(({ group, count }) => {
      const groupRows = data.filter(r => String(r[balanceCol]) === group);
      if (groupRows.length === 0) return;
      const needed = Math.max(0, targetPerGroup - count);

      for (let i = 0; i < needed; i++) {
        const template = groupRows[Math.floor(Math.random() * groupRows.length)];
        const newRow = { ...template };
        // Add slight variation to numeric fields
        columns.forEach(col => {
          if (col === balanceCol) return;
          const val = newRow[col];
          if (!isNaN(val) && val !== '' && val !== null) {
            const num = parseFloat(val);
            const noise = num * (0.9 + Math.random() * 0.2); // ±10% variation
            newRow[col] = +noise.toFixed(2);
          }
        });
        newRows.push(newRow);
      }
    });

    // Build comparison data
    const afterGroups = {};
    [...data, ...newRows].forEach(r => {
      const val = String(r[balanceCol] ?? 'Unknown');
      afterGroups[val] = (afterGroups[val] || 0) + 1;
    });

    const comparison = distribution.map(d => ({
      group: d.group,
      before: d.count,
      after: afterGroups[d.group] || d.count
    }));

    setGenerated({ rows: newRows, comparison, totalGenerated: newRows.length, balanceCol });
  };

  const downloadCSV = () => {
    if (!generated || !parsedData) return;
    const allData = [...parsedData.data, ...generated.rows];
    const cols = parsedData.columns;
    const header = cols.join(',');
    const rows = allData.map(r => cols.map(c => {
      const val = String(r[c] ?? '');
      return val.includes(',') ? `"${val}"` : val;
    }).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'balanced_dataset.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!imbalanceInfo) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon"><FlaskConical size={28} /></div>
          <h3>No Dataset Loaded</h3>
          <p>Upload a dataset to generate balanced synthetic data.</p>
        </div>
      </div>
    );
  }

  const info = imbalanceInfo;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Smart Data Generator</h2>
        <p>Generate balanced synthetic data when datasets are heavily imbalanced</p>
      </div>

      {/* Current Distribution */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title"><BarChart3 size={16} /> Current Distribution ({info.column})</span>
        </div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={info.distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="group" tick={{ fontSize: 11 }} stroke="var(--gray-400)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--gray-400)" />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Records">
                {info.distribution.map((d, i) => <Cell key={i} fill={d.count < info.maxCount * 0.5 ? 'var(--red)' : d.count < info.maxCount * 0.8 ? 'var(--yellow)' : 'var(--blue)'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {info.distribution.map((d, i) => (
            <div key={i} className="badge badge-neutral" style={{ padding: '4px 10px' }}>
              {d.group}: {d.count} ({d.pct}%)
              {d.deficit > 0 && <span style={{ color: 'var(--red)', marginLeft: 4 }}>-{d.deficit}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Generate Controls */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title"><FlaskConical size={16} /> Generate Balanced Data</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="input-group" style={{ flex: 1 }}>
            <label className="input-label">Target records to generate</label>
            <input className="input" type="number" value={targetCount} onChange={e => setTargetCount(+e.target.value)} min={10} max={10000} style={{ maxWidth: 200 }} />
          </div>
          <button className="btn btn-primary btn-lg" onClick={generateData} style={{ marginTop: 20 }}>
            <Play size={16} /> Generate Records
          </button>
        </div>
      </div>

      {/* Results */}
      {generated && (
        <div className="animate-in">
          <div className={`scorecard good`} style={{ marginBottom: 16 }}>
            <div className="scorecard-score" style={{ background: 'var(--green-bg)', border: '2px solid var(--green)' }}>
              <span className="score-value" style={{ color: 'var(--green)', fontSize: '1.125rem' }}><CheckCircle size={24} /></span>
            </div>
            <div className="scorecard-info">
              <h3>Generated {generated.totalGenerated.toLocaleString()} balanced records</h3>
              <p>Original: {info.totalRows} rows → New total: {(info.totalRows + generated.totalGenerated).toLocaleString()} rows</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={downloadCSV}>
              <Download size={14} /> Download CSV
            </button>
          </div>

          {/* Before/After Comparison */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Before vs After</span>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={generated.comparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                  <XAxis dataKey="group" tick={{ fontSize: 11 }} stroke="var(--gray-400)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--gray-400)" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="before" fill="var(--gray-400)" name="Before" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="after" fill="var(--green)" name="After" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
