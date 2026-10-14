"""
HTTP Port and Application Health Collector.
Safely inspects listening ports and approved health endpoints without arbitrary network access.
"""

import socket
import urllib.request
import urllib.error
import urllib.parse
import re
from datetime import datetime, timezone
from typing import Dict, Any

SOCKET_TIMEOUT_SECONDS = 2.0
HTTP_TIMEOUT_SECONDS = 3.0
SAFE_HOST_REGEX = re.compile(r"^[a-zA-Z0-9_\.\-]{1,128}$")
APPROVED_PATH_REGEX = re.compile(r"^[a-zA-Z0-9_\-\/\.\?=&]{1,128}$")


def validate_target_host(host: str) -> bool:
    """
    Validates host to ensure safe alphanumeric/dot/dash format without shell injection.
    """
    return bool(host and isinstance(host, str) and SAFE_HOST_REGEX.match(host))


def check_port_listening(port: int, host: str = "127.0.0.1") -> Dict[str, Any]:
    """
    Checks if a given port is actively listening on target host.
    Safe, read-only socket connection probe with strict timeout.
    If connection is refused, reports UNAVAILABLE because reconfigured port cannot be assumed.
    """
    now = datetime.now(timezone.utc).isoformat()

    if not isinstance(port, int) or port < 1 or port > 65535:
        return {
            "value": None,
            "status": "ERROR",
            "timestamp": now,
            "error": f"Invalid port number: {port}. Port must be between 1 and 65535."
        }

    if not validate_target_host(host):
        return {
            "value": None,
            "status": "ERROR",
            "timestamp": now,
            "error": f"Invalid or unsafe target host: '{host}'"
        }

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(SOCKET_TIMEOUT_SECONDS)
    try:
        result = sock.connect_ex((host, port))
        is_listening = (result == 0)
        sock.close()

        if is_listening:
            return {
                "value": port,
                "is_listening": True,
                "status": "OBSERVED",
                "timestamp": now,
                "port": port,
                "host": host,
                "error": None
            }
        else:
            # Connection refused or host unreachable.
            # We do NOT interpret connection refusal as proof that port drifted to a specific other port.
            return {
                "value": None,
                "is_listening": False,
                "status": "UNAVAILABLE",
                "timestamp": now,
                "port": port,
                "host": host,
                "error": f"Port {port} on target '{host}' refused connection or is not listening. Cannot verify port configuration without an active listener."
            }
    except Exception as e:
        try:
            sock.close()
        except Exception:
            pass
        return {
            "value": None,
            "is_listening": False,
            "status": "ERROR",
            "timestamp": now,
            "port": port,
            "host": host,
            "error": f"Socket inspection error on target '{host}:{port}': {str(e)}"
        }


def check_app_health(
    port: int = 80,
    endpoint: str = "/api/health",
    host: str = "127.0.0.1",
    custom_url: str = None
) -> Dict[str, Any]:
    """
    Performs a safe GET request against an approved health endpoint.
    Supports configurable custom_url or host/port/endpoint combination.
    Strictly forbids arbitrary external URLs or injection.
    """
    now = datetime.now(timezone.utc).isoformat()

    if custom_url:
        parsed = urllib.parse.urlparse(custom_url)
        if parsed.scheme not in ("http", "https"):
            return {
                "value": None,
                "status": "ERROR",
                "timestamp": now,
                "error": f"Invalid URL scheme '{parsed.scheme}'. Only http and https permitted."
            }
        target_hostname = parsed.hostname or "127.0.0.1"
        if not validate_target_host(target_hostname):
            return {
                "value": None,
                "status": "ERROR",
                "timestamp": now,
                "error": f"Invalid target host in URL: '{target_hostname}'"
            }
        url = custom_url
        endpoint_display = parsed.path or "/"
    else:
        if not validate_target_host(host):
            return {
                "value": None,
                "status": "ERROR",
                "timestamp": now,
                "error": f"Invalid or unsafe target host: '{host}'"
            }
        if not endpoint.startswith("/") or not APPROVED_PATH_REGEX.match(endpoint):
            return {
                "value": None,
                "status": "ERROR",
                "timestamp": now,
                "error": f"Invalid or unsafe health endpoint path: '{endpoint}'"
            }
        url = f"http://{host}:{port}{endpoint}"
        endpoint_display = endpoint

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "DriftGuard-Collector/1.0", "Accept": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_SECONDS) as response:
            status_code = response.getcode()
            is_healthy = (status_code == 200)
            return {
                "value": endpoint_display if is_healthy else None,
                "is_healthy": is_healthy,
                "status": "OBSERVED",
                "http_status": status_code,
                "endpoint": endpoint_display,
                "url": url,
                "timestamp": now,
                "error": None if is_healthy else f"HTTP status code {status_code}"
            }
    except urllib.error.HTTPError as e:
        # Server reached and returned error status code (e.g. 500, 503, 404)
        return {
            "value": False,
            "is_healthy": False,
            "status": "OBSERVED",
            "http_status": e.code,
            "endpoint": endpoint_display,
            "url": url,
            "timestamp": now,
            "error": f"HTTP {e.code}: {e.reason}"
        }
    except urllib.error.URLError as e:
        # Target unreachable or connection refused: Cannot verify health endpoint safely
        return {
            "value": None,
            "is_healthy": False,
            "status": "UNAVAILABLE",
            "endpoint": endpoint_display,
            "url": url,
            "timestamp": now,
            "error": f"Connection refused or unreachable on {url}: {str(e.reason)}"
        }
    except Exception as e:
        return {
            "value": None,
            "is_healthy": False,
            "status": "ERROR",
            "endpoint": endpoint_display,
            "url": url,
            "timestamp": now,
            "error": f"Health check failed with exception: {str(e)}"
        }
