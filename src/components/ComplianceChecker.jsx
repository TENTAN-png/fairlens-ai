import { useState, useCallback } from 'react';
import {
  ClipboardCheck, Play, CheckCircle, Loader, AlertTriangle,
  ChevronDown, ChevronUp, RefreshCw, Shield
} from 'lucide-react';
import { runComplianceCheck, FRAMEWORKS } from '../utils/agentOrchestrator';

const FRAMEWORK_LIST = Object.entries(FRAMEWORKS).map(([key, fw]) => ({
  key,
  ...fw
}));

export default function ComplianceChecker({ analysisResult }) {
  const [isRunning, setIsRunning] = useState(false);
  const [frameworkStates, setFrameworkStates] = useState({});
  const [results, setResults] = useState(null);
  const [expandedFramework, setExpandedFramework] = useState(null);
  const [error, setError] = useState('');

  const handleProgress = useCallback((frameworkId, status, data) => {
    setFrameworkStates(prev => ({
      ...prev,
      [frameworkId]: { status, data, timestamp: Date.now() }
    }));
  }, []);

  const runCheck = async () => {
    setIsRunning(true);
    setError('');
    setFrameworkStates({});
    setResults(null);
    setExpandedFramework(null);

    try {
      const checkResults = await runComplianceCheck(analysisResult, handleProgress);
      setResults(checkResults);
    } catch (err) {
      setError(`Compliance check failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (score) => {
    if (score >= 80) return 'var(--green)';
    if (score >= 60) return 'var(--yellow)';
    return 'var(--red)';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'compliant': return 'Compliant';
      case 'partial': return 'Partially Compliant';
      case 'non-compliant': return 'Non-Compliant';
      default: return status;
    }
  };

  if (!analysisResult) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon"><ClipboardCheck size={28} /></div>
          <h3>No Analysis Available</h3>
          <p>Run a bias analysis first to check compliance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Compliance Checker</h2>
          <p>Parallel AI agents evaluate your system against major fairness and transparency regulations</p>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={runCheck}
          disabled={isRunning}
          id="run-compliance-btn"
        >
          {isRunning ? <Loader size={16} className="spin-icon" /> : <Play size={16} />}
          {isRunning ? 'Checking...' : results ? 'Re-check' : 'Run Compliance Check'}
        </button>
      </div>

      {error && (
        <div className="card" style={{
          background: 'var(--danger-bg)', borderColor: '#fecaca',
          color: 'var(--danger)', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem'
        }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Framework Cards Grid - Parallel Agent View */}
      {!results && !isRunning && (
        <div className="compliance-grid">
          {FRAMEWORK_LIST.map(fw => (
            <div key={fw.key} className="card compliance-card-preview">
              <div className="compliance-card-icon">{fw.icon}</div>
              <h4>{fw.name}</h4>
              <p className="text-sm text-secondary">{fw.fullName}</p>
              <div className="compliance-card-status">
                <span className="badge badge-neutral">Pending</span>
              </div>
            </div>
          ))}
          <div className="compliance-start-overlay">
            <button className="btn btn-primary btn-lg" onClick={runCheck} id="start-compliance-btn">
              <Shield size={16} /> Check All Frameworks
            </button>
            <p className="text-xs text-tertiary" style={{ marginTop: 8 }}>
              4 AI agents run simultaneously to evaluate compliance
            </p>
          </div>
        </div>
      )}

      {/* Running State */}
      {isRunning && (
        <div className="compliance-grid">
          {FRAMEWORK_LIST.map(fw => {
            const state = frameworkStates[fw.key];
            const isComplete = state?.status === 'completed';
            return (
              <div key={fw.key} className={`card compliance-card-running ${isComplete ? 'complete' : 'checking'}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: '1.5rem' }}>{fw.icon}</span>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{fw.name}</h4>
                    <span className="text-xs text-tertiary">{fw.fullName}</span>
                  </div>
                  {isComplete
                    ? <CheckCircle size={18} style={{ color: 'var(--green)' }} />
                    : <Loader size={18} className="spin-icon" style={{ color: 'var(--blue)' }} />
                  }
                </div>
                {isComplete && state.data?.score !== undefined && (
                  <div className="compliance-progress-bar" style={{ marginTop: 8 }}>
                    <div className="compliance-progress-fill animate-in" style={{
                      width: `${state.data.score}%`,
                      background: getStatusColor(state.data.score)
                    }} />
                  </div>
                )}
                {!isComplete && (
                  <div className="compliance-progress-bar">
                    <div className="loading-bar-fill" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Results */}
      {results && !isRunning && (
        <div className="animate-in">
          {/* Overall Score */}
          <div className={`scorecard ${results.overallScore >= 70 ? 'good' : results.overallScore >= 50 ? 'warning' : 'danger'}`} style={{ marginBottom: 24 }}>
            <div className="scorecard-score" style={{
              background: results.overallScore >= 70 ? 'var(--green-bg)' : results.overallScore >= 50 ? 'var(--yellow-bg)' : 'var(--red-bg)',
              border: `2px solid ${getStatusColor(results.overallScore)}`
            }}>
              <span className="score-value" style={{ color: getStatusColor(results.overallScore) }}>
                {results.overallScore}%
              </span>
            </div>
            <div className="scorecard-info">
              <h3>Overall Compliance Score</h3>
              <p>Evaluated against 4 major regulatory frameworks</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={runCheck}>
              <RefreshCw size={12} /> Re-check
            </button>
          </div>

          {/* Framework Score Cards */}
          <div className="compliance-results-grid" style={{ marginBottom: 24 }}>
            {FRAMEWORK_LIST.map(fw => {
              const fwResult = results.frameworks?.[fw.key];
              if (!fwResult) return null;
              return (
                <div key={fw.key} className="compliance-score-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: '1.25rem' }}>{fw.icon}</span>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>{fw.name}</h4>
                      <span className="text-xs text-tertiary">{fw.fullName}</span>
                    </div>
                  </div>
                  <div className="compliance-score-display" style={{ textAlign: 'center', margin: '12px 0' }}>
                    <span className="compliance-big-score" style={{ color: getStatusColor(fwResult.score || 0) }}>
                      {fwResult.score || 0}%
                    </span>
                  </div>
                  <div className="compliance-progress-bar">
                    <div className="compliance-progress-fill" style={{
                      width: `${fwResult.score || 0}%`,
                      background: getStatusColor(fwResult.score || 0)
                    }} />
                  </div>
                  <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <span className={`badge badge-${fwResult.status === 'compliant' ? 'success' : fwResult.status === 'partial' ? 'warning' : 'danger'}`}>
                      {getStatusLabel(fwResult.status)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Results */}
          {FRAMEWORK_LIST.map(fw => {
            const fwResult = results.frameworks?.[fw.key];
            if (!fwResult) return null;
            const isExpanded = expandedFramework === fw.key;

            return (
              <div key={fw.key} className="agent-result-card" style={{ marginBottom: 12 }}>
                <div
                  className="agent-result-header"
                  onClick={() => setExpandedFramework(isExpanded ? null : fw.key)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.125rem' }}>{fw.icon}</span>
                    <div>
                      <h4 className="agent-result-name">{fw.name}</h4>
                      <span className="text-xs text-tertiary">{fwResult.summary}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge badge-${fwResult.status === 'compliant' ? 'success' : fwResult.status === 'partial' ? 'warning' : 'danger'}`}>
                      {fwResult.score}%
                    </span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="agent-result-body animate-in">
                    <div className="agent-output-content">
                      {/* Articles / Requirements / Functions / Clauses */}
                      {(fwResult.articles || fwResult.requirements || fwResult.functions || fwResult.clauses)?.map((item, i) => {
                        const name = item.article || item.requirement || item.function || item.clause;
                        const title = item.name || '';
                        const finding = item.finding || item.findings?.join('; ') || '';
                        const status = item.status;
                        return (
                          <div key={i} className="compliance-item-row" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 0', borderBottom: '1px solid var(--gray-100)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {status === 'pass' ? <CheckCircle size={14} style={{ color: 'var(--green)' }} /> :
                                 status === 'warning' ? <AlertTriangle size={14} style={{ color: 'var(--yellow)' }} /> :
                                 status === 'fail' ? <AlertTriangle size={14} style={{ color: 'var(--red)' }} /> :
                                 <CheckCircle size={14} style={{ color: 'var(--gray-400)' }} />}
                                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                                  {name}{title ? ` — ${title}` : ''}
                                </span>
                              </div>
                              <span className={`badge badge-${status === 'pass' ? 'success' : status === 'warning' ? 'warning' : 'danger'}`}>
                                {status === 'pass' ? 'Pass' : status === 'warning' ? 'Warning' : 'Fail'}
                              </span>
                            </div>
                            {finding && (
                              <div style={{ paddingLeft: 22 }}>
                                <p className="text-xs text-secondary" style={{ margin: 0, lineHeight: 1.4 }}>{finding}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Recommendations */}
                      {fwResult.recommendations?.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <span className="agent-output-label" style={{ marginBottom: 8, display: 'block' }}>Recommendations</span>
                          <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
                            {fwResult.recommendations.map((r, idx) => (
                              <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6, fontSize: '0.8125rem', color: 'var(--gray-700)' }}>
                                <span style={{ color: 'var(--blue)', fontWeight: 'bold' }}>&rarr;</span>
                                <span style={{ flex: 1, lineHeight: 1.4 }}>{r.replace(/^(\s*→\s*|\s*•\s*|-)\s*/, '')}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
