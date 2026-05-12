"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Factory,
  HelpCircle,
  Lightbulb,
  ListChecks,
  MessageCircle,
  RefreshCw,
  Save,
  Send,
  Target,
  UserRound,
} from "lucide-react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Artifact, StageOneGuidedTraining, StageOneSummaryPayload } from "@/src/lib/api";

import {
  createGuidedConversationMessages,
  createPracticeConversationRecords,
  createStageOneProgressItems,
  deriveCustomerIdentity,
  derivePracticeInsightState,
  isPlainEnterSubmitKey,
  latestGuidedConversationScrollKey,
  latestPracticeConversationScrollKey,
  type PendingGuidedTurn,
  type PendingPracticeQuestion,
  type StageOneCustomerIdentity,
  type PracticeInsightState,
  type StageOneMode,
  type StageOneProgressItem,
} from "./stage-one-flow";
import { guidedTrainingWorkspaceGridClass } from "./stage-one-layout";
import { formatDateTime, sanitizeProductText, stageStatusCopy } from "./terminology";
import { EmptyState, StatusBadge } from "./ui";

type StageOneWorkspaceProps = {
  artifacts: Artifact[];
  guidedTraining: StageOneGuidedTraining | null;
  isCompletingStage: boolean;
  isRefreshing: boolean;
  isSavingSummary: boolean;
  isSendingGuidedTurn: boolean;
  isSendingInterview: boolean;
  onAskCustomer: (message: string) => Promise<boolean>;
  onCompleteStage: () => Promise<boolean>;
  onModeChange: (mode: StageOneMode) => void;
  onRefresh: () => void;
  onSendGuidedTurn: (levelKey: string, message: string) => Promise<boolean>;
  onSaveSummary: (payload: StageOneSummaryPayload) => Promise<boolean>;
  stageStatus?: string;
  workspaceMode: StageOneMode;
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
  loading?: boolean;
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

const guidedLevels = [
  {
    key: "trust_building",
    title: "破冰",
    goal: "建立合作氛围，说明访谈目的，避免一开始就问系统功能。",
    technique: "先确认对方职责和项目背景，再用开放问题让客户描述当前工作。",
    suggestions: [
      "您平时主要负责质检流程里的哪些工作？",
      "这次想了解审厂准备里最费时间的环节，方便先从整体流程讲起吗？",
    ],
    response:
      "可以。我们这边主要是汽车零部件质检，审厂前确实要准备很多记录。我负责协调车间、质检员和质量部把资料补齐。",
  },
  {
    key: "business_context",
    title: "现状",
    goal: "摸清现有流程、参与角色、数据流转和高频工作场景。",
    technique: "用“从开始到结束”的流程追问，要求客户说出角色、材料和系统。",
    suggestions: [
      "从发现质检异常到形成审厂材料，中间通常经过哪些步骤？",
      "现在质检记录分别在哪些表、系统或纸质材料里？",
    ],
    response:
      "质检员先在纸质表和 Excel 里记录，月度再由质量部汇总。有些数据会进 ERP，但字段不完整，审厂前还是要人工翻表补证据。",
  },
  {
    key: "pain_point",
    title: "痛点",
    goal: "定位真实痛点的频率、影响范围、现有替代方案和业务后果。",
    technique: "把“麻烦”追问成可验证影响，例如耗时、返工、误判和客户风险。",
    suggestions: [
      "这些问题最常发生在哪类产品或哪道工序？",
      "如果资料没准备好，会对审厂或客户交付造成什么影响？",
    ],
    response:
      "最麻烦是追溯某一批次的检验记录。要查纸质记录、Excel 和 ERP，少则半天，多则两三天，客户催的时候压力很大。",
  },
  {
    key: "constraints",
    title: "约束",
    goal: "澄清预算、人员、权限、系统边界、上线时间和一线接受度。",
    technique: "不要直接承诺方案，先问清不能改变的条件和必须满足的限制。",
    suggestions: [
      "有哪些系统或流程短期内不能改？",
      "一线质检员能接受额外录入吗，还是更希望自动整理？",
    ],
    response:
      "短期不能换 ERP，也不能要求一线多填太多字段。最好是基于现有记录做整理，质量部可以补少量关键字段。",
  },
  {
    key: "data_feasibility",
    title: "数据",
    goal: "确认数据来源、质量、更新频率、字段缺口和权限可用性。",
    technique: "围绕样例、字段、历史记录和负责人追问，判断是否支撑智能体落地。",
    suggestions: [
      "能否提供近三个月的质检记录样例？",
      "哪些字段经常缺失，哪些字段是审厂必须看的？",
    ],
    response:
      "样例可以提供脱敏版。批次号、检验项、异常原因、整改记录是关键字段，但异常原因经常写得不规范。",
  },
  {
    key: "summary_alignment",
    title: "总结确认",
    goal: "复述问题定义和未确认点，让客户确认优先级和下一步材料。",
    technique: "用“我理解的是...”总结，再请客户纠偏，并明确下次拜访要补的证据。",
    suggestions: [
      "我理解当前关键问题是审厂追溯材料整理慢，这个判断准确吗？",
      "下次如果要验证方案，最需要先看哪些样例或规则？",
    ],
    response:
      "这个理解比较准确。你们可以先看三类材料：质检记录样例、审厂问题清单、历史客户整改要求。",
  },
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
  guidedTraining,
  isCompletingStage,
  isRefreshing,
  isSavingSummary,
  isSendingGuidedTurn,
  isSendingInterview,
  onAskCustomer,
  onCompleteStage,
  onModeChange,
  onRefresh,
  onSendGuidedTurn,
  onSaveSummary,
  stageStatus,
  workspaceMode,
}: StageOneWorkspaceProps) {
  const [message, setMessage] = useState(defaultQuestion);
  const [pendingInterview, setPendingInterview] = useState<PendingPracticeQuestion>(null);
  const status = stageStatusCopy(stageStatus);
  const completed = stageStatus === "completed";
  const interviewRecords = useMemo(() => createInterviewRecords(artifacts), [artifacts]);
  const displayedInterviewRecords = useMemo(
    () => createPracticeConversationRecords(interviewRecords, isSendingInterview ? pendingInterview : null),
    [interviewRecords, isSendingInterview, pendingInterview],
  );
  const progressItems = useMemo(
    () => createStageOneProgressItems(artifacts, stageStatus, guidedTraining),
    [artifacts, guidedTraining, stageStatus],
  );
  const customerIdentity = useMemo(
    () => deriveCustomerIdentity(guidedTraining?.customer_persona ?? null),
    [guidedTraining?.customer_persona],
  );
  const practiceInsights = useMemo(
    () => derivePracticeInsightState(artifacts, stageStatus),
    [artifacts, stageStatus],
  );
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
    if (trimmedMessage.length === 0 || completed || isSendingInterview) {
      return;
    }
    const pendingId = `practice-${Date.now()}`;
    setPendingInterview({ id: pendingId, question: trimmedMessage });
    setMessage("");
    const saved = await onAskCustomer(trimmedMessage);
    if (!saved) {
      setPendingInterview((current) => (current?.id === pendingId ? null : current));
      setMessage(trimmedMessage);
    } else {
      setPendingInterview((current) => (current?.id === pendingId ? null : current));
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
      {workspaceMode === "home" ? (
        <StageOneHome
          completed={completed}
          coverageReadyCount={coverageItems.filter((item) => item.ready).length}
          coverageTotal={coverageItems.length}
          hasSavedSummary={hasSavedSummary}
          interviewCount={interviewRecords.length}
          isRefreshing={isRefreshing}
          onOpenGuided={() => onModeChange("guided")}
          onOpenPractice={() => onModeChange("practice")}
          onRefresh={onRefresh}
          progressItems={progressItems}
          statusLabel={status.label}
        />
      ) : workspaceMode === "guided" ? (
        <GuidedTrainingWorkspace
          customerIdentity={customerIdentity}
          guidedTraining={guidedTraining}
          isSending={isSendingGuidedTurn}
          onBack={() => onModeChange("home")}
          onSendTurn={onSendGuidedTurn}
        />
      ) : (
        <StageOnePracticeWorkspace
          canSaveSummary={canSaveSummary}
          completed={completed}
          customerIdentity={customerIdentity}
          draft={summaryDraft}
          hasSavedSummary={hasSavedSummary}
          insightState={practiceInsights}
          interviewRecords={displayedInterviewRecords}
          isCompletingStage={isCompletingStage}
          isSavingSummary={isSavingSummary}
          isSendingInterview={isSendingInterview}
          message={message}
          onBack={() => onModeChange("home")}
          onCompleteStage={onCompleteStage}
          onInterviewSubmit={handleInterviewSubmit}
          onMessageChange={setMessage}
          onSaveSummaryChange={(patch) =>
            setSummaryState({
              draft: { ...summaryDraft, ...patch },
              sourceArtifactId: latestSummaryId,
            })
          }
          onSummarySubmit={handleSummarySubmit}
          onUseSuggestion={setMessage}
          progressItems={progressItems}
        />
      )}
    </div>
  );
}

function StageOneHome({
  completed,
  coverageReadyCount,
  coverageTotal,
  hasSavedSummary,
  interviewCount,
  isRefreshing,
  onOpenGuided,
  onOpenPractice,
  onRefresh,
  progressItems,
  statusLabel,
}: {
  completed: boolean;
  coverageReadyCount: number;
  coverageTotal: number;
  hasSavedSummary: boolean;
  interviewCount: number;
  isRefreshing: boolean;
  onOpenGuided: () => void;
  onOpenPractice: () => void;
  onRefresh: () => void;
  progressItems: StageOneProgressItem[];
  statusLabel: string;
}) {
  return (
    <>
      <section className="overflow-hidden rounded-[18px] bg-slate-950 p-6 text-white">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="阶段一主页" tone="success" />
              <StatusBadge label={statusLabel} tone="info" />
            </div>
            <h3 className="mt-5 max-w-4xl text-3xl font-extrabold leading-tight">
              需求访谈与问题发现
            </h3>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
              先通过教学引导掌握访谈动作，再进入项目实战完成正式客户拜访。阶段二只继承项目实战产出的正式问题总结。
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

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <ModeCard
            description="六个访谈关卡，逐关训练破冰、现状、痛点、约束、数据和总结确认。练习记录不写入正式项目证据。"
            icon={<BookOpenIcon />}
            meta="推荐首次学习"
            onClick={onOpenGuided}
            title="教学引导模式"
          />
          <ModeCard
            description="面对制造业质检客户完成正式拜访，客户不会主动泄露隐藏信息，需要主动追问并形成阶段产出。"
            icon={<Factory aria-hidden size={22} />}
            meta={interviewCount > 0 ? `${interviewCount} 轮正式拜访` : "正式项目入口"}
            onClick={onOpenPractice}
            primary
            title="项目实战模式"
          />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <StepCard
            icon={<MessageCircle aria-hidden size={18} />}
            label="正式拜访"
            value={`${interviewCount} 轮`}
          />
          <StepCard
            icon={<ListChecks aria-hidden size={18} />}
            label="线索覆盖"
            value={`${coverageReadyCount} / ${coverageTotal}`}
          />
          <StepCard
            icon={<ClipboardCheck aria-hidden size={18} />}
            label="问题总结"
            value={hasSavedSummary ? "已保存" : "待保存"}
          />
          <StepCard
            icon={<CheckCircle2 aria-hidden size={18} />}
            label="阶段评估"
            value={completed ? "已通过" : hasSavedSummary ? "可提交" : "待总结"}
          />
        </div>
      </section>

      <StageOneProgressOverview progressItems={progressItems} />
    </>
  );
}

function ModeCard({
  description,
  icon,
  meta,
  onClick,
  primary = false,
  title,
}: {
  description: string;
  icon: ReactNode;
  meta: string;
  onClick: () => void;
  primary?: boolean;
  title: string;
}) {
  return (
    <article
      className={`flex min-h-[220px] flex-col rounded-[18px] border p-5 ${
        primary ? "border-emerald-400/50 bg-emerald-400/15" : "border-white/15 bg-white/10"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/12 text-emerald-200">
          {icon}
        </span>
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-extrabold text-slate-200">
          {meta}
        </span>
      </div>
      <h4 className="mt-5 text-xl font-extrabold">{title}</h4>
      <p className="mt-3 flex-1 text-sm leading-7 text-slate-300">{description}</p>
      <button
        className={`mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition ${
          primary
            ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
            : "border border-white/15 bg-white/10 text-white hover:bg-white/15"
        }`}
        onClick={onClick}
        type="button"
      >
        进入
        <ArrowRight aria-hidden size={16} />
      </button>
    </article>
  );
}

function StageOneProgressOverview({ progressItems }: { progressItems: StageOneProgressItem[] }) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">阶段一进度总览</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            教学引导用于训练，项目实战链路用于正式交付。
          </p>
        </div>
        <StatusBadge label="五步推进" tone="info" />
      </div>
      <div className="mt-4 grid gap-3">
        {progressItems.map((item, index) => {
          const state = progressStateCopy(item.state);
          return (
            <article
              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[44px_1fr_auto]"
              key={item.key}
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-2xl text-sm font-extrabold ${state.iconClass}`}
              >
                {index + 1}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-extrabold text-slate-950">{item.label}</h4>
                  <StatusBadge label={state.label} tone={state.tone} />
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
              </div>
              <span className="self-start rounded-full bg-white px-3 py-2 text-xs font-extrabold text-slate-500">
                {item.meta}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function GuidedTrainingWorkspace({
  customerIdentity,
  guidedTraining,
  isSending,
  onBack,
  onSendTurn,
}: {
  customerIdentity: StageOneCustomerIdentity;
  guidedTraining: StageOneGuidedTraining | null;
  isSending: boolean;
  onBack: () => void;
  onSendTurn: (levelKey: string, message: string) => Promise<boolean>;
}) {
  const [pendingTurn, setPendingTurn] = useState<PendingGuidedTurn>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const activeLevelKey = guidedTraining?.active_level ?? guidedLevels[0].key;
  const activeIndex = Math.max(
    guidedLevels.findIndex((level) => level.key === activeLevelKey),
    0,
  );
  const [draft, setDraft] = useState("");
  const activeLevel = guidedLevels[activeIndex];
  const completedLevels = guidedTraining?.completed_levels ?? [];
  const latestTurn = (guidedTraining?.turns ?? []).at(-1);
  const latestFeedback = latestTurn?.feedback.summary;
  const feedback =
    typeof latestFeedback === "string" && latestFeedback.trim().length > 0
      ? latestFeedback
      : "发送第一轮追问后，系统会基于客户回应生成提问质量反馈，并自动判断当前关卡是否达成。";
  const messages = createGuidedConversationMessages({
    levelKey: activeLevel.key,
    pendingTurn: isSending ? pendingTurn : null,
    seedResponse: activeLevel.response,
    turns: guidedTraining?.turns ?? [],
  });
  const conversationScrollKey = latestGuidedConversationScrollKey(messages);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      conversationEndRef.current?.scrollIntoView({ block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [conversationScrollKey, messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedDraft = draft.trim();
    if (trimmedDraft.length === 0 || isSending) {
      return;
    }
    const pendingId = `${activeLevel.key}-${Date.now()}`;
    setPendingTurn({
      id: pendingId,
      level_key: activeLevel.key,
      student_message: trimmedDraft,
    });
    setDraft("");
    const saved = await onSendTurn(activeLevel.key, trimmedDraft);
    if (!saved) {
      setPendingTurn((current) => (current?.id === pendingId ? null : current));
      setDraft(trimmedDraft);
    } else {
      setPendingTurn((current) => (current?.id === pendingId ? null : current));
    }
  }

  function handleGuidedKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!isPlainEnterSubmitKey(event)) {
      return;
    }
    if (draft.trim().length === 0 || isSending) {
      return;
    }
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft aria-hidden size={16} />
          返回阶段一主页
        </button>
        <StatusBadge label="练习记录不写入正式证据" tone="info" />
      </div>

      <div className={guidedTrainingWorkspaceGridClass}>
        <aside className="min-h-0 rounded-[18px] border border-slate-200 bg-white p-3 xl:overflow-y-auto">
          <h3 className="text-sm font-extrabold text-slate-500">六关卡进度</h3>
          <div className="mt-3 grid gap-2">
            {guidedLevels.map((level, index) => {
              const active = index === activeIndex;
              const done = completedLevels.includes(level.key);
              return (
                <div
                  className={`grid grid-cols-[30px_1fr] gap-3 rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-slate-950 bg-slate-950 text-white"
                      : done
                        ? "border-emerald-100 bg-emerald-50 text-slate-700"
                        : "border-slate-100 bg-white text-slate-500"
                  }`}
                  key={level.key}
                >
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-extrabold ${
                      active || done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {done ? <CheckCircle2 aria-hidden size={15} /> : index + 1}
                  </span>
                  <span>
                    <strong className="block text-sm font-extrabold">{level.title}</strong>
                    <span className={`mt-1 block text-xs font-bold ${active ? "text-white/70" : "text-slate-400"}`}>
                      {done ? "AI 已判定达成" : active ? "当前目标" : "待触发"}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col rounded-[18px] border border-slate-200 bg-white p-3">
          <CustomerIdentityBanner compact identity={customerIdentity} />
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-slate-50 p-3">
            {messages.length === 0 ? (
              <div className="grid h-full min-h-[260px] place-items-center">
                <EmptyState title="还没有对话">
                  由你先发出第一句话，客户会根据当前训练目标回应。
                </EmptyState>
              </div>
            ) : (
              <div className="grid gap-3">
                {messages.map((item) => (
                  <div
                    className={`max-w-[88%] rounded-2xl border p-3 text-sm leading-7 ${
                      item.role === "student"
                        ? "ml-auto border-sky-100 bg-sky-50 text-slate-800"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                    key={item.id}
                  >
                    <p className={`text-xs font-extrabold ${item.role === "student" ? "text-sky-700" : "text-emerald-700"}`}>
                      {item.role === "student" ? "学生追问" : item.loading ? "客户正在思考" : "客户回应"}
                    </p>
                    {item.loading ? <ThinkingIndicator /> : <p className="mt-1">{item.content}</p>}
                  </div>
                ))}
                <div ref={conversationEndRef} />
              </div>
            )}
          </div>
          <form className="mt-3 grid gap-2" onSubmit={handleSubmit}>
            <textarea
              className="min-h-20 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 transition placeholder:text-slate-400 focus:border-emerald-300"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleGuidedKeyDown}
              placeholder={`围绕“${activeLevel.title}”输入你的下一句追问`}
              value={draft}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-400">
                AI 会根据对话质量自动推进关卡，Enter 发送，Shift + Enter 换行。
              </p>
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSending || draft.trim().length === 0}
                type="submit"
              >
                <Send aria-hidden size={16} />
                {isSending ? "客户回应中" : "发送练习追问"}
              </button>
            </div>
          </form>
        </section>

        <aside className="min-h-0 rounded-[18px] border border-slate-200 bg-white p-3 xl:overflow-y-auto">
          <h3 className="text-lg font-extrabold text-slate-950">{activeLevel.title}</h3>
          <GuideBlock icon={<Target aria-hidden size={16} />} title="关卡目标" value={activeLevel.goal} />
          <GuideBlock icon={<Lightbulb aria-hidden size={16} />} title="提问技巧" value={activeLevel.technique} />
          <div className="mt-4">
            <p className="text-xs font-extrabold text-slate-500">推荐问句</p>
            <div className="mt-2 grid gap-2">
              {activeLevel.suggestions.map((suggestion) => (
                <button
                  className="rounded-2xl border border-slate-200 bg-white p-3 text-left text-xs font-bold leading-5 text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  key={suggestion}
                  onClick={() => setDraft(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-emerald-50 p-3">
            <p className="text-xs font-extrabold text-emerald-700">AI 分析</p>
            <p className="mt-2 text-xs leading-5 text-emerald-900">{feedback}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function StageOnePracticeWorkspace({
  canSaveSummary,
  completed,
  customerIdentity,
  draft,
  hasSavedSummary,
  insightState,
  interviewRecords,
  isCompletingStage,
  isSavingSummary,
  isSendingInterview,
  message,
  onBack,
  onCompleteStage,
  onInterviewSubmit,
  onMessageChange,
  onSaveSummaryChange,
  onSummarySubmit,
  onUseSuggestion,
  progressItems,
}: {
  canSaveSummary: boolean;
  completed: boolean;
  customerIdentity: StageOneCustomerIdentity;
  draft: SummaryDraft;
  hasSavedSummary: boolean;
  insightState: PracticeInsightState;
  interviewRecords: InterviewRecord[];
  isCompletingStage: boolean;
  isSavingSummary: boolean;
  isSendingInterview: boolean;
  message: string;
  onBack: () => void;
  onCompleteStage: () => Promise<boolean>;
  onInterviewSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMessageChange: (value: string) => void;
  onSaveSummaryChange: (patch: Partial<SummaryDraft>) => void;
  onSummarySubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUseSuggestion: (value: string) => void;
  progressItems: StageOneProgressItem[];
}) {
  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft aria-hidden size={16} />
          返回阶段一主页
        </button>
        <StatusBadge label="项目实战模式" tone="success" />
      </div>

      <CustomerIdentityBanner identity={customerIdentity} />

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <InterviewPanel
          completed={completed}
          interviewRecords={interviewRecords}
          isSending={isSendingInterview}
          message={message}
          onMessageChange={onMessageChange}
          onSubmit={onInterviewSubmit}
          onUseSuggestion={onUseSuggestion}
        />
        <PracticeInsightsPanel insightState={insightState} progressItems={progressItems} />
      </div>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,.95fr)_minmax(360px,1.05fr)]">
        <SummaryEditor
          canSaveSummary={canSaveSummary}
          completed={completed}
          draft={draft}
          isSaving={isSavingSummary}
          onChange={onSaveSummaryChange}
          onSubmit={onSummarySubmit}
        />
        <CompletionPanel
          completed={completed}
          hasInterviewRecords={interviewRecords.length > 0}
          hasSavedSummary={hasSavedSummary}
          isCompleting={isCompletingStage}
          onCompleteStage={onCompleteStage}
        />
      </section>
    </section>
  );
}

function CustomerIdentityBanner({
  compact = false,
  identity,
}: {
  compact?: boolean;
  identity: StageOneCustomerIdentity;
}) {
  if (compact) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <UserRound aria-hidden size={19} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 text-base font-extrabold leading-tight text-slate-950">{identity.title}</h3>
              <StatusBadge label="AI 客户" tone="success" />
              {identity.chips.map((chip) => (
                <span
                  className="max-w-full truncate rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500"
                  key={chip}
                >
                  {chip}
                </span>
              ))}
            </div>
            <p className="mt-1 max-h-10 overflow-hidden text-xs leading-5 text-slate-500">{identity.description}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="grid gap-4 lg:grid-cols-[52px_1fr_auto] lg:items-start">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <UserRound aria-hidden size={22} />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-extrabold text-slate-950">{identity.title}</h3>
            <StatusBadge label="AI 客户" tone="success" />
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">{identity.description}</p>
        </div>
        <div className="grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-3 lg:grid-cols-1">
          {identity.chips.map((chip) => (
            <span className="rounded-full bg-slate-50 px-3 py-2" key={chip}>
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function PracticeInsightsPanel({
  insightState,
  progressItems,
}: {
  insightState: PracticeInsightState;
  progressItems: StageOneProgressItem[];
}) {
  return (
    <aside className="rounded-[18px] border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold text-slate-950">实战线索</h3>
        <StatusBadge
          label={`${insightState.coveredCount} / ${insightState.confirmedClues.length}`}
          tone={insightState.summaryReady ? "success" : "info"}
        />
      </div>

      <div className="mt-4 grid gap-2">
        {insightState.confirmedClues.map((item) => (
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
            <p className="mt-2 text-xs leading-5 text-slate-500">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-amber-50 p-4">
        <p className="text-xs font-extrabold text-amber-700">待追问问题</p>
        <ul className="mt-2 grid gap-2">
          {insightState.pendingQuestions.slice(0, 3).map((item) => (
            <li className="flex gap-2 text-xs leading-5 text-amber-900" key={item}>
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white">
        <p className="text-xs font-extrabold text-emerald-200">正式产出流程</p>
        <div className="mt-3 grid gap-2">
          {progressItems.slice(1).map((item) => (
            <div className="grid grid-cols-[26px_1fr] gap-2 text-xs" key={item.key}>
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/10 text-[11px] font-extrabold text-emerald-200">
                {item.state === "done" ? "✓" : "•"}
              </span>
              <span className="leading-5 text-slate-300">
                <strong className="text-white">{item.label}</strong>：{item.meta}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function GuideBlock({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <div className="mt-3 rounded-2xl bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-slate-700">
        {icon}
        <p className="text-xs font-extrabold">{title}</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{value}</p>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="mt-2 flex min-h-7 items-center gap-2 text-sm font-bold text-slate-500">
      <span className="flex items-center gap-1" aria-hidden>
        {[0, 1, 2].map((index) => (
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-emerald-500"
            key={index}
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
      </span>
      <span>客户正在思考中</span>
    </div>
  );
}

function BookOpenIcon() {
  return <Bot aria-hidden size={22} />;
}

function progressStateCopy(state: StageOneProgressItem["state"]): {
  iconClass: string;
  label: string;
  tone: "default" | "info" | "success" | "warning" | "danger" | "muted";
} {
  const map = {
    active: {
      iconClass: "bg-sky-500 text-white",
      label: "进行中",
      tone: "info",
    },
    done: {
      iconClass: "bg-emerald-500 text-white",
      label: "已完成",
      tone: "success",
    },
    locked: {
      iconClass: "bg-slate-200 text-slate-500",
      label: "待前置",
      tone: "muted",
    },
    ready: {
      iconClass: "bg-white text-slate-700",
      label: "可进入",
      tone: "default",
    },
  } satisfies Record<StageOneProgressItem["state"], {
    iconClass: string;
    label: string;
    tone: "default" | "info" | "success" | "warning" | "danger" | "muted";
  }>;
  return map[state];
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
  const interviewEndRef = useRef<HTMLDivElement>(null);
  const interviewScrollKey = latestPracticeConversationScrollKey(interviewRecords);

  useEffect(() => {
    if (interviewRecords.length === 0) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      interviewEndRef.current?.scrollIntoView({ block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [interviewScrollKey, interviewRecords.length]);

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
          <>
            {interviewRecords.map((record) => (
              <article className="grid gap-3" key={record.id}>
                <div className="ml-auto max-w-[88%] rounded-2xl border border-sky-100 bg-sky-50 p-3">
                  <p className="text-xs font-extrabold text-sky-700">学生追问</p>
                  <p className="mt-1 text-sm leading-6 text-slate-800">{record.question}</p>
                </div>
                <div className="max-w-[92%] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-extrabold text-emerald-700">
                      {record.loading ? "客户正在思考" : "客户回应"}
                    </p>
                    <span className="text-xs font-bold text-slate-400">{record.time}</span>
                  </div>
                  {record.loading ? (
                    <ThinkingIndicator />
                  ) : (
                    <p className="mt-1 text-sm leading-7 text-slate-700">{record.answer}</p>
                  )}
                </div>
              </article>
            ))}
            <div ref={interviewEndRef} />
          </>
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
	          onKeyDown={(event) => {
	            if (!isPlainEnterSubmitKey(event)) {
	              return;
	            }
	            if (completed || isSending || message.trim().length === 0) {
	              return;
	            }
	            event.preventDefault();
	            event.currentTarget.form?.requestSubmit();
	          }}
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
