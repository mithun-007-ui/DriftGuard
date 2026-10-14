"""
Linux and Host OS State Collector.
Safely reads platform and OS metadata without arbitrary shell execution.
"""

import os
import platform
from typing import Dict, Any


def is_container_environment() -> bool:
    """
    Safely determines whether the current Python runtime is inside a container.
    """
    if os.path.exists("/.dockerenv") or os.path.exists("/run/.containerenv"):
        return True
    if os.getenv("DRIFTGUARD_IN_CONTAINER", "").lower() in ("true", "1", "yes"):
        return True
    if os.path.exists("/proc/self/cgroup"):
        try:
            with open("/proc/self/cgroup", "r", encoding="utf-8") as f:
                content = f.read()
                if any(x in content for x in ["docker", "containerd", "kubepods", "libpod"]):
                    return True
        except Exception:
            pass
    return False


def collect_os_info() -> Dict[str, Any]:
    """
    Safely inspects execution environment OS info.
    On Linux, reads /etc/os-release without executing external processes.
    Identifies whether execution is inside a container or directly on host.
    """
    system_name = platform.system().lower()
    in_container = is_container_environment()
    info = {
        "system": system_name,
        "release": platform.release(),
        "architecture": platform.machine(),
        "python_version": platform.python_version(),
        "is_linux": system_name == "linux",
        "is_container": in_container,
        "execution_environment": "CONTAINER" if in_container else "HOST"
    }

    if system_name == "linux" and os.path.exists("/etc/os-release"):
        try:
            with open("/etc/os-release", "r", encoding="utf-8") as f:
                for line in f:
                    if "=" in line:
                        k, v = line.strip().split("=", 1)
                        v = v.strip('"\'')
                        if k == "PRETTY_NAME":
                            info["pretty_name"] = v
                        elif k == "ID":
                            info["distro_id"] = v
                        elif k == "VERSION_ID":
                            info["distro_version"] = v
        except Exception as e:
            info["os_release_error"] = str(e)
    else:
        info["pretty_name"] = f"{platform.system()} {platform.release()}"

    # Annotate platform context if running within container
    if in_container:
        base_name = info.get("pretty_name", "Linux Container")
        info["display_platform"] = f"{base_name} [Backend Container Context]"
    else:
        info["display_platform"] = info.get("pretty_name", f"{platform.system()} {platform.release()}")

    return info
