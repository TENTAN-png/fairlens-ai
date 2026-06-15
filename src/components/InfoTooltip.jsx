import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * A small ⓘ icon that shows a tooltip on hover/click.
 * Usage: <InfoTooltip text="Explanation here" />
 */
export default function InfoTooltip({ text, size = 14 }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setVisible(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [visible]);

  return (
    <span className="info-tooltip-wrapper" ref={ref}>
      <button
        type="button"
        className="info-tooltip-trigger"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVisible(v => !v); }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        aria-label="More info"
      >
        <HelpCircle size={size} />
      </button>
      {visible && (
        <div className="info-tooltip-bubble">
          {text}
          <div className="info-tooltip-arrow" />
        </div>
      )}
    </span>
  );
}
