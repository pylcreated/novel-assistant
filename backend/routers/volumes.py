from typing import Optional

from fastapi import APIRouter, Response
from pydantic import BaseModel

from backend import storage


router = APIRouter(prefix="/api/projects/{project_id}/volumes", tags=["volumes"])


class VolumeCreate(BaseModel):
    title: str
    order: Optional[int] = None


class VolumeUpdate(BaseModel):
    title: Optional[str] = None
    order: Optional[int] = None


@router.get("")
def list_volumes(project_id: str):
    return storage.list_items(project_id, "volumes.json")


@router.post("")
def create_volume(project_id: str, payload: VolumeCreate):
    title = payload.title.strip()
    if not title:
        title = "未命名分卷"
    order = payload.order
    if order is None:
        order = storage.next_order(storage.read_collection(project_id, "volumes.json"))
    return storage.create_item(project_id, "volumes.json", {"title": title, "order": order})


@router.put("/{volume_id}")
def update_volume(project_id: str, volume_id: str, payload: VolumeUpdate):
    updates = payload.model_dump(exclude_unset=True)
    if "title" in updates and updates["title"] is not None:
        updates["title"] = updates["title"].strip() or "未命名分卷"
    return storage.update_item(project_id, "volumes.json", volume_id, updates, "Volume")


@router.delete("/{volume_id}", status_code=204)
def delete_volume(project_id: str, volume_id: str):
    storage.delete_volume_with_chapters(project_id, volume_id)
    return Response(status_code=204)
