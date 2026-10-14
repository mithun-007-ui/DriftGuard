import React from 'react';
import { 
  X, 
  ShieldAlert, 
  Clock, 
  Lightbulb, 
  FileText, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function RecommendationPanel({ finding, onClose }) {
  if (!finding) return null;

  const formatVal = (val) => {
    if (val === null || val === undefined) return '<None / Unobserved>';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <StatusBadge status={finding.status} />
              <StatusBadge severity={finding.severity} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              Discrepancy Analysis: <code className="setting-code">{finding.setting}</code>
            </h2>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Side by side Diff */}
          <div className="diff-box">
            <div className="diff-pane">
              <div className="diff-pane-header">Expected Value (Declared Baseline)</div>
              <div className="diff-pane-content diff-expected">
                {formatVal(finding.expected)}
              </div>
            </div>

            <div className="diff-pane">
              <div className="diff-pane-header">Observed Value (Actual Host State)</div>
              <div className={`diff-pane-content ${finding.status === 'DRIFT' ? 'diff-actual-drift' : ''}`}>
                {formatVal(finding.actual)}
              </div>
            </div>
          </div>

          {/* Finding Reason */}
          <div className="card" style={{ padding: '16px', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              <FileText size={16} />
              <span>Diagnostic Finding Reason</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#0f172a' }}>
              {finding.reason}
            </p>
          </div>

          {/* Corrective Action Recommendation */}
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid #2563eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#1d4ed8', marginBottom: '6px' }}>
              <Lightbulb size={18} />
              <span>Recommended Operator Action</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#1e293b', lineHeight: 1.5 }}>
              {finding.recommendation}
            </p>
          </div>

          {/* Non-destructive disclaimer */}
          <div className="alert-banner alert-banner-read-only" style={{ marginBottom: 0 }}>
            <ShieldAlert size={18} color="#475569" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Strict Read-Only Enforcement:</strong> DriftGuard provides diagnostic visibility and human recommendations. It never executes remediation commands, repairs, or restarts automatically.
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b', marginRight: 'auto' }}>
            <Clock size={14} />
            <span>Observed at: {new Date(finding.timestamp).toLocaleString()}</span>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
