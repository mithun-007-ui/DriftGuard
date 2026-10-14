"""
Baseline Configuration Routes.
"""

from flask import Blueprint, jsonify, request
from services.baseline_service import baseline_service
from schemas.baseline_schema import ALLOWED_SETTINGS, ALLOWED_ENVIRONMENTS

baseline_bp = Blueprint("baseline", __name__)


@baseline_bp.route("/api/environments", methods=["GET"])
def get_environments():
    """
    Returns allowed environment identifiers.
    """
    return jsonify({
        "environments": ALLOWED_ENVIRONMENTS,
        "default": "devops-test"
    }), 200


@baseline_bp.route("/api/config/baseline", methods=["GET"])
def get_baseline():
    """
    Returns current active baseline configuration.
    """
    env = request.args.get("environment")
    baseline = baseline_service.get_baseline(env)
    return jsonify({
        "baseline": baseline,
        "allowed_environments": ALLOWED_ENVIRONMENTS
    }), 200


@baseline_bp.route("/api/config/baseline", methods=["PUT"])
def update_baseline():
    """
    Validates and updates baseline. Strictly checks JSON types and constraints.
    """
    if not request.is_json:
        return jsonify({
            "error": "Request body must be valid JSON.",
            "success": False
        }), 400

    data = request.get_json()
    is_valid, errors, saved_baseline = baseline_service.update_baseline(data)

    if not is_valid:
        return jsonify({
            "success": False,
            "errors": errors,
            "message": "Baseline validation failed. Check schema constraints."
        }), 400

    return jsonify({
        "success": True,
        "message": "Baseline validated and saved successfully.",
        "baseline": saved_baseline
    }), 200


@baseline_bp.route("/api/config/baseline/reset", methods=["POST"])
def reset_baseline():
    """
    Resets current baseline to default template.
    """
    env = "devops-test"
    if request.is_json and request.get_json().get("environment"):
        env = request.get_json().get("environment")
    reset_data = baseline_service.reset_to_default(env)
    return jsonify({
        "success": True,
        "message": "Baseline reset to default template.",
        "baseline": reset_data
    }), 200


@baseline_bp.route("/api/config/schema", methods=["GET"])
def get_schema_rules():
    """
    Returns allowed schema settings and constraints for UI reference.
    """
    schema_info = {}
    for k, v in ALLOWED_SETTINGS.items():
        schema_info[k] = {
            "type": v["type"].__name__,
            "description": v["error_msg"]
        }
    return jsonify({
        "allowed_settings": schema_info,
        "allowed_environments": ALLOWED_ENVIRONMENTS
    }), 200
