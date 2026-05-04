import { CheckCircle2, Save, SearchCheck } from "lucide-react";
import type { FormEvent } from "react";

import type { Artifact, StageFourAppMode, StageFourOverallResult } from "@/src/lib/api";

import { ReviewList, StatusPill, TextField } from "./common";
import type {
  StageFourDifyImplementationFormState,
  StageFourTestReportFormState,
} from "./types";
import { shortId, stageTone, stringListValue, stringValue } from "./utils";

type StageFourPanelProps = {
  aiReviewArtifact: Artifact | null;
  difyImplementation: StageFourDifyImplementationFormState;
  difyImplementationArtifact: Artifact | null;
  isCompletingStageFour: boolean;
  isRequestingAiReview: boolean;
  isSavingDifyImplementation: boolean;
  isSavingTestReport: boolean;
  locked: boolean;
  onCompleteStageFour: () => void;
  onDifyImplementationChange: (patch: Partial<StageFourDifyImplementationFormState>) => void;
  onRequestAiReview: () => void;
  onSaveDifyImplementation: (event: FormEvent<HTMLFormElement>) => void;
  onSaveTestReport: (event: FormEvent<HTMLFormElement>) => void;
  onTestReportChange: (patch: Partial<StageFourTestReportFormState>) => void;
  sessionReady: boolean;
  stageStatus?: string;
  testReport: StageFourTestReportFormState;
  testReportArtifact: Artifact | null;
};

export function StageFourPanel({
  aiReviewArtifact,
  difyImplementation,
  difyImplementationArtifact,
  isCompletingStageFour,
  isRequestingAiReview,
  isSavingDifyImplementation,
  isSavingTestReport,
  locked,
  onCompleteStageFour,
  onDifyImplementationChange,
  onRequestAiReview,
  onSaveDifyImplementation,
  onSaveTestReport,
  onTestReportChange,
  sessionReady,
  stageStatus,
  testReport,
  testReportArtifact,
}: StageFourPanelProps) {
  return (
    <section className="panel h-fit p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">阶段四 Dify 实现与测试</h2>
          {locked ? (
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              先完成阶段三后再提交阶段四 Dify 实现记录。
            </p>
          ) : null}
        </div>
        <StatusPill label={stageStatus ?? "locked"} tone={stageTone(stageStatus)} />
      </div>

      <form className="mt-4 space-y-3" onSubmit={onSaveDifyImplementation}>
        <TextField
          disabled={locked}
          label="Dify 应用名称"
          onChange={(value) => onDifyImplementationChange({ difyAppName: value })}
          rows={2}
          value={difyImplementation.difyAppName}
        />
        <TextField
          disabled={locked}
          label="Dify 应用 URL"
          onChange={(value) => onDifyImplementationChange({ difyAppUrl: value })}
          rows={2}
          value={difyImplementation.difyAppUrl}
        />
        <TextField
          disabled={locked}
          label="Dify 应用 ID"
          onChange={(value) => onDifyImplementationChange({ difyAppId: value })}
          rows={2}
          value={difyImplementation.difyAppId}
        />
        <div>
          <label className="field-label" htmlFor="stage-four-app-mode">
            应用模式
          </label>
          <select
            className="field-select"
            disabled={locked}
            id="stage-four-app-mode"
            onChange={(event) =>
              onDifyImplementationChange({
                appMode: event.target.value as StageFourAppMode,
              })
            }
            value={difyImplementation.appMode}
          >
            <option value="chatflow">chatflow</option>
            <option value="workflow">workflow</option>
            <option value="agent">agent</option>
          </select>
        </div>
        <TextField
          disabled={locked}
          label="知识库配置记录"
          onChange={(value) => onDifyImplementationChange({ knowledgeBaseNotes: value })}
          rows={4}
          value={difyImplementation.knowledgeBaseNotes}
        />
        <TextField
          disabled={locked}
          label="Prompt 或指令记录"
          onChange={(value) => onDifyImplementationChange({ promptOrInstructionNotes: value })}
          rows={4}
          value={difyImplementation.promptOrInstructionNotes}
        />
        <TextField
          disabled={locked}
          label="工具配置记录"
          onChange={(value) => onDifyImplementationChange({ toolConfigurationNotes: value })}
          rows={3}
          value={difyImplementation.toolConfigurationNotes}
        />
        <TextField
          disabled={locked}
          label="实现说明"
          onChange={(value) => onDifyImplementationChange({ implementationNotes: value })}
          rows={4}
          value={difyImplementation.implementationNotes}
        />
        <TextField
          disabled={locked}
          label="已知限制"
          onChange={(value) => onDifyImplementationChange({ knownLimitations: value })}
          rows={3}
          value={difyImplementation.knownLimitations}
        />
        <button
          className="primary-button w-full"
          disabled={!sessionReady || locked || isSavingDifyImplementation}
          type="submit"
        >
          <Save aria-hidden size={16} />
          {isSavingDifyImplementation ? "保存中" : "保存 Dify 实现记录"}
        </button>
      </form>

      <form
        className="mt-5 space-y-3 border-t border-[color:var(--border)] pt-4"
        onSubmit={onSaveTestReport}
      >
        {difyImplementationArtifact ? (
          <p className="text-sm text-[color:var(--muted)]">
            当前 Dify 实现 Artifact：{shortId(difyImplementationArtifact.id)}
          </p>
        ) : null}
        <TextField
          disabled={locked}
          label="测试目标"
          onChange={(value) => onTestReportChange({ testGoal: value })}
          rows={3}
          value={testReport.testGoal}
        />
        <TextField
          disabled={locked}
          label="测试用例 JSON"
          onChange={(value) => onTestReportChange({ testCases: value })}
          rows={10}
          value={testReport.testCases}
        />
        <TextField
          disabled={locked}
          label="观察到的问题"
          onChange={(value) => onTestReportChange({ observedFailures: value })}
          rows={3}
          value={testReport.observedFailures}
        />
        <TextField
          disabled={locked}
          label="改进动作"
          onChange={(value) => onTestReportChange({ improvementActions: value })}
          rows={3}
          value={testReport.improvementActions}
        />
        <div>
          <label className="field-label" htmlFor="stage-four-overall-result">
            总体结果
          </label>
          <select
            className="field-select"
            disabled={locked}
            id="stage-four-overall-result"
            onChange={(event) =>
              onTestReportChange({
                overallResult: event.target.value as StageFourOverallResult,
              })
            }
            value={testReport.overallResult}
          >
            <option value="passed">passed</option>
            <option value="needs_revision">needs_revision</option>
          </select>
        </div>
        <button
          className="primary-button w-full"
          disabled={!sessionReady || locked || isSavingTestReport}
          type="submit"
        >
          <Save aria-hidden size={16} />
          {isSavingTestReport ? "保存中" : "保存测试报告"}
        </button>
      </form>

      <div className="mt-4 grid gap-3 border-t border-[color:var(--border)] pt-4">
        {testReportArtifact ? (
          <p className="text-sm text-[color:var(--muted)]">
            当前测试报告 Artifact：{shortId(testReportArtifact.id)}
          </p>
        ) : null}
        <button
          className="icon-button w-full"
          disabled={!sessionReady || locked || isRequestingAiReview}
          onClick={onRequestAiReview}
          type="button"
        >
          <SearchCheck aria-hidden size={16} />
          {isRequestingAiReview ? "反馈生成中" : "请求 AI 测试反馈"}
        </button>
        {aiReviewArtifact ? <StageFourAiReviewSummary artifact={aiReviewArtifact} /> : null}
        <button
          className="primary-button w-full"
          disabled={!sessionReady || locked || isCompletingStageFour}
          onClick={onCompleteStageFour}
          type="button"
        >
          <CheckCircle2 aria-hidden size={16} />
          {isCompletingStageFour ? "完成中" : "完成阶段四"}
        </button>
      </div>
    </section>
  );
}

function StageFourAiReviewSummary({ artifact }: { artifact: Artifact }) {
  const content = artifact.content_json;
  const testCoverage = content.test_coverage_feedback;
  const aiCallLogId = stringValue(content.ai_call_log_id);
  const implementationRisks = stringListValue(content.implementation_risks);
  const improvementSuggestions = stringListValue(content.improvement_suggestions);
  return (
    <article className="rounded border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label="AI 测试反馈" tone="accent" />
        {aiCallLogId ? (
          <span className="text-xs text-[color:var(--muted)]">AI Log {shortId(aiCallLogId)}</span>
        ) : null}
      </div>
      <p className="mt-2 font-semibold text-[color:var(--foreground)]">
        发布准备度：{stringValue(content.release_readiness) || "未返回"}
      </p>
      <p className="mt-2 leading-6 text-[color:var(--muted)]">
        {stringValue(content.review_summary)}
      </p>
      {isRecord(testCoverage) ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-[color:var(--muted)]">
          <CoverageItem label="总用例" value={testCoverage.total_cases} />
          <CoverageItem label="通过" value={testCoverage.passed_cases} />
          <CoverageItem label="未完全通过" value={testCoverage.failed_or_partial_cases} />
          <CoverageItem label="总体结果" value={testCoverage.overall_result} />
        </dl>
      ) : null}
      {implementationRisks.length > 0 ? (
        <ReviewList title="实现风险" items={implementationRisks} />
      ) : null}
      {improvementSuggestions.length > 0 ? (
        <ReviewList title="改进建议" items={improvementSuggestions} />
      ) : null}
    </article>
  );
}

function CoverageItem({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded border border-[color:var(--border)] bg-white px-2 py-1">
      <dt className="font-semibold text-[color:var(--foreground)]">{label}</dt>
      <dd className="mt-1 break-all">{String(value ?? "")}</dd>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
