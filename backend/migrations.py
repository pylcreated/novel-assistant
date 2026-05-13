from copy import deepcopy
from typing import Any

try:
    from .models import LATEST_SCHEMA_VERSION
except ImportError:
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
    project["notes"] = _as_list(project.get("notes"))


def _note_from_legacy(item_type: str, item: dict[str, Any], idx: int, project_id: str) -> dict[str, Any]:
    return {
        "id": _as_str(item.get("id")) or f"note_{item_type}_{idx + 1}",
        "project_id": project_id,
        "type": item_type,
        "title": _as_str(item.get("name") or item.get("title")),
        "content": _as_str(item.get("content") or item.get("description") or item.get("notes")),
        "order": idx,
        "created_at": _as_str(item.get("created_at")),
        "updated_at": _as_str(item.get("updated_at")),
    }


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
    if "notes" not in project:
        project["notes"] = []

    project["schema_version"] = "0.4"


def _migrate_simple_core(project: dict[str, Any]) -> None:
    pid = _as_str(project.get("id"))

    chapters = _as_list(project.get("chapters"))
    for idx, ch in enumerate(chapters):
        if not isinstance(ch, dict):
            continue
        ch.setdefault("project_id", pid)
        ch.setdefault("title", "")
        ch.setdefault("content", "")
        ch.setdefault("order", idx)
        ch.setdefault("created_at", _as_str(project.get("created_at")))
        ch.setdefault("updated_at", _as_str(project.get("updated_at")))
        if not ch.get("content"):
            # legacy fallback: promote notes/summary text to content if empty
            ch["content"] = _as_str(ch.get("notes") or ch.get("summary"))

    notes = _as_list(project.get("notes"))
    if not notes:
        # convert old structured collections into free notes (non-destructive)
        legacy_notes: list[dict[str, Any]] = []
        for idx, c in enumerate(_as_list(project.get("characters"))):
            if isinstance(c, dict):
                legacy_notes.append(_note_from_legacy("character", c, idx, pid))
        for idx, p in enumerate(_as_list(project.get("plot_threads"))):
            if isinstance(p, dict):
                legacy_notes.append(_note_from_legacy("plotline", p, idx, pid))
        project["notes"] = legacy_notes
    else:
        for idx, n in enumerate(notes):
            if not isinstance(n, dict):
                continue
            n.setdefault("id", f"note_other_{idx + 1}")
            n.setdefault("project_id", pid)
            n.setdefault("type", "other")
            n.setdefault("title", "")
            n.setdefault("content", "")
            n.setdefault("order", idx)
            n.setdefault("created_at", _as_str(project.get("created_at")))
            n.setdefault("updated_at", _as_str(project.get("updated_at")))


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
    _migrate_simple_core(data)
    _ensure_base_fields(data)
    return data
