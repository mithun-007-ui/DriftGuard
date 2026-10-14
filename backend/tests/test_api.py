"""
Integration and Unit Tests for DriftGuard Flask API.
Uses Flask test client to verify all endpoints, security constraints, and response codes.
"""

import pytest
import json
from app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert data["application"] == "DriftGuard"
    assert data["read_only"] is True
    assert data["auto_remediation_disabled"] is True


def test_environments_endpoint(client):
    res = client.get("/api/environments")
    assert res.status_code == 200
    data = res.get_json()
    assert "environments" in data
    assert "devops-test" in data["environments"]


def test_baseline_endpoints_crud(client):
    # GET baseline
    get_res = client.get("/api/config/baseline")
    assert get_res.status_code == 200
    base = get_res.get_json()["baseline"]
    assert "environment" in base
    assert "settings" in base

    # PUT valid baseline
    update_payload = {
        "environment": "devops-test",
        "version": "1.1.0",
        "description": "Updated baseline for testing",
        "settings": {
            "http_port": 80,
            "docker_service_active": True,
            "test_container_running": True
        }
    }
    put_res = client.put("/api/config/baseline", json=update_payload)
    assert put_res.status_code == 200
    put_data = put_res.get_json()
    assert put_data["success"] is True
    assert put_data["baseline"]["version"] == "1.1.0"

    # PUT invalid baseline (invalid port)
    bad_payload = {
        "environment": "devops-test",
        "settings": {
            "http_port": 99999  # Invalid port > 65535
        }
    }
    bad_res = client.put("/api/config/baseline", json=bad_payload)
    assert bad_res.status_code == 400
    assert bad_res.get_json()["success"] is False
    assert len(bad_res.get_json()["errors"]) > 0

    # Reset baseline
    reset_res = client.post("/api/config/baseline/reset", json={"environment": "devops-test"})
    assert reset_res.status_code == 200
    assert reset_res.get_json()["success"] is True


def test_simulated_matching_endpoint(client):
    res = client.post("/api/test-scenarios/matching")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["mode"] == "SIMULATED"
    assert data["report"]["overall_status"] == "COMPLIANT"
    assert data["report"]["summary"]["drift"] == 0
    assert data["report"]["summary"]["matching"] > 0


def test_simulated_drift_endpoint(client):
    res = client.post("/api/test-scenarios/drift")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["mode"] == "SIMULATED"
    assert data["report"]["overall_status"] == "DRIFT_DETECTED"
    assert data["report"]["summary"]["drift"] >= 1


def test_drift_check_endpoint(client):
    # Simulated check
    payload = {
        "environment": "devops-test",
        "mode": "SIMULATED",
        "scenario_id": "port_drift"
    }
    res = client.post("/api/drift/check", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["summary"]["drift"] >= 1

    # Real check
    real_payload = {
        "environment": "devops-test",
        "mode": "REAL"
    }
    real_res = client.post("/api/drift/check", json=real_payload)
    assert real_res.status_code == 200
    assert real_res.get_json()["mode"] == "REAL"

    # Unauthorized environment rejected
    bad_env_payload = {
        "environment": "hacker-env",
        "mode": "SIMULATED"
    }
    bad_res = client.post("/api/drift/check", json=bad_env_payload)
    assert bad_res.status_code == 400


def test_reports_latest_and_download(client):
    # Ensure at least one scan has run
    client.post("/api/test-scenarios/matching")

    # GET latest
    res = client.get("/api/reports/latest")
    assert res.status_code == 200
    data = res.get_json()
    report_id = data["report_id"]

    # Download report
    dl_res = client.get(f"/api/reports/{report_id}/download")
    assert dl_res.status_code == 200
    assert "attachment" in dl_res.headers.get("Content-Disposition", "")


def test_404_handler(client):
    res = client.get("/api/nonexistent-endpoint-xyz")
    assert res.status_code == 404
    assert res.get_json()["status_code"] == 404
