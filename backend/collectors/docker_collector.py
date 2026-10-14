"""
Docker Component Collector.
Read-only, secure checks for Docker binary, service status, and test container state.
Never modifies container or daemon state.
"""

import shutil
import subprocess
import re
from datetime import datetime, timezone
from typing import Dict, Any

SAFE_CONTAINER_NAME_REGEX = re.compile(r"^[a-zA-Z0-9_\.\-]{1,64}$")
SUBPROCESS_TIMEOUT_SECONDS = 3


def check_docker_installed(is_container: bool = False) -> Dict[str, Any]:
    """
    Checks if the docker CLI executable is present in PATH.
    If executing within a container, a missing CLI does not indicate Docker is absent from the host.
    """
    now = datetime.now(timezone.utc).isoformat()
    if is_container:
        return {
            "value": None,
            "status": "UNAVAILABLE",
            "path": None,
            "timestamp": now,
            "error": "Host package 'docker' cannot be verified from within the unprivileged backend container. Host filesystem and package manager are isolated from this container context."
        }

    docker_path = shutil.which("docker")
    is_installed = docker_path is not None

    return {
        "value": is_installed,
        "status": "OBSERVED",
        "path": docker_path,
        "timestamp": now,
        "error": None
    }


def check_docker_service_active(is_container: bool = False) -> Dict[str, Any]:
    """
    Checks if the Docker service daemon is currently active.
    Uses systemctl if available, reporting UNAVAILABLE if systemd is not present.
    Explains container isolation limitation rather than assuming host lacks Docker.
    """
    now = datetime.now(timezone.utc).isoformat()
    systemctl_path = shutil.which("systemctl")

    if not systemctl_path:
        # Check if docker daemon responds via 'docker info' as fallback
        docker_path = shutil.which("docker")
        if not docker_path:
            if is_container:
                err_msg = (
                    "Docker host inspection is unsupported from the unprivileged backend container. "
                    "The Docker daemon socket (/var/run/docker.sock) is intentionally not mounted for security "
                    "isolation (least privilege). Host Docker daemon status cannot be verified safely from this container context."
                )
            else:
                err_msg = "Neither systemctl nor docker binary found in execution environment to verify service state."
            return {
                "value": None,
                "status": "UNAVAILABLE",
                "timestamp": now,
                "error": err_msg
            }
        try:
            # Safe read-only argument list with timeout
            result = subprocess.run(
                ["docker", "info"],
                capture_output=True,
                text=True,
                timeout=SUBPROCESS_TIMEOUT_SECONDS,
                shell=False
            )
            is_active = (result.returncode == 0)
            return {
                "value": is_active,
                "status": "OBSERVED",
                "timestamp": now,
                "error": None if is_active else result.stderr.strip() or "Docker daemon not responding"
            }
        except subprocess.TimeoutExpired:
            return {
                "value": None,
                "status": "ERROR",
                "timestamp": now,
                "error": f"Docker daemon check timed out after {SUBPROCESS_TIMEOUT_SECONDS}s"
            }
        except Exception as e:
            return {
                "value": None,
                "status": "ERROR",
                "timestamp": now,
                "error": f"Failed to check Docker service state: {str(e)}"
            }

    # If systemctl exists, run systemctl is-active docker
    try:
        result = subprocess.run(
            ["systemctl", "is-active", "docker"],
            capture_output=True,
            text=True,
            timeout=SUBPROCESS_TIMEOUT_SECONDS,
            shell=False
        )
        status_output = result.stdout.strip()
        is_active = (status_output == "active")
        return {
            "value": is_active,
            "status": "OBSERVED",
            "systemd_output": status_output,
            "timestamp": now,
            "error": None
        }
    except subprocess.TimeoutExpired:
        return {
            "value": None,
            "status": "ERROR",
            "timestamp": now,
            "error": f"systemctl command timed out after {SUBPROCESS_TIMEOUT_SECONDS}s"
        }
    except Exception as e:
        return {
            "value": None,
            "status": "ERROR",
            "timestamp": now,
            "error": f"systemctl execution failed: {str(e)}"
        }


def check_test_container_running(container_name: str = "driftguard-test-container", is_container: bool = False) -> Dict[str, Any]:
    """
    Checks whether a specific approved test container is running.
    Strictly validates container_name to prevent argument injection.
    """
    now = datetime.now(timezone.utc).isoformat()

    if not SAFE_CONTAINER_NAME_REGEX.match(container_name):
        return {
            "value": None,
            "status": "ERROR",
            "timestamp": now,
            "error": f"Container name '{container_name}' does not meet safety constraints."
        }

    docker_path = shutil.which("docker")
    if not docker_path:
        if is_container:
            err_msg = (
                f"Test container inspection for '{container_name}' is unsupported from the unprivileged backend container "
                "without Docker daemon access. Docker daemon socket (/var/run/docker.sock) is intentionally not mounted "
                "for security isolation (least privilege)."
            )
        else:
            err_msg = "Docker binary not installed in execution environment; cannot inspect container."
        return {
            "value": None,
            "status": "UNAVAILABLE",
            "timestamp": now,
            "error": err_msg
        }

    try:
        # Predefined argument list, strictly safe
        cmd = ["docker", "inspect", "--format={{.State.Status}}", container_name]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=SUBPROCESS_TIMEOUT_SECONDS,
            shell=False
        )
        if result.returncode != 0:
            # Container doesn't exist or stopped
            stderr = result.stderr.strip()
            if "No such object" in stderr or "Error: No such container" in stderr:
                return {
                    "value": False,
                    "status": "OBSERVED",
                    "container_status": "non_existent",
                    "timestamp": now,
                    "error": None
                }
            return {
                "value": False,
                "status": "OBSERVED",
                "container_status": "error_or_stopped",
                "timestamp": now,
                "error": stderr
            }

        state = result.stdout.strip()
        is_running = (state == "running")
        return {
            "value": is_running,
            "status": "OBSERVED",
            "container_status": state,
            "timestamp": now,
            "error": None
        }
    except subprocess.TimeoutExpired:
        return {
            "value": None,
            "status": "ERROR",
            "timestamp": now,
            "error": f"Container inspection timed out after {SUBPROCESS_TIMEOUT_SECONDS}s"
        }
    except Exception as e:
        return {
            "value": None,
            "status": "ERROR",
            "timestamp": now,
            "error": f"Container inspection exception: {str(e)}"
        }
