from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import LATEST_SCHEMA_VERSION, CreateProjectRequest, HealthResponse, Project, ProjectListResponse, UpdateProjectRequest
from storage import delete_project, list_projects, load_project, save_project


app = FastAPI(title="Novel Assistant API", version="0.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat()


@app.get("/api/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/api/projects", response_model=ProjectListResponse)
def get_projects() -> ProjectListResponse:
    return ProjectListResponse(projects=list_projects())


@app.post("/api/projects", response_model=Project)
def create_project(payload: CreateProjectRequest) -> Project:
    current_time = now_iso()
    project = Project(
        schema_version=LATEST_SCHEMA_VERSION,
        id=f"project_{uuid4().hex[:12]}",
        title=payload.title.strip(),
        description=payload.description.strip(),
        created_at=current_time,
        updated_at=current_time,
        positioning="",
        background="",
        characters=[],
        plot_threads=[],
        chapters=[],
        feedbacks=[],
        feedback="",
        plotlines=[],
        update_notes=[],
        feedback_notes=[],
    )
    save_project(project)
    return project


@app.get("/api/projects/{project_id}", response_model=Project)
def get_project(project_id: str) -> Project:
    project = load_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@app.put("/api/projects/{project_id}", response_model=Project)
def update_project(project_id: str, payload: UpdateProjectRequest) -> Project:
    existing = load_project(project_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Project not found")

    updated = Project(
        schema_version=LATEST_SCHEMA_VERSION,
        id=existing.id,
        title=payload.title.strip(),
        description=payload.description.strip(),
        created_at=existing.created_at,
        updated_at=now_iso(),
        positioning=payload.positioning,
        background=payload.background,
        characters=payload.characters,
        plot_threads=payload.plot_threads,
        chapters=payload.chapters,
        feedbacks=payload.feedbacks,
        feedback=payload.feedback,
        plotlines=payload.plot_threads or payload.plotlines,
        update_notes=payload.update_notes,
        feedback_notes=[item.model_dump() for item in payload.feedbacks] or payload.feedback_notes,
    )
    save_project(updated)
    return updated


@app.delete("/api/projects/{project_id}")
def remove_project(project_id: str) -> dict[str, str]:
    deleted = delete_project(project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "ok"}


@app.post("/api/projects/{project_id}/delete")
def remove_project_compat(project_id: str) -> dict[str, str]:
    deleted = delete_project(project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "ok"}


@app.post("/api/projects/{project_id}/remove")
def remove_project_compat_remove(project_id: str) -> dict[str, str]:
    deleted = delete_project(project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "ok"}
