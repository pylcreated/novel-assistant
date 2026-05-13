from pydantic import BaseModel, Field


LATEST_SCHEMA_VERSION = "0.4"


class Character(BaseModel):
    id: str
    name: str = ""
    role: str = ""
    description: str = ""
    motivation: str = ""
    goal: str = ""
    current_state: str = ""
    relationship: str = ""
    notes: str = ""


class PlotThread(BaseModel):
    id: str
    type: str = ""
    title: str = ""
    description: str = ""
    status: str = "active"
    related_characters: list[str] = Field(default_factory=list)
    notes: str = ""


class Chapter(BaseModel):
    id: str
    project_id: str = ""
    title: str = ""
    content: str = ""
    order: int = 0
    created_at: str = ""
    updated_at: str = ""
    # legacy-compatible fields
    summary: str = ""
    chapter_goal: str = ""
    previous_connection: str = ""
    plot_progress: str = ""
    character_change: str = ""
    ending_hook: str = ""
    next_setup: str = ""
    unresolved_questions: list[str] = Field(default_factory=list)
    status: str = "draft"
    characters: list[str] = Field(default_factory=list)
    plotlines: list[str] = Field(default_factory=list)
    notes: str = ""


class FeedbackRecord(BaseModel):
    id: str
    source: str = ""
    scope: str = ""
    target: str = ""
    problem: str = ""
    evidence: str = ""
    decision: str = ""
    affects: list[str] = Field(default_factory=list)
    status: str = "pending"


class Note(BaseModel):
    id: str
    project_id: str = ""
    type: str = "other"
    title: str = ""
    content: str = ""
    order: int = 0
    created_at: str = ""
    updated_at: str = ""


class Project(BaseModel):
    schema_version: str = LATEST_SCHEMA_VERSION
    id: str
    title: str
    description: str = ""
    created_at: str
    updated_at: str
    positioning: str = ""
    background: str = ""
    characters: list[Character] = Field(default_factory=list)
    plot_threads: list[PlotThread] = Field(default_factory=list)
    chapters: list[Chapter] = Field(default_factory=list)
    notes: list[Note] = Field(default_factory=list)
    feedbacks: list[FeedbackRecord] = Field(default_factory=list)
    feedback: str = ""
    # v0.4 compatibility fields
    plotlines: list[PlotThread] = Field(default_factory=list)
    update_notes: list[dict] = Field(default_factory=list)
    feedback_notes: list[dict] = Field(default_factory=list)


class CreateProjectRequest(BaseModel):
    title: str = Field(min_length=1)
    description: str = ""


class UpdateProjectRequest(BaseModel):
    schema_version: str = LATEST_SCHEMA_VERSION
    title: str = Field(min_length=1)
    description: str = ""
    positioning: str = ""
    background: str = ""
    characters: list[Character] = Field(default_factory=list)
    plot_threads: list[PlotThread] = Field(default_factory=list)
    chapters: list[Chapter] = Field(default_factory=list)
    notes: list[Note] = Field(default_factory=list)
    feedbacks: list[FeedbackRecord] = Field(default_factory=list)
    feedback: str = ""
    plotlines: list[PlotThread] = Field(default_factory=list)
    update_notes: list[dict] = Field(default_factory=list)
    feedback_notes: list[dict] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str


class ProjectListResponse(BaseModel):
    projects: list[Project]


class ChapterCreateRequest(BaseModel):
    title: str = "新章节"


class ChapterUpdateRequest(BaseModel):
    title: str = ""
    content: str = ""
    order: int | None = None


class NoteCreateRequest(BaseModel):
    type: str = "other"
    title: str = "新档案"
    content: str = ""


class NoteUpdateRequest(BaseModel):
    type: str = "other"
    title: str = ""
    content: str = ""
    order: int | None = None
