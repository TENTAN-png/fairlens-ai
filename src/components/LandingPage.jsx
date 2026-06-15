import { Shield, Search, BarChart3, Sparkles, Settings, ArrowRight, Cpu, ClipboardCheck, GitBranch, Bell, Award, FileText } from 'lucide-react';

export default function LandingPage({ onGetStarted, onOpenSettings, geminiReady }) {
  return (
    <div className="hero">
      <div className="hero-content">
        <div className="hero-badge">
          <Shield size={12} />
          Enterprise AI Governance Platform
        </div>

        <h1>
          Govern & Trust Your<br />
          <span className="gradient-text">Algorithmic Systems</span>
        </h1>

        <p>
          An enterprise-grade platform to scan datasets for bias, audit generative AI models, 
          evaluate policy compliance documents, track real-time alert logs, and generate trust certificates.
        </p>

        <div className="hero-actions">
          <button className="btn btn-primary btn-lg" onClick={onGetStarted} id="get-started-btn">
            Enter Dashboard <ArrowRight size={16} />
          </button>
          <button className="btn btn-secondary btn-lg" onClick={onOpenSettings} id="setup-api-btn">
            <Settings size={16} />
            {geminiReady ? 'API connected' : 'Configure API'}
          </button>
        </div>

        <div className="hero-features">
          <div className="hero-feature-card">
            <div className="feature-icon" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
              <BarChart3 size={22} />
            </div>
            <h3>Governance Dashboard</h3>
            <p>Google Analytics-style real-time tracking of fairness scores, risk indices, and alerts</p>
          </div>
          <div className="hero-feature-card">
            <div className="feature-icon" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
              <Cpu size={22} />
            </div>
            <h3>GenAI System Auditor</h3>
            <p>Evaluate LLM prompt-response, chatbot dialogues, RAG setups, and ML specs for safety</p>
          </div>
          <div className="hero-feature-card">
            <div className="feature-icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
              <FileText size={22} />
            </div>
            <h3>Document Auditor</h3>
            <p>Submit policies and compliance manuals to auto-flag legal and ethical risks with Gemini</p>
          </div>
          <div className="hero-feature-card">
            <div className="feature-icon" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
              <Bell size={22} />
            </div>
            <h3>Smart Alert Center</h3>
            <p>Real-time notifications warning developers when bias or quality drops below rules</p>
          </div>
          <div className="hero-feature-card">
            <div className="feature-icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
              <ClipboardCheck size={22} />
            </div>
            <h3>Compliance Auditor</h3>
            <p>Parallel agent network testing pipelines against GDPR, EU AI Act, NIST, and ISO</p>
          </div>
          <div className="hero-feature-card">
            <div className="feature-icon" style={{ background: 'var(--amber-bg)', color: 'var(--d4af37)' }}>
              <Award size={22} style={{ color: '#d4af37' }} />
            </div>
            <h3>Trust Certification</h3>
            <p>Verify eligibility and issue professional print-ready safety certificates for your models</p>
          </div>
        </div>
      </div>
    </div>
  );
}


