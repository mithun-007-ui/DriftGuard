import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Infrastructure from './pages/Infrastructure';
import Baselines from './pages/Baselines';
import DriftDetection from './pages/DriftDetection';
import Reports from './pages/Reports';
import TestScenarios from './pages/TestScenarios';
import Settings from './pages/Settings';
import { api } from './services/api';

export default function App() {
  const [environments, setEnvironments] = useState(['devops-test']);
  const [selectedEnv, setSelectedEnv] = useState('devops-test');
  const [mode, setMode] = useState('REAL'); // 'REAL' or 'SIMULATED'
  const [latestReport, setLatestReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Initialize environments and latest report
  useEffect(() => {
    async function init() {
      try {
        const envData = await api.getEnvironments();
        if (envData.environments && envData.environments.length > 0) {
          setEnvironments(envData.environments);
          setSelectedEnv(envData.default || envData.environments[0]);
        }
      } catch (err) {
        console.warn('Could not load environments:', err);
      }

      try {
        const driftData = await api.getLatestDrift();
        if (driftData.has_data && driftData.report) {
          setLatestReport(driftData.report);
          if (driftData.report.mode) {
            setMode(driftData.report.mode);
          }
        }
      } catch (err) {
        console.warn('Could not load latest scan:', err);
      }
    }
    init();
  }, []);

  const handleRunScan = useCallback(async (forcedMode) => {
    const activeMode = forcedMode || mode;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.runDriftCheck({
        environment: selectedEnv,
        mode: activeMode,
        scenario_id: 'matching'
      });
      setLatestReport(res.report || res);
      if (res.mode) setMode(res.mode);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEnv, mode]);

  const handleToggleMode = () => {
    const nextMode = mode === 'REAL' ? 'SIMULATED' : 'REAL';
    setMode(nextMode);
    // Optionally run initial scan in new mode
    handleRunScan(nextMode);
  };

  const handleScenarioLoaded = (report, newMode) => {
    setLatestReport(report);
    if (newMode) setMode(newMode);
  };

  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar 
          isOpen={mobileNavOpen} 
          onClose={() => setMobileNavOpen(false)} 
        />

        <div className="main-wrapper">
          <Header
            environments={environments}
            selectedEnv={selectedEnv}
            onSelectEnv={setSelectedEnv}
            mode={mode}
            onToggleMode={handleToggleMode}
            lastCheckTime={latestReport?.scan_timestamp}
            onRunScan={() => handleRunScan()}
            isLoading={isLoading}
            onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)}
          />

          <main className="main-content">
            <Routes>
              <Route 
                path="/" 
                element={
                  <Dashboard
                    latestReport={latestReport}
                    isLoading={isLoading}
                    error={error}
                    onRunScan={() => handleRunScan()}
                    environment={selectedEnv}
                    mode={mode}
                  />
                } 
              />
              <Route 
                path="/infrastructure" 
                element={
                  <Infrastructure
                    latestReport={latestReport}
                    onRunScan={() => handleRunScan()}
                    isLoading={isLoading}
                    mode={mode}
                  />
                } 
              />
              <Route 
                path="/baselines" 
                element={
                  <Baselines
                    environment={selectedEnv}
                    onBaselineUpdated={() => handleRunScan()}
                  />
                } 
              />
              <Route 
                path="/drift" 
                element={
                  <DriftDetection
                    latestReport={latestReport}
                    onRunScan={() => handleRunScan()}
                    isLoading={isLoading}
                    error={error}
                    environment={selectedEnv}
                    mode={mode}
                    onToggleMode={handleToggleMode}
                  />
                } 
              />
              <Route 
                path="/reports" 
                element={
                  <Reports
                    latestReport={latestReport}
                    environment={selectedEnv}
                  />
                } 
              />
              <Route 
                path="/test-scenarios" 
                element={
                  <TestScenarios
                    environment={selectedEnv}
                    onScenarioLoaded={handleScenarioLoaded}
                  />
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <Settings
                    environments={environments}
                  />
                } 
              />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
