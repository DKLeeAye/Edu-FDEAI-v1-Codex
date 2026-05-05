"use client";

import {
  CheckCircle2,
  ClipboardCheck,
  HelpCircle,
  ListChecks,
  MessageCircle,
  RefreshCw,
  Save,
  Send,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

import type { Artifact, StageOneSummaryPayload } from "@/src/lib/api";

import { formatDateTime, sanitizeProductText, stageStatusCopy } from "./terminology";
import { EmptyState, StatusBadge } from "./ui";

type StageOneWorkspaceProps = {
  artifacts: Artifact[];
  isCompletingStage: boolean;
  isRefreshing: boolean;
  isSavingSummary: boolean;
  isSendingInterview: boolean;
  onAskCustomer: (message: string) => Promise<boolean>;
  onCompleteStage: () => Promise<boolean>;
  onRefresh: () => void;
  onSaveSummary: (payload: StageOneSummaryPayload) => Promise<boolean>;
  stageStatus?: string;
};

type SummaryDraft = {
  problemStatement: string;
  targetUser: string;
  businessContext: string;
  painPoints: string;
  successCriteria: string;
};

type InterviewRecord = {
  answer: string;
  id: string;
  question: string;
  time: string;
};

const defaultQuestion = "当前质检流程中，最影响审厂准备的痛点是什么？";

const questionSuggestions = [
  "当前质检流程是怎样流转的？",
  "最常见的漏检或追溯问题在哪里？",
  "审厂成功的判断标准是什么？",
  "现有数据由谁维护，字段是否完整？",
  "一线人员最担心系统带来什么负担？",
];

const emptySummaryDraft: SummaryDraft = {
  problemStatement: "",
  targetUser: "",
  businessContext: "",
  painPoints: "",
  successCriteria: "",
};

export function StageOneWorkspace({
  artifacts,
  isCompletingStage,
  isRefreshing,
  isSavingSummary,
  isSendingInterview,
  onAskCustomer,
  onCompleteStage,
  onRefresh,
  onSaveSummary,
  stageStatus,
}: StageOneWorkspaceProps) {
  const [message, setMessage] = useState(defaultQuestion);
  const status = stageStatusCopy(stageStatus);
  const completed = stageStatus === "completed";
  const interviewRecords = useMemo(() => createInterviewRecords(artifacts), [artifacts]);
  const latestSummaryArtifact = useMemo(
    () => latestArtifactOfType(artifacts, "stage_1_problem_summary"),
    [artifacts],
  );
  const latestSummaryId = latestSummaryArtifact?.id ?? null;
  const [summaryState, setSummaryState] = useState<{
    draft: SummaryDraft;
    sourceArtifactId: string | null;
  }>({
    draft: latestSummaryArtifact ? summaryDraftFromArtifact(latestSummaryArtifact) : emptySummaryDraft,
    sourceArtifactId: latestSummaryId,
  });
  const summaryDraft =
    summaryState.sourceArtifactId === latestSummaryId
      ? summaryState.draft
      : latestSummaryArtifact
        ? summaryDraftFromArtifact(latestSummaryArtifact)
        : summaryState.draft;
  const hasSavedSummary = latestSummaryArtifact !== null;
  const coverageItems = useMemo(
    () => [
      { label: "业务现状", ready: summaryDraft.businessContext.trim().length > 0 },
      { label: "目标用户", ready: summaryDraft.targetUser.trim().length > 0 },
      { label: "核心痛点", ready: summaryDraft.painPoints.trim().length > 0 },
      { label: "成功标准", ready: summaryDraft.successCriteria.trim().length > 0 },
      { label: "问题定义", ready: summaryDraft.problemStatement.trim().length > 0 },
    ],
    [summaryDraft],
  );
  const canSaveSummary =
    summaryDraft.problemStatement.trim().length > 0 &&
    summaryDraft.targetUser.trim().length > 0 &&
    summaryDraft.businessContext.trim().length > 0;

  async function handleInterviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0 || completed) {
      return;
    }
    const saved = await onAskCustomer(trimmedMessage);
    if (saved) {
      setMessage("");
    }
  }

  async function handleSummarySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSaveSummary || completed) {
      return;
    }
    await onSaveSummary({
      problem_statement: summaryDraft.problemStatement.trim(),
      target_user: summaryDraft.targetUser.trim(),
      business_context: summaryDraft.businessContext.trim(),
      pain_points: lines(summaryDraft.painPoints),
      success_criteria: lines(summaryDraft.successCriteria),
    });
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[18px] bg-slate-950 p-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="阶段一工作区" tone="success" />
              <StatusBadge label={status.label} tone={status.tone} />
            </div>
            <h3 className="mt-4 text-2xl font-extrabold leading-tight">
              从客户访谈中提炼真实问题
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
              本阶段按“访谈线索、信息整理、问题发现总结、阶段完成”推进。访谈不是目的，形成能进入方案定义的问题判断才是交付结果。
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
          <StepCard icon={<MessageCircle aria-hidden size={18} />} label="访谈线索" value={`${interviewRecords.length} 轮`} />
          <StepCard icon={<ListChecks aria-hidden size={18} />} label="信息整理" value={`${coverageItems.filter((item) => item.ready).length} / ${coverageItems.length}`} />
          <StepCard icon={<ClipboardCheck aria-hidden size={18} />} label="问题总结" value={hasSavedSummary ? "已保存" : "待保存"} />
          <StepCard icon={<CheckCircle2 aria-hidden size={18} />} label="阶段完成" value={completed ? "已完成" : "待确认"} />
        </div>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
        <InterviewPanel
          completed={completed}
          interviewRecords={interviewRecords}
          isSending={isSendingInterview}
          message={message}
          onMessageChange={setMessage}
          onSubmit={handleInterviewSubmit}
          onUseSuggestion={setMessage}
        />
        <ClueBoard coverageItems={coverageItems} latestSummaryArtifact={latestSummaryArtifact} />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,.95fr)_minmax(360px,1.05fr)]">
        <SummaryEditor
          canSaveSummary={canSaveSummary}
          completed={completed}
          draft={summaryDraft}
          isSaving={isSavingSummary}
          onChange={(patch) =>
            setSummaryState({
              draft: { ...summaryDraft, ...patch },
              sourceArtifactId: latestSummaryId,
            })
          }
          onSubmit={handleSummarySubmit}
        />
        <CompletionPanel
          completed={completed}
          hasInterviewRecords={interviewRecords.length > 0}
          hasSavedSummary={hasSavedSummary}
          isCompleting={isCompletingStage}
          onCompleteStage={onCompleteStage}
        />
      </section>
    </div>
  );
}

function InterviewPanel({
  completed,
  interviewRecords,
  isSending,
  message,
  onMessageChange,
  onSubmit,
  onUseSuggestion,
}: {
  completed: boolean;
  interviewRecords: InterviewRecord[];
  isSending: boolean;
  message: string;
  onMessageChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUseSuggestion: (value: string) => void;
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">项目实战拜访</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            向客户追问现状、痛点、约束、数据基础和成功标准。
          </p>
        </div>
        <StatusBadge label={`${interviewRecords.length} 轮记录`} tone="info" />
      </div>

      <div className="mt-4 grid max-h-[440px] gap-4 overflow-y-auto pr-1">
        {interviewRecords.length === 0 ? (
          <EmptyState title="还没有客户访谈记录">
            从一个具体业务问题开始，客户会根据制造业质检场景给出回应。
          </EmptyState>
        ) : (
          interviewRecords.map((record) => (
            <article className="grid gap-3" key={record.id}>
              <div className="ml-auto max-w-[88%] rounded-2xl border border-sky-100 bg-sky-50 p-3">
                <p className="text-xs font-extrabold text-sky-700">学生追问</p>
                <p className="mt-1 text-sm leading-6 text-slate-800">{record.question}</p>
              </div>
              <div className="max-w-[92%] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-extrabold text-emerald-700">客户回应</p>
                  <span className="text-xs font-bold text-slate-400">{record.time}</span>
                </div>
                <p className="mt-1 text-sm leading-7 text-slate-700">{record.answer}</p>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-xs font-extrabold text-slate-500">推荐追问</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {questionSuggestions.map((suggestion) => (
            <button
              className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={completed || isSending}
              key={suggestion}
              onClick={() => onUseSuggestion(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <label className="text-sm font-extrabold text-slate-800" htmlFor="stage-one-question">
          本轮想确认什么
        </label>
        <textarea
          className="min-h-28 resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 transition placeholder:text-slate-400 focus:border-emerald-300"
          disabled={completed || isSending}
          id="stage-one-question"
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="例如：目前质检记录分散在哪些系统里？"
          value={message}
        />
        <div className="flex justify-end">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={completed || isSending || message.trim().length === 0}
            type="submit"
          >
            <Send aria-hidden size={16} />
            {isSending ? "客户回应中" : "发送给客户"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ClueBoard({
  coverageItems,
  latestSummaryArtifact,
}: {
  coverageItems: Array<{ label: string; ready: boolean }>;
  latestSummaryArtifact: Artifact | null;
}) {
  const summary = latestSummaryArtifact?.content_json;
  const savedPainPoints = arrayOrString(summary?.pain_points);
  const savedSuccessCriteria = arrayOrString(summary?.success_criteria);

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">访谈线索整理</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            把客户回应整理成可以被方案阶段继承的判断。
          </p>
        </div>
        <StatusBadge label="拜访间整理" tone="success" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {coverageItems.map((item) => (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3" key={item.label}>
            <div className="flex items-center gap-2">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full ${
                  item.ready ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                }`}
              >
                {item.ready ? <CheckCircle2 aria-hidden size={14} /> : <HelpCircle aria-hidden size={14} />}
              </span>
              <p className="text-sm font-extrabold text-slate-800">{item.label}</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {item.ready ? "已纳入问题发现总结草稿" : "需要在访谈或总结中补充"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
        <h4 className="text-sm font-extrabold text-emerald-800">最近保存的问题判断</h4>
        {latestSummaryArtifact ? (
          <div className="mt-2 grid gap-3 text-sm leading-6 text-emerald-900">
            <p>{stringValue(summary?.problem_statement) || "已保存问题发现总结。"}</p>
            {savedPainPoints.length > 0 ? <BulletList items={savedPainPoints.slice(0, 3)} /> : null}
            {savedSuccessCriteria.length > 0 ? (
              <p className="text-xs font-bold text-emerald-700">
                成功标准：{savedSuccessCriteria.slice(0, 2).join(" / ")}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm leading-6 text-emerald-800">
            保存问题发现总结后，这里会展示可进入阶段二的核心判断。
          </p>
        )}
      </div>
    </section>
  );
}

function SummaryEditor({
  canSaveSummary,
  completed,
  draft,
  isSaving,
  onChange,
  onSubmit,
}: {
  canSaveSummary: boolean;
  completed: boolean;
  draft: SummaryDraft;
  isSaving: boolean;
  onChange: (patch: Partial<SummaryDraft>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div>
        <h3 className="text-lg font-extrabold text-slate-950">问题发现总结</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          用业务语言定义真实问题，并写清楚服务对象、背景、痛点和成功标准。
        </p>
      </div>
      <form className="mt-4 grid gap-4" onSubmit={onSubmit}>
        <SummaryField
          label="问题陈述"
          onChange={(value) => onChange({ problemStatement: value })}
          placeholder="例如：审厂前质检记录分散，人工整理慢且追溯困难。"
          required
          value={draft.problemStatement}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <SummaryField
            label="目标用户"
            onChange={(value) => onChange({ targetUser: value })}
            placeholder="例如：生产负责人、一线质检员"
            required
            value={draft.targetUser}
          />
          <SummaryField
            label="业务背景"
            onChange={(value) => onChange({ businessContext: value })}
            placeholder="例如：汽车零部件工厂准备大客户审厂。"
            required
            value={draft.businessContext}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SummaryField
            label="核心痛点"
            onChange={(value) => onChange({ painPoints: value })}
            placeholder="每行写一个痛点"
            rows={5}
            value={draft.painPoints}
          />
          <SummaryField
            label="成功标准"
            onChange={(value) => onChange({ successCriteria: value })}
            placeholder="每行写一个可验收标准"
            rows={5}
            value={draft.successCriteria}
          />
        </div>
        <div className="flex justify-end">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={completed || isSaving || !canSaveSummary}
            type="submit"
          >
            <Save aria-hidden size={16} />
            {isSaving ? "保存中" : "保存问题发现总结"}
          </button>
        </div>
      </form>
    </section>
  );
}

function CompletionPanel({
  completed,
  hasInterviewRecords,
  hasSavedSummary,
  isCompleting,
  onCompleteStage,
}: {
  completed: boolean;
  hasInterviewRecords: boolean;
  hasSavedSummary: boolean;
  isCompleting: boolean;
  onCompleteStage: () => Promise<boolean>;
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">阶段完成</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            保存问题发现总结后，可以确认阶段一完成并开启方案定义。
          </p>
        </div>
        <StatusBadge label={completed ? "已完成" : hasSavedSummary ? "可完成" : "待总结"} tone={completed ? "success" : hasSavedSummary ? "warning" : "muted"} />
      </div>

      <div className="mt-5 grid gap-3">
        <CompletionCheck label="建议完成至少一轮客户访谈" ready={hasInterviewRecords || completed} />
        <CompletionCheck label="整理客户语境与核心痛点" ready={hasSavedSummary} />
        <CompletionCheck label="保存问题发现总结" ready={hasSavedSummary} />
        <CompletionCheck label="解锁方案定义阶段" ready={completed} />
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
        {completed
          ? "阶段一已经完成。你可以复盘访谈记录和问题总结，并进入下一阶段继续定义方案。"
          : hasSavedSummary
            ? "当前总结已保存，确认后系统会刷新阶段状态并开放下一阶段。"
            : "先保存问题发现总结，再完成阶段一。"}
      </div>

      <button
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={completed || isCompleting || !hasSavedSummary}
        onClick={() => void onCompleteStage()}
        type="button"
      >
        <CheckCircle2 aria-hidden size={16} />
        {completed ? "阶段一已完成" : isCompleting ? "确认中" : "完成阶段一并解锁阶段二"}
      </button>
    </section>
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

function SummaryField({
  label,
  onChange,
  placeholder,
  required = false,
  rows = 3,
  value,
}: {
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
        className="min-h-20 resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 transition placeholder:text-slate-400 focus:border-emerald-300"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </label>
  );
}

function CompletionCheck({ label, ready }: { label: string; ready: boolean }) {
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

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-1">
      {items.map((item) => (
        <li className="flex gap-2 text-sm leading-6" key={item}>
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function createInterviewRecords(artifacts: Artifact[]): InterviewRecord[] {
  return artifacts
    .filter((artifact) => artifact.artifact_type === "stage_1_interview_turn")
    .slice()
    .sort(compareArtifactsByCreatedAt)
    .map((artifact) => ({
      answer: stringValue(artifact.content_json.ai_customer_response) || "客户已回应。",
      id: artifact.id,
      question: stringValue(artifact.content_json.user_message) || "已提交访谈问题。",
      time: formatDateTime(artifact.created_at),
    }));
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

function summaryDraftFromArtifact(artifact: Artifact): SummaryDraft {
  const content = artifact.content_json;
  return {
    problemStatement: stringValue(content.problem_statement),
    targetUser: stringValue(content.target_user),
    businessContext: stringValue(content.business_context),
    painPoints: arrayOrString(content.pain_points).join("\n"),
    successCriteria: arrayOrString(content.success_criteria).join("\n"),
  };
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

function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? sanitizeProductText(value) : "";
}
