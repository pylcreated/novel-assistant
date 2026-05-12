import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from migrations import migrate_project
from models import LATEST_SCHEMA_VERSION, Project


BASE_DIR = Path(__file__).resolve().parent.parent
PROJECTS_DIR = BASE_DIR / "data" / "projects"
BACKUPS_DIR = BASE_DIR / "data" / "backups"


def ensure_storage_dir() -> None:
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)


def project_file_path(project_id: str) -> Path:
    return PROJECTS_DIR / f"{project_id}.json"


def _safe_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def _safe_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _normalize_project_dict(data: dict[str, Any]) -> dict[str, Any]:
    migrated = migrate_project(data)

    # Keep old aliases in sync, but do not remove old fields.
    if not isinstance(migrated.get("plot_threads"), list):
        migrated["plot_threads"] = _safe_list(migrated.get("plotlines"))
    if not isinstance(migrated.get("plotlines"), list):
        migrated["plotlines"] = _safe_list(migrated.get("plot_threads"))

    migrated["feedback"] = _safe_str(migrated.get("feedback"))
    if not isinstance(migrated.get("feedbacks"), list):
        migrated["feedbacks"] = _safe_list(migrated.get("feedback_notes"))
    if not isinstance(migrated.get("feedback_notes"), list):
        migrated["feedback_notes"] = _safe_list(migrated.get("feedbacks"))

    migrated["update_notes"] = _safe_list(migrated.get("update_notes"))
    migrated["schema_version"] = _safe_str(migrated.get("schema_version")) or LATEST_SCHEMA_VERSION
    return migrated


def _backup_if_exists(path: Path) -> None:
    if not path.exists():
        return
    folder = BACKUPS_DIR / datetime.now().strftime("%Y-%m-%d")
    folder.mkdir(parents=True, exist_ok=True)
    # Use microseconds + random suffix to avoid same-second collision under rapid saves.
    backup_name = f"{path.stem}_{datetime.now().strftime('%H%M%S_%f')}_{uuid4().hex[:6]}.json"
    backup_path = folder / backup_name
    try:
        shutil.copy2(path, backup_path)
    except OSError:
        # Do not block save/delete if backup path is temporarily unavailable.
        return


def save_project(project: Project) -> None:
    ensure_storage_dir()
    path = project_file_path(project.id)
    _backup_if_exists(path)

    payload = project.model_dump()
    payload["schema_version"] = LATEST_SCHEMA_VERSION
    # Keep compatibility aliases in saved JSON
    payload["plotlines"] = payload.get("plot_threads", [])
    payload["feedback_notes"] = payload.get("feedbacks", [])
    payload.setdefault("update_notes", [])

    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def load_project(project_id: str) -> Project | None:
    path = project_file_path(project_id)
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8-sig") as f:
        data = json.load(f)
    normalized = _normalize_project_dict(data)
    return Project(**normalized)


def list_projects() -> list[Project]:
    ensure_storage_dir()
    projects: list[Project] = []
    for path in PROJECTS_DIR.glob("*.json"):
        with path.open("r", encoding="utf-8-sig") as f:
            data = json.load(f)
        normalized = _normalize_project_dict(data)
        projects.append(Project(**normalized))
    projects.sort(key=lambda p: p.updated_at, reverse=True)
    return projects


def delete_project(project_id: str) -> bool:
    path = project_file_path(project_id)
    if not path.exists():
        return False
    _backup_if_exists(path)
    path.unlink()
    return True
