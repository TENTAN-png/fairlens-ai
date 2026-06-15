import { useState, useRef, useCallback } from 'react';
import { Info, RefreshCw, ZoomIn, ZoomOut, Network, AlertTriangle, CheckCircle } from 'lucide-react';

// ── Node definitions ──────────────────────────────────────────────────────────
const NODES = [
  { id: 'dept',    label: 'Department',    x: 400, y: 80,  color: '#4285f4', risk: 'medium', icon: '🏢',
    desc: 'The team or department an employee belongs to. High correlation with promotion rates detected.' },
  { id: 'gender',  label: 'Gender',        x: 130, y: 200, color: '#ea4335', risk: 'high',   icon: '⚧',
    desc: 'Gender shows a significant influence on both salary and promotion decisions. Fairness concern flagged.' },
  { id: 'age',     label: 'Age',           x: 670, y: 200, color: '#fbbc04', risk: 'medium', icon: '📅',
    desc: 'Age correlates moderately with senior roles. Possible age-based filtering detected in some departments.' },
  { id: 'income',  label: 'Income Level',  x: 130, y: 380, color: '#9334e6', risk: 'medium', icon: '💰',
    desc: 'Income is influenced by department and gender. The income gap between groups is 18%.' },
  { id: 'edu',     label: 'Education',     x: 670, y: 380, color: '#12b5cb', risk: 'low',    icon: '🎓',
    desc: 'Education level shows a fair relationship with outcomes. No significant bias detected.' },
  { id: 'perf',    label: 'Performance',  x: 400, y: 340, color: '#1e8e3e', risk: 'low',    icon: '📊',
    desc: 'Performance scores appear neutral across groups when controlling for department.' },
  { id: 'outcome', label: 'Decision',      x: 400, y: 520, color: '#e8710a', risk: 'high',   icon: '⚖️',
    desc: 'Final AI decision (hire / promote / approve). Gender and department are the strongest predictors, raising fairness concerns.' },
];

// ── Edge definitions ──────────────────────────────────────────────────────────
const EDGES = [
  { from: 'dept',   to: 'outcome', strength: 0.72, label: 'Strong influence',   risk: 'high'   },
  { from: 'gender', to: 'outcome', strength: 0.68, label: 'Strong influence',   risk: 'high'   },
  { from: 'gender', to: 'income',  strength: 0.55, label: 'Moderate influence', risk: 'medium' },
  { from: 'age',    to: 'outcome', strength: 0.42, label: 'Moderate influence', risk: 'medium' },
  { from: 'edu',    to: 'perf',    strength: 0.61, label: 'Strong influence',   risk: 'low'    },
  { from: 'perf',   to: 'outcome', strength: 0.58, label: 'Moderate influence', risk: 'low'    },
  { from: 'income', to: 'outcome', strength: 0.38, label: 'Weak influence',     risk: 'medium' },
  { from: 'dept',   to: 'perf',    strength: 0.44, label: 'Moderate influence', risk: 'low'    },
  { from: 'age',    to: 'income',  strength: 0.35, label: 'Weak influence',     risk: 'low'    },
  { from: 'edu',    to: 'outcome', strength: 0.31, label: 'Weak influence',     risk: 'low'    },
];

const RISK_COLOR = { high: '#d93025', medium: '#f9ab00', low: '#1e8e3e' };
const RISK_BG    = { high: '#fce8e6', medium: '#fef7e0', low: '#e6f4ea' };

function getNodeById(id) { return NODES.find(n => n.id === id); }

// Compute edge path between two nodes
function edgePath(from, to) {
  const n1 = getNodeById(from);
  const n2 = getNodeById(to);
  if (!n1 || !n2) return '';
  const mx = (n1.x + n2.x) / 2;
  const my = (n1.y + n2.y) / 2 - 20;
  return `M ${n1.x} ${n1.y} Q ${mx} ${my} ${n2.x} ${n2.y}`;
}

export default function RelationshipExplorer() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredEdge, setHoveredEdge]   = useState(null);
  const [filter, setFilter]             = useState('all'); // 'all' | 'high' | 'medium' | 'low'
  const [zoom, setZoom]                 = useState(1);
  const svgRef = useRef(null);

  const selectedNodeData  = selectedNode ? getNodeById(selectedNode) : null;
  const connectedEdges    = selectedNode
    ? EDGES.filter(e => e.from === selectedNode || e.to === selectedNode)
    : [];
  const connectedNodeIds  = new Set(connectedEdges.flatMap(e => [e.from, e.to]));

  const filteredEdges = EDGES.filter(e =>
    filter === 'all' || e.risk === filter
  );

  const handleReset = useCallback(() => {
    setSelectedNode(null);
    setFilter('all');
    setZoom(1);
  }, []);

  const riskCounts = {
    high:   EDGES.filter(e => e.risk === 'high').length,
    medium: EDGES.filter(e => e.risk === 'medium').length,
    low:    EDGES.filter(e => e.risk === 'low').length,
  };

  const highRiskNodes  = NODES.filter(n => n.risk === 'high').length;
  const overallRisk    = highRiskNodes >= 2 ? 'High' : highRiskNodes === 1 ? 'Medium' : 'Low';
  const overallColor   = RISK_COLOR[overallRisk.toLowerCase()];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Fairness Relationship Explorer</h2>
        <p>Visualise how personal characteristics influence AI decisions — and where unfair patterns are hiding</p>
      </div>

      {/* Info Banner */}
      <div className="info-banner" style={{ marginBottom: 20 }}>
        <Info size={16} />
        <span>
          Each node is a data attribute. Arrows show how strongly one factor influences another.
          <strong> Red arrows = high fairness risk. </strong>
          Click any node to explore its connections. Thicker lines mean stronger influence.
        </span>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: overallColor }}>{overallRisk}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 4 }}>Overall Fairness Risk</div>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer', border: filter === 'high' ? '2px solid var(--red)' : undefined }}
          onClick={() => setFilter(f => f === 'high' ? 'all' : 'high')}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: RISK_COLOR.high }}>{riskCounts.high}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 4 }}>High-Risk Links</div>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer', border: filter === 'medium' ? '2px solid var(--yellow)' : undefined }}
          onClick={() => setFilter(f => f === 'medium' ? 'all' : 'medium')}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: RISK_COLOR.medium }}>{riskCounts.medium}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 4 }}>Medium-Risk Links</div>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer', border: filter === 'low' ? '2px solid var(--green)' : undefined }}
          onClick={() => setFilter(f => f === 'low' ? 'all' : 'low')}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: RISK_COLOR.low }}>{riskCounts.low}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 4 }}>Low-Risk Links</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--blue)' }}>{NODES.length}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 4 }}>Data Attributes</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', fontWeight: 500 }}>Filter by risk:</span>
        {['all', 'high', 'medium', 'low'].map(r => (
          <button key={r} className={`btn ${filter === r ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8125rem', padding: '4px 12px' }}
            onClick={() => setFilter(r)}>
            {r === 'all' ? 'Show All' : r.charAt(0).toUpperCase() + r.slice(1) + ' Risk'}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary" onClick={() => setZoom(z => Math.min(1.6, z + 0.15))} style={{ padding: '4px 8px' }}>
            <ZoomIn size={14} />
          </button>
          <button className="btn btn-secondary" onClick={() => setZoom(z => Math.max(0.5, z - 0.15))} style={{ padding: '4px 8px' }}>
            <ZoomOut size={14} />
          </button>
          <button className="btn btn-secondary" onClick={handleReset} style={{ padding: '4px 10px', gap: 5 }}>
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Main Graph + Detail Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedNode ? '1fr 300px' : '1fr', gap: 16 }}>

        {/* SVG Graph */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <svg
            ref={svgRef}
            viewBox="0 0 800 620"
            style={{
              width: '100%',
              height: 460,
              cursor: 'grab',
              display: 'block',
              background: 'var(--gray-100)',
              transition: 'transform 0.3s ease',
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            <defs>
              {['high', 'medium', 'low'].map(r => (
                <marker key={r} id={`arrow-${r}`} markerWidth="8" markerHeight="8"
                  refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L8,3 z" fill={RISK_COLOR[r]} />
                </marker>
              ))}
              {/* Glow filter for selected nodes */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Grid lines */}
            {Array.from({ length: 8 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 80} x2="800" y2={i * 80}
                stroke="var(--gray-200)" strokeWidth="1" />
            ))}
            {Array.from({ length: 11 }, (_, i) => (
              <line key={`v${i}`} x1={i * 80} y1="0" x2={i * 80} y2="620"
                stroke="var(--gray-200)" strokeWidth="1" />
            ))}

            {/* Edges */}
            {filteredEdges.map((edge, i) => {
              const isHighlighted = !selectedNode || connectedEdges.includes(edge);
              const isHovered     = hoveredEdge === i;
              const strokeW       = 1.5 + edge.strength * 4;
              const opacity       = isHighlighted ? (isHovered ? 1 : 0.75) : 0.1;
              return (
                <g key={i}>
                  {/* Invisible thick line for easier hover */}
                  <path
                    d={edgePath(edge.from, edge.to)}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={20}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredEdge(i)}
                    onMouseLeave={() => setHoveredEdge(null)}
                  />
                  <path
                    d={edgePath(edge.from, edge.to)}
                    fill="none"
                    stroke={RISK_COLOR[edge.risk]}
                    strokeWidth={isHovered ? strokeW + 1.5 : strokeW}
                    strokeOpacity={opacity}
                    strokeDasharray={edge.risk === 'low' ? '6 4' : 'none'}
                    markerEnd={`url(#arrow-${edge.risk})`}
                    style={{ transition: 'stroke-opacity 0.25s, stroke-width 0.2s' }}
                  />
                  {/* Strength label on hover */}
                  {isHovered && (() => {
                    const n1 = getNodeById(edge.from);
                    const n2 = getNodeById(edge.to);
                    if (!n1 || !n2) return null;
                    const mx = (n1.x + n2.x) / 2;
                    const my = (n1.y + n2.y) / 2 - 30;
                    return (
                      <g>
                        <rect x={mx - 38} y={my - 12} width={76} height={20} rx={6}
                          fill="white" stroke={RISK_COLOR[edge.risk]} strokeWidth={1} />
                        <text x={mx} y={my + 3} textAnchor="middle"
                          fontSize={11} fontWeight={600} fill={RISK_COLOR[edge.risk]}>
                          {edge.label} ({(edge.strength * 100).toFixed(0)}%)
                        </text>
                      </g>
                    );
                  })()}
                </g>
              );
            })}

            {/* Nodes */}
            {NODES.map(node => {
              const isSelected   = selectedNode === node.id;
              const isDimmed     = selectedNode && !connectedNodeIds.has(node.id) && selectedNode !== node.id;
              const opacity      = isDimmed ? 0.2 : 1;
              const r            = isSelected ? 42 : 36;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{ cursor: 'pointer', opacity, transition: 'opacity 0.25s' }}
                  onClick={() => setSelectedNode(n => n === node.id ? null : node.id)}
                >
                  {/* Outer ring (risk colour) */}
                  <circle r={r + 6} fill={RISK_BG[node.risk]} stroke={RISK_COLOR[node.risk]}
                    strokeWidth={isSelected ? 3 : 1.5}
                    filter={isSelected ? 'url(#glow)' : undefined}
                    style={{ transition: 'r 0.2s' }} />
                  {/* Inner circle (brand colour) */}
                  <circle r={r} fill={node.color} fillOpacity={0.9} />
                  {/* Icon */}
                  <text textAnchor="middle" dominantBaseline="central"
                    fontSize={isSelected ? 20 : 17} y={-6}>{node.icon}</text>
                  {/* Label */}
                  <text textAnchor="middle" fontSize={11} fontWeight={700}
                    fill="white" y={12} style={{ pointerEvents: 'none' }}>
                    {node.label.split(' ').map((w, i) => (
                      <tspan key={i} x={0} dy={i === 0 ? 0 : 13}>{w}</tspan>
                    ))}
                  </text>
                  {/* Risk badge */}
                  <circle r={8} cx={r - 4} cy={-(r - 4)} fill={RISK_COLOR[node.risk]} />
                  <text x={r - 4} y={-(r - 4) + 1} textAnchor="middle" dominantBaseline="central"
                    fontSize={9} fontWeight={700} fill="white">
                    {node.risk === 'high' ? '!' : node.risk === 'medium' ? '~' : '✓'}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 20, padding: '10px 16px', background: 'var(--white)', borderTop: '1px solid var(--gray-200)', flexWrap: 'wrap' }}>
            {Object.entries(RISK_COLOR).map(([risk, color]) => (
              <div key={risk} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
                <div style={{ width: 24, height: 4, background: color, borderRadius: 2 }} />
                <span style={{ color: 'var(--gray-600)' }}>{risk.charAt(0).toUpperCase() + risk.slice(1)} Risk</span>
              </div>
            ))}
            <span style={{ color: 'var(--gray-400)', fontSize: '0.75rem' }}>· Line thickness = influence strength · Dashed = low risk</span>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedNode && selectedNodeData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Node Info */}
            <div className="card" style={{ borderTop: `3px solid ${selectedNodeData.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: selectedNodeData.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                  {selectedNodeData.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedNodeData.label}</div>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: '0.6875rem', fontWeight: 600, marginTop: 2,
                    background: RISK_BG[selectedNodeData.risk], color: RISK_COLOR[selectedNodeData.risk],
                  }}>
                    {selectedNodeData.risk === 'high' ? '⚠️ High Risk' : selectedNodeData.risk === 'medium' ? '⚡ Medium Risk' : '✅ Low Risk'}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-700)', lineHeight: 1.6 }}>{selectedNodeData.desc}</p>
            </div>

            {/* Connected Edges */}
            <div className="card">
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 10, color: 'var(--gray-700)' }}>
                <Network size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                Connections ({connectedEdges.length})
              </div>
              {connectedEdges.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--gray-400)' }}>No connections</p>
              ) : connectedEdges.map((e, i) => {
                const other = getNodeById(e.from === selectedNode ? e.to : e.from);
                const direction = e.from === selectedNode ? '→' : '←';
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
                    borderBottom: i < connectedEdges.length - 1 ? '1px solid var(--gray-100)' : 'none',
                  }}>
                    <span style={{ fontSize: '1rem' }}>{other?.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                        {direction} {other?.label}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: RISK_COLOR[e.risk] }}>
                        {e.label} · {(e.strength * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: RISK_COLOR[e.risk], flexShrink: 0,
                    }} />
                  </div>
                );
              })}
            </div>

            {/* Recommendation */}
            <div className="card" style={{ background: selectedNodeData.risk === 'high' ? 'var(--red-bg)' : selectedNodeData.risk === 'medium' ? 'var(--amber-bg)' : 'var(--green-bg)', border: `1px solid ${RISK_COLOR[selectedNodeData.risk]}20` }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 6, color: RISK_COLOR[selectedNodeData.risk] }}>
                {selectedNodeData.risk === 'high' ? <><AlertTriangle size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />Action Required</> : <><CheckCircle size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />Recommendation</>}
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--gray-700)', lineHeight: 1.55 }}>
                {selectedNodeData.risk === 'high'
                  ? `"${selectedNodeData.label}" has a high influence on final decisions. Run a fairness audit and consider removing or masking this attribute from the AI decision process.`
                  : selectedNodeData.risk === 'medium'
                  ? `Monitor "${selectedNodeData.label}" in upcoming audits. The influence is moderate but could become a concern over time.`
                  : `"${selectedNodeData.label}" appears fair across groups. No immediate action needed, but continue monitoring.`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Insights Table */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-title"><Network size={16} /> All Relationships</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{filteredEdges.length} of {EDGES.length} shown</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--gray-200)', background: 'var(--gray-100)' }}>
                {['From', 'To', 'Influence Strength', 'Description', 'Risk Level'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEdges.map((e, i) => {
                const fromNode = getNodeById(e.from);
                const toNode   = getNodeById(e.to);
                return (
                  <tr key={i} style={{
                    borderBottom: '1px solid var(--gray-100)',
                    background: i % 2 === 0 ? 'transparent' : 'var(--gray-50)',
                    cursor: 'pointer',
                  }}
                    onClick={() => setSelectedNode(e.from)}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                      {fromNode?.icon} {fromNode?.label}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                      → {toNode?.icon} {toNode?.label}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, height: 6, background: 'var(--gray-200)', borderRadius: 3 }}>
                          <div style={{ width: `${e.strength * 100}%`, height: '100%', background: RISK_COLOR[e.risk], borderRadius: 3 }} />
                        </div>
                        <span style={{ fontWeight: 600, color: RISK_COLOR[e.risk] }}>{(e.strength * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--gray-600)' }}>{e.label}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                        background: RISK_BG[e.risk], color: RISK_COLOR[e.risk],
                      }}>
                        {e.risk === 'high' ? '⚠️ High' : e.risk === 'medium' ? '⚡ Medium' : '✅ Low'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
