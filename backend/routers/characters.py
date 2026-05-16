from typing import Optional

from fastapi import APIRouter, Response
from pydantic import BaseModel

from backend import storage


router = APIRouter(prefix="/api/projects/{project_id}/characters", tags=["characters"])


class CharacterCreate(BaseModel):
    name: str
    content: str = ""


class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None


@router.get("")
def list_characters(project_id: str):
    return storage.list_items(project_id, "characters.json")


@router.post("")
def create_character(project_id: str, payload: CharacterCreate):
    return storage.create_item(
        project_id,
        "characters.json",
        {"name": payload.name.strip() or "未命名人物", "content": payload.content},
    )


@router.get("/{character_id}")
def get_character(project_id: str, character_id: str):
    return storage.get_item(project_id, "characters.json", character_id, "Character")


@router.put("/{character_id}")
def update_character(project_id: str, character_id: str, payload: CharacterUpdate):
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates and updates["name"] is not None:
        updates["name"] = updates["name"].strip() or "未命名人物"
    return storage.update_item(project_id, "characters.json", character_id, updates, "Character")


@router.delete("/{character_id}", status_code=204)
def delete_character(project_id: str, character_id: str):
    storage.delete_item(project_id, "characters.json", character_id, "Character")
    return Response(status_code=204)
