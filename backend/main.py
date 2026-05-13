from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

try:
    from .models import (
        LATEST_SCHEMA_VERSION,
        Chapter,
        ChapterCreateRequest,
        ChapterUpdateRequest,
        CreateProjectRequest,
        HealthResponse,
        Note,
        NoteCreateRequest,
        NoteUpdateRequest,
        Project,
        ProjectListResponse,
        UpdateProjectRequest,
    )
    from .storage import delete_project, list_projects, load_project, save_project
except ImportError:
    from models import (
        LATEST_SCHEMA_VERSION,
        Chapter,
        ChapterCreateRequest,
        ChapterUpdateRequest,
        CreateProjectRequest,
        HealthResponse,
        Note,
        NoteCreateRequest,
        NoteUpdateRequest,
        Project,
        ProjectListResponse,
        UpdateProjectRequest,
    )
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
        notes=[],
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
        notes=payload.notes,
        feedbacks=payload.feedbacks,
        feedback=payload.feedback,
        plotlines=payload.plot_threads or payload.plotlines,
        update_notes=payload.update_notes,
        feedback_notes=[item.model_dump() for item in payload.feedbacks] or payload.feedback_notes,
    )
    save_project(updated)
    return updated


@app.get("/api/projects/{project_id}/chapters", response_model=list[Chapter])
def list_chapters(project_id: str) -> list[Chapter]:
    project = load_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return sorted(project.chapters, key=lambda x: x.order)


@app.post("/api/projects/{project_id}/chapters", response_model=Chapter)
def create_chapter(project_id: str, payload: ChapterCreateRequest) -> Chapter:
    project = load_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    now = now_iso()
    next_order = max([c.order for c in project.chapters], default=-1) + 1
    chapter = Chapter(
        id=f"chapter_{uuid4().hex[:12]}",
        project_id=project_id,
        title=payload.title.strip() or "新章节",
        content="",
        order=next_order,
        created_at=now,
        updated_at=now,
    )
    project.chapters.append(chapter)
    project.updated_at = now
    save_project(project)
    return chapter


@app.put("/api/projects/{project_id}/chapters/{chapter_id}", response_model=Chapter)
def update_chapter(project_id: str, chapter_id: str, payload: ChapterUpdateRequest) -> Chapter:
    project = load_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    chapter = next((c for c in project.chapters if c.id == chapter_id), None)
    if chapter is None:
        raise HTTPException(status_code=404, detail="Chapter not found")
    chapter.title = payload.title.strip() or chapter.title
    chapter.content = payload.content
    if payload.order is not None:
        chapter.order = payload.order
    chapter.updated_at = now_iso()
    project.updated_at = chapter.updated_at
    save_project(project)
    return chapter


@app.delete("/api/projects/{project_id}/chapters/{chapter_id}")
def remove_chapter(project_id: str, chapter_id: str) -> dict[str, str]:
    project = load_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    before = len(project.chapters)
    project.chapters = [c for c in project.chapters if c.id != chapter_id]
    if len(project.chapters) == before:
        raise HTTPException(status_code=404, detail="Chapter not found")
    project.updated_at = now_iso()
    save_project(project)
    return {"status": "ok"}


@app.get("/api/projects/{project_id}/notes", response_model=list[Note])
def list_notes(project_id: str, type: str | None = None) -> list[Note]:
    project = load_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    notes = sorted(project.notes, key=lambda x: x.order)
    if type:
        notes = [n for n in notes if n.type == type]
    return notes


@app.post("/api/projects/{project_id}/notes", response_model=Note)
def create_note(project_id: str, payload: NoteCreateRequest) -> Note:
    project = load_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    now = now_iso()
    next_order = max([n.order for n in project.notes], default=-1) + 1
    note = Note(
        id=f"note_{uuid4().hex[:12]}",
        project_id=project_id,
        type=payload.type,
        title=payload.title.strip() or "新档案",
        content=payload.content,
        order=next_order,
        created_at=now,
        updated_at=now,
    )
    project.notes.append(note)
    project.updated_at = now
    save_project(project)
    return note


@app.put("/api/projects/{project_id}/notes/{note_id}", response_model=Note)
def update_note(project_id: str, note_id: str, payload: NoteUpdateRequest) -> Note:
    project = load_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    note = next((n for n in project.notes if n.id == note_id), None)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    note.type = payload.type or note.type
    note.title = payload.title.strip() or note.title
    note.content = payload.content
    if payload.order is not None:
        note.order = payload.order
    note.updated_at = now_iso()
    project.updated_at = note.updated_at
    save_project(project)
    return note


@app.delete("/api/projects/{project_id}/notes/{note_id}")
def remove_note(project_id: str, note_id: str) -> dict[str, str]:
    project = load_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    before = len(project.notes)
    project.notes = [n for n in project.notes if n.id != note_id]
    if len(project.notes) == before:
        raise HTTPException(status_code=404, detail="Note not found")
    project.updated_at = now_iso()
    save_project(project)
    return {"status": "ok"}


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
