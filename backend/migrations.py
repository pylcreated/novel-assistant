from copy import deepcopy
from typing import Any

from models import LATEST_SCHEMA_VERSION


def _as_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def _as_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _ensure_base_fields(project: dict[str, Any]) -> None:
    project["id"] = _as_str(project.get("id"))
    project["title"] = _as_str(project.get("title"))
    project["positioning"] = _as_str(project.get("positioning"))
    project["background"] = _as_str(project.get("background"))
    project["characters"] = _as_list(project.get("characters"))
    project["plotlines"] = _as_list(project.get("plotlines"))
    project["chapters"] = _as_list(project.get("chapters"))
    project["update_notes"] = _as_list(project.get("update_notes"))
    project["feedback_notes"] = _as_list(project.get("feedback_notes"))


def _migrate_01_to_02(project: dict[str, Any]) -> None:
    # v0.1 may use layer blocks or plain strings
    if "positioning" not in project and isinstance(project.get("layers"), dict):
        positioning = project["layers"].get("positioning", {})
        background = project["layers"].get("background", {})
        project["positioning"] = _as_str(positioning.get("content", ""))
        project["background"] = _as_str(background.get("content", ""))

    if "characters" not in project:
        project["characters"] = []
    if "chapters" not in project:
        project["chapters"] = []
    if "plot_threads" not in project and isinstance(project.get("plot"), list):
        project["plot_threads"] = project["plot"]
    if "plot_threads" not in project:
        project["plot_threads"] = []

    project["schema_version"] = "0.2"


def _migrate_02_to_03(project: dict[str, Any]) -> None:
    # v0.3 relationship-friendly default fields
    for c in _as_list(project.get("characters")):
        if isinstance(c, dict):
            c.setdefault("goal", "")
            c.setdefault("current_state", "")
            c.setdefault("relationship", "")
            c.setdefault("notes", "")

    for p in _as_list(project.get("plot_threads")):
        if isinstance(p, dict):
            p.setdefault("status", "active")
            p.setdefault("related_characters", [])
            p.setdefault("notes", "")

    for ch in _as_list(project.get("chapters")):
        if isinstance(ch, dict):
            ch.setdefault("status", "draft")
            ch.setdefault("characters", [])
            ch.setdefault("plotlines", [])
            ch.setdefault("notes", "")

    project["schema_version"] = "0.3"


def _migrate_03_to_04(project: dict[str, Any]) -> None:
    # required compatibility fields for v0.4+
    if "plotlines" not in project:
        project["plotlines"] = deepcopy(_as_list(project.get("plot_threads")))
    if "plot_threads" not in project:
        project["plot_threads"] = deepcopy(_as_list(project.get("plotlines")))

    if "feedback_notes" not in project:
        if isinstance(project.get("feedbacks"), list):
            project["feedback_notes"] = deepcopy(project["feedbacks"])
        else:
            project["feedback_notes"] = []

    if "update_notes" not in project:
        project["update_notes"] = []

    project["schema_version"] = "0.4"


def migrate_project(project: dict[str, Any]) -> dict[str, Any]:
    data = deepcopy(project)
    version = _as_str(data.get("schema_version")) or "0.1"
    data["schema_version"] = version

    if version == "0.1":
        _migrate_01_to_02(data)
        version = data["schema_version"]
    if version == "0.2":
        _migrate_02_to_03(data)
        version = data["schema_version"]
    if version == "0.3":
        _migrate_03_to_04(data)
        version = data["schema_version"]

    # if newer/unknown, keep but still ensure required fields
    data["schema_version"] = data.get("schema_version") or LATEST_SCHEMA_VERSION
    _ensure_base_fields(data)
    return data
