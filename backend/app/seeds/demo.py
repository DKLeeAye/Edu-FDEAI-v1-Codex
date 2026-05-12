from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import (
    Course,
    ExperimentPackage,
    ExperimentPackageVersion,
    Institution,
    Rubric,
    StageBlueprint,
    Tenant,
    User,
)
from app.models.enums import CourseStatus, PackageStatus, PackageType, RubricStatus, UserRole

DEFAULT_TENANT_SLUG = "default"
DEFAULT_INSTITUTION_CODE = "DEMO"
MANUFACTURING_QA_PACKAGE_SLUG = "manufacturing-qa-agent"
MANUFACTURING_QA_PACKAGE_VERSION = "1.0.0"
MANUFACTURING_QA_DEMO_COURSE_CODE = "MFG-QA-DEMO"
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
    return course


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
