"use client";

import { CheckCircle2, LogIn, LogOut, RefreshCw, Save, SearchCheck, Send } from "lucide-react";
import { FormEvent, useCallback, useMemo, useState } from "react";

import {
  Artifact,
  Course,
  CurrentUser,
  ExperimentSession,
  askStageOneCustomer,
  completeStageOne,
  completeStageThree,
  completeStageTwo,
  createExperimentSession,
  getCurrentUser,
  listCourses,
  listExperimentSessions,
  listStageArtifacts,
  listStageOneArtifacts,
  login,
  requestStageTwoAiReview,
  requestStageThreeAiReview,
  saveStageOneSummary,
  saveStageThreeKnowledgeDecision,
  saveStageTwoSolutionDefinition,
  type StageThreeKnowledgeStrategy,
} from "@/src/lib/api";
import { apiBaseUrl } from "@/src/lib/config";

const tokenStorageKey = "edufde_access_token";
const demoCourseCode = "MFG-QA-DEMO";
const demoStudentEmail = "student@edufde.demo";
const demoPassword = "EduFDE-demo-123";

type InterviewTurn = {
  id: string;
  userMessage: string;
  aiResponse: string;
  artifactId: string;
  aiCallLogId: string | null;
};

type SummaryFormState = {
  problemStatement: string;
  targetUser: string;
  businessContext: string;
  painPoints: string;
  successCriteria: string;
};

type SolutionFormState = {
  solutionTitle: string;
  problemSummary: string;
  proposedAgentCapability: string;
  targetWorkflow: string;
  dataSources: string;
  toolOrSystemDependencies: string;
  feasibilityRisks: string;
  expectedValue: string;
};

type KnowledgeDecisionFormState = {
  knowledgeGoal: string;
  requiredKnowledgeTypes: string;
  sourceInventory: string;
  selectedStrategy: StageThreeKnowledgeStrategy;
  strategyRationale: string;
  dataQualityRisks: string;
  maintenancePlan: string;
  evaluationPlan: string;
  stage4BuildPlan: string;
};

const initialSummary: SummaryFormState = {
  problemStatement: "质检记录依赖人工整理，审厂追溯材料准备压力大。",
  targetUser: "生产部门负责人和一线质检员",
  businessContext: "汽车零部件工厂准备大客户审厂，需要提升质检过程可追溯性。",
  painPoints: "漏检原因难追踪\nMES 数据质量不稳定\n一线员工不愿使用复杂系统",
  successCriteria: "减少人工整理时间\n关键质检记录可追溯\n上线流程不增加一线负担",
};

const initialSolution: SolutionFormState = {
  solutionTitle: "质检追溯 AI 助手",
  problemSummary: "审厂前质检记录分散，人工整理慢且难以追溯。",
  proposedAgentCapability: "根据质检记录和异常描述生成追溯摘要、风险提示与整改建议。",
  targetWorkflow: "质检员录入异常记录后，生产负责人通过智能体生成审厂追溯材料。",
  dataSources: "MES 质检记录\n不合格品处理单\n审厂检查清单",
  toolOrSystemDependencies: "Dify\nMES 导出的 CSV",
  feasibilityRisks: "MES 数据字段不统一\n一线录入质量不稳定",
  expectedValue: "减少审厂材料人工整理时间，并提升质检问题追溯效率。",
};

const initialKnowledgeDecision: KnowledgeDecisionFormState = {
  knowledgeGoal: "支撑质检追溯问答、异常原因定位和审厂材料生成。",
  requiredKnowledgeTypes: "质检记录字段说明\n不合格品处理流程\n审厂检查清单",
  sourceInventory: "MES 导出 CSV\n质检 SOP 文档\n历史不合格品处理单",
  selectedStrategy: "rag",
  strategyRationale: "问题需要引用质检记录和 SOP 证据，单纯 prompt 无法覆盖动态数据。",
  dataQualityRisks: "MES 字段命名不统一\n历史处理单存在缺失项",
  maintenancePlan: "每周同步最新质检记录，每月复查 SOP 和审厂清单版本。",
  evaluationPlan: "使用标准审厂问题集检查召回证据覆盖率和回答可追溯性。",
  stage4BuildPlan: "在 Dify 中创建知识库，导入清洗后的 SOP 与样例记录，并配置混合检索。",
};

export default function Home() {
  const [email, setEmail] = useState(demoStudentEmail);
  const [password, setPassword] = useState(demoPassword);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [session, setSession] = useState<ExperimentSession | null>(null);
  const [stageOneArtifacts, setStageOneArtifacts] = useState<Artifact[]>([]);
  const [stageTwoArtifacts, setStageTwoArtifacts] = useState<Artifact[]>([]);
  const [stageThreeArtifacts, setStageThreeArtifacts] = useState<Artifact[]>([]);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [message, setMessage] = useState("当前质检流程最大的痛点是什么？");
  const [summary, setSummary] = useState<SummaryFormState>(initialSummary);
  const [solution, setSolution] = useState<SolutionFormState>(initialSolution);
  const [knowledgeDecision, setKnowledgeDecision] =
    useState<KnowledgeDecisionFormState>(initialKnowledgeDecision);
  const [statusMessage, setStatusMessage] = useState("等待登录");
  const [errorMessage, setErrorMessage] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [isCompletingStageOne, setIsCompletingStageOne] = useState(false);
  const [isSavingSolution, setIsSavingSolution] = useState(false);
  const [isRequestingReview, setIsRequestingReview] = useState(false);
  const [isCompletingStageTwo, setIsCompletingStageTwo] = useState(false);
  const [isSavingKnowledgeDecision, setIsSavingKnowledgeDecision] = useState(false);
  const [isRequestingKnowledgeReview, setIsRequestingKnowledgeReview] = useState(false);
  const [isCompletingStageThree, setIsCompletingStageThree] = useState(false);

  const stageOneRecord = useMemo(
    () => session?.stage_records.find((record) => record.stage_key === "stage_1") ?? null,
    [session],
  );
  const stageTwoRecord = useMemo(
    () => session?.stage_records.find((record) => record.stage_key === "stage_2") ?? null,
    [session],
  );
  const stageThreeRecord = useMemo(
    () => session?.stage_records.find((record) => record.stage_key === "stage_3") ?? null,
    [session],
  );
  const stageTwoSolutionArtifact = useMemo(
    () =>
      stageTwoArtifacts.find(
        (artifact) => artifact.artifact_type === "stage_2_solution_definition",
      ) ?? null,
    [stageTwoArtifacts],
  );
  const stageTwoReviewArtifact = useMemo(
    () =>
      stageTwoArtifacts.find((artifact) => artifact.artifact_type === "stage_2_ai_review") ??
      null,
    [stageTwoArtifacts],
  );
  const stageThreeDecisionArtifact = useMemo(
    () =>
      stageThreeArtifacts.find(
        (artifact) => artifact.artifact_type === "stage_3_knowledge_decision",
      ) ?? null,
    [stageThreeArtifacts],
  );
  const stageThreeReviewArtifact = useMemo(
    () =>
      stageThreeArtifacts.find((artifact) => artifact.artifact_type === "stage_3_ai_review") ??
      null,
    [stageThreeArtifacts],
  );
  const stageTwoLocked = stageTwoRecord?.status === "locked";
  const stageThreeLocked = stageThreeRecord?.status === "locked" || stageThreeRecord === null;

  const refreshArtifacts = useCallback(async (authToken: string, sessionId: string) => {
    const [nextStageOneArtifacts, nextStageTwoArtifacts, nextStageThreeArtifacts] =
      await Promise.all([
        listStageOneArtifacts(authToken, sessionId),
        listStageArtifacts(authToken, sessionId, "stage_2"),
        listStageArtifacts(authToken, sessionId, "stage_3"),
      ]);
    setStageOneArtifacts(nextStageOneArtifacts);
    setStageTwoArtifacts(nextStageTwoArtifacts);
    setStageThreeArtifacts(nextStageThreeArtifacts);
  }, []);

  const refreshSessionAndArtifacts = useCallback(
    async (authToken: string, courseId: string, sessionId: string) => {
      const sessions = await listExperimentSessions(authToken);
      const nextSession =
        sessions.find((item) => item.id === sessionId) ??
        sessions.find((item) => item.course_id === courseId) ??
        null;
      if (nextSession !== null) {
        setSession(nextSession);
        await refreshArtifacts(authToken, nextSession.id);
      }
    },
    [refreshArtifacts],
  );

  const bootstrapStudentWorkspace = useCallback(
    async (authToken: string) => {
      setIsBootstrapping(true);
      setErrorMessage("");
      setStatusMessage("正在加载学生工作台");
      try {
        const currentUser = await getCurrentUser(authToken);
        setUser(currentUser);

        if (currentUser.role !== "student") {
          throw new Error("当前最小联调页仅支持学生账号");
        }

        const nextCourses = await listCourses(authToken);
        setCourses(nextCourses);
        const targetCourse =
          nextCourses.find((item) => item.code === demoCourseCode) ?? nextCourses[0] ?? null;

        if (targetCourse === null) {
          setCourse(null);
          setSession(null);
          setStageOneArtifacts([]);
          setStageTwoArtifacts([]);
          setStageThreeArtifacts([]);
          throw new Error("未找到可用课程，请先运行演示 seed 或由教师创建课程");
        }

        setCourse(targetCourse);
        const sessions = await listExperimentSessions(authToken);
        let activeSession =
          sessions.find((item) => item.course_id === targetCourse.id) ?? null;

        if (activeSession === null) {
          activeSession = await createExperimentSession(authToken, targetCourse.id);
        }

        setSession(activeSession);
        await refreshArtifacts(authToken, activeSession.id);
        setStatusMessage("阶段一已就绪");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "加载失败");
        setStatusMessage("加载失败");
      } finally {
        setIsBootstrapping(false);
      }
    },
    [refreshArtifacts],
  );

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoggingIn(true);
    setErrorMessage("");
    setStatusMessage("正在登录");
    try {
      const result = await login(email, password);
      window.localStorage.setItem(tokenStorageKey, result.access_token);
      setToken(result.access_token);
      await bootstrapStudentWorkspace(result.access_token);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登录失败");
      setStatusMessage("登录失败");
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleLogout() {
    window.localStorage.removeItem(tokenStorageKey);
    setToken(null);
    setUser(null);
    setCourses([]);
    setCourse(null);
    setSession(null);
    setStageOneArtifacts([]);
    setStageTwoArtifacts([]);
    setStageThreeArtifacts([]);
    setTurns([]);
    setStatusMessage("等待登录");
    setErrorMessage("");
  }

  async function handleRefreshWorkspace() {
    if (token === null) {
      return;
    }
    await bootstrapStudentWorkspace(token);
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (token === null || course === null || session === null || trimmedMessage.length === 0) {
      return;
    }

    setIsSending(true);
    setErrorMessage("");
    setStatusMessage("AI 客户正在回复");
    try {
      const result = await askStageOneCustomer(token, session.id, trimmedMessage);
      setTurns((currentTurns) => [
        ...currentTurns,
        {
          id: result.artifact.id,
          userMessage: result.user_message,
          aiResponse: result.ai_customer_response,
          artifactId: result.artifact.id,
          aiCallLogId: result.ai_call_log_id,
        },
      ]);
      setMessage("");
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage("访谈记录已保存");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "访谈提交失败");
      setStatusMessage("访谈提交失败");
    } finally {
      setIsSending(false);
    }
  }

  async function handleSaveSummary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (token === null || course === null || session === null) {
      return;
    }

    setIsSavingSummary(true);
    setErrorMessage("");
    setStatusMessage("正在保存阶段一总结");
    try {
      await saveStageOneSummary(token, session.id, {
        problem_statement: summary.problemStatement.trim(),
        target_user: summary.targetUser.trim(),
        business_context: summary.businessContext.trim(),
        pain_points: lines(summary.painPoints),
        success_criteria: lines(summary.successCriteria),
      });
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage("阶段一总结已保存");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "总结保存失败");
      setStatusMessage("总结保存失败");
    } finally {
      setIsSavingSummary(false);
    }
  }

  async function handleCompleteStageOne() {
    if (token === null || course === null || session === null) {
      return;
    }

    setIsCompletingStageOne(true);
    setErrorMessage("");
    setStatusMessage("正在完成阶段一");
    try {
      await completeStageOne(token, session.id);
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage("阶段一已完成，阶段二已解锁");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段一完成失败");
      setStatusMessage("阶段一完成失败");
    } finally {
      setIsCompletingStageOne(false);
    }
  }

  async function handleSaveSolution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (token === null || course === null || session === null || stageTwoLocked) {
      return;
    }

    setIsSavingSolution(true);
    setErrorMessage("");
    setStatusMessage("正在保存阶段二方案");
    try {
      const result = await saveStageTwoSolutionDefinition(token, session.id, {
        solution_title: solution.solutionTitle.trim(),
        problem_summary: solution.problemSummary.trim(),
        proposed_agent_capability: solution.proposedAgentCapability.trim(),
        target_workflow: solution.targetWorkflow.trim(),
        data_sources: lines(solution.dataSources),
        tool_or_system_dependencies: lines(solution.toolOrSystemDependencies),
        feasibility_risks: lines(solution.feasibilityRisks),
        expected_value: solution.expectedValue.trim(),
      });
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage(`阶段二方案已保存：${shortId(result.artifact.id)}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段二方案保存失败");
      setStatusMessage("阶段二方案保存失败");
    } finally {
      setIsSavingSolution(false);
    }
  }

  async function handleRequestReview() {
    if (token === null || course === null || session === null || stageTwoLocked) {
      return;
    }

    setIsRequestingReview(true);
    setErrorMessage("");
    setStatusMessage("正在请求阶段二 AI 评审");
    try {
      const result = await requestStageTwoAiReview(token, session.id);
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage(
        `阶段二 AI 评审已生成${
          result.ai_call_log_id ? `：AI Log ${shortId(result.ai_call_log_id)}` : ""
        }`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段二 AI 评审失败");
      setStatusMessage("阶段二 AI 评审失败");
    } finally {
      setIsRequestingReview(false);
    }
  }

  async function handleCompleteStageTwo() {
    if (token === null || course === null || session === null || stageTwoLocked) {
      return;
    }

    setIsCompletingStageTwo(true);
    setErrorMessage("");
    setStatusMessage("正在完成阶段二");
    try {
      await completeStageTwo(token, session.id);
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage("阶段二已完成，阶段三已解锁");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段二完成失败");
      setStatusMessage("阶段二完成失败");
    } finally {
      setIsCompletingStageTwo(false);
    }
  }

  async function handleSaveKnowledgeDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (token === null || course === null || session === null || stageThreeLocked) {
      return;
    }

    setIsSavingKnowledgeDecision(true);
    setErrorMessage("");
    setStatusMessage("正在保存阶段三知识工程决策");
    try {
      const result = await saveStageThreeKnowledgeDecision(token, session.id, {
        knowledge_goal: knowledgeDecision.knowledgeGoal.trim(),
        required_knowledge_types: lines(knowledgeDecision.requiredKnowledgeTypes),
        source_inventory: lines(knowledgeDecision.sourceInventory),
        selected_strategy: knowledgeDecision.selectedStrategy,
        strategy_rationale: knowledgeDecision.strategyRationale.trim(),
        data_quality_risks: lines(knowledgeDecision.dataQualityRisks),
        maintenance_plan: knowledgeDecision.maintenancePlan.trim(),
        evaluation_plan: knowledgeDecision.evaluationPlan.trim(),
        stage_4_build_plan: knowledgeDecision.stage4BuildPlan.trim(),
      });
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage(`阶段三知识工程决策已保存：${shortId(result.artifact.id)}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段三知识工程决策保存失败");
      setStatusMessage("阶段三知识工程决策保存失败");
    } finally {
      setIsSavingKnowledgeDecision(false);
    }
  }

  async function handleRequestKnowledgeReview() {
    if (token === null || course === null || session === null || stageThreeLocked) {
      return;
    }

    setIsRequestingKnowledgeReview(true);
    setErrorMessage("");
    setStatusMessage("正在请求阶段三 AI 评审");
    try {
      const result = await requestStageThreeAiReview(token, session.id);
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage(
        `阶段三 AI 评审已生成${
          result.ai_call_log_id ? `：AI Log ${shortId(result.ai_call_log_id)}` : ""
        }`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段三 AI 评审失败");
      setStatusMessage("阶段三 AI 评审失败");
    } finally {
      setIsRequestingKnowledgeReview(false);
    }
  }

  async function handleCompleteStageThree() {
    if (token === null || course === null || session === null || stageThreeLocked) {
      return;
    }

    setIsCompletingStageThree(true);
    setErrorMessage("");
    setStatusMessage("正在完成阶段三");
    try {
      await completeStageThree(token, session.id);
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage("阶段三已完成，阶段四已解锁");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段三完成失败");
      setStatusMessage("阶段三完成失败");
    } finally {
      setIsCompletingStageThree(false);
    }
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--border)] bg-[color:var(--surface)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">
              EduFDE 阶段一 / 二 / 三联调
            </h1>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              需求访谈、方案定义与知识工程决策 · API {apiBaseUrl}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusPill label={statusMessage} tone={errorMessage ? "danger" : "normal"} />
            {user ? (
              <button className="icon-button" onClick={handleLogout} type="button">
                <LogOut aria-hidden size={16} />
                退出
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="panel p-5">
            <h2 className="section-title">学生登录</h2>
            <form className="mt-4 space-y-3" onSubmit={handleLogin}>
              <label className="field-label" htmlFor="email">
                邮箱
              </label>
              <input
                className="field-input"
                id="email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
              <label className="field-label" htmlFor="password">
                密码
              </label>
              <input
                className="field-input"
                id="password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
              <button className="primary-button w-full" disabled={isLoggingIn} type="submit">
                <LogIn aria-hidden size={16} />
                {isLoggingIn ? "登录中" : "登录"}
              </button>
            </form>
          </section>

          <section className="panel p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="section-title">当前工作区</h2>
              <button
                className="icon-button"
                disabled={token === null || isBootstrapping}
                onClick={handleRefreshWorkspace}
                type="button"
              >
                <RefreshCw aria-hidden size={16} />
                刷新
              </button>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow label="用户" value={user ? `${user.full_name} · ${user.role}` : "未登录"} />
              <InfoRow label="课程" value={course ? `${course.title} · ${course.code}` : "未就绪"} />
              <InfoRow label="Session" value={session?.id ?? "未创建"} />
              <InfoRow label="课程数" value={`${courses.length}`} />
              <InfoRow
                label="Artifact"
                value={`${stageOneArtifacts.length + stageTwoArtifacts.length + stageThreeArtifacts.length}`}
              />
            </dl>
            <div className="mt-4 border-t border-[color:var(--border)] pt-4">
              <h3 className="text-sm font-semibold text-[color:var(--foreground)]">五阶段状态</h3>
              <div className="mt-3 grid gap-2">
                {session?.stage_records
                  .slice()
                  .sort((left, right) => left.stage_order - right.stage_order)
                  .map((record) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded border border-[color:var(--border)] bg-white px-3 py-2 text-sm"
                      key={record.id}
                    >
                      <span>{stageLabel(record.stage_key)}</span>
                      <StatusPill label={record.status} tone={stageTone(record.status)} />
                    </div>
                  )) ?? (
                  <div className="empty-state text-sm text-[color:var(--muted)]">
                    登录后显示阶段状态
                  </div>
                )}
              </div>
            </div>
            {errorMessage ? (
              <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}
          </section>
        </aside>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <section className="panel min-h-[520px] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="section-title">AI 客户访谈</h2>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    制造业质检 AI 智能体实验包
                  </p>
                </div>
                <StatusPill label="stage_1" tone="accent" />
              </div>

              <div className="mt-5 space-y-4">
                {turns.length === 0 ? (
                  <div className="empty-state">
                    <p className="text-sm font-medium text-[color:var(--foreground)]">
                      尚无本页访谈记录
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      登录并进入 session 后，可以直接向 AI 客户提问。
                    </p>
                  </div>
                ) : (
                  turns.map((turn) => (
                    <article className="space-y-3" key={turn.id}>
                      <div className="chat-bubble chat-bubble-user">
                        <span className="chat-label">学生</span>
                        <p>{turn.userMessage}</p>
                      </div>
                      <div className="chat-bubble chat-bubble-ai">
                        <span className="chat-label">AI 客户</span>
                        <p>{turn.aiResponse}</p>
                        <p className="mt-2 text-xs text-[color:var(--muted)]">
                          Artifact {shortId(turn.artifactId)}
                          {turn.aiCallLogId ? ` · AI Log ${shortId(turn.aiCallLogId)}` : ""}
                        </p>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <form className="mt-5 border-t border-[color:var(--border)] pt-4" onSubmit={handleSendMessage}>
                <label className="field-label" htmlFor="message">
                  学生问题
                </label>
                <textarea
                  className="field-textarea min-h-28"
                  disabled={session === null || isSending}
                  id="message"
                  onChange={(event) => setMessage(event.target.value)}
                  value={message}
                />
                <div className="mt-3 flex justify-end">
                  <button
                    className="primary-button"
                    disabled={session === null || isSending || message.trim().length === 0}
                    type="submit"
                  >
                    <Send aria-hidden size={16} />
                    {isSending ? "发送中" : "发送给 AI 客户"}
                  </button>
                </div>
              </form>
            </section>

            <section className="panel p-5">
              <h2 className="section-title">阶段一 Artifact</h2>
              <div className="mt-4 grid gap-3">
                {stageOneArtifacts.length === 0 ? (
                  <div className="empty-state text-sm text-[color:var(--muted)]">
                    暂无 Artifact
                  </div>
                ) : (
                  stageOneArtifacts.map((artifact) => (
                    <article className="artifact-row" key={artifact.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill label={artifact.artifact_type} tone="accent" />
                        <span className="text-xs text-[color:var(--muted)]">
                          {formatTime(artifact.created_at)}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-semibold">{artifact.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                        {artifactDescription(artifact)}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="section-title">阶段二 Artifact</h2>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    保存方案定义和 AI 可行性评审后会出现在这里。
                  </p>
                </div>
                <StatusPill label={stageTwoRecord?.status ?? "locked"} tone={stageTone(stageTwoRecord?.status)} />
              </div>
              <div className="mt-4 grid gap-3">
                {stageTwoArtifacts.length === 0 ? (
                  <div className="empty-state text-sm text-[color:var(--muted)]">
                    暂无阶段二 Artifact
                  </div>
                ) : (
                  stageTwoArtifacts.map((artifact) => (
                    <article className="artifact-row" key={artifact.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill label={artifact.artifact_type} tone="accent" />
                        <span className="text-xs text-[color:var(--muted)]">
                          {formatTime(artifact.created_at)}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-semibold">{artifact.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                        {artifactDescription(artifact)}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="section-title">阶段三 Artifact</h2>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    保存知识工程决策和 AI 决策评审后会出现在这里。
                  </p>
                </div>
                <StatusPill
                  label={stageThreeRecord?.status ?? "locked"}
                  tone={stageTone(stageThreeRecord?.status)}
                />
              </div>
              <div className="mt-4 grid gap-3">
                {stageThreeArtifacts.length === 0 ? (
                  <div className="empty-state text-sm text-[color:var(--muted)]">
                    暂无阶段三 Artifact
                  </div>
                ) : (
                  stageThreeArtifacts.map((artifact) => (
                    <article className="artifact-row" key={artifact.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill label={artifact.artifact_type} tone="accent" />
                        <span className="text-xs text-[color:var(--muted)]">
                          {formatTime(artifact.created_at)}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-semibold">{artifact.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                        {artifactDescription(artifact)}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="panel h-fit p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="section-title">问题发现总结</h2>
                <StatusPill label={stageOneRecord?.status ?? "stage_1"} tone={stageTone(stageOneRecord?.status)} />
              </div>
              <form className="mt-4 space-y-3" onSubmit={handleSaveSummary}>
                <TextField
                  label="问题陈述"
                  onChange={(value) => setSummary((current) => ({ ...current, problemStatement: value }))}
                  value={summary.problemStatement}
                />
                <TextField
                  label="目标用户"
                  onChange={(value) => setSummary((current) => ({ ...current, targetUser: value }))}
                  value={summary.targetUser}
                />
                <TextField
                  label="业务背景"
                  onChange={(value) => setSummary((current) => ({ ...current, businessContext: value }))}
                  rows={4}
                  value={summary.businessContext}
                />
                <TextField
                  label="痛点"
                  onChange={(value) => setSummary((current) => ({ ...current, painPoints: value }))}
                  rows={4}
                  value={summary.painPoints}
                />
                <TextField
                  label="成功标准"
                  onChange={(value) => setSummary((current) => ({ ...current, successCriteria: value }))}
                  rows={4}
                  value={summary.successCriteria}
                />
                <button
                  className="primary-button w-full"
                  disabled={session === null || isSavingSummary}
                  type="submit"
                >
                  <Save aria-hidden size={16} />
                  {isSavingSummary ? "保存中" : "保存总结"}
                </button>
              </form>
              <button
                className="icon-button mt-3 w-full"
                disabled={session === null || isCompletingStageOne}
                onClick={handleCompleteStageOne}
                type="button"
              >
                <CheckCircle2 aria-hidden size={16} />
                {isCompletingStageOne ? "完成中" : "完成阶段一"}
              </button>
            </section>

            <section className="panel h-fit p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="section-title">阶段二方案定义</h2>
                  {stageTwoLocked ? (
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      先完成阶段一后再保存阶段二方案。
                    </p>
                  ) : null}
                </div>
                <StatusPill label={stageTwoRecord?.status ?? "locked"} tone={stageTone(stageTwoRecord?.status)} />
              </div>
              <form className="mt-4 space-y-3" onSubmit={handleSaveSolution}>
                <TextField
                  disabled={stageTwoLocked}
                  label="方案标题"
                  onChange={(value) => setSolution((current) => ({ ...current, solutionTitle: value }))}
                  rows={2}
                  value={solution.solutionTitle}
                />
                <TextField
                  disabled={stageTwoLocked}
                  label="问题总结"
                  onChange={(value) => setSolution((current) => ({ ...current, problemSummary: value }))}
                  rows={4}
                  value={solution.problemSummary}
                />
                <TextField
                  disabled={stageTwoLocked}
                  label="智能体能力"
                  onChange={(value) =>
                    setSolution((current) => ({ ...current, proposedAgentCapability: value }))
                  }
                  rows={4}
                  value={solution.proposedAgentCapability}
                />
                <TextField
                  disabled={stageTwoLocked}
                  label="目标流程"
                  onChange={(value) => setSolution((current) => ({ ...current, targetWorkflow: value }))}
                  rows={4}
                  value={solution.targetWorkflow}
                />
                <TextField
                  disabled={stageTwoLocked}
                  label="数据来源"
                  onChange={(value) => setSolution((current) => ({ ...current, dataSources: value }))}
                  rows={3}
                  value={solution.dataSources}
                />
                <TextField
                  disabled={stageTwoLocked}
                  label="工具或系统依赖"
                  onChange={(value) =>
                    setSolution((current) => ({ ...current, toolOrSystemDependencies: value }))
                  }
                  rows={3}
                  value={solution.toolOrSystemDependencies}
                />
                <TextField
                  disabled={stageTwoLocked}
                  label="可行性风险"
                  onChange={(value) => setSolution((current) => ({ ...current, feasibilityRisks: value }))}
                  rows={3}
                  value={solution.feasibilityRisks}
                />
                <TextField
                  disabled={stageTwoLocked}
                  label="预期价值"
                  onChange={(value) => setSolution((current) => ({ ...current, expectedValue: value }))}
                  rows={4}
                  value={solution.expectedValue}
                />
                <button
                  className="primary-button w-full"
                  disabled={session === null || stageTwoLocked || isSavingSolution}
                  type="submit"
                >
                  <Save aria-hidden size={16} />
                  {isSavingSolution ? "保存中" : "保存阶段二方案"}
                </button>
              </form>

              <div className="mt-4 grid gap-3 border-t border-[color:var(--border)] pt-4">
                {stageTwoSolutionArtifact ? (
                  <p className="text-sm text-[color:var(--muted)]">
                    当前方案 Artifact：{shortId(stageTwoSolutionArtifact.id)}
                  </p>
                ) : null}
                <button
                  className="icon-button w-full"
                  disabled={session === null || stageTwoLocked || isRequestingReview}
                  onClick={handleRequestReview}
                  type="button"
                >
                  <SearchCheck aria-hidden size={16} />
                  {isRequestingReview ? "评审中" : "请求 AI 可行性评审"}
                </button>
                {stageTwoReviewArtifact ? <ReviewSummary artifact={stageTwoReviewArtifact} /> : null}
                <button
                  className="primary-button w-full"
                  disabled={session === null || stageTwoLocked || isCompletingStageTwo}
                  onClick={handleCompleteStageTwo}
                  type="button"
                >
                  <CheckCircle2 aria-hidden size={16} />
                  {isCompletingStageTwo ? "完成中" : "完成阶段二"}
                </button>
              </div>
            </section>

            <section className="panel h-fit p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="section-title">阶段三知识工程决策</h2>
                  {stageThreeLocked ? (
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      先完成阶段二后再提交阶段三知识工程决策。
                    </p>
                  ) : null}
                </div>
                <StatusPill
                  label={stageThreeRecord?.status ?? "locked"}
                  tone={stageTone(stageThreeRecord?.status)}
                />
              </div>
              <form className="mt-4 space-y-3" onSubmit={handleSaveKnowledgeDecision}>
                <TextField
                  disabled={stageThreeLocked}
                  label="知识目标"
                  onChange={(value) =>
                    setKnowledgeDecision((current) => ({ ...current, knowledgeGoal: value }))
                  }
                  rows={3}
                  value={knowledgeDecision.knowledgeGoal}
                />
                <TextField
                  disabled={stageThreeLocked}
                  label="所需知识类型"
                  onChange={(value) =>
                    setKnowledgeDecision((current) => ({
                      ...current,
                      requiredKnowledgeTypes: value,
                    }))
                  }
                  rows={3}
                  value={knowledgeDecision.requiredKnowledgeTypes}
                />
                <TextField
                  disabled={stageThreeLocked}
                  label="知识来源清单"
                  onChange={(value) =>
                    setKnowledgeDecision((current) => ({ ...current, sourceInventory: value }))
                  }
                  rows={3}
                  value={knowledgeDecision.sourceInventory}
                />
                <div>
                  <label className="field-label" htmlFor="selected-strategy">
                    知识策略
                  </label>
                  <select
                    className="field-select"
                    disabled={stageThreeLocked}
                    id="selected-strategy"
                    onChange={(event) =>
                      setKnowledgeDecision((current) => ({
                        ...current,
                        selectedStrategy: event.target.value as StageThreeKnowledgeStrategy,
                      }))
                    }
                    value={knowledgeDecision.selectedStrategy}
                  >
                    <option value="prompt_only">prompt_only</option>
                    <option value="rag">rag</option>
                    <option value="tool_calling">tool_calling</option>
                    <option value="hybrid">hybrid</option>
                  </select>
                </div>
                <TextField
                  disabled={stageThreeLocked}
                  label="策略选择依据"
                  onChange={(value) =>
                    setKnowledgeDecision((current) => ({ ...current, strategyRationale: value }))
                  }
                  rows={4}
                  value={knowledgeDecision.strategyRationale}
                />
                <TextField
                  disabled={stageThreeLocked}
                  label="数据质量风险"
                  onChange={(value) =>
                    setKnowledgeDecision((current) => ({ ...current, dataQualityRisks: value }))
                  }
                  rows={3}
                  value={knowledgeDecision.dataQualityRisks}
                />
                <TextField
                  disabled={stageThreeLocked}
                  label="维护计划"
                  onChange={(value) =>
                    setKnowledgeDecision((current) => ({ ...current, maintenancePlan: value }))
                  }
                  rows={3}
                  value={knowledgeDecision.maintenancePlan}
                />
                <TextField
                  disabled={stageThreeLocked}
                  label="评估计划"
                  onChange={(value) =>
                    setKnowledgeDecision((current) => ({ ...current, evaluationPlan: value }))
                  }
                  rows={3}
                  value={knowledgeDecision.evaluationPlan}
                />
                <TextField
                  disabled={stageThreeLocked}
                  label="阶段四构建准备"
                  onChange={(value) =>
                    setKnowledgeDecision((current) => ({ ...current, stage4BuildPlan: value }))
                  }
                  rows={4}
                  value={knowledgeDecision.stage4BuildPlan}
                />
                <button
                  className="primary-button w-full"
                  disabled={session === null || stageThreeLocked || isSavingKnowledgeDecision}
                  type="submit"
                >
                  <Save aria-hidden size={16} />
                  {isSavingKnowledgeDecision ? "保存中" : "保存知识工程决策"}
                </button>
              </form>

              <div className="mt-4 grid gap-3 border-t border-[color:var(--border)] pt-4">
                {stageThreeDecisionArtifact ? (
                  <p className="text-sm text-[color:var(--muted)]">
                    当前决策 Artifact：{shortId(stageThreeDecisionArtifact.id)}
                  </p>
                ) : null}
                <button
                  className="icon-button w-full"
                  disabled={session === null || stageThreeLocked || isRequestingKnowledgeReview}
                  onClick={handleRequestKnowledgeReview}
                  type="button"
                >
                  <SearchCheck aria-hidden size={16} />
                  {isRequestingKnowledgeReview ? "评审中" : "请求 AI 知识工程决策评审"}
                </button>
                {stageThreeReviewArtifact ? (
                  <KnowledgeReviewSummary artifact={stageThreeReviewArtifact} />
                ) : null}
                <button
                  className="primary-button w-full"
                  disabled={session === null || stageThreeLocked || isCompletingStageThree}
                  onClick={handleCompleteStageThree}
                  type="button"
                >
                  <CheckCircle2 aria-hidden size={16} />
                  {isCompletingStageThree ? "完成中" : "完成阶段三"}
                </button>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-normal text-[color:var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 break-all text-[color:var(--foreground)]">{value}</dd>
    </div>
  );
}

function TextField({
  disabled = false,
  label,
  onChange,
  rows = 3,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  rows?: number;
  value: string;
}) {
  const id = label.replace(/\s+/g, "-");
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        className="field-textarea"
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "accent" | "danger" | "normal";
}) {
  const className =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "accent"
        ? "border-teal-200 bg-teal-50 text-teal-800"
        : "border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--muted)]";
  return <span className={`status-pill ${className}`}>{label}</span>;
}

function ReviewSummary({ artifact }: { artifact: Artifact }) {
  const content = artifact.content_json;
  const keyRisks = stringListValue(content.key_risks);
  const improvements = stringListValue(content.suggested_improvements);
  const aiCallLogId = stringValue(content.ai_call_log_id);
  return (
    <article className="rounded border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label="AI 评审" tone="accent" />
        {aiCallLogId ? (
          <span className="text-xs text-[color:var(--muted)]">AI Log {shortId(aiCallLogId)}</span>
        ) : null}
      </div>
      <p className="mt-2 font-semibold text-[color:var(--foreground)]">
        {stringValue(content.feasibility_judgement) || "未返回可行性判断"}
      </p>
      <p className="mt-2 leading-6 text-[color:var(--muted)]">
        {stringValue(content.review_summary)}
      </p>
      {keyRisks.length > 0 ? (
        <div className="mt-3">
          <p className="font-semibold text-[color:var(--foreground)]">关键风险</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[color:var(--muted)]">
            {keyRisks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {improvements.length > 0 ? (
        <div className="mt-3">
          <p className="font-semibold text-[color:var(--foreground)]">改进建议</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[color:var(--muted)]">
            {improvements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function KnowledgeReviewSummary({ artifact }: { artifact: Artifact }) {
  const content = artifact.content_json;
  const missingKnowledgeRisks = stringListValue(content.missing_knowledge_risks);
  const dataQualityWarnings = stringListValue(content.data_quality_warnings);
  const improvements = stringListValue(content.suggested_improvements);
  const aiCallLogId = stringValue(content.ai_call_log_id);
  return (
    <article className="rounded border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label="AI 决策评审" tone="accent" />
        {aiCallLogId ? (
          <span className="text-xs text-[color:var(--muted)]">AI Log {shortId(aiCallLogId)}</span>
        ) : null}
      </div>
      <p className="mt-2 font-semibold text-[color:var(--foreground)]">
        策略匹配度：{stringValue(content.strategy_fit) || "未返回"}
      </p>
      <p className="mt-1 font-semibold text-[color:var(--foreground)]">
        阶段四准备度：{stringValue(content.stage_4_readiness) || "未返回"}
      </p>
      <p className="mt-2 leading-6 text-[color:var(--muted)]">
        {stringValue(content.review_summary)}
      </p>
      {missingKnowledgeRisks.length > 0 ? (
        <ReviewList title="知识缺口风险" items={missingKnowledgeRisks} />
      ) : null}
      {dataQualityWarnings.length > 0 ? (
        <ReviewList title="数据质量警示" items={dataQualityWarnings} />
      ) : null}
      {improvements.length > 0 ? <ReviewList title="改进建议" items={improvements} /> : null}
    </article>
  );
}

function ReviewList({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="mt-3">
      <p className="font-semibold text-[color:var(--foreground)]">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-[color:var(--muted)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function lines(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function artifactDescription(artifact: Artifact): string {
  if (artifact.artifact_type === "stage_1_interview_turn") {
    return [
      stringValue(artifact.content_json.user_message),
      stringValue(artifact.content_json.ai_customer_response),
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (artifact.artifact_type === "stage_1_problem_summary") {
    return stringValue(artifact.content_json.problem_statement);
  }

  if (artifact.artifact_type === "stage_2_solution_definition") {
    return [
      stringValue(artifact.content_json.solution_title),
      stringValue(artifact.content_json.problem_summary),
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (artifact.artifact_type === "stage_2_ai_review") {
    return [
      stringValue(artifact.content_json.feasibility_judgement),
      stringValue(artifact.content_json.review_summary),
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (artifact.artifact_type === "stage_3_knowledge_decision") {
    return [
      stringValue(artifact.content_json.knowledge_goal),
      stringValue(artifact.content_json.selected_strategy),
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (artifact.artifact_type === "stage_3_ai_review") {
    return [
      stringValue(artifact.content_json.strategy_fit),
      stringValue(artifact.content_json.stage_4_readiness),
      stringValue(artifact.content_json.review_summary),
    ]
      .filter(Boolean)
      .join(" / ");
  }

  return JSON.stringify(artifact.content_json);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringListValue(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function stageLabel(stageKey: string): string {
  const labels: Record<string, string> = {
    stage_1: "阶段一",
    stage_2: "阶段二",
    stage_3: "阶段三",
    stage_4: "阶段四",
    stage_5: "阶段五",
  };
  return `${labels[stageKey] ?? stageKey} · ${stageKey}`;
}

function stageTone(status: string | undefined): "accent" | "danger" | "normal" {
  if (status === "completed" || status === "in_practice" || status === "not_started") {
    return "accent";
  }
  if (status === "revision_required") {
    return "danger";
  }
  return "normal";
}
