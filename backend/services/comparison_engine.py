"""
DriftGuard Core Comparison Engine.
Pure, deterministic, read-only comparison between expected baseline configuration
and actual observed configuration.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from services.recommendation_engine import get_severity, get_recommendation


# Internal metadata keys in observed state that should not be evaluated as unexpected settings
IGNORED_OBSERVED_METADATA_KEYS = {
    "_timestamp",
    "_collector_mode",
    "_platform",
    "_host_info",
    "_collector_errors"
}


def _normalize_observed_entry(entry: Any) -> Dict[str, Any]:
    """
    Normalizes an entry from the state collector into a standard dict:
    { "value": ..., "status": "OBSERVED"|"UNAVAILABLE"|"ERROR", "error": "...", "timestamp": "..." }
    """
    if isinstance(entry, dict) and ("value" in entry or "status" in entry):
        return {
            "value": entry.get("value"),
            "status": entry.get("status", "OBSERVED"),
            "error": entry.get("error"),
            "timestamp": entry.get("timestamp")
        }
    return {
        "value": entry,
        "status": "OBSERVED",
        "error": None,
        "timestamp": None
    }


def compare_configurations(
    expected_settings: Dict[str, Any],
    observed_settings: Dict[str, Any],
    environment: str = "devops-test",
    scan_timestamp: Optional[str] = None
) -> Dict[str, Any]:
    """
    Deterministic comparison engine.
    Compares declared baseline against observed infrastructure state.
    Never alters infrastructure.
    """
    now_iso = scan_timestamp or datetime.now(timezone.utc).isoformat()
    findings: List[Dict[str, Any]] = []

    expected_settings = expected_settings or {}
    observed_settings = observed_settings or {}

    expected_keys = set(expected_settings.keys())
    # Exclude all metadata keys starting with '_' from unexpected check
    observed_candidate_keys = {k for k in observed_settings.keys() if not k.startswith("_")}

    # 1. Compare all expected keys
    for key in sorted(expected_keys):
        expected_val = expected_settings[key]

        if key not in observed_candidate_keys:
            status = "MISSING"
            reason = f"Baseline expects '{key}' = {expected_val}, but it was not observed."
            actual_val = None
        else:
            norm = _normalize_observed_entry(observed_settings[key])
            obs_status = norm["status"]
            obs_value = norm["value"]
            obs_error = norm["error"]

            if obs_status == "UNAVAILABLE":
                status = "UNAVAILABLE"
                reason = obs_error or f"Collector could not observe setting '{key}' on the target host."
                actual_val = None
            elif obs_status == "ERROR":
                status = "ERROR"
                reason = obs_error or f"Collector encountered an error while observing '{key}'."
                actual_val = None
            else:
                # Both values observed: compare equality
                actual_val = obs_value
                if expected_val == actual_val:
                    status = "MATCH"
                    reason = f"Setting '{key}' matches expected baseline value ({expected_val})."
                else:
                    status = "DRIFT"
                    reason = f"Drift detected for '{key}': expected {expected_val}, but observed {actual_val}."

        finding_timestamp = norm.get("timestamp") if (key in observed_candidate_keys and "norm" in locals() and norm.get("timestamp")) else now_iso
        severity = get_severity(key, status)
        rec = get_recommendation(key, status, expected_val, actual_val, reason)

        findings.append({
            "setting": key,
            "expected": expected_val,
            "actual": actual_val,
            "status": status,
            "severity": severity,
            "timestamp": finding_timestamp,
            "reason": reason,
            "recommendation": rec
        })

    # 2. Identify unexpected keys present in observed state but absent from baseline
    unexpected_keys = sorted(observed_candidate_keys - expected_keys)
    for key in unexpected_keys:
        norm = _normalize_observed_entry(observed_settings[key])
        status = "UNEXPECTED"
        actual_val = norm["value"]
        reason = f"Setting '{key}' with value '{actual_val}' was observed on host, but is not defined in the baseline."
        severity = get_severity(key, status)
        rec = get_recommendation(key, status, None, actual_val, reason)

        findings.append({
            "setting": key,
            "expected": None,
            "actual": actual_val,
            "status": status,
            "severity": severity,
            "timestamp": norm.get("timestamp") or now_iso,
            "reason": reason,
            "recommendation": rec
        })

    # Summary counts
    matching_count = sum(1 for f in findings if f["status"] == "MATCH")
    drift_count = sum(1 for f in findings if f["status"] == "DRIFT")
    missing_count = sum(1 for f in findings if f["status"] == "MISSING")
    unexpected_count = sum(1 for f in findings if f["status"] == "UNEXPECTED")
    unavailable_count = sum(1 for f in findings if f["status"] == "UNAVAILABLE")
    errors_count = sum(1 for f in findings if f["status"] == "ERROR")
    total_count = len(findings)

    # Determine overall status
    if errors_count > 0:
        overall_status = "ERROR"
    elif drift_count > 0:
        overall_status = "DRIFT_DETECTED"
    elif missing_count > 0:
        overall_status = "DRIFT_DETECTED"
    elif unavailable_count > 0 or unexpected_count > 0:
        overall_status = "WARNING"
    else:
        overall_status = "COMPLIANT"

    return {
        "environment": environment,
        "scan_timestamp": now_iso,
        "overall_status": overall_status,
        "summary": {
            "total": total_count,
            "matching": matching_count,
            "drift": drift_count,
            "missing": missing_count,
            "unexpected": unexpected_count,
            "unavailable": unavailable_count,
            "errors": errors_count
        },
        "findings": findings
    }
