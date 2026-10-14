"""
DriftGuard Flask Application Factory and Server Entrypoint.
"""

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from routes.health import health_bp
from routes.baseline import baseline_bp
from routes.drift import drift_bp
from routes.reports import reports_bp
from routes.scenarios import scenarios_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for local Vite dev server and container deployment
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register API blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(baseline_bp)
    app.register_blueprint(drift_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(scenarios_bp)

    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            "error": "The requested endpoint was not found.",
            "status_code": 404
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({
            "error": "HTTP method not allowed for this route.",
            "status_code": 405
        }), 405

    @app.errorhandler(413)
    def request_entity_too_large(e):
        return jsonify({
            "error": "Payload exceeds maximum allowed size (1MB).",
            "status_code": 413
        }), 413

    @app.errorhandler(500)
    def internal_server_error(e):
        return jsonify({
            "error": "Internal server error occurred.",
            "status_code": 500
        }), 500

    return app


app = create_app()

if __name__ == "__main__":
    # Runs backend on port 5000 in dev
    app.run(host="0.0.0.0", port=5000, debug=False)
