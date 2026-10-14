"""
Report Retrieval and Download API Routes.
"""

import os
import re
import json
from flask import Blueprint, jsonify, send_file, Response, abort
from services.report_generator import (
    load_latest_report_from_disk,
    list_saved_reports,
    REPORTS_DIR
)
from routes.drift import get_latest_report

reports_bp = Blueprint("reports", __name__)
SAFE_REPORT_ID_REGEX = re.compile(r"^drift-report-[0-9]{8}-[0-9]{6}$")


@reports_bp.route("/api/reports/latest", methods=["GET"])
def get_latest_report_json():
    """
    Returns latest report as JSON for inspection or download.
    """
    report = get_latest_report() or load_latest_report_from_disk()
    if not report:
        return jsonify({
            "error": "No reports generated yet.",
            "success": False
        }), 404

    return jsonify(report), 200


@reports_bp.route("/api/reports", methods=["GET"])
def get_reports_list():
    """
    Lists metadata of recent stored reports.
    """
    reports = list_saved_reports()
    return jsonify({
        "reports": reports,
        "count": len(reports),
        "retention_policy": "Last 25 reports persisted to local disk."
    }), 200


@reports_bp.route("/api/reports/<report_id>", methods=["GET"])
def get_report_by_id(report_id: str):
    """
    Retrieves specific report safely preventing directory traversal.
    """
    if not SAFE_REPORT_ID_REGEX.match(report_id):
        return jsonify({"error": "Invalid report ID format."}), 400

    filepath = os.path.join(REPORTS_DIR, f"{report_id}.json")
    if not os.path.exists(filepath):
        return jsonify({"error": "Report not found."}), 404

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": f"Failed to read report: {str(e)}"}), 500


@reports_bp.route("/api/reports/<report_id>/download", methods=["GET"])
def download_report(report_id: str):
    """
    Sends report file as downloadable JSON attachment.
    """
    if not SAFE_REPORT_ID_REGEX.match(report_id):
        return jsonify({"error": "Invalid report ID format."}), 400

    filepath = os.path.join(REPORTS_DIR, f"{report_id}.json")
    if not os.path.exists(filepath):
        return jsonify({"error": "Report not found."}), 404

    return send_file(
        filepath,
        mimetype="application/json",
        as_attachment=True,
        download_name=f"{report_id}.json"
    )
