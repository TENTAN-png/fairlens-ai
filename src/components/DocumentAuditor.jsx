import { useState } from 'react';
import { FileText, Loader, Play, AlertTriangle, CheckCircle, Upload } from 'lucide-react';
import { generateAIInsights } from '../utils/geminiAPI';

const SAMPLE_POLICIES = [
  { label: 'Hiring Policy', text: 'All candidates must have a minimum of 5 years experience. Candidates from top-tier universities are given preference. Background checks are mandatory. No candidates over 55 will be considered for entry-level positions.' },
  { label: 'Loan Approval Criteria', text: 'Loan approval requires a credit score above 700. Applicants from certain ZIP codes require additional documentation. Income threshold is $50,000 annually. Married applicants receive a 5% rate discount.' },
  { label: 'Student Admission', text: 'Admissions consider GPA, standardized test scores, extracurricular activities, and legacy status. International students require TOEFL scores above 100. Students from underrepresented regions may receive additional consideration.' }
];

export default function DocumentAuditor() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const analyzeDocument = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResults(null);

    const prompt = `You are an AI Fairness and Compliance Document Auditor. Analyze this policy/document for fairness and compliance issues.

DOCUMENT:
"""
${text.slice(0, 3000)}
"""

Analyze for:
1. Fairness Issues - any language or criteria that could discriminate
2. Compliance Gaps - potential violations of GDPR, EU AI Act, EEOC
3. Risk Areas - hidden biases or problematic criteria

Respond as JSON:
{
  "overallRisk": "low|medium|high",
  "fairnessScore": 0-100,
  "findings": [
    {"type": "fairness|compliance|risk", "severity": "info|warning|critical", "title": "short title", "detail": "explanation", "recommendation": "what to do"}
  ],
  "summary": "2-3 sentence plain-English summary"
}

Respond ONLY with valid JSON.`;

    try {
      const raw = await generateAIInsights(prompt);
      try {
        const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(match ? match[0] : cleaned);
        setResults(parsed);
      } catch {
        setResults({ summary: raw, findings: [], overallRisk: 'medium', fairnessScore: 50 });
      }
    } catch {
      setResults({ summary: 'Unable to analyze document. Please check your API key.', findings: [], overallRisk: 'unknown', fairnessScore: 0 });
    }
    setLoading(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target.result);
    reader.readAsText(file);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Document Auditor</h2>
        <p>Audit policies, compliance documents, and internal guidelines for fairness and bias risks</p>
      </div>

      {/* Input */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title"><FileText size={16} /> Document Input</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              <Upload size={14} /> Upload .txt
              <input type="file" accept=".txt,.md,.csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <button className="btn btn-primary btn-sm" onClick={analyzeDocument} disabled={loading || !text.trim()}>
              {loading ? <Loader size={14} className="spin-icon" /> : <Play size={14} />}
              {loading ? 'Analyzing...' : 'Audit Document'}
            </button>
          </div>
        </div>
        <textarea className="input" value={text} onChange={e => setText(e.target.value)} placeholder="Paste your policy, guidelines, or document text here..." rows={8} style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <span className="text-xs text-tertiary" style={{ lineHeight: '28px' }}>Try a sample:</span>
          {SAMPLE_POLICIES.map(s => (
            <button key={s.label} className="preset-scenario-btn" onClick={() => setText(s.text)} style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="animate-in">
          <div className={`scorecard ${results.overallRisk === 'low' ? 'good' : results.overallRisk === 'medium' ? 'warning' : 'danger'}`} style={{ marginBottom: 16 }}>
            <div className="scorecard-score" style={{
              background: results.overallRisk === 'low' ? 'var(--green-bg)' : results.overallRisk === 'medium' ? 'var(--yellow-bg)' : 'var(--red-bg)',
              border: `2px solid ${results.overallRisk === 'low' ? 'var(--green)' : results.overallRisk === 'medium' ? 'var(--yellow)' : 'var(--red)'}`
            }}>
              <span className="score-value" style={{ color: results.overallRisk === 'low' ? 'var(--green)' : results.overallRisk === 'medium' ? 'var(--yellow)' : 'var(--red)', fontSize: '1.25rem' }}>
                {results.fairnessScore || '—'}
              </span>
            </div>
            <div className="scorecard-info">
              <h3>Document Risk: {(results.overallRisk || 'Unknown').charAt(0).toUpperCase() + (results.overallRisk || '').slice(1)}</h3>
              <p>{results.findings?.length || 0} findings identified</p>
            </div>
          </div>

          {results.summary && (
            <div className="agent-executive-summary" style={{ marginBottom: 16 }}>
              <p>{results.summary}</p>
            </div>
          )}

          {results.findings?.length > 0 && (
            <div className="card">
              <div className="card-header"><span className="card-title">Findings</span></div>
              {results.findings.map((f, i) => (
                <div key={i} className="risk-factor-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    {f.severity === 'critical' ? <AlertTriangle size={16} style={{ color: 'var(--red)' }} /> :
                     f.severity === 'warning' ? <AlertTriangle size={16} style={{ color: 'var(--yellow)' }} /> :
                     <CheckCircle size={16} style={{ color: 'var(--blue)' }} />}
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{f.title}</span>
                    <span className={`badge badge-${f.type === 'fairness' ? 'warning' : f.type === 'compliance' ? 'danger' : 'info'}`} style={{ marginLeft: 'auto' }}>{f.type}</span>
                  </div>
                  <div style={{ paddingLeft: 26 }}>
                    <p className="text-sm text-secondary" style={{ margin: '0 0 4px 0' }}>{f.detail}</p>
                    {f.recommendation && (
                      <p className="text-xs" style={{ color: 'var(--green)', margin: 0 }}>💡 {f.recommendation}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
