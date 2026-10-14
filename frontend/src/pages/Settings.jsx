import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  ShieldCheck, 
  Server, 
  CheckCircle2, 
  Lock, 
  Activity, 
  Globe, 
  Clock,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function Settings({ environments = [] }) {
  const [healthData, setHealthData] = useState(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const data = await api.getHealth();
      setHealthData(data);
    } catch (err) {
      setHealthData({ status: 'unreachable', error: err.message });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const securityPolicies = [
    {
      title: 'Infrastructure Read-Only Architecture',
      description: 'Collector strictly reads host state without modifying, repairing, restarting, or reconfiguring any service or file.',
      status: 'ENFORCED',
      icon: ShieldCheck
    },
    {
      title: 'Auto-Remediation Disabled',
      description: 'Automatic repair scripts are entirely disabled to prevent unintended production outages or unauthorized configuration changes.',
      status: 'ENFORCED',
      icon: Lock
    },
    {
      title: 'Arbitrary Shell Execution Blocked',
      description: 'Commands are executed solely via predefined, static argument lists with shell=False. User input is never concatenated into shell commands.',
      status: 'ENFORCED',
      icon: Terminal
    },
    {
      title: 'Socket & Localhost Network Isolation',
      description: 'HTTP and socket health probes are strictly restricted to 127.0.0.1 and validated port ranges. Outbound arbitrary web calls are rejected.',
      status: 'ENFORCED',
      icon: Globe
    },
    {
      title: 'Subprocess Execution Timeouts',
      description: 'Strict timeouts (2.0s - 3.0s) are enforced on every inspection probe to prevent hanging processes or resource leaks.',
      status: 'ENFORCED',
      icon: Clock
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>SYSTEM CONTROLS</span>
            <span className="badge badge-compliant">POLICY VERIFIED</span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            Platform Settings & Security Guardrails
          </h2>
          <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px' }}>
            Review system operational parameters, environment allowlists, and safety configurations.
          </div>
        </div>

        <button className="btn btn-secondary" onClick={checkHealth} disabled={isCheckingHealth}>
          <RefreshCw size={14} className={isCheckingHealth ? 'spinner' : ''} />
          <span>Verify Backend Health</span>
        </button>
      </div>

      {/* Backend Health Verification Box */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Backend Daemon Live Status</h3>
          </div>
          {healthData && (
            <StatusBadge 
              status={healthData.status === 'healthy' ? 'COMPLIANT' : 'ERROR'} 
              text={healthData.status === 'healthy' ? 'DAEMON HEALTHY' : 'UNREACHABLE'} 
            />
          )}
        </div>

        {healthData ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', fontSize: '0.8125rem' }}>
            <div>
              <span style={{ color: '#64748b' }}>Application:</span>{' '}
              <strong>{healthData.application || 'DriftGuard'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Version:</span>{' '}
              <strong>{healthData.version || '1.0.0'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Read-Only Guarantee:</span>{' '}
              <strong style={{ color: '#16a34a' }}>{String(healthData.read_only)}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Auto-Remediation Disabled:</span>{' '}
              <strong style={{ color: '#16a34a' }}>{String(healthData.auto_remediation_disabled)}</strong>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Querying backend...</div>
        )}
      </div>

      {/* Security Policies List */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <ShieldCheck size={18} color="#16a34a" />
              <span>Operational Security Guardrails</span>
            </h3>
            <span className="card-subtitle">Non-destructive controls enforced across all collectors</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {securityPolicies.map((pol, idx) => {
            const Icon = pol.icon;
            return (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '14px 16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ color: '#2563eb', marginTop: '2px' }}>
                  <Icon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{pol.title}</span>
                    <span className="badge badge-compliant" style={{ fontSize: '0.6875rem' }}>{pol.status}</span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.4 }}>
                    {pol.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Environment Allowlist Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Server size={18} color="#2563eb" />
              <span>Permitted Test Environments (Allowlist)</span>
            </h3>
            <span className="card-subtitle">Only explicitly allowed environments can be scanned</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {environments.map((env) => (
            <div 
              key={env} 
              style={{ 
                padding: '8px 14px', 
                backgroundColor: '#ffffff', 
                border: '1px solid #cbd5e1', 
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#1e293b'
              }}
            >
              <CheckCircle2 size={14} color="#16a34a" />
              <span>{env}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
