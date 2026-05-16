from typing import Optional

from fastapi import APIRouter, Response
from pydantic import BaseModel

from backend import storage


router = APIRouter(prefix="/api/projects/{project_id}/foreshadows", tags=["foreshadows"])


class ForeshadowCreate(BaseModel):
    title: str
    content: str = ""


class ForeshadowUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


@router.get("")
def list_foreshadows(project_id: str):
    return storage.list_items(project_id, "foreshadows.json")


@router.post("")
def create_foreshadow(project_id: str, payload: ForeshadowCreate):
    return storage.create_item(
        project_id,
        "foreshadows.json",
        {"title": payload.title.strip() or "未命名伏笔", "content": payload.content},
    )


@router.get("/{foreshadow_id}")
def get_foreshadow(project_id: str, foreshadow_id: str):
    return storage.get_item(project_id, "foreshadows.json", foreshadow_id, "Foreshadow")


@router.put("/{foreshadow_id}")
def update_foreshadow(project_id: str, foreshadow_id: str, payload: ForeshadowUpdate):
    updates = payload.model_dump(exclude_unset=True)
    if "title" in updates and updates["title"] is not None:
        updates["title"] = updates["title"].strip() or "未命名伏笔"
    return storage.update_item(project_id, "foreshadows.json", foreshadow_id, updates, "Foreshadow")


@router.delete("/{foreshadow_id}", status_code=204)
def delete_foreshadow(project_id: str, foreshadow_id: str):
    storage.delete_item(project_id, "foreshadows.json", foreshadow_id, "Foreshadow")
    return Response(status_code=204)
