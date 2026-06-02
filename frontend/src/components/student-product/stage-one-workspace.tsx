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
  Sparkles,
  Target,
  UserRound,
  X,
} from "lucide-react";
import type { CSSProperties, FormEvent, KeyboardEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  Artifact,
  StageOneGuidedTraining,
  StageOneSummaryPayload,
  StageOneVisitNotesPayload,
} from "@/src/lib/api";

import {
  createStageOneVNextSubmitDraft,
  createGuidedConversationMessages,
  createPracticeConversationRecords,
  deriveCustomerIdentity,
  derivePracticeInsightState,
  deriveStageOneEvaluationButtonState,
  deriveStageOneSubmitActionState,
  isStageOneVNextSubmitReady,
  isPlainEnterSubmitKey,
  latestGuidedConversationScrollKey,
  latestPracticeConversationScrollKey,
  stageOneOpenDesignPracticeSeedFeedback,
  type PendingGuidedTurn,
  type PendingPracticeQuestion,
  type StageOneCustomerIdentity,
  type PracticeInsightState,
  type StageOneVNextGateChecks,
  type StageOneVNextSubmitDraft,
  type StageOneProgressItem,
  type StageOneVNextStep,
} from "./stage-one-flow";
import { guidedTrainingWorkspaceGridClass } from "./stage-one-layout";
import { parseAiMarkdownBlocks } from "./markdown-format";
import { formatDateTime, sanitizeProductText, stageStatusCopy } from "./terminology";
import { EmptyState, StatusBadge } from "./ui";

type StageOneWorkspaceProps = {
  artifacts: Artifact[];
  errorMessage?: string;
  guidedTraining: StageOneGuidedTraining | null;
  isCompletingStage: boolean;
  isRefreshing: boolean;
  isRequestingEvaluation: boolean;
  isSavingSummary: boolean;
  isSavingVisitNotes: boolean;
  isSendingInterview: boolean;
  onAskCustomer: (message: string) => Promise<boolean>;
  onBackToPath: () => void;
  onCompleteStage: () => Promise<boolean>;
  onRefresh: () => void;
  onRequestEvaluation: () => Promise<boolean>;
  onSaveSummary: (payload: StageOneSummaryPayload) => Promise<boolean>;
  onSaveVisitNotes: (payload: StageOneVisitNotesPayload) => Promise<boolean>;
  onStepChange: (step: StageOneVNextStep) => void;
  stageStatus?: string;
  studentName?: string;
  workspaceStep: StageOneVNextStep;
};

type SummaryDraft = {
  problemStatement: string;
  targetUser: string;
  businessContext: string;
  painPoints: string;
  successCriteria: string;
  unconfirmedQuestions: string;
};

type VisitNotesDraft = {
  confirmedInformation: string;
  requirementHypotheses: string;
  risksAndQuestions: string;
  nextVisitPlan: string;
  customerVisibleSummary: string;
};

type StageOneSubmitActionNotice = {
  message: string;
  tone: "danger" | "info" | "success";
} | null;

type InterviewRecord = {
  answer: string;
  id: string;
  loading?: boolean;
  question: string;
  time: string;
};

const defaultQuestion = "";

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
  unconfirmedQuestions: "",
};

const emptyVisitNotesDraft: VisitNotesDraft = {
  confirmedInformation: "",
  requirementHypotheses: "",
  risksAndQuestions: "",
  nextVisitPlan: "",
  customerVisibleSummary: "",
};

const emptyGateChecks: StageOneVNextGateChecks = {
  businessGoal: false,
  customerQuote: false,
  dataSource: false,
  projectBoundary: false,
  stageTwoInput: false,
};

const completedGateChecks: StageOneVNextGateChecks = {
  businessGoal: true,
  customerQuote: true,
  dataSource: true,
  projectBoundary: true,
  stageTwoInput: true,
};

export function StageOneWorkspace({
  artifacts,
  errorMessage,
  guidedTraining,
  isCompletingStage,
  isRefreshing,
  isRequestingEvaluation,
  isSavingSummary,
  isSavingVisitNotes,
  isSendingInterview,
  onAskCustomer,
  onBackToPath,
  onCompleteStage,
  onRefresh,
  onRequestEvaluation,
  onSaveSummary,
  onSaveVisitNotes,
  onStepChange,
  stageStatus,
  studentName,
  workspaceStep,
}: StageOneWorkspaceProps) {
  const [message, setMessage] = useState(defaultQuestion);
  const [pendingInterview, setPendingInterview] = useState<PendingPracticeQuestion>(null);
  const [gateChecks, setGateChecks] = useState<StageOneVNextGateChecks>(emptyGateChecks);
  const status = stageStatusCopy(stageStatus);
  const completed = stageStatus === "completed";
  const interviewRecords = useMemo(() => createInterviewRecords(artifacts), [artifacts]);
  const displayedInterviewRecords = useMemo(
    () => createPracticeConversationRecords(interviewRecords, isSendingInterview ? pendingInterview : null),
    [interviewRecords, isSendingInterview, pendingInterview],
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
  const latestVisitNotesArtifact = useMemo(
    () => latestArtifactOfType(artifacts, "stage_1_visit_notes"),
    [artifacts],
  );
  const latestEvaluationArtifact = useMemo(
    () => latestArtifactOfType(artifacts, "stage_1_evaluation"),
    [artifacts],
  );
  const baseSubmitDraft = useMemo(() => createStageOneVNextSubmitDraft(artifacts), [artifacts]);
  const latestSummaryId = latestSummaryArtifact?.id ?? null;
  const latestVisitNotesId = latestVisitNotesArtifact?.id ?? null;
  const [summaryState, setSummaryState] = useState<{
    draft: SummaryDraft;
    sourceArtifactId: string | null;
  }>({
    draft: latestSummaryArtifact ? summaryDraftFromArtifact(latestSummaryArtifact) : emptySummaryDraft,
    sourceArtifactId: latestSummaryId,
  });
  const [visitNotesState, setVisitNotesState] = useState<{
    draft: VisitNotesDraft;
    sourceArtifactId: string | null;
  }>({
    draft: latestVisitNotesArtifact ? visitNotesDraftFromArtifact(latestVisitNotesArtifact) : emptyVisitNotesDraft,
    sourceArtifactId: latestVisitNotesId,
  });
  const summaryDraft =
    summaryState.sourceArtifactId === latestSummaryId
      ? summaryState.draft
      : latestSummaryArtifact
        ? summaryDraftFromArtifact(latestSummaryArtifact)
        : summaryState.draft;
  const visitNotesDraft =
    visitNotesState.sourceArtifactId === latestVisitNotesId
      ? visitNotesState.draft
      : latestVisitNotesArtifact
        ? visitNotesDraftFromArtifact(latestVisitNotesArtifact)
        : visitNotesState.draft;
  const hasSavedSummary = latestSummaryArtifact !== null;
  const hasSavedVisitNotes = latestVisitNotesArtifact !== null;
  const hasEvaluation = latestEvaluationArtifact !== null;
  const submitDraft = useMemo(
    () =>
      createSubmitDraftFromWorkspaceState({
        baseDraft: baseSubmitDraft,
        interviewRecords,
        summaryDraft,
        visitNotesDraft,
      }),
    [baseSubmitDraft, interviewRecords, summaryDraft, visitNotesDraft],
  );
  const effectiveGateChecks = completed ? completedGateChecks : gateChecks;
  const submitReady = completed || isStageOneVNextSubmitReady(submitDraft, effectiveGateChecks);
  const canSaveVisitNotes =
    interviewRecords.length > 0 &&
    visitNotesDraft.confirmedInformation.trim().length > 0 &&
    visitNotesDraft.nextVisitPlan.trim().length > 0 &&
    visitNotesDraft.customerVisibleSummary.trim().length > 0;

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

  async function handleVisitNotesSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSaveVisitNotes || completed) {
      return;
    }
    await onSaveVisitNotes({
      confirmed_information: lines(visitNotesDraft.confirmedInformation),
      requirement_hypotheses: lines(visitNotesDraft.requirementHypotheses),
      risks_and_questions: lines(visitNotesDraft.risksAndQuestions),
      next_visit_plan: visitNotesDraft.nextVisitPlan.trim(),
      customer_visible_summary: visitNotesDraft.customerVisibleSummary.trim(),
    });
  }

  async function handleSaveVisitNotesFromSubmit(draft: StageOneVNextSubmitDraft): Promise<boolean> {
    if (completed) {
      return false;
    }
    return onSaveVisitNotes(draft.visit_notes);
  }

  async function handleSaveSummaryFromSubmit(draft: StageOneVNextSubmitDraft): Promise<boolean> {
    if (completed) {
      return false;
    }
    return onSaveSummary(draft.summary);
  }

  return (
    <div className="grid gap-5">
      {workspaceStep === "guide" ? (
        <StageOneGuideView
          completed={completed}
          customerIdentity={customerIdentity}
          interviewCount={interviewRecords.length}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
          onStartInterview={() => onStepChange("lab")}
          statusLabel={status.label}
        />
      ) : workspaceStep === "lab" ? (
        <StageOneOpenDesignInterviewLabView
          completed={completed}
          customerIdentity={customerIdentity}
          errorMessage={errorMessage}
          insightState={practiceInsights}
          interviewRecords={displayedInterviewRecords}
          isSavingVisitNotes={isSavingVisitNotes}
          isSendingInterview={isSendingInterview}
          message={message}
          onFinish={() => onStepChange("submit")}
          onInterviewSubmit={handleInterviewSubmit}
          onMessageChange={setMessage}
          onUseSuggestion={setMessage}
          onVisitNotesChange={(patch) =>
            setVisitNotesState({
              draft: { ...visitNotesDraft, ...patch },
              sourceArtifactId: latestVisitNotesId,
            })
          }
          onVisitNotesSubmit={handleVisitNotesSubmit}
          studentName={studentName}
          visitNotesDraft={visitNotesDraft}
        />
      ) : (
        <StageOneSubmitView
          completed={completed}
          errorMessage={errorMessage}
          gateChecks={effectiveGateChecks}
          hasEvaluation={hasEvaluation}
          hasInterviewEvidence={interviewRecords.length > 0}
          hasSavedSummary={hasSavedSummary}
          hasSavedVisitNotes={hasSavedVisitNotes}
          isCompletingStage={isCompletingStage}
          isRequestingEvaluation={isRequestingEvaluation}
          isSavingSummary={isSavingSummary}
          isSavingVisitNotes={isSavingVisitNotes}
          latestEvaluationArtifact={latestEvaluationArtifact}
          onBackToGuide={() => onStepChange("guide")}
          onBackToLab={() => onStepChange("lab")}
          onBackToPath={onBackToPath}
          onCompleteStage={onCompleteStage}
          onGateCheckChange={setGateChecks}
          onRequestEvaluation={onRequestEvaluation}
          onSaveSummary={handleSaveSummaryFromSubmit}
          onSaveSummaryChange={(patch) =>
            setSummaryState({
              draft: { ...summaryDraft, ...patch },
              sourceArtifactId: latestSummaryId,
            })
          }
          onSaveVisitNotes={handleSaveVisitNotesFromSubmit}
          onSaveVisitNotesChange={(patch) =>
            setVisitNotesState({
              draft: { ...visitNotesDraft, ...patch },
              sourceArtifactId: latestVisitNotesId,
            })
          }
          submitDraft={submitDraft}
          submitReady={submitReady}
        />
      )}
    </div>
  );
}

function StageOneSubmitView({
  completed,
  errorMessage,
  gateChecks,
  hasEvaluation,
  hasInterviewEvidence,
  hasSavedSummary,
  hasSavedVisitNotes,
  isCompletingStage,
  isRequestingEvaluation,
  isSavingSummary,
  isSavingVisitNotes,
  latestEvaluationArtifact,
  onBackToGuide,
  onBackToLab,
  onBackToPath,
  onCompleteStage,
  onGateCheckChange,
  onRequestEvaluation,
  onSaveSummary,
  onSaveSummaryChange,
  onSaveVisitNotes,
  onSaveVisitNotesChange,
  submitDraft,
  submitReady,
}: {
  completed: boolean;
  errorMessage?: string;
  gateChecks: StageOneVNextGateChecks;
  hasEvaluation: boolean;
  hasInterviewEvidence: boolean;
  hasSavedSummary: boolean;
  hasSavedVisitNotes: boolean;
  isCompletingStage: boolean;
  isRequestingEvaluation: boolean;
  isSavingSummary: boolean;
  isSavingVisitNotes: boolean;
  latestEvaluationArtifact: Artifact | null;
  onBackToGuide: () => void;
  onBackToLab: () => void;
  onBackToPath: () => void;
  onCompleteStage: () => Promise<boolean>;
  onGateCheckChange: (checks: StageOneVNextGateChecks) => void;
  onRequestEvaluation: () => Promise<boolean>;
  onSaveSummary: (draft: StageOneVNextSubmitDraft) => Promise<boolean>;
  onSaveSummaryChange: (patch: Partial<SummaryDraft>) => void;
  onSaveVisitNotes: (draft: StageOneVNextSubmitDraft) => Promise<boolean>;
  onSaveVisitNotesChange: (patch: Partial<VisitNotesDraft>) => void;
  submitDraft: StageOneVNextSubmitDraft;
  submitReady: boolean;
}) {
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [evaluationDetailOpen, setEvaluationDetailOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<StageOneSubmitActionNotice>(null);
  const checkCount = Object.values(gateChecks).filter(Boolean).length;
  const actionState = deriveStageOneSubmitActionState({
    completed,
    hasEvaluation,
    hasInterviewEvidence,
    hasSavedSummary,
    hasSavedVisitNotes,
    submitReady,
  });
  const evaluationButtonState = deriveStageOneEvaluationButtonState({
    completed,
    hasEvaluation,
    isRequestingEvaluation,
  });
  const completeReady = actionState.completeReady;
  const reviewSummary =
    stringValue(latestEvaluationArtifact?.content_json.review_summary) ||
    "生成综合评估后，这里会展示信息覆盖、关键遗漏和阶段二风险。";
  const hasReviewSummary =
    stringValue(latestEvaluationArtifact?.content_json.review_summary).length > 0;
  const canSaveVisitNotes =
    hasInterviewEvidence &&
    submitDraft.visit_notes.confirmed_information.length > 0 &&
    submitDraft.visit_notes.next_visit_plan.trim().length > 0 &&
    submitDraft.visit_notes.customer_visible_summary.trim().length > 0;
  const canSaveSummary =
    hasInterviewEvidence &&
    submitDraft.summary.problem_statement.trim().length > 0 &&
    submitDraft.summary.target_user.trim().length > 0 &&
    submitDraft.summary.business_context.trim().length > 0;
  const submitHint = actionState.submitHint;
  const visibleActionNotice =
    actionNotice?.tone === "danger" && errorMessage
      ? { message: errorMessage, tone: "danger" as const }
      : actionNotice;
  const quoteText =
    submitDraft.quote_excerpts.length > 0
      ? submitDraft.quote_excerpts.map((quote) => `“${quote}”`).join("\n\n")
      : "还没有可引用的客户原话。请返回访谈实战补充正式访谈。";

  useEffect(() => {
    if (actionNotice === null) {
      return undefined;
    }
    const timer = setTimeout(() => setActionNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [actionNotice]);

  async function handleCompleteStage() {
    if (!completeReady || completed || isCompletingStage) {
      return;
    }
    setActionNotice(null);
    const saved = await onCompleteStage();
    if (saved) {
      setActionNotice({ message: "阶段一产物已提交，阶段二已解锁。", tone: "success" });
      setSubmitModalOpen(true);
    } else {
      setActionNotice({ message: "阶段一提交失败，请确认访谈记录、需求草稿和综合评估均已真实保存。", tone: "danger" });
    }
  }

  async function handleSaveVisitNotes() {
    if (completed || isSavingVisitNotes || !canSaveVisitNotes) {
      if (!hasInterviewEvidence) {
        setActionNotice({ message: "请先返回访谈实战，完成至少一轮正式客户访谈记录。", tone: "danger" });
      }
      return;
    }
    setActionNotice(null);
    const saved = await onSaveVisitNotes(submitDraft);
    setActionNotice(
      saved
        ? { message: "访谈记录已保存为阶段一拜访间整理 Artifact。", tone: "success" }
        : { message: "访谈记录保存失败，请确认已有正式访谈记录并检查后端服务。", tone: "danger" },
    );
  }

  async function handleSaveSummary() {
    if (completed || isSavingSummary || !canSaveSummary) {
      if (!hasInterviewEvidence) {
        setActionNotice({ message: "请先返回访谈实战，完成至少一轮正式客户访谈记录。", tone: "danger" });
      }
      return;
    }
    setActionNotice(null);
    const saved = await onSaveSummary(submitDraft);
    setActionNotice(
      saved
        ? { message: "需求草稿已保存为阶段一问题发现总结 Artifact。", tone: "success" }
        : { message: "需求草稿保存失败，请检查必填字段和后端服务。", tone: "danger" },
    );
  }

  async function handleRequestEvaluation() {
    if (completed || isRequestingEvaluation) {
      return;
    }
    if (!hasSavedVisitNotes || !hasSavedSummary) {
      setActionNotice({ message: "请先真实保存访谈记录和需求草稿，再生成综合评估。", tone: "danger" });
      return;
    }
    setActionNotice({ message: "正在调用后端 AI Gateway 生成阶段一综合评估，请稍候。", tone: "info" });
    const saved = await onRequestEvaluation();
    setActionNotice(
      saved
        ? { message: "综合评估已生成，并保存为阶段一评估 Artifact。", tone: "success" }
        : { message: "综合评估生成失败，请检查模型服务或后端服务状态。", tone: "danger" },
    );
  }

  function updateGateCheck(key: keyof StageOneVNextGateChecks, value: boolean) {
    onGateCheckChange({ ...gateChecks, [key]: value });
  }

  return (
    <div className="interview-submit-page">
      <header className="submit-app-header">
        <button className="submit-brand" onClick={onBackToLab} type="button" aria-label="返回访谈实战">
          <span>FDE</span>
          <strong>阶段一产物整理</strong>
        </button>
        <nav className="submit-nav" aria-label="阶段导航">
          <button type="button" onClick={onBackToGuide}>导学</button>
          <button type="button" onClick={onBackToLab}>访谈实战</button>
          <button className="active" type="button">整理提交</button>
        </nav>
        <button className="submit-back-link" onClick={onBackToPath} type="button">
          返回实验路径
        </button>
      </header>

      <main className="submit-workspace">
        <section className="submit-hero" aria-labelledby="submit-title">
          <div>
            <p className="submit-kicker">Stage 01 / Requirement Interview</p>
            <h1 id="submit-title">
              把客户访谈整理成可进入阶段二的需求证据。
            </h1>
            <p>
              从周明的访谈中提取业务事实、客户痛点、智能体机会和待确认问题。提交后进入阶段二，继续完成需求分析、可行性判断与总体技术方案设计。
            </p>
          </div>
          <aside className="submit-status-card" aria-label="阶段状态">
            <span>当前状态</span>
            <strong>
              {completed ? "已提交" : hasEvaluation ? "待提交" : "整理中"}
            </strong>
            <p>{submitHint}</p>
          </aside>
        </section>

        <section className="submit-progress-strip" aria-label="阶段衔接">
          {[
            ["01", "完成模拟访谈", "已围绕审厂追溯、数据来源、一线阻力和验收口径追问。", "done"],
            ["02", "整理阶段产物", "把对话转化为客户原话、业务事实、需求假设和边界判断。", "active"],
            ["03", "进入阶段二", "提交后解锁需求分析、可行性研究和总体技术方案训练。", "next"],
          ].map(([index, title, copy, state]) => (
            <article className={state} key={index}>
              <span>{index}</span>
              <div>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </section>

        <div className="submit-layout">
          <section className="submit-column evidence-column" aria-labelledby="evidence-title">
            <SubmitSectionHeader kicker="Interview Evidence" title="访谈证据整理">
              <button type="button" onClick={onBackToLab}>{submitDraft.quote_excerpts.length} 条原话</button>
            </SubmitSectionHeader>

            <SubmitEvidenceBlock label="客户原话摘录" meta="保留真实表达">
              <textarea readOnly rows={6} value={quoteText} />
            </SubmitEvidenceBlock>

            <SubmitEvidenceBlock label="已确认事实" meta="可以作为需求证据">
              <SubmitTextarea
                disabled={completed}
                onChange={(value) => onSaveVisitNotesChange({ confirmedInformation: value })}
                rows={6}
                value={submitDraft.visit_notes.confirmed_information.join("\n")}
              />
            </SubmitEvidenceBlock>

            <SubmitEvidenceBlock label="待确认问题" meta="进入阶段二前要标记风险">
              <SubmitTextarea
                disabled={completed}
                onChange={(value) => onSaveVisitNotesChange({ risksAndQuestions: value })}
                rows={5}
                value={submitDraft.visit_notes.risks_and_questions.join("\n")}
              />
            </SubmitEvidenceBlock>

            <SubmitEvidenceBlock label="下次追问计划" meta="阶段二风险继承">
              <SubmitTextarea
                disabled={completed}
                onChange={(value) => onSaveVisitNotesChange({ nextVisitPlan: value })}
                rows={4}
                value={submitDraft.visit_notes.next_visit_plan}
              />
            </SubmitEvidenceBlock>
          </section>

          <section className="submit-column draft-column" aria-labelledby="draft-title">
            <SubmitSectionHeader kicker="Requirement Draft" title="需求理解草稿">
              <span className="draft-autosave">
                {hasSavedSummary ? "已保存" : "未保存"}
              </span>
            </SubmitSectionHeader>

            <div className="draft-editor-grid">
              <SubmitDraftField
                disabled={completed}
                label="客户核心诉求"
                onChange={(value) => onSaveSummaryChange({ problemStatement: value })}
                value={submitDraft.summary.problem_statement}
              />
              <SubmitDraftField
                disabled={completed}
                label="当前业务流程"
                onChange={(value) => onSaveSummaryChange({ businessContext: value })}
                value={submitDraft.summary.business_context}
              />
              <SubmitDraftField
                disabled={completed}
                label="关键角色与使用对象"
                onChange={(value) => onSaveSummaryChange({ targetUser: value })}
                value={submitDraft.summary.target_user}
              />
              <SubmitDraftField
                disabled={completed}
                label="主要阻塞点"
                onChange={(value) => onSaveSummaryChange({ painPoints: value })}
                value={submitDraft.summary.pain_points.join("\n")}
              />
              <SubmitDraftField
                disabled={completed}
                label="智能体机会与成功标准"
                onChange={(value) => onSaveSummaryChange({ successCriteria: value })}
                value={submitDraft.summary.success_criteria.join("\n")}
              />
              <SubmitDraftField
                disabled={completed}
                label="不适合智能体直接解决的边界"
                onChange={(value) => onSaveSummaryChange({ unconfirmedQuestions: value })}
                value={submitDraft.summary.unconfirmed_questions.join("\n")}
              />
            </div>

            <section className="transform-example" aria-label="从访谈到需求的转换示例">
              <div>
                <span>客户表达</span>
                <p>“每次审厂前都要临时拼材料。”</p>
              </div>
              <i aria-hidden="true">
                →
              </i>
              <div className="p-4">
                <span>需求判断</span>
                <p>
                  系统需要按批次聚合异常、处置、复检、整改证据，并明确资料来源。
                </p>
              </div>
            </section>
          </section>

          <aside className="submit-side" aria-label="提交前检查">
            <section className="submit-check-card">
              <SubmitSectionHeader kicker="Gate Check" title="提交前检查" small>
                <strong>{checkCount}/5</strong>
              </SubmitSectionHeader>
              <div className="submit-check-list">
                {submitGateItems.map((item) => (
                  <label key={item.key}>
                    <input
                      checked={gateChecks[item.key]}
                      disabled={completed}
                      onChange={(event) => updateGateCheck(item.key, event.target.checked)}
                      type="checkbox"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="submit-review-card">
              <span>AI 预评建议</span>
              <EvaluationPreview
                emptyText="生成综合评估后，这里会展示信息覆盖、关键遗漏和阶段二风险。"
                hasReport={hasReviewSummary}
                onOpenDetail={() => setEvaluationDetailOpen(true)}
                value={reviewSummary}
              />
            </section>

            <section className="submit-action-card">
              <div>
                <span>阶段一产物</span>
                <strong>
                  访谈纪要、需求假设、业务流程理解、待确认问题清单
                </strong>
              </div>
              <button
                disabled={completed || isSavingVisitNotes || !canSaveVisitNotes}
                onClick={() => void handleSaveVisitNotes()}
                type="button"
              >
                <Save aria-hidden size={15} />
                {isSavingVisitNotes ? "保存中" : hasSavedVisitNotes ? "更新访谈记录" : "保存访谈记录"}
              </button>
              <button
                disabled={completed || isSavingSummary || !canSaveSummary}
                onClick={() => void handleSaveSummary()}
                type="button"
              >
                <ClipboardCheck aria-hidden size={15} />
                {isSavingSummary ? "保存中" : hasSavedSummary ? "更新需求草稿" : "保存需求草稿"}
              </button>
              <button
                disabled={evaluationButtonState.disabled}
                onClick={() => void handleRequestEvaluation()}
                type="button"
              >
                <Sparkles aria-hidden size={15} />
                {evaluationButtonState.label}
              </button>
              <button
                data-submit-stage
                disabled={completed || isCompletingStage || !completeReady}
                onClick={() => void handleCompleteStage()}
                type="button"
              >
                <CheckCircle2 aria-hidden size={15} />
                {completed ? "阶段一已提交" : isCompletingStage ? "提交中" : "提交阶段一产物"}
              </button>
              <div className="submit-action-status-list" aria-label="真实保存状态">
                <CompletionCheck label="已有正式客户访谈" ready={hasInterviewEvidence || completed} />
                <CompletionCheck label="访谈记录已保存" ready={hasSavedVisitNotes || completed} />
                <CompletionCheck label="需求草稿已保存" ready={hasSavedSummary || completed} />
                <CompletionCheck label="综合评估已生成" ready={hasEvaluation || completed} />
              </div>
              {visibleActionNotice ? (
                <div
                  className={`submit-action-feedback ${visibleActionNotice.tone}`}
                  role={visibleActionNotice.tone === "danger" ? "alert" : "status"}
                >
                  {visibleActionNotice.message}
                </div>
              ) : null}
              <p>{submitHint}</p>
            </section>
          </aside>
        </div>
      </main>

      <div
        aria-hidden={!submitModalOpen}
        aria-labelledby="stage-one-submit-modal-title"
        aria-modal="true"
        className={`stage-submit-modal ${submitModalOpen ? "open" : ""}`}
        role="dialog"
      >
        <div className="stage-submit-panel">
          <span>阶段一已提交</span>
          <h2 id="stage-one-submit-modal-title">访谈记录已进入项目档案袋。</h2>
          <p>
            你已经完成“需求访谈与业务理解”阶段。接下来进入阶段二，把访谈证据转化为需求分析、可行性研究报告和总体技术方案。
          </p>
          <div className="stage-submit-next">
            <button onClick={() => setSubmitModalOpen(false)} type="button">
              留在本页继续检查
            </button>
          </div>
        </div>
      </div>
      <EvaluationDetailDialog
        onClose={() => setEvaluationDetailOpen(false)}
        open={evaluationDetailOpen}
        value={reviewSummary}
      />
    </div>
  );
}

const submitGateItems: Array<{ key: keyof StageOneVNextGateChecks; label: string }> = [
  { key: "businessGoal", label: "已说明客户业务目标与审厂压力" },
  { key: "customerQuote", label: "已保留可引用客户原话" },
  { key: "dataSource", label: "已列出数据来源和字段风险" },
  { key: "projectBoundary", label: "已写清 AI 智能体边界" },
  { key: "stageTwoInput", label: "已记录待确认问题并可进入阶段二" },
];

function SubmitSectionHeader({
  children,
  kicker,
  small = false,
  title,
}: {
  children?: ReactNode;
  kicker: string;
  small?: boolean;
  title: string;
}) {
  return (
    <div className={`submit-section-head ${small ? "small" : ""}`}>
      <div>
        <p className="submit-kicker">{kicker}</p>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SubmitEvidenceBlock({
  children,
  label,
  meta,
}: {
  children: ReactNode;
  label: string;
  meta: string;
}) {
  return (
    <article className="evidence-block">
      <div className="evidence-block-head">
        <span>{label}</span>
        <em>{meta}</em>
      </div>
      {children}
    </article>
  );
}

function SubmitTextarea({
  disabled,
  onChange,
  rows,
  value,
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <textarea
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      value={value}
    />
  );
}

function SubmitDraftField({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <textarea
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function StageOneGuideView({
  completed,
  customerIdentity,
  interviewCount,
  isRefreshing,
  onRefresh,
  onStartInterview,
  statusLabel,
}: {
  completed: boolean;
  customerIdentity: StageOneCustomerIdentity;
  interviewCount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  onStartInterview: () => void;
  statusLabel: string;
}) {
  const [readyChecks, setReadyChecks] = useState([false, false, false]);
  const readyCount = readyChecks.filter(Boolean).length;

  return (
    <div className="student-detail-page interview-guide-page">
      <aside className="student-rail" aria-label="学生端导航">
        <button className="student-brand" onClick={onRefresh} type="button">
          <span className="site-brand-mark">FDE</span>
          <span>
            <strong>EduFDE</strong>
            <small>学生实验区</small>
          </span>
        </button>

        <nav className="student-nav" aria-label="学生端主导航">
          <button type="button" onClick={onRefresh}>
            <span>学习首页</span>
            <small>实验入口</small>
          </button>
          <button type="button" onClick={onRefresh}>
            <span>实验说明</span>
            <small>制造业质检</small>
          </button>
          <button className="active" type="button">
            <span>阶段一导学</span>
            <small>需求访谈</small>
          </button>
          <button type="button" onClick={onRefresh}>
            <span>能力档案</span>
            <small>过程证据与报告</small>
          </button>
        </nav>

        <div className="student-rail-card">
          <strong>本阶段目标</strong>
          <p>先学会把“想用 AI 提升效率”追问成真实业务问题，再进入 AI 客户访谈。</p>
          <div className="mini-progress" aria-label="阶段一导学准备">
            <span style={{ "--value": `${Math.max(18, readyCount * 28)}%` } as CSSProperties} />
          </div>
        </div>
      </aside>

      <main className="student-workspace interview-guide-workspace">
        <header className="student-topbar interview-guide-topbar">
          <div>
            <p className="student-kicker">Stage 01 · Interview Method</p>
            <h1>
              <span className="guide-title-line">需求访谈不是聊天，</span>
              <span className="guide-title-line">是把模糊诉求还原成可交付问题。</span>
            </h1>
            <p className="interview-guide-lead">
              正式访谈前，你需要先知道应该问什么、如何记录、如何整理，以及怎样判断一个制造业质检问题是否适合交给 AI 智能体解决。
            </p>
          </div>
          <div className="student-top-actions">
            <button className="guide-back-link" disabled={isRefreshing} onClick={onRefresh} type="button">
              <span aria-hidden="true">←</span> 返回实验说明
            </button>
            <div className="student-profile" aria-label="当前阶段状态">
              <span>{statusLabel}</span>
              <strong>{completed ? "阶段一已完成" : `${interviewCount} 轮访谈记录`}</strong>
            </div>
          </div>
        </header>

        <section className="guide-hero" aria-label="阶段一学习导入">
          <div className="guide-hero-copy">
            <span className="student-pill blue">教学导学</span>
            <h2>先听懂工厂为什么着急，再决定智能体该做什么。</h2>
            <p>
              周明表面上会说“希望用 AI 提升质检效率”，但阶段一真正要挖出来的是审厂追溯压力、资料分散、MES 字段缺口和一线使用阻力。
            </p>
          </div>
          <aside className="guide-readiness" aria-label="进入实训前准备">
            <span className="guide-label">进入模拟访谈前</span>
            {[
              "我能说清审厂追溯为什么是核心压力",
              "我知道要区分客户原话、事实和个人判断",
              "我准备好至少 6 个访谈问题",
            ].map((item, index) => (
              <label key={item}>
                <input
                  checked={readyChecks[index]}
                  onChange={(event) =>
                    setReadyChecks((current) =>
                      current.map((value, currentIndex) =>
                        currentIndex === index ? event.target.checked : value,
                      ),
                    )
                  }
                  type="checkbox"
                />
                {item}
              </label>
            ))}
            <div className="guide-readiness-footer">
              <strong>{readyCount} / 3</strong>
              <span>准备项完成</span>
            </div>
          </aside>
        </section>

        <section className="guide-section" aria-labelledby="probe-title">
          <div className="guide-section-head">
            <div>
              <p className="student-kicker">What To Probe</p>
              <h2 id="probe-title">访谈要挖掘的 6 个维度</h2>
            </div>
            <p>不要只问“想实现什么功能”。在 FDE 实训里，访谈要帮助你判断项目是否真实、可做、可验收。</p>
          </div>

          <div className="probe-grid">
            {[
              ["01", "业务目标", "质量负责人真正想改善什么？是减少查资料时间，还是降低审厂材料遗漏风险？"],
              ["02", "当前流程", "从质检记录、异常处理到客户审厂追溯，现在分别由谁完成、怎么流转？"],
              ["03", "关键角色", "质量负责人、质检员、工艺工程师、IT 分别关心什么，谁会实际使用系统？"],
              ["04", "数据来源", "MES、Excel、纸质质检单、SOP、整改记录分别有哪些字段和质量问题？"],
              ["05", "异常情况", "漏填、字段不一致、复检结果缺失、批次追溯失败通常怎么发生？"],
              ["06", "验收标准", "怎样才算 AI 助手真的有用？哪些问题必须回答，哪些问题必须拒答或转人工？"],
            ].map(([index, title, copy]) => (
              <article key={index}>
                <span>{index}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          </section>

        <section className="guide-section guide-note-section" aria-labelledby="note-title">
          <div className="guide-section-head compact">
            <p className="student-kicker">How To Record</p>
            <h2 id="note-title">记录不是抄对话，而是沉淀证据</h2>
          </div>

          <div className="note-template">
            {[
              ["客户原话", "“审厂前我们经常临时找质检记录，很多数据分散在不同表里。”"],
              ["已确认事实", "质检资料分散在 MES、Excel、纸质单据和共享文件夹中，人工整理压力大。"],
              ["我的判断", "问题不是单纯查询效率，而是审厂追溯证据难以快速拼接。"],
              ["待确认问题", "MES 是否能导出批次、检验时间、处置结果、复检结果等关键字段？"],
              ["系统边界", "AI 可以提示缺失字段，但不能伪造缺失记录，也不能替代质量负责人判断。"],
            ].map(([title, copy]) => (
              <div className="note-column" key={title}>
                <span>{title}</span>
                <p>{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="guide-section" aria-labelledby="transform-title">
          <div className="guide-section-head">
            <div>
              <p className="student-kicker">From Interview To Requirement</p>
              <h2 id="transform-title">把客户表达转化为需求判断</h2>
            </div>
            <p>访谈结束后，你要能从一句模糊诉求里提取业务痛点、数据问题、智能体机会和待确认风险。</p>
          </div>

          <div className="transform-board">
            <article className="customer-quote">
              <span>客户表达</span>
              <p>“我们希望用 AI 提升质检效率，尤其是审厂前不要再临时到处找材料。”</p>
            </article>
            <div className="requirement-cells">
              <article><strong>业务痛点</strong><p>审厂追溯材料准备成本高，证据散落在多个系统和文件里。</p></article>
              <article><strong>数据问题</strong><p>MES 字段不完整，异常原因、处置过程、复检结果经常需要人工补充。</p></article>
              <article><strong>智能体机会</strong><p>基于已有资料进行制度查询、追溯说明初稿生成和缺失字段提醒。</p></article>
              <article><strong>待确认风险</strong><p>资料是否可导出、历史记录质量是否稳定、一线是否愿意补充必要字段。</p></article>
            </div>
          </div>
        </section>

        <section className="guide-section guide-judge-section" aria-labelledby="judge-title">
          <div className="guide-section-head split">
            <div>
              <p className="student-kicker">Decision Checklist</p>
              <h2 id="judge-title">判断问题是否值得交给 AI 智能体</h2>
            </div>
            <p>阶段一不是为了把客户说的话都接受下来，而是训练你筛出可交付、可解释、可验收的问题。</p>
          </div>

          <div className="judge-list">
            {[
              ["高频", "这个问题是否经常发生，还是只在个别特殊场景出现？"],
              ["角色明确", "谁会使用智能体，质量负责人、质检员还是审厂准备人员？"],
              ["数据可得", "回答所需的 SOP、质检记录、异常台账和整改材料是否能被系统访问？"],
              ["适合 AI", "问题是否适合问答、检索、追溯说明生成或流程引导，而不是替代业务系统？"],
              ["可验收", "能否设计标准题、范围外题和追溯说明题来检验智能体是否可靠？"],
            ].map(([title, copy]) => (
              <article key={title}>
                <span>{title}</span>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="guide-next-step" aria-label="进入模拟访谈">
          <div>
            <p className="student-kicker">Ready For Practice</p>
            <h2>准备好后，进入 AI 客户访谈。</h2>
            <p>下一页会让你面对{customerIdentity.title}，用问题逐步释放隐藏信息，并沉淀访谈记录、需求假设和未确认问题。</p>
          </div>
          <button className="student-primary-button" onClick={onStartInterview} type="button">
            开始模拟访谈
          </button>
        </section>
      </main>
    </div>
  );
}

function StageOneOpenDesignInterviewLabView({
  completed,
  errorMessage,
  insightState,
  interviewRecords,
  isSavingVisitNotes,
  isSendingInterview,
  message,
  onFinish,
  onInterviewSubmit,
  onMessageChange,
  onUseSuggestion,
  onVisitNotesChange,
  onVisitNotesSubmit,
  studentName,
  visitNotesDraft,
}: {
  completed: boolean;
  customerIdentity: StageOneCustomerIdentity;
  errorMessage?: string;
  insightState: PracticeInsightState;
  interviewRecords: InterviewRecord[];
  isSavingVisitNotes: boolean;
  isSendingInterview: boolean;
  message: string;
  onFinish: () => void;
  onInterviewSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMessageChange: (value: string) => void;
  onUseSuggestion: (value: string) => void;
  onVisitNotesChange: (patch: Partial<VisitNotesDraft>) => void;
  onVisitNotesSubmit: (event: FormEvent<HTMLFormElement>) => void;
  studentName?: string;
  visitNotesDraft: VisitNotesDraft;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const interviewEndRef = useRef<HTMLDivElement>(null);
  const studentInitial = studentAvatarInitial(studentName);
  const interviewScrollKey = latestPracticeConversationScrollKey(interviewRecords);
  const hasInterviewRecords = interviewRecords.length > 0;
  const scoreQuality = hasInterviewRecords ? Math.min(96, 72 + insightState.coveredCount * 4) : 0;
  const scoreComplete = hasInterviewRecords ? Math.min(96, 66 + insightState.interviewCount * 5) : 0;
  const scoreLogic = hasInterviewRecords ? Math.min(96, 74 + insightState.coveredCount * 3) : 0;
  const scoreTotal = Math.round((scoreQuality + scoreComplete + scoreLogic) / 3);
  const readyClues = insightState.confirmedClues.filter((item) => item.ready);
  const pendingClues = insightState.confirmedClues.filter((item) => !item.ready);
  const requirementItems =
    !hasInterviewRecords
      ? []
      : readyClues.length > 0
      ? readyClues.map((item) => item.value)
      : [
          "按批次快速汇总异常、处置和复检证据",
          "降低审厂前人工拼材料时间",
          "回答必须引用 SOP、质检记录或整改材料来源",
          "字段缺失时提示补充，不直接生成结论",
          "不增加一线质检员重复录入负担",
          "支持范围外问题转人工确认",
        ];
  const painPointItems = hasInterviewRecords
    ? ["审厂追溯材料分散，准备成本高", "MES 字段不稳定，异常上下文缺失", "一线抗拒额外录入，项目落地阻力大"]
    : [];
  const liveFeedback = hasInterviewRecords
    ? stageOneOpenDesignPracticeSeedFeedback
    : "还没有正式访谈记录。请从资料来源、审厂压力、一线使用阻力或验收标准开始追问，发送后系统会生成客户回应和分析线索。";
  const openQuestions =
    pendingClues.length > 0
      ? pendingClues.map((item) => `继续追问：${item.label}`)
      : [
          "MES 能导出哪些字段，字段缺失比例如何？",
          "审厂最常见的追溯问题有哪些标准题型？",
          "质检员可以接受哪些低成本补充动作？",
          "哪些问题必须转人工，不能由 AI 判断？",
        ];

  useEffect(() => {
    if (interviewRecords.length === 0) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      interviewEndRef.current?.scrollIntoView({ block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [interviewScrollKey, interviewRecords.length]);

  function handleQuestionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!isPlainEnterSubmitKey(event)) {
      return;
    }
    if (completed || isSendingInterview || message.trim().length === 0) {
      return;
    }
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <div className="interview-lab-page">
      <header className="lab-app-header">
        <button className="lab-brand" onClick={onFinish} type="button" aria-label="返回学生首页">
          <span className="lab-brand-mark">AI</span>
          <strong>制造业质检 AI 客户访谈实训</strong>
        </button>
        <nav className="lab-tabs" aria-label="实训导航">
          <button className="active" type="button">训练中心</button>
          <button onClick={onFinish} type="button">场景说明</button>
          <button onClick={onFinish} type="button">学习报告</button>
        </nav>
      </header>

      <main className="lab-training-shell">
        <section className="lab-conversation" aria-label="AI 客户模拟访谈">
          <div className="lab-scenario-head">
            <div className="lab-scenario-copy">
              <div className="lab-tag-row">
                <span>B2B 软件</span>
                <span>制造业质检</span>
                <span>中级难度</span>
              </div>
              <h1>制造业质检追溯 AI 智能体项目</h1>
              <p>目标：围绕周明的审厂追溯场景，识别痛点、需求、数据边界与验收口径。</p>
            </div>
            <div className="lab-scenario-actions">
              <span>阶段一 · 需求访谈</span>
              <button type="button" onClick={() => setNotesOpen(true)}>访谈记录</button>
              <button className="lab-detail-link" onClick={() => onUseSuggestion("我应该如何把客户原话转化为可验证的需求证据？")} type="button">方法</button>
            </div>
          </div>

          <div className="lab-chat-stream" aria-live="polite">
            {interviewRecords.length === 0 ? (
              <div className="lab-empty-chat" role="status">
                <strong>还没有模拟访谈记录</strong>
                <p>请输入你的第一个问题，客户周明会根据制造业质检追溯场景回应。</p>
              </div>
            ) : (
              interviewRecords.map((record) => (
                <article className="chat-record-pair" key={record.id}>
                  <OpenDesignChatTurn
                    body={record.question}
                    kind="student"
                    studentInitial={studentInitial}
                    time={record.time}
                  />
                  <OpenDesignChatTurn
                    body={record.loading ? "客户正在思考中..." : record.answer}
                    kind="customer"
                    studentInitial={studentInitial}
                    time={record.time}
                  />
                </article>
              ))
            )}
            <div ref={interviewEndRef} />
          </div>

          <div className="lab-interview-tools">
            <div className="lab-prompt-row" aria-label="推荐追问">
              {[
                ["追问资料来源与字段", "MES、Excel 和纸质质检单里，哪些字段对审厂追溯最关键？"],
                ["追问客户痛点影响", "这些问题对审厂、客户满意度和内部协作分别造成什么影响？"],
                ["追问验收标准", "怎样才算这个 AI 助手在审厂追溯场景里真的有用？"],
                ["追问项目边界", "哪些问题不应该由 AI 直接下结论，而是提醒人工确认？"],
              ].map(([label, suggestion]) => (
                <button
                  disabled={completed || isSendingInterview}
                  key={label}
                  onClick={() => onUseSuggestion(suggestion)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            {errorMessage ? (
              <div className="lab-model-error" role="alert">
                {errorMessage}
              </div>
            ) : null}
            <form className="lab-input-box" onSubmit={onInterviewSubmit}>
              <label className="sr-only" htmlFor="interview-question">输入你的提问</label>
              <textarea
                disabled={completed || isSendingInterview}
                id="interview-question"
                maxLength={500}
                onChange={(event) => onMessageChange(event.target.value)}
                onKeyDown={handleQuestionKeyDown}
                placeholder="输入你的提问，继续挖掘客户需求..."
                rows={3}
                value={message}
              />
              <div className="lab-input-actions">
                <span><b>{message.length}</b> / 500</span>
                <button className="lab-save-button" disabled={completed || isSavingVisitNotes} form="stage-one-open-design-notes" type="submit">保存记录</button>
                <button className="lab-finish-button" onClick={onFinish} type="button">完成并退出</button>
                <button className="lab-send-button" disabled={completed || isSendingInterview || message.trim().length === 0} type="submit">
                  {isSendingInterview ? "发送中" : "发送"}
                </button>
              </div>
            </form>
          </div>
        </section>

        <aside className="lab-insight-column" aria-label="访谈分析">
          <section className="insight-card live-feedback">
            <div className="insight-title">
              <span className="insight-icon blue">AI</span>
              <h2>AI 实时反馈</h2>
              <button type="button" onClick={() => onUseSuggestion("MES 字段缺失时，系统应如何提示和转人工确认？")}>使用建议</button>
            </div>
            <p>{liveFeedback}</p>
          </section>

          <OpenDesignInsightList count={requirementItems.length} icon="✓" items={requirementItems.slice(0, 6)} tone="green" title="已识别需求" />
          <OpenDesignInsightList count={painPointItems.length} icon="!" items={painPointItems} tone="red" title="客户痛点" />

          <section className="insight-card project-info">
            <div className="insight-title">
              <span className="insight-icon blue">i</span>
              <h2>项目关键信息</h2>
              <strong>5</strong>
            </div>
            <dl>
              <div><dt>预算范围</dt><dd>课程模拟：有限资源约束</dd></div>
              <div><dt>时间计划</dt><dd>6 周完成需求到验收闭环</dd></div>
              <div><dt>决策流程</dt><dd>质量部 + IT + 任课教师评审</dd></div>
              <div><dt>行业领域</dt><dd>汽车零部件质检</dd></div>
              <div><dt>关键资料</dt><dd>MES、Excel、纸质质检单、SOP</dd></div>
            </dl>
          </section>

          <OpenDesignInsightList count={openQuestions.length} icon="?" items={openQuestions.slice(0, 4)} tone="amber" title="待追问问题" />

          <section className="insight-card score-card">
            <div className="score-head">
              <div>
                <span className="insight-icon purple">奖</span>
                <h2>实训评分</h2>
              </div>
              <strong><span>{scoreTotal}</span><small>/100</small></strong>
            </div>
            <div className="score-rings" aria-label="访谈评分">
              <article style={{ "--score": scoreQuality } as CSSProperties}>
                <i />
                <strong>{scoreQuality}</strong>
                <span>提问质量</span>
              </article>
              <article style={{ "--score": scoreComplete } as CSSProperties}>
                <i />
                <strong>{scoreComplete}</strong>
                <span>信息完整度</span>
              </article>
              <article style={{ "--score": scoreLogic } as CSSProperties}>
                <i />
                <strong>{scoreLogic}</strong>
                <span>沟通逻辑</span>
              </article>
            </div>
            <p className="score-summary">继续深入挖掘数据字段、人工确认边界和验收题型。</p>
          </section>
        </aside>
      </main>

      <button
        aria-controls="interview-notes-panel"
        aria-expanded={notesOpen}
        className="lab-record-tab"
        onClick={() => setNotesOpen(true)}
        type="button"
      >
        <span>访谈记录</span>
      </button>

      <section
        aria-hidden={!notesOpen}
        aria-label="访谈记录草稿"
        className={`lab-notes-drawer ${notesOpen ? "open" : ""}`}
        id="interview-notes-panel"
      >
        <div className="notes-drawer-head">
          <div>
            <span>访谈记录草稿</span>
            <strong>阶段一产物将在这里生成</strong>
          </div>
          <button type="button" onClick={() => setNotesOpen(false)}>收起</button>
        </div>
        <form className="notes-grid" id="stage-one-open-design-notes" onSubmit={onVisitNotesSubmit}>
          <label>已确认事实<textarea rows={4} value={visitNotesDraft.confirmedInformation} onChange={(event) => onVisitNotesChange({ confirmedInformation: event.target.value })} /></label>
          <label>需求假设<textarea rows={4} value={visitNotesDraft.requirementHypotheses} onChange={(event) => onVisitNotesChange({ requirementHypotheses: event.target.value })} /></label>
          <label>待确认问题<textarea rows={4} value={visitNotesDraft.risksAndQuestions} onChange={(event) => onVisitNotesChange({ risksAndQuestions: event.target.value })} /></label>
          <label>下次追问计划<textarea rows={3} value={visitNotesDraft.nextVisitPlan} onChange={(event) => onVisitNotesChange({ nextVisitPlan: event.target.value })} /></label>
          <label>客户可见摘要<textarea rows={3} value={visitNotesDraft.customerVisibleSummary} onChange={(event) => onVisitNotesChange({ customerVisibleSummary: event.target.value })} /></label>
        </form>
        <div className="notes-drawer-actions">
          <button className="lab-save-button" disabled={completed || isSavingVisitNotes} form="stage-one-open-design-notes" type="submit">保存记录</button>
          <button className="lab-finish-button" type="button" onClick={onFinish}>完成访谈并退出</button>
        </div>
      </section>
    </div>
  );
}

function OpenDesignChatTurn({
  body,
  kind,
  studentInitial,
  time,
}: {
  body: string;
  kind: "customer" | "student";
  studentInitial: string;
  time: string;
}) {
  return (
    <article className={`chat-turn ${kind}`}>
      {kind === "customer" ? <div className="chat-avatar">AI</div> : null}
      <div className="chat-body">
        <div className="chat-meta">
          <strong>{kind === "customer" ? "AI 模拟客户 · 周明" : "学员"}</strong>
          <span>{time}</span>
        </div>
        <p>{body}</p>
      </div>
      {kind === "student" ? <div className="chat-avatar">{studentInitial}</div> : null}
    </article>
  );
}

function studentAvatarInitial(studentName?: string) {
  const trimmed = studentName?.trim() ?? "";
  if (!trimmed) {
    return "学";
  }
  return trimmed.replace(/\s+/g, "").slice(0, 1);
}

function OpenDesignInsightList({
  count,
  icon,
  items,
  title,
  tone,
}: {
  count: number;
  icon: string;
  items: string[];
  title: string;
  tone: "amber" | "green" | "red";
}) {
  return (
    <section className={`insight-card ${title === "客户痛点" ? "pains" : title === "待追问问题" ? "open-questions" : "requirements"}`}>
      <div className="insight-title">
        <span className={`insight-icon ${tone}`}>{icon}</span>
        <h2>{title}</h2>
        <strong>{count}</strong>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function StageOneInterviewLabView({
  completed,
  customerIdentity,
  insightState,
  interviewRecords,
  isSavingVisitNotes,
  isSendingInterview,
  message,
  onFinish,
  onInterviewSubmit,
  onMessageChange,
  onUseSuggestion,
  onVisitNotesChange,
  onVisitNotesSubmit,
  visitNotesDraft,
}: {
  completed: boolean;
  customerIdentity: StageOneCustomerIdentity;
  insightState: PracticeInsightState;
  interviewRecords: InterviewRecord[];
  isSavingVisitNotes: boolean;
  isSendingInterview: boolean;
  message: string;
  onFinish: () => void;
  onInterviewSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMessageChange: (value: string) => void;
  onUseSuggestion: (value: string) => void;
  onVisitNotesChange: (patch: Partial<VisitNotesDraft>) => void;
  onVisitNotesSubmit: (event: FormEvent<HTMLFormElement>) => void;
  visitNotesDraft: VisitNotesDraft;
}) {
  const interviewEndRef = useRef<HTMLDivElement>(null);
  const interviewScrollKey = latestPracticeConversationScrollKey(interviewRecords);
  const score = Math.min(96, 58 + insightState.interviewCount * 8 + insightState.coveredCount * 4);
  const scoreSummary =
    score >= 88
      ? "访谈质量已经较好，可以准备生成阶段一访谈记录和需求假设。"
      : "继续围绕字段、角色、边界和验收题型追问，需求证据会更完整。";
  const clueItems = insightState.confirmedClues.slice(0, 4);
  const pendingItems = insightState.confirmedClues
    .filter((item) => !item.ready)
    .map((item) => `继续追问：${item.label}`);
  const openQuestions =
    pendingItems.length > 0
      ? pendingItems
      : [
          "字段缺失时系统应该如何提示？",
          "质量责任认定是否必须转人工确认？",
          "审厂验收题型需要覆盖哪些标准问题？",
        ];

  useEffect(() => {
    if (interviewRecords.length === 0) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      interviewEndRef.current?.scrollIntoView({ block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [interviewScrollKey, interviewRecords.length]);

  function handleQuestionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!isPlainEnterSubmitKey(event)) {
      return;
    }
    if (completed || isSendingInterview || message.trim().length === 0) {
      return;
    }
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <section className="min-h-[calc(100dvh-96px)] bg-[#f4f6f8] text-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-5">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-sm font-extrabold text-white">
              AI
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold text-slate-950">
                制造业质检 AI 客户访谈实训
              </h1>
              <p className="text-xs font-bold text-slate-500">训练中心 / 阶段一 · 需求访谈</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={`${interviewRecords.length} 轮记录`} tone={interviewRecords.length > 0 ? "success" : "info"} />
            <button
              className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
              onClick={onFinish}
              type="button"
            >
              完成并退出
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid min-h-[calc(100dvh-132px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,.08)]">
          <div className="border-b border-slate-100 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge label="AI 模拟客户" tone="info" />
                  <StatusBadge label="制造业质检追溯" tone="success" />
                </div>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">
                  制造业质检追溯 AI 智能体项目
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  {customerIdentity.title}。围绕审厂追溯压力、资料来源、字段质量、一线阻力和验收口径持续追问。
                </p>
              </div>
              <button
                className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
                onClick={() => onUseSuggestion("我想先确认审厂追溯资料现在分别来自哪些系统、表格和纸质材料？")}
                type="button"
              >
                方法提示
              </button>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto bg-slate-50 px-4 py-5">
            {interviewRecords.length === 0 ? (
              <div className="grid h-full min-h-[360px] place-items-center">
                <EmptyState title="还没有客户访谈记录">
                  从资料来源、审厂压力或一线使用阻力开始追问，客户会基于制造业质检场景回应。
                </EmptyState>
              </div>
            ) : (
              <div className="grid gap-4">
                {interviewRecords.map((record) => (
                  <article className="grid gap-3" key={record.id}>
                    <div className="ml-auto grid max-w-[82%] grid-cols-[minmax(0,1fr)_36px] items-start gap-3">
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-blue-700">
                          <span>学员</span>
                          <span className="text-blue-400">{record.time}</span>
                        </div>
                        <p className="mt-1 text-sm leading-7 text-slate-800">{record.question}</p>
                      </div>
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-xs font-extrabold text-white">
                        学
                      </span>
                    </div>
                    <div className="grid max-w-[88%] grid-cols-[36px_minmax(0,1fr)] items-start gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-xs font-extrabold text-white">
                        AI
                      </span>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-emerald-700">
                          <span>{record.loading ? "AI 模拟客户正在思考" : "AI 模拟客户 · 周明"}</span>
                          <span className="text-slate-400">{record.time}</span>
                        </div>
                        {record.loading ? (
                          <ThinkingIndicator />
                        ) : (
                          <p className="mt-1 text-sm leading-7 text-slate-700">{record.answer}</p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
                <div ref={interviewEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-white p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {questionSuggestions.slice(0, 4).map((suggestion) => (
                <button
                  className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={completed || isSendingInterview}
                  key={suggestion}
                  onClick={() => onUseSuggestion(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <form className="rounded-[16px] border border-slate-200 bg-slate-50 p-3" onSubmit={onInterviewSubmit}>
              <label className="sr-only" htmlFor="stage-one-lab-question">
                输入你的提问
              </label>
              <textarea
                className="min-h-20 w-full resize-y border-0 bg-transparent text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                disabled={completed || isSendingInterview}
                id="stage-one-lab-question"
                maxLength={500}
                onChange={(event) => onMessageChange(event.target.value)}
                onKeyDown={handleQuestionKeyDown}
                placeholder="输入你的提问，继续挖掘客户需求..."
                value={message}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={completed || isSavingVisitNotes}
                    form="stage-one-lab-notes"
                    type="submit"
                  >
                    保存记录
                  </button>
                  <button
                    className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                    onClick={onFinish}
                    type="button"
                  >
                    完成并退出
                  </button>
                </div>
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={completed || isSendingInterview || message.trim().length === 0}
                  type="submit"
                >
                  <Send aria-hidden size={16} />
                  {isSendingInterview ? "发送中" : "发送"}
                </button>
              </div>
            </form>
          </div>
        </section>

        <aside className="grid gap-3 xl:max-h-[calc(100dvh-132px)] xl:overflow-y-auto">
          <LabInsightCard
            icon="AI"
            tone="blue"
            title="AI 实时反馈"
            value={
              insightState.interviewCount > 0
                ? "你已经开始沉淀客户原话。下一轮建议追问资料字段、人工确认边界和验收题型，避免后续方案停留在泛泛而谈。"
                : "先用开放问题确认客户角色、审厂压力和当前记录流转，不要一开始承诺方案。"
            }
          />
          <LabListCard
            icon="✓"
            items={clueItems.slice(0, 2).map((item) => item.value)}
            title="已识别需求"
            tone="green"
          />
          <LabListCard
            icon="!"
            items={clueItems.slice(2, 4).map((item) => item.value)}
            title="客户痛点"
            tone="red"
          />
          <LabListCard
            icon="i"
            items={clueItems.map((item) => `${item.label}：${item.ready ? "已覆盖" : "待确认"}`)}
            title="项目关键信息"
            tone="blue"
          />
          <LabListCard icon="?" items={openQuestions.slice(0, 4)} title="待追问问题" tone="amber" />
          <section className="rounded-[18px] border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  Practice Score
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-slate-950">实训评分</h2>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-50 text-lg font-extrabold text-purple-700">
                {score}
              </span>
            </div>
            <div className="mt-4 grid gap-2">
              {[
                ["覆盖度", Math.min(100, insightState.coveredCount * 20)],
                ["追问深度", Math.min(100, insightState.interviewCount * 22)],
                ["证据意识", score],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>{label}</span>
                    <span>{value}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-950" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">{scoreSummary}</p>
          </section>

          <form
            className="rounded-[18px] border border-slate-200 bg-white p-4"
            id="stage-one-lab-notes"
            onSubmit={onVisitNotesSubmit}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  Interview Notes
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-slate-950">访谈记录草稿</h2>
              </div>
              <StatusBadge label="阶段一产物" tone="info" />
            </div>
            <div className="mt-4 grid gap-3">
              <LabNotesField
                label="已确认事实"
                onChange={(value) => onVisitNotesChange({ confirmedInformation: value })}
                value={visitNotesDraft.confirmedInformation}
              />
              <LabNotesField
                label="需求假设"
                onChange={(value) => onVisitNotesChange({ requirementHypotheses: value })}
                value={visitNotesDraft.requirementHypotheses}
              />
              <LabNotesField
                label="待确认问题"
                onChange={(value) => onVisitNotesChange({ risksAndQuestions: value })}
                value={visitNotesDraft.risksAndQuestions}
              />
              <LabNotesField
                label="下次追问计划"
                onChange={(value) => onVisitNotesChange({ nextVisitPlan: value })}
                value={visitNotesDraft.nextVisitPlan}
              />
              <LabNotesField
                label="客户可见摘要"
                onChange={(value) => onVisitNotesChange({ customerVisibleSummary: value })}
                value={visitNotesDraft.customerVisibleSummary}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={completed || isSavingVisitNotes}
                type="submit"
              >
                <Save aria-hidden size={15} />
                {isSavingVisitNotes ? "保存中" : "保存记录"}
              </button>
            </div>
          </form>
        </aside>
      </main>
    </section>
  );
}

function LabInsightCard({
  icon,
  title,
  tone,
  value,
}: {
  icon: string;
  title: string;
  tone: "amber" | "blue" | "green" | "red";
  value: string;
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-extrabold ${labToneClass(tone)}`}>
          {icon}
        </span>
        <h2 className="text-base font-extrabold text-slate-950">{title}</h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{value}</p>
    </section>
  );
}

function LabListCard({
  icon,
  items,
  title,
  tone,
}: {
  icon: string;
  items: string[];
  title: string;
  tone: "amber" | "blue" | "green" | "red";
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-extrabold ${labToneClass(tone)}`}>
          {icon}
        </span>
        <h2 className="text-base font-extrabold text-slate-950">{title}</h2>
      </div>
      <ul className="mt-3 grid gap-2">
        {(items.length > 0 ? items : ["等待访谈证据补充。"]).map((item) => (
          <li className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function LabNotesField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-extrabold text-slate-500">
      {label}
      <textarea
        className="min-h-20 resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium leading-6 text-slate-800 outline-none transition focus:border-emerald-300"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function labToneClass(tone: "amber" | "blue" | "green" | "red"): string {
  const classMap = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  };
  return classMap[tone];
}

function StageOneHome({
  completed,
  coverageReadyCount,
  coverageTotal,
  hasEvaluation,
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
  hasEvaluation: boolean;
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
              先通过教学引导掌握访谈动作，再进入项目实战完成正式客户拜访、拜访间整理、问题总结和综合评估。
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
            value={completed ? "已通过" : hasEvaluation ? "已生成" : hasSavedSummary ? "待评估" : "待总结"}
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
  canSaveVisitNotes,
  completed,
  customerIdentity,
  draft,
  hasEvaluation,
  hasSavedSummary,
  hasSavedVisitNotes,
  insightState,
  interviewRecords,
  isCompletingStage,
  isRequestingEvaluation,
  isSavingSummary,
  isSavingVisitNotes,
  isSendingInterview,
  latestEvaluationArtifact,
  message,
  onBack,
  onCompleteStage,
  onInterviewSubmit,
  onMessageChange,
  onRequestEvaluation,
  onSaveSummaryChange,
  onSaveVisitNotesChange,
  onSummarySubmit,
  onUseSuggestion,
  onVisitNotesSubmit,
  progressItems,
  visitNotesDraft,
}: {
  canSaveSummary: boolean;
  canSaveVisitNotes: boolean;
  completed: boolean;
  customerIdentity: StageOneCustomerIdentity;
  draft: SummaryDraft;
  hasEvaluation: boolean;
  hasSavedSummary: boolean;
  hasSavedVisitNotes: boolean;
  insightState: PracticeInsightState;
  interviewRecords: InterviewRecord[];
  isCompletingStage: boolean;
  isRequestingEvaluation: boolean;
  isSavingSummary: boolean;
  isSavingVisitNotes: boolean;
  isSendingInterview: boolean;
  latestEvaluationArtifact: Artifact | null;
  message: string;
  onBack: () => void;
  onCompleteStage: () => Promise<boolean>;
  onInterviewSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMessageChange: (value: string) => void;
  onRequestEvaluation: () => Promise<boolean>;
  onSaveSummaryChange: (patch: Partial<SummaryDraft>) => void;
  onSaveVisitNotesChange: (patch: Partial<VisitNotesDraft>) => void;
  onSummarySubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUseSuggestion: (value: string) => void;
  onVisitNotesSubmit: (event: FormEvent<HTMLFormElement>) => void;
  progressItems: StageOneProgressItem[];
  visitNotesDraft: VisitNotesDraft;
}) {
  const [activeTask, setActiveTask] = useState<"interview" | "visit_notes" | "summary" | "evaluation">("interview");
  const formalProgress = progressItems.slice(1);
  const activeProgressItem =
    formalProgress.find((item) => item.key === (activeTask === "summary" ? "problem_summary" : activeTask)) ??
    formalProgress[0];

  return (
    <section className="grid gap-4">
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

      <div className="grid gap-4 xl:h-[calc(100dvh-132px)] xl:grid-cols-[220px_minmax(0,1fr)_320px]">
        <PracticeTaskRail
          activeKey={activeTask}
          onSelect={setActiveTask}
          progressItems={formalProgress}
        />

        <main className="min-h-0 overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(26,33,44,.06)]">
          <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
            <div className="border-b border-slate-100 p-4">
              <CustomerIdentityBanner compact identity={customerIdentity} />
            </div>
            <div className="min-h-0 overflow-y-auto p-4">
              {activeTask === "interview" ? (
                <InterviewPanel
                  completed={completed}
                  interviewRecords={interviewRecords}
                  isSending={isSendingInterview}
                  message={message}
                  onMessageChange={onMessageChange}
                  onSubmit={onInterviewSubmit}
                  onUseSuggestion={onUseSuggestion}
                />
              ) : activeTask === "visit_notes" ? (
                <VisitNotesEditor
                  canSave={canSaveVisitNotes}
                  completed={completed}
                  draft={visitNotesDraft}
                  isSaving={isSavingVisitNotes}
                  onChange={onSaveVisitNotesChange}
                  onSubmit={onVisitNotesSubmit}
                />
              ) : activeTask === "summary" ? (
                <SummaryEditor
                  canSaveSummary={canSaveSummary}
                  completed={completed}
                  draft={draft}
                  isSaving={isSavingSummary}
                  onChange={onSaveSummaryChange}
                  onSubmit={onSummarySubmit}
                />
              ) : (
                <PracticeEvaluationPanel
                  completed={completed}
                  hasEvaluation={hasEvaluation}
                  hasSavedSummary={hasSavedSummary}
                  hasSavedVisitNotes={hasSavedVisitNotes}
                  isCompleting={isCompletingStage}
                  isRequestingEvaluation={isRequestingEvaluation}
                  latestEvaluationArtifact={latestEvaluationArtifact}
                  onCompleteStage={onCompleteStage}
                  onRequestEvaluation={onRequestEvaluation}
                />
              )}
            </div>
          </div>
        </main>

        <PracticeInsightsPanel
          activeProgressItem={activeProgressItem}
          insightState={insightState}
          progressItems={progressItems}
        />
      </div>
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

function PracticeTaskRail({
  activeKey,
  onSelect,
  progressItems,
}: {
  activeKey: "interview" | "visit_notes" | "summary" | "evaluation";
  onSelect: (key: "interview" | "visit_notes" | "summary" | "evaluation") => void;
  progressItems: StageOneProgressItem[];
}) {
  return (
    <aside className="min-h-0 rounded-[18px] border border-slate-200 bg-white p-4">
      <h3 className="text-base font-extrabold text-slate-950">正式实战链路</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        这些产物会进入阶段二证据链。
      </p>
      <div className="mt-4 grid gap-3">
        {progressItems.map((item) => {
          const key = practiceTaskKey(item);
          const stateCopy = progressStateCopy(item.state);
          const active = activeKey === key;
          return (
            <button
              className={`grid min-h-[76px] grid-cols-[36px_1fr] gap-3 rounded-2xl border p-3 text-left transition ${
                active
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
              }`}
              disabled={item.state === "locked"}
              key={item.key}
              onClick={() => onSelect(key)}
              type="button"
            >
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${stateCopy.iconClass}`}>
                {item.state === "done" ? <CheckCircle2 aria-hidden size={16} /> : <ClipboardCheck aria-hidden size={16} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold">{item.label}</span>
                <span className={`mt-1 block text-xs font-bold ${active ? "text-slate-300" : "text-slate-500"}`}>
                  {item.meta}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function PracticeInsightsPanel({
  activeProgressItem,
  insightState,
  progressItems,
}: {
  activeProgressItem: StageOneProgressItem;
  insightState: PracticeInsightState;
  progressItems: StageOneProgressItem[];
}) {
  return (
    <aside className="min-h-0 overflow-y-auto rounded-[18px] border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold text-slate-950">实战线索</h3>
        <StatusBadge
          label={`${insightState.coveredCount} / ${insightState.confirmedClues.length}`}
          tone={insightState.summaryReady ? "success" : "info"}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-xs font-extrabold text-emerald-700">当前任务</p>
        <h4 className="mt-1 text-sm font-extrabold text-emerald-950">{activeProgressItem.label}</h4>
        <p className="mt-2 text-xs leading-5 text-emerald-800">{activeProgressItem.description}</p>
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

function practiceTaskKey(
  item: StageOneProgressItem,
): "interview" | "visit_notes" | "summary" | "evaluation" {
  if (item.key === "practice") {
    return "interview";
  }
  if (item.key === "problem_summary") {
    return "summary";
  }
  if (item.key === "visit_notes" || item.key === "evaluation") {
    return item.key;
  }
  return "interview";
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

function VisitNotesEditor({
  canSave,
  completed,
  draft,
  isSaving,
  onChange,
  onSubmit,
}: {
  canSave: boolean;
  completed: boolean;
  draft: VisitNotesDraft;
  isSaving: boolean;
  onChange: (patch: Partial<VisitNotesDraft>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="grid gap-4">
      <div>
        <h3 className="text-lg font-extrabold text-slate-950">拜访间整理</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          把客户对话整理成下一轮追问计划和给客户可复述的初步理解。
        </p>
      </div>
      <form className="grid gap-4" onSubmit={onSubmit}>
        <SummaryField
          label="已确认信息"
          onChange={(value) => onChange({ confirmedInformation: value })}
          placeholder="每行写一条已确认事实，例如：质检记录来自纸质表、Excel 和部分 MES 字段。"
          required
          rows={5}
          value={draft.confirmedInformation}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <SummaryField
            label="初步需求假设"
            onChange={(value) => onChange({ requirementHypotheses: value })}
            placeholder="每行写一个需求假设"
            rows={5}
            value={draft.requirementHypotheses}
          />
          <SummaryField
            label="风险和疑点"
            onChange={(value) => onChange({ risksAndQuestions: value })}
            placeholder="每行写一个待确认风险或疑点"
            rows={5}
            value={draft.risksAndQuestions}
          />
        </div>
        <SummaryField
          label="下次拜访计划"
          onChange={(value) => onChange({ nextVisitPlan: value })}
          placeholder="例如：追问 MES 字段完整性、样例材料和一线录入阻力。"
          required
          value={draft.nextVisitPlan}
        />
        <SummaryField
          label="给客户看的初步摘要"
          onChange={(value) => onChange({ customerVisibleSummary: value })}
          placeholder="例如：我们先围绕质检记录整理和追溯证据准备做小范围梳理。"
          required
          value={draft.customerVisibleSummary}
        />
        <div className="flex justify-end">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={completed || isSaving || !canSave}
            type="submit"
          >
            <Save aria-hidden size={16} />
            {isSaving ? "保存中" : "保存拜访间整理"}
          </button>
        </div>
      </form>
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
        <SummaryField
          label="未确认问题"
          onChange={(value) => onChange({ unconfirmedQuestions: value })}
          placeholder="每行写一个需要阶段二前继续确认的问题"
          rows={4}
          value={draft.unconfirmedQuestions}
        />
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

function PracticeEvaluationPanel({
  completed,
  hasEvaluation,
  hasSavedSummary,
  hasSavedVisitNotes,
  isCompleting,
  isRequestingEvaluation,
  latestEvaluationArtifact,
  onCompleteStage,
  onRequestEvaluation,
}: {
  completed: boolean;
  hasEvaluation: boolean;
  hasSavedSummary: boolean;
  hasSavedVisitNotes: boolean;
  isCompleting: boolean;
  isRequestingEvaluation: boolean;
  latestEvaluationArtifact: Artifact | null;
  onCompleteStage: () => Promise<boolean>;
  onRequestEvaluation: () => Promise<boolean>;
}) {
  const evaluation = latestEvaluationArtifact?.content_json;
  const reviewSummary = stringValue(evaluation?.review_summary);
  const [evaluationDetailOpen, setEvaluationDetailOpen] = useState(false);
  return (
    <section className="grid gap-5">
      <div>
        <h3 className="text-lg font-extrabold text-slate-950">阶段一综合评估</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          基于正式客户访谈、拜访整理和问题总结，生成进入阶段二前的需求理解评估。
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-extrabold text-slate-500">AI 评估摘要</p>
        <EvaluationPreview
          emptyText="生成综合评估后，这里会展示信息覆盖、关键遗漏和阶段二风险。"
          hasReport={reviewSummary.length > 0}
          onOpenDetail={() => setEvaluationDetailOpen(true)}
          value={reviewSummary}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <CompletionCheck label="已保存拜访间整理" ready={hasSavedVisitNotes || completed} />
        <CompletionCheck label="已保存问题发现总结" ready={hasSavedSummary || completed} />
        <CompletionCheck label="已生成综合评估" ready={hasEvaluation || completed} />
        <CompletionCheck label="阶段二可解锁" ready={completed} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={completed || isRequestingEvaluation || !hasSavedVisitNotes || !hasSavedSummary}
          onClick={() => void onRequestEvaluation()}
          type="button"
        >
          <Sparkles aria-hidden size={16} />
          {isRequestingEvaluation ? "生成中" : hasEvaluation ? "重新生成综合评估" : "生成综合评估"}
        </button>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={completed || isCompleting || !hasEvaluation}
          onClick={() => void onCompleteStage()}
          type="button"
        >
          <CheckCircle2 aria-hidden size={16} />
          {completed ? "阶段一已完成" : isCompleting ? "确认中" : "完成阶段一并解锁阶段二"}
        </button>
      </div>
      <EvaluationDetailDialog
        onClose={() => setEvaluationDetailOpen(false)}
        open={evaluationDetailOpen}
        value={reviewSummary}
      />
    </section>
  );
}

function EvaluationPreview({
  emptyText,
  hasReport,
  onOpenDetail,
  value,
}: {
  emptyText: string;
  hasReport: boolean;
  onOpenDetail: () => void;
  value: string;
}) {
  return (
    <div className="stage-one-evaluation-preview">
      <div className="stage-one-evaluation-preview-body">
        <AiMarkdownContent emptyText={emptyText} value={value} />
      </div>
      {hasReport ? (
        <button
          className="stage-one-evaluation-detail-trigger"
          onClick={onOpenDetail}
          type="button"
        >
          查看详情
        </button>
      ) : null}
    </div>
  );
}

function EvaluationDetailDialog({
  onClose,
  open,
  value,
}: {
  onClose: () => void;
  open: boolean;
  value: string;
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="stage-one-evaluation-dialog-backdrop" onClick={onClose} role="presentation">
      <section
        aria-labelledby="stage-one-evaluation-dialog-title"
        aria-modal="true"
        className="stage-one-evaluation-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header>
          <div>
            <span>AI Evaluation Report</span>
            <h2 id="stage-one-evaluation-dialog-title">阶段一综合评估全文</h2>
          </div>
          <button aria-label="关闭综合评估详情" onClick={onClose} type="button">
            <X aria-hidden size={18} />
          </button>
        </header>
        <div className="stage-one-evaluation-dialog-body">
          <AiMarkdownContent
            emptyText="生成综合评估后，这里会展示信息覆盖、关键遗漏和阶段二风险。"
            value={value}
          />
        </div>
      </section>
    </div>
  );
}

function AiMarkdownContent({
  emptyText,
  value,
}: {
  emptyText: string;
  value: string;
}) {
  const blocks = parseAiMarkdownBlocks(value);

  if (blocks.length === 0) {
    return <p className="mt-2 text-sm leading-7 text-slate-600">{emptyText}</p>;
  }

  return (
    <div className="mt-4 space-y-4 text-sm leading-7 text-slate-700">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const headingClass =
            block.level <= 3
              ? "border-l-4 border-emerald-400 pl-3 text-base font-extrabold text-slate-950"
              : "pt-2 text-sm font-extrabold text-slate-900";
          return (
            <h4 className={headingClass} key={`heading-${index}`}>
              {renderInlineMarkdown(block.text)}
            </h4>
          );
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              className={`space-y-2 pl-5 ${block.ordered ? "list-decimal marker:font-extrabold" : "list-disc"} marker:text-emerald-600`}
              key={`list-${index}`}
              start={block.ordered ? block.start : undefined}
            >
              {block.items.map((item, itemIndex) => (
                <li className="pl-1 text-slate-700" key={`${item}-${itemIndex}`}>
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <p className="text-slate-700" key={`paragraph-${index}`}>
            {renderInlineMarkdown(block.text)}
          </p>
        );
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*.+?\*\*|`.+?`)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const token = match[0];
    const start = match.index ?? 0;
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }

    if (token.startsWith("**")) {
      nodes.push(
        <strong className="font-extrabold text-slate-950" key={`strong-${start}`}>
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code className="rounded bg-white px-1.5 py-0.5 text-xs font-bold text-slate-700" key={`code-${start}`}>
          {token.slice(1, -1)}
        </code>,
      );
    }

    lastIndex = start + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
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

function createSubmitDraftFromWorkspaceState({
  baseDraft,
  interviewRecords,
  summaryDraft,
  visitNotesDraft,
}: {
  baseDraft: StageOneVNextSubmitDraft;
  interviewRecords: InterviewRecord[];
  summaryDraft: SummaryDraft;
  visitNotesDraft: VisitNotesDraft;
}): StageOneVNextSubmitDraft {
  const confirmedInformation = lines(visitNotesDraft.confirmedInformation);
  const requirementHypotheses = lines(visitNotesDraft.requirementHypotheses);
  const risksAndQuestions = lines(visitNotesDraft.risksAndQuestions);
  const painPoints = lines(summaryDraft.painPoints);
  const successCriteria = lines(summaryDraft.successCriteria);
  const unconfirmedQuestions = lines(summaryDraft.unconfirmedQuestions);

  return {
    quote_excerpts: baseDraft.quote_excerpts,
    visit_notes: {
      confirmed_information: listOrFallback(
        confirmedInformation,
        baseDraft.visit_notes.confirmed_information,
      ),
      requirement_hypotheses: listOrFallback(
        requirementHypotheses,
        baseDraft.visit_notes.requirement_hypotheses,
      ),
      risks_and_questions: listOrFallback(
        risksAndQuestions,
        baseDraft.visit_notes.risks_and_questions,
      ),
      next_visit_plan:
        visitNotesDraft.nextVisitPlan.trim() || baseDraft.visit_notes.next_visit_plan,
      customer_visible_summary:
        visitNotesDraft.customerVisibleSummary.trim() ||
        baseDraft.visit_notes.customer_visible_summary,
    },
    summary: {
      problem_statement:
        summaryDraft.problemStatement.trim() || baseDraft.summary.problem_statement,
      target_user: summaryDraft.targetUser.trim() || baseDraft.summary.target_user,
      business_context:
        summaryDraft.businessContext.trim() || baseDraft.summary.business_context,
      pain_points: listOrFallback(painPoints, baseDraft.summary.pain_points),
      success_criteria: listOrFallback(successCriteria, baseDraft.summary.success_criteria),
      unconfirmed_questions: listOrFallback(
        unconfirmedQuestions,
        baseDraft.summary.unconfirmed_questions,
      ),
      evidence_artifact_ids:
        baseDraft.summary.evidence_artifact_ids.length > 0
          ? baseDraft.summary.evidence_artifact_ids
          : interviewRecords.map((record) => record.id),
    },
  };
}

function listOrFallback(localValue: string[], fallbackValue: string[]): string[] {
  return localValue.length > 0 ? localValue : fallbackValue;
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
    unconfirmedQuestions: arrayOrString(content.unconfirmed_questions).join("\n"),
  };
}

function visitNotesDraftFromArtifact(artifact: Artifact): VisitNotesDraft {
  const content = artifact.content_json;
  return {
    confirmedInformation: arrayOrString(content.confirmed_information).join("\n"),
    requirementHypotheses: arrayOrString(content.requirement_hypotheses).join("\n"),
    risksAndQuestions: arrayOrString(content.risks_and_questions).join("\n"),
    nextVisitPlan: stringValue(content.next_visit_plan),
    customerVisibleSummary: stringValue(content.customer_visible_summary),
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
