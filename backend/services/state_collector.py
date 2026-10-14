"""
Real Infrastructure State Collector Coordinator for DriftGuard.
Executes only approved, read-only checks matching baseline settings.
Never runs arbitrary commands, never uses shell=True, never alters infrastructure.
"""

import os
from datetime import datetime, timezone
from typing import Dict, Any
from collectors.linux_collector import collect_os_info
from collectors.docker_collector import (
    check_docker_installed,
    check_docker_service_active,
    check_test_container_running
)
from collectors.http_collector import check_port_listening, check_app_health


def collect_real_infrastructure_state(baseline_settings: Dict[str, Any]) -> Dict[str, Any]:
    """
    Coordinates modular inspection of infrastructure state.
    Accurately identifies execution scope (container vs host).
    Does not assume the backend container is the host machine.
    """
    now = datetime.now(timezone.utc).isoformat()
    os_info = collect_os_info()
    in_container = os_info.get("is_container", False)
    execution_context = os_info.get("execution_environment", "HOST")
    platform_name = os_info.get("display_platform", os_info.get("pretty_name", "Unknown Host"))

    # Determine configurable network target for HTTP checks
    # In Docker Compose, the frontend web server (Nginx on port 80) is at service name 'frontend'
    target_host = (
        baseline_settings.get("target_host")
        or os.getenv("TARGET_HTTP_HOST")
        or os.getenv("HEALTH_CHECK_HOST")
        or ("frontend" if in_container else "127.0.0.1")
    )
    custom_health_url = baseline_settings.get("health_check_url") or os.getenv("TARGET_HEALTH_URL")

    collection_scope = {
        "execution_context": execution_context,
        "is_container": in_container,
        "target_host": target_host,
        "health_check_target": custom_health_url or f"http://{target_host}:{baseline_settings.get('http_port', 80)}{baseline_settings.get('health_check_endpoint', '/api/health')}",
        "scope_description": (
            "Inspecting from within DriftGuard backend container. Docker daemon socket (/var/run/docker.sock) "
            "is intentionally not mounted for security isolation (least privilege); inspection is limited to "
            "accessible network endpoints and the local container runtime."
            if in_container
            else "Direct host execution context; system services and network sockets inspected directly."
        )
    }

    observed: Dict[str, Any] = {
        "_collector_mode": "REAL",
        "_execution_context": execution_context,
        "_is_container": in_container,
        "_target_host": target_host,
        "_collection_scope": collection_scope,
        "_timestamp": now,
        "_platform": platform_name,
        "_host_info": os_info
    }

    # 1. HTTP Port
    if "http_port" in baseline_settings:
        expected_port = baseline_settings["http_port"]
        port_res = check_port_listening(expected_port, host=target_host)
        observed["http_port"] = port_res

    # 2. Docker Service
    if "docker_service_active" in baseline_settings:
        docker_srv = check_docker_service_active(is_container=in_container)
        observed["docker_service_active"] = docker_srv

    # 3. Test Container Running
    if "test_container_running" in baseline_settings:
        c_name = baseline_settings.get("test_container_name", "driftguard-test-container")
        c_res = check_test_container_running(c_name, is_container=in_container)
        observed["test_container_running"] = c_res
        if "test_container_name" in baseline_settings:
            if in_container and c_res.get("status") == "UNAVAILABLE":
                observed["test_container_name"] = {
                    "value": None,
                    "status": "UNAVAILABLE",
                    "timestamp": now,
                    "error": "Test container inspection unavailable without Docker daemon socket access."
                }
            else:
                observed["test_container_name"] = {
                    "value": c_name if c_res.get("value") is not None else None,
                    "status": c_res.get("status", "OBSERVED"),
                    "timestamp": now,
                    "error": c_res.get("error")
                }

    # 4. Required Packages
    if "required_packages" in baseline_settings:
        req_pkgs = baseline_settings["required_packages"]
        observed_pkgs = {}
        has_unavailable = False
        package_errors = []

        for pkg_name in req_pkgs.keys():
            if pkg_name == "docker":
                d_check = check_docker_installed(is_container=in_container)
                if d_check["status"] == "UNAVAILABLE":
                    has_unavailable = True
                    package_errors.append(d_check.get("error"))
                    observed_pkgs["docker"] = None
                else:
                    observed_pkgs["docker"] = d_check["value"]
            else:
                import shutil
                observed_pkgs[pkg_name] = (shutil.which(pkg_name) is not None)

        if in_container and has_unavailable:
            observed["required_packages"] = {
                "value": None,
                "status": "UNAVAILABLE",
                "timestamp": now,
                "error": " ; ".join(filter(None, package_errors)) or "Host packages cannot be inspected from within the backend container."
            }
        else:
            observed["required_packages"] = {
                "value": observed_pkgs,
                "status": "OBSERVED",
                "timestamp": now,
                "error": None
            }

    # 5. Application Health Check Endpoint
    if "health_check_endpoint" in baseline_settings:
        ep = baseline_settings["health_check_endpoint"]
        port = baseline_settings.get("http_port", 80)
        health_res = check_app_health(
            port=port,
            endpoint=ep,
            host=target_host,
            custom_url=custom_health_url
        )
        observed["health_check_endpoint"] = health_res

    return observed
