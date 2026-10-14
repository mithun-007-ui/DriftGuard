"""
Drift Detection and Comparison API Routes.
"""

from flask import Blueprint, jsonify, request
from services.baseline_service import baseline_service
from services.comparison_engine import compare_configurations
from services.state_collector import collect_real_infrastructure_state
from services.scenarios_service import get_simulated_observed_state, SCENARIO_MATCHING
from services.report_generator import (
    generate_drift_report,
    save_report_to_disk,
    load_latest_report_from_disk
)
from schemas.baseline_schema import ALLOWED_ENVIRONMENTS

drift_bp = Blueprint("drift", __name__)

# In-memory cache for fast retrieval
_latest_drift_report = None


def get_latest_report():
    global _latest_drift_report
    if _latest_drift_report is None:
        _latest_drift_report = load_latest_report_from_disk()
    return _latest_drift_report


def set_latest_report(report):
    global _latest_drift_report
    _latest_drift_report = report


@drift_bp.route("/api/drift/check", methods=["POST"])
def run_drift_check():
    """
    Executes a configuration drift check against real host or simulated test scenario.
    Deterministic and read-only.
    """
    payload = request.get_json(silent=True) or {}
    env = payload.get("environment", "devops-test")
    mode = payload.get("mode", "REAL").upper()
    scenario_id = payload.get("scenario_id", SCENARIO_MATCHING)

    if env not in ALLOWED_ENVIRONMENTS:
        return jsonify({
            "error": f"Environment '{env}' not permitted. Allowed: {ALLOWED_ENVIRONMENTS}",
            "success": False
        }), 400

    if mode not in ["REAL", "SIMULATED"]:
        return jsonify({
            "error": "Mode must be either 'REAL' or 'SIMULATED'.",
            "success": False
        }), 400

    # Retrieve current active baseline
    baseline = baseline_service.get_baseline(env)
    settings = baseline.get("settings", {})

    # Collect observed configuration
    if mode == "SIMULATED":
        observed = get_simulated_observed_state(scenario_id, settings)
    else:
        observed = collect_real_infrastructure_state(settings)

    # Pure comparison engine
    comparison = compare_configurations(settings, observed, env)

    # Generate validated audit report
    report = generate_drift_report(comparison, baseline, observed, mode=mode)

    # Persist report safely
    try:
        save_report_to_disk(report)
    except Exception:
        pass

    set_latest_report(report)

    return jsonify({
        "success": True,
        "mode": mode,
        "environment": env,
        "scenario_id": scenario_id if mode == "SIMULATED" else None,
        "collection_scope": report.get("collection_scope"),
        "scan_timestamp": report["scan_timestamp"],
        "overall_status": report["overall_status"],
        "summary": report["summary"],
        "findings": report["findings"],
        "report_id": report["report_id"],
        "report": report
    }), 200


@drift_bp.route("/api/drift/latest", methods=["GET"])
def get_latest_drift():
    """
    Returns latest completed drift report.
    """
    report = get_latest_report()
    if not report:
        return jsonify({
            "message": "No scan has been performed yet.",
            "has_data": False,
            "report": None
        }), 200

    return jsonify({
        "has_data": True,
        "report": report
    }), 200
