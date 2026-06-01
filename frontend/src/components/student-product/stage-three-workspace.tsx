"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  Database,
  FileCheck2,
  GitBranch,
  RefreshCw,
  Save,
  SearchCheck,
  SplitSquareHorizontal,
  Target,
} from "lucide-react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  Artifact,
  StageThreeCaseStudyRecordPayload,
  StageThreeKnowledgeDecisionPayload,
  StageThreeLabExperimentRecordPayload,
  StageThreeKnowledgeStrategy,
} from "@/src/lib/api";

import {
  createStageThreeQualityRecordPayload,
  createStageThreeQualitySnapshotFromArtifacts,
  createStageThreeRiskBoundaryRecordPayload,
  createStageThreeRiskBoundarySnapshotFromArtifacts,
  createStageThreeSourceRecordPayload,
  createStageThreeSourceSnapshotFromArtifacts,
  createStageThreeVNextProgressItems,
  isStageThreeQualityReady,
  isStageThreeSourceReady,
  stageThreeCleaningChecks,
  stageThreeCleaningLogRows,
  stageThreeCleaningPracticeItems,
  stageThreeCleaningPreviewSamples,
  stageThreeCleaningRedlines,
  stageThreeCleaningSavedToast,
  stageThreeCleaningStrategyItems,
  stageThreeChunkingAnatomyItems,
  stageThreeChunkingChecks,
  stageThreeChunkingLabDocuments,
  stageThreeChunkingPracticeItems,
  stageThreeChunkingRedlines,
  stageThreeChunkingSavedToast,
  stageThreeChunkingStrategyRows,
  stageThreeStructureChecks,
  stageThreeStructureChainItems,
  stageThreeStructureDomainItems,
  stageThreeStructureMetadataRows,
  stageThreeStructurePracticeItems,
  stageThreeStructureRedlines,
  stageThreeStructureSavedToast,
  stageThreeVectorChecks,
  stageThreeVectorConceptItems,
  stageThreeVectorKnowledgePoints,
  stageThreeVectorPracticeItems,
  stageThreeVectorQueries,
  stageThreeVectorSavedToast,
  stageThreeVectorStorageRows,
  stageThreeRetrievalChecks,
  stageThreeRetrievalConceptItems,
  stageThreeRetrievalDocuments,
  stageThreeRetrievalGateInitialCopy,
  stageThreeRetrievalPracticeItems,
  stageThreeRetrievalQueries,
  stageThreeRetrievalSavedToast,
  stageThreeRetrievalScoreFactors,
  stageThreeAnswerCases,
  stageThreeAnswerChecks,
  stageThreeAnswerPracticeItems,
  stageThreeAnswerPrinciples,
  stageThreeAnswerQualityFactors,
  stageThreeAnswerSavedToast,
  stageThreeRecallCases,
  stageThreeRecallChecks,
  stageThreeRecallMatrixItems,
  stageThreeRecallPracticeItems,
  stageThreeRecallPrinciples,
  stageThreeRecallSavedState,
  stageThreeRiskBoundaryCases,
  stageThreeRiskBoundaryChecks,
  stageThreeRiskBoundaryMatrixRows,
  stageThreeRiskBoundaryPrinciples,
  stageThreeRiskBoundarySavedToast,
  stageThreeRiskBoundaryTemplateFields,
  stageThreeQualitySamples,
  stageThreeQualityDimensionItems,
  stageThreeQualityImpactItems,
  stageThreeQualityMatrixRows,
  stageThreeQualityPrinciples,
  stageThreeQualitySavedToast,
  stageThreeSourceDecisionItems,
  stageThreeSourceSavedToast,
  type StageThreeAnswerCaseKey,
  type StageThreeAnswerCitationGrain,
  type StageThreeAnswerPolicy,
  type StageThreeRecallCaseKey,
  type StageThreeRiskBoundaryChoice,
  type StageThreeRiskBoundaryCaseKey,
  type StageThreeRiskBoundarySnapshot,
  type StageThreeRetrievalFilter,
  type StageThreeRetrievalMode,
  type StageThreeRetrievalQuery,
  type StageThreeRetrievalQueryKey,
  type StageThreeMode,
  type StageThreeQualityChecks,
  type StageThreeQualityDecisionValue,
  type StageThreeQualitySampleKey,
  type StageThreeQualitySelectionState,
  type StageThreeSourceChecks,
  type StageThreeSourceDecisionValue,
  type StageThreeSourceSelectionState,
} from "./stage-three-flow";
import {
  arrayOrString,
  createProjectDecisionDraft,
  createProjectDecisionPayload,
  createProjectDecisionReadiness,
  createStageThreeLabDecisionInsights,
  stringValue,
  type ProjectDecisionDraft,
  type ProjectDecisionReadiness,
  type StageThreeLabDecisionInsight,
} from "./stage-three-project-decision";
import {
  createDecisionDocumentPreview as createDecisionDocumentPreviewModel,
  createRiskForecastItems,
  createStageThreeSubmissionGate,
  type DecisionDocumentPreviewModel,
  type RiskForecastItem,
  type SubmissionGate,
} from "./stage-three-risk-document";
import { formatDateTime, sanitizeProductText, stageStatusCopy, type Tone } from "./terminology";
import { EmptyState, StatusBadge } from "./ui";

type StageThreeWorkspaceProps = {
  artifacts: Artifact[];
  isCompletingStage: boolean;
  isRefreshing: boolean;
  isRequestingReview: boolean;
  isSavingCaseRecord: boolean;
  isSavingDecision: boolean;
  isSavingLabRecord: boolean;
  onCompleteStage: () => Promise<boolean>;
  onRefresh: () => void;
  onRequestReview: () => Promise<boolean>;
  onSaveCaseStudyRecord: (payload: StageThreeCaseStudyRecordPayload) => Promise<boolean>;
  onSaveDecision: (payload: StageThreeKnowledgeDecisionPayload) => Promise<boolean>;
  onSaveLabExperimentRecord: (payload: StageThreeLabExperimentRecordPayload) => Promise<boolean>;
  onModeChange: (mode: StageThreeMode) => void;
  stageStatus?: string;
  stageTwoArtifacts: Artifact[];
  workspaceMode: StageThreeMode;
};

type KnowledgeDecisionDraft = ProjectDecisionDraft;
type LayerReadiness = ProjectDecisionReadiness;
type RagLearningStep =
  | "source"
  | "quality"
  | "cleaning"
  | "structure"
  | "chunking"
  | "vector"
  | "retrieval"
  | "citation"
  | "recall"
  | "risk";

const strategyOptions: Array<{
  description: string;
  label: string;
  value: StageThreeKnowledgeStrategy;
}> = [
  {
    description: "需要引用 SOP、质检记录和审厂清单时优先选择。",
    label: "知识库问答",
    value: "rag",
  },
  {
    description: "知识相对稳定、主要依赖流程话术时可用。",
    label: "提示词优先",
    value: "prompt_only",
  },
  {
    description: "需要查询外部系统或执行结构化动作时适用。",
    label: "工具调用优先",
    value: "tool_calling",
  },
  {
    description: "同时需要知识库、提示词约束和工具能力时选择。",
    label: "混合策略",
    value: "hybrid",
  },
];

const chunkingOptions = ["文档结构切分", "递归字符切分", "语义切分", "父子块切分"];

export function StageThreeWorkspace({
  artifacts,
  isCompletingStage,
  isRefreshing,
  isRequestingReview,
  isSavingDecision,
  isSavingLabRecord,
  onCompleteStage,
  onModeChange,
  onRefresh,
  onRequestReview,
  onSaveDecision,
  onSaveLabExperimentRecord,
  stageStatus,
  stageTwoArtifacts,
  workspaceMode,
}: StageThreeWorkspaceProps) {
  const status = stageStatusCopy(stageStatus);
  const locked = stageStatus === "locked";
  const completed = stageStatus === "completed";
  const latestDecisionArtifact = useMemo(
    () => latestArtifactOfType(artifacts, "stage_3_knowledge_decision"),
    [artifacts],
  );
  const latestReviewArtifact = useMemo(
    () => latestArtifactOfType(artifacts, "stage_3_ai_review"),
    [artifacts],
  );
  const latestLabExperimentArtifact = useMemo(
    () => latestArtifactOfType(artifacts, "stage_3_lab_experiment_record"),
    [artifacts],
  );
  const latestStageTwoSolution = useMemo(
    () =>
      latestArtifactOfType(stageTwoArtifacts, "stage_2_technical_solution") ??
      latestArtifactOfType(stageTwoArtifacts, "stage_2_solution_definition"),
    [stageTwoArtifacts],
  );
  const latestStageTwoFeasibility = useMemo(
    () => latestArtifactOfType(stageTwoArtifacts, "stage_2_feasibility_report"),
    [stageTwoArtifacts],
  );
  const stageTwoSourceArtifactId =
    `${latestStageTwoSolution?.id ?? ""}|${latestStageTwoFeasibility?.id ?? ""}` || "fallback";
  const sourceArtifactId =
    latestDecisionArtifact?.id ??
    `${stageTwoSourceArtifactId}|${latestLabExperimentArtifact?.id ?? ""}`;
  const sourceDraft = useMemo(
    () =>
      createProjectDecisionDraft({
        decisionArtifact: latestDecisionArtifact,
        feasibilityArtifact: latestStageTwoFeasibility,
        labRecordArtifact: latestLabExperimentArtifact,
        stageTwoSolutionArtifact: latestStageTwoSolution,
      }),
    [
      latestDecisionArtifact,
      latestLabExperimentArtifact,
      latestStageTwoFeasibility,
      latestStageTwoSolution,
    ],
  );
  const [draftState, setDraftState] = useState<{
    draft: KnowledgeDecisionDraft;
    sourceArtifactId: string;
  }>({
    draft: sourceDraft,
    sourceArtifactId,
  });
  const draft = draftState.sourceArtifactId === sourceArtifactId ? draftState.draft : sourceDraft;
  const readiness = useMemo(() => createProjectDecisionReadiness(draft), [draft]);
  const labInsights = useMemo(
    () => createStageThreeLabDecisionInsights(latestLabExperimentArtifact),
    [latestLabExperimentArtifact],
  );
  const riskForecast = useMemo(
    () =>
      createRiskForecastItems({
        decisionArtifact: latestDecisionArtifact,
        reviewArtifact: latestReviewArtifact,
      }),
    [latestDecisionArtifact, latestReviewArtifact],
  );
  const submissionGate = useMemo(
    () =>
      createStageThreeSubmissionGate({
        decisionArtifact: latestDecisionArtifact,
        readiness,
        reviewArtifact: latestReviewArtifact,
      }),
    [latestDecisionArtifact, latestReviewArtifact, readiness],
  );
  const decisionDocumentPreview = useMemo(
    () =>
      createDecisionDocumentPreviewModel({
        decisionArtifact: latestDecisionArtifact,
        reviewArtifact: latestReviewArtifact,
      }),
    [latestDecisionArtifact, latestReviewArtifact],
  );
  const canSave = readiness.every((item) => item.ready);
  const canReview = latestDecisionArtifact !== null && !locked && !completed;
  const canComplete = submissionGate.canSubmit && !locked && !completed;
  const vNextProgress = useMemo(
    () => createStageThreeVNextProgressItems(artifacts, stageStatus),
    [artifacts, stageStatus],
  );
  const sourceSnapshot = useMemo(
    () => createStageThreeSourceSnapshotFromArtifacts(artifacts),
    [artifacts],
  );
  const qualitySnapshot = useMemo(
    () => createStageThreeQualitySnapshotFromArtifacts(artifacts),
    [artifacts],
  );
  const riskBoundarySnapshot = useMemo(
    () => createStageThreeRiskBoundarySnapshotFromArtifacts(artifacts),
    [artifacts],
  );
  const [sourceSelections, setSourceSelections] = useState<StageThreeSourceSelectionState>(
    () =>
      sourceSnapshot?.selections ?? {
        mesExport: "",
        paperPhoto: "",
        sop: "",
        wechatScreenshot: "",
      },
  );
  const [sourceChecks, setSourceChecks] = useState<StageThreeSourceChecks>(
    () =>
      sourceSnapshot?.checks ?? {
        dataTypes: false,
        mesRisk: false,
        paperStructuring: false,
        sourceHandling: false,
      },
  );
  const [qualitySelections, setQualitySelections] = useState<StageThreeQualitySelectionState>(
    () =>
      qualitySnapshot?.selections ?? {
        auditChecklist: "",
        mesExport: "",
        paperScan: "",
        personalMemo: "",
      },
  );
  const [qualityChecks, setQualityChecks] = useState<StageThreeQualityChecks>(
    () =>
      qualitySnapshot?.checks ?? {
        cleanVsEvidence: false,
        fieldCompleteness: false,
        noAutoFill: false,
        sourceCredibility: false,
      },
  );
  const [viewedQualitySamples, setViewedQualitySamples] = useState<StageThreeQualitySampleKey[]>(
    () => qualitySnapshot?.viewedSampleKeys ?? [],
  );
  const [ragLearningStep, setRagLearningStep] = useState<RagLearningStep>(
    workspaceMode === "quality" ? "quality" : "source",
  );
  const sourceReady = isStageThreeSourceReady(sourceSelections, sourceChecks);
  const qualityReady = isStageThreeQualityReady(
    qualitySelections,
    viewedQualitySamples,
    qualityChecks,
  );

  function updateDraft(patch: Partial<KnowledgeDecisionDraft>) {
    setDraftState({
      draft: { ...draft, ...patch },
      sourceArtifactId,
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || locked || completed) {
      return;
    }
    const ok = await onSaveDecision(createProjectDecisionPayload(draft));
    if (ok) {
      onModeChange("review");
    }
  }

  async function handleSaveSourceDecision() {
    if (!sourceReady || locked || completed || isSavingLabRecord) {
      return false;
    }
    const ok = await onSaveLabExperimentRecord(
      createStageThreeSourceRecordPayload({
        checks: sourceChecks,
        selections: sourceSelections,
      }),
    );
    return ok;
  }

  async function handleSaveQualityAssessment() {
    if (!qualityReady || locked || completed || isSavingLabRecord) {
      return false;
    }
    const ok = await onSaveLabExperimentRecord(
      createStageThreeQualityRecordPayload({
        checks: qualityChecks,
        selections: qualitySelections,
        viewedSampleKeys: viewedQualitySamples,
      }),
    );
    return ok;
  }

  function updateSourceSelection(
    key: keyof StageThreeSourceSelectionState,
    value: StageThreeSourceDecisionValue,
  ) {
    setSourceSelections((current) => ({ ...current, [key]: value }));
  }

  function updateQualitySelection(
    key: keyof StageThreeQualitySelectionState,
    value: StageThreeQualityDecisionValue,
  ) {
    setQualitySelections((current) => ({ ...current, [key]: value }));
  }

  function markQualitySampleViewed(key: StageThreeQualitySampleKey) {
    setViewedQualitySamples((current) => (current.includes(key) ? current : [...current, key]));
  }

  if (workspaceMode === "source") {
    if (ragLearningStep === "quality") {
      return (
        <StageThreeQualityAssessmentView
          checks={qualityChecks}
          completed={completed}
          isSaving={isSavingLabRecord}
          locked={locked}
          onCheckChange={(key, value) =>
            setQualityChecks((current) => ({ ...current, [key]: value }))
          }
          onSave={handleSaveQualityAssessment}
          onSelectionChange={updateQualitySelection}
          onStepChange={setRagLearningStep}
          onViewSample={markQualitySampleViewed}
          progress={vNextProgress}
          ready={qualityReady}
          selections={qualitySelections}
          viewedSampleKeys={viewedQualitySamples}
        />
      );
    }
    if (ragLearningStep !== "source") {
      return (
        <StageThreeRagLearningView
          activeStep={ragLearningStep}
          isSavingLabRecord={isSavingLabRecord}
          onSaveLabExperimentRecord={onSaveLabExperimentRecord}
          onStepChange={setRagLearningStep}
          progress={vNextProgress}
          riskBoundarySnapshot={riskBoundarySnapshot}
        />
      );
    }
    return (
      <StageThreeSourceDecisionView
        checks={sourceChecks}
        completed={completed}
        isSaving={isSavingLabRecord}
        locked={locked}
        onCheckChange={(key, value) =>
          setSourceChecks((current) => ({ ...current, [key]: value }))
        }
        onSave={handleSaveSourceDecision}
        onSelectionChange={updateSourceSelection}
        onStepChange={setRagLearningStep}
        progress={vNextProgress}
        ready={sourceReady}
        selections={sourceSelections}
      />
    );
  }

  if (workspaceMode === "quality") {
    if (ragLearningStep === "source") {
      return (
        <StageThreeSourceDecisionView
          checks={sourceChecks}
          completed={completed}
          isSaving={isSavingLabRecord}
          locked={locked}
          onCheckChange={(key, value) =>
            setSourceChecks((current) => ({ ...current, [key]: value }))
          }
          onSave={handleSaveSourceDecision}
          onSelectionChange={updateSourceSelection}
          onStepChange={setRagLearningStep}
          progress={vNextProgress}
          ready={sourceReady}
          selections={sourceSelections}
        />
      );
    }
    if (ragLearningStep !== "quality") {
      return (
        <StageThreeRagLearningView
          activeStep={ragLearningStep}
          isSavingLabRecord={isSavingLabRecord}
          onSaveLabExperimentRecord={onSaveLabExperimentRecord}
          onStepChange={setRagLearningStep}
          progress={vNextProgress}
          riskBoundarySnapshot={riskBoundarySnapshot}
        />
      );
    }
    return (
      <StageThreeQualityAssessmentView
        checks={qualityChecks}
        completed={completed}
        isSaving={isSavingLabRecord}
        locked={locked}
        onCheckChange={(key, value) =>
          setQualityChecks((current) => ({ ...current, [key]: value }))
        }
        onSave={handleSaveQualityAssessment}
        onSelectionChange={updateQualitySelection}
        onStepChange={setRagLearningStep}
        onViewSample={markQualitySampleViewed}
        progress={vNextProgress}
        ready={qualityReady}
        selections={qualitySelections}
        viewedSampleKeys={viewedQualitySamples}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <StageThreeFocusedHeader
        mode={workspaceMode}
        onBack={() =>
          onModeChange(
            workspaceMode === "review"
              ? "decision"
              : workspaceMode === "decision"
                ? "quality"
                : "source",
          )
        }
        statusLabel={status.label}
      />

      {workspaceMode === "decision" ? (
        <>
          <ProjectDecisionHero
            isRefreshing={isRefreshing}
            onRefresh={onRefresh}
            readiness={readiness}
            statusLabel={status.label}
          />
          {locked ? (
            <EmptyState title="阶段三尚未解锁">
              完成阶段二的方案文档和可行性评审后，知识工程决策工作区会自动开启。
            </EmptyState>
          ) : null}
          <KnowledgeDecisionEditor
            canSave={canSave}
            completed={completed}
            draft={draft}
            isSaving={isSavingDecision}
            labInsights={labInsights}
            latestStageTwoFeasibility={latestStageTwoFeasibility}
            latestStageTwoSolution={latestStageTwoSolution}
            locked={locked}
            onChange={updateDraft}
            onSubmit={handleSave}
            readiness={readiness}
          />
        </>
      ) : (
        <>
          <RiskDocumentHero
            isRefreshing={isRefreshing}
            onRefresh={onRefresh}
            readiness={readiness}
            statusLabel={status.label}
            statusTone={status.tone}
            submissionGate={submissionGate}
          />

          {locked ? (
            <EmptyState title="阶段三尚未解锁">
              完成阶段二的方案文档和可行性评审后，知识工程决策工作区会自动开启。
            </EmptyState>
          ) : null}

          <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,.82fr)]">
            <DecisionDocumentPreview
              documentPreview={decisionDocumentPreview}
              latestDecisionArtifact={latestDecisionArtifact}
              riskForecast={riskForecast}
              submissionGate={submissionGate}
            />
            <KnowledgeReviewPanel
              canComplete={canComplete}
              canReview={canReview}
              completed={completed}
              isCompleting={isCompletingStage}
              isRequestingReview={isRequestingReview}
              latestDecisionArtifact={latestDecisionArtifact}
              latestReviewArtifact={latestReviewArtifact}
              onCompleteStage={onCompleteStage}
              onRequestReview={onRequestReview}
              submissionGate={submissionGate}
            />
          </section>
        </>
      )}
    </div>
  );
}

function StageThreeSourceDecisionView({
  checks,
  completed,
  isSaving,
  locked,
  onCheckChange,
  onSave,
  onSelectionChange,
  onStepChange,
  progress,
  ready,
  selections,
}: {
  checks: StageThreeSourceChecks;
  completed: boolean;
  isSaving: boolean;
  locked: boolean;
  onCheckChange: (key: keyof StageThreeSourceChecks, value: boolean) => void;
  onSave: () => Promise<boolean>;
  onSelectionChange: (
    key: keyof StageThreeSourceSelectionState,
    value: StageThreeSourceDecisionValue,
  ) => void;
  onStepChange: (step: RagLearningStep) => void;
  progress: ReturnType<typeof createStageThreeVNextProgressItems>;
  ready: boolean;
  selections: StageThreeSourceSelectionState;
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

  function showSourceToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2200);
  }

  async function handleSaveClick() {
    const saved = await onSave();
    if (!saved) {
      return;
    }
    showSourceToast(stageThreeSourceSavedToast);
    window.setTimeout(() => onStepChange("quality"), 650);
  }

  return (
    <>
    <div className="rag-decision-page">
      <RagTopbar activeLabel="01 数据源识别" brand="数据源识别" />
      <RagFlowNav activeStep="source" onStepChange={onStepChange} progress={progress} />
      <main className="rag-shell">
        <RagHero
        eyebrow="Stage 03 / RAG Knowledge Engineering"
        cardLabel="当前学习环节"
        cardTitle="01 数据源识别"
        cardText="判断 MES、Excel 台账、纸质质检单、SOP、审厂清单和整改记录在 RAG 系统中的角色。"
        subtitle="当前环节只训练第一件事：面对制造业质检资料，区分稳定知识、动态记录和原始材料，并决定哪些资料进入后续质量评估。"
        title="数据源识别：判断哪些资料可以进入 RAG 知识库。"
      />

      <section aria-label="阶段三原则" className="rag-principle-strip">
        <PrincipleCard label="教学重点" title="不是上传资料">
          先判断资料质量、字段完整性、可引用性和追溯价值。
        </PrincipleCard>
        <PrincipleCard label="制造业场景" title="资料分散且质量不均">
          SOP 稳定，MES 字段不完整，纸质单据需要结构化。
        </PrincipleCard>
        <PrincipleCard label="阶段产物" title="知识工程决策文档">
          输出数据源清单、纳入建议、排除理由和下一环节质量评估线索。
        </PrincipleCard>
      </section>

      {locked ? (
        <EmptyState title="阶段三尚未解锁">
          完成阶段二的方案文档和可行性评审后，知识工程决策工作区会自动开启。
        </EmptyState>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <section className="rounded-[18px] border border-slate-200 bg-white p-5">
            <SectionHeading
              eyebrow="01 / Source Identification"
              title="什么样的资料适合进入知识库？"
            >
              好的数据源不只是有文件。它必须能被检索、能被引用、能支撑回答，并且不会让智能体编造缺失事实。
            </SectionHeading>
            <div className="mt-4 grid gap-3 lg:grid-cols-4">
              {[
                ["稳定知识", "质检 SOP / 不合格品处理流程", "结构清楚、更新频率低，适合作为制度依据。"],
                ["审厂资料", "审厂检查清单 / 客户整改要求", "定义客户关注点，适合回答需要准备什么证据。"],
                ["动态记录", "MES 导出 / Excel 异常台账", "支持批次追溯，但字段缺失会影响回答可信度。"],
                ["原始材料", "纸质质检单 / 图片记录", "包含上下文，但需要 OCR、字段拆分和人工校验。"],
              ].map(([label, title, description]) => (
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={title}>
                  <p className="text-xs font-extrabold uppercase text-emerald-700">{label}</p>
                  <h4 className="mt-3 text-sm font-extrabold text-slate-950">{title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <QualityColumn title="优先纳入候选的数据源" tone="good">
              <li>SOP、检验标准、审厂清单，适合作为稳定知识。</li>
              <li>MES 与质检台账，适合支撑批次、工序、缺陷追溯。</li>
              <li>整改报告、复检记录、客户审核要求，适合作为引用依据。</li>
              <li>缺陷图片和纸质单据，适合进入后续结构化判断。</li>
            </QualityColumn>
            <QualityColumn title="暂不直接纳入的数据源" tone="risk">
              <li>文件版本、维护人、生效日期不清楚。</li>
              <li>没有批次号、工序、缺陷类型等追溯字段。</li>
              <li>聊天截图、口头判断、个人备忘不能作为知识依据。</li>
              <li>只有结论，没有原始记录、处置过程或复检结果。</li>
            </QualityColumn>
          </section>

          <section className="rounded-[18px] border border-slate-200 bg-white p-5">
            <SectionHeading eyebrow="Decision Practice" title="判断这些资料是否适合作为 RAG 输入。">
              本页只训练数据源识别。更细的质量评分、清洗策略、分块和召回会在后续独立页面展开。
            </SectionHeading>
            <div className="mt-4 grid gap-3">
              {stageThreeSourceDecisionItems.map((item) => (
                <DecisionPracticeRow
                  description={item.description}
                  disabled={locked || completed}
                  feedback={selections[item.key] === item.expected ? item.feedback : ""}
                  key={item.key}
                  label={item.label}
                  onChange={(value) => onSelectionChange(item.key, value as StageThreeSourceDecisionValue)}
                  options={[
                    ["", "选择处理方式"],
                    ["direct", "作为优先候选数据源"],
                    ["clean", "进入后续质量评估"],
                    ["manual", "需补充来源后再判断"],
                    ["exclude", "暂不纳入候选"],
                  ]}
                  title={item.title}
                  value={selections[item.key]}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <GateCard
            checks={[
              ["dataTypes", "我能区分稳定知识、动态记录和原始材料。"],
              ["mesRisk", "我知道 MES 字段缺失不能让 AI 自动补齐。"],
              ["paperStructuring", "我能说明纸质单据为什么需要结构化。"],
              ["sourceHandling", "我能为至少 4 类资料选择处理方式。"],
            ]}
            checkedState={checks}
            completed={completed}
            countLabel="项完成后可保存本环节"
            disabled={locked}
            isSaving={isSaving}
            onCheckChange={onCheckChange}
            onSave={handleSaveClick}
            ready={ready}
            saveLabel="保存数据源决策并进入质量评估"
            title="数据源识别检查"
          />
          <RedlineCard />
        </aside>
      </section>
      </main>
    </div>
      <div
        aria-live="polite"
        className={`toast ${toastVisible ? "visible" : ""}`.trim()}
        data-rag-toast
        role="status"
      >
        {toastMessage}
      </div>
    </>
  );
}

function StageThreeQualityAssessmentView({
  checks,
  completed,
  isSaving,
  locked,
  onCheckChange,
  onSave,
  onSelectionChange,
  onStepChange,
  onViewSample,
  progress,
  ready,
  selections,
  viewedSampleKeys,
}: {
  checks: StageThreeQualityChecks;
  completed: boolean;
  isSaving: boolean;
  locked: boolean;
  onCheckChange: (key: keyof StageThreeQualityChecks, value: boolean) => void;
  onSave: () => Promise<boolean>;
  onSelectionChange: (
    key: keyof StageThreeQualitySelectionState,
    value: StageThreeQualityDecisionValue,
  ) => void;
  onStepChange: (step: RagLearningStep) => void;
  onViewSample: (key: StageThreeQualitySampleKey) => void;
  progress: ReturnType<typeof createStageThreeVNextProgressItems>;
  ready: boolean;
  selections: StageThreeQualitySelectionState;
  viewedSampleKeys: StageThreeQualitySampleKey[];
}) {
  const correctCount = stageThreeQualitySamples.filter(
    (sample) => selections[sample.key] === sample.expected,
  ).length;
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

  function showQualityToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2200);
  }

  async function handleSaveClick() {
    const saved = await onSave();
    if (!saved) {
      return;
    }
    showQualityToast(stageThreeQualitySavedToast);
    window.setTimeout(() => onStepChange("cleaning"), 650);
  }

  return (
    <>
    <div className="rag-decision-page">
      <RagTopbar activeLabel="02 数据质量评估" brand="数据质量评估" />
      <RagFlowNav activeStep="quality" onStepChange={onStepChange} progress={progress} />
      <main className="rag-shell">
        <RagHero
        eyebrow="02 / Data Quality Evaluation"
        cardLabel="本页产物"
        cardTitle="数据质量评估表"
        cardText="为 MES 导出、Excel 台账、纸质质检单、SOP 和图片记录标记质量等级、缺陷原因与下一步处理建议。"
        subtitle="从字段、来源、追溯、可引用和更新责任五个角度评估质检资料，决定资料能否进入后续清洗与预处理。"
        title="数据质量评估：判断资料是否足以支撑可信检索。"
      />

      <section aria-label="数据质量评估原则" className="rag-principle-strip">
        {stageThreeQualityPrinciples.map((item) => (
          <PrincipleCard key={item.label} label={item.label} title={item.title}>
            {item.description}
          </PrincipleCard>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <section aria-labelledby="quality-rubric-title" className="rag-section">
            <div className="rag-section-head split">
              <div>
                <p className="rag-kicker">Quality Rubric</p>
                <h2 id="quality-rubric-title">用 5 个维度判断资料质量，而不是凭感觉说“可用”。</h2>
                <p>每一份资料都要回答：字段是否完整、来源是否可信、记录是否一致、是否能追溯、是否能被回答引用。</p>
              </div>
              <span className="rag-note">5 维评估</span>
            </div>
            <div className="rag-quality-dimensions">
              {stageThreeQualityDimensionItems.map((item) => (
                <article key={item.number}>
                  <span>{item.number}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="quality-matrix-title" className="rag-section">
            <div className="rag-section-head">
              <p className="rag-kicker">Manufacturing Samples</p>
              <h2 id="quality-matrix-title">制造业质检资料质量矩阵。</h2>
              <p>同一种资料不一定总是好或坏。关键在于它能否支撑后续检索、引用和审厂追溯。</p>
            </div>
            <div aria-label="制造业质检资料质量矩阵" className="rag-quality-matrix" role="table">
              <div className="matrix-row matrix-head" role="row">
                <span role="columnheader">资料样本</span>
                <span role="columnheader">主要缺陷</span>
                <span role="columnheader">RAG 影响</span>
                <span role="columnheader">质量判断</span>
              </div>
              {stageThreeQualityMatrixRows.map((item) => (
                <div className="matrix-row" key={item.sample} role="row">
                  <span role="cell">
                    <strong>{item.sample}</strong>
                    <em>{item.sampleType}</em>
                  </span>
                  <span role="cell">{item.defect}</span>
                  <span role="cell">{item.impact}</span>
                  <span role="cell">
                    <mark className={`score-${item.judgmentTone}`}>{item.judgment}</mark>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="quality-impact-title" className="rag-section">
            <div className="rag-section-head">
              <p className="rag-kicker">Quality Impact</p>
              <h2 id="quality-impact-title">劣质数据会怎样影响 RAG 回答？</h2>
              <p>数据质量问题不会停留在表格里，它会一路传导到分块、向量化、召回和最终回答。</p>
            </div>
            <div className="rag-impact-chain">
              {stageThreeQualityImpactItems.map((item) => (
                <article key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="assessment-title" className="rag-section">
            <div className="rag-section-head">
              <p className="rag-kicker">Decision Practice</p>
              <h2 id="assessment-title">先查看样本详情，再作出质量判断。</h2>
              <p>这里训练的是基于原始资料的数据质量判断。学生需要先查看样本原文，再依据本页质量维度自行选择处理建议。</p>
            </div>
            <div className="rag-quality-assessment">
              {stageThreeQualitySamples.map((sample) => {
                const viewed = viewedSampleKeys.includes(sample.key);
                const selected = selections[sample.key];
                const answered = selected !== "";
                const correct = selected === sample.expected;
                return (
                  <article
                    className={[
                      "quality-assessment-item",
                      viewed ? "viewed" : "",
                      answered ? (correct ? "correct" : "incorrect") : "",
                    ].filter(Boolean).join(" ")}
                    key={sample.key}
                  >
                    <div>
                      <span>{sample.sourceLabel}</span>
                      <h3>{sample.title}</h3>
                      <p>{sample.description}</p>
                    </div>
                    <div className="quality-actions">
                      <button
                        disabled={locked || completed}
                        onClick={() => onViewSample(sample.key)}
                        type="button"
                      >
                        查看样本详情
                      </button>
                      <small>{viewed ? "已查看详情" : "未查看详情"}</small>
                    </div>
                    <select
                      aria-label={`${sample.sourceLabel}质量判断`}
                      disabled={locked || completed || !viewed}
                      onChange={(event) =>
                        onSelectionChange(sample.key, event.target.value as StageThreeQualityDecisionValue)
                      }
                      value={selected}
                    >
                      <option value="">选择质量判断</option>
                      <option value="pass">可作为高质量候选</option>
                      <option value="clean">需清洗后进入</option>
                      <option value="manual">需人工补证</option>
                      <option value="block">暂不纳入</option>
                    </select>
                    <p aria-live="polite" className="quality-feedback">
                      {answered ? (correct ? sample.explanation : "请重新查看样本详情，并依据字段、来源、追溯和引用维度判断。") : ""}
                    </p>
                    {viewed ? (
                      <div className="quality-sample-detail">
                        <p>{sample.rawText}</p>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="quality-next-title" className="rag-section rag-next-step">
            <div>
              <p className="rag-kicker">Next Page</p>
              <h2 id="quality-next-title">下一环节：清洗与预处理。</h2>
              <p>质量评估决定后续处理策略：字段标准化、缺失标记、OCR 结构化、去重合并和人工复核。</p>
            </div>
            <button className="rag-next-link" onClick={() => onStepChange("cleaning")} type="button">
              进入清洗与预处理
            </button>
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <section className="rag-side-card">
            <p className="rag-kicker">Quality Gate</p>
            <h3>本页门禁</h3>
            <div className="quality-ring">
              <strong>{correctCount}</strong>
              <span>/4 样本正确</span>
            </div>
            <p>
              已查看 {viewedSampleKeys.length}/4 个样本详情。完成详情查看、样本判断和 4 项检查后，可保存本环节评估结果。
            </p>
          </section>
          <GateCard
            checks={[
              ["fieldCompleteness", "我能说明字段完整性如何影响召回。"],
              ["sourceCredibility", "我能识别来源不可信的资料。"],
              ["cleanVsEvidence", "我能区分清洗、补证和排除。"],
              ["noAutoFill", "我知道低质量资料不能让 AI 自动补事实。"],
            ]}
            checkedState={checks}
            completed={completed}
            countLabel="项检查完成"
            disabled={locked}
            isSaving={isSaving}
            onCheckChange={onCheckChange}
            onSave={handleSaveClick}
            ready={ready}
            saveLabel="保存质量评估"
            title="质量评估检查"
          />
          <RedlineCard />
          <section className="rag-side-card rag-next-card">
            <span>前后衔接</span>
            <p>上一页负责识别数据源，本页判断质量等级，下一页根据这些问题制定清洗与预处理策略。</p>
            <button onClick={() => onStepChange("cleaning")} type="button">进入下一环节</button>
          </section>
        </aside>
      </section>
      </main>
    </div>
      <div
        aria-live="polite"
        className={`toast ${toastVisible ? "visible" : ""}`.trim()}
        data-quality-toast
        role="status"
      >
        {toastMessage}
      </div>
    </>
  );
}

const ragLearningPages: Record<
  Exclude<RagLearningStep, "source" | "quality">,
  {
    activeLabel: string;
    brand: string;
    cardLabel: string;
    cardText: string;
    cardTitle: string;
    eyebrow: string;
    nextStep?: RagLearningStep;
    nextTitle?: string;
    principles: Array<[string, string, string]>;
    sections: Array<{
      eyebrow: string;
      items: Array<[string, string]>;
      note?: string;
      text: string;
      title: string;
    }>;
    sideChecks: string[];
    title: string;
  }
> = {
  chunking: {
    activeLabel: "05 分块策略",
    brand: "分块策略",
    cardLabel: "本页产物",
    cardText: "为 SOP、审厂清单、MES 导出和纸质单据选择分块方式、父子块关系和元数据保留策略。",
    cardTitle: "分块策略说明",
    eyebrow: "05 / Chunking Strategy",
    nextStep: "vector",
    nextTitle: "进入向量化与存储",
    principles: [
      ["不是切得越小越好", "证据必须完整", "一条回答需要同时保留条款、批次、异常原因和处置过程。"],
      ["保留上下文", "父子块比孤立片段更稳", "章节标题、表头、记录编号和来源版本要作为元数据保留。"],
      ["面向召回测试", "分块要能被问题命中", "分块方案最终要通过标准追溯题验证，而不是只看文本长度。"],
    ],
    sections: [
      {
        eyebrow: "Chunk Anatomy",
        title: "一个可用的质检知识块应包含什么？",
        text: "知识块不只是正文片段，还要包含来源、层级、字段和适用边界。",
        items: [
          ["正文", "保留 SOP 条款、审厂清单或质检记录原文。"],
          ["上下文", "保留章节标题、表头、批次和工序。"],
          ["元数据", "记录文件名、版本、维护部门和更新时间。"],
          ["边界", "标记字段缺失、低置信和需人工确认的条件。"],
        ],
      },
      {
        eyebrow: "Strategy Matrix",
        title: "不同资料使用不同分块策略。",
        text: "制度文档适合按章节和条款切分，动态记录适合按批次或事件切分，图片/OCR 结果需要人工复核后再切分。",
        items: [
          ["SOP", "按章节、条款、处理步骤切分，保留版本号。"],
          ["MES/Excel", "按批次、缺陷类型、处置记录组合成事件块。"],
          ["审厂清单", "按问题条目、证据要求和验收口径切分。"],
          ["纸质单据", "先 OCR 和字段确认，再作为附件证据块。"],
        ],
      },
    ],
    sideChecks: ["我能解释为什么分块不能破坏证据链。", "我能为 SOP 和 MES 选择不同分块策略。", "我知道元数据会影响后续召回和引用。"],
    title: "分块策略：决定智能体能不能召回完整、准确的质检证据。",
  },
  citation: {
    activeLabel: "08 回答生成与引用",
    brand: "回答生成与引用",
    cardLabel: "本环节学习结果",
    cardText: "输出可引用、有边界、能解释缺失字段的回答模板。",
    cardTitle: "引用型回答规则",
    eyebrow: "08 / Answer Generation & Citation",
    nextStep: "recall",
    nextTitle: "进入召回测试",
    principles: [
      ["只回答证据支持的部分", "不扩写事实", "没有来源的判断必须降级为提示或转人工。"],
      ["引用要能回查", "来源必须明确", "回答应包含文件名、条款、记录编号或批次信息。"],
      ["缺失字段要暴露", "风险不能隐藏", "字段缺失、记录冲突和责任归属必须显式提示。"],
    ],
    sections: [
      {
        eyebrow: "Citation Rule",
        title: "一条好回答需要同时给出结论、证据和限制。",
        text: "阶段三要求学生把生成式回答约束为可验收交付物，而不是只追求语言流畅。",
        items: [
          ["结论", "先回答范围内问题，避免泛泛解释。"],
          ["来源", "引用 SOP 条款、审厂清单或质检记录编号。"],
          ["限制", "说明缺失字段、低置信和人工确认条件。"],
          ["下一步", "给出补证或转人工的具体动作。"],
        ],
      },
      {
        eyebrow: "Quality Review",
        title: "坏回答通常不是模型不会写，而是证据链断了。",
        text: "如果召回片段缺少上下文，回答会变得看似合理但无法验收。",
        items: [
          ["无来源", "不能用于审厂材料准备。"],
          ["只给结论", "无法说明依据来自哪个批次或条款。"],
          ["忽略缺失", "会把数据质量问题伪装成确定事实。"],
        ],
      },
    ],
    sideChecks: ["我能写出带来源的回答结构。", "我知道不能把缺失字段包装成确定结论。", "我能说明范围外问题如何拒答或转人工。"],
    title: "回答生成与引用：只回答证据能支撑的部分。",
  },
  cleaning: {
    activeLabel: "03 清洗与预处理",
    brand: "清洗与预处理",
    cardLabel: "本页产物",
    cardText: "形成字段标准化、缺失标记、OCR 结构化、去重合并和人工复核策略。",
    cardTitle: "清洗与预处理策略",
    eyebrow: "03 / Cleaning & Pre-processing",
    nextStep: "structure",
    nextTitle: "进入知识结构设计",
    principles: [
      ["不是美化文本", "保留原始证据", "清洗不能改变事实，只能让资料更适合检索和引用。"],
      ["缺失要标记", "不能自动补齐", "批次号、复检结论、异常原因缺失时必须显式保留缺口。"],
      ["需要人工复核", "低置信字段要隔离", "OCR、手写备注和冲突记录必须进入人工确认路径。"],
    ],
    sections: [
      {
        eyebrow: "Cleaning Strategy",
        title: "清洗策略要针对具体质量问题。",
        text: "字段不统一、来源不明、图片低置信、重复记录和缺失字段需要不同处理方式。",
        items: [
          ["字段标准化", "统一批次号、工序、缺陷类型和复检结论命名。"],
          ["缺失标记", "对异常原因、处置结果和责任岗位保留空值说明。"],
          ["OCR 复核", "纸质单据先识别，再标记低置信字段。"],
          ["去重合并", "跨 MES、Excel 和整改报告合并同一事件。"],
          ["来源保留", "清洗后仍要能回到原始文件和记录编号。"],
        ],
      },
      {
        eyebrow: "Before / After",
        title: "清洗后的资料要更可检索，但不能更“确定”。",
        text: "清洗只能提高结构化程度，不能替业务补事实。",
        items: [
          ["清洗前", "异常原因字段缺失，复检结论空值，字段名混乱。"],
          ["清洗后", "统一字段、保留缺失标记、关联原始记录。"],
          ["风险", "任何自动填补都必须被禁止。"],
        ],
      },
    ],
    sideChecks: ["我能区分清洗和补事实。", "我能说明缺失字段如何保留。", "我能为纸质资料设计人工复核路径。"],
    title: "清洗与预处理：让原始质检资料变成可检索、可引用的候选知识。",
  },
  recall: {
    activeLabel: "09 召回测试",
    brand: "召回测试",
    cardLabel: "本环节产物",
    cardText: "准备标准追溯题、范围外题和缺失字段题，验证知识库能否命中正确证据。",
    cardTitle: "召回测试记录",
    eyebrow: "09 / Recall Test",
    nextStep: "risk",
    nextTitle: "进入风险边界",
    principles: [
      ["不是只测答案", "先测证据命中", "回答正确之前，必须先确认召回片段是否包含正确来源。"],
      ["覆盖关键题型", "范围内外都要测", "批次追溯、SOP 查询、缺失字段和责任归属都要进入测试集。"],
      ["记录失败原因", "失败也是证据", "召回失败要反推清洗、结构和分块是否有问题。"],
    ],
    sections: [
      {
        eyebrow: "Test Bench",
        title: "召回测试要覆盖真实审厂追问。",
        text: "测试题不能只问简单定义，要模拟客户审厂时对证据链的追问。",
        items: [
          ["范围内题", "B-240315 批次异常处置证据在哪里？"],
          ["制度题", "不合格品复检流程依据哪条 SOP？"],
          ["缺失题", "如果复检结论缺失，系统应如何提示？"],
          ["范围外题", "谁应该承担质量责任？"],
        ],
      },
      {
        eyebrow: "Coverage Matrix",
        title: "召回矩阵把测试结果转回工程行动。",
        text: "召回失败不是单纯调模型，可能要回到数据清洗、结构设计或分块策略。",
        items: [
          ["未命中", "检查字段映射和关键词别名。"],
          ["命中错块", "检查分块粒度和父子块上下文。"],
          ["证据不完整", "检查来源元数据和引用字段。"],
        ],
      },
    ],
    sideChecks: ["我能设计范围内和范围外测试题。", "我能根据召回失败定位上游问题。", "我知道答案正确不等于召回可信。"],
    title: "召回测试：验证知识库是否真的命中正确证据。",
  },
  retrieval: {
    activeLabel: "07 召回策略",
    brand: "召回策略",
    cardLabel: "本环节学习结果",
    cardText: "理解关键词、向量、混合召回和重排在质检追溯中的作用。",
    cardTitle: "召回策略选择",
    eyebrow: "07 / Retrieval Strategy",
    nextStep: "citation",
    nextTitle: "进入回答生成与引用",
    principles: [
      ["相似不等于相关", "要命中正确证据", "质检追溯更重视批次、工序、缺陷和标准条款是否匹配。"],
      ["混合召回更稳", "关键词 + 向量", "批次号和字段名用关键词，语义描述用向量相似度。"],
      ["需要重排", "证据优先级要排序", "来源可信、字段完整和最新版本应影响最终排序。"],
    ],
    sections: [
      {
        eyebrow: "Visualization",
        title: "召回策略决定哪些证据先进入回答上下文。",
        text: "同一个问题可能召回 SOP、MES 记录和整改报告，需要按任务重新排序。",
        items: [
          ["关键词召回", "命中批次号、条款编号和缺陷类型。"],
          ["向量召回", "命中语义相近的流程说明和客户问题。"],
          ["混合召回", "同时利用结构化字段和语义相似度。"],
          ["重排", "把更可信、更完整、更近的证据排在前面。"],
        ],
      },
      {
        eyebrow: "Score Anatomy",
        title: "召回分数要结合业务字段解释。",
        text: "高相似度片段如果没有批次号或来源版本，也不能直接用于审厂回答。",
        items: [
          ["语义分", "问题与文本描述是否相近。"],
          ["字段分", "批次、工序、缺陷类型是否匹配。"],
          ["可信分", "来源、版本和维护责任是否清楚。"],
        ],
      },
    ],
    sideChecks: ["我能解释关键词和向量召回的差异。", "我知道为什么需要混合召回。", "我能说明重排如何降低错引风险。"],
    title: "召回策略：让问题命中正确证据，而不是相似但无关的材料。",
  },
  risk: {
    activeLabel: "10 风险边界",
    brand: "风险边界",
    cardLabel: "本环节产物",
    cardText: "形成能回答、不能回答、必须转人工的边界声明，作为阶段四智能体实现约束。",
    cardTitle: "风险边界声明",
    eyebrow: "10 / Risk Boundary",
    principles: [
      ["边界先于能力", "不能过度承诺", "质检智能体必须先声明不能替代质量判责和 MES。"],
      ["风险要可执行", "不是写免责声明", "边界要转成拒答、提示、转人工和补证动作。"],
      ["交给阶段四", "实现必须照边界做", "Prompt、工作流和测试集都应继承这里的边界。"],
    ],
    sections: [
      {
        eyebrow: "Boundary Rule",
        title: "把问题先分到能答、提示、拒答和转人工。",
        text: "同一个客户问题可能部分能答、部分不能答，系统需要拆分处理。",
        items: [
          ["能回答", "SOP 条款、审厂清单、已有批次记录。"],
          ["提示不足", "字段缺失、记录冲突、纸质单据低置信。"],
          ["拒答", "责任认定、索赔判断、无来源结论。"],
          ["转人工", "涉及争议、审批和质量责任归属。"],
        ],
      },
      {
        eyebrow: "Boundary Statement",
        title: "边界声明必须进入最终决策文档。",
        text: "阶段三完成后，阶段四构建智能体时应把这些边界转成 Prompt、规则节点和测试题。",
        items: [
          ["Prompt", "明确不补齐缺失字段、不自动判责。"],
          ["工作流", "字段缺失时转人工确认。"],
          ["测试集", "加入范围外拒答和缺失字段提示题。"],
        ],
      },
    ],
    sideChecks: ["我能列出范围内、范围外和转人工条件。", "我能把边界转成阶段四实现约束。", "我知道风险边界不是可选说明。"],
    title: "风险边界：把能回答、不能回答、必须转人工的情况写清楚。",
  },
  structure: {
    activeLabel: "04 知识结构设计",
    brand: "知识结构设计",
    cardLabel: "本页产物",
    cardText: "形成知识域、元数据字段、分类规则和记录关系链，供分块与召回使用。",
    cardTitle: "知识结构草案",
    eyebrow: "04 / Knowledge Structure",
    nextStep: "chunking",
    nextTitle: "进入分块策略",
    principles: [
      ["不是堆文件夹", "先定义知识域", "SOP、审厂要求、检验记录和整改证据应分层管理。"],
      ["元数据是入口", "字段决定能否召回", "批次、工序、缺陷类型、来源版本等字段要结构化。"],
      ["关系链要清楚", "回答需要跨资料", "一条追溯回答可能串联记录、流程、复检和整改证明。"],
    ],
    sections: [
      {
        eyebrow: "Structure Map",
        title: "制造业质检知识库至少包含 4 个知识域。",
        text: "把稳定制度、客户审厂要求、动态记录和附件证据分开，避免召回混乱。",
        items: [
          ["制度知识", "SOP、检验标准、不合格品处理流程。"],
          ["审厂知识", "客户检查清单、整改要求、验收口径。"],
          ["业务记录", "MES 导出、Excel 台账、复检记录。"],
          ["附件证据", "纸质单据、图片、签字扫描件。"],
        ],
      },
      {
        eyebrow: "Metadata Schema",
        title: "元数据字段要为召回和引用服务。",
        text: "没有元数据，RAG 只能靠语义相似度，难以支持审厂追溯。",
        items: [
          ["source_type", "区分 SOP、MES、Excel、图片等来源。"],
          ["batch_id", "支持按批次追溯。"],
          ["process_step", "定位工序和处置环节。"],
          ["effective_date", "避免引用过期制度。"],
        ],
      },
    ],
    sideChecks: ["我能区分四类知识域。", "我能说明哪些元数据影响召回。", "我能描述批次追溯的关系链。"],
    title: "知识结构设计：让质检资料能被检索、引用和维护。",
  },
  vector: {
    activeLabel: "06 向量化与存储",
    brand: "向量化与存储",
    cardLabel: "本环节学习结果",
    cardText: "理解 embedding、向量库字段和相似度检索如何服务质检追溯。",
    cardTitle: "向量存储模型",
    eyebrow: "06 / Vectorization & Storage",
    nextStep: "retrieval",
    nextTitle: "进入召回策略",
    principles: [
      ["向量不是知识本身", "它是检索索引", "仍要保留原文、元数据和来源。"],
      ["相似度需要业务约束", "不能只看语义接近", "批次、工序和来源可信度必须进入过滤或重排。"],
      ["存储要可追溯", "每个向量都要回到原始片段", "回答引用必须能从向量结果回到原始证据。"],
    ],
    sections: [
      {
        eyebrow: "Concept",
        title: "向量化把文本变成可比较的语义坐标。",
        text: "学生需要理解向量能帮助相似问题找到相似资料，但不能替代字段过滤和来源校验。",
        items: [
          ["Embedding", "把 SOP 条款、审厂问题和记录摘要转成向量。"],
          ["Vector Store", "保存向量、原文、元数据和来源 ID。"],
          ["Similarity", "根据问题向量找相近片段。"],
          ["Filter", "用批次、工序、资料类型限制候选范围。"],
        ],
      },
      {
        eyebrow: "Storage Model",
        title: "向量库记录必须同时保存原文和元数据。",
        text: "只有向量没有来源，无法支撑可验收回答。",
        items: [
          ["chunk_id", "定位知识块。"],
          ["source_uri", "回到原始文件。"],
          ["metadata", "保存批次、工序、版本和来源类型。"],
          ["embedding", "用于相似度检索。"],
        ],
      },
    ],
    sideChecks: ["我能说明向量和原文的关系。", "我知道向量检索还需要字段过滤。", "我能设计可追溯的向量库字段。"],
    title: "向量化与存储：让相似问题能找到相近证据。",
  },
};

function StageThreeRagLearningView({
  activeStep,
  isSavingLabRecord,
  onSaveLabExperimentRecord,
  onStepChange,
  progress,
  riskBoundarySnapshot,
}: {
  activeStep: Exclude<RagLearningStep, "source" | "quality">;
  isSavingLabRecord: boolean;
  onSaveLabExperimentRecord: (payload: StageThreeLabExperimentRecordPayload) => Promise<boolean>;
  onStepChange: (step: RagLearningStep) => void;
  progress: ReturnType<typeof createStageThreeVNextProgressItems>;
  riskBoundarySnapshot: StageThreeRiskBoundarySnapshot | null;
}) {
  const page = ragLearningPages[activeStep];
  if (activeStep === "cleaning") {
    return (
      <StageThreeCleaningLearningView
        onStepChange={onStepChange}
        page={page}
        progress={progress}
      />
    );
  }
  if (activeStep === "structure") {
    return (
      <StageThreeStructureLearningView
        onStepChange={onStepChange}
        page={page}
        progress={progress}
      />
    );
  }
  if (activeStep === "chunking") {
    return (
      <StageThreeChunkingLearningView
        onStepChange={onStepChange}
        page={page}
        progress={progress}
      />
    );
  }
  if (activeStep === "vector") {
    return (
      <StageThreeVectorLearningView
        onStepChange={onStepChange}
        page={page}
        progress={progress}
      />
    );
  }
  if (activeStep === "retrieval") {
    return (
      <StageThreeRetrievalLearningView
        onStepChange={onStepChange}
        page={page}
        progress={progress}
      />
    );
  }
  if (activeStep === "citation") {
    return (
      <StageThreeAnswerCitationLearningView
        onStepChange={onStepChange}
        page={page}
        progress={progress}
      />
    );
  }
  if (activeStep === "recall") {
    return (
      <StageThreeRecallTestLearningView
        onStepChange={onStepChange}
        page={page}
        progress={progress}
      />
    );
  }
  if (activeStep === "risk") {
    return (
      <StageThreeRiskBoundaryLearningView
        isSavingLabRecord={isSavingLabRecord}
        onSaveLabExperimentRecord={onSaveLabExperimentRecord}
        onStepChange={onStepChange}
        page={page}
        progress={progress}
        snapshot={riskBoundarySnapshot}
      />
    );
  }

  return (
    <div className="rag-decision-page">
      <RagTopbar activeLabel={page.activeLabel} brand={page.brand} />
      <RagFlowNav activeStep={activeStep} onStepChange={onStepChange} progress={progress} />
      <main className={`rag-shell ${activeStep}-page`}>
        <RagHero
          cardLabel="本页产物"
          cardText={page.cardText}
          cardTitle={page.cardTitle}
          eyebrow={page.eyebrow}
          subtitle={page.sections[0]?.text ?? ""}
          title={page.title}
        />
        <section aria-label={`${page.brand}原则`} className="rag-principle-strip">
          {page.principles.map(([label, title, text]) => (
            <PrincipleCard key={label} label={label} title={title}>
              {text}
            </PrincipleCard>
          ))}
        </section>
        <div className="rag-layout">
          <div className="rag-main">
            {page.sections.map((section) => (
              <section className="rag-section" key={section.eyebrow}>
                <div className={`rag-section-head ${section.note ? "split" : ""}`}>
                  <div>
                    <p className="rag-kicker">{section.eyebrow}</p>
                    <h2>{section.title}</h2>
                    <p>{section.text}</p>
                  </div>
                  {section.note ? <span className="rag-note">{section.note}</span> : null}
                </div>
                <div className="rag-node-grid">
                  {section.items.map(([title, text]) => (
                    <article key={title}>
                      <span>{title}</span>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
            {page.nextStep ? (
              <section className="rag-section rag-next-step" id="rag-next">
                <div className="rag-section-head">
                  <p className="rag-kicker">Next Page</p>
                  <h2>{page.nextTitle}</h2>
                  <p>继续按 Open Design RAG 学习链路进入下一页，完成阶段三完整知识工程训练。</p>
                </div>
                <button
                  className="rag-next-link"
                  onClick={() => onStepChange(page.nextStep!)}
                  type="button"
                >
                  {page.nextTitle}
                </button>
              </section>
            ) : null}
          </div>
          <aside aria-label={`${page.brand}检查`} className="rag-side">
            <section className="rag-side-card">
              <p className="rag-kicker">Checklist</p>
              <h2>{page.brand}检查</h2>
              {page.sideChecks.map((check) => (
                <label key={check}>
                  <input readOnly type="checkbox" />
                  <span>{check}</span>
                </label>
              ))}
              <button disabled type="button">学习页记录随阶段三决策保存</button>
              <p>本页用于训练判断，正式 Artifact 仍由阶段三过程记录和知识工程决策沉淀。</p>
            </section>
            <section className="rag-side-card rag-next-card">
              <span>后端衔接</span>
              <p>这些学习页的判断会在后续知识工程决策、AI 评审和阶段四构建交接中体现，不单独制造独立交付物。</p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function StageThreeCleaningLearningView({
  onStepChange,
  page,
  progress,
}: {
  onStepChange: (step: RagLearningStep) => void;
  page: (typeof ragLearningPages)["cleaning"];
  progress: ReturnType<typeof createStageThreeVNextProgressItems>;
}) {
  const [previewKey, setPreviewKey] = useState(stageThreeCleaningPreviewSamples[0]?.key ?? "mes");
  const [practiceSelections, setPracticeSelections] = useState<Record<string, string>>({});
  const [checkState, setCheckState] = useState<Record<string, boolean>>({});
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const preview =
    stageThreeCleaningPreviewSamples.find((sample) => sample.key === previewKey) ??
    stageThreeCleaningPreviewSamples[0];
  const correctCount = stageThreeCleaningPracticeItems.filter(
    (item) => practiceSelections[item.sampleLabel] === item.answer,
  ).length;
  const checkCount = stageThreeCleaningChecks.filter((check) => checkState[check]).length;
  const canSave =
    correctCount === stageThreeCleaningPracticeItems.length &&
    checkCount === stageThreeCleaningChecks.length;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showCleaningToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2200);
  }

  function handleSaveCleaning() {
    if (!canSave) {
      return;
    }
    showCleaningToast(stageThreeCleaningSavedToast);
    window.setTimeout(() => onStepChange("structure"), 650);
  }

  return (
    <>
    <div className="rag-decision-page">
      <RagTopbar activeLabel={page.activeLabel} brand={page.brand} />
      <RagFlowNav activeStep="cleaning" onStepChange={onStepChange} progress={progress} />
      <main className="rag-shell">
        <RagHero
          cardLabel="本页产物"
          cardText="完成字段映射、缺失标记、去重合并、OCR 结构化和人工复核策略判断，为下一页知识结构设计提供材料。"
          cardTitle="清洗策略记录"
          eyebrow={page.eyebrow}
          subtitle="本页不做真实建库操作，而是训练学生判断：遇到字段混乱、缺失记录、纸质扫描、重复台账时，应该如何处理，处理后会怎样影响后续分块、召回和回答引用。"
          title={page.title}
        />
        <section aria-label="清洗原则" className="rag-principle-strip cleaning-principles">
          <PrincipleCard label="不替数据编事实" title="缺失必须标记">
            异常原因、复检结论、责任岗位缺失时，只能标记待确认，不能让 AI 推断。
          </PrincipleCard>
          <PrincipleCard label="不丢原始证据" title="清洗后仍能回溯">
            每条清洗后的知识都要能回到原始记录、文件、照片或审核材料。
          </PrincipleCard>
          <PrincipleCard label="不只整理格式" title="为检索和引用服务">
            清洗目标是让后续分块、召回、引用更稳定，而不是把表格变得好看。
          </PrincipleCard>
        </section>

        <div className="rag-layout">
          <div className="rag-main">
            <section aria-labelledby="strategy-title" className="rag-section">
              <div className="rag-section-head split">
                <div>
                  <p className="rag-kicker">Cleaning Strategy</p>
                  <h2 id="strategy-title">先判断问题类型，再选择处理策略。</h2>
                  <p>
                    同样是“数据质量差”，处理方式并不一样。字段叫法混乱要做映射，缺失字段要标记待确认，纸质资料要 OCR 加人工复核，来源不明的材料要保留但不能作为引用依据。
                  </p>
                </div>
                <span className="rag-note">5 类策略</span>
              </div>
              <div aria-label="清洗策略说明" className="cleaning-strategy-board">
                {stageThreeCleaningStrategyItems.map((item) => (
                  <article key={item.number}>
                    <span>{item.number}</span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="transform-title" className="rag-section">
              <div className="rag-section-head">
                <p className="rag-kicker">Before / After</p>
                <h2 id="transform-title">从原始脏数据到可用知识条目。</h2>
                <p>下面的对照不是“美化格式”，而是展示一条质检资料经过预处理后，如何获得统一字段、缺失标记和可回溯来源。</p>
              </div>
              <div className="cleaning-transform-lab" data-cleaning-preview>
                <div aria-label="清洗样本切换" className="cleaning-tabs" role="tablist">
                  {stageThreeCleaningPreviewSamples.map((sample) => (
                    <button
                      className={sample.key === preview?.key ? "active" : undefined}
                      data-cleaning-tab={sample.key}
                      key={sample.key}
                      onClick={() => setPreviewKey(sample.key)}
                      type="button"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
                <div className="transform-board cleaning-preview-board">
                  <article className="raw-sample">
                    <span>原始内容</span>
                    <pre data-raw-preview>{preview?.raw}</pre>
                  </article>
                  <div aria-hidden className="transform-arrow">→</div>
                  <article className="clean-sample">
                    <span>预处理后候选知识</span>
                    <dl data-clean-preview>
                      {preview?.clean.map(([term, description]) => (
                        <div key={term}>
                          <dt>{term}</dt>
                          <dd>{description}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                </div>
                <div aria-label="本次预处理动作" className="cleaning-change-list">
                  <span>本次变化</span>
                  <ul data-change-preview>
                    {preview?.changes.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </div>
            </section>

            <section aria-labelledby="pipeline-title" className="rag-section">
              <div className="rag-section-head">
                <p className="rag-kicker">Processing Log</p>
                <h2 id="pipeline-title">清洗过程必须留下处理日志。</h2>
                <p>真实项目里，清洗后的知识条目不能脱离原始材料。学生需要知道每一步做了什么、谁确认过、还有哪些字段不能作为确定事实。</p>
              </div>
              <div aria-label="清洗处理日志示例" className="cleaning-log-table" role="table">
                <div className="cleaning-log-row head" role="row">
                  <span role="columnheader">处理动作</span>
                  <span role="columnheader">适用资料</span>
                  <span role="columnheader">输出结果</span>
                  <span role="columnheader">保留痕迹</span>
                </div>
                {stageThreeCleaningLogRows.map((row) => (
                  <div className="cleaning-log-row" key={row.action} role="row">
                    <span role="cell">{row.action}</span>
                    <span role="cell">{row.evidence}</span>
                    <span role="cell">{row.result}</span>
                    <span role="cell">{row.trace}</span>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="practice-title" className="rag-section">
              <div className="rag-section-head">
                <p className="rag-kicker">Decision Practice</p>
                <h2 id="practice-title">为不同资料选择清洗与预处理策略。</h2>
                <p>根据上一页质量评估结果，为每个制造业质检样本选择合适的处理方式。这里训练的是处理策略判断，不是工具操作。</p>
              </div>
              <div className="cleaning-practice" data-cleaning-practice>
                {stageThreeCleaningPracticeItems.map((item, index) => (
                  (() => {
                    const selected = practiceSelections[item.sampleLabel] ?? "";
                    const answered = selected !== "";
                    const correct = selected === item.answer;
                    return (
                  <article
                    className={[
                      "cleaning-practice-item",
                      answered ? (correct ? "correct" : "incorrect") : "",
                    ].filter(Boolean).join(" ")}
                    data-answer={item.answer}
                    data-cleaning-item
                    key={item.sampleLabel}
                  >
                    <div>
                      <span>{item.sampleLabel}</span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <select
                      aria-label={`样本 ${index + 1} 处理策略`}
                      data-cleaning-select
                      onChange={(event) =>
                        setPracticeSelections((current) => ({
                          ...current,
                          [item.sampleLabel]: event.target.value,
                        }))
                      }
                      value={selected}
                    >
                      <option value="">选择处理策略</option>
                      {item.options.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <p aria-live="polite" className="cleaning-feedback">
                      {answered
                        ? correct
                          ? cleaningFeedbackCopy(item.answer)
                          : "再判断一次：先看问题类型，再决定字段统一、缺失标记、OCR 复核或排除引用。"
                        : ""}
                    </p>
                  </article>
                    );
                  })()
                ))}
              </div>
            </section>

            <section aria-labelledby="next-title" className="rag-section rag-next-step">
              <div className="rag-section-head">
                <p className="rag-kicker">Next Page</p>
                <h2 id="next-title">下一环节：知识结构设计。</h2>
                <p>清洗后的资料仍不是知识库结构。下一页要判断这些候选知识应该按批次、工序、缺陷、标准条款还是审厂问题组织。</p>
              </div>
              <button className="rag-next-link" onClick={() => onStepChange("structure")} type="button">
                进入知识结构设计
              </button>
            </section>
          </div>

          <aside aria-label="清洗与预处理检查" className="rag-side">
            <section className="rag-side-card rag-cleaning-score">
              <p className="rag-kicker">Cleaning Gate</p>
              <h2>本页门禁</h2>
              <div aria-label="练习完成度" className="score-ring">
                <strong data-cleaning-score>{correctCount}</strong>
                <span>/4 策略正确</span>
              </div>
              <p>完成策略判断和 4 项检查后，可保存清洗策略记录，进入知识结构设计。</p>
            </section>
            <section className="rag-side-card">
              <p className="rag-kicker">Checklist</p>
              <h2>清洗前后必须说明</h2>
              {stageThreeCleaningChecks.map((check) => (
                <label key={check}>
                  <input
                    checked={Boolean(checkState[check])}
                    data-cleaning-check
                    onChange={(event) =>
                      setCheckState((current) => ({
                        ...current,
                        [check]: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>{check}</span>
                </label>
              ))}
              <button
                data-save-cleaning
                disabled={!canSave}
                onClick={handleSaveCleaning}
                type="button"
              >
                保存清洗策略
              </button>
              <p><span data-cleaning-check-count>{checkCount}</span>/4 项检查完成。</p>
            </section>
            <section className="rag-side-card ghost">
              <span>本环节红线</span>
              <ul>
                {stageThreeCleaningRedlines.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
            <section className="rag-side-card outline">
              <span>前后衔接</span>
              <p>上一页判断资料质量，本页制定处理策略。下一页会使用清洗后的候选知识设计知识结构。</p>
              <button onClick={() => onStepChange("structure")} type="button">进入下一环节</button>
            </section>
          </aside>
        </div>
      </main>
    </div>
      <div
        aria-live="polite"
        className={`toast ${toastVisible ? "visible" : ""}`.trim()}
        data-cleaning-toast
        role="status"
      >
        {toastMessage}
      </div>
    </>
  );
}

function cleaningFeedbackCopy(value: string): string {
  const feedback: Record<string, string> = {
    exclude: "判断正确：个人经验可作为访谈线索，但不能作为正式引用知识。",
    mapping: "判断正确：字段口径冲突应先建立映射表，保证后续检索使用统一主键。",
    missing: "判断正确：可保留记录，但必须显式标记缺失字段并进入待确认清单。",
    ocr: "判断正确：纸质扫描需要 OCR 提取，再人工复核关键字段。",
  };
  return feedback[value] ?? "";
}

function StageThreeStructureLearningView({
  onStepChange,
  page,
  progress,
}: {
  onStepChange: (step: RagLearningStep) => void;
  page: (typeof ragLearningPages)["structure"];
  progress: ReturnType<typeof createStageThreeVNextProgressItems>;
}) {
  const [practiceSelections, setPracticeSelections] = useState<Record<string, string>>({});
  const [checkState, setCheckState] = useState<Record<string, boolean>>({});
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const correctCount = stageThreeStructurePracticeItems.filter(
    (item) => practiceSelections[item.sampleLabel] === item.answer,
  ).length;
  const checkCount = stageThreeStructureChecks.filter((check) => checkState[check]).length;
  const canSave =
    correctCount === stageThreeStructurePracticeItems.length &&
    checkCount === stageThreeStructureChecks.length;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showStructureToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2200);
  }

  function handleSaveStructure() {
    if (!canSave) {
      return;
    }
    showStructureToast(stageThreeStructureSavedToast);
    window.setTimeout(() => onStepChange("chunking"), 650);
  }

  return (
    <>
    <div className="rag-decision-page">
      <RagTopbar activeLabel={page.activeLabel} brand={page.brand} />
      <RagFlowNav activeStep="structure" onStepChange={onStepChange} progress={progress} />
      <main className="rag-shell">
        <RagHero
          cardLabel={page.cardLabel}
          cardText="完成知识域划分、核心元数据、关系链路和结构归类练习，为下一页分块策略提供稳定骨架。"
          cardTitle={page.cardTitle}
          eyebrow={page.eyebrow}
          subtitle="清洗后的资料仍不是知识库。学生需要先决定资料归入哪个知识域、携带哪些元数据、如何关联批次、工序、缺陷、标准条款和审厂问题，再进入下一步分块策略。"
          title={page.title}
        />
        <section aria-label="知识结构设计原则" className="rag-principle-strip structure-principles">
          <PrincipleCard label="先结构，后分块" title="不要把资料直接切碎">
            没有结构的分块会丢失批次、工序、标准条款之间的关系。
          </PrincipleCard>
          <PrincipleCard label="先证据，后回答" title="每条知识都要可回溯">
            智能体回答审厂问题时，必须能指向来源文件、版本和责任记录。
          </PrincipleCard>
          <PrincipleCard label="先边界，后权限" title="知识域不能混用">
            制度标准、批次记录、异常案例和整改证据应分域管理。
          </PrincipleCard>
        </section>

        <div className="rag-layout">
          <div className="rag-main">
            <section aria-labelledby="map-title" className="rag-section">
              <div className="rag-section-head split">
                <div>
                  <p className="rag-kicker">Structure Map</p>
                  <h2 id="map-title">制造业质检知识库不是一个文件夹，而是一组可关联的知识域。</h2>
                  <p>
                    学生需要理解：审厂问答看似是在问一个问题，实际需要跨越标准条款、批次记录、异常处置和整改证据。结构设计的目标就是让这些资料可以被稳定串起来。
                  </p>
                </div>
                <span className="rag-note">4 个知识域</span>
              </div>
              <div aria-label="制造业质检知识结构示意" className="structure-map">
                <article className="structure-node core">
                  <span>中心对象</span>
                  <strong>审厂追溯问题</strong>
                  <p>例如：B-240315 批次喷涂色差问题是否完成复检？</p>
                </article>
                <div className="structure-lanes">
                  {stageThreeStructureDomainItems.map((item) => (
                    <article className="structure-node" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section aria-labelledby="schema-title" className="rag-section">
              <div className="rag-section-head">
                <p className="rag-kicker">Metadata Schema</p>
                <h2 id="schema-title">先定义元数据骨架，后面才知道如何分块和召回。</h2>
                <p>元数据不是后台字段，而是让智能体能过滤、追溯、引用和判断边界的关键线索。下面这些字段会影响后续向量化、召回策略和回答引用。</p>
              </div>
              <div aria-label="知识结构元数据骨架" className="structure-schema-table" role="table">
                <div className="schema-row head" role="row">
                  <span role="columnheader">元数据</span>
                  <span role="columnheader">作用</span>
                  <span role="columnheader">制造业质检示例</span>
                  <span role="columnheader">缺失风险</span>
                </div>
                {stageThreeStructureMetadataRows.map((row) => (
                  <div className="schema-row" key={row.metadata} role="row">
                    <span role="cell">{row.metadata}</span>
                    <span role="cell">{row.purpose}</span>
                    <span role="cell">{row.example}</span>
                    <span role="cell">{row.risk}</span>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="classification-title" className="rag-section">
              <div className="rag-section-head">
                <p className="rag-kicker">Classification Practice</p>
                <h2 id="classification-title">为清洗后的候选资料选择知识结构归属。</h2>
                <p>同一份资料可能既有证据价值，也有追溯价值。学生要先判断它主要归入哪个知识域，再补充必要关系，避免把所有资料都塞进同一个“文档库”。</p>
              </div>
              <div className="structure-practice" data-structure-practice>
                {stageThreeStructurePracticeItems.map((item, index) => (
                  (() => {
                    const selected = practiceSelections[item.sampleLabel] ?? "";
                    const answered = selected !== "";
                    const correct = selected === item.answer;
                    return (
                  <article
                    className={[
                      "structure-practice-item",
                      answered ? (correct ? "correct" : "incorrect") : "",
                    ].filter(Boolean).join(" ")}
                    data-answer={item.answer}
                    data-structure-item
                    key={item.sampleLabel}
                  >
                    <div>
                      <span>{item.sampleLabel}</span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <select
                      aria-label={`样本 ${index + 1} 知识域选择`}
                      data-structure-select
                      onChange={(event) =>
                        setPracticeSelections((current) => ({
                          ...current,
                          [item.sampleLabel]: event.target.value,
                        }))
                      }
                      value={selected}
                    >
                      <option value="">选择知识域</option>
                      {item.options.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <p aria-live="polite" className="structure-feedback">
                      {answered
                        ? correct
                          ? structureFeedbackCopy(item.answer)
                          : "再判断一次：先看这份资料主要回答什么问题，再决定它进入哪个知识域。"
                        : ""}
                    </p>
                  </article>
                    );
                  })()
                ))}
              </div>
            </section>

            <section aria-labelledby="relationship-title" className="rag-section">
              <div className="rag-section-head">
                <p className="rag-kicker">Relationship Chain</p>
                <h2 id="relationship-title">回答一个审厂问题，通常需要跨知识域引用。</h2>
                <p>好的知识结构不只是分类，还要建立关系链。下面这条链路展示了一个批次问题如何从检索问题连接到制度依据、批次事实、整改记录和原始证据。</p>
              </div>
              <div aria-label="知识关系链路" className="structure-chain">
                {stageThreeStructureChainItems.map((item) => (
                  <article key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.title}</strong>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="next-title" className="rag-section rag-next-step">
              <div className="rag-section-head">
                <p className="rag-kicker">Next Page</p>
                <h2 id="next-title">下一环节：分块策略。</h2>
                <p>结构确定后，下一步才是考虑怎样切分资料。分块不能破坏这里定义的批次、工序、缺陷、标准条款和证据关系。</p>
              </div>
              <button className="rag-next-link" onClick={() => onStepChange("chunking")} type="button">
                进入分块策略
              </button>
            </section>
          </div>

          <aside aria-label="知识结构设计检查" className="rag-side">
            <section className="rag-side-card rag-structure-score">
              <p className="rag-kicker">Structure Gate</p>
              <h2>本页门禁</h2>
              <div aria-label="结构归类完成度" className="score-ring">
                <strong data-structure-score>{correctCount}</strong>
                <span>/4 归类正确</span>
              </div>
              <p>完成结构归类和 4 项检查后，可保存知识结构草案，进入分块策略。</p>
            </section>
            <section className="rag-side-card">
              <p className="rag-kicker">Checklist</p>
              <h2>结构设计必须说明</h2>
              {stageThreeStructureChecks.map((check) => (
                <label key={check}>
                  <input
                    checked={Boolean(checkState[check])}
                    data-structure-check
                    onChange={(event) =>
                      setCheckState((current) => ({
                        ...current,
                        [check]: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>{check}</span>
                </label>
              ))}
              <button
                data-save-structure
                disabled={!canSave}
                onClick={handleSaveStructure}
                type="button"
              >
                保存知识结构草案
              </button>
              <p><span data-structure-check-count>{checkCount}</span>/4 项检查完成。</p>
            </section>
            <section className="rag-side-card ghost">
              <span>本环节红线</span>
              <ul>
                {stageThreeStructureRedlines.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
            <section className="rag-side-card outline">
              <span>前后衔接</span>
              <p>上一页完成清洗策略，本页确定知识结构。下一页会基于结构设计分块策略。</p>
              <button onClick={() => onStepChange("chunking")} type="button">进入下一环节</button>
            </section>
          </aside>
        </div>
      </main>
    </div>
      <div
        aria-live="polite"
        className={`toast ${toastVisible ? "visible" : ""}`.trim()}
        data-structure-toast
        role="status"
      >
        {toastMessage}
      </div>
    </>
  );
}

function structureFeedbackCopy(value: string): string {
  const feedback: Record<string, string> = {
    batch: "判断正确：批次记录用于回答具体批次发生了什么，应归入批次追溯记录。",
    case: "判断正确：原因、处置和复验结论属于异常与整改案例。",
    evidence: "判断正确：扫描件主要承担原始证据附件角色，需要关联批次和复检记录。",
    standard: "判断正确：标准条款提供判断依据，适合归入制度与标准知识域。",
  };
  return feedback[value] ?? "";
}

function StageThreeChunkingLearningView({
  onStepChange,
  page,
  progress,
}: {
  onStepChange: (step: RagLearningStep) => void;
  page: (typeof ragLearningPages)["chunking"];
  progress: ReturnType<typeof createStageThreeVNextProgressItems>;
}) {
  const [documentKey, setDocumentKey] = useState(stageThreeChunkingLabDocuments[0]?.key ?? "sop");
  const [strategy, setStrategy] = useState("structural");
  const [chunkSize, setChunkSize] = useState(180);
  const [overlap, setOverlap] = useState(20);
  const [practiceSelections, setPracticeSelections] = useState<Record<string, string>>({});
  const [checkState, setCheckState] = useState<Record<string, boolean>>({});
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const activeDocument =
    stageThreeChunkingLabDocuments.find((document) => document.key === documentKey) ??
    stageThreeChunkingLabDocuments[0];
  const chunkPreview = createChunkingPreview(activeDocument?.text ?? "", strategy, chunkSize, overlap);
  const correctCount = stageThreeChunkingPracticeItems.filter(
    (item) => practiceSelections[item.sampleLabel] === item.answer,
  ).length;
  const checkCount = stageThreeChunkingChecks.filter((check) => checkState[check]).length;
  const canSave =
    correctCount === stageThreeChunkingPracticeItems.length &&
    checkCount === stageThreeChunkingChecks.length;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showChunkingToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2200);
  }

  function handleSaveChunking() {
    if (!canSave) {
      return;
    }
    showChunkingToast(stageThreeChunkingSavedToast);
    window.setTimeout(() => onStepChange("vector"), 650);
  }

  return (
    <>
    <div className="rag-decision-page">
      <RagTopbar activeLabel={page.activeLabel} brand={page.brand} />
      <RagFlowNav activeStep="chunking" onStepChange={onStepChange} progress={progress} />
      <main className="rag-shell">
        <RagHero
          cardLabel={page.cardLabel}
          cardText="完成资料类型对应的分块单位、必须携带的元数据、重叠策略和不可拆分边界，为下一页向量化与存储提供输入。"
          cardTitle="分块策略记录"
          eyebrow={page.eyebrow}
          subtitle="分块不是机械按字数切文本。学生需要判断 SOP、MES 批次记录、整改报告和图片证据应该按什么业务单位切分，既保留上下文，又让后续向量化和召回足够聚焦。"
          title={page.title}
        />
        <section aria-label="分块策略原则" className="rag-principle-strip chunking-principles">
          <PrincipleCard label="按业务单位切" title="不要只按字数切">
            批次事件、标准条款、整改闭环本身就是分块边界。
          </PrincipleCard>
          <PrincipleCard label="保留检索线索" title="元数据随块同行">
            批次号、工序、缺陷类型、来源版本必须跟随每个块。
          </PrincipleCard>
          <PrincipleCard label="保护引用边界" title="证据不能被切断">
            签字扫描件、复检结论、整改闭环需要保持可引用的完整证据。
          </PrincipleCard>
        </section>

        <div className="rag-layout">
          <div className="rag-main">
            <section aria-labelledby="anatomy-title" className="rag-section">
              <div className="rag-section-head split">
                <div>
                  <p className="rag-kicker">Chunk Anatomy</p>
                  <h2 id="anatomy-title">一个合格知识块，必须同时包含正文、上下文和来源。</h2>
                  <p>如果只把正文切出来，后续召回会缺少过滤条件；如果来源和版本丢失，回答就不能支撑审厂追溯。因此分块策略要从知识结构延续下来。</p>
                </div>
                <span className="rag-note">4 个组成</span>
              </div>
              <div aria-label="合格知识块组成" className="chunk-anatomy">
                {stageThreeChunkingAnatomyItems.map((item) => (
                  <article key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="strategy-title" className="rag-section">
              <div className="rag-section-head">
                <p className="rag-kicker">Strategy Matrix</p>
                <h2 id="strategy-title">不同质检资料，不应该使用同一种分块方式。</h2>
                <p>SOP 适合按条款和步骤切，MES 记录适合按批次事件聚合，整改报告适合按问题闭环切，图片证据则需要和对应记录绑定。</p>
              </div>
              <div aria-label="制造业质检资料分块策略" className="chunk-strategy-table" role="table">
                <div className="chunk-row head" role="row">
                  <span role="columnheader">资料类型</span>
                  <span role="columnheader">推荐分块单位</span>
                  <span role="columnheader">必须保留</span>
                  <span role="columnheader">常见错误</span>
                </div>
                {stageThreeChunkingStrategyRows.map((row) => (
                  <div className="chunk-row" key={row.sourceType} role="row">
                    <span role="cell"><strong>{row.sourceType}</strong><em>{row.role}</em></span>
                    <span role="cell">{row.unit}</span>
                    <span role="cell">{row.keep}</span>
                    <span role="cell">{row.commonMistake}</span>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="simulator-title" className="rag-section">
              <div className="rag-section-head">
                <p className="rag-kicker">Chunking Simulator</p>
                <h2 id="simulator-title">用制造业质检资料实时观察分块结果。</h2>
                <p>这个演示来自 RAG 可视化 demo 的分块逻辑，并改成制造业质检场景。学生可以切换资料、策略和重叠比例，观察原文如何变成可检索的知识块。</p>
              </div>
              <div className="chunk-lab" data-chunk-lab>
                <div aria-label="分块演示参数" className="chunk-lab-controls">
                  <label>
                    <span>资料样本</span>
                    <select
                      data-lab-doc
                      onChange={(event) =>
                        setDocumentKey(event.target.value as (typeof stageThreeChunkingLabDocuments)[number]["key"])
                      }
                      value={documentKey}
                    >
                      {stageThreeChunkingLabDocuments.map((doc) => (
                        <option key={doc.key} value={doc.key}>{doc.title}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>分块策略</span>
                    <select
                      data-lab-strategy
                      onChange={(event) => setStrategy(event.target.value)}
                      value={strategy}
                    >
                      <option value="structural">结构分块</option>
                      <option value="sentence">按语句窗口</option>
                      <option value="fixed">固定长度</option>
                      <option value="semantic">语义段落</option>
                    </select>
                  </label>
                  <label>
                    <span>Chunk Size <strong data-lab-size-value>{chunkSize}</strong></span>
                    <input
                      data-lab-size
                      max={360}
                      min={80}
                      onChange={(event) => setChunkSize(Number(event.target.value))}
                      step={20}
                      type="range"
                      value={chunkSize}
                    />
                  </label>
                  <label>
                    <span>Overlap <strong data-lab-overlap-value>{overlap}%</strong></span>
                    <input
                      data-lab-overlap
                      max={45}
                      min={0}
                      onChange={(event) => setOverlap(Number(event.target.value))}
                      step={5}
                      type="range"
                      value={overlap}
                    />
                  </label>
                </div>
                <div className="chunk-lab-meta">
                  <article>
                    <span>当前资料</span>
                    <strong data-lab-doc-title>{activeDocument?.title}</strong>
                    <p data-lab-doc-note>{activeDocument?.note}</p>
                  </article>
                  <article>
                    <span>生成结果</span>
                    <strong><span data-lab-count>{chunkPreview.length}</span> 个知识块</strong>
                    <p data-lab-risk>{chunkingStrategyCopy(strategy)} 当前 Chunk Size {chunkSize}，Overlap {overlap}%。</p>
                  </article>
                </div>
                <div className="chunk-lab-workspace">
                  <article aria-label="原始资料视图" className="chunk-lab-source">
                    <div className="chunk-lab-panel-head">
                      <span>原始资料视图</span>
                      <small>不同颜色直接标出当前策略生成的 chunk</small>
                    </div>
                    <div className="chunk-lab-text" data-lab-source>
                      {chunkPreview.map((line, index) => (
                        <mark className="chunk-source-segment" key={line} style={chunkStyle(index)}>
                          {line}
                        </mark>
                      ))}
                    </div>
                    <div className="chunk-highlight-note" data-lab-highlight>左侧已用不同颜色显示全部 chunk，可直接比较当前策略生成的边界。</div>
                  </article>
                  <article aria-label="分块结果列表" className="chunk-lab-results">
                    <div className="chunk-lab-panel-head">
                      <span>Chunk List</span>
                      <small>包含偏移、长度和标题路径</small>
                    </div>
                    <div className="chunk-lab-list" data-lab-list>
                      {chunkPreview.map((line, index) => (
                        <article className="chunk-lab-card" key={line} style={chunkStyle(index)}>
                          <span><i aria-hidden />Chunk {String(index + 1).padStart(2, "0")} · 结构边界</span>
                          <strong>{activeDocument?.meta}</strong>
                          <p>{line}</p>
                          <small>offset {index * 48}-{index * 48 + line.length} · {line.length} 字</small>
                        </article>
                      ))}
                    </div>
                  </article>
                </div>
                <div className="chunk-lab-insight" data-lab-insight>
                  <strong>观察重点</strong>
                  <p>{chunkingStrategyCopy(strategy)} 当前共生成 {chunkPreview.length} 个知识块，学生需要观察是否切断了业务判断单元。</p>
                </div>
              </div>
            </section>

            <section aria-labelledby="practice-title" className="rag-section">
              <div className="rag-section-head">
                <p className="rag-kicker">Decision Practice</p>
                <h2 id="practice-title">为不同质检资料选择分块策略。</h2>
                <p>学生需要根据资料类型和未来提问方式，判断应该按条款、事件、闭环还是附件关系进行分块。</p>
              </div>
              <div className="chunk-practice" data-chunk-practice>
                {stageThreeChunkingPracticeItems.map((item, index) => (
                  (() => {
                    const selected = practiceSelections[item.sampleLabel] ?? "";
                    const answered = selected !== "";
                    const correct = selected === item.answer;
                    return (
                  <article
                    className={[
                      "chunk-practice-item",
                      answered ? (correct ? "correct" : "incorrect") : "",
                    ].filter(Boolean).join(" ")}
                    data-answer={item.answer}
                    data-chunk-item
                    key={item.sampleLabel}
                  >
                    <div>
                      <span>{item.sampleLabel}</span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <select
                      aria-label={`样本 ${index + 1} 分块策略`}
                      data-chunk-select
                      onChange={(event) =>
                        setPracticeSelections((current) => ({
                          ...current,
                          [item.sampleLabel]: event.target.value,
                        }))
                      }
                      value={selected}
                    >
                      <option value="">选择分块策略</option>
                      {item.options.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <p aria-live="polite" className="chunk-feedback">
                      {answered
                        ? correct
                          ? chunkingFeedbackCopy(item.answer)
                          : "再判断一次：先看这份资料未来要回答什么问题，再决定分块边界。"
                        : ""}
                    </p>
                  </article>
                    );
                  })()
                ))}
              </div>
            </section>

            <section aria-labelledby="next-title" className="rag-section rag-next-step">
              <div className="rag-section-head">
                <p className="rag-kicker">Next Page</p>
                <h2 id="next-title">下一环节：向量化与存储。</h2>
                <p>分块策略确定后，下一步才是考虑怎样生成向量、如何保存文本块、元数据和来源引用。向量化不是单独动作，它依赖前面每一步的判断结果。</p>
              </div>
              <button className="rag-next-link" onClick={() => onStepChange("vector")} type="button">
                进入向量化与存储
              </button>
            </section>
          </div>

          <aside aria-label="分块策略检查" className="rag-side">
            <section className="rag-side-card rag-chunk-score">
              <p className="rag-kicker">Chunking Gate</p>
              <h2>本页门禁</h2>
              <div aria-label="分块判断完成度" className="score-ring">
                <strong data-chunk-score-count>{correctCount}</strong>
                <span>/4 判断正确</span>
              </div>
              <p>完成 4 个资料样本的分块判断和 4 项检查后，可保存分块策略记录，进入向量化与存储。</p>
            </section>
            <section className="rag-side-card">
              <p className="rag-kicker">Checklist</p>
              <h2>分块策略必须说明</h2>
              {stageThreeChunkingChecks.map((check) => (
                <label key={check}>
                  <input
                    checked={Boolean(checkState[check])}
                    data-chunk-check
                    onChange={(event) =>
                      setCheckState((current) => ({
                        ...current,
                        [check]: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>{check}</span>
                </label>
              ))}
              <button
                data-save-chunking
                disabled={!canSave}
                onClick={handleSaveChunking}
                type="button"
              >
                保存分块策略记录
              </button>
              <p><span data-chunk-check-count>{checkCount}</span>/4 项检查完成。</p>
            </section>
            <section className="rag-side-card ghost">
              <span>本环节红线</span>
              <ul>
                {stageThreeChunkingRedlines.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
            <section className="rag-side-card outline">
              <span>前后衔接</span>
              <p>上一页确定知识结构，本页决定切分单位。下一页会把文本块、元数据和来源信息一起进入向量化与存储设计。</p>
              <button onClick={() => onStepChange("vector")} type="button">进入下一环节</button>
            </section>
          </aside>
        </div>
      </main>
    </div>
      <div
        aria-live="polite"
        className={`toast ${toastVisible ? "visible" : ""}`.trim()}
        data-chunking-toast
        role="status"
      >
        {toastMessage}
      </div>
    </>
  );
}

function createChunkingPreview(text: string, strategy: string, chunkSize: number, overlap: number): string[] {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (strategy === "fixed") {
    const step = Math.max(40, chunkSize - Math.floor(chunkSize * (overlap / 100)));
    const chunks: string[] = [];
    for (let start = 0; start < text.length; start += step) {
      const chunk = text.slice(start, start + chunkSize).trim();
      if (chunk) {
        chunks.push(chunk);
      }
      if (start + chunkSize >= text.length) {
        break;
      }
    }
    return chunks.slice(0, 6);
  }
  if (strategy === "sentence") {
    return lines.reduce<string[]>((chunks, line, index) => {
      if (index % 2 === 0) {
        chunks.push([line, lines[index + 1]].filter(Boolean).join("\n"));
      }
      return chunks;
    }, []).slice(0, 6);
  }
  if (strategy === "semantic") {
    return [lines.slice(0, 3).join("\n"), lines.slice(3).join("\n")].filter(Boolean);
  }
  return lines.slice(0, 6);
}

function chunkingStrategyCopy(value: string): string {
  const copy: Record<string, string> = {
    fixed: "固定长度便于观察参数影响，但最容易把原因、措施和验证结果切散。",
    semantic: "语义段落按业务主题聚合，适合整改报告和多段说明。",
    sentence: "语句窗口能演示 overlap 的作用，但需要检查是否切断业务闭环。",
    structural: "结构分块优先保留标题、条款、批次事件和报告小节。",
  };
  return copy[value] ?? copy.structural;
}

function chunkingFeedbackCopy(value: string): string {
  const feedback: Record<string, string> = {
    attachment: "判断正确：扫描件主要作为证据附件，需要绑定到对应批次记录。",
    clause: "判断正确：SOP 应按条款、步骤和适用条件切分，并保留标题路径。",
    closure: "判断正确：整改报告应按问题闭环切分，保留原因、措施和验证结果。",
    event: "判断正确：MES 记录应按批次、工序和缺陷事件聚合，避免切断追溯链。",
  };
  return feedback[value] ?? "";
}

function chunkStyle(index: number): CSSProperties {
  const tones = [
    ["oklch(93% 0.055 218)", "oklch(68% 0.145 222)"],
    ["oklch(94% 0.060 156)", "oklch(66% 0.135 158)"],
    ["oklch(95% 0.060 82)", "oklch(70% 0.135 82)"],
    ["oklch(93% 0.058 25)", "oklch(67% 0.140 25)"],
  ];
  const [color, border] = tones[index % tones.length] ?? tones[0];
  return {
    "--chunk-border": border,
    "--chunk-color": color,
  } as CSSProperties;
}

type StageThreeVectorQueryKey = (typeof stageThreeVectorQueries)[number]["key"];
type StageThreeVectorFilter = "all" | "batch" | "process" | "defect";

function StageThreeVectorLearningView({
  onStepChange,
  page,
  progress,
}: {
  onStepChange: (step: RagLearningStep) => void;
  page: (typeof ragLearningPages)["vector"];
  progress: ReturnType<typeof createStageThreeVNextProgressItems>;
}) {
  const [queryKey, setQueryKey] = useState<StageThreeVectorQueryKey>("audit");
  const [filter, setFilter] = useState<StageThreeVectorFilter>("all");
  const [practiceSelections, setPracticeSelections] = useState<Record<string, string>>({});
  const [checkState, setCheckState] = useState<Record<string, boolean>>({});
  const [hasSaved, setHasSaved] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const activeQuery =
    stageThreeVectorQueries.find((query) => query.key === queryKey) ??
    stageThreeVectorQueries[0];
  const visiblePoints = stageThreeVectorKnowledgePoints.filter((point) =>
    vectorPassesFilter(point, filter),
  );
  const rankedPoints = activeQuery
    ? visiblePoints
        .map((point) => ({ ...point, score: vectorSimilarity(activeQuery.vector, point.vector) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
    : [];
  const correctCount = stageThreeVectorPracticeItems.filter(
    (item) => practiceSelections[item.sampleLabel] === item.answer,
  ).length;
  const checkCount = stageThreeVectorChecks.filter((check) => checkState[check]).length;
  const canSave =
    correctCount === stageThreeVectorPracticeItems.length &&
    checkCount === stageThreeVectorChecks.length;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showVectorToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2200);
  }

  function handleSaveVectorStorage() {
    if (!canSave) {
      return;
    }
    setHasSaved(true);
    showVectorToast(stageThreeVectorSavedToast);
    window.setTimeout(() => onStepChange("retrieval"), 650);
  }

  return (
    <>
    <div className="rag-decision-page">
      <RagTopbar activeLabel={page.activeLabel} brand={page.brand} />
      <RagFlowNav activeStep="vector" onStepChange={onStepChange} progress={progress} />
      <main className="rag-shell vector-storage-page">
        <RagHero
          cardLabel={page.cardLabel}
          cardText="完成语义空间观察、元数据过滤理解和存储策略选择后，进入下一环节的召回策略设计。"
          cardTitle="向量存储设计判断"
          eyebrow={page.eyebrow}
          subtitle="本页不真实搭建向量库，而是通过制造业质检样本演示：chunk 如何进入语义空间，元数据为什么必须和向量一起保存。"
          title={page.title}
        />
        <div className="rag-layout vector-layout">
          <div className="rag-main">
            <section aria-labelledby="vector-principles-title" className="rag-section vector-principles">
              <div className="rag-section-head">
                <p className="rag-kicker">Concept</p>
                <h2 id="vector-principles-title">向量化不是“存文本”，而是保存可比较的语义位置。</h2>
                <p>在质检追溯场景中，学生要理解两件事：语义相近的 chunk 会在向量空间靠近；但真正可交付的系统还必须保存批次、工序、版本、来源等元数据。</p>
              </div>
              <div className="vector-concept-grid">
                {stageThreeVectorConceptItems.map((item) => (
                  <article key={item.number}>
                    <span>{item.number}</span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="vector-lab-title" className="rag-section vector-lab" data-vector-lab>
              <div className="rag-section-head">
                <p className="rag-kicker">Visualization</p>
                <h2 id="vector-lab-title">语义空间演示：同一查询会靠近哪些质检知识块？</h2>
                <p>选择一个审厂或质检追溯问题，观察查询点与不同知识块的距离。颜色代表知识域，连线越短，相似度越高。</p>
              </div>
              <div className="vector-lab-controls">
                <label>
                  <span>查询问题</span>
                  <select
                    data-vector-query
                    onChange={(event) =>
                      setQueryKey(event.currentTarget.value as StageThreeVectorQueryKey)
                    }
                    value={queryKey}
                  >
                    {stageThreeVectorQueries.map((query) => (
                      <option key={query.key} value={query.key}>{query.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>元数据过滤</span>
                  <select
                    data-vector-filter
                    onChange={(event) =>
                      setFilter(event.currentTarget.value as StageThreeVectorFilter)
                    }
                    value={filter}
                  >
                    <option value="all">不过滤：全部知识块</option>
                    <option value="batch">批次 B-2026-0412</option>
                    <option value="process">工序：终检</option>
                    <option value="defect">缺陷类型：外观划伤</option>
                  </select>
                </label>
              </div>
              <div className="vector-lab-workspace">
                <article className="vector-map-card">
                  <div className="vector-panel-head">
                    <div>
                      <span>Embedding Space</span>
                      <strong>二维语义空间示意</strong>
                    </div>
                    <small>真实向量通常是 768 / 1536 维，这里只用于教学理解。</small>
                  </div>
                  <div className="vector-map-wrap">
                    <svg aria-label="质检知识块向量空间示意" className="vector-map" data-vector-map role="img" viewBox="0 0 720 420">
                      <defs>
                        <pattern height="48" id="vector-grid-static" patternUnits="userSpaceOnUse" width="48">
                          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#e8edf5" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect fill="url(#vector-grid-static)" height="358" rx="14" stroke="#d9e2ef" width="636" x="42" y="26" />
                      <text fill="#64748b" fontSize="12" x="62" y="58">审厂追溯</text>
                      <text fill="#64748b" fontSize="12" x="566" y="58">缺陷分析</text>
                      <text fill="#64748b" fontSize="12" x="62" y="364">质检标准</text>
                      <text fill="#64748b" fontSize="12" x="548" y="364">整改闭环</text>
                      {activeQuery
                        ? rankedPoints.slice(0, 3).map((point, index) => {
                            const [x1, y1] = vectorCoord(activeQuery.vector);
                            const [x2, y2] = vectorCoord(point.vector);
                            return (
                              <line
                                key={`${point.id}-line`}
                                stroke={vectorCategoryColor(point.category)}
                                strokeDasharray={index === 0 ? "0" : "7 6"}
                                strokeOpacity={0.42 - index * 0.08}
                                strokeWidth={index === 0 ? 2.5 : 1.5}
                                x1={x1}
                                x2={x2}
                                y1={y1}
                                y2={y2}
                              />
                            );
                          })
                        : null}
                      {visiblePoints.map((point) => {
                        const [x, y] = vectorCoord(point.vector);
                        const rank = rankedPoints.findIndex((item) => item.id === point.id);
                        return (
                          <g className="vector-point" data-point={point.id} key={point.id}>
                            <circle cx={x} cy={y} fill={vectorCategoryColor(point.category)} r={rank >= 0 ? 11 : 8} stroke="#fff" strokeWidth="2" />
                            {rank >= 0 ? (
                              <>
                                <circle cx={x + 15} cy={y - 15} fill="#111827" r="11" />
                                <text fill="#fff" fontSize="11" fontWeight="700" textAnchor="middle" x={x + 15} y={y - 11}>{rank + 1}</text>
                              </>
                            ) : null}
                            <text fill="#334155" fontSize="12" textAnchor="middle" x={x} y={y + 27}>{point.label}</text>
                          </g>
                        );
                      })}
                      {activeQuery ? (
                        <g className="vector-query-point">
                          <circle cx={vectorCoord(activeQuery.vector)[0]} cy={vectorCoord(activeQuery.vector)[1]} fill="#ef4444" r="15" stroke="#fff" strokeWidth="3" />
                          <text fill="#b91c1c" fontSize="13" fontWeight="800" textAnchor="middle" x={vectorCoord(activeQuery.vector)[0]} y={vectorCoord(activeQuery.vector)[1] - 24}>Q</text>
                        </g>
                      ) : null}
                    </svg>
                  </div>
                  <div className="vector-legend" data-vector-legend>
                    {vectorCategories.map((category) => (
                      <span key={category.key}><i style={{ background: category.color }} />{category.label}</span>
                    ))}
                  </div>
                </article>
                <article className="vector-results-card">
                  <div className="vector-panel-head">
                    <div>
                      <span>Top-K</span>
                      <strong>相似知识块</strong>
                    </div>
                    <small data-vector-summary>Top-{rankedPoints.length} · 过滤后 {visiblePoints.length} 个知识块</small>
                  </div>
                  <div className="vector-result-list" data-vector-results>
                    {rankedPoints.map((point, index) => (
                      <article className="vector-result-item" key={point.id} style={vectorResultStyle(point.category)}>
                        <div className="vector-result-rank">{index + 1}</div>
                        <div className="vector-result-copy">
                          <strong>{point.label}</strong>
                          <p>{point.meta}</p>
                          <small>{point.ref}</small>
                        </div>
                        <div className="vector-score">
                          <span>{Math.round(point.score * 100)}%</span>
                          <i style={{ width: `${Math.round(point.score * 100)}%` }} />
                        </div>
                      </article>
                    ))}
                  </div>
                </article>
              </div>
            </section>

            <section aria-labelledby="storage-model-title" className="rag-section vector-storage-model">
              <div className="rag-section-head">
                <p className="rag-kicker">Storage Model</p>
                <h2 id="storage-model-title">向量库里不能只存向量，还要存可追溯的业务字段。</h2>
                <p>如果只保存文本和向量，系统可能找到“语义相近但批次不对”的证据。质检场景必须把元数据作为检索过滤和引用校验的一部分。</p>
              </div>
              <div className="storage-schema-table">
                <div className="storage-schema-row head">
                  <span>存储字段</span>
                  <span>示例</span>
                  <span>为什么必须保存</span>
                </div>
                {stageThreeVectorStorageRows.map((row) => (
                  <div className="storage-schema-row" key={row.field}>
                    <span>{row.field}</span>
                    <span>{row.example}</span>
                    <span>{row.purpose}</span>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="vector-practice-title" className="rag-section vector-practice">
              <div className="rag-section-head">
                <p className="rag-kicker">Decision Practice</p>
                <h2 id="vector-practice-title">为不同资料选择合适的向量存储策略。</h2>
                <p>判断时不要只看“能不能向量化”，还要看是否需要元数据过滤、版本隔离和人工复核。</p>
              </div>
              <div className="vector-practice-list">
                {stageThreeVectorPracticeItems.map((item, index) => (
                  (() => {
                    const selected = practiceSelections[item.sampleLabel] ?? "";
                    const answered = selected !== "";
                    const correct = selected === item.answer;
                    return (
                  <article
                    className={[
                      "vector-practice-item",
                      answered ? (correct ? "correct" : "incorrect") : "",
                    ].filter(Boolean).join(" ")}
                    data-answer={item.answer}
                    key={item.sampleLabel}
                  >
                    <div>
                      <span>{item.sampleLabel}</span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <select
                      aria-label={`Case ${index + 1} 存储策略判断`}
                      onChange={(event) =>
                        setPracticeSelections((current) => ({
                          ...current,
                          [item.sampleLabel]: event.currentTarget.value,
                        }))
                      }
                      value={selected}
                    >
                      <option value="">选择策略</option>
                      {item.options.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <p aria-live="polite" className="vector-feedback">
                      {answered
                        ? correct
                          ? vectorFeedbackCopy(item.answer)
                          : "再检查一下：质检追溯场景需要关注批次、工序、版本、来源等可审计字段。"
                        : ""}
                    </p>
                  </article>
                    );
                  })()
                ))}
              </div>
            </section>
          </div>

          <aside aria-label="本环节保存门禁" className="rag-side">
            <section className="rag-side-card rag-vector-score">
              <p className="rag-kicker">Quality Gate</p>
              <h2>向量存储判断</h2>
              <p data-vector-gate>
                {canSave
                  ? "已完成向量存储判断，可以保存并进入召回策略。"
                  : `已完成 ${correctCount}/${stageThreeVectorPracticeItems.length} 个策略判断，${checkCount}/${stageThreeVectorChecks.length} 个检查项。`}
              </p>
              {stageThreeVectorChecks.map((check) => (
                <label key={check}>
                  <input
                    checked={Boolean(checkState[check])}
                    data-vector-check
                    onChange={(event) =>
                      setCheckState((current) => ({
                        ...current,
                        [check]: event.currentTarget.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>{check}</span>
                </label>
              ))}
              <button
                data-vector-save
                disabled={!canSave}
                onClick={handleSaveVectorStorage}
                type="button"
              >
                {hasSaved ? "已保存" : "保存本环节结果"}
              </button>
            </section>
            <section className="rag-side-card outline">
              <span>下一环节</span>
              <p>保存后进入召回策略，继续比较向量召回、关键词召回与混合召回。</p>
              <button onClick={() => onStepChange("retrieval")} type="button">进入召回策略</button>
            </section>
          </aside>
        </div>
      </main>
    </div>
      <div
        aria-live="polite"
        className={`toast ${toastVisible ? "visible" : ""}`.trim()}
        data-vector-toast
        role="status"
      >
        {toastMessage}
      </div>
    </>
  );
}

function StageThreeRetrievalLearningView({
  onStepChange,
  page,
  progress,
}: {
  onStepChange: (step: RagLearningStep) => void;
  page: (typeof ragLearningPages)["retrieval"];
  progress: ReturnType<typeof createStageThreeVNextProgressItems>;
}) {
  const [mode, setMode] = useState<StageThreeRetrievalMode>("hybrid");
  const [queryKey, setQueryKey] = useState<StageThreeRetrievalQueryKey>("audit");
  const [filter, setFilter] = useState<StageThreeRetrievalFilter>("all");
  const [topK, setTopK] = useState(4);
  const [practiceSelections, setPracticeSelections] = useState<Record<string, string>>({});
  const [checkState, setCheckState] = useState<Record<string, boolean>>({});
  const [hasSaved, setHasSaved] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const query =
    stageThreeRetrievalQueries.find((item) => item.key === queryKey) ??
    stageThreeRetrievalQueries[0];
  const visibleDocuments = stageThreeRetrievalDocuments.filter((doc) =>
    retrievalPassesFilter(doc, filter),
  );
  const rankedDocuments = visibleDocuments
    .map((doc) => {
      const vectorScore = doc.vector[query.key];
      const keywordScore = retrievalKeywordScore(doc, query);
      const finalScore = retrievalFinalScore(doc, query, mode);
      return { ...doc, finalScore, keywordScore, vectorScore };
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, topK);
  const correctCount = stageThreeRetrievalPracticeItems.filter(
    (item) => practiceSelections[item.sampleLabel] === item.answer,
  ).length;
  const checkCount = stageThreeRetrievalChecks.filter((check) => checkState[check]).length;
  const canSave =
    correctCount === stageThreeRetrievalPracticeItems.length &&
    checkCount === stageThreeRetrievalChecks.length;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showRetrievalToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2200);
  }

  function handleSaveRetrieval() {
    if (!canSave) {
      return;
    }
    setHasSaved(true);
    showRetrievalToast(stageThreeRetrievalSavedToast);
    window.setTimeout(() => onStepChange("citation"), 650);
  }

  return (
    <>
    <div className="rag-decision-page">
      <RagTopbar activeLabel={page.activeLabel} brand={page.brand} />
      <RagFlowNav activeStep="retrieval" onStepChange={onStepChange} progress={progress} />
      <main className="rag-shell retrieval-page">
        <RagHero
          cardLabel="本页产物"
          cardText="完成模式对比、结果排序观察和策略判断后，进入回答生成与引用环节。"
          cardTitle="召回策略选择记录"
          eyebrow={page.eyebrow}
          subtitle="本页通过制造业质检样本演示向量召回、关键词召回、混合召回和元数据过滤的差异。学生需要判断不同业务问题应该采用哪种召回组合。"
          title={page.title}
        />
        <div className="rag-layout retrieval-layout">
          <div className="rag-main">
            <section aria-labelledby="retrieval-principles-title" className="rag-section retrieval-principles">
              <div className="rag-section-head">
                <p className="rag-kicker">Concept</p>
                <h2 id="retrieval-principles-title">召回不是“找最像的一段话”，而是先缩小业务范围，再取可信证据。</h2>
                <p>在质检追溯场景中，批次号、工序、缺陷类型和标准版本通常比语义相似度更能决定答案是否可用。</p>
              </div>
              <div className="retrieval-principle-grid">
                {stageThreeRetrievalConceptItems.map((item) => (
                  <article key={item.number}>
                    <span>{item.number}</span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="retrieval-lab-title" className="rag-section retrieval-lab" data-retrieval-lab>
              <div className="rag-section-head split">
                <div>
                  <p className="rag-kicker">Visualization</p>
                  <h2 id="retrieval-lab-title">召回演示：同一个问题，不同策略会命中不同材料。</h2>
                  <p>切换查询、召回模式和业务过滤条件，观察 Top-K 排序怎样变化。右侧结果中的分数是教学示意，用来理解策略差异。</p>
                </div>
                <div aria-label="召回模式" className="retrieval-mode-tabs" role="tablist">
                  {retrievalModes.map((item) => (
                    <button
                      className={mode === item.key ? "active" : undefined}
                      data-retrieval-mode={item.key}
                      key={item.key}
                      onClick={() => setMode(item.key)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="retrieval-controls">
                <label>
                  <span>查询问题</span>
                  <select
                    data-retrieval-query
                    onChange={(event) =>
                      setQueryKey(event.currentTarget.value as StageThreeRetrievalQueryKey)
                    }
                    value={queryKey}
                  >
                    {stageThreeRetrievalQueries.map((item) => (
                      <option key={item.key} value={item.key}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>业务过滤</span>
                  <select
                    data-retrieval-filter
                    onChange={(event) =>
                      setFilter(event.currentTarget.value as StageThreeRetrievalFilter)
                    }
                    value={filter}
                  >
                    {retrievalFilters.map((item) => (
                      <option key={item.key} value={item.key}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Top-K</span>
                  <input
                    data-retrieval-k
                    max="6"
                    min="3"
                    onChange={(event) => setTopK(Number(event.currentTarget.value))}
                    step="1"
                    type="range"
                    value={topK}
                  />
                  <strong data-retrieval-k-value>{topK}</strong>
                </label>
              </div>

              <div className="retrieval-workspace">
                <article className="retrieval-query-card">
                  <div className="retrieval-panel-head">
                    <div>
                      <span>Query Route</span>
                      <strong>召回路径</strong>
                    </div>
                    <small data-retrieval-summary>
                      {retrievalModeLabel(mode)} · 过滤后 {visibleDocuments.length} 条 · Top-
                      {rankedDocuments.length}
                    </small>
                  </div>
                  <div aria-label="召回路径示意" className="retrieval-route">
                    <div className="route-node query">
                      <span>01</span>
                      <strong>用户问题</strong>
                      <p data-route-query>{query.label}</p>
                    </div>
                    <div className="route-connector" />
                    <div className="route-node filter">
                      <span>02</span>
                      <strong>元数据过滤</strong>
                      <p data-route-filter>{retrievalFilterLabel(filter)}</p>
                    </div>
                    <div className="route-connector" />
                    <div className="route-node rank">
                      <span>03</span>
                      <strong data-route-mode>{retrievalModeLabel(mode)}</strong>
                      <p>输出可引用证据候选</p>
                    </div>
                  </div>
                  <div className="retrieval-insight" data-retrieval-insight>{query.insight}</div>
                </article>

                <article className="retrieval-results-card">
                  <div className="retrieval-panel-head">
                    <div>
                      <span>Top-K Results</span>
                      <strong>候选证据排序</strong>
                    </div>
                    <small>向量分 / 关键词分 / 最终分</small>
                  </div>
                  <div className="retrieval-result-list" data-retrieval-results>
                    {rankedDocuments.map((doc, index) => (
                      <article className="retrieval-result-item" key={doc.id}>
                        <div className="retrieval-rank">{index + 1}</div>
                        <div className="retrieval-result-copy">
                          <div className="retrieval-result-title">
                            <strong>{doc.title}</strong>
                            <span>{doc.source}</span>
                          </div>
                          <p>{doc.text}</p>
                          <small>
                            {doc.meta.batch} · {doc.meta.process} · {doc.meta.defect} ·{" "}
                            {doc.meta.standard} 版
                          </small>
                        </div>
                        <div className="retrieval-score-bars">
                          {[
                            ["向量", doc.vectorScore],
                            ["关键词", doc.keywordScore],
                            ["最终", doc.finalScore],
                          ].map(([label, value]) => (
                            <div className="retrieval-score-row" key={label}>
                              <span>{label}</span>
                              <i><b style={{ width: `${value}%` }} /></i>
                              <strong>{value}</strong>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </article>
              </div>
            </section>

            <section aria-labelledby="score-board-title" className="rag-section retrieval-score-board">
              <div className="rag-section-head">
                <p className="rag-kicker">Score Anatomy</p>
                <h2 id="score-board-title">为什么有的结果语义很像，却不应该排第一？</h2>
                <p>质检知识库的召回排序不能只看向量相似度。业务过滤、关键词命中和来源可信度会决定证据是否能进入回答生成环节。</p>
              </div>
              <div className="retrieval-score-grid">
                {stageThreeRetrievalScoreFactors.map((factor) => (
                  <article key={factor.label}>
                    <span>{factor.label}</span>
                    <h3>{factor.title}</h3>
                    <p>{factor.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="retrieval-practice-title" className="rag-section retrieval-practice">
              <div className="rag-section-head">
                <p className="rag-kicker">Decision Practice</p>
                <h2 id="retrieval-practice-title">为不同质检问题选择召回策略。</h2>
                <p>判断时要先看问题是否需要精确字段，再决定是否使用语义扩展和元数据过滤。</p>
              </div>
              <div className="retrieval-practice-list">
                {stageThreeRetrievalPracticeItems.map((item, index) => (
                  (() => {
                    const selected = practiceSelections[item.sampleLabel] ?? "";
                    const answered = selected !== "";
                    const correct = selected === item.answer;
                    return (
                  <article
                    className={[
                      "retrieval-practice-item",
                      answered ? (correct ? "correct" : "incorrect") : "",
                    ].filter(Boolean).join(" ")}
                    data-answer={item.answer}
                    key={item.sampleLabel}
                  >
                    <div>
                      <span>{item.sampleLabel}</span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <select
                      aria-label={`Case ${index + 1} 召回策略选择`}
                      onChange={(event) =>
                        setPracticeSelections((current) => ({
                          ...current,
                          [item.sampleLabel]: event.currentTarget.value,
                        }))
                      }
                      value={selected}
                    >
                      <option value="">选择召回策略</option>
                      {item.options.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <p aria-live="polite" className="retrieval-feedback">
                      {answered
                        ? correct
                          ? retrievalFeedbackCopy()
                          : "再判断一次：先看问题是否包含批次、条款、版本等精确字段，再决定是否扩展语义召回。"
                        : ""}
                    </p>
                  </article>
                    );
                  })()
                ))}
              </div>
            </section>
          </div>

          <aside aria-label="本环节保存门禁" className="rag-side">
            <section className="rag-side-card rag-retrieval-gate">
              <p className="rag-kicker">Quality Gate</p>
              <h2>召回策略判断</h2>
              <p data-retrieval-gate>
                {canSave
                  ? "已完成召回策略判断，可以保存并进入回答生成与引用。"
                  : `已完成 ${correctCount}/${stageThreeRetrievalPracticeItems.length} 个策略判断，${checkCount}/${stageThreeRetrievalChecks.length} 个检查项。`}
              </p>
              {stageThreeRetrievalChecks.map((check) => (
                <label key={check}>
                  <input
                    checked={Boolean(checkState[check])}
                    data-retrieval-check
                    onChange={(event) =>
                      setCheckState((current) => ({
                        ...current,
                        [check]: event.currentTarget.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>{check}</span>
                </label>
              ))}
              <button
                data-retrieval-save
                disabled={!canSave}
                onClick={handleSaveRetrieval}
                type="button"
              >
                {hasSaved ? "已保存" : "保存本环节结果"}
              </button>
            </section>
            <section className="rag-side-card outline">
              <span>下一环节</span>
              <p>保存后进入回答生成与引用，继续学习如何基于召回证据生成可追溯回答。</p>
              <button onClick={() => onStepChange("citation")} type="button">进入回答生成与引用</button>
            </section>
          </aside>
        </div>
      </main>
    </div>
      <div
        aria-live="polite"
        className={`toast ${toastVisible ? "visible" : ""}`.trim()}
        data-retrieval-toast
        role="status"
      >
        {toastMessage}
      </div>
    </>
  );
}

const retrievalModes: Array<{ key: StageThreeRetrievalMode; label: string }> = [
  { key: "hybrid", label: "混合召回" },
  { key: "vector", label: "向量召回" },
  { key: "keyword", label: "关键词召回" },
];

const retrievalFilters: Array<{ key: StageThreeRetrievalFilter; label: string; route: string }> = [
  { key: "all", label: "不过滤：全库召回", route: "全库召回" },
  { key: "batch", label: "批次：B-2026-0412", route: "批次：B-2026-0412" },
  { key: "process", label: "工序：终检", route: "工序：终检" },
  { key: "standard", label: "标准版本：2026", route: "标准版本：2026" },
  { key: "rectify", label: "资料类型：整改闭环", route: "资料类型：整改闭环" },
];

function retrievalKeywordScore(
  doc: (typeof stageThreeRetrievalDocuments)[number],
  query: StageThreeRetrievalQuery,
): number {
  const hits = query.keywords.filter((word) =>
    doc.keywords.some((keyword) => keyword.includes(word) || word.includes(keyword)) ||
    doc.text.includes(word),
  ).length;
  return Math.round((hits / query.keywords.length) * 100);
}

function retrievalPassesFilter(
  doc: (typeof stageThreeRetrievalDocuments)[number],
  filter: StageThreeRetrievalFilter,
): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "batch") {
    return doc.meta.batch === "B-2026-0412";
  }
  if (filter === "process") {
    return doc.meta.process === "终检";
  }
  if (filter === "standard") {
    return doc.meta.standard === "2026" || doc.type === "standard";
  }
  return doc.meta.kind === "rectify";
}

function retrievalFinalScore(
  doc: (typeof stageThreeRetrievalDocuments)[number],
  query: StageThreeRetrievalQuery,
  mode: StageThreeRetrievalMode,
): number {
  const vector = doc.vector[query.key];
  const keyword = retrievalKeywordScore(doc, query);
  if (mode === "vector") {
    return vector;
  }
  if (mode === "keyword") {
    return keyword;
  }
  const sourceBoost = doc.type === "mes" || doc.type === "standard" || doc.type === "audit" ? 6 : 0;
  return Math.min(100, Math.round(vector * 0.58 + keyword * 0.36 + sourceBoost));
}

function retrievalModeLabel(mode: StageThreeRetrievalMode): string {
  if (mode === "vector") {
    return "向量排序";
  }
  if (mode === "keyword") {
    return "关键词排序";
  }
  return "混合排序";
}

function retrievalFilterLabel(filter: StageThreeRetrievalFilter): string {
  return retrievalFilters.find((item) => item.key === filter)?.route ?? "全库召回";
}

function retrievalFeedbackCopy(): string {
  return "判断正确：这个场景需要把业务字段、语义扩展和证据可信度一起纳入召回。";
}

function StageThreeAnswerCitationLearningView({
  onStepChange,
  page,
  progress,
}: {
  onStepChange: (step: RagLearningStep) => void;
  page: (typeof ragLearningPages)["citation"];
  progress: ReturnType<typeof createStageThreeVNextProgressItems>;
}) {
  const [policy, setPolicy] = useState<StageThreeAnswerPolicy>("strict");
  const [caseKey, setCaseKey] = useState<StageThreeAnswerCaseKey>("audit");
  const [grain, setGrain] = useState<StageThreeAnswerCitationGrain>("chunk");
  const [practiceSelections, setPracticeSelections] = useState<Record<string, string>>({});
  const [checkState, setCheckState] = useState<Record<string, boolean>>({});
  const [hasSaved, setHasSaved] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const currentCase =
    stageThreeAnswerCases.find((item) => item.key === caseKey) ?? stageThreeAnswerCases[0];
  const score = answerCitationQualityScore(policy, grain);
  const scoreTone = score >= 80 ? "good" : score >= 60 ? "warn" : "bad";
  const correctCount = stageThreeAnswerPracticeItems.filter(
    (item) => practiceSelections[item.sampleLabel] === item.answer,
  ).length;
  const checkCount = stageThreeAnswerChecks.filter((check) => checkState[check]).length;
  const canSave =
    correctCount === stageThreeAnswerPracticeItems.length &&
    checkCount === stageThreeAnswerChecks.length;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showAnswerToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2200);
  }

  function handleSaveAnswerCitation() {
    if (!canSave) {
      return;
    }
    setHasSaved(true);
    showAnswerToast(stageThreeAnswerSavedToast);
    window.setTimeout(() => onStepChange("recall"), 650);
  }

  return (
    <>
    <div className="rag-decision-page">
      <RagTopbar activeLabel={page.activeLabel} brand={page.brand} />
      <RagFlowNav activeStep="citation" onStepChange={onStepChange} progress={progress} />
      <main className="rag-shell answer-page">
        <RagHero
          cardLabel="本页产物"
          cardText="完成回答模式对比、引用链检查和越界判断后，进入召回测试环节。"
          cardTitle="回答引用质量检查记录"
          eyebrow={page.eyebrow}
          subtitle="本页训练学生检查 RAG 回答是否引用了正确来源、是否说明资料不足，以及是否把模型推理误写成事实结论。"
          title={page.title}
        />

        <div className="rag-layout answer-layout">
          <div className="rag-main">
            <section aria-labelledby="answer-principles-title" className="rag-section answer-principles">
              <div className="rag-section-head">
                <p className="rag-kicker">Concept</p>
                <h2 id="answer-principles-title">好的 RAG 回答不是“说得像真的”，而是每个关键判断都能回到证据。</h2>
                <p>制造业质检问答会影响审厂准备、整改判断和责任边界。没有批次、工序、标准版本或来源引用时，智能体应主动说明限制。</p>
              </div>
              <div className="answer-principle-grid">
                {stageThreeAnswerPrinciples.map((item) => (
                  <article key={item.number}>
                    <span>{item.number}</span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="answer-lab-title" className="rag-section answer-lab" data-answer-lab>
              <div className="rag-section-head split">
                <div>
                  <p className="rag-kicker">Visualization</p>
                  <h2 id="answer-lab-title">回答演示：同一组召回证据，不同生成策略会产生不同风险。</h2>
                  <p>切换问题和回答策略，观察答案、引用证据、缺失说明和越界风险怎样变化。这里的回答是教学示例，用来训练引用质量判断。</p>
                </div>
                <div aria-label="回答策略" className="answer-policy-tabs" role="tablist">
                  {answerPolicies.map((item) => (
                    <button
                      className={policy === item.key ? "active" : undefined}
                      data-answer-policy={item.key}
                      key={item.key}
                      onClick={() => setPolicy(item.key)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="answer-controls">
                <label>
                  <span>业务问题</span>
                  <select
                    data-answer-query
                    onChange={(event) =>
                      setCaseKey(event.currentTarget.value as StageThreeAnswerCaseKey)
                    }
                    value={caseKey}
                  >
                    {stageThreeAnswerCases.map((item) => (
                      <option key={item.key} value={item.key}>{item.question}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>引用粒度</span>
                  <select
                    data-citation-grain
                    onChange={(event) =>
                      setGrain(event.currentTarget.value as StageThreeAnswerCitationGrain)
                    }
                    value={grain}
                  >
                    {answerCitationGrains.map((item) => (
                      <option key={item.key} value={item.key}>{item.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="answer-workspace">
                <article className="answer-output-card">
                  <div className="answer-panel-head">
                    <div>
                      <span>Generated Answer</span>
                      <strong>生成回答</strong>
                    </div>
                    <small className={scoreTone} data-answer-score>引用质量 {score} / 100</small>
                  </div>
                  <div className="answer-question" data-answer-question>{currentCase.question}</div>
                  <div className="answer-draft" data-answer-draft>
                    <p>{currentCase.answer[policy]}</p>
                  </div>
                  <div aria-label="回答引用" className="answer-citation-strip" data-answer-citations>
                    {currentCase.evidence.map((item) => (
                      <span key={item.id}>{answerCitationLabel(item, grain)}</span>
                    ))}
                  </div>
                  <div className={`answer-warning ${policy === "loose" ? "bad" : policy === "balanced" ? "warn" : "good"}`} data-answer-warning>
                    {currentCase.warning[policy]}
                  </div>
                </article>

                <article className="answer-evidence-card">
                  <div className="answer-panel-head">
                    <div>
                      <span>Evidence Trace</span>
                      <strong>召回证据与引用链</strong>
                    </div>
                    <small>证据来源 / 可引用字段</small>
                  </div>
                  <div className="answer-evidence-list" data-answer-evidence>
                    {currentCase.evidence.map((item) => (
                      <article className="answer-evidence-item" key={item.id}>
                        <div>
                          <span>{item.id}</span>
                          <strong>{item.title}</strong>
                        </div>
                        <p>{item.field}</p>
                        <small>{item.source}</small>
                        <em>{item.supports}</em>
                      </article>
                    ))}
                  </div>
                </article>
              </div>
            </section>

            <section aria-labelledby="answer-quality-title" className="rag-section answer-quality">
              <div className="rag-section-head">
                <p className="rag-kicker">Quality Review</p>
                <h2 id="answer-quality-title">检查回答质量时，学生要看四个维度。</h2>
                <p>这一步训练学生从“答案是否好听”转向“答案是否可交付、可追溯、可审计”。</p>
              </div>
              <div className="answer-quality-grid">
                {stageThreeAnswerQualityFactors.map((factor) => (
                  <article key={factor.label}>
                    <span>{factor.label}</span>
                    <h3>{factor.title}</h3>
                    <p>{factor.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="answer-practice-title" className="rag-section answer-practice">
              <div className="rag-section-head">
                <p className="rag-kicker">Decision Practice</p>
                <h2 id="answer-practice-title">判断这些回答能否进入正式交付。</h2>
                <p>不要只看语气是否流畅，要判断引用、边界和不确定说明是否到位。</p>
              </div>
              <div className="answer-practice-list">
                {stageThreeAnswerPracticeItems.map((item, index) => (
                  (() => {
                    const selected = practiceSelections[item.sampleLabel] ?? "";
                    const answered = selected !== "";
                    const correct = selected === item.answer;
                    return (
                  <article
                    className={[
                      "answer-practice-item",
                      answered ? (correct ? "correct" : "incorrect") : "",
                    ].filter(Boolean).join(" ")}
                    data-answer={item.answer}
                    key={item.sampleLabel}
                  >
                    <div>
                      <span>{item.sampleLabel}</span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <select
                      aria-label={`Case ${index + 1} 回答质量判断`}
                      onChange={(event) =>
                        setPracticeSelections((current) => ({
                          ...current,
                          [item.sampleLabel]: event.currentTarget.value,
                        }))
                      }
                      value={selected}
                    >
                      <option value="">选择处理方式</option>
                      {item.options.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <p aria-live="polite" className="answer-feedback">
                      {answered
                        ? correct
                          ? answerFeedbackCopy()
                          : "再检查证据是否足够支撑结论，以及回答是否越过质量责任边界。"
                        : ""}
                    </p>
                  </article>
                    );
                  })()
                ))}
              </div>
            </section>
          </div>

          <aside aria-label="本环节保存门禁" className="rag-side">
            <section className="rag-side-card rag-answer-gate">
              <p className="rag-kicker">Quality Gate</p>
              <h2>回答引用检查</h2>
              <p data-answer-gate>
                {canSave
                  ? "回答引用检查已完成，可以保存本环节结果。"
                  : `已完成 ${correctCount} / ${stageThreeAnswerPracticeItems.length} 个判断，${checkCount} / ${stageThreeAnswerChecks.length} 项引用检查。`}
              </p>
              {stageThreeAnswerChecks.map((check) => (
                <label key={check}>
                  <input
                    checked={Boolean(checkState[check])}
                    data-answer-check
                    onChange={(event) =>
                      setCheckState((current) => ({
                        ...current,
                        [check]: event.currentTarget.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>{check}</span>
                </label>
              ))}
              <button
                data-answer-save
                disabled={!canSave}
                onClick={handleSaveAnswerCitation}
                type="button"
              >
                {hasSaved ? "已保存" : "保存本环节结果"}
              </button>
            </section>
            <section className="rag-side-card rag-next-card">
              <span>下一环节</span>
              <p>保存回答引用检查后，进入召回测试，验证整条 RAG 链路是否能稳定命中、生成和引用。</p>
              <button onClick={() => onStepChange("recall")} type="button">进入召回测试</button>
            </section>
          </aside>
        </div>
      </main>
    </div>
      <div
        aria-live="polite"
        className={`toast ${toastVisible ? "visible" : ""}`.trim()}
        data-answer-toast
        role="status"
      >
        {toastMessage}
      </div>
    </>
  );
}

const answerPolicies: Array<{ key: StageThreeAnswerPolicy; label: string }> = [
  { key: "strict", label: "严格引用" },
  { key: "balanced", label: "解释型回答" },
  { key: "loose", label: "越界示例" },
];

const answerCitationGrains: Array<{ key: StageThreeAnswerCitationGrain; label: string }> = [
  { key: "chunk", label: "引用到知识块" },
  { key: "field", label: "引用到字段/条款" },
  { key: "source", label: "只引用来源文件" },
];

function answerCitationQualityScore(
  policy: StageThreeAnswerPolicy,
  grain: StageThreeAnswerCitationGrain,
): number {
  let base = policy === "strict" ? 92 : policy === "balanced" ? 86 : 48;
  if (grain === "field") {
    base += 4;
  }
  if (grain === "source") {
    base -= 10;
  }
  return Math.max(0, Math.min(100, base));
}

function answerCitationLabel(
  evidence: (typeof stageThreeAnswerCases)[number]["evidence"][number],
  grain: StageThreeAnswerCitationGrain,
): string {
  if (grain === "field") {
    return evidence.field;
  }
  if (grain === "source") {
    return evidence.source;
  }
  return `${evidence.id} · ${evidence.title}`;
}

function answerFeedbackCopy(): string {
  return "判断正确：这个处理方式符合证据引用和边界控制要求。";
}

function StageThreeRecallTestLearningView({
  onStepChange,
  page,
  progress,
}: {
  onStepChange: (step: RagLearningStep) => void;
  page: (typeof ragLearningPages)["recall"];
  progress: ReturnType<typeof createStageThreeVNextProgressItems>;
}) {
  const [caseKey, setCaseKey] = useState<StageThreeRecallCaseKey>("batch");
  const [topK, setTopK] = useState(4);
  const [threshold, setThreshold] = useState(0.8);
  const [hasRunTests, setHasRunTests] = useState(false);
  const [practiceSelections, setPracticeSelections] = useState<Record<string, string>>({});
  const [checkState, setCheckState] = useState<Record<string, boolean>>({});
  const [hasSaved, setHasSaved] = useState(false);
  const currentCase =
    stageThreeRecallCases.find((item) => item.key === caseKey) ?? stageThreeRecallCases[0];
  const shownResults = currentCase.results.slice(0, topK);
  const targetHits = shownResults.filter((item) => item.target).length;
  const hitRate = Math.round((targetHits / currentCase.expected.length) * 100);
  const falseCount = shownResults.filter((item) => !item.target).length;
  const passed = hitRate / 100 >= threshold && falseCount <= 1;
  const correctCount = stageThreeRecallPracticeItems.filter(
    (item) => practiceSelections[item.sampleLabel] === item.answer,
  ).length;
  const checkCount = stageThreeRecallChecks.filter((check) => checkState[check]).length;
  const canSave =
    hasRunTests &&
    correctCount === stageThreeRecallPracticeItems.length &&
    checkCount === stageThreeRecallChecks.length;
  const gateScore =
    (hasRunTests ? 1 : 0) +
    (correctCount === stageThreeRecallPracticeItems.length ? 1 : 0) +
    checkCount;
  const gateTotal = 2 + stageThreeRecallChecks.length;
  const gateProgress = Math.round((gateScore / gateTotal) * 100);

  function handleSaveRecallTest() {
    if (!canSave) {
      return;
    }
    setHasSaved(true);
    window.setTimeout(() => onStepChange("risk"), 650);
  }

  return (
    <div className="rag-decision-page">
      <RagTopbar activeLabel={page.activeLabel} brand={page.brand} />
      <RagFlowNav activeStep="recall" onStepChange={onStepChange} progress={progress} />
      <main className="rag-shell recall-page">
        <RagHero
          cardLabel="本页产物"
          cardText="完成测试集设计、结果判断和门禁检查后，进入风险边界说明。"
          cardTitle="召回测试记录"
          eyebrow={page.eyebrow}
          subtitle="本页训练学生设计测试问题、运行召回结果、判断命中是否可靠，并识别漏召回、误召回和边界问题。"
          title={page.title}
        />

        <div className="rag-layout recall-layout">
          <div className="rag-main">
            <section aria-labelledby="recall-principles-title" className="rag-section recall-principles">
              <div className="rag-section-head">
                <p className="rag-kicker">Concept</p>
                <h2 id="recall-principles-title">召回测试不是问一个问题看答案，而是覆盖真实交付中的关键风险。</h2>
                <p>制造业质检知识库至少要测试范围内问题、字段缺失问题、记录冲突问题和范围外问题。测试结果要回到证据命中情况，而不是只看回答是否顺滑。</p>
              </div>
              <div className="recall-principle-grid">
                {stageThreeRecallPrinciples.map((item) => (
                  <article key={item.number}>
                    <span>{item.number}</span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="recall-lab-title" className="rag-section recall-test-lab" data-recall-lab>
              <div className="rag-section-head split">
                <div>
                  <p className="rag-kicker">Test Bench</p>
                  <h2 id="recall-lab-title">构建一组召回测试问题，观察命中结果是否符合预期。</h2>
                  <p>切换测试问题并运行召回，检查 Top-K 结果是否命中目标证据、是否混入相似但错误的材料。</p>
                </div>
                <button
                  className="recall-run-button"
                  data-run-tests
                  onClick={() => setHasRunTests(true)}
                  type="button"
                >
                  {hasRunTests ? "重新运行批量测试" : "运行批量测试"}
                </button>
              </div>

              <div className="recall-workbench">
                <aside aria-label="召回测试问题" className="recall-case-list">
                  <div className="recall-panel-head">
                    <div>
                      <span>Test Set</span>
                      <strong>测试问题</strong>
                    </div>
                    <small data-case-count>{stageThreeRecallCases.length} 个场景</small>
                  </div>
                  {stageThreeRecallCases.map((item) => (
                    <button
                      className={caseKey === item.key ? "active" : undefined}
                      data-test-case={item.key}
                      key={item.key}
                      onClick={() => setCaseKey(item.key)}
                      type="button"
                    >
                      <span>{item.type.replace("测试", "")}</span>
                      <strong>{item.question}</strong>
                    </button>
                  ))}
                </aside>

                <div className="recall-result-stage">
                  <div className="recall-query-card">
                    <div>
                      <span data-test-type>{currentCase.type}</span>
                      <h3 data-test-question>{currentCase.question}</h3>
                      <p data-test-goal>{currentCase.goal}</p>
                    </div>
                    <div className="recall-query-controls">
                      <label>
                        <span>Top-K</span>
                        <select data-topk onChange={(event) => setTopK(Number(event.currentTarget.value))} value={topK}>
                          {[3, 4, 5].map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>通过阈值</span>
                        <select data-pass-threshold onChange={(event) => setThreshold(Number(event.currentTarget.value))} value={threshold}>
                          <option value={0.7}>70%</option>
                          <option value={0.8}>80%</option>
                          <option value={0.9}>90%</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div aria-label="当前测试指标" className="recall-metrics">
                    <article>
                      <span>目标命中率</span>
                      <strong data-hit-rate>{hitRate}%</strong>
                      <i><b data-hit-bar style={{ width: `${hitRate}%` }} /></i>
                    </article>
                    <article>
                      <span>误召回</span>
                      <strong data-false-count>{falseCount} 条</strong>
                      <i className="warn"><b data-false-bar style={{ width: `${Math.min(100, falseCount * 26)}%` }} /></i>
                    </article>
                    <article>
                      <span>测试结论</span>
                      <strong data-test-verdict>{passed ? "通过" : "需修正"}</strong>
                      <i><b data-verdict-bar style={{ width: `${passed ? 100 : 54}%` }} /></i>
                    </article>
                  </div>

                  <div className="recall-results-panel">
                    <div className="recall-panel-head">
                      <div>
                        <span>Retrieved Evidence</span>
                        <strong>召回结果</strong>
                      </div>
                      <small data-result-summary>
                        命中 {targetHits}/{currentCase.expected.length} · 误召回 {falseCount} 条
                      </small>
                    </div>
                    <div className="recall-result-list" data-recall-results>
                      {hasRunTests ? shownResults.map((item, index) => (
                        <article className={`recall-result-item ${item.target ? "target" : "noise"}`} key={item.id}>
                          <div className="recall-rank">{index + 1}</div>
                          <div className="recall-result-copy">
                            <div className="recall-result-title">
                              <strong>{item.title}</strong>
                              <span>{item.target ? "目标证据" : "相似噪声"}</span>
                            </div>
                            <p>{item.meta}</p>
                            <small>{item.source}</small>
                          </div>
                          <span className="recall-score-pill">{Math.round(item.score * 100)}%</span>
                        </article>
                      )) : (
                        <p className="recall-empty">选择问题后点击“运行批量测试”，查看该问题的 Top-K 召回结果。</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="recall-matrix-title" className="rag-section recall-matrix">
              <div className="rag-section-head">
                <p className="rag-kicker">Coverage Matrix</p>
                <h2 id="recall-matrix-title">召回测试集要覆盖四类问题，不能只测最容易回答的范围内问题。</h2>
                <p>学生需要为每类问题判断测试目的、通过标准和失败后要回到哪个前置环节修改。</p>
              </div>
              <div className="recall-matrix-grid">
                {stageThreeRecallMatrixItems.map((item) => (
                  <article key={item.label}>
                    <span>{item.label}</span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <small>{item.fallback}</small>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="recall-practice-title" className="rag-section recall-practice">
              <div className="rag-section-head">
                <p className="rag-kicker">Decision Practice</p>
                <h2 id="recall-practice-title">判断这些测试失败应回到哪个环节修正。</h2>
                <p>召回测试的价值在于定位问题来源：是数据质量、分块、向量化、召回策略，还是风险边界没有定义清楚。</p>
              </div>
              <div className="recall-practice-list">
                {stageThreeRecallPracticeItems.map((item, index) => (
                  (() => {
                    const selected = practiceSelections[item.sampleLabel] ?? "";
                    const answered = selected !== "";
                    const correct = selected === item.answer;
                    return (
                  <article
                    className={[
                      "recall-practice-item",
                      answered ? (correct ? "correct" : "incorrect") : "",
                    ].filter(Boolean).join(" ")}
                    data-answer={item.answer}
                    key={item.sampleLabel}
                  >
                    <div>
                      <span>{item.sampleLabel}</span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <select
                      aria-label={`Case ${index + 1} 修正环节`}
                      onChange={(event) =>
                        setPracticeSelections((current) => ({
                          ...current,
                          [item.sampleLabel]: event.currentTarget.value,
                        }))
                      }
                      value={selected}
                    >
                      <option value="">选择应回到的环节</option>
                      {item.options.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <p aria-live="polite" className="recall-feedback">
                      {answered
                        ? correct
                          ? recallFeedbackCopy()
                          : "再想想：召回测试要定位失败来源，而不是只修改回答文案。"
                        : ""}
                    </p>
                  </article>
                    );
                  })()
                ))}
              </div>
            </section>
          </div>

          <aside aria-label="召回测试保存门禁" className="rag-side">
            <section className="rag-side-card rag-recall-gate">
              <p className="rag-kicker">Test Gate</p>
              <h2>保存召回测试记录</h2>
              <p>完成批量测试、修正判断和提交前检查后，才能进入风险边界环节。</p>
              <div className="rag-gate-progress">
                <span data-recall-progress style={{ "--value": `${gateProgress}%` } as CSSProperties} />
              </div>
              <ul className="rag-check-list">
                {stageThreeRecallChecks.map((check) => (
                  <li key={check}>
                    <label>
                      <input
                        checked={Boolean(checkState[check])}
                        data-recall-check
                        onChange={(event) =>
                          setCheckState((current) => ({
                            ...current,
                            [check]: event.currentTarget.checked,
                          }))
                        }
                        type="checkbox"
                      />{" "}
                      {check}
                    </label>
                  </li>
                ))}
              </ul>
              <button
                className="rag-save-button"
                data-save-recall
                disabled={!canSave}
                onClick={handleSaveRecallTest}
                type="button"
              >
                {hasSaved ? "已保存" : "保存召回测试记录"}
              </button>
              <p className="rag-save-state" data-recall-save-state>
                {hasSaved
                  ? stageThreeRecallSavedState
                  : canSave
                    ? "召回测试记录已达到保存条件。"
                    : "需要完成批量测试、三项判断练习和提交前检查。"}
              </p>
            </section>
            <section className="rag-side-card rag-next-card">
              <span>下一环节</span>
              <p>完成测试记录后，将所有数据、召回和回答风险收束为阶段三边界说明。</p>
              <button onClick={() => onStepChange("risk")} type="button">进入风险边界</button>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function recallFeedbackCopy(): string {
  return "判断正确：该失败应回到对应前置环节修正。";
}

const riskChoices = [
  { key: "answer", label: "可以回答" },
  { key: "insufficient", label: "说明资料不足" },
  { key: "manual", label: "转人工确认" },
  { key: "refuse", label: "拒答并说明边界" },
] as const;

function StageThreeRiskBoundaryLearningView({
  isSavingLabRecord,
  onSaveLabExperimentRecord,
  onStepChange,
  page,
  progress,
  snapshot,
}: {
  isSavingLabRecord: boolean;
  onSaveLabExperimentRecord: (payload: StageThreeLabExperimentRecordPayload) => Promise<boolean>;
  onStepChange: (step: RagLearningStep) => void;
  page: (typeof ragLearningPages)["risk"];
  progress: ReturnType<typeof createStageThreeVNextProgressItems>;
  snapshot: StageThreeRiskBoundarySnapshot | null;
}) {
  const [caseKey, setCaseKey] = useState<StageThreeRiskBoundaryCaseKey>("supported");
  const [selectedChoices, setSelectedChoices] = useState<
    Record<StageThreeRiskBoundaryCaseKey, StageThreeRiskBoundaryChoice | "">
  >(
    () =>
      snapshot?.selectedChoices ?? {
        authority: "",
        conflict: "",
        missing: "",
        supported: "",
      },
  );
  const [boundaryFields, setBoundaryFields] = useState<Record<"scope" | "evidence" | "manual" | "refusal", string>>(() =>
    snapshot?.boundaryFields ??
    (Object.fromEntries(stageThreeRiskBoundaryTemplateFields.map((field) => [field.key, field.value])) as Record<
      "scope" | "evidence" | "manual" | "refusal",
      string
    >),
  );
  const [boundarySaved, setBoundarySaved] = useState(() => snapshot?.boundarySaved ?? false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [checkState, setCheckState] = useState<Record<string, boolean>>(
    () => snapshot?.checkState ?? {},
  );
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const currentCase =
    stageThreeRiskBoundaryCases.find((item) => item.key === caseKey) ??
    stageThreeRiskBoundaryCases[0];
  const selectedChoice = selectedChoices[currentCase.key] ?? "";
  const selectedCorrect = selectedChoice === currentCase.answer;
  const judgedCount = stageThreeRiskBoundaryCases.filter(
    (item) => selectedChoices[item.key] === item.answer,
  ).length;
  const casesDone = judgedCount === stageThreeRiskBoundaryCases.length;
  const checksDone = stageThreeRiskBoundaryChecks.every((check) => checkState[check]);
  const gateDoneCount = [casesDone, boundarySaved, checksDone].filter(Boolean).length;
  const gateScore = Math.round((gateDoneCount / 3) * 100);
  const canCompleteRisk = casesDone && boundarySaved && checksDone;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showRiskToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2200);
  }

  function handleRiskChoice(choice: StageThreeRiskBoundaryChoice) {
    const isCorrect = choice === currentCase.answer;
    setSelectedChoices((current) => ({
      ...current,
      [currentCase.key]: isCorrect ? choice : "",
    }));
  }

  function handleResetRisk() {
    setSelectedChoices({
      authority: "",
      conflict: "",
      missing: "",
      supported: "",
    });
    setBoundarySaved(false);
    setPreviewVisible(false);
    setCheckState({});
    showRiskToast("风险场景判断已重置");
  }

  function handleSaveBoundaryDraft() {
    const complete = stageThreeRiskBoundaryTemplateFields.every(
      (field) => (boundaryFields[field.key] ?? "").trim().length >= 8,
    );
    if (!complete) {
      showRiskToast("请先补全四段边界声明，每段至少写清一个具体规则");
      return;
    }
    setBoundarySaved(true);
    setPreviewVisible(true);
    showRiskToast("边界声明草稿已保存");
  }

  async function handleCompleteRiskBoundary() {
    if (!canCompleteRisk || isSavingLabRecord) {
      return;
    }
    const ok = await onSaveLabExperimentRecord(
      createStageThreeRiskBoundaryRecordPayload({
        boundaryFields,
        checks: checkState,
        selectedChoices: {
          authority: selectedChoices.authority ?? "",
          conflict: selectedChoices.conflict ?? "",
          missing: selectedChoices.missing ?? "",
          supported: selectedChoices.supported ?? "",
        },
      }),
    );
    if (ok) {
      showRiskToast(stageThreeRiskBoundarySavedToast);
      window.setTimeout(() => {
        window.location.hash = "stage-four";
      }, 650);
    }
  }

  return (
    <>
    <div className="rag-decision-page">
      <RagTopbar activeLabel={page.activeLabel} brand={page.brand} />
      <RagFlowNav activeStep="risk" onStepChange={onStepChange} progress={progress} />
      <main className="rag-shell risk-page">
        <RagHero
          cardLabel="本页产物"
          cardText="完成边界分流、风险规则和声明模板后，进入阶段四智能体实现与测试。"
          cardTitle="RAG 风险边界说明"
          eyebrow={page.eyebrow}
          subtitle="本页训练学生把召回测试结果转成正式边界规则，避免阶段四智能体在证据不足、责任判定或越权场景中给出不可靠结论。"
          title={page.title}
        />
        <div className="rag-layout risk-layout">
          <div className="rag-main">
            <section aria-labelledby="risk-principles-title" className="rag-section risk-principles">
              <div className="rag-section-head">
                <p className="rag-kicker">Boundary Rule</p>
                <h2 id="risk-principles-title">RAG 风险边界不是免责声明，而是产品行为规则。</h2>
                <p>制造业质检智能体需要明确何时回答、何时说明资料不足、何时转人工。边界规则会直接影响阶段四的 Prompt、工作流和验收测试。</p>
              </div>
              <div className="risk-rule-strip">
                {stageThreeRiskBoundaryPrinciples.map((item) => (
                  <article key={item.number}>
                    <span>{item.number}</span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="risk-router-title" className="rag-section risk-router" data-risk-router>
              <div className="rag-section-head split">
                <div>
                  <p className="rag-kicker">Decision Router</p>
                  <h2 id="risk-router-title">选择一个审厂问题，判断智能体应该如何处理。</h2>
                  <p>这一练习会把召回测试中的不同失败类型转成产品级回答策略：直接回答、说明不足、转人工或拒答。</p>
                </div>
                <button
                  className="risk-reset-button"
                  data-reset-risk
                  onClick={handleResetRisk}
                  type="button"
                >
                  重置判断
                </button>
              </div>

              <div className="risk-router-grid">
                <aside aria-label="风险场景" className="risk-case-list">
                  {stageThreeRiskBoundaryCases.map((item) => (
                    <button
                      className={caseKey === item.key ? "active" : undefined}
                      data-risk-case={item.key}
                      key={item.key}
                      onClick={() => setCaseKey(item.key)}
                      type="button"
                    >
                      <span>{item.type}</span>
                      <strong>{item.question}</strong>
                    </button>
                  ))}
                </aside>

                <div className="risk-decision-stage">
                  <div className="risk-scenario-card">
                    <div>
                      <span data-risk-type>{currentCase.type}</span>
                      <h3 data-risk-question>{currentCase.question}</h3>
                      <p data-risk-context>{currentCase.context}</p>
                    </div>
                    <div className="risk-evidence-stack" data-risk-evidence>
                      {currentCase.evidence.map((item, index) => (
                        <span key={item}><b>{index + 1}</b>{item}</span>
                      ))}
                    </div>
                  </div>
                  <div aria-label="处理策略选择" className="risk-decision-options">
                    {riskChoices.map((choice) => (
                      <button
                        className={selectedChoice === choice.key ? "correct" : undefined}
                        data-risk-choice={choice.key}
                        key={choice.key}
                        onClick={() => handleRiskChoice(choice.key)}
                        type="button"
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                  <div
                    className={`risk-result-panel ${selectedChoice ? "pass" : ""}`.trim()}
                    data-risk-result
                  >
                    {selectedChoice ? (
                      <>
                        <span>判断正确</span>
                        <strong>{currentCase.pass}</strong>
                        <p>这条边界规则可以写入阶段四 Prompt、工作流或测试用例。</p>
                      </>
                    ) : (
                      <>
                        <span>请选择处理策略</span>
                        <strong>边界判断结果会显示在这里。</strong>
                        <p>学生需要根据证据是否充分、是否涉及责任判定、是否超出知识库范围作出判断。</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="risk-matrix-title" className="rag-section risk-matrix">
              <div className="rag-section-head">
                <p className="rag-kicker">Boundary Matrix</p>
                <h2 id="risk-matrix-title">把常见问题写成阶段四可执行的边界规则。</h2>
                <p>边界规则需要能落到 Prompt、流程分支和验收测试里，不能只停留在“谨慎回答”这样的笼统表述。</p>
              </div>
              <div aria-label="风险边界规则矩阵" className="risk-matrix-table" role="table">
                <div className="head" role="row">
                  <span role="columnheader">风险类型</span>
                  <span role="columnheader">触发信号</span>
                  <span role="columnheader">智能体行为</span>
                  <span role="columnheader">阶段四实现要求</span>
                </div>
                {stageThreeRiskBoundaryMatrixRows.map((row) => (
                  <div key={row.riskType} role="row">
                    <span>{row.riskType}</span>
                    <span>{row.signal}</span>
                    <span>{row.action}</span>
                    <span>{row.implementation}</span>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="risk-template-title" className="rag-section risk-template">
              <div className="rag-section-head">
                <p className="rag-kicker">Boundary Statement</p>
                <h2 id="risk-template-title">完成一段可放入阶段二技术方案与阶段四 Prompt 的边界声明。</h2>
                <p>边界声明要具体到制造业质检场景，明确支持范围、证据要求、转人工条件和不可回答内容。</p>
              </div>
              <div className="risk-template-grid">
                {stageThreeRiskBoundaryTemplateFields.map((field) => (
                  <article key={field.key}>
                    <h3>{field.title}</h3>
                    <textarea
                      data-boundary-field={field.key}
                      onChange={(event) =>
                        setBoundaryFields((current) => ({
                          ...current,
                          [field.key]: event.currentTarget.value,
                        }))
                      }
                      value={boundaryFields[field.key] ?? ""}
                    />
                  </article>
                ))}
              </div>
              <div className="risk-template-actions">
                <button
                  className="risk-secondary"
                  data-preview-boundary
                  onClick={() => setPreviewVisible(true)}
                  type="button"
                >
                  预览边界声明
                </button>
                <button
                  className="risk-primary"
                  data-save-boundary
                  onClick={handleSaveBoundaryDraft}
                  type="button"
                >
                  {boundarySaved ? "已保存边界草稿" : "保存边界草稿"}
                </button>
              </div>
              <div className="risk-preview" data-boundary-preview hidden={!previewVisible}>
                {stageThreeRiskBoundaryTemplateFields.map((field) => (
                  <p key={field.key}>
                    <strong>{field.title}：</strong>
                    {boundaryFields[field.key]}
                  </p>
                ))}
              </div>
            </section>
          </div>

          <aside aria-label="本环节门禁" className="rag-side risk-side">
            <section className="rag-side-card risk-gate-card">
              <p className="rag-kicker">Completion Gate</p>
              <h2>边界门禁</h2>
              <div aria-label="完成度" className="rag-quality-score risk-score">
                <strong data-risk-score>{gateScore}%</strong>
                <span>完成度</span>
              </div>
              <ul className="risk-gate-list">
                <li className={casesDone ? "done" : undefined} data-gate="cases">
                  完成 4 个风险场景判断
                </li>
                <li className={boundarySaved ? "done" : undefined} data-gate="template">
                  保存边界声明草稿
                </li>
                <li className={checksDone ? "done" : undefined} data-gate="checklist">
                  确认阶段四实现要求
                </li>
              </ul>
            </section>
            <section className="rag-side-card risk-check-card">
              <p className="rag-kicker">Checklist</p>
              <h2>进入阶段四前确认</h2>
              {stageThreeRiskBoundaryChecks.map((check) => (
                <label key={check}>
                  <input
                    checked={Boolean(checkState[check])}
                    data-risk-check
                    onChange={(event) =>
                      setCheckState((current) => ({
                        ...current,
                        [check]: event.currentTarget.checked,
                      }))
                    }
                    type="checkbox"
                  />{" "}
                  {check}
                </label>
              ))}
            </section>
            <section className="rag-side-card risk-next-card">
              <span>Next</span>
              <p>保存本环节结果后，进入阶段四导学，先理解智能体实现的模块关系。</p>
              <button
                data-complete-risk
                disabled={!canCompleteRisk || isSavingLabRecord}
                onClick={handleCompleteRiskBoundary}
                type="button"
              >
                {isSavingLabRecord ? "保存中" : "保存并进入阶段四导学"}
              </button>
            </section>
          </aside>
        </div>
      </main>
    </div>
      <div
        aria-live="polite"
        className={`toast ${toastVisible ? "visible" : ""}`.trim()}
        data-rag-toast
        role="status"
      >
        {toastMessage}
      </div>
    </>
  );
}

const vectorCategories = [
  { color: "#2563eb", key: "audit", label: "审厂追溯", soft: "#dbeafe" },
  { color: "#059669", key: "defect", label: "缺陷分析", soft: "#d1fae5" },
  { color: "#7c3aed", key: "standard", label: "质检标准", soft: "#ede9fe" },
  { color: "#d97706", key: "rectify", label: "整改闭环", soft: "#fef3c7" },
] as const;

type StageThreeVectorKnowledgePointView = (typeof stageThreeVectorKnowledgePoints)[number];

function vectorPassesFilter(point: StageThreeVectorKnowledgePointView, filter: StageThreeVectorFilter): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "batch") {
    return point.meta.includes("B-2026-0412") || point.category === "audit";
  }
  if (filter === "process") {
    return point.meta.includes("终检") || point.category === "standard";
  }
  if (filter === "defect") {
    return point.meta.includes("划伤") || point.category === "defect";
  }
  return true;
}

function vectorFeedbackCopy(value: string): string {
  const feedback: Record<string, string> = {
    manual: "判断正确：该资料的向量化必须配合业务元数据或人工补充，才能支撑可追溯回答。",
    metadata: "判断正确：该资料的向量化必须配合业务元数据或人工补充，才能支撑可追溯回答。",
    versioned: "判断正确：该资料的向量化必须配合业务元数据或人工补充，才能支撑可追溯回答。",
  };
  return feedback[value] ?? "";
}

function vectorCoord(vector: [number, number]): [number, number] {
  return [70 + vector[0] * 580, 40 + (1 - vector[1]) * 330];
}

function vectorSimilarity(a: [number, number], b: [number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 1.15);
}

function vectorCategoryColor(categoryKey: string): string {
  return vectorCategories.find((category) => category.key === categoryKey)?.color ?? "#2563eb";
}

function vectorResultStyle(categoryKey: string): CSSProperties {
  const category = vectorCategories.find((item) => item.key === categoryKey) ?? vectorCategories[0];
  return {
    "--vector-color": category.color,
    "--vector-soft": category.soft,
  } as CSSProperties;
}

function RagTopbar({ activeLabel, brand }: { activeLabel: string; brand: string }) {
  return (
    <header className="rag-topbar">
      <a aria-label="返回学生首页" className="rag-brand" href="#student-home">
        <span>FDE</span>
        <strong>{brand}</strong>
      </a>
      <nav aria-label="阶段三导航" className="rag-topnav">
        <a href="#stage-two">阶段二工作台</a>
        <a className="active" href="#stage-three">阶段三 RAG</a>
        <a href="#stage-four">阶段四导学</a>
      </nav>
      <div className="rag-stage-status">
        <span>Stage 03</span>
        <strong>{activeLabel}</strong>
      </div>
    </header>
  );
}

function RagHero({
  cardLabel,
  cardText,
  cardTitle,
  eyebrow,
  subtitle,
  title,
}: {
  cardLabel: string;
  cardText: string;
  cardTitle: string;
  eyebrow: string;
  subtitle: string;
  title: string;
}) {
  return (
    <section aria-labelledby="rag-title" className="rag-hero">
      <div className="rag-hero-copy">
        <p className="rag-kicker">{eyebrow}</p>
        <h1 id="rag-title">{title}</h1>
        <p>{subtitle}</p>
      </div>
      <aside aria-label={cardLabel} className="rag-hero-card">
        <span>{cardLabel}</span>
        <strong>{cardTitle}</strong>
        <p>{cardText}</p>
      </aside>
    </section>
  );
}

function RagFlowNav({
  activeStep,
  onStepChange,
  progress,
}: {
  activeStep: RagLearningStep;
  onStepChange?: (step: RagLearningStep) => void;
  progress: ReturnType<typeof createStageThreeVNextProgressItems>;
}) {
  void progress;
  const implementedSteps: Array<{ key: RagLearningStep; number: string; title: string }> = [
    { key: "source", number: "01", title: "数据源识别" },
    { key: "quality", number: "02", title: "数据质量评估" },
    { key: "cleaning", number: "03", title: "清洗与预处理" },
    { key: "structure", number: "04", title: "知识结构设计" },
    { key: "chunking", number: "05", title: "分块策略" },
    { key: "vector", number: "06", title: "向量化与存储" },
    { key: "retrieval", number: "07", title: "召回策略" },
    { key: "citation", number: "08", title: "回答生成与引用" },
    { key: "recall", number: "09", title: "召回测试" },
    { key: "risk", number: "10", title: "风险边界" },
  ];

  return (
    <nav aria-label="RAG 知识库构建流程" className="rag-flow-nav">
      {implementedSteps.map((step) => (
        <a
          className={activeStep === step.key ? "active" : undefined}
          href={`#rag-${step.key}`}
          key={step.key}
          onClick={(event) => {
            if (!onStepChange) {
              return;
            }
            event.preventDefault();
            onStepChange(step.key);
          }}
        >
          <span>{step.number}</span>
          <strong>{step.title}</strong>
        </a>
      ))}
    </nav>
  );
}

function PrincipleCard({
  children,
  label,
  title,
}: {
  children: ReactNode;
  label: string;
  title: string;
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{title}</strong>
      <p>{children}</p>
    </article>
  );
}

function SectionHeading({
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
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-xl font-extrabold leading-tight text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{children}</p>
    </div>
  );
}

function QualityColumn({
  children,
  title,
  tone,
}: {
  children: ReactNode;
  title: string;
  tone: "good" | "risk";
}) {
  return (
    <section
      className={`rounded-[18px] border p-5 ${
        tone === "good" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <h3 className="text-base font-extrabold text-slate-950">{title}</h3>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">{children}</ul>
    </section>
  );
}

function DecisionPracticeRow({
  description,
  disabled,
  feedback,
  label,
  onChange,
  options,
  title,
  value,
}: {
  description: string;
  disabled: boolean;
  feedback: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  title: string;
  value: string;
}) {
  return (
    <article className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div>
        <p className="text-xs font-extrabold text-emerald-700">{label}</p>
        <h4 className="mt-2 text-base font-extrabold text-slate-950">{title}</h4>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        {feedback ? <p className="mt-2 text-sm font-bold text-emerald-700">{feedback}</p> : null}
      </div>
      <select
        className="min-h-10 self-start rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue || "empty"} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </article>
  );
}

function GateCard<TKey extends string>({
  checkedState,
  checks,
  completed,
  countLabel,
  disabled,
  isSaving,
  onCheckChange,
  onSave,
  ready,
  saveLabel,
  title,
}: {
  checkedState: Record<TKey, boolean>;
  checks: Array<[TKey, string]>;
  completed: boolean;
  countLabel: string;
  disabled: boolean;
  isSaving: boolean;
  onCheckChange: (key: TKey, value: boolean) => void;
  onSave: () => void;
  ready: boolean;
  saveLabel: string;
  title: string;
}) {
  const count = checks.filter(([key]) => checkedState[key]).length;

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <p className="text-xs font-extrabold uppercase text-emerald-700">Decision Checklist</p>
      <h3 className="mt-2 text-lg font-extrabold text-slate-950">{title}</h3>
      <div className="mt-4 grid gap-3">
        {checks.map(([key, label]) => (
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-600" key={key}>
            <input
              checked={checkedState[key]}
              className="mt-1 h-4 w-4 accent-emerald-600"
              disabled={disabled || completed}
              onChange={(event) => onCheckChange(key, event.target.checked)}
              type="checkbox"
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <button
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled || completed || isSaving || !ready}
        onClick={onSave}
        type="button"
      >
        {isSaving ? "保存中" : saveLabel}
      </button>
      <p className="mt-3 text-center text-xs font-bold text-slate-500">
        {count}/{checks.length} {countLabel}
      </p>
    </section>
  );
}

function RedlineCard() {
  return (
    <section className="rounded-[18px] border border-amber-200 bg-amber-50 p-5">
      <p className="text-xs font-extrabold uppercase text-amber-700">本环节红线</p>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-amber-900">
        <li>不能把缺少证据的数据包装成确定结论。</li>
        <li>不能让 AI 自动认定质量责任。</li>
        <li>不能把非正式聊天截图当成可信知识。</li>
        <li>回答追溯问题必须说明来源和缺失项。</li>
      </ul>
    </section>
  );
}

function StageThreeFocusedHeader({
  mode,
  onBack,
  statusLabel,
}: {
  mode: StageThreeMode;
  onBack: () => void;
  statusLabel: string;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3">
      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft aria-hidden size={16} />
        返回数据源识别
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={modeTitle(mode)} tone="success" />
        <StatusBadge label={statusLabel} tone="info" />
      </div>
    </section>
  );
}

function ProjectDecisionHero({
  isRefreshing,
  onRefresh,
  readiness,
  statusLabel,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
  readiness: LayerReadiness[];
  statusLabel: string;
}) {
  return (
    <section className="rounded-[18px] bg-slate-950 p-5 text-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="项目决策工作台" tone="success" />
            <StatusBadge label={statusLabel} tone="info" />
          </div>
          <h3 className="mt-4 text-2xl font-extrabold leading-tight">
            把实验结论迁移成项目知识工程决策
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
            这里承接阶段二方案和五层实验室观察，把知识目标、材料来源、分块、向量化、召回和评估转成阶段四可执行配置。
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isRefreshing}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw aria-hidden size={16} />
          同步阶段进度
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {readiness.map((item, index) => (
          <LayerCard
            icon={layerIcon(index)}
            key={item.title}
            label={item.title}
            ready={item.ready}
            value={item.description}
          />
        ))}
      </div>
    </section>
  );
}

function RiskDocumentHero({
  isRefreshing,
  onRefresh,
  readiness,
  statusLabel,
  statusTone,
  submissionGate,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
  readiness: LayerReadiness[];
  statusLabel: string;
  statusTone: ReturnType<typeof stageStatusCopy>["tone"];
  submissionGate: SubmissionGate;
}) {
  const completedLayers = readiness.filter((item) => item.ready).length;
  const completedChecks = submissionGate.checks.filter((check) => check.ready).length;

  return (
    <section className="rounded-[18px] bg-slate-950 p-5 text-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="阶段三收口" tone="success" />
            <StatusBadge label={statusLabel} tone={statusTone} />
            <StatusBadge
              label={`${completedChecks} / ${submissionGate.checks.length} 项门禁`}
              tone={submissionGate.canSubmit ? "success" : "warning"}
            />
          </div>
          <h3 className="mt-4 text-2xl font-extrabold leading-tight">AI 评审与阶段四交接</h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
            这里把已保存的项目决策整理成风险矩阵、正式决策文档和提交前检查，确认阶段四可以按文档执行。
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isRefreshing}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw aria-hidden size={16} />
          同步阶段进度
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
          <div className="flex items-center gap-2 text-emerald-200">
            <FileCheck2 aria-hidden size={18} />
            <p className="text-xs font-extrabold">五层决策完整度</p>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-white">
            {completedLayers} / {readiness.length}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            数据、分块、向量、召回、评估五层共同决定阶段四构建依据。
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
          <div className="flex items-center gap-2 text-emerald-200">
            <CheckCircle2 aria-hidden size={18} />
            <p className="text-xs font-extrabold">提交状态</p>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-white">
            {submissionGate.canSubmit ? "可提交" : "待补齐"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            决策文档、风险预判、AI 评审和阶段四交接全部就绪后可完成阶段三。
          </p>
        </div>
      </div>
    </section>
  );
}

function modeTitle(mode: StageThreeMode): string {
  const titles: Record<StageThreeMode, string> = {
    decision: "知识工程决策",
    quality: "数据质量评估",
    review: "AI 评审与阶段四交接",
    source: "数据源识别",
  };
  return titles[mode];
}

function KnowledgeDecisionEditor({
  canSave,
  completed,
  draft,
  isSaving,
  labInsights,
  latestStageTwoFeasibility,
  latestStageTwoSolution,
  locked,
  onChange,
  onSubmit,
  readiness,
}: {
  canSave: boolean;
  completed: boolean;
  draft: KnowledgeDecisionDraft;
  isSaving: boolean;
  labInsights: StageThreeLabDecisionInsight[];
  latestStageTwoFeasibility: Artifact | null;
  latestStageTwoSolution: Artifact | null;
  locked: boolean;
  onChange: (patch: Partial<KnowledgeDecisionDraft>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readiness: LayerReadiness[];
}) {
  const stageTwoContent = latestStageTwoSolution?.content_json;
  const feasibilityContent = latestStageTwoFeasibility?.content_json;
  const stageTwoSources = arrayOrString(feasibilityContent?.data_sources).length > 0
    ? arrayOrString(feasibilityContent?.data_sources)
    : arrayOrString(stageTwoContent?.data_sources);
  const stageTwoRisks = [
    ...arrayOrString(feasibilityContent?.data_gaps),
    ...arrayOrString(feasibilityContent?.technical_risks),
    ...arrayOrString(stageTwoContent?.technical_risks),
    ...arrayOrString(stageTwoContent?.feasibility_risks),
  ];

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">项目知识工程决策</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            先看阶段二输入和实验迁移建议，再逐层做出本项目的知识工程选择。
          </p>
        </div>
        <StatusBadge
          label={
            locked
              ? "待解锁"
              : completed
                ? "已完成"
                : canSave
                  ? "可保存"
                  : "待补齐"
          }
          tone={completed ? "success" : locked ? "muted" : canSave ? "success" : "warning"}
        />
      </div>

      {latestStageTwoSolution ? (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
          <p className="text-xs font-extrabold text-emerald-700">承接阶段二的总体方案</p>
          <p className="mt-2 text-sm leading-6 text-emerald-900">
            {stringValue(stageTwoContent?.stage_three_starting_point) ||
              stringValue(stageTwoContent?.proposed_agent_capability) ||
              stringValue(stageTwoContent?.problem_summary) ||
              "阶段二方案文档已保存。"}
          </p>
          {stageTwoSources.length > 0 || stageTwoRisks.length > 0 ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {stageTwoSources.length > 0 ? (
                <MiniList items={stageTwoSources.slice(0, 3)} title="已识别数据来源" />
              ) : null}
              {stageTwoRisks.length > 0 ? (
                <MiniList items={stageTwoRisks.slice(0, 3)} title="需要回应的风险" />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4">
        <LabDecisionTransferPanel insights={labInsights} />
      </div>

      <form className="mt-5 grid gap-5" onSubmit={onSubmit}>
        <DecisionSection
          description="先判断知识目标、材料来源和数据质量，再决定是否适合进入知识库路径。"
          icon={<Database aria-hidden size={18} />}
          ready={readiness[0]?.ready ?? false}
          title="数据准备"
        >
          <DecisionField
            disabled={locked || completed}
            label="知识目标"
            onChange={(value) => onChange({ knowledgeGoal: value })}
            placeholder="说明知识系统要支持哪些问答、追溯或生成任务。"
            required
            rows={4}
            value={draft.knowledgeGoal}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <DecisionField
              disabled={locked || completed}
              label="所需知识类型"
              onChange={(value) => onChange({ requiredKnowledgeTypes: value })}
              placeholder="每行一种知识类型，例如质检字段说明、SOP、审厂清单。"
              required
              rows={5}
              value={draft.requiredKnowledgeTypes}
            />
            <DecisionField
              disabled={locked || completed}
              label="知识来源清单"
              onChange={(value) => onChange({ sourceInventory: value })}
              placeholder="每行一个材料来源，标注是否可用、是否需要清洗。"
              required
              rows={5}
              value={draft.sourceInventory}
            />
          </div>
          <DecisionField
            disabled={locked || completed}
            label="数据质量风险"
            onChange={(value) => onChange({ dataQualityRisks: value })}
            placeholder="每行一个风险，例如字段不统一、材料缺失、版本过期。"
            required
            rows={4}
            value={draft.dataQualityRisks}
          />
        </DecisionSection>

        <DecisionSection
          description="比较不同切分方式，写出面向 Dify 构建时可执行的分块选择。"
          icon={<SplitSquareHorizontal aria-hidden size={18} />}
          ready={readiness[1]?.ready ?? false}
          title="分块策略"
        >
          <div className="flex flex-wrap gap-2">
            {chunkingOptions.map((option) => (
              <span
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600"
                key={option}
              >
                {option}
              </span>
            ))}
          </div>
          <DecisionField
            disabled={locked || completed}
            label="本项目分块决策"
            onChange={(value) => onChange({ chunkingDecision: value })}
            placeholder="说明选择哪种切分方式、预估块大小、重叠范围，以及为什么适合当前材料。"
            required
            rows={5}
            value={draft.chunkingDecision}
          />
        </DecisionSection>

        <DecisionSection
          description="确认材料语言、语义表示方式和存储边界，为后续配置预留判断。"
          icon={<BrainCircuit aria-hidden size={18} />}
          ready={readiness[2]?.ready ?? false}
          title="向量化与存储"
        >
          <DecisionField
            disabled={locked || completed}
            label="向量化与存储判断"
            onChange={(value) => onChange({ embeddingStorageDecision: value })}
            placeholder="说明中文 / 中英混合材料判断、推荐向量模型方向、存储更新和权限边界。"
            required
            rows={5}
            value={draft.embeddingStorageDecision}
          />
        </DecisionSection>

        <DecisionSection
          description="选择提示词、知识库、工具或混合路径，并明确召回、重排序和 Top-K 判断。"
          icon={<GitBranch aria-hidden size={18} />}
          ready={readiness[3]?.ready ?? false}
          title="召回策略"
        >
          <StrategySelector
            disabled={locked || completed}
            onChange={(value) => onChange({ selectedStrategy: value })}
            value={draft.selectedStrategy}
          />
          <DecisionField
            disabled={locked || completed}
            label="召回策略决策"
            onChange={(value) => onChange({ retrievalDecision: value })}
            placeholder="说明向量召回、关键词召回、混合召回、重排序、Top-K 等选择。"
            required
            rows={5}
            value={draft.retrievalDecision}
          />
          <DecisionField
            disabled={locked || completed}
            label="策略选择依据"
            onChange={(value) => onChange({ strategyRationale: value })}
            placeholder="用阶段二方案和数据风险解释为什么这样组织知识。"
            required
            rows={4}
            value={draft.strategyRationale}
          />
        </DecisionSection>

        <DecisionSection
          description="用标准问题集和风险预判说明如何验证效果，并转化为阶段四执行建议。"
          icon={<Target aria-hidden size={18} />}
          ready={readiness[4]?.ready ?? false}
          title="效果评估"
        >
          <DecisionField
            disabled={locked || completed}
            label="效果评估计划"
            onChange={(value) => onChange({ evaluationPlan: value })}
            placeholder="说明标准问题集、命中率体验、三类失败诊断和复测方式。"
            required
            rows={5}
            value={draft.evaluationPlan}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <DecisionField
              disabled={locked || completed}
              label="维护计划"
              onChange={(value) => onChange({ maintenancePlan: value })}
              placeholder="说明数据更新频率、材料版本管理和负责人。"
              required
              rows={5}
              value={draft.maintenancePlan}
            />
            <DecisionField
              disabled={locked || completed}
              label="阶段四执行建议"
              onChange={(value) => onChange({ stage4BuildPlan: value })}
              placeholder="说明阶段四在 Dify 中如何按本决策构建和验证。"
              required
              rows={5}
              value={draft.stage4BuildPlan}
            />
          </div>
        </DecisionSection>

        <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-slate-500">
            {completed
              ? "阶段三已经完成，这份决策文档会作为阶段四构建依据。"
              : canSave
                ? "五层决策已具备最小内容，可以保存为知识工程决策文档。"
                : "补齐五层决策后再保存。"}
          </p>
          <button
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={locked || completed || isSaving || !canSave}
            type="submit"
          >
            <Save aria-hidden size={16} />
            {isSaving ? "保存中" : "保存决策文档"}
          </button>
        </div>
      </form>
    </section>
  );
}

function KnowledgeReviewPanel({
  canComplete,
  canReview,
  completed,
  isCompleting,
  isRequestingReview,
  latestDecisionArtifact,
  latestReviewArtifact,
  onCompleteStage,
  onRequestReview,
  submissionGate,
}: {
  canComplete: boolean;
  canReview: boolean;
  completed: boolean;
  isCompleting: boolean;
  isRequestingReview: boolean;
  latestDecisionArtifact: Artifact | null;
  latestReviewArtifact: Artifact | null;
  onCompleteStage: () => Promise<boolean>;
  onRequestReview: () => Promise<boolean>;
  submissionGate: SubmissionGate;
}) {
  const decision = latestDecisionArtifact?.content_json;
  const review = latestReviewArtifact?.content_json;
  const missingKnowledgeRisks = arrayOrString(review?.missing_knowledge_risks);
  const dataQualityWarnings = arrayOrString(review?.data_quality_warnings);
  const improvements = arrayOrString(review?.suggested_improvements);

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">决策文档与评审</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            保存文档后生成评审，检查决策完整性、风险回应和阶段四准备度。
          </p>
        </div>
        <StatusBadge
          label={latestReviewArtifact ? "已有评审" : latestDecisionArtifact ? "可评审" : "待保存"}
          tone={latestReviewArtifact ? "success" : latestDecisionArtifact ? "warning" : "muted"}
        />
      </div>

      <div className="mt-4 grid gap-3">
        {submissionGate.checks.map((check) => (
          <ReviewCheck
            description={check.description}
            key={check.key}
            label={check.label}
            ready={check.ready}
          />
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        {latestDecisionArtifact ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={knowledgeStrategyCopy(stringValue(decision?.selected_strategy))} tone="info" />
              <span className="text-xs font-bold text-slate-400">
                {formatDateTime(latestDecisionArtifact.created_at)}
              </span>
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-500">知识目标</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {stringValue(decision?.knowledge_goal) || "决策文档已保存。"}
              </p>
            </div>
            <MiniList items={arrayOrString(decision?.source_inventory).slice(0, 4)} title="知识来源" />
          </div>
        ) : (
          <EmptyState title="还没有知识工程决策文档">
            先完成五层决策并保存文档，再生成评审和确认阶段完成。
          </EmptyState>
        )}
      </div>

      <button
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canReview || isRequestingReview}
        onClick={() => void onRequestReview()}
        type="button"
      >
        <SearchCheck aria-hidden size={16} />
        {isRequestingReview ? "评审生成中" : "生成知识工程评审"}
      </button>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        {latestReviewArtifact ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="评审已生成" tone="success" />
              <span className="text-xs font-bold text-slate-400">
                {formatDateTime(latestReviewArtifact.created_at)}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ReviewMetric
                label="策略匹配度"
                value={strategyFitCopy(stringValue(review?.strategy_fit))}
              />
              <ReviewMetric
                label="阶段四准备度"
                value={stageFourReadinessCopy(stringValue(review?.stage_4_readiness))}
              />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-500">评审摘要</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {stringValue(review?.review_summary) || "评审已生成。"}
              </p>
            </div>
            {missingKnowledgeRisks.length > 0 ? (
              <ReviewList icon="warning" items={missingKnowledgeRisks} title="知识缺口风险" />
            ) : null}
            {dataQualityWarnings.length > 0 ? (
              <ReviewList icon="warning" items={dataQualityWarnings} title="数据质量警示" />
            ) : null}
            {improvements.length > 0 ? (
              <ReviewList icon="check" items={improvements} title="建议改进" />
            ) : null}
          </div>
        ) : (
          <EmptyState title="还没有知识工程评审">
            保存决策文档后生成评审，用它检查五层决策是否完整、是否回应阶段二风险。
          </EmptyState>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
        {completed
          ? "阶段三已经完成。阶段四可以按这份决策开展 Dify 构建和测试。"
          : submissionGate.canSubmit
            ? "决策文档和评审记录已就绪，可以确认阶段三完成并开启下一阶段。"
            : "补齐右侧门禁项后，才能确认阶段三完成。"}
      </div>

      <button
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canComplete || isCompleting}
        onClick={() => void onCompleteStage()}
        type="button"
      >
        <CheckCircle2 aria-hidden size={16} />
        {completed ? "阶段三已完成" : isCompleting ? "确认中" : "完成阶段三并解锁阶段四"}
      </button>
    </section>
  );
}

function LabDecisionTransferPanel({ insights }: { insights: StageThreeLabDecisionInsight[] }) {
  return (
    <section className="rounded-[18px] border border-emerald-100 bg-emerald-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold text-emerald-700">来自五层实验室的迁移建议</p>
          <h4 className="mt-1 text-base font-extrabold text-slate-950">先用实验结论约束项目选择</h4>
        </div>
        <StatusBadge label="教学实验迁移" tone="success" />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-5">
        {insights.map((insight, index) => (
          <article className="rounded-2xl border border-emerald-100 bg-white p-3" key={insight.layer}>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-xs font-extrabold text-emerald-700">
                {index + 1}
              </span>
              <h5 className="text-sm font-extrabold text-slate-900">{insight.layer}</h5>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">
              {sanitizeProductText(insight.decisionHint)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DecisionDocumentPreview({
  documentPreview,
  latestDecisionArtifact,
  riskForecast,
  submissionGate,
}: {
  documentPreview: DecisionDocumentPreviewModel;
  latestDecisionArtifact: Artifact | null;
  riskForecast: RiskForecastItem[];
  submissionGate: SubmissionGate;
}) {
  return (
    <div className="grid gap-5">
      <section className="rounded-[18px] border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-950">决策文档预览</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              按正式交付口径整理知识目标、来源、策略、风险、评估和阶段四交接。
            </p>
          </div>
          <StatusBadge
            label={latestDecisionArtifact ? documentPreview.strategyLabel : "待保存"}
            tone={latestDecisionArtifact ? "success" : "warning"}
          />
        </div>

        {latestDecisionArtifact ? (
          <div className="mt-5 grid gap-4">
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-emerald-200">
                  {documentPreview.title}
                </p>
                <span className="text-xs font-bold text-slate-400">
                  {formatDateTime(latestDecisionArtifact.created_at)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-200">
                {documentPreview.sections.find((section) => section.title === "知识目标")?.body ??
                  "已保存知识工程决策。"}
              </p>
            </div>
            {documentPreview.sections
              .filter((section) => section.title !== "知识目标")
              .map((section) => (
                <DocumentSection key={section.title} title={section.title} value={section.body} />
              ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState title="还没有可预览的决策文档">
              先回到项目知识工程决策入口，保存五层决策后再进行风险预判和评审。
            </EmptyState>
          </div>
        )}
      </section>

      <RiskForecastMatrix latestDecisionArtifact={latestDecisionArtifact} risks={riskForecast} />
      <SubmissionGateSummary submissionGate={submissionGate} />
    </div>
  );
}

function RiskForecastMatrix({
  latestDecisionArtifact,
  risks,
}: {
  latestDecisionArtifact: Artifact | null;
  risks: RiskForecastItem[];
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">风险预判矩阵</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            从决策文档和 AI 评审中抽取阶段四前需要持续盯住的风险。
          </p>
        </div>
        <StatusBadge label={latestDecisionArtifact ? "已生成" : "待决策"} tone={latestDecisionArtifact ? "success" : "warning"} />
      </div>

      {latestDecisionArtifact ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {risks.map((risk) => (
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={risk.category}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-extrabold text-slate-900">{risk.category}</h4>
                <StatusBadge label={riskLevelCopy(risk.level)} tone={riskLevelTone(risk.level)} />
              </div>
              <p className="mt-3 text-xs font-extrabold text-slate-500">风险依据</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                {sanitizeProductText(risk.evidence)}
              </p>
              <p className="mt-3 text-xs font-extrabold text-slate-500">阶段四应对</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                {sanitizeProductText(risk.mitigation)}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState title="还没有风险矩阵">
            保存项目知识工程决策后，系统会按数据质量、知识覆盖、召回、评估和阶段四执行生成风险矩阵。
          </EmptyState>
        </div>
      )}
    </section>
  );
}

function SubmissionGateSummary({ submissionGate }: { submissionGate: SubmissionGate }) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">提交前检查</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            这些检查决定当前文档是否能作为阶段四构建依据。
          </p>
        </div>
        <StatusBadge label={submissionGate.canSubmit ? "可提交" : "待补齐"} tone={submissionGate.canSubmit ? "success" : "warning"} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {submissionGate.checks.map((check) => (
          <ReviewCheck
            description={check.description}
            key={check.key}
            label={check.label}
            ready={check.ready}
          />
        ))}
      </div>
    </section>
  );
}

function DocumentSection({ title, value }: { title: string; value: string }) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <p className="text-xs font-extrabold text-slate-500">{title}</p>
      <p className="mt-2 whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
        {sanitizeProductText(value)}
      </p>
    </div>
  );
}

function DecisionSection({
  children,
  description,
  icon,
  ready,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  ready: boolean;
  title: string;
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            {icon}
          </span>
          <div>
            <h4 className="text-base font-extrabold text-slate-950">{title}</h4>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </div>
        </div>
        <StatusBadge label={ready ? "已具备" : "待补充"} tone={ready ? "success" : "warning"} />
      </div>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

function DecisionField({
  disabled,
  label,
  onChange,
  placeholder,
  required = false,
  rows = 3,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  rows?: number;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-extrabold text-slate-800">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <textarea
        className="min-h-20 resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 transition placeholder:text-slate-400 focus:border-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </label>
  );
}

function StrategySelector({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: StageThreeKnowledgeStrategy) => void;
  value: StageThreeKnowledgeStrategy;
}) {
  return (
    <div>
      <p className="text-sm font-extrabold text-slate-800">知识策略选择</p>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        {strategyOptions.map((option) => {
          const active = option.value === value;
          return (
            <button
              className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-100 hover:bg-emerald-50"
              }`}
              disabled={disabled}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              <span className="flex items-center gap-2 text-sm font-extrabold">
                <Boxes aria-hidden size={16} />
                {option.label}
              </span>
              <span className="mt-2 block text-xs leading-5 text-slate-500">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LayerCard({
  icon,
  label,
  ready,
  value,
}: {
  icon: ReactNode;
  label: string;
  ready: boolean;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <div className="flex items-center gap-2 text-emerald-200">
        {icon}
        <p className="text-xs font-extrabold">{label}</p>
      </div>
      <p className="mt-2 text-sm font-extrabold text-white">{ready ? "已具备" : "待补充"}</p>
      <p className="mt-1 text-xs leading-5 text-slate-300">{value}</p>
    </div>
  );
}

function ReviewCheck({
  description,
  label,
  ready,
}: {
  description?: string;
  label: string;
  ready: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
      <span
        className={`grid h-8 w-8 place-items-center rounded-full ${
          ready ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
        }`}
      >
        <CheckCircle2 aria-hidden size={16} />
      </span>
      <span>
        <span className="block text-sm font-bold text-slate-700">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
        ) : null}
      </span>
    </div>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-xs font-extrabold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold leading-6 text-slate-800">
        {sanitizeProductText(value)}
      </p>
    </div>
  );
}

function ReviewList({
  icon,
  items,
  title,
}: {
  icon: "check" | "warning";
  items: string[];
  title: string;
}) {
  const Icon = icon === "warning" ? AlertTriangle : CheckCircle2;

  return (
    <div>
      <p className="text-xs font-extrabold text-slate-500">{title}</p>
      <ul className="mt-2 grid gap-2">
        {items.slice(0, 5).map((item) => (
          <li className="flex gap-2 text-sm leading-6 text-slate-700" key={item}>
            <Icon
              aria-hidden
              className={icon === "warning" ? "mt-1 shrink-0 text-amber-500" : "mt-1 shrink-0 text-emerald-600"}
              size={15}
            />
            <span>{sanitizeProductText(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniList({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-xs font-extrabold text-slate-500">{title}</p>
      <ul className="mt-2 grid gap-1">
        {items.map((item) => (
          <li className="flex gap-2 text-xs leading-5 text-slate-600" key={item}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{sanitizeProductText(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function latestArtifactOfType(artifacts: Artifact[], artifactType: string): Artifact | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === artifactType)
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null
  );
}

function compareArtifactsByCreatedAt(left: Artifact, right: Artifact): number {
  return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
}

function layerIcon(index: number): ReactNode {
  const icons = [
    <Database aria-hidden size={18} key="data" />,
    <SplitSquareHorizontal aria-hidden size={18} key="chunk" />,
    <BrainCircuit aria-hidden size={18} key="vector" />,
    <GitBranch aria-hidden size={18} key="retrieval" />,
    <FileCheck2 aria-hidden size={18} key="eval" />,
  ];
  return icons[index] ?? <Target aria-hidden size={18} />;
}

function knowledgeStrategyCopy(value: string): string {
  const map: Record<string, string> = {
    hybrid: "混合策略",
    prompt_only: "提示词优先",
    rag: "知识库问答",
    tool_calling: "工具调用优先",
  };
  return map[value] ?? "知识策略";
}

function strategyFitCopy(value: string): string {
  if (value.endsWith("_strategy_needs_stage_four_validation")) {
    return "策略方向可用，需在阶段四验证实际效果";
  }
  return value ? sanitizeProductText(value) : "待人工复核";
}

function stageFourReadinessCopy(value: string): string {
  const map: Record<string, string> = {
    ready_for_stage_4_build: "可进入阶段四构建",
    ready_with_data_quality_risks: "可进入阶段四，但需持续处理数据质量风险",
  };
  return map[value] ?? (value ? sanitizeProductText(value) : "待人工复核");
}

function riskLevelCopy(level: RiskForecastItem["level"]): string {
  const map: Record<RiskForecastItem["level"], string> = {
    high: "高风险",
    low: "低风险",
    medium: "中风险",
  };
  return map[level];
}

function riskLevelTone(level: RiskForecastItem["level"]): Tone {
  const map: Record<RiskForecastItem["level"], Tone> = {
    high: "danger",
    low: "success",
    medium: "warning",
  };
  return map[level];
}
