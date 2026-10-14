"""
Tests for Baseline Schema Validation.
Ensures baseline definitions are strictly validated and invalid input is rejected.
"""

import pytest
from schemas.baseline_schema import validate_baseline, get_default_baseline


def test_valid_default_baseline():
    baseline = get_default_baseline()
    is_valid, errors = validate_baseline(baseline)
    assert is_valid is True
    assert len(errors) == 0


def test_invalid_json_type():
    is_valid, errors = validate_baseline(["not a dict"])
    assert is_valid is False
    assert any("JSON object" in e for e in errors)


def test_missing_required_fields():
    is_valid, errors = validate_baseline({"environment": "devops-test"})
    assert is_valid is False
    assert any("Missing required field: 'settings'" in e for e in errors)

    is_valid2, errors2 = validate_baseline({"settings": {"http_port": 80}})
    assert is_valid2 is False
    assert any("Missing required field: 'environment'" in e for e in errors2)


def test_invalid_environment_name():
    is_valid, errors = validate_baseline({
        "environment": "unauthorized-env-name-that-is-not-allowlisted",
        "settings": {"http_port": 80}
    })
    assert is_valid is False
    assert any("not in the allowed environments" in e for e in errors)


def test_invalid_port_range():
    # Negative port
    is_valid, errors = validate_baseline({
        "environment": "devops-test",
        "settings": {"http_port": -1}
    })
    assert is_valid is False
    assert any("http_port must be an integer between 1 and 65535" in e for e in errors)

    # Over 65535
    is_valid2, errors2 = validate_baseline({
        "environment": "devops-test",
        "settings": {"http_port": 70000}
    })
    assert is_valid2 is False
    assert any("http_port must be an integer between 1 and 65535" in e for e in errors2)


def test_invalid_value_types():
    # Boolean passed as string or int
    is_valid, errors = validate_baseline({
        "environment": "devops-test",
        "settings": {"docker_service_active": "true_string"}
    })
    assert is_valid is False
    assert any("docker_service_active must be a boolean" in e for e in errors)

    # Port passed as string
    is_valid2, errors2 = validate_baseline({
        "environment": "devops-test",
        "settings": {"http_port": "80"}
    })
    assert is_valid2 is False
    assert any("http_port must be an integer" in e for e in errors2)


def test_unknown_settings_rejected():
    is_valid, errors = validate_baseline({
        "environment": "devops-test",
        "settings": {
            "http_port": 80,
            "arbitrary_dangerous_key": "some_command; rm -rf /"
        }
    })
    assert is_valid is False
    assert any("Unknown or unsupported configuration setting: 'arbitrary_dangerous_key'" in e for e in errors)
