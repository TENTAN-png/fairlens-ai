import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle, Trash2, Eye, ShieldAlert, Sparkles } from 'lucide-react';

const DEFAULT_ALERTS = [
  {
    id: '1',
    severity: 'critical',
    title: 'Disparate Impact Warning',
    desc: 'Significant gender bias detected in Loan Application analysis. Disparate Impact Ratio of 0.72 is below the 80% legal compliance threshold.',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
    read: false,
    category: 'Fairness'
  },
  {
    id: '2',
    severity: 'warning',
    title: 'Data Quality Deficit',
    desc: 'Completeness check failed for HR candidate screening. Missing values exceed 18% in the "years_of_experience" column.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    read: false,
    category: 'Data Quality'
  },
  {
    id: '3',
    severity: 'info',
    title: 'Compliance Improvement',
    desc: 'Governance evaluation complete. GDPR compliance alignment score increased from 75% to 88% following policy document audit.',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    read: true,
    category: 'Governance'
  },
  {
    id: '4',
    severity: 'critical',
    title: 'Stereotyping Hallucination',
    desc: 'Generative AI Auditor flagged severe stereotype bias in prompt response evaluation. Gender bias rating is critical.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    read: false,
    category: 'GenAI Safety'
  }
];

const MOCK_ALERT_TEMPLATES = [
  {
    severity: 'critical',
    title: 'High Risk Zip Code Proxy',
    desc: 'Feature Drivers analysis detected "ZIP_CODE" has 85% correlation with decision outcome, acting as a proxy for race.',
    category: 'Fairness'
  },
  {
    severity: 'warning',
    title: 'Imbalanced Training Set',
    desc: 'Smart Data Generator recommends adding at least 1,200 synthetic records to balance the underrepresented demographic groups.',
    category: 'Data Quality'
  },
  {
    severity: 'info',
    title: 'Policy Audit Registered',
    desc: 'Hiring Guidelines version 4.2 audited successfully. Total fairness risk index rated Low (92/100).',
    category: 'Audit'
  }
];

export default function AlertCenter() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const saved = localStorage.getItem('fairlens_alerts');
    if (saved) {
      try {
        setAlerts(JSON.parse(saved));
      } catch {
        setAlerts(DEFAULT_ALERTS);
      }
    } else {
      setAlerts(DEFAULT_ALERTS);
      localStorage.setItem('fairlens_alerts', JSON.stringify(DEFAULT_ALERTS));
    }
  }, []);

  const saveAlerts = (newAlerts) => {
    setAlerts(newAlerts);
    localStorage.setItem('fairlens_alerts', JSON.stringify(newAlerts));
    // Trigger storage event so sidebar badge can update instantly
    window.dispatchEvent(new Event('storage'));
  };

  const markAllRead = () => {
    const updated = alerts.map(a => ({ ...a, read: true }));
    saveAlerts(updated);
  };

  const toggleRead = (id) => {
    const updated = alerts.map(a => a.id === id ? { ...a, read: !a.read } : a);
    saveAlerts(updated);
  };

  const deleteAlert = (id) => {
    const updated = alerts.filter(a => a.id !== id);
    saveAlerts(updated);
  };

  const generateMockAlert = () => {
    const template = MOCK_ALERT_TEMPLATES[Math.floor(Math.random() * MOCK_ALERT_TEMPLATES.length)];
    const newAlert = {
      id: Date.now().toString(),
      severity: template.severity,
      title: template.title,
      desc: template.desc,
      timestamp: new Date().toISOString(),
      read: false,
      category: template.category
    };
    saveAlerts([newAlert, ...alerts]);
  };

  const clearAll = () => {
    saveAlerts([]);
  };

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !a.read;
    return a.severity === filter;
  });

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>Smart Alert Center</h2>
          <p>Real-time detection of algorithmic bias, policy violations, and structural data imbalances.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={generateMockAlert}>
            <Sparkles size={14} /> Simulate Alert
          </button>
          {unreadCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
              <Eye size={14} /> Mark All Read
            </button>
          )}
          {alerts.length > 0 && (
            <button className="btn btn-secondary btn-sm" style={{ color: 'var(--red)' }} onClick={clearAll}>
              <Trash2 size={14} /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Stats and Filter Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16 }}>
          <div style={{ padding: 10, background: 'var(--red-bg)', borderRadius: '50%', color: 'var(--red)' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div className="text-xs text-secondary">Critical Actions Required</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {alerts.filter(a => a.severity === 'critical' && !a.read).length}
            </div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16 }}>
          <div style={{ padding: 10, background: 'var(--yellow-bg)', borderRadius: '50%', color: 'var(--yellow)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-xs text-secondary">Active Warning Flags</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {alerts.filter(a => a.severity === 'warning' && !a.read).length}
            </div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16 }}>
          <div style={{ padding: 10, background: 'var(--blue-bg)', borderRadius: '50%', color: 'var(--blue)' }}>
            <Bell size={24} />
          </div>
          <div>
            <div className="text-xs text-secondary">Unread Notifications</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{unreadCount}</div>
          </div>
        </div>
      </div>

      {/* Tabs / Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'All Alerts' },
          { id: 'unread', label: `Unread (${unreadCount})` },
          { id: 'critical', label: 'Critical Only' },
          { id: 'warning', label: 'Warnings' },
          { id: 'info', label: 'Info' }
        ].map(btn => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className={`preset-scenario-btn ${filter === btn.id ? 'active' : ''}`}
            style={{
              padding: '6px 16px',
              fontSize: '0.8125rem',
              background: filter === btn.id ? 'var(--accent)' : 'var(--card-bg)',
              color: filter === btn.id ? 'white' : 'var(--text-secondary)'
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Alert Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map(alert => {
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';
            return (
              <div
                key={alert.id}
                className="risk-factor-card"
                style={{
                  display: 'flex',
                  gap: 16,
                  alignItems: 'flex-start',
                  borderLeft: `4px solid ${isCritical ? 'var(--red)' : isWarning ? 'var(--yellow)' : 'var(--blue)'}`,
                  opacity: alert.read ? 0.65 : 1,
                  background: alert.read ? 'transparent' : 'var(--card-bg)',
                  transition: 'opacity 0.2s ease, background 0.2s ease',
                  padding: 16
                }}
              >
                {/* Severity Icon */}
                <div style={{
                  padding: 8,
                  borderRadius: 6,
                  background: isCritical ? 'var(--red-bg)' : isWarning ? 'var(--yellow-bg)' : 'var(--blue-bg)',
                  color: isCritical ? 'var(--red)' : isWarning ? 'var(--yellow)' : 'var(--blue)',
                  marginTop: 2
                }}>
                  {isCritical ? <ShieldAlert size={18} /> : isWarning ? <AlertTriangle size={18} /> : <Info size={18} />}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{alert.title}</h4>
                    <span className={`badge badge-${isCritical ? 'danger' : isWarning ? 'warning' : 'info'}`}>
                      {alert.category}
                    </span>
                    <span className="text-xs text-tertiary" style={{ marginLeft: 'auto' }}>
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(alert.timestamp).toLocaleDateString()})
                    </span>
                  </div>
                  <p className="text-sm text-secondary" style={{ margin: '0 0 10px 0', lineHeight: 1.4 }}>{alert.desc}</p>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => toggleRead(alert.id)}
                      className="text-xs font-semibold hover-accent"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {alert.read ? 'Mark Unread' : 'Mark as Read'}
                    </button>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="text-xs font-semibold"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--red)',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, textAlign: 'center' }}>
            <CheckCircle size={40} style={{ color: 'var(--green)', marginBottom: 12 }} />
            <h4 style={{ margin: 0 }}>All Clear!</h4>
            <p className="text-sm text-secondary" style={{ margin: '4px 0 0 0', maxWidth: 400 }}>
              No alerts match this filter. Your algorithms are performing within standard thresholds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
