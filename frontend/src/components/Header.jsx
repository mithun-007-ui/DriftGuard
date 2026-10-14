import React from 'react';
import { 
  Play, 
  RotateCw, 
  Menu, 
  ShieldAlert, 
  Cloud, 
  Clock, 
  Server
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function Header({
  environments = [],
  selectedEnv,
  onSelectEnv,
  mode = 'REAL',
  onToggleMode,
  lastCheckTime,
  onRunScan,
  isLoading,
  onToggleMobileNav
}) {
  const formatTime = (isoString) => {
    if (!isoString) return 'No scan yet';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button 
          className="btn btn-secondary btn-sm"
          style={{ display: 'none' }}
          onClick={onToggleMobileNav}
          aria-label="Toggle Navigation"
        >
          <Menu size={18} />
        </button>

        {/* Environment Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cloud size={16} color="#475569" />
          <select 
            className="form-select"
            value={selectedEnv}
            onChange={(e) => onSelectEnv(e.target.value)}
            style={{ padding: '4px 10px', fontSize: '0.8125rem', fontWeight: 600 }}
          >
            {environments.map((env) => (
              <option key={env} value={env}>{env}</option>
            ))}
          </select>
        </div>

        {/* Mode Indicator & Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusBadge status={mode} text={`${mode} MODE`} />
          <button
            className="btn btn-secondary btn-sm"
            onClick={onToggleMode}
            title={`Switch to ${mode === 'REAL' ? 'SIMULATED' : 'REAL'} mode`}
            style={{ fontSize: '0.75rem', padding: '3px 8px' }}
          >
            Switch to {mode === 'REAL' ? 'Simulated' : 'Real'}
          </button>
        </div>
      </div>

      <div className="header-right">
        {/* Last Scan Timestamp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: '#64748b' }}>
          <Clock size={15} />
          <span>Last scan: <strong style={{ color: '#0f172a' }}>{formatTime(lastCheckTime)}</strong></span>
        </div>

        {/* Run Check / Scan button */}
        <button
          className="btn btn-primary"
          onClick={onRunScan}
          disabled={isLoading}
          style={{ minWidth: '130px' }}
        >
          {isLoading ? (
            <>
              <div className="spinner" />
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" />
              <span>Run Check</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
