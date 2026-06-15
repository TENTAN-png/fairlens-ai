import { useMemo } from 'react';
import { Shuffle, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function DecisionConsistencyCheck({ parsedData, analysisResult }) {
  const consistencyReport = useMemo(() => {
    if (!parsedData?.data?.length || !analysisResult) return null;
    const { data } = parsedData;
    const { sensitiveCol, targetCol, favorableValue, privilegedValue } = analysisResult.meta;
    const groups = [...new Set(data.map(r => String(r[sensitiveCol])))];
    if (groups.length < 2) return null;

    // For each record, check: would the outcome change if the personal characteristic were different?
    const sampleSize = Math.min(data.length, 200);
    const sample = data.slice(0, sampleSize);
    let consistent = 0, inconsistent = 0;
    const examples = [];

    sample.forEach((row, idx) => {
      const currentGroup = String(row[sensitiveCol]);
      const currentOutcome = String(row[targetCol]) === String(favorableValue) ? 'Approved' : 'Rejected';
      // Check expected outcome based on group rates
      const otherGroups = groups.filter(g => g !== currentGroup);
      const currentRate = analysisResult.groupRates[currentGroup]?.rate ?? 0.5;

      otherGroups.forEach(otherGroup => {
        const otherRate = analysisResult.groupRates[otherGroup]?.rate ?? 0.5;
        const rateDiff = Math.abs(currentRate - otherRate);
        // If rate difference is > 15%, this is a consistency concern
        const wouldChange = rateDiff > 0.15 && (
          (currentOutcome === 'Approved' && otherRate < currentRate * 0.7) ||
          (currentOutcome === 'Rejected' && otherRate > currentRate * 1.3)
        );

        if (wouldChange) {
          inconsistent++;
          if (examples.length < 6) {
            examples.push({
              id: idx + 1,
              currentGroup, otherGroup,
              currentOutcome,
              projectedOutcome: currentOutcome === 'Approved' ? 'Rejected' : 'Approved',
              concern: true
            });
          }
        } else {
          consistent++;
          if (examples.length < 6 && examples.filter(e => !e.concern).length < 2) {
            examples.push({
              id: idx + 1,
              currentGroup, otherGroup,
              currentOutcome,
              projectedOutcome: currentOutcome,
              concern: false
            });
          }
        }
      });
    });

    const total = consistent + inconsistent;
    const consistencyScore = total > 0 ? Math.round((consistent / total) * 100) : 100;
    const status = consistencyScore >= 90 ? 'Consistent' : consistencyScore >= 70 ? 'Needs Review' : 'Potential Fairness Concern';

    return { consistent, inconsistent, total, consistencyScore, status, examples, groups, sensitiveCol, targetCol };
  }, [parsedData, analysisResult]);

  if (!consistencyReport) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon"><Shuffle size={28} /></div>
          <h3>No Analysis Available</h3>
          <p>Run a fairness analysis first to check decision consistency.</p>
        </div>
      </div>
    );
  }

  const c = consistencyReport;
  const statusColor = c.consistencyScore >= 90 ? 'var(--green)' : c.consistencyScore >= 70 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Decision Consistency Check</h2>
        <p>If personal characteristics were different, would the decision still be the same?</p>
      </div>

      {/* Score Card */}
      <div className={`scorecard ${c.consistencyScore >= 90 ? 'good' : c.consistencyScore >= 70 ? 'warning' : 'danger'}`} style={{ marginBottom: 24 }}>
        <div className="scorecard-score" style={{ background: c.consistencyScore >= 90 ? 'var(--green-bg)' : c.consistencyScore >= 70 ? 'var(--yellow-bg)' : 'var(--red-bg)', border: `2px solid ${statusColor}` }}>
          <span className="score-value" style={{ color: statusColor }}>{c.consistencyScore}%</span>
        </div>
        <div className="scorecard-info">
          <h3>{c.status}</h3>
          <p>{c.consistent} consistent decisions, {c.inconsistent} potential concerns out of {c.total} comparisons</p>
        </div>
        <span className={`badge badge-${c.consistencyScore >= 90 ? 'success' : c.consistencyScore >= 70 ? 'warning' : 'danger'}`} style={{ fontSize: '0.875rem', padding: '6px 16px' }}>
          {c.status}
        </span>
      </div>

      {/* Persona Cards */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title"><Shuffle size={16} /> Sample Decision Comparisons</span>
        </div>
        <div className="consistency-cards-grid">
          {c.examples.map((ex, i) => (
            <div key={i} className={`consistency-persona-card ${ex.concern ? 'concern' : 'ok'}`}>
              <div className="consistency-persona-header">
                <span className="consistency-persona-id">Record #{ex.id}</span>
                {ex.concern
                  ? <XCircle size={16} style={{ color: 'var(--red)' }} />
                  : <CheckCircle size={16} style={{ color: 'var(--green)' }} />}
              </div>
              <div className="consistency-persona-body">
                <div className="consistency-scenario">
                  <div className="consistency-original">
                    <span className="text-xs text-secondary">{c.sensitiveCol}</span>
                    <strong>{ex.currentGroup}</strong>
                    <span className={`badge badge-${ex.currentOutcome === 'Approved' ? 'success' : 'danger'}`}>{ex.currentOutcome}</span>
                  </div>
                  <div className="consistency-arrow">→</div>
                  <div className="consistency-counterfactual">
                    <span className="text-xs text-secondary">{c.sensitiveCol}</span>
                    <strong>{ex.otherGroup}</strong>
                    <span className={`badge badge-${ex.projectedOutcome === 'Approved' ? 'success' : 'danger'}`}>{ex.projectedOutcome}</span>
                  </div>
                </div>
              </div>
              <div className="consistency-persona-footer">
                {ex.concern
                  ? <span className="text-xs" style={{ color: 'var(--red)' }}>⚠️ Decision may change unfairly</span>
                  : <span className="text-xs" style={{ color: 'var(--green)' }}>✓ Decision stays consistent</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Explanation */}
      <div className="agent-executive-summary">
        <p>💡 <strong>What does this mean?</strong> This check evaluates whether decisions would change if a person's {c.sensitiveCol} were different, while keeping all other qualifications the same. A low consistency score means the system may be making different decisions based on personal characteristics rather than relevant qualifications.</p>
      </div>
    </div>
  );
}
