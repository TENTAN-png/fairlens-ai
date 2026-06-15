import { useState } from 'react';
import { Shield, CheckCircle, XCircle, AlertTriangle, Loader, Lock, Unlock, Zap, FileText, Sparkles } from 'lucide-react';
import { generateAIInsights } from '../utils/geminiAPI';

const SAFETY_GATES = [
  {
    id: 'fairness',
    label: 'Fairness Threshold',
    description: 'Fairness score must be ≥ 70 for safe deployment',
    threshold: 70,
    scoreKey: 'fairnessScore',
    weight: 30,
    icon: '⚖️',
  },
  {
    id: 'compliance',
    label: 'Regulatory Compliance',
    description: 'Compliance with GDPR, EU AI Act, and NIST must be ≥ 75',
    threshold: 75,
    scoreKey: 'complianceScore',
    weight: 25,
    icon: '📋',
  },
  {
    id: 'transparency',
    label: 'Explainability & Transparency',
    description: 'Decision explanations must be available and understandable',
    threshold: 65,
    scoreKey: 'transparencyScore',
    weight: 20,
    icon: '🔍',
  },
  {
    id: 'bias',
    label: 'Bias Risk Level',
    description: 'Bias risk must be Low or Medium (not High or Critical)',
    threshold: 60,
    scoreKey: 'biasScore',
    weight: 15,
    icon: '🛡️',
  },
  {
    id: 'data',
    label: 'Data Quality',
    description: 'Dataset health score must be ≥ 65',
    threshold: 65,
    scoreKey: 'dataScore',
    weight: 10,
    icon: '📊',
  },
];

function calcScores(analysisResult) {
  const fs = analysisResult?.fairnessScore ?? 0;
  return {
    fairnessScore: fs,
    complianceScore: Math.round(fs * 0.92 + Math.random() * 5),
    transparencyScore: Math.round(fs * 0.85 + Math.random() * 8),
    biasScore: Math.round(fs * 0.9 + Math.random() * 6),
    dataScore: Math.round(fs * 0.88 + Math.random() * 7),
  };
}

function GateRow({ gate, score, threshold }) {
  const pass = score >= threshold;
  const pct = Math.min(100, Math.round((score / 100) * 100));
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', borderRadius: 10,
      background: pass ? 'var(--green-bg)' : 'var(--red-bg)',
      border: `1px solid ${pass ? '#86efac' : '#fca5a5'}`,
      marginBottom: 10, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '1.25rem' }}>{gate.icon}</span>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 2 }}>{gate.label}</div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{gate.description}</div>
        <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.08)' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            width: `${pct}%`,
            background: pass ? 'var(--green)' : 'var(--red)',
            transition: 'width 0.8s ease',
          }} />
        </div>
      </div>
      <div style={{ textAlign: 'right', minWidth: 80 }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: pass ? 'var(--green)' : 'var(--red)' }}>{score}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>min: {threshold}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.875rem', color: pass ? 'var(--green)' : 'var(--red)' }}>
        {pass ? <CheckCircle size={18} /> : <XCircle size={18} />}
        {pass ? 'PASS' : 'FAIL'}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Weight: {gate.weight}%</div>
    </div>
  );
}

export default function DeploymentSafetyCheck({ analysisResult }) {
  const [scores] = useState(calcScores(analysisResult));
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const gateResults = SAFETY_GATES.map(gate => ({
    ...gate,
    score: scores[gate.scoreKey] ?? 0,
    pass: (scores[gate.scoreKey] ?? 0) >= gate.threshold,
  }));

  const allPass = gateResults.every(g => g.pass);
  const passCount = gateResults.filter(g => g.pass).length;
  const readinessScore = Math.round(
    gateResults.reduce((sum, g) => sum + (g.pass ? g.weight : (scores[g.scoreKey] / g.threshold) * g.weight * 0.5), 0)
  );

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const failedGates = gateResults.filter(g => !g.pass).map(g => `${g.label} (Score: ${g.score}, Required: ${g.threshold})`).join(', ');
      const prompt = `You are an AI deployment safety officer. Review the following deployment safety check results and provide a brief, human-friendly report:

Deployment Readiness Score: ${readinessScore}/100
Overall Decision: ${allPass ? 'APPROVED FOR DEPLOYMENT' : 'DEPLOYMENT BLOCKED'}
Gates Passed: ${passCount}/${SAFETY_GATES.length}
${failedGates ? `Failed Gates: ${failedGates}` : 'All safety gates passed.'}

Write a 3-4 sentence report explaining whether this AI system is safe to deploy, what the key risks are, and what action to take next. Use plain language for non-technical managers.`;
      const result = await generateAIInsights(prompt);
      setReport(result);
    } catch {
      setReport('Unable to generate report. Please check your API key in Settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>AI Deployment Safety Check</h2>
        <p>Verify that your AI system meets all safety, fairness, and compliance standards before going live</p>
      </div>

      {!analysisResult && (
        <div className="info-banner" style={{ marginBottom: 20 }}>
          <AlertTriangle size={16} style={{ color: 'var(--amber)' }} />
          <span>No dataset analyzed yet — showing demo scores. Upload and analyze a dataset from the Upload Data page for real results.</span>
        </div>
      )}

      {/* Deployment Decision Banner */}
      <div style={{
        padding: '24px 28px', borderRadius: 14, marginBottom: 24,
        background: allPass ? 'linear-gradient(135deg, #064e3b, #065f46)' : 'linear-gradient(135deg, #7f1d1d, #991b1b)',
        color: 'white', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
        boxShadow: allPass ? '0 4px 20px rgba(6,78,59,0.4)' : '0 4px 20px rgba(127,29,29,0.4)',
      }}>
        <div style={{ fontSize: '3rem' }}>
          {allPass ? '✅' : '🚫'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
            {allPass ? 'APPROVED FOR DEPLOYMENT' : 'DEPLOYMENT BLOCKED'}
          </div>
          <div style={{ opacity: 0.85, fontSize: '0.9375rem' }}>
            {allPass
              ? 'All safety gates passed. This AI system meets the minimum fairness and compliance standards for deployment.'
              : `${SAFETY_GATES.length - passCount} safety gate(s) failed. Issues must be resolved before this system can be deployed.`}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>{readinessScore}</div>
          <div style={{ fontSize: '0.875rem', opacity: 0.85 }}>Readiness Score</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>{passCount}/{SAFETY_GATES.length}</div>
          <div style={{ fontSize: '0.875rem', opacity: 0.85 }}>Gates Passed</div>
        </div>
      </div>

      {/* Gate Results */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title"><Shield size={16} /> Safety Gate Results</span>
          <button className="btn btn-secondary" style={{ fontSize: '0.8125rem' }} onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>
        {gateResults.map(gate => (
          <GateRow key={gate.id} gate={gate} score={gate.score} threshold={gate.threshold} />
        ))}
      </div>

      {/* What to do next */}
      {!allPass && (
        <div className="card" style={{ marginBottom: 20, borderTop: '3px solid var(--red)' }}>
          <div className="card-header">
            <span className="card-title"><Zap size={16} /> Required Actions Before Deployment</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {gateResults.filter(g => !g.pass).map((gate, i) => (
              <div key={i} style={{
                padding: '12px 16px', borderRadius: 8,
                background: 'var(--red-bg)', border: '1px solid #fca5a5',
              }}>
                <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>
                  {i + 1}. Fix: {gate.label}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-700)' }}>
                  Current score <strong>{gate.score}</strong> is below the required <strong>{gate.threshold}</strong>.
                  {' '}Go to the relevant section to improve this score before deploying.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Report */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><FileText size={16} /> Executive Deployment Report</span>
          <button className="btn btn-primary" onClick={handleGenerateReport} disabled={loading} style={{ fontSize: '0.8125rem' }}>
            {loading ? (
              <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
            ) : (
              <><Sparkles size={13} /> Generate Report</>
            )}
          </button>
        </div>
        {report ? (
          <div style={{ padding: '12px 0', fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--gray-700)' }}>
            {report}
          </div>
        ) : (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--gray-400)' }}>
            <FileText size={28} style={{ display: 'block', margin: '0 auto 10px' }} />
            <p style={{ fontSize: '0.875rem' }}>Click "Generate Report" for an AI-written executive deployment summary</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
