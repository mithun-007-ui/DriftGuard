"""
Health Check API Route.
"""

from flask import Blueprint, jsonify
from datetime import datetime, timezone

health_bp = Blueprint("health", __name__)


@health_bp.route("/api/health", methods=["GET"])
def get_health():
    """
    Returns application health status and read-only guarantee.
    """
    return jsonify({
        "status": "healthy",
        "application": "DriftGuard",
        "version": "1.0.0",
        "read_only": True,
        "auto_remediation_disabled": True,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200
