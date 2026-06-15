import { useState } from 'react';
import {
  Sparkles, ArrowLeft, AlertTriangle, RefreshCw, Code, BookOpen
} from 'lucide-react';
import { generateBiasInsights, generateMitigationCode } from '../utils/geminiAPI';

export default function AIInsights({
  analysisResult, geminiReady, aiInsightsText, setAiInsightsText,
  onOpenSettings, onGoBack
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('insights');
  const [mitigationCode, setMitigationCode] = useState('');
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [language, setLanguage] = useState('English');

  const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Hindi', 'Chinese', 'Japanese', 'Arabic', 'Kannada'];

  if (!analysisResult) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">
            <Sparkles size={28} />
          </div>
          <h3>No Analysis Available</h3>
          <p>Run a bias analysis first to get AI-powered insights.</p>
          <button className="btn btn-primary" onClick={onGoBack} style={{ marginTop: 16 }}>
            <ArrowLeft size={14} /> Go to Report
          </button>
        </div>
      </div>
    );
  }

  const fetchInsights = async (selectedLang = language) => {
    setIsLoading(true);
    setError('');
    try {
      const text = await generateBiasInsights(analysisResult, selectedLang);
      setAiInsightsText(text);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = async (lang) => {
    setLanguage(lang);
    if (aiInsightsText) {
      await fetchInsights(lang);
    }
  };

  const fetchMitigationCode = async () => {
    setIsLoadingCode(true);
    setError('');
    try {
      const text = await generateMitigationCode(analysisResult);
      setMitigationCode(text);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingCode(false);
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return '';
    let html = text
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^• (.+)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');
    html = html.replace(/(<li>.*?<\/li>(\s*<br\/>)?)+/g, (match) => {
      return '<ul>' + match.replace(/<br\/>/g, '') + '</ul>';
    });
    return '<p>' + html + '</p>';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>AI Insights</h2>
        <p>AI analyzes your bias metrics and provides actionable recommendations</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>
          <BookOpen size={14} style={{ marginRight: 4, verticalAlign: '-2px' }} /> Bias Analysis
        </button>
        <button className={`tab ${activeTab === 'code' ? 'active' : ''}`} onClick={() => setActiveTab('code')}>
          <Code size={14} style={{ marginRight: 4, verticalAlign: '-2px' }} /> Mitigation Code
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card" style={{
          background: 'var(--danger-bg)', borderColor: '#fecaca',
          color: 'var(--danger)', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem'
        }}>
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {activeTab === 'insights' && (
        <>
          {/* Language selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span className="text-sm" style={{ fontWeight: 500, color: 'var(--gray-700)' }}>Language:</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {LANGUAGES.map(lang => (
                <button
                  key={lang}
                  className={`column-chip ${language === lang ? 'selected' : ''}`}
                  onClick={() => handleLanguageChange(lang)}
                  style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {!aiInsightsText && !isLoading && (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', margin: '0 auto 12px',
                background: 'var(--accent-50)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Sparkles size={22} style={{ color: 'var(--accent)' }} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 4 }}>
                Ready to Generate Insights
              </h3>
              <p className="text-secondary" style={{ maxWidth: 420, margin: '0 auto 20px', fontSize: '0.875rem' }}>
                AI will analyze your fairness metrics and provide explanations,
                findings, strategies, and compliance notes.
              </p>
              <button className="btn btn-primary btn-lg" onClick={fetchInsights} id="generate-insights-btn">
                <Sparkles size={16} /> Generate Insights
              </button>
            </div>
          )}

          {isLoading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>Analyzing bias metrics...</p>
              <div className="loading-bar" style={{ maxWidth: 280 }}>
                <div className="loading-bar-fill"></div>
              </div>
            </div>
          )}

          {aiInsightsText && !isLoading && (
            <div className="ai-insights-panel animate-in">
              <div className="ai-insights-header">
                <div className="ai-icon">
                  <Sparkles size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.875rem' }}>Analysis Results</h4>
                  <span className="text-xs text-tertiary">
                    {analysisResult.meta.sensitiveCol} bias on {analysisResult.meta.targetCol}
                  </span>
                </div>
                <button className="btn btn-sm btn-secondary" onClick={fetchInsights}>
                  <RefreshCw size={12} /> Regenerate
                </button>
              </div>
              <div
                className="ai-insights-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(aiInsightsText) }}
              />
            </div>
          )}
        </>
      )}

      {activeTab === 'code' && (
        <>
          {!mitigationCode && !isLoadingCode && (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', margin: '0 auto 12px',
                background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Code size={22} style={{ color: 'var(--info)' }} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 4 }}>
                Get Mitigation Code
              </h3>
              <p className="text-secondary" style={{ maxWidth: 420, margin: '0 auto 20px', fontSize: '0.875rem' }}>
                Generate ready-to-use Python code for reweighting,
                oversampling, and post-processing techniques.
              </p>
              <button className="btn btn-primary btn-lg" onClick={fetchMitigationCode} id="generate-code-btn">
                <Code size={16} /> Generate Code
              </button>
            </div>
          )}

          {isLoadingCode && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>Generating mitigation code...</p>
              <div className="loading-bar" style={{ maxWidth: 280 }}>
                <div className="loading-bar-fill"></div>
              </div>
            </div>
          )}

          {mitigationCode && !isLoadingCode && (
            <div className="ai-insights-panel animate-in">
              <div className="ai-insights-header">
                <div className="ai-icon" style={{ background: 'var(--info)' }}>
                  <Code size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.875rem' }}>Mitigation Code</h4>
                  <span className="text-xs text-tertiary">Python snippets for bias remediation</span>
                </div>
                <button className="btn btn-sm btn-secondary" onClick={fetchMitigationCode}>
                  <RefreshCw size={12} /> Regenerate
                </button>
              </div>
              <div
                className="ai-insights-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(mitigationCode) }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
