"""
Tests for DriftGuard Comparison Engine.
Verifies all 8 comparison requirements and deterministic outputs.
"""

import pytest
from services.comparison_engine import compare_configurations


def test_all_values_match():
    expected = {
        "http_port": 80,
        "docker_service_active": True,
        "test_container_running": True
    }
    observed = {
        "http_port": 80,
        "docker_service_active": True,
        "test_container_running": True
    }
    result = compare_configurations(expected, observed, "devops-test")
    assert result["overall_status"] == "COMPLIANT"
    assert result["summary"]["total"] == 3
    assert result["summary"]["matching"] == 3
    assert result["summary"]["drift"] == 0
    assert result["summary"]["missing"] == 0
    assert result["summary"]["unexpected"] == 0
    assert result["summary"]["unavailable"] == 0
    assert result["summary"]["errors"] == 0
    for finding in result["findings"]:
        assert finding["status"] == "MATCH"
        assert finding["severity"] == "INFO"
        assert "conforms" in finding["recommendation"]


def test_one_value_differs():
    expected = {
        "http_port": 80,
        "docker_service_active": True
    }
    observed = {
        "http_port": 8080,  # DRIFT
        "docker_service_active": True
    }
    result = compare_configurations(expected, observed, "devops-test")
    assert result["overall_status"] == "DRIFT_DETECTED"
    assert result["summary"]["total"] == 2
    assert result["summary"]["matching"] == 1
    assert result["summary"]["drift"] == 1

    drift_finding = next(f for f in result["findings"] if f["setting"] == "http_port")
    assert drift_finding["status"] == "DRIFT"
    assert drift_finding["expected"] == 80
    assert drift_finding["actual"] == 8080
    assert drift_finding["severity"] == "CRITICAL"
    assert "differs" in drift_finding["recommendation"]


def test_multiple_values_differ():
    expected = {
        "http_port": 80,
        "docker_service_active": True,
        "test_container_running": True
    }
    observed = {
        "http_port": 8080,
        "docker_service_active": False,
        "test_container_running": False
    }
    result = compare_configurations(expected, observed, "devops-test")
    assert result["overall_status"] == "DRIFT_DETECTED"
    assert result["summary"]["drift"] == 3
    assert result["summary"]["matching"] == 0


def test_expected_setting_missing_from_observed():
    expected = {
        "http_port": 80,
        "test_container_running": True
    }
    observed = {
        "http_port": 80
        # test_container_running is missing
    }
    result = compare_configurations(expected, observed, "devops-test")
    assert result["overall_status"] == "DRIFT_DETECTED"
    assert result["summary"]["missing"] == 1
    missing_finding = next(f for f in result["findings"] if f["setting"] == "test_container_running")
    assert missing_finding["status"] == "MISSING"
    assert missing_finding["actual"] is None
    assert "was not observed" in missing_finding["reason"]


def test_unexpected_setting_exists_in_observed():
    expected = {
        "http_port": 80
    }
    observed = {
        "http_port": 80,
        "unapproved_ssh_port": 2222
    }
    result = compare_configurations(expected, observed, "devops-test")
    assert result["overall_status"] == "WARNING"
    assert result["summary"]["unexpected"] == 1
    unexp_finding = next(f for f in result["findings"] if f["setting"] == "unapproved_ssh_port")
    assert unexp_finding["status"] == "UNEXPECTED"
    assert unexp_finding["expected"] is None
    assert unexp_finding["actual"] == 2222
    assert "not defined in the baseline" in unexp_finding["reason"]


def test_collector_returns_unavailable_result():
    expected = {
        "docker_service_active": True
    }
    observed = {
        "docker_service_active": {
            "value": None,
            "status": "UNAVAILABLE",
            "error": "systemd daemon not present in environment"
        }
    }
    result = compare_configurations(expected, observed, "devops-test")
    assert result["summary"]["unavailable"] == 1
    assert result["summary"]["matching"] == 0  # CRITICAL: UNAVAILABLE is NEVER MATCH
    unavail_finding = result["findings"][0]
    assert unavail_finding["status"] == "UNAVAILABLE"
    assert "systemd daemon" in unavail_finding["reason"]
    assert "sufficient permissions" in unavail_finding["recommendation"]


def test_collector_raises_error():
    expected = {
        "http_port": 80
    }
    observed = {
        "http_port": {
            "value": None,
            "status": "ERROR",
            "error": "Socket inspection timed out after 5000ms"
        }
    }
    result = compare_configurations(expected, observed, "devops-test")
    assert result["overall_status"] == "ERROR"
    assert result["summary"]["errors"] == 1
    assert result["summary"]["matching"] == 0  # CRITICAL: ERROR is NEVER MATCH
    err_finding = result["findings"][0]
    assert err_finding["status"] == "ERROR"
    assert "timed out" in err_finding["reason"]


def test_report_summary_counts_and_recommendations_consistency():
    expected = {
        "http_port": 80,
        "docker_service_active": True,
        "test_container_running": True
    }
    observed = {
        "http_port": 80,
        "docker_service_active": False,
        "extra_proxy": "envoy"
    }
    result = compare_configurations(expected, observed, "devops-test")
    assert result["summary"]["matching"] == 1
    assert result["summary"]["drift"] == 1
    assert result["summary"]["missing"] == 1
    assert result["summary"]["unexpected"] == 1
    assert result["summary"]["total"] == 4
    assert len(result["findings"]) == 4
    for f in result["findings"]:
        assert isinstance(f["recommendation"], str) and len(f["recommendation"]) > 10
        assert f["severity"] in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
