from __future__ import annotations

import csv
import io
import uuid
import zipfile
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any
from xml.sax.saxutils import escape

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Artifact, Course, CourseMember, ExperimentSession, Rubric, StageRecord
from app.models.enums import ArtifactStatus, RubricStatus, UserRole
from app.schemas.teacher_progress import (
    TeacherArtifactSummaryResponse,
    TeacherCourseProgressResponse,
    TeacherGradeDraftRequest,
    TeacherGradeExportResponse,
    TeacherGradeExportRow,
    TeacherGradePublicationRequest,
    TeacherRubricDraftRequest,
    TeacherRubricResponse,
    TeacherReviewConfirmationRequest,
    TeacherSessionProgressResponse,
    TeacherStageProgressResponse,
    TeacherStudentSummary,
)
from app.services.auth import CurrentUserContext
from app.services.errors import ConflictError, PermissionDeniedError, ResourceNotFoundError


TEACHER_AI_REVIEW_CONFIRMATION_ARTIFACT_TYPE = "teacher_ai_review_confirmation"
TEACHER_GRADE_DRAFT_ARTIFACT_TYPE = "teacher_grade_draft"
TEACHER_GRADE_PUBLICATION_ARTIFACT_TYPE = "teacher_grade_publication"
TEACHER_GRADE_STAGE_KEY = "stage_5"


def list_teacher_course_progress(
    session: Session,
    *,
    current_user: CurrentUserContext,
) -> list[TeacherCourseProgressResponse]:
    _ensure_teacher(current_user)

    courses = list(
        session.scalars(
            select(Course)
            .join(CourseMember, CourseMember.course_id == Course.id)
            .where(
                Course.tenant_id == current_user.tenant_id,
                Course.institution_id == current_user.institution_id,
                CourseMember.tenant_id == current_user.tenant_id,
                CourseMember.institution_id == current_user.institution_id,
                CourseMember.user_id == current_user.id,
                CourseMember.role == "teacher",
                CourseMember.is_active.is_(True),
            )
            .order_by(Course.created_at.desc(), Course.id)
        )
    )
    if not courses:
        return []

    course_ids = [course.id for course in courses]
    experiment_sessions = list(
        session.scalars(
            select(ExperimentSession)
            .options(
                selectinload(ExperimentSession.student),
                selectinload(ExperimentSession.stage_records),
            )
            .where(
                ExperimentSession.tenant_id == current_user.tenant_id,
                ExperimentSession.institution_id == current_user.institution_id,
                ExperimentSession.course_id.in_(course_ids),
            )
            .order_by(ExperimentSession.updated_at.desc(), ExperimentSession.id)
        )
    )
    session_ids = [experiment_session.id for experiment_session in experiment_sessions]
    artifact_counts, artifact_updated_at = _load_artifact_rollups(
        session,
        current_user=current_user,
        session_ids=session_ids,
    )

    sessions_by_course: dict[uuid.UUID, list[ExperimentSession]] = defaultdict(list)
    for experiment_session in experiment_sessions:
        sessions_by_course[experiment_session.course_id].append(experiment_session)

    return [
        TeacherCourseProgressResponse(
            id=course.id,
            tenant_id=course.tenant_id,
            institution_id=course.institution_id,
            package_version_id=course.package_version_id,
            created_by_user_id=course.created_by_user_id,
            title=course.title,
            code=course.code,
            status=course.status,
            sessions=[
                _build_session_progress(
                    experiment_session,
                    artifact_counts=artifact_counts,
                    artifact_updated_at=artifact_updated_at,
                )
                for experiment_session in sessions_by_course[course.id]
            ],
        )
        for course in courses
    ]


def list_teacher_stage_artifact_summaries(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> list[TeacherArtifactSummaryResponse]:
    _ensure_teacher(current_user)

    stage_record = session.scalar(
        select(StageRecord)
        .join(ExperimentSession, StageRecord.session_id == ExperimentSession.id)
        .join(Course, StageRecord.course_id == Course.id)
        .join(CourseMember, CourseMember.course_id == Course.id)
        .where(
            StageRecord.session_id == session_id,
            StageRecord.stage_key == stage_key,
            StageRecord.tenant_id == current_user.tenant_id,
            StageRecord.institution_id == current_user.institution_id,
            ExperimentSession.tenant_id == current_user.tenant_id,
            ExperimentSession.institution_id == current_user.institution_id,
            Course.tenant_id == current_user.tenant_id,
            Course.institution_id == current_user.institution_id,
            CourseMember.tenant_id == current_user.tenant_id,
            CourseMember.institution_id == current_user.institution_id,
            CourseMember.user_id == current_user.id,
            CourseMember.role == "teacher",
            CourseMember.is_active.is_(True),
        )
    )
    if stage_record is None:
        raise ResourceNotFoundError("Experiment session stage not found")

    artifacts = list(
        session.scalars(
            select(Artifact)
            .where(
                Artifact.tenant_id == current_user.tenant_id,
                Artifact.institution_id == current_user.institution_id,
                Artifact.course_id == stage_record.course_id,
                Artifact.session_id == stage_record.session_id,
                Artifact.stage_record_id == stage_record.id,
                Artifact.stage_key == stage_record.stage_key,
            )
            .order_by(Artifact.created_at.desc(), Artifact.id)
        )
    )
    return [TeacherArtifactSummaryResponse.model_validate(artifact) for artifact in artifacts]


def confirm_ai_review(
    session: Session,
    *,
    current_user: CurrentUserContext,
    review_artifact_id: uuid.UUID,
    payload: TeacherReviewConfirmationRequest,
) -> TeacherArtifactSummaryResponse:
    _ensure_teacher(current_user)

    review_artifact = _get_teacher_accessible_review_artifact(
        session,
        current_user=current_user,
        review_artifact_id=review_artifact_id,
    )
    if "review" not in review_artifact.artifact_type:
        raise ConflictError("Artifact is not an AI review artifact")

    now = datetime.now(UTC)
    review_content = dict(review_artifact.content_json)
    ai_score = _extract_score(review_content)
    teacher_score = payload.teacher_score if payload.teacher_score is not None else ai_score
    confirmation_content = {
        "source_review_artifact_id": str(review_artifact.id),
        "source_review_artifact_type": review_artifact.artifact_type,
        "decision": payload.decision,
        "ai_score": ai_score,
        "teacher_score": teacher_score,
        "override_reason": payload.override_reason.strip() if payload.override_reason else None,
        "comment": payload.comment.strip() if payload.comment else None,
        "rubric": review_content.get("rubric"),
        "evidence_artifact_ids": review_content.get("evidence_artifact_ids") or [],
        "ai_gateway": review_content.get("ai_gateway"),
        "original_review": {
            "title": review_artifact.title,
            "review_summary": review_content.get("review_summary"),
            "content_json": review_content,
        },
        "teacher": {
            "id": str(current_user.id),
            "role": current_user.role.value,
        },
        "confirmed_at": now.isoformat(),
    }

    confirmation_artifact = Artifact(
        tenant_id=review_artifact.tenant_id,
        institution_id=review_artifact.institution_id,
        course_id=review_artifact.course_id,
        session_id=review_artifact.session_id,
        stage_record_id=review_artifact.stage_record_id,
        stage_key=review_artifact.stage_key,
        submitted_by_user_id=current_user.id,
        artifact_type=TEACHER_AI_REVIEW_CONFIRMATION_ARTIFACT_TYPE,
        title=f"教师确认：{review_artifact.title}",
        content_json=confirmation_content,
        version=1,
        status=ArtifactStatus.REVIEWED,
        submitted_at=now,
        reviewed_at=now,
    )
    session.add(confirmation_artifact)
    session.flush()

    review_artifact.status = ArtifactStatus.ACCEPTED
    review_artifact.reviewed_at = now
    review_artifact.content_json = {
        **review_content,
        "teacher_confirmation": {
            "confirmation_artifact_id": str(confirmation_artifact.id),
            "decision": payload.decision,
            "teacher_score": teacher_score,
            "override_reason": payload.override_reason.strip() if payload.override_reason else None,
            "comment": payload.comment.strip() if payload.comment else None,
            "confirmed_by_user_id": str(current_user.id),
            "confirmed_at": now.isoformat(),
        },
    }

    session.commit()
    session.refresh(confirmation_artifact)
    return TeacherArtifactSummaryResponse.model_validate(confirmation_artifact)


def save_grade_draft(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    payload: TeacherGradeDraftRequest,
) -> TeacherArtifactSummaryResponse:
    _ensure_teacher(current_user)
    stage_record = _get_teacher_accessible_stage_record(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=TEACHER_GRADE_STAGE_KEY,
    )

    now = datetime.now(UTC)
    latest_version = session.scalar(
        select(func.max(Artifact.version)).where(
            Artifact.tenant_id == current_user.tenant_id,
            Artifact.institution_id == current_user.institution_id,
            Artifact.course_id == stage_record.course_id,
            Artifact.session_id == stage_record.session_id,
            Artifact.stage_record_id == stage_record.id,
            Artifact.stage_key == stage_record.stage_key,
            Artifact.artifact_type == TEACHER_GRADE_DRAFT_ARTIFACT_TYPE,
        )
    )
    content = {
        "overall_score": payload.overall_score,
        "rubric_scores": [
            rubric_score.model_dump(mode="json", exclude_none=True)
            for rubric_score in payload.rubric_scores
        ],
        "comment": payload.comment.strip() if payload.comment else None,
        "evidence_artifact_ids": [str(artifact_id) for artifact_id in payload.evidence_artifact_ids],
        "is_published": False,
        "teacher": {
            "id": str(current_user.id),
            "role": current_user.role.value,
        },
        "drafted_at": now.isoformat(),
    }
    draft_artifact = Artifact(
        tenant_id=stage_record.tenant_id,
        institution_id=stage_record.institution_id,
        course_id=stage_record.course_id,
        session_id=stage_record.session_id,
        stage_record_id=stage_record.id,
        stage_key=stage_record.stage_key,
        submitted_by_user_id=current_user.id,
        artifact_type=TEACHER_GRADE_DRAFT_ARTIFACT_TYPE,
        title="教师成绩草稿",
        content_json=content,
        version=(latest_version or 0) + 1,
        status=ArtifactStatus.DRAFT,
        submitted_at=now,
    )
    session.add(draft_artifact)
    session.commit()
    session.refresh(draft_artifact)
    return TeacherArtifactSummaryResponse.model_validate(draft_artifact)


def publish_grade(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    payload: TeacherGradePublicationRequest,
) -> TeacherArtifactSummaryResponse:
    _ensure_teacher(current_user)
    stage_record = _get_teacher_accessible_stage_record(
        session,
        current_user=current_user,
        session_id=session_id,
        stage_key=TEACHER_GRADE_STAGE_KEY,
    )
    draft_artifact = session.scalar(
        select(Artifact).where(
            Artifact.id == payload.draft_artifact_id,
            Artifact.tenant_id == current_user.tenant_id,
            Artifact.institution_id == current_user.institution_id,
            Artifact.course_id == stage_record.course_id,
            Artifact.session_id == stage_record.session_id,
            Artifact.stage_record_id == stage_record.id,
            Artifact.stage_key == stage_record.stage_key,
            Artifact.artifact_type == TEACHER_GRADE_DRAFT_ARTIFACT_TYPE,
        )
    )
    if draft_artifact is None:
        raise ResourceNotFoundError("Teacher grade draft not found")

    now = datetime.now(UTC)
    draft_content = dict(draft_artifact.content_json)
    published_score = _extract_score({"score": draft_content.get("overall_score")})
    publication_content = {
        "draft_artifact_id": str(draft_artifact.id),
        "published_score": published_score,
        "rubric_scores": draft_content.get("rubric_scores") or [],
        "comment": draft_content.get("comment"),
        "evidence_artifact_ids": draft_content.get("evidence_artifact_ids") or [],
        "publication_note": payload.publication_note.strip() if payload.publication_note else None,
        "teacher": {
            "id": str(current_user.id),
            "role": current_user.role.value,
        },
        "published_at": now.isoformat(),
    }
    publication_artifact = Artifact(
        tenant_id=draft_artifact.tenant_id,
        institution_id=draft_artifact.institution_id,
        course_id=draft_artifact.course_id,
        session_id=draft_artifact.session_id,
        stage_record_id=draft_artifact.stage_record_id,
        stage_key=draft_artifact.stage_key,
        submitted_by_user_id=current_user.id,
        artifact_type=TEACHER_GRADE_PUBLICATION_ARTIFACT_TYPE,
        title="教师正式成绩发布",
        content_json=publication_content,
        version=1,
        status=ArtifactStatus.ACCEPTED,
        submitted_at=now,
        reviewed_at=now,
    )
    session.add(publication_artifact)
    draft_artifact.status = ArtifactStatus.REVIEWED
    draft_artifact.reviewed_at = now
    draft_artifact.content_json = {
        **draft_content,
        "is_published": True,
        "publication_artifact_id": str(publication_artifact.id),
        "published_at": now.isoformat(),
    }
    session.commit()
    session.refresh(publication_artifact)
    return TeacherArtifactSummaryResponse.model_validate(publication_artifact)


def export_course_grades(
    session: Session,
    *,
    current_user: CurrentUserContext,
    course_id: uuid.UUID,
) -> TeacherGradeExportResponse:
    _ensure_teacher(current_user)
    course = _get_teacher_accessible_course(
        session,
        current_user=current_user,
        course_id=course_id,
    )
    experiment_sessions = list(
        session.scalars(
            select(ExperimentSession)
            .options(selectinload(ExperimentSession.student))
            .where(
                ExperimentSession.tenant_id == current_user.tenant_id,
                ExperimentSession.institution_id == current_user.institution_id,
                ExperimentSession.course_id == course.id,
            )
            .order_by(ExperimentSession.created_at.asc(), ExperimentSession.id)
        )
    )
    session_ids = [experiment_session.id for experiment_session in experiment_sessions]
    artifacts_by_session = _load_latest_grade_artifacts(
        session,
        current_user=current_user,
        course_id=course.id,
        session_ids=session_ids,
    )
    rows: list[TeacherGradeExportRow] = []
    for experiment_session in experiment_sessions:
        latest_draft = artifacts_by_session.get(
            (experiment_session.id, TEACHER_GRADE_DRAFT_ARTIFACT_TYPE)
        )
        latest_publication = artifacts_by_session.get(
            (experiment_session.id, TEACHER_GRADE_PUBLICATION_ARTIFACT_TYPE)
        )
        if latest_publication is not None:
            publication_content = latest_publication.content_json
            grade_status = "published"
            published_score = _extract_score(
                {"score": publication_content.get("published_score")}
            )
            published_at = latest_publication.reviewed_at or latest_publication.submitted_at
            comment = publication_content.get("comment")
            draft_artifact_id = _uuid_or_none(publication_content.get("draft_artifact_id"))
            publication_artifact_id = latest_publication.id
        elif latest_draft is not None:
            draft_content = latest_draft.content_json
            grade_status = "draft"
            published_score = None
            published_at = None
            comment = draft_content.get("comment")
            draft_artifact_id = latest_draft.id
            publication_artifact_id = None
        else:
            grade_status = "missing"
            published_score = None
            published_at = None
            comment = None
            draft_artifact_id = None
            publication_artifact_id = None

        rows.append(
            TeacherGradeExportRow(
                session_id=experiment_session.id,
                student=TeacherStudentSummary(
                    id=experiment_session.student.id,
                    email=experiment_session.student.email,
                    full_name=experiment_session.student.full_name,
                ),
                grade_status=grade_status,
                published_score=published_score,
                draft_artifact_id=draft_artifact_id,
                publication_artifact_id=publication_artifact_id,
                published_at=published_at,
                comment=comment,
            )
        )

    return TeacherGradeExportResponse(
        course_id=course.id,
        course_title=course.title,
        generated_at=datetime.now(UTC),
        rows=rows,
    )


def export_course_grades_csv(
    session: Session,
    *,
    current_user: CurrentUserContext,
    course_id: uuid.UUID,
) -> tuple[str, str]:
    grade_export = export_course_grades(
        session,
        current_user=current_user,
        course_id=course_id,
    )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "学生姓名",
            "学生邮箱",
            "Session ID",
            "成绩状态",
            "发布分数",
            "草稿 Artifact ID",
            "发布 Artifact ID",
            "发布时间",
            "教师评语",
        ]
    )
    for row in grade_export.rows:
        writer.writerow(
            [
                row.student.full_name,
                row.student.email,
                str(row.session_id),
                row.grade_status,
                "" if row.published_score is None else row.published_score,
                "" if row.draft_artifact_id is None else str(row.draft_artifact_id),
                ""
                if row.publication_artifact_id is None
                else str(row.publication_artifact_id),
                "" if row.published_at is None else row.published_at.isoformat(),
                row.comment or "",
            ]
        )

    filename = f"course-{grade_export.course_id}-grade-export.csv"
    return filename, "\ufeff" + output.getvalue()


def export_course_grades_xlsx(
    session: Session,
    *,
    current_user: CurrentUserContext,
    course_id: uuid.UUID,
) -> tuple[str, bytes]:
    grade_export = export_course_grades(
        session,
        current_user=current_user,
        course_id=course_id,
    )
    rows: list[list[str | int | None]] = [
        [
            "学生姓名",
            "学生邮箱",
            "Session ID",
            "成绩状态",
            "发布分数",
            "草稿 Artifact ID",
            "发布 Artifact ID",
            "发布时间",
            "教师评语",
        ]
    ]
    for row in grade_export.rows:
        rows.append(
            [
                row.student.full_name,
                row.student.email,
                str(row.session_id),
                row.grade_status,
                row.published_score,
                None if row.draft_artifact_id is None else str(row.draft_artifact_id),
                None
                if row.publication_artifact_id is None
                else str(row.publication_artifact_id),
                None if row.published_at is None else row.published_at.isoformat(),
                row.comment or "",
            ]
        )

    workbook_bytes = _build_xlsx_workbook(
        sheet_name="课程成绩",
        rows=rows,
        generated_at=grade_export.generated_at,
        title=f"{grade_export.course_title} 成绩导出",
    )
    filename = f"course-{grade_export.course_id}-grade-export.xlsx"
    return filename, workbook_bytes


def list_course_rubrics(
    session: Session,
    *,
    current_user: CurrentUserContext,
    course_id: uuid.UUID,
) -> list[TeacherRubricResponse]:
    _ensure_teacher(current_user)
    course = _get_teacher_accessible_course(
        session,
        current_user=current_user,
        course_id=course_id,
    )
    rubrics = list(
        session.scalars(
            select(Rubric).where(
                Rubric.package_version_id == course.package_version_id,
                Rubric.status == RubricStatus.PUBLISHED,
                (Rubric.course_id == course.id) | Rubric.course_id.is_(None),
            )
        )
    )
    latest_by_stage_and_scope: dict[tuple[str, str], Rubric] = {}
    for rubric in rubrics:
        scope = "course" if rubric.course_id == course.id else "package"
        key = (rubric.stage_key, scope)
        existing = latest_by_stage_and_scope.get(key)
        if existing is None or rubric.version > existing.version:
            latest_by_stage_and_scope[key] = rubric

    stage_keys = sorted({stage_key for stage_key, _ in latest_by_stage_and_scope})
    responses: list[TeacherRubricResponse] = []
    for stage_key in stage_keys:
        rubric = latest_by_stage_and_scope.get(
            (stage_key, "course")
        ) or latest_by_stage_and_scope.get((stage_key, "package"))
        if rubric is None:
            continue
        responses.append(
            TeacherRubricResponse(
                id=rubric.id,
                package_version_id=rubric.package_version_id,
                course_id=rubric.course_id,
                stage_key=rubric.stage_key,
                name=rubric.name,
                version=rubric.version,
                total_score=rubric.total_score,
                status=rubric.status.value,
                rubric_json=rubric.rubric_json,
                scope="course" if rubric.course_id == course.id else "package",
                created_at=rubric.created_at,
                updated_at=rubric.updated_at,
            )
        )
    return responses


def save_course_rubric_draft(
    session: Session,
    *,
    current_user: CurrentUserContext,
    course_id: uuid.UUID,
    stage_key: str,
    payload: TeacherRubricDraftRequest,
) -> TeacherRubricResponse:
    _ensure_teacher(current_user)
    course = _get_teacher_accessible_course(
        session,
        current_user=current_user,
        course_id=course_id,
    )
    latest_version = session.scalar(
        select(func.max(Rubric.version)).where(
            Rubric.package_version_id == course.package_version_id,
            Rubric.course_id == course.id,
            Rubric.stage_key == stage_key,
        )
    )
    rubric = Rubric(
        tenant_id=course.tenant_id,
        institution_id=course.institution_id,
        course_id=course.id,
        package_version_id=course.package_version_id,
        stage_key=stage_key,
        name=payload.name.strip(),
        version=(latest_version or 0) + 1,
        total_score=payload.total_score,
        status=RubricStatus.DRAFT,
        rubric_json={
            **payload.rubric_json,
            "stage_key": payload.rubric_json.get("stage_key") or stage_key,
        },
    )
    session.add(rubric)
    session.commit()
    session.refresh(rubric)
    return _build_teacher_rubric_response(rubric, course=course)


def publish_course_rubric(
    session: Session,
    *,
    current_user: CurrentUserContext,
    course_id: uuid.UUID,
    rubric_id: uuid.UUID,
) -> TeacherRubricResponse:
    _ensure_teacher(current_user)
    course = _get_teacher_accessible_course(
        session,
        current_user=current_user,
        course_id=course_id,
    )
    rubric = session.scalar(
        select(Rubric).where(
            Rubric.id == rubric_id,
            Rubric.package_version_id == course.package_version_id,
            Rubric.course_id == course.id,
        )
    )
    if rubric is None:
        raise ResourceNotFoundError("Course rubric not found")

    published_rubrics = list(
        session.scalars(
            select(Rubric).where(
                Rubric.package_version_id == course.package_version_id,
                Rubric.course_id == course.id,
                Rubric.stage_key == rubric.stage_key,
                Rubric.status == RubricStatus.PUBLISHED,
                Rubric.id != rubric.id,
            )
        )
    )
    for published_rubric in published_rubrics:
        published_rubric.status = RubricStatus.ARCHIVED
    rubric.status = RubricStatus.PUBLISHED
    session.commit()
    session.refresh(rubric)
    return _build_teacher_rubric_response(rubric, course=course)


def _get_teacher_accessible_review_artifact(
    session: Session,
    *,
    current_user: CurrentUserContext,
    review_artifact_id: uuid.UUID,
) -> Artifact:
    artifact = session.scalar(
        select(Artifact)
        .join(ExperimentSession, Artifact.session_id == ExperimentSession.id)
        .join(Course, Artifact.course_id == Course.id)
        .join(CourseMember, CourseMember.course_id == Course.id)
        .where(
            Artifact.id == review_artifact_id,
            Artifact.tenant_id == current_user.tenant_id,
            Artifact.institution_id == current_user.institution_id,
            ExperimentSession.tenant_id == current_user.tenant_id,
            ExperimentSession.institution_id == current_user.institution_id,
            Course.tenant_id == current_user.tenant_id,
            Course.institution_id == current_user.institution_id,
            CourseMember.tenant_id == current_user.tenant_id,
            CourseMember.institution_id == current_user.institution_id,
            CourseMember.user_id == current_user.id,
            CourseMember.role == "teacher",
            CourseMember.is_active.is_(True),
        )
    )
    if artifact is None:
        raise ResourceNotFoundError("AI review artifact not found")
    return artifact


def _build_teacher_rubric_response(rubric: Rubric, *, course: Course) -> TeacherRubricResponse:
    return TeacherRubricResponse(
        id=rubric.id,
        package_version_id=rubric.package_version_id,
        course_id=rubric.course_id,
        stage_key=rubric.stage_key,
        name=rubric.name,
        version=rubric.version,
        total_score=rubric.total_score,
        status=rubric.status.value,
        rubric_json=rubric.rubric_json,
        scope="course" if rubric.course_id == course.id else "package",
        created_at=rubric.created_at,
        updated_at=rubric.updated_at,
    )


def _get_teacher_accessible_stage_record(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_id: uuid.UUID,
    stage_key: str,
) -> StageRecord:
    stage_record = session.scalar(
        select(StageRecord)
        .join(ExperimentSession, StageRecord.session_id == ExperimentSession.id)
        .join(Course, StageRecord.course_id == Course.id)
        .join(CourseMember, CourseMember.course_id == Course.id)
        .where(
            StageRecord.session_id == session_id,
            StageRecord.stage_key == stage_key,
            StageRecord.tenant_id == current_user.tenant_id,
            StageRecord.institution_id == current_user.institution_id,
            ExperimentSession.tenant_id == current_user.tenant_id,
            ExperimentSession.institution_id == current_user.institution_id,
            Course.tenant_id == current_user.tenant_id,
            Course.institution_id == current_user.institution_id,
            CourseMember.tenant_id == current_user.tenant_id,
            CourseMember.institution_id == current_user.institution_id,
            CourseMember.user_id == current_user.id,
            CourseMember.role == "teacher",
            CourseMember.is_active.is_(True),
        )
    )
    if stage_record is None:
        raise ResourceNotFoundError("Experiment session stage not found")
    return stage_record


def _get_teacher_accessible_course(
    session: Session,
    *,
    current_user: CurrentUserContext,
    course_id: uuid.UUID,
) -> Course:
    course = session.scalar(
        select(Course)
        .join(CourseMember, CourseMember.course_id == Course.id)
        .where(
            Course.id == course_id,
            Course.tenant_id == current_user.tenant_id,
            Course.institution_id == current_user.institution_id,
            CourseMember.tenant_id == current_user.tenant_id,
            CourseMember.institution_id == current_user.institution_id,
            CourseMember.user_id == current_user.id,
            CourseMember.role == "teacher",
            CourseMember.is_active.is_(True),
        )
    )
    if course is None:
        raise ResourceNotFoundError("Course not found")
    return course


def _load_latest_grade_artifacts(
    session: Session,
    *,
    current_user: CurrentUserContext,
    course_id: uuid.UUID,
    session_ids: list[uuid.UUID],
) -> dict[tuple[uuid.UUID, str], Artifact]:
    if not session_ids:
        return {}

    artifacts = list(
        session.scalars(
            select(Artifact)
            .where(
                Artifact.tenant_id == current_user.tenant_id,
                Artifact.institution_id == current_user.institution_id,
                Artifact.course_id == course_id,
                Artifact.session_id.in_(session_ids),
                Artifact.stage_key == TEACHER_GRADE_STAGE_KEY,
                Artifact.artifact_type.in_(
                    [
                        TEACHER_GRADE_DRAFT_ARTIFACT_TYPE,
                        TEACHER_GRADE_PUBLICATION_ARTIFACT_TYPE,
                    ]
                ),
            )
            .order_by(Artifact.created_at.desc(), Artifact.id.desc())
        )
    )
    latest: dict[tuple[uuid.UUID, str], Artifact] = {}
    for artifact in artifacts:
        latest.setdefault((artifact.session_id, artifact.artifact_type), artifact)
    return latest


def _load_artifact_rollups(
    session: Session,
    *,
    current_user: CurrentUserContext,
    session_ids: list[uuid.UUID],
) -> tuple[dict[tuple[uuid.UUID, str], int], dict[uuid.UUID, datetime]]:
    if not session_ids:
        return {}, {}

    artifact_counts: dict[tuple[uuid.UUID, str], int] = {}
    artifact_updated_at: dict[uuid.UUID, datetime] = {}
    rows = session.execute(
        select(
            Artifact.session_id,
            Artifact.stage_key,
            func.count(Artifact.id),
            func.max(Artifact.updated_at),
        )
        .where(
            Artifact.tenant_id == current_user.tenant_id,
            Artifact.institution_id == current_user.institution_id,
            Artifact.session_id.in_(session_ids),
        )
        .group_by(Artifact.session_id, Artifact.stage_key)
    )
    for session_id, stage_key, count, last_artifact_updated_at in rows:
        artifact_counts[(session_id, stage_key)] = int(count)
        if last_artifact_updated_at is not None:
            current_latest = artifact_updated_at.get(session_id)
            if current_latest is None or last_artifact_updated_at > current_latest:
                artifact_updated_at[session_id] = last_artifact_updated_at

    return artifact_counts, artifact_updated_at


def _build_xlsx_workbook(
    *,
    sheet_name: str,
    rows: list[list[str | int | None]],
    generated_at: datetime,
    title: str,
) -> bytes:
    workbook = io.BytesIO()
    sheet_xml = _build_xlsx_sheet(rows)
    with zipfile.ZipFile(workbook, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", _xlsx_content_types())
        archive.writestr("_rels/.rels", _xlsx_root_relationships())
        archive.writestr("docProps/app.xml", _xlsx_app_properties())
        archive.writestr(
            "docProps/core.xml",
            _xlsx_core_properties(title=title, generated_at=generated_at),
        )
        archive.writestr("xl/workbook.xml", _xlsx_workbook_xml(sheet_name=sheet_name))
        archive.writestr("xl/_rels/workbook.xml.rels", _xlsx_workbook_relationships())
        archive.writestr("xl/styles.xml", _xlsx_styles())
        archive.writestr("xl/worksheets/sheet1.xml", sheet_xml)
    return workbook.getvalue()


def _build_xlsx_sheet(rows: list[list[str | int | None]]) -> str:
    row_xml: list[str] = []
    for row_index, row in enumerate(rows, start=1):
        cells: list[str] = []
        for column_index, value in enumerate(row, start=1):
            reference = f"{_xlsx_column_name(column_index)}{row_index}"
            style = ' s="1"' if row_index == 1 else ""
            if isinstance(value, int):
                cells.append(f'<c r="{reference}"{style}><v>{value}</v></c>')
            else:
                text = "" if value is None else escape(str(value))
                cells.append(
                    f'<c r="{reference}" t="inlineStr"{style}><is><t>{text}</t></is></c>'
                )
        row_xml.append(f'<row r="{row_index}">{"".join(cells)}</row>')
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" '
        'activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
        '<cols>'
        '<col min="1" max="1" width="16" customWidth="1"/>'
        '<col min="2" max="2" width="28" customWidth="1"/>'
        '<col min="3" max="3" width="38" customWidth="1"/>'
        '<col min="4" max="5" width="12" customWidth="1"/>'
        '<col min="6" max="8" width="38" customWidth="1"/>'
        '<col min="9" max="9" width="42" customWidth="1"/>'
        '</cols>'
        f'<sheetData>{"".join(row_xml)}</sheetData>'
        '</worksheet>'
    )


def _xlsx_column_name(index: int) -> str:
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


def _xlsx_content_types() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
        '</Types>'
    )


def _xlsx_root_relationships() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
        '</Relationships>'
    )


def _xlsx_workbook_xml(*, sheet_name: str) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheets>'
        f'<sheet name="{escape(sheet_name)}" sheetId="1" r:id="rId1"/>'
        '</sheets>'
        '</workbook>'
    )


def _xlsx_workbook_relationships() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        '</Relationships>'
    )


def _xlsx_styles() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
        '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9EAF7"/><bgColor indexed="64"/></patternFill></fill></fills>'
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>'
        '</styleSheet>'
    )


def _xlsx_app_properties() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" '
        'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
        '<Application>EduFDE</Application>'
        '</Properties>'
    )


def _xlsx_core_properties(*, title: str, generated_at: datetime) -> str:
    timestamp = escape(generated_at.isoformat())
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/" '
        'xmlns:dcterms="http://purl.org/dc/terms/" '
        'xmlns:dcmitype="http://purl.org/dc/dcmitype/" '
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
        f'<dc:title>{escape(title)}</dc:title>'
        '<dc:creator>EduFDE</dc:creator>'
        f'<dcterms:created xsi:type="dcterms:W3CDTF">{timestamp}</dcterms:created>'
        f'<dcterms:modified xsi:type="dcterms:W3CDTF">{timestamp}</dcterms:modified>'
        '</cp:coreProperties>'
    )


def _extract_score(content: dict[str, Any]) -> int | None:
    for key in ("ai_score", "score", "total_score"):
        value = content.get(key)
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return round(value)
        if isinstance(value, str) and value.strip().isdigit():
            return int(value.strip())
    return None


def _uuid_or_none(value: Any) -> uuid.UUID | None:
    if isinstance(value, uuid.UUID):
        return value
    if isinstance(value, str):
        try:
            return uuid.UUID(value)
        except ValueError:
            return None
    return None


def _build_session_progress(
    experiment_session: ExperimentSession,
    *,
    artifact_counts: dict[tuple[uuid.UUID, str], int],
    artifact_updated_at: dict[uuid.UUID, datetime],
) -> TeacherSessionProgressResponse:
    stage_records = sorted(
        experiment_session.stage_records,
        key=lambda stage_record: (stage_record.stage_order, stage_record.stage_key),
    )
    stage_progress = [
        TeacherStageProgressResponse(
            id=stage_record.id,
            course_id=stage_record.course_id,
            session_id=stage_record.session_id,
            stage_key=stage_record.stage_key,
            stage_order=stage_record.stage_order,
            status=stage_record.status,
            artifact_count=artifact_counts.get(
                (experiment_session.id, stage_record.stage_key),
                0,
            ),
            updated_at=stage_record.updated_at,
        )
        for stage_record in stage_records
    ]
    updated_at_values = [
        experiment_session.updated_at,
        *(stage_record.updated_at for stage_record in stage_records),
    ]
    last_artifact_updated_at = artifact_updated_at.get(experiment_session.id)
    if last_artifact_updated_at is not None:
        updated_at_values.append(last_artifact_updated_at)

    return TeacherSessionProgressResponse(
        id=experiment_session.id,
        course_id=experiment_session.course_id,
        student=TeacherStudentSummary(
            id=experiment_session.student.id,
            email=experiment_session.student.email,
            full_name=experiment_session.student.full_name,
        ),
        status=experiment_session.status,
        stage_records=stage_progress,
        artifact_total_count=sum(stage.artifact_count for stage in stage_progress),
        updated_at=max(updated_at_values),
    )


def _ensure_teacher(current_user: CurrentUserContext) -> None:
    if current_user.role != UserRole.TEACHER:
        raise PermissionDeniedError("Only teachers can access teacher progress")
