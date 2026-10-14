import React from 'react';
import { Radar, Play, ShieldAlert } from 'lucide-react';

export default function EmptyState({ onRunScan, isLoading }) {
  return (
    <div 
      className="card" 
      style={{ 
        textAlign: 'center', 
        padding: '64px 32px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: '640px',
        margin: '40px auto'
      }}
    >
      <div 
        style={{ 
          width: '64px', 
          height: '64px', 
          borderRadius: '50%', 
          backgroundColor: '#eff6ff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#2563eb',
          marginBottom: '20px'
        }}
      >
        <Radar size={32} />
      </div>

      <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
        No Infrastructure Scan Performed
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.9375rem', maxWidth: '440px', marginBottom: '24px', lineHeight: 1.5 }}>
        DriftGuard hasn’t collected the state for this environment yet. Run an infrastructure scan to compare the declared baseline against actual host metrics.
      </p>

      <button 
        className="btn btn-primary" 
        onClick={onRunScan}
        disabled={isLoading}
        style={{ padding: '10px 24px', fontSize: '0.9375rem' }}
      >
        {isLoading ? (
          <>
            <div className="spinner" />
            <span>Collecting Environment State...</span>
          </>
        ) : (
          <>
            <Play size={18} fill="currentColor" />
            <span>Run Initial Configuration Scan</span>
          </>
        )}
      </button>

      <div style={{ marginTop: '24px', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <ShieldAlert size={14} />
        <span>Read-only inspection. Zero host alterations.</span>
      </div>
    </div>
  );
}
