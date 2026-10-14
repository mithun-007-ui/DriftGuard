"""
Tests for Report Generator and Persistence.
Verifies report schema compliance, summary metrics accuracy, and safe storage.
"""

import pytest
import os
import json
from services.comparison_engine import compare_configurations
from services.report_generator import (
    generate_drift_report,
    validate_report_structure,
    save_report_to_disk,
    load_latest_report_from_disk
)


def test_report_generation_structure():
    baseline = {
        "environment": "devops-test",
        "version": "1.0.0",
        "settings": {
            "http_port": 80,
            "docker_service_active": True
        }
    }
    observed = {
        "_collector_mode": "SIMULATED",
        "_platform": "Linux test-host",
        "http_port": {"value": 80, "status": "OBSERVED"},
        "docker_service_active": {"value": False, "status": "OBSERVED"}
    }
    comparison = compare_configurations(baseline["settings"], observed, baseline["environment"])
    report = generate_drift_report(comparison, baseline, observed, mode="SIMULATED")

    # Verify required keys
    assert report["application"] == "DriftGuard"
    assert report["environment"] == "devops-test"
    assert report["mode"] == "SIMULATED"
    assert "summary" in report
    assert report["summary"]["drift"] == 1
    assert report["summary"]["matching"] == 1
    assert report["summary"]["total"] == 2
    assert "findings" in report
    assert len(report["findings"]) == 2
    assert "baseline_snapshot" in report
    assert "observed_snapshot" in report
    assert "notice" in report
    assert "strictly read-only" in report["notice"]


def test_report_validation_rejects_malformed_report():
    malformed = {"application": "DriftGuard"}
    is_valid, errors = validate_report_structure(malformed)
    assert is_valid is False
    assert len(errors) > 0


def test_report_save_and_load():
    baseline = {
        "environment": "devops-test",
        "version": "1.0.0",
        "settings": {"http_port": 80}
    }
    observed = {"http_port": 80}
    comparison = compare_configurations(baseline["settings"], observed, "devops-test")
    report = generate_drift_report(comparison, baseline, observed, mode="SIMULATED")

    filepath = save_report_to_disk(report)
    assert os.path.exists(filepath)

    loaded = load_latest_report_from_disk()
    assert loaded is not None
    assert loaded["application"] == "DriftGuard"
    assert loaded["environment"] == "devops-test"


def test_report_collection_scope_distinction():
    baseline = {
        "environment": "devops-test",
        "version": "1.0.0",
        "settings": {"http_port": 80}
    }
    # Simulated
    sim_obs = {"_collector_mode": "SIMULATED", "http_port": 80}
    comp_sim = compare_configurations(baseline["settings"], sim_obs, "devops-test")
    rep_sim = generate_drift_report(comp_sim, baseline, sim_obs, mode="SIMULATED")
    assert "collection_scope" in rep_sim
    assert rep_sim["collection_scope"]["execution_context"] == "SIMULATED"
    assert rep_sim["collection_scope"]["is_container"] is False

    # Real
    real_obs = {
        "_collector_mode": "REAL",
        "_execution_context": "CONTAINER",
        "_is_container": True,
        "_target_host": "frontend",
        "http_port": {"value": None, "status": "UNAVAILABLE", "error": "Port refused"}
    }
    comp_real = compare_configurations(baseline["settings"], real_obs, "devops-test")
    rep_real = generate_drift_report(comp_real, baseline, real_obs, mode="REAL")
    assert "collection_scope" in rep_real
    assert rep_real["collection_scope"]["execution_context"] == "CONTAINER"
    assert rep_real["collection_scope"]["is_container"] is True
    assert "backend container" in rep_real["collection_scope"]["scope_description"]
