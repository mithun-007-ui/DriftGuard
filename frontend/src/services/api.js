/**
 * Centralized API client for DriftGuard.
 * Uses native Fetch API with robust error handling and response normalization.
 */

const API_BASE = '/api';

async function handleResponse(response) {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.errors && Array.isArray(errorJson.errors)) {
        errorMessage = errorJson.errors.join('; ');
      } else if (errorJson.error) {
        errorMessage = errorJson.error;
      } else if (errorJson.message) {
        errorMessage = errorJson.message;
      }
    } catch {
      // Fallback to status text
    }
    const err = new Error(errorMessage);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

export const api = {
  // Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  // Environments
  async getEnvironments() {
    const res = await fetch(`${API_BASE}/environments`);
    return handleResponse(res);
  },

  // Baseline Configuration
  async getBaseline(env) {
    const url = env ? `${API_BASE}/config/baseline?environment=${encodeURIComponent(env)}` : `${API_BASE}/config/baseline`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  async updateBaseline(data) {
    const res = await fetch(`${API_BASE}/config/baseline`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async resetBaseline(env) {
    const res = await fetch(`${API_BASE}/config/baseline/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ environment: env }),
    });
    return handleResponse(res);
  },

  async getSchemaRules() {
    const res = await fetch(`${API_BASE}/config/schema`);
    return handleResponse(res);
  },

  // Drift Checks
  async runDriftCheck({ environment, mode = 'REAL', scenario_id = 'matching' }) {
    const res = await fetch(`${API_BASE}/drift/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ environment, mode, scenario_id }),
    });
    return handleResponse(res);
  },

  async getLatestDrift() {
    const res = await fetch(`${API_BASE}/drift/latest`);
    return handleResponse(res);
  },

  // Reports
  async getLatestReport() {
    const res = await fetch(`${API_BASE}/reports/latest`);
    return handleResponse(res);
  },

  async getReportsList() {
    const res = await fetch(`${API_BASE}/reports`);
    return handleResponse(res);
  },

  async getReportById(reportId) {
    const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}`);
    return handleResponse(res);
  },

  getReportDownloadUrl(reportId) {
    return `${API_BASE}/reports/${encodeURIComponent(reportId)}/download`;
  },

  // Test Scenarios
  async getTestScenarios() {
    const res = await fetch(`${API_BASE}/test-scenarios`);
    return handleResponse(res);
  },

  async runMatchingScenario(env) {
    const res = await fetch(`${API_BASE}/test-scenarios/matching`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ environment: env }),
    });
    return handleResponse(res);
  },

  async runDriftScenario(env) {
    const res = await fetch(`${API_BASE}/test-scenarios/drift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ environment: env }),
    });
    return handleResponse(res);
  },

  async loadCustomScenario(scenarioId, env) {
    const res = await fetch(`${API_BASE}/test-scenarios/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_id: scenarioId, environment: env }),
    });
    return handleResponse(res);
  },
};
