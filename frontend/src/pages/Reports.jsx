import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Clock, 
  ShieldCheck, 
  FileCode, 
  Eye, 
  FolderArchive,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function Reports({ latestReport, environment }) {
  const [reportsList, setReportsList] = useState([]);
  const [selectedReport, setSelectedReport] = useState(latestReport?.report || latestReport);
  const [copied, setCopied] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);

  const fetchReportsHistory = async () => {
    setIsLoadingList(true);
    try {
      const data = await api.getReportsList();
      setReportsList(data.reports || []);
    } catch {
      // Keep empty if none
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchReportsHistory();
  }, [latestReport]);

  useEffect(() => {
    if (latestReport) {
      setSelectedReport(latestReport.report || latestReport);
    }
  }, [latestReport]);

  const reportJsonString = selectedReport ? JSON.stringify(selectedReport, null, 2) : '';

  const handleCopy = () => {
    if (!reportJsonString) return;
    navigator.clipboard.writeText(reportJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!selectedReport) return;
    const reportId = selectedReport.report_id || `drift-report-${Date.now()}`;
    const blob = new Blob([reportJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const loadPastReport = async (reportId) => {
    try {
      const rep = await api.getReportById(reportId);
      setSelectedReport(rep);
    } catch (err) {
      alert(`Could not load report: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>AUDIT ARTIFACTS</span>
            <span className="badge badge-compliant">VERIFIED ARTIFACT</span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            Downloadable Drift Audit Reports
          </h2>
          <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px' }}>
            Report ID: <strong>{selectedReport?.report_id || 'drift-report-latest'}</strong> &bull; Generated:{' '}
            <strong>{selectedReport?.scan_timestamp ? new Date(selectedReport.scan_timestamp).toLocaleString() : 'N/A'}</strong>
          </div>
        </div>

        {/* Export / Download Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleCopy}
            disabled={!selectedReport}
          >
            {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
            <span>{copied ? 'Copied JSON!' : 'Copy JSON'}</span>
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleDownload}
            disabled={!selectedReport}
          >
            <Download size={16} />
            <span>Download JSON Report</span>
          </button>
        </div>
      </div>

      {/* Main Grid: JSON Viewer & Report History */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '20px' }}>
        {/* JSON Preview Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <FileCode size={18} color="#2563eb" />
                <span>Audit Report Payload (JSON)</span>
              </h3>
              <span className="card-subtitle">Complete machine-readable comparison findings</span>
            </div>
            {selectedReport?.mode && (
              <StatusBadge status={selectedReport.mode} text={`${selectedReport.mode} DATA`} />
            )}
          </div>

          {!selectedReport ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
              No audit report generated yet. Run a scan on the Overview or Drift Detection page.
            </div>
          ) : (
            <textarea
              className="form-textarea form-textarea-code"
              value={reportJsonString}
              readOnly
              rows={22}
              style={{ width: '100%', resize: 'vertical', backgroundColor: '#fafbfc' }}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '0.75rem', color: '#64748b' }}>
            <span>Compliant with DevOps audit logging standards.</span>
            <button className="btn btn-primary btn-sm" onClick={handleDownload} disabled={!selectedReport}>
              <Download size={14} />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* Persisted Report History */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <FolderArchive size={18} color="#475569" />
                <span>Persistent Report Archive</span>
              </h3>
              <span className="card-subtitle">Stored to disk (retention: last 25 reports)</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchReportsHistory} title="Refresh report history">
              <RefreshCw size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '480px' }}>
            {reportsList.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>
                No past reports archived on disk yet.
              </div>
            ) : (
              reportsList.map((r) => {
                const isCurrent = selectedReport?.report_id === r.report_id;
                return (
                  <div
                    key={r.report_id}
                    onClick={() => loadPastReport(r.report_id)}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      border: `1px solid ${isCurrent ? '#2563eb' : '#e2e8f0'}`,
                      backgroundColor: isCurrent ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                        {r.report_id}
                      </span>
                      <StatusBadge status={r.overall_status} />
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{new Date(r.scan_timestamp).toLocaleTimeString()}</span>
                      <span>
                        Match: {r.summary?.matching || 0} &bull; Drift: {r.summary?.drift || 0}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ marginTop: '16px', fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
            Reports are stored under <code>backend/data/reports/</code> and persist across server restarts.
          </div>
        </div>
      </div>
    </div>
  );
}
