"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileText,
  RefreshCw,
  Save,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

import type { Artifact, StageTwoSolutionDefinitionPayload } from "@/src/lib/api";

import { formatDateTime, sanitizeProductText, stageStatusCopy } from "./terminology";
import { EmptyState, StatusBadge } from "./ui";

type StageTwoWorkspaceProps = {
  artifacts: Artifact[];
  isCompletingStage: boolean;
  isRefreshing: boolean;
  isRequestingReview: boolean;
  isSavingSolution: boolean;
  onCompleteStage: () => Promise<boolean>;
  onRefresh: () => void;
  onRequestReview: () => Promise<boolean>;
  onSaveSolution: (payload: StageTwoSolutionDefinitionPayload) => Promise<boolean>;
  stageOneArtifacts: Artifact[];
  stageStatus?: string;
};

type SolutionDraft = {
  dataSources: string;
  expectedValue: string;
  feasibilityRisks: string;
  problemSummary: string;
  proposedAgentCapability: string;
  solutionTitle: string;
  targetWorkflow: string;
  toolOrSystemDependencies: string;
};

type DocumentReadiness = {
  ready: boolean;
  title: string;
  value: string;
};

const emptyDraft: SolutionDraft = {
  dataSources: "",
  expectedValue: "",
  feasibilityRisks: "",
  problemSummary: "",
  proposedAgentCapability: "",
  solutionTitle: "",
  targetWorkflow: "",
  toolOrSystemDependencies: "",
};

export function StageTwoWorkspace({
  artifacts,
  isCompletingStage,
  isRefreshing,
  isRequestingReview,
  isSavingSolution,
  onCompleteStage,
  onRefresh,
  onRequestReview,
  onSaveSolution,
  stageOneArtifacts,
  stageStatus,
}: StageTwoWorkspaceProps) {
  const status = stageStatusCopy(stageStatus);
  const locked = stageStatus === "locked";
  const completed = stageStatus === "completed";
  const latestSolutionArtifact = useMemo(
    () => latestArtifactOfType(artifacts, "stage_2_solution_definition"),
    [artifacts],
  );
  const latestReviewArtifact = useMemo(
    () => latestArtifactOfType(artifacts, "stage_2_ai_review"),
    [artifacts],
  );
  const latestStageOneSummary = useMemo(
    () => latestArtifactOfType(stageOneArtifacts, "stage_1_problem_summary"),
    [stageOneArtifacts],
  );
  const sourceArtifactId = latestSolutionArtifact?.id ?? latestStageOneSummary?.id ?? "fallback";
  const sourceDraft = useMemo(
    () =>
      latestSolutionArtifact
        ? draftFromSolutionArtifact(latestSolutionArtifact)
        : draftFromStageOneSummary(latestStageOneSummary),
    [latestSolutionArtifact, latestStageOneSummary],
  );
  const [draftState, setDraftState] = useState<{
    draft: SolutionDraft;
    sourceArtifactId: string;
  }>({
    draft: sourceDraft,
    sourceArtifactId,
  });
  const draft = draftState.sourceArtifactId === sourceArtifactId ? draftState.draft : sourceDraft;
  const readiness = useMemo(() => createReadiness(draft), [draft]);
  const canSave = readiness.every((item) => item.ready);
  const canReview = latestSolutionArtifact !== null && !locked && !completed;
  const canComplete = latestSolutionArtifact !== null && latestReviewArtifact !== null && !locked && !completed;

  function updateDraft(patch: Partial<SolutionDraft>) {
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
    await onSaveSolution({
      data_sources: lines(draft.dataSources),
      expected_value: draft.expectedValue.trim(),
      feasibility_risks: lines(draft.feasibilityRisks),
      problem_summary: draft.problemSummary.trim(),
      proposed_agent_capability: draft.proposedAgentCapability.trim(),
      solution_title: draft.solutionTitle.trim(),
      target_workflow: draft.targetWorkflow.trim(),
      tool_or_system_dependencies: lines(draft.toolOrSystemDependencies),
    });
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[18px] bg-slate-950 p-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="阶段二工作区" tone="success" />
              <StatusBadge label={status.label} tone={status.tone} />
            </div>
            <h3 className="mt-4 text-2xl font-extrabold leading-tight">
              把客户问题转化为可执行方案
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
              本阶段按“需求文档、可行性报告、总体技术方案”滚动推进。先写清楚问题和价值，再确认数据、技术和后续构建路线。
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

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <StepCard
            icon={<FileText aria-hidden size={18} />}
            label="需求文档"
            value={readiness[0]?.ready ? "已成稿" : "待补充"}
          />
          <StepCard
            icon={<ShieldCheck aria-hidden size={18} />}
            label="可行性报告"
            value={readiness[1]?.ready ? "已成稿" : "待判断"}
          />
          <StepCard
            icon={<ClipboardList aria-hidden size={18} />}
            label="总体技术方案"
            value={readiness[2]?.ready ? "已成稿" : "待定义"}
          />
          <StepCard
            icon={<FileCheck2 aria-hidden size={18} />}
            label="评审记录"
            value={latestReviewArtifact ? "已生成" : "待评审"}
          />
        </div>
      </section>

      {locked ? (
        <EmptyState title="阶段二尚未解锁">
          完成阶段一的问题发现总结后，方案定义工作区会自动开启。
        </EmptyState>
      ) : null}

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
        <SolutionDocumentEditor
          canSave={canSave}
          completed={completed}
          draft={draft}
          isSaving={isSavingSolution}
          locked={locked}
          onChange={updateDraft}
          onSubmit={handleSave}
          readiness={readiness}
          sourceSummary={latestStageOneSummary}
        />
        <FeasibilityReviewPanel
          canComplete={canComplete}
          canReview={canReview}
          completed={completed}
          isCompleting={isCompletingStage}
          isRequestingReview={isRequestingReview}
          latestReviewArtifact={latestReviewArtifact}
          latestSolutionArtifact={latestSolutionArtifact}
          onCompleteStage={onCompleteStage}
          onRequestReview={onRequestReview}
        />
      </section>
    </div>
  );
}

function SolutionDocumentEditor({
  canSave,
  completed,
  draft,
  isSaving,
  locked,
  onChange,
  onSubmit,
  readiness,
  sourceSummary,
}: {
  canSave: boolean;
  completed: boolean;
  draft: SolutionDraft;
  isSaving: boolean;
  locked: boolean;
  onChange: (patch: Partial<SolutionDraft>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readiness: DocumentReadiness[];
  sourceSummary: Artifact | null;
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">方案文档工作台</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            三份文档会合并保存为当前阶段的方案定义，后续评审和阶段三会继承这些判断。
          </p>
        </div>
        <StatusBadge
          label={
            locked
              ? "待解锁"
              : completed
                ? "已完成"
                : readiness.every((item) => item.ready)
                  ? "可提交评审"
                  : "待补齐"
          }
          tone={
            completed
              ? "success"
              : locked
                ? "muted"
                : readiness.every((item) => item.ready)
                  ? "success"
                  : "warning"
          }
        />
      </div>

      {sourceSummary ? (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
          <p className="text-xs font-extrabold text-emerald-700">承接阶段一的问题判断</p>
          <p className="mt-2 text-sm leading-6 text-emerald-900">
            {stringValue(sourceSummary.content_json.problem_statement) || "阶段一问题发现总结已保存。"}
          </p>
        </div>
      ) : null}

      <form className="mt-5 grid gap-5" onSubmit={onSubmit}>
        <DocumentSection
          description="面向客户，用业务语言说明问题、目标流程和初步验收场景。"
          icon={<FileText aria-hidden size={18} />}
          ready={readiness[0]?.ready ?? false}
          title="需求文档"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <DocumentField
              disabled={locked || completed}
              label="项目 / 方案名称"
              onChange={(value) => onChange({ solutionTitle: value })}
              placeholder="例如：质检追溯 AI 助手"
              required
              value={draft.solutionTitle}
            />
            <DocumentField
              disabled={locked || completed}
              label="核心问题与需求目标"
              onChange={(value) => onChange({ problemSummary: value })}
              placeholder="写清客户真正要解决的问题、服务对象和需求目标。"
              required
              rows={5}
              value={draft.problemSummary}
            />
          </div>
          <DocumentField
            disabled={locked || completed}
            label="目标业务流程与验收场景"
            onChange={(value) => onChange({ targetWorkflow: value })}
            placeholder="说明方案会嵌入哪个流程，以及什么情况算有效。"
            required
            rows={5}
            value={draft.targetWorkflow}
          />
        </DocumentSection>

        <DocumentSection
          description="面向内部团队，判断数据条件、风险和预期价值是否支撑继续投入。"
          icon={<ShieldCheck aria-hidden size={18} />}
          ready={readiness[1]?.ready ?? false}
          title="可行性报告"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <DocumentField
              disabled={locked || completed}
              label="数据来源"
              onChange={(value) => onChange({ dataSources: value })}
              placeholder="每行一个数据来源"
              required
              rows={5}
              value={draft.dataSources}
            />
            <DocumentField
              disabled={locked || completed}
              label="可行性风险"
              onChange={(value) => onChange({ feasibilityRisks: value })}
              placeholder="每行一个风险或待验证条件"
              required
              rows={5}
              value={draft.feasibilityRisks}
            />
          </div>
          <DocumentField
            disabled={locked || completed}
            label="预期价值与 ROI 判断"
            onChange={(value) => onChange({ expectedValue: value })}
            placeholder="说明为什么值得做，以及最小可验证价值。"
            required
            rows={4}
            value={draft.expectedValue}
          />
        </DocumentSection>

        <DocumentSection
          description="面向后续执行，定义智能体能力、工具依赖和阶段三 / 四的起点。"
          icon={<ClipboardList aria-hidden size={18} />}
          ready={readiness[2]?.ready ?? false}
          title="总体技术方案"
        >
          <DocumentField
            disabled={locked || completed}
            label="智能体核心能力"
            onChange={(value) => onChange({ proposedAgentCapability: value })}
            placeholder="说明智能体会回答、生成、检查或调用什么能力。"
            required
            rows={5}
            value={draft.proposedAgentCapability}
          />
          <DocumentField
            disabled={locked || completed}
            label="工具或系统依赖"
            onChange={(value) => onChange({ toolOrSystemDependencies: value })}
            placeholder="每行一个依赖系统、外部工具或人工前置条件"
            required
            rows={4}
            value={draft.toolOrSystemDependencies}
          />
        </DocumentSection>

        <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-slate-500">
            {completed
              ? "阶段二已经完成，文档会作为阶段三知识工程决策的输入。"
              : canSave
                ? "三份文档已具备最小内容，可以保存并生成可行性评审。"
                : "补齐带星号的内容后再保存。"}
          </p>
          <button
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={locked || completed || isSaving || !canSave}
            type="submit"
          >
            <Save aria-hidden size={16} />
            {isSaving ? "保存中" : "保存方案文档"}
          </button>
        </div>
      </form>
    </section>
  );
}

function FeasibilityReviewPanel({
  canComplete,
  canReview,
  completed,
  isCompleting,
  isRequestingReview,
  latestReviewArtifact,
  latestSolutionArtifact,
  onCompleteStage,
  onRequestReview,
}: {
  canComplete: boolean;
  canReview: boolean;
  completed: boolean;
  isCompleting: boolean;
  isRequestingReview: boolean;
  latestReviewArtifact: Artifact | null;
  latestSolutionArtifact: Artifact | null;
  onCompleteStage: () => Promise<boolean>;
  onRequestReview: () => Promise<boolean>;
}) {
  const review = latestReviewArtifact?.content_json;
  const judgement = stringValue(review?.feasibility_judgement);
  const risks = arrayOrString(review?.key_risks);
  const improvements = arrayOrString(review?.suggested_improvements);

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">可行性评审</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            评审会检查需求、数据、技术和价值是否一致，并把风险转化为后续验证任务。
          </p>
        </div>
        <StatusBadge
          label={latestReviewArtifact ? "已有评审" : latestSolutionArtifact ? "可评审" : "待保存"}
          tone={latestReviewArtifact ? "success" : latestSolutionArtifact ? "warning" : "muted"}
        />
      </div>

      <div className="mt-4 grid gap-3">
        <ReviewCheck label="保存方案文档" ready={latestSolutionArtifact !== null} />
        <ReviewCheck label="生成可行性评审" ready={latestReviewArtifact !== null} />
        <ReviewCheck label="确认风险与改进建议" ready={latestReviewArtifact !== null} />
        <ReviewCheck label="解锁知识工程决策" ready={completed} />
      </div>

      <button
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canReview || isRequestingReview}
        onClick={() => void onRequestReview()}
        type="button"
      >
        <SearchCheck aria-hidden size={16} />
        {isRequestingReview ? "评审生成中" : "生成可行性评审"}
      </button>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        {latestReviewArtifact ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={judgementCopy(judgement)} tone={judgementTone(judgement)} />
              <span className="text-xs font-bold text-slate-400">
                {formatDateTime(latestReviewArtifact.created_at)}
              </span>
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-500">评审摘要</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {sanitizeProductText(stringValue(review?.review_summary)) || "评审已生成。"}
              </p>
            </div>
            {risks.length > 0 ? <ReviewList icon="warning" items={risks} title="关键风险" /> : null}
            {improvements.length > 0 ? (
              <ReviewList icon="check" items={improvements} title="建议改进" />
            ) : null}
          </div>
        ) : (
          <EmptyState title="还没有可行性评审">
            保存三份方案文档后生成评审，用它检查需求、数据、技术路线和预期价值是否一致。
          </EmptyState>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
        {completed
          ? "阶段二已经完成。阶段三会基于这里的总体技术方案继续做知识工程决策。"
          : canComplete
            ? "方案文档和评审记录已就绪，可以确认阶段二完成并开启下一阶段。"
            : "完成方案文档并生成评审后，才能确认阶段二完成。"}
      </div>

      <button
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canComplete || isCompleting}
        onClick={() => void onCompleteStage()}
        type="button"
      >
        <CheckCircle2 aria-hidden size={16} />
        {completed ? "阶段二已完成" : isCompleting ? "确认中" : "完成阶段二并解锁阶段三"}
      </button>
    </section>
  );
}

function DocumentSection({
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

function DocumentField({
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

function StepCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <div className="flex items-center gap-2 text-emerald-200">
        {icon}
        <p className="text-xs font-extrabold">{label}</p>
      </div>
      <p className="mt-2 text-xl font-extrabold">{value}</p>
    </div>
  );
}

function ReviewCheck({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
      <span
        className={`grid h-8 w-8 place-items-center rounded-full ${
          ready ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
        }`}
      >
        <CheckCircle2 aria-hidden size={16} />
      </span>
      <span className="text-sm font-bold text-slate-700">{label}</span>
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

function createReadiness(draft: SolutionDraft): DocumentReadiness[] {
  return [
    {
      ready: hasText(draft.solutionTitle) && hasText(draft.problemSummary) && hasText(draft.targetWorkflow),
      title: "需求文档",
      value: "问题、目标和验收场景",
    },
    {
      ready: lines(draft.dataSources).length > 0 && lines(draft.feasibilityRisks).length > 0 && hasText(draft.expectedValue),
      title: "可行性报告",
      value: "数据、风险和价值判断",
    },
    {
      ready: hasText(draft.proposedAgentCapability) && lines(draft.toolOrSystemDependencies).length > 0,
      title: "总体技术方案",
      value: "能力、依赖和执行路线",
    },
  ];
}

function draftFromSolutionArtifact(artifact: Artifact): SolutionDraft {
  const content = artifact.content_json;
  return {
    dataSources: arrayOrString(content.data_sources).join("\n"),
    expectedValue: stringValue(content.expected_value),
    feasibilityRisks: arrayOrString(content.feasibility_risks).join("\n"),
    problemSummary: stringValue(content.problem_summary),
    proposedAgentCapability: stringValue(content.proposed_agent_capability),
    solutionTitle: stringValue(content.solution_title),
    targetWorkflow: stringValue(content.target_workflow),
    toolOrSystemDependencies: arrayOrString(content.tool_or_system_dependencies).join("\n"),
  };
}

function draftFromStageOneSummary(artifact: Artifact | null): SolutionDraft {
  if (!artifact) {
    return emptyDraft;
  }
  const content = artifact.content_json;
  const painPoints = arrayOrString(content.pain_points);
  const successCriteria = arrayOrString(content.success_criteria);
  return {
    ...emptyDraft,
    problemSummary:
      stringValue(content.problem_statement) ||
      painPoints.slice(0, 2).join("；") ||
      emptyDraft.problemSummary,
    targetWorkflow:
      successCriteria.length > 0
        ? `围绕${stringValue(content.target_user) || "目标用户"}完成质检追溯支持，验收标准包括：${successCriteria.join("；")}。`
        : emptyDraft.targetWorkflow,
  };
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

function judgementCopy(value: string): string {
  const map: Record<string, string> = {
    approved: "通过",
    conditional_pass: "附条件通过",
    needs_revision_review: "需要补充后通过",
    rejected: "阻塞修改",
  };
  return map[value] ?? "待人工复核";
}

function judgementTone(value: string): "success" | "warning" | "danger" | "info" {
  if (value === "approved") {
    return "success";
  }
  if (value === "rejected") {
    return "danger";
  }
  if (value === "conditional_pass" || value === "needs_revision_review") {
    return "warning";
  }
  return "info";
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function arrayOrString(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeProductText(String(item)))
      .filter((item) => item.trim().length > 0);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return lines(value).map(sanitizeProductText);
  }
  return [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? sanitizeProductText(value) : "";
}
