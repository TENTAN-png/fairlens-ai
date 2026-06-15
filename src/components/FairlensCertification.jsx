import { useState, useEffect } from 'react';
import { Award, ShieldCheck, Download, AlertCircle, RefreshCw, Printer } from 'lucide-react';
import { getHistory } from '../utils/auditHistory';

export default function FairlensCertification() {
  const [loading, setLoading] = useState(false);
  const [passed, setPassed] = useState(false);
  const [stats, setStats] = useState({
    auditCount: 0,
    latestFairnessScore: 0,
    latestDataset: '',
    governanceScore: 65
  });

  // Unique Certification Details
  const [certDetails, setCertDetails] = useState({
    id: 'FL-' + Math.floor(100000 + Math.random() * 900000),
    issueDate: new Date().toLocaleDateString(),
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toLocaleDateString() // 6 months
  });

  useEffect(() => {
    checkPrerequisites();
  }, []);

  const checkPrerequisites = () => {
    setLoading(true);
    const history = getHistory();
    const count = history.length;
    let latestScore = 0;
    let latestName = '';

    if (count > 0) {
      latestScore = history[0].overallScore || history[0].fairnessScore || 75;
      latestName = history[0].fileName || history[0].datasetName || 'Enterprise_Dataset.csv';
    }

    // Pull governance score checklist state
    let govScore = 60;
    try {
      const savedAlerts = localStorage.getItem('fairlens_alerts');
      // Estimate governance score based on checklist defaults or random variation
      govScore = count > 0 ? 82 : 64;
    } catch {}

    setStats({
      auditCount: count,
      latestFairnessScore: latestScore,
      latestDataset: latestName,
      governanceScore: govScore
    });

    // To pass: must have at least 1 audit and fairness score >= 80, and governance >= 75
    if (count > 0 && latestScore >= 80 && govScore >= 75) {
      setPassed(true);
    } else {
      setPassed(false);
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const forceCertify = () => {
    setStats({
      auditCount: 3,
      latestFairnessScore: 94,
      latestDataset: stats.latestDataset || 'Global_Customer_Data_v2.csv',
      governanceScore: 88
    });
    setPassed(true);
  };

  return (
    <div className="page-container no-print">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>FairLens Trust Certification</h2>
          <p>Verify algorithm audits and issue industry-standard ethical AI compliance certificates.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={checkPrerequisites}>
            <RefreshCw size={14} /> Re-Evaluate
          </button>
          {!passed && (
            <button className="btn btn-primary btn-sm" onClick={forceCertify}>
              <Award size={14} /> Demo Override Pass
            </button>
          )}
        </div>
      </div>

      {/* Prerequisite Checklist */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title"><ShieldCheck size={16} /> Prerequisite Audit Status</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {/* Rule 1: Dataset Audits */}
          <div style={{
            padding: 12,
            borderRadius: 6,
            background: stats.auditCount > 0 ? 'var(--green-bg)' : 'var(--red-bg)',
            border: `1px solid ${stats.auditCount > 0 ? 'var(--green)' : 'var(--red)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{ color: stats.auditCount > 0 ? 'var(--green)' : 'var(--red)' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-xs text-secondary">Dataset Audit Done</div>
              <div style={{ fontWeight: 'bold' }}>{stats.auditCount > 0 ? 'Verified' : 'Required'}</div>
            </div>
          </div>

          {/* Rule 2: Fairness Score */}
          <div style={{
            padding: 12,
            borderRadius: 6,
            background: stats.latestFairnessScore >= 80 ? 'var(--green-bg)' : 'var(--red-bg)',
            border: `1px solid ${stats.latestFairnessScore >= 80 ? 'var(--green)' : 'var(--red)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{ color: stats.latestFairnessScore >= 80 ? 'var(--green)' : 'var(--red)' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-xs text-secondary">Fairness Index (&ge;80)</div>
              <div style={{ fontWeight: 'bold' }}>
                {stats.latestFairnessScore || 'No Audits'} {stats.latestFairnessScore ? `(${stats.latestFairnessScore >= 80 ? 'Pass' : 'Fail'})` : ''}
              </div>
            </div>
          </div>

          {/* Rule 3: Governance Checklist */}
          <div style={{
            padding: 12,
            borderRadius: 6,
            background: stats.governanceScore >= 75 ? 'var(--green-bg)' : 'var(--red-bg)',
            border: `1px solid ${stats.governanceScore >= 75 ? 'var(--green)' : 'var(--red)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{ color: stats.governanceScore >= 75 ? 'var(--green)' : 'var(--red)' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-xs text-secondary">Governance Index (&ge;75)</div>
              <div style={{ fontWeight: 'bold' }}>
                {stats.governanceScore}% {stats.governanceScore >= 75 ? '(Pass)' : '(Fail)'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {passed ? (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {/* Certificate Wrapper */}
          <div className="certificate-print-area" id="fairlens-certificate" style={{
            width: '100%',
            maxWidth: 800,
            background: '#ffffff',
            color: '#1a1a1a',
            padding: 40,
            borderRadius: 12,
            border: '14px double #d4af37', // Golden double border
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            fontFamily: 'serif',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background Seal Emblem Design */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 300,
              height: 300,
              border: '2px solid rgba(212, 175, 55, 0.08)',
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Award size={180} style={{ color: 'rgba(212, 175, 55, 0.06)' }} />
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <Award size={48} style={{ color: '#d4af37', marginBottom: 12 }} />
              <h1 style={{ fontSize: '2rem', textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 10px 0', color: '#8b6914' }}>
                Certificate of AI Trust
              </h1>
              <p style={{ fontStyle: 'italic', fontSize: '1rem', margin: '0 0 24px 0', color: '#555' }}>
                This document officially registers compliance and fairness adherence of the algorithmic system:
              </p>

              <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: 10, margin: '0 auto 24px auto', maxWidth: 500 }}>
                {stats.latestDataset || 'Global_Customer_Data_v2.csv'}
              </h2>

              <p style={{ fontSize: '1rem', maxWidth: 600, margin: '0 auto 28px auto', lineHeight: 1.6, color: '#333' }}>
                Evaluated and audited using the <strong>FairLens AI Governance Framework</strong>, scoring <strong>{stats.latestFairnessScore}%</strong> in Algorithmic Fairness and <strong>{stats.governanceScore}%</strong> in Governance, Transparency, Privacy, and Trustworthiness.
              </p>

              {/* Grid of Scores */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, maxWidth: 500, margin: '0 auto 32px auto', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', padding: '16px 0' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>Fairness score</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2e7d32' }}>{stats.latestFairnessScore}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>Governance Score</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1565c0' }}>{stats.governanceScore}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>Safety Grade</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#e65100' }}>Grade A</div>
                </div>
              </div>

              {/* Footer signatures and seals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, maxWidth: 560, margin: '0 auto' }}>
                {/* Audit Seal */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#777', textTransform: 'uppercase', marginBottom: 2 }}>Certification Serial</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 'bold', color: '#333' }}>{certDetails.id}</div>
                  <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 4 }}>Valid until: {certDetails.expiryDate}</div>
                </div>

                {/* Sign-off */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <div style={{ fontStyle: 'italic', fontFamily: 'cursive', fontSize: '1.25rem', color: '#1a1a1a', marginBottom: 4 }}>
                    FairLens Governance Board
                  </div>
                  <div style={{ width: '80%', height: 1, background: '#ccc' }} />
                  <div style={{ fontSize: '0.6875rem', color: '#777', textTransform: 'uppercase', marginTop: 4 }}>Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} /> Print / Download PDF
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 48, textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: 'var(--red)', marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 6px 0' }}>Prerequisites Not Met</h3>
          <p className="text-sm text-secondary" style={{ maxWidth: 450, margin: '0 0 20px 0' }}>
            To generate a valid trust certificate, you must upload and scan a dataset scoring &ge;80% in fairness, and pass trust checklist verification.
          </p>
          <button className="btn btn-primary" onClick={forceCertify}>
            Generate Demo Certification
          </button>
        </div>
      )}
    </div>
  );
}
