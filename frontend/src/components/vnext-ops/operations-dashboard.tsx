"use client";

import {
  BarChart3,
  CheckCircle2,
  Cloud,
  FileText,
  Layers3,
  LogOut,
  Package,
  RefreshCw,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";

import {
  confirmTeacherAiReview,
  downloadTeacherCourseGradesCsv,
  downloadTeacherCourseGradesXlsx,
  exportTeacherCourseGrades,
  getAdminOperationsOverview,
  listTeacherCourseProgress,
  listTeacherCourseRubrics,
  listTeacherStageArtifacts,
  publishTeacherGrade,
  publishTeacherCourseRubric,
  revokeAdminOperationsAccessGrant,
  saveTeacherGradeDraft,
  saveTeacherCourseRubricDraft,
  updateAdminDeploymentStatus,
  upsertAdminLicenseEntitlement,
  type AdminOperationsOverview,
  type CurrentUser,
  type TeacherGradeExport,
  type TeacherArtifactSummary,
  type TeacherCourseProgress,
  type TeacherRubric,
  type TeacherSessionProgress,
} from "@/src/lib/api";
import { createTeacherGradeDraftPayload, findGradeExportRow } from "./teacher-grade-flow";
import {
  createRubricDraftForm,
  createTeacherRubricDraftPayload,
  type TeacherRubricDraftForm,
} from "./teacher-rubric-flow";

type OperationsPage =
  | "teacher-dashboard"
  | "course-setup"
  | "experiment-library"
  | "class-monitor"
  | "ai-review"
  | "admin-deployment";

type OperationsDashboardProps = {
  onLogout: () => void;
  token: string;
  user: CurrentUser;
};

const stageOptions = ["stage_1", "stage_2", "stage_3", "stage_4", "stage_5"] as const;

const stageCopy: Record<string, string> = {
  stage_1: "需求访谈",
  stage_2: "方案定义",
  stage_3: "知识决策",
  stage_4: "智能体实现",
  stage_5: "交付验收",
};

const navItems: Array<{
  icon: LucideIcon;
  id: OperationsPage;
  label: string;
  roles: Array<CurrentUser["role"]>;
}> = [
  { id: "teacher-dashboard", label: "教师工作台", icon: BarChart3, roles: ["teacher"] },
  { id: "course-setup", label: "课程配置", icon: Settings, roles: ["teacher"] },
  { id: "experiment-library", label: "实验包库", icon: Package, roles: ["teacher", "admin"] },
  { id: "class-monitor", label: "课中监控", icon: Layers3, roles: ["teacher"] },
  { id: "ai-review", label: "AI 评审", icon: ShieldCheck, roles: ["teacher"] },
  { id: "admin-deployment", label: "部署管理", icon: Cloud, roles: ["admin"] },
];

export function OperationsDashboard({ onLogout, token, user }: OperationsDashboardProps) {
  const [activePage, setActivePage] = useState<OperationsPage>(
    user.role === "admin" ? "admin-deployment" : "teacher-dashboard",
  );
  const [courses, setCourses] = useState<TeacherCourseProgress[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedStageKey, setSelectedStageKey] = useState<(typeof stageOptions)[number]>("stage_2");
  const [artifacts, setArtifacts] = useState<TeacherArtifactSummary[]>([]);
  const [gradeExport, setGradeExport] = useState<TeacherGradeExport | null>(null);
  const [rubrics, setRubrics] = useState<TeacherRubric[]>([]);
  const [adminOverview, setAdminOverview] = useState<AdminOperationsOverview | null>(null);
  const [latestGradeDraftId, setLatestGradeDraftId] = useState("");
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
  const [isConfirmingReview, setIsConfirmingReview] = useState(false);
  const [isLoadingGradeExport, setIsLoadingGradeExport] = useState(false);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState(false);
  const [isLoadingAdminOverview, setIsLoadingAdminOverview] = useState(false);
  const [isMutatingAdminOperations, setIsMutatingAdminOperations] = useState(false);
  const [isPublishingRubric, setIsPublishingRubric] = useState(false);
  const [isSavingGradeDraft, setIsSavingGradeDraft] = useState(false);
  const [isPublishingGrade, setIsPublishingGrade] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    user.role === "admin" ? "部署管理入口已打开" : "正在加载教师工作台",
  );
  const [errorMessage, setErrorMessage] = useState("");

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => item.roles.includes(user.role)),
    [user.role],
  );

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? courses[0] ?? null,
    [courses, selectedCourseId],
  );

  const selectedSession = useMemo(() => {
    return (
      selectedCourse?.sessions.find((session) => session.id === selectedSessionId) ??
      selectedCourse?.sessions[0] ??
      null
    );
  }, [selectedCourse, selectedSessionId]);

  const loadTeacherCourses = useCallback(async () => {
    if (user.role !== "teacher") {
      return;
    }
    setIsLoadingCourses(true);
    setErrorMessage("");
    try {
      const nextCourses = await listTeacherCourseProgress(token);
      const nextCourse = nextCourses[0] ?? null;
      const nextSession = nextCourse?.sessions[0] ?? null;
      setCourses(nextCourses);
      setSelectedCourseId(nextCourse?.id ?? "");
      setSelectedSessionId(nextSession?.id ?? "");
      setStatusMessage("教师工作台已同步真实课程进度");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "教师课程加载失败");
      setStatusMessage("教师工作台加载失败");
    } finally {
      setIsLoadingCourses(false);
    }
  }, [token, user.role]);

  const loadSelectedArtifacts = useCallback(async () => {
    if (user.role !== "teacher" || !selectedSession) {
      setArtifacts([]);
      return;
    }
    setIsLoadingArtifacts(true);
    setErrorMessage("");
    try {
      const nextArtifacts = await listTeacherStageArtifacts(
        token,
        selectedSession.id,
        selectedStageKey,
      );
      setArtifacts(nextArtifacts);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Artifact 加载失败");
    } finally {
      setIsLoadingArtifacts(false);
    }
  }, [selectedSession, selectedStageKey, token, user.role]);

  const loadGradeExport = useCallback(async () => {
    if (user.role !== "teacher" || !selectedCourse) {
      setGradeExport(null);
      return;
    }
    setIsLoadingGradeExport(true);
    setErrorMessage("");
    try {
      const nextGradeExport = await exportTeacherCourseGrades(token, selectedCourse.id);
      setGradeExport(nextGradeExport);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "成绩导出加载失败");
    } finally {
      setIsLoadingGradeExport(false);
    }
  }, [selectedCourse, token, user.role]);

  const loadCourseRubrics = useCallback(async () => {
    if (user.role !== "teacher" || !selectedCourse) {
      setRubrics([]);
      return;
    }
    setIsLoadingRubrics(true);
    setErrorMessage("");
    try {
      const nextRubrics = await listTeacherCourseRubrics(token, selectedCourse.id);
      setRubrics(nextRubrics);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Rubric 加载失败");
    } finally {
      setIsLoadingRubrics(false);
    }
  }, [selectedCourse, token, user.role]);

  const loadAdminOperationsOverview = useCallback(async () => {
    if (user.role !== "admin") {
      setAdminOverview(null);
      return;
    }
    setIsLoadingAdminOverview(true);
    setErrorMessage("");
    try {
      const nextOverview = await getAdminOperationsOverview(token);
      setAdminOverview(nextOverview);
      setStatusMessage("部署管理已同步真实运营概览");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "管理端运营概览加载失败");
      setStatusMessage("部署管理加载失败");
    } finally {
      setIsLoadingAdminOverview(false);
    }
  }, [token, user.role]);

  const refreshAdminOperationsOverview = useCallback(async () => {
    await loadAdminOperationsOverview();
  }, [loadAdminOperationsOverview]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTeacherCourses();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTeacherCourses]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSelectedArtifacts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSelectedArtifacts]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadGradeExport();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadGradeExport]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCourseRubrics();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCourseRubrics]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAdminOperationsOverview();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAdminOperationsOverview]);

  async function handleConfirmReview(
    reviewArtifact: TeacherArtifactSummary,
    decision: "accept" | "override",
    teacherScore: number,
  ) {
    setIsConfirmingReview(true);
    setErrorMessage("");
    try {
      await confirmTeacherAiReview(token, reviewArtifact.id, {
        comment:
          decision === "accept"
            ? "教师在 AI Rubric 页面接受 AI 建议。"
            : "教师在 AI Rubric 页面覆盖 AI 建议。",
        decision,
        override_reason:
          decision === "override"
            ? "教师根据阶段证据和 Rubric 判断对 AI 初评分进行覆盖。"
            : undefined,
        teacher_score: teacherScore,
      });
      await loadSelectedArtifacts();
      setStatusMessage(decision === "accept" ? "教师已接受 AI 建议并写入审计 Artifact" : "教师已覆盖 AI 评分并写入审计 Artifact");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "教师确认失败");
      setStatusMessage("教师确认失败");
    } finally {
      setIsConfirmingReview(false);
    }
  }

  async function handleSaveGradeDraft() {
    if (!selectedSession) {
      setErrorMessage("请选择学生 Session");
      return;
    }
    setIsSavingGradeDraft(true);
    setErrorMessage("");
    try {
      const draft = await saveTeacherGradeDraft(
        token,
        selectedSession.id,
        createTeacherGradeDraftPayload(selectedSession),
      );
      setLatestGradeDraftId(draft.id);
      await loadGradeExport();
      setStatusMessage("成绩草稿已写入 Artifact");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "成绩草稿保存失败");
      setStatusMessage("成绩草稿保存失败");
    } finally {
      setIsSavingGradeDraft(false);
    }
  }

  async function handlePublishGrade() {
    if (!selectedSession) {
      setErrorMessage("请选择学生 Session");
      return;
    }
    const gradeRow = findGradeExportRow(gradeExport, selectedSession.id);
    const draftArtifactId = latestGradeDraftId || gradeRow?.draft_artifact_id;
    if (!draftArtifactId) {
      setErrorMessage("请先保存成绩草稿");
      return;
    }
    setIsPublishingGrade(true);
    setErrorMessage("");
    try {
      await publishTeacherGrade(token, selectedSession.id, {
        draft_artifact_id: draftArtifactId,
        publication_note: "教师端工作台发布为正式课程成绩。",
      });
      setLatestGradeDraftId("");
      await loadGradeExport();
      setStatusMessage("正式成绩已发布并写入 Artifact");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "正式成绩发布失败");
      setStatusMessage("正式成绩发布失败");
    } finally {
      setIsPublishingGrade(false);
    }
  }

  async function handleDownloadGradeExport(format: "csv" | "xlsx") {
    if (!selectedCourse) {
      setErrorMessage("请选择课程");
      return;
    }
    setIsLoadingGradeExport(true);
    setErrorMessage("");
    try {
      const [csvBlob] = await Promise.all([
        format === "csv"
          ? downloadTeacherCourseGradesCsv(token, selectedCourse.id)
          : downloadTeacherCourseGradesXlsx(token, selectedCourse.id),
        loadGradeExport(),
      ]);
      const csvUrl = window.URL.createObjectURL(csvBlob);
      const link = document.createElement("a");
      link.href = csvUrl;
      link.download = `course-${selectedCourse.id}-grade-export.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(csvUrl);
      setStatusMessage(format === "csv" ? "课程成绩 CSV 已生成" : "课程成绩 Excel 已生成");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "成绩文件导出失败");
      setStatusMessage("成绩文件导出失败");
    } finally {
      setIsLoadingGradeExport(false);
    }
  }

  async function handlePublishRubricVersion(form: TeacherRubricDraftForm) {
    if (!selectedCourse) {
      setErrorMessage("请选择课程");
      return;
    }
    let payload;
    try {
      payload = createTeacherRubricDraftPayload(form);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Rubric 表单无效");
      return;
    }
    setIsPublishingRubric(true);
    setErrorMessage("");
    try {
      const draft = await saveTeacherCourseRubricDraft(
        token,
        selectedCourse.id,
        form.stageKey,
        payload,
      );
      await publishTeacherCourseRubric(token, selectedCourse.id, draft.id);
      await loadCourseRubrics();
      setStatusMessage(`${stageLabel(form.stageKey)} Rubric 课程版本已发布`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Rubric 发布失败");
      setStatusMessage("Rubric 发布失败");
    } finally {
      setIsPublishingRubric(false);
    }
  }

  async function handleIncreaseActiveUserLicense() {
    const activeUserEntitlement = adminOverview?.license_entitlements.find(
      (item) => item.key === "active_users",
    );
    const nextLimit = Math.max(
      activeUserEntitlement?.limit ?? 0,
      (activeUserEntitlement?.used ?? 0) + 50,
    );
    setIsMutatingAdminOperations(true);
    setErrorMessage("");
    try {
      await upsertAdminLicenseEntitlement(token, {
        entitlement_key: "active_users",
        label: activeUserEntitlement?.label ?? "活跃用户席位",
        limit_value: nextLimit,
        status: "active",
        unit: activeUserEntitlement?.unit ?? "人",
      });
      await refreshAdminOperationsOverview();
      setStatusMessage("License 权益已更新");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "License 更新失败");
      setStatusMessage("License 更新失败");
    } finally {
      setIsMutatingAdminOperations(false);
    }
  }

  async function handleToggleDeploymentStatus() {
    const deployment = adminOverview?.deployment_instances[0] ?? null;
    if (!deployment) {
      setErrorMessage("暂无部署实例");
      return;
    }
    setIsMutatingAdminOperations(true);
    setErrorMessage("");
    try {
      await updateAdminDeploymentStatus(token, deployment.id, {
        last_health_check_now: true,
        status: deployment.status === "running" ? "maintenance" : "running",
      });
      await refreshAdminOperationsOverview();
      setStatusMessage("部署实例状态已更新");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "部署实例状态更新失败");
      setStatusMessage("部署实例状态更新失败");
    } finally {
      setIsMutatingAdminOperations(false);
    }
  }

  async function handleRevokeLatestAccessGrant() {
    const grant = adminOverview?.operations_access_grants.find((item) => item.status === "active");
    if (!grant) {
      setErrorMessage("暂无可撤销的运维授权");
      return;
    }
    setIsMutatingAdminOperations(true);
    setErrorMessage("");
    try {
      await revokeAdminOperationsAccessGrant(token, grant.id, {
        reason: "管理员从部署管理页撤销运维授权。",
      });
      await refreshAdminOperationsOverview();
      setStatusMessage("运维授权已撤销");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "运维授权撤销失败");
      setStatusMessage("运维授权撤销失败");
    } finally {
      setIsMutatingAdminOperations(false);
    }
  }

  const pageMeta = getPageMeta(activePage);

  return (
    <div className="shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setActivePage(visibleNavItems[0]?.id ?? activePage)} type="button">
          <div className="brand-mark">FDE</div>
          <div className="brand-copy">
            <div className="brand-title">EduFDE</div>
            <div className="brand-subtitle">AI 智能体项目交付实训</div>
          </div>
        </button>
        <div className="nav-group">Platform</div>
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`nav-link ${activePage === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => {
                setActivePage(item.id);
                setStatusMessage(`${item.label}已打开`);
              }}
              title={item.label}
              type="button"
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button className="nav-link" onClick={onLogout} type="button">
          <LogOut aria-hidden="true" />
          <span>退出登录</span>
        </button>
        <div className="sidebar-footer">
          <strong>证据链状态</strong>
          <p>课程、阶段产物、AI 评审与教师确认统一进入项目档案袋；当前页面先承载第 8 轮旧状态能力。</p>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div>
            <div className="crumb">{pageMeta.crumb}</div>
            <h1>{pageMeta.title}</h1>
            <p className="lead">{pageMeta.lead}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[color:var(--muted)]">
              <span>{user.full_name}</span>
              <span className="status info">{roleLabel(user.role)}</span>
              {statusMessage ? <span>{statusMessage}</span> : null}
              {errorMessage ? <span className="text-[color:var(--danger)]">{errorMessage}</span> : null}
            </div>
          </div>
          <div className="actions">
            {user.role === "teacher" ? (
              <button
                className="btn"
                disabled={isLoadingCourses}
                onClick={() => void loadTeacherCourses()}
                type="button"
              >
                <RefreshCw aria-hidden="true" size={16} />
                刷新
              </button>
            ) : (
              <button
                className="btn"
                disabled={isLoadingAdminOverview}
                onClick={() => void loadAdminOperationsOverview()}
                type="button"
              >
                <RefreshCw aria-hidden="true" size={16} />
                刷新
              </button>
            )}
            {pageMeta.actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  className={`btn ${action.primary ? "primary" : ""}`}
                  key={action.label}
                  onClick={() => setStatusMessage(action.message)}
                  type="button"
                >
                  <Icon aria-hidden="true" size={16} />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>

        {activePage === "admin-deployment" ? (
          <AdminDeploymentPage
            isLoading={isLoadingAdminOverview}
            isMutating={isMutatingAdminOperations}
            onIncreaseActiveUserLicense={handleIncreaseActiveUserLicense}
            onRevokeLatestAccessGrant={handleRevokeLatestAccessGrant}
            onToggleDeploymentStatus={handleToggleDeploymentStatus}
            overview={adminOverview}
          />
        ) : (
          <TeacherPageBody
            activePage={activePage}
            artifacts={artifacts}
            courses={courses}
            gradeExport={gradeExport}
            isLoadingArtifacts={isLoadingArtifacts}
            isLoadingCourses={isLoadingCourses}
            isLoadingGradeExport={isLoadingGradeExport}
            isLoadingRubrics={isLoadingRubrics}
            isPublishingRubric={isPublishingRubric}
            onCourseChange={setSelectedCourseId}
            onExportGrades={handleDownloadGradeExport}
            onPublishGrade={handlePublishGrade}
            onSaveGradeDraft={handleSaveGradeDraft}
            onPublishRubricVersion={handlePublishRubricVersion}
            rubrics={rubrics}
            onSessionChange={setSelectedSessionId}
            onStageChange={(stageKey) => setSelectedStageKey(stageKey as (typeof stageOptions)[number])}
            selectedCourse={selectedCourse}
            selectedSession={selectedSession}
            selectedStageKey={selectedStageKey}
            isConfirmingReview={isConfirmingReview}
            isPublishingGrade={isPublishingGrade}
            isSavingGradeDraft={isSavingGradeDraft}
            onConfirmReview={handleConfirmReview}
          />
        )}
      </main>
    </div>
  );
}

function TeacherPageBody({
  activePage,
  artifacts,
  courses,
  gradeExport,
  isConfirmingReview,
  isLoadingArtifacts,
  isLoadingCourses,
  isLoadingGradeExport,
  isLoadingRubrics,
  isPublishingRubric,
  isPublishingGrade,
  isSavingGradeDraft,
  onCourseChange,
  onConfirmReview,
  onExportGrades,
  onPublishGrade,
  onPublishRubricVersion,
  onSaveGradeDraft,
  rubrics,
  onSessionChange,
  onStageChange,
  selectedCourse,
  selectedSession,
  selectedStageKey,
}: {
  activePage: OperationsPage;
  artifacts: TeacherArtifactSummary[];
  courses: TeacherCourseProgress[];
  gradeExport: TeacherGradeExport | null;
  isConfirmingReview: boolean;
  isLoadingArtifacts: boolean;
  isLoadingCourses: boolean;
  isLoadingGradeExport: boolean;
  isLoadingRubrics: boolean;
  isPublishingRubric: boolean;
  isPublishingGrade: boolean;
  isSavingGradeDraft: boolean;
  onCourseChange: (courseId: string) => void;
  onConfirmReview: (
    reviewArtifact: TeacherArtifactSummary,
    decision: "accept" | "override",
    teacherScore: number,
  ) => Promise<void>;
  onExportGrades: (format: "csv" | "xlsx") => Promise<void>;
  onPublishGrade: () => Promise<void>;
  onPublishRubricVersion: (form: TeacherRubricDraftForm) => Promise<void>;
  onSaveGradeDraft: () => Promise<void>;
  rubrics: TeacherRubric[];
  onSessionChange: (sessionId: string) => void;
  onStageChange: (stageKey: string) => void;
  selectedCourse: TeacherCourseProgress | null;
  selectedSession: TeacherSessionProgress | null;
  selectedStageKey: string;
}) {
  if (activePage === "course-setup") {
    return (
      <CourseSetupPage
        courses={courses}
        isLoadingRubrics={isLoadingRubrics}
        isPublishingRubric={isPublishingRubric}
        onPublishRubricVersion={onPublishRubricVersion}
        rubrics={rubrics}
        selectedCourse={selectedCourse}
      />
    );
  }
  if (activePage === "experiment-library") {
    return <ExperimentLibraryPage selectedCourse={selectedCourse} />;
  }
  if (activePage === "class-monitor") {
    return (
      <ClassMonitorPage
        courses={courses}
        onCourseChange={onCourseChange}
        selectedCourse={selectedCourse}
      />
    );
  }
  if (activePage === "ai-review") {
    return (
      <AiReviewRubricPage
        artifacts={artifacts}
        isConfirmingReview={isConfirmingReview}
        isLoadingArtifacts={isLoadingArtifacts}
        onConfirmReview={onConfirmReview}
        onCourseChange={onCourseChange}
        onSessionChange={onSessionChange}
        onStageChange={onStageChange}
        selectedCourse={selectedCourse}
        selectedSession={selectedSession}
        selectedStageKey={selectedStageKey}
      />
    );
  }
  return (
    <TeacherDashboardPage
      courses={courses}
      gradeExport={gradeExport}
      isLoadingCourses={isLoadingCourses}
      isLoadingGradeExport={isLoadingGradeExport}
      isPublishingGrade={isPublishingGrade}
      isSavingGradeDraft={isSavingGradeDraft}
      onExportGrades={onExportGrades}
      onPublishGrade={onPublishGrade}
      onSaveGradeDraft={onSaveGradeDraft}
      selectedCourse={selectedCourse}
      selectedSession={selectedSession}
    />
  );
}

function TeacherDashboardPage({
  courses,
  gradeExport,
  isLoadingCourses,
  isLoadingGradeExport,
  isPublishingGrade,
  isSavingGradeDraft,
  onExportGrades,
  onPublishGrade,
  onSaveGradeDraft,
  selectedCourse,
  selectedSession,
}: {
  courses: TeacherCourseProgress[];
  gradeExport: TeacherGradeExport | null;
  isLoadingCourses: boolean;
  isLoadingGradeExport: boolean;
  isPublishingGrade: boolean;
  isSavingGradeDraft: boolean;
  onExportGrades: (format: "csv" | "xlsx") => Promise<void>;
  onPublishGrade: () => Promise<void>;
  onSaveGradeDraft: () => Promise<void>;
  selectedCourse: TeacherCourseProgress | null;
  selectedSession: TeacherSessionProgress | null;
}) {
  const sessions = selectedCourse?.sessions ?? [];
  const metrics = createTeacherMetrics(courses);
  const selectedGradeRow = selectedSession
    ? findGradeExportRow(gradeExport, selectedSession.id)
    : null;
  const publishedRows = gradeExport?.rows.filter((row) => row.grade_status === "published").length ?? 0;
  return (
    <>
      <section className="grid cols-4" style={{ marginBottom: 18 }}>
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-body">
          <StageRail active={2} />
        </div>
      </section>
      <section className="layout">
        <div className="grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">课程运行看板</h2>
                <p className="panel-subtitle">按课程聚合阶段进度、提交质量和需要教师处理的事项。</p>
              </div>
              <Status label={isLoadingCourses ? "同步中" : "实时"} tone="ok" />
            </div>
            <div className="panel-body">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>课程</th>
                      <th>当前阶段</th>
                      <th>进度</th>
                      <th>风险</th>
                      <th>教师下一步</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.length ? (
                      courses.map((course) => {
                        const firstSession = course.sessions[0] ?? null;
                        const activeStage = firstSession
                          ? firstSession.stage_records.find((stage) => stage.status !== "completed") ??
                            firstSession.stage_records[firstSession.stage_records.length - 1]
                          : null;
                        const percent = courseCompletionPercent(course);
                        return (
                          <tr key={course.id}>
                            <td>
                              <strong>{course.title}</strong>
                              <br />
                              <span className="muted">{course.code}</span>
                            </td>
                            <td>{activeStage ? stageLabel(activeStage.stage_key) : "暂无 Session"}</td>
                            <td>
                              <Progress value={percent} />
                            </td>
                            <td>
                              <Status
                                label={percent >= 80 ? "可验收" : percent >= 45 ? "黄灯债务" : "需关注"}
                                tone={percent >= 80 ? "ok" : percent >= 45 ? "warn" : "danger"}
                              />
                            </td>
                            <td>{percent >= 80 ? "生成验收反馈" : "确认 AI 评审与关键 Artifact"}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5}>{isLoadingCourses ? "正在加载课程" : "当前教师暂无课程"}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">班级共性问题</h2>
                <p className="panel-subtitle">从真实阶段状态和 Artifact 数量中提取教师优先处理方向。</p>
              </div>
            </div>
            <div className="panel-body">
              <EvidenceList
                items={[
                  {
                    title: "AI 评审待确认",
                    text: `${metrics[1]?.value ?? 0} 项评审建议需要教师接受、调整或覆盖。`,
                  },
                  {
                    title: "阶段进度不均衡",
                    text: `${sessions.length} 个学生项目需要按五阶段进度矩阵持续跟踪。`,
                  },
                  {
                    title: "档案袋证据完整度",
                    text: "教师端优先检查阶段产物是否能支撑 Rubric 判断，而不是只看提交状态。",
                  },
                ]}
              />
            </div>
          </section>
        </div>
        <aside className="grid">
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">今日待办</h2>
            </div>
            <div className="panel-body">
              <Workflow
                items={[
                  {
                    label: "优先",
                    state: "current",
                    text: "复核阶段二至阶段五 AI 评审中的红灯/黄灯判断。",
                    title: "确认 AI 评分",
                    tone: "danger",
                  },
                  {
                    label: "待处理",
                    text: "查看访谈记录、方案文档和知识工程决策的证据引用。",
                    title: "批注关键 Artifact",
                    tone: "warn",
                  },
                  {
                    label: "可执行",
                    text: "选择优秀项目进入班级复盘和档案袋示例。",
                    title: "生成班级复盘",
                    tone: "ok",
                  },
                ]}
              />
            </div>
          </section>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">成绩发布</h2>
                <p className="panel-subtitle">
                  {selectedSession
                    ? `${selectedSession.student.full_name} · ${selectedGradeRow?.grade_status ?? "missing"}`
                    : "请选择学生项目"}
                </p>
              </div>
              <Status
                label={isLoadingGradeExport ? "同步中" : `${publishedRows} 已发布`}
                tone={publishedRows > 0 ? "ok" : "info"}
              />
            </div>
            <div className="panel-body grid">
              <div className="evidence">
                <strong>当前成绩</strong>
                <span>
                  {selectedGradeRow?.published_score !== null &&
                  selectedGradeRow?.published_score !== undefined
                    ? `${selectedGradeRow.published_score} 分`
                    : selectedGradeRow?.grade_status === "draft"
                      ? "草稿待发布"
                      : "未生成草稿"}
                </span>
              </div>
              <div className="evidence">
                <strong>成绩 Artifact</strong>
                <span>
                  {selectedGradeRow?.publication_artifact_id ??
                    selectedGradeRow?.draft_artifact_id ??
                    "等待教师写入"}
                </span>
              </div>
              <div className="actions">
                <button
                  className="btn"
                  disabled={!selectedSession || isSavingGradeDraft}
                  onClick={() => void onSaveGradeDraft()}
                  type="button"
                >
                  <FileText aria-hidden="true" size={16} />
                  {isSavingGradeDraft ? "保存中" : "保存草稿"}
                </button>
                <button
                  className="btn primary"
                  disabled={
                    !selectedSession ||
                    isPublishingGrade ||
                    (!selectedGradeRow?.draft_artifact_id && !selectedGradeRow?.publication_artifact_id)
                  }
                  onClick={() => void onPublishGrade()}
                  type="button"
                >
                  <CheckCircle2 aria-hidden="true" size={16} />
                  {isPublishingGrade ? "发布中" : "发布成绩"}
                </button>
                <button
                  className="btn"
                  disabled={!selectedCourse || isLoadingGradeExport}
                  onClick={() => void onExportGrades("csv")}
                  type="button"
                >
                  <RefreshCw aria-hidden="true" size={16} />
                  {isLoadingGradeExport ? "导出中" : "下载 CSV"}
                </button>
                <button
                  className="btn"
                  disabled={!selectedCourse || isLoadingGradeExport}
                  onClick={() => void onExportGrades("xlsx")}
                  type="button"
                >
                  <FileText aria-hidden="true" size={16} />
                  {isLoadingGradeExport ? "导出中" : "下载 Excel"}
                </button>
              </div>
            </div>
          </section>
          <section className="callout">
            <h3>教师最终确认权</h3>
            <p>AI 评分必须绑定 Rubric、证据、Prompt 版本和模型版本；教师可以接受、调整或覆盖 AI 建议，所有操作应进入审计日志。</p>
          </section>
        </aside>
      </section>
    </>
  );
}

function CourseSetupPage({
  courses,
  isLoadingRubrics,
  isPublishingRubric,
  onPublishRubricVersion,
  rubrics,
  selectedCourse,
}: {
  courses: TeacherCourseProgress[];
  isLoadingRubrics: boolean;
  isPublishingRubric: boolean;
  onPublishRubricVersion: (form: TeacherRubricDraftForm) => Promise<void>;
  rubrics: TeacherRubric[];
  selectedCourse: TeacherCourseProgress | null;
}) {
  const [selectedRubricStageKey, setSelectedRubricStageKey] = useState("stage_2");
  const selectedRubric = useMemo(
    () =>
      rubrics.find((rubric) => rubric.stage_key === selectedRubricStageKey) ??
      rubrics[0] ??
      null,
    [rubrics, selectedRubricStageKey],
  );
  const [rubricDraftForm, setRubricDraftForm] = useState<TeacherRubricDraftForm | null>(null);
  const effectiveRubricDraftForm = rubricDraftForm ?? createRubricDraftForm(selectedRubric);

  const rubricRows = rubrics.length
    ? rubrics.map((rubric) => {
        const itemCount = Array.isArray(rubric.rubric_json.items)
          ? rubric.rubric_json.items.length
          : 0;
        return [
          stageLabel(rubric.stage_key),
          `${rubric.total_score} 分`,
          `${rubric.name} · ${itemCount} 项`,
          rubric.scope === "course" ? "课程定制" : "实验包默认",
        ];
      })
    : [
        ["需求访谈覆盖", "15%", "隐藏约束、数据基础、验收方式必须覆盖", "AI 初评 + 教师确认"],
        ["方案可行性", "20%", "红灯问题必须解释，黄灯债务需记录", "教师最终确认"],
        ["交付验收", "25%", "交付包、说明、测试记录完整", "AI 评审 + 客户模拟"],
      ];
  return (
    <>
      <section className="grid cols-4" style={{ marginBottom: 18 }}>
        <MetricCard label="实验包版本" note="课程绑定快照" value="v1.1" />
        <MetricCard label="课时建议" note="8 周 / 4 学时" value="32" />
        <MetricCard label="评分项" note="五阶段 Rubric" value="18" />
        <MetricCard
          label="学生名单"
          note={selectedCourse ? selectedCourse.title : "请选择课程"}
          value={String(selectedCourse?.sessions.length ?? 0)}
        />
      </section>
      <section className="layout">
        <div className="grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">建课配置</h2>
                <p className="panel-subtitle">按教学周期配置内容、评价和运行策略。</p>
              </div>
              <Status label={selectedCourse ? selectedCourse.status : "待配置"} tone="info" />
            </div>
            <div className="panel-body">
              <Workflow
                items={[
                  {
                    label: selectedCourse ? "已选" : "待选",
                    state: selectedCourse ? "done" : "current",
                    text: selectedCourse
                      ? `${selectedCourse.title} · ${selectedCourse.code}`
                      : "选择要发布给学生的项目实训课程。",
                    title: "选择课程与实验包",
                    tone: selectedCourse ? "ok" : "warn",
                  },
                  {
                    label: "已锁定",
                    state: "done",
                    text: "课程运行期固定 package_version_id，后续实验包升级不影响历史课程。",
                    title: "绑定版本快照",
                    tone: "ok",
                  },
                  {
                    label: "待确认",
                    state: "current",
                    text: "教师材料、课时建议、AI 配额和 Rubric 权重仍需正式配置页补齐。",
                    title: "发布前检查",
                    tone: "warn",
                  },
                ]}
              />
            </div>
          </section>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">评分 Rubric</h2>
                <p className="panel-subtitle">
                  {isLoadingRubrics
                    ? "正在读取课程绑定 Rubric"
                    : rubrics.length
                      ? "来自课程绑定实验包版本，课程定制项优先显示"
                      : "暂无真实 Rubric，显示占位规则"}
                </p>
              </div>
              <button
                className="btn"
                disabled={!selectedCourse || rubrics.length === 0 || isPublishingRubric}
                onClick={() => void onPublishRubricVersion(effectiveRubricDraftForm)}
                type="button"
              >
                <ShieldCheck aria-hidden="true" size={16} />
                {isPublishingRubric ? "发布中" : "发布课程版本"}
              </button>
            </div>
            <div className="panel-body">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>评分项</th>
                      <th>权重</th>
                      <th>规则</th>
                      <th>确认方式</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rubricRows.map((row) => (
                      <tr key={row[0]}>
                        {row.map((cell) => (
                          <td key={cell}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 lg:grid-cols-[160px_minmax(0,1fr)_120px]">
                  <label>
                    <span className="field-label">阶段</span>
                    <select
                      aria-label="选择 Rubric 阶段"
                      onChange={(event) => {
                        const nextStageKey = event.target.value;
                        const nextRubric =
                          rubrics.find((rubric) => rubric.stage_key === nextStageKey) ?? null;
                        setSelectedRubricStageKey(nextStageKey);
                        setRubricDraftForm(createRubricDraftForm(nextRubric));
                      }}
                      value={effectiveRubricDraftForm.stageKey}
                    >
                      {rubrics.map((rubric) => (
                        <option key={rubric.id} value={rubric.stage_key}>
                          {stageLabel(rubric.stage_key)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">版本名称</span>
                    <input
                      onChange={(event) =>
                        setRubricDraftForm((current) => ({
                          ...(current ?? effectiveRubricDraftForm),
                          name: event.target.value,
                        }))
                      }
                      value={effectiveRubricDraftForm.name}
                    />
                  </label>
                  <label>
                    <span className="field-label">总分</span>
                    <input
                      min={1}
                      max={200}
                      onChange={(event) =>
                        setRubricDraftForm((current) => ({
                          ...(current ?? effectiveRubricDraftForm),
                          totalScore: Number(event.target.value),
                        }))
                      }
                      type="number"
                      value={effectiveRubricDraftForm.totalScore}
                    />
                  </label>
                </div>
                <label>
                  <span className="field-label">规则 JSON</span>
                  <textarea
                    onChange={(event) =>
                      setRubricDraftForm((current) => ({
                        ...(current ?? effectiveRubricDraftForm),
                        rubricJsonText: event.target.value,
                      }))
                    }
                    rows={8}
                    value={effectiveRubricDraftForm.rubricJsonText}
                  />
                </label>
              </div>
            </div>
          </section>
        </div>
        <aside className="grid">
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">发布前检查</h2>
            </div>
            <div className="panel-body grid">
              <CheckRow checked label="实验包版本已发布" />
              <CheckRow checked label="课程绑定实验包版本快照" />
              <CheckRow checked={courses.length > 0} label="教师课程权限可读取" />
              <CheckRow checked={false} label="课程成员模型待替换临时边界" />
              <Progress value={courses.length > 0 ? 75 : 50} />
            </div>
          </section>
          <section className="callout">
            <h3>课程快照原则</h3>
            <p>课程开始后，实验包、Prompt、模型与 Rubric 均作为历史快照保存，保障成绩、审计和复盘可解释。</p>
          </section>
        </aside>
      </section>
    </>
  );
}

function ExperimentLibraryPage({ selectedCourse }: { selectedCourse: TeacherCourseProgress | null }) {
  return (
    <>
      <section className="grid cols-4" style={{ marginBottom: 18 }}>
        <MetricCard label="发布实验包" note="标准行业包" value="8" />
        <MetricCard label="试点包" note="pilot 状态" tone="warn" value="3" />
        <MetricCard label="院校派生" note="共建客户" value="12" />
        <MetricCard label="质量问题" note="AI 调试待修复" tone="danger" value="5" />
      </section>
      <section className="layout">
        <div className="grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">资产列表</h2>
                <p className="panel-subtitle">支持状态、版本、授权范围和课程使用追踪。</p>
              </div>
            </div>
            <div className="panel-body table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>实验包</th>
                    <th>资产组成</th>
                    <th>状态</th>
                    <th>版本</th>
                    <th>课程使用</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["AI 智能客服项目", "剧本、原材料、测试题、教师材料", "published", "v1.1", selectedCourse ? selectedCourse.title : "4 门课程"],
                    ["企业知识库问答", "知识点卡片、Rubric、AI 客户", "pilot", "v0.9", "1 门课程"],
                    ["校园服务智能体", "交付模板、标准答案、演示脚本", "ai_testing", "v0.7", "未发布"],
                    ["财务制度问答", "版权材料、风险题、审计策略", "internal_review", "v0.4", "共建中"],
                  ].map((row) => (
                    <tr key={row[0]}>
                      <td>
                        <strong>{row[0]}</strong>
                        <br />
                        <span className="muted">行业实验包</span>
                      </td>
                      <td>{row[1]}</td>
                      <td>
                        <Status label={row[2]} tone={row[2] === "published" ? "ok" : "warn"} />
                      </td>
                      <td className="mono">{row[3]}</td>
                      <td>{row[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">生命周期</h2>
            </div>
            <div className="panel-body">
              <Workflow
                items={[
                  { label: "内容运营", state: "done", text: "确定行业背景、客户角色、项目目标。", title: "立项", tone: "info" },
                  { label: "当前", state: "current", text: "验证 AI 客户、AI 评审、导师 Prompt 的稳定性。", title: "AI 调试", tone: "warn" },
                  { label: "下一步", text: "教研负责人检查课时、难度和 Rubric 可执行性。", title: "教学评审", tone: "info" },
                  { label: "门禁", text: "绑定 License 权益和院校可见范围。", title: "发布授权", tone: "ok" },
                ]}
              />
            </div>
          </section>
        </div>
        <aside className="grid">
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">资产完整度</h2>
            </div>
            <div className="panel-body grid">
              <MetricCard label="项目剧本" note="客户角色与隐藏信息完整" tone="good" value="92%" />
              <MetricCard label="评价资产" note="标准测试题需补充" tone="warn" value="76%" />
              <MetricCard label="AI 配置" note="fallback 策略缺失" tone="danger" value="68%" />
            </div>
          </section>
          <section className="callout">
            <h3>版本规则</h3>
            <p>院校定制包从标准包派生；新版本不影响历史课程和历史成绩；每个版本必须有变更说明。</p>
          </section>
        </aside>
      </section>
    </>
  );
}

function ClassMonitorPage({
  courses,
  onCourseChange,
  selectedCourse,
}: {
  courses: TeacherCourseProgress[];
  onCourseChange: (courseId: string) => void;
  selectedCourse: TeacherCourseProgress | null;
}) {
  const sessions = selectedCourse?.sessions ?? [];
  const completedStageThree = sessions.filter((session) =>
    session.stage_records.some((stage) => stage.stage_key === "stage_3" && stage.status === "completed"),
  ).length;
  return (
    <>
      <section className="grid cols-4" style={{ marginBottom: 18 }}>
        <MetricCard label="班级小组" note="真实 Session" value={String(sessions.length)} />
        <MetricCard
          label="阶段三完成"
          note="按当前课程计算"
          tone={sessions.length && completedStageThree / sessions.length < 0.5 ? "warn" : "good"}
          value={`${sessions.length ? Math.round((completedStageThree / sessions.length) * 100) : 0}%`}
        />
        <MetricCard label="红灯风险" note="需教师复核" tone="danger" value={String(countRiskSessions(sessions))} />
        <MetricCard label="优秀案例" note="已完成项目" tone="good" value={String(sessions.filter((session) => session.status === "completed").length)} />
      </section>
      <section className="layout">
        <div className="grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">五阶段进度矩阵</h2>
                <p className="panel-subtitle">每行是一个学生项目，会话、Artifact 和评分状态联动。</p>
              </div>
              <select
                aria-label="选择课程"
                onChange={(event) => onCourseChange(event.target.value)}
                value={selectedCourse?.id ?? ""}
              >
                {courses.length ? null : <option value="">暂无课程</option>}
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="panel-body table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>小组</th>
                    <th>访谈</th>
                    <th>方案</th>
                    <th>知识</th>
                    <th>实现</th>
                    <th>教师干预</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length ? (
                    sessions.map((session) => (
                      <tr key={session.id}>
                        <td>
                          <strong>{session.student.full_name}</strong>
                          <br />
                          <span className="muted">{session.student.email}</span>
                        </td>
                        {stageOptions.slice(0, 4).map((stageKey) => {
                          const stage = session.stage_records.find((item) => item.stage_key === stageKey);
                          return (
                            <td key={stageKey}>
                              <Status
                                label={stageStatusCopy(stage?.status)}
                                tone={stage?.status === "completed" ? "ok" : stage?.status === "in_progress" ? "warn" : "info"}
                              />
                            </td>
                          );
                        })}
                        <td>{session.artifact_total_count > 0 ? "检查 Artifact 证据链" : "提示补交阶段产物"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>当前课程暂无学生 Session</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">红黄灯债务</h2>
            </div>
            <div className="panel-body">
              <Workflow
                items={[
                  { label: "阻断", state: "current", text: "阶段二红灯或阶段三数据边界不清时，教师必须最终确认。", title: "红灯：方案不可验收", tone: "danger" },
                  { label: "带债前进", text: "数据来源、脱敏、权限边界未说明时记录黄灯债务。", title: "黄灯：知识库数据来源不明", tone: "warn" },
                  { label: "待补", text: "阶段四正常题、异常题、边界题覆盖不足时要求补测。", title: "黄灯：测试题覆盖不足", tone: "warn" },
                ]}
              />
            </div>
          </section>
        </div>
        <aside className="grid">
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">课堂节奏</h2>
            </div>
            <div className="panel-body timeline">
              <TimelineItem text="已推送当前阶段操作要点。" time="09:10" title="阶段讲解完成" />
              <TimelineItem text={`${sessions.length} 个项目处于当前课程跟踪范围。`} time="09:35" title="学生项目同步" />
              <TimelineItem text="优先处理红灯阻断，再处理黄灯债务。" time="10:05" title="教师干预建议" />
            </div>
          </section>
          <section className="callout">
            <h3>课堂优先级</h3>
            <p>先处理红灯阻断，再处理黄灯债务；优秀案例不打断学生流程，课后进入班级复盘。</p>
          </section>
        </aside>
      </section>
    </>
  );
}

function AiReviewRubricPage({
  artifacts,
  isConfirmingReview,
  isLoadingArtifacts,
  onConfirmReview,
  onCourseChange,
  onSessionChange,
  onStageChange,
  selectedCourse,
  selectedSession,
  selectedStageKey,
}: {
  artifacts: TeacherArtifactSummary[];
  isConfirmingReview: boolean;
  isLoadingArtifacts: boolean;
  onConfirmReview: (
    reviewArtifact: TeacherArtifactSummary,
    decision: "accept" | "override",
    teacherScore: number,
  ) => Promise<void>;
  onCourseChange: (courseId: string) => void;
  onSessionChange: (sessionId: string) => void;
  onStageChange: (stageKey: string) => void;
  selectedCourse: TeacherCourseProgress | null;
  selectedSession: TeacherSessionProgress | null;
  selectedStageKey: string;
}) {
  const reviewArtifacts = artifacts.filter(isSourceAiReviewArtifact);
  const latestReview = reviewArtifacts[0] ?? null;
  const latestConfirmation = artifacts.find(
    (artifact) =>
      artifact.artifact_type === "teacher_ai_review_confirmation" &&
      artifact.content_json.source_review_artifact_id === latestReview?.id,
  );
  const rubric = asRecord(latestReview?.content_json.rubric);
  const evidenceItems = createEvidenceItems(artifacts, latestReview);
  const reviewScore = numericReviewScore(latestReview);
  const hasTeacherConfirmation = Boolean(
    latestConfirmation ?? asRecord(latestReview?.content_json.teacher_confirmation),
  );
  return (
    <>
      <section className="grid cols-4" style={{ marginBottom: 18 }}>
        <MetricCard label="AI 建议分" note={stageLabel(selectedStageKey)} value={String(estimateReviewScore(latestReview))} />
        <MetricCard label="证据引用" note="对话与文档片段" value={String(evidenceItems.length)} />
        <MetricCard
          label="教师调整"
          note={hasTeacherConfirmation ? "已写入确认 Artifact" : "等待教师确认"}
          tone="good"
          value={hasTeacherConfirmation ? "已确认" : "待定"}
        />
        <MetricCard label="审计字段" note="Prompt / 模型 / 时间" value={rubric ? "可追溯" : "待补"} />
      </section>
      <section className="layout">
        <div className="grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Rubric 明细</h2>
                <p className="panel-subtitle">评分不是黑盒，必须能回溯到证据。</p>
              </div>
              <Status
                label={hasTeacherConfirmation ? "教师已确认" : latestReview ? "教师待确认" : "等待 AI 评审"}
                tone={hasTeacherConfirmation ? "ok" : latestReview ? "warn" : "info"}
              />
            </div>
            <div className="panel-body rubric">
              {createRubricRows(rubric, selectedStageKey).map((row) => (
                <div className="rubric-row" key={row.title}>
                  <div>
                    <strong>{row.title}</strong>
                    <p className="muted">{row.text}</p>
                  </div>
                  <div className="score">{row.score}</div>
                  <Status label={row.status} tone={row.tone} />
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">证据定位</h2>
            </div>
            <div className="panel-body">
              <EvidenceList items={evidenceItems} />
            </div>
          </section>
        </div>
        <aside className="grid">
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">审计记录</h2>
            </div>
            <div className="panel-body grid">
              <label>
                <span className="field-label">课程</span>
                <select
                  aria-label="选择课程"
                  onChange={(event) => onCourseChange(event.target.value)}
                  value={selectedCourse?.id ?? ""}
                >
                  {selectedCourse ? null : <option value="">暂无课程</option>}
                  {selectedCourse ? (
                    <option value={selectedCourse.id}>{selectedCourse.title}</option>
                  ) : null}
                </select>
              </label>
              <label>
                <span className="field-label">学生 Session</span>
                <select
                  aria-label="选择学生 Session"
                  onChange={(event) => onSessionChange(event.target.value)}
                  value={selectedSession?.id ?? ""}
                >
                  {selectedCourse?.sessions.length ? null : <option value="">暂无 Session</option>}
                  {selectedCourse?.sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.student.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">阶段</span>
                <select
                  aria-label="选择阶段"
                  onChange={(event) => onStageChange(event.target.value)}
                  value={selectedStageKey}
                >
                  {stageOptions.map((stageKey) => (
                    <option key={stageKey} value={stageKey}>
                      {stageLabel(stageKey)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-2">
                <AuditItem field="Prompt" value={String(asRecord(latestReview?.content_json.ai_gateway)?.usage_type ?? "review_*")} />
                <AuditItem field="模型" value={String(asRecord(latestReview?.content_json.ai_gateway)?.model ?? "AI Gateway provider")} />
                <AuditItem field="Rubric" value={String(rubric?.name ?? rubric?.version ?? "阶段 Rubric 快照")} />
                <AuditItem field="Artifact" value={latestReview?.title ?? (isLoadingArtifacts ? "加载中" : "暂无评审 Artifact")} />
              </div>
              <div className="actions">
                <button
                  className="btn primary"
                  disabled={!latestReview || isConfirmingReview}
                  onClick={() => {
                    if (latestReview) {
                      void onConfirmReview(latestReview, "accept", reviewScore);
                    }
                  }}
                  type="button"
                >
                  <CheckCircle2 aria-hidden="true" size={16} />
                  {isConfirmingReview ? "写入中" : "接受 AI 建议"}
                </button>
                <button
                  className="btn"
                  disabled={!latestReview || isConfirmingReview}
                  onClick={() => {
                    if (latestReview) {
                      void onConfirmReview(latestReview, "override", Math.min(100, reviewScore + 4));
                    }
                  }}
                  type="button"
                >
                  <FileText aria-hidden="true" size={16} />
                  覆盖评分
                </button>
              </div>
            </div>
          </section>
          <section className="callout">
            <h3>不是最终裁判</h3>
            <p>AI 是教学助理和反馈器；教师可以接受、调整或覆盖建议，系统应保留原 AI 分数、教师分数、原因和操作时间。</p>
          </section>
        </aside>
      </section>
    </>
  );
}

function AdminDeploymentPage({
  isLoading,
  isMutating,
  onIncreaseActiveUserLicense,
  onRevokeLatestAccessGrant,
  onToggleDeploymentStatus,
  overview,
}: {
  isLoading: boolean;
  isMutating: boolean;
  onIncreaseActiveUserLicense: () => void;
  onRevokeLatestAccessGrant: () => void;
  onToggleDeploymentStatus: () => void;
  overview: AdminOperationsOverview | null;
}) {
  const deployment = overview?.deployment_instances[0] ?? null;
  const aiUsage = overview?.ai_usage ?? null;
  const aiUsageRows = aiUsage?.by_usage_type ?? [];
  const exportItems = overview?.data_exports ?? [];
  const deploymentRows = overview?.deployment_instances ?? [];
  const licenseEntitlements = overview?.license_entitlements ?? [];
  const latestAccessGrant = overview?.operations_access_grants[0] ?? null;
  return (
    <>
      <section className="grid cols-4" style={{ marginBottom: 18 }}>
        <MetricCard
          label="活跃用户"
          note={overview ? overview.institution.name : isLoading ? "同步中" : "等待数据"}
          value={formatCount(deployment?.active_users_count)}
        />
        <MetricCard label="课程运行" note="当前机构作用域" value={formatCount(deployment?.courses_count)} />
        <MetricCard
          label="AI 调用"
          note={`${formatCount(aiUsage?.total_tokens)} tokens`}
          value={formatCount(aiUsage?.total_calls)}
        />
        <MetricCard
          label="失败调用"
          note={aiUsage?.average_latency_ms == null ? "暂无延迟" : `${aiUsage.average_latency_ms}ms 平均延迟`}
          tone={(aiUsage?.failed_calls ?? 0) > 0 ? "warn" : undefined}
          value={formatCount(aiUsage?.failed_calls)}
        />
      </section>
      <section className="layout">
        <div className="grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">部署实例</h2>
                <p className="panel-subtitle">不同交付形态使用同一产品边界，但数据、模型、存储和运维权限隔离。</p>
              </div>
              <button
                className="btn"
                disabled={isMutating || deploymentRows.length === 0}
                onClick={onToggleDeploymentStatus}
                type="button"
              >
                {deployment?.status === "running" ? "切换维护" : "恢复运行"}
              </button>
            </div>
            <div className="panel-body table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>实例</th>
                    <th>环境</th>
                    <th>课程 / 会话</th>
                    <th>用户 / 实验包</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {deploymentRows.length > 0 ? (
                    deploymentRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.name}</strong>
                          <div className="muted">{overview?.tenant.name}</div>
                        </td>
                        <td>{environmentLabel(row.environment)}</td>
                        <td>{`${row.courses_count} 门 / ${row.sessions_count} 个`}</td>
                        <td>{`${row.active_users_count} 人 / ${row.package_versions_count} 版`}</td>
                        <td>
                          <Status
                            label={row.status === "running" ? "运行中" : "空闲"}
                            tone={row.status === "running" ? "ok" : "info"}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>{isLoading ? "正在同步部署实例..." : "暂无部署实例数据"}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">License 权益</h2>
              <button
                className="btn"
                disabled={isMutating}
                onClick={onIncreaseActiveUserLicense}
                type="button"
              >
                上调席位
              </button>
            </div>
            <div className="panel-body table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>权益</th>
                    <th>用量</th>
                    <th>来源</th>
                  </tr>
                </thead>
                <tbody>
                  {licenseEntitlements.length > 0 ? (
                    licenseEntitlements.map((item) => (
                      <tr key={item.key}>
                        <td>{item.label}</td>
                        <td>
                          {item.used}
                          {item.limit == null ? "" : ` / ${item.limit}`}
                          {item.unit}
                        </td>
                        <td>
                          <Status
                            label={item.source === "derived_from_current_scope" ? "当前作用域聚合" : item.source}
                            tone={item.status === "active" ? "ok" : "info"}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>{isLoading ? "正在同步 License 权益..." : "暂无 License 权益数据"}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">数据导出</h2>
            </div>
            <div className="panel-body table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>导出项</th>
                    <th>记录数</th>
                    <th>最近更新</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {exportItems.length > 0 ? (
                    exportItems.map((item) => (
                      <tr key={item.key}>
                        <td>{item.label}</td>
                        <td>{item.record_count}</td>
                        <td>{formatDateTime(item.last_updated_at)}</td>
                        <td>
                          <Status label={item.status === "ready" ? "可导出" : "暂无数据"} tone={item.status === "ready" ? "ok" : "info"} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>{isLoading ? "正在同步导出能力..." : "暂无导出数据"}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">AI 用量统计</h2>
            </div>
            <div className="panel-body table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>调用类型</th>
                    <th>次数</th>
                    <th>失败</th>
                    <th>Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {aiUsageRows.length > 0 ? (
                    aiUsageRows.map((item) => (
                      <tr key={item.usage_type}>
                        <td>{usageTypeLabel(item.usage_type)}</td>
                        <td>{item.call_count}</td>
                        <td>{item.failed_count}</td>
                        <td>{item.total_tokens}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>{isLoading ? "正在同步 AI 用量..." : "暂无 AI 调用记录"}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <aside className="grid">
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">运维授权</h2>
              <button
                className="btn"
                disabled={isMutating || !latestAccessGrant || latestAccessGrant.status !== "active"}
                onClick={onRevokeLatestAccessGrant}
                type="button"
              >
                撤销授权
              </button>
            </div>
            <div className="panel-body">
              <Workflow
                items={[
                  {
                    label: latestAccessGrant ? "已授权" : overview ? "已限定" : "待同步",
                    state: "current",
                    text: latestAccessGrant
                      ? latestAccessGrant.reason
                      : overview
                        ? `当前仅聚合 ${overview.institution.name} 的租户 / 机构作用域数据。`
                        : "院校管理员选择实例、时长和可访问范围。",
                    title: "客户作用域",
                    tone: latestAccessGrant || overview ? "ok" : "warn",
                  },
                  { label: "审计", text: "AI 调用、Artifact、成绩发布和 Rubric 发布继续进入审计链路。", title: "平台运维接入", tone: "warn" },
                  { label: "归档", text: "导出项先基于真实记录聚合，后续再补正式授权窗口和实例模型。", title: "操作归档", tone: "info" },
                ]}
              />
            </div>
          </section>
          <section className="callout">
            <h3>权限隔离原则</h3>
            <p>内容资产、教学数据和平台运维权限必须分离；当前管理端只读取管理员所属租户与机构的聚合数据。</p>
          </section>
        </aside>
      </section>
    </>
  );
}

function formatCount(value: number | undefined): string {
  return typeof value === "number" ? String(value) : "--";
}

function environmentLabel(environment: "local" | "staging" | "production") {
  if (environment === "production") {
    return "生产";
  }
  if (environment === "staging") {
    return "预发";
  }
  return "本地";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "暂无";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function usageTypeLabel(usageType: string) {
  return usageType.replaceAll("_", " ");
}

type StatusTone = "ok" | "warn" | "danger" | "info";

function Status({ label, tone = "info" }: { label: string; tone?: StatusTone }) {
  return <span className={`status ${tone}`}>{label}</span>;
}

function MetricCard({
  label,
  note,
  tone,
  value,
}: {
  label: string;
  note: string;
  tone?: "good" | "warn" | "danger";
  value: string;
}) {
  return (
    <article className={`metric ${tone ?? ""}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
    </article>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="progress">
      <span style={{ "--value": `${Math.max(0, Math.min(100, value))}%` } as CSSProperties} />
    </div>
  );
}

function StageRail({ active }: { active: number }) {
  const stages = [
    ["01", "需求访谈", "AI 客户多轮访谈与隐藏约束确认"],
    ["02", "方案定义", "需求文档、可行性、红黄灯边界"],
    ["03", "知识决策", "数据、分块、向量、召回策略判断"],
    ["04", "智能体实现", "角色、知识库、边界与标准测试"],
    ["05", "交付验收", "验收记录、说明文档、演示脚本"],
  ];
  return (
    <div className="stage-rail">
      {stages.map((stage, index) => (
        <article className={`stage ${index + 1 === active ? "active" : ""}`} key={stage[0]}>
          <div className="stage-num">{stage[0]}</div>
          <h3>{stage[1]}</h3>
          <p>{stage[2]}</p>
        </article>
      ))}
    </div>
  );
}

function Workflow({
  items,
}: {
  items: Array<{
    label: string;
    state?: string;
    text: string;
    title: string;
    tone?: StatusTone;
  }>;
}) {
  return (
    <div className="workflow">
      {items.map((item, index) => (
        <div className={`step-row ${item.state ?? ""}`} key={item.title}>
          <div className="step-dot">{index + 1}</div>
          <div>
            <h4>{item.title}</h4>
            <p>{item.text}</p>
          </div>
          <Status label={item.label} tone={item.tone} />
        </div>
      ))}
    </div>
  );
}

function EvidenceList({ items }: { items: Array<{ text: string; title: string }> }) {
  return (
    <div className="evidence-list">
      {items.map((item) => (
        <div className="evidence" key={`${item.title}-${item.text}`}>
          <strong>{item.title}</strong>
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}

function CheckRow({ checked, label }: { checked: boolean; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-[color:var(--fg)]">
      <input checked={checked} readOnly type="checkbox" />
      {label}
    </label>
  );
}

function TimelineItem({ text, time, title }: { text: string; time: string; title: string }) {
  return (
    <div className="timeline-item">
      <div className="time">{time}</div>
      <div className="timeline-card">
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function AuditItem({ field, value }: { field: string; value: string }) {
  return (
    <div className="evidence">
      <strong>{field}</strong>
      <span>{value}</span>
    </div>
  );
}

function getPageMeta(page: OperationsPage) {
  const map: Record<
    OperationsPage,
    {
      actions: Array<{ icon: LucideIcon; label: string; message: string; primary?: boolean }>;
      crumb: string;
      lead: string;
      title: string;
    }
  > = {
    "teacher-dashboard": {
      actions: [
        { icon: FileText, label: "生成班级复盘", message: "班级复盘草稿入口已打开", primary: true },
        { icon: FileText, label: "导出成绩草稿", message: "成绩草稿和发布记录已接入 Artifact 导出" },
      ],
      crumb: "教学运行 / 本周课程",
      lead: "把课前配置、课中风险、课后评分统一到一个教师入口，优先显示需要教师确认的 AI 判断和班级共性问题。",
      title: "教师工作台",
    },
    "course-setup": {
      actions: [
        { icon: CheckCircle2, label: "发布课程", message: "课程发布仍需正式建课接口", primary: true },
        { icon: FileText, label: "保存草稿", message: "课程配置草稿入口已打开" },
      ],
      crumb: "课前 / 建课向导",
      lead: "课程创建时绑定实验包版本快照，并锁定 Rubric、Prompt、模型和评分权重，确保历史课程可追溯。",
      title: "课程配置",
    },
    "experiment-library": {
      actions: [
        { icon: Package, label: "新建版本", message: "实验包版本管理仍需后端内容资产切片", primary: true },
        { icon: ShieldCheck, label: "质量评审", message: "实验包质量评审队列已打开" },
      ],
      crumb: "内容资产 / 行业实验包",
      lead: "实验包不是简单配置，而是可版本化、可授权、可共建的行业项目资产，覆盖项目剧本、训练资源、评价资产、AI 配置和教师材料。",
      title: "实验包库",
    },
    "class-monitor": {
      actions: [
        { icon: FileText, label: "推送阶段提醒", message: "阶段提醒入口已打开", primary: true },
        { icon: ShieldCheck, label: "查看关键对话", message: "关键对话定位需要后续教师批注接口" },
      ],
      crumb: "课中 / 进度与风险",
      lead: "教师在课堂中查看每组所处阶段、提交状态、关键卡点和 AI 风险提示，快速定位需要干预的学生小组。",
      title: "课中监控",
    },
    "ai-review": {
      actions: [
        { icon: CheckCircle2, label: "接受 AI 建议", message: "教师确认写入接口待后续切片", primary: true },
        { icon: FileText, label: "覆盖评分", message: "覆盖评分原因和审计日志待后续切片" },
      ],
      crumb: "评价机制 / AI 初评 + 教师确认",
      lead: "AI 评审必须绑定结构化 Rubric、证据、Prompt 版本、模型版本和审计记录；教师保留最终确认权。",
      title: "AI 评审与 Rubric",
    },
    "admin-deployment": {
      actions: [
        { icon: Cloud, label: "开启运维窗口", message: "运维窗口授权仍需管理端后端接口", primary: true },
        { icon: FileText, label: "生成 License", message: "License 生成仍需商业化配置切片" },
      ],
      crumb: "平台侧 / 商业与交付",
      lead: "面向 SaaS、专有租户和私有化实例的交付能力，覆盖实验包权益、AI 用量、部署权益、数据导出、运维 SLA 和审计授权。",
      title: "租户、License 与部署管理",
    },
  };
  return map[page];
}

function createTeacherMetrics(courses: TeacherCourseProgress[]) {
  const sessions = courses.flatMap((course) => course.sessions);
  const average = courses.length
    ? Math.round(courses.reduce((sum, course) => sum + courseCompletionPercent(course), 0) / courses.length)
    : 0;
  return [
    { label: "运行课程", note: "教师可读取课程", value: String(courses.length) },
    { label: "AI 待确认", note: "按已产出 Artifact 估算", tone: "warn" as const, value: String(countAiReviewArtifacts(sessions)) },
    { label: "高风险小组", note: "未形成产物或进度滞后", tone: "danger" as const, value: String(countRiskSessions(sessions)) },
    { label: "档案袋完成", note: "课程平均完成度", tone: "good" as const, value: `${average}%` },
  ];
}

function countAiReviewArtifacts(sessions: TeacherSessionProgress[]) {
  return sessions.reduce(
    (sum, session) =>
      sum +
      session.stage_records.filter(
        (stage) => stage.artifact_count > 0 && stage.stage_key !== "stage_1" && stage.status !== "locked",
      ).length,
    0,
  );
}

function countRiskSessions(sessions: TeacherSessionProgress[]) {
  return sessions.filter(
    (session) =>
      session.artifact_total_count === 0 ||
      session.stage_records.some((stage) => stage.status === "in_progress" && stage.artifact_count === 0),
  ).length;
}

function courseCompletionPercent(course: TeacherCourseProgress) {
  if (course.sessions.length === 0) {
    return 0;
  }
  const ratios = course.sessions.map((session) => {
    if (session.stage_records.length === 0) {
      return 0;
    }
    const completed = session.stage_records.filter((stage) => stage.status === "completed").length;
    return (completed / session.stage_records.length) * 100;
  });
  return Math.round(ratios.reduce((sum, value) => sum + value, 0) / ratios.length);
}

function stageLabel(stageKey: string) {
  return `${stageKey.replace("stage_", "阶段 ")} · ${stageCopy[stageKey] ?? stageKey}`;
}

function stageStatusCopy(status: string | undefined) {
  const map: Record<string, string> = {
    completed: "完成",
    in_progress: "进行中",
    locked: "未开始",
    not_started: "未开始",
  };
  return status ? map[status] ?? status : "未开始";
}

function roleLabel(role: CurrentUser["role"]) {
  return role === "admin" ? "管理员" : role === "teacher" ? "教师" : "学生";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function arrayFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function createEvidenceItems(
  artifacts: TeacherArtifactSummary[],
  latestReview: TeacherArtifactSummary | null,
) {
  const review = latestReview?.content_json;
  const fromReview = [
    ...arrayFromUnknown(review?.red_flags),
    ...arrayFromUnknown(review?.yellow_flags),
    ...arrayFromUnknown(review?.improvement_suggestions),
    ...arrayFromUnknown(review?.suggested_improvements),
  ];
  const items = fromReview.slice(0, 3).map((text, index) => ({
    text,
    title: `AI 评审证据 ${index + 1}`,
  }));
  if (items.length > 0) {
    return items;
  }
  return artifacts.slice(0, 3).map((artifact) => ({
    text: `${artifact.artifact_type} · ${artifact.status} · ${new Date(artifact.updated_at).toLocaleString("zh-CN")}`,
    title: artifact.title,
  })).concat(
    artifacts.length === 0
      ? [
          {
            text: "请先在学生端生成阶段评审 Artifact，再由教师端做 Rubric 确认。",
            title: "暂无可定位证据",
          },
        ]
      : [],
  );
}

function createRubricRows(rubric: Record<string, unknown> | null, selectedStageKey: string) {
  const rawCriteria = Array.isArray(rubric?.criteria) ? rubric?.criteria : null;
  if (rawCriteria) {
    return rawCriteria.slice(0, 4).map((item, index) => {
      const criterion = asRecord(item);
      return {
        score: `${18 - index} / 20`,
        status: index === 1 ? "待核" : "充分",
        text: String(criterion?.description ?? criterion?.rule ?? "Rubric 规则来自课程绑定快照。"),
        title: String(criterion?.name ?? criterion?.title ?? `评分项 ${index + 1}`),
        tone: (index === 1 ? "warn" : "ok") as StatusTone,
      };
    });
  }
  const fallback: Record<string, Array<{ score: string; status: string; text: string; title: string; tone: StatusTone }>> = {
    stage_2: [
      { score: "18 / 20", status: "充分", text: "是否把客户目标、范围外事项、验收标准表达清楚。", title: "需求边界清晰度", tone: "ok" },
      { score: "15 / 20", status: "待核", text: "是否识别红灯问题和黄灯风险债务。", title: "可行性判断", tone: "warn" },
      { score: "17 / 20", status: "充分", text: "是否引用访谈、修改记录和阶段产物。", title: "证据引用", tone: "ok" },
      { score: "14 / 20", status: "需改进", text: "是否避免只用模型术语描述方案。", title: "客户可理解性", tone: "warn" },
    ],
  };
  return fallback[selectedStageKey] ?? [
    { score: "18 / 20", status: "充分", text: "阶段产物是否完整、可追溯、可解释。", title: "产物完整度", tone: "ok" },
    { score: "16 / 20", status: "待核", text: "阶段判断是否引用真实证据和风险记录。", title: "证据绑定", tone: "warn" },
    { score: "17 / 20", status: "充分", text: "AI 建议是否经过教师确认或保留待确认状态。", title: "教师确认", tone: "ok" },
    { score: "15 / 20", status: "待补", text: "审计字段是否覆盖 Prompt、模型、Rubric 和时间。", title: "审计完整度", tone: "warn" },
  ];
}

function estimateReviewScore(latestReview: TeacherArtifactSummary | null) {
  if (!latestReview) {
    return 0;
  }
  const content = latestReview.content_json;
  const score = content.score ?? content.total_score ?? content.ai_score;
  if (typeof score === "number") {
    return score;
  }
  if (typeof score === "string" && score.trim()) {
    return score;
  }
  return latestReview.status === "reviewed" ? 82 : 76;
}

function numericReviewScore(latestReview: TeacherArtifactSummary | null) {
  const value = estimateReviewScore(latestReview);
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isSourceAiReviewArtifact(artifact: TeacherArtifactSummary) {
  return (
    artifact.artifact_type !== "teacher_ai_review_confirmation" &&
    artifact.artifact_type.includes("review")
  );
}
