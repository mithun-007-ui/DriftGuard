"""
Simulated Test Scenarios API Routes.
Provides isolated sandbox scenarios for hackathon demonstrations.
"""

from flask import Blueprint, jsonify, request
from services.scenarios_service import (
    AVAILABLE_SCENARIOS,
    get_simulated_observed_state,
    SCENARIO_MATCHING,
    SCENARIO_PORT_DRIFT
)
from services.baseline_service import baseline_service
from services.comparison_engine import compare_configurations
from services.report_generator import generate_drift_report, save_report_to_disk
from routes.drift import set_latest_report

scenarios_bp = Blueprint("scenarios", __name__)


def _run_scenario_helper(scenario_id: str, environment: str = "devops-test"):
    baseline = baseline_service.get_baseline(environment)
    settings = baseline.get("settings", {})
    observed = get_simulated_observed_state(scenario_id, settings)
    comparison = compare_configurations(settings, observed, environment)
    report = generate_drift_report(comparison, baseline, observed, mode="SIMULATED")
    try:
        save_report_to_disk(report)
    except Exception:
        pass
    set_latest_report(report)
    return report


@scenarios_bp.route("/api/test-scenarios", methods=["GET"])
def list_scenarios():
    """
    Returns available simulated test scenarios for hackathon demonstration.
    """
    return jsonify({
        "scenarios": AVAILABLE_SCENARIOS,
        "mode": "SIMULATED",
        "notice": "Simulated scenarios run in an isolated memory fixture and never modify the operating system."
    }), 200


@scenarios_bp.route("/api/test-scenarios/matching", methods=["POST"])
def run_matching_scenario():
    """
    Loads simulated matching scenario where all configurations match baseline.
    """
    env = "devops-test"
    if request.is_json and request.get_json().get("environment"):
        env = request.get_json().get("environment")
    report = _run_scenario_helper(SCENARIO_MATCHING, env)
    return jsonify({
        "success": True,
        "scenario": SCENARIO_MATCHING,
        "mode": "SIMULATED",
        "report": report
    }), 200


@scenarios_bp.route("/api/test-scenarios/drift", methods=["POST"])
def run_drift_scenario():
    """
    Loads simulated drift scenario with port changed to 8080.
    """
    env = "devops-test"
    if request.is_json and request.get_json().get("environment"):
        env = request.get_json().get("environment")
    report = _run_scenario_helper(SCENARIO_PORT_DRIFT, env)
    return jsonify({
        "success": True,
        "scenario": SCENARIO_PORT_DRIFT,
        "mode": "SIMULATED",
        "report": report
    }), 200


@scenarios_bp.route("/api/test-scenarios/load", methods=["POST"])
def load_custom_scenario():
    """
    Loads any selected scenario by scenario_id.
    """
    payload = request.get_json(silent=True) or {}
    scenario_id = payload.get("scenario_id", SCENARIO_MATCHING)
    env = payload.get("environment", "devops-test")

    valid_ids = [s["id"] for s in AVAILABLE_SCENARIOS]
    if scenario_id not in valid_ids:
        return jsonify({
            "error": f"Invalid scenario '{scenario_id}'. Available: {valid_ids}",
            "success": False
        }), 400

    report = _run_scenario_helper(scenario_id, env)
    return jsonify({
        "success": True,
        "scenario": scenario_id,
        "mode": "SIMULATED",
        "report": report
    }), 200
