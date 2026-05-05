"use client";

import {
  AlertTriangle,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  Database,
  FileCheck2,
  FileText,
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
  StageThreeKnowledgeDecisionPayload,
  StageThreeKnowledgeStrategy,
} from "@/src/lib/api";

import { formatDateTime, sanitizeProductText, stageStatusCopy } from "./terminology";
import { EmptyState, StatusBadge } from "./ui";

type StageThreeWorkspaceProps = {
  artifacts: Artifact[];
  isCompletingStage: boolean;
  isRefreshing: boolean;
  isRequestingReview: boolean;
  isSavingDecision: boolean;
  onCompleteStage: () => Promise<boolean>;
  onRefresh: () => void;
  onRequestReview: () => Promise<boolean>;
  onSaveDecision: (payload: StageThreeKnowledgeDecisionPayload) => Promise<boolean>;
  stageStatus?: string;
  stageTwoArtifacts: Artifact[];
};

type KnowledgeDecisionDraft = {
  chunkingDecision: string;
  dataQualityRisks: string;
  embeddingStorageDecision: string;
  evaluationPlan: string;
  knowledgeGoal: string;
  maintenancePlan: string;
  requiredKnowledgeTypes: string;
  retrievalDecision: string;
  selectedStrategy: StageThreeKnowledgeStrategy;
  sourceInventory: string;
  stage4BuildPlan: string;
  strategyRationale: string;
};

type LayerReadiness = {
  description: string;
  ready: boolean;
  title: string;
};

const emptyDraft: KnowledgeDecisionDraft = {
  chunkingDecision: "",
  dataQualityRisks: "",
  embeddingStorageDecision: "",
  evaluationPlan: "",
  knowledgeGoal: "",
  maintenancePlan: "",
  requiredKnowledgeTypes: "",
  retrievalDecision: "",
  selectedStrategy: "rag",
  sourceInventory: "",
  stage4BuildPlan: "",
  strategyRationale: "",
};

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
  onCompleteStage,
  onRefresh,
  onRequestReview,
  onSaveDecision,
  stageStatus,
  stageTwoArtifacts,
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
  const latestStageTwoSolution = useMemo(
    () => latestArtifactOfType(stageTwoArtifacts, "stage_2_solution_definition"),
    [stageTwoArtifacts],
  );
  const sourceArtifactId = latestDecisionArtifact?.id ?? latestStageTwoSolution?.id ?? "fallback";
  const sourceDraft = useMemo(
    () =>
      latestDecisionArtifact
        ? draftFromDecisionArtifact(latestDecisionArtifact)
        : draftFromStageTwoSolution(latestStageTwoSolution),
    [latestDecisionArtifact, latestStageTwoSolution],
  );
  const [draftState, setDraftState] = useState<{
    draft: KnowledgeDecisionDraft;
    sourceArtifactId: string;
  }>({
    draft: sourceDraft,
    sourceArtifactId,
  });
  const draft = draftState.sourceArtifactId === sourceArtifactId ? draftState.draft : sourceDraft;
  const readiness = useMemo(() => createReadiness(draft), [draft]);
  const canSave = readiness.every((item) => item.ready);
  const canReview = latestDecisionArtifact !== null && !locked && !completed;
  const canComplete =
    latestDecisionArtifact !== null && latestReviewArtifact !== null && !locked && !completed;

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
    await onSaveDecision({
      data_quality_risks: lines(draft.dataQualityRisks),
      evaluation_plan: draft.evaluationPlan.trim(),
      knowledge_goal: draft.knowledgeGoal.trim(),
      maintenance_plan: draft.maintenancePlan.trim(),
      required_knowledge_types: lines(draft.requiredKnowledgeTypes),
      selected_strategy: draft.selectedStrategy,
      source_inventory: lines(draft.sourceInventory),
      stage_4_build_plan: draft.stage4BuildPlan.trim(),
      strategy_rationale: buildStrategyRationale(draft),
    });
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[18px] bg-slate-950 p-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="阶段三工作区" tone="success" />
              <StatusBadge label={status.label} tone={status.tone} />
            </div>
            <h3 className="mt-4 text-2xl font-extrabold leading-tight">
              做出可执行的知识工程决策
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
              本阶段不搭建真实知识库，而是围绕数据准备、分块、向量化与存储、召回和评估形成阶段四的执行依据。
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

      {locked ? (
        <EmptyState title="阶段三尚未解锁">
          完成阶段二的方案文档和可行性评审后，知识工程决策工作区会自动开启。
        </EmptyState>
      ) : null}

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,.82fr)]">
        <KnowledgeDecisionEditor
          canSave={canSave}
          completed={completed}
          draft={draft}
          isSaving={isSavingDecision}
          latestStageTwoSolution={latestStageTwoSolution}
          locked={locked}
          onChange={updateDraft}
          onSubmit={handleSave}
          readiness={readiness}
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
        />
      </section>
    </div>
  );
}

function KnowledgeDecisionEditor({
  canSave,
  completed,
  draft,
  isSaving,
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
  latestStageTwoSolution: Artifact | null;
  locked: boolean;
  onChange: (patch: Partial<KnowledgeDecisionDraft>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readiness: LayerReadiness[];
}) {
  const stageTwoContent = latestStageTwoSolution?.content_json;
  const stageTwoSources = arrayOrString(stageTwoContent?.data_sources);
  const stageTwoRisks = arrayOrString(stageTwoContent?.feasibility_risks);

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">五层决策实验台</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            每一层都要写出选择和理由，最终合成为知识工程决策文档。
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
            {stringValue(stageTwoContent?.proposed_agent_capability) ||
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
        <ReviewCheck label="保存知识工程决策文档" ready={latestDecisionArtifact !== null} />
        <ReviewCheck label="生成知识工程评审" ready={latestReviewArtifact !== null} />
        <ReviewCheck label="确认知识缺口与数据风险" ready={latestReviewArtifact !== null} />
        <ReviewCheck label="解锁智能体实现与测试" ready={completed} />
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
          : canComplete
            ? "决策文档和评审记录已就绪，可以确认阶段三完成并开启下一阶段。"
            : "保存决策文档并生成评审后，才能确认阶段三完成。"}
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

function createReadiness(draft: KnowledgeDecisionDraft): LayerReadiness[] {
  return [
    {
      description: "目标、来源和风险",
      ready:
        hasText(draft.knowledgeGoal) &&
        lines(draft.requiredKnowledgeTypes).length > 0 &&
        lines(draft.sourceInventory).length > 0 &&
        lines(draft.dataQualityRisks).length > 0,
      title: "数据准备",
    },
    {
      description: "切分方式与依据",
      ready: hasText(draft.chunkingDecision),
      title: "分块策略",
    },
    {
      description: "语义表示与存储",
      ready: hasText(draft.embeddingStorageDecision),
      title: "向量化与存储",
    },
    {
      description: "检索、重排和 Top-K",
      ready: hasText(draft.retrievalDecision) && hasText(draft.strategyRationale),
      title: "召回策略",
    },
    {
      description: "评估、维护和构建建议",
      ready:
        hasText(draft.evaluationPlan) &&
        hasText(draft.maintenancePlan) &&
        hasText(draft.stage4BuildPlan),
      title: "效果评估",
    },
  ];
}

function draftFromDecisionArtifact(artifact: Artifact): KnowledgeDecisionDraft {
  const content = artifact.content_json;
  const strategyRationale = stringValue(content.strategy_rationale);
  const parsedChunkingDecision = sectionValue(strategyRationale, "分块策略");
  const parsedEmbeddingDecision = sectionValue(strategyRationale, "向量化与存储");
  const parsedRetrievalDecision = sectionValue(strategyRationale, "召回策略");
  const parsedRationale = sectionValue(strategyRationale, "策略选择依据");

  return {
    chunkingDecision: parsedChunkingDecision || strategyRationale,
    dataQualityRisks: arrayOrString(content.data_quality_risks).join("\n"),
    embeddingStorageDecision: parsedEmbeddingDecision,
    evaluationPlan: stringValue(content.evaluation_plan),
    knowledgeGoal: stringValue(content.knowledge_goal),
    maintenancePlan: stringValue(content.maintenance_plan),
    requiredKnowledgeTypes: arrayOrString(content.required_knowledge_types).join("\n"),
    retrievalDecision: parsedRetrievalDecision,
    selectedStrategy: normalizeStrategy(content.selected_strategy),
    sourceInventory: arrayOrString(content.source_inventory).join("\n"),
    stage4BuildPlan: stringValue(content.stage_4_build_plan),
    strategyRationale: parsedRationale || strategyRationale,
  };
}

function draftFromStageTwoSolution(artifact: Artifact | null): KnowledgeDecisionDraft {
  if (!artifact) {
    return emptyDraft;
  }
  const content = artifact.content_json;
  const dataSources = arrayOrString(content.data_sources);
  const risks = arrayOrString(content.feasibility_risks);
  const capability = stringValue(content.proposed_agent_capability);

  return {
    ...emptyDraft,
    dataQualityRisks: risks.join("\n"),
    knowledgeGoal:
      capability ||
      stringValue(content.problem_summary) ||
      "支撑当前智能体完成业务问答、追溯和材料生成。",
    maintenancePlan:
      dataSources.length > 0
        ? `按课程演示节奏复查 ${dataSources[0]} 等材料版本，记录数据更新和清洗责任。`
        : "",
    requiredKnowledgeTypes: dataSources.join("\n"),
    sourceInventory: dataSources.join("\n"),
    stage4BuildPlan:
      dataSources.length > 0
        ? "在阶段四中按本决策整理材料、配置知识库、验证召回效果，并记录偏离原因。"
        : "",
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

function buildStrategyRationale(draft: KnowledgeDecisionDraft): string {
  return [
    section("分块策略", draft.chunkingDecision),
    section("向量化与存储", draft.embeddingStorageDecision),
    section("召回策略", draft.retrievalDecision),
    section("策略选择依据", draft.strategyRationale),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function section(title: string, value: string): string {
  return value.trim() ? `【${title}】\n${value.trim()}` : "";
}

function sectionValue(value: string, title: string): string {
  const pattern = new RegExp(`【${title}】\\n([\\s\\S]*?)(?=\\n\\n【|$)`);
  return pattern.exec(value)?.[1]?.trim() ?? "";
}

function layerIcon(index: number): ReactNode {
  const icons = [
    <Database aria-hidden size={18} key="data" />,
    <SplitSquareHorizontal aria-hidden size={18} key="chunk" />,
    <BrainCircuit aria-hidden size={18} key="vector" />,
    <GitBranch aria-hidden size={18} key="retrieval" />,
    <FileCheck2 aria-hidden size={18} key="eval" />,
  ];
  return icons[index] ?? <FileText aria-hidden size={18} />;
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

function normalizeStrategy(value: unknown): StageThreeKnowledgeStrategy {
  if (
    value === "prompt_only" ||
    value === "rag" ||
    value === "tool_calling" ||
    value === "hybrid"
  ) {
    return value;
  }
  return "rag";
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
