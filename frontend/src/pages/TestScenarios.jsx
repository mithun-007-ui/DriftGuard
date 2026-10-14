import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  AlertOctagon, 
  ShieldCheck, 
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import { useNavigate } from 'react-router-dom';

export default function TestScenarios({ environment, onScenarioLoaded }) {
  const [scenarios, setScenarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingScenarioId, setLoadingScenarioId] = useState(null);
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadScenariosList() {
      try {
        const data = await api.getTestScenarios();
        setScenarios(data.scenarios || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadScenariosList();
  }, []);

  const triggerScenario = async (scenarioId) => {
    setLoadingScenarioId(scenarioId);
    try {
      let res;
      if (scenarioId === 'matching') {
        res = await api.runMatchingScenario(environment);
      } else if (scenarioId === 'port_drift') {
        res = await api.runDriftScenario(environment);
      } else {
        res = await api.loadCustomScenario(scenarioId, environment);
      }

      setActiveScenarioId(scenarioId);
      if (onScenarioLoaded) {
        onScenarioLoaded(res.report, 'SIMULATED');
      }
    } catch (err) {
      alert(`Error running scenario: ${err.message}`);
    } finally {
      setLoadingScenarioId(null);
    }
  };

  const getScenarioIcon = (badge) => {
    switch (badge) {
      case 'COMPLIANT':
        return <CheckCircle2 size={24} color="#16a34a" />;
      case 'DRIFT':
        return <XCircle size={24} color="#dc2626" />;
      case 'MISSING':
        return <AlertTriangle size={24} color="#ea580c" />;
      case 'UNEXPECTED':
        return <AlertOctagon size={24} color="#2563eb" />;
      case 'UNAVAILABLE':
        return <HelpCircle size={24} color="#7c3aed" />;
      default:
        return <FlaskConical size={24} color="#475569" />;
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading simulated sandbox scenarios..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>HACKATHON SHOWCASE SANDBOX</span>
            <span className="badge badge-simulated">100% ISOLATED SIMULATION</span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            Simulated Test Scenarios & Drift Demonstrations
          </h2>
          <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px' }}>
            Safely test and evaluate comparison outcomes without altering any real cloud or OS configuration.
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => triggerScenario('matching')}
            disabled={loadingScenarioId !== null}
          >
            <CheckCircle2 size={16} color="#16a34a" />
            <span>Load Matching Demo</span>
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => triggerScenario('port_drift')}
            disabled={loadingScenarioId !== null}
          >
            <XCircle size={16} />
            <span>Load Port Drift Demo</span>
          </button>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="alert-banner alert-banner-read-only">
        <ShieldCheck size={20} color="#16a34a" style={{ flexShrink: 0 }} />
        <div>
          <strong>Sandbox Safety Guarantee:</strong> All test scenarios run entirely in-memory using declared fixtures. DriftGuard never runs modification scripts or modifies the host operating system. All outputs are clearly stamped with <code>mode: SIMULATED</code>.
        </div>
      </div>

      {/* Scenarios Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {scenarios.map((sc) => {
          const isSelected = activeScenarioId === sc.id;
          const isRunning = loadingScenarioId === sc.id;

          return (
            <div 
              key={sc.id} 
              className="card"
              style={{
                borderColor: isSelected ? '#2563eb' : '#e2e8f0',
                boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.15)' : 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  {getScenarioIcon(sc.badge)}
                  <StatusBadge status={sc.badge} text={sc.badge} />
                </div>

                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  {sc.name}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
                  {sc.description}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {isSelected ? 'Active Scenario' : 'Ready to test'}
                </span>
                <button
                  className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => triggerScenario(sc.id)}
                  disabled={loadingScenarioId !== null}
                >
                  {isRunning ? (
                    <>
                      <div className="spinner" />
                      <span>Simulating...</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} fill="currentColor" />
                      <span>Run Scenario</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Scenario Confirmation Banner if run */}
      {activeScenarioId && (
        <div className="card" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sparkles size={20} color="#2563eb" />
            <div>
              <div style={{ fontWeight: 600, color: '#1e40af' }}>
                Simulated Scenario "{activeScenarioId}" successfully executed!
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#3b82f6' }}>
                Switch to Overview or Drift Detection to inspect the complete findings.
              </div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/drift')}>
            <span>View Drift Findings</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
