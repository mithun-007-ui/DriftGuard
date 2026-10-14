import React, { useState, useEffect } from 'react';
import { 
  FileCode2, 
  Check, 
  AlertCircle, 
  RotateCcw, 
  Save, 
  FileCheck, 
  HelpCircle, 
  Layers,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

const TEMPLATES = {
  devops_test: {
    environment: "devops-test",
    version: "1.0.0",
    description: "Standard DevOps Hackathon test host configuration",
    settings: {
      http_port: 80,
      docker_service_active: true,
      test_container_running: true,
      test_container_name: "driftguard-test-container",
      required_packages: {
        docker: true
      },
      health_check_endpoint: "/api/health"
    }
  },
  staging: {
    environment: "staging-cluster",
    version: "1.0.0",
    description: "Staging cluster environment baseline",
    settings: {
      http_port: 80,
      docker_service_active: true,
      test_container_running: true,
      test_container_name: "driftguard-test-container",
      required_packages: {
        docker: true
      },
      health_check_endpoint: "/api/health"
    }
  },
  production: {
    environment: "production-us-east-1",
    version: "2.1.0",
    description: "Production high-security baseline",
    settings: {
      http_port: 80,
      docker_service_active: true,
      test_container_running: true,
      test_container_name: "driftguard-test-container",
      required_packages: {
        docker: true
      },
      health_check_endpoint: "/api/health"
    }
  }
};

export default function Baselines({ environment, onBaselineUpdated }) {
  const [baselineJson, setBaselineJson] = useState('');
  const [baselineMeta, setBaselineMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [schemaRules, setSchemaRules] = useState(null);
  const [error, setError] = useState(null);

  const fetchBaseline = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getBaseline(environment);
      const schemaData = await api.getSchemaRules();
      setBaselineMeta(data.baseline);
      setBaselineJson(JSON.stringify(data.baseline, null, 2));
      setSchemaRules(schemaData.allowed_settings);
      setValidationResult(null);
      setSaveSuccessMsg(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseline();
  }, [environment]);

  // Client-side JSON syntax and initial validation
  const validateJson = () => {
    setSaveSuccessMsg(null);
    try {
      const parsed = JSON.parse(baselineJson);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setValidationResult({
          valid: false,
          errors: ['Baseline must be a JSON object ({ ... }).']
        });
        return false;
      }
      if (!parsed.environment) {
        setValidationResult({
          valid: false,
          errors: ["Missing required key: 'environment'."]
        });
        return false;
      }
      if (!parsed.settings || typeof parsed.settings !== 'object') {
        setValidationResult({
          valid: false,
          errors: ["Missing required object: 'settings'."]
        });
        return false;
      }
      setValidationResult({
        valid: true,
        errors: []
      });
      return true;
    } catch (err) {
      setValidationResult({
        valid: false,
        errors: [`Invalid JSON Syntax: ${err.message}`]
      });
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateJson()) return;
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      const parsed = JSON.parse(baselineJson);
      const res = await api.updateBaseline(parsed);
      setBaselineMeta(res.baseline);
      setBaselineJson(JSON.stringify(res.baseline, null, 2));
      setValidationResult({ valid: true, errors: [] });
      setSaveSuccessMsg(`Baseline saved successfully. Version: ${res.baseline.version || '1.0.0'}`);
      if (onBaselineUpdated) onBaselineUpdated();
    } catch (err) {
      setValidationResult({
        valid: false,
        errors: [err.message]
      });
    } finally {
      setIsSaving(false);
    }
  };

  const loadTemplate = (templateKey) => {
    const t = TEMPLATES[templateKey];
    if (t) {
      setBaselineJson(JSON.stringify(t, null, 2));
      setValidationResult(null);
      setSaveSuccessMsg(`Loaded template: ${t.environment}`);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      const res = await api.resetBaseline(environment);
      setBaselineMeta(res.baseline);
      setBaselineJson(JSON.stringify(res.baseline, null, 2));
      setValidationResult(null);
      setSaveSuccessMsg('Baseline reset to default template.');
      if (onBaselineUpdated) onBaselineUpdated();
    } catch (err) {
      setError(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading configuration baseline..." />;
  }

  if (error) {
    return <ErrorState title="Failed to load baseline" error={error} onRetry={fetchBaseline} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>BASELINE MANAGEMENT</span>
            <span className="badge badge-compliant">VERIFIED SCHEMA</span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            Declared Infrastructure Baseline Configuration
          </h2>
          <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px' }}>
            Environment: <strong>{baselineMeta?.environment}</strong> &bull; Version: <strong>{baselineMeta?.version || '1.0.0'}</strong>
            {baselineMeta?.updated_at && (
              <span> &bull; Updated: <strong>{new Date(baselineMeta.updated_at).toLocaleString()}</strong></span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={validateJson}>
            <FileCheck size={16} />
            <span>Validate JSON</span>
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <div className="spinner" /> : <Save size={16} />}
            <span>Save Baseline</span>
          </button>
        </div>
      </div>

      {/* Validation or Success Messages */}
      {validationResult && !validationResult.valid && (
        <div className="alert-banner alert-banner-warning">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Validation Errors Detected:</strong>
            <ul style={{ marginTop: '6px', paddingLeft: '18px' }}>
              {validationResult.errors.map((e, idx) => (
                <li key={idx}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {validationResult && validationResult.valid && !saveSuccessMsg && (
        <div className="alert-banner alert-banner-info">
          <Check size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>JSON Syntax & Structure Valid!</strong> You can now save this configuration baseline.
          </div>
        </div>
      )}

      {saveSuccessMsg && (
        <div className="alert-banner" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#15803d' }}>
          <Check size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Success:</strong> {saveSuccessMsg}
          </div>
        </div>
      )}

      {/* Template Chooser Bar */}
      <div className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
          <Layers size={16} />
          <span>Quick Baseline Templates:</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => loadTemplate('devops_test')}>
            DevOps Test Template
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => loadTemplate('staging')}>
            Staging Cluster Template
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => loadTemplate('production')}>
            Production Template
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleReset} title="Reset to default template">
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main JSON Editor & Schema Helper */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
        {/* Editor Area */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <FileCode2 size={18} color="#2563eb" />
                <span>Baseline JSON Editor</span>
              </h3>
              <span className="card-subtitle">Define declared infrastructure settings</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>JSON format</span>
          </div>

          <textarea
            className="form-textarea form-textarea-code"
            value={baselineJson}
            onChange={(e) => {
              setBaselineJson(e.target.value);
              setValidationResult(null);
              setSaveSuccessMsg(null);
            }}
            rows={18}
            style={{ width: '100%', resize: 'vertical' }}
            spellCheck={false}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '0.75rem', color: '#64748b' }}>
            <span>DriftGuard checks will compare live observations against these exact settings.</span>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={isSaving}>
              <Save size={14} />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Schema Rules Reference Card */}
        <div className="card" style={{ backgroundColor: '#f8fafc' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <HelpCircle size={18} color="#475569" />
                <span>Baseline Schema Constraints</span>
              </h3>
              <span className="card-subtitle">Permitted keys and type validation rules</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.8125rem' }}>
            <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>http_port (Integer)</div>
              <div style={{ color: '#475569' }}>Allowed port range: <code>1 - 65535</code> (Standard: 80 or 443).</div>
            </div>

            <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>docker_service_active (Boolean)</div>
              <div style={{ color: '#475569' }}>Strict boolean: <code>true</code> or <code>false</code>.</div>
            </div>

            <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>test_container_running (Boolean)</div>
              <div style={{ color: '#475569' }}>Checks if named container is actively running.</div>
            </div>

            <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>required_packages (Object)</div>
              <div style={{ color: '#475569' }}>Key-value mapping of binary names: <code>{`{"docker": true}`}</code>.</div>
            </div>

            <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>health_check_endpoint (String)</div>
              <div style={{ color: '#475569' }}>Must be a relative URI starting with <code>/</code> (e.g. <code>/api/health</code>).</div>
            </div>

            <div className="alert-banner alert-banner-read-only" style={{ marginBottom: 0, padding: '10px 12px' }}>
              <ShieldAlert size={16} color="#475569" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Security Guardrail:</strong> Arbitrary shell commands or unrecognized keys are strictly rejected during schema validation.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
