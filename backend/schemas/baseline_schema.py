"""
Baseline Configuration Schema Validator for DriftGuard.
Validates baseline JSON strictly and safely without running any shell commands.
"""

import re
from typing import Dict, Any, Tuple, List

# Allowed environment name pattern: alphanumeric, hyphens, underscores
ENV_NAME_REGEX = re.compile(r"^[a-zA-Z0-9_\-]{2,64}$")

# Recognized setting definitions with expected types and validators
ALLOWED_SETTINGS = {
    "http_port": {
        "type": int,
        "validator": lambda v: isinstance(v, int) and not isinstance(v, bool) and 1 <= v <= 65535,
        "error_msg": "http_port must be an integer between 1 and 65535"
    },
    "docker_service_active": {
        "type": bool,
        "validator": lambda v: isinstance(v, bool),
        "error_msg": "docker_service_active must be a boolean (true or false)"
    },
    "test_container_running": {
        "type": bool,
        "validator": lambda v: isinstance(v, bool),
        "error_msg": "test_container_running must be a boolean (true or false)"
    },
    "test_container_name": {
        "type": str,
        "validator": lambda v: isinstance(v, str) and bool(re.match(r"^[a-zA-Z0-9_\.\-]{1,64}$", v)),
        "error_msg": "test_container_name must be a safe alphanumeric string (1-64 chars, allowing . _ -)"
    },
    "required_packages": {
        "type": dict,
        "validator": lambda v: isinstance(v, dict) and all(isinstance(k, str) and isinstance(val, bool) for k, val in v.items()),
        "error_msg": "required_packages must be a dictionary of {package_name: boolean}"
    },
    "health_check_endpoint": {
        "type": str,
        "validator": lambda v: isinstance(v, str) and v.startswith("/") and " " not in v and len(v) <= 256,
        "error_msg": "health_check_endpoint must be a valid relative path starting with '/' (max 256 chars)"
    },
    "os_family": {
        "type": str,
        "validator": lambda v: isinstance(v, str) and v.lower() in ["linux", "ubuntu", "debian", "alpine", "rhel", "centos", "windows"],
        "error_msg": "os_family must be a recognized OS name (e.g. 'linux', 'ubuntu')"
    },
    "target_host": {
        "type": str,
        "validator": lambda v: isinstance(v, str) and bool(re.match(r"^[a-zA-Z0-9_\.\-]{1,128}$", v)),
        "error_msg": "target_host must be a valid hostname or IP address (e.g. 'frontend', '127.0.0.1')"
    },
    "health_check_url": {
        "type": str,
        "validator": lambda v: isinstance(v, str) and bool(re.match(r"^https?://[a-zA-Z0-9_\.\-]+(?::[0-9]{1,5})?(?:/[a-zA-Z0-9_\-\/\.\?=&]*)?$", v)),
        "error_msg": "health_check_url must be a valid HTTP/HTTPS URL (e.g. 'http://frontend:80/api/health')"
    }
}

ALLOWED_ENVIRONMENTS = [
    "devops-test",
    "staging-cluster",
    "production-us-east-1",
    "local-sandbox"
]


def validate_baseline(data: Any, allowed_environments: List[str] = None) -> Tuple[bool, List[str]]:
    """
    Validate a baseline configuration dictionary.
    Returns (is_valid, error_messages).
    """
    errors: List[str] = []

    if not isinstance(data, dict):
        return False, ["Baseline payload must be a JSON object (dictionary)."]

    # Required keys
    if "environment" not in data:
        errors.append("Missing required field: 'environment'.")
    elif not isinstance(data["environment"], str) or not ENV_NAME_REGEX.match(data["environment"]):
        errors.append("Field 'environment' must be an alphanumeric string (2-64 chars, with hyphens or underscores).")
    else:
        env_allowlist = allowed_environments or ALLOWED_ENVIRONMENTS
        if data["environment"] not in env_allowlist:
            errors.append(f"Environment '{data['environment']}' is not in the allowed environments list: {env_allowlist}.")

    if "settings" not in data:
        errors.append("Missing required field: 'settings'.")
    elif not isinstance(data["settings"], dict):
        errors.append("Field 'settings' must be a JSON object (key-value pairs).")
    else:
        settings = data["settings"]
        if not settings:
            errors.append("Field 'settings' must not be empty. Define at least one configuration setting.")

        # Check for unknown keys and validate types
        for key, value in settings.items():
            if key not in ALLOWED_SETTINGS:
                errors.append(
                    f"Unknown or unsupported configuration setting: '{key}'. "
                    f"Allowed settings are: {', '.join(sorted(ALLOWED_SETTINGS.keys()))}."
                )
                continue

            rule = ALLOWED_SETTINGS[key]
            if not rule["validator"](value):
                errors.append(f"Invalid value for setting '{key}': {rule['error_msg']}.")

    # Optional metadata fields
    if "version" in data and not isinstance(data["version"], str):
        errors.append("Field 'version' if provided must be a string (e.g., '1.0.0').")

    if "description" in data and not isinstance(data["description"], str):
        errors.append("Field 'description' if provided must be a string.")

    return len(errors) == 0, errors


def get_default_baseline(environment: str = "devops-test") -> Dict[str, Any]:
    """
    Returns an approved default baseline template.
    """
    return {
        "environment": environment,
        "version": "1.0.0",
        "description": "Baseline configuration for DevOps hackathon test host",
        "settings": {
            "http_port": 80,
            "docker_service_active": True,
            "test_container_running": True,
            "test_container_name": "driftguard-test-container",
            "required_packages": {
                "docker": True
            },
            "health_check_endpoint": "/api/health"
        }
    }
