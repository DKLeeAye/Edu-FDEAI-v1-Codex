from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.artifacts import router as artifacts_router
from app.api.auth import router as auth_router
from app.api.courses import router as courses_router
from app.api.experiment_sessions import router as experiment_sessions_router
from app.api.health import router as health_router
from app.api.stage_one import router as stage_one_router
from app.api.stage_five import router as stage_five_router
from app.api.stage_four import router as stage_four_router
from app.api.stage_three import router as stage_three_router
from app.api.stage_two import router as stage_two_router
from app.api.teacher_progress import router as teacher_progress_router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(courses_router)
    app.include_router(experiment_sessions_router)
    app.include_router(artifacts_router)
    app.include_router(stage_one_router)
    app.include_router(stage_two_router)
    app.include_router(stage_three_router)
    app.include_router(stage_four_router)
    app.include_router(stage_five_router)
    app.include_router(teacher_progress_router)
    return app


app = create_app()
