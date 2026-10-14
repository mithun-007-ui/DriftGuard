import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle,
  XCircle,
  HelpCircle,
  AlertOctagon
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import RecommendationPanel from './RecommendationPanel';

export default function DriftTable({ findings = [], showFilters = true, initialFilter = 'ALL' }) {
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState('');
  const [selectedFinding, setSelectedFinding] = useState(null);

  const filterOptions = [
    { id: 'ALL', label: 'All Findings' },
    { id: 'MATCH', label: 'Match' },
    { id: 'DRIFT', label: 'Drift' },
    { id: 'MISSING', label: 'Missing' },
    { id: 'UNEXPECTED', label: 'Unexpected' },
    { id: 'UNAVAILABLE', label: 'Unavailable' },
    { id: 'ERROR', label: 'Error' },
  ];

  const filteredFindings = findings.filter((f) => {
    // Status filter
    if (filter !== 'ALL' && f.status !== filter) {
      return false;
    }
    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchSetting = f.setting.toLowerCase().includes(q);
      const matchReason = f.reason ? f.reason.toLowerCase().includes(q) : false;
      const matchRec = f.recommendation ? f.recommendation.toLowerCase().includes(q) : false;
      return matchSetting || matchReason || matchRec;
    }
    return true;
  });

  const formatValueDisplay = (val) => {
    if (val === null || val === undefined) return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None</span>;
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div>
      {/* Filters & Search Header */}
      {showFilters && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          {/* Status Filter Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {filterOptions.map((opt) => {
              const count = opt.id === 'ALL' 
                ? findings.length 
                : findings.filter((f) => f.status === opt.id).length;

              const isActive = filter === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setFilter(opt.id)}
                  className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: '20px', padding: '4px 12px' }}
                >
                  <span>{opt.label}</span>
                  <span 
                    style={{ 
                      fontSize: '0.75rem', 
                      backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0', 
                      padding: '1px 6px', 
                      borderRadius: '10px' 
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search setting or recommendation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '32px', fontSize: '0.8125rem' }}
            />
          </div>
        </div>
      )}

      {/* Findings Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Setting</th>
              <th>Expected Baseline</th>
              <th>Actual Observed</th>
              <th>Status</th>
              <th>Severity</th>
              <th>Action Recommended</th>
              <th style={{ textAlign: 'right' }}>Analysis</th>
            </tr>
          </thead>
          <tbody>
            {filteredFindings.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  No configuration findings match the selected filter.
                </td>
              </tr>
            ) : (
              filteredFindings.map((finding) => (
                <tr 
                  key={finding.setting} 
                  className="clickable-row"
                  onClick={() => setSelectedFinding(finding)}
                >
                  <td>
                    <span className="setting-code">{finding.setting}</span>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.8125rem', color: '#1e293b' }}>
                      {formatValueDisplay(finding.expected)}
                    </code>
                  </td>
                  <td>
                    <code 
                      style={{ 
                        fontSize: '0.8125rem', 
                        color: finding.status === 'DRIFT' ? '#dc2626' : '#1e293b',
                        fontWeight: finding.status === 'DRIFT' ? 600 : 400
                      }}
                    >
                      {formatValueDisplay(finding.actual)}
                    </code>
                  </td>
                  <td>
                    <StatusBadge status={finding.status} />
                  </td>
                  <td>
                    <StatusBadge severity={finding.severity} />
                  </td>
                  <td style={{ maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#475569' }} title={finding.recommendation}>
                      {finding.recommendation}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFinding(finding);
                      }}
                      title="Inspect Discrepancy Analysis"
                    >
                      <ExternalLink size={14} />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Discrepancy Detail Modal Drawer */}
      {selectedFinding && (
        <RecommendationPanel 
          finding={selectedFinding} 
          onClose={() => setSelectedFinding(null)} 
        />
      )}
    </div>
  );
}
