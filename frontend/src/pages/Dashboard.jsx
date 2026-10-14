import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  Clock, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from 'recharts';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import DriftTable from '../components/DriftTable';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { Link } from 'react-router-dom';

export default function Dashboard({ 
  latestReport, 
  isLoading, 
  error, 
  onRunScan,
  environment,
  mode 
}) {
  if (isLoading && !latestReport) {
    return <LoadingState message="Scanning infrastructure configuration state..." />;
  }

  if (error && !latestReport) {
    return <ErrorState title="Failed to Fetch Drift Data" error={error} onRetry={onRunScan} />;
  }

  if (!latestReport || !latestReport.summary) {
    return <EmptyState onRunScan={onRunScan} isLoading={isLoading} />;
  }

  const { summary, findings = [], overall_status, scan_timestamp } = latestReport;

  // Prepare chart data for Severity Distribution
  const severityCounts = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0
  };
  findings.forEach((f) => {
    if (severityCounts[f.severity] !== undefined) {
      severityCounts[f.severity] += 1;
    }
  });

  const severityChartData = [
    { name: 'Critical', count: severityCounts.CRITICAL, fill: '#dc2626' },
    { name: 'High', count: severityCounts.HIGH, fill: '#ea580c' },
    { name: 'Medium', count: severityCounts.MEDIUM, fill: '#d97706' },
    { name: 'Low', count: severityCounts.LOW, fill: '#3b82f6' },
    { name: 'Info (Match)', count: severityCounts.INFO, fill: '#16a34a' },
  ].filter((d) => d.count > 0);

  // Status breakdown for Pie chart
  const statusPieData = [
    { name: 'Matching', value: summary.matching || 0, fill: '#16a34a' },
    { name: 'Drift', value: summary.drift || 0, fill: '#dc2626' },
    { name: 'Missing', value: summary.missing || 0, fill: '#ea580c' },
    { name: 'Unexpected', value: summary.unexpected || 0, fill: '#2563eb' },
    { name: 'Unavailable', value: summary.unavailable || 0, fill: '#7c3aed' },
    { name: 'Errors', value: summary.errors || 0, fill: '#991b1b' },
  ].filter((d) => d.value > 0);

  // Filter discrepancies (non-matching)
  const discrepancies = findings.filter((f) => f.status !== 'MATCH');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner Status */}
      <div 
        className="card" 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: '16px',
          borderLeft: `5px solid ${overall_status === 'COMPLIANT' ? '#16a34a' : overall_status === 'DRIFT_DETECTED' ? '#dc2626' : '#d97706'}`
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Overall Infrastructure Health
            </span>
            <StatusBadge status={overall_status} />
            <StatusBadge status={mode} text={`${mode} DATA`} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            {overall_status === 'COMPLIANT' && 'All Monitored Infrastructure Settings Match Baseline'}
            {overall_status === 'DRIFT_DETECTED' && `${summary.drift} Configuration Drift Discrepanc${summary.drift === 1 ? 'y' : 'ies'} Detected`}
            {overall_status === 'WARNING' && 'Configuration Warnings: Unexpected or Unavailable Probes'}
            {overall_status === 'ERROR' && 'Collector Probes Encountered Execution Errors'}
          </h2>
          <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px' }}>
            Target Environment: <strong>{environment}</strong> &bull; Scanned at:{' '}
            <strong>{new Date(scan_timestamp).toLocaleString()}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/drift" className="btn btn-secondary">
            <span>View Full Findings</span>
            <ArrowRight size={14} />
          </Link>
          <Link to="/reports" className="btn btn-primary">
            <FileText size={14} />
            <span>Audit Report</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="metrics-grid">
        <MetricCard
          title="Total Settings Checked"
          value={summary.total}
          icon={Layers}
          iconBg="#eff6ff"
          iconColor="#2563eb"
          subtitle="Probes verified across host"
        />
        <MetricCard
          title="Matching Settings"
          value={summary.matching}
          icon={CheckCircle2}
          iconBg="#f0fdf4"
          iconColor="#16a34a"
          subtitle={`${summary.total > 0 ? Math.round((summary.matching / summary.total) * 100) : 0}% compliance rate`}
        />
        <MetricCard
          title="Detected Drift"
          value={summary.drift}
          icon={XCircle}
          iconBg="#fef2f2"
          iconColor="#dc2626"
          subtitle="Settings differing from baseline"
        />
        <MetricCard
          title="Unavailable / Failed"
          value={(summary.unavailable || 0) + (summary.errors || 0)}
          icon={AlertTriangle}
          iconBg="#fffbeb"
          iconColor="#d97706"
          subtitle="Missing permissions or unreachable"
        />
      </div>

      {/* Visualizations Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Severity Distribution */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <TrendingUp size={18} color="#2563eb" />
                <span>Drift Finding Severity Distribution</span>
              </h3>
              <span className="card-subtitle">Breakdown of findings by impact level</span>
            </div>
          </div>
          <div style={{ height: '220px', width: '100%' }}>
            {severityChartData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                No findings to visualize
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} 
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {severityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Distribution Pie */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Activity size={18} color="#16a34a" />
                <span>Configuration Health Proportion</span>
              </h3>
              <span className="card-subtitle">Matching vs Discrepant Settings</span>
            </div>
          </div>
          <div style={{ height: '220px', width: '100%' }}>
            {statusPieData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} 
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Discrepancies Table / Recent Discrepancies */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <AlertTriangle size={18} color="#dc2626" />
              <span>Detected Configuration Discrepancies</span>
            </h3>
            <span className="card-subtitle">
              {discrepancies.length > 0
                ? `${discrepancies.length} non-compliant setting(s) requiring human investigation`
                : 'All settings are fully compliant with approved baseline'}
            </span>
          </div>
          <Link to="/drift" className="btn btn-secondary btn-sm">
            View All ({findings.length})
          </Link>
        </div>

        {discrepancies.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#16a34a', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
            <CheckCircle2 size={32} style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 600 }}>Zero Configuration Drift Detected</div>
            <div style={{ fontSize: '0.8125rem', color: '#15803d' }}>
              All monitored infrastructure settings match the declared baseline.
            </div>
          </div>
        ) : (
          <DriftTable findings={discrepancies} showFilters={false} />
        )}
      </div>

      {/* Recommended Next Actions */}
      <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
        <h3 className="card-title" style={{ marginBottom: '12px' }}>
          <ShieldCheck size={18} color="#2563eb" />
          <span>Recommended Operator Next Steps</span>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {discrepancies.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: '#334155' }}>
              No corrective actions needed. Maintain periodic scans to detect unintended drift before it impacts production reliability.
            </p>
          ) : (
            discrepancies.slice(0, 3).map((d) => (
              <div 
                key={d.setting} 
                style={{ 
                  padding: '12px 16px', 
                  backgroundColor: '#f8fafc', 
                  borderRadius: '6px', 
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <StatusBadge severity={d.severity} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                    <code className="setting-code">{d.setting}</code> — {d.status}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '2px' }}>
                    {d.recommendation}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
