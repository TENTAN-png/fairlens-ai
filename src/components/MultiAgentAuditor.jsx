import { useState, useCallback } from 'react';
import {
  Cpu, Play, CheckCircle, Loader, AlertTriangle, ChevronDown, ChevronUp,
  ArrowRight, Zap, RefreshCw, Server
} from 'lucide-react';
import { runFullAuditPipeline, AGENTS } from '../utils/agentOrchestrator';
import { runMultiAgentAudit, isBackendAvailable } from '../utils/backendAPI';

const AGENT_PIPELINE = [
  { key: 'biasDetector', ...AGENTS.biasDetector },
  { key: 'rootCauseAnalyzer', ...AGENTS.rootCauseAnalyzer },
  { key: 'complianceAuditor', ...AGENTS.complianceAuditor },
  { key: 'mitigationAdvisor', ...AGENTS.mitigationAdvisor },
  { key: 'reportGenerator', ...AGENTS.reportGenerator }
];

export default function MultiAgentAuditor({ analysisResult }) {
  const [isRunning, setIsRunning] = useState(false);
  const [agentStates, setAgentStates] = useState({});
  const [results, setResults] = useState(null);
  const [backendResults, setBackendResults] = useState(null); // real backend results
  const [auditSource, setAuditSource] = useState('');
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [error, setError] = useState('');

  const handleProgress = useCallback((agentId, status, data) => {
    setAgentStates(prev => ({
      ...prev,
      [agentId]: { status, data, timestamp: Date.now() }
    }));
  }, []);

  const runAudit = async () => {
    setIsRunning(true);
    setError('');
    setAgentStates({});
    setResults(null);
    setBackendResults(null);
    setExpandedAgent(null);

    try {
      // Try real Python backend first
      if (isBackendAvailable() && analysisResult) {
        try {
          const backendData = await runMultiAgentAudit(analysisResult);
          setBackendResults(backendData);
          setAuditSource('backend');
          setIsRunning(false);
          return;
        } catch (backendErr) {
          console.warn('Backend audit failed, falling back to JS:', backendErr.message);
        }
      }
      // Fallback: local JS orchestrator
      const pipelineResults = await runFullAuditPipeline(analysisResult, handleProgress);
      setResults(pipelineResults);
      setAuditSource('local');
    } catch (err) {
      setError(`Audit failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getAgentStatus = (agentId) => {
    return agentStates[agentId]?.status || 'pending';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'started': return <Loader size={14} className="spin-icon" />;
      case 'completed': return <CheckCircle size={14} />;
      default: return <div className="agent-pending-dot" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'started': return 'agent-running';
      case 'completed': return 'agent-completed';
      default: return 'agent-pending';
    }
  };

  if (!analysisResult) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon"><Cpu size={28} /></div>
          <h3>No Analysis Available</h3>
          <p>Run a bias analysis first to use the Multi-Agent Auditor.</p>
        </div>
      </div>
    );
  }

  const renderAgentOutput = (agentKey, agentData) => {
    if (!agentData) return null;

    switch (agentKey) {
      case 'biasDetector':
        return (
          <div className="agent-output-content">
            <div className="agent-output-row">
              <span className="agent-output-label">Bias Detected</span>
              <span className={`badge badge-${agentData.biasDetected ? 'danger' : 'success'}`}>
                {agentData.biasDetected ? 'Yes' : 'No'}
              </span>
            </div>
            {agentData.biasType && (
              <div className="agent-output-row">
                <span className="agent-output-label">Type</span>
                <span className="agent-output-value">{agentData.biasType}</span>
              </div>
            )}
            <div className="agent-output-row">
              <span className="agent-output-label">Severity</span>
              <span className={`badge badge-${agentData.severity === 'low' ? 'success' : agentData.severity === 'moderate' ? 'warning' : 'danger'}`}>
                {agentData.severity}
              </span>
            </div>
            {agentData.affectedGroups?.length > 0 && (
              <div className="agent-output-row">
                <span className="agent-output-label">Affected Groups</span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {agentData.affectedGroups.map(g => (
                    <span key={g} className="badge badge-danger">{g}</span>
                  ))}
                </div>
              </div>
            )}
            {agentData.summary && <p className="agent-summary">{agentData.summary}</p>}
            {agentData.details && (
              <ul className="agent-findings-list">
                {agentData.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            )}
          </div>
        );

      case 'rootCauseAnalyzer':
        return (
          <div className="agent-output-content">
            {agentData.rootCauses?.map((cause, i) => (
              <div key={i} className="agent-cause-card">
                <div className="agent-cause-header">
                  <span className="agent-cause-name">{cause.factor}</span>
                  <span className="agent-cause-pct">{cause.contribution}</span>
                </div>
                <p className="agent-cause-desc">{cause.explanation}</p>
                <div className="agent-cause-bar">
                  <div className="agent-cause-bar-fill" style={{ width: cause.contribution }} />
                </div>
              </div>
            ))}
            {agentData.proxyVariables?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <span className="agent-output-label" style={{ marginBottom: 8, display: 'block' }}>Possible Proxy Variables</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {agentData.proxyVariables.map(v => (
                    <span key={v} className="badge badge-warning">{v}</span>
                  ))}
                </div>
              </div>
            )}
            {agentData.summary && <p className="agent-summary">{agentData.summary}</p>}
          </div>
        );

      case 'complianceAuditor':
        return (
          <div className="agent-output-content">
            {agentData.overallScore !== undefined && (
              <div className="agent-compliance-overall">
                <span className="agent-compliance-score" style={{
                  color: agentData.overallScore >= 70 ? 'var(--green)' : agentData.overallScore >= 50 ? 'var(--yellow)' : 'var(--red)'
                }}>
                  {agentData.overallScore}%
                </span>
                <span className="text-secondary text-sm">Overall Compliance</span>
              </div>
            )}
            {agentData.frameworks?.map((fw, i) => (
              <div key={i} className="agent-compliance-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{fw.name}</span>
                  <span className={`badge badge-${fw.status === 'compliant' ? 'success' : fw.status === 'partial' ? 'warning' : 'danger'}`}>
                    {fw.score}/100
                  </span>
                </div>
                <div className="compliance-progress-bar">
                  <div className="compliance-progress-fill" style={{
                    width: `${fw.score}%`,
                    background: fw.score >= 70 ? 'var(--green)' : fw.score >= 50 ? 'var(--yellow)' : 'var(--red)'
                  }} />
                </div>
              </div>
            ))}
            {agentData.summary && <p className="agent-summary">{agentData.summary}</p>}
          </div>
        );

      case 'mitigationAdvisor':
        return (
          <div className="agent-output-content">
            {agentData.estimatedScoreAfter !== undefined && (
              <div className="agent-output-row" style={{ marginBottom: 16 }}>
                <span className="agent-output-label">Estimated Score After Fixes</span>
                <span className="badge badge-success" style={{ fontSize: '0.875rem', padding: '4px 12px' }}>
                  {agentData.estimatedScoreAfter}/100
                </span>
              </div>
            )}
            {agentData.strategies?.map((s, i) => (
              <div key={i} className="agent-strategy-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{s.name}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className={`badge badge-${s.priority === 'high' ? 'danger' : s.priority === 'medium' ? 'warning' : 'info'}`}>
                      {s.priority} priority
                    </span>
                    <span className="badge badge-info">{s.type}</span>
                  </div>
                </div>
                <p className="text-sm text-secondary">{s.description}</p>
                {s.expectedImprovement && (
                  <span className="text-xs" style={{ color: 'var(--green)', fontWeight: 500 }}>
                    Expected improvement: {s.expectedImprovement}
                  </span>
                )}
              </div>
            ))}
            {agentData.quickWins?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <span className="agent-output-label" style={{ marginBottom: 8, display: 'block' }}>Quick Wins</span>
                <ul className="agent-findings-list">
                  {agentData.quickWins.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
        );

      case 'reportGenerator':
        return (
          <div className="agent-output-content">
            {agentData.riskLevel && (
              <div className="agent-output-row" style={{ marginBottom: 16 }}>
                <span className="agent-output-label">Risk Level</span>
                <span className={`badge badge-${agentData.riskLevel === 'low' ? 'success' : agentData.riskLevel === 'moderate' ? 'warning' : 'danger'}`}>
                  {agentData.riskLevel.toUpperCase()}
                </span>
              </div>
            )}
            {agentData.executiveSummary && (
              <div className="agent-executive-summary">
                <p>{agentData.executiveSummary}</p>
              </div>
            )}
            {agentData.keyFindings?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <span className="agent-output-label" style={{ marginBottom: 8, display: 'block' }}>Key Findings</span>
                <ul className="agent-findings-list">
                  {agentData.keyFindings.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
            {agentData.topRecommendations?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <span className="agent-output-label" style={{ marginBottom: 8, display: 'block' }}>Top Recommendations</span>
                <ul className="agent-findings-list">
                  {agentData.topRecommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            {agentData.conclusion && (
              <div className="agent-conclusion">
                <strong>Conclusion: </strong>{agentData.conclusion}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="agent-output-content">
            <pre className="code-block" style={{ fontSize: '0.75rem' }}>
              {JSON.stringify(agentData, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Multi-Agent AI Auditor</h2>
          <p>
            Four specialized AI agents work in parallel to audit fairness, compliance, and risk
            {auditSource === 'backend' && (
              <span style={{ marginLeft: 10, padding: '2px 10px', borderRadius: 20, fontSize: '0.6875rem', fontWeight: 600, background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid #86efac' }}>
                ⚡ Powered by Python ML Backend
              </span>
            )}
          </p>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={runAudit}
          disabled={isRunning}
          id="run-audit-btn"
        >
          {isRunning ? <Loader size={16} className="spin-icon" /> : <Play size={16} />}
          {isRunning ? 'Auditing...' : results ? 'Re-run Audit' : 'Start Full Audit'}
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

      {/* Agent Pipeline Visualization */}
      <div className="agent-pipeline" style={{ marginBottom: 28 }}>
        {AGENT_PIPELINE.map((agent, i) => {
          const status = getAgentStatus(agent.id);
          return (
            <div key={agent.id} style={{ display: 'contents' }}>
              <div className={`agent-pipeline-node ${getStatusClass(status)}`}>
                <div className="agent-pipeline-icon">
                  {status === 'completed' ? <CheckCircle size={18} /> :
                   status === 'started' ? <Loader size={18} className="spin-icon" /> :
                   <span className="agent-emoji">{agent.icon}</span>}
                </div>
                <div className="agent-pipeline-info">
                  <span className="agent-pipeline-name">{agent.name}</span>
                  <span className="agent-pipeline-desc">{agent.description}</span>
                </div>
                <div className="agent-pipeline-status">
                  {getStatusIcon(status)}
                </div>
              </div>
              {i < AGENT_PIPELINE.length - 1 && (
                <div className={`agent-pipeline-connector ${status === 'completed' ? 'completed' : ''}`}>
                  <ArrowRight size={14} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ready State */}
      {!isRunning && !results && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--blue-bg), var(--amber-bg))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={24} style={{ color: 'var(--blue)' }} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 6 }}>
            Ready for Multi-Agent Audit
          </h3>
          <p className="text-secondary" style={{ maxWidth: 480, margin: '0 auto 20px', fontSize: '0.875rem' }}>
            Five specialized AI agents will analyze your dataset in sequence: detecting bias, identifying root causes,
            checking compliance, suggesting improvements, and generating a comprehensive report.
          </p>
          <button className="btn btn-primary btn-lg" onClick={runAudit} id="start-audit-btn">
            <Play size={16} /> Start Full Audit
          </button>
        </div>
      )}

      {/* Running State */}
      {isRunning && (
        <div className="card" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
            Agents are analyzing your dataset...
          </p>
        </div>
      )}

      {/* Backend Results — real Python agents */}
      {backendResults && !isRunning && (
        <div className="animate-in">
          {/* Summary */}
          <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, var(--blue-bg), var(--green-bg))', border: '1px solid var(--blue)20' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: backendResults.overallScore >= 80 ? 'var(--green)' : backendResults.overallScore >= 60 ? 'var(--yellow)' : 'var(--red)' }}>
                  {backendResults.overallScore}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Overall Score</div>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>⚡ Real ML Backend Audit Complete</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{backendResults.recommendation}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: 'var(--green-bg)', color: 'var(--green)' }}>✅ {backendResults.agentsPassed} Passed</span>
                  {backendResults.agentsWarned > 0 && <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: 'var(--amber-bg)', color: 'var(--amber-dark)' }}>⚠️ {backendResults.agentsWarned} Warning</span>}
                  {backendResults.agentsFailed > 0 && <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: 'var(--red-bg)', color: 'var(--red)' }}>❌ {backendResults.agentsFailed} Failed</span>}
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={runAudit}><RefreshCw size={12} /> Re-run</button>
            </div>
          </div>

          {/* Agent Cards */}
          {(backendResults.agents || []).map((agent, i) => {
            const isExpanded = expandedAgent === `backend-${i}`;
            const statusColor = agent.status === 'passed' ? 'var(--green)' : agent.status === 'warning' ? 'var(--yellow)' : 'var(--red)';
            const statusBg   = agent.status === 'passed' ? 'var(--green-bg)' : agent.status === 'warning' ? 'var(--amber-bg)' : 'var(--red-bg)';
            return (
              <div key={i} className="card" style={{ marginBottom: 10, borderLeft: `3px solid ${statusColor}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => setExpandedAgent(isExpanded ? null : `backend-${i}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.25rem' }}>{agent.agent?.split(' ')[0]}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{agent.agent?.replace(/^[^ ]+ /, '')}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Score: {agent.score}/100</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: statusBg, color: statusColor }}>
                      {agent.status?.toUpperCase()}
                    </span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--gray-100)' }} className="animate-in">
                    {agent.findings?.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Findings</div>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {agent.findings.map((f, fi) => <li key={fi} style={{ fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: 4, lineHeight: 1.55 }}>{f}</li>)}
                        </ul>
                      </div>
                    )}
                    {agent.actions?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommended Actions</div>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {agent.actions.map((a, ai) => <li key={ai} style={{ fontSize: '0.875rem', color: 'var(--blue)', marginBottom: 4, lineHeight: 1.55 }}>→ {a}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Results (JS orchestrator fallback) */}
      {results && !isRunning && (
        <div className="animate-in">
          {/* Summary Scorecard */}
          <div className={`scorecard ${results.analysisMetrics.severity.level}`} style={{ marginBottom: 24 }}>
            <div className="scorecard-score" style={{
              background: results.analysisMetrics.severity.level === 'good' ? 'var(--green-bg)' : results.analysisMetrics.severity.level === 'warning' ? 'var(--yellow-bg)' : 'var(--red-bg)',
              border: `2px solid ${results.analysisMetrics.severity.level === 'good' ? 'var(--green)' : results.analysisMetrics.severity.level === 'warning' ? 'var(--yellow)' : 'var(--red)'}`
            }}>
              <span className="score-value" style={{ color: results.analysisMetrics.severity.level === 'good' ? 'var(--green)' : results.analysisMetrics.severity.level === 'warning' ? 'var(--yellow)' : 'var(--red)' }}>
                {results.analysisMetrics.fairnessScore}
              </span>
            </div>
            <div className="scorecard-info">
              <h3>Multi-Agent Audit Complete</h3>
              <p>5 agents analyzed your dataset · {results.completedAt ? new Date(results.completedAt).toLocaleString() : ''}</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={runAudit}>
              <RefreshCw size={12} /> Re-run
            </button>
          </div>

          {/* Agent Result Cards */}
          {AGENT_PIPELINE.map((agent) => {
            const agentResult = results.agents?.[agent.key];
            if (!agentResult) return null;
            const isExpanded = expandedAgent === agent.key;

            return (
              <div key={agent.key} className="agent-result-card" style={{ marginBottom: 12 }}>
                <div
                  className="agent-result-header"
                  onClick={() => setExpandedAgent(isExpanded ? null : agent.key)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="agent-result-icon">
                      <CheckCircle size={16} style={{ color: 'var(--green)' }} />
                    </div>
                    <div>
                      <h4 className="agent-result-name">{agent.icon} {agent.name}</h4>
                      <span className="text-xs text-tertiary">{agent.description}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-info">{agentResult.source || 'AI'}</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="agent-result-body animate-in">
                    {renderAgentOutput(agent.key, agentResult)}
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
