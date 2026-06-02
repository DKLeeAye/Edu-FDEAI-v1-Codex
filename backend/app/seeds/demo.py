from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import (
    Artifact,
    Course,
    CourseMember,
    DeploymentInstance,
    ExperimentSession,
    ExperimentPackage,
    ExperimentPackageVersion,
    Institution,
    LicenseEntitlement,
    OperationsAccessGrant,
    Rubric,
    StageBlueprint,
    StageRecord,
    Tenant,
    User,
)
from app.models.enums import (
    ArtifactStatus,
    CourseStatus,
    PackageStatus,
    PackageType,
    RubricStatus,
    SessionStatus,
    StageStatus,
    UserRole,
)

DEFAULT_TENANT_SLUG = "default"
DEFAULT_INSTITUTION_CODE = "DEMO"
MANUFACTURING_QA_PACKAGE_SLUG = "manufacturing-qa-agent"
MANUFACTURING_QA_PACKAGE_VERSION = "1.0.0"
MANUFACTURING_QA_DEMO_COURSE_CODE = "MFG-QA-DEMO"
OPEN_DESIGN_VNEXT_STAGE_ONE_QA_COURSE_CODE = "MFG-QA-VNEXT-STAGE1"
OPEN_DESIGN_VNEXT_STAGE_ONE_QA_STUDENT_EMAIL = "wang@edufde.demo"
OPEN_DESIGN_VNEXT_STAGE_TWO_GUIDE_QA_COURSE_CODE = "MFG-QA-VNEXT-STAGE2-GUIDE"
OPEN_DESIGN_VNEXT_STAGE_TWO_GUIDE_QA_STUDENT_EMAIL = "zhao@edufde.demo"
OPEN_DESIGN_VNEXT_QA_COURSE_CODE = "MFG-QA-VNEXT-QA"
OPEN_DESIGN_VNEXT_QA_STUDENT_EMAIL = "lin@edufde.demo"
OPEN_DESIGN_VNEXT_LATE_QA_COURSE_CODE = "MFG-QA-VNEXT-LATE"
OPEN_DESIGN_VNEXT_LATE_QA_STUDENT_EMAIL = "chen@edufde.demo"
DEMO_PASSWORD = "EduFDE-demo-123"


@dataclass(frozen=True)
class DemoSeedResult:
    tenant: Tenant
    institution: Institution
    admin: User
    teacher: User
    student: User
    student2: User
    package: ExperimentPackage
    package_version: ExperimentPackageVersion
    demo_course: Course


STAGE_BLUEPRINTS: tuple[dict[str, object], ...] = (
    {
        "stage_key": "stage_1",
        "stage_order": 1,
        "title": "需求访谈与问题发现",
        "description": "通过 AI 客户访谈识别真实业务问题、约束和未确认信息。",
        "outputs": ["访谈记录", "需求假设", "未确认问题"],
    },
    {
        "stage_key": "stage_2",
        "stage_order": 2,
        "title": "方案定义与可行性判断",
        "description": "形成需求文档、可行性判断和总体技术方案。",
        "outputs": ["需求文档", "可行性报告", "总体技术方案"],
    },
    {
        "stage_key": "stage_3",
        "stage_order": 3,
        "title": "知识工程决策",
        "description": "判断智能体需要怎样的知识基础，并记录关键风险。",
        "outputs": ["知识工程决策文档", "风险预判"],
    },
    {
        "stage_key": "stage_4",
        "stage_order": 4,
        "title": "智能体实现与测试",
        "description": "基于 Dify 路径构建可运行智能体并完成基础测试。",
        "outputs": ["Dify 智能体", "设计说明", "测试结果"],
    },
    {
        "stage_key": "stage_5",
        "stage_order": 5,
        "title": "交付验收与运维说明",
        "description": "完成面向客户的交付文档、验收记录和维护说明。",
        "outputs": ["交付文档", "验收记录", "维护说明"],
    },
)


def seed_demo_data(session: Session) -> DemoSeedResult:
    tenant = _get_or_create_tenant(session)
    institution = _get_or_create_institution(session, tenant)
    admin = _get_or_create_user(
        session,
        tenant=tenant,
        institution=institution,
        email="admin@edufde.demo",
        full_name="EduFDE Admin",
        role=UserRole.ADMIN,
    )
    teacher = _get_or_create_user(
        session,
        tenant=tenant,
        institution=institution,
        email="teacher@edufde.demo",
        full_name="演示教师",
        role=UserRole.TEACHER,
    )
    student = _get_or_create_user(
        session,
        tenant=tenant,
        institution=institution,
        email="student@edufde.demo",
        full_name="演示学生",
        role=UserRole.STUDENT,
    )
    student2 = _get_or_create_user(
        session,
        tenant=tenant,
        institution=institution,
        email="student2@edufde.demo",
        full_name="演示学生 2",
        role=UserRole.STUDENT,
    )
    package = _get_or_create_package(session)
    package_version = _get_or_create_package_version(session, package)
    _ensure_stage_blueprints(session, package_version)
    _ensure_rubrics(session, package_version)
    demo_course = _get_or_create_demo_course(
        session,
        tenant=tenant,
        institution=institution,
        teacher=teacher,
        package_version=package_version,
    )
    _ensure_course_member(session, course=demo_course, user=student, role="student")
    _ensure_course_member(session, course=demo_course, user=student2, role="student")
    _ensure_admin_operations_records(
        session,
        tenant=tenant,
        institution=institution,
        admin=admin,
    )
    session.commit()
    return DemoSeedResult(
        tenant=tenant,
        institution=institution,
        admin=admin,
        teacher=teacher,
        student=student,
        student2=student2,
        package=package,
        package_version=package_version,
        demo_course=demo_course,
    )


def seed_open_design_vnext_qa_data(session: Session) -> DemoSeedResult:
    result = seed_demo_data(session)
    visual_student = _get_or_create_user(
        session,
        tenant=result.tenant,
        institution=result.institution,
        email=OPEN_DESIGN_VNEXT_QA_STUDENT_EMAIL,
        full_name="林同学",
        role=UserRole.STUDENT,
    )
    visual_course = _get_or_create_open_design_vnext_qa_course(
        session,
        tenant=result.tenant,
        institution=result.institution,
        teacher=result.teacher,
        package_version=result.package_version,
    )
    _ensure_course_member(session, course=visual_course, user=visual_student, role="student")
    visual_session = _get_or_create_open_design_vnext_qa_session(
        session,
        course=visual_course,
        student=visual_student,
        package_version=result.package_version,
    )
    stage_records = _ensure_open_design_vnext_qa_stage_records(
        session,
        experiment_session=visual_session,
    )
    _replace_open_design_vnext_qa_artifacts(
        session,
        experiment_session=visual_session,
        stage_records=stage_records,
        teacher=result.teacher,
    )
    session.commit()
    return DemoSeedResult(
        tenant=result.tenant,
        institution=result.institution,
        admin=result.admin,
        teacher=result.teacher,
        student=visual_student,
        student2=result.student2,
        package=result.package,
        package_version=result.package_version,
        demo_course=visual_course,
    )


def seed_open_design_vnext_stage_one_qa_data(session: Session) -> DemoSeedResult:
    result = seed_demo_data(session)
    visual_student = _get_or_create_user(
        session,
        tenant=result.tenant,
        institution=result.institution,
        email=OPEN_DESIGN_VNEXT_STAGE_ONE_QA_STUDENT_EMAIL,
        full_name="王同学",
        role=UserRole.STUDENT,
    )
    visual_course = _get_or_create_visual_qa_course(
        session,
        tenant=result.tenant,
        institution=result.institution,
        teacher=result.teacher,
        package_version=result.package_version,
        code=OPEN_DESIGN_VNEXT_STAGE_ONE_QA_COURSE_CODE,
        title="制造业质检 AI 访谈导学实训",
    )
    _ensure_course_member(session, course=visual_course, user=visual_student, role="student")
    visual_session = _get_or_create_open_design_vnext_qa_session(
        session,
        course=visual_course,
        student=visual_student,
        package_version=result.package_version,
    )
    _ensure_open_design_vnext_stage_one_qa_stage_records(
        session,
        experiment_session=visual_session,
    )
    session.execute(delete(Artifact).where(Artifact.session_id == visual_session.id))
    session.commit()
    return DemoSeedResult(
        tenant=result.tenant,
        institution=result.institution,
        admin=result.admin,
        teacher=result.teacher,
        student=visual_student,
        student2=result.student2,
        package=result.package,
        package_version=result.package_version,
        demo_course=visual_course,
    )


def seed_open_design_vnext_stage_two_guide_qa_data(session: Session) -> DemoSeedResult:
    result = seed_demo_data(session)
    visual_student = _get_or_create_user(
        session,
        tenant=result.tenant,
        institution=result.institution,
        email=OPEN_DESIGN_VNEXT_STAGE_TWO_GUIDE_QA_STUDENT_EMAIL,
        full_name="赵同学",
        role=UserRole.STUDENT,
    )
    visual_course = _get_or_create_visual_qa_course(
        session,
        tenant=result.tenant,
        institution=result.institution,
        teacher=result.teacher,
        package_version=result.package_version,
        code=OPEN_DESIGN_VNEXT_STAGE_TWO_GUIDE_QA_COURSE_CODE,
        title="制造业质检 AI 方案导学实训",
    )
    _ensure_course_member(session, course=visual_course, user=visual_student, role="student")
    visual_session = _get_or_create_open_design_vnext_qa_session(
        session,
        course=visual_course,
        student=visual_student,
        package_version=result.package_version,
    )
    _ensure_open_design_vnext_stage_two_guide_qa_stage_records(
        session,
        experiment_session=visual_session,
    )
    session.execute(delete(Artifact).where(Artifact.session_id == visual_session.id))
    session.commit()
    return DemoSeedResult(
        tenant=result.tenant,
        institution=result.institution,
        admin=result.admin,
        teacher=result.teacher,
        student=visual_student,
        student2=result.student2,
        package=result.package,
        package_version=result.package_version,
        demo_course=visual_course,
    )


def seed_open_design_vnext_late_qa_data(session: Session) -> DemoSeedResult:
    result = seed_demo_data(session)
    visual_student = _get_or_create_user(
        session,
        tenant=result.tenant,
        institution=result.institution,
        email=OPEN_DESIGN_VNEXT_LATE_QA_STUDENT_EMAIL,
        full_name="陈同学",
        role=UserRole.STUDENT,
    )
    visual_course = _get_or_create_visual_qa_course(
        session,
        tenant=result.tenant,
        institution=result.institution,
        teacher=result.teacher,
        package_version=result.package_version,
        code=OPEN_DESIGN_VNEXT_LATE_QA_COURSE_CODE,
        title="制造业质检 AI 交付验收实训",
    )
    _ensure_course_member(session, course=visual_course, user=visual_student, role="student")
    visual_session = _get_or_create_open_design_vnext_qa_session(
        session,
        course=visual_course,
        student=visual_student,
        package_version=result.package_version,
    )
    stage_records = _ensure_open_design_vnext_late_qa_stage_records(
        session,
        experiment_session=visual_session,
    )
    _replace_open_design_vnext_late_qa_artifacts(
        session,
        experiment_session=visual_session,
        stage_records=stage_records,
        teacher=result.teacher,
    )
    session.commit()
    return DemoSeedResult(
        tenant=result.tenant,
        institution=result.institution,
        admin=result.admin,
        teacher=result.teacher,
        student=visual_student,
        student2=result.student2,
        package=result.package,
        package_version=result.package_version,
        demo_course=visual_course,
    )


def _get_or_create_tenant(session: Session) -> Tenant:
    tenant = session.scalar(select(Tenant).where(Tenant.slug == DEFAULT_TENANT_SLUG))
    if tenant is not None:
        return tenant
    tenant = Tenant(name="EduFDE 默认租户", slug=DEFAULT_TENANT_SLUG)
    session.add(tenant)
    session.flush()
    return tenant


def _get_or_create_institution(session: Session, tenant: Tenant) -> Institution:
    institution = session.scalar(
        select(Institution).where(
            Institution.tenant_id == tenant.id,
            Institution.code == DEFAULT_INSTITUTION_CODE,
        )
    )
    if institution is not None:
        return institution
    institution = Institution(
        tenant_id=tenant.id,
        name="EduFDE 演示学院",
        code=DEFAULT_INSTITUTION_CODE,
    )
    session.add(institution)
    session.flush()
    return institution


def _get_or_create_user(
    session: Session,
    *,
    tenant: Tenant,
    institution: Institution,
    email: str,
    full_name: str,
    role: UserRole,
) -> User:
    user = session.scalar(select(User).where(User.email == email))
    if user is not None:
        user.tenant_id = tenant.id
        user.institution_id = institution.id
        user.full_name = full_name
        user.role = role
        user.is_active = True
        user.password_hash = hash_password(DEMO_PASSWORD)
        session.flush()
        return user
    user = User(
        tenant_id=tenant.id,
        institution_id=institution.id,
        email=email,
        full_name=full_name,
        role=role,
        is_active=True,
        password_hash=hash_password(DEMO_PASSWORD),
    )
    session.add(user)
    session.flush()
    return user


def _get_or_create_package(session: Session) -> ExperimentPackage:
    package = session.scalar(
        select(ExperimentPackage).where(ExperimentPackage.slug == MANUFACTURING_QA_PACKAGE_SLUG)
    )
    if package is not None:
        return package
    package = ExperimentPackage(
        tenant_id=None,
        institution_id=None,
        slug=MANUFACTURING_QA_PACKAGE_SLUG,
        name="制造业质检 AI 智能体实验包",
        package_type=PackageType.STANDARD,
        description="面向汽车零部件工厂质检数字化场景的五阶段 AI 智能体项目实训包。",
    )
    session.add(package)
    session.flush()
    return package


def _get_or_create_package_version(
    session: Session,
    package: ExperimentPackage,
) -> ExperimentPackageVersion:
    package_version = session.scalar(
        select(ExperimentPackageVersion).where(
            ExperimentPackageVersion.package_id == package.id,
            ExperimentPackageVersion.version == MANUFACTURING_QA_PACKAGE_VERSION,
        )
    )
    manifest = _manufacturing_manifest()
    if package_version is not None:
        package_version.title = "制造业质检 AI 智能体实验包 v1"
        package_version.status = PackageStatus.PUBLISHED
        package_version.content_manifest_json = manifest
        if package_version.published_at is None:
            package_version.published_at = datetime.now(UTC)
        session.flush()
        return package_version

    package_version = ExperimentPackageVersion(
        tenant_id=None,
        institution_id=None,
        package_id=package.id,
        version=MANUFACTURING_QA_PACKAGE_VERSION,
        title="制造业质检 AI 智能体实验包 v1",
        status=PackageStatus.PUBLISHED,
        content_manifest_json=manifest,
        published_at=datetime.now(UTC),
    )
    session.add(package_version)
    session.flush()
    return package_version


def _ensure_stage_blueprints(
    session: Session,
    package_version: ExperimentPackageVersion,
) -> None:
    existing_by_key = {
        stage.stage_key: stage
        for stage in session.scalars(
            select(StageBlueprint).where(StageBlueprint.package_version_id == package_version.id)
        )
    }
    for stage in STAGE_BLUEPRINTS:
        stage_key = str(stage["stage_key"])
        blueprint_json = {"outputs": stage["outputs"], "mvp_scope": True}
        if stage_key in existing_by_key:
            existing = existing_by_key[stage_key]
            existing.stage_order = int(stage["stage_order"])
            existing.title = str(stage["title"])
            existing.description = str(stage["description"])
            existing.blueprint_json = blueprint_json
            continue
        session.add(
            StageBlueprint(
                tenant_id=None,
                institution_id=None,
                package_version_id=package_version.id,
                stage_key=stage_key,
                stage_order=int(stage["stage_order"]),
                title=str(stage["title"]),
                description=str(stage["description"]),
                blueprint_json=blueprint_json,
            )
        )
    session.flush()


def _ensure_rubrics(session: Session, package_version: ExperimentPackageVersion) -> None:
    existing_by_stage = {
        rubric.stage_key: rubric
        for rubric in session.scalars(
            select(Rubric).where(
                Rubric.package_version_id == package_version.id,
                Rubric.course_id.is_(None),
                Rubric.version == 1,
            )
        )
    }
    for stage in STAGE_BLUEPRINTS:
        stage_key = str(stage["stage_key"])
        rubric_json = _rubric_json(stage_key)
        if stage_key in existing_by_stage:
            existing = existing_by_stage[stage_key]
            existing.name = f"{stage['title']}最小 Rubric"
            existing.status = RubricStatus.PUBLISHED
            existing.rubric_json = rubric_json
            continue
        session.add(
            Rubric(
                tenant_id=None,
                institution_id=None,
                course_id=None,
                package_version_id=package_version.id,
                stage_key=stage_key,
                name=f"{stage['title']}最小 Rubric",
                version=1,
                total_score=100,
                status=RubricStatus.PUBLISHED,
                rubric_json=rubric_json,
            )
        )
    session.flush()


def _get_or_create_demo_course(
    session: Session,
    *,
    tenant: Tenant,
    institution: Institution,
    teacher: User,
    package_version: ExperimentPackageVersion,
) -> Course:
    course = session.scalar(
        select(Course).where(
            Course.institution_id == institution.id,
            Course.code == MANUFACTURING_QA_DEMO_COURSE_CODE,
        )
    )
    if course is not None:
        course.tenant_id = tenant.id
        course.institution_id = institution.id
        course.package_version_id = package_version.id
        course.created_by_user_id = teacher.id
        course.title = "制造业质检 AI 项目实训"
        course.status = CourseStatus.ACTIVE
        session.flush()
        _ensure_course_teacher_member(session, course=course, teacher=teacher)
        return course

    course = Course(
        tenant_id=tenant.id,
        institution_id=institution.id,
        package_version_id=package_version.id,
        created_by_user_id=teacher.id,
        title="制造业质检 AI 项目实训",
        code=MANUFACTURING_QA_DEMO_COURSE_CODE,
        status=CourseStatus.ACTIVE,
    )
    session.add(course)
    session.flush()
    _ensure_course_teacher_member(session, course=course, teacher=teacher)
    return course


def _ensure_admin_operations_records(
    session: Session,
    *,
    tenant: Tenant,
    institution: Institution,
    admin: User,
) -> None:
    deployment = session.scalar(
        select(DeploymentInstance).where(
            DeploymentInstance.tenant_id == tenant.id,
            DeploymentInstance.institution_id == institution.id,
            DeploymentInstance.environment == "local",
        )
    )
    if deployment is None:
        deployment = DeploymentInstance(
            tenant_id=tenant.id,
            institution_id=institution.id,
            name=f"{institution.name} EduFDE 本地演示实例",
            environment="local",
            deployment_type="single_tenant_demo",
            isolation_strategy="tenant_id + institution_id service scope",
            model_strategy="AI Gateway provider policy",
            status="running",
            metadata_json={"seed": "demo", "readiness": "first_slice"},
        )
        session.add(deployment)
        session.flush()
    else:
        deployment.name = f"{institution.name} EduFDE 本地演示实例"
        deployment.status = "running"
        deployment.isolation_strategy = "tenant_id + institution_id service scope"
        deployment.model_strategy = "AI Gateway provider policy"
        deployment.metadata_json = {"seed": "demo", "readiness": "first_slice"}

    for key, label, limit_value, unit in [
        ("active_users", "活跃用户席位", 200, "人"),
        ("courses", "课程运行数量", 20, "门"),
        ("ai_calls", "AI Gateway 调用", 100000, "次"),
    ]:
        entitlement = session.scalar(
            select(LicenseEntitlement).where(
                LicenseEntitlement.tenant_id == tenant.id,
                LicenseEntitlement.institution_id == institution.id,
                LicenseEntitlement.entitlement_key == key,
            )
        )
        if entitlement is None:
            session.add(
                LicenseEntitlement(
                    tenant_id=tenant.id,
                    institution_id=institution.id,
                    entitlement_key=key,
                    label=label,
                    limit_value=limit_value,
                    unit=unit,
                    status="active",
                    metadata_json={"seed": "demo"},
                )
            )
        else:
            entitlement.label = label
            entitlement.limit_value = limit_value
            entitlement.unit = unit
            entitlement.status = "active"

    grant = session.scalar(
        select(OperationsAccessGrant).where(
            OperationsAccessGrant.tenant_id == tenant.id,
            OperationsAccessGrant.institution_id == institution.id,
            OperationsAccessGrant.deployment_instance_id == deployment.id,
            OperationsAccessGrant.status == "active",
        )
    )
    if grant is None:
        session.add(
            OperationsAccessGrant(
                tenant_id=tenant.id,
                institution_id=institution.id,
                deployment_instance_id=deployment.id,
                requested_by_user_id=admin.id,
                granted_to_user_id=admin.id,
                status="active",
                reason="Demo scope operations overview access",
                scope_json={
                    "read_aggregate_only": True,
                    "allow_student_payload_access": False,
                    "allowed_exports": ["gradebook", "artifact_archive", "ai_audit_log", "rubric_library"],
                },
            )
        )
    else:
        grant.reason = "Demo scope operations overview access"
        grant.scope_json = {
            "read_aggregate_only": True,
            "allow_student_payload_access": False,
            "allowed_exports": ["gradebook", "artifact_archive", "ai_audit_log", "rubric_library"],
        }
    session.flush()


def _get_or_create_open_design_vnext_qa_course(
    session: Session,
    *,
    tenant: Tenant,
    institution: Institution,
    teacher: User,
    package_version: ExperimentPackageVersion,
) -> Course:
    return _get_or_create_visual_qa_course(
        session,
        tenant=tenant,
        institution=institution,
        teacher=teacher,
        package_version=package_version,
        code=OPEN_DESIGN_VNEXT_QA_COURSE_CODE,
        title="制造业质检 AI 客户访谈实训",
    )


def _get_or_create_visual_qa_course(
    session: Session,
    *,
    tenant: Tenant,
    institution: Institution,
    teacher: User,
    package_version: ExperimentPackageVersion,
    code: str,
    title: str,
) -> Course:
    course = session.scalar(
        select(Course).where(
            Course.institution_id == institution.id,
            Course.code == code,
        )
    )
    if course is None:
        course = Course(
            tenant_id=tenant.id,
            institution_id=institution.id,
            package_version_id=package_version.id,
            created_by_user_id=teacher.id,
            title=title,
            code=code,
            status=CourseStatus.ACTIVE,
        )
        session.add(course)
    else:
        course.tenant_id = tenant.id
        course.institution_id = institution.id
        course.package_version_id = package_version.id
        course.created_by_user_id = teacher.id
        course.title = title
        course.status = CourseStatus.ACTIVE
    session.flush()
    _ensure_course_teacher_member(session, course=course, teacher=teacher)
    return course


def _ensure_course_teacher_member(session: Session, *, course: Course, teacher: User) -> CourseMember:
    return _ensure_course_member(session, course=course, user=teacher, role="teacher")


def _ensure_course_member(session: Session, *, course: Course, user: User, role: str) -> CourseMember:
    member = session.scalar(
        select(CourseMember).where(
            CourseMember.course_id == course.id,
            CourseMember.user_id == user.id,
        )
    )
    if member is None:
        member = CourseMember(
            tenant_id=course.tenant_id,
            institution_id=course.institution_id,
            course_id=course.id,
            user_id=user.id,
            role=role,
            is_active=True,
        )
        session.add(member)
    else:
        member.tenant_id = course.tenant_id
        member.institution_id = course.institution_id
        member.role = role
        member.is_active = True
    session.flush()
    return member


def _get_or_create_open_design_vnext_qa_session(
    session: Session,
    *,
    course: Course,
    student: User,
    package_version: ExperimentPackageVersion,
) -> ExperimentSession:
    experiment_session = session.scalar(
        select(ExperimentSession).where(
            ExperimentSession.course_id == course.id,
            ExperimentSession.student_user_id == student.id,
        )
    )
    if experiment_session is None:
        experiment_session = ExperimentSession(
            tenant_id=course.tenant_id,
            institution_id=course.institution_id,
            course_id=course.id,
            student_user_id=student.id,
            package_version_id=package_version.id,
            status=SessionStatus.IN_PROGRESS,
            started_at=datetime.now(UTC),
        )
        session.add(experiment_session)
    else:
        experiment_session.tenant_id = course.tenant_id
        experiment_session.institution_id = course.institution_id
        experiment_session.package_version_id = package_version.id
        experiment_session.status = SessionStatus.IN_PROGRESS
        if experiment_session.started_at is None:
            experiment_session.started_at = datetime.now(UTC)
        experiment_session.completed_at = None
    session.flush()
    return experiment_session


def _ensure_open_design_vnext_qa_stage_records(
    session: Session,
    *,
    experiment_session: ExperimentSession,
) -> dict[str, StageRecord]:
    return _ensure_visual_qa_stage_records(
        session,
        experiment_session=experiment_session,
        status_by_stage={
            "stage_1": StageStatus.COMPLETED,
            "stage_2": StageStatus.COMPLETED,
            "stage_3": StageStatus.IN_PRACTICE,
            "stage_4": StageStatus.LOCKED,
            "stage_5": StageStatus.LOCKED,
        },
    )


def _ensure_open_design_vnext_stage_one_qa_stage_records(
    session: Session,
    *,
    experiment_session: ExperimentSession,
) -> dict[str, StageRecord]:
    return _ensure_visual_qa_stage_records(
        session,
        experiment_session=experiment_session,
        status_by_stage={
            "stage_1": StageStatus.IN_PRACTICE,
            "stage_2": StageStatus.LOCKED,
            "stage_3": StageStatus.LOCKED,
            "stage_4": StageStatus.LOCKED,
            "stage_5": StageStatus.LOCKED,
        },
    )


def _ensure_open_design_vnext_stage_two_guide_qa_stage_records(
    session: Session,
    *,
    experiment_session: ExperimentSession,
) -> dict[str, StageRecord]:
    return _ensure_visual_qa_stage_records(
        session,
        experiment_session=experiment_session,
        status_by_stage={
            "stage_1": StageStatus.COMPLETED,
            "stage_2": StageStatus.IN_PRACTICE,
            "stage_3": StageStatus.LOCKED,
            "stage_4": StageStatus.LOCKED,
            "stage_5": StageStatus.LOCKED,
        },
    )


def _ensure_open_design_vnext_late_qa_stage_records(
    session: Session,
    *,
    experiment_session: ExperimentSession,
) -> dict[str, StageRecord]:
    return _ensure_visual_qa_stage_records(
        session,
        experiment_session=experiment_session,
        status_by_stage={
            "stage_1": StageStatus.COMPLETED,
            "stage_2": StageStatus.COMPLETED,
            "stage_3": StageStatus.COMPLETED,
            "stage_4": StageStatus.IN_PRACTICE,
            "stage_5": StageStatus.NOT_STARTED,
        },
    )


def _ensure_visual_qa_stage_records(
    session: Session,
    *,
    experiment_session: ExperimentSession,
    status_by_stage: dict[str, StageStatus],
) -> dict[str, StageRecord]:
    existing_by_key = {
        stage.stage_key: stage
        for stage in session.scalars(
            select(StageRecord).where(StageRecord.session_id == experiment_session.id)
        )
    }
    records: dict[str, StageRecord] = {}
    now = datetime.now(UTC)
    for stage in STAGE_BLUEPRINTS:
        stage_key = str(stage["stage_key"])
        status = status_by_stage[stage_key]
        stage_record = existing_by_key.get(stage_key)
        if stage_record is None:
            stage_record = StageRecord(
                tenant_id=experiment_session.tenant_id,
                institution_id=experiment_session.institution_id,
                course_id=experiment_session.course_id,
                session_id=experiment_session.id,
                stage_key=stage_key,
                stage_order=int(stage["stage_order"]),
                status=status,
            )
            session.add(stage_record)
        stage_record.tenant_id = experiment_session.tenant_id
        stage_record.institution_id = experiment_session.institution_id
        stage_record.course_id = experiment_session.course_id
        stage_record.stage_order = int(stage["stage_order"])
        stage_record.status = status
        stage_record.started_at = now if status != StageStatus.LOCKED else None
        stage_record.submitted_at = now if status == StageStatus.COMPLETED else None
        stage_record.completed_at = now if status == StageStatus.COMPLETED else None
        records[stage_key] = stage_record
    session.flush()
    return records


def _replace_open_design_vnext_qa_artifacts(
    session: Session,
    *,
    experiment_session: ExperimentSession,
    stage_records: dict[str, StageRecord],
    teacher: User,
) -> None:
    session.execute(delete(Artifact).where(Artifact.session_id == experiment_session.id))
    for spec in _open_design_vnext_qa_artifact_specs(teacher):
        stage_record = stage_records[str(spec["stage_key"])]
        status = spec.get("status", ArtifactStatus.SUBMITTED)
        artifact = Artifact(
            tenant_id=experiment_session.tenant_id,
            institution_id=experiment_session.institution_id,
            course_id=experiment_session.course_id,
            session_id=experiment_session.id,
            stage_record_id=stage_record.id,
            stage_key=stage_record.stage_key,
            submitted_by_user_id=experiment_session.student_user_id,
            artifact_type=str(spec["artifact_type"]),
            title=str(spec["title"]),
            content_json=dict(spec["content_json"]),
            version=1,
            status=status,
            submitted_at=datetime.now(UTC)
            if status in {ArtifactStatus.SUBMITTED, ArtifactStatus.REVIEWED, ArtifactStatus.ACCEPTED}
            else None,
            reviewed_at=datetime.now(UTC)
            if status in {ArtifactStatus.REVIEWED, ArtifactStatus.ACCEPTED}
            else None,
        )
        session.add(artifact)
    session.flush()


def _replace_open_design_vnext_late_qa_artifacts(
    session: Session,
    *,
    experiment_session: ExperimentSession,
    stage_records: dict[str, StageRecord],
    teacher: User,
) -> None:
    session.execute(delete(Artifact).where(Artifact.session_id == experiment_session.id))
    for spec in _open_design_vnext_late_qa_artifact_specs(teacher):
        stage_record = stage_records[str(spec["stage_key"])]
        status = spec.get("status", ArtifactStatus.SUBMITTED)
        artifact = Artifact(
            tenant_id=experiment_session.tenant_id,
            institution_id=experiment_session.institution_id,
            course_id=experiment_session.course_id,
            session_id=experiment_session.id,
            stage_record_id=stage_record.id,
            stage_key=stage_record.stage_key,
            submitted_by_user_id=experiment_session.student_user_id,
            artifact_type=str(spec["artifact_type"]),
            title=str(spec["title"]),
            content_json=dict(spec["content_json"]),
            version=1,
            status=status,
            submitted_at=datetime.now(UTC)
            if status in {ArtifactStatus.SUBMITTED, ArtifactStatus.REVIEWED, ArtifactStatus.ACCEPTED}
            else None,
            reviewed_at=datetime.now(UTC)
            if status in {ArtifactStatus.REVIEWED, ArtifactStatus.ACCEPTED}
            else None,
        )
        session.add(artifact)
    session.flush()


def _open_design_vnext_qa_artifact_specs(teacher: User) -> tuple[dict[str, object], ...]:
    return (
        {
            "stage_key": "stage_1",
            "artifact_type": "stage_1_interview_turn",
            "title": "AI 客户访谈记录",
            "status": ArtifactStatus.REVIEWED,
            "content_json": {
                "customer": "周明",
                "student": "林同学",
                "turn_count": 14,
                "messages": [
                    "我们是一家汽车零部件工厂，最近客户审厂越来越频繁。",
                    "当前质检流程是怎样流转的？",
                    "审厂前的追溯准备优先级最高。",
                ],
            },
        },
        {
            "stage_key": "stage_1",
            "artifact_type": "stage_1_visit_notes",
            "title": "拜访间整理",
            "status": ArtifactStatus.SUBMITTED,
            "content_json": {
                "confirmed_information": ["审厂追溯压力", "MES 字段缺失", "一线补材料耗时"],
                "risks_and_questions": ["客户验收口径需要确认", "数据来源需要脱敏"],
            },
        },
        {
            "stage_key": "stage_1",
            "artifact_type": "stage_1_problem_summary",
            "title": "问题发现总结",
            "status": ArtifactStatus.REVIEWED,
            "content_json": {
                "problem_statement": "审厂追溯材料分散，准备成本高。",
                "success_criteria": ["降低人工拼材料时间", "字段缺失时提示补充"],
            },
        },
        {
            "stage_key": "stage_1",
            "artifact_type": "stage_1_evaluation",
            "title": "阶段一综合评估",
            "status": ArtifactStatus.REVIEWED,
            "content_json": {"score": 86, "review_summary": "访谈覆盖数据、流程、验收和边界。"},
        },
        {
            "stage_key": "stage_2",
            "artifact_type": "stage_2_requirements_document",
            "title": "需求文档 v2",
            "status": ArtifactStatus.REVIEWED,
            "content_json": {"summary": "围绕审厂追溯和材料整理定义需求边界。"},
        },
        {
            "stage_key": "stage_2",
            "artifact_type": "stage_2_feasibility_report",
            "title": "可行性报告",
            "status": ArtifactStatus.REVIEWED,
            "content_json": {"yellow_flags": ["MES 字段不稳定", "一线录入阻力"]},
        },
        {
            "stage_key": "stage_2",
            "artifact_type": "stage_2_technical_solution",
            "title": "总体技术方案",
            "status": ArtifactStatus.REVIEWED,
            "content_json": {"route": "RAG + 转人工边界 + 审计日志"},
        },
        {
            "stage_key": "stage_2",
            "artifact_type": "stage_2_ai_review",
            "title": "阶段二 AI 评审",
            "status": ArtifactStatus.REVIEWED,
            "content_json": {
                "ai_score": 82,
                "review_summary": "需求边界、可行性和证据引用基本充分，客户可理解性仍需教师确认。",
                "rubric": {"name": "solution_definition_v1.1", "version": "v1.1"},
                "evidence_artifact_ids": ["stage_1_interview_turn", "stage_2_requirements_document"],
                "ai_gateway": {"usage_type": "stage_2_document_review", "model": "visual-qa-fake"},
                "teacher_confirmation": {
                    "decision": "accept",
                    "teacher_score": 86,
                    "confirmed_by_user_id": str(teacher.id),
                },
            },
        },
        {
            "stage_key": "stage_3",
            "artifact_type": "stage_3_lab_experiment_record",
            "title": "数据源识别记录",
            "status": ArtifactStatus.SUBMITTED,
            "content_json": {"vnext_step": "source_decision", "sources": ["MES", "Excel", "纸质单据"]},
        },
        {
            "stage_key": "stage_3",
            "artifact_type": "stage_3_lab_experiment_record",
            "title": "数据质量评估记录",
            "status": ArtifactStatus.SUBMITTED,
            "content_json": {"vnext_step": "quality_assessment", "risks": ["字段缺失", "口径不一致"]},
        },
        {
            "stage_key": "stage_3",
            "artifact_type": "stage_3_knowledge_decision",
            "title": "知识工程决策表",
            "status": ArtifactStatus.DRAFT,
            "content_json": {
                "strategy": "先构建有限范围审厂追溯问答知识库，缺字段时要求人工确认。",
                "missing": "召回风险预判待补充",
            },
        },
        {
            "stage_key": "stage_3",
            "artifact_type": "stage_3_handoff_plan",
            "title": "阶段四执行建议",
            "status": ArtifactStatus.DRAFT,
            "content_json": {"state": "未提交", "next": "补齐召回风险后进入 Dify 构建。"},
        },
    )


def _open_design_vnext_late_qa_artifact_specs(teacher: User) -> tuple[dict[str, object], ...]:
    return _open_design_vnext_qa_artifact_specs(teacher) + (
        {
            "stage_key": "stage_3",
            "artifact_type": "stage_3_ai_review",
            "title": "阶段三 AI 评审",
            "status": ArtifactStatus.REVIEWED,
            "content_json": {
                "ai_score": 84,
                "review_summary": "知识来源、质量风险和检索边界已经形成可进入构建的方案。",
                "rubric": {"name": "knowledge_decision_v1.0", "version": "v1.0"},
                "ai_gateway": {"usage_type": "stage_3_ai_review", "model": "visual-qa-fake"},
            },
        },
        {
            "stage_key": "stage_4",
            "artifact_type": "stage_4_dify_implementation",
            "title": "Dify 智能体构建记录",
            "status": ArtifactStatus.SUBMITTED,
            "content_json": {
                "dify_app_name": "制造业质检追溯 AI 助手",
                "dify_app_url": "https://dify.example.local/apps/mfg-quality-trace",
                "app_mode": "chatflow",
                "knowledge_base_notes": "已导入 SOP、审厂清单、异常处置台账和整改说明样例。",
                "prompt_or_instruction_notes": "要求回答引用资料来源；字段缺失时提示人工确认。",
                "tool_configuration_notes": "关键词兜底 + 向量召回 + 转人工边界节点。",
                "known_limitations": ["不可判定责任归属", "不能补造缺失质检记录"],
            },
        },
        {
            "stage_key": "stage_4",
            "artifact_type": "stage_4_test_report",
            "title": "平台自动化测试报告",
            "status": ArtifactStatus.SUBMITTED,
            "content_json": {
                "test_goal": "验证质检追溯问答、缺失字段提醒和越界拒答。",
                "overall_result": "needs_revision",
                "total_score": 84,
                "test_cases": [
                    {"scenario": "标准追溯", "result": "passed"},
                    {"scenario": "字段缺失", "result": "partial"},
                    {"scenario": "责任判定", "result": "failed"},
                ],
                "improvement_actions": ["补充字段缺失提示模板", "强化责任判定拒答边界"],
            },
        },
        {
            "stage_key": "stage_4",
            "artifact_type": "stage_4_ai_test_review",
            "title": "阶段四 AI 测试反馈",
            "status": ArtifactStatus.REVIEWED,
            "content_json": {
                "ai_score": 84,
                "review_summary": "标准场景表现稳定，缺字段和越界问题已能通过交付说明明确。",
                "rubric": {"name": "agent_test_v1.0", "version": "v1.0"},
                "ai_gateway": {"usage_type": "stage_4_ai_test_review", "model": "visual-qa-fake"},
            },
        },
        {
            "stage_key": "stage_5",
            "artifact_type": "stage_5_delivery_document",
            "title": "交付说明书草稿",
            "status": ArtifactStatus.DRAFT,
            "content_json": {
                "project_name": "制造业质检追溯 AI 助手交付说明文档",
                "delivery_summary": "面向质量负责人和审厂材料准备人员的有限范围 RAG 助手。",
                "final_agent_url": "https://dify.example.local/apps/mfg-quality-trace",
                "known_limitations": ["字段缺失时不能自动生成结论", "责任归属必须转人工"],
            },
        },
        {
            "stage_key": "stage_5",
            "artifact_type": "stage_5_operations_guide",
            "title": "运维说明草稿",
            "status": ArtifactStatus.DRAFT,
            "content_json": {
                "maintenance_owner_notes": "质量部负责知识库材料更新，IT 负责权限和发布链接。",
                "data_update_plan": "每月更新 SOP 与审厂清单，异常台账按批次追加。",
                "common_issues": ["召回不到整改证明", "MES 导出字段缺失"],
            },
        },
        {
            "stage_key": "stage_5",
            "artifact_type": "stage_5_acceptance_package",
            "title": "验收材料草稿",
            "status": ArtifactStatus.DRAFT,
            "content_json": {
                "acceptance_scope": "审厂追溯问答、资料来源说明、字段缺失提醒和越界拒答。",
                "acceptance_criteria": ["标准问题命中 SOP", "缺失字段提醒补充", "责任判定转人工"],
                "unresolved_issues": ["历史台账字段不齐", "客户验收口径待最终确认"],
            },
        },
    )


def _manufacturing_manifest() -> dict[str, object]:
    return {
        "industry": "制造业",
        "scenario": "汽车零部件质检智能体",
        "company_profile": "中型汽车零部件工厂，正在为大客户审厂准备质检数字化材料。",
        "surface_need": "想用 AI 提升质检效率。",
        "real_driver": "大客户审厂要求质检记录数字化并能追溯。",
        "constraints": ["预算有限", "MES 数据质量差", "一线员工不愿使用复杂系统"],
        "standard_acceptance_questions": [
            "质检漏检率如何统计？",
            "不合格零件处理流程是什么？",
            "质检记录数字化需要保存哪些信息？",
            "今天股市行情怎么样？",
            "刚才说的第一步具体怎么做？",
        ],
        "stage_1_ai_customer_persona": {
            "role": "生产部门负责人",
            "personality": "务实、时间紧、对技术细节不主动展开，但会回应具体追问。",
            "public_goal": "提升质检效率，减少人工整理记录的时间。",
            "hidden_driver": "明年大客户审厂要求质检过程可追溯。",
            "release_rules": [
                "只有学生追问审厂、合规或客户要求时才透露真实驱动力。",
                "只有学生追问数据基础时才说明 MES 数据质量差。",
                "不主动替学生总结完整需求。",
            ],
        },
        "stage_1_ai_config": {
            "customer_persona_bindings": {
                "guided_default": "mfg_quality_owner_zhou_ming",
                "practice_default": "mfg_quality_owner_zhou_ming",
            },
            "guided_levels": [
                {
                    "key": "trust_building",
                    "title": "建立信任与破冰",
                    "goal": "建立合作氛围，说明访谈目的，避免一开始就问系统功能。",
                },
                {
                    "key": "business_context",
                    "title": "摸清业务现状",
                    "goal": "确认现有流程、参与角色、数据流转和高频工作场景。",
                },
                {
                    "key": "pain_point",
                    "title": "定位核心痛点",
                    "goal": "把客户说的麻烦追问成可验证的影响、频率和后果。",
                },
                {
                    "key": "constraints",
                    "title": "澄清期望与约束",
                    "goal": "澄清预算、时间、系统边界、组织阻力和一线接受度。",
                },
                {
                    "key": "data_feasibility",
                    "title": "数据与可行性探测",
                    "goal": "确认数据来源、字段质量、更新频率、权限和样例可用性。",
                },
                {
                    "key": "summary_alignment",
                    "title": "总结确认与推进",
                    "goal": "复述问题定义和未确认点，让客户确认优先级和下一步材料。",
                },
            ],
        },
        "customer_personas": [
            {
                "id": "mfg_quality_owner_zhou_ming",
                "name": "周明",
                "position": "制造工厂质量负责人",
                "responsibilities": [
                    "协调车间、质检员和质量部准备审厂材料",
                    "负责质检异常追溯和客户整改要求跟进",
                    "推动质检记录从纸质和 Excel 逐步数字化",
                ],
                "personality": "务实、时间紧、对空泛方案耐心有限，愿意回答具体业务追问。",
                "communication_preferences": [
                    "喜欢先讲业务现状和约束，再讨论系统可能性",
                    "不主动展开技术细节，除非学生问到数据、流程或责任人",
                    "对明显模板化的问题会回答得简短",
                ],
                "professional_level": "懂质检业务和审厂要求，对 AI 技术半懂不懂。",
                "project_concerns": [
                    "预算有限，不能大规模替换现有 ERP/MES",
                    "MES 字段不完整，历史记录质量不稳定",
                    "一线员工不愿意使用复杂系统或重复录入",
                ],
                "student_vendor_awareness": "认为学生团队有热情但项目经验有限，需要通过追问建立信任。",
                "surface_need": "想用 AI 提升质检效率，减少人工整理记录的时间。",
                "hidden_motivation": "明年大客户审厂要求质检过程可追溯，当前材料准备压力很大。",
                "release_rules": [
                    "隐藏信息只有在学生追问审厂、合规、客户要求或追溯压力时才释放。",
                    "MES 数据质量问题只有在学生追问数据来源、字段完整性或系统现状时才释放。",
                    "一线员工阻力只有在学生追问使用者、录入负担或落地约束时才释放。",
                    "不得主动替学生总结完整需求或给出技术方案。",
                ],
                "refusal_boundaries": [
                    "不回答与制造业质检项目无关的问题。",
                    "不提供预算明细，只能说明预算有限且要先做小范围试点。",
                    "不扮演导师、评审或产品经理，不解释标准答案。",
                ],
                "behavior_tests": [
                    {
                        "input": "你们真正着急的原因是什么？",
                        "expected_behavior": "可透露审厂追溯压力，但不能一次性给完整需求清单。",
                    },
                    {
                        "input": "帮我写一个完整技术方案吧。",
                        "expected_behavior": "拒绝提供技术方案，回到客户业务诉求和限制。",
                    },
                ],
            }
        ],
    }


def _rubric_json(stage_key: str) -> dict[str, object]:
    common_items = [
        {
            "key": "evidence",
            "label": "证据完整性",
            "score": 40,
            "description": "产出物包含可追踪的项目证据，而非空泛结论。",
        },
        {
            "key": "reasoning",
            "label": "分析与决策质量",
            "score": 40,
            "description": "能围绕制造业质检场景作出合理判断并说明依据。",
        },
        {
            "key": "delivery",
            "label": "表达与交付规范",
            "score": 20,
            "description": "文档结构清晰，符合阶段交付要求。",
        },
    ]
    return {"stage_key": stage_key, "items": common_items}
