from __future__ import annotations

import json
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

from fastapi import HTTPException


ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data" / "projects"
DATA_DIR.mkdir(parents=True, exist_ok=True)

_LOCK = Lock()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def make_id() -> str:
    return uuid.uuid4().hex


def project_dir(project_id: str) -> Path:
    return DATA_DIR / project_id


def project_file(project_id: str, filename: str) -> Path:
    return project_dir(project_id) / filename


def ensure_project(project_id: str) -> None:
    if not project_file(project_id, "project.json").exists():
        raise HTTPException(status_code=404, detail="Project not found")


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"Invalid JSON file: {path.name}") from exc


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(path.suffix + ".tmp")
    with temp_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\n")
    temp_path.replace(path)


def list_projects() -> list[dict[str, Any]]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    projects: list[dict[str, Any]] = []
    for folder in DATA_DIR.iterdir():
        if folder.is_dir():
            project = read_json(folder / "project.json", None)
            if project:
                projects.append(project)
    return sorted(projects, key=lambda item: item.get("updated_at", ""), reverse=True)


def create_project(title: str, description: str = "") -> dict[str, Any]:
    title = title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Project title is required")

    created_at = now_iso()
    project = {
        "id": make_id(),
        "title": title,
        "description": description.strip(),
        "created_at": created_at,
        "updated_at": created_at,
    }

    with _LOCK:
        folder = project_dir(project["id"])
        folder.mkdir(parents=True, exist_ok=False)
        write_json(folder / "project.json", project)
        for filename in [
            "volumes.json",
            "chapters.json",
            "characters.json",
            "foreshadows.json",
            "plotlines.json",
        ]:
            write_json(folder / filename, [])

    return project


def get_project(project_id: str) -> dict[str, Any]:
    ensure_project(project_id)
    return read_json(project_file(project_id, "project.json"), {})


def update_project(project_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    with _LOCK:
        project = get_project(project_id)
        if "title" in updates and updates["title"] is not None:
            title = str(updates["title"]).strip()
            if not title:
                raise HTTPException(status_code=400, detail="Project title is required")
            project["title"] = title
        if "description" in updates and updates["description"] is not None:
            project["description"] = str(updates["description"]).strip()
        project["updated_at"] = now_iso()
        write_json(project_file(project_id, "project.json"), project)
        return project


def delete_project(project_id: str) -> None:
    ensure_project(project_id)
    with _LOCK:
        shutil.rmtree(project_dir(project_id))


def read_collection(project_id: str, filename: str) -> list[dict[str, Any]]:
    ensure_project(project_id)
    data = read_json(project_file(project_id, filename), [])
    if not isinstance(data, list):
        raise HTTPException(status_code=500, detail=f"Invalid collection file: {filename}")
    return data


def write_collection(project_id: str, filename: str, items: list[dict[str, Any]]) -> None:
    ensure_project(project_id)
    write_json(project_file(project_id, filename), items)
    touch_project(project_id)


def touch_project(project_id: str) -> None:
    project = get_project(project_id)
    project["updated_at"] = now_iso()
    write_json(project_file(project_id, "project.json"), project)


def next_order(items: list[dict[str, Any]], where: dict[str, Any] | None = None) -> int:
    scoped = items
    if where:
        scoped = [item for item in items if all(item.get(key) == value for key, value in where.items())]
    return max([int(item.get("order", 0)) for item in scoped], default=0) + 1


def list_items(project_id: str, filename: str) -> list[dict[str, Any]]:
    items = read_collection(project_id, filename)
    return sorted(items, key=lambda item: (int(item.get("order", 0)), item.get("created_at", "")))


def get_item(project_id: str, filename: str, item_id: str, label: str) -> dict[str, Any]:
    for item in read_collection(project_id, filename):
        if item.get("id") == item_id:
            return item
    raise HTTPException(status_code=404, detail=f"{label} not found")


def create_item(project_id: str, filename: str, fields: dict[str, Any]) -> dict[str, Any]:
    with _LOCK:
        items = read_collection(project_id, filename)
        created_at = now_iso()
        item = {
            "id": make_id(),
            **fields,
            "created_at": created_at,
            "updated_at": created_at,
        }
        items.append(item)
        write_collection(project_id, filename, items)
        return item


def update_item(
    project_id: str,
    filename: str,
    item_id: str,
    updates: dict[str, Any],
    label: str,
) -> dict[str, Any]:
    with _LOCK:
        items = read_collection(project_id, filename)
        for index, item in enumerate(items):
            if item.get("id") == item_id:
                for key, value in updates.items():
                    if value is not None:
                        item[key] = value
                item["updated_at"] = now_iso()
                items[index] = item
                write_collection(project_id, filename, items)
                return item
    raise HTTPException(status_code=404, detail=f"{label} not found")


def delete_item(project_id: str, filename: str, item_id: str, label: str) -> None:
    with _LOCK:
        items = read_collection(project_id, filename)
        remaining = [item for item in items if item.get("id") != item_id]
        if len(remaining) == len(items):
            raise HTTPException(status_code=404, detail=f"{label} not found")
        write_collection(project_id, filename, remaining)


def delete_volume_with_chapters(project_id: str, volume_id: str) -> None:
    with _LOCK:
        volumes = read_collection(project_id, "volumes.json")
        remaining_volumes = [item for item in volumes if item.get("id") != volume_id]
        if len(remaining_volumes) == len(volumes):
            raise HTTPException(status_code=404, detail="Volume not found")
        chapters = read_collection(project_id, "chapters.json")
        remaining_chapters = [item for item in chapters if item.get("volume_id") != volume_id]
        write_json(project_file(project_id, "volumes.json"), remaining_volumes)
        write_json(project_file(project_id, "chapters.json"), remaining_chapters)
        touch_project(project_id)


def ensure_volume(project_id: str, volume_id: str) -> None:
    get_item(project_id, "volumes.json", volume_id, "Volume")
