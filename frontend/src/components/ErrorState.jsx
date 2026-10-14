import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ErrorState({ title = 'Error Loading Data', error, onRetry }) {
  const errorMessage = error instanceof Error ? error.message : String(error || 'An unexpected error occurred.');

  return (
    <div className="card" style={{ padding: '32px', borderColor: '#fecaca', backgroundColor: '#fef2f2', margin: '24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ color: '#dc2626', marginTop: '2px' }}>
          <AlertCircle size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>
            {title}
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#b91c1c', marginBottom: '16px', lineHeight: 1.4 }}>
            {errorMessage}
          </p>
          {onRetry && (
            <button className="btn btn-secondary btn-sm" onClick={onRetry}>
              <RotateCcw size={14} />
              <span>Retry Request</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
