"""
DriftGuard Backend Configuration.
"""

import os


class Config:
    APPLICATION_NAME = "DriftGuard"
    VERSION = "1.0.0"
    ENVIRONMENT = os.getenv("FLASK_ENV", "production")
    SECRET_KEY = os.getenv("SECRET_KEY", "driftguard-secret-key-not-for-prod")
    MAX_CONTENT_LENGTH = 1024 * 1024  # 1MB max request body

    # Permitted environments allowlist
    ALLOWED_ENVIRONMENTS = [
        "devops-test",
        "staging-cluster",
        "production-us-east-1",
        "local-sandbox"
    ]

    # Subprocess execution timeout in seconds
    COMMAND_TIMEOUT_SECONDS = 3

    # Configurable network targets for real infrastructure checks
    TARGET_HTTP_HOST = os.getenv("TARGET_HTTP_HOST") or os.getenv("HEALTH_CHECK_HOST") or ("frontend" if os.path.exists("/.dockerenv") else "127.0.0.1")
    TARGET_HEALTH_URL = os.getenv("TARGET_HEALTH_URL", None)
