"""
Recommendation and Severity Engine for DriftGuard.
Assigns explicit severity levels and actionable corrective recommendations
WITHOUT automatically executing any infrastructure remediation commands.
"""

from typing import Dict, Any


def get_severity(setting: str, status: str) -> str:
    """
    Returns an explicit severity level: CRITICAL, HIGH, MEDIUM, LOW, or INFO.
    """
    if status == "MATCH":
        return "INFO"

    if status == "ERROR":
        return "HIGH"

    if status == "UNAVAILABLE":
        if setting in ("http_port", "docker_service_active"):
            return "HIGH"
        return "MEDIUM"

    if status == "MISSING":
        if setting in ("http_port", "docker_service_active", "test_container_running"):
            return "HIGH"
        return "MEDIUM"

    if status == "UNEXPECTED":
        return "LOW"

    if status == "DRIFT":
        # Specific setting severity rules
        if setting == "http_port":
            return "CRITICAL"
        if setting in ("docker_service_active", "test_container_running"):
            return "HIGH"
        if setting == "health_check_endpoint":
            return "CRITICAL"
        if setting == "required_packages":
            return "MEDIUM"
        return "MEDIUM"

    return "INFO"


def get_recommendation(setting: str, status: str, expected: Any, actual: Any, reason: str = "") -> str:
    """
    Generates actionable, non-destructive recommendations for human operators.
    Never suggests or triggers automated script execution.
    """
    if status == "MATCH":
        return f"Setting '{setting}' conforms to the approved baseline. No action required."

    if status == "UNAVAILABLE":
        if "socket" in reason.lower() or "unprivileged" in reason.lower() or "container" in reason.lower():
            return (
                f"Setting '{setting}' cannot be verified safely from within the unprivileged container execution context. "
                "The Docker daemon socket (/var/run/docker.sock) is intentionally not mounted to maintain strict host "
                "security isolation (least privilege). To inspect host-level components, run checks directly on the host "
                "or deploy an authorized monitoring sidecar."
            )
        if "not listening" in reason.lower() or "refused" in reason.lower() or "unreachable" in reason.lower():
            return (
                f"Target endpoint for '{setting}' refused connection or is not currently listening. "
                "Verify that the intended service (e.g., Nginx web server or frontend container) is active and accessible "
                "on the target network, or configure TARGET_HTTP_HOST / TARGET_HEALTH_URL to point to the correct service address."
            )
        return (
            f"Check whether the state collector has sufficient permissions and whether the inspection "
            f"utilities for '{setting}' are available in the execution environment. Verify access rights without running commands as root."
        )

    if status == "ERROR":
        return (
            f"Observation of '{setting}' failed with an internal error. Check collector service logs, "
            f"network reachability, or resource limits. Review host health before re-running checks."
        )

    if status == "MISSING":
        return (
            f"The baseline specifies '{setting}' as '{expected}', but no corresponding setting was observed "
            f"in the environment. Verify whether this component has been provisioned or if the baseline requires updating."
        )

    if status == "UNEXPECTED":
        return (
            f"Observed value for '{setting}' is not defined in the approved baseline. "
            f"Review the setting with the infrastructure architecture team and determine whether it should be added to the baseline."
        )

    if status == "DRIFT":
        if setting == "http_port":
            return (
                f"Investigate why the configured HTTP port ({actual}) differs from the approved baseline ({expected}). "
                f"Check the web server / reverse proxy configuration (e.g. nginx.conf) and intended firewall policy before making changes."
            )
        if setting == "docker_service_active":
            return (
                f"Verify whether Docker should be running in this environment (expected: {expected}, observed: {actual}). "
                f"Inspect the systemd journal logs manually ('journalctl -u docker.service') and restart the service manually if appropriate."
            )
        if setting == "test_container_running":
            return (
                f"Verify the state of the designated test container (expected: {expected}, observed: {actual}). "
                f"Inspect container logs ('docker logs <container>') and docker compose status. Manually start or investigate container exit codes."
            )
        if setting == "required_packages":
            return (
                f"Required packages do not match the declared configuration. "
                f"Review missing or disabled packages ({actual}) versus expected ({expected}). "
                f"Audit the package manager state and install missing dependencies manually if approved."
            )
        if setting == "health_check_endpoint":
            return (
                f"The application health endpoint check did not return expected status. "
                f"Inspect application logs, verify endpoint routing, and ensure upstream backend processes are healthy."
            )

        return (
            f"Investigate the discrepancy for setting '{setting}' (expected: {expected}, observed: {actual}). "
            f"Confirm whether an authorized change occurred or if the host configuration must be adjusted."
        )

    return "Review the observed status and verify operational baseline alignment."
