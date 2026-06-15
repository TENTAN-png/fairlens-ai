import { useState, useCallback } from 'react';
import {
  GitBranch, Play, Loader, AlertTriangle, CheckCircle,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw, Zap,
  TrendingUp, TrendingDown, ArrowRight
} from 'lucide-react';
import { runDigitalTwinSimulation } from '../utils/agentOrchestrator';

const PRESET_SCENARIOS = [
  {
    label: 'Raise Decision Threshold',
    scenario: 'What happens if the decision threshold for positive outcomes increases from 0.5 to 0.8?',
    icon: '📈'
  },
  {
    label: 'Balance Group Sizes',
    scenario: 'What happens if we ensure equal representation by balancing the number of records across all demographic groups?',
    icon: '⚖️'
  },
  {
    label: 'Remove Proxy Variables',
    scenario: 'What happens if we remove indirect bias indicators like ZIP code and income from the decision model?',
    icon: '🔒'
  },
  {
    label: 'Apply Reweighting',
    scenario: 'What happens if we apply sample reweighting to equalize favorable outcome rates across groups?',
    icon: '🔄'
  },
  {
    label: 'Blind Sensitive Attribute',
    scenario: 'What happens if we completely blind the model to the sensitive attribute during decision-making?',
    icon: '🙈'
  },
  {
    label: 'Add Human Review',
    scenario: 'What happens if we add human review for all edge-case decisions within 10% of the threshold?',
    icon: '👤'
  }
];

const SIMULATION_AGENTS = [
  { id: 'simulation', name: 'Simulation Agent', icon: '🔄', description: 'Models the proposed change' },
  { id: 'fairness', name: 'Fairness Impact Agent', icon: '⚖️', description: 'Evaluates fairness effects' },
  { id: 'accuracy', name: 'Performance Agent', icon: '📈', description: 'Assesses accuracy tradeoffs' },
  { id: 'report', name: 'Impact Report Agent', icon: '📋', description: 'Generates recommendation' }
];

export default function FairnessDigitalTwin({ analysisResult }) {
  const [scenario, setScenario] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [agentStates, setAgentStates] = useState({});
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleProgress = useCallback((agentId, status) => {
    setAgentStates(prev => ({
      ...prev,
      [agentId]: { status, timestamp: Date.now() }
    }));
  }, []);

  const runSimulation = async (customScenario) => {
    const input = customScenario || scenario;
    if (!input.trim()) return;

    setIsRunning(true);
    setError('');
    setAgentStates({});
    setResults(null);

    try {
      const simResults = await runDigitalTwinSimulation(analysisResult, input, handleProgress);
      setResults(simResults);
    } catch (err) {
      setError(`Simulation failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getDeltaIcon = (value) => {
    if (typeof value === 'string') {
      if (value.startsWith('+')) return <ArrowUpRight size={14} style={{ color: 'var(--green)' }} />;
      if (value.startsWith('-')) return <ArrowDownRight size={14} style={{ color: 'var(--red)' }} />;
      return <Minus size={14} style={{ color: 'var(--gray-500)' }} />;
    }
    if (value > 0) return <ArrowUpRight size={14} style={{ color: 'var(--green)' }} />;
    if (value < 0) return <ArrowDownRight size={14} style={{ color: 'var(--red)' }} />;
    return <Minus size={14} style={{ color: 'var(--gray-500)' }} />;
  };

  const getDeltaColor = (value) => {
    if (typeof value === 'string') {
      if (value.startsWith('+')) return 'var(--green)';
      if (value.startsWith('-')) return 'var(--red)';
      return 'var(--gray-600)';
    }
    if (value > 0) return 'var(--green)';
    if (value < 0) return 'var(--red)';
    return 'var(--gray-600)';
  };

  if (!analysisResult) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon"><GitBranch size={28} /></div>
          <h3>No Analysis Available</h3>
          <p>Run a bias analysis first to use the Fairness Digital Twin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Fairness Digital Twin</h2>
        <p>Simulate changes and predict their impact on fairness and performance before deployment</p>
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

      {/* Scenario Input */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title"><Zap size={16} /> Describe Your Scenario</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            className="input"
            value={scenario}
            onChange={e => setScenario(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runSimulation()}
            placeholder="What happens if..."
            disabled={isRunning}
            id="digital-twin-input"
          />
          <button
            className="btn btn-primary"
            onClick={() => runSimulation()}
            disabled={isRunning || !scenario.trim()}
            id="run-simulation-btn"
          >
            {isRunning ? <Loader size={16} className="spin-icon" /> : <Play size={16} />}
            Simulate
          </button>
        </div>

        {/* Preset Scenarios */}
        <div>
          <span className="text-xs text-tertiary" style={{ display: 'block', marginBottom: 8 }}>Quick scenarios:</span>
          <div className="preset-scenarios-grid">
            {PRESET_SCENARIOS.map((preset, i) => (
              <button
                key={i}
                className="preset-scenario-btn"
                onClick={() => { setScenario(preset.scenario); runSimulation(preset.scenario); }}
                disabled={isRunning}
              >
                <span className="preset-icon">{preset.icon}</span>
                <span className="preset-label">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Pipeline (Mini) */}
      {isRunning && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">Simulation Pipeline</span>
          </div>
          <div className="twin-pipeline">
            {SIMULATION_AGENTS.map((agent, i) => {
              const state = agentStates[agent.id];
              const isComplete = state?.status === 'completed';
              const isActive = state?.status === 'started';
              return (
                <div key={agent.id} style={{ display: 'contents' }}>
                  <div className={`twin-pipeline-node ${isComplete ? 'complete' : isActive ? 'active' : 'pending'}`}>
                    <span className="twin-agent-icon">{agent.icon}</span>
                    <span className="twin-agent-name">{agent.name}</span>
                    {isComplete ? <CheckCircle size={12} style={{ color: 'var(--green)' }} /> :
                     isActive ? <Loader size={12} className="spin-icon" style={{ color: 'var(--blue)' }} /> :
                     <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--gray-300)' }} />}
                  </div>
                  {i < SIMULATION_AGENTS.length - 1 && (
                    <div className={`twin-connector ${isComplete ? 'complete' : ''}`}>
                      <ArrowRight size={12} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results */}
      {results && !isRunning && (
        <div className="animate-in">
          {/* Scenario Card */}
          <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--blue)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Zap size={14} style={{ color: 'var(--blue)' }} />
              <span className="text-xs text-tertiary">Scenario Simulated</span>
            </div>
            <p style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
              {results.simulation?.scenarioUnderstood || results.scenario}
            </p>
            {results.simulation?.assumptions?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <span className="text-xs text-tertiary">Assumptions: </span>
                <span className="text-xs text-secondary">{results.simulation.assumptions.join(' · ')}</span>
              </div>
            )}
          </div>

          {/* Impact Summary Cards */}
          <div className="twin-impact-grid" style={{ marginBottom: 24 }}>
            {/* Fairness Score Delta */}
            <div className="twin-impact-card">
              <span className="twin-impact-label">Fairness Score</span>
              <div className="twin-impact-value-row">
                <span className="twin-current">{analysisResult.fairnessScore}</span>
                <ArrowRight size={14} style={{ color: 'var(--gray-400)' }} />
                <span className="twin-projected" style={{ color: getDeltaColor(results.fairnessImpact?.scoreDelta || 0) }}>
                  {results.fairnessImpact?.newFairnessScore ?? '—'}
                </span>
              </div>
              <div className="twin-delta" style={{ color: getDeltaColor(results.fairnessImpact?.scoreDelta || 0) }}>
                {getDeltaIcon(results.fairnessImpact?.scoreDelta || 0)}
                {results.fairnessImpact?.scoreDelta > 0 ? '+' : ''}{results.fairnessImpact?.scoreDelta ?? 0} points
              </div>
            </div>

            {/* Accuracy Change */}
            <div className="twin-impact-card">
              <span className="twin-impact-label">Accuracy</span>
              <div className="twin-impact-value-row">
                <span className="twin-projected" style={{ color: getDeltaColor(results.performanceImpact?.accuracyChange || '0%'), fontSize: '1.5rem' }}>
                  {results.performanceImpact?.accuracyChange || '0%'}
                </span>
              </div>
              <div className="twin-delta" style={{ color: getDeltaColor(results.performanceImpact?.accuracyChange || '0%') }}>
                {getDeltaIcon(results.performanceImpact?.accuracyChange || '0%')}
                change in accuracy
              </div>
            </div>

            {/* Recommendation */}
            <div className="twin-impact-card">
              <span className="twin-impact-label">Recommendation</span>
              <div style={{ margin: '8px 0' }}>
                <span className={`badge badge-${results.report?.recommendation === 'proceed' ? 'success' : results.report?.recommendation === 'caution' ? 'warning' : 'danger'}`}
                  style={{ fontSize: '0.875rem', padding: '6px 16px' }}>
                  {results.report?.recommendation === 'proceed' ? '✅ Proceed' :
                   results.report?.recommendation === 'caution' ? '⚠️ Proceed with Caution' : '❌ Avoid'}
                </span>
              </div>
              <span className="text-xs text-secondary">{results.report?.reasoning?.slice(0, 100)}...</span>
            </div>

            {/* Coverage */}
            <div className="twin-impact-card">
              <span className="twin-impact-label">Coverage</span>
              <div className="twin-impact-value-row">
                <span className="twin-projected" style={{ color: getDeltaColor(results.performanceImpact?.coverageChange || '0%'), fontSize: '1.5rem' }}>
                  {results.performanceImpact?.coverageChange || '0%'}
                </span>
              </div>
              <div className="twin-delta" style={{ color: getDeltaColor(results.performanceImpact?.coverageChange || '0%') }}>
                {getDeltaIcon(results.performanceImpact?.coverageChange || '0%')}
                change in coverage
              </div>
            </div>
          </div>

          {/* Group Impact Table */}
          {results.fairnessImpact?.groupImpacts?.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <span className="card-title">Group-Level Impact</span>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Group</th>
                      <th>Current Rate</th>
                      <th>Projected Rate</th>
                      <th>Change</th>
                      <th>Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.fairnessImpact.groupImpacts.map((g, i) => {
                      const delta = g.projectedRate - g.currentRate;
                      return (
                        <tr key={i}>
                          <td><strong>{g.group}</strong></td>
                          <td className="font-mono">{g.currentRate}%</td>
                          <td className="font-mono" style={{ color: getDeltaColor(delta) }}>{g.projectedRate}%</td>
                          <td>
                            <span className="font-mono" style={{ color: getDeltaColor(delta), display: 'flex', alignItems: 'center', gap: 4 }}>
                              {getDeltaIcon(delta)}
                              {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-${delta > 0 ? 'success' : delta < 0 ? 'danger' : 'neutral'}`}>
                              {g.change || (delta > 0 ? 'Improved' : delta < 0 ? 'Decreased' : 'No Change')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tradeoffs and Risks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* Risks */}
            <div className="card">
              <div className="card-header">
                <span className="card-title"><AlertTriangle size={14} /> Risks</span>
              </div>
              <ul className="agent-findings-list">
                {(results.report?.risks || results.performanceImpact?.tradeoffs || []).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            {/* Benefits */}
            <div className="card">
              <div className="card-header">
                <span className="card-title"><TrendingUp size={14} /> Benefits</span>
              </div>
              <ul className="agent-findings-list">
                {(results.report?.benefits || []).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Alternative Suggestions */}
          {results.report?.alternativeSuggestions?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title"><RefreshCw size={14} /> Alternative Approaches</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {results.report.alternativeSuggestions.map((s, i) => (
                  <button
                    key={i}
                    className="preset-scenario-btn"
                    onClick={() => { setScenario(s); runSimulation(s); }}
                    style={{ flex: '1 1 auto' }}
                  >
                    <span className="preset-label">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
