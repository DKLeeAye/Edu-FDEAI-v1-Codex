import { CheckCircle2, Save, SearchCheck } from "lucide-react";
import type { FormEvent } from "react";

import type { Artifact } from "@/src/lib/api";

import { ReviewSummary, StatusPill, TextField } from "./common";
import type { SolutionFormState } from "./types";
import { shortId, stageTone } from "./utils";

type StageTwoPanelProps = {
  isCompletingStageTwo: boolean;
  isRequestingReview: boolean;
  isSavingSolution: boolean;
  locked: boolean;
  onCompleteStageTwo: () => void;
  onRequestReview: () => void;
  onSaveSolution: (event: FormEvent<HTMLFormElement>) => void;
  onSolutionChange: (patch: Partial<SolutionFormState>) => void;
  reviewArtifact: Artifact | null;
  sessionReady: boolean;
  solution: SolutionFormState;
  solutionArtifact: Artifact | null;
  stageStatus?: string;
};

export function StageTwoPanel({
  isCompletingStageTwo,
  isRequestingReview,
  isSavingSolution,
  locked,
  onCompleteStageTwo,
  onRequestReview,
  onSaveSolution,
  onSolutionChange,
  reviewArtifact,
  sessionReady,
  solution,
  solutionArtifact,
  stageStatus,
}: StageTwoPanelProps) {
  return (
    <section className="panel h-fit p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">阶段二方案定义</h2>
          {locked ? (
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              先完成阶段一后再保存阶段二方案。
            </p>
          ) : null}
        </div>
        <StatusPill label={stageStatus ?? "locked"} tone={stageTone(stageStatus)} />
      </div>
      <form className="mt-4 space-y-3" onSubmit={onSaveSolution}>
        <TextField
          disabled={locked}
          label="方案标题"
          onChange={(value) => onSolutionChange({ solutionTitle: value })}
          rows={2}
          value={solution.solutionTitle}
        />
        <TextField
          disabled={locked}
          label="问题总结"
          onChange={(value) => onSolutionChange({ problemSummary: value })}
          rows={4}
          value={solution.problemSummary}
        />
        <TextField
          disabled={locked}
          label="智能体能力"
          onChange={(value) => onSolutionChange({ proposedAgentCapability: value })}
          rows={4}
          value={solution.proposedAgentCapability}
        />
        <TextField
          disabled={locked}
          label="目标流程"
          onChange={(value) => onSolutionChange({ targetWorkflow: value })}
          rows={4}
          value={solution.targetWorkflow}
        />
        <TextField
          disabled={locked}
          label="数据来源"
          onChange={(value) => onSolutionChange({ dataSources: value })}
          rows={3}
          value={solution.dataSources}
        />
        <TextField
          disabled={locked}
          label="工具或系统依赖"
          onChange={(value) => onSolutionChange({ toolOrSystemDependencies: value })}
          rows={3}
          value={solution.toolOrSystemDependencies}
        />
        <TextField
          disabled={locked}
          label="可行性风险"
          onChange={(value) => onSolutionChange({ feasibilityRisks: value })}
          rows={3}
          value={solution.feasibilityRisks}
        />
        <TextField
          disabled={locked}
          label="预期价值"
          onChange={(value) => onSolutionChange({ expectedValue: value })}
          rows={4}
          value={solution.expectedValue}
        />
        <button
          className="primary-button w-full"
          disabled={!sessionReady || locked || isSavingSolution}
          type="submit"
        >
          <Save aria-hidden size={16} />
          {isSavingSolution ? "保存中" : "保存阶段二方案"}
        </button>
      </form>

      <div className="mt-4 grid gap-3 border-t border-[color:var(--border)] pt-4">
        {solutionArtifact ? (
          <p className="text-sm text-[color:var(--muted)]">
            当前方案 Artifact：{shortId(solutionArtifact.id)}
          </p>
        ) : null}
        <button
          className="icon-button w-full"
          disabled={!sessionReady || locked || isRequestingReview}
          onClick={onRequestReview}
          type="button"
        >
          <SearchCheck aria-hidden size={16} />
          {isRequestingReview ? "评审中" : "请求 AI 可行性评审"}
        </button>
        {reviewArtifact ? <ReviewSummary artifact={reviewArtifact} /> : null}
        <button
          className="primary-button w-full"
          disabled={!sessionReady || locked || isCompletingStageTwo}
          onClick={onCompleteStageTwo}
          type="button"
        >
          <CheckCircle2 aria-hidden size={16} />
          {isCompletingStageTwo ? "完成中" : "完成阶段二"}
        </button>
      </div>
    </section>
  );
}
