import { useState, useRef } from 'react';
import { Send, Bot, User, Sparkles, Loader, Trash2 } from 'lucide-react';
import { generateWithFallbackChat } from '../utils/geminiAPI';

export default function AIChatAssistant({ analysisResult }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I\'m your FairLens AI assistant. Ask me anything about your bias analysis results, fairness metrics, or mitigation strategies.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const buildContext = () => {
    if (!analysisResult) return 'No analysis has been run yet.';
    const r = analysisResult;
    return `Current analysis: Dataset has ${r.meta.totalRows} rows. Sensitive: "${r.meta.sensitiveCol}", Target: "${r.meta.targetCol}", Favorable: "${r.meta.favorableValue}", Privileged: "${r.meta.privilegedValue}". Disparate Impact: ${r.disparateImpact?.toFixed(4)}, Statistical Parity: ${r.statisticalParityDiff?.toFixed(4)}, Fairness Score: ${r.fairnessScore}/100, Severity: ${r.severity.label}. Group rates: ${Object.entries(r.groupRates).map(([g,i]) => `${g}: ${(i.rate*100).toFixed(1)}%`).join(', ')}.`;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const context = buildContext();
      const prompt = `You are FairLens AI, a bias and fairness expert. Be concise (2-3 paragraphs max). Context: ${context}\n\nUser: ${userMsg}`;
      const response = await generateWithFallbackChat(prompt);
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I couldn\'t process that. Try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>AI Chat Assistant</h2>
        <p>Ask questions about your bias analysis results</p>
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.role}`}>
              <div className="chat-avatar">
                {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className="chat-bubble">
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-message assistant">
              <div className="chat-avatar"><Bot size={16} /></div>
              <div className="chat-bubble"><Loader size={14} className="spin-icon" /> Thinking...</div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-bar">
          <input
            className="input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about bias metrics, mitigation strategies..."
            disabled={loading}
            id="chat-input"
          />
          <button className="btn btn-primary" onClick={sendMessage} disabled={loading || !input.trim()}>
            <Send size={16} />
          </button>
        </div>

        {!analysisResult && (
          <p className="text-xs text-tertiary" style={{ textAlign: 'center', marginTop: 8 }}>
            Run an analysis first for context-aware responses
          </p>
        )}
      </div>
    </div>
  );
}
