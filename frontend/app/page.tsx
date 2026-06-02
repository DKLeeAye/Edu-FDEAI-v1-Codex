"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/src/components/student-product/app-shell";
import { CourseList } from "@/src/components/student-product/course-list";
import {
  ExperimentWorkspace,
  type StageWorkspaceRouteStep,
} from "@/src/components/student-product/experiment-workspace";
import { LearningProfileView } from "@/src/components/student-product/learning-profile-view";
import { ProjectPortfolioView } from "@/src/components/student-product/project-portfolio-view";
import { StudentExperimentDetail } from "@/src/components/student-product/student-experiment-detail";
import { StudentProjectOverview } from "@/src/components/student-product/student-project-overview";
import {
  pickActiveStageKey,
  roleCopy,
  stageKeys,
  type StageKey,
} from "@/src/components/student-product/terminology";
import { OperationsDashboard } from "@/src/components/vnext-ops/operations-dashboard";
import { MarketingHome } from "@/src/components/vnext-public/marketing-home";
import { tokenStorageKey } from "@/src/lib/auth-storage";
import {
  askStageOneCustomer,
  completeStageFive,
  completeStageFour,
  completeStageOne,
  completeStageThree,
  completeStageTwo,
  composeStageTwoDocumentFromSections,
  createExperimentSession,
  getCurrentUser,
  getLearningProfile,
  getStageOneGuidedTraining,
  listCourses,
  listExperimentSessions,
  listStageArtifacts,
  requestStageTwoDocumentReview,
  requestStageTwoSectionReview,
  requestStageFiveAiDeliveryReview,
  requestStageFourAiTestReview,
  requestStageOnePracticeEvaluation,
  requestStageThreeAiReview,
  runStageFourAgentTests,
  saveStageThreeCaseStudyRecord,
  saveStageFiveAcceptancePackage,
  saveStageFiveDeliveryDocument,
  saveStageFiveOperationsGuide,
  saveStageFourDifyImplementation,
  saveStageFourGuideConfirmation,
  saveStageFourTestReport,
  saveStageOneSummary,
  saveStageOneVisitNotes,
  saveStageThreeKnowledgeDecision,
  saveStageThreeLabExperimentRecord,
  saveStageTwoGuideConfirmation,
  saveStageTwoSectionDraft,
  submitStageTwoSection,
  type Artifact,
  type Course,
  type CurrentUser,
  type ExperimentSession,
  type LearningProfile,
  type StageOneGuidedTraining,
  type StageOneSummaryPayload,
  type StageOneVisitNotesPayload,
  type StageFiveAcceptancePackagePayload,
  type StageFiveDeliveryDocumentPayload,
  type StageFiveOperationsGuidePayload,
  type StageFourAgentTestRunPayload,
  type StageFourDifyImplementationPayload,
  type StageFourGuideConfirmationPayload,
  type StageFourTestReportPayload,
  type StageThreeCaseStudyRecordPayload,
  type StageThreeKnowledgeDecisionPayload,
  type StageThreeLabExperimentRecordPayload,
  type StageTwoDocumentKey,
  type StageTwoGuideConfirmationPayload,
  type StageTwoSectionDraftPayload,
  type StageTwoSectionKey,
} from "@/src/lib/api";

type ProductView =
  | "public"
  | "courses"
  | "experimentDetail"
  | "projectOverview"
  | "workspace"
  | "profile"
  | "portfolio";
type ArtifactsByStage = Record<StageKey, Artifact[]>;
type RouteState = {
  preserveScroll?: boolean;
  scrollToExperimentPath?: boolean;
  stageKey?: StageKey;
  step?: StageWorkspaceRouteStep;
  view: ProductView;
};

const selectedSessionStorageKey = "edufde.selectedSessionId";

const studentRoutes = {
  courses: "/student/courses",
  experiment: "/student/experiment",
  experimentPath: "/student/experiment/path",
  portfolio: "/student/portfolio",
  profile: "/student/profile",
  project: "/student/project",
  workspace: "/student/workspace",
} as const;

const stageSlugs: Record<StageKey, string> = {
  stage_1: "stage-1",
  stage_2: "stage-2",
  stage_3: "stage-3",
  stage_4: "stage-4",
  stage_5: "stage-5",
};

function parseRouteState(): RouteState {
  if (typeof window === "undefined") {
    return { view: "public" };
  }

  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const hash = window.location.hash;

  if (hash === "#experiment-path") {
    return { scrollToExperimentPath: true, view: "experimentDetail" };
  }
  if (hash === "#stage-one-guide") {
    return { stageKey: "stage_1", step: { stageKey: "stage_1", step: "guide" }, view: "workspace" };
  }
  if (hash === "#stage-one-lab") {
    return { stageKey: "stage_1", step: { stageKey: "stage_1", step: "lab" }, view: "workspace" };
  }
  if (hash === "#stage-one-submit") {
    return { stageKey: "stage_1", step: { stageKey: "stage_1", step: "submit" }, view: "workspace" };
  }

  const preserveScroll = hash.length > 0;
  const parts = pathname.split("/").filter(Boolean);
  if (pathname === "/") {
    return { preserveScroll, view: "public" };
  }
  if (pathname === "/student" || pathname === studentRoutes.courses) {
    return { preserveScroll, view: "courses" };
  }
  if (pathname === studentRoutes.experiment) {
    return { preserveScroll, view: "experimentDetail" };
  }
  if (pathname === studentRoutes.experimentPath) {
    return { scrollToExperimentPath: true, view: "experimentDetail" };
  }
  if (pathname === studentRoutes.project) {
    return { preserveScroll, view: "projectOverview" };
  }
  if (pathname === studentRoutes.profile) {
    return { preserveScroll, view: "profile" };
  }
  if (pathname === studentRoutes.portfolio) {
    return { preserveScroll, view: "portfolio" };
  }

  if (parts[0] === "student" && parts[1] === "workspace") {
    const stageKey = stageKeyFromSlug(parts[2]) ?? "stage_1";
    const step = routeStepFromSegments(stageKey, parts[3]);
    return { preserveScroll, stageKey, step, view: "workspace" };
  }

  return { preserveScroll, view: "courses" };
}

function routePathForView(nextView: ProductView): string {
  if (nextView === "public") {
    return "/";
  }
  if (nextView === "experimentDetail") {
    return studentRoutes.experiment;
  }
  if (nextView === "projectOverview") {
    return studentRoutes.project;
  }
  if (nextView === "workspace") {
    return `${studentRoutes.workspace}/stage-1`;
  }
  if (nextView === "profile") {
    return studentRoutes.profile;
  }
  if (nextView === "portfolio") {
    return studentRoutes.portfolio;
  }
  return studentRoutes.courses;
}

function routeNeedsExperimentSession(routeState: RouteState): boolean {
  return (
    routeState.view === "experimentDetail" ||
    routeState.view === "projectOverview" ||
    routeState.view === "workspace" ||
    routeState.view === "profile" ||
    routeState.view === "portfolio"
  );
}

function routePathForWorkspaceStep(routeStep: StageWorkspaceRouteStep): string {
  return `${studentRoutes.workspace}/${stageSlugs[routeStep.stageKey]}/${routeStep.step}`;
}

function routeStepFromSegments(
  stageKey: StageKey,
  rawStep: string | undefined,
): StageWorkspaceRouteStep | undefined {
  if (stageKey === "stage_1") {
    const step = rawStep === "guide" || rawStep === "lab" || rawStep === "submit" ? rawStep : "guide";
    return { stageKey, step };
  }
  if (stageKey === "stage_2") {
    const step = rawStep === "workbench" ? "workbench" : "guide";
    return { stageKey, step };
  }
  if (stageKey === "stage_3") {
    const step =
      rawStep === "quality" || rawStep === "decision" || rawStep === "review" ? rawStep : "source";
    return { stageKey, step };
  }
  if (stageKey === "stage_4") {
    const step =
      rawStep === "onboarding" || rawStep === "build" || rawStep === "test" ? rawStep : "guide";
    return { stageKey, step };
  }
  const step = rawStep === "acceptance" ? "acceptance" : "document";
  return { stageKey, step };
}

function stageKeyFromSlug(slug: string | undefined): StageKey | null {
  const entry = Object.entries(stageSlugs).find(([, value]) => value === slug);
  return entry ? (entry[0] as StageKey) : null;
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [view, setView] = useState<ProductView>("courses");
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<ExperimentSession[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSession, setSelectedSession] = useState<ExperimentSession | null>(null);
  const [artifactsByStage, setArtifactsByStage] = useState<ArtifactsByStage>(createEmptyArtifacts);
  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);
  const [stageOneGuidedTraining, setStageOneGuidedTraining] =
    useState<StageOneGuidedTraining | null>(null);
  const [activeStageKey, setActiveStageKey] = useState<StageKey>("stage_1");
  const [workspaceRouteStep, setWorkspaceRouteStep] =
    useState<StageWorkspaceRouteStep | null>(null);
  const [statusMessage, setStatusMessage] = useState("等待登录");
  const [errorMessage, setErrorMessage] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isEnteringProject, setIsEnteringProject] = useState(false);
  const [isSendingStageOneInterview, setIsSendingStageOneInterview] = useState(false);
  const [isSavingStageOneSummary, setIsSavingStageOneSummary] = useState(false);
  const [isSavingStageOneVisitNotes, setIsSavingStageOneVisitNotes] = useState(false);
  const [isRequestingStageOneEvaluation, setIsRequestingStageOneEvaluation] = useState(false);
  const [isCompletingStageOne, setIsCompletingStageOne] = useState(false);
  const [isSavingStageTwoSolution, setIsSavingStageTwoSolution] = useState(false);
  const [isRequestingStageTwoReview, setIsRequestingStageTwoReview] = useState(false);
  const [isCompletingStageTwo, setIsCompletingStageTwo] = useState(false);
  const [isSavingStageThreeDecision, setIsSavingStageThreeDecision] = useState(false);
  const [isSavingStageThreeCaseRecord, setIsSavingStageThreeCaseRecord] = useState(false);
  const [isSavingStageThreeLabRecord, setIsSavingStageThreeLabRecord] = useState(false);
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

  const applyRouteState = useCallback((routeState: RouteState) => {
    setView(routeState.view);
    if (routeState.stageKey) {
      setActiveStageKey(routeState.stageKey);
    }
    setWorkspaceRouteStep(routeState.step ?? null);
    if (routeState.scrollToExperimentPath) {
      window.requestAnimationFrame(() => {
        document.getElementById("experiment-path")?.scrollIntoView({ block: "start" });
      });
    } else if (routeState.preserveScroll) {
      return;
    } else {
      scrollViewportToTopAfterRender();
    }
  }, []);

  const navigateToRoute = useCallback((routeState: RouteState, path?: string) => {
    const nextPath = path ?? routePathForView(routeState.view);
    if (window.location.pathname + window.location.search + window.location.hash !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
    applyRouteState(routeState);
  }, [applyRouteState]);

  const loadWorkspaceData = useCallback(async (
    authToken: string,
    targetSession: ExperimentSession,
    nextActiveStageKey?: StageKey,
  ) => {
    const [stageArtifacts, profile, guidedTraining] = await Promise.all([
      Promise.all(
        stageKeys.map(async (stageKey) => [stageKey, await listStageArtifacts(authToken, targetSession.id, stageKey)] as const),
      ),
      getLearningProfile(authToken, targetSession.id),
      getStageOneGuidedTraining(authToken, targetSession.id),
    ]);

    const nextArtifacts = createEmptyArtifacts();
    for (const [stageKey, artifacts] of stageArtifacts) {
      nextArtifacts[stageKey] = artifacts;
    }

    setArtifactsByStage(nextArtifacts);
    setLearningProfile(profile);
    setStageOneGuidedTraining(guidedTraining);
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
        setStageOneGuidedTraining(null);
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
          setStageOneGuidedTraining(null);
          applyRouteState(parseRouteState());
          setStatusMessage(`${roleCopy(currentUser.role)}工作区已打开`);
          return;
        }

        const [nextCourses, nextSessions] = await Promise.all([
          listCourses(authToken),
          listExperimentSessions(authToken),
        ]);
        setCourses(nextCourses);
        setSessions(nextSessions);

        const routeState = parseRouteState();
        const storedSessionId = window.localStorage.getItem(selectedSessionStorageKey);
        const preferredSession =
          nextSessions.find((session) => session.id === preferredSessionId) ??
          nextSessions.find((session) => session.id === selectedSessionId) ??
          nextSessions.find((session) => session.id === storedSessionId) ??
          (routeNeedsExperimentSession(routeState) ? (nextSessions[0] ?? null) : null) ??
          null;

        if (preferredSession) {
          const course =
            nextCourses.find((item) => item.id === preferredSession.course_id) ?? null;
          setSelectedCourse(course);
          setSelectedSession(preferredSession);
          await loadWorkspaceData(authToken, preferredSession);
          applyRouteState(routeState);
          setStatusMessage("实验项目已同步");
          return;
        }

        setSelectedCourse(null);
        setSelectedSession(null);
        setArtifactsByStage(createEmptyArtifacts());
        setStageOneGuidedTraining(null);

        if (nextSessions[0]) {
          const profile = await getLearningProfile(authToken, nextSessions[0].id);
          setLearningProfile(profile);
        } else {
          setLearningProfile(null);
        }
        {
          applyRouteState(
            routeState.view === "public" || routeState.view === "courses"
              ? routeState
              : { view: "courses" },
          );
        }
        setStatusMessage("实验课程已就绪");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "加载失败");
        setStatusMessage("加载失败");
      } finally {
        setIsBootstrapping(false);
      }
    },
    [applyRouteState, loadWorkspaceData, selectedSessionId],
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

  useEffect(() => {
    if (!selectedSessionId) {
      return;
    }
    window.localStorage.setItem(selectedSessionStorageKey, selectedSessionId);
  }, [selectedSessionId]);

  useEffect(() => {
    function handleBrowserRouteChange() {
      applyRouteState(parseRouteState());
    }

    window.addEventListener("popstate", handleBrowserRouteChange);
    window.addEventListener("hashchange", handleBrowserRouteChange);
    return () => {
      window.removeEventListener("popstate", handleBrowserRouteChange);
      window.removeEventListener("hashchange", handleBrowserRouteChange);
    };
  }, [applyRouteState]);

  const currentArea = useMemo(() => {
    if (view === "public" || view === "courses") {
      return "courses";
    }
    if (view === "profile" || view === "portfolio") {
      return view;
    }
    return "workspace";
  }, [view]);

  function handleLogout() {
    window.localStorage.removeItem(tokenStorageKey);
    window.localStorage.removeItem(selectedSessionStorageKey);
    window.history.replaceState(null, "", "/");
    setToken(null);
    setUser(null);
    applyRouteState({ view: "public" });
    setCourses([]);
    setSessions([]);
    setSelectedCourse(null);
    setSelectedSession(null);
    setArtifactsByStage(createEmptyArtifacts());
    setLearningProfile(null);
    setActiveStageKey("stage_1");
    setIsSendingStageOneInterview(false);
    setIsSavingStageOneVisitNotes(false);
    setIsSavingStageOneSummary(false);
    setIsRequestingStageOneEvaluation(false);
    setIsCompletingStageOne(false);
    setIsSavingStageTwoSolution(false);
    setIsRequestingStageTwoReview(false);
    setIsCompletingStageTwo(false);
    setIsSavingStageThreeDecision(false);
    setIsSavingStageThreeCaseRecord(false);
    setIsSavingStageThreeLabRecord(false);
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
    await bootstrapWorkspace(token, view !== "courses" ? selectedSessionId : null);
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
      await loadWorkspaceData(token, targetSession);
      navigateToRoute({ view: "experimentDetail" }, studentRoutes.experiment);
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
      setErrorMessage(formatStageOneCustomerError(error));
      setStatusMessage("客户访谈提交失败");
      return false;
    } finally {
      setIsSendingStageOneInterview(false);
    }
  }

  function handleOpenWorkspace(stageKey?: StageKey) {
    const nextStageKey = stageKey ?? activeStageKey;
    const nextStep = routeStepFromSegments(nextStageKey, undefined);
    navigateToRoute(
      { stageKey: nextStageKey, step: nextStep, view: "workspace" },
      nextStep ? routePathForWorkspaceStep(nextStep) : `${studentRoutes.workspace}/${stageSlugs[nextStageKey]}`,
    );
    setStatusMessage("阶段工作区已打开");
  }

  function handleBackToExperimentPath() {
    navigateToRoute(
      { scrollToExperimentPath: true, view: "experimentDetail" },
      studentRoutes.experimentPath,
    );
    setStatusMessage("已返回实验路径");
  }

  function handleWorkspaceRouteChange(routeStep: StageWorkspaceRouteStep) {
    navigateToRoute(
      { stageKey: routeStep.stageKey, step: routeStep, view: "workspace" },
      routePathForWorkspaceStep(routeStep),
    );
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

  async function handleSaveStageOneVisitNotes(
    payload: StageOneVisitNotesPayload,
  ): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSavingStageOneVisitNotes(true);
    setErrorMessage("");
    setStatusMessage("正在保存拜访间整理");
    try {
      await saveStageOneVisitNotes(token, selectedSession.id, payload);
      await refreshOpenSession(token, selectedSession.id, "stage_1");
      setStatusMessage("拜访间整理已保存");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "拜访间整理保存失败");
      setStatusMessage("拜访间整理保存失败");
      return false;
    } finally {
      setIsSavingStageOneVisitNotes(false);
    }
  }

  async function handleRequestStageOneEvaluation(): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsRequestingStageOneEvaluation(true);
    setErrorMessage("");
    setStatusMessage("正在生成阶段一综合评估");
    try {
      await requestStageOnePracticeEvaluation(token, selectedSession.id);
      await refreshOpenSession(token, selectedSession.id, "stage_1");
      setStatusMessage("阶段一综合评估已生成");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段一综合评估生成失败");
      setStatusMessage("阶段一综合评估生成失败");
      return false;
    } finally {
      setIsRequestingStageOneEvaluation(false);
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

  async function handleSaveStageTwoGuideConfirmation(
    payload: StageTwoGuideConfirmationPayload,
  ): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSavingStageTwoSolution(true);
    setErrorMessage("");
    setStatusMessage("正在保存阶段二导学确认");
    try {
      await saveStageTwoGuideConfirmation(token, selectedSession.id, payload);
      await refreshOpenSession(token, selectedSession.id, "stage_2");
      setStatusMessage("阶段二导学确认已保存");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段二导学确认保存失败");
      setStatusMessage("阶段二导学确认保存失败");
      return false;
    } finally {
      setIsSavingStageTwoSolution(false);
    }
  }

  async function handleSaveStageTwoSectionDraft(
    payload: StageTwoSectionDraftPayload,
  ): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSavingStageTwoSolution(true);
    setErrorMessage("");
    setStatusMessage("正在保存阶段二小节草稿");
    try {
      await saveStageTwoSectionDraft(token, selectedSession.id, payload);
      await refreshOpenSession(token, selectedSession.id, "stage_2");
      setStatusMessage("阶段二小节草稿已保存");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段二小节草稿保存失败");
      setStatusMessage("阶段二小节草稿保存失败");
      return false;
    } finally {
      setIsSavingStageTwoSolution(false);
    }
  }

  async function handleRequestStageTwoSectionReview(
    documentType: StageTwoDocumentKey,
    sectionKey: StageTwoSectionKey,
  ): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsRequestingStageTwoReview(true);
    setErrorMessage("");
    setStatusMessage("正在生成小节追问");
    try {
      await requestStageTwoSectionReview(token, selectedSession.id, documentType, sectionKey);
      await refreshOpenSession(token, selectedSession.id, "stage_2");
      setStatusMessage("小节追问已生成");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "小节追问失败");
      setStatusMessage("小节追问失败");
      return false;
    } finally {
      setIsRequestingStageTwoReview(false);
    }
  }

  async function handleSubmitStageTwoSection(
    documentType: StageTwoDocumentKey,
    sectionKey: StageTwoSectionKey,
  ): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSavingStageTwoSolution(true);
    setErrorMessage("");
    setStatusMessage("正在提交阶段二小节");
    try {
      await submitStageTwoSection(token, selectedSession.id, documentType, sectionKey);
      await refreshOpenSession(token, selectedSession.id, "stage_2");
      setStatusMessage("阶段二小节已提交");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段二小节提交失败");
      setStatusMessage("阶段二小节提交失败");
      return false;
    } finally {
      setIsSavingStageTwoSolution(false);
    }
  }

  async function handleComposeStageTwoDocument(documentType: StageTwoDocumentKey): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSavingStageTwoSolution(true);
    setErrorMessage("");
    setStatusMessage("正在汇总阶段二正式文档");
    try {
      await composeStageTwoDocumentFromSections(token, selectedSession.id, documentType);
      await refreshOpenSession(token, selectedSession.id, "stage_2");
      setStatusMessage("正式文档已由小节汇总生成");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "正式文档汇总失败");
      setStatusMessage("正式文档汇总失败");
      return false;
    } finally {
      setIsSavingStageTwoSolution(false);
    }
  }

  async function handleRequestStageTwoReview(documentType: StageTwoDocumentKey): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsRequestingStageTwoReview(true);
    setErrorMessage("");
    setStatusMessage("正在生成文档评审");
    try {
      await requestStageTwoDocumentReview(token, selectedSession.id, documentType);
      await refreshOpenSession(token, selectedSession.id, "stage_2");
      setStatusMessage("文档评审已生成");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "文档评审失败");
      setStatusMessage("文档评审失败");
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

  async function handleSaveStageThreeCaseRecord(
    payload: StageThreeCaseStudyRecordPayload,
  ): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSavingStageThreeCaseRecord(true);
    setErrorMessage("");
    setStatusMessage("正在保存案例学习记录");
    try {
      await saveStageThreeCaseStudyRecord(token, selectedSession.id, payload);
      await refreshOpenSession(token, selectedSession.id, "stage_3");
      setStatusMessage("案例学习记录已保存");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "案例学习记录保存失败");
      setStatusMessage("案例学习记录保存失败");
      return false;
    } finally {
      setIsSavingStageThreeCaseRecord(false);
    }
  }

  async function handleSaveStageThreeLabRecord(
    payload: StageThreeLabExperimentRecordPayload,
  ): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSavingStageThreeLabRecord(true);
    setErrorMessage("");
    setStatusMessage("正在保存实验观察记录");
    try {
      await saveStageThreeLabExperimentRecord(token, selectedSession.id, payload);
      await refreshOpenSession(token, selectedSession.id, "stage_3");
      setStatusMessage("实验观察记录已保存");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "实验观察记录保存失败");
      setStatusMessage("实验观察记录保存失败");
      return false;
    } finally {
      setIsSavingStageThreeLabRecord(false);
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

  async function handleSaveStageFourGuideConfirmation(
    payload: StageFourGuideConfirmationPayload,
  ): Promise<boolean> {
    if (!token || !selectedSession) {
      return false;
    }

    setIsSavingStageFourImplementation(true);
    setErrorMessage("");
    setStatusMessage("正在保存阶段四导学确认");
    try {
      await saveStageFourGuideConfirmation(token, selectedSession.id, payload);
      await refreshOpenSession(token, selectedSession.id, "stage_4");
      setStatusMessage("阶段四导学确认已保存");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "阶段四导学确认保存失败");
      setStatusMessage("阶段四导学确认保存失败");
      return false;
    } finally {
      setIsSavingStageFourImplementation(false);
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

  async function handleRunStageFourAgentTests(
    payload: StageFourAgentTestRunPayload,
  ): Promise<Artifact | null> {
    if (!token || !selectedSession) {
      return null;
    }

    setIsSavingStageFourTestReport(true);
    setErrorMessage("");
    setStatusMessage("正在调用智能体 API 运行后端自动化测试");
    try {
      const result = await runStageFourAgentTests(token, selectedSession.id, payload);
      await refreshOpenSession(token, selectedSession.id, "stage_4");
      const content = result.artifact.content_json;
      const totalScore = typeof content.total_score === "number" ? content.total_score : null;
      const scoreSuffix = totalScore === null ? "" : `，总分 ${totalScore}`;
      setStatusMessage(`后端自动化测试完成，测试报告已保存${scoreSuffix}`);
      return result.artifact;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "后端自动化测试失败");
      setStatusMessage("后端自动化测试失败");
      return null;
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
      navigateToRoute({ view: "portfolio" }, studentRoutes.portfolio);
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
      navigateToRoute({ view: "courses" }, studentRoutes.courses);
      return;
    }
    if (selectedSession && selectedCourse) {
      if (area === "workspace") {
        const nextStep = routeStepFromSegments(activeStageKey, undefined);
        navigateToRoute(
          { stageKey: activeStageKey, step: nextStep, view: "workspace" },
          nextStep ? routePathForWorkspaceStep(nextStep) : routePathForView(area),
        );
      } else {
        navigateToRoute({ view: area }, routePathForView(area));
      }
      if (area !== "workspace") {
        setStatusMessage(area === "profile" ? "学习画像已打开" : "项目档案袋已打开");
      }
      return;
    }

    if (!token || sessions.length === 0) {
      navigateToRoute({ view: "courses" }, studentRoutes.courses);
      setStatusMessage("请先进入实验课程");
      return;
    }

    const storedSessionId = window.localStorage.getItem(selectedSessionStorageKey);
    const targetSession =
      selectedSession ??
      sessions.find((session) => session.id === storedSessionId) ??
      sessions[0];
    const targetCourse =
      courses.find((course) => course.id === targetSession.course_id) ?? null;
    if (!targetCourse) {
      navigateToRoute({ view: "courses" }, studentRoutes.courses);
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
      if (area === "workspace") {
        const nextStageKey = pickActiveStageKey(targetSession);
        const nextStep = routeStepFromSegments(nextStageKey, undefined);
        navigateToRoute(
          { stageKey: nextStageKey, step: nextStep, view: "workspace" },
          nextStep ? routePathForWorkspaceStep(nextStep) : routePathForView(area),
        );
      } else {
        navigateToRoute({ view: area }, routePathForView(area));
      }
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

  if (view === "public" || !token || !user) {
    return <MarketingHome />;
  }

  if (user.role !== "student") {
    return <OperationsDashboard onLogout={handleLogout} token={token} user={user} />;
  }

  if (view === "courses") {
    return (
      <CourseList
        courses={courses}
        isBusy={isBootstrapping || isEnteringProject}
        learningProfile={learningProfile}
        onEnterCourse={handleEnterCourse}
        onRefresh={handleRefresh}
        sessions={sessions}
        studentName={user.full_name}
      />
    );
  }

  if (view === "experimentDetail" && selectedCourse && selectedSession) {
    return (
      <StudentExperimentDetail
        course={selectedCourse}
        isBusy={isBootstrapping || isEnteringProject}
        onBackHome={() => navigateToRoute({ view: "courses" }, studentRoutes.courses)}
        onOpenPortfolio={() => navigateToRoute({ view: "portfolio" }, studentRoutes.portfolio)}
        onOpenProject={() => handleOpenWorkspace(pickActiveStageKey(selectedSession))}
        onStartStage={handleOpenWorkspace}
        session={selectedSession}
        studentName={user.full_name}
      />
    );
  }

  if (view === "projectOverview" && selectedCourse && selectedSession) {
    return (
      <StudentProjectOverview
        artifactsByStage={artifactsByStage}
        course={selectedCourse}
        learningProfile={learningProfile}
        onBackToDetail={() => navigateToRoute({ view: "experimentDetail" }, studentRoutes.experiment)}
        onOpenPortfolio={() => navigateToRoute({ view: "portfolio" }, studentRoutes.portfolio)}
        onStartStage={handleOpenWorkspace}
        session={selectedSession}
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
      variant={view === "workspace" || view === "portfolio" ? "immersive" : "full"}
    >
      {view === "portfolio" && selectedCourse && selectedSession ? (
        <ProjectPortfolioView
          artifactsByStage={artifactsByStage}
          course={selectedCourse}
          isBusy={isBootstrapping || isEnteringProject}
          learningProfile={learningProfile}
          onBackToWorkspace={() => handleOpenWorkspace(activeStageKey)}
          onRefresh={handleRefresh}
          onStageOpen={(stageKey) => {
            handleOpenWorkspace(stageKey);
          }}
          session={selectedSession}
        />
      ) : view === "profile" && selectedCourse && selectedSession ? (
        <LearningProfileView
          artifactsByStage={artifactsByStage}
          course={selectedCourse}
          isBusy={isBootstrapping || isEnteringProject}
          learningProfile={learningProfile}
          onBackToWorkspace={() => handleOpenWorkspace(activeStageKey)}
          onRefresh={handleRefresh}
          onPortfolioOpen={() => navigateToRoute({ view: "portfolio" }, studentRoutes.portfolio)}
          session={selectedSession}
        />
      ) : view === "workspace" && selectedCourse && selectedSession ? (
        <ExperimentWorkspace
          activeStageKey={activeStageKey}
          artifactsByStage={artifactsByStage}
          course={selectedCourse}
          errorMessage={errorMessage}
          isBusy={isBootstrapping || isEnteringProject}
          isCompletingStageFour={isCompletingStageFour}
          isCompletingStageFive={isCompletingStageFive}
          isCompletingStageOne={isCompletingStageOne}
          isCompletingStageThree={isCompletingStageThree}
          isCompletingStageTwo={isCompletingStageTwo}
          isRequestingStageFourReview={isRequestingStageFourReview}
          isRequestingStageFiveReview={isRequestingStageFiveReview}
          isRequestingStageThreeReview={isRequestingStageThreeReview}
          isRequestingStageOneEvaluation={isRequestingStageOneEvaluation}
          isRequestingStageTwoReview={isRequestingStageTwoReview}
          isSavingStageThreeCaseRecord={isSavingStageThreeCaseRecord}
          isSavingStageFiveAcceptancePackage={isSavingStageFiveAcceptancePackage}
          isSavingStageFiveDeliveryDocument={isSavingStageFiveDeliveryDocument}
          isSavingStageFiveOperationsGuide={isSavingStageFiveOperationsGuide}
          isSavingStageFourImplementation={isSavingStageFourImplementation}
          isSavingStageFourTestReport={isSavingStageFourTestReport}
          isSavingStageOneSummary={isSavingStageOneSummary}
          isSavingStageOneVisitNotes={isSavingStageOneVisitNotes}
          isSavingStageThreeDecision={isSavingStageThreeDecision}
          isSavingStageThreeLabRecord={isSavingStageThreeLabRecord}
          isSavingStageTwoSolution={isSavingStageTwoSolution}
          isSendingStageOneInterview={isSendingStageOneInterview}
          learningProfile={learningProfile}
          onAskStageOneCustomer={handleAskStageOneCustomer}
          onBackToCourses={() => navigateToRoute({ view: "courses" }, studentRoutes.courses)}
          onBackToExperimentDetail={handleBackToExperimentPath}
          onCompleteStageFour={handleCompleteStageFour}
          onCompleteStageFive={handleCompleteStageFive}
          onCompleteStageOne={handleCompleteStageOne}
          onCompleteStageThree={handleCompleteStageThree}
          onCompleteStageTwo={handleCompleteStageTwo}
          onComposeStageTwoDocument={handleComposeStageTwoDocument}
          onRefresh={handleRefresh}
          onRequestStageFourReview={handleRequestStageFourReview}
          onRequestStageFiveReview={handleRequestStageFiveReview}
          onRequestStageThreeReview={handleRequestStageThreeReview}
          onRequestStageTwoReview={handleRequestStageTwoReview}
          onRunStageFourAgentTests={handleRunStageFourAgentTests}
          onSaveStageFiveAcceptancePackage={handleSaveStageFiveAcceptancePackage}
          onSaveStageFiveDeliveryDocument={handleSaveStageFiveDeliveryDocument}
          onSaveStageFiveOperationsGuide={handleSaveStageFiveOperationsGuide}
          onSaveStageFourGuideConfirmation={handleSaveStageFourGuideConfirmation}
          onSaveStageFourImplementation={handleSaveStageFourImplementation}
          onSaveStageFourTestReport={handleSaveStageFourTestReport}
          onSaveStageThreeCaseRecord={handleSaveStageThreeCaseRecord}
          onRequestStageOneEvaluation={handleRequestStageOneEvaluation}
          onSaveStageOneSummary={handleSaveStageOneSummary}
          onSaveStageOneVisitNotes={handleSaveStageOneVisitNotes}
          onSaveStageThreeDecision={handleSaveStageThreeDecision}
          onSaveStageThreeLabRecord={handleSaveStageThreeLabRecord}
          onSaveStageTwoGuideConfirmation={handleSaveStageTwoGuideConfirmation}
          onSaveStageTwoSectionDraft={handleSaveStageTwoSectionDraft}
          onStageSelect={setActiveStageKey}
          onWorkspaceRouteChange={handleWorkspaceRouteChange}
          routeStep={workspaceRouteStep}
          onSubmitStageTwoSection={handleSubmitStageTwoSection}
          onRequestStageTwoSectionReview={handleRequestStageTwoSectionReview}
          session={selectedSession}
          stageOneGuidedTraining={stageOneGuidedTraining}
          studentName={user.full_name}
        />
      ) : null}
    </AppShell>
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

function formatStageOneCustomerError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("SiliconFlow request failed") ||
    message.includes("read operation timed out") ||
    message.includes("AI Gateway")
  ) {
    return `模型服务错误：${message || "客户模拟模型暂时不可用"}。请稍后重试，本次提问尚未保存为客户访谈记录。`;
  }
  return message || "客户访谈提交失败";
}

function scrollViewportToTopAfterRender() {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ left: 0, top: 0 });
    });
  });
}
