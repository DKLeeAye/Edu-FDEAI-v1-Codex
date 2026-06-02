"use client";

import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Database,
  ExternalLink,
  FileCheck2,
  GitBranch,
  Save,
  SearchCheck,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  Artifact,
  StageFourAgentTestRunPayload,
  StageFourDifyImplementationPayload,
  StageFourGuideConfirmationPayload,
  StageFourTestReportPayload,
} from "@/src/lib/api";

import {
  createStageFourImplementationPayloadFromVNext,
  createStageFourOnboardingImplementationPayload,
  createStageFourTestReportPayloadFromRun,
  isStageFourBuildReady,
  isStageFourGuideReady,
  isStageFourOnboardingReady,
  stageFourBuildBlockedToast,
  stageFourBuildDemoFilledToast,
  stageFourBuildSnapshotFromImplementation,
  stageFourBuildSavedToast,
  stageFourBuildFlowNodes,
  stageFourBuildRunbookSteps,
  stageFourGuideArchitectureItems,
  stageFourGuideChecksFromArtifacts,
  stageFourGuideBlockedToast,
  stageFourGuideCaseFlowItems,
  stageFourGuideReadyToast,
  stageFourGuideRuleItems,
  stageFourGuideTransferRows,
  stageFourOnboardingRunbookSteps,
  stageFourPlatformRunFromPersistedReport,
  stageFourAiReviewType,
  stageFourBuildStepOrder,
  stageFourBuildTestPreviewCards,
  stageFourImplementationType,
  stageFourOnboardingBlockedToast,
  stageFourOnboardingDemoFilledToast,
  stageFourOnboardingNextBlockedToast,
  stageFourOnboardingSnapshotFromImplementation,
  stageFourOnboardingStepOrder,
  stageFourOnboardingSavedToast,
  stageFourTestRemediationItems,
  stageFourTestBlockedToast,
  stageFourTestReadyToast,
  stageFourTestReviewBlockedToast,
  stageFourTestReviewFailedToast,
  stageFourTestReviewGeneratingToast,
  stageFourTestReviewSavedToast,
  stageFourTestReportType,
  stageFourTestSavedToast,
  stageFourTestScoreDimensions,
  stageFourTestSuiteCards,
  stageFourTestTargetRequiredToast,
  stageFourTestTargetFromPersistedReport,
  type StageFourBuildChecks,
  type StageFourBuildDraft,
  type StageFourBuildField,
  type StageFourGuideChecks,
  type StageFourMode,
  type StageFourOnboardingChecks,
  type StageFourOnboardingDraft,
  type StageFourOnboardingField,
  type StageFourPlatformTestRun,
  type StageFourTestTargetDraft,
} from "./stage-four-flow";
import { formatDateTime, sanitizeProductText, stageStatusCopy } from "./terminology";
import { EmptyState, StatusBadge } from "./ui";

type StageFourWorkspaceProps = {
  artifacts: Artifact[];
  isCompletingStage: boolean;
  isRefreshing: boolean;
  isRequestingReview: boolean;
  isSavingImplementation: boolean;
  isSavingTestReport: boolean;
  onBackToPath: () => void;
  onCompleteStage: () => Promise<boolean>;
  onModeChange: (mode: StageFourMode) => void;
  onRefresh: () => void;
  onRequestReview: () => Promise<boolean>;
  onRunAgentTests: (payload: StageFourAgentTestRunPayload) => Promise<Artifact | null>;
  onSaveGuideConfirmation: (payload: StageFourGuideConfirmationPayload) => Promise<boolean>;
  onSaveImplementation: (payload: StageFourDifyImplementationPayload) => Promise<boolean>;
  onSaveTestReport: (payload: StageFourTestReportPayload) => Promise<boolean>;
  stageStatus?: string;
  stageThreeArtifacts: Artifact[];
  workspaceMode: StageFourMode;
};

const emptyOnboardingChecks: StageFourOnboardingChecks = {
  answer: false,
  canvas: false,
  create: false,
  llm: false,
  preview: false,
  publish: false,
  start: false,
  workspace: false,
};

const emptyOnboardingDraft: StageFourOnboardingDraft = {
  appName: "",
  appType: "Chatflow",
  canvasSummary: "",
  llmSummary: "",
  modelName: "",
  nodeChain: "",
  publishUrl: "",
  startInputs: "",
  testRecord: "",
  workspaceName: "",
};

const emptyBuildChecks: StageFourBuildChecks = {
  condition: false,
  connect: false,
  handoff: false,
  "kb-create": false,
  "kb-index": false,
  "kb-segment": false,
  "kb-upload": false,
  preview: false,
  project: false,
  prompt: false,
  publish: false,
  retrieval: false,
};

const emptyBuildDraft: StageFourBuildDraft = {
  accessNote: "",
  apiEndpoint: "",
  boundaryRule: "",
  fallbackTemplate: "",
  indexConfig: "",
  knowledgeName: "",
  knowledgeSourceMode: "",
  nodeChain: "",
  previewRecord: "",
  projectName: "",
  projectPurpose: "",
  promptSummary: "",
  publishUrl: "",
  retrievalConfig: "",
  segmentConfig: "",
  uploadedFiles: "",
};

function stageFourPageClass(mode: StageFourMode) {
  const modeClass: Record<StageFourMode, string> = {
    build: "agent-build-page",
    guide: "",
    onboarding: "dify-onboarding-page",
    test: "agent-test-page",
  };
  return `agent-guide-page ${modeClass[mode]}`.trim();
}

function stageFourTopbarTitle(mode: StageFourMode) {
  const titles: Record<StageFourMode, string> = {
    build: "正式搭建工作台",
    guide: "智能体实现导学",
    onboarding: "Dify 入门练习",
    test: "自动化测试评分",
  };
  return titles[mode];
}

function buildMapNodeClass(label: string) {
  const classByLabel: Record<string, string> = {
    "CF-01": "final",
    "KB-01": "knowledge",
    "KB-02": "upload",
    "KB-03": "segment",
    "KB-04": "index",
  };
  return classByLabel[label] ?? "final";
}

export function StageFourWorkspace({
  artifacts,
  isCompletingStage,
  isRefreshing,
  isRequestingReview,
  isSavingImplementation,
  isSavingTestReport,
  onBackToPath,
  onCompleteStage,
  onModeChange,
  onRefresh,
  onRequestReview,
  onRunAgentTests,
  onSaveGuideConfirmation,
  onSaveImplementation,
  onSaveTestReport,
  stageStatus,
  stageThreeArtifacts,
  workspaceMode,
}: StageFourWorkspaceProps) {
  const status = stageStatusCopy(stageStatus);
  const locked = stageStatus === "locked";
  const completed = stageStatus === "completed";
  const latestImplementationArtifact = useMemo(
    () => latestArtifactOfType(artifacts, stageFourImplementationType),
    [artifacts],
  );
  const latestTestReportArtifact = useMemo(
    () => latestArtifactOfType(artifacts, stageFourTestReportType),
    [artifacts],
  );
  const latestReviewArtifact = useMemo(
    () => latestArtifactOfType(artifacts, stageFourAiReviewType),
    [artifacts],
  );
  const latestStageThreeDecision = useMemo(
    () => latestArtifactOfType(stageThreeArtifacts, "stage_3_knowledge_decision"),
    [stageThreeArtifacts],
  );
  const stageThreeContent = latestStageThreeDecision?.content_json;
  const stageThreeBuildPlan = stringValue(stageThreeContent?.stage_4_build_plan);
  const stageThreeSources = arrayOrString(stageThreeContent?.source_inventory);
  const stageThreeRisks = arrayOrString(stageThreeContent?.data_quality_risks);
  const persistedOnboardingSnapshot = useMemo(
    () => stageFourOnboardingSnapshotFromImplementation(latestImplementationArtifact?.content_json),
    [latestImplementationArtifact],
  );
  const persistedBuildSnapshot = useMemo(
    () => stageFourBuildSnapshotFromImplementation(latestImplementationArtifact?.content_json),
    [latestImplementationArtifact],
  );

  const persistedGuideChecks = useMemo(
    () => stageFourGuideChecksFromArtifacts(artifacts),
    [artifacts],
  );
  const [guideChecks, setGuideChecks] = useState<StageFourGuideChecks>(
    () => persistedGuideChecks,
  );
  const [guideTouched, setGuideTouched] = useState(false);
  const [onboardingChecks, setOnboardingChecks] =
    useState<StageFourOnboardingChecks>(
      () => persistedOnboardingSnapshot?.checks ?? emptyOnboardingChecks,
    );
  const [onboardingDraft, setOnboardingDraft] =
    useState<StageFourOnboardingDraft>(
      () => persistedOnboardingSnapshot?.draft ?? emptyOnboardingDraft,
    );
  const [onboardingTouched, setOnboardingTouched] = useState(false);
  const [onboardingSaved, setOnboardingSaved] = useState(
    () => persistedOnboardingSnapshot?.saved ?? false,
  );
  const [buildChecks, setBuildChecks] = useState<StageFourBuildChecks>(emptyBuildChecks);
  const [buildDraft, setBuildDraft] = useState<StageFourBuildDraft>(
    () => persistedBuildSnapshot?.draft ?? emptyBuildDraft,
  );
  const [buildTouched, setBuildTouched] = useState(false);
  const [testTargetDraft, setTestTargetDraft] = useState<StageFourTestTargetDraft>(() =>
    stageFourTestTargetFromPersistedReport(
      latestTestReportArtifact?.content_json,
      testTargetFromImplementation(latestImplementationArtifact) ?? testTargetFromBuildDraft(emptyBuildDraft),
    ),
  );
  const [platformRun, setPlatformRun] = useState<StageFourPlatformTestRun | null>(null);
  const persistedPlatformRun = useMemo(
    () =>
      stageFourPlatformRunFromPersistedReport(
        latestTestReportArtifact?.content_json,
        testTargetDraft,
      ),
    [latestTestReportArtifact, testTargetDraft],
  );
  const displayPlatformRun = platformRun ?? persistedPlatformRun;
  const activeOnboardingChecks =
    onboardingTouched ? onboardingChecks : persistedOnboardingSnapshot?.checks ?? onboardingChecks;
  const activeOnboardingDraft =
    onboardingTouched ? onboardingDraft : persistedOnboardingSnapshot?.draft ?? onboardingDraft;
  const activeOnboardingSaved =
    onboardingTouched ? onboardingSaved : persistedOnboardingSnapshot?.saved ?? onboardingSaved;
  const activeBuildChecks = buildTouched ? buildChecks : persistedBuildSnapshot?.checks ?? buildChecks;
  const activeBuildDraft = buildTouched ? buildDraft : persistedBuildSnapshot?.draft ?? buildDraft;

  const activeGuideChecks = guideTouched ? guideChecks : persistedGuideChecks;
  const guideReady = isStageFourGuideReady(activeGuideChecks);
  const onboardingReady = isStageFourOnboardingReady(activeOnboardingDraft, activeOnboardingChecks);
  const buildReady = isStageFourBuildReady(activeBuildDraft, activeBuildChecks);
  const targetReady = isTestTargetReady(testTargetDraft);
  const runPassed =
    platformRun !== null && platformRun.totalScore >= 80 && platformRun.severeCount === 0;
  const displayRunPassed =
    displayPlatformRun !== null &&
    displayPlatformRun.totalScore >= 80 &&
    displayPlatformRun.severeCount === 0;
  const canSaveTestReport = latestImplementationArtifact !== null && runPassed;
  const canRequestReview =
    latestImplementationArtifact !== null &&
    latestTestReportArtifact !== null &&
    !latestReviewArtifact &&
    !locked &&
    !completed;
  const canComplete =
    latestImplementationArtifact !== null &&
    latestTestReportArtifact !== null &&
    latestReviewArtifact !== null &&
    !locked &&
    !completed;

  function switchMode(mode: StageFourMode) {
    onModeChange(mode);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
    });
  }

  async function handleSaveImplementation() {
    if (!buildReady || locked || completed) {
      return false;
    }
    const success = await onSaveImplementation(
      createStageFourImplementationPayloadFromVNext({
        buildChecks: activeBuildChecks,
        buildDraft: activeBuildDraft,
        onboardingChecks: activeOnboardingChecks,
        onboardingDraft: activeOnboardingDraft,
        stageThreeBuildPlan,
      }),
    );
    if (success) {
      setTestTargetDraft(testTargetFromBuildDraft(activeBuildDraft));
      switchMode("test");
    }
    return success;
  }

  async function handleSaveOnboarding() {
    if (!onboardingReady || locked || completed) {
      return false;
    }
    const success = await onSaveImplementation(
      createStageFourOnboardingImplementationPayload({
        onboardingChecks: activeOnboardingChecks,
        onboardingDraft: activeOnboardingDraft,
        stageThreeBuildPlan,
      }),
    );
    if (success) {
      setOnboardingSaved(true);
      setOnboardingTouched(false);
    }
    return success;
  }

  async function handleRunTests() {
    if (!targetReady) {
      return false;
    }
    const artifact = await onRunAgentTests({
      access_note: testTargetDraft.accessNote.trim(),
      api_endpoint: testTargetDraft.apiEndpoint.trim(),
      api_key: testTargetDraft.apiKey?.trim() || undefined,
      api_type: "dify_chat_messages",
      app_name: testTargetDraft.appName.trim(),
      knowledge_name: testTargetDraft.knowledgeName.trim(),
      publish_url: testTargetDraft.publishUrl.trim(),
    });
    if (!artifact) {
      return false;
    }
    const run = stageFourPlatformRunFromPersistedReport(artifact.content_json, testTargetDraft);
    setPlatformRun(run);
    return run !== null;
  }

  async function handleSaveTestReport() {
    if (!platformRun || !canSaveTestReport || locked || completed) {
      return false;
    }
    const success = await onSaveTestReport(createStageFourTestReportPayloadFromRun(platformRun));
    if (success) {
      setPlatformRun(null);
    }
    return success;
  }

  if (locked) {
    return (
      <div className={stageFourPageClass(workspaceMode)}>
        <StageFourTopbar
          isRefreshing={isRefreshing}
          onBackToPath={onBackToPath}
          onRefresh={onRefresh}
          statusLabel={status.label}
          step={workspaceMode}
        />
        <main className="agent-guide-shell">
          <EmptyState title="阶段四尚未解锁">
            完成阶段三知识工程决策和评审后，智能体实现与测试流程会自动开启。
          </EmptyState>
        </main>
      </div>
    );
  }

  return (
    <div className={stageFourPageClass(workspaceMode)}>
      <StageFourTopbar
        isRefreshing={isRefreshing}
        onBackToPath={onBackToPath}
        onRefresh={onRefresh}
        statusLabel={status.label}
        step={workspaceMode}
      />
      <StageFourFlowNav currentStep={workspaceMode} onStepChange={switchMode} />

      {workspaceMode === "guide" ? (
        <StageFourGuideView
          checks={activeGuideChecks}
          onCheckChange={(key, value) => {
            setGuideTouched(true);
            setGuideChecks((current) => ({
              ...(guideTouched ? current : activeGuideChecks),
              [key]: value,
            }));
          }}
          onNext={async () => {
            const saved = await onSaveGuideConfirmation({ checks: activeGuideChecks });
            if (saved) {
              setGuideTouched(false);
              switchMode("onboarding");
            }
          }}
          ready={guideReady}
        />
      ) : null}

      {workspaceMode === "onboarding" ? (
        <StageFourOnboardingView
          checks={activeOnboardingChecks}
          draft={activeOnboardingDraft}
          onCheckChange={(key, value) => {
            setOnboardingTouched(true);
            setOnboardingSaved(false);
            setOnboardingChecks((current) => ({
              ...(onboardingTouched ? current : activeOnboardingChecks),
              [key]: value,
            }));
          }}
          onDraftChange={(patch) => {
            setOnboardingTouched(true);
            setOnboardingSaved(false);
            setOnboardingDraft((current) => ({
              ...(onboardingTouched ? current : activeOnboardingDraft),
              ...patch,
            }));
          }}
          onFillDemo={() => {
            setOnboardingTouched(true);
            setOnboardingDraft(demoOnboardingDraft());
            setOnboardingChecks(allOnboardingChecks());
            setOnboardingSaved(false);
          }}
          onNext={() => switchMode("build")}
          onSave={handleSaveOnboarding}
          ready={onboardingReady}
          saved={activeOnboardingSaved}
        />
      ) : null}

      {workspaceMode === "build" ? (
        <StageFourBuildView
          checks={activeBuildChecks}
          completed={completed}
          draft={activeBuildDraft}
          isSaving={isSavingImplementation}
          onCheckChange={(key, value) => {
            setBuildTouched(true);
            setBuildChecks((current) => ({
              ...(buildTouched ? current : activeBuildChecks),
              [key]: value,
            }));
          }}
          onDraftChange={(patch) => {
            setBuildTouched(true);
            setBuildDraft((current) => ({
              ...(buildTouched ? current : activeBuildDraft),
              ...patch,
            }));
          }}
          onFillDemo={() => {
            setBuildTouched(true);
            setBuildDraft(demoBuildDraft());
            setBuildChecks(allBuildChecks());
          }}
          onSave={handleSaveImplementation}
          ready={buildReady}
        />
      ) : null}

      {workspaceMode === "test" ? (
        <StageFourTestScoreView
          canComplete={canComplete}
          canRequestReview={canRequestReview}
          canSaveTestReport={canSaveTestReport}
          completed={completed}
          isCompleting={isCompletingStage}
          isRequestingReview={isRequestingReview}
          isSavingTestReport={isSavingTestReport}
          latestReviewArtifact={latestReviewArtifact}
          latestTestReportArtifact={latestTestReportArtifact}
          onCompleteStage={onCompleteStage}
          onRequestReview={onRequestReview}
          onRunTests={handleRunTests}
          onSaveTestReport={handleSaveTestReport}
          onTargetChange={(patch) =>
            setTestTargetDraft((current) => ({ ...current, ...patch }))
          }
          onTargetLoad={() =>
            setTestTargetDraft(
              testTargetFromImplementation(latestImplementationArtifact) ??
                stageFourTestTargetFromPersistedReport(
                  latestTestReportArtifact?.content_json,
                  testTargetFromBuildDraft(activeBuildDraft),
                ),
            )
          }
          platformRun={displayPlatformRun}
          runPassed={displayRunPassed}
          targetDraft={testTargetDraft}
          targetReady={targetReady}
        />
      ) : null}
    </div>
  );
}

function StageFourTopbar({
  isRefreshing,
  onBackToPath,
  onRefresh,
  statusLabel,
  step,
}: {
  isRefreshing: boolean;
  onBackToPath: () => void;
  onRefresh: () => void;
  statusLabel: string;
  step: StageFourMode;
}) {
  return (
    <header className="agent-guide-topbar">
      <a className="agent-guide-brand" href="/student">
        <span>FDE</span>
        <strong>{stageFourTopbarTitle(step)}</strong>
      </a>
      <nav aria-label="阶段导航" className="agent-guide-nav">
        <button onClick={() => window.history.back()} type="button">
          阶段三 RAG
        </button>
        <button className="active" type="button">
          阶段四实现
        </button>
        <button
          disabled={isRefreshing}
          onClick={onRefresh}
          type="button"
        >
          同步进度
        </button>
      </nav>
      <div className="agent-guide-status">
        <span>Stage 04</span>
        <strong>
          {stageFourStepCopy(step)} · {statusLabel}
        </strong>
      </div>
      <button className="agent-path-return" onClick={onBackToPath} type="button">
        返回实验路径
      </button>
    </header>
  );
}

function StageFourFlowNav({
  currentStep,
  onStepChange,
}: {
  currentStep: StageFourMode;
  onStepChange: (step: StageFourMode) => void;
}) {
  const steps: Array<{ key: StageFourMode; label: string; number: string }> = [
    { key: "guide", label: "实现导学", number: "01" },
    { key: "onboarding", label: "Dify 入门", number: "02" },
    { key: "build", label: "搭建工作台", number: "03" },
    { key: "test", label: "测试与评分", number: "04" },
  ];
  return (
    <nav aria-label="阶段四学习路径" className="agent-flow-nav">
      {steps.map((step) => {
        const active = step.key === currentStep;
        return (
          <button
            className={active ? "active" : undefined}
            key={step.key}
            onClick={() => onStepChange(step.key)}
            type="button"
          >
            <span>{step.number}</span>
            <strong className="text-sm font-extrabold">{step.label}</strong>
          </button>
        );
      })}
    </nav>
  );
}

function StageFourGuideView({
  checks,
  onCheckChange,
  onNext,
  ready,
}: {
  checks: StageFourGuideChecks;
  onCheckChange: (key: keyof StageFourGuideChecks, value: boolean) => void;
  onNext: () => void;
  ready: boolean;
}) {
  const gateItems: Array<{ key: keyof StageFourGuideChecks; label: string }> = [
    {
      key: "agentArchitecture",
      label: "我知道智能体由角色、检索、引用、边界和日志组成",
    },
    {
      key: "stageThreeTransfer",
      label: "我知道阶段三成果要落到配置、分支或测试用例里",
    },
    {
      key: "riskBoundaries",
      label: "我知道资料不足和责任判定不能直接生成结论",
    },
    {
      key: "testableRules",
      label: "我准备把制造业质检场景写成可测试的智能体规则",
    },
  ];
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showGuideToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2600);
  }

  function handleGateChange(key: keyof StageFourGuideChecks, value: boolean) {
    const nextChecks = { ...checks, [key]: value };
    onCheckChange(key, value);
    if (isStageFourGuideReady(nextChecks)) {
      showGuideToast(stageFourGuideReadyToast);
    }
  }

  function handleNextClick() {
    if (!ready) {
      showGuideToast(stageFourGuideBlockedToast);
      return;
    }
    onNext();
  }

  return (
    <>
    <main className="agent-guide-shell">
      <section className="agent-guide-hero" aria-labelledby="agent-guide-title">
        <div>
          <p className="agent-kicker">Implementation Guide</p>
          <h1 id="agent-guide-title">把知识库决策转成可运行的质检智能体。</h1>
          <p>
            阶段四不只是把 RAG 知识库接到对话框里。学生需要把角色、Prompt、检索、引用、边界规则和测试用例组合成一个可交付的智能体行为系统。
          </p>
        </div>
        <aside className="agent-guide-brief" aria-label="本页产物">
          <span>本页完成后</span>
          <strong>理解智能体实现的模块关系</strong>
          <p>明确阶段三成果如何进入阶段四配置，并准备进入搭建工作台。</p>
        </aside>
      </section>

      <div className="agent-guide-layout">
        <div className="agent-guide-main">
          <section aria-labelledby="agent-architecture-title" className="agent-guide-section">
            <div className="agent-section-head">
              <p className="agent-kicker">Agent Architecture</p>
              <h2 id="agent-architecture-title">一个可交付智能体由哪些模块组成？</h2>
              <p>制造业质检追溯智能体的核心不是“会回答”，而是能在证据、边界和流程约束下稳定回答。</p>
            </div>
            <div aria-label="智能体模块关系" className="agent-architecture-map">
              {stageFourGuideArchitectureItems.map((item) => (
                <article key={item.number}>
                  <span>{item.number}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="agent-inputs-title" className="agent-guide-section">
            <div className="agent-section-head">
              <p className="agent-kicker">From Stage 03</p>
              <h2 id="agent-inputs-title">阶段三成果如何进入阶段四实现？</h2>
              <p>阶段三的每个 RAG 决策都应该落到阶段四的配置、工作流或测试用例里，而不是停留在文档说明。</p>
            </div>
            <div aria-label="阶段三成果到阶段四配置映射" className="agent-transfer-table" role="table">
              <div className="head" role="row">
                <span role="columnheader">阶段三成果</span>
                <span role="columnheader">进入阶段四后变成</span>
                <span role="columnheader">学生需要检查</span>
              </div>
              {stageFourGuideTransferRows.map((row) => (
                <div key={row.source} role="row">
                  <span>{row.source}</span>
                  <span>{row.target}</span>
                  <span>{row.check}</span>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="agent-prompt-title" className="agent-guide-section">
            <div className="agent-section-head">
              <p className="agent-kicker">Prompt & Workflow</p>
              <h2 id="agent-prompt-title">Prompt 不是一句角色设定，而是一组产品行为规则。</h2>
              <p>学生需要把智能体角色、任务范围、引用要求、拒答边界和转人工条件写成可测试的规则。</p>
            </div>
            <div className="agent-rule-grid">
              {stageFourGuideRuleItems.map((item) => (
                <article key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="agent-case-title" className="agent-guide-section">
            <div className="agent-section-head split">
              <div>
                <p className="agent-kicker">Case Walkthrough</p>
                <h2 id="agent-case-title">同一个审厂问题，在阶段四要如何被智能体处理？</h2>
                <p>这里先用方法拆解，下一页再进入真实搭建与测试工作台。</p>
              </div>
            </div>
            <div className="agent-case-flow">
              {stageFourGuideCaseFlowItems.map((item) => (
                <article key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.body}</strong>
                </article>
              ))}
            </div>
          </section>
        </div>

      <aside className="agent-guide-side">
        <section className="agent-side-card">
          <p className="agent-kicker">Learning Gate</p>
          <h2>进入搭建前确认</h2>
          {gateItems.map((item) => (
            <label key={item.key}>
              <input
                checked={checks[item.key]}
                onChange={(event) => handleGateChange(item.key, event.target.checked)}
                type="checkbox"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </section>

        <section className="agent-side-card outline">
          <span>Next</span>
          <p>完成导学确认后，先进入 Dify 入门与操作练习，熟悉应用创建、发布链接和平台记录同步。</p>
          <button
            data-disabled={!ready}
            className={`agent-next-link ${ready ? "" : "disabled"}`.trim()}
            onClick={handleNextClick}
            type="button"
          >
            进入 Dify 入门练习
          </button>
        </section>

      </aside>
      </div>
    </main>
      <div
        className={`toast ${toastVisible ? "show" : ""}`.trim()}
        data-agent-toast
        role="status"
        aria-live="polite"
      >
        {toastMessage}
      </div>
    </>
  );
}

function StageFourOnboardingView({
  checks,
  draft,
  onCheckChange,
  onDraftChange,
  onFillDemo,
  onNext,
  onSave,
  ready,
  saved,
}: {
  checks: StageFourOnboardingChecks;
  draft: StageFourOnboardingDraft;
  onCheckChange: (key: keyof StageFourOnboardingChecks, value: boolean) => void;
  onDraftChange: (patch: Partial<StageFourOnboardingDraft>) => void;
  onFillDemo: () => void;
  onNext: () => void;
  onSave: () => Promise<boolean>;
  ready: boolean;
  saved: boolean;
}) {
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showOnboardingToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2600);
  }

  function handleFillDemoClick() {
    onFillDemo();
    showOnboardingToast(stageFourOnboardingDemoFilledToast);
  }

  async function handleSaveClick() {
    if (!ready) {
      showOnboardingToast(stageFourOnboardingBlockedToast);
      return;
    }
    showOnboardingToast("正在保存 Dify 入门记录");
    const saved = await onSave();
    showOnboardingToast(saved ? stageFourOnboardingSavedToast : "Dify 入门记录保存失败，请稍后重试");
  }

  function handleNextClick() {
    if (!ready || !saved) {
      showOnboardingToast(stageFourOnboardingNextBlockedToast);
      return;
    }
    onNext();
  }

  return (
    <>
    <main className="agent-guide-shell dify-shell">
      <section className="agent-guide-hero dify-hero" aria-labelledby="dify-title">
        <div>
          <p className="agent-kicker">Dify Guided Practice</p>
          <h1 id="dify-title">按真实 Chatflow 流程完成一次 Dify 上手。</h1>
          <p>
            学生需要在 Dify 中创建 Chatflow 应用，理解默认画布里的开始、LLM、直接回复节点，完成模型配置、连线检查、预览调试和发布回填。
          </p>
        </div>
        <aside className="agent-guide-brief" aria-label="本页完成标准">
          <span>完成标准</span>
          <strong>8 个 Chatflow 操作步骤 + 1 条发布记录</strong>
          <p>每一步都要勾选完成；节点配置、连线检查、发布链接和调试记录保存后，平台才允许进入正式构建工作台。</p>
        </aside>
      </section>

      <div className="dify-workbench dify-runbook">
      <section className="dify-main" aria-label="Dify 入门逐步操作">
        <section className="agent-guide-section dify-section dify-quick-map">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <SectionHead eyebrow="Before You Start" title="先认清 Chatflow 画布里的关键对象。">
              每个步骤都围绕工作室、Chatflow 类型、节点画布、右侧配置面板、预览和发布展开。
            </SectionHead>
            <button
              className="dify-secondary-action"
              onClick={handleFillDemoClick}
              type="button"
            >
              填入演示记录
            </button>
          </div>
          <div className="dify-concept-grid compact">
            {[
              ["应用类型", "选择 Chatflow", "应用类型必须选择 Chatflow，而不是普通聊天助手。"],
              ["开始节点", "接收用户输入", "默认开始节点提供 query 和可选 files。"],
              ["LLM 节点", "配置模型与上下文", "选择模型、写入指令，并引用用户输入变量。"],
              ["直接回复", "输出 LLM 结果", "读取 LLM 的 text 输出并保持正确连线。"],
              ["预览发布", "调试后再发布", "先用 Preview 验证流程可运行，再复制发布链接。"],
            ].map(([label, title, body]) => (
              <article key={title}>
                <span>{label}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="dify-runbook-list" aria-label="Dify 逐步操作确认">
          {stageFourOnboardingRunbookSteps.map((step) => (
            <DifyRunbookStep
              checked={checks[step.key]}
              draft={draft}
              key={step.key}
              onCheckChange={(value) => onCheckChange(step.key, value)}
              onDraftChange={onDraftChange}
              step={step}
            />
          ))}
        </section>
      </section>

      <aside className="dify-side">
        <DifyOnboardingSide
          checks={checks}
          draft={draft}
          onNext={handleNextClick}
          onSave={handleSaveClick}
          ready={ready}
          saved={saved}
        />
      </aside>
      </div>
    </main>
      <div
        className={`toast ${toastVisible ? "show" : ""}`.trim()}
        data-dify-toast
        role="status"
        aria-live="polite"
      >
        {toastMessage}
      </div>
    </>
  );
}

function StageFourBuildView({
  checks,
  completed,
  draft,
  isSaving,
  onCheckChange,
  onDraftChange,
  onFillDemo,
  onSave,
  ready,
}: {
  checks: StageFourBuildChecks;
  completed: boolean;
  draft: StageFourBuildDraft;
  isSaving: boolean;
  onCheckChange: (key: keyof StageFourBuildChecks, value: boolean) => void;
  onDraftChange: (patch: Partial<StageFourBuildDraft>) => void;
  onFillDemo: () => void;
  onSave: () => Promise<boolean>;
  ready: boolean;
}) {
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showBuildToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2600);
  }

  function handleFillDemoClick() {
    onFillDemo();
    showBuildToast(stageFourBuildDemoFilledToast);
  }

  async function handleSaveBuildClick() {
    if (!ready) {
      showBuildToast(stageFourBuildBlockedToast);
      return;
    }
    const saved = await onSave();
    if (saved) {
      showBuildToast(stageFourBuildSavedToast);
    }
  }

  return (
    <>
    <main className="agent-guide-shell build-shell">
      <section className="agent-guide-hero build-hero" aria-labelledby="build-title">
        <div>
          <p className="agent-kicker">Production Dify Build</p>
          <h1 id="build-title">先创建知识库，再把检索能力接入正式 Chatflow。</h1>
          <p>
            正式项目需要先在 Dify 知识库完成资料上传、分段清洗、索引方式和检索参数配置，确认知识库创建成功后，再回到 Chatflow 完成业务边界、引用回答、转人工分支和发布回填。
          </p>
        </div>
        <aside className="agent-guide-brief" aria-label="本页交付">
          <span>本页产物</span>
          <strong>正式知识库 + 正式 Chatflow + 平台同步记录</strong>
          <p>完成 12 个构建步骤后，学生需要提交知识库名称、文件清单、分段清洗配置、索引与检索配置、节点连线和发布链接。</p>
        </aside>
      </section>

      <div className="build-workbench">
      <section className="build-main" aria-label="正式应用搭建步骤">
        <section className="agent-guide-section build-canvas-section">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <SectionHead eyebrow="Target Build Path" title="知识库配置先完成，Chatflow 负责调用与编排。">
              分段最大长度、重叠长度、文本预处理、索引方式和 Top K 都属于知识库创建过程；Chatflow 中的知识检索节点应调用已配置好的知识库。
            </SectionHead>
            <button
              className="dify-secondary-action"
              onClick={handleFillDemoClick}
              type="button"
            >
              填入演示记录
            </button>
          </div>
          <div className="build-flow-map build-flow-map-expanded">
            {stageFourBuildFlowNodes.map((node) => (
              <article className={`node ${node.className}`} data-build-node={node.className} key={node.code}>
                <span>{node.code}</span>
                <strong>{node.title}</strong>
                <p>{node.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="build-step-list" aria-label="正式项目逐步搭建">
          {stageFourBuildRunbookSteps.map((step) => (
            <BuildRunbookStep
              checked={checks[step.key]}
              draft={draft}
              key={step.key}
              onCheckChange={(value) => onCheckChange(step.key, value)}
              onDraftChange={onDraftChange}
              step={step}
            />
          ))}
        </section>

        <section className="agent-guide-section build-test-preview" id="standard-test" aria-labelledby="standard-test-title">
          <div className="agent-section-head split">
            <div>
              <p className="agent-kicker">Next Test</p>
              <h2 id="standard-test-title">进入下一步前，平台会用这些题型测试你的 Dify 应用。</h2>
              <p>本页不直接评分，但会让学生提前知道自动化测试关注什么。正式测试结果会在下一页展开。</p>
            </div>
          </div>
          <div className="build-test-grid">
            {stageFourBuildTestPreviewCards.map((card) => (
              <article key={card.label}>
                <span>{card.label}</span>
                <strong>{card.title}</strong>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <aside className="build-side" aria-label="正式搭建完成门禁">
        <BuildWorkbenchSide
          checks={checks}
          completed={completed}
          draft={draft}
          isSaving={isSaving}
          onSave={handleSaveBuildClick}
          ready={ready}
        />
      </aside>
      </div>
    </main>
      <div
        className={`toast ${toastVisible ? "show" : ""}`.trim()}
        data-build-toast
        role="status"
        aria-live="polite"
      >
        {toastMessage}
      </div>
    </>
  );
}

function StageFourTestScoreView({
  canComplete,
  canRequestReview,
  canSaveTestReport,
  completed,
  isCompleting,
  isRequestingReview,
  isSavingTestReport,
  latestReviewArtifact,
  latestTestReportArtifact,
  onCompleteStage,
  onRequestReview,
  onRunTests,
  onSaveTestReport,
  onTargetChange,
  onTargetLoad,
  platformRun,
  runPassed,
  targetDraft,
  targetReady,
}: {
  canComplete: boolean;
  canRequestReview: boolean;
  canSaveTestReport: boolean;
  completed: boolean;
  isCompleting: boolean;
  isRequestingReview: boolean;
  isSavingTestReport: boolean;
  latestReviewArtifact: Artifact | null;
  latestTestReportArtifact: Artifact | null;
  onCompleteStage: () => Promise<boolean>;
  onRequestReview: () => Promise<boolean>;
  onRunTests: () => Promise<boolean>;
  onSaveTestReport: () => Promise<boolean>;
  onTargetChange: (patch: Partial<StageFourTestTargetDraft>) => void;
  onTargetLoad: () => void;
  platformRun: StageFourPlatformTestRun | null;
  runPassed: boolean;
  targetDraft: StageFourTestTargetDraft;
  targetReady: boolean;
}) {
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState<{
    message: string;
    tone: "danger" | "info" | "success";
  } | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showTestToast(message: string, autoHide = true) {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = autoHide ? setTimeout(() => setToastVisible(false), 2600) : null;
  }

  async function handleRunTestsClick() {
    if (!targetReady) {
      showTestToast(stageFourTestTargetRequiredToast);
      return;
    }
    const tested = await onRunTests();
    showTestToast(
      tested ? stageFourTestReadyToast : "后端测试未完成，请查看顶部错误提示或检查 API 地址",
    );
  }

  async function handleSaveTestReportClick() {
    if (!canSaveTestReport) {
      showTestToast(stageFourTestBlockedToast);
      return;
    }
    const saved = await onSaveTestReport();
    if (saved) {
      showTestToast(stageFourTestSavedToast);
    }
  }

  async function handleRequestReviewClick() {
    if (!canRequestReview) {
      const message = latestReviewArtifact ? stageFourTestReviewSavedToast : stageFourTestReviewBlockedToast;
      setReviewFeedback({ message, tone: latestReviewArtifact ? "success" : "danger" });
      showTestToast(message);
      return;
    }
    setReviewFeedback({ message: stageFourTestReviewGeneratingToast, tone: "info" });
    showTestToast(stageFourTestReviewGeneratingToast, false);
    const reviewed = await onRequestReview();
    const message = reviewed ? stageFourTestReviewSavedToast : stageFourTestReviewFailedToast;
    setReviewFeedback({ message, tone: reviewed ? "success" : "danger" });
    showTestToast(message);
  }

  return (
    <>
    <main className="agent-guide-shell test-shell">
      <section className="agent-guide-hero test-hero" aria-labelledby="test-title">
        <div>
          <p className="agent-kicker">Automated Evaluation</p>
          <h1 id="test-title">用平台测试集验证 Dify 智能体是否达到交付门槛。</h1>
          <p>
            学生发布 Dify 应用后，需要把链接提交到 EduFDE。平台会围绕正常追溯、证据引用、资料不足和风险边界执行自动化测试，并把失败项定位到 Prompt、知识库、召回、边界分支或节点连线。
          </p>
        </div>
        <aside className="agent-guide-brief" aria-label="本页交付">
          <span>本页产物</span>
          <strong>自动化测试记录 + 评分结果 + 整改清单</strong>
          <p>通过测试门禁后，学生才能进入阶段五交付说明文档撰写；未通过时，需要回到 Dify 或阶段三对应页面完成整改。</p>
        </aside>
      </section>

      <div className="test-workbench">
      <section className="test-main" aria-label="平台自动化测试工作台">
        <section className="agent-guide-section test-object-card" aria-labelledby="test-object-title">
          <div className="agent-section-head split">
            <div>
              <p className="agent-kicker">Test Target</p>
              <h2 id="test-object-title">测试对象：已发布的 Dify Chatflow 应用。</h2>
              <p>这里保留应用、知识库和访问权限记录，便于教师追踪测试对象是否与正式构建记录一致。</p>
            </div>
            <button
              className="dify-secondary-action"
              onClick={onTargetLoad}
              type="button"
            >
              从搭建记录拉取
            </button>
          </div>
          <div className="test-target-form">
            <TestTargetInput
              label="Dify 应用名称"
              onChange={(value) => onTargetChange({ appName: value })}
              placeholder="制造业质检追溯 AI 助手"
              value={targetDraft.appName}
            />
            <TestTargetInput
              label="知识库名称"
              onChange={(value) => onTargetChange({ knowledgeName: value })}
              placeholder="制造业质检追溯知识库 v1"
              value={targetDraft.knowledgeName}
            />
            <TestTargetInput
              className="wide"
              label="Dify 发布链接"
              onChange={(value) => onTargetChange({ publishUrl: value })}
              placeholder="https://..."
              value={targetDraft.publishUrl}
            />
            <TestTargetInput
              className="wide"
              label="智能体 API 地址"
              onChange={(value) => onTargetChange({ apiEndpoint: value })}
              placeholder="例如：https://api.dify.ai/v1/chat-messages"
              value={targetDraft.apiEndpoint}
            />
            <TestTargetInput
              className="wide"
              label="API Key（运行测试时临时使用，不写入报告）"
              onChange={(value) => onTargetChange({ apiKey: value })}
              placeholder="如果 Dify API 需要密钥，请粘贴 App API Key"
              value={targetDraft.apiKey ?? ""}
            />
            <TestTargetInput
              className="wide"
              kind="textarea"
              label="访问权限说明"
              onChange={(value) => onTargetChange({ accessNote: value })}
              placeholder="说明是否需要测试账号、访问密钥、有效期或白名单。"
              value={targetDraft.accessNote}
            />
          </div>
        </section>

        <section className="agent-guide-section test-suite-section" aria-labelledby="test-suite-title">
          <div className="agent-section-head split">
            <div>
              <p className="agent-kicker">Test Suites</p>
              <h2 id="test-suite-title">平台测试集覆盖四类交付风险。</h2>
              <p>测试不是只看智能体能否回答，而是看它是否命中证据、引用清楚、知道资料不足，并能把责任判定等风险问题转给人工。</p>
            </div>
            <button
              className="agent-next-link test-run-action"
              data-disabled={!targetReady || isSavingTestReport}
              disabled={isSavingTestReport}
              onClick={() => void handleRunTestsClick()}
              type="button"
            >
              {isSavingTestReport ? "测试中" : "开始后端测试"}
              <SearchCheck aria-hidden size={16} />
            </button>
          </div>
          <div className="test-suite-grid">
            {stageFourTestSuiteCards.map(({ body, label, title }) => (
              <article key={title}>
                <span>{label}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="agent-guide-section test-results-section" aria-labelledby="test-results-title">
          <div className="agent-section-head split">
            <div>
              <p className="agent-kicker">Run Results</p>
              <h2 id="test-results-title">自动化测试结果。</h2>
              <p>每条结果都会显示期望行为、实际回答摘要、命中证据和问题定位。学生应根据定位回到 Dify 或阶段三进行整改。</p>
            </div>
            <span className={`test-run-state ${platformRun || latestTestReportArtifact ? "pass" : ""}`}>
              {platformRun ? `测试完成 · ${platformRun.cases.length} 条` : latestTestReportArtifact ? "测试记录已保存" : "等待测试"}
            </span>
          </div>
          <TestResultsList latestTestReportArtifact={latestTestReportArtifact} platformRun={platformRun} />
        </section>

        <section className="agent-guide-section test-remediation-section" aria-labelledby="test-remediation-title">
          <div className="agent-section-head">
            <p className="agent-kicker">Remediation Loop</p>
            <h2 id="test-remediation-title">未通过项必须回到 Dify 或阶段三整改。</h2>
            <p>平台把自动化测试中的风险项转成整改路径。保存测试评分记录后，再通过 AI Gateway 生成阶段四测试反馈并进入阶段收口。</p>
          </div>
          <TestRemediationBoard platformRun={platformRun} />
          <article className="test-empty-state">
            {latestReviewArtifact ? <ReviewSummary artifact={latestReviewArtifact} /> : <p>当前还没有 AI 测试反馈。保存测试评分记录后，生成反馈来检查测试覆盖、实现风险和交付准备度。</p>}
          </article>
        </section>
      </section>

      <aside className="test-side">
        <ScoreCard platformRun={platformRun} />
        <TestQualityGateCard
          canComplete={canComplete}
          canRequestReview={canRequestReview}
          canSaveTestReport={canSaveTestReport}
          completed={completed}
          isCompleting={isCompleting}
          isRequestingReview={isRequestingReview}
          isSavingTestReport={isSavingTestReport}
          latestReviewArtifact={latestReviewArtifact}
          latestTestReportArtifact={latestTestReportArtifact}
          onCompleteStage={onCompleteStage}
          onRequestReview={handleRequestReviewClick}
          onSaveTestReport={handleSaveTestReportClick}
          platformRun={platformRun}
          reviewFeedback={reviewFeedback}
          runPassed={runPassed}
          targetReady={targetReady}
        />
      </aside>
      </div>
    </main>
      <div
        className={`toast ${toastVisible ? "show" : ""}`.trim()}
        data-test-toast
        role="status"
        aria-live="polite"
      >
        {toastMessage}
      </div>
    </>
  );
}

function TestTargetInput({
  className,
  kind = "input",
  label,
  onChange,
  placeholder,
  value,
}: {
  className?: string;
  kind?: "input" | "textarea";
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className={className}>
      <span>{label}</span>
      {kind === "textarea" ? (
        <textarea
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={3}
          value={value}
        />
      ) : (
        <input
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type="text"
          value={value}
        />
      )}
    </label>
  );
}

function TestResultsList({
  latestTestReportArtifact,
  platformRun,
}: {
  latestTestReportArtifact: Artifact | null;
  platformRun: StageFourPlatformTestRun | null;
}) {
  if (platformRun) {
    return (
      <div className="test-result-list">
        {platformRun.cases.map((item) => (
          <article className={`test-result ${item.status}`} key={item.id}>
            <header>
              <span>{item.id}</span>
              <strong>{item.suite}</strong>
              <em>{testStatusCopy(item.status)}</em>
            </header>
            <h3>{item.question}</h3>
            <dl>
              <div>
                <dt>期望行为</dt>
                <dd>{item.expectedBehavior}</dd>
              </div>
              <div>
                <dt>智能体回答</dt>
                <dd>{item.actualAnswer}</dd>
              </div>
              <div>
                <dt>命中证据</dt>
                <dd>{item.evidence}</dd>
              </div>
              <div>
                <dt>问题定位</dt>
                <dd>{item.location}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    );
  }

  if (latestTestReportArtifact) {
    return (
      <article className="test-empty-state">
        <strong>测试评分记录已保存</strong>
        <p>{formatDateTime(latestTestReportArtifact.created_at)} 保存到阶段四 Artifact，重新运行测试可刷新当前页面结果。</p>
      </article>
    );
  }

  return (
    <article className="test-empty-state">
      <strong>尚未运行测试</strong>
      <p>填写或拉取测试对象后，点击“开始自动化测试”。测试结果会在这里展开。</p>
    </article>
  );
}

function TestRemediationBoard({ platformRun }: { platformRun: StageFourPlatformTestRun | null }) {
  if (!platformRun) {
    return (
      <article className="test-empty-state">
        <strong>等待测试结果生成整改清单</strong>
        <p>测试运行后，平台会把需修改项定位到 Prompt、知识库、召回、边界分支或节点连线。</p>
      </article>
    );
  }

  const issues = stageFourTestRemediationItems.length > 0 ? stageFourTestRemediationItems : [
    {
      body: "当前自动化测试没有发现必须整改的失败项，可以保存测试评分记录并进入阶段收口。",
      label: "测试通过",
      title: "进入阶段五准备",
      tone: "pass" as const,
    },
  ];

  return (
    <div className="test-fix-board">
      {issues.map((item) => (
        <article className={item.tone} key={item.title}>
          <span>{item.label}</span>
          <strong>{item.title}</strong>
          <p>{item.body}</p>
        </article>
      ))}
    </div>
  );
}

function TestQualityGateCard({
  canComplete,
  canRequestReview,
  canSaveTestReport,
  completed,
  isCompleting,
  isRequestingReview,
  isSavingTestReport,
  latestReviewArtifact,
  latestTestReportArtifact,
  onCompleteStage,
  onRequestReview,
  onSaveTestReport,
  platformRun,
  reviewFeedback,
  runPassed,
  targetReady,
}: {
  canComplete: boolean;
  canRequestReview: boolean;
  canSaveTestReport: boolean;
  completed: boolean;
  isCompleting: boolean;
  isRequestingReview: boolean;
  isSavingTestReport: boolean;
  latestReviewArtifact: Artifact | null;
  latestTestReportArtifact: Artifact | null;
  onCompleteStage: () => Promise<boolean>;
  onRequestReview: () => Promise<void>;
  onSaveTestReport: () => Promise<void>;
  platformRun: StageFourPlatformTestRun | null;
  reviewFeedback: { message: string; tone: "danger" | "info" | "success" } | null;
  runPassed: boolean;
  targetReady: boolean;
}) {
  const gates = [
    { done: targetReady, label: "测试对象记录完整" },
    { done: platformRun !== null || latestTestReportArtifact !== null, label: "已完成自动化测试" },
    { done: runPassed, label: "总分达到 80 分" },
    { done: platformRun ? platformRun.severeCount === 0 : false, label: "无严重失败项" },
    { done: latestReviewArtifact !== null, label: "AI 测试反馈已生成" },
  ];

  return (
    <>
      <section className="agent-side-card build-sync-card">
        <p className="agent-kicker">Quality Gate</p>
        <h2>进入阶段五门禁</h2>
        <ul className="dify-gate-list">
          {gates.map((gate) => (
            <li className={gate.done ? "done" : undefined} key={gate.label}>
              {gate.label}
            </li>
          ))}
        </ul>
        <button
          className={`agent-next-link dify-save-action ${!canSaveTestReport || isSavingTestReport || completed || latestTestReportArtifact ? "disabled" : ""}`.trim()}
          data-disabled={!canSaveTestReport || isSavingTestReport || completed || latestTestReportArtifact !== null}
          disabled={isSavingTestReport || completed || latestTestReportArtifact !== null}
          onClick={() => void onSaveTestReport()}
          type="button"
        >
          <Save aria-hidden size={16} />
          {latestTestReportArtifact ? "测试报告已保存" : isSavingTestReport ? "保存中" : "保存测试评分记录"}
        </button>
        <button
          className={`agent-next-link ${!canRequestReview || isRequestingReview ? "disabled" : ""}`.trim()}
          disabled={!canRequestReview || isRequestingReview}
          onClick={() => void onRequestReview()}
          type="button"
        >
          <SearchCheck aria-hidden size={16} />
          {isRequestingReview ? "反馈生成中" : "生成测试反馈"}
        </button>
        {reviewFeedback ? (
          <p
            aria-live="polite"
            className={`test-review-feedback ${reviewFeedback.tone}`}
            data-test-review-feedback
            role={reviewFeedback.tone === "danger" ? "alert" : "status"}
          >
            {reviewFeedback.message}
          </p>
        ) : null}
        <button
          className={`agent-next-link ${!canComplete || isCompleting ? "disabled" : ""}`.trim()}
          disabled={!canComplete || isCompleting}
          onClick={() => void onCompleteStage()}
          type="button"
        >
          <CheckCircle2 aria-hidden size={16} />
          {completed ? "阶段四已完成" : isCompleting ? "确认中" : "进入阶段五交付文档"}
        </button>
      </section>

      <section className="agent-side-card test-evidence-card">
        <p className="agent-kicker">Evidence</p>
        <h2>本页需要留下的证据</h2>
        <p>
          测试对象、五条测试结果、总分、维度分、整改路径和 AI 测试反馈都会进入阶段四档案袋，作为阶段五交付说明的前置证据。
        </p>
      </section>
    </>
  );
}

function testStatusCopy(status: StageFourPlatformTestRun["cases"][number]["status"]) {
  const labels = {
    fail: "失败",
    pass: "通过",
    warn: "需修改",
  };
  return labels[status];
}

function HeroPanel({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="rounded-[18px] bg-emerald-50 p-5">
      <p className="text-xs font-extrabold uppercase tracking-[.12em] text-emerald-700">{eyebrow}</p>
      <h3 className="mt-3 max-w-4xl text-2xl font-extrabold leading-tight text-slate-950">{title}</h3>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700">{children}</p>
    </section>
  );
}

function SectionHead({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[.12em] text-emerald-700">{eyebrow}</p>
      <h3 className="mt-2 text-lg font-extrabold leading-tight text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-500">{children}</p>
    </div>
  );
}

function TransferCard({
  label,
  target,
  todo,
}: {
  label: string;
  target: string;
  todo: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-extrabold text-slate-500">阶段三成果</p>
      <h4 className="mt-1 text-sm font-extrabold text-slate-950">{label}</h4>
      <p className="mt-3 text-xs font-extrabold text-emerald-700">进入阶段四后变成</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{target}</p>
      <p className="mt-3 text-xs font-extrabold text-amber-700">学生需要检查</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{todo}</p>
    </article>
  );
}

function DifyRunbookStep({
  checked,
  draft,
  onCheckChange,
  onDraftChange,
  step,
}: {
  checked: boolean;
  draft: StageFourOnboardingDraft;
  onCheckChange: (value: boolean) => void;
  onDraftChange: (patch: Partial<StageFourOnboardingDraft>) => void;
  step: (typeof stageFourOnboardingRunbookSteps)[number];
}) {
  return (
    <article className={`dify-runbook-step ${checked ? "done" : ""}`.trim()} data-step-card={step.key}>
      <header>
        <span>{step.number}</span>
        <div>
          <h2>{step.title}</h2>
          <p>{step.goal}</p>
        </div>
      </header>
      <div className="dify-step-grid">
        <div>
          <h3>{step.instructionTitle}</h3>
          {step.testQuestions ? (
            <ul className="dify-test-list">
              {step.testQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          ) : null}
          {step.showFlowMini ? <DifyFlowMini /> : null}
          <ol>
            {step.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ol>
          {step.promptTemplate ? (
            <>
              <h3>建议写入 LLM 指令</h3>
              <pre className="dify-prompt-template">{step.promptTemplate}</pre>
            </>
          ) : null}
          {step.inlineNote ? <div className="dify-inline-note">{step.inlineNote}</div> : null}
        </div>
        <div>
          <h3>{step.fieldTitle}</h3>
          {step.fields.map((field) => (
            <DifyOnboardingField
              draft={draft}
              field={field}
              key={field.draftKey}
              onDraftChange={onDraftChange}
            />
          ))}
        </div>
      </div>
      <label className="dify-step-confirm">
        <input checked={checked} onChange={(event) => onCheckChange(event.target.checked)} type="checkbox" />
        <span>{step.confirmLabel}</span>
      </label>
    </article>
  );
}

function DifyFlowMini() {
  return (
    <div className="dify-flow-mini" aria-label="Chatflow 默认节点关系">
      <span className="dify-flow-node start">开始 / 用户输入</span>
      <span className="dify-flow-line" />
      <span className="dify-flow-node llm">LLM</span>
      <span className="dify-flow-line" />
      <span className="dify-flow-node answer">直接回复</span>
    </div>
  );
}

function DifyOnboardingField({
  draft,
  field,
  onDraftChange,
}: {
  draft: StageFourOnboardingDraft;
  field: StageFourOnboardingField;
  onDraftChange: (patch: Partial<StageFourOnboardingDraft>) => void;
}) {
  const value = draft[field.draftKey];
  function update(nextValue: string) {
    onDraftChange({ [field.draftKey]: nextValue } as Partial<StageFourOnboardingDraft>);
  }

  if (field.kind === "textarea") {
    return (
      <label>
        <span>{field.label}</span>
        <textarea
          onChange={(event) => update(event.target.value)}
          placeholder={field.placeholder}
          rows={field.rows ?? 5}
          value={value}
        />
      </label>
    );
  }

  if (field.kind === "select") {
    return (
      <label>
        <span>{field.label}</span>
        <select onChange={(event) => update(event.target.value)} value={value}>
          <option value="">{field.placeholder}</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label>
      <span>{field.label}</span>
      <input onChange={(event) => update(event.target.value)} placeholder={field.placeholder} value={value} />
    </label>
  );
}

function DifyOnboardingSide({
  checks,
  draft,
  onNext,
  onSave,
  ready,
  saved,
}: {
  checks: StageFourOnboardingChecks;
  draft: StageFourOnboardingDraft;
  onNext: () => void;
  onSave: () => void;
  ready: boolean;
  saved: boolean;
}) {
  const doneCount = stageFourOnboardingStepOrder.filter((key) => checks[key]).length;
  const progress = `${Math.round((doneCount / stageFourOnboardingStepOrder.length) * 100)}%`;
  const gates = [
    { done: onboardingFieldsReady(draft), label: "应用、节点配置、连线、测试记录完整" },
    { done: isHttpUrl(draft.publishUrl), label: "发布链接格式有效" },
    {
      done: stageFourOnboardingStepOrder.every((key) => checks[key]),
      label: "8 个 Chatflow 操作步骤已确认",
    },
  ];

  return (
    <>
      <section className="agent-side-card dify-status-card">
        <p className="agent-kicker">Step Progress</p>
        <h2>逐步完成状态</h2>
        <div className="dify-completion-meter" aria-label="完成度">
          <span style={{ "--value": progress } as CSSProperties} />
        </div>
        <ul className="dify-gate-list step-gates">
          {stageFourOnboardingStepOrder.map((key, index) => (
            <li className={checks[key] ? "done" : undefined} key={key}>
              {String(index + 1).padStart(2, "0")} {onboardingStepCopy(key)}
            </li>
          ))}
        </ul>
      </section>

      <section className="agent-side-card">
        <p className="agent-kicker">Platform Sync</p>
        <h2>平台记录完整性</h2>
        <ul className="dify-gate-list">
          {gates.map((gate) => (
            <li className={gate.done ? "done" : undefined} key={gate.label}>
              {gate.label}
            </li>
          ))}
        </ul>
        <button
          data-disabled={!ready}
          className={`agent-next-link dify-save-action ${ready ? "" : "disabled"}`.trim()}
          onClick={onSave}
          type="button"
        >
          保存 Dify 入门记录
        </button>
        <button
          data-disabled={!ready || !saved}
          className={`agent-next-link ${ready && saved ? "" : "disabled"}`.trim()}
          onClick={onNext}
          type="button"
        >
          进入正式构建工作台
        </button>
      </section>

      <section className="agent-side-card dify-handoff-card">
        <p className="agent-kicker">Why Sync</p>
        <h2>为什么要回填平台</h2>
        <p>
          Dify 是操作环境，EduFDE 是教学评审环境。学生需要把关键配置、测试记录和发布链接同步回来，教师和平台自动测试才能看到过程证据。
        </p>
      </section>
    </>
  );
}

function BuildRunbookStep({
  checked,
  draft,
  onCheckChange,
  onDraftChange,
  step,
}: {
  checked: boolean;
  draft: StageFourBuildDraft;
  onCheckChange: (value: boolean) => void;
  onDraftChange: (patch: Partial<StageFourBuildDraft>) => void;
  step: (typeof stageFourBuildRunbookSteps)[number];
}) {
  return (
    <article className={`build-step ${checked ? "done" : ""}`.trim()} data-build-step-card={step.key}>
      <header>
        <span>{step.number}</span>
        <div>
          <h2>{step.title}</h2>
          <p>{step.goal}</p>
        </div>
      </header>
      <div className="build-step-grid">
        <div>
          <h3>{step.instructionTitle}</h3>
          {step.promptTemplate ? <pre className="dify-prompt-template">{step.promptTemplate}</pre> : null}
          {step.testQuestions ? (
            <ul className="dify-test-list">
              {step.testQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          ) : null}
          <ol>
            {step.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ol>
        </div>
        <div>
          <h3>{step.fieldTitle}</h3>
          {step.fields.map((field) => (
            <BuildRunbookField
              draft={draft}
              field={field}
              key={field.draftKey}
              onDraftChange={onDraftChange}
            />
          ))}
        </div>
      </div>
      <label className="build-step-confirm">
        <input checked={checked} onChange={(event) => onCheckChange(event.target.checked)} type="checkbox" />
        <span>{step.confirmLabel}</span>
      </label>
    </article>
  );
}

function BuildRunbookField({
  draft,
  field,
  onDraftChange,
}: {
  draft: StageFourBuildDraft;
  field: StageFourBuildField;
  onDraftChange: (patch: Partial<StageFourBuildDraft>) => void;
}) {
  const value = draft[field.draftKey];
  function update(nextValue: string) {
    onDraftChange({ [field.draftKey]: nextValue } as Partial<StageFourBuildDraft>);
  }

  if (field.kind === "textarea") {
    return (
      <label>
        <span>{field.label}</span>
        <textarea
          onChange={(event) => update(event.target.value)}
          placeholder={field.placeholder}
          rows={field.rows ?? 5}
          value={value}
        />
      </label>
    );
  }

  return (
    <label>
      <span>{field.label}</span>
      <input onChange={(event) => update(event.target.value)} placeholder={field.placeholder} value={value} />
    </label>
  );
}

function BuildWorkbenchSide({
  checks,
  completed,
  draft,
  isSaving,
  onSave,
  ready,
}: {
  checks: StageFourBuildChecks;
  completed: boolean;
  draft: StageFourBuildDraft;
  isSaving: boolean;
  onSave: () => void;
  ready: boolean;
}) {
  const doneCount = stageFourBuildStepOrder.filter((key) => checks[key]).length;
  const progress = `${Math.round((doneCount / stageFourBuildStepOrder.length) * 100)}%`;
  const gates = [
    {
      done: stageFourBuildStepOrder.every((key) => checks[key]),
      label: "12 个构建步骤已确认",
    },
    { done: buildFieldsReady(draft), label: "关键配置记录完整" },
    { done: isHttpUrl(draft.publishUrl), label: "正式发布链接有效" },
  ];
  const disabled = !ready || isSaving || completed;

  return (
    <>
      <section className="agent-side-card build-status-card">
        <p className="agent-kicker">Build Progress</p>
        <h2>构建步骤完成度</h2>
        <div className="dify-completion-meter" aria-label="完成度">
          <span style={{ "--value": progress } as CSSProperties} />
        </div>
        <ol className="build-step-gates">
          {stageFourBuildStepOrder.map((key) => (
            <li className={checks[key] ? "done" : undefined} key={key}>
              {buildStepCopy(key)}
            </li>
          ))}
        </ol>
      </section>

      <section className="agent-side-card build-sync-card">
        <p className="agent-kicker">Platform Sync</p>
        <h2>平台保存门禁</h2>
        <ul className="dify-gate-list">
          {gates.map((gate) => (
            <li className={gate.done ? "done" : undefined} key={gate.label}>
              {gate.label}
            </li>
          ))}
        </ul>
        <button
          aria-disabled={disabled}
          className={`agent-next-link dify-save-action ${disabled ? "disabled" : ""}`.trim()}
          disabled={isSaving || completed}
          onClick={onSave}
          type="button"
        >
          {completed ? "阶段四已完成" : isSaving ? "保存中" : "保存正式搭建记录"}
        </button>
        <button
          aria-disabled={disabled}
          className={`agent-next-link ${disabled ? "disabled" : ""}`.trim()}
          disabled={isSaving || completed}
          onClick={onSave}
          type="button"
        >
          进入平台测试与评分
        </button>
      </section>

      <section className="agent-side-card build-evidence-card">
        <p className="agent-kicker">Evidence</p>
        <h2>本页需要留下的证据</h2>
        <p>
          应用链接、知识库名称、文件清单、分段清洗参数、索引检索设置、节点连线、Prompt 摘要、异常路径模板和 Preview 预检记录，都会进入阶段四档案袋。
        </p>
      </section>
    </>
  );
}

function CheckButton({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-left text-xs font-bold leading-5 transition ${
        checked
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-100 hover:bg-emerald-50"
      }`}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <CheckCircle2
        aria-hidden
        className={checked ? "shrink-0 text-emerald-600" : "shrink-0 text-slate-300"}
        size={16}
      />
      {label}
    </button>
  );
}

function StepEditor({
  checked,
  children,
  number,
  onCheckChange,
  title,
}: {
  checked: boolean;
  children: ReactNode;
  number: string;
  onCheckChange: (value: boolean) => void;
  title: string;
}) {
  return (
    <article className={`rounded-[18px] border p-4 ${checked ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-xs font-extrabold text-white">
            {number}
          </span>
          <h4 className="text-sm font-extrabold text-slate-950">{title}</h4>
        </div>
        <CheckButton checked={checked} label="我已完成这一步" onChange={onCheckChange} />
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function BuildStep(props: {
  checked: boolean;
  children: ReactNode;
  number: string;
  onCheckChange: (value: boolean) => void;
  title: string;
}) {
  return <StepEditor {...props} />;
}

function TextInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-extrabold text-slate-800">{label}</span>
      <input
        className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-emerald-300"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function TextArea({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-extrabold text-slate-800">{label}</span>
      <textarea
        className="min-h-24 resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 transition placeholder:text-slate-400 focus:border-emerald-300"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        value={value}
      />
    </label>
  );
}

function ProgressGateCard({
  checks,
  title,
}: {
  checks: Array<{ done: boolean; label: string }>;
  title: string;
}) {
  const doneCount = checks.filter((item) => item.done).length;
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <p className="text-xs font-extrabold text-emerald-700">Step Progress</p>
      <h3 className="mt-2 text-lg font-extrabold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm font-bold text-slate-500">
        {doneCount} / {checks.length}
      </p>
      <div className="mt-4 grid gap-2">
        {checks.map((item) => (
          <ReviewCheck key={item.label} label={item.label} ready={item.done} />
        ))}
      </div>
    </section>
  );
}

function QualityGateCard({
  gates,
  title,
}: {
  gates: Array<{ done: boolean; label: string }>;
  title: string;
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <p className="text-xs font-extrabold text-emerald-700">Quality Gate</p>
      <h3 className="mt-2 text-lg font-extrabold text-slate-950">{title}</h3>
      <div className="mt-4 grid gap-2">
        {gates.map((item) => (
          <ReviewCheck key={item.label} label={item.label} ready={item.done} />
        ))}
      </div>
    </section>
  );
}

function ActionPanel({
  onPrimary,
  onSecondary,
  primaryDisabled,
  primaryLabel,
  secondaryLabel,
}: {
  onPrimary: () => void;
  onSecondary?: () => void;
  primaryDisabled: boolean;
  primaryLabel: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <button
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={primaryDisabled}
        onClick={onPrimary}
        type="button"
      >
        {primaryLabel}
        <ArrowRight aria-hidden size={16} />
      </button>
      {onSecondary && secondaryLabel ? (
        <button
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          onClick={onSecondary}
          type="button"
        >
          {secondaryLabel}
        </button>
      ) : null}
    </section>
  );
}

function StageThreeInputCard({
  buildPlan,
  risks,
  sources,
}: {
  buildPlan: string;
  risks: string[];
  sources: string[];
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <p className="text-xs font-extrabold text-emerald-700">From Stage 03</p>
      <h3 className="mt-2 text-lg font-extrabold text-slate-950">阶段三构建依据</h3>
      <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
        {buildPlan || "阶段三知识工程决策会作为 Dify 搭建依据。"}
      </p>
      {sources.length > 0 ? <MiniList items={sources.slice(0, 4)} title="优先知识来源" /> : null}
      {risks.length > 0 ? <MiniList icon="warning" items={risks.slice(0, 4)} title="需要回应的风险" /> : null}
    </section>
  );
}

function ReviewCheck({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          ready ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
        }`}
      >
        <CheckCircle2 aria-hidden size={16} />
      </span>
      <span className="text-sm font-bold leading-6 text-slate-700">{label}</span>
    </div>
  );
}

function MiniList({
  icon = "check",
  items,
  title,
}: {
  icon?: "check" | "warning";
  items: string[];
  title: string;
}) {
  const Icon = icon === "warning" ? AlertTriangle : CheckCircle2;
  return (
    <div className="mt-4">
      <p className="text-xs font-extrabold text-slate-500">{title}</p>
      <ul className="mt-2 grid gap-2">
        {items.map((item) => (
          <li className="flex gap-2 text-sm leading-6 text-slate-700" key={item}>
            <Icon
              aria-hidden
              className={icon === "warning" ? "mt-1 shrink-0 text-amber-500" : "mt-1 shrink-0 text-emerald-600"}
              size={15}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ArtifactSummary({ artifact, title }: { artifact: Artifact; title: string }) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <p className="text-xs font-extrabold text-emerald-700">{title}</p>
      <p className="mt-2 text-sm font-extrabold leading-6 text-slate-950">
        {stringValue(artifact.content_json.dify_app_name) ||
          stringValue(artifact.content_json.test_goal) ||
          "阶段四证据已保存"}
      </p>
      <p className="mt-2 text-xs font-bold text-slate-400">{formatDateTime(artifact.created_at)}</p>
    </section>
  );
}

function ImplementationLink({ artifact }: { artifact: Artifact }) {
  const appUrl = stringValue(artifact.content_json.dify_app_url);
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <p className="text-xs font-extrabold text-emerald-700">Test Target</p>
      <h3 className="mt-2 text-lg font-extrabold text-slate-950">
        {stringValue(artifact.content_json.dify_app_name) || "Dify 应用"}
      </h3>
      {appUrl ? (
        <a
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-50"
          href={appUrl}
          rel="noreferrer"
          target="_blank"
        >
          打开 Dify 应用
          <ExternalLink aria-hidden size={14} />
        </a>
      ) : null}
    </section>
  );
}

function ScoreCard({ platformRun }: { platformRun: StageFourPlatformTestRun | null }) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <p className="text-xs font-extrabold text-emerald-700">Score</p>
      <h3 className="mt-2 text-lg font-extrabold text-slate-950">阶段四评分</h3>
      <div className="mt-4 grid h-28 place-items-center rounded-2xl bg-slate-950 text-white">
        <strong className="text-4xl font-black">{platformRun ? platformRun.totalScore : "--"}</strong>
        <span className="text-xs font-bold text-white/60">总分</span>
      </div>
      <div className="mt-4 grid gap-2">
        {["召回准确性", "引用可追溯性", "边界控制", "业务流程完整性"].map((label, index) => (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2" key={label}>
            <span className="text-xs font-bold text-slate-500">{label}</span>
            <strong className="text-sm font-extrabold text-slate-900">
              {platformRun ? platformRun.dimensionScores[index] : "--"}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/70 p-3">
      <p className="text-xs font-extrabold text-slate-500">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function ReviewSummary({ artifact }: { artifact: Artifact }) {
  const content = artifact.content_json;
  const risks = arrayOrString(content.implementation_risks);
  const suggestions = arrayOrString(content.improvement_suggestions);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label="反馈已生成" tone="success" />
        <span className="text-xs font-bold text-slate-400">{formatDateTime(artifact.created_at)}</span>
      </div>
      <p className="text-sm leading-7 text-slate-700">
        {stringValue(content.review_summary) || "反馈已生成。"}
      </p>
      {risks.length > 0 ? <MiniList icon="warning" items={risks} title="实现风险" /> : null}
      {suggestions.length > 0 ? <MiniList items={suggestions} title="建议改进" /> : null}
    </div>
  );
}

function demoOnboardingDraft(): StageFourOnboardingDraft {
  return {
    appName: "质检资料问答练习应用",
    appType: "Chatflow",
    canvasSummary: "画布默认包含开始 / 用户输入节点、LLM 节点、直接回复节点；连线为开始 -> LLM -> 直接回复；右侧配置面板显示所选节点设置。",
    llmSummary: "模型：学校指定模型；上下文：用户输入 query；指令：制造业质检资料问答助手，必须说明引用依据，资料不足或责任判定时提示人工确认。",
    modelName: "学校指定模型",
    nodeChain: "开始节点(query) -> LLM 节点(text) -> 直接回复节点(reply=LLM/text)。",
    publishUrl: "https://example.dify.ai/chat/quality-practice",
    startInputs: "query；可选 files",
    testRecord: "Preview 测试问题：B-2026-0412 批次审厂前需要准备哪些质检资料？流程从开始节点进入 LLM，再由直接回复节点输出。",
    workspaceName: "智能体实训 2026 春",
  };
}

function demoBuildDraft(): StageFourBuildDraft {
  return {
    accessNote: "使用课程测试账号访问；链接有效期覆盖本次实验；自动化测试可直接访问发布页。",
    apiEndpoint: "https://api.dify.example/v1/chat-messages",
    boundaryRule: "1. 有批次/工序/标准证据且属于质检追溯范围 -> 引用回答。2. 无检索证据或字段缺失 -> 说明资料不足。3. 责任判定、处罚建议、客户承诺 -> 转人工确认。",
    fallbackTemplate: "资料不足：当前资料缺少{字段}，无法形成可靠结论。记录冲突：发现{来源A}与{来源B}不一致，请质量负责人确认。转人工：该问题涉及责任判定或客户承诺，需人工处理。",
    indexConfig: "索引方式：高质量；检索方式：混合检索；Top K 5；启用倒排索引；处理状态：Dify 显示知识库已创建，文件处理完成。",
    knowledgeName: "制造业质检追溯知识库 v1",
    knowledgeSourceMode: "Dify 知识库模块；数据源选择导入已有文本；资料来自阶段三筛选后的质检 SOP、MES 导出、Excel 台账和整改材料。",
    nodeChain: "开始(query) -> 知识检索(chunks) -> 条件分支 -> 引用回答 LLM / 资料不足回复 -> 直接回复；所有最终路径均有用户可见输出。",
    previewRecord: "正常追溯问题命中批次记录与 SOP；缺陷图片问题提示缺少批次和工序；客户责任承诺问题进入转人工路径。需继续优化引用格式。",
    projectName: "制造业质检追溯 AI 助手",
    projectPurpose: "服务质量负责人和审厂准备人员，回答批次追溯、工序缺陷、SOP 条款、整改材料准备等问题；资料不足、记录冲突和责任判定转人工。",
    promptSummary: "角色：制造业质检追溯 AI 助手；证据：只基于知识检索结果；引用：列来源、批次号、工序或标准条款；边界：资料不足、记录冲突、责任判定转人工；格式：结论、证据、待确认事项。",
    publishUrl: "https://example.dify.ai/chat/manufacturing-quality-agent",
    retrievalConfig: "Chatflow 知识检索节点选择“制造业质检追溯知识库 v1”；query 来自开始节点；输出 chunks 传给条件分支与引用回答 LLM。",
    segmentConfig: "分段模式：通用分段；分段标识符：标题/条款编号/换行；最大长度：1024 characters；重叠长度：50 characters；预处理：替换连续空格、换行符、制表符，不删除批次号和标准编号。",
    uploadedFiles: "1. 质检 SOP 与审厂条款.docx：制度标准；已通过质量评估。2. MES_B-2026-0412.csv：批次记录；保留批次号、工序、检验时间。3. 整改闭环记录.xlsx：异常整改；保留责任工序和复检结果。",
  };
}

function allOnboardingChecks(): StageFourOnboardingChecks {
  return Object.fromEntries(stageFourOnboardingStepOrder.map((key) => [key, true])) as StageFourOnboardingChecks;
}

function allBuildChecks(): StageFourBuildChecks {
  return Object.fromEntries(stageFourBuildStepOrder.map((key) => [key, true])) as StageFourBuildChecks;
}

function onboardingFieldsReady(draft: StageFourOnboardingDraft): boolean {
  return [
    draft.workspaceName,
    draft.appName,
    draft.appType,
    draft.canvasSummary,
    draft.startInputs,
    draft.modelName,
    draft.llmSummary,
    draft.nodeChain,
    draft.testRecord,
    draft.publishUrl,
  ].every(hasText);
}

function buildFieldsReady(draft: StageFourBuildDraft): boolean {
  return [
    draft.projectName,
    draft.projectPurpose,
    draft.knowledgeName,
    draft.knowledgeSourceMode,
    draft.uploadedFiles,
    draft.segmentConfig,
    draft.indexConfig,
    draft.retrievalConfig,
    draft.boundaryRule,
    draft.promptSummary,
    draft.fallbackTemplate,
    draft.nodeChain,
    draft.previewRecord,
    draft.publishUrl,
    draft.apiEndpoint,
    draft.accessNote,
  ].every(hasText);
}

function testTargetFromBuildDraft(draft: StageFourBuildDraft): StageFourTestTargetDraft {
  return {
    accessNote: draft.accessNote,
    apiEndpoint: draft.apiEndpoint,
    appName: draft.projectName,
    knowledgeName: draft.knowledgeName,
    publishUrl: draft.publishUrl,
  };
}

function testTargetFromImplementation(artifact: Artifact | null): StageFourTestTargetDraft | null {
  if (!artifact) {
    return null;
  }
  const content = artifact.content_json;
  return {
    accessNote: stringValue(content.app_access_check_notes),
    apiEndpoint: stringValue(content.agent_api_endpoint),
    appName: stringValue(content.dify_app_name),
    knowledgeName: firstLineAfterTitle(stringValue(content.knowledge_base_notes), "知识库名称"),
    publishUrl: stringValue(content.dify_app_url),
  };
}

function firstLineAfterTitle(value: string, title: string): string {
  const marker = `【${title}】`;
  const index = value.indexOf(marker);
  if (index < 0) {
    return "";
  }
  return value.slice(index + marker.length).trim().split(/\r?\n/)[0]?.trim() ?? "";
}

function isTestTargetReady(draft: StageFourTestTargetDraft): boolean {
  return (
    [draft.appName, draft.knowledgeName, draft.publishUrl, draft.apiEndpoint, draft.accessNote].every(hasText) &&
    isHttpUrl(draft.publishUrl) &&
    isHttpUrl(draft.apiEndpoint)
  );
}

function onboardingStepCopy(key: string): string {
  const map: Record<string, string> = {
    answer: "配置直接回复与连线",
    canvas: "识别画布与默认节点",
    create: "创建 Chatflow 应用",
    llm: "配置 LLM 节点",
    preview: "完成 Preview 调试",
    publish: "发布并回填链接",
    start: "检查开始节点输入变量",
    workspace: "进入工作室与 Chatflow 入口",
  };
  return map[key] ?? key;
}

function buildStepCopy(key: string): string {
  const map: Record<string, string> = {
    condition: "配置边界分支",
    connect: "检查连线变量",
    handoff: "配置异常路径",
    "kb-create": "创建知识库",
    "kb-index": "完成索引检索",
    "kb-segment": "配置分段清洗",
    "kb-upload": "上传质检资料",
    preview: "完成 Preview 预检",
    project: "创建正式应用",
    prompt: "配置引用回答",
    publish: "发布并回填链接",
    retrieval: "接入检索节点",
  };
  return map[key] ?? key;
}

function stageFourStepCopy(step: StageFourMode): string {
  const map: Record<StageFourMode, string> = {
    build: "正式搭建工作台",
    guide: "实现导学",
    onboarding: "Dify 入门",
    test: "测试与评分",
  };
  return map[step];
}

function latestArtifactOfType(artifacts: Artifact[], artifactType: string): Artifact | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === artifactType)
      .slice()
      .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
      .at(-1) ?? null
  );
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? sanitizeProductText(value) : "";
}

function arrayOrString(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeProductText(String(item))).filter(hasText);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.split(/\r?\n/).map((item) => sanitizeProductText(item)).filter(hasText);
  }
  return [];
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
