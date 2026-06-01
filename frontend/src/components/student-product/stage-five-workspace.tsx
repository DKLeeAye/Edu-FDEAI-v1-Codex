"use client";

import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  LinkIcon,
  PackageCheck,
  Save,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  Artifact,
  LearningProfile,
  StageFiveAcceptancePackagePayload,
  StageFiveDeliveryDocumentPayload,
  StageFiveOperationsGuidePayload,
} from "@/src/lib/api";

import {
  createStageFiveAcceptancePackagePayloadFromVNext,
  createStageFiveAcceptanceQuestions,
  createStageFiveDeliveryPreviewSections,
  createStageFiveDeliveryDocumentPayloadFromVNext,
  createStageFiveDemoScriptCopyText,
  createStageFiveOperationsGuidePayloadFromVNext,
  decisionLabel,
  deliveryPackageLabel,
  canSaveStageFiveChapter,
  isStageFiveAcceptanceDecisionArchivable,
  isStageFiveAcceptanceReady,
  isStageFiveDocumentReady,
  scoreStageFiveChapter,
  signoffCheckLabel,
  stageFiveAcceptanceStateFromArtifacts,
  stageFiveAcceptanceTargetFromArtifacts,
  stageFiveDocumentSnapshotFromArtifacts,
  stageFiveAcceptancePackageType,
  stageFiveAcceptanceAgendaItems,
  stageFiveAcceptanceBlockedToast,
  stageFiveAcceptanceNavigationItems,
  stageFiveAcceptanceReadinessGates,
  stageFiveAcceptanceSavedToast,
  stageFiveAiReviewType,
  stageFiveChapterKeys,
  stageFiveChapterSpecs,
  stageFiveDemoScriptCopyFallbackToast,
  stageFiveDemoScriptCopyToast,
  stageFiveDemoScriptSteps,
  stageFiveDeliveryChapterModels,
  stageFiveDeliveryContextCards,
  stageFiveDeliveryDocumentType,
  stageFiveDeliveryPackageItems,
  stageFiveDeliveryPackageKeys,
  stageFiveOperationsGuideType,
  stageFiveSignoffOptions,
  stageFiveSignoffCheckKeys,
  type StageFiveDeliveryChapterModel,
  type StageFiveDeliveryPreviewSection,
  type StageFiveAcceptanceDecision,
  type StageFiveAcceptanceState,
  type StageFiveChapterDrafts,
  type StageFiveChapterKey,
  type StageFiveChapterScore,
  type StageFiveChapterStatuses,
  type StageFiveMode,
} from "./stage-five-flow";
import {
  formatDateTime,
  profilePercent,
  sanitizeProductText,
  stageDefinitions,
  stageStatusCopy,
  type StageKey,
} from "./terminology";
import { EmptyState, StatusBadge } from "./ui";

type ArtifactsByStage = Record<StageKey, Artifact[]>;

type StageFiveWorkspaceProps = {
  allStageArtifacts: ArtifactsByStage;
  artifacts: Artifact[];
  isCompletingStage: boolean;
  isRefreshing: boolean;
  isRequestingReview: boolean;
  isSavingAcceptancePackage: boolean;
  isSavingDeliveryDocument: boolean;
  isSavingOperationsGuide: boolean;
  learningProfile: LearningProfile | null;
  onCompleteStage: () => Promise<boolean>;
  onModeChange: (mode: StageFiveMode) => void;
  onRefresh: () => void;
  onRequestReview: () => Promise<boolean>;
  onSaveAcceptancePackage: (payload: StageFiveAcceptancePackagePayload) => Promise<boolean>;
  onSaveDeliveryDocument: (payload: StageFiveDeliveryDocumentPayload) => Promise<boolean>;
  onSaveOperationsGuide: (payload: StageFiveOperationsGuidePayload) => Promise<boolean>;
  sessionStatus?: string;
  stageStatus?: string;
  workspaceMode: StageFiveMode;
};

function stageFivePageClass(mode: StageFiveMode) {
  return mode === "document"
    ? "solution-workbench-page delivery-doc-page"
    : "agent-guide-page delivery-page";
}

export function StageFiveWorkspace({
  allStageArtifacts,
  artifacts,
  isCompletingStage,
  isRefreshing,
  isRequestingReview,
  isSavingAcceptancePackage,
  isSavingDeliveryDocument,
  isSavingOperationsGuide,
  learningProfile,
  onCompleteStage,
  onModeChange,
  onRequestReview,
  onSaveAcceptancePackage,
  onSaveDeliveryDocument,
  onSaveOperationsGuide,
  sessionStatus,
  stageStatus,
  workspaceMode,
}: StageFiveWorkspaceProps) {
  const status = stageStatusCopy(stageStatus);
  const locked = stageStatus === "locked";
  const completed = stageStatus === "completed";
  const projectCompleted = sessionStatus === "completed";

  const latestDeliveryArtifact = useMemo(
    () => latestArtifactOfType(artifacts, stageFiveDeliveryDocumentType),
    [artifacts],
  );
  const latestAcceptanceArtifact = useMemo(
    () => latestArtifactOfType(artifacts, stageFiveAcceptancePackageType),
    [artifacts],
  );
  const latestOperationsArtifact = useMemo(
    () => latestArtifactOfType(artifacts, stageFiveOperationsGuideType),
    [artifacts],
  );
  const latestReviewArtifact = useMemo(
    () => latestArtifactOfType(artifacts, stageFiveAiReviewType),
    [artifacts],
  );
  const latestStageFourImplementation = useMemo(
    () => latestArtifactOfType(allStageArtifacts.stage_4, "stage_4_dify_implementation"),
    [allStageArtifacts.stage_4],
  );
  const latestStageFourTestReport = useMemo(
    () => latestArtifactOfType(allStageArtifacts.stage_4, "stage_4_test_report"),
    [allStageArtifacts.stage_4],
  );
  const latestStageFourReview = useMemo(
    () => latestArtifactOfType(allStageArtifacts.stage_4, "stage_4_ai_test_review"),
    [allStageArtifacts.stage_4],
  );
  const latestStageThreeDecision = useMemo(
    () => latestArtifactOfType(allStageArtifacts.stage_3, "stage_3_knowledge_decision"),
    [allStageArtifacts.stage_3],
  );
  const documentSnapshot = useMemo(
    () =>
      stageFiveDocumentSnapshotFromArtifacts({
        deliveryDocument: latestDeliveryArtifact?.content_json,
        operationsGuide: latestOperationsArtifact?.content_json,
        stageFourImplementation: latestStageFourImplementation?.content_json,
        stageFourTestReport: latestStageFourTestReport?.content_json,
        stageThreeDecision: latestStageThreeDecision?.content_json,
      }),
    [
      latestDeliveryArtifact,
      latestOperationsArtifact,
      latestStageFourImplementation,
      latestStageFourTestReport,
      latestStageThreeDecision,
    ],
  );

  const [chapterDrafts, setChapterDrafts] = useState<StageFiveChapterDrafts>(() => documentSnapshot.drafts);
  const [chapterStatuses, setChapterStatuses] = useState<StageFiveChapterStatuses>(() => documentSnapshot.statuses);
  const [chapterScores, setChapterScores] = useState<
    Partial<Record<StageFiveChapterKey, StageFiveChapterScore>>
  >({});
  const [activeChapter, setActiveChapter] = useState<StageFiveChapterKey>("goal");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [evaluationChapter, setEvaluationChapter] = useState<StageFiveChapterKey | null>(null);
  const questions = useMemo(() => createStageFiveAcceptanceQuestions(), []);
  const [acceptanceState, setAcceptanceState] = useState<StageFiveAcceptanceState>(() =>
    acceptanceStateFromArtifacts({
      acceptanceArtifact: latestAcceptanceArtifact,
      deliveryArtifact: latestDeliveryArtifact,
      operationsArtifact: latestOperationsArtifact,
      stageFourImplementation: latestStageFourImplementation,
      stageFourTestReport: latestStageFourTestReport,
    }),
  );

  const effectiveAcceptanceState: StageFiveAcceptanceState = {
    ...acceptanceState,
    hasDeliveryDocument: acceptanceState.hasDeliveryDocument || latestDeliveryArtifact !== null,
    hasOperationsGuide: acceptanceState.hasOperationsGuide || latestOperationsArtifact !== null,
    reviewDone: acceptanceState.reviewDone || latestAcceptanceArtifact !== null,
  };
  const documentReady = isStageFiveDocumentReady(chapterStatuses);
  const acceptanceReady = isStageFiveAcceptanceReady(effectiveAcceptanceState);
  const canReview =
    latestDeliveryArtifact !== null &&
    latestAcceptanceArtifact !== null &&
    latestOperationsArtifact !== null &&
    latestReviewArtifact === null &&
    !locked &&
    !completed;
  const canComplete =
    latestDeliveryArtifact !== null &&
    latestAcceptanceArtifact !== null &&
    latestOperationsArtifact !== null &&
    latestReviewArtifact !== null &&
    !locked &&
    !completed;

  function switchMode(mode: StageFiveMode) {
    onModeChange(mode);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
    });
  }

  function updateChapter<TChapter extends StageFiveChapterKey>(
    chapter: TChapter,
    patch: Partial<StageFiveChapterDrafts[TChapter]>,
  ) {
    setChapterDrafts((current) => ({
      ...current,
      [chapter]: {
        ...current[chapter],
        ...patch,
      },
    }));
    setChapterStatuses((current) => ({ ...current, [chapter]: "unchecked" }));
  }

  function handleCheckChapter(chapter: StageFiveChapterKey) {
    const result = scoreStageFiveChapter(chapter, chapterText(chapterDrafts, chapter));
    setChapterScores((current) => ({ ...current, [chapter]: result }));
    setChapterStatuses((current) => ({ ...current, [chapter]: result.status }));
    setEvaluationChapter(chapter);
  }

  function handleSaveChapter(chapter: StageFiveChapterKey) {
    const result = chapterScores[chapter] ?? scoreStageFiveChapter(chapter, chapterText(chapterDrafts, chapter));
    setChapterScores((current) => ({ ...current, [chapter]: result }));
    if (!canSaveStageFiveChapter(result.status)) {
      setChapterStatuses((current) => ({ ...current, [chapter]: result.status }));
      setEvaluationChapter(chapter);
      return;
    }
    setChapterStatuses((current) => ({
      ...current,
      [chapter]: "pass",
    }));
    setActiveChapter(nextChapterKey(chapter));
  }

  function handleConfirmEvaluationSave() {
    if (evaluationChapter === null) {
      return;
    }
    const result =
      chapterScores[evaluationChapter] ??
      scoreStageFiveChapter(evaluationChapter, chapterText(chapterDrafts, evaluationChapter));
    setChapterScores((current) => ({ ...current, [evaluationChapter]: result }));
    if (!canSaveStageFiveChapter(result.status)) {
      setChapterStatuses((current) => ({ ...current, [evaluationChapter]: result.status }));
      return;
    }
    setChapterStatuses((current) => ({ ...current, [evaluationChapter]: "pass" }));
    setActiveChapter(nextChapterKey(evaluationChapter));
    setEvaluationChapter(null);
  }

  function handleMarkEvaluationRevise() {
    if (evaluationChapter === null) {
      return;
    }
    setChapterStatuses((current) => ({ ...current, [evaluationChapter]: "revise" }));
    setEvaluationChapter(null);
  }

  async function handleSubmitDocument() {
    if (!documentReady || locked || completed || isSavingDeliveryDocument || isSavingOperationsGuide) {
      return;
    }
    const deliverySuccess = await onSaveDeliveryDocument(
      createStageFiveDeliveryDocumentPayloadFromVNext({
        chapters: chapterDrafts,
        stageFourImplementation: latestStageFourImplementation?.content_json,
      }) as StageFiveDeliveryDocumentPayload,
    );
    if (!deliverySuccess) {
      return;
    }
    const operationsSuccess = await onSaveOperationsGuide(
      createStageFiveOperationsGuidePayloadFromVNext({
        chapters: chapterDrafts,
        stageFourImplementation: latestStageFourImplementation?.content_json,
        stageFourTestReport: latestStageFourTestReport?.content_json,
      }) as StageFiveOperationsGuidePayload,
    );
    if (operationsSuccess) {
      setAcceptanceState((current) => ({
        ...current,
        hasDeliveryDocument: true,
        hasOperationsGuide: true,
      }));
      switchMode("acceptance");
    }
  }

  function handleLoadStageFourTarget() {
    setAcceptanceState((current) => ({
      ...current,
      target: acceptanceTargetFromArtifacts({
        deliveryArtifact: latestDeliveryArtifact,
        stageFourImplementation: latestStageFourImplementation,
        stageFourTestReport: latestStageFourTestReport,
      }),
    }));
  }

  async function handleSaveAcceptance() {
    if (!acceptanceReady || locked || completed || isSavingAcceptancePackage) {
      return false;
    }
    return onSaveAcceptancePackage(
      createStageFiveAcceptancePackagePayloadFromVNext({
        acceptanceState: effectiveAcceptanceState,
        questions,
        stageFourTestReport: latestStageFourTestReport?.content_json,
      }) as StageFiveAcceptancePackagePayload,
    );
  }

  if (locked) {
    return (
      <div className={stageFivePageClass(workspaceMode)}>
        <StageFiveHeader
          isRefreshing={isRefreshing}
          canSubmitDocument={false}
          isSavingDocument={false}
          mode={workspaceMode}
          onPreviewDocument={() => setPreviewOpen(true)}
          onSubmitDocument={handleSubmitDocument}
          onSwitchMode={switchMode}
          statusLabel={status.label}
        />
        <main className={workspaceMode === "document" ? "solution-workbench-shell" : "agent-guide-shell delivery-shell"}>
          <EmptyState title="阶段五尚未解锁">
            完成阶段四 Dify 应用构建、平台测试评分和 AI 测试反馈后，交付验收工作区会自动开启。
          </EmptyState>
        </main>
      </div>
    );
  }

  return (
    <div className={stageFivePageClass(workspaceMode)}>
      <StageFiveHeader
        isRefreshing={isRefreshing}
        canSubmitDocument={documentReady && !locked && !completed}
        isSavingDocument={isSavingDeliveryDocument || isSavingOperationsGuide}
        mode={workspaceMode}
        onPreviewDocument={() => setPreviewOpen(true)}
        onSubmitDocument={handleSubmitDocument}
        onSwitchMode={switchMode}
        statusLabel={projectCompleted ? "项目已完成" : status.label}
      />

      {workspaceMode === "document" ? (
        <DocumentWorkspace
          activeChapter={activeChapter}
          chapterDrafts={chapterDrafts}
          chapterScores={chapterScores}
          chapterStatuses={chapterStatuses}
          completed={completed}
          documentReady={documentReady}
          isSaving={isSavingDeliveryDocument || isSavingOperationsGuide}
          latestDeliveryArtifact={latestDeliveryArtifact}
          latestOperationsArtifact={latestOperationsArtifact}
          locked={locked}
          onActiveChapterChange={setActiveChapter}
          onChange={updateChapter}
          onCheckChapter={handleCheckChapter}
          onCloseEvaluation={() => setEvaluationChapter(null)}
          onClosePreview={() => setPreviewOpen(false)}
          onConfirmEvaluationSave={handleConfirmEvaluationSave}
          onSaveChapter={handleSaveChapter}
          onMarkEvaluationRevise={handleMarkEvaluationRevise}
          previewOpen={previewOpen}
          evaluationChapter={evaluationChapter}
          onSubmitDocument={handleSubmitDocument}
          onSwitchAcceptance={() => switchMode("acceptance")}
        />
      ) : (
        <AcceptanceWorkspace
          acceptanceReady={acceptanceReady}
          acceptanceState={effectiveAcceptanceState}
          canComplete={canComplete}
          canReview={canReview}
          completed={completed}
          isCompleting={isCompletingStage}
          isRequestingReview={isRequestingReview}
          isSavingAcceptance={isSavingAcceptancePackage}
          latestAcceptanceArtifact={latestAcceptanceArtifact}
          latestDeliveryArtifact={latestDeliveryArtifact}
          latestOperationsArtifact={latestOperationsArtifact}
          latestReviewArtifact={latestReviewArtifact}
          onCompleteStage={onCompleteStage}
          onLoadStageFourTarget={handleLoadStageFourTarget}
          onRequestReview={onRequestReview}
          onRunAcceptance={() =>
            setAcceptanceState((current) => ({ ...current, reviewDone: true }))
          }
          onSaveAcceptance={handleSaveAcceptance}
          onStateChange={(patch) =>
            setAcceptanceState((current) => ({ ...current, ...patch }))
          }
          onSwitchDocument={() => switchMode("document")}
          projectCompleted={projectCompleted}
          questions={questions}
        />
      )}
    </div>
  );
}

function StageFiveHeader({
  canSubmitDocument,
  isRefreshing,
  isSavingDocument,
  mode,
  onPreviewDocument,
  onSubmitDocument,
  onSwitchMode,
  statusLabel,
}: {
  canSubmitDocument: boolean;
  isRefreshing: boolean;
  isSavingDocument: boolean;
  mode: StageFiveMode;
  onPreviewDocument: () => void;
  onSubmitDocument: () => void;
  onSwitchMode: (mode: StageFiveMode) => void;
  statusLabel: string;
}) {
  if (mode === "document") {
    return (
      <header className="solution-workbench-header">
        <button className="solution-workbench-brand" onClick={() => onSwitchMode("document")} type="button">
          <span>FDE</span>
          <strong>交付文档工作台</strong>
        </button>
        <nav aria-label="阶段五导航" className="solution-workbench-nav">
          <button type="button">阶段四评分</button>
          <button className="active" onClick={() => onSwitchMode("document")} type="button">
            交付文档
          </button>
          <button onClick={() => onSwitchMode("acceptance")} type="button">
            验收确认
          </button>
        </nav>
        <div className="solution-workbench-actions">
          <button disabled={isRefreshing} onClick={onPreviewDocument} type="button">
            预览文档
          </button>
          <button
            className="primary"
            disabled={!canSubmitDocument || isSavingDocument}
            onClick={onSubmitDocument}
            type="button"
          >
            {isSavingDocument ? "提交中" : "提交文档"}
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="agent-guide-topbar">
      <button className="agent-guide-brand" onClick={() => onSwitchMode("document")} type="button">
        <span>FDE</span>
        <strong>交付验收工作台</strong>
      </button>
      <nav aria-label="阶段导航" className="agent-guide-nav">
        {stageFiveAcceptanceNavigationItems.map((item) => (
          <button
            className={item === "验收确认" ? "active" : undefined}
            key={item}
            onClick={item === "交付文档" ? () => onSwitchMode("document") : undefined}
            type="button"
          >
            {item}
          </button>
        ))}
      </nav>
      <div className="agent-guide-status">
        <span>Stage 05</span>
        <strong>交付验收 · {statusLabel}</strong>
      </div>
    </header>
  );
}

function DocumentWorkspace({
  activeChapter,
  chapterDrafts,
  chapterScores,
  chapterStatuses,
  completed,
  documentReady,
  evaluationChapter,
  isSaving,
  latestDeliveryArtifact,
  latestOperationsArtifact,
  locked,
  onActiveChapterChange,
  onChange,
  onCheckChapter,
  onCloseEvaluation,
  onClosePreview,
  onConfirmEvaluationSave,
  onMarkEvaluationRevise,
  onSaveChapter,
  onSubmitDocument,
  onSwitchAcceptance,
  previewOpen,
}: {
  activeChapter: StageFiveChapterKey;
  chapterDrafts: StageFiveChapterDrafts;
  chapterScores: Partial<Record<StageFiveChapterKey, StageFiveChapterScore>>;
  chapterStatuses: StageFiveChapterStatuses;
  completed: boolean;
  documentReady: boolean;
  evaluationChapter: StageFiveChapterKey | null;
  isSaving: boolean;
  latestDeliveryArtifact: Artifact | null;
  latestOperationsArtifact: Artifact | null;
  locked: boolean;
  onActiveChapterChange: (chapter: StageFiveChapterKey) => void;
  onChange: <TChapter extends StageFiveChapterKey>(
    chapter: TChapter,
    patch: Partial<StageFiveChapterDrafts[TChapter]>,
  ) => void;
  onCheckChapter: (chapter: StageFiveChapterKey) => void;
  onCloseEvaluation: () => void;
  onClosePreview: () => void;
  onConfirmEvaluationSave: () => void;
  onMarkEvaluationRevise: () => void;
  onSaveChapter: (chapter: StageFiveChapterKey) => void;
  onSubmitDocument: () => void;
  onSwitchAcceptance: () => void;
  previewOpen: boolean;
}) {
  const savedCount = stageFiveChapterKeys.filter((key) => chapterStatuses[key] === "pass").length;
  const submitted = latestDeliveryArtifact !== null && latestOperationsArtifact !== null;
  const disabled = locked || completed;
  const previewSections = useMemo(
    () => createStageFiveDeliveryPreviewSections(chapterDrafts),
    [chapterDrafts],
  );
  const evaluationScore = evaluationChapter ? chapterScores[evaluationChapter] : undefined;
  const previewPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!previewOpen) {
      return;
    }
    window.requestAnimationFrame(() => {
      previewPanelRef.current?.scrollTo({ top: 0 });
    });
  }, [previewOpen, previewSections]);

  function handleFieldChange(chapter: StageFiveChapterKey, draftKey: string, value: string) {
    updateStageFiveChapterField(onChange, chapter, draftKey, value);
  }

  return (
    <>
      <aside className="doc-nav-rail" aria-label="交付文档章节目录">
        <button className="doc-pin" type="button" aria-label="固定章节目录">
          <span />
        </button>
        <div className="doc-rail-dots" aria-hidden="true">
          {stageFiveDeliveryChapterModels.map((chapter) => (
            <i key={chapter.key} />
          ))}
        </div>
        <div className="doc-nav-panel">
          <div className="doc-nav-title">
            <span>Stage 05</span>
            <strong>交付文档</strong>
          </div>
          {stageFiveDeliveryChapterModels.map((chapter) => (
            <a
              className={activeChapter === chapter.key ? "active" : undefined}
              data-eval-status={chapterStatuses[chapter.key]}
              href={`#${chapter.id}`}
              key={chapter.key}
              onClick={() => onActiveChapterChange(chapter.key)}
            >
              <span>{chapter.number}</span>
              <strong>{deliveryNavTitle(chapter.key)}</strong>
              <em>{chapterStatusCopy(chapterStatuses[chapter.key])}</em>
            </a>
          ))}
        </div>
      </aside>

      <main className="solution-workbench-shell">
        <section className="solution-workbench-hero" aria-labelledby="delivery-doc-title">
          <div>
            <p className="workbench-kicker">Stage 05 / Delivery Document Workspace</p>
            <h1 id="delivery-doc-title">把项目结果写成交付说明文档。</h1>
            <p>
              本工作台训练学生把技术实现、测试评分、知识库边界和客户使用方式，整理成一份客户、教师和评审都能读懂的正式交付说明文档。
            </p>
          </div>
          <aside className="solution-workbench-status" aria-label="交付文档状态">
            <span>文档完成度</span>
            <strong>{savedCount}/6 章已保存</strong>
            <div className="workbench-progress">
              <i style={{ width: `${Math.round((savedCount / 6) * 100)}%` }} />
            </div>
            <p>6 个章节通过 AI 评审并保存后，可生成完整交付文档并进入验收确认。</p>
          </aside>
        </section>

        <section className="workbench-context-strip" aria-label="交付文档输入证据">
          {stageFiveDeliveryContextCards.map((card) => (
            <ContextStrip copy={card.body} key={card.label} label={card.label} title={card.title} />
          ))}
        </section>

        <div className="solution-document">
          {stageFiveDeliveryChapterModels.map((chapter) => (
            <DeliveryDocumentChapter
              chapter={chapter}
              chapterDrafts={chapterDrafts}
              disabled={disabled}
              isActive={activeChapter === chapter.key}
              key={chapter.key}
              onCheckChapter={onCheckChapter}
              onFieldChange={handleFieldChange}
              onSaveChapter={onSaveChapter}
              score={chapterScores[chapter.key]}
              status={chapterStatuses[chapter.key]}
            />
          ))}
        </div>

        <section
          className="report-preview"
          aria-hidden={!previewOpen}
          aria-labelledby="preview-title"
          aria-modal="true"
          role="dialog"
        >
          <div className="report-preview-panel" ref={previewPanelRef}>
            <button
              aria-label="关闭预览"
              className="preview-close"
              onClick={onClosePreview}
              type="button"
            >
              ×
            </button>
            <span>阶段五文档提交</span>
            <h2 id="preview-title">制造业质检追溯 AI 助手交付说明文档</h2>
            <div className="preview-body">
              {previewSections.map((section) => (
                <PreviewSection key={section.number} section={section} />
              ))}
            </div>
            <div className="preview-actions">
              <button onClick={onClosePreview} type="button">
                继续编辑
              </button>
              <button disabled={!documentReady || disabled || isSaving} onClick={onSubmitDocument} type="button">
                {isSaving ? "提交中" : "确认文档并进入验收"}
              </button>
              <button disabled={!submitted} onClick={onSwitchAcceptance} type="button">
                进入验收确认
              </button>
            </div>
          </div>
        </section>
      </main>

      <EvaluationDrawer
        onClose={onCloseEvaluation}
        onConfirmSave={onConfirmEvaluationSave}
        onMarkRevise={onMarkEvaluationRevise}
        result={evaluationScore}
      />
    </>
  );
}

function PreviewSection({ section }: { section: StageFiveDeliveryPreviewSection }) {
  return (
    <section>
      <h3>
        {section.number} / {section.title}
      </h3>
      <dl>
        {section.fields.map((field) => (
          <div key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function EvaluationDrawer({
  onClose,
  onConfirmSave,
  onMarkRevise,
  result,
}: {
  onClose: () => void;
  onConfirmSave: () => void;
  onMarkRevise: () => void;
  result?: StageFiveChapterScore;
}) {
  const visible = result !== undefined;
  return (
    <aside
      aria-hidden={!visible}
      aria-labelledby="eval-title"
      className="ai-eval-drawer"
      data-result={result?.status}
    >
      <div className="ai-eval-panel">
        <button aria-label="关闭评估结果" className="eval-close" onClick={onClose} type="button">
          ×
        </button>
        <div className="eval-overview">
          <span>AI Delivery Review</span>
          <h2 id="eval-title">章节评审结果</h2>
          <div className="eval-scoreline">
            <strong>{result?.score ?? "--"}</strong>
            <p>{result ? evaluationVerdict(result.status) : "等待检查"}</p>
          </div>
        </div>
        <div className="eval-dimensions">
          {(result?.dimensions ?? []).map((item) => (
            <article className={item.pass ? "pass" : "fail"} key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.pass ? "通过" : "需补充"}</span>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
        <section className="eval-section">
          <h3>必须处理的问题</h3>
          <ul>
            {(result?.issues ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="eval-section">
          <h3>修改建议</h3>
          <ul>
            {(result?.suggestions ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <div className="eval-actions">
          <button onClick={onClose} type="button">
            按建议继续编辑
          </button>
          <button onClick={onMarkRevise} type="button">
            标记为待完善
          </button>
          <button
            className="primary"
            disabled={!result || !canSaveStageFiveChapter(result.status)}
            onClick={onConfirmSave}
            type="button"
          >
            确认合格并保存
          </button>
        </div>
        <p className="eval-policy">80 分以上可保存为合格章节；60-79 分可标记待完善；60 分以下必须重新编辑。</p>
      </div>
    </aside>
  );
}

function DeliveryDocumentChapter({
  chapter,
  chapterDrafts,
  disabled,
  onCheckChapter,
  onFieldChange,
  onSaveChapter,
  score,
  status,
}: {
  chapter: StageFiveDeliveryChapterModel;
  chapterDrafts: StageFiveChapterDrafts;
  disabled: boolean;
  isActive: boolean;
  onCheckChapter: (chapter: StageFiveChapterKey) => void;
  onFieldChange: (chapter: StageFiveChapterKey, draftKey: string, value: string) => void;
  onSaveChapter: (chapter: StageFiveChapterKey) => void;
  score?: StageFiveChapterScore;
  status: StageFiveChapterStatuses[StageFiveChapterKey];
}) {
  return (
    <section
      className={`report-chapter ${status === "pass" ? "saved" : ""}`.trim()}
      data-eval-status={status}
      data-chapter={chapter.title}
      id={chapter.id}
    >
      <header className="chapter-head">
        <span>{chapter.number}</span>
        <div>
          <p className="workbench-kicker">{chapter.kicker}</p>
          <h2>{chapter.title}</h2>
        </div>
        <small className={`chapter-eval-badge status-${status}`}>
          {score ? `${score.score} 分 · ${chapterStatusCopy(status)}` : chapterStatusCopy(status)}
        </small>
        <button disabled={disabled} onClick={() => onSaveChapter(chapter.key)} type="button">
          保存本章
        </button>
      </header>

      <div className="chapter-stack">
        <article className="method-block">
          <div>
            <div className="block-label">写作教学</div>
            <h3>{chapter.methodTitle}</h3>
            <p>{chapter.methodBody}</p>
          </div>
          <div className={chapter.methodGrid.variant === "feasibility" ? "feasibility-meter" : `method-grid ${chapter.methodGrid.variant === "five" ? "five" : ""}`.trim()}>
            {chapter.methodGrid.items.map((item) => (
              <span className={item.tone} key={item.label}>
                {item.label}
              </span>
            ))}
          </div>
        </article>

        <DeliveryEvidenceShelf evidence={chapter.evidence} />

        <article className="writing-zone">
          <div className="writing-zone-head">
            <div>
              <div className="block-label">学生撰写区</div>
              <h3>{chapter.writingTitle}</h3>
            </div>
            <button disabled={disabled} onClick={() => onCheckChapter(chapter.key)} type="button">
              AI 检查本章
            </button>
          </div>
          <div className={chapter.writingFields.length > 2 ? "writing-grid" : undefined}>
            {chapter.writingFields.map((field) => (
              <label key={field.draftKey}>
                <span>{field.label}</span>
                <textarea
                  disabled={disabled}
                  onChange={(event) => onFieldChange(chapter.key, field.draftKey, event.target.value)}
                  rows={field.rows}
                  value={stageFiveChapterDraftValue(chapterDrafts, chapter.key, field.draftKey)}
                />
              </label>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function DeliveryEvidenceShelf({ evidence }: { evidence: StageFiveDeliveryChapterModel["evidence"] }) {
  if (evidence.variant === "rows") {
    return (
      <article className="evidence-shelf">
        <div className="block-label">事实依据</div>
        {evidence.items.map((item) => (
          <div className="evidence-row" key={item.label}>
            <span>{item.label}</span>
            <p>{item.body}</p>
          </div>
        ))}
      </article>
    );
  }

  if (evidence.variant === "boundary-list") {
    return (
      <article className="evidence-shelf">
        <div className="block-label">事实依据</div>
        <div className="boundary-list">
          {evidence.items.map((item) => {
            const [label, body] = item.split("：");
            return (
              <p key={item}>
                <strong>{label}：</strong>
                {body}
              </p>
            );
          })}
        </div>
      </article>
    );
  }

  const className = evidence.variant === "grid" ? "evidence-grid" : evidence.variant;
  return (
    <article className="evidence-shelf">
      <div className="block-label">事实依据</div>
      <div className={className}>
        {evidence.items.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <p>{item.body}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function updateStageFiveChapterField(
  onChange: <TChapter extends StageFiveChapterKey>(
    chapter: TChapter,
    patch: Partial<StageFiveChapterDrafts[TChapter]>,
  ) => void,
  chapter: StageFiveChapterKey,
  draftKey: string,
  value: string,
) {
  switch (chapter) {
    case "boundary":
      onChange("boundary", { [draftKey]: value } as Partial<StageFiveChapterDrafts["boundary"]>);
      break;
    case "goal":
      onChange("goal", { [draftKey]: value } as Partial<StageFiveChapterDrafts["goal"]>);
      break;
    case "maintenance":
      onChange("maintenance", { [draftKey]: value } as Partial<StageFiveChapterDrafts["maintenance"]>);
      break;
    case "scope":
      onChange("scope", { [draftKey]: value } as Partial<StageFiveChapterDrafts["scope"]>);
      break;
    case "test":
      onChange("test", { [draftKey]: value } as Partial<StageFiveChapterDrafts["test"]>);
      break;
    case "usage":
      onChange("usage", { [draftKey]: value } as Partial<StageFiveChapterDrafts["usage"]>);
      break;
  }
}

function stageFiveChapterDraftValue(
  drafts: StageFiveChapterDrafts,
  chapter: StageFiveChapterKey,
  draftKey: string,
) {
  return (drafts[chapter] as Record<string, string>)[draftKey] ?? "";
}

function deliveryNavTitle(chapter: StageFiveChapterKey) {
  const map: Record<StageFiveChapterKey, string> = {
    boundary: "支持与边界",
    goal: "交付目标",
    maintenance: "维护更新",
    scope: "资料范围",
    test: "测试与验收",
    usage: "使用说明",
  };
  return map[chapter];
}

function ChapterEditor({
  activeChapter,
  completed,
  draft,
  locked,
  onChange,
}: {
  activeChapter: StageFiveChapterKey;
  completed: boolean;
  draft: StageFiveChapterDrafts;
  locked: boolean;
  onChange: <TChapter extends StageFiveChapterKey>(
    chapter: TChapter,
    patch: Partial<StageFiveChapterDrafts[TChapter]>,
  ) => void;
}) {
  const spec = stageFiveChapterSpecs.find((item) => item.key === activeChapter) ?? stageFiveChapterSpecs[0];
  const disabled = locked || completed;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.16em] text-emerald-600">
            {spec.kicker}
          </p>
          <h3 className="mt-2 text-xl font-extrabold text-slate-950">{spec.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{spec.description}</p>
        </div>
        <StatusBadge label={spec.number} tone="info" />
      </div>

      <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
        <p className="text-xs font-extrabold text-emerald-700">写作教学</p>
        <p className="mt-2 text-sm leading-7 text-emerald-950">{chapterTeachingCopy(activeChapter)}</p>
      </div>

      <div className="mt-5 grid gap-4">
        {activeChapter === "goal" ? (
          <>
            <StageTextArea
              disabled={disabled}
              label="交付目标"
              onChange={(value) => onChange("goal", { purpose: value })}
              rows={5}
              value={draft.goal.purpose}
            />
            <StageTextArea
              disabled={disabled}
              label="适用场景"
              onChange={(value) => onChange("goal", { scenario: value })}
              rows={5}
              value={draft.goal.scenario}
            />
          </>
        ) : null}
        {activeChapter === "usage" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <StageTextArea
              disabled={disabled}
              label="推荐提问方式"
              onChange={(value) => onChange("usage", { questions: value })}
              rows={5}
              value={draft.usage.questions}
            />
            <StageTextArea
              disabled={disabled}
              label="回答阅读方式"
              onChange={(value) => onChange("usage", { answer: value })}
              rows={5}
              value={draft.usage.answer}
            />
            <StageTextArea
              disabled={disabled}
              label="异常处理方式"
              onChange={(value) => onChange("usage", { exception: value })}
              rows={5}
              value={draft.usage.exception}
            />
            <StageTextArea
              disabled={disabled}
              label="访问与权限说明"
              onChange={(value) => onChange("usage", { access: value })}
              rows={5}
              value={draft.usage.access}
            />
          </div>
        ) : null}
        {activeChapter === "scope" ? (
          <>
            <StageTextArea
              disabled={disabled}
              label="已纳入资料范围"
              onChange={(value) => onChange("scope", { included: value })}
              rows={6}
              value={draft.scope.included}
            />
            <StageTextArea
              disabled={disabled}
              label="未纳入或需谨慎使用的资料"
              onChange={(value) => onChange("scope", { excluded: value })}
              rows={6}
              value={draft.scope.excluded}
            />
          </>
        ) : null}
        {activeChapter === "boundary" ? (
          <>
            <StageTextArea
              disabled={disabled}
              label="支持的问题类型"
              onChange={(value) => onChange("boundary", { supported: value })}
              rows={5}
              value={draft.boundary.supported}
            />
            <StageTextArea
              disabled={disabled}
              label="不支持与转人工场景"
              onChange={(value) => onChange("boundary", { unsupported: value })}
              rows={5}
              value={draft.boundary.unsupported}
            />
          </>
        ) : null}
        {activeChapter === "test" ? (
          <>
            <StageTextArea
              disabled={disabled}
              label="测试结果摘要"
              onChange={(value) => onChange("test", { summary: value })}
              rows={6}
              value={draft.test.summary}
            />
            <StageTextArea
              disabled={disabled}
              label="验收结论"
              onChange={(value) => onChange("test", { conclusion: value })}
              rows={5}
              value={draft.test.conclusion}
            />
          </>
        ) : null}
        {activeChapter === "maintenance" ? (
          <>
            <StageTextArea
              disabled={disabled}
              label="维护责任与更新触发"
              onChange={(value) => onChange("maintenance", { owner: value })}
              rows={6}
              value={draft.maintenance.owner}
            />
            <StageTextArea
              disabled={disabled}
              label="问题反馈与后续计划"
              onChange={(value) => onChange("maintenance", { feedback: value })}
              rows={5}
              value={draft.maintenance.feedback}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function AcceptanceWorkspace({
  acceptanceReady,
  acceptanceState,
  canComplete,
  canReview,
  completed,
  isCompleting,
  isRequestingReview,
  isSavingAcceptance,
  latestAcceptanceArtifact,
  latestDeliveryArtifact,
  latestOperationsArtifact,
  latestReviewArtifact,
  onCompleteStage,
  onLoadStageFourTarget,
  onRequestReview,
  onRunAcceptance,
  onSaveAcceptance,
  onStateChange,
  onSwitchDocument,
  projectCompleted,
  questions,
}: {
  acceptanceReady: boolean;
  acceptanceState: StageFiveAcceptanceState;
  canComplete: boolean;
  canReview: boolean;
  completed: boolean;
  isCompleting: boolean;
  isRequestingReview: boolean;
  isSavingAcceptance: boolean;
  latestAcceptanceArtifact: Artifact | null;
  latestDeliveryArtifact: Artifact | null;
  latestOperationsArtifact: Artifact | null;
  latestReviewArtifact: Artifact | null;
  onCompleteStage: () => Promise<boolean>;
  onLoadStageFourTarget: () => void;
  onRequestReview: () => Promise<boolean>;
  onRunAcceptance: () => void;
  onSaveAcceptance: () => Promise<boolean>;
  onStateChange: (patch: Partial<StageFiveAcceptanceState>) => void;
  onSwitchDocument: () => void;
  projectCompleted: boolean;
  questions: ReturnType<typeof createStageFiveAcceptanceQuestions>;
}) {
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const readinessState = {
    docs: acceptanceState.hasDeliveryDocument && acceptanceState.hasOperationsGuide,
    package: packageReady(acceptanceState),
    review: acceptanceState.reviewDone,
    signoff: signoffReady(acceptanceState),
    target: targetReady(acceptanceState),
  };
  const readinessItems = stageFiveAcceptanceReadinessGates.map((gate) => ({
    ...gate,
    ready: readinessState[gate.key],
  }));
  const readyPercent = readinessItems.filter((item) => item.ready).length * 20;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showDeliveryToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2400);
  }

  async function handleCopyScript() {
    try {
      await navigator.clipboard.writeText(createStageFiveDemoScriptCopyText());
      showDeliveryToast(stageFiveDemoScriptCopyToast);
    } catch {
      showDeliveryToast(stageFiveDemoScriptCopyFallbackToast);
    }
  }

  async function handleSaveAcceptanceClick() {
    if (!acceptanceReady) {
      showDeliveryToast(stageFiveAcceptanceBlockedToast);
      return;
    }
    const saved = await onSaveAcceptance();
    if (saved) {
      showDeliveryToast(stageFiveAcceptanceSavedToast);
    }
  }

  return (
    <>
    <main className="agent-guide-shell delivery-shell">
      <section className="agent-guide-hero delivery-hero" aria-labelledby="delivery-title">
        <div>
          <p className="agent-kicker">Delivery Acceptance</p>
          <h1 id="delivery-title">完成客户验收确认，形成最终交付证据。</h1>
          <p>
            本页不再撰写交付说明文档，而是把文档、应用链接、测试评分、演示脚本和客户追问整理成一次可归档的验收记录。
          </p>
        </div>
        <aside className="agent-guide-brief" aria-label="阶段五产物">
          <span>本页产物</span>
          <strong>交付材料核对 + 模拟验收记录 + 最终验收结论</strong>
          <p>保存后进入项目档案袋，作为 FDE 项目交付证据链的最后一环。</p>
        </aside>
      </section>

      <div className="delivery-workbench">
      <section className="delivery-main" aria-label="交付验收主工作区">
        <section className="agent-guide-section delivery-object-card" aria-labelledby="delivery-object-title">
          <div className="agent-section-head split">
            <div>
              <p className="agent-kicker">Handoff Target</p>
              <h2 id="delivery-object-title">
                交付对象：{acceptanceState.target.appName || "制造业质检追溯 AI 助手"}。
              </h2>
              <p>这里从阶段四测试记录中拉取智能体链接和评分结果，学生需要补齐客户可阅读的使用、限制与维护说明。</p>
            </div>
            <button
              className="dify-secondary-action"
              onClick={onLoadStageFourTarget}
              type="button"
            >
              拉取阶段四记录
            </button>
          </div>
          <div className="delivery-object-grid" aria-label="交付对象信息">
            <DeliveryObjectInput
              label="Dify 应用名称"
              onChange={(value) =>
                onStateChange({ target: { ...acceptanceState.target, appName: value } })
              }
              value={acceptanceState.target.appName}
            />
            <DeliveryObjectInput
              label="知识库名称"
              onChange={(value) =>
                onStateChange({ target: { ...acceptanceState.target, knowledgeName: value } })
              }
              value={acceptanceState.target.knowledgeName}
            />
            <DeliveryObjectInput
              className="wide"
              label="已发布应用链接"
              onChange={(value) =>
                onStateChange({ target: { ...acceptanceState.target, publishUrl: value } })
              }
              value={acceptanceState.target.publishUrl}
            />
            <div className="delivery-score-mini">
              <span>阶段四测试评分</span>
              <strong>
                {typeof acceptanceState.target.stageFourScore === "number"
                  ? `${acceptanceState.target.stageFourScore} 分`
                  : "未拉取"}
              </strong>
              <p>拉取平台自动化测试记录后，用于判断是否具备验收基础。</p>
            </div>
          </div>
        </section>

        <section className="agent-guide-section delivery-agenda-section" aria-labelledby="agenda-title">
          <div className="agent-section-head split">
            <div>
              <p className="agent-kicker">Acceptance Agenda</p>
              <h2 id="agenda-title">验收确认不是展示页面，而是按议程核对交付证据。</h2>
              <p>学生需要按客户可接收的顺序完成演示：先说明交付对象，再展示测试证据，最后确认限制、维护和下一版本边界。</p>
            </div>
          </div>
          <div className="delivery-agenda-list" aria-label="验收议程">
            {stageFiveAcceptanceAgendaItems.map((item) => (
              <article key={item.number}>
                <span>{item.number}</span>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="agent-guide-section delivery-package-section" aria-labelledby="package-title">
          <div className="agent-section-head split">
            <div>
              <p className="agent-kicker">Delivery Package</p>
              <h2 id="package-title">交付包不是“一个链接”，而是一组可验收材料。</h2>
              <p>每一项都要能回答客户的交付问题：怎么用、能解决什么、不能解决什么、谁维护、出问题后怎么处理。</p>
            </div>
            <span className="delivery-state">
              {stageFiveDeliveryPackageKeys.filter((key) => acceptanceState.packageChecks[key]).length} / {stageFiveDeliveryPackageKeys.length}
            </span>
          </div>
          <div className="delivery-check-grid" aria-label="交付包清单">
            {stageFiveDeliveryPackageItems.map((item) => (
              <DeliveryPackageCheck
                checked={acceptanceState.packageChecks[item.key]}
                item={item}
                key={item.key}
                onChange={(checked) =>
                  onStateChange({
                    packageChecks: { ...acceptanceState.packageChecks, [item.key]: checked },
                  })
                }
              />
            ))}
          </div>
        </section>

        <section className="agent-guide-section delivery-doc-section" aria-labelledby="docs-title">
          <div className="agent-section-head split">
            <div>
              <p className="agent-kicker">Delivery Document</p>
              <h2 id="docs-title">先确认交付说明文档，再进入客户验收。</h2>
              <p>本页不再重复撰写说明文档，只检查上一页是否已经完成章节评审与文档提交。验收环节关注客户能否接收、演示、追问和归档。</p>
            </div>
            <button
              className="dify-secondary-action"
              onClick={onSwitchDocument}
              type="button"
            >
              返回文档工作台
            </button>
          </div>
          <div className={`delivery-doc-summary ${acceptanceState.hasDeliveryDocument && acceptanceState.hasOperationsGuide ? "ready" : ""}`.trim()}>
            <article>
              <span>文档状态</span>
              <strong>
                {acceptanceState.hasDeliveryDocument && acceptanceState.hasOperationsGuide
                  ? "交付说明文档已提交"
                  : "未检测到已提交文档"}
              </strong>
              <p>
                {latestDeliveryArtifact
                  ? stringValue(latestDeliveryArtifact.content_json.project_name) || "已完成交付说明文档章节评审，可继续发起模拟客户验收。"
                  : "请先完成交付说明文档 6 个章节的 AI 评审并提交，再回到本页发起模拟验收。"}
              </p>
            </article>
            <article>
              <span>验收用途</span>
              <strong>客户追问依据</strong>
              <p>模拟验收将围绕使用说明、知识库资料范围、支持边界、测试结论和维护责任发起追问。</p>
            </article>
          </div>
        </section>

        <section className="agent-guide-section delivery-acceptance-section" aria-labelledby="acceptance-title">
          <div className="agent-section-head split">
            <div>
              <p className="agent-kicker">Acceptance Review</p>
              <h2 id="acceptance-title">模拟客户验收会：客户关心的是能否真实接收。</h2>
              <p>平台会围绕使用价值、证据引用、限制说明和维护责任生成验收追问。学生需要给出可交付表达，而不是只展示功能。</p>
            </div>
            <button
              className="agent-next-link"
              onClick={onRunAcceptance}
              type="button"
            >
              发起模拟验收
            </button>
          </div>
          <div className="delivery-review-board" aria-label="模拟验收记录">
            {acceptanceState.reviewDone ? (
              questions.map((item) => (
                <article className="delivery-review-item" key={item.label}>
                  <span>{item.label}</span>
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </article>
              ))
            ) : (
              <article className="delivery-empty">
                <strong>尚未发起模拟验收</strong>
                <p>整理交付包与说明后，点击“发起模拟验收”。客户追问会在这里生成，并进入阶段五档案记录。</p>
              </article>
            )}
          </div>
        </section>

        <section className="agent-guide-section delivery-signoff-section" aria-labelledby="signoff-title">
          <div className="agent-section-head split">
            <div>
              <p className="agent-kicker">Final Decision</p>
              <h2 id="signoff-title">填写验收结论，明确是否可进入项目档案袋。</h2>
              <p>验收结论必须引用交付说明文档、平台测试结果和模拟客户追问，不能只写“已完成”。</p>
            </div>
          </div>
          <div className="delivery-signoff-grid">
            <fieldset className="delivery-signoff-options">
              <legend>验收结论</legend>
              {stageFiveSignoffOptions.map((option) => (
                <DeliveryDecisionOption
                  checked={acceptanceState.decision === option.decision}
                  key={option.decision}
                  onChange={() => onStateChange({ decision: option.decision })}
                  option={option}
                />
              ))}
            </fieldset>
            <label className="delivery-signoff-note">
              <span>验收结论说明</span>
              <textarea
                disabled={completed}
                onChange={(event) => onStateChange({ signoffNote: event.target.value })}
                rows={7}
                value={acceptanceState.signoffNote}
              />
            </label>
          </div>
          <div className="delivery-signoff-checks" aria-label="验收归档确认">
            {stageFiveSignoffCheckKeys.map((key) => (
              <label key={key}>
                <input
                checked={acceptanceState.archiveChecks[key]}
                  onChange={(event) =>
                  onStateChange({
                      archiveChecks: { ...acceptanceState.archiveChecks, [key]: event.target.checked },
                  })
                }
                  type="checkbox"
                />
                <span>{signoffCheckLabel(key)}</span>
              </label>
            ))}
          </div>
        </section>
      </section>

      <aside className="delivery-side">
        <section className="agent-side-card delivery-readiness-card">
          <p className="agent-kicker">Readiness</p>
          <h2>交付准备度</h2>
          <div className="delivery-readiness-ring" style={{ "--ready": readyPercent } as CSSProperties}>
            <strong>{readyPercent}%</strong>
            <span>完成度</span>
          </div>
          <ul className="dify-gate-list">
            {readinessItems.map((item) => (
              <li className={item.ready ? "done" : undefined} key={item.key}>
                {item.label}
              </li>
            ))}
          </ul>
        </section>

        <section className="agent-side-card delivery-script-card">
          <p className="agent-kicker">Demo Script</p>
          <h2>客户演示脚本</h2>
          <ol>
            {stageFiveDemoScriptSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <button className="dify-secondary-action" onClick={() => void handleCopyScript()} type="button">
            复制演示脚本
          </button>
        </section>

        <section className="agent-side-card build-sync-card">
          <p className="agent-kicker">Final Gate</p>
          <h2>阶段五完成门禁</h2>
          <p>交付包、说明文档和模拟验收都完成后，才能保存为最终档案袋证据。</p>
          <button
            className={`agent-next-link dify-save-action ${!acceptanceReady || completed || isSavingAcceptance ? "disabled" : ""}`.trim()}
            aria-disabled={!acceptanceReady || completed || isSavingAcceptance}
            disabled={completed || isSavingAcceptance}
            onClick={() => void handleSaveAcceptanceClick()}
            type="button"
          >
            {latestAcceptanceArtifact ? "验收记录已保存" : isSavingAcceptance ? "保存中" : "保存交付验收记录"}
          </button>
          <button
            className={`agent-next-link ${!canReview || isRequestingReview ? "disabled" : ""}`.trim()}
            disabled={!canReview || isRequestingReview}
            onClick={() => void onRequestReview()}
            type="button"
          >
            {isRequestingReview ? "审阅生成中" : "生成交付审阅"}
          </button>
          <button
            className={`agent-next-link ${!canComplete || isCompleting || completed ? "disabled" : ""}`.trim()}
            disabled={!canComplete || isCompleting || completed}
            onClick={() => void onCompleteStage()}
            type="button"
          >
            {projectCompleted ? "项目已完成" : isCompleting ? "确认中" : "完成阶段五并提交项目"}
          </button>
          {latestReviewArtifact ? (
            <DeliveryReview artifact={latestReviewArtifact} />
          ) : (
            <p>保存验收记录后生成交付审阅，检查完整性、验收风险和维护风险。</p>
          )}
        </section>
      </aside>
      </div>
    </main>
      <div
        className={`toast ${toastVisible ? "show" : ""}`.trim()}
        data-delivery-toast
        role="status"
        aria-live="polite"
      >
        {toastMessage}
      </div>
    </>
  );
}

function DeliveryReview({ artifact }: { artifact: Artifact }) {
  const content = artifact.content_json;
  const acceptanceRisks = arrayOrString(content.acceptance_risks);
  const operationsRisks = arrayOrString(content.operations_risks);
  const suggestions = arrayOrString(content.improvement_suggestions);

  return (
    <div className="mt-3 grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label="审阅已生成" tone="success" />
        <span className="text-xs font-bold text-slate-400">{formatDateTime(artifact.created_at)}</span>
      </div>
      <ReviewMetric
        label="最终准备度"
        value={finalReadinessCopy(stringValue(content.final_readiness))}
      />
      <p className="text-sm leading-6 text-slate-600">
        {reviewSummaryCopy(content.review_summary)}
      </p>
      {acceptanceRisks.length > 0 ? (
        <ReviewList icon={<AlertTriangle aria-hidden size={15} />} items={acceptanceRisks} title="验收风险" />
      ) : null}
      {operationsRisks.length > 0 ? (
        <ReviewList icon={<AlertTriangle aria-hidden size={15} />} items={operationsRisks} title="维护风险" />
      ) : null}
      {suggestions.length > 0 ? (
        <ReviewList icon={<CheckCircle2 aria-hidden size={15} />} items={suggestions} title="建议改进" />
      ) : null}
    </div>
  );
}

function StageTextArea({
  disabled,
  label,
  onChange,
  rows,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-extrabold text-slate-800">{label}</span>
      <textarea
        className="min-h-24 resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 transition placeholder:text-slate-400 focus:border-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
    </label>
  );
}

function StageInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-extrabold text-slate-800">{label}</span>
      <input
        className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 transition focus:border-emerald-300"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function DeliveryObjectInput({
  className,
  label,
  onChange,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className={className}>
      <span>{label}</span>
      <input onChange={(event) => onChange(event.target.value)} type="text" value={value} />
    </label>
  );
}

function DeliveryPackageCheck({
  checked,
  item,
  onChange,
}: {
  checked: boolean;
  item: (typeof stageFiveDeliveryPackageItems)[number];
  onChange: (checked: boolean) => void;
}) {
  return (
    <label>
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>
        <strong>{item.label}</strong>
        <em>{item.body}</em>
      </span>
    </label>
  );
}

function DeliveryDecisionOption({
  checked,
  onChange,
  option,
}: {
  checked: boolean;
  onChange: () => void;
  option: (typeof stageFiveSignoffOptions)[number];
}) {
  return (
    <label>
      <input
        checked={checked}
        name="acceptanceDecision"
        onChange={onChange}
        type="radio"
      />
      <span>
        <strong>{option.title}</strong>
        <em>{option.body}</em>
      </span>
    </label>
  );
}

function ContextStrip({ copy, label, title }: { copy: string; label: string; title: string }) {
  return (
    <article className="rounded-[18px] border border-slate-200 bg-white p-4">
      <p className="text-xs font-extrabold uppercase tracking-[.16em] text-emerald-600">{label}</p>
      <h3 className="mt-2 text-base font-extrabold text-slate-950">{sanitizeProductText(title)}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
    </article>
  );
}

function ReadinessCheck({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3">
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
          ready ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
        }`}
      >
        <CheckCircle2 aria-hidden size={15} />
      </span>
      <span className="text-sm font-bold leading-5 text-slate-700">{label}</span>
    </div>
  );
}

function CheckToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-16 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-emerald-200 hover:bg-emerald-50">
      <input
        checked={checked}
        className="mt-1 h-4 w-4 accent-emerald-600"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="text-sm font-bold leading-6 text-slate-700">{label}</span>
    </label>
  );
}

function DocSummaryCard({ ready, title, value }: { ready: boolean; title: string; value: string }) {
  return (
    <article className={`rounded-2xl p-4 ${ready ? "bg-emerald-50" : "bg-slate-50"}`}>
      <p className={`text-xs font-extrabold ${ready ? "text-emerald-700" : "text-slate-500"}`}>
        {title}
      </p>
      <p className={`mt-2 text-sm font-bold leading-6 ${ready ? "text-emerald-950" : "text-slate-600"}`}>
        {sanitizeProductText(value)}
      </p>
    </article>
  );
}

function DecisionOption({
  checked,
  decision,
  onChange,
}: {
  checked: boolean;
  decision: Exclude<StageFiveAcceptanceDecision, "">;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
        checked ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-200"
      }`}
    >
      <input
        checked={checked}
        className="mt-1 h-4 w-4 accent-emerald-600"
        name="acceptanceDecision"
        onChange={onChange}
        type="radio"
      />
      <span>
        <strong className="block text-sm font-extrabold text-slate-900">
          {decisionLabel(decision)}
        </strong>
        <em className="mt-1 block text-xs not-italic leading-5 text-slate-500">
          {decisionDescription(decision)}
        </em>
      </span>
    </label>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-extrabold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold leading-6 text-slate-800">
        {sanitizeProductText(value)}
      </p>
    </div>
  );
}

function ReviewList({ icon, items, title }: { icon: ReactNode; items: string[]; title: string }) {
  return (
    <div>
      <p className="text-xs font-extrabold text-slate-500">{title}</p>
      <ul className="mt-2 grid gap-2">
        {items.slice(0, 4).map((item) => (
          <li className="flex gap-2 text-sm leading-6 text-slate-700" key={item}>
            <span className="mt-1 shrink-0 text-amber-500">{icon}</span>
            <span>{sanitizeProductText(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function acceptanceStateFromArtifacts({
  acceptanceArtifact,
  deliveryArtifact,
  operationsArtifact,
  stageFourImplementation,
  stageFourTestReport,
}: {
  acceptanceArtifact: Artifact | null;
  deliveryArtifact: Artifact | null;
  operationsArtifact: Artifact | null;
  stageFourImplementation: Artifact | null;
  stageFourTestReport: Artifact | null;
}): StageFiveAcceptanceState {
  return stageFiveAcceptanceStateFromArtifacts({
    acceptancePackage: acceptanceArtifact?.content_json,
    deliveryDocument: deliveryArtifact?.content_json,
    operationsGuide: operationsArtifact?.content_json,
    stageFourImplementation: stageFourImplementation?.content_json,
    stageFourTestReport: stageFourTestReport?.content_json,
  });
}

function acceptanceTargetFromArtifacts({
  deliveryArtifact,
  stageFourImplementation,
  stageFourTestReport,
}: {
  deliveryArtifact: Artifact | null;
  stageFourImplementation: Artifact | null;
  stageFourTestReport: Artifact | null;
}) {
  return stageFiveAcceptanceTargetFromArtifacts({
    deliveryDocument: deliveryArtifact?.content_json,
    stageFourImplementation: stageFourImplementation?.content_json,
    stageFourTestReport: stageFourTestReport?.content_json,
  });
}

function nextChapterKey(chapter: StageFiveChapterKey): StageFiveChapterKey {
  const index = stageFiveChapterKeys.indexOf(chapter);
  return stageFiveChapterKeys[Math.min(index + 1, stageFiveChapterKeys.length - 1)];
}

function chapterText(drafts: StageFiveChapterDrafts, chapter: StageFiveChapterKey): string {
  const value = drafts[chapter];
  return Object.values(value).join("\n");
}

function targetReady(state: StageFiveAcceptanceState): boolean {
  return Boolean(
    state.target.appName.trim() &&
      state.target.knowledgeName.trim() &&
      /^https?:\/\//.test(state.target.publishUrl.trim()),
  );
}

function packageReady(state: StageFiveAcceptanceState): boolean {
  return stageFiveDeliveryPackageKeys.every((key) => state.packageChecks[key]);
}

function signoffReady(state: StageFiveAcceptanceState): boolean {
  return (
    isStageFiveAcceptanceDecisionArchivable(state.decision) &&
    state.signoffNote.trim().length >= 36 &&
    stageFiveSignoffCheckKeys.every((key) => state.archiveChecks[key])
  );
}

function chapterStatusCopy(status: string): string {
  const map: Record<string, string> = {
    pass: "合格",
    revise: "待完善",
    rewrite: "需重写",
    unchecked: "未检",
  };
  return map[status] ?? "未检";
}

function evaluationVerdict(status: StageFiveChapterScore["status"]): string {
  if (status === "pass") {
    return "合格，可保存本章";
  }
  if (status === "revise") {
    return "建议修改后再确认保存";
  }
  return "必须重新编辑后再检查";
}

function chapterTeachingCopy(chapter: StageFiveChapterKey): string {
  const map: Record<StageFiveChapterKey, string> = {
    boundary: "交付说明必须明确哪些问题能答，哪些问题必须提示资料不足或转人工，避免客户把追溯助手当成判责系统。",
    goal: "交付文档开头要说明客户拿到的是什么，而不是复述课程过程。写清项目背景、交付对象、适用角色和业务任务。",
    maintenance: "交付不是结束，还要说明谁维护资料、何时重测、怎么处理版本变化和客户反馈。",
    scope: "资料范围要写清用了什么、没用什么，以及为什么某些资料不能直接支持确定性回答。",
    test: "验收结论必须基于测试证据，不能只写运行正常；失败项应转成客户可理解的限制和后续计划。",
    usage: "使用说明要让客户知道怎么提问、怎么看引用、怎么处理资料不足，而不只是点击链接使用。",
  };
  return map[chapter];
}

function navButtonClass(active: boolean): string {
  return `inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
    active
      ? "bg-white text-slate-950"
      : "border border-white/15 bg-white/10 text-white hover:bg-white/15"
  }`;
}

function decisionDescription(decision: Exclude<StageFiveAcceptanceDecision, "">): string {
  const map: Record<Exclude<StageFiveAcceptanceDecision, "">, string> = {
    conditional: "可归档，但需要记录后续整改项或维护安排。",
    pass: "交付材料完整，已说明使用边界，可进入档案袋。",
    revise: "交付说明、测试结果或边界说明仍不足，需要回到前序页面修订。",
  };
  return map[decision];
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

function compareArtifactsByCreatedAt(a: Artifact, b: Artifact): number {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function finalReadinessCopy(value: string): string {
  const map: Record<string, string> = {
    conditional_acceptance: "有条件接收",
    not_ready: "暂不接收",
    ready_for_handover: "可交付验收",
  };
  return map[value] ?? (value || "已生成");
}

function reviewSummaryCopy(value: unknown): string {
  const text = stringValue(value);
  return text || "交付审阅已生成，请结合验收风险、维护风险和建议改进进行最终确认。";
}

function arrayOrString(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  const text = stringValue(value);
  return text
    ? text
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
