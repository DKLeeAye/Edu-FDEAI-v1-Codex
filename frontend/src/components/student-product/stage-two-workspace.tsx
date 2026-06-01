"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  HelpCircle,
  MessageSquareText,
  RefreshCw,
  Save,
  SearchCheck,
  Send,
} from "lucide-react";
import type { ReactNode } from "react";
import { Fragment, useMemo, useState } from "react";

import type {
  Artifact,
  StageTwoDocumentKey,
  StageTwoSectionDraftPayload,
  StageTwoSectionKey,
} from "@/src/lib/api";

import {
  createStageTwoProgressItems,
  createStageTwoSectionBackfillFromFormalDocuments,
  createStageTwoVNextChapterProgress,
  getStageTwoSectionDocumentType,
  getStageTwoVNextChapterSpec,
  isStageTwoGuideReady,
  latestStageTwoDocumentArtifact,
  latestStageTwoDocumentReview,
  latestStageTwoSectionDraft,
  latestStageTwoSectionReview,
  latestStageTwoSectionSubmission,
  stageTwoCanCompleteWithFormalDocs,
  stageTwoCanComposeDocument,
  stageTwoDocumentLabels,
  stageTwoSectionSpecs,
  summarizeStageTwoYellowFlags,
  type StageTwoGuideChecks,
  type StageTwoMode,
  type StageTwoSectionSpec,
  type StageTwoVNextChapterKey,
  type StageTwoVNextChapterProgress,
  type StageTwoVNextChapterSpec,
} from "./stage-two-flow";
import { formatDateTime, sanitizeProductText, stageStatusCopy } from "./terminology";
import { EmptyState, StatusBadge } from "./ui";

type StageTwoWorkspaceProps = {
  artifacts: Artifact[];
  isCompletingStage: boolean;
  isRefreshing: boolean;
  isRequestingReview: boolean;
  isSavingSolution: boolean;
  onCompleteStage: () => Promise<boolean>;
  onComposeDocument: (documentType: StageTwoDocumentKey) => Promise<boolean>;
  onModeChange: (mode: StageTwoMode) => void;
  onRefresh: () => void;
  onRequestReview: (documentType: StageTwoDocumentKey) => Promise<boolean>;
  onRequestSectionReview: (
    documentType: StageTwoDocumentKey,
    sectionKey: StageTwoSectionKey,
  ) => Promise<boolean>;
  onSaveSectionDraft: (payload: StageTwoSectionDraftPayload) => Promise<boolean>;
  onSubmitSection: (
    documentType: StageTwoDocumentKey,
    sectionKey: StageTwoSectionKey,
  ) => Promise<boolean>;
  stageOneArtifacts: Artifact[];
  stageStatus?: string;
  workspaceMode: StageTwoMode;
};

type DraftValuesBySection = Record<StageTwoSectionKey, Record<string, string>>;
type EvidenceBySection = Record<StageTwoSectionKey, string[]>;
type ReflectionBySection = Record<StageTwoSectionKey, string>;
type DraftState = {
  drafts: DraftValuesBySection;
  evidence: EvidenceBySection;
  reflections: ReflectionBySection;
  sourceKey: string;
};

const listResponseFields = new Set([
  "acceptance_criteria",
  "constraints",
  "data_gaps",
  "data_sources",
  "open_questions",
  "out_of_scope",
  "pain_points",
  "requirement_goals",
  "technical_risks",
]);

export function StageTwoWorkspace({
  artifacts,
  isCompletingStage,
  isRefreshing,
  isRequestingReview,
  isSavingSolution,
  onCompleteStage,
  onComposeDocument,
  onModeChange,
  onRefresh,
  onRequestReview,
  onRequestSectionReview,
  onSaveSectionDraft,
  onSubmitSection,
  stageOneArtifacts,
  stageStatus,
  workspaceMode,
}: StageTwoWorkspaceProps) {
  const status = stageStatusCopy(stageStatus);
  const locked = stageStatus === "locked";
  const completed = stageStatus === "completed";
  const progressItems = useMemo(
    () => createStageTwoProgressItems(artifacts, stageStatus),
    [artifacts, stageStatus],
  );
  const yellowFlags = useMemo(() => summarizeStageTwoYellowFlags(artifacts), [artifacts]);
  const sourceKey = useMemo(
    () =>
      [
        ...artifacts
          .filter((artifact) => artifact.stage_key === "stage_2")
          .map((artifact) => `${artifact.artifact_type}:${artifact.id}`),
        ...stageOneArtifacts
          .filter((artifact) =>
            ["stage_1_problem_summary", "stage_1_visit_notes", "stage_1_interview_turn"].includes(
              artifact.artifact_type,
            ),
          )
          .map((artifact) => artifact.id),
      ].join("|"),
    [artifacts, stageOneArtifacts],
  );
  const initialDraftState = useMemo(
    () => createDraftState(artifacts, stageOneArtifacts, sourceKey),
    [artifacts, stageOneArtifacts, sourceKey],
  );
  const chapterProgress = useMemo(
    () => createStageTwoVNextChapterProgress(artifacts, stageStatus),
    [artifacts, stageStatus],
  );
  const [activeChapter, setActiveChapter] =
    useState<StageTwoVNextChapterKey>("background");
  const [draftState, setDraftState] = useState<DraftState>(initialDraftState);
  const [previewOpen, setPreviewOpen] = useState(false);
  const currentDraftState =
    draftState.sourceKey === sourceKey ? draftState : initialDraftState;
  const activeChapterSpec = getStageTwoVNextChapterSpec(activeChapter);
  const activeSection = activeChapterSpec.sectionKeys[0];
  const activeDocument = getStageTwoSectionDocumentType(activeSection);
  const activeDocumentProgress = progressItems.find((item) => item.key === activeDocument);
  const documentLocked =
    locked || completed || activeDocumentProgress?.state === "locked";
  const activeDraftArtifact = latestStageTwoSectionDraft(
    artifacts,
    activeDocument,
    activeSection,
  );
  const activeSectionReview = latestStageTwoSectionReview(
    artifacts,
    activeDocument,
    activeSection,
    activeDraftArtifact?.id,
  );
  const activeSubmission = latestStageTwoSectionSubmission(
    artifacts,
    activeDocument,
    activeSection,
  );
  const activeDocumentArtifact = latestStageTwoDocumentArtifact(artifacts, activeDocument);
  const activeDocumentReview = latestStageTwoDocumentReview(
    artifacts,
    activeDocument,
    activeDocumentArtifact?.id,
  );
  const canComposeDocument =
    !documentLocked && stageTwoCanComposeDocument(artifacts, activeDocument);
  const canRequestDocumentReview =
    !locked && !completed && activeDocumentArtifact !== null;
  const canComplete =
    !locked && !completed && stageTwoCanCompleteWithFormalDocs(artifacts);
  const activeChapterProgress = chapterProgress.find((chapter) => chapter.key === activeChapter);
  const canSaveChapterDraft =
    !documentLocked &&
    activeChapterSpec.sectionKeys.some((sectionKey) =>
      isSectionDraftReady(sectionSpec(sectionKey), currentDraftState.drafts[sectionKey]),
    );
  const canRequestChapterReview =
    !documentLocked &&
    activeChapterSpec.sectionKeys.some((sectionKey) => {
      const documentType = getStageTwoSectionDocumentType(sectionKey);
      const draft = latestStageTwoSectionDraft(artifacts, documentType, sectionKey);
      const submission = latestStageTwoSectionSubmission(artifacts, documentType, sectionKey);
      return draft !== null && submission === null;
    });
  const canConfirmChapter =
    !documentLocked && activeChapterProgress?.state === "ready_to_save";
  const [guideChecks, setGuideChecks] = useState<StageTwoGuideChecks>({
    dataBoundary: false,
    documentRoles: false,
    outOfScope: false,
    technicalPlan: false,
  });
  const guideReady = isStageTwoGuideReady(guideChecks);

  function updateSectionField(
    sectionKey: StageTwoSectionKey,
    fieldKey: string,
    value: string,
  ) {
    setDraftState({
      ...currentDraftState,
      drafts: {
        ...currentDraftState.drafts,
        [sectionKey]: {
          ...currentDraftState.drafts[sectionKey],
          [fieldKey]: value,
        },
      },
      sourceKey,
    });
  }

  function updateSectionReflection(sectionKey: StageTwoSectionKey, value: string) {
    setDraftState({
      ...currentDraftState,
      reflections: {
        ...currentDraftState.reflections,
        [sectionKey]: value,
      },
      sourceKey,
    });
  }

  function toggleSectionEvidence(sectionKey: StageTwoSectionKey, artifactId: string) {
    const current = currentDraftState.evidence[sectionKey];
    setDraftState({
      ...currentDraftState,
      evidence: {
        ...currentDraftState.evidence,
        [sectionKey]: current.includes(artifactId)
          ? current.filter((id) => id !== artifactId)
          : [...current, artifactId],
      },
      sourceKey,
    });
  }

  async function handleSaveChapterDraft() {
    if (!canSaveChapterDraft) {
      return;
    }
    await saveChapterDraftFor(activeChapterSpec);
  }

  async function saveChapterDraftFor(chapterSpec: StageTwoVNextChapterSpec) {
    for (const sectionKey of chapterSpec.sectionKeys) {
      const spec = sectionSpec(sectionKey);
      const draft = currentDraftState.drafts[sectionKey];
      if (!isSectionDraftReady(spec, draft)) {
        continue;
      }
      await onSaveSectionDraft({
        document_type: spec.documentType,
        evidence_artifact_ids: currentDraftState.evidence[sectionKey],
        section_key: sectionKey,
        student_reflection: currentDraftState.reflections[sectionKey]?.trim() || undefined,
        student_responses: toStudentResponses(spec, draft),
      });
    }
  }

  async function handleRequestChapterReview() {
    if (!canRequestChapterReview) {
      return;
    }
    await requestChapterReviewFor(activeChapterSpec);
  }

  async function requestChapterReviewFor(chapterSpec: StageTwoVNextChapterSpec) {
    for (const sectionKey of chapterSpec.sectionKeys) {
      const spec = sectionSpec(sectionKey);
      const draft = latestStageTwoSectionDraft(artifacts, spec.documentType, sectionKey);
      const submission = latestStageTwoSectionSubmission(artifacts, spec.documentType, sectionKey);
      if (draft && !submission) {
        await onRequestSectionReview(spec.documentType, sectionKey);
      }
    }
  }

  async function handleConfirmChapter() {
    if (!canConfirmChapter) {
      return;
    }
    await confirmChapterFor(activeChapterSpec);
  }

  async function confirmChapterFor(chapterSpec: StageTwoVNextChapterSpec) {
    for (const sectionKey of chapterSpec.sectionKeys) {
      const spec = sectionSpec(sectionKey);
      const draft = latestStageTwoSectionDraft(artifacts, spec.documentType, sectionKey);
      const review = latestStageTwoSectionReview(artifacts, spec.documentType, sectionKey, draft?.id);
      const submission = latestStageTwoSectionSubmission(artifacts, spec.documentType, sectionKey);
      if (
        !submission &&
        review?.content_json.can_submit === true &&
        !hasFlags(review.content_json.red_flags)
      ) {
        await onSubmitSection(spec.documentType, sectionKey);
      }
    }
  }

  function documentLockedFor(chapterSpec: StageTwoVNextChapterSpec): boolean {
    const documentType = getStageTwoSectionDocumentType(chapterSpec.sectionKeys[0]);
    const progress = progressItems.find((item) => item.key === documentType);
    return locked || completed || progress?.state === "locked";
  }

  function canSaveDraftFor(chapterSpec: StageTwoVNextChapterSpec): boolean {
    return (
      !documentLockedFor(chapterSpec) &&
      chapterSpec.sectionKeys.some((sectionKey) =>
        isSectionDraftReady(sectionSpec(sectionKey), currentDraftState.drafts[sectionKey]),
      )
    );
  }

  function canRequestReviewFor(chapterSpec: StageTwoVNextChapterSpec): boolean {
    return (
      !documentLockedFor(chapterSpec) &&
      chapterSpec.sectionKeys.some((sectionKey) => {
        const documentType = getStageTwoSectionDocumentType(sectionKey);
        const draft = latestStageTwoSectionDraft(artifacts, documentType, sectionKey);
        const submission = latestStageTwoSectionSubmission(artifacts, documentType, sectionKey);
        return draft !== null && submission === null;
      })
    );
  }

  function canConfirmFor(chapterSpec: StageTwoVNextChapterSpec): boolean {
    const chapter = chapterProgress.find((item) => item.key === chapterSpec.key);
    return !documentLockedFor(chapterSpec) && chapter?.state === "ready_to_save";
  }

  if (workspaceMode === "guide") {
    return (
      <StageTwoGuideView
        checks={guideChecks}
        isRefreshing={isRefreshing}
        locked={locked}
        onCheckChange={setGuideChecks}
        onEnterWorkbench={() => onModeChange("workbench")}
        onRefresh={onRefresh}
        ready={guideReady}
        stageOneArtifacts={stageOneArtifacts}
        statusLabel={status.label}
      />
    );
  }

  const savedChapterCount = chapterProgress.filter((chapter) => chapter.state === "saved").length;

  return (
    <div className="solution-workbench-page">
      <header className="solution-workbench-header">
        <a
          className="solution-workbench-brand"
          href="#stage-two-guide"
          onClick={(event) => {
            event.preventDefault();
            onModeChange("guide");
          }}
        >
          <span>FDE</span>
          <strong>方案工作台</strong>
        </a>
        <nav aria-label="阶段二导航" className="solution-workbench-nav">
          <a
            href="#stage-one-submit"
            onClick={(event) => {
              event.preventDefault();
              onModeChange("guide");
            }}
          >
            阶段一提交
          </a>
          <a
            href="#stage-two-guide"
            onClick={(event) => {
              event.preventDefault();
              onModeChange("guide");
            }}
          >
            阶段二导学
          </a>
          <a className="active" href="#solution-workbench-title">
            方案工作台
          </a>
        </nav>
        <div className="solution-workbench-actions">
          <button onClick={() => setPreviewOpen(true)} type="button">预览报告</button>
          <button
            className="primary"
            disabled={!canComplete || isCompletingStage}
            onClick={() => void onCompleteStage()}
            type="button"
          >
            {completed ? "阶段二已完成" : isCompletingStage ? "提交中" : "提交阶段二"}
          </button>
        </div>
      </header>

      <aside aria-label="报告章节目录" className="doc-nav-rail">
        <button aria-label="固定章节目录" className="doc-pin" type="button">
          <span />
        </button>
        <div aria-hidden="true" className="doc-rail-dots">
          <i /><i /><i /><i /><i /><i />
        </div>
        <div className="doc-nav-panel">
          <div className="doc-nav-title">
            <span>Stage 02</span>
            <strong>报告章节</strong>
          </div>
          {chapterProgress.map((chapter) => {
            const spec = getStageTwoVNextChapterSpec(chapter.key);
            return (
              <a
                className={activeChapter === chapter.key ? "active" : undefined}
                data-eval-status={chapter.state === "saved" ? "pass" : chapter.state === "needs_review" ? "revise" : "unchecked"}
                href={`#chapter-${chapter.key}`}
                key={chapter.key}
                onClick={() => setActiveChapter(chapter.key)}
              >
                <span>{spec.number}</span>
                <strong>{spec.title}</strong>
                <em>{stageTwoVNextChapterStateCopy(chapter.state)}</em>
              </a>
            );
          })}
        </div>
      </aside>

      <main className="solution-workbench-shell">
        <section aria-labelledby="solution-workbench-title" className="solution-workbench-hero">
          <div>
            <p className="workbench-kicker">Stage 02 / Evidence-driven Report Workspace</p>
            <h1 id="solution-workbench-title">从访谈证据，推导可交付的技术方案。</h1>
            <p>本工作台按正式阶段二报告拆成 6 个章节。每个章节都先给写作方法，再带入阶段一访谈证据，最后进入学生自己的撰写区，避免凭空写方案。</p>
          </div>
          <aside aria-label="阶段二状态" className="solution-workbench-status">
            <span>阶段进度</span>
            <strong>{savedChapterCount}/6 章已保存</strong>
            <div className="workbench-progress">
              <i style={{ width: `${Math.round((savedChapterCount / 6) * 100)}%` }} />
            </div>
            <p>完成章节保存后，可汇总正式文档并请求文档级评审。</p>
          </aside>
        </section>

        <section aria-label="阶段二输入" className="workbench-context-strip">
          {[
            ["阶段一输入", "周明访谈记录", "审厂追溯、MES 字段缺失、纸质质检单、一线重复录入阻力。"],
            ["本阶段产物", "三份正式材料", "需求分析、可行性研究报告、总体技术方案。"],
            ["进入阶段三条件", "边界与数据条件明确", "不替代 MES、不自动判责、不伪造缺失字段。"],
          ].map(([label, title, description]) => (
            <article key={title}>
              <span>{label}</span>
              <strong>{title}</strong>
              <p>{description}</p>
            </article>
          ))}
        </section>

        {locked ? (
          <EmptyState title="阶段二尚未解锁">
            完成阶段一正式客户拜访、拜访间整理、问题总结和综合评估后，方案工作台会自动开启。
          </EmptyState>
        ) : null}

        <div className="solution-document">
          {chapterProgress.map((chapter) => {
            const spec = getStageTwoVNextChapterSpec(chapter.key);
            return (
              <StageTwoReportChapter
                chapterProgress={chapter}
                chapterSpec={spec}
                currentDraftState={currentDraftState}
                documentLocked={documentLockedFor(spec)}
                isRequestingReview={isRequestingReview}
                isSavingSolution={isSavingSolution}
                key={chapter.key}
                onActive={() => setActiveChapter(chapter.key)}
                onConfirm={() => void confirmChapterFor(spec)}
                onFieldChange={updateSectionField}
                onRequestReview={() => void requestChapterReviewFor(spec)}
                onSave={() => void saveChapterDraftFor(spec)}
                canConfirm={canConfirmFor(spec)}
                canRequestReview={canRequestReviewFor(spec)}
                canSave={canSaveDraftFor(spec)}
              />
            );
          })}
        </div>

        <StageTwoDocumentGatePanel
          activeDocument={activeDocument}
          activeDocumentArtifact={activeDocumentArtifact}
          activeDocumentReview={activeDocumentReview}
          canComplete={canComplete}
          canComposeDocument={canComposeDocument}
          canRequestDocumentReview={canRequestDocumentReview}
          completed={completed}
          isCompleting={isCompletingStage}
          isRequestingReview={isRequestingReview}
          isSaving={isSavingSolution}
          onCompleteStage={onCompleteStage}
          onComposeDocument={onComposeDocument}
          onRequestReview={onRequestReview}
          yellowFlags={yellowFlags}
        />
      </main>

      {previewOpen ? (
        <StageTwoReportPreview
          chapterProgress={chapterProgress}
          currentDraftState={currentDraftState}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}

function StageTwoChapterEditor({
  chapterSpec,
  currentDraftState,
  documentLocked,
  onEvidenceToggle,
  onFieldChange,
  onReflectionChange,
  stageOneArtifacts,
}: {
  chapterSpec: StageTwoVNextChapterSpec;
  currentDraftState: DraftState;
  documentLocked: boolean;
  onEvidenceToggle: (sectionKey: StageTwoSectionKey, artifactId: string) => void;
  onFieldChange: (sectionKey: StageTwoSectionKey, fieldKey: string, value: string) => void;
  onReflectionChange: (sectionKey: StageTwoSectionKey, value: string) => void;
  stageOneArtifacts: Artifact[];
}) {
  return (
    <article className="mx-auto max-w-[980px] rounded-[10px] border border-slate-200 bg-white px-5 py-6 shadow-[0_18px_50px_rgba(26,33,44,.08)] sm:px-8 lg:px-10">
      <header className="border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={chapterSpec.kicker} tone="info" />
          <StatusBadge label={`${chapterSpec.sectionKeys.length} 个后端小节`} tone="muted" />
        </div>
        <p className="mt-5 text-xs font-extrabold uppercase text-slate-400">
          Chapter {chapterSpec.number}
        </p>
        <h3 className="mt-2 text-2xl font-extrabold leading-tight text-slate-950">
          {chapterSpec.title}
        </h3>
      </header>

      <section className="mt-6 rounded-2xl bg-slate-50 p-5">
        <div className="text-xs font-extrabold uppercase text-emerald-700">写作教学</div>
        <h4 className="mt-2 text-lg font-extrabold leading-snug text-slate-950">
          {chapterSpec.methodTitle}
        </h4>
        <p className="mt-2 text-sm leading-7 text-slate-500">{chapterSpec.methodBody}</p>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 p-5">
        <div className="text-xs font-extrabold uppercase text-emerald-700">阶段一证据</div>
        <div className="mt-3 grid gap-3">
          {chapterEvidenceCards(chapterSpec.key).map((item) => (
            <div className="rounded-2xl bg-slate-50 p-4" key={item.label}>
              <span className="text-xs font-extrabold text-slate-400">{item.label}</span>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-7">
        {chapterSpec.sectionKeys.map((sectionKey) => {
          const spec = sectionSpec(sectionKey);
          const draft = currentDraftState.drafts[sectionKey];
          return (
            <section className="rounded-2xl border border-slate-200 p-5" key={sectionKey}>
              <div className="border-b border-slate-100 pb-4">
                <p className="text-xs font-extrabold uppercase text-slate-400">
                  {stageTwoDocumentLabels[spec.documentType]}
                </p>
                <h4 className="mt-1 text-lg font-extrabold text-slate-950">{spec.title}</h4>
                <p className="mt-2 text-sm leading-7 text-slate-500">{spec.learningGoal}</p>
                <ul className="mt-3 grid gap-2">
                  {spec.checkpoints.map((checkpoint) => (
                    <li className="flex gap-2 text-sm leading-6 text-emerald-950" key={checkpoint}>
                      <CheckCircle2
                        aria-hidden
                        className="mt-1 shrink-0 text-emerald-600"
                        size={15}
                      />
                      <span>{checkpoint}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 grid gap-5">
                {spec.fields.map((field) => (
                  <GuidedField
                    disabled={documentLocked}
                    field={field}
                    key={field.key}
                    onChange={(value) => onFieldChange(sectionKey, field.key, value)}
                    value={draft[field.key] ?? ""}
                  />
                ))}
                <label className="grid gap-2">
                  <span className="text-base font-extrabold text-slate-900">自我检查</span>
                  <textarea
                    className="min-h-24 resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 transition placeholder:text-slate-400 focus:border-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    disabled={documentLocked}
                    onChange={(event) => onReflectionChange(sectionKey, event.target.value)}
                    placeholder="写一句：这一节最容易被追问的点是什么，你准备如何回应。"
                    rows={3}
                    value={currentDraftState.reflections[sectionKey]}
                  />
                </label>
              </div>

              <EvidencePicker
                activeEvidence={currentDraftState.evidence[sectionKey]}
                onToggle={(artifactId) => onEvidenceToggle(sectionKey, artifactId)}
                stageOneArtifacts={stageOneArtifacts}
              />
            </section>
          );
        })}
      </section>
    </article>
  );
}

function StageTwoReportChapter({
  canConfirm,
  canRequestReview,
  canSave,
  chapterProgress,
  chapterSpec,
  currentDraftState,
  documentLocked,
  isRequestingReview,
  isSavingSolution,
  onActive,
  onConfirm,
  onFieldChange,
  onRequestReview,
  onSave,
}: {
  canConfirm: boolean;
  canRequestReview: boolean;
  canSave: boolean;
  chapterProgress: StageTwoVNextChapterProgress;
  chapterSpec: StageTwoVNextChapterSpec;
  currentDraftState: DraftState;
  documentLocked: boolean;
  isRequestingReview: boolean;
  isSavingSolution: boolean;
  onActive: () => void;
  onConfirm: () => void;
  onFieldChange: (sectionKey: StageTwoSectionKey, fieldKey: string, value: string) => void;
  onRequestReview: () => void;
  onSave: () => void;
}) {
  const status =
    chapterProgress.state === "saved"
      ? "pass"
      : chapterProgress.state === "needs_review"
        ? "revise"
        : "unchecked";

  return (
    <section
      className={`report-chapter ${chapterProgress.state === "saved" ? "saved" : ""}`}
      data-chapter={chapterSpec.title}
      data-eval-status={status}
      id={`chapter-${chapterSpec.key}`}
      onFocus={onActive}
      onMouseEnter={onActive}
    >
      <header className="chapter-head">
        <span>{chapterSpec.number}</span>
        <div>
          <p className="workbench-kicker">{chapterSpec.kicker}</p>
          <h2>{chapterSpec.title}</h2>
        </div>
        <button disabled={!canSave || isSavingSolution} onClick={onSave} type="button">
          {isSavingSolution ? "保存中" : "保存本章"}
        </button>
        <small className={`chapter-eval-badge status-${status}`}>
          {stageTwoVNextChapterStateCopy(chapterProgress.state)}
        </small>
      </header>

      <div className="chapter-stack">
        <article className="method-block">
          <div>
            <div className="block-label">写作教学</div>
            <h3>{chapterSpec.methodTitle}</h3>
            <p>{chapterSpec.methodBody}</p>
          </div>
          <StageTwoMethodVisual chapterKey={chapterSpec.key} />
        </article>

        <StageTwoChapterEvidence chapterKey={chapterSpec.key} />

        <article className="writing-zone">
          <div className="writing-zone-head">
            <div>
              <div className="block-label">学生撰写区</div>
              <h3>{stageTwoWritingTitle(chapterSpec.key)}</h3>
            </div>
            <button
              disabled={!canRequestReview || isRequestingReview}
              onClick={onRequestReview}
              type="button"
            >
              {isRequestingReview ? "检查中" : "AI 检查本章"}
            </button>
          </div>

          <div className={chapterSpec.sectionKeys.length > 1 ? "writing-grid" : undefined}>
            {chapterSpec.sectionKeys.map((sectionKey) => {
              const spec = sectionSpec(sectionKey);
              const draft = currentDraftState.drafts[sectionKey];
              return spec.fields.map((field) => (
                <label key={`${sectionKey}:${field.key}`}>
                  <span>{field.label}</span>
                  {field.options ? (
                    <select
                      disabled={documentLocked}
                      onChange={(event) => onFieldChange(sectionKey, field.key, event.target.value)}
                      value={draft[field.key] ?? ""}
                    >
                      {field.options.map(([optionValue, label]) => (
                        <option key={optionValue} value={optionValue}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <textarea
                      disabled={documentLocked}
                      onChange={(event) => onFieldChange(sectionKey, field.key, event.target.value)}
                      placeholder={field.placeholder}
                      rows={field.multiline ? 5 : 4}
                      value={draft[field.key] ?? ""}
                    />
                  )}
                </label>
              ));
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button disabled={!canConfirm || isSavingSolution} onClick={onConfirm} type="button">
              {isSavingSolution ? "保存中" : "确认合格并保存"}
            </button>
            <span className="text-sm font-bold text-slate-500">{chapterProgress.meta}</span>
          </div>
        </article>
      </div>
    </section>
  );
}

function StageTwoMethodVisual({ chapterKey }: { chapterKey: StageTwoVNextChapterKey }) {
  if (chapterKey === "requirement") {
    return (
      <div className="method-grid five">
        {["用户角色", "使用场景", "输入条件", "输出要求", "限制边界"].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    );
  }
  if (chapterKey === "feasibility") {
    return (
      <div className="feasibility-meter">
        <span className="ok">业务价值成立</span>
        <span className="warn">数据条件黄灯</span>
        <span className="ok">技术路径清晰</span>
        <span className="danger">质量判责红线</span>
      </div>
    );
  }
  if (chapterKey === "technical") {
    return (
      <div className="architecture-mini-flow">
        {["数据源", "知识库/RAG", "规则节点", "人工确认", "追溯回答"].map((item, index) => (
          <FragmentWithConnector index={index} item={item} key={item} />
        ))}
      </div>
    );
  }
  return (
    <div className="method-grid">
      {["客户是谁", "压力来自哪里", "现在怎么做", "为什么现状不可持续"].map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function FragmentWithConnector({ index, item }: { index: number; item: string }) {
  return (
    <>
      {index > 0 ? <i aria-hidden="true" /> : null}
      <span>{item}</span>
    </>
  );
}

function StageTwoChapterEvidence({ chapterKey }: { chapterKey: StageTwoVNextChapterKey }) {
  const cards = chapterEvidenceCards(chapterKey);
  if (chapterKey === "background") {
    return (
      <article className="evidence-shelf">
        <div className="block-label">阶段一证据</div>
        {cards.map((item) => (
          <div className="evidence-row" key={item.label}>
            <span>{item.label}</span>
            <p>{item.text}</p>
          </div>
        ))}
      </article>
    );
  }
  const className =
    chapterKey === "feasibility"
      ? "risk-board"
      : chapterKey === "technical"
        ? "tech-source-grid"
        : chapterKey === "acceptance"
          ? "acceptance-board"
          : "evidence-grid";
  return (
    <article className="evidence-shelf">
      <div className="block-label">阶段一证据</div>
      <div className={className}>
        {cards.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function StageTwoDocumentGatePanel({
  activeDocument,
  activeDocumentArtifact,
  activeDocumentReview,
  canComplete,
  canComposeDocument,
  canRequestDocumentReview,
  completed,
  isCompleting,
  isRequestingReview,
  isSaving,
  onCompleteStage,
  onComposeDocument,
  onRequestReview,
  yellowFlags,
}: {
  activeDocument: StageTwoDocumentKey;
  activeDocumentArtifact: Artifact | null;
  activeDocumentReview: Artifact | null;
  canComplete: boolean;
  canComposeDocument: boolean;
  canRequestDocumentReview: boolean;
  completed: boolean;
  isCompleting: boolean;
  isRequestingReview: boolean;
  isSaving: boolean;
  onCompleteStage: () => Promise<boolean>;
  onComposeDocument: (documentType: StageTwoDocumentKey) => Promise<boolean>;
  onRequestReview: (documentType: StageTwoDocumentKey) => Promise<boolean>;
  yellowFlags: { description: string; impactStageKey: string }[];
}) {
  return (
    <section className="report-chapter">
      <header className="chapter-head">
        <span>AI</span>
        <div>
          <p className="workbench-kicker">Formal Review Gate</p>
          <h2>正式文档与阶段门禁</h2>
        </div>
        <small className="chapter-eval-badge">
          {activeDocumentArtifact ? "已有文档" : "待汇总"}
        </small>
      </header>
      <div className="writing-zone">
        <div className="writing-zone-head">
          <div>
            <div className="block-label">{stageTwoDocumentLabels[activeDocument]}</div>
            <h3>{readableDocumentReviewSummary({
              documentArtifact: activeDocumentArtifact,
              documentKey: activeDocument,
              review: activeDocumentReview?.content_json,
            })}</h3>
          </div>
        </div>
        <div className="preview-actions">
          <button
            disabled={!canComposeDocument || isSaving}
            onClick={() => void onComposeDocument(activeDocument)}
            type="button"
          >
            {isSaving ? "汇总中" : `汇总${stageTwoDocumentLabels[activeDocument]}`}
          </button>
          <button
            disabled={!canRequestDocumentReview || isRequestingReview}
            onClick={() => void onRequestReview(activeDocument)}
            type="button"
          >
            {isRequestingReview ? "评审中" : "请求文档级评审"}
          </button>
          <button
            disabled={!canComplete || isCompleting}
            onClick={() => void onCompleteStage()}
            type="button"
          >
            {completed ? "阶段二已完成" : isCompleting ? "提交中" : "提交阶段二"}
          </button>
        </div>
        {yellowFlags.length > 0 ? (
          <ul className="mt-5 grid gap-2 text-sm leading-6 text-slate-500">
            {yellowFlags.slice(0, 4).map((flag) => (
              <li key={`${flag.impactStageKey}:${flag.description}`}>
                {flag.description}（影响：{flag.impactStageKey}）
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function stageTwoWritingTitle(chapterKey: StageTwoVNextChapterKey): string {
  const map: Record<StageTwoVNextChapterKey, string> = {
    acceptance: "验收指标与风险台账",
    background: "项目背景段落草稿",
    boundary: "能力边界声明",
    feasibility: "可行性结论与风险处理",
    requirement: "需求条目与约束整理",
    technical: "技术方案草稿",
  };
  return map[chapterKey];
}

function StageTwoGuideView({
  checks,
  isRefreshing,
  locked,
  onCheckChange,
  onEnterWorkbench,
  onRefresh,
  ready,
  stageOneArtifacts,
  statusLabel,
}: {
  checks: StageTwoGuideChecks;
  isRefreshing: boolean;
  locked: boolean;
  onCheckChange: (checks: StageTwoGuideChecks) => void;
  onEnterWorkbench: () => void;
  onRefresh: () => void;
  ready: boolean;
  stageOneArtifacts: Artifact[];
  statusLabel: string;
}) {
  const checkItems: Array<{ key: keyof StageTwoGuideChecks; label: string }> = [
    { key: "documentRoles", label: "我能区分需求分析、可行性研究和技术方案的职责。" },
    { key: "dataBoundary", label: "我知道 MES 字段缺失是方案边界风险，不是 AI 自动补齐任务。" },
    { key: "outOfScope", label: "我能写出至少 3 条项目不做范围。" },
    { key: "technicalPlan", label: "我知道总体方案必须包含数据、能力、流程和验收指标。" },
  ];
  const checkedCount = checkItems.filter((item) => checks[item.key]).length;
  const evidenceItems = stageOneArtifacts
    .filter((artifact) =>
      ["stage_1_problem_summary", "stage_1_visit_notes", "stage_1_interview_turn"].includes(
        artifact.artifact_type,
      ),
    )
    .slice()
    .sort(compareArtifactsByCreatedAt)
    .slice(-3)
    .reverse();

  return (
    <div className="solution-guide-page">
      <header className="solution-guide-header">
        <a className="solution-guide-brand" href="#student-home">
          <span>FDE</span>
          <strong>阶段二导学</strong>
        </a>
        <nav aria-label="阶段二导航" className="solution-guide-nav">
          <a href="#stage-one-submit">阶段一提交</a>
          <a className="active" href="#stage-two-guide">导学</a>
          <a
            href="#stage-two-workbench"
            onClick={(event) => {
              event.preventDefault();
              if (ready && !locked) {
                onEnterWorkbench();
              }
            }}
          >
            方案工作台
          </a>
        </nav>
        <a className="solution-guide-back" href="#experiment-path">返回实验路径</a>
      </header>

      <main className="solution-guide-shell" id="stage-two-guide">
        <section aria-labelledby="solution-guide-title" className="solution-guide-hero">
          <div className="solution-hero-copy">
            <p className="solution-kicker">Stage 02 / Requirement Analysis & Technical Plan</p>
            <h1 id="solution-guide-title">
              <span>把访谈证据转成可行性研究，</span>
              <span>再形成总体技术方案。</span>
            </h1>
            <p>阶段二不是把客户诉求改写成几个功能点，而是训练你完成需求分析、可行性判断和总体技术方案设计。你需要说明项目为什么值得做、凭什么能做、边界在哪里、最终如何验收。</p>
          </div>
          <aside aria-label="阶段二产物" className="solution-hero-brief">
            <span>阶段二最终产物</span>
            <strong>需求分析报告 + 可行性研究报告 + 总体技术方案</strong>
            <p>提交前必须标记红灯问题、黄灯风险和不可由 AI 直接判断的边界。</p>
          </aside>
        </section>

        <section aria-label="阶段衔接" className="solution-handoff">
          {[
            ["01", "阶段一输入", "周明访谈记录、已确认事实、待确认问题、智能体边界初稿。"],
            ["02", "阶段二训练", "把证据转成需求分析、可行性研究和总体技术方案。"],
            ["03", "进入知识工程", "方案确认后，再判断 SOP、审厂清单、MES 导出如何进入知识体系。"],
          ].map(([number, title, description]) => (
            <article className={number === "02" ? "active" : undefined} key={title}>
              <span>{number}</span>
              <strong>{title}</strong>
              <p>{description}</p>
            </article>
          ))}
        </section>

        {locked ? (
          <EmptyState title="阶段二尚未解锁">
            完成阶段一正式客户拜访、拜访间整理、问题总结和综合评估后，方案工作台会自动开启。
          </EmptyState>
        ) : null}

        <div className="solution-guide-layout">
          <div className="solution-guide-main">
            <section aria-labelledby="deliverable-title" className="solution-section">
              <div className="solution-section-head">
                <p className="solution-kicker">Deliverables</p>
                <h2 id="deliverable-title">阶段二不是一个文档，而是一组判断。</h2>
              </div>
              <div className="solution-deliverables">
                {[
                  ["01", "需求分析报告", "从访谈证据中抽取业务目标、用户角色、关键场景、数据来源和约束条件。", ["审厂追溯是优先业务场景", "质量负责人和一线质检员诉求不同", "MES、Excel、纸质单据质量不一致"]],
                  ["02", "可行性研究报告", "判断项目是否值得做、是否能做、做成什么范围才可交付。", ["数据能否支持追溯问答", "现场是否接受低成本补充动作", "缺失字段是否需要转人工确认"]],
                  ["03", "总体技术方案", "说明智能体能力边界、数据接入、知识库方案、流程控制、验收指标。", ["RAG + 规则提醒 + 人工确认", "不替代 MES / ERP / 质量判责", "输出必须附证据来源"]],
                ].map(([number, title, description, items]) => (
                  <article key={title as string}>
                    <em>{number as string}</em>
                    <h3>{title as string}</h3>
                    <p>{description as string}</p>
                    <ul>
                      {(items as string[]).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="translation-title" className="solution-section">
              <div className="solution-section-head split">
                <div>
                  <p className="solution-kicker">Case Translation</p>
                  <h2 id="translation-title">把周明的表达转成方案判断。</h2>
                </div>
                <span className="solution-note">制造业质检课程包示例</span>
              </div>
              <div className="translation-board">
                {[
                  ["访谈证据", "需求分析", "可行性判断", "技术方案提示"],
                  ["“审厂前总要临时拼材料。”", "高优先级场景是按批次准备追溯证据。", "需要确认审厂常见题型和材料模板。", "建立批次追溯问答与证据聚合流程。"],
                  ["“MES 里字段不完整。”", "结构化数据不足以直接形成完整结论。", "字段缺失时不能让 AI 自动补齐。", "设计缺失字段提醒和人工确认节点。"],
                  ["“不希望一线再填一套系统。”", "方案必须降低现场额外录入负担。", "需要验证可接受的补充动作。", "优先复用 MES 导出、Excel 台账和已有单据。"],
                ].map((row, rowIndex) => (
                  <div className={rowIndex === 0 ? "translation-row head" : "translation-row"} key={row.join("|")}>
                    {row.map((cell, cellIndex) =>
                      rowIndex === 0 ? (
                        <span key={cell}>{cell}</span>
                      ) : (
                        <p className={cellIndex === 2 && rowIndex === 2 ? "risk danger" : cellIndex === 2 ? "risk warn" : undefined} key={cell}>{cell}</p>
                      ),
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="feasibility-title" className="solution-section feasibility-section">
              <div className="solution-section-head">
                <p className="solution-kicker">Feasibility Lens</p>
                <h2 id="feasibility-title">可行性研究报告要回答四个问题。</h2>
              </div>
              <div className="feasibility-grid">
                {[
                  ["ok", "可做", "业务价值是否成立？", "审厂追溯压力明确，质量负责人有真实使用动机，且材料准备成本高。"],
                  ["warn", "黄灯", "数据条件是否支撑？", "MES 字段、Excel 台账、纸质单据都可用，但完整性和字段一致性存在风险。"],
                  ["ok", "可做", "技术路径是否清晰？", "稳定制度类资料适合知识库，批次记录适合检索与证据引用，不适合直接判责。"],
                  ["danger", "红线", "哪些边界不能突破？", "不能自动认定质量责任、不能伪造缺失字段、不能替代 MES 或质量管理系统。"],
                ].map(([tone, signal, title, description]) => (
                  <article key={title}>
                    <span className={`signal ${tone}`}>{signal}</span>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="architecture-title" className="solution-section">
              <div className="solution-section-head">
                <p className="solution-kicker">Technical Plan</p>
                <h2 id="architecture-title">总体技术方案要让团队知道怎么交付。</h2>
              </div>
              <div aria-label="总体技术方案结构" className="architecture-flow">
                {[
                  ["使用者", "质量负责人", "查询批次异常、审厂材料、整改证据。"],
                  ["输入", "批次 / 缺陷 / 工序", "支持范围内追问，不接受泛业务闲聊。"],
                  ["知识与数据", "SOP + 审厂清单 + 质检记录", "区分稳定知识和不完整业务记录。"],
                  ["智能体能力", "检索、引用、提醒、转人工", "输出必须附来源，风险项必须提示。"],
                  ["验收", "20 条标准追溯题", "范围内可回答，范围外会拒答。"],
                ].map(([label, title, description], index) => (
                  <Fragment key={label}>
                    {index > 0 ? <i aria-hidden="true">→</i> : null}
                    <article>
                      <span>{label}</span>
                      <strong>{title}</strong>
                      <p>{description}</p>
                    </article>
                  </Fragment>
                ))}
              </div>
            </section>
          </div>

          <aside aria-label="进入阶段二工作台前检查" className="solution-guide-side">
            <section className="solution-side-card">
              <p className="solution-kicker">Before Workspace</p>
              <h2>进入工作台前检查</h2>
              <div className="solution-checks">
                {checkItems.map((item) => (
                  <label key={item.key}>
                    <input
                      checked={checks[item.key]}
                      disabled={locked}
                      onChange={(event) => onCheckChange({ ...checks, [item.key]: event.target.checked })}
                      type="checkbox"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
              <button disabled={locked || !ready} onClick={onEnterWorkbench} type="button">
                进入阶段二工作台
              </button>
              <p><span>{checkedCount}</span>/4 项确认后解锁。</p>
            </section>

            <section className="solution-side-card ghost">
              <span>阶段一已带入的证据</span>
              {evidenceItems.length > 0 ? (
                <ul>
                  {evidenceItems.map((artifact) => (
                    <li key={artifact.id}>
                      {evidenceTitle(artifact)}：{sanitizeProductText(evidenceSummary(artifact))}
                    </li>
                  ))}
                </ul>
              ) : (
                <ul>
                  <li>客户目标：降低审厂前追溯材料准备成本</li>
                  <li>关键限制：不能替代 MES，不能增加一线录入负担</li>
                  <li>核心风险：字段缺失、纸质单据、责任认定边界</li>
                </ul>
              )}
            </section>

            <section className="solution-side-card dark">
              <span>教师提示</span>
              <p>可行性报告不是证明“这个项目一定能做”，而是诚实说明在当前数据、技术和组织条件下，哪些范围可交付，哪些范围必须降级或转人工。</p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function StageTwoReportPreview({
  chapterProgress,
  currentDraftState,
  onClose,
}: {
  chapterProgress: StageTwoVNextChapterProgress[];
  currentDraftState: DraftState;
  onClose: () => void;
}) {
  return (
    <div
      aria-labelledby="stage-two-preview-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-8"
      role="dialog"
    >
      <div className="max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-[18px] bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,.35)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-extrabold uppercase text-emerald-700">
              阶段二报告预览
            </span>
            <h2
              className="mt-2 text-2xl font-extrabold leading-tight text-slate-950"
              id="stage-two-preview-title"
            >
              需求分析、可行性研究与总体技术方案
            </h2>
          </div>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-slate-300"
            onClick={onClose}
            type="button"
          >
            关闭预览
          </button>
        </div>

        <div className="mt-5 grid gap-5">
          {chapterProgress.map((chapter) => {
            const chapterSpec = getStageTwoVNextChapterSpec(chapter.key);
            return (
              <section className="rounded-2xl border border-slate-200 p-5" key={chapter.key}>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={`Chapter ${chapterSpec.number}`} tone="info" />
                  <StatusBadge label={stageTwoVNextChapterStateCopy(chapter.state)} tone="muted" />
                </div>
                <h3 className="mt-3 text-xl font-extrabold text-slate-950">
                  {chapterSpec.title}
                </h3>
                <div className="mt-4 grid gap-4">
                  {chapterSpec.sectionKeys.map((sectionKey) => {
                    const spec = sectionSpec(sectionKey);
                    const draft = currentDraftState.drafts[sectionKey];
                    return (
                      <div className="rounded-2xl bg-slate-50 p-4" key={sectionKey}>
                        <p className="text-sm font-extrabold text-slate-900">{spec.title}</p>
                        <dl className="mt-3 grid gap-3">
                          {spec.fields.map((field) => (
                            <div key={field.key}>
                              <dt className="text-xs font-extrabold text-slate-400">
                                {field.label}
                              </dt>
                              <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                {draft[field.key]?.trim() || "—"}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StageTwoFocusedHeader({
  canComplete,
  completed,
  isCompleting,
  isRefreshing,
  onBack,
  onCompleteStage,
  onPreview,
  onRefresh,
  statusLabel,
}: {
  canComplete: boolean;
  completed: boolean;
  isCompleting: boolean;
  isRefreshing: boolean;
  onBack: () => void;
  onCompleteStage: () => Promise<boolean>;
  onPreview: () => void;
  onRefresh: () => void;
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
        返回阶段二导学
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label="方案工作台" tone="success" />
        <StatusBadge label={statusLabel} tone="info" />
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
          onClick={onPreview}
          type="button"
        >
          预览报告
        </button>
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-950 px-3 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canComplete || isCompleting}
          onClick={() => void onCompleteStage()}
          type="button"
        >
          {completed ? "阶段二已完成" : isCompleting ? "提交中" : "提交阶段二"}
        </button>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isRefreshing}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw aria-hidden size={16} />
          同步进度
        </button>
      </div>
    </section>
  );
}

function stageTwoVNextChapterStateCopy(value: string): string {
  const map: Record<string, string> = {
    draft: "未检",
    locked: "未解锁",
    needs_review: "待完善",
    ready_to_save: "合格",
    saved: "已保存",
  };
  return map[value] ?? "未检";
}

function chapterEvidenceCards(
  chapterKey: StageTwoVNextChapterKey,
): Array<{ label: string; text: string }> {
  const map: Record<StageTwoVNextChapterKey, Array<{ label: string; text: string }>> = {
    acceptance: [
      { label: "范围内", text: "按批次查询不合格发现、复检、整改证据。" },
      { label: "范围外", text: "客户索赔、责任认定、缺少原始记录的结论。" },
      { label: "风险项", text: "字段缺失、记录冲突、纸质单据无法识别。" },
    ],
    background: [
      { label: "客户原话", text: "客户审厂越来越频繁，最麻烦的是质检记录、异常处置、复检结果和整改材料分散。" },
      { label: "业务事实", text: "材料来源包括 MES、Excel 台账、纸质质检单和共享文件夹，字段口径不一致。" },
      { label: "待确认", text: "审厂最常见追溯题型、MES 可导出字段样例、纸质单据能否结构化。" },
    ],
    boundary: [
      { label: "范围内", text: "批次追溯问答、SOP 查询、审厂材料提示、缺失字段提醒。" },
      { label: "范围外", text: "质量责任认定、客户索赔判断、字段自动补齐、替代原系统审批。" },
      { label: "转人工", text: "记录冲突、字段缺失、纸质单据不可识别、责任归属争议。" },
    ],
    feasibility: [
      { label: "可做", text: "审厂追溯压力明确，使用者和业务场景清楚。" },
      { label: "黄灯", text: "MES 字段不完整，Excel 与纸质记录口径不一致。" },
      { label: "红线", text: "不能让 AI 自动认定质量责任或生成不存在的追溯证据。" },
    ],
    requirement: [
      { label: "质量负责人", text: "需要在审厂前快速组织批次异常、处置、复检和整改证据。" },
      { label: "一线质检员", text: "不接受额外重复录入，方案必须尽量复用已有记录。" },
      { label: "验收口径", text: "回答必须附来源，字段缺失时要提示风险并转人工确认。" },
    ],
    technical: [
      { label: "SOP / 审厂清单", text: "适合进入知识库，作为稳定制度资料。" },
      { label: "MES 与 Excel", text: "用于批次、工序和检验字段，字段缺失需提示并保留风险。" },
      { label: "纸质单据 / 图片", text: "可作为附件证据，结构化能力需谨慎验证。" },
    ],
  };
  return map[chapterKey];
}

function GuidedField({
  disabled,
  field,
  onChange,
  value,
}: {
  disabled: boolean;
  field: StageTwoSectionSpec["fields"][number];
  onChange: (value: string) => void;
  value: string;
}) {
  const textareaHeight = field.multiline ? "min-h-40" : "min-h-28";

  return (
    <label className="grid gap-3">
      <span className="text-base font-extrabold text-slate-900">
        {field.label}
        {field.required ? <span className="text-red-500"> *</span> : null}
      </span>
      {field.options ? (
        <select
          className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 transition focus:border-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {field.options.map(([optionValue, label]) => (
            <option key={optionValue} value={optionValue}>
              {label}
            </option>
          ))}
        </select>
      ) : (
        <textarea
          className={`${textareaHeight} resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 transition placeholder:text-slate-400 focus:border-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          rows={field.multiline ? 5 : 3}
          value={value}
        />
      )}
    </label>
  );
}

function EvidencePicker({
  activeEvidence,
  onToggle,
  stageOneArtifacts,
}: {
  activeEvidence: string[];
  onToggle: (artifactId: string) => void;
  stageOneArtifacts: Artifact[];
}) {
  const evidenceItems = stageOneArtifacts
    .filter((artifact) =>
      ["stage_1_problem_summary", "stage_1_visit_notes", "stage_1_interview_turn"].includes(
        artifact.artifact_type,
      ),
    )
    .slice()
    .sort(compareArtifactsByCreatedAt)
    .slice(-6)
    .reverse();
  return (
    <section className="mt-5 rounded-2xl border border-slate-200 p-4">
      <p className="text-sm font-extrabold text-slate-900">阶段一证据选择</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        选择能支撑当前判断的访谈、拜访间整理或问题总结，AI 追问会检查证据是否匹配。
      </p>
      {evidenceItems.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {evidenceItems.map((artifact) => {
            const selected = activeEvidence.includes(artifact.id);
            return (
              <button
                className={`rounded-2xl border p-3 text-left transition ${
                  selected
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-emerald-200"
                }`}
                key={artifact.id}
                onClick={() => onToggle(artifact.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-extrabold text-slate-900">
                    {evidenceTitle(artifact)}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-extrabold ${
                      selected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {selected ? "已选择" : "选择"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                  {sanitizeProductText(evidenceSummary(artifact)) || "已有阶段一过程记录。"}
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-500">暂无阶段一证据可选。</p>
      )}
    </section>
  );
}

function ReviewAndEvidencePanel({
  activeDocument,
  activeDocumentArtifact,
  activeDocumentReview,
  activeSection,
  activeSectionReview,
  activeSubmission,
  canComplete,
  canComposeDocument,
  canRequestDocumentReview,
  completed,
  isCompleting,
  isRequestingReview,
  isSaving,
  onCompleteStage,
  onComposeDocument,
  onRequestReview,
  yellowFlags,
}: {
  activeDocument: StageTwoDocumentKey;
  activeDocumentArtifact: Artifact | null;
  activeDocumentReview: Artifact | null;
  activeSection: StageTwoSectionKey;
  activeSectionReview: Artifact | null;
  activeSubmission: Artifact | null;
  canComplete: boolean;
  canComposeDocument: boolean;
  canRequestDocumentReview: boolean;
  completed: boolean;
  isCompleting: boolean;
  isRequestingReview: boolean;
  isSaving: boolean;
  onCompleteStage: () => Promise<boolean>;
  onComposeDocument: (documentType: StageTwoDocumentKey) => Promise<boolean>;
  onRequestReview: (documentType: StageTwoDocumentKey) => Promise<boolean>;
  yellowFlags: { description: string; impactStageKey: string }[];
}) {
  const review = activeSectionReview?.content_json;
  const documentReview = activeDocumentReview?.content_json;
  const redFlags = arrayOfRecords(review?.red_flags);
  const sectionYellowFlags = arrayOfRecords(review?.yellow_flags);
  const canSubmitSection =
    review?.can_submit === true && redFlags.length === 0;
  const reviewSummary = readableSectionReviewSummary({
    activeSubmission,
    review,
    sectionKey: activeSection,
  });
  const documentReviewSummary = readableDocumentReviewSummary({
    documentArtifact: activeDocumentArtifact,
    documentKey: activeDocument,
    review: documentReview,
  });
  return (
    <aside className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">AI 导师与门禁</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            AI 先追问当前小节，正式文档汇总后再做文档级评审。
          </p>
        </div>
        <MessageSquareText aria-hidden className="text-emerald-600" size={22} />
      </div>

      <section className="mt-4 rounded-2xl bg-slate-50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={activeSubmission ? "小节已提交" : activeSectionReview ? "已有追问" : "待追问"}
            tone={activeSubmission ? "success" : activeSectionReview ? "warning" : "muted"}
          />
          <span className="text-xs font-bold text-slate-400">{sectionSpec(activeSection).title}</span>
        </div>
        {activeSectionReview ? (
          <div className="mt-4 grid gap-4">
            <div className="rounded-2xl border border-white bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,.04)]">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={canSubmitSection ? "本节可提交" : "需要补充"}
                  tone={canSubmitSection ? "success" : "warning"}
                />
                <span className="text-xs font-bold text-slate-400">
                  {formatDateTime(activeSectionReview.created_at)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-700">{reviewSummary}</p>
            </div>
            {canSubmitSection && redFlags.length === 0 ? (
              <SimpleList
                items={["关键必填项已覆盖", "可以沉淀为正式文档章节"]}
                title="通过依据"
              />
            ) : null}
            {arrayOfStrings(review?.follow_up_questions).length > 0 ? (
              <SimpleList items={arrayOfStrings(review?.follow_up_questions)} title="追问问题" />
            ) : null}
            {arrayOfStrings(review?.revision_advice).length > 0 ? (
              <SimpleList items={arrayOfStrings(review?.revision_advice)} title="修改建议" />
            ) : null}
            {redFlags.length > 0 ? (
              <FlagList flags={redFlags} tone="danger" title="红灯阻塞" />
            ) : null}
            {sectionYellowFlags.length > 0 ? (
              <FlagList flags={sectionYellowFlags} tone="warning" title="证据提醒" />
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-500">
            保存小节草稿后请求 AI 追问，AI 会检查关键判断和证据缺口。
          </p>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-extrabold text-slate-900">正式文档门禁</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          三个小节提交后，才能汇总{stageTwoDocumentLabels[activeDocument]}并请求文档级评审。
        </p>
        <div className="mt-3 grid gap-2">
          <ActionButton
            disabled={!canComposeDocument || isSaving}
            icon={<FileText aria-hidden size={16} />}
            label={isSaving ? "汇总中" : `汇总${stageTwoDocumentLabels[activeDocument]}`}
            onClick={() => void onComposeDocument(activeDocument)}
            variant="secondary"
          />
          <ActionButton
            disabled={!canRequestDocumentReview || isRequestingReview}
            icon={<SearchCheck aria-hidden size={16} />}
            label={isRequestingReview ? "评审中" : `评审${stageTwoDocumentLabels[activeDocument]}`}
            onClick={() => void onRequestReview(activeDocument)}
          />
        </div>
        {activeDocumentReview ? (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                label={reviewJudgementCopy(stringValue(documentReview?.review_judgement))}
                tone={reviewJudgementTone(stringValue(documentReview?.review_judgement))}
              />
              <span className="text-xs font-bold text-emerald-700">
                {formatDateTime(activeDocumentReview.created_at)}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-emerald-950">
              {documentReviewSummary}
            </p>
          </div>
        ) : activeDocumentArtifact ? (
          <p className="mt-3 text-sm leading-6 text-slate-500">正式文档已汇总，等待文档级评审。</p>
        ) : null}
      </section>

      <section className="mt-4 rounded-2xl bg-amber-50 p-4">
        <p className="text-xs font-extrabold text-amber-700">累计黄灯债务</p>
        {yellowFlags.length > 0 ? (
          <ul className="mt-3 grid gap-2">
            {yellowFlags.slice(0, 5).map((flag) => (
              <li className="flex gap-2 text-sm leading-6 text-amber-900" key={flag.description}>
                <AlertTriangle aria-hidden className="mt-1 shrink-0 text-amber-600" size={15} />
                <span>
                  {sanitizeProductText(flag.description)}
                  <span className="ml-1 text-xs font-bold text-amber-700">
                    {impactStageCopy(flag.impactStageKey)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm leading-6 text-amber-900">
            文档级评审发现可继续但需后续回应的问题后，会在这里形成黄灯债务。
          </p>
        )}
      </section>

      <button
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canComplete || isCompleting}
        onClick={() => void onCompleteStage()}
        type="button"
      >
        <CheckCircle2 aria-hidden size={16} />
        {completed ? "阶段二已完成" : isCompleting ? "确认中" : "完成阶段二并解锁阶段三"}
      </button>
    </aside>
  );
}

function ActionButton({
  disabled,
  icon,
  label,
  onClick,
  variant = "primary",
}: {
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "dark";
}) {
  const className = {
    dark: "bg-slate-950 text-white hover:bg-slate-800",
    primary: "bg-emerald-600 text-white hover:bg-emerald-700",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
  }[variant];
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function FlagList({
  flags,
  title,
  tone,
}: {
  flags: Array<Record<string, unknown>>;
  title: string;
  tone: "danger" | "warning";
}) {
  const iconClass = tone === "danger" ? "text-red-500" : "text-amber-500";
  return (
    <div>
      <p className="text-xs font-extrabold text-slate-500">{title}</p>
      <ul className="mt-2 grid gap-2">
        {flags.map((flag) => (
          <li className="flex gap-2 text-sm leading-6 text-slate-700" key={stringValue(flag.description)}>
            <AlertTriangle aria-hidden className={`mt-1 shrink-0 ${iconClass}`} size={15} />
            <span>{sanitizeProductText(stringValue(flag.description))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SimpleList({ items, title }: { items: string[]; title: string }) {
  return (
    <div>
      <p className="text-xs font-extrabold text-slate-500">{title}</p>
      <ul className="mt-2 grid gap-2">
        {items.map((item) => (
          <li className="flex gap-2 text-sm leading-6 text-slate-700" key={item}>
            <CheckCircle2 aria-hidden className="mt-1 shrink-0 text-emerald-600" size={15} />
            <span>{sanitizeProductText(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function readableSectionReviewSummary({
  activeSubmission,
  review,
  sectionKey,
}: {
  activeSubmission: Artifact | null;
  review: Record<string, unknown> | undefined;
  sectionKey: StageTwoSectionKey;
}): string {
  const rawSummary = stringValue(review?.review_summary);
  if (rawSummary && !looksLikeApiPayload(rawSummary)) {
    return rawSummary;
  }
  const section = sectionSpec(sectionKey);
  if (review?.can_submit === true || activeSubmission) {
    return `${section.title}已通过 AI 门禁。当前内容覆盖本节核心判断，可以进入小节提交或继续沉淀到正式文档。`;
  }
  return `${section.title}已完成一次 AI 检查。请优先补齐红灯项和追问问题，再重新提交本节评审。`;
}

function readableDocumentReviewSummary({
  documentArtifact,
  documentKey,
  review,
}: {
  documentArtifact: Artifact | null;
  documentKey: StageTwoDocumentKey;
  review: Record<string, unknown> | undefined;
}): string {
  const rawSummary = stringValue(review?.review_summary);
  if (rawSummary && !looksLikeApiPayload(rawSummary)) {
    return rawSummary;
  }
  const judgement = reviewJudgementCopy(stringValue(review?.review_judgement));
  const label = stageTwoDocumentLabels[documentKey];
  const highlights = documentHighlights(documentArtifact, documentKey);
  if (highlights.length === 0) {
    return `${label}已完成文档级评审，结论为${judgement}。`;
  }
  return `${label}已完成文档级评审，结论为${judgement}。${highlights.join("；")}。`;
}

function documentHighlights(
  documentArtifact: Artifact | null,
  documentKey: StageTwoDocumentKey,
): string[] {
  if (!documentArtifact) {
    return [];
  }
  const content = documentArtifact.content_json;
  if (documentKey === "requirements_document") {
    return [
      summarySentence("业务背景", content.project_background),
      summarySentence("需求目标", content.requirement_goals),
    ].filter(Boolean);
  }
  if (documentKey === "feasibility_report") {
    return [
      `数据结论：${optionCopy(stringValue(content.data_feasibility_conclusion))}`,
      `技术结论：${optionCopy(stringValue(content.technical_feasibility_conclusion))}`,
      `综合建议：${optionCopy(stringValue(content.overall_recommendation))}`,
    ].filter((item) => !item.endsWith("："));
  }
  return [
    `知识库路线：${optionCopy(stringValue(content.knowledge_base_strategy))}`,
    `智能体类型：${optionCopy(stringValue(content.agent_type))}`,
    summarySentence("阶段三起点", content.stage_three_starting_point),
  ].filter(Boolean);
}

function summarySentence(label: string, value: unknown): string {
  const text = firstSentence(stringValue(value));
  return text ? `${label}：${text}` : "";
}

function firstSentence(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "";
  }
  const [first] = compact.split(/[。；;]/);
  return first.length > 80 ? `${first.slice(0, 80)}...` : first;
}

function optionCopy(value: string): string {
  const map: Record<string, string> = {
    adjust_scope: "调整范围后推进",
    chat: "对话型",
    conditional: "有条件可行",
    document: "文档型知识库",
    feasible: "可行",
    hybrid: "混合型",
    local_demo: "本地演示",
    needs_supplement: "需补充后可行",
    none: "暂不使用知识库",
    not_feasible: "暂不可行",
    not_recommended: "不建议",
    not_worth_doing: "不建议投入",
    pause: "暂缓",
    private: "私有化部署",
    proceed: "继续推进",
    saas: "云端 SaaS",
    structured: "结构化数据知识库",
    workflow: "工作流型",
    worth_doing: "值得做",
  };
  return map[value] ?? sanitizeProductText(value);
}

function looksLikeApiPayload(value: string): boolean {
  return /[{}`']|_[a-z]+|student answer|学生回答|project_background|knowledge_base_strategy|data_feasibility_conclusion/i.test(
    value,
  );
}

function createDraftState(
  artifacts: Artifact[],
  stageOneArtifacts: Artifact[],
  sourceKey: string,
): DraftState {
  const drafts = {} as DraftValuesBySection;
  const evidence = {} as EvidenceBySection;
  const reflections = {} as ReflectionBySection;
  for (const spec of stageTwoSectionSpecs) {
    const source =
      latestStageTwoSectionDraft(artifacts, spec.documentType, spec.key) ??
      latestStageTwoSectionSubmission(artifacts, spec.documentType, spec.key);
    const content = source?.content_json;
    const storedResponses =
      (content?.student_responses as Record<string, unknown> | undefined) ??
      (content?.submitted_content as Record<string, unknown> | undefined) ??
      {};
    const fallbackResponses = seededResponses(spec, artifacts, stageOneArtifacts);
    drafts[spec.key] = {};
    for (const field of spec.fields) {
      const storedValue = fieldValueForInput(
        field.key,
        storedResponses[field.key],
        field,
      );
      drafts[spec.key][field.key] =
        storedValue ||
        fieldValueForInput(field.key, fallbackResponses[field.key], field);
    }
    evidence[spec.key] = arrayOfStrings(content?.evidence_artifact_ids);
    reflections[spec.key] = stringValue(content?.student_reflection);
  }
  return { drafts, evidence, reflections, sourceKey };
}

function seededResponses(
  spec: StageTwoSectionSpec,
  artifacts: Artifact[],
  stageOneArtifacts: Artifact[],
): Record<string, unknown> {
  const formalDocumentBackfill = createStageTwoSectionBackfillFromFormalDocuments(
    artifacts,
    spec.key,
  );
  const problemSummary = latestStageOneArtifact(stageOneArtifacts, "stage_1_problem_summary");
  const visitNotes = latestStageOneArtifact(stageOneArtifacts, "stage_1_visit_notes");
  const requirements = latestStageTwoDocumentArtifact(artifacts, "requirements_document");
  const feasibility = latestStageTwoDocumentArtifact(artifacts, "feasibility_report");
  if (spec.key === "requirements_context") {
    return {
      current_business_process:
        stringValue(problemSummary?.content_json.business_context) ||
        stringValue(visitNotes?.content_json.customer_visible_summary) ||
        stringValue(formalDocumentBackfill.current_business_process),
      evidence_summary:
        stringValue(visitNotes?.content_json.customer_visible_summary) ||
        stringValue(formalDocumentBackfill.evidence_summary),
      project_background:
        stringValue(problemSummary?.content_json.business_context) ||
        stringValue(formalDocumentBackfill.project_background),
    };
  }
  if (spec.key === "requirements_scope") {
    return {
      pain_points:
        arrayOfStrings(problemSummary?.content_json.pain_points).length > 0
          ? arrayOfStrings(problemSummary?.content_json.pain_points)
          : formalDocumentBackfill.pain_points,
      requirement_goals:
        stringValue(problemSummary?.content_json.problem_statement) ||
        stringValue(formalDocumentBackfill.requirement_goals),
      out_of_scope: formalDocumentBackfill.out_of_scope,
    };
  }
  if (spec.key === "requirements_acceptance") {
    return {
      acceptance_criteria:
        arrayOfStrings(problemSummary?.content_json.success_criteria).length > 0
          ? arrayOfStrings(problemSummary?.content_json.success_criteria)
          : formalDocumentBackfill.acceptance_criteria,
      constraints:
        arrayOfStrings(visitNotes?.content_json.risks_and_questions).length > 0
          ? arrayOfStrings(visitNotes?.content_json.risks_and_questions)
          : formalDocumentBackfill.constraints,
      open_questions:
        arrayOfStrings(problemSummary?.content_json.unconfirmed_questions).length > 0
          ? arrayOfStrings(problemSummary?.content_json.unconfirmed_questions)
          : formalDocumentBackfill.open_questions,
    };
  }
  if (spec.key === "feasibility_data") {
    return {
      data_feasibility_conclusion: "needs_supplement",
      data_gaps:
        arrayOfStrings(visitNotes?.content_json.risks_and_questions).length > 0
          ? arrayOfStrings(visitNotes?.content_json.risks_and_questions)
          : formalDocumentBackfill.data_gaps,
      data_sources: formalDocumentBackfill.data_sources ?? [],
      data_quality_assessment: stringValue(formalDocumentBackfill.data_quality_assessment),
    };
  }
  if (spec.key === "feasibility_technical") {
    return {
      ai_capable_scope:
        stringValue(requirements?.content_json.requirement_goals) ||
        stringValue(formalDocumentBackfill.ai_capable_scope),
      ai_limitations: formalDocumentBackfill.ai_limitations,
      technical_feasibility_conclusion: "conditional",
      technical_risks: formalDocumentBackfill.technical_risks ?? [],
    };
  }
  if (spec.key === "feasibility_value") {
    return {
      expected_benefits: stringValue(formalDocumentBackfill.expected_benefits),
      implementation_cost: stringValue(formalDocumentBackfill.implementation_cost),
      overall_recommendation: "adjust_scope",
      roi_conclusion: "conditional",
    };
  }
  if (spec.key === "technical_route") {
    return {
      agent_type: "workflow",
      agent_type_rationale: stringValue(formalDocumentBackfill.agent_type_rationale),
      knowledge_base_rationale: stringValue(formalDocumentBackfill.knowledge_base_rationale),
      knowledge_base_strategy: "structured",
    };
  }
  if (spec.key === "technical_flow") {
    return {
      data_flow: stringValue(formalDocumentBackfill.data_flow),
      deployment_option: "local_demo",
      deployment_rationale:
        stringValue(formalDocumentBackfill.deployment_rationale) ||
        "MVP 先用本地演示验证流程，不接生产系统。",
    };
  }
  if (spec.key === "technical_handoff") {
    const stageThreeStartingPoint = [
      ...arrayOfStrings(feasibility?.content_json.data_sources),
      ...arrayOfStrings(feasibility?.content_json.data_gaps),
    ];
    const technicalRisks = arrayOfStrings(feasibility?.content_json.technical_risks);
    return {
      stage_four_build_plan:
        stringValue(feasibility?.content_json.ai_capable_scope) ||
        stringValue(formalDocumentBackfill.stage_four_build_plan),
      stage_three_starting_point:
        stageThreeStartingPoint.length > 0
          ? stageThreeStartingPoint
          : formalDocumentBackfill.stage_three_starting_point,
      technical_risks:
        technicalRisks.length > 0
          ? technicalRisks
          : formalDocumentBackfill.technical_risks,
    };
  }
  return {};
}

function toStudentResponses(
  spec: StageTwoSectionSpec,
  draft: Record<string, string>,
): Record<string, unknown> {
  const responses: Record<string, unknown> = {};
  for (const field of spec.fields) {
    const value = draft[field.key] ?? "";
    responses[field.key] = listResponseFields.has(field.key) ? lines(value) : value.trim();
  }
  return responses;
}

function isSectionDraftReady(spec: StageTwoSectionSpec, draft: Record<string, string>): boolean {
  return spec.fields
    .filter((field) => field.required)
    .every((field) => hasText(draft[field.key] ?? ""));
}

function fieldValueForInput(
  key: string,
  value: unknown,
  field: StageTwoSectionSpec["fields"][number],
): string {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeProductText(String(item))).filter(Boolean).join("\n");
  }
  if (typeof value === "string" && value.trim()) {
    return sanitizeProductText(value);
  }
  return field.options?.[0]?.[0] ?? "";
}

function sectionSpec(sectionKey: StageTwoSectionKey): StageTwoSectionSpec {
  const spec = stageTwoSectionSpecs.find((item) => item.key === sectionKey);
  if (!spec) {
    return stageTwoSectionSpecs[0];
  }
  return spec;
}

function latestStageOneArtifact(artifacts: Artifact[], artifactType: string): Artifact | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === artifactType)
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null
  );
}

function evidenceTitle(artifact: Artifact): string {
  const map: Record<string, string> = {
    stage_1_interview_turn: "客户访谈",
    stage_1_problem_summary: "问题发现总结",
    stage_1_visit_notes: "拜访间整理",
  };
  return map[artifact.artifact_type] ?? artifact.title;
}

function evidenceSummary(artifact: Artifact): string {
  const content = artifact.content_json;
  return (
    stringValue(content.problem_statement) ||
    stringValue(content.customer_visible_summary) ||
    stringValue(content.ai_customer_response) ||
    stringValue(content.review_summary) ||
    artifact.title
  );
}

function reviewJudgementCopy(value: string): string {
  const map: Record<string, string> = {
    approved: "通过",
    blocked: "红灯阻塞",
    conditional_pass: "附条件通过",
    红灯阻塞: "红灯阻塞",
    附条件通过: "附条件通过",
    通过: "通过",
  };
  return map[value] ?? "待人工复核";
}

function reviewJudgementTone(value: string): "success" | "warning" | "danger" | "info" {
  if (value === "approved" || value === "通过") {
    return "success";
  }
  if (value === "blocked" || value === "红灯阻塞") {
    return "danger";
  }
  if (value === "conditional_pass" || value === "附条件通过") {
    return "warning";
  }
  return "info";
}

function impactStageCopy(stageKey: string): string {
  const map: Record<string, string> = {
    stage_2: "本阶段回应",
    stage_3: "阶段三回应",
    stage_4: "阶段四回应",
    stage_5: "阶段五回应",
  };
  return map[stageKey] ?? "后续回应";
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function hasFlags(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function arrayOfStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeProductText(String(item))).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return lines(value).map(sanitizeProductText);
  }
  return [];
}

function arrayOfRecords(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is Record<string, unknown> => typeof item === "object" && item !== null,
  );
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? sanitizeProductText(value) : "";
}

function compareArtifactsByCreatedAt(left: Artifact, right: Artifact): number {
  return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
}
