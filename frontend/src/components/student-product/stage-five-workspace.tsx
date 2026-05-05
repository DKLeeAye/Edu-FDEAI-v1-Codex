"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  LinkIcon,
  PackageCheck,
  RefreshCw,
  Save,
  SearchCheck,
  Users,
  Wrench,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

import type {
  Artifact,
  LearningProfile,
  StageFiveAcceptancePackagePayload,
  StageFiveDeliveryDocumentPayload,
  StageFiveOperationsGuidePayload,
} from "@/src/lib/api";

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
  onRefresh: () => void;
  onRequestReview: () => Promise<boolean>;
  onSaveAcceptancePackage: (payload: StageFiveAcceptancePackagePayload) => Promise<boolean>;
  onSaveDeliveryDocument: (payload: StageFiveDeliveryDocumentPayload) => Promise<boolean>;
  onSaveOperationsGuide: (payload: StageFiveOperationsGuidePayload) => Promise<boolean>;
  sessionStatus?: string;
  stageStatus?: string;
};

type DeliveryDraft = {
  coreFeatures: string;
  deliverySummary: string;
  finalAgentUrl: string;
  knownLimitations: string;
  projectName: string;
  targetUsers: string;
  usageInstructions: string;
};

type AcceptanceDraft = {
  acceptanceCriteria: string;
  acceptanceScope: string;
  handoverChecklist: string;
  testEvidenceSummary: string;
  unresolvedIssues: string;
};

type OperationsDraft = {
  commonIssues: string;
  dataUpdatePlan: string;
  maintenanceOwnerNotes: string;
  monitoringPlan: string;
  runtimeDependencies: string;
};

type ReadinessItem = {
  ready: boolean;
  title: string;
  value: string;
};

const emptyDeliveryDraft: DeliveryDraft = {
  coreFeatures: "",
  deliverySummary: "",
  finalAgentUrl: "",
  knownLimitations: "",
  projectName: "",
  targetUsers: "",
  usageInstructions: "",
};

const emptyAcceptanceDraft: AcceptanceDraft = {
  acceptanceCriteria: "",
  acceptanceScope: "",
  handoverChecklist: "",
  testEvidenceSummary: "",
  unresolvedIssues: "",
};

const emptyOperationsDraft: OperationsDraft = {
  commonIssues: "",
  dataUpdatePlan: "",
  maintenanceOwnerNotes: "",
  monitoringPlan: "",
  runtimeDependencies: "",
};

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
  onRefresh,
  onRequestReview,
  onSaveAcceptancePackage,
  onSaveDeliveryDocument,
  onSaveOperationsGuide,
  sessionStatus,
  stageStatus,
}: StageFiveWorkspaceProps) {
  const status = stageStatusCopy(stageStatus);
  const locked = stageStatus === "locked";
  const completed = stageStatus === "completed";
  const projectCompleted = sessionStatus === "completed";
  const latestDeliveryArtifact = useMemo(
    () => latestArtifactOfType(artifacts, "stage_5_delivery_document"),
    [artifacts],
  );
  const latestAcceptanceArtifact = useMemo(
    () => latestArtifactOfType(artifacts, "stage_5_acceptance_package"),
    [artifacts],
  );
  const latestOperationsArtifact = useMemo(
    () => latestArtifactOfType(artifacts, "stage_5_operations_guide"),
    [artifacts],
  );
  const latestReviewArtifact = useMemo(
    () => latestArtifactOfType(artifacts, "stage_5_ai_delivery_review"),
    [artifacts],
  );
  const stageFourArtifacts = allStageArtifacts.stage_4;
  const latestImplementationArtifact = useMemo(
    () => latestArtifactOfType(stageFourArtifacts, "stage_4_dify_implementation"),
    [stageFourArtifacts],
  );
  const latestTestReportArtifact = useMemo(
    () => latestArtifactOfType(stageFourArtifacts, "stage_4_test_report"),
    [stageFourArtifacts],
  );
  const latestStageFourReviewArtifact = useMemo(
    () => latestArtifactOfType(stageFourArtifacts, "stage_4_ai_test_review"),
    [stageFourArtifacts],
  );

  const deliverySourceId =
    latestDeliveryArtifact?.id ?? latestImplementationArtifact?.id ?? "fallback-delivery";
  const deliverySourceDraft = useMemo(
    () =>
      latestDeliveryArtifact
        ? deliveryDraftFromArtifact(latestDeliveryArtifact)
        : deliveryDraftFromStageFour(latestImplementationArtifact),
    [latestDeliveryArtifact, latestImplementationArtifact],
  );
  const [deliveryDraftState, setDeliveryDraftState] = useState<{
    draft: DeliveryDraft;
    sourceArtifactId: string;
  }>({
    draft: deliverySourceDraft,
    sourceArtifactId: deliverySourceId,
  });
  const deliveryDraft =
    deliveryDraftState.sourceArtifactId === deliverySourceId
      ? deliveryDraftState.draft
      : deliverySourceDraft;

  const acceptanceSourceId =
    latestAcceptanceArtifact?.id ??
    latestTestReportArtifact?.id ??
    latestDeliveryArtifact?.id ??
    "fallback-acceptance";
  const acceptanceSourceDraft = useMemo(
    () =>
      latestAcceptanceArtifact
        ? acceptanceDraftFromArtifact(latestAcceptanceArtifact)
        : acceptanceDraftFromStageFour(latestTestReportArtifact, latestImplementationArtifact),
    [latestAcceptanceArtifact, latestImplementationArtifact, latestTestReportArtifact],
  );
  const [acceptanceDraftState, setAcceptanceDraftState] = useState<{
    draft: AcceptanceDraft;
    sourceArtifactId: string;
  }>({
    draft: acceptanceSourceDraft,
    sourceArtifactId: acceptanceSourceId,
  });
  const acceptanceDraft =
    acceptanceDraftState.sourceArtifactId === acceptanceSourceId
      ? acceptanceDraftState.draft
      : acceptanceSourceDraft;

  const operationsSourceId =
    latestOperationsArtifact?.id ??
    latestImplementationArtifact?.id ??
    latestTestReportArtifact?.id ??
    "fallback-operations";
  const operationsSourceDraft = useMemo(
    () =>
      latestOperationsArtifact
        ? operationsDraftFromArtifact(latestOperationsArtifact)
        : operationsDraftFromStageFour(latestImplementationArtifact, latestTestReportArtifact),
    [latestImplementationArtifact, latestOperationsArtifact, latestTestReportArtifact],
  );
  const [operationsDraftState, setOperationsDraftState] = useState<{
    draft: OperationsDraft;
    sourceArtifactId: string;
  }>({
    draft: operationsSourceDraft,
    sourceArtifactId: operationsSourceId,
  });
  const operationsDraft =
    operationsDraftState.sourceArtifactId === operationsSourceId
      ? operationsDraftState.draft
      : operationsSourceDraft;

  const deliveryReadiness = useMemo(
    () => createDeliveryReadiness(deliveryDraft),
    [deliveryDraft],
  );
  const acceptanceReadiness = useMemo(
    () => createAcceptanceReadiness(acceptanceDraft, latestDeliveryArtifact !== null),
    [acceptanceDraft, latestDeliveryArtifact],
  );
  const operationsReadiness = useMemo(
    () => createOperationsReadiness(operationsDraft, latestAcceptanceArtifact !== null),
    [latestAcceptanceArtifact, operationsDraft],
  );
  const canSaveDelivery = deliveryReadiness.every((item) => item.ready);
  const canSaveAcceptance = acceptanceReadiness.every((item) => item.ready);
  const canSaveOperations = operationsReadiness.every((item) => item.ready);
  const canReview =
    latestDeliveryArtifact !== null &&
    latestAcceptanceArtifact !== null &&
    latestOperationsArtifact !== null &&
    !locked &&
    !completed;
  const canComplete = canReview && latestReviewArtifact !== null;

  function updateDeliveryDraft(patch: Partial<DeliveryDraft>) {
    setDeliveryDraftState({
      draft: { ...deliveryDraft, ...patch },
      sourceArtifactId: deliverySourceId,
    });
  }

  function updateAcceptanceDraft(patch: Partial<AcceptanceDraft>) {
    setAcceptanceDraftState({
      draft: { ...acceptanceDraft, ...patch },
      sourceArtifactId: acceptanceSourceId,
    });
  }

  function updateOperationsDraft(patch: Partial<OperationsDraft>) {
    setOperationsDraftState({
      draft: { ...operationsDraft, ...patch },
      sourceArtifactId: operationsSourceId,
    });
  }

  async function handleSaveDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSaveDelivery || locked || completed) {
      return;
    }
    await onSaveDeliveryDocument({
      core_features: lines(deliveryDraft.coreFeatures),
      delivery_summary: deliveryDraft.deliverySummary.trim(),
      final_agent_url: deliveryDraft.finalAgentUrl.trim(),
      known_limitations: lines(deliveryDraft.knownLimitations),
      project_name: deliveryDraft.projectName.trim(),
      target_users: lines(deliveryDraft.targetUsers),
      usage_instructions: deliveryDraft.usageInstructions.trim(),
    });
  }

  async function handleSaveAcceptance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSaveAcceptance || locked || completed) {
      return;
    }
    await onSaveAcceptancePackage({
      acceptance_criteria: lines(acceptanceDraft.acceptanceCriteria),
      acceptance_scope: acceptanceDraft.acceptanceScope.trim(),
      handover_checklist: lines(acceptanceDraft.handoverChecklist),
      test_evidence_summary: acceptanceDraft.testEvidenceSummary.trim(),
      unresolved_issues: lines(acceptanceDraft.unresolvedIssues),
    });
  }

  async function handleSaveOperations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSaveOperations || locked || completed) {
      return;
    }
    await onSaveOperationsGuide({
      common_issues: lines(operationsDraft.commonIssues),
      data_update_plan: operationsDraft.dataUpdatePlan.trim(),
      maintenance_owner_notes: operationsDraft.maintenanceOwnerNotes.trim(),
      monitoring_plan: operationsDraft.monitoringPlan.trim(),
      runtime_dependencies: lines(operationsDraft.runtimeDependencies),
    });
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[18px] bg-slate-950 p-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="阶段五工作区" tone="success" />
              <StatusBadge label="交付收口" tone="info" />
              <StatusBadge label={projectCompleted ? "项目已完成" : status.label} tone={projectCompleted ? "success" : status.tone} />
            </div>
            <h3 className="mt-4 text-2xl font-extrabold leading-tight">
              把可运行智能体交到客户手上
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
              整理交付说明书、验收记录、限制与维护说明，最后完成客户演示清单和项目档案袋。
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
          <StageStepCard
            icon={<FileText aria-hidden size={18} />}
            label="交付说明书"
            value={latestDeliveryArtifact ? "已保存" : "待成稿"}
          />
          <StageStepCard
            icon={<ClipboardCheck aria-hidden size={18} />}
            label="验收记录"
            value={latestAcceptanceArtifact ? "已保存" : "待记录"}
          />
          <StageStepCard
            icon={<Wrench aria-hidden size={18} />}
            label="限制与维护说明"
            value={latestOperationsArtifact ? "已保存" : "待说明"}
          />
          <StageStepCard
            icon={<PackageCheck aria-hidden size={18} />}
            label="最终档案袋"
            value={projectCompleted ? "已收口" : latestReviewArtifact ? "待确认完成" : "待审阅"}
          />
        </div>
      </section>

      {locked ? (
        <EmptyState title="阶段五尚未解锁">
          完成阶段四构建记录、测试报告和测试反馈后，交付验收工作区会自动开启。
        </EmptyState>
      ) : null}

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
        <DeliveryDocumentEditor
          canSave={canSaveDelivery}
          completed={completed}
          draft={deliveryDraft}
          isSaving={isSavingDeliveryDocument}
          latestImplementationArtifact={latestImplementationArtifact}
          locked={locked}
          onChange={updateDeliveryDraft}
          onSubmit={handleSaveDelivery}
          readiness={deliveryReadiness}
        />

        <div className="grid gap-5">
          <AcceptanceRecordEditor
            canSave={canSaveAcceptance}
            completed={completed}
            draft={acceptanceDraft}
            isSaving={isSavingAcceptancePackage}
            latestDeliveryArtifact={latestDeliveryArtifact}
            latestTestReportArtifact={latestTestReportArtifact}
            locked={locked}
            onChange={updateAcceptanceDraft}
            onSubmit={handleSaveAcceptance}
            readiness={acceptanceReadiness}
          />
          <OperationsGuideEditor
            canSave={canSaveOperations}
            completed={completed}
            draft={operationsDraft}
            isSaving={isSavingOperationsGuide}
            latestAcceptanceArtifact={latestAcceptanceArtifact}
            latestImplementationArtifact={latestImplementationArtifact}
            locked={locked}
            onChange={updateOperationsDraft}
            onSubmit={handleSaveOperations}
            readiness={operationsReadiness}
          />
          <FinalPortfolioPanel
            allStageArtifacts={allStageArtifacts}
            canComplete={canComplete}
            canReview={canReview}
            completed={completed}
            isCompleting={isCompletingStage}
            isRequestingReview={isRequestingReview}
            latestAcceptanceArtifact={latestAcceptanceArtifact}
            latestDeliveryArtifact={latestDeliveryArtifact}
            latestOperationsArtifact={latestOperationsArtifact}
            latestReviewArtifact={latestReviewArtifact}
            latestStageFourReviewArtifact={latestStageFourReviewArtifact}
            learningProfile={learningProfile}
            onCompleteStage={onCompleteStage}
            onRequestReview={onRequestReview}
            projectCompleted={projectCompleted}
          />
        </div>
      </section>
    </div>
  );
}

function DeliveryDocumentEditor({
  canSave,
  completed,
  draft,
  isSaving,
  latestImplementationArtifact,
  locked,
  onChange,
  onSubmit,
  readiness,
}: {
  canSave: boolean;
  completed: boolean;
  draft: DeliveryDraft;
  isSaving: boolean;
  latestImplementationArtifact: Artifact | null;
  locked: boolean;
  onChange: (patch: Partial<DeliveryDraft>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readiness: ReadinessItem[];
}) {
  const implementation = latestImplementationArtifact?.content_json;

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">交付说明书</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            用客户能理解的语言说明应用入口、核心功能、目标用户、使用步骤和能力边界。
          </p>
        </div>
        <StatusBadge
          label={completed ? "已归档" : canSave ? "可保存" : "待补齐"}
          tone={completed ? "success" : canSave ? "success" : "warning"}
        />
      </div>

      <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
        <p className="text-xs font-extrabold text-emerald-700">承接阶段四应用记录</p>
        <p className="mt-2 text-sm font-extrabold leading-6 text-emerald-900">
          {stringValue(implementation?.dify_app_name) || "阶段四保存应用记录后，这里会自动带入交付基础信息。"}
        </p>
        <p className="mt-1 text-xs leading-5 text-emerald-900">
          {stringValue(implementation?.implementation_notes) || "交付说明书应让客户知道应用能做什么、怎么用、哪些场景不承诺。"}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {readiness.map((item) => (
          <ReadinessCard key={item.title} ready={item.ready} title={item.title} value={item.value} />
        ))}
      </div>

      <form className="mt-5 grid gap-5" onSubmit={onSubmit}>
        <FormSection
          description="说明交付对象和客户访问入口。"
          icon={<LinkIcon aria-hidden size={18} />}
          title="应用入口"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <StageField
              disabled={locked || completed}
              label="项目名称"
              onChange={(value) => onChange({ projectName: value })}
              placeholder="例如：质检追溯 AI 助手交付包"
              required
              rows={2}
              value={draft.projectName}
            />
            <StageField
              disabled={locked || completed}
              label="最终应用链接"
              onChange={(value) => onChange({ finalAgentUrl: value })}
              placeholder="填写客户可访问的应用链接"
              required
              rows={2}
              value={draft.finalAgentUrl}
            />
          </div>
          <StageField
            disabled={locked || completed}
            label="交付摘要"
            onChange={(value) => onChange({ deliverySummary: value })}
            placeholder="说明本次交付解决什么问题、交付给谁、当前边界是什么。"
            required
            rows={4}
            value={draft.deliverySummary}
          />
        </FormSection>

        <FormSection
          description="把功能和用户写成验收时可复述的交付语言。"
          icon={<Users aria-hidden size={18} />}
          title="功能与用户"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <StageField
              disabled={locked || completed}
              label="核心功能"
              onChange={(value) => onChange({ coreFeatures: value })}
              placeholder="每行一个功能，例如质检记录问答。"
              required
              rows={5}
              value={draft.coreFeatures}
            />
            <StageField
              disabled={locked || completed}
              label="目标用户"
              onChange={(value) => onChange({ targetUsers: value })}
              placeholder="每行一类用户，例如生产部门负责人。"
              required
              rows={5}
              value={draft.targetUsers}
            />
          </div>
        </FormSection>

        <FormSection
          description="交付说明必须同时包含使用路径和能力边界。"
          icon={<AlertTriangle aria-hidden size={18} />}
          title="使用步骤与限制"
        >
          <StageField
            disabled={locked || completed}
            label="使用说明"
            onChange={(value) => onChange({ usageInstructions: value })}
            placeholder="说明客户如何打开应用、输入什么、如何理解回答。"
            required
            rows={5}
            value={draft.usageInstructions}
          />
          <StageField
            disabled={locked || completed}
            label="已知限制"
            onChange={(value) => onChange({ knownLimitations: value })}
            placeholder="每行一个限制。没有明显问题时也要写明当前能力边界。"
            required
            rows={5}
            value={draft.knownLimitations}
          />
        </FormSection>

        <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-slate-500">
            {completed
              ? "交付说明书已纳入最终项目档案袋。"
              : canSave
                ? "交付说明书内容已具备最小完整性，可以保存。"
                : "补齐应用入口、功能用户、使用说明和限制后再保存。"}
          </p>
          <button
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={locked || completed || isSaving || !canSave}
            type="submit"
          >
            <Save aria-hidden size={16} />
            {isSaving ? "保存中" : "保存交付说明书"}
          </button>
        </div>
      </form>
    </section>
  );
}

function AcceptanceRecordEditor({
  canSave,
  completed,
  draft,
  isSaving,
  latestDeliveryArtifact,
  latestTestReportArtifact,
  locked,
  onChange,
  onSubmit,
  readiness,
}: {
  canSave: boolean;
  completed: boolean;
  draft: AcceptanceDraft;
  isSaving: boolean;
  latestDeliveryArtifact: Artifact | null;
  latestTestReportArtifact: Artifact | null;
  locked: boolean;
  onChange: (patch: Partial<AcceptanceDraft>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readiness: ReadinessItem[];
}) {
  const testReport = latestTestReportArtifact?.content_json;

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">验收记录</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            对齐阶段四测试证据，记录验收范围、标准、未解决问题和交接清单。
          </p>
        </div>
        <StatusBadge
          label={latestDeliveryArtifact ? (canSave ? "可保存" : "待补齐") : "先保存说明书"}
          tone={latestDeliveryArtifact ? (canSave ? "success" : "warning") : "muted"}
        />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-extrabold text-slate-500">阶段四测试结果</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          {stringValue(testReport?.test_goal) || "保存阶段四测试报告后，这里会带入验收证据基础。"}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {readiness.map((item) => (
          <ReadinessCard key={item.title} ready={item.ready} title={item.title} value={item.value} />
        ))}
      </div>

      <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
        <StageField
          disabled={locked || completed}
          label="验收范围"
          onChange={(value) => onChange({ acceptanceScope: value })}
          placeholder="说明本次 MVP 验收覆盖哪些业务能力和边界。"
          required
          rows={4}
          value={draft.acceptanceScope}
        />
        <StageField
          disabled={locked || completed}
          label="验收标准"
          onChange={(value) => onChange({ acceptanceCriteria: value })}
          placeholder="每行一条验收标准。"
          required
          rows={4}
          value={draft.acceptanceCriteria}
        />
        <StageField
          disabled={locked || completed}
          label="测试证据摘要"
          onChange={(value) => onChange({ testEvidenceSummary: value })}
          placeholder="概括阶段四测试题、通过情况和关键证据。"
          required
          rows={4}
          value={draft.testEvidenceSummary}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <StageField
            disabled={locked || completed}
            label="未解决问题"
            onChange={(value) => onChange({ unresolvedIssues: value })}
            placeholder="每行一个问题；没有时写“暂无未解决问题”。"
            required
            rows={4}
            value={draft.unresolvedIssues}
          />
          <StageField
            disabled={locked || completed}
            label="交接清单"
            onChange={(value) => onChange({ handoverChecklist: value })}
            placeholder="每行一个交接项。"
            required
            rows={4}
            value={draft.handoverChecklist}
          />
        </div>
        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={locked || completed || isSaving || !canSave}
          type="submit"
        >
          <Save aria-hidden size={16} />
          {isSaving ? "保存中" : "保存验收记录"}
        </button>
      </form>
    </section>
  );
}

function OperationsGuideEditor({
  canSave,
  completed,
  draft,
  isSaving,
  latestAcceptanceArtifact,
  latestImplementationArtifact,
  locked,
  onChange,
  onSubmit,
  readiness,
}: {
  canSave: boolean;
  completed: boolean;
  draft: OperationsDraft;
  isSaving: boolean;
  latestAcceptanceArtifact: Artifact | null;
  latestImplementationArtifact: Artifact | null;
  locked: boolean;
  onChange: (patch: Partial<OperationsDraft>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readiness: ReadinessItem[];
}) {
  const implementation = latestImplementationArtifact?.content_json;

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">限制与维护说明</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            披露运行依赖、知识库更新计划、监控方式、常见问题和维护责任。
          </p>
        </div>
        <StatusBadge
          label={latestAcceptanceArtifact ? (canSave ? "可保存" : "待补齐") : "先保存验收记录"}
          tone={latestAcceptanceArtifact ? (canSave ? "success" : "warning") : "muted"}
        />
      </div>

      <div className="mt-4 rounded-2xl bg-amber-50 p-4">
        <p className="text-xs font-extrabold text-amber-700">阶段四已知限制</p>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          {arrayOrString(implementation?.known_limitations).join("；") ||
            "阶段四记录的已知限制会作为本说明的基础。"}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {readiness.map((item) => (
          <ReadinessCard key={item.title} ready={item.ready} title={item.title} value={item.value} />
        ))}
      </div>

      <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
        <StageField
          disabled={locked || completed}
          label="运行依赖"
          onChange={(value) => onChange({ runtimeDependencies: value })}
          placeholder="每行一个依赖，例如 Dify 云端应用、知识库、人工导入数据。"
          required
          rows={4}
          value={draft.runtimeDependencies}
        />
        <StageField
          disabled={locked || completed}
          label="数据更新计划"
          onChange={(value) => onChange({ dataUpdatePlan: value })}
          placeholder="说明知识库或数据源更新频率、负责人和复核方式。"
          required
          rows={4}
          value={draft.dataUpdatePlan}
        />
        <StageField
          disabled={locked || completed}
          label="监控计划"
          onChange={(value) => onChange({ monitoringPlan: value })}
          placeholder="说明上线后如何抽查回答、记录异常和复测。"
          required
          rows={4}
          value={draft.monitoringPlan}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <StageField
            disabled={locked || completed}
            label="常见问题"
            onChange={(value) => onChange({ commonIssues: value })}
            placeholder="每行一个常见问题或风险。"
            rows={4}
            value={draft.commonIssues}
          />
          <StageField
            disabled={locked || completed}
            label="维护负责人说明"
            onChange={(value) => onChange({ maintenanceOwnerNotes: value })}
            placeholder="说明谁维护数据、谁复核应用配置。"
            required
            rows={4}
            value={draft.maintenanceOwnerNotes}
          />
        </div>
        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={locked || completed || isSaving || !canSave}
          type="submit"
        >
          <Save aria-hidden size={16} />
          {isSaving ? "保存中" : "保存维护说明"}
        </button>
      </form>
    </section>
  );
}

function FinalPortfolioPanel({
  allStageArtifacts,
  canComplete,
  canReview,
  completed,
  isCompleting,
  isRequestingReview,
  latestAcceptanceArtifact,
  latestDeliveryArtifact,
  latestOperationsArtifact,
  latestReviewArtifact,
  latestStageFourReviewArtifact,
  learningProfile,
  onCompleteStage,
  onRequestReview,
  projectCompleted,
}: {
  allStageArtifacts: ArtifactsByStage;
  canComplete: boolean;
  canReview: boolean;
  completed: boolean;
  isCompleting: boolean;
  isRequestingReview: boolean;
  latestAcceptanceArtifact: Artifact | null;
  latestDeliveryArtifact: Artifact | null;
  latestOperationsArtifact: Artifact | null;
  latestReviewArtifact: Artifact | null;
  latestStageFourReviewArtifact: Artifact | null;
  learningProfile: LearningProfile | null;
  onCompleteStage: () => Promise<boolean>;
  onRequestReview: () => Promise<boolean>;
  projectCompleted: boolean;
}) {
  const stageEvidence = stageDefinitions.map((stage) => ({
    count: allStageArtifacts[stage.key].length,
    label: stage.shortTitle,
  }));

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">客户演示与最终档案袋</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            汇总交付材料、交付审阅、客户演示要点和五阶段项目证据。
          </p>
        </div>
        <StatusBadge
          label={projectCompleted ? "项目已完成" : latestReviewArtifact ? "可提交" : "待审阅"}
          tone={projectCompleted ? "success" : latestReviewArtifact ? "success" : "warning"}
        />
      </div>

      <div className="mt-4 grid gap-3">
        <ReviewCheck label="交付说明书" ready={latestDeliveryArtifact !== null} />
        <ReviewCheck label="验收记录" ready={latestAcceptanceArtifact !== null} />
        <ReviewCheck label="限制与维护说明" ready={latestOperationsArtifact !== null} />
        <ReviewCheck label="阶段四测试反馈" ready={latestStageFourReviewArtifact !== null} />
        <ReviewCheck label="交付审阅" ready={latestReviewArtifact !== null} />
      </div>

      <button
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canReview || isRequestingReview}
        onClick={() => void onRequestReview()}
        type="button"
      >
        <SearchCheck aria-hidden size={16} />
        {isRequestingReview ? "审阅生成中" : "生成交付审阅"}
      </button>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        {latestReviewArtifact ? (
          <DeliveryReview artifact={latestReviewArtifact} />
        ) : (
          <EmptyState title="还没有交付审阅">
            保存交付说明书、验收记录和维护说明后，生成审阅来检查完整性、验收风险和维护风险。
          </EmptyState>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-extrabold text-slate-950">最终档案袋</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          {stageEvidence.map((item) => (
            <div className="rounded-2xl bg-slate-50 p-3" key={item.label}>
              <p className="text-xs font-extrabold text-slate-500">{item.label}</p>
              <p className="mt-1 text-lg font-extrabold text-slate-950">{item.count}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
          <p className="text-xs font-extrabold text-emerald-700">客户演示要点</p>
          <ul className="mt-2 grid gap-2 text-sm leading-6 text-emerald-900">
            <li className="flex gap-2">
              <CheckCircle2 aria-hidden className="mt-1 shrink-0" size={15} />
              <span>打开最终应用链接，演示标准质检追溯问题。</span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 aria-hidden className="mt-1 shrink-0" size={15} />
              <span>展示范围外问题拒答和已知限制说明。</span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 aria-hidden className="mt-1 shrink-0" size={15} />
              <span>说明数据更新、监控和维护责任。</span>
            </li>
          </ul>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ReviewMetric label="学习画像进度" value={`${profilePercent(learningProfile)}%`} />
          <ReviewMetric
            label="项目证据"
            value={`${Object.values(allStageArtifacts).flat().length} 项`}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
        {projectCompleted
          ? "项目已经完成，可以复盘最终档案袋和学习画像。"
          : canComplete
            ? "交付材料和审阅都已就绪，可以确认完成本次项目实训。"
            : "保存三类交付材料并生成交付审阅后，才能完成本次项目实训。"}
      </div>

      <button
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canComplete || isCompleting || completed}
        onClick={() => void onCompleteStage()}
        type="button"
      >
        <CheckCircle2 aria-hidden size={16} />
        {projectCompleted ? "项目已完成" : isCompleting ? "确认中" : "完成阶段五并提交项目"}
      </button>
    </section>
  );
}

function DeliveryReview({ artifact }: { artifact: Artifact }) {
  const content = artifact.content_json;
  const completeness = isRecord(content.delivery_completeness)
    ? content.delivery_completeness
    : null;
  const acceptanceRisks = arrayOrString(content.acceptance_risks);
  const operationsRisks = arrayOrString(content.operations_risks);
  const suggestions = arrayOrString(content.improvement_suggestions);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label="审阅已生成" tone="success" />
        <span className="text-xs font-bold text-slate-400">{formatDateTime(artifact.created_at)}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewMetric
          label="最终准备度"
          value={finalReadinessCopy(stringValue(content.final_readiness))}
        />
        <ReviewMetric
          label="交接清单"
          value={`${Number(completeness?.handover_checklist_count ?? 0)} 项`}
        />
      </div>
      <div>
        <p className="text-xs font-extrabold text-slate-500">审阅摘要</p>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          {reviewSummaryCopy(content.review_summary)}
        </p>
      </div>
      {completeness ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <ReviewMetric
            label="核心功能"
            value={`${Number(completeness.core_feature_count ?? 0)} 项`}
          />
          <ReviewMetric
            label="目标用户"
            value={`${Number(completeness.target_user_count ?? 0)} 类`}
          />
          <ReviewMetric
            label="验收标准"
            value={`${Number(completeness.acceptance_criteria_count ?? 0)} 条`}
          />
        </div>
      ) : null}
      {acceptanceRisks.length > 0 ? (
        <ReviewList icon="warning" items={acceptanceRisks} title="验收风险" />
      ) : null}
      {operationsRisks.length > 0 ? (
        <ReviewList icon="warning" items={operationsRisks} title="维护风险" />
      ) : null}
      {suggestions.length > 0 ? (
        <ReviewList icon="check" items={suggestions} title="建议改进" />
      ) : null}
    </div>
  );
}

function FormSection({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-4">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          {icon}
        </span>
        <div>
          <h4 className="text-base font-extrabold text-slate-950">{title}</h4>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

function StageField({
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

function StageStepCard({
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

function ReadinessCard({ ready, title, value }: ReadinessItem) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-extrabold text-slate-500">{title}</p>
        <StatusBadge label={ready ? "已具备" : "待补充"} tone={ready ? "success" : "warning"} />
      </div>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{value}</p>
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

function createDeliveryReadiness(draft: DeliveryDraft): ReadinessItem[] {
  return [
    {
      ready: hasText(draft.projectName) && hasText(draft.finalAgentUrl),
      title: "应用入口",
      value: hasText(draft.finalAgentUrl) ? "入口已填写" : "待填写最终链接",
    },
    {
      ready: hasText(draft.deliverySummary),
      title: "交付摘要",
      value: hasText(draft.deliverySummary) ? "摘要已说明" : "待说明交付范围",
    },
    {
      ready: lines(draft.coreFeatures).length > 0 && lines(draft.targetUsers).length > 0,
      title: "功能用户",
      value: `${lines(draft.coreFeatures).length} 项功能 / ${lines(draft.targetUsers).length} 类用户`,
    },
    {
      ready: hasText(draft.usageInstructions) && lines(draft.knownLimitations).length > 0,
      title: "使用边界",
      value: lines(draft.knownLimitations).length > 0 ? "限制已披露" : "待披露限制",
    },
  ];
}

function createAcceptanceReadiness(
  draft: AcceptanceDraft,
  hasDeliveryDocument: boolean,
): ReadinessItem[] {
  return [
    {
      ready: hasDeliveryDocument,
      title: "交付说明书",
      value: hasDeliveryDocument ? "已保存" : "待先保存",
    },
    {
      ready: hasText(draft.acceptanceScope) && lines(draft.acceptanceCriteria).length > 0,
      title: "验收标准",
      value: `${lines(draft.acceptanceCriteria).length} 条标准`,
    },
    {
      ready: hasText(draft.testEvidenceSummary) && lines(draft.unresolvedIssues).length > 0,
      title: "证据与问题",
      value: hasText(draft.testEvidenceSummary) ? "证据已摘要" : "待摘要证据",
    },
    {
      ready: lines(draft.handoverChecklist).length > 0,
      title: "交接清单",
      value: `${lines(draft.handoverChecklist).length} 项`,
    },
  ];
}

function createOperationsReadiness(
  draft: OperationsDraft,
  hasAcceptanceRecord: boolean,
): ReadinessItem[] {
  return [
    {
      ready: hasAcceptanceRecord,
      title: "验收记录",
      value: hasAcceptanceRecord ? "已保存" : "待先保存",
    },
    {
      ready: lines(draft.runtimeDependencies).length > 0,
      title: "运行依赖",
      value: `${lines(draft.runtimeDependencies).length} 项依赖`,
    },
    {
      ready: hasText(draft.dataUpdatePlan) && hasText(draft.monitoringPlan),
      title: "更新监控",
      value: "更新计划与监控计划",
    },
    {
      ready: hasText(draft.maintenanceOwnerNotes),
      title: "维护责任",
      value: hasText(draft.maintenanceOwnerNotes) ? "责任已说明" : "待说明负责人",
    },
  ];
}

function deliveryDraftFromArtifact(artifact: Artifact): DeliveryDraft {
  const content = artifact.content_json;
  return {
    coreFeatures: arrayOrString(content.core_features).join("\n"),
    deliverySummary: stringValue(content.delivery_summary),
    finalAgentUrl: stringValue(content.final_agent_url),
    knownLimitations: arrayOrString(content.known_limitations).join("\n"),
    projectName: stringValue(content.project_name),
    targetUsers: arrayOrString(content.target_users).join("\n"),
    usageInstructions: stringValue(content.usage_instructions),
  };
}

function deliveryDraftFromStageFour(artifact: Artifact | null): DeliveryDraft {
  if (!artifact) {
    return {
      ...emptyDeliveryDraft,
      coreFeatures: "质检记录问答\n审厂追溯摘要\n范围外问题拒答",
      deliverySummary: "交付一个可供生产负责人查询质检记录和生成审厂追溯摘要的智能体应用。",
      knownLimitations: "数据更新依赖人工导入\n当前仅覆盖质检追溯场景",
      projectName: "质检追溯 AI 助手交付包",
      targetUsers: "生产部门负责人\n一线质检员",
      usageInstructions: "客户通过应用链接进入，输入质检批次或审厂问题后查看带证据的回答。",
    };
  }
  const content = artifact.content_json;
  const appName = stringValue(content.dify_app_name) || "质检追溯 AI 助手";
  const notes = stringValue(content.implementation_notes);
  const limitations = arrayOrString(content.known_limitations);

  return {
    coreFeatures: "质检记录问答\n审厂追溯摘要\n范围外问题拒答",
    deliverySummary:
      notes || "交付一个可供生产负责人查询质检记录和生成审厂追溯摘要的智能体应用。",
    finalAgentUrl: stringValue(content.dify_app_url),
    knownLimitations:
      limitations.length > 0
        ? limitations.join("\n")
        : "数据更新依赖人工导入\n当前仅覆盖质检追溯场景",
    projectName: `${appName}交付包`,
    targetUsers: "生产部门负责人\n一线质检员",
    usageInstructions: "客户通过应用链接进入，输入质检批次或审厂问题后查看带证据的回答。",
  };
}

function acceptanceDraftFromArtifact(artifact: Artifact): AcceptanceDraft {
  const content = artifact.content_json;
  return {
    acceptanceCriteria: arrayOrString(content.acceptance_criteria).join("\n"),
    acceptanceScope: stringValue(content.acceptance_scope),
    handoverChecklist: arrayOrString(content.handover_checklist).join("\n"),
    testEvidenceSummary: stringValue(content.test_evidence_summary),
    unresolvedIssues: arrayOrString(content.unresolved_issues).join("\n"),
  };
}

function acceptanceDraftFromStageFour(
  testReportArtifact: Artifact | null,
  implementationArtifact: Artifact | null,
): AcceptanceDraft {
  const testReport = testReportArtifact?.content_json;
  const implementation = implementationArtifact?.content_json;
  const testCases = testCasesFromContent(testReport?.test_cases);
  const criteria = testCases.map((testCase) => testCase.expectedOutput || testCase.scenario);
  const failures = arrayOrString(testReport?.observed_failures);
  const limitations = arrayOrString(implementation?.known_limitations);
  const issueLines = [...failures, ...limitations];

  return {
    acceptanceCriteria:
      criteria.length > 0
        ? criteria.join("\n")
        : "标准审厂问题回答可追溯\n范围外问题合理拒答\n多轮追问能保持上下文",
    acceptanceScope:
      stringValue(testReport?.test_goal) ||
      "围绕质检追溯问答、范围外拒答和多轮上下文进行 MVP 验收。",
    handoverChecklist: "最终应用链接\n交付说明书\n验收记录\n限制与维护说明",
    testEvidenceSummary: buildTestEvidenceSummary(testReportArtifact),
    unresolvedIssues: issueLines.length > 0 ? issueLines.join("\n") : "暂无未解决问题",
  };
}

function operationsDraftFromArtifact(artifact: Artifact): OperationsDraft {
  const content = artifact.content_json;
  return {
    commonIssues: arrayOrString(content.common_issues).join("\n"),
    dataUpdatePlan: stringValue(content.data_update_plan),
    maintenanceOwnerNotes: stringValue(content.maintenance_owner_notes),
    monitoringPlan: stringValue(content.monitoring_plan),
    runtimeDependencies: arrayOrString(content.runtime_dependencies).join("\n"),
  };
}

function operationsDraftFromStageFour(
  implementationArtifact: Artifact | null,
  testReportArtifact: Artifact | null,
): OperationsDraft {
  const implementation = implementationArtifact?.content_json;
  const testReport = testReportArtifact?.content_json;
  const issues = [
    ...arrayOrString(implementation?.known_limitations),
    ...arrayOrString(testReport?.observed_failures),
  ];

  return {
    commonIssues: issues.length > 0 ? issues.join("\n") : "导入数据字段不一致\n长问题需要拆分提问",
    dataUpdatePlan: "每周导入最新质检记录，每月复核 SOP 和审厂清单版本。",
    maintenanceOwnerNotes: "由生产质量负责人维护数据源，由课程演示教师协助复核应用配置。",
    monitoringPlan: "每周抽查典型问题回答，记录无法回答和证据引用异常。",
    runtimeDependencies: "Dify 云端应用\nDify 知识库\n人工导入的质检数据",
  };
}

function testCasesFromContent(value: unknown): Array<{
  expectedOutput: string;
  scenario: string;
}> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).map((item) => ({
    expectedOutput: stringValue(item.expected_output),
    scenario: stringValue(item.scenario),
  }));
}

function buildTestEvidenceSummary(artifact: Artifact | null): string {
  if (!artifact) {
    return "阶段四测试报告会作为验收证据摘要基础。";
  }
  const content = artifact.content_json;
  const testCases = testCasesFromContent(content.test_cases);
  const result = resultCopy(stringValue(content.overall_result));
  return `阶段四完成 ${testCases.length} 个测试项，整体结果为${result}。${stringValue(content.test_goal)}`;
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

function resultCopy(value: string): string {
  const map: Record<string, string> = {
    needs_revision: "需要修改",
    passed: "通过",
  };
  return map[value] ?? "待复核";
}

function finalReadinessCopy(value: string): string {
  const map: Record<string, string> = {
    ready_for_teacher_review: "可提交教师复核",
    ready_with_disclosed_risks: "已披露风险，可提交复核",
  };
  return map[value] ?? (value ? sanitizeProductText(value) : "待复核");
}

function reviewSummaryCopy(value: unknown): string {
  const summary = stringValue(value);
  if (!summary) {
    return "交付审阅已生成。";
  }
  if (/\b(stage_\d|ready_|needs_revision|passed|failed|partial)\b/.test(summary)) {
    return "交付材料已完成基础审阅，请结合验收风险、维护风险和建议改进继续复盘。";
  }
  return summary;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
