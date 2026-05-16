from typing import Optional

from fastapi import APIRouter, Response
from pydantic import BaseModel

from backend import storage


router = APIRouter(prefix="/api/projects/{project_id}/chapters", tags=["chapters"])


class ChapterCreate(BaseModel):
    volume_id: str
    title: str
    content: str = ""
    order: Optional[int] = None


class ChapterUpdate(BaseModel):
    volume_id: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    order: Optional[int] = None


@router.get("")
def list_chapters(project_id: str):
    return storage.list_items(project_id, "chapters.json")


@router.post("")
def create_chapter(project_id: str, payload: ChapterCreate):
    storage.ensure_volume(project_id, payload.volume_id)
    title = payload.title.strip() or "未命名章节"
    chapters = storage.read_collection(project_id, "chapters.json")
    order = payload.order
    if order is None:
        order = storage.next_order(chapters, {"volume_id": payload.volume_id})
    return storage.create_item(
        project_id,
        "chapters.json",
        {
            "volume_id": payload.volume_id,
            "title": title,
            "content": payload.content,
            "order": order,
        },
    )


@router.get("/{chapter_id}")
def get_chapter(project_id: str, chapter_id: str):
    return storage.get_item(project_id, "chapters.json", chapter_id, "Chapter")


@router.put("/{chapter_id}")
def update_chapter(project_id: str, chapter_id: str, payload: ChapterUpdate):
    updates = payload.model_dump(exclude_unset=True)
    if "volume_id" in updates and updates["volume_id"] is not None:
        storage.ensure_volume(project_id, updates["volume_id"])
    if "title" in updates and updates["title"] is not None:
        updates["title"] = updates["title"].strip() or "未命名章节"
    return storage.update_item(project_id, "chapters.json", chapter_id, updates, "Chapter")


@router.delete("/{chapter_id}", status_code=204)
def delete_chapter(project_id: str, chapter_id: str):
    storage.delete_item(project_id, "chapters.json", chapter_id, "Chapter")
    return Response(status_code=204)
