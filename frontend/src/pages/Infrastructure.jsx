import React, { useState } from 'react';
import { 
  Server, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Terminal, 
  Activity,
  Play,
  Clock
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function Infrastructure({ latestReport, onRunScan, isLoading, mode }) {
  const hostInfo = latestReport?.report?.host_platform || latestReport?.host_platform || 'Ubuntu Linux / Host Platform';
  const observedSnapshot = latestReport?.report?.observed_snapshot || latestReport?.observed_snapshot || {};
  const collectionErrors = latestReport?.report?.collection_errors || latestReport?.collection_errors || [];

  const probes = [
    {
      id: 'os_info',
      name: 'Host OS Identification',
      method: 'Read /etc/os-release safely without shell execution',
      command: 'open("/etc/os-release", "r")',
      status: 'Active',
      readOnly: true,
      observed: hostInfo
    },
    {
      id: 'http_port',
      name: 'HTTP Port Socket Probe',
      method: 'Non-invasive localhost socket connect attempt',
      command: 'socket.connect_ex(("127.0.0.1", port)) [timeout 2.0s]',
      status: observedSnapshot.http_port ? 'Listening' : 'Not Listening / None',
      readOnly: true,
      observed: observedSnapshot.http_port ? `Port ${observedSnapshot.http_port} listening` : 'Port inactive'
    },
    {
      id: 'docker_binary',
      name: 'Docker CLI Binary Existence',
      method: 'shutil.which("docker") in system PATH',
      command: 'shutil.which("docker")',
      status: observedSnapshot.required_packages?.docker ? 'Installed' : 'Observed',
      readOnly: true,
      observed: observedSnapshot.required_packages?.docker ? 'Present in PATH' : 'Not installed'
    },
    {
      id: 'docker_service',
      name: 'Docker Daemon Service State',
      method: 'Predefined argument list to systemctl with 3.0s timeout',
      command: 'subprocess.run(["systemctl", "is-active", "docker"])',
      status: observedSnapshot.docker_service_active ? 'Active' : 'Inactive / Unavailable',
      readOnly: true,
      observed: observedSnapshot.docker_service_active !== undefined ? String(observedSnapshot.docker_service_active) : 'Unavailable'
    },
    {
      id: 'test_container',
      name: 'Test Container State Inspection',
      method: 'Predefined argument list docker inspect on approved container name',
      command: 'subprocess.run(["docker", "inspect", "--format={{.State.Status}}", container])',
      status: observedSnapshot.test_container_running ? 'Running' : 'Stopped / Non-existent',
      readOnly: true,
      observed: observedSnapshot.test_container_running !== undefined ? String(observedSnapshot.test_container_running) : 'Unobserved'
    },
    {
      id: 'health_endpoint',
      name: 'Application Health Endpoint Probe',
      method: 'Safe urllib GET request against approved localhost path with timeout',
      command: 'urllib.request.urlopen("http://127.0.0.1:<port><path>", timeout=3.0)',
      status: observedSnapshot.health_check_endpoint ? 'Responding 200 OK' : 'Unhealthy / Offline',
      readOnly: true,
      observed: observedSnapshot.health_check_endpoint || 'Unhealthy'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Info */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>ENVIRONMENT INFRASTRUCTURE</span>
            <StatusBadge status={mode} text={`${mode} HOST`} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            Monitored Target Environment
          </h2>
          <div style={{ fontSize: '0.875rem', color: '#475569', marginTop: '4px' }}>
            Platform: <strong>{hostInfo}</strong>
          </div>
        </div>

        <button 
          className="btn btn-primary"
          onClick={onRunScan}
          disabled={isLoading}
        >
          {isLoading ? <div className="spinner" /> : <Play size={16} fill="currentColor" />}
          <span>Run Probe Sweep</span>
        </button>
      </div>

      {/* Security Architecture Statement */}
      <div className="alert-banner alert-banner-read-only">
        <ShieldCheck size={20} color="#16a34a" style={{ flexShrink: 0 }} />
        <div>
          <strong>Read-Only Infrastructure Architecture:</strong> DriftGuard collects state strictly through predefined, static argument arrays with subprocess timeouts. It never uses <code>shell=True</code>, never concatenates user input into shell commands, and never automatically modifies, repairs, or restarts services.
        </div>
      </div>

      {/* Collector Probes List */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Activity size={18} color="#2563eb" />
              <span>Modular State Collector Probes</span>
            </h3>
            <span className="card-subtitle">Approved inspection functions executed during drift sweeps</span>
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Component / Probe</th>
                <th>Collection Method</th>
                <th>Predefined Command Definition</th>
                <th>Observed State</th>
                <th>Security Constraint</th>
              </tr>
            </thead>
            <tbody>
              {probes.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {p.id}</span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: '#334155' }}>
                    {p.method}
                  </td>
                  <td>
                    <code style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', padding: '3px 6px', borderRadius: '4px', color: '#0f172a' }}>
                      {p.command}
                    </code>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                      {p.observed}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-compliant" style={{ fontSize: '0.6875rem' }}>
                      READ-ONLY
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collection Errors if any */}
      {collectionErrors.length > 0 && (
        <div className="card" style={{ borderColor: '#fde68a' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ color: '#b45309' }}>
              <AlertTriangle size={18} color="#d97706" />
              <span>Probe Collection Notices & Fallbacks</span>
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {collectionErrors.map((err, idx) => (
              <div key={idx} style={{ padding: '10px 14px', backgroundColor: '#fffbeb', borderRadius: '6px', fontSize: '0.8125rem', color: '#92400e' }}>
                <strong>{err.setting}:</strong> {err.error} ({err.status})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
