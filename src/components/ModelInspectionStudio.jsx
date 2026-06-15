import { useState } from 'react';
import {
  Upload, Cpu, ShieldAlert, Sparkles, RefreshCw, BarChart3,
  GitCompare, Play, CheckCircle, AlertTriangle, XCircle, Download,
  TrendingUp, Info, HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  auditModel,
  checkModelConsistency,
  explainModel,
  compareModels,
  mitigateModel
} from '../utils/backendAPI';

const TABS = [
  { id: 'audit', name: 'Prediction Auditing', icon: BarChart3, desc: 'Assess performance and fairness metrics of model outcomes.' },
  { id: 'consistency', name: 'Consistency Check', icon: RefreshCw, desc: 'Analyze individual decisions for counterfactual consistency when sensitive values change.' },
  { id: 'explain', name: 'Explainability (SHAP)', icon: Sparkles, desc: 'Discover key feature drivers influencing model decisions.' },
  { id: 'compare', name: 'Comparison Studio', icon: GitCompare, desc: 'Compare multiple models side-by-side on performance and fairness.' },
  { id: 'mitigate', name: 'Bias Mitigation', icon: Cpu, desc: 'Train mitigated models using Fairlearn to enforce demographic constraints.' }
];

export default function ModelInspectionStudio() {
  const [activeTab, setActiveTab] = useState('audit');
  
  // Files and configurations
  const [datasetFile, setDatasetFile] = useState(null);
  const [modelFile, setModelFile] = useState(null);
  const [modelBFile, setModelBFile] = useState(null); // for comparison
  
  const [config, setConfig] = useState({
    targetCol: 'Approved',
    sensitiveCol: 'Gender',
    favorableValue: '1',
    privilegedValue: 'Male'
  });

  // State for loaded data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [auditResult, setAuditResult] = useState(null);
  const [consistencyResult, setConsistencyResult] = useState(null);
  const [explainResult, setExplainResult] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [mitigateResult, setMitigateResult] = useState(null);

  const handleConfigChange = (field, val) => {
    setConfig(prev => ({ ...prev, [field]: val }));
  };

  const loadSampleFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const datasetRes = await fetch('/sample_credit_dataset.csv');
      if (!datasetRes.ok) throw new Error('Failed to fetch dataset');
      const datasetBlob = await datasetRes.blob();
      const datasetFileObj = new File([datasetBlob], 'sample_credit_dataset.csv', { type: 'text/csv' });
      setDatasetFile(datasetFileObj);

      const modelRes = await fetch('/sample_credit_model.pkl');
      if (!modelRes.ok) throw new Error('Failed to fetch model');
      const modelBlob = await modelRes.blob();
      const modelFileObj = new File([modelBlob], 'sample_credit_model.pkl', { type: 'application/octet-stream' });
      setModelFile(modelFileObj);

      setConfig({
        targetCol: 'Approved',
        sensitiveCol: 'Gender',
        favorableValue: '1',
        privilegedValue: 'Male'
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load sample files. Please check if they are in the public folder.');
    } finally {
      setLoading(false);
    }
  };


  const executeTabAction = async (tabId = activeTab) => {
    if (!datasetFile) {
      setError('Please upload a test dataset CSV/Excel first.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (tabId === 'audit') {
        const data = await auditModel(datasetFile, modelFile, config);
        setAuditResult(data);
      } else if (tabId === 'consistency') {
        const data = await checkModelConsistency(datasetFile, modelFile, config);
        setConsistencyResult(data);
      } else if (tabId === 'explain') {
        const data = await explainModel(datasetFile, modelFile, config);
        setExplainResult(data);
      } else if (tabId === 'compare') {
        const data = await compareModels(datasetFile, modelFile, modelBFile, config);
        setComparisonResult(data);
      } else if (tabId === 'mitigate') {
        const data = await mitigateModel(datasetFile, modelFile, config);
        setMitigateResult(data);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Operation failed. Please ensure the backend is running on http://localhost:8000');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Auto-trigger analysis if data already uploaded and tab result is empty
    if (datasetFile) {
      if (tabId === 'audit' && !auditResult) executeTabAction(tabId);
      if (tabId === 'consistency' && !consistencyResult) executeTabAction(tabId);
      if (tabId === 'explain' && !explainResult) executeTabAction(tabId);
      if (tabId === 'compare' && !comparisonResult) executeTabAction(tabId);
      if (tabId === 'mitigate' && !mitigateResult) executeTabAction(tabId);
    }
  };

  const downloadMitigatedModel = () => {
    if (!mitigateResult?.mitigatedModelB64) return;
    try {
      const b64 = mitigateResult.mitigatedModelB64;
      const binStr = window.atob(b64);
      const len = binStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'mitigated_model.pkl';
      link.click();
    } catch (e) {
      console.error("Failed to download model", e);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Software Model Inspector</h2>
        <p>Inspect, audit, explain, and mitigate bias in traditional machine learning models (.pkl, .joblib) using real-time predictions.</p>
      </div>

      {/* Upload and Configuration Header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={16} /> Model & Dataset Inputs
          </span>
          <button className="btn btn-secondary btn-sm" onClick={loadSampleFiles} disabled={loading}>
            <Sparkles size={12} style={{ marginRight: 4 }} /> Load Sample Files
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
          {/* File Uploads */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="text-xs text-secondary" style={{ display: 'block', marginBottom: 4 }}>
                1. Test Dataset (CSV / Excel) <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input 
                type="file" 
                accept=".csv,.xlsx,.xls" 
                onChange={(e) => setDatasetFile(e.target.files[0])}
                className="input" 
                style={{ fontSize: '0.8125rem' }}
              />
            </div>
            <div>
              <label className="text-xs text-secondary" style={{ display: 'block', marginBottom: 4 }}>
                2. Primary Model File (Pickle / Joblib - Optional)
              </label>
              <input 
                type="file" 
                accept=".pkl,.joblib,.h5,.pt" 
                onChange={(e) => setModelFile(e.target.files[0])}
                className="input" 
                style={{ fontSize: '0.8125rem' }}
              />
              <span className="text-xs text-tertiary" style={{ marginTop: 2, display: 'block' }}>
                💡 If omitted, FairLens will auto-train a Random Forest classifier for audit demonstration.
              </span>
            </div>

            {activeTab === 'compare' && (
              <div>
                <label className="text-xs text-secondary" style={{ display: 'block', marginBottom: 4 }}>
                  3. Alternative Model B File (Optional)
                </label>
                <input 
                  type="file" 
                  accept=".pkl,.joblib,.h5,.pt" 
                  onChange={(e) => setModelBFile(e.target.files[0])}
                  className="input" 
                  style={{ fontSize: '0.8125rem' }}
                />
              </div>
            )}
          </div>

          {/* Model Mapping Configuration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="text-xs text-secondary" style={{ display: 'block', marginBottom: 4 }}>Target Column</label>
              <input 
                type="text" 
                value={config.targetCol} 
                onChange={(e) => handleConfigChange('targetCol', e.target.value)} 
                className="input" 
                placeholder="e.g. Approved" 
              />
            </div>
            <div>
              <label className="text-xs text-secondary" style={{ display: 'block', marginBottom: 4 }}>Sensitive Column</label>
              <input 
                type="text" 
                value={config.sensitiveCol} 
                onChange={(e) => handleConfigChange('sensitiveCol', e.target.value)} 
                className="input" 
                placeholder="e.g. Gender" 
              />
            </div>
            <div>
              <label className="text-xs text-secondary" style={{ display: 'block', marginBottom: 4 }}>Favorable Value</label>
              <input 
                type="text" 
                value={config.favorableValue} 
                onChange={(e) => handleConfigChange('favorableValue', e.target.value)} 
                className="input" 
                placeholder="e.g. 1" 
              />
            </div>
            <div>
              <label className="text-xs text-secondary" style={{ display: 'block', marginBottom: 4 }}>Privileged Value</label>
              <input 
                type="text" 
                value={config.privilegedValue} 
                onChange={(e) => handleConfigChange('privilegedValue', e.target.value)} 
                className="input" 
                placeholder="e.g. Male" 
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <button 
            className="btn btn-primary" 
            onClick={() => executeTabAction()} 
            disabled={loading || !datasetFile}
          >
            {loading ? <span className="spin-icon" style={{ marginRight: 6 }}>🔄</span> : <Play size={14} style={{ marginRight: 6 }} />}
            {loading ? 'Evaluating Model...' : 'Execute Model Inspection'}
          </button>
        </div>

        {error && (
          <div className="alert-message danger" style={{ marginTop: 12, padding: 12, borderRadius: 6, display: 'flex', gap: 8 }}>
            <AlertTriangle size={16} />
            <div style={{ fontSize: '0.8125rem' }}>{error}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="card" style={{ padding: 6, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6 }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`card-header ${active ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: active ? '1px solid var(--accent)' : '1px solid transparent',
                  background: active ? 'var(--card-active-bg, rgba(99, 102, 241, 0.15))' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  gap: 8,
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={16} style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)' }} />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State warning */}
      {!datasetFile && (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Cpu size={32} style={{ margin: '0 auto 12px', color: 'var(--accent)', opacity: 0.8 }} />
          <h3>Awaiting Model Inputs</h3>
          <p style={{ maxWidth: 460, margin: '6px auto 12px', fontSize: '0.875rem' }}>
            Please select a test dataset file and configure mappings above. You can also upload your own pre-trained python model binary.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            <button className="btn btn-primary" onClick={loadSampleFiles} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} />
              Load Sample Model & Dataset
            </button>
            <a href="/sample_credit_dataset.csv" download className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} />
              Download Sample CSV
            </a>
            <a href="/sample_credit_model.pkl" download className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} />
              Download Sample Model (.pkl)
            </a>
          </div>
        </div>
      )}

      {datasetFile && !loading && (
        <>
          {/* Tab 1: Prediction Auditing */}
          {activeTab === 'audit' && auditResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Scorecard */}
              <div className={`scorecard ${auditResult.fairnessScore >= 80 ? 'good' : auditResult.fairnessScore >= 60 ? 'warning' : 'danger'}`}>
                <div className="scorecard-score" style={{ border: `2px solid ${auditResult.fairnessScore >= 80 ? 'var(--green)' : auditResult.fairnessScore >= 60 ? 'var(--yellow)' : 'var(--red)'}` }}>
                  <span className="score-value" style={{ color: auditResult.fairnessScore >= 80 ? 'var(--green)' : auditResult.fairnessScore >= 60 ? 'var(--yellow)' : 'var(--red)' }}>
                    {auditResult.fairnessScore}%
                  </span>
                </div>
                <div className="scorecard-info">
                  <h3>Model Fairness Health: {auditResult.fairnessScore}%</h3>
                  <p>Risk Rating: <strong style={{ textTransform: 'capitalize' }}>{auditResult.riskLevel}</strong> — Inspected model outcomes for target <strong>{config.targetCol}</strong> on sensitive field <strong>{config.sensitiveCol}</strong>.</p>
                </div>
              </div>

              {/* Grid Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div className="card">
                  <span className="text-xs text-secondary">Model Accuracy</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '4px 0 0' }}>{(auditResult.accuracy * 100).toFixed(1)}%</div>
                  <span className="text-xs text-tertiary">Correctly classified records</span>
                </div>
                <div className="card">
                  <span className="text-xs text-secondary">Disparate Impact Ratio</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '4px 0 0' }}>{auditResult.disparateImpact.toFixed(3)}</div>
                  <span className="text-xs text-tertiary">Ideal range: 0.80 - 1.25</span>
                </div>
                <div className="card">
                  <span className="text-xs text-secondary">Statistical Parity Diff</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '4px 0 0', color: Math.abs(auditResult.statisticalParityDifference) > 0.1 ? 'var(--red)' : 'inherit' }}>
                    {auditResult.statisticalParityDifference.toFixed(3)}
                  </div>
                  <span className="text-xs text-tertiary">Ideal value: 0.00</span>
                </div>
                <div className="card">
                  <span className="text-xs text-secondary">Equal Opportunity Diff</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '4px 0 0' }}>{auditResult.equalOpportunityDifference.toFixed(3)}</div>
                  <span className="text-xs text-tertiary">TPR Disparity between groups</span>
                </div>
              </div>

              {/* Group Distribution Tables */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Audited Group Distributions</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                        <th style={{ padding: 12 }}>Group ({config.sensitiveCol})</th>
                        <th style={{ padding: 12 }}>Audited Records</th>
                        <th style={{ padding: 12 }}>Favorable Outcomes</th>
                        <th style={{ padding: 12 }}>Selection Rate</th>
                        <th style={{ padding: 12 }}>True Positive Rate (TPR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(auditResult.groupRates).map(([groupName, groupStats]) => (
                        <tr key={groupName} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: 12, fontWeight: 600 }}>
                            {groupName} {groupName === config.privilegedValue && <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>Privileged</span>}
                          </td>
                          <td style={{ padding: 12 }}>{groupStats.total}</td>
                          <td style={{ padding: 12 }}>{groupStats.favorable}</td>
                          <td style={{ padding: 12 }}>{(groupStats.rate * 100).toFixed(1)}%</td>
                          <td style={{ padding: 12 }}>{(groupStats.tpr * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Consistency Check */}
          {activeTab === 'consistency' && consistencyResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className={`scorecard ${consistencyResult.consistencyScore >= 90 ? 'good' : consistencyResult.consistencyScore >= 75 ? 'warning' : 'danger'}`}>
                <div className="scorecard-score" style={{ border: `2px solid ${consistencyResult.consistencyScore >= 90 ? 'var(--green)' : 'var(--red)'}` }}>
                  <span className="score-value" style={{ color: consistencyResult.consistencyScore >= 90 ? 'var(--green)' : 'var(--red)' }}>
                    {consistencyResult.consistencyScore}%
                  </span>
                </div>
                <div className="scorecard-info">
                  <h3>Individual Decision Consistency: {consistencyResult.consistencyScore}%</h3>
                  <p>In {consistencyResult.consistencyScore}% of tested records, swapping the sensitive characteristic (from <strong>{config.privilegedValue}</strong> to unprivileged or vice-versa) did not alter the model outcome.</p>
                </div>
              </div>

              {/* Persona Grid */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Counterfactual Outcome Flipping Cases</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 12 }}>
                  {consistencyResult.comparisons.map((c) => (
                    <div key={c.id} className={`consistency-persona-card ${c.isConsistent ? 'ok' : 'concern'}`} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{c.name}</span>
                        {c.isConsistent ? (
                          <span className="text-xs" style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={14} /> Consistent
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <XCircle size={14} /> Outcome Flipped
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--gray-50)', padding: 10, borderRadius: 6 }}>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          <div className="text-xs text-secondary">{config.sensitiveCol}: <strong>{c.originalGroup}</strong></div>
                          <span className={`badge badge-${c.originalOutcome === 'Approved' ? 'success' : 'danger'}`} style={{ marginTop: 4 }}>{c.originalOutcome}</span>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--gray-300)' }}>➔</div>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          <div className="text-xs text-secondary">{config.sensitiveCol}: <strong>{c.flippedGroup}</strong></div>
                          <span className={`badge badge-${c.flippedOutcome === 'Approved' ? 'success' : 'danger'}`} style={{ marginTop: 4 }}>{c.flippedOutcome}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Explainability */}
          {activeTab === 'explain' && explainResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Explainable Model Analysis (Feature Contribution)</span>
                </div>
                <p className="text-xs text-secondary" style={{ marginBottom: 16 }}>
                  Determines feature dependencies using predictions. Stronger bars suggest features that carry higher weight in decisions.
                </p>

                <div style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={explainResult.featureImportances} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" unit="%" />
                      <YAxis dataKey="friendlyName" type="category" width={120} style={{ fontSize: '0.8125rem' }} />
                      <Tooltip formatter={(value) => [`${value}%`, 'Contribution Strength']} />
                      <Bar dataKey="importance" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Explanations List */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Governance Diagnostics</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                  {explainResult.featureImportances.map((item) => (
                    <div key={item.feature} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, border: '1px solid var(--border)', borderRadius: 6 }}>
                      <div>
                        <strong>{item.friendlyName}</strong>
                        <div className="text-xs text-secondary" style={{ marginTop: 2 }}>{item.description}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {item.isSensitive && <span className="badge badge-danger">Sensitive Field</span>}
                        <span style={{ fontWeight: 700 }}>{item.importance}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Comparison Studio */}
          {activeTab === 'compare' && comparisonResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Top Compare Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
                <div className="card" style={{ textAlign: 'center', borderTop: '3px solid var(--accent)' }}>
                  <span className="text-xs text-secondary">Model A (Primary)</span>
                  <h3 style={{ margin: '4px 0' }}>{comparisonResult.modelA.modelName}</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>{(comparisonResult.modelA.accuracy * 100).toFixed(1)}%</div>
                  <div className="text-xs text-tertiary">Fairness Score: <strong>{comparisonResult.modelA.fairnessScore}%</strong></div>
                </div>

                <div style={{ textAlign: 'center', fontWeight: 900, color: 'var(--border)', fontSize: '1.5rem' }}>VS</div>

                <div className="card" style={{ textAlign: 'center', borderTop: '3px solid var(--green)' }}>
                  <span className="text-xs text-secondary">Model B (Alternative)</span>
                  <h3 style={{ margin: '4px 0' }}>{comparisonResult.modelB.modelName}</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--green)' }}>{(comparisonResult.modelB.accuracy * 100).toFixed(1)}%</div>
                  <div className="text-xs text-tertiary">Fairness Score: <strong>{comparisonResult.modelB.fairnessScore}%</strong></div>
                </div>
              </div>

              {/* Side-by-side Table */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Metrics Faceoff</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                        <th style={{ padding: 12 }}>Metric</th>
                        <th style={{ padding: 12 }}>Model A</th>
                        <th style={{ padding: 12 }}>Model B</th>
                        <th style={{ padding: 12 }}>Comparison Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: 12, fontWeight: 600 }}>Accuracy Score</td>
                        <td style={{ padding: 12 }}>{(comparisonResult.modelA.accuracy * 100).toFixed(1)}%</td>
                        <td style={{ padding: 12 }}>{(comparisonResult.modelB.accuracy * 100).toFixed(1)}%</td>
                        <td style={{ padding: 12 }}>
                          {comparisonResult.modelA.accuracy > comparisonResult.modelB.accuracy ? 'Model A leads (+ ' + ((comparisonResult.modelA.accuracy - comparisonResult.modelB.accuracy)*100).toFixed(1) + '%)' : 'Model B leads (+ ' + ((comparisonResult.modelB.accuracy - comparisonResult.modelA.accuracy)*100).toFixed(1) + '%)'}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: 12, fontWeight: 600 }}>Fairness Health Score</td>
                        <td style={{ padding: 12 }}>{comparisonResult.modelA.fairnessScore}%</td>
                        <td style={{ padding: 12 }}>{comparisonResult.modelB.fairnessScore}%</td>
                        <td style={{ padding: 12 }}>
                          {comparisonResult.modelA.fairnessScore > comparisonResult.modelB.fairnessScore ? 'Model A is fairer' : 'Model B is fairer'}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: 12, fontWeight: 600 }}>Disparate Impact</td>
                        <td style={{ padding: 12 }}>{comparisonResult.modelA.disparateImpact.toFixed(3)}</td>
                        <td style={{ padding: 12 }}>{comparisonResult.modelB.disparateImpact.toFixed(3)}</td>
                        <td style={{ padding: 12 }}>
                          {Math.abs(1 - comparisonResult.modelA.disparateImpact) < Math.abs(1 - comparisonResult.modelB.disparateImpact) ? 'Model A closer to parity' : 'Model B closer to parity'}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: 12, fontWeight: 600 }}>Statistical Parity Diff</td>
                        <td style={{ padding: 12 }}>{comparisonResult.modelA.statisticalParityDifference.toFixed(3)}</td>
                        <td style={{ padding: 12 }}>{comparisonResult.modelB.statisticalParityDifference.toFixed(3)}</td>
                        <td style={{ padding: 12 }}>
                          {Math.abs(comparisonResult.modelA.statisticalParityDifference) < Math.abs(comparisonResult.modelB.statisticalParityDifference) ? 'Model A has less bias' : 'Model B has less bias'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Bias Mitigation */}
          {activeTab === 'mitigate' && mitigateResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {/* Before Card */}
                <div className="card" style={{ borderTop: '3px solid var(--red)' }}>
                  <div className="card-header">
                    <span className="card-title" style={{ color: 'var(--red)' }}>Before Mitigation</span>
                  </div>
                  <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--red)', margin: '10px 0' }}>
                    {mitigateResult.before.fairnessScore}%
                  </div>
                  <div className="text-xs text-secondary">Fairness Score</div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 8 }}>
                    <span>Accuracy:</span>
                    <strong>{(mitigateResult.before.accuracy * 100).toFixed(1)}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span>Disparate Impact:</span>
                    <strong>{mitigateResult.before.disparateImpact.toFixed(3)}</strong>
                  </div>
                </div>

                {/* After Card */}
                <div className="card" style={{ borderTop: '3px solid var(--green)' }}>
                  <div className="card-header">
                    <span className="card-title" style={{ color: 'var(--green)' }}>After Mitigate (Fairlearn)</span>
                    <button className="btn btn-secondary btn-sm" onClick={downloadMitigatedModel}>
                      <Download size={14} style={{ marginRight: 4 }} /> Download .pkl
                    </button>
                  </div>
                  <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--green)', margin: '10px 0' }}>
                    {mitigateResult.after.fairnessScore}%
                  </div>
                  <div className="text-xs text-secondary">Fairness Score</div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 8 }}>
                    <span>Accuracy:</span>
                    <strong>{(mitigateResult.after.accuracy * 100).toFixed(1)}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span>Disparate Impact:</span>
                    <strong>{mitigateResult.after.disparateImpact.toFixed(3)}</strong>
                  </div>
                </div>
              </div>

              {/* Progress Summary */}
              <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 18, background: 'var(--green-bg)', border: '1px solid var(--green)' }}>
                <div>
                  <h4 style={{ color: 'var(--green)', margin: 0 }}>🎉 Demographic Fairness Improved</h4>
                  <p className="text-xs text-secondary" style={{ marginTop: 4 }}>
                    By applying an exponentiated gradient demographic parity constraint, model parity score increased by{' '}
                    <strong>{mitigateResult.after.fairnessScore - mitigateResult.before.fairnessScore} percentage points</strong>.
                  </p>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--green)' }}>
                  +{mitigateResult.after.fairnessScore - mitigateResult.before.fairnessScore}%
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Loading Spinner overlay */}
      {loading && (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <span className="spin-icon" style={{ fontSize: '2rem', display: 'block', margin: '0 auto 12px' }}>🔄</span>
          <h3>Processing Model Auditing</h3>
          <p className="text-xs text-secondary">Extracting predictions and parsing mathematical disparities. This may take a few seconds...</p>
        </div>
      )}
    </div>
  );
}
