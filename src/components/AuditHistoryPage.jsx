import { useState, useEffect } from 'react';
import { History, Trash2, Eye, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { getHistory, deleteAudit, clearHistory } from '../utils/auditHistory';

export default function AuditHistoryPage({ setAnalysisResult, setAiInsightsText, onViewReport }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleDelete = (id) => {
    setHistory(deleteAudit(id));
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all audit history? This cannot be undone.')) {
      setHistory(clearHistory());
    }
  };

  const handleLoad = (audit) => {
    setAnalysisResult(audit.result);
    setAiInsightsText('');
    onViewReport();
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Audit History</h2>
          <p>Review past bias analyses and their results</p>
        </div>
        {history.length > 0 && (
          <button className="btn btn-sm btn-danger" onClick={handleClearAll} id="clear-history-btn">
            <Trash2 size={12} /> Clear All
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <History size={28} />
          </div>
          <h3>No Audit History</h3>
          <p>Results will appear here after you run an analysis.</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map(audit => (
            <div key={audit.id} className="history-item" onClick={() => handleLoad(audit)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {audit.result?.severity?.level === 'good'
                  ? <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                  : <AlertTriangle size={16} style={{ color: audit.result?.severity?.level === 'warning' ? 'var(--warning)' : 'var(--danger)' }} />
                }
                <div className="history-item-info">
                  <h4>{audit.fileName || 'Unknown Dataset'}</h4>
                  <p>
                    {audit.config?.sensitiveCol} → {audit.config?.targetCol}
                    {' · '}Score: {audit.result?.fairnessScore}/100
                  </p>
                </div>
              </div>
              <div className="history-item-meta">
                <span className={`badge badge-${
                  audit.result?.severity?.level === 'good' ? 'success' :
                  audit.result?.severity?.level === 'warning' ? 'warning' : 'danger'
                }`}>
                  {audit.result?.fairnessScore}/100
                </span>
                <span className="text-xs text-tertiary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} />
                  {audit.savedAt ? new Date(audit.savedAt).toLocaleDateString() : 'N/A'}
                </span>
                <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); handleLoad(audit); }}>
                  <Eye size={12} /> View
                </button>
                <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(audit.id); }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
