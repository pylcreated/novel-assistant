from typing import Optional

from fastapi import APIRouter, Response
from pydantic import BaseModel

from backend import storage


router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    title: str
    description: str = ""


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


@router.get("")
def list_projects():
    return storage.list_projects()


@router.post("")
def create_project(payload: ProjectCreate):
    return storage.create_project(payload.title, payload.description)


@router.get("/{project_id}")
def get_project(project_id: str):
    return storage.get_project(project_id)


@router.put("/{project_id}")
def update_project(project_id: str, payload: ProjectUpdate):
    return storage.update_project(project_id, payload.model_dump(exclude_unset=True))


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str):
    storage.delete_project(project_id)
    return Response(status_code=204)
