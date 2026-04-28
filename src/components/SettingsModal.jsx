import { useState } from 'react';
import { Key, X, ExternalLink, Check } from 'lucide-react';

export default function SettingsModal({ apiKey, groqKey, onSave, onClose }) {
  const [geminiKeyInput, setGeminiKeyInput] = useState(apiKey);
  const [groqKeyInput, setGroqKeyInput] = useState(groqKey || '');

  const handleSave = () => {
    onSave(geminiKeyInput.trim(), groqKeyInput.trim());
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <Key size={16} style={{ marginRight: 6, verticalAlign: '-2px', color: 'var(--accent)' }} />
            API Configuration
          </h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body">
          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Gemini API Key</label>
            <input
              type="password"
              className="input"
              placeholder="Enter your Google AI Studio API key..."
              value={geminiKeyInput}
              onChange={e => setGeminiKeyInput(e.target.value)}
              id="api-key-input"
              autoFocus
            />
            <span className="text-xs text-tertiary">
              Get from{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                Google AI Studio <ExternalLink size={10} />
              </a>
            </span>
          </div>

          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">
              Groq API Key
              <span className="badge badge-info" style={{ marginLeft: 6 }}>Fallback</span>
            </label>
            <input
              type="password"
              className="input"
              placeholder="Enter your Groq API key (optional)..."
              value={groqKeyInput}
              onChange={e => setGroqKeyInput(e.target.value)}
              id="groq-key-input"
            />
            <span className="text-xs text-tertiary">
              Get from{' '}
              <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">
                Groq Console <ExternalLink size={10} />
              </a>
              {' — '}used when Gemini is unavailable
            </span>
          </div>

          <div style={{
            padding: '10px 14px',
            background: 'var(--gray-50)',
            border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            color: 'var(--gray-600)',
          }}>
            <strong>Fallback chain:</strong> Gemini → Groq → Offline Engine
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} id="save-api-key-btn">
            <Check size={14} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
