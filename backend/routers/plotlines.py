from typing import Optional

from fastapi import APIRouter, Response
from pydantic import BaseModel

from backend import storage


router = APIRouter(prefix="/api/projects/{project_id}/plotlines", tags=["plotlines"])


class PlotlineCreate(BaseModel):
    title: str
    content: str = ""


class PlotlineUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


@router.get("")
def list_plotlines(project_id: str):
    return storage.list_items(project_id, "plotlines.json")


@router.post("")
def create_plotline(project_id: str, payload: PlotlineCreate):
    return storage.create_item(
        project_id,
        "plotlines.json",
        {"title": payload.title.strip() or "未命名情节线", "content": payload.content},
    )


@router.get("/{plotline_id}")
def get_plotline(project_id: str, plotline_id: str):
    return storage.get_item(project_id, "plotlines.json", plotline_id, "Plotline")


@router.put("/{plotline_id}")
def update_plotline(project_id: str, plotline_id: str, payload: PlotlineUpdate):
    updates = payload.model_dump(exclude_unset=True)
    if "title" in updates and updates["title"] is not None:
        updates["title"] = updates["title"].strip() or "未命名情节线"
    return storage.update_item(project_id, "plotlines.json", plotline_id, updates, "Plotline")


@router.delete("/{plotline_id}", status_code=204)
def delete_plotline(project_id: str, plotline_id: str):
    storage.delete_item(project_id, "plotlines.json", plotline_id, "Plotline")
    return Response(status_code=204)
