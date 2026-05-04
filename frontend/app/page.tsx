"use client";

import { LogOut } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useMemo, useState } from "react";

import { ArtifactList } from "@/src/components/student-workspace/artifact-list";
import { StatusPill } from "@/src/components/student-workspace/common";
import {
  initialKnowledgeDecision,
  initialSolution,
  initialSummary,
} from "@/src/components/student-workspace/defaults";
import {
  StageOneInterviewPanel,
  StageOneSummaryPanel,
} from "@/src/components/student-workspace/stage-one";
import { StageThreePanel } from "@/src/components/student-workspace/stage-three";
import { StageTwoPanel } from "@/src/components/student-workspace/stage-two";
import type {
  KnowledgeDecisionFormState,
  InterviewTurn,
  SolutionFormState,
  SummaryFormState,
} from "@/src/components/student-workspace/types";
import { lines, shortId } from "@/src/components/student-workspace/utils";
import { LoginPanel, WorkspacePanel } from "@/src/components/student-workspace/workspace-panels";
import {
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
  type Artifact,
  type Course,
  type CurrentUser,
  type ExperimentSession,
} from "@/src/lib/api";
import { apiBaseUrl } from "@/src/lib/config";

const tokenStorageKey = "edufde_access_token";
const demoCourseCode = "MFG-QA-DEMO";
const demoStudentEmail = "student@edufde.demo";
const demoPassword = "EduFDE-demo-123";

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
  const artifactCount =
    stageOneArtifacts.length + stageTwoArtifacts.length + stageThreeArtifacts.length;
  const sessionReady = session !== null;
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
        let activeSession = sessions.find((item) => item.course_id === targetCourse.id) ?? null;

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

  function handleSummaryChange(patch: Partial<SummaryFormState>) {
    setSummary((current) => ({ ...current, ...patch }));
  }

  function handleSolutionChange(patch: Partial<SolutionFormState>) {
    setSolution((current) => ({ ...current, ...patch }));
  }

  function handleKnowledgeDecisionChange(patch: Partial<KnowledgeDecisionFormState>) {
    setKnowledgeDecision((current) => ({ ...current, ...patch }));
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
          <LoginPanel
            email={email}
            isLoggingIn={isLoggingIn}
            onEmailChange={setEmail}
            onLogin={handleLogin}
            onPasswordChange={setPassword}
            password={password}
          />
          <WorkspacePanel
            artifactCount={artifactCount}
            course={course}
            coursesCount={courses.length}
            errorMessage={errorMessage}
            isBootstrapping={isBootstrapping}
            onRefresh={handleRefreshWorkspace}
            session={session}
            token={token}
            user={user}
          />
        </aside>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <StageOneInterviewPanel
              isSending={isSending}
              message={message}
              onMessageChange={setMessage}
              onSendMessage={handleSendMessage}
              sessionReady={sessionReady}
              turns={turns}
            />
            <ArtifactList
              artifacts={stageOneArtifacts}
              emptyLabel="暂无 Artifact"
              title="阶段一 Artifact"
            />
            <ArtifactList
              artifacts={stageTwoArtifacts}
              description="保存方案定义和 AI 可行性评审后会出现在这里。"
              emptyLabel="暂无阶段二 Artifact"
              status={stageTwoRecord?.status ?? "locked"}
              title="阶段二 Artifact"
            />
            <ArtifactList
              artifacts={stageThreeArtifacts}
              description="保存知识工程决策和 AI 决策评审后会出现在这里。"
              emptyLabel="暂无阶段三 Artifact"
              status={stageThreeRecord?.status ?? "locked"}
              title="阶段三 Artifact"
            />
          </div>

          <div className="space-y-5">
            <StageOneSummaryPanel
              isCompletingStageOne={isCompletingStageOne}
              isSavingSummary={isSavingSummary}
              onCompleteStageOne={handleCompleteStageOne}
              onSaveSummary={handleSaveSummary}
              onSummaryChange={handleSummaryChange}
              sessionReady={sessionReady}
              stageStatus={stageOneRecord?.status}
              summary={summary}
            />
            <StageTwoPanel
              isCompletingStageTwo={isCompletingStageTwo}
              isRequestingReview={isRequestingReview}
              isSavingSolution={isSavingSolution}
              locked={stageTwoLocked}
              onCompleteStageTwo={handleCompleteStageTwo}
              onRequestReview={handleRequestReview}
              onSaveSolution={handleSaveSolution}
              onSolutionChange={handleSolutionChange}
              reviewArtifact={stageTwoReviewArtifact}
              sessionReady={sessionReady}
              solution={solution}
              solutionArtifact={stageTwoSolutionArtifact}
              stageStatus={stageTwoRecord?.status}
            />
            <StageThreePanel
              decision={knowledgeDecision}
              decisionArtifact={stageThreeDecisionArtifact}
              isCompletingStageThree={isCompletingStageThree}
              isRequestingKnowledgeReview={isRequestingKnowledgeReview}
              isSavingKnowledgeDecision={isSavingKnowledgeDecision}
              locked={stageThreeLocked}
              onCompleteStageThree={handleCompleteStageThree}
              onDecisionChange={handleKnowledgeDecisionChange}
              onRequestKnowledgeReview={handleRequestKnowledgeReview}
              onSaveKnowledgeDecision={handleSaveKnowledgeDecision}
              reviewArtifact={stageThreeReviewArtifact}
              sessionReady={sessionReady}
              stageStatus={stageThreeRecord?.status}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
