"""
Baseline Management Service for DriftGuard.
Safe storage and retrieval of infrastructure baselines.
Ensures zero shell execution or infrastructure modifications during baseline updates.
"""

import json
import os
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, List, Optional
from schemas.baseline_schema import validate_baseline, get_default_baseline, ALLOWED_ENVIRONMENTS

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
BASELINE_FILE = os.path.join(DATA_DIR, "baseline.json")


class BaselineService:
    def __init__(self):
        self._ensure_data_dir()
        self._current_baseline = self._load_from_disk() or get_default_baseline()

    def _ensure_data_dir(self):
        os.makedirs(DATA_DIR, exist_ok=True)

    def _load_from_disk(self) -> Optional[Dict[str, Any]]:
        if os.path.exists(BASELINE_FILE):
            try:
                with open(BASELINE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    is_valid, _ = validate_baseline(data)
                    if is_valid:
                        return data
            except Exception:
                pass
        return None

    def _save_to_disk(self, baseline: Dict[str, Any]):
        self._ensure_data_dir()
        with open(BASELINE_FILE, "w", encoding="utf-8") as f:
            json.dump(baseline, f, indent=2)

    def get_baseline(self, environment: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns active baseline. If environment differs, copies and sets target env.
        """
        data = dict(self._current_baseline)
        if environment and environment in ALLOWED_ENVIRONMENTS:
            data["environment"] = environment
        return data

    def update_baseline(self, new_baseline: Dict[str, Any]) -> Tuple[bool, List[str], Optional[Dict[str, Any]]]:
        """
        Validates and saves a new baseline.
        Never executes any shell command or alters infrastructure.
        """
        is_valid, errors = validate_baseline(new_baseline)
        if not is_valid:
            return False, errors, None

        # Add / update metadata timestamp safely
        saved_baseline = dict(new_baseline)
        saved_baseline["updated_at"] = datetime.now(timezone.utc).isoformat()
        if "version" not in saved_baseline:
            saved_baseline["version"] = "1.0.0"

        self._current_baseline = saved_baseline
        self._save_to_disk(saved_baseline)
        return True, [], saved_baseline

    def reset_to_default(self, environment: str = "devops-test") -> Dict[str, Any]:
        """
        Resets active baseline to default template.
        """
        default_b = get_default_baseline(environment)
        default_b["updated_at"] = datetime.now(timezone.utc).isoformat()
        self._current_baseline = default_b
        self._save_to_disk(default_b)
        return default_b


# Singleton instance
baseline_service = BaselineService()
