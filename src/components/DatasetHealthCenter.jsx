import { useMemo } from 'react';
import { Tag, AlertTriangle, CheckCircle, BarChart3, Database, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function DatasetHealthCenter({ parsedData }) {
  const healthReport = useMemo(() => {
    if (!parsedData?.data?.length || !parsedData?.columns?.length) return null;
    const { data, columns } = parsedData;
    const totalRows = data.length;
    const totalCols = columns.length;

    // Missing values per column
    const missingByCol = columns.map(col => {
      const missing = data.filter(r => r[col] === null || r[col] === undefined || r[col] === '' || r[col] === 'NA' || r[col] === 'N/A').length;
      return { column: col, missing, pct: ((missing / totalRows) * 100).toFixed(1) };
    });
    const totalMissing = missingByCol.reduce((s, c) => s + c.missing, 0);
    const totalCells = totalRows * totalCols;
    const missingPct = ((totalMissing / totalCells) * 100).toFixed(1);

    // Duplicate detection
    const serialized = data.map(r => JSON.stringify(r));
    const uniqueRows = new Set(serialized).size;
    const duplicates = totalRows - uniqueRows;
    const dupPct = ((duplicates / totalRows) * 100).toFixed(1);

    // Sensitive columns detection
    const sensitiveKeywords = ['gender', 'sex', 'race', 'ethnicity', 'age', 'religion', 'disability', 'nationality', 'marital', 'orientation', 'color', 'national_origin'];
    const sensitiveFound = columns.filter(c => sensitiveKeywords.some(k => c.toLowerCase().includes(k)));

    // Group balance (check most likely sensitive column)
    let groupBalance = [];
    const primarySensitive = sensitiveFound[0] || columns.find(c => {
      const unique = new Set(data.map(r => r[c])).size;
      return unique >= 2 && unique <= 10;
    });
    if (primarySensitive) {
      const groups = {};
      data.forEach(r => {
        const val = String(r[primarySensitive] ?? 'Unknown');
        groups[val] = (groups[val] || 0) + 1;
      });
      groupBalance = Object.entries(groups).map(([group, count]) => ({
        group, count, pct: ((count / totalRows) * 100).toFixed(1)
      })).sort((a, b) => b.count - a.count);
    }

    // Data types
    const typeInfo = columns.map(col => {
      const sample = data.find(r => r[col] !== null && r[col] !== '' && r[col] !== undefined);
      const val = sample?.[col];
      const isNum = !isNaN(val) && val !== '' && val !== null;
      return { column: col, type: isNum ? 'Numeric' : 'Categorical' };
    });

    // Scores
    const completenessScore = Math.round(100 - parseFloat(missingPct));
    const uniquenessScore = Math.round(100 - parseFloat(dupPct));
    const balanceScore = groupBalance.length > 0
      ? Math.round(100 - Math.min(100, Math.abs(groupBalance[0].pct - (100 / groupBalance.length)) * 2))
      : 80;
    const healthScore = Math.round((completenessScore * 0.4) + (uniquenessScore * 0.3) + (balanceScore * 0.3));

    return {
      totalRows, totalCols, totalCells,
      missingByCol, totalMissing, missingPct,
      duplicates, dupPct,
      sensitiveFound, groupBalance, primarySensitive,
      typeInfo, completenessScore, uniquenessScore, balanceScore, healthScore
    };
  }, [parsedData]);

  if (!healthReport) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon"><Database size={28} /></div>
          <h3>No Dataset Loaded</h3>
          <p>Upload a dataset first to see its health report.</p>
        </div>
      </div>
    );
  }

  const h = healthReport;
  const scoreColor = (s) => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Dataset Health Center</h2>
        <p>Understand whether your data is balanced, complete, and ready for responsible AI use</p>
      </div>

      {/* Health Score + Quick Stats */}
      <div className="nutrition-top-row">
        {/* Main Score */}
        <div className="nutrition-score-card">
          <div className="nutrition-label-header">
            <Tag size={16} /> Dataset Health Report
          </div>
          <div className="nutrition-score-circle">
            <svg viewBox="0 0 120 120" className="gauge-svg">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--gray-200)" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none" stroke={scoreColor(h.healthScore)} strokeWidth="10"
                strokeDasharray={`${(h.healthScore / 100) * 314} 314`}
                strokeLinecap="round" transform="rotate(-90 60 60)" />
            </svg>
            <div className="gauge-value">
              <span className="gauge-number" style={{ color: scoreColor(h.healthScore) }}>{h.healthScore}</span>
              <span className="gauge-label">/ 100</span>
            </div>
          </div>
          <h4 style={{ textAlign: 'center', marginTop: 8 }}>Overall Data Health</h4>
        </div>

        {/* Nutrition Facts */}
        <div className="nutrition-facts-card card">
          <h4 className="nutrition-facts-title">Data Facts</h4>
          <div className="nutrition-divider-thick" />
          <div className="nutrition-row"><span>Total Records</span><strong>{h.totalRows.toLocaleString()}</strong></div>
          <div className="nutrition-row"><span>Total Columns</span><strong>{h.totalCols}</strong></div>
          <div className="nutrition-divider" />
          <div className="nutrition-row"><span>Missing Values</span><strong style={{ color: h.missingPct > 10 ? 'var(--red)' : h.missingPct > 5 ? 'var(--yellow)' : 'var(--green)' }}>{h.missingPct}%</strong></div>
          <div className="nutrition-row"><span>Duplicate Records</span><strong style={{ color: h.dupPct > 5 ? 'var(--red)' : h.dupPct > 1 ? 'var(--yellow)' : 'var(--green)' }}>{h.duplicates} ({h.dupPct}%)</strong></div>
          <div className="nutrition-divider" />
          <div className="nutrition-row"><span>Sensitive Columns</span><strong style={{ color: h.sensitiveFound.length > 0 ? 'var(--amber-dark)' : 'var(--green)' }}>{h.sensitiveFound.length} found</strong></div>
          <div className="nutrition-row"><span>Groups Detected</span><strong>{h.groupBalance.length}</strong></div>
          <div className="nutrition-divider" />
          <div className="nutrition-sub-scores">
            <div><span className="text-xs text-secondary">Completeness</span><br /><strong style={{ color: scoreColor(h.completenessScore) }}>{h.completenessScore}%</strong></div>
            <div><span className="text-xs text-secondary">Uniqueness</span><br /><strong style={{ color: scoreColor(h.uniquenessScore) }}>{h.uniquenessScore}%</strong></div>
            <div><span className="text-xs text-secondary">Balance</span><br /><strong style={{ color: scoreColor(h.balanceScore) }}>{h.balanceScore}%</strong></div>
          </div>
        </div>
      </div>

      {/* Missing Values + Group Balance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        {/* Missing Values */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><AlertTriangle size={14} /> Missing Data by Column</span>
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {h.missingByCol.filter(c => c.missing > 0).length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center' }}>
                <CheckCircle size={16} style={{ color: 'var(--green)', marginBottom: 4 }} />
                <p className="text-sm text-secondary">No missing values detected!</p>
              </div>
            ) : (
              h.missingByCol.filter(c => c.missing > 0).sort((a, b) => b.missing - a.missing).map((col, i) => (
                <div key={i} className="nutrition-missing-row">
                  <span className="text-sm" style={{ flex: 1 }}>{col.column}</span>
                  <span className="font-mono text-sm" style={{ color: col.pct > 10 ? 'var(--red)' : 'var(--yellow)' }}>{col.pct}%</span>
                  <div className="compliance-progress-bar" style={{ width: 80 }}>
                    <div className="compliance-progress-fill" style={{ width: `${Math.min(col.pct, 100)}%`, background: col.pct > 10 ? 'var(--red)' : 'var(--yellow)' }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Group Balance */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><BarChart3 size={14} /> Group Balance{h.primarySensitive ? ` (${h.primarySensitive})` : ''}</span>
          </div>
          {h.groupBalance.length > 0 ? (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={h.groupBalance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                  <XAxis dataKey="group" tick={{ fontSize: 11 }} stroke="var(--gray-400)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--gray-400)" />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Count">
                    {h.groupBalance.map((_, i) => <Cell key={i} fill={i === 0 ? 'var(--blue)' : i === 1 ? 'var(--amber)' : 'var(--cyan)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-secondary" style={{ padding: 16 }}>No categorical groups detected.</p>
          )}
        </div>
      </div>

      {/* Sensitive Columns + Column Types */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        {/* Sensitive Columns */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Search size={14} /> Personal Characteristics Detected</span>
          </div>
          {h.sensitiveFound.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {h.sensitiveFound.map(col => (
                <span key={col} className="badge badge-warning" style={{ fontSize: '0.8125rem', padding: '6px 14px' }}>{col}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-secondary">No obvious personal characteristics detected. This is good, but verify manually.</p>
          )}
          <p className="text-xs text-tertiary" style={{ marginTop: 12 }}>
            These columns may contain personal characteristics that could lead to unfair treatment if used improperly in AI decisions.
          </p>
        </div>

        {/* Column Types */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Database size={14} /> Column Overview</span>
          </div>
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {h.typeInfo.map((col, i) => (
              <div key={i} className="nutrition-missing-row">
                <span className="text-sm" style={{ flex: 1 }}>{col.column}</span>
                <span className={`badge badge-${col.type === 'Numeric' ? 'info' : 'neutral'}`}>{col.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="agent-executive-summary" style={{ marginTop: 16 }}>
        <p>💡 <strong>What does this mean?</strong> This report helps you understand whether your data is balanced, complete, and ready for responsible AI use. A healthy dataset has minimal missing values, no excessive duplicates, and balanced representation across groups.</p>
      </div>
    </div>
  );
}
