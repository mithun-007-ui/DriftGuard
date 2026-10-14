import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import DriftTable from '../components/DriftTable';

describe('DriftGuard UI Components', () => {
  it('renders LoadingState with custom message', () => {
    render(<LoadingState message="Collecting system state..." />);
    expect(screen.getByText('Collecting system state...')).toBeInTheDocument();
  });

  it('renders ErrorState and triggers retry', () => {
    const handleRetry = vi.fn();
    render(
      <ErrorState 
        title="Inspection Failure" 
        error="Socket connection timed out" 
        onRetry={handleRetry} 
      />
    );
    expect(screen.getByText('Inspection Failure')).toBeInTheDocument();
    expect(screen.getByText('Socket connection timed out')).toBeInTheDocument();
    
    const retryBtn = screen.getByText('Retry Request');
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders EmptyState and triggers initial scan', () => {
    const handleScan = vi.fn();
    render(<EmptyState onRunScan={handleScan} isLoading={false} />);
    expect(screen.getByText('No Infrastructure Scan Performed')).toBeInTheDocument();
    
    const scanBtn = screen.getByText('Run Initial Configuration Scan');
    fireEvent.click(scanBtn);
    expect(handleScan).toHaveBeenCalledTimes(1);
  });

  it('renders StatusBadge with correct style and text', () => {
    const { rerender } = render(<StatusBadge status="MATCH" />);
    expect(screen.getByText('MATCH')).toBeInTheDocument();

    rerender(<StatusBadge status="DRIFT" />);
    expect(screen.getByText('DRIFT')).toBeInTheDocument();

    rerender(<StatusBadge status="SIMULATED" text="SIMULATED DATA" />);
    expect(screen.getByText('SIMULATED DATA')).toBeInTheDocument();
  });

  it('renders DriftTable findings and applies status filters', () => {
    const findings = [
      {
        setting: 'http_port',
        expected: 80,
        actual: 8080,
        status: 'DRIFT',
        severity: 'CRITICAL',
        recommendation: 'Check port 8080 mapping',
        reason: 'Port mismatch'
      },
      {
        setting: 'docker_service_active',
        expected: true,
        actual: true,
        status: 'MATCH',
        severity: 'INFO',
        recommendation: 'Conforms to baseline',
        reason: 'Service active'
      }
    ];

    render(<DriftTable findings={findings} showFilters={true} />);
    
    // Initially both rows are displayed
    expect(screen.getByText('http_port')).toBeInTheDocument();
    expect(screen.getByText('docker_service_active')).toBeInTheDocument();

    // Click Drift filter
    const driftFilterBtn = screen.getByRole('button', { name: /Drift/i });
    fireEvent.click(driftFilterBtn);

    // Only http_port is shown
    expect(screen.getByText('http_port')).toBeInTheDocument();
    expect(screen.queryByText('docker_service_active')).not.toBeInTheDocument();
  });
});
