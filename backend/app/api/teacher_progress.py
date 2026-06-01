from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_session
from app.schemas.teacher_progress import (
    TeacherArtifactSummaryResponse,
    TeacherCourseProgressResponse,
    TeacherGradeDraftRequest,
    TeacherGradeExportResponse,
    TeacherGradePublicationRequest,
    TeacherRubricDraftRequest,
    TeacherRubricResponse,
    TeacherReviewConfirmationRequest,
)
from app.services import teacher_progress as teacher_progress_service
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError

router = APIRouter(prefix=f"{settings.api_v1_prefix}/teacher/progress", tags=["teacher-progress"])


@router.get("/courses", response_model=list[TeacherCourseProgressResponse])
def list_teacher_course_progress(
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> list[TeacherCourseProgressResponse]:
    try:
        return teacher_progress_service.list_teacher_course_progress(
            db_session,
            current_user=current_user,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get(
    "/sessions/{session_id}/stages/{stage_key}/artifacts",
    response_model=list[TeacherArtifactSummaryResponse],
)
def list_teacher_stage_artifact_summaries(
    session_id: uuid.UUID,
    stage_key: str,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> list[TeacherArtifactSummaryResponse]:
    try:
        return teacher_progress_service.list_teacher_stage_artifact_summaries(
            db_session,
            current_user=current_user,
            session_id=session_id,
            stage_key=stage_key,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/artifacts/{artifact_id}/review-confirmation",
    response_model=TeacherArtifactSummaryResponse,
    status_code=status.HTTP_201_CREATED,
)
def confirm_teacher_ai_review(
    artifact_id: uuid.UUID,
    payload: TeacherReviewConfirmationRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> TeacherArtifactSummaryResponse:
    try:
        return teacher_progress_service.confirm_ai_review(
            db_session,
            current_user=current_user,
            review_artifact_id=artifact_id,
            payload=payload,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post(
    "/sessions/{session_id}/grade-draft",
    response_model=TeacherArtifactSummaryResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_teacher_grade_draft(
    session_id: uuid.UUID,
    payload: TeacherGradeDraftRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> TeacherArtifactSummaryResponse:
    try:
        return teacher_progress_service.save_grade_draft(
            db_session,
            current_user=current_user,
            session_id=session_id,
            payload=payload,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/sessions/{session_id}/grade-publication",
    response_model=TeacherArtifactSummaryResponse,
    status_code=status.HTTP_201_CREATED,
)
def publish_teacher_grade(
    session_id: uuid.UUID,
    payload: TeacherGradePublicationRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> TeacherArtifactSummaryResponse:
    try:
        return teacher_progress_service.publish_grade(
            db_session,
            current_user=current_user,
            session_id=session_id,
            payload=payload,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get(
    "/courses/{course_id}/grade-export",
    response_model=TeacherGradeExportResponse,
)
def export_teacher_course_grades(
    course_id: uuid.UUID,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> TeacherGradeExportResponse:
    try:
        return teacher_progress_service.export_course_grades(
            db_session,
            current_user=current_user,
            course_id=course_id,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/courses/{course_id}/grade-export.csv")
def export_teacher_course_grades_csv(
    course_id: uuid.UUID,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> Response:
    try:
        filename, csv_text = teacher_progress_service.export_course_grades_csv(
            db_session,
            current_user=current_user,
            course_id=course_id,
        )
        return Response(
            content=csv_text,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/courses/{course_id}/grade-export.xlsx")
def export_teacher_course_grades_xlsx(
    course_id: uuid.UUID,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> Response:
    try:
        filename, workbook_bytes = teacher_progress_service.export_course_grades_xlsx(
            db_session,
            current_user=current_user,
            course_id=course_id,
        )
        return Response(
            content=workbook_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get(
    "/courses/{course_id}/rubrics",
    response_model=list[TeacherRubricResponse],
)
def list_teacher_course_rubrics(
    course_id: uuid.UUID,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> list[TeacherRubricResponse]:
    try:
        return teacher_progress_service.list_course_rubrics(
            db_session,
            current_user=current_user,
            course_id=course_id,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/courses/{course_id}/rubrics/{stage_key}/draft",
    response_model=TeacherRubricResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_teacher_course_rubric_draft(
    course_id: uuid.UUID,
    stage_key: str,
    payload: TeacherRubricDraftRequest,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> TeacherRubricResponse:
    try:
        return teacher_progress_service.save_course_rubric_draft(
            db_session,
            current_user=current_user,
            course_id=course_id,
            stage_key=stage_key,
            payload=payload,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/courses/{course_id}/rubrics/{rubric_id}/publish",
    response_model=TeacherRubricResponse,
)
def publish_teacher_course_rubric(
    course_id: uuid.UUID,
    rubric_id: uuid.UUID,
    db_session: Session = Depends(get_session),
    current_user: CurrentUserContext = Depends(get_current_user),
) -> TeacherRubricResponse:
    try:
        return teacher_progress_service.publish_course_rubric(
            db_session,
            current_user=current_user,
            course_id=course_id,
            rubric_id=rubric_id,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
