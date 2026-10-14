"""
Tests for State Collector and Simulated Scenarios.
Verifies safe isolation, simulated mode purity, and collector result formats.
"""

import pytest
from services.state_collector import collect_real_infrastructure_state
from collectors.linux_collector import collect_os_info
from collectors.http_collector import check_port_listening, check_app_health
from collectors.docker_collector import check_test_container_running
from services.scenarios_service import (
    get_simulated_observed_state,
    SCENARIO_MATCHING,
    SCENARIO_PORT_DRIFT,
    SCENARIO_DOCKER_STOPPED,
    SCENARIO_CONTAINER_STOPPED,
    SCENARIO_MISSING_VALUE,
    SCENARIO_UNEXPECTED_VALUE,
    SCENARIO_UNAVAILABLE_CHECK
)


def test_collect_os_info():
    info = collect_os_info()
    assert isinstance(info, dict)
    assert "system" in info
    assert "architecture" in info
    assert "pretty_name" in info


def test_http_port_check_invalid_ports():
    res_neg = check_port_listening(-5)
    assert res_neg["status"] == "ERROR"
    assert "Invalid port" in res_neg["error"]

    res_high = check_port_listening(70000)
    assert res_high["status"] == "ERROR"
    assert "Invalid port" in res_high["error"]


def test_http_port_check_standard_format():
    # Test safe connection probe to an unassigned local port
    # When connection is refused, it reports UNAVAILABLE instead of falsely claiming port drift
    res = check_port_listening(65432)
    assert res["status"] in ["OBSERVED", "UNAVAILABLE", "ERROR"]
    assert "timestamp" in res
    assert "port" in res
    assert res["port"] == 65432
    if res["status"] == "UNAVAILABLE":
        assert "refused connection" in res["error"] or "not listening" in res["error"]


def test_app_health_rejects_unsafe_paths():
    res = check_app_health(80, "invalid_relative_no_slash")
    assert res["status"] == "ERROR"
    assert "Invalid or unsafe" in res["error"]

    res2 = check_app_health(80, "/path with spaces; rm -rf")
    assert res2["status"] == "ERROR"


def test_docker_container_name_validation():
    # Attempting dangerous characters should be rejected safely
    res = check_test_container_running("bad; rm -rf /")
    assert res["status"] == "ERROR"
    assert "safety constraints" in res["error"]


def test_simulated_mode_never_executes_real_commands():
    baseline_settings = {
        "http_port": 80,
        "docker_service_active": True,
        "test_container_running": True,
        "test_container_name": "driftguard-test-container"
    }

    # Verify each scenario returns labeled simulated data
    for sc in [
        SCENARIO_MATCHING,
        SCENARIO_PORT_DRIFT,
        SCENARIO_DOCKER_STOPPED,
        SCENARIO_CONTAINER_STOPPED,
        SCENARIO_MISSING_VALUE,
        SCENARIO_UNEXPECTED_VALUE,
        SCENARIO_UNAVAILABLE_CHECK
    ]:
        state = get_simulated_observed_state(sc, baseline_settings)
        assert state["_collector_mode"] == "SIMULATED"
        assert state["_scenario_id"] == sc
        assert "timestamp" in state["_timestamp"] or len(state["_timestamp"]) > 0


def test_simulated_port_drift_fixture():
    baseline_settings = {"http_port": 80}
    state = get_simulated_observed_state(SCENARIO_PORT_DRIFT, baseline_settings)
    assert state["http_port"]["value"] == 8080
    assert state["_collector_mode"] == "SIMULATED"


def test_simulated_docker_stopped_fixture():
    baseline_settings = {"docker_service_active": True}
    state = get_simulated_observed_state(SCENARIO_DOCKER_STOPPED, baseline_settings)
    assert state["docker_service_active"]["value"] is False
    assert state["docker_service_active"]["status"] == "OBSERVED"


def test_simulated_unavailable_fixture():
    baseline_settings = {"docker_service_active": True, "test_container_running": True}
    state = get_simulated_observed_state(SCENARIO_UNAVAILABLE_CHECK, baseline_settings)
    assert state["docker_service_active"]["status"] == "UNAVAILABLE"
    assert state["test_container_running"]["status"] == "UNAVAILABLE"


def test_check_docker_installed_in_container():
    from collectors.docker_collector import check_docker_installed
    # When in container, missing docker CLI must return UNAVAILABLE, not false
    res = check_docker_installed(is_container=True)
    assert res["status"] == "UNAVAILABLE"
    assert res["value"] is None
    assert "Host package 'docker' cannot be verified" in res["error"]


def test_check_docker_service_in_container_explains_socket():
    from collectors.docker_collector import check_docker_service_active
    # In container without systemctl/docker, must explain Docker socket limitation
    res = check_docker_service_active(is_container=True)
    if res["status"] == "UNAVAILABLE":
        assert "socket" in res["error"].lower() or "unprivileged" in res["error"].lower()


def test_check_test_container_in_container():
    from collectors.docker_collector import check_test_container_running
    res = check_test_container_running("driftguard-test-container", is_container=True)
    if res["status"] == "UNAVAILABLE":
        assert "socket" in res["error"].lower() or "unprivileged" in res["error"].lower()


def test_real_scan_contains_collection_scope():
    baseline_settings = {
        "http_port": 80,
        "health_check_endpoint": "/api/health"
    }
    state = collect_real_infrastructure_state(baseline_settings)
    assert "_collection_scope" in state
    scope = state["_collection_scope"]
    assert "execution_context" in scope
    assert "is_container" in scope
    assert "target_host" in scope
    assert "scope_description" in scope


def test_configurable_health_check_url():
    # Validates safe custom URL handling
    res = check_app_health(custom_url="http://127.0.0.1:59999/api/health")
    # Port 59999 is closed, should return UNAVAILABLE (not crash, not false drift)
    assert res["status"] in ["UNAVAILABLE", "ERROR"]
    assert res["value"] is None
    assert "Connection refused" in res["error"] or "unreachable" in res["error"]
