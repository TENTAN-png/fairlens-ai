import { Shield, Search, BarChart3, Sparkles, Settings, ArrowRight } from 'lucide-react';

export default function LandingPage({ onGetStarted, onOpenSettings, geminiReady }) {
  return (
    <div className="hero">
      <div className="hero-content">
        <div className="hero-badge">
          <Shield size={12} />
          Solution Challenge 2026
        </div>

        <h1>
          Detect Bias in<br />
          <span className="gradient-text">AI Decisions</span>
        </h1>

        <p>
          Upload datasets, measure fairness metrics, and get AI-powered 
          recommendations to ensure your automated systems treat everyone equally.
        </p>

        <div className="hero-actions">
          <button className="btn btn-primary btn-lg" onClick={onGetStarted} id="get-started-btn">
            Get started <ArrowRight size={16} />
          </button>
          <button className="btn btn-secondary btn-lg" onClick={onOpenSettings} id="setup-api-btn">
            <Settings size={16} />
            {geminiReady ? 'API connected' : 'Configure API'}
          </button>
        </div>

        <div className="hero-features">
          <div className="hero-feature-card">
            <div className="feature-icon" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
              <Search size={22} />
            </div>
            <h3>Bias Scanner</h3>
            <p>Upload CSV datasets and automatically detect sensitive attributes with fairness metrics</p>
          </div>
          <div className="hero-feature-card">
            <div className="feature-icon" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
              <BarChart3 size={22} />
            </div>
            <h3>Visual Dashboard</h3>
            <p>Interactive charts showing distribution disparities, group rates, and fairness scores</p>
          </div>
          <div className="hero-feature-card">
            <div className="feature-icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
              <Sparkles size={22} />
            </div>
            <h3>AI Explainer</h3>
            <p>Gemini & Groq AI interpret your findings and provide mitigation strategies</p>
          </div>
        </div>
      </div>
    </div>
  );
}
