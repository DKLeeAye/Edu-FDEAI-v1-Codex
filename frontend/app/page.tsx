"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/src/components/student-product/app-shell";
import { CourseList } from "@/src/components/student-product/course-list";
import { ExperimentWorkspace } from "@/src/components/student-product/experiment-workspace";
import { LearningProfileView } from "@/src/components/student-product/learning-profile-view";
import { LoginScreen, type DemoRole } from "@/src/components/student-product/login-screen";
import { ProjectPortfolioView } from "@/src/components/student-product/project-portfolio-view";
import {
  pickActiveStageKey,
  roleCopy,
  stageKeys,
  type StageKey,
} from "@/src/components/student-product/terminology";
import { EmptyState, StatusBadge } from "@/src/components/student-product/ui";
import {
  askStageOneCustomer,
  completeStageFive,
  completeStageFour,
  completeStageOne,
  completeStageThree,
  completeStageTwo,
  createExperimentSession,
  getCurrentUser,
  getLearningProfile,
  listCourses,
  listExperimentSessions,
  listStageArtifacts,
  login,
  requestStageTwoAiReview,
  requestStageFiveAiDeliveryReview,
  requestStageFourAiTestReview,
  requestStageThreeAiReview,
  saveStageFiveAcceptancePackage,
  saveStageFiveDeliveryDocument,
  saveStageFiveOperationsGuide,
  saveStageFourDifyImplementation,
  saveStageFourTestReport,
  saveStageOneSummary,
  saveStageThreeKnowledgeDecision,
  saveStageTwoSolutionDefinition,
  type Artifact,
  type Course,
  type CurrentUser,
  type ExperimentSession,
  type LearningProfile,
  type StageOneSummaryPayload,
  type StageFiveAcceptancePackagePayload,
  type StageFiveDeliveryDocumentPayload,
  type StageFiveOperationsGuidePayload,
  type StageFourDifyImplementationPayload,
  type StageFourTestReportPayload,
  type StageThreeKnowledgeDecisionPayload,
  type StageTwoSolutionDefinitionPayload,
} from "@/src/lib/api";

type ProductView = "courses" | "workspace" | "profile" | "portfolio" | "unsupported";
type ArtifactsByStage = Record<StageKey, Artifact[]>;

const tokenStorageKey = "edufde_access_token";
const demoPassword = "EduFDE-demo-123";

const demoAccounts: Record<DemoRole, { email: string; password: string }> = {
  student: { email: "student@edufde.demo", password: demoPassword },
  teacher: { email: "teacher@edufde.demo", password: demoPassword },
  admin: { email: "admin@edufde.demo", password: demoPassword },
};

export default function Home() {
  const [selectedRole, setSelectedRole] = useState<DemoRole>("student");
  const [email, setEmail] = useState(demoAccounts.student.email);
  const [password, setPassword] = useState(demoAccounts.student.password);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [view, setView] = useState<ProductView>("courses");
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<ExperimentSession[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSession, setSelectedSession] = useState<ExperimentSession | null>(null);
  const [artifactsByStage, setArtifactsByStage] = useState<ArtifactsByStage>(createEmptyArtifacts);
  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);
  const [activeStageKey, setActiveStageKey] = useState<StageKey>("stage_1");
  const [statusMessage, setStatusMessage] = useState("等待登录");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isEnteringProject, setIsEnteringProject] = useState(false);
  const [isSendingStageOneInterview, setIsSendingStageOneInterview] = useState(false);
  const [isSavingStageOneSummary, setIsSavingStageOneSummary] = useState(false);
  const [isCompletingStageOne, setIsCompletingStageOne] = useState(false);
  const [isSavingStageTwoSolution, setIsSavingStageTwoSolution] = useState(false);
  const [isRequestingStageTwoReview, setIsRequestingStageTwoReview] = useState(false);
  const [isCompletingStageTwo, setIsCompletingStageTwo] = useState(false);
  const [isSavingStageThreeDecision, setIsSavingStageThreeDecision] = useState(false);
  const [isRequestingStageThreeReview, setIsRequestingStageThreeReview] = useState(false);
  const [isCompletingStageThree, setIsCompletingStageThree] = useState(false);
  const [isSavingStageFourImplementation, setIsSavingStageFourImplementation] = useState(false);
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
  const didRestoreToken = useRef(false);

  const selectedSessionId = selectedSession?.id ?? null;

  const loadWorkspaceData = useCallback(async (
    authToken: string,
    targetSession: ExperimentSession,
    nextActiveStageKey?: StageKey,
  ) => {
    const [stageArtifacts, profile] = await Promise.all([
      Promise.all(
        stageKeys.map(async (stageKey) => [stageKey, await listStageArtifacts(authToken, targetSession.id, stageKey)] as const),
      ),
      getLearningProfile(authToken, targetSession.id),
    ]);

    const nextArtifacts = createEmptyArtifacts();
    for (const [stageKey, artifacts] of stageArtifacts) {
      nextArtifacts[stageKey] = artifacts;
    }

    setArtifactsByStage(nextArtifacts);
    setLearningProfile(profile);
    setActiveStageKey(nextActiveStageKey ?? pickActiveStageKey(targetSession));
  }, []);

  const refreshOpenSession = useCallback(
    async (authToken: string, sessionId: string, nextActiveStageKey?: StageKey) => {
      const nextSessions = await listExperimentSessions(authToken);
      setSessions(nextSessions);
      const nextSession = nextSessions.find((session) => session.id === sessionId) ?? null;
      if (!nextSession) {
        setSelectedSession(null);
        setArtifactsByStage(createEmptyArtifacts());
        setLearningProfile(null);
        return null;
      }

      setSelectedSession(nextSession);
      await loadWorkspaceData(authToken, nextSession, nextActiveStageKey);
      return nextSession;
    },
    [loadWorkspaceData],
  );

  const bootstrapWorkspace = useCallback(
    async (authToken: string, preferredSessionId?: string | null) => {
      setIsBootstrapping(true);
      setErrorMessage("");
      setStatusMessage("正在加载工作区");
      try {
        const currentUser = await getCurrentUser(authToken);
        setUser(currentUser);

        if (currentUser.role !== "student") {
          setCourses([]);
          setSessions([]);
          setSelectedCourse(null);
          setSelectedSession(null);
          setArtifactsByStage(createEmptyArtifacts());
          setLearningProfile(null);
          setView("unsupported");
          setStatusMessage(`${roleCopy(currentUser.role)}工作区待产品化`);
          return;
        }

        const [nextCourses, nextSessions] = await Promise.all([
          listCourses(authToken),
          listExperimentSessions(authToken),
        ]);
        setCourses(nextCourses);
        setSessions(nextSessions);

        const preferredSession =
          nextSessions.find((session) => session.id === preferredSessionId) ??
          nextSessions.find((session) => session.id === selectedSessionId) ??
          null;

        if (preferredSession) {
          const course =
            nextCourses.find((item) => item.id === preferredSession.course_id) ?? null;
          setSelectedCourse(course);
          setSelectedSession(preferredSession);
          setView("workspace");
          await loadWorkspaceData(authToken, preferredSession);
          setStatusMessage("实验项目已同步");
          return;
        }

        setSelectedCourse(null);
        setSelectedSession(null);
        setArtifactsByStage(createEmptyArtifacts());

        if (nextSessions[0]) {
          const profile = await getLearningProfile(authToken, nextSessions[0].id);
          setLearningProfile(profile);
        } else {
          setLearningProfile(null);
        }
        setView("courses");
        setStatusMessage("实验课程已就绪");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "加载失败");
        setStatusMessage("加载失败");
      } finally {
        setIsBootstrapping(false);
      }
    },
    [loadWorkspaceData, selectedSessionId],
  );

  useEffect(() => {
    if (didRestoreToken.current) {
      return;
    }
    didRestoreToken.current = true;
    const storedToken = window.localStorage.getItem(tokenStorageKey);
    if (storedToken) {
      queueMicrotask(() => {
        setToken(storedToken);
        void bootstrapWorkspace(storedToken);
      });
    }
  }, [bootstrapWorkspace]);

  const currentArea = useMemo(() => {
    if (view === "courses") {
      return "courses";
    }
    if (view === "profile" || view === "portfolio") {
      return view;
    }
    return "workspace";
  }, [view]);

  function handleRoleSelect(role: DemoRole) {
    setSelectedRole(role);
    setEmail(demoAccounts[role].email);
    setPassword(demoAccounts[role].password);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoggingIn(true);
    setErrorMessage("");
    setStatusMessage("正在登录");
    try {
      const result = await login(email.trim(), password);
      window.localStorage.setItem(tokenStorageKey, result.access_token);
      setToken(result.access_token);
      await bootstrapWorkspace(result.access_token);
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
    setView("courses");
    setCourses([]);
    setSessions([]);
    setSelectedCourse(null);
    setSelectedSession(null);
    setArtifactsByStage(createEmptyArtifacts());
    setLearningProfile(null);
    setActiveStageKey("stage_1");
    setIsSendingStageOneInterview(false);
    setIsSavingStageOneSummary(false);
    setIsCompletingStageOne(false);
    setIsSavingStageTwoSolution(false);
    setIsRequestingStageTwoReview(false);
    setIsCompletingStageTwo(false);
    setIsSavingStageThreeDecision(false);
    setIsRequestingStageThreeReview(false);
    setIsCompletingStageThree(false);
    setIsSavingStageFourImplementation(false);
    setIsSavingStageFourTestReport(false);
    setIsRequestingStageFourReview(false);
    setIsCompletingStageFour(false);
    setIsSavingStageFiveDeliveryDocument(false);
    setIsSavingStageFiveAcceptancePackage(false);
    setIsSavingStageFiveOperationsGuide(false);
    setIsRequestingStageFiveReview(false);
    setIsCompletingStageFive(false);
    setStatusMessage("等待登录");
    setErrorMessage("");
  }

  async function handleRefresh() {
    if (!token) {
      return;
    }
    await bootstrapWorkspace(token, view === "workspace" ? selectedSessionId : null);
  }

  async function handleEnterCourse(course: Course) {
    if (!token) {
      return;
    }

    setIsEnteringProject(true);
    setErrorMessage("");
    setStatusMessage("正在进入实验项目");
    try {
      let targetSession = sessions.find((session) => session.course_id === course.id) ?? null;
      if (!targetSession) {
        targetSession = await createExperimentSession(token, course.id);
        setSessions((current) => [targetSession as ExperimentSession, ...current]);
      }
      setSelectedCourse(course);
      setSelectedSession(targetSession);
      setView("workspace");
      await loadWorkspaceData(token, targetSession);
      setStatusMessage("实验项目已打开");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "进入实验项目失败");
      setStatusMessage("进入实验项目失败");
    } finally {
      setIsEnteringProject(false);
    }
  }

  async function handleAskStageOneCustomer(message: string): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSendingStageOneInterview(true);
    setErrorMessage("");
    setStatusMessage("客户正在回应");
    try {
      await askStageOneCustomer(token, selectedSession.id, message);
      await refreshOpenSession(token, selectedSession.id, "stage_1");
      setStatusMessage("客户访谈记录已保存");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "客户访谈提交失败");
      setStatusMessage("客户访谈提交失败");
      return false;
    } finally {
      setIsSendingStageOneInterview(false);
    }
  }

  async function handleSaveStageOneSummary(
    payload: StageOneSummaryPayload,
  ): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSavingStageOneSummary(true);
    setErrorMessage("");
    setStatusMessage("正在保存问题发现总结");
    try {
      await saveStageOneSummary(token, selectedSession.id, payload);
      await refreshOpenSession(token, selectedSession.id, "stage_1");
      setStatusMessage("问题发现总结已保存");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "问题发现总结保存失败");
      setStatusMessage("问题发现总结保存失败");
      return false;
    } finally {
      setIsSavingStageOneSummary(false);
    }
  }

  async function handleCompleteStageOne(): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsCompletingStageOne(true);
    setErrorMessage("");
    setStatusMessage("正在确认阶段一完成");
    try {
      await completeStageOne(token, selectedSession.id);
      await refreshOpenSession(token, selectedSession.id, "stage_1");
      setStatusMessage("阶段一已完成，阶段二已解锁");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段一完成失败");
      setStatusMessage("阶段一完成失败");
      return false;
    } finally {
      setIsCompletingStageOne(false);
    }
  }

  async function handleSaveStageTwoSolution(
    payload: StageTwoSolutionDefinitionPayload,
  ): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSavingStageTwoSolution(true);
    setErrorMessage("");
    setStatusMessage("正在保存方案文档");
    try {
      await saveStageTwoSolutionDefinition(token, selectedSession.id, payload);
      await refreshOpenSession(token, selectedSession.id, "stage_2");
      setStatusMessage("方案文档已保存");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "方案文档保存失败");
      setStatusMessage("方案文档保存失败");
      return false;
    } finally {
      setIsSavingStageTwoSolution(false);
    }
  }

  async function handleRequestStageTwoReview(): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsRequestingStageTwoReview(true);
    setErrorMessage("");
    setStatusMessage("正在生成可行性评审");
    try {
      await requestStageTwoAiReview(token, selectedSession.id);
      await refreshOpenSession(token, selectedSession.id, "stage_2");
      setStatusMessage("可行性评审已生成");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "可行性评审失败");
      setStatusMessage("可行性评审失败");
      return false;
    } finally {
      setIsRequestingStageTwoReview(false);
    }
  }

  async function handleCompleteStageTwo(): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsCompletingStageTwo(true);
    setErrorMessage("");
    setStatusMessage("正在确认阶段二完成");
    try {
      await completeStageTwo(token, selectedSession.id);
      await refreshOpenSession(token, selectedSession.id, "stage_2");
      setStatusMessage("阶段二已完成，阶段三已解锁");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段二完成失败");
      setStatusMessage("阶段二完成失败");
      return false;
    } finally {
      setIsCompletingStageTwo(false);
    }
  }

  async function handleSaveStageThreeDecision(
    payload: StageThreeKnowledgeDecisionPayload,
  ): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSavingStageThreeDecision(true);
    setErrorMessage("");
    setStatusMessage("正在保存知识工程决策");
    try {
      await saveStageThreeKnowledgeDecision(token, selectedSession.id, payload);
      await refreshOpenSession(token, selectedSession.id, "stage_3");
      setStatusMessage("知识工程决策已保存");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "知识工程决策保存失败");
      setStatusMessage("知识工程决策保存失败");
      return false;
    } finally {
      setIsSavingStageThreeDecision(false);
    }
  }

  async function handleRequestStageThreeReview(): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsRequestingStageThreeReview(true);
    setErrorMessage("");
    setStatusMessage("正在生成知识工程评审");
    try {
      await requestStageThreeAiReview(token, selectedSession.id);
      await refreshOpenSession(token, selectedSession.id, "stage_3");
      setStatusMessage("知识工程评审已生成");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "知识工程评审失败");
      setStatusMessage("知识工程评审失败");
      return false;
    } finally {
      setIsRequestingStageThreeReview(false);
    }
  }

  async function handleCompleteStageThree(): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsCompletingStageThree(true);
    setErrorMessage("");
    setStatusMessage("正在确认阶段三完成");
    try {
      await completeStageThree(token, selectedSession.id);
      await refreshOpenSession(token, selectedSession.id, "stage_3");
      setStatusMessage("阶段三已完成，阶段四已解锁");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段三完成失败");
      setStatusMessage("阶段三完成失败");
      return false;
    } finally {
      setIsCompletingStageThree(false);
    }
  }

  async function handleSaveStageFourImplementation(
    payload: StageFourDifyImplementationPayload,
  ): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSavingStageFourImplementation(true);
    setErrorMessage("");
    setStatusMessage("正在保存智能体构建记录");
    try {
      await saveStageFourDifyImplementation(token, selectedSession.id, payload);
      await refreshOpenSession(token, selectedSession.id, "stage_4");
      setStatusMessage("智能体构建记录已保存");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "智能体构建记录保存失败");
      setStatusMessage("智能体构建记录保存失败");
      return false;
    } finally {
      setIsSavingStageFourImplementation(false);
    }
  }

  async function handleSaveStageFourTestReport(
    payload: StageFourTestReportPayload,
  ): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSavingStageFourTestReport(true);
    setErrorMessage("");
    setStatusMessage("正在保存测试报告");
    try {
      await saveStageFourTestReport(token, selectedSession.id, payload);
      await refreshOpenSession(token, selectedSession.id, "stage_4");
      setStatusMessage("测试报告已保存");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "测试报告保存失败");
      setStatusMessage("测试报告保存失败");
      return false;
    } finally {
      setIsSavingStageFourTestReport(false);
    }
  }

  async function handleRequestStageFourReview(): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsRequestingStageFourReview(true);
    setErrorMessage("");
    setStatusMessage("正在生成测试反馈");
    try {
      await requestStageFourAiTestReview(token, selectedSession.id);
      await refreshOpenSession(token, selectedSession.id, "stage_4");
      setStatusMessage("测试反馈已生成");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "测试反馈生成失败");
      setStatusMessage("测试反馈生成失败");
      return false;
    } finally {
      setIsRequestingStageFourReview(false);
    }
  }

  async function handleCompleteStageFour(): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsCompletingStageFour(true);
    setErrorMessage("");
    setStatusMessage("正在确认阶段四完成");
    try {
      await completeStageFour(token, selectedSession.id);
      await refreshOpenSession(token, selectedSession.id, "stage_4");
      setStatusMessage("阶段四已完成，阶段五已解锁");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段四完成失败");
      setStatusMessage("阶段四完成失败");
      return false;
    } finally {
      setIsCompletingStageFour(false);
    }
  }

  async function handleSaveStageFiveDeliveryDocument(
    payload: StageFiveDeliveryDocumentPayload,
  ): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSavingStageFiveDeliveryDocument(true);
    setErrorMessage("");
    setStatusMessage("正在保存交付说明书");
    try {
      await saveStageFiveDeliveryDocument(token, selectedSession.id, payload);
      await refreshOpenSession(token, selectedSession.id, "stage_5");
      setStatusMessage("交付说明书已保存");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "交付说明书保存失败");
      setStatusMessage("交付说明书保存失败");
      return false;
    } finally {
      setIsSavingStageFiveDeliveryDocument(false);
    }
  }

  async function handleSaveStageFiveAcceptancePackage(
    payload: StageFiveAcceptancePackagePayload,
  ): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSavingStageFiveAcceptancePackage(true);
    setErrorMessage("");
    setStatusMessage("正在保存验收记录");
    try {
      await saveStageFiveAcceptancePackage(token, selectedSession.id, payload);
      await refreshOpenSession(token, selectedSession.id, "stage_5");
      setStatusMessage("验收记录已保存");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "验收记录保存失败");
      setStatusMessage("验收记录保存失败");
      return false;
    } finally {
      setIsSavingStageFiveAcceptancePackage(false);
    }
  }

  async function handleSaveStageFiveOperationsGuide(
    payload: StageFiveOperationsGuidePayload,
  ): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSavingStageFiveOperationsGuide(true);
    setErrorMessage("");
    setStatusMessage("正在保存维护说明");
    try {
      await saveStageFiveOperationsGuide(token, selectedSession.id, payload);
      await refreshOpenSession(token, selectedSession.id, "stage_5");
      setStatusMessage("维护说明已保存");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "维护说明保存失败");
      setStatusMessage("维护说明保存失败");
      return false;
    } finally {
      setIsSavingStageFiveOperationsGuide(false);
    }
  }

  async function handleRequestStageFiveReview(): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsRequestingStageFiveReview(true);
    setErrorMessage("");
    setStatusMessage("正在生成交付审阅");
    try {
      await requestStageFiveAiDeliveryReview(token, selectedSession.id);
      await refreshOpenSession(token, selectedSession.id, "stage_5");
      setStatusMessage("交付审阅已生成");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "交付审阅生成失败");
      setStatusMessage("交付审阅生成失败");
      return false;
    } finally {
      setIsRequestingStageFiveReview(false);
    }
  }

  async function handleCompleteStageFive(): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsCompletingStageFive(true);
    setErrorMessage("");
    setStatusMessage("正在完成项目实训");
    try {
      await completeStageFive(token, selectedSession.id);
      await refreshOpenSession(token, selectedSession.id, "stage_5");
      setView("portfolio");
      setStatusMessage("项目实训已完成，最终档案袋已生成");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段五完成失败");
      setStatusMessage("阶段五完成失败");
      return false;
    } finally {
      setIsCompletingStageFive(false);
    }
  }

  async function handleNavigate(area: "courses" | "workspace" | "profile" | "portfolio") {
    if (area === "courses") {
      setView("courses");
      return;
    }
    if (selectedSession && selectedCourse) {
      setView(area);
      if (area !== "workspace") {
        setStatusMessage(area === "profile" ? "学习画像已打开" : "项目档案袋已打开");
      }
      return;
    }

    if (!token || sessions.length === 0) {
      setView("courses");
      setStatusMessage("请先进入实验课程");
      return;
    }

    const targetSession = sessions[0];
    const targetCourse =
      courses.find((course) => course.id === targetSession.course_id) ?? null;
    if (!targetCourse) {
      setView("courses");
      setStatusMessage("请先刷新实验课程");
      return;
    }

    setIsEnteringProject(true);
    setErrorMessage("");
    setStatusMessage("正在打开项目资料");
    try {
      setSelectedCourse(targetCourse);
      setSelectedSession(targetSession);
      await loadWorkspaceData(token, targetSession);
      setView(area);
      setStatusMessage(
        area === "workspace"
          ? "实验项目已打开"
          : area === "profile"
            ? "学习画像已打开"
            : "项目档案袋已打开",
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "项目资料加载失败");
      setStatusMessage("项目资料加载失败");
    } finally {
      setIsEnteringProject(false);
    }
  }

  if (!token || !user) {
    return (
      <LoginScreen
        email={email}
        errorMessage={errorMessage}
        isLoggingIn={isLoggingIn || isBootstrapping}
        onEmailChange={setEmail}
        onLogin={handleLogin}
        onPasswordChange={setPassword}
        onRoleSelect={handleRoleSelect}
        password={password}
        selectedRole={selectedRole}
        statusMessage={statusMessage}
      />
    );
  }

  return (
    <AppShell
      currentArea={currentArea}
      errorMessage={errorMessage}
      isRefreshing={isBootstrapping || isEnteringProject}
      onLogout={handleLogout}
      onNavigate={handleNavigate}
      onRefresh={handleRefresh}
      statusMessage={statusMessage}
      user={user}
      variant={view === "workspace" ? "compact" : "full"}
    >
      {view === "unsupported" ? (
        <UnsupportedRole role={roleCopy(user.role)} />
      ) : view === "portfolio" && selectedCourse && selectedSession ? (
        <ProjectPortfolioView
          artifactsByStage={artifactsByStage}
          course={selectedCourse}
          isBusy={isBootstrapping || isEnteringProject}
          learningProfile={learningProfile}
          onBackToWorkspace={() => setView("workspace")}
          onRefresh={handleRefresh}
          onStageOpen={(stageKey) => {
            setActiveStageKey(stageKey);
            setView("workspace");
          }}
          session={selectedSession}
        />
      ) : view === "profile" && selectedCourse && selectedSession ? (
        <LearningProfileView
          artifactsByStage={artifactsByStage}
          course={selectedCourse}
          isBusy={isBootstrapping || isEnteringProject}
          learningProfile={learningProfile}
          onBackToWorkspace={() => setView("workspace")}
          onRefresh={handleRefresh}
          onPortfolioOpen={() => setView("portfolio")}
          session={selectedSession}
        />
      ) : view === "workspace" && selectedCourse && selectedSession ? (
        <ExperimentWorkspace
          activeStageKey={activeStageKey}
          artifactsByStage={artifactsByStage}
          course={selectedCourse}
          isBusy={isBootstrapping || isEnteringProject}
          isCompletingStageFour={isCompletingStageFour}
          isCompletingStageFive={isCompletingStageFive}
          isCompletingStageOne={isCompletingStageOne}
          isCompletingStageThree={isCompletingStageThree}
          isCompletingStageTwo={isCompletingStageTwo}
          isRequestingStageFourReview={isRequestingStageFourReview}
          isRequestingStageFiveReview={isRequestingStageFiveReview}
          isRequestingStageThreeReview={isRequestingStageThreeReview}
          isRequestingStageTwoReview={isRequestingStageTwoReview}
          isSavingStageFiveAcceptancePackage={isSavingStageFiveAcceptancePackage}
          isSavingStageFiveDeliveryDocument={isSavingStageFiveDeliveryDocument}
          isSavingStageFiveOperationsGuide={isSavingStageFiveOperationsGuide}
          isSavingStageFourImplementation={isSavingStageFourImplementation}
          isSavingStageFourTestReport={isSavingStageFourTestReport}
          isSavingStageOneSummary={isSavingStageOneSummary}
          isSavingStageThreeDecision={isSavingStageThreeDecision}
          isSavingStageTwoSolution={isSavingStageTwoSolution}
          isSendingStageOneInterview={isSendingStageOneInterview}
          learningProfile={learningProfile}
          onAskStageOneCustomer={handleAskStageOneCustomer}
          onBackToCourses={() => setView("courses")}
          onCompleteStageFour={handleCompleteStageFour}
          onCompleteStageFive={handleCompleteStageFive}
          onCompleteStageOne={handleCompleteStageOne}
          onCompleteStageThree={handleCompleteStageThree}
          onCompleteStageTwo={handleCompleteStageTwo}
          onRefresh={handleRefresh}
          onRequestStageFourReview={handleRequestStageFourReview}
          onRequestStageFiveReview={handleRequestStageFiveReview}
          onRequestStageThreeReview={handleRequestStageThreeReview}
          onRequestStageTwoReview={handleRequestStageTwoReview}
          onSaveStageFiveAcceptancePackage={handleSaveStageFiveAcceptancePackage}
          onSaveStageFiveDeliveryDocument={handleSaveStageFiveDeliveryDocument}
          onSaveStageFiveOperationsGuide={handleSaveStageFiveOperationsGuide}
          onSaveStageFourImplementation={handleSaveStageFourImplementation}
          onSaveStageFourTestReport={handleSaveStageFourTestReport}
          onSaveStageOneSummary={handleSaveStageOneSummary}
          onSaveStageThreeDecision={handleSaveStageThreeDecision}
          onSaveStageTwoSolution={handleSaveStageTwoSolution}
          onStageSelect={setActiveStageKey}
          session={selectedSession}
        />
      ) : (
        <CourseList
          courses={courses}
          isBusy={isBootstrapping || isEnteringProject}
          learningProfile={learningProfile}
          onEnterCourse={handleEnterCourse}
          onRefresh={handleRefresh}
          sessions={sessions}
          studentName={user.full_name}
        />
      )}
    </AppShell>
  );
}

function UnsupportedRole({ role }: { role: string }) {
  return (
    <div className="px-5 py-6 lg:px-8">
      <div className="max-w-3xl rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(26,33,44,.06)]">
        <StatusBadge label={role} tone="info" />
        <h1 className="mt-4 text-2xl font-extrabold text-slate-950">当前角色的正式页面待开放</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          本轮先实现正式学生端产品 UI。教师进度视图和管理入口仍保留在基础工作台中。
        </p>
        <div className="mt-5">
          <Link
            className="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800"
            href="/dev-workbench"
          >
            打开基础工作台
          </Link>
        </div>
      </div>
    </div>
  );
}

function createEmptyArtifacts(): ArtifactsByStage {
  return {
    stage_1: [],
    stage_2: [],
    stage_3: [],
    stage_4: [],
    stage_5: [],
  };
}
