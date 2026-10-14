"""
Simulated Test Mode and Scenarios Service for DriftGuard.
Provides safe, isolated simulated scenarios for demonstration and testing.
Strictly read-only; never touches the host system or Docker daemon.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List

SCENARIO_MATCHING = "matching"
SCENARIO_PORT_DRIFT = "port_drift"
SCENARIO_DOCKER_STOPPED = "docker_stopped"
SCENARIO_CONTAINER_STOPPED = "container_stopped"
SCENARIO_MISSING_VALUE = "missing_value"
SCENARIO_UNEXPECTED_VALUE = "unexpected_value"
SCENARIO_UNAVAILABLE_CHECK = "unavailable_check"

# Catalog of scenarios with descriptions and mock observed states
AVAILABLE_SCENARIOS = [
    {
        "id": SCENARIO_MATCHING,
        "name": "Matching Baseline (Compliant)",
        "description": "All monitored services, ports, and containers precisely match the declared baseline.",
        "badge": "COMPLIANT"
    },
    {
        "id": SCENARIO_PORT_DRIFT,
        "name": "HTTP Port Drift (Port Changed to 8080)",
        "description": "The web service was reconfigured to listen on port 8080 instead of baseline port 80.",
        "badge": "DRIFT"
    },
    {
        "id": SCENARIO_DOCKER_STOPPED,
        "name": "Docker Service Inactive (Daemon Stopped)",
        "description": "The Docker service is reported inactive by the service manager.",
        "badge": "DRIFT"
    },
    {
        "id": SCENARIO_CONTAINER_STOPPED,
        "name": "Test Container Not Running (Exited)",
        "description": "The required container 'driftguard-test-container' has stopped or exited.",
        "badge": "DRIFT"
    },
    {
        "id": SCENARIO_MISSING_VALUE,
        "name": "Missing Monitored Setting",
        "description": "A setting defined in the baseline cannot be observed in the target state.",
        "badge": "MISSING"
    },
    {
        "id": SCENARIO_UNEXPECTED_VALUE,
        "name": "Unexpected Unapproved Setting",
        "description": "An unauthorized service configuration key was discovered on the monitored host.",
        "badge": "UNEXPECTED"
    },
    {
        "id": SCENARIO_UNAVAILABLE_CHECK,
        "name": "Service Check Unavailable",
        "description": "The target environment lacks inspection privileges or daemon interface for a check.",
        "badge": "UNAVAILABLE"
    }
]


def get_simulated_observed_state(scenario_id: str, baseline_settings: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates a mock observed state corresponding to the selected scenario.
    Marked explicitly with _collector_mode: "SIMULATED".
    """
    now = datetime.now(timezone.utc).isoformat()
    base_port = baseline_settings.get("http_port", 80)
    test_container = baseline_settings.get("test_container_name", "driftguard-test-container")

    # Dynamically match baseline settings
    observed: Dict[str, Any] = {
        "_collector_mode": "SIMULATED",
        "_scenario_id": scenario_id,
        "_timestamp": now,
        "_platform": "Simulated Ubuntu 24.04 LTS (Test Fixture)"
    }

    for k, v in baseline_settings.items():
        observed[k] = {
            "value": v,
            "status": "OBSERVED",
            "timestamp": now,
            "error": None
        }

    if scenario_id == SCENARIO_MATCHING:
        pass  # Returns matching state

    elif scenario_id == SCENARIO_PORT_DRIFT:
        observed["http_port"] = {
            "value": 8080 if base_port == 80 else 80,
            "status": "OBSERVED",
            "timestamp": now,
            "error": None
        }

    elif scenario_id == SCENARIO_DOCKER_STOPPED:
        observed["docker_service_active"] = {
            "value": False,
            "status": "OBSERVED",
            "timestamp": now,
            "error": "Service unit docker.service is in inactive/dead state"
        }

    elif scenario_id == SCENARIO_CONTAINER_STOPPED:
        observed["test_container_running"] = {
            "value": False,
            "status": "OBSERVED",
            "timestamp": now,
            "error": f"Container '{test_container}' is in 'exited' status (code 137)"
        }

    elif scenario_id == SCENARIO_MISSING_VALUE:
        # Remove http_port and test_container_running from observed
        observed.pop("http_port", None)
        observed.pop("test_container_running", None)

    elif scenario_id == SCENARIO_UNEXPECTED_VALUE:
        observed["unapproved_debug_telnet_port"] = {
            "value": 23,
            "status": "OBSERVED",
            "timestamp": now,
            "error": None
        }
        observed["unregistered_shadow_daemon"] = {
            "value": "running",
            "status": "OBSERVED",
            "timestamp": now,
            "error": None
        }

    elif scenario_id == SCENARIO_UNAVAILABLE_CHECK:
        observed["docker_service_active"] = {
            "value": None,
            "status": "UNAVAILABLE",
            "timestamp": now,
            "error": "systemd daemon not present in environment; cannot query service status"
        }
        observed["test_container_running"] = {
            "value": None,
            "status": "UNAVAILABLE",
            "timestamp": now,
            "error": "Docker socket permissions restricted; access denied to collector"
        }

    return observed
