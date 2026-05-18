"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileText,
  HelpCircle,
  MessageSquareText,
  RefreshCw,
  Save,
  SearchCheck,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type {
  Artifact,
  StageTwoDocumentKey,
  StageTwoSectionDraftPayload,
  StageTwoSectionKey,
} from "@/src/lib/api";

import {
  createStageTwoProgressItems,
  createStageTwoSectionProgressItems,
  latestStageTwoDocumentArtifact,
  latestStageTwoDocumentReview,
  latestStageTwoSectionDraft,
  latestStageTwoSectionReview,
  latestStageTwoSectionSubmission,
  stageTwoCanCompleteWithFormalDocs,
  stageTwoCanComposeDocument,
  stageTwoDocumentLabels,
  stageTwoDocumentSections,
  stageTwoSectionSpecs,
  summarizeStageTwoYellowFlags,
  type StageTwoMode,
  type StageTwoProgressItem,
  type StageTwoSectionSpec,
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

const documentOrder: StageTwoDocumentKey[] = [
  "requirements_document",
  "feasibility_report",
  "technical_solution",
];

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
  const [activeDocument, setActiveDocument] =
    useState<StageTwoDocumentKey>("requirements_document");
  const [activeSection, setActiveSection] =
    useState<StageTwoSectionKey>("requirements_context");
  const [draftState, setDraftState] = useState<DraftState>(initialDraftState);
  const currentDraftState =
    draftState.sourceKey === sourceKey ? draftState : initialDraftState;
  const activeSpec = sectionSpec(activeSection);
  const activeDocumentProgress = progressItems.find((item) => item.key === activeDocument);
  const documentLocked =
    locked || completed || activeDocumentProgress?.state === "locked";
  const sectionProgressItems = useMemo(
    () => createStageTwoSectionProgressItems(artifacts, activeDocument, documentLocked),
    [artifacts, activeDocument, documentLocked],
  );
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
  const activeDraft = currentDraftState.drafts[activeSection];
  const activeEvidence = currentDraftState.evidence[activeSection];
  const activeReflection = currentDraftState.reflections[activeSection];
  const sectionReady = isSectionDraftReady(activeSpec, activeDraft);
  const canSaveDraft = !documentLocked && sectionReady;
  const canRequestSectionReview =
    !documentLocked && activeDraftArtifact !== null && activeSubmission === null;
  const canSubmitSection =
    !documentLocked &&
    activeSubmission === null &&
    activeSectionReview?.content_json.can_submit === true &&
    !hasFlags(activeSectionReview?.content_json.red_flags);
  const canComposeDocument =
    !documentLocked && stageTwoCanComposeDocument(artifacts, activeDocument);
  const canRequestDocumentReview =
    !locked && !completed && activeDocumentArtifact !== null;
  const canComplete =
    !locked && !completed && stageTwoCanCompleteWithFormalDocs(artifacts);

  function switchDocument(documentKey: StageTwoDocumentKey) {
    setActiveDocument(documentKey);
    setActiveSection(stageTwoDocumentSections[documentKey][0]);
  }

  function updateField(fieldKey: string, value: string) {
    setDraftState({
      ...currentDraftState,
      drafts: {
        ...currentDraftState.drafts,
        [activeSection]: {
          ...currentDraftState.drafts[activeSection],
          [fieldKey]: value,
        },
      },
      sourceKey,
    });
  }

  function updateReflection(value: string) {
    setDraftState({
      ...currentDraftState,
      reflections: {
        ...currentDraftState.reflections,
        [activeSection]: value,
      },
      sourceKey,
    });
  }

  function toggleEvidence(artifactId: string) {
    const current = currentDraftState.evidence[activeSection];
    setDraftState({
      ...currentDraftState,
      evidence: {
        ...currentDraftState.evidence,
        [activeSection]: current.includes(artifactId)
          ? current.filter((id) => id !== artifactId)
          : [...current, artifactId],
      },
      sourceKey,
    });
  }

  async function handleSaveDraft() {
    if (!canSaveDraft) {
      return;
    }
    await onSaveSectionDraft({
      document_type: activeDocument,
      evidence_artifact_ids: activeEvidence,
      section_key: activeSection,
      student_reflection: activeReflection.trim() || undefined,
      student_responses: toStudentResponses(activeSpec, activeDraft),
    });
  }

  if (workspaceMode === "home") {
    return (
      <StageTwoHome
        isRefreshing={isRefreshing}
        locked={locked}
        onOpenWorkbench={() => onModeChange("guided_workbench")}
        onRefresh={onRefresh}
        progressItems={progressItems}
        statusLabel={status.label}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <StageTwoFocusedHeader
        isRefreshing={isRefreshing}
        onBack={() => onModeChange("home")}
        onRefresh={onRefresh}
        statusLabel={status.label}
      />

      {locked ? (
        <EmptyState title="阶段二尚未解锁">
          完成阶段一正式客户拜访、拜访间整理、问题总结和综合评估后，方案工作台会自动开启。
        </EmptyState>
      ) : null}

      <section className="grid min-w-0 gap-5 xl:grid-cols-[260px_minmax(620px,1fr)_340px] 2xl:grid-cols-[280px_minmax(720px,1fr)_360px]">
        <aside className="self-start rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(26,33,44,.06)] xl:sticky xl:top-4">
          <p className="text-xs font-extrabold text-slate-500">三份文档串行</p>
          <div className="mt-3 grid gap-2">
            {documentOrder.map((documentKey) => {
              const item = progressItems.find((progressItem) => progressItem.key === documentKey);
              return (
                <button
                  className={`rounded-2xl border p-3 text-left transition ${
                    activeDocument === documentKey
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-white hover:border-emerald-200"
                  }`}
                  key={documentKey}
                  onClick={() => switchDocument(documentKey)}
                  type="button"
                >
                  <p className="text-sm font-extrabold text-slate-900">
                    {stageTwoDocumentLabels[documentKey]}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {item?.meta ?? "待开始"}
                  </p>
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-xs font-extrabold text-slate-500">当前文档小节</p>
          <div className="mt-3 grid gap-2">
            {sectionProgressItems.map((item) => (
              <button
                className={`rounded-2xl border p-3 text-left transition ${
                  activeSection === item.key
                    ? "border-slate-900 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                }`}
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                type="button"
              >
                <p className="text-sm font-extrabold">{item.label}</p>
                <p
                  className={`mt-1 text-xs font-bold ${
                    activeSection === item.key ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {item.meta}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <main className="min-w-0">
          <article className="mx-auto max-w-[940px] rounded-[10px] border border-slate-200 bg-white px-5 py-6 shadow-[0_18px_50px_rgba(26,33,44,.08)] sm:px-8 lg:px-10">
            <div className="border-b border-slate-200 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={stageTwoDocumentLabels[activeDocument]} tone="info" />
                <StatusBadge
                  label={documentLocked ? "暂不可编辑" : "小节学习中"}
                  tone={documentLocked ? "muted" : "success"}
                />
              </div>
              <p className="mt-5 text-xs font-extrabold uppercase text-slate-400">
                {documentChapterLabel(activeDocument, activeSection)}
              </p>
              <h3 className="mt-2 text-2xl font-extrabold leading-tight text-slate-950">
                {activeSpec.title}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
                {activeSpec.learningGoal}
              </p>
            </div>

            <section className="mt-6 border-b border-slate-100 pb-6">
              <p className="text-xs font-extrabold text-emerald-700">本节合格标准</p>
              <ul className="mt-3 grid gap-2">
                {activeSpec.checkpoints.map((checkpoint) => (
                  <li className="flex gap-2 text-sm leading-6 text-emerald-950" key={checkpoint}>
                    <CheckCircle2 aria-hidden className="mt-1 shrink-0 text-emerald-600" size={15} />
                    <span>{checkpoint}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-7 grid gap-7">
              {activeSpec.fields.map((field) => (
                <GuidedField
                  disabled={documentLocked}
                  field={field}
                  key={field.key}
                  onChange={(value) => updateField(field.key, value)}
                  value={activeDraft[field.key] ?? ""}
                />
              ))}
              <label className="grid gap-2">
                <span className="text-base font-extrabold text-slate-900">自我检查</span>
                <textarea
                  className="min-h-28 resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 transition placeholder:text-slate-400 focus:border-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                  disabled={documentLocked}
                  onChange={(event) => updateReflection(event.target.value)}
                  placeholder="写一句：这一节最容易被追问的点是什么，你准备如何回应。"
                  rows={3}
                  value={activeReflection}
                />
              </label>
            </section>

            <EvidencePicker
              activeEvidence={activeEvidence}
              onToggle={toggleEvidence}
              stageOneArtifacts={stageOneArtifacts}
            />

            <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 lg:grid-cols-3">
              <ActionButton
                disabled={!canSaveDraft || isSavingSolution}
                icon={<Save aria-hidden size={16} />}
                label={isSavingSolution ? "保存中" : "保存小节草稿"}
                onClick={() => void handleSaveDraft()}
              />
              <ActionButton
                disabled={!canRequestSectionReview || isRequestingReview}
                icon={<HelpCircle aria-hidden size={16} />}
                label={isRequestingReview ? "追问中" : "请求 AI 追问"}
                onClick={() => void onRequestSectionReview(activeDocument, activeSection)}
                variant="secondary"
              />
              <ActionButton
                disabled={!canSubmitSection || isSavingSolution}
                icon={<Send aria-hidden size={16} />}
                label={isSavingSolution ? "提交中" : "提交小节"}
                onClick={() => void onSubmitSection(activeDocument, activeSection)}
                variant="dark"
              />
            </div>
          </article>
        </main>

        <ReviewAndEvidencePanel
          activeDocument={activeDocument}
          activeDocumentArtifact={activeDocumentArtifact}
          activeDocumentReview={activeDocumentReview}
          activeSection={activeSection}
          activeSectionReview={activeSectionReview}
          activeSubmission={activeSubmission}
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
      </section>
    </div>
  );
}

function StageTwoHome({
  isRefreshing,
  locked,
  onOpenWorkbench,
  onRefresh,
  progressItems,
  statusLabel,
}: {
  isRefreshing: boolean;
  locked: boolean;
  onOpenWorkbench: () => void;
  onRefresh: () => void;
  progressItems: StageTwoProgressItem[];
  statusLabel: string;
}) {
  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-[18px] bg-slate-950 p-6 text-white">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="阶段二主页" tone="success" />
              <StatusBadge label={statusLabel} tone="info" />
            </div>
            <h3 className="mt-5 max-w-4xl text-3xl font-extrabold leading-tight">
              先学会判断，再生成方案文档
            </h3>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
              每份文档拆成三个小节。学生先阅读判断标准，选择阶段一证据，回答关键问题，再让 AI 导师追问。小节通过后才汇入正式文档。
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

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {progressItems.map((item) => (
            <ProgressCard item={item} key={item.key} />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Sparkles aria-hidden className="mt-1 shrink-0 text-emerald-300" size={18} />
            <p className="text-sm leading-7 text-slate-300">
              正式操作区会隐藏五阶段主线，把页面宽度留给文档串行、章节撰写和 AI 门禁。
            </p>
          </div>
          <button
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-extrabold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={locked}
            onClick={onOpenWorkbench}
            type="button"
          >
            进入阶段二核心操作区
            <ArrowRight aria-hidden size={16} />
          </button>
        </div>
      </section>

      {locked ? (
        <EmptyState title="阶段二尚未解锁">
          完成阶段一正式客户拜访、拜访间整理、问题总结和综合评估后，方案工作台会自动开启。
        </EmptyState>
      ) : null}
    </div>
  );
}

function StageTwoFocusedHeader({
  isRefreshing,
  onBack,
  onRefresh,
  statusLabel,
}: {
  isRefreshing: boolean;
  onBack: () => void;
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
        返回阶段二主页
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label="阶段二核心操作区" tone="success" />
        <StatusBadge label={statusLabel} tone="info" />
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

function ProgressCard({ item }: { item: StageTwoProgressItem }) {
  const iconMap: Record<string, ReactNode> = {
    feasibility_report: <ShieldCheck aria-hidden size={18} />,
    requirements_document: <FileText aria-hidden size={18} />,
    stage_completion: <FileCheck2 aria-hidden size={18} />,
    technical_solution: <ClipboardList aria-hidden size={18} />,
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <div className="flex items-center gap-2 text-emerald-200">
        {iconMap[item.key]}
        <p className="text-xs font-extrabold">{item.label}</p>
      </div>
      <p className="mt-2 text-xl font-extrabold">{progressStateCopy(item.state)}</p>
      <p className="mt-1 text-xs font-bold text-slate-300">{item.meta}</p>
    </div>
  );
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
    const responses =
      (content?.student_responses as Record<string, unknown> | undefined) ??
      (content?.submitted_content as Record<string, unknown> | undefined) ??
      seededResponses(spec, artifacts, stageOneArtifacts);
    drafts[spec.key] = {};
    for (const field of spec.fields) {
      drafts[spec.key][field.key] = fieldValueForInput(field.key, responses[field.key], field);
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
  const problemSummary = latestStageOneArtifact(stageOneArtifacts, "stage_1_problem_summary");
  const visitNotes = latestStageOneArtifact(stageOneArtifacts, "stage_1_visit_notes");
  const requirements = latestStageTwoDocumentArtifact(artifacts, "requirements_document");
  const feasibility = latestStageTwoDocumentArtifact(artifacts, "feasibility_report");
  if (spec.key === "requirements_context") {
    return {
      current_business_process:
        stringValue(problemSummary?.content_json.business_context) ||
        stringValue(visitNotes?.content_json.customer_visible_summary),
      evidence_summary: stringValue(visitNotes?.content_json.customer_visible_summary),
      project_background: stringValue(problemSummary?.content_json.business_context),
    };
  }
  if (spec.key === "requirements_scope") {
    return {
      pain_points: arrayOfStrings(problemSummary?.content_json.pain_points),
      requirement_goals: stringValue(problemSummary?.content_json.problem_statement),
    };
  }
  if (spec.key === "requirements_acceptance") {
    return {
      acceptance_criteria: arrayOfStrings(problemSummary?.content_json.success_criteria),
      constraints: arrayOfStrings(visitNotes?.content_json.risks_and_questions),
      open_questions: arrayOfStrings(problemSummary?.content_json.unconfirmed_questions),
    };
  }
  if (spec.key === "feasibility_data") {
    return {
      data_feasibility_conclusion: "needs_supplement",
      data_gaps: arrayOfStrings(visitNotes?.content_json.risks_and_questions),
      data_sources: [],
      data_quality_assessment: "",
    };
  }
  if (spec.key === "feasibility_technical") {
    return {
      ai_capable_scope: stringValue(requirements?.content_json.requirement_goals),
      ai_limitations: "",
      technical_feasibility_conclusion: "conditional",
      technical_risks: [],
    };
  }
  if (spec.key === "feasibility_value") {
    return {
      expected_benefits: "",
      implementation_cost: "",
      overall_recommendation: "adjust_scope",
      roi_conclusion: "conditional",
    };
  }
  if (spec.key === "technical_route") {
    return {
      agent_type: "workflow",
      agent_type_rationale: "",
      knowledge_base_rationale: "",
      knowledge_base_strategy: "structured",
    };
  }
  if (spec.key === "technical_flow") {
    return {
      data_flow: "",
      deployment_option: "local_demo",
      deployment_rationale: "MVP 先用本地演示验证流程，不接生产系统。",
    };
  }
  if (spec.key === "technical_handoff") {
    return {
      stage_four_build_plan: stringValue(feasibility?.content_json.ai_capable_scope),
      stage_three_starting_point: [
        ...arrayOfStrings(feasibility?.content_json.data_sources),
        ...arrayOfStrings(feasibility?.content_json.data_gaps),
      ],
      technical_risks: arrayOfStrings(feasibility?.content_json.technical_risks),
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

function progressStateCopy(value: string): string {
  const map: Record<string, string> = {
    active: "进行中",
    done: "已完成",
    locked: "未解锁",
    ready: "可开始",
  };
  return map[value] ?? "待开始";
}

function documentChapterLabel(
  documentKey: StageTwoDocumentKey,
  sectionKey: StageTwoSectionKey,
): string {
  const documentIndex = documentOrder.indexOf(documentKey) + 1;
  const sectionIndex = stageTwoDocumentSections[documentKey].indexOf(sectionKey) + 1;
  return `第 ${documentIndex} 份文档 / 第 ${sectionIndex} 章`;
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
