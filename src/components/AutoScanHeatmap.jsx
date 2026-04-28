import { useState, useMemo } from 'react';
import { Grid, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { runFullAnalysis, detectSensitiveColumns, detectTargetColumns } from '../utils/biasMetrics';

export default function AutoScanHeatmap({ parsedData }) {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);

  if (!parsedData) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon"><Grid size={28} /></div>
          <h3>No Data Loaded</h3>
          <p>Upload a dataset first to auto-scan all column pairs.</p>
        </div>
      </div>
    );
  }

  const runScan = async () => {
    setScanning(true);
    await new Promise(r => setTimeout(r, 200));

    const sensitives = detectSensitiveColumns(parsedData.columns);
    const targets = detectTargetColumns(parsedData.columns);
    const allCategorical = parsedData.columns.filter(col => {
      const uniq = [...new Set(parsedData.data.map(r => r[col]).filter(v => v != null))];
      return uniq.length >= 2 && uniq.length <= 20;
    });

    const sensitiveCols = sensitives.length > 0 ? sensitives : allCategorical.slice(0, 4);
    const targetCols = targets.length > 0 ? targets : allCategorical.filter(c => !sensitiveCols.includes(c)).slice(0, 4);

    const scanResults = [];

    for (const sens of sensitiveCols) {
      for (const tgt of targetCols) {
        if (sens === tgt) continue;
        try {
          const values = [...new Set(parsedData.data.map(r => r[tgt]).filter(v => v != null))];
          const sensValues = [...new Set(parsedData.data.map(r => r[sens]).filter(v => v != null))];
          if (values.length < 2 || sensValues.length < 2) continue;

          const favorable = values[0];
          const privileged = sensValues[0];

          const result = runFullAnalysis(parsedData.data, sens, tgt, String(favorable), String(privileged));
          scanResults.push({
            sensitive: sens,
            target: tgt,
            score: result.fairnessScore,
            di: result.disparateImpact,
            spd: result.statisticalParityDiff,
            severity: result.severity.level,
            label: result.severity.label
          });
        } catch (e) {
          // Skip invalid combos
        }
      }
    }

    setResults(scanResults);
    setScanning(false);
  };

  const getColor = (score) => {
    if (score >= 70) return { bg: 'var(--green-bg)', color: 'var(--green)', text: 'Fair' };
    if (score >= 40) return { bg: 'var(--yellow-bg)', color: 'var(--amber-dark)', text: 'Warning' };
    return { bg: 'var(--red-bg)', color: 'var(--red)', text: 'Biased' };
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Auto-Scan Heatmap</h2>
        <p>Automatically scan all column pairs for potential bias</p>
      </div>

      {!results && !scanning && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto 12px', background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Grid size={22} style={{ color: 'var(--blue)' }} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: 4 }}>Ready to Scan</h3>
          <p className="text-secondary" style={{ maxWidth: 420, margin: '0 auto 20px', fontSize: '0.875rem' }}>
            Scans all sensitive × target column combinations and generates a bias heatmap.
          </p>
          <button className="btn btn-primary btn-lg" onClick={runScan}>
            <Grid size={16} /> Start Auto-Scan
          </button>
        </div>
      )}

      {scanning && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Scanning all column pairs...</p>
          <div className="loading-bar" style={{ maxWidth: 280 }}><div className="loading-bar-fill"></div></div>
        </div>
      )}

      {results && (
        <div className="animate-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span className="text-sm text-secondary">{results.length} combinations scanned</span>
            <button className="btn btn-sm btn-secondary" onClick={runScan}><Loader size={12} /> Rescan</button>
          </div>

          {results.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 32 }}>
              <p className="text-secondary">No valid column pairs found. Ensure your dataset has categorical columns.</p>
            </div>
          ) : (
            <div className="heatmap-grid">
              {results.sort((a, b) => a.score - b.score).map((r, i) => {
                const style = getColor(r.score);
                return (
                  <div key={i} className="card heatmap-cell" style={{ background: style.bg, borderLeft: `4px solid ${style.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--gray-900)' }}>{r.sensitive}</div>
                        <div className="text-xs text-tertiary">→ {r.target}</div>
                      </div>
                      <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: style.color }}>{r.score}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span className="text-xs">DI: <strong className="font-mono">{r.di?.toFixed(3) ?? 'N/A'}</strong></span>
                      <span className="text-xs">SPD: <strong className="font-mono">{r.spd?.toFixed(4) ?? 'N/A'}</strong></span>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      {r.severity === 'good'
                        ? <span className="badge badge-success"><CheckCircle size={10} /> {r.label}</span>
                        : <span className={`badge badge-${r.severity === 'warning' ? 'warning' : 'danger'}`}><AlertTriangle size={10} /> {r.label}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
