"""
Report Generator and Persistence Service for DriftGuard.
Generates structured, validated JSON drift audit reports.
Stores recent reports to local filesystem with documented retention limit.
"""

import json
import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

MAX_STORED_REPORTS = 25
REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "reports")


def _ensure_reports_dir():
    os.makedirs(REPORTS_DIR, exist_ok=True)


def validate_report_structure(report: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validates report schema before generating download or persisting.
    """
    errors: List[str] = []
    required_keys = ["application", "environment", "mode", "scan_timestamp", "baseline_version", "summary", "findings"]
    for k in required_keys:
        if k not in report:
            errors.append(f"Report is missing required field: '{k}'")

    if "summary" in report and isinstance(report["summary"], dict):
        for metric in ["total", "matching", "drift", "missing", "unexpected", "unavailable", "errors"]:
            if metric not in report["summary"]:
                errors.append(f"Report summary missing metric: '{metric}'")
    else:
        errors.append("Field 'summary' must be a dictionary.")

    if not isinstance(report.get("findings"), list):
        errors.append("Field 'findings' must be a list.")

    return len(errors) == 0, errors


def generate_drift_report(
    comparison_result: Dict[str, Any],
    baseline: Dict[str, Any],
    observed_state: Dict[str, Any],
    mode: str = "REAL"
) -> Dict[str, Any]:
    """
    Constructs an audit-grade drift report.
    """
    now = datetime.now(timezone.utc).isoformat()
    environment = baseline.get("environment", comparison_result.get("environment", "devops-test"))
    baseline_version = baseline.get("version", "1.0.0")

    # Extract collection errors if present in observed state
    collection_errors = []
    for k, v in observed_state.items():
        if isinstance(v, dict) and v.get("error"):
            collection_errors.append({
                "setting": k,
                "status": v.get("status"),
                "error": v.get("error")
            })

    # Determine explicit collection scope
    if mode.upper() == "SIMULATED":
        collection_scope = {
            "execution_context": "SIMULATED",
            "is_container": False,
            "target_host": "in-memory-sandbox",
            "scope_description": "In-memory test scenario sandbox; no system commands or network probes executed."
        }
    else:
        collection_scope = observed_state.get("_collection_scope") or {
            "execution_context": observed_state.get("_execution_context", "CONTAINER" if observed_state.get("_is_container") else "HOST"),
            "is_container": observed_state.get("_is_container", False),
            "target_host": observed_state.get("_target_host", "127.0.0.1"),
            "scope_description": (
                "Inspecting from within DriftGuard backend container. Docker daemon socket (/var/run/docker.sock) "
                "is intentionally not mounted for security isolation (least privilege); inspection is limited to "
                "accessible network endpoints and the local container runtime."
                if observed_state.get("_is_container")
                else "Direct host execution context; system services and network sockets inspected directly."
            )
        }

    report = {
        "application": "DriftGuard",
        "platform_title": "Infrastructure Configuration Drift Detection Platform",
        "report_id": f"drift-report-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
        "environment": environment,
        "mode": mode.upper(),
        "collection_scope": collection_scope,
        "scan_timestamp": comparison_result.get("scan_timestamp", now),
        "generated_at": now,
        "baseline_version": baseline_version,
        "overall_status": comparison_result.get("overall_status", "UNKNOWN"),
        "summary": comparison_result.get("summary", {
            "total": 0,
            "matching": 0,
            "drift": 0,
            "missing": 0,
            "unexpected": 0,
            "unavailable": 0,
            "errors": 0
        }),
        "findings": comparison_result.get("findings", []),
        "baseline_snapshot": baseline.get("settings", {}),
        "observed_snapshot": {
            k: (v.get("value") if isinstance(v, dict) and "value" in v else v)
            for k, v in observed_state.items()
            if not k.startswith("_")
        },
        "collection_errors": collection_errors,
        "host_platform": observed_state.get("_platform", "Unknown"),
        "notice": "DriftGuard is strictly read-only. It detects and reports configuration drift without automatically modifying infrastructure."
    }

    is_valid, validation_errors = validate_report_structure(report)
    if not is_valid:
        raise ValueError(f"Report validation failed: {validation_errors}")

    return report


def save_report_to_disk(report: Dict[str, Any]) -> str:
    """
    Saves report to disk in JSON format and prunes older reports beyond MAX_STORED_REPORTS.
    Returns saved filepath.
    """
    _ensure_reports_dir()
    filename = f"{report['report_id']}.json"
    filepath = os.path.join(REPORTS_DIR, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    # Prune oldest if exceeding limit
    try:
        files = sorted(
            [os.path.join(REPORTS_DIR, f) for f in os.listdir(REPORTS_DIR) if f.endswith(".json")],
            key=os.path.getmtime
        )
        while len(files) > MAX_STORED_REPORTS:
            oldest = files.pop(0)
            os.remove(oldest)
    except Exception:
        pass

    return filepath


def load_latest_report_from_disk() -> Optional[Dict[str, Any]]:
    """
    Loads most recent report from disk if any exist.
    """
    _ensure_reports_dir()
    try:
        files = sorted(
            [os.path.join(REPORTS_DIR, f) for f in os.listdir(REPORTS_DIR) if f.endswith(".json")],
            key=os.path.getmtime
        )
        if not files:
            return None
        with open(files[-1], "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def list_saved_reports() -> List[Dict[str, Any]]:
    """
    Lists metadata of saved reports.
    """
    _ensure_reports_dir()
    reports_meta = []
    try:
        files = sorted(
            [os.path.join(REPORTS_DIR, f) for f in os.listdir(REPORTS_DIR) if f.endswith(".json")],
            key=os.path.getmtime,
            reverse=True
        )
        for fp in files:
            try:
                with open(fp, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    reports_meta.append({
                        "report_id": data.get("report_id"),
                        "environment": data.get("environment"),
                        "mode": data.get("mode"),
                        "collection_scope": data.get("collection_scope"),
                        "scan_timestamp": data.get("scan_timestamp"),
                        "overall_status": data.get("overall_status"),
                        "summary": data.get("summary"),
                        "filename": os.path.basename(fp)
                    })
            except Exception:
                continue
    except Exception:
        pass
    return reports_meta
