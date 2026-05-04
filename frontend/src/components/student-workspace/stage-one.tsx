import { CheckCircle2, Save, Send } from "lucide-react";
import type { FormEvent } from "react";

import { StatusPill, TextField } from "./common";
import type { InterviewTurn, SummaryFormState } from "./types";
import { shortId, stageTone } from "./utils";

type StageOneInterviewPanelProps = {
  isSending: boolean;
  message: string;
  onMessageChange: (value: string) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  sessionReady: boolean;
  turns: InterviewTurn[];
};

type StageOneSummaryPanelProps = {
  isCompletingStageOne: boolean;
  isSavingSummary: boolean;
  onCompleteStageOne: () => void;
  onSaveSummary: (event: FormEvent<HTMLFormElement>) => void;
  onSummaryChange: (patch: Partial<SummaryFormState>) => void;
  sessionReady: boolean;
  stageStatus?: string;
  summary: SummaryFormState;
};

export function StageOneInterviewPanel({
  isSending,
  message,
  onMessageChange,
  onSendMessage,
  sessionReady,
  turns,
}: StageOneInterviewPanelProps) {
  return (
    <section className="panel min-h-[520px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">AI 客户访谈</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            制造业质检 AI 智能体实验包
          </p>
        </div>
        <StatusPill label="stage_1" tone="accent" />
      </div>

      <div className="mt-5 space-y-4">
        {turns.length === 0 ? (
          <div className="empty-state">
            <p className="text-sm font-medium text-[color:var(--foreground)]">
              尚无本页访谈记录
            </p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              登录并进入 session 后，可以直接向 AI 客户提问。
            </p>
          </div>
        ) : (
          turns.map((turn) => (
            <article className="space-y-3" key={turn.id}>
              <div className="chat-bubble chat-bubble-user">
                <span className="chat-label">学生</span>
                <p>{turn.userMessage}</p>
              </div>
              <div className="chat-bubble chat-bubble-ai">
                <span className="chat-label">AI 客户</span>
                <p>{turn.aiResponse}</p>
                <p className="mt-2 text-xs text-[color:var(--muted)]">
                  Artifact {shortId(turn.artifactId)}
                  {turn.aiCallLogId ? ` · AI Log ${shortId(turn.aiCallLogId)}` : ""}
                </p>
              </div>
            </article>
          ))
        )}
      </div>

      <form className="mt-5 border-t border-[color:var(--border)] pt-4" onSubmit={onSendMessage}>
        <label className="field-label" htmlFor="message">
          学生问题
        </label>
        <textarea
          className="field-textarea min-h-28"
          disabled={!sessionReady || isSending}
          id="message"
          onChange={(event) => onMessageChange(event.target.value)}
          value={message}
        />
        <div className="mt-3 flex justify-end">
          <button
            className="primary-button"
            disabled={!sessionReady || isSending || message.trim().length === 0}
            type="submit"
          >
            <Send aria-hidden size={16} />
            {isSending ? "发送中" : "发送给 AI 客户"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function StageOneSummaryPanel({
  isCompletingStageOne,
  isSavingSummary,
  onCompleteStageOne,
  onSaveSummary,
  onSummaryChange,
  sessionReady,
  stageStatus,
  summary,
}: StageOneSummaryPanelProps) {
  return (
    <section className="panel h-fit p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="section-title">问题发现总结</h2>
        <StatusPill label={stageStatus ?? "stage_1"} tone={stageTone(stageStatus)} />
      </div>
      <form className="mt-4 space-y-3" onSubmit={onSaveSummary}>
        <TextField
          label="问题陈述"
          onChange={(value) => onSummaryChange({ problemStatement: value })}
          value={summary.problemStatement}
        />
        <TextField
          label="目标用户"
          onChange={(value) => onSummaryChange({ targetUser: value })}
          value={summary.targetUser}
        />
        <TextField
          label="业务背景"
          onChange={(value) => onSummaryChange({ businessContext: value })}
          rows={4}
          value={summary.businessContext}
        />
        <TextField
          label="痛点"
          onChange={(value) => onSummaryChange({ painPoints: value })}
          rows={4}
          value={summary.painPoints}
        />
        <TextField
          label="成功标准"
          onChange={(value) => onSummaryChange({ successCriteria: value })}
          rows={4}
          value={summary.successCriteria}
        />
        <button
          className="primary-button w-full"
          disabled={!sessionReady || isSavingSummary}
          type="submit"
        >
          <Save aria-hidden size={16} />
          {isSavingSummary ? "保存中" : "保存总结"}
        </button>
      </form>
      <button
        className="icon-button mt-3 w-full"
        disabled={!sessionReady || isCompletingStageOne}
        onClick={onCompleteStageOne}
        type="button"
      >
        <CheckCircle2 aria-hidden size={16} />
        {isCompletingStageOne ? "完成中" : "完成阶段一"}
      </button>
    </section>
  );
}
