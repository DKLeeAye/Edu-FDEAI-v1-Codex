"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
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
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

import type {
  Artifact,
  StageThreeCaseStudyRecordPayload,
  StageThreeKnowledgeDecisionPayload,
  StageThreeLabExperimentRecordPayload,
  StageThreeKnowledgeStrategy,
} from "@/src/lib/api";

import {
  createStageThreeEntryItems,
  type StageThreeEntryItem,
  type StageThreeMode,
} from "./stage-three-flow";
import { StageThreeCaseTeaching } from "./stage-three-case-teaching-view";
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
import { StageThreeRagLab } from "./stage-three-rag-lab-view";
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
  isSavingCaseRecord,
  isSavingDecision,
  isSavingLabRecord,
  onCompleteStage,
  onModeChange,
  onRefresh,
  onRequestReview,
  onSaveCaseStudyRecord,
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
  const latestCaseStudyArtifact = useMemo(
    () => latestArtifactOfType(artifacts, "stage_3_case_study_record"),
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
  const entryItems = useMemo(
    () => createStageThreeEntryItems(artifacts, stageStatus),
    [artifacts, stageStatus],
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
    await onSaveDecision(createProjectDecisionPayload(draft));
  }

  if (workspaceMode === "home") {
    return (
      <StageThreeHome
        completed={completed}
        entries={entryItems}
        isRefreshing={isRefreshing}
        onModeChange={onModeChange}
        onRefresh={onRefresh}
        reviewReady={latestReviewArtifact !== null}
        statusLabel={status.label}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <StageThreeFocusedHeader
        mode={workspaceMode}
        onBack={() => onModeChange("home")}
        statusLabel={status.label}
      />

      {workspaceMode === "case_teaching" ? (
        <StageThreeCaseTeaching
          disabled={locked || completed}
          isSavingRecord={isSavingCaseRecord}
          onSaveRecord={onSaveCaseStudyRecord}
          recordSaved={latestCaseStudyArtifact !== null}
        />
      ) : workspaceMode === "knowledge_lab" ? (
        <StageThreeRagLab
          disabled={locked || completed}
          isSavingRecord={isSavingLabRecord}
          onSaveRecord={onSaveLabExperimentRecord}
          readiness={readiness}
          recordSaved={latestLabExperimentArtifact !== null}
        />
      ) : workspaceMode === "project_decision" ? (
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

function StageThreeHome({
  completed,
  entries,
  isRefreshing,
  onModeChange,
  onRefresh,
  reviewReady,
  statusLabel,
}: {
  completed: boolean;
  entries: StageThreeEntryItem[];
  isRefreshing: boolean;
  onModeChange: (mode: StageThreeMode) => void;
  onRefresh: () => void;
  reviewReady: boolean;
  statusLabel: string;
}) {
  const doneCount = entries.filter((entry) => entry.state === "done").length;

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-[18px] bg-slate-950 p-6 text-white">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="阶段三主页" tone="success" />
              <StatusBadge label={statusLabel} tone="info" />
            </div>
            <h3 className="mt-5 max-w-4xl text-3xl font-extrabold leading-tight">
              知识工程决策中心
            </h3>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
              先通过预置案例建立判断，再进入五层实验室观察策略差异，最后把实验结论迁移为项目决策和风险预判。
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

        <div className="mt-6 grid gap-4 xl:grid-cols-4">
          {entries.map((entry) => (
            <StageThreeEntryCard
              entry={entry}
              icon={entryIcon(entry.key)}
              key={entry.key}
              onClick={() => onModeChange(entry.key)}
            />
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <StepCard
            icon={<BookOpen aria-hidden size={18} />}
            label="案例教学"
            value={entryMeta(entries, "case_teaching")}
          />
          <StepCard
            icon={<SplitSquareHorizontal aria-hidden size={18} />}
            label="实验推进"
            value={entryMeta(entries, "knowledge_lab")}
          />
          <StepCard
            icon={<ClipboardList aria-hidden size={18} />}
            label="决策文档"
            value={entryMeta(entries, "project_decision")}
          />
          <StepCard
            icon={<FileCheck2 aria-hidden size={18} />}
            label="阶段收口"
            value={completed ? "已完成" : reviewReady ? "已评审" : `${doneCount} / ${entries.length}`}
          />
        </div>
      </section>

      <StageThreeProgressOverview entries={entries} />
    </div>
  );
}

function StageThreeEntryCard({
  entry,
  icon,
  onClick,
}: {
  entry: StageThreeEntryItem;
  icon: ReactNode;
  onClick: () => void;
}) {
  const state = entryStateCopy(entry.state);
  const primary = entry.key === "knowledge_lab" || entry.key === "project_decision";
  return (
    <article
      className={`flex min-h-[230px] flex-col rounded-[18px] border p-5 ${
        primary ? "border-emerald-400/50 bg-emerald-400/15" : "border-white/15 bg-white/10"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/12 text-emerald-200">
          {icon}
        </span>
        <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${state.badgeClass}`}>
          {entry.meta}
        </span>
      </div>
      <h4 className="mt-5 text-lg font-extrabold leading-snug">{entry.label}</h4>
      <p className="mt-3 flex-1 text-sm leading-7 text-slate-300">{entry.description}</p>
      <div className="mt-4 text-xs font-extrabold text-slate-400">{entry.evidenceLabel}</div>
      <button
        className={`mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${
          primary
            ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
            : "border border-white/15 bg-white/10 text-white hover:bg-white/15"
        }`}
        disabled={entry.state === "locked"}
        onClick={onClick}
        type="button"
      >
        进入
        <ArrowRight aria-hidden size={16} />
      </button>
    </article>
  );
}

function StageThreeProgressOverview({ entries }: { entries: StageThreeEntryItem[] }) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">阶段三路径总览</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            学习、实验、项目决策和文档收口分别沉淀不同证据。
          </p>
        </div>
        <StatusBadge label="四入口推进" tone="info" />
      </div>
      <div className="mt-4 grid gap-3">
        {entries.map((entry, index) => {
          const state = entryStateCopy(entry.state);
          return (
            <article
              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[44px_1fr_auto]"
              key={entry.key}
            >
              <span className={`grid h-11 w-11 place-items-center rounded-2xl text-sm font-extrabold ${state.iconClass}`}>
                {index + 1}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-extrabold text-slate-950">{entry.label}</h4>
                  <StatusBadge label={state.label} tone={state.tone} />
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500">{entry.description}</p>
              </div>
              <span className="self-start rounded-full bg-white px-3 py-2 text-xs font-extrabold text-slate-500">
                {entry.evidenceLabel}
              </span>
            </article>
          );
        })}
      </div>
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
        返回阶段三主页
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
          <h3 className="mt-4 text-2xl font-extrabold leading-tight">
            风险预判与决策文档收口
          </h3>
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

function StepCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <div className="flex items-center gap-2 text-emerald-200">
        {icon}
        <p className="text-xs font-extrabold">{label}</p>
      </div>
      <p className="mt-2 text-sm font-extrabold text-white">{value}</p>
    </div>
  );
}

function entryMeta(entries: StageThreeEntryItem[], key: StageThreeEntryItem["key"]): string {
  return entries.find((entry) => entry.key === key)?.meta ?? "待开始";
}

function entryIcon(key: StageThreeEntryItem["key"]): ReactNode {
  const icons: Record<StageThreeEntryItem["key"], ReactNode> = {
    case_teaching: <BookOpen aria-hidden size={22} />,
    decision_document: <FileCheck2 aria-hidden size={22} />,
    knowledge_lab: <SplitSquareHorizontal aria-hidden size={22} />,
    project_decision: <ClipboardList aria-hidden size={22} />,
  };
  return icons[key];
}

function modeTitle(mode: StageThreeMode): string {
  const titles: Record<StageThreeMode, string> = {
    case_teaching: "预置案例教学",
    decision_document: "风险预判与决策文档",
    home: "阶段三主页",
    knowledge_lab: "五层知识实验室",
    project_decision: "项目知识工程决策",
  };
  return titles[mode];
}

function entryStateCopy(state: StageThreeEntryItem["state"]): {
  badgeClass: string;
  iconClass: string;
  label: string;
  tone: "danger" | "default" | "info" | "muted" | "success" | "warning";
} {
  const map = {
    active: {
      badgeClass: "bg-amber-300/20 text-amber-100",
      iconClass: "bg-amber-100 text-amber-700",
      label: "进行中",
      tone: "warning",
    },
    done: {
      badgeClass: "bg-emerald-300/20 text-emerald-100",
      iconClass: "bg-emerald-500 text-white",
      label: "已完成",
      tone: "success",
    },
    locked: {
      badgeClass: "bg-white/10 text-slate-300",
      iconClass: "bg-slate-100 text-slate-400",
      label: "未解锁",
      tone: "muted",
    },
    ready: {
      badgeClass: "bg-white/10 text-slate-100",
      iconClass: "bg-sky-100 text-sky-700",
      label: "可进入",
      tone: "info",
    },
  } as const;
  return map[state];
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
