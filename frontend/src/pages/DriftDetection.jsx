import React, { useState } from 'react';
import { 
  GitCompare, 
  Play, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  HelpCircle,
  RotateCw,
  FileText
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import DriftTable from '../components/DriftTable';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { Link } from 'react-router-dom';

export default function DriftDetection({ 
  latestReport, 
  onRunScan, 
  isLoading, 
  error, 
  environment, 
  mode,
  onToggleMode 
}) {
  if (isLoading && !latestReport) {
    return <LoadingState message="Executing drift sweep across target environment..." />;
  }

  if (error && !latestReport) {
    return <ErrorState title="Failed to perform drift check" error={error} onRetry={onRunScan} />;
  }

  if (!latestReport || !latestReport.summary) {
    return <EmptyState onRunScan={onRunScan} isLoading={isLoading} />;
  }

  const { 
    summary, 
    findings = [], 
    overall_status, 
    scan_timestamp, 
    baseline_snapshot,
    collection_scope = latestReport.report?.collection_scope 
  } = latestReport;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header bar */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>DETECTION ENGINE</span>
            <StatusBadge status={overall_status} />
            <StatusBadge status={mode} text={`${mode} SCAN`} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            Infrastructure Drift & Discrepancy Analysis
          </h2>
          <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px' }}>
            Target: <strong>{environment}</strong> &bull; Scanned at:{' '}
            <strong>{new Date(scan_timestamp).toLocaleString()}</strong>
            {collection_scope?.execution_context && (
              <> &bull; Execution Scope: <strong style={{ color: '#0369a1' }}>{collection_scope.execution_context}</strong> ({collection_scope.target_host || 'local'})</>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onToggleMode}
            title="Toggle between Real Host Collection and Simulated Sandbox"
          >
            <span>Mode: {mode}</span>
          </button>
          <button 
            className="btn btn-primary"
            onClick={onRunScan}
            disabled={isLoading}
            style={{ minWidth: '130px' }}
          >
            {isLoading ? <div className="spinner" /> : <Play size={16} fill="currentColor" />}
            <span>{isLoading ? 'Scanning...' : 'Run Scan'}</span>
          </button>
        </div>
      </div>

      {/* Mandatory Non-Remediation Warning Banner */}
      <div className="alert-banner alert-banner-read-only">
        <ShieldAlert size={20} color="#1e40af" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Operational Safety Notice:</strong> DriftGuard reports discrepancies and recommendations. It does not automatically modify, remediate, restart, or reconfigure infrastructure. All corrective actions must be validated and performed by approved operators.
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div 
        className="card" 
        style={{ 
          padding: '16px 20px', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
          gap: '16px',
          alignItems: 'center'
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Checked</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{summary.total}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase' }}>Matching</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{summary.matching}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase' }}>Drift Findings</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{summary.drift}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ea580c', textTransform: 'uppercase' }}>Missing Values</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ea580c' }}>{summary.missing || 0}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase' }}>Unexpected Keys</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>{summary.unexpected || 0}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7c3aed', textTransform: 'uppercase' }}>Unavailable Probes</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#7c3aed' }}>{summary.unavailable || 0}</div>
        </div>
      </div>

      {/* Detailed Filterable Drift Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <GitCompare size={18} color="#2563eb" />
              <span>Configuration Findings & Recommendations</span>
            </h3>
            <span className="card-subtitle">Click any row to open the complete discrepancy diagnosis and guidance</span>
          </div>
          <Link to="/reports" className="btn btn-secondary btn-sm">
            <FileText size={14} />
            <span>Generate Report</span>
          </Link>
        </div>

        <DriftTable findings={findings} showFilters={true} initialFilter="ALL" />
      </div>
    </div>
  );
}
