import { CheckCircle2, Save, SearchCheck } from "lucide-react";
import type { FormEvent } from "react";

import type { Artifact, StageThreeKnowledgeStrategy } from "@/src/lib/api";

import { KnowledgeReviewSummary, StatusPill, TextField } from "./common";
import type { KnowledgeDecisionFormState } from "./types";
import { shortId, stageTone } from "./utils";

type StageThreePanelProps = {
  decision: KnowledgeDecisionFormState;
  decisionArtifact: Artifact | null;
  isCompletingStageThree: boolean;
  isRequestingKnowledgeReview: boolean;
  isSavingKnowledgeDecision: boolean;
  locked: boolean;
  onCompleteStageThree: () => void;
  onDecisionChange: (patch: Partial<KnowledgeDecisionFormState>) => void;
  onRequestKnowledgeReview: () => void;
  onSaveKnowledgeDecision: (event: FormEvent<HTMLFormElement>) => void;
  reviewArtifact: Artifact | null;
  sessionReady: boolean;
  stageStatus?: string;
};

export function StageThreePanel({
  decision,
  decisionArtifact,
  isCompletingStageThree,
  isRequestingKnowledgeReview,
  isSavingKnowledgeDecision,
  locked,
  onCompleteStageThree,
  onDecisionChange,
  onRequestKnowledgeReview,
  onSaveKnowledgeDecision,
  reviewArtifact,
  sessionReady,
  stageStatus,
}: StageThreePanelProps) {
  return (
    <section className="panel h-fit p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">阶段三知识工程决策</h2>
          {locked ? (
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              先完成阶段二后再提交阶段三知识工程决策。
            </p>
          ) : null}
        </div>
        <StatusPill label={stageStatus ?? "locked"} tone={stageTone(stageStatus)} />
      </div>
      <form className="mt-4 space-y-3" onSubmit={onSaveKnowledgeDecision}>
        <TextField
          disabled={locked}
          label="知识目标"
          onChange={(value) => onDecisionChange({ knowledgeGoal: value })}
          rows={3}
          value={decision.knowledgeGoal}
        />
        <TextField
          disabled={locked}
          label="所需知识类型"
          onChange={(value) => onDecisionChange({ requiredKnowledgeTypes: value })}
          rows={3}
          value={decision.requiredKnowledgeTypes}
        />
        <TextField
          disabled={locked}
          label="知识来源清单"
          onChange={(value) => onDecisionChange({ sourceInventory: value })}
          rows={3}
          value={decision.sourceInventory}
        />
        <div>
          <label className="field-label" htmlFor="selected-strategy">
            知识策略
          </label>
          <select
            className="field-select"
            disabled={locked}
            id="selected-strategy"
            onChange={(event) =>
              onDecisionChange({
                selectedStrategy: event.target.value as StageThreeKnowledgeStrategy,
              })
            }
            value={decision.selectedStrategy}
          >
            <option value="prompt_only">prompt_only</option>
            <option value="rag">rag</option>
            <option value="tool_calling">tool_calling</option>
            <option value="hybrid">hybrid</option>
          </select>
        </div>
        <TextField
          disabled={locked}
          label="策略选择依据"
          onChange={(value) => onDecisionChange({ strategyRationale: value })}
          rows={4}
          value={decision.strategyRationale}
        />
        <TextField
          disabled={locked}
          label="数据质量风险"
          onChange={(value) => onDecisionChange({ dataQualityRisks: value })}
          rows={3}
          value={decision.dataQualityRisks}
        />
        <TextField
          disabled={locked}
          label="维护计划"
          onChange={(value) => onDecisionChange({ maintenancePlan: value })}
          rows={3}
          value={decision.maintenancePlan}
        />
        <TextField
          disabled={locked}
          label="评估计划"
          onChange={(value) => onDecisionChange({ evaluationPlan: value })}
          rows={3}
          value={decision.evaluationPlan}
        />
        <TextField
          disabled={locked}
          label="阶段四构建准备"
          onChange={(value) => onDecisionChange({ stage4BuildPlan: value })}
          rows={4}
          value={decision.stage4BuildPlan}
        />
        <button
          className="primary-button w-full"
          disabled={!sessionReady || locked || isSavingKnowledgeDecision}
          type="submit"
        >
          <Save aria-hidden size={16} />
          {isSavingKnowledgeDecision ? "保存中" : "保存知识工程决策"}
        </button>
      </form>

      <div className="mt-4 grid gap-3 border-t border-[color:var(--border)] pt-4">
        {decisionArtifact ? (
          <p className="text-sm text-[color:var(--muted)]">
            当前决策 Artifact：{shortId(decisionArtifact.id)}
          </p>
        ) : null}
        <button
          className="icon-button w-full"
          disabled={!sessionReady || locked || isRequestingKnowledgeReview}
          onClick={onRequestKnowledgeReview}
          type="button"
        >
          <SearchCheck aria-hidden size={16} />
          {isRequestingKnowledgeReview ? "评审中" : "请求 AI 知识工程决策评审"}
        </button>
        {reviewArtifact ? <KnowledgeReviewSummary artifact={reviewArtifact} /> : null}
        <button
          className="primary-button w-full"
          disabled={!sessionReady || locked || isCompletingStageThree}
          onClick={onCompleteStageThree}
          type="button"
        >
          <CheckCircle2 aria-hidden size={16} />
          {isCompletingStageThree ? "完成中" : "完成阶段三"}
        </button>
      </div>
    </section>
  );
}
