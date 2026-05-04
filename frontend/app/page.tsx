"use client";

import { LogOut } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useMemo, useState } from "react";

import { ArtifactList } from "@/src/components/student-workspace/artifact-list";
import { StatusPill } from "@/src/components/student-workspace/common";
import {
  initialStageFourDifyImplementation,
  initialStageFourTestReport,
  initialStageFiveAcceptancePackage,
  initialStageFiveDeliveryDocument,
  initialStageFiveOperationsGuide,
  initialKnowledgeDecision,
  initialSolution,
  initialSummary,
} from "@/src/components/student-workspace/defaults";
import {
  StageOneInterviewPanel,
  StageOneSummaryPanel,
} from "@/src/components/student-workspace/stage-one";
import { StageFivePanel } from "@/src/components/student-workspace/stage-five";
import { StageFourPanel } from "@/src/components/student-workspace/stage-four";
import { StageThreePanel } from "@/src/components/student-workspace/stage-three";
import { StageTwoPanel } from "@/src/components/student-workspace/stage-two";
import type {
  KnowledgeDecisionFormState,
  InterviewTurn,
  StageFourDifyImplementationFormState,
  StageFiveAcceptancePackageFormState,
  StageFiveDeliveryDocumentFormState,
  StageFiveOperationsGuideFormState,
  StageFourTestReportFormState,
  SolutionFormState,
  SummaryFormState,
} from "@/src/components/student-workspace/types";
import { lines, shortId } from "@/src/components/student-workspace/utils";
import { LoginPanel, WorkspacePanel } from "@/src/components/student-workspace/workspace-panels";
import {
  askStageOneCustomer,
  completeStageFive,
  completeStageFour,
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
  requestStageFourAiTestReview,
  requestStageFiveAiDeliveryReview,
  saveStageOneSummary,
  saveStageThreeKnowledgeDecision,
  saveStageFourDifyImplementation,
  saveStageFourTestReport,
  saveStageFiveAcceptancePackage,
  saveStageFiveDeliveryDocument,
  saveStageFiveOperationsGuide,
  saveStageTwoSolutionDefinition,
  type Artifact,
  type Course,
  type CurrentUser,
  type ExperimentSession,
  type StageFourTestCase,
  type StageFourTestCaseResult,
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
  const [stageFourArtifacts, setStageFourArtifacts] = useState<Artifact[]>([]);
  const [stageFiveArtifacts, setStageFiveArtifacts] = useState<Artifact[]>([]);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [message, setMessage] = useState("当前质检流程最大的痛点是什么？");
  const [summary, setSummary] = useState<SummaryFormState>(initialSummary);
  const [solution, setSolution] = useState<SolutionFormState>(initialSolution);
  const [knowledgeDecision, setKnowledgeDecision] =
    useState<KnowledgeDecisionFormState>(initialKnowledgeDecision);
  const [difyImplementation, setDifyImplementation] =
    useState<StageFourDifyImplementationFormState>(initialStageFourDifyImplementation);
  const [stageFourTestReport, setStageFourTestReport] =
    useState<StageFourTestReportFormState>(initialStageFourTestReport);
  const [stageFiveDeliveryDocument, setStageFiveDeliveryDocument] =
    useState<StageFiveDeliveryDocumentFormState>(initialStageFiveDeliveryDocument);
  const [stageFiveAcceptancePackage, setStageFiveAcceptancePackage] =
    useState<StageFiveAcceptancePackageFormState>(initialStageFiveAcceptancePackage);
  const [stageFiveOperationsGuide, setStageFiveOperationsGuide] =
    useState<StageFiveOperationsGuideFormState>(initialStageFiveOperationsGuide);
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
  const [isSavingDifyImplementation, setIsSavingDifyImplementation] = useState(false);
  const [isSavingStageFourTestReport, setIsSavingStageFourTestReport] = useState(false);
  const [isRequestingStageFourReview, setIsRequestingStageFourReview] = useState(false);
  const [isCompletingStageFour, setIsCompletingStageFour] = useState(false);
  const [isSavingStageFiveDeliveryDocument, setIsSavingStageFiveDeliveryDocument] =
    useState(false);
  const [isSavingStageFiveAcceptancePackage, setIsSavingStageFiveAcceptancePackage] =
    useState(false);
  const [isSavingStageFiveOperationsGuide, setIsSavingStageFiveOperationsGuide] = useState(false);
  const [isRequestingStageFiveReview, setIsRequestingStageFiveReview] = useState(false);
  const [isCompletingStageFive, setIsCompletingStageFive] = useState(false);

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
  const stageFourRecord = useMemo(
    () => session?.stage_records.find((record) => record.stage_key === "stage_4") ?? null,
    [session],
  );
  const stageFiveRecord = useMemo(
    () => session?.stage_records.find((record) => record.stage_key === "stage_5") ?? null,
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
  const stageFourDifyImplementationArtifact = useMemo(
    () =>
      stageFourArtifacts.find(
        (artifact) => artifact.artifact_type === "stage_4_dify_implementation",
      ) ?? null,
    [stageFourArtifacts],
  );
  const stageFourTestReportArtifact = useMemo(
    () =>
      stageFourArtifacts.find((artifact) => artifact.artifact_type === "stage_4_test_report") ??
      null,
    [stageFourArtifacts],
  );
  const stageFourAiReviewArtifact = useMemo(
    () =>
      stageFourArtifacts.find(
        (artifact) => artifact.artifact_type === "stage_4_ai_test_review",
      ) ?? null,
    [stageFourArtifacts],
  );
  const stageFiveDeliveryDocumentArtifact = useMemo(
    () =>
      stageFiveArtifacts.find(
        (artifact) => artifact.artifact_type === "stage_5_delivery_document",
      ) ?? null,
    [stageFiveArtifacts],
  );
  const stageFiveAcceptancePackageArtifact = useMemo(
    () =>
      stageFiveArtifacts.find(
        (artifact) => artifact.artifact_type === "stage_5_acceptance_package",
      ) ?? null,
    [stageFiveArtifacts],
  );
  const stageFiveOperationsGuideArtifact = useMemo(
    () =>
      stageFiveArtifacts.find(
        (artifact) => artifact.artifact_type === "stage_5_operations_guide",
      ) ?? null,
    [stageFiveArtifacts],
  );
  const stageFiveAiReviewArtifact = useMemo(
    () =>
      stageFiveArtifacts.find(
        (artifact) => artifact.artifact_type === "stage_5_ai_delivery_review",
      ) ?? null,
    [stageFiveArtifacts],
  );
  const artifactCount =
    stageOneArtifacts.length +
    stageTwoArtifacts.length +
    stageThreeArtifacts.length +
    stageFourArtifacts.length +
    stageFiveArtifacts.length;
  const sessionReady = session !== null;
  const stageTwoLocked = stageTwoRecord?.status === "locked";
  const stageThreeLocked = stageThreeRecord?.status === "locked" || stageThreeRecord === null;
  const stageFourLocked = stageFourRecord?.status === "locked" || stageFourRecord === null;
  const stageFiveLocked = stageFiveRecord?.status === "locked" || stageFiveRecord === null;

  const refreshArtifacts = useCallback(async (authToken: string, sessionId: string) => {
    const [
      nextStageOneArtifacts,
      nextStageTwoArtifacts,
      nextStageThreeArtifacts,
      nextStageFourArtifacts,
      nextStageFiveArtifacts,
    ] = await Promise.all([
      listStageOneArtifacts(authToken, sessionId),
      listStageArtifacts(authToken, sessionId, "stage_2"),
      listStageArtifacts(authToken, sessionId, "stage_3"),
      listStageArtifacts(authToken, sessionId, "stage_4"),
      listStageArtifacts(authToken, sessionId, "stage_5"),
    ]);
    setStageOneArtifacts(nextStageOneArtifacts);
    setStageTwoArtifacts(nextStageTwoArtifacts);
    setStageThreeArtifacts(nextStageThreeArtifacts);
    setStageFourArtifacts(nextStageFourArtifacts);
    setStageFiveArtifacts(nextStageFiveArtifacts);
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
          setStageFourArtifacts([]);
          setStageFiveArtifacts([]);
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
    setStageFourArtifacts([]);
    setStageFiveArtifacts([]);
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

  async function handleSaveDifyImplementation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (token === null || course === null || session === null || stageFourLocked) {
      return;
    }

    setIsSavingDifyImplementation(true);
    setErrorMessage("");
    setStatusMessage("正在保存阶段四 Dify 实现记录");
    try {
      const difyAppId = difyImplementation.difyAppId.trim();
      const result = await saveStageFourDifyImplementation(token, session.id, {
        dify_app_name: difyImplementation.difyAppName.trim(),
        dify_app_url: difyImplementation.difyAppUrl.trim(),
        ...(difyAppId ? { dify_app_id: difyAppId } : {}),
        app_mode: difyImplementation.appMode,
        knowledge_base_notes: difyImplementation.knowledgeBaseNotes.trim(),
        prompt_or_instruction_notes: difyImplementation.promptOrInstructionNotes.trim(),
        tool_configuration_notes: difyImplementation.toolConfigurationNotes.trim(),
        implementation_notes: difyImplementation.implementationNotes.trim(),
        known_limitations: lines(difyImplementation.knownLimitations),
      });
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage(`阶段四 Dify 实现记录已保存：${shortId(result.artifact.id)}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段四 Dify 实现记录保存失败");
      setStatusMessage("阶段四 Dify 实现记录保存失败");
    } finally {
      setIsSavingDifyImplementation(false);
    }
  }

  async function handleSaveStageFourTestReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (token === null || course === null || session === null || stageFourLocked) {
      return;
    }

    setIsSavingStageFourTestReport(true);
    setErrorMessage("");
    setStatusMessage("正在保存阶段四测试报告");
    try {
      const result = await saveStageFourTestReport(token, session.id, {
        test_goal: stageFourTestReport.testGoal.trim(),
        test_cases: parseStageFourTestCases(stageFourTestReport.testCases),
        observed_failures: lines(stageFourTestReport.observedFailures),
        improvement_actions: lines(stageFourTestReport.improvementActions),
        overall_result: stageFourTestReport.overallResult,
      });
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage(`阶段四测试报告已保存：${shortId(result.artifact.id)}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段四测试报告保存失败");
      setStatusMessage("阶段四测试报告保存失败");
    } finally {
      setIsSavingStageFourTestReport(false);
    }
  }

  async function handleRequestStageFourReview() {
    if (token === null || course === null || session === null || stageFourLocked) {
      return;
    }

    setIsRequestingStageFourReview(true);
    setErrorMessage("");
    setStatusMessage("正在请求阶段四 AI 测试反馈");
    try {
      const result = await requestStageFourAiTestReview(token, session.id);
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage(
        `阶段四 AI 测试反馈已生成${
          result.ai_call_log_id ? `：AI Log ${shortId(result.ai_call_log_id)}` : ""
        }`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段四 AI 测试反馈失败");
      setStatusMessage("阶段四 AI 测试反馈失败");
    } finally {
      setIsRequestingStageFourReview(false);
    }
  }

  async function handleCompleteStageFour() {
    if (token === null || course === null || session === null || stageFourLocked) {
      return;
    }

    setIsCompletingStageFour(true);
    setErrorMessage("");
    setStatusMessage("正在完成阶段四");
    try {
      await completeStageFour(token, session.id);
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage("阶段四已完成，阶段五已解锁");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段四完成失败");
      setStatusMessage("阶段四完成失败");
    } finally {
      setIsCompletingStageFour(false);
    }
  }

  async function handleSaveStageFiveDeliveryDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (token === null || course === null || session === null || stageFiveLocked) {
      return;
    }

    setIsSavingStageFiveDeliveryDocument(true);
    setErrorMessage("");
    setStatusMessage("正在保存阶段五交付说明");
    try {
      const result = await saveStageFiveDeliveryDocument(token, session.id, {
        project_name: stageFiveDeliveryDocument.projectName.trim(),
        final_agent_url: stageFiveDeliveryDocument.finalAgentUrl.trim(),
        delivery_summary: stageFiveDeliveryDocument.deliverySummary.trim(),
        core_features: lines(stageFiveDeliveryDocument.coreFeatures),
        target_users: lines(stageFiveDeliveryDocument.targetUsers),
        usage_instructions: stageFiveDeliveryDocument.usageInstructions.trim(),
        known_limitations: lines(stageFiveDeliveryDocument.knownLimitations),
      });
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage(`阶段五交付说明已保存：${shortId(result.artifact.id)}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段五交付说明保存失败");
      setStatusMessage("阶段五交付说明保存失败");
    } finally {
      setIsSavingStageFiveDeliveryDocument(false);
    }
  }

  async function handleSaveStageFiveAcceptancePackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (token === null || course === null || session === null || stageFiveLocked) {
      return;
    }

    setIsSavingStageFiveAcceptancePackage(true);
    setErrorMessage("");
    setStatusMessage("正在保存阶段五验收材料");
    try {
      const result = await saveStageFiveAcceptancePackage(token, session.id, {
        acceptance_scope: stageFiveAcceptancePackage.acceptanceScope.trim(),
        acceptance_criteria: lines(stageFiveAcceptancePackage.acceptanceCriteria),
        test_evidence_summary: stageFiveAcceptancePackage.testEvidenceSummary.trim(),
        unresolved_issues: lines(stageFiveAcceptancePackage.unresolvedIssues),
        handover_checklist: lines(stageFiveAcceptancePackage.handoverChecklist),
      });
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage(`阶段五验收材料已保存：${shortId(result.artifact.id)}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段五验收材料保存失败");
      setStatusMessage("阶段五验收材料保存失败");
    } finally {
      setIsSavingStageFiveAcceptancePackage(false);
    }
  }

  async function handleSaveStageFiveOperationsGuide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (token === null || course === null || session === null || stageFiveLocked) {
      return;
    }

    setIsSavingStageFiveOperationsGuide(true);
    setErrorMessage("");
    setStatusMessage("正在保存阶段五运维说明");
    try {
      const result = await saveStageFiveOperationsGuide(token, session.id, {
        runtime_dependencies: lines(stageFiveOperationsGuide.runtimeDependencies),
        data_update_plan: stageFiveOperationsGuide.dataUpdatePlan.trim(),
        monitoring_plan: stageFiveOperationsGuide.monitoringPlan.trim(),
        common_issues: lines(stageFiveOperationsGuide.commonIssues),
        maintenance_owner_notes: stageFiveOperationsGuide.maintenanceOwnerNotes.trim(),
      });
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage(`阶段五运维说明已保存：${shortId(result.artifact.id)}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段五运维说明保存失败");
      setStatusMessage("阶段五运维说明保存失败");
    } finally {
      setIsSavingStageFiveOperationsGuide(false);
    }
  }

  async function handleRequestStageFiveReview() {
    if (token === null || course === null || session === null || stageFiveLocked) {
      return;
    }

    setIsRequestingStageFiveReview(true);
    setErrorMessage("");
    setStatusMessage("正在请求阶段五 AI 交付审阅");
    try {
      const result = await requestStageFiveAiDeliveryReview(token, session.id);
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage(
        `阶段五 AI 交付审阅已生成${
          result.ai_call_log_id ? `：AI Log ${shortId(result.ai_call_log_id)}` : ""
        }`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段五 AI 交付审阅失败");
      setStatusMessage("阶段五 AI 交付审阅失败");
    } finally {
      setIsRequestingStageFiveReview(false);
    }
  }

  async function handleCompleteStageFive() {
    if (token === null || course === null || session === null || stageFiveLocked) {
      return;
    }

    setIsCompletingStageFive(true);
    setErrorMessage("");
    setStatusMessage("正在完成阶段五");
    try {
      const result = await completeStageFive(token, session.id);
      await refreshSessionAndArtifacts(token, course.id, session.id);
      setStatusMessage(`阶段五已完成，Session ${result.session_status}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段五完成失败");
      setStatusMessage("阶段五完成失败");
    } finally {
      setIsCompletingStageFive(false);
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

  function handleDifyImplementationChange(patch: Partial<StageFourDifyImplementationFormState>) {
    setDifyImplementation((current) => ({ ...current, ...patch }));
  }

  function handleStageFourTestReportChange(patch: Partial<StageFourTestReportFormState>) {
    setStageFourTestReport((current) => ({ ...current, ...patch }));
  }

  function handleStageFiveDeliveryDocumentChange(
    patch: Partial<StageFiveDeliveryDocumentFormState>,
  ) {
    setStageFiveDeliveryDocument((current) => ({ ...current, ...patch }));
  }

  function handleStageFiveAcceptancePackageChange(
    patch: Partial<StageFiveAcceptancePackageFormState>,
  ) {
    setStageFiveAcceptancePackage((current) => ({ ...current, ...patch }));
  }

  function handleStageFiveOperationsGuideChange(
    patch: Partial<StageFiveOperationsGuideFormState>,
  ) {
    setStageFiveOperationsGuide((current) => ({ ...current, ...patch }));
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--border)] bg-[color:var(--surface)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">
              EduFDE 阶段一 / 二 / 三 / 四 / 五联调
            </h1>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              需求访谈、方案定义、知识工程决策、Dify 实现测试与交付闭环 · API {apiBaseUrl}
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
            <ArtifactList
              artifacts={stageFourArtifacts}
              description="保存 Dify 实现记录、测试报告和 AI 测试反馈后会出现在这里。"
              emptyLabel="暂无阶段四 Artifact"
              status={stageFourRecord?.status ?? "locked"}
              title="阶段四 Artifact"
            />
            <ArtifactList
              artifacts={stageFiveArtifacts}
              description="保存交付说明、验收材料、运维说明和 AI 交付审阅后会出现在这里。"
              emptyLabel="暂无阶段五 Artifact"
              status={stageFiveRecord?.status ?? "locked"}
              title="阶段五 Artifact"
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
            <StageFourPanel
              aiReviewArtifact={stageFourAiReviewArtifact}
              difyImplementation={difyImplementation}
              difyImplementationArtifact={stageFourDifyImplementationArtifact}
              isCompletingStageFour={isCompletingStageFour}
              isRequestingAiReview={isRequestingStageFourReview}
              isSavingDifyImplementation={isSavingDifyImplementation}
              isSavingTestReport={isSavingStageFourTestReport}
              locked={stageFourLocked}
              onCompleteStageFour={handleCompleteStageFour}
              onDifyImplementationChange={handleDifyImplementationChange}
              onRequestAiReview={handleRequestStageFourReview}
              onSaveDifyImplementation={handleSaveDifyImplementation}
              onSaveTestReport={handleSaveStageFourTestReport}
              onTestReportChange={handleStageFourTestReportChange}
              sessionReady={sessionReady}
              stageStatus={stageFourRecord?.status}
              testReport={stageFourTestReport}
              testReportArtifact={stageFourTestReportArtifact}
            />
            <StageFivePanel
              acceptancePackage={stageFiveAcceptancePackage}
              acceptancePackageArtifact={stageFiveAcceptancePackageArtifact}
              aiReviewArtifact={stageFiveAiReviewArtifact}
              deliveryDocument={stageFiveDeliveryDocument}
              deliveryDocumentArtifact={stageFiveDeliveryDocumentArtifact}
              isCompletingStageFive={isCompletingStageFive}
              isRequestingAiReview={isRequestingStageFiveReview}
              isSavingAcceptancePackage={isSavingStageFiveAcceptancePackage}
              isSavingDeliveryDocument={isSavingStageFiveDeliveryDocument}
              isSavingOperationsGuide={isSavingStageFiveOperationsGuide}
              locked={stageFiveLocked}
              onAcceptancePackageChange={handleStageFiveAcceptancePackageChange}
              onCompleteStageFive={handleCompleteStageFive}
              onDeliveryDocumentChange={handleStageFiveDeliveryDocumentChange}
              onOperationsGuideChange={handleStageFiveOperationsGuideChange}
              onRequestAiReview={handleRequestStageFiveReview}
              onSaveAcceptancePackage={handleSaveStageFiveAcceptancePackage}
              onSaveDeliveryDocument={handleSaveStageFiveDeliveryDocument}
              onSaveOperationsGuide={handleSaveStageFiveOperationsGuide}
              operationsGuide={stageFiveOperationsGuide}
              operationsGuideArtifact={stageFiveOperationsGuideArtifact}
              sessionReady={sessionReady}
              sessionStatus={session?.status}
              stageStatus={stageFiveRecord?.status}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function parseStageFourTestCases(value: string): StageFourTestCase[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("测试用例 JSON 格式不正确");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("测试用例 JSON 必须是非空数组");
  }

  return parsed.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`第 ${index + 1} 条测试用例必须是对象`);
    }
    const result = stringField(item, "result");
    if (!isStageFourTestCaseResult(result)) {
      throw new Error(`第 ${index + 1} 条测试用例 result 必须是 passed / failed / partial`);
    }
    const notes = stringField(item, "notes", false);
    return {
      scenario: stringField(item, "scenario"),
      input: stringField(item, "input"),
      expected_output: stringField(item, "expected_output"),
      actual_output: stringField(item, "actual_output"),
      result,
      ...(notes ? { notes } : {}),
    };
  });
}

function stringField(
  value: Record<string, unknown>,
  key: string,
  required = true,
): string {
  const fieldValue = value[key];
  const normalized = typeof fieldValue === "string" ? fieldValue.trim() : "";
  if (required && normalized.length === 0) {
    throw new Error(`测试用例字段 ${key} 不能为空`);
  }
  return normalized;
}

function isStageFourTestCaseResult(value: string): value is StageFourTestCaseResult {
  return value === "passed" || value === "failed" || value === "partial";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
