import { CheckCircle2, Save, SearchCheck } from "lucide-react";
import type { FormEvent } from "react";

import type { Artifact } from "@/src/lib/api";

import { ReviewList, StatusPill, TextField } from "./common";
import type {
  StageFiveAcceptancePackageFormState,
  StageFiveDeliveryDocumentFormState,
  StageFiveOperationsGuideFormState,
} from "./types";
import { shortId, stageTone, stringListValue, stringValue } from "./utils";

type StageFivePanelProps = {
  acceptancePackage: StageFiveAcceptancePackageFormState;
  acceptancePackageArtifact: Artifact | null;
  aiReviewArtifact: Artifact | null;
  deliveryDocument: StageFiveDeliveryDocumentFormState;
  deliveryDocumentArtifact: Artifact | null;
  isCompletingStageFive: boolean;
  isRequestingAiReview: boolean;
  isSavingAcceptancePackage: boolean;
  isSavingDeliveryDocument: boolean;
  isSavingOperationsGuide: boolean;
  locked: boolean;
  onAcceptancePackageChange: (patch: Partial<StageFiveAcceptancePackageFormState>) => void;
  onCompleteStageFive: () => void;
  onDeliveryDocumentChange: (patch: Partial<StageFiveDeliveryDocumentFormState>) => void;
  onOperationsGuideChange: (patch: Partial<StageFiveOperationsGuideFormState>) => void;
  onRequestAiReview: () => void;
  onSaveAcceptancePackage: (event: FormEvent<HTMLFormElement>) => void;
  onSaveDeliveryDocument: (event: FormEvent<HTMLFormElement>) => void;
  onSaveOperationsGuide: (event: FormEvent<HTMLFormElement>) => void;
  operationsGuide: StageFiveOperationsGuideFormState;
  operationsGuideArtifact: Artifact | null;
  sessionReady: boolean;
  sessionStatus?: string;
  stageStatus?: string;
};

export function StageFivePanel({
  acceptancePackage,
  acceptancePackageArtifact,
  aiReviewArtifact,
  deliveryDocument,
  deliveryDocumentArtifact,
  isCompletingStageFive,
  isRequestingAiReview,
  isSavingAcceptancePackage,
  isSavingDeliveryDocument,
  isSavingOperationsGuide,
  locked,
  onAcceptancePackageChange,
  onCompleteStageFive,
  onDeliveryDocumentChange,
  onOperationsGuideChange,
  onRequestAiReview,
  onSaveAcceptancePackage,
  onSaveDeliveryDocument,
  onSaveOperationsGuide,
  operationsGuide,
  operationsGuideArtifact,
  sessionReady,
  sessionStatus,
  stageStatus,
}: StageFivePanelProps) {
  return (
    <section className="panel h-fit p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">阶段五 交付验收与运维说明</h2>
          {locked ? (
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              先完成阶段四后再提交阶段五交付材料。
            </p>
          ) : null}
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Session：{sessionStatus ?? "未就绪"}
          </p>
        </div>
        <StatusPill label={stageStatus ?? "locked"} tone={stageTone(stageStatus)} />
      </div>

      <form className="mt-4 space-y-3" onSubmit={onSaveDeliveryDocument}>
        <TextField
          disabled={locked}
          label="项目名称"
          onChange={(value) => onDeliveryDocumentChange({ projectName: value })}
          rows={2}
          value={deliveryDocument.projectName}
        />
        <TextField
          disabled={locked}
          label="最终智能体 URL"
          onChange={(value) => onDeliveryDocumentChange({ finalAgentUrl: value })}
          rows={2}
          value={deliveryDocument.finalAgentUrl}
        />
        <TextField
          disabled={locked}
          label="交付摘要"
          onChange={(value) => onDeliveryDocumentChange({ deliverySummary: value })}
          rows={3}
          value={deliveryDocument.deliverySummary}
        />
        <TextField
          disabled={locked}
          label="核心功能"
          onChange={(value) => onDeliveryDocumentChange({ coreFeatures: value })}
          rows={3}
          value={deliveryDocument.coreFeatures}
        />
        <TextField
          disabled={locked}
          label="目标用户"
          onChange={(value) => onDeliveryDocumentChange({ targetUsers: value })}
          rows={3}
          value={deliveryDocument.targetUsers}
        />
        <TextField
          disabled={locked}
          label="使用说明"
          onChange={(value) => onDeliveryDocumentChange({ usageInstructions: value })}
          rows={4}
          value={deliveryDocument.usageInstructions}
        />
        <TextField
          disabled={locked}
          label="已知限制"
          onChange={(value) => onDeliveryDocumentChange({ knownLimitations: value })}
          rows={3}
          value={deliveryDocument.knownLimitations}
        />
        <button
          className="primary-button w-full"
          disabled={!sessionReady || locked || isSavingDeliveryDocument}
          type="submit"
        >
          <Save aria-hidden size={16} />
          {isSavingDeliveryDocument ? "保存中" : "保存交付说明"}
        </button>
      </form>

      <form
        className="mt-5 space-y-3 border-t border-[color:var(--border)] pt-4"
        onSubmit={onSaveAcceptancePackage}
      >
        {deliveryDocumentArtifact ? (
          <p className="text-sm text-[color:var(--muted)]">
            当前交付说明 Artifact：{shortId(deliveryDocumentArtifact.id)}
          </p>
        ) : null}
        <TextField
          disabled={locked}
          label="验收范围"
          onChange={(value) => onAcceptancePackageChange({ acceptanceScope: value })}
          rows={3}
          value={acceptancePackage.acceptanceScope}
        />
        <TextField
          disabled={locked}
          label="验收标准"
          onChange={(value) => onAcceptancePackageChange({ acceptanceCriteria: value })}
          rows={3}
          value={acceptancePackage.acceptanceCriteria}
        />
        <TextField
          disabled={locked}
          label="测试证据摘要"
          onChange={(value) => onAcceptancePackageChange({ testEvidenceSummary: value })}
          rows={4}
          value={acceptancePackage.testEvidenceSummary}
        />
        <TextField
          disabled={locked}
          label="未解决问题"
          onChange={(value) => onAcceptancePackageChange({ unresolvedIssues: value })}
          rows={3}
          value={acceptancePackage.unresolvedIssues}
        />
        <TextField
          disabled={locked}
          label="交接清单"
          onChange={(value) => onAcceptancePackageChange({ handoverChecklist: value })}
          rows={3}
          value={acceptancePackage.handoverChecklist}
        />
        <button
          className="primary-button w-full"
          disabled={!sessionReady || locked || isSavingAcceptancePackage}
          type="submit"
        >
          <Save aria-hidden size={16} />
          {isSavingAcceptancePackage ? "保存中" : "保存验收材料"}
        </button>
      </form>

      <form
        className="mt-5 space-y-3 border-t border-[color:var(--border)] pt-4"
        onSubmit={onSaveOperationsGuide}
      >
        {acceptancePackageArtifact ? (
          <p className="text-sm text-[color:var(--muted)]">
            当前验收材料 Artifact：{shortId(acceptancePackageArtifact.id)}
          </p>
        ) : null}
        <TextField
          disabled={locked}
          label="运行依赖"
          onChange={(value) => onOperationsGuideChange({ runtimeDependencies: value })}
          rows={3}
          value={operationsGuide.runtimeDependencies}
        />
        <TextField
          disabled={locked}
          label="数据更新计划"
          onChange={(value) => onOperationsGuideChange({ dataUpdatePlan: value })}
          rows={3}
          value={operationsGuide.dataUpdatePlan}
        />
        <TextField
          disabled={locked}
          label="监控计划"
          onChange={(value) => onOperationsGuideChange({ monitoringPlan: value })}
          rows={3}
          value={operationsGuide.monitoringPlan}
        />
        <TextField
          disabled={locked}
          label="常见问题"
          onChange={(value) => onOperationsGuideChange({ commonIssues: value })}
          rows={3}
          value={operationsGuide.commonIssues}
        />
        <TextField
          disabled={locked}
          label="维护负责人说明"
          onChange={(value) => onOperationsGuideChange({ maintenanceOwnerNotes: value })}
          rows={3}
          value={operationsGuide.maintenanceOwnerNotes}
        />
        <button
          className="primary-button w-full"
          disabled={!sessionReady || locked || isSavingOperationsGuide}
          type="submit"
        >
          <Save aria-hidden size={16} />
          {isSavingOperationsGuide ? "保存中" : "保存运维说明"}
        </button>
      </form>

      <div className="mt-4 grid gap-3 border-t border-[color:var(--border)] pt-4">
        {operationsGuideArtifact ? (
          <p className="text-sm text-[color:var(--muted)]">
            当前运维说明 Artifact：{shortId(operationsGuideArtifact.id)}
          </p>
        ) : null}
        <button
          className="icon-button w-full"
          disabled={!sessionReady || locked || isRequestingAiReview}
          onClick={onRequestAiReview}
          type="button"
        >
          <SearchCheck aria-hidden size={16} />
          {isRequestingAiReview ? "审阅生成中" : "请求 AI 交付审阅"}
        </button>
        {aiReviewArtifact ? <StageFiveAiReviewSummary artifact={aiReviewArtifact} /> : null}
        <button
          className="primary-button w-full"
          disabled={!sessionReady || locked || isCompletingStageFive}
          onClick={onCompleteStageFive}
          type="button"
        >
          <CheckCircle2 aria-hidden size={16} />
          {isCompletingStageFive ? "完成中" : "完成阶段五"}
        </button>
      </div>
    </section>
  );
}

function StageFiveAiReviewSummary({ artifact }: { artifact: Artifact }) {
  const content = artifact.content_json;
  const aiCallLogId = stringValue(content.ai_call_log_id);
  const deliveryCompleteness = content.delivery_completeness;
  const acceptanceRisks = stringListValue(content.acceptance_risks);
  const operationsRisks = stringListValue(content.operations_risks);
  const improvementSuggestions = stringListValue(content.improvement_suggestions);
  return (
    <article className="rounded border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label="AI 交付审阅" tone="accent" />
        {aiCallLogId ? (
          <span className="text-xs text-[color:var(--muted)]">AI Log {shortId(aiCallLogId)}</span>
        ) : null}
      </div>
      <p className="mt-2 font-semibold text-[color:var(--foreground)]">
        最终准备度：{stringValue(content.final_readiness) || "未返回"}
      </p>
      <p className="mt-2 leading-6 text-[color:var(--muted)]">
        {stringValue(content.review_summary)}
      </p>
      {isRecord(deliveryCompleteness) ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-[color:var(--muted)]">
          {Object.entries(deliveryCompleteness).map(([key, value]) => (
            <CompletenessItem key={key} label={key} value={value} />
          ))}
        </dl>
      ) : null}
      {acceptanceRisks.length > 0 ? <ReviewList title="验收风险" items={acceptanceRisks} /> : null}
      {operationsRisks.length > 0 ? <ReviewList title="运维风险" items={operationsRisks} /> : null}
      {improvementSuggestions.length > 0 ? (
        <ReviewList title="改进建议" items={improvementSuggestions} />
      ) : null}
    </article>
  );
}

function CompletenessItem({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded border border-[color:var(--border)] bg-white px-2 py-1">
      <dt className="break-all font-semibold text-[color:var(--foreground)]">{label}</dt>
      <dd className="mt-1 break-all">{String(value ?? "")}</dd>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
