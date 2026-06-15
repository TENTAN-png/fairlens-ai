import { useState } from 'react';
import { Key, X, ExternalLink, Check, AlertTriangle, Zap, Shield } from 'lucide-react';

function detectKeyType(key) {
  if (!key) return null;
  if (key.startsWith('AIza') || key.startsWith('AQ.')) return 'gemini';
  if (key.startsWith('gsk_')) return 'groq';
  return 'unknown';
}

export default function SettingsModal({ apiKey, groqKey, onSave, onClose }) {
  const [geminiKeyInput, setGeminiKeyInput] = useState(apiKey || '');
  const [groqKeyInput, setGroqKeyInput] = useState(groqKey || '');
  const [saved, setSaved] = useState(false);

  const geminiType = detectKeyType(geminiKeyInput.trim());
  const groqType   = detectKeyType(groqKeyInput.trim());

  // Auto-detect warning: user pasted a Groq key into the Gemini field
  const groqInGeminiField = false; // disabled — AQ. keys are Gemini, not Groq

  const handleSave = () => {
    onSave(geminiKeyInput.trim(), groqKeyInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const anyKeyEntered = geminiKeyInput.trim() || groqKeyInput.trim();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '100%' }}>
        <div className="modal-header">
          <h3>
            <Key size={16} style={{ marginRight: 6, verticalAlign: '-2px', color: 'var(--blue)' }} />
            API Configuration
          </h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body">

          {/* AI Engine Status */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20
          }}>
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: geminiType === 'gemini' ? 'var(--blue-bg)' : 'var(--gray-100)',
              border: `1px solid ${geminiType === 'gemini' ? 'var(--blue)' : 'var(--gray-200)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.875rem', color: geminiType === 'gemini' ? 'var(--blue)' : 'var(--gray-500)' }}>
                <Zap size={14} /> Gemini AI
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 3 }}>
                {geminiType === 'gemini' ? '✅ Key detected — powered by Google' : 'Not configured'}
              </div>
            </div>
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: (groqType === 'groq' || groqInGeminiField) ? 'var(--green-bg)' : 'var(--gray-100)',
              border: `1px solid ${(groqType === 'groq' || groqInGeminiField) ? 'var(--green)' : 'var(--gray-200)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.875rem', color: (groqType === 'groq' || groqInGeminiField) ? 'var(--green)' : 'var(--gray-500)' }}>
                <Shield size={14} /> Groq AI (Llama)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 3 }}>
                {groqType === 'groq' || groqInGeminiField ? '✅ Key detected — fallback AI' : 'Not configured'}
              </div>
            </div>
          </div>

          {/* Gemini Key Input */}
          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Gemini API Key</span>
              {geminiType === 'gemini' && <span style={{ color: 'var(--green)', fontSize: '0.75rem', fontWeight: 500 }}>✓ Valid format</span>}
              {groqInGeminiField && <span style={{ color: 'var(--amber)', fontSize: '0.75rem', fontWeight: 500 }}>⚡ Groq key — will auto-route</span>}
            </label>
            <input
              type="password"
              className="input"
              placeholder="AIza... (Google AI Studio key)"
              value={geminiKeyInput}
              onChange={e => setGeminiKeyInput(e.target.value)}
              id="api-key-input"
              autoFocus
              style={{ borderColor: geminiType === 'gemini' ? 'var(--green)' : geminiKeyInput && geminiType !== 'gemini' ? 'var(--amber)' : undefined }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span className="text-xs text-tertiary">
                Get your free key from{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                  Google AI Studio <ExternalLink size={10} />
                </a>
              </span>
              {groqInGeminiField && (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                  onClick={() => { setGroqKeyInput(geminiKeyInput); setGeminiKeyInput(''); }}
                >
                  Move to Groq field
                </button>
              )}
            </div>
          </div>

          {/* Groq Key Input */}
          <div className="input-group" style={{ marginBottom: 20 }}>
            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                Groq API Key
                <span className="badge badge-info" style={{ marginLeft: 6, fontSize: '0.6875rem' }}>Fallback</span>
              </span>
              {groqType === 'groq' && <span style={{ color: 'var(--green)', fontSize: '0.75rem', fontWeight: 500 }}>✓ Valid format</span>}
            </label>
            <input
              type="password"
              className="input"
              placeholder="gsk_... (Groq Console key)"
              value={groqKeyInput}
              onChange={e => setGroqKeyInput(e.target.value)}
              id="groq-key-input"
              style={{ borderColor: groqType === 'groq' ? 'var(--green)' : undefined }}
            />
            <span className="text-xs text-tertiary">
              Get free key from{' '}
              <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">
                console.groq.com <ExternalLink size={10} />
              </a>
              {' '}— used when Gemini is unavailable
            </span>
          </div>

          {/* Auto-detection Notice */}
          {groqInGeminiField && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'var(--amber-bg)', border: '1px solid var(--amber)',
              marginBottom: 16, fontSize: '0.8125rem', display: 'flex', gap: 10, alignItems: 'flex-start'
            }}>
              <AlertTriangle size={16} color="var(--amber-dark)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong style={{ color: 'var(--amber-dark)' }}>Groq key detected in Gemini field</strong>
                <br />
                <span style={{ color: 'var(--gray-700)' }}>
                  It looks like you've entered a Groq key (starts with "AQ."). FairLens will automatically route it to the Groq engine when you save. Groq runs Llama 3.3 70B which works great for all AI features.
                </span>
              </div>
            </div>
          )}

          {/* Fallback chain info */}
          <div style={{
            padding: '10px 14px',
            background: 'var(--gray-100)',
            border: '1px solid var(--gray-200)',
            borderRadius: 8,
            fontSize: '0.8125rem',
            color: 'var(--gray-600)',
            lineHeight: 1.6,
          }}>
            <strong>How AI works in FairLens:</strong>
            <br />
            Gemini (Google) → Groq (Llama 3.3) → Offline Engine
            <br />
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
              All AI features work with either key. Groq's free tier is generous (14,400 req/day).
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            id="save-api-key-btn"
            disabled={!anyKeyEntered}
          >
            {saved ? <><Check size={14} /> Saved!</> : <><Check size={14} /> Save Configuration</>}
          </button>
        </div>
      </div>
    </div>
  );
}
