import React from 'react';

export default function LoadingState({ message = 'Loading DriftGuard state...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', gap: '16px' }}>
      <div className="spinner spinner-primary" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
      <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#64748b' }}>
        {message}
      </div>
    </div>
  );
}
