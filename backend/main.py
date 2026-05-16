from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.routers import chapters, characters, foreshadows, plotlines, projects, volumes


ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"

app = FastAPI(title="Novel Assistant", description="A minimal novel writing workspace")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(volumes.router)
app.include_router(chapters.router)
app.include_router(characters.router)
app.include_router(foreshadows.router)
app.include_router(plotlines.router)

app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
