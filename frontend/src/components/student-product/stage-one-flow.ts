export type StageOneMode = "home" | "guided" | "practice";

export type StageOneArtifactLike = {
  artifact_type: string;
  content_json: Record<string, unknown>;
  created_at: string;
  id: string;
};

export type StageOneProgressState = "locked" | "ready" | "active" | "done";

export type StageOneProgressItem = {
  description: string;
  key: "guided" | "practice" | "visit_notes" | "problem_summary" | "evaluation";
  label: string;
  meta: string;
  state: StageOneProgressState;
};

export type StageOneGuidedTrainingLike = {
  active_level: string;
  completed_levels: string[];
  status: string;
} | null;

export type StageOneCustomerPersonaLike = {
  name?: unknown;
  position?: unknown;
  project_concerns?: unknown;
  release_rules?: unknown;
  responsibilities?: unknown;
} | null;

export type StageOneCustomerIdentity = {
  chips: string[];
  description: string;
  title: string;
};

export type StageOneGuidedTurnLike = {
  customer_response: string;
  level_key: string;
  student_message: string;
  turn_id: string;
};

export type PendingGuidedTurn = {
  id: string;
  level_key: string;
  student_message: string;
} | null;

export type GuidedConversationMessage = {
  content: string;
  id: string;
  loading?: boolean;
  role: "customer" | "student";
};

export type PracticeConversationRecordLike = {
  answer: string;
  id: string;
  question: string;
  time: string;
};

export type PendingPracticeQuestion = {
  id: string;
  question: string;
} | null;

export type PracticeConversationRecord = PracticeConversationRecordLike & {
  loading?: boolean;
};

export type OpenDesignPracticeSeedTurn = {
  body: string;
  kind: "customer" | "student";
  time: string;
};

export const stageOneOpenDesignPracticeSeedTurns: OpenDesignPracticeSeedTurn[] = [
  {
    body: "我们是一家汽车零部件工厂，最近客户审厂越来越频繁。最麻烦的是质检记录、异常处置、复检结果和整改材料分散在不同系统和表里，每次审厂前都要临时拼材料。",
    kind: "customer",
    time: "10:02",
  },
  {
    body: "您现在最希望通过这个 AI 项目解决哪个具体场景？是日常查询，还是审厂前的追溯材料准备？",
    kind: "student",
    time: "10:03",
  },
  {
    body: "审厂前的追溯准备优先级最高。客户会问某个批次为什么判异常、怎么处理、复检是否通过、整改证据在哪里。现在这些信息要从 MES、Excel、纸质单和共享文件夹里找。",
    kind: "customer",
    time: "10:03",
  },
  {
    body: "这些资料分散对您和一线质检员分别造成了什么影响？",
    kind: "student",
    time: "10:04",
  },
];

export const stageOneOpenDesignPracticeSeedFeedback =
  "你已经抓住客户访谈线索。下一轮建议追问资料字段、人工确认边界和验收题型，避免后续方案边界不清。";

export type SubmitKeyLike = {
  isComposing?: boolean;
  key: string;
  nativeEvent?: {
    isComposing?: boolean;
  };
  shiftKey?: boolean;
};

export type PracticeInsightState = {
  confirmedClues: Array<{ label: string; ready: boolean; value: string }>;
  coveredCount: number;
  interviewCount: number;
  summaryReady: boolean;
};

export type StageOneVNextStep = "guide" | "lab" | "submit";

export type StageOneVNextGateChecks = {
  businessGoal: boolean;
  customerQuote: boolean;
  dataSource: boolean;
  projectBoundary: boolean;
  stageTwoInput: boolean;
};

export type StageOneVNextSubmitDraft = {
  quote_excerpts: string[];
  visit_notes: {
    confirmed_information: string[];
    requirement_hypotheses: string[];
    risks_and_questions: string[];
    next_visit_plan: string;
    customer_visible_summary: string;
  };
  summary: {
    problem_statement: string;
    target_user: string;
    business_context: string;
    pain_points: string[];
    success_criteria: string[];
    unconfirmed_questions: string[];
    evidence_artifact_ids: string[];
  };
};

export const stageOneOpenDesignSubmitFallbackDraft: StageOneVNextSubmitDraft = {
  quote_excerpts: [
    "客户提到「质检记录、异常处置、复检结果和整改材料分散在不同系统和表里」。",
    "客户明确审厂前的追溯准备优先级最高，需要从 MES、Excel、纸质单和共享文件夹里找证据。",
  ],
  visit_notes: {
    confirmed_information: [
      "汽车零部件工厂准备大客户审厂，需要提升质检过程可追溯性。",
      "质检记录、异常处置、复检结果和整改材料分散在 MES、Excel、纸质单和共享文件夹。",
    ],
    requirement_hypotheses: [
      "需要围绕批次、异常、处置和复检结果快速整理审厂追溯证据。",
      "AI 助手回答时必须引用 SOP、质检记录或整改材料来源。",
    ],
    risks_and_questions: [
      "MES 字段缺失时需要提示补充，不能直接生成结论。",
      "一线质检员不能被增加重复录入负担，范围外问题需要转人工确认。",
    ],
    next_visit_plan: "追问资料字段、人工确认边界和验收题型，补齐阶段二方案输入。",
    customer_visible_summary:
      "当前优先围绕审厂前追溯材料准备做小范围试点，先解决资料分散、引用不清和字段缺失提示问题。",
  },
  summary: {
    business_context:
      "制造业质量负责人需要在客户审厂前快速整理批次异常、处置、复检和整改证据。",
    evidence_artifact_ids: ["open-design-seed-interview"],
    pain_points: [
      "审厂追溯材料分散，人工准备成本高。",
      "MES 字段不稳定，异常上下文缺失。",
      "一线抗拒额外录入，项目落地阻力大。",
    ],
    problem_statement:
      "审厂前质检记录分散在多系统和线下材料中，质量团队难以及时形成可追溯、可引用、边界清晰的客户回答。",
    success_criteria: [
      "按批次快速汇总异常、处置和复检证据。",
      "字段缺失时提示补充，不直接生成结论。",
      "支持范围外问题转人工确认。",
    ],
    target_user: "制造工厂质量负责人和一线质检员",
    unconfirmed_questions: [
      "MES 能导出哪些字段，字段缺失比例如何？",
      "审厂最常见的追溯问题有哪些标准题型？",
    ],
  },
};

const stageOneInterviewType = "stage_1_interview_turn";
const stageOneSummaryType = "stage_1_problem_summary";
const stageOneVisitNotesType = "stage_1_visit_notes";
const stageOneEvaluationType = "stage_1_evaluation";

export function createGuidedConversationMessages({
  pendingTurn,
  turns,
}: {
  levelKey: string;
  pendingTurn: PendingGuidedTurn;
  seedResponse: string;
  turns: StageOneGuidedTurnLike[];
}): GuidedConversationMessage[] {
  const persistedMessages = turns.flatMap((turn) => [
    {
      content: turn.student_message,
      id: `${turn.turn_id}-student`,
      role: "student" as const,
    },
    {
      content: turn.customer_response,
      id: `${turn.turn_id}-customer`,
      role: "customer" as const,
    },
  ]);
  const messages: GuidedConversationMessage[] = [...persistedMessages];

  if (pendingTurn) {
    messages.push(
      {
        content: pendingTurn.student_message,
        id: `${pendingTurn.id}-student`,
        role: "student",
      },
      {
        content: "客户正在思考中",
        id: `${pendingTurn.id}-customer-thinking`,
        loading: true,
        role: "customer",
      },
    );
  }

  return messages;
}

export function createPracticeConversationRecords(
  records: PracticeConversationRecordLike[],
  pendingQuestion: PendingPracticeQuestion,
): PracticeConversationRecord[] {
  if (pendingQuestion === null) {
    return records;
  }

  return [
    ...records,
    {
      answer: "客户正在思考中",
      id: pendingQuestion.id,
      loading: true,
      question: pendingQuestion.question,
      time: "等待回应",
    },
  ];
}

export function latestGuidedConversationScrollKey(messages: GuidedConversationMessage[]): string {
  const latestMessage = messages.at(-1);
  if (!latestMessage) {
    return "0:none:idle";
  }
  return `${messages.length}:${latestMessage.id}:${latestMessage.loading ? "loading" : "ready"}`;
}

export function latestPracticeConversationScrollKey(records: PracticeConversationRecord[]): string {
  const latestRecord = records.at(-1);
  if (!latestRecord) {
    return "0:none:idle";
  }
  return `${records.length}:${latestRecord.id}:${latestRecord.loading ? "loading" : "ready"}`;
}

export function isPlainEnterSubmitKey(event: SubmitKeyLike): boolean {
  return (
    event.key === "Enter" &&
    event.shiftKey !== true &&
    event.isComposing !== true &&
    event.nativeEvent?.isComposing !== true
  );
}

export function deriveCustomerIdentity(
  persona: StageOneCustomerPersonaLike,
): StageOneCustomerIdentity {
  const name = stringValue(persona?.name);
  const position = stringValue(persona?.position);
  const responsibilities = stringListValue(persona?.responsibilities);
  const title = name && position ? `${name}，${position}` : name || position || "客户代表";
  const responsibilitySummary = summarizeResponsibilities(responsibilities);
  const description =
    responsibilitySummary.length > 0
      ? `负责${responsibilitySummary}。请通过连续访谈逐步了解业务背景。`
      : "请通过连续访谈逐步了解客户业务背景。";

  return {
    title,
    description,
    chips: [
      position ? `角色：${position}` : "角色：客户方代表",
    ],
  };
}

export function createStageOneProgressItems(
  artifacts: StageOneArtifactLike[],
  stageStatus: string | undefined,
  guidedTraining?: StageOneGuidedTrainingLike,
): StageOneProgressItem[] {
  const interviewCount = countArtifactsOfType(artifacts, stageOneInterviewType);
  const latestSummary = latestArtifactOfType(artifacts, stageOneSummaryType);
  const latestVisitNotes = latestArtifactOfType(artifacts, stageOneVisitNotesType);
  const latestEvaluation = latestArtifactOfType(artifacts, stageOneEvaluationType);
  const completed = stageStatus === "completed";
  const hasSummary = latestSummary !== null;
  const hasVisitNotes = latestVisitNotes !== null;
  const hasEvaluation = latestEvaluation !== null;
  const guidedCompletedCount = guidedTraining?.completed_levels.length ?? 0;
  const guidedDone = guidedTraining?.status === "completed" || guidedCompletedCount >= 6;
  const guidedStarted = guidedCompletedCount > 0 || Boolean(guidedTraining?.active_level);

  return [
    {
      description: "六关卡访谈训练，不写入正式项目证据。",
      key: "guided",
      label: "教学引导",
      meta: guidedDone
        ? "已完成"
        : guidedStarted
          ? `${guidedCompletedCount} / 6 关`
          : "推荐完成",
      state: guidedDone ? "done" : guidedStarted ? "active" : "ready",
    },
    {
      description: "与 AI 客户完成正式拜访，沉淀对话证据。",
      key: "practice",
      label: "项目实战拜访",
      meta: interviewCount > 0 ? `${interviewCount} 轮` : "待开始",
      state: interviewCount > 0 ? "done" : "ready",
    },
    {
      description: "把拜访内容整理为已确认信息、风险疑点和下次追问。",
      key: "visit_notes",
      label: "拜访间整理",
      meta: hasVisitNotes ? "已整理" : interviewCount > 0 ? "可整理" : "待访谈",
      state: hasVisitNotes ? "done" : interviewCount > 0 ? "ready" : "locked",
    },
    {
      description: "形成可进入方案定义的问题陈述、需求假设和未确认问题。",
      key: "problem_summary",
      label: "问题发现总结",
      meta: hasSummary ? "已保存" : hasVisitNotes ? "可总结" : "待整理",
      state: hasSummary ? "done" : hasVisitNotes ? "ready" : "locked",
    },
    {
      description: "检查信息覆盖、关键遗漏和对话证据引用，确认是否解锁阶段二。",
      key: "evaluation",
      label: "综合评估",
      meta: completed ? "已通过" : hasEvaluation ? "已生成" : hasSummary && hasVisitNotes ? "可生成" : "待评估",
      state: completed || hasEvaluation ? "done" : hasSummary && hasVisitNotes ? "ready" : "locked",
    },
  ];
}

export function derivePracticeInsightState(
  artifacts: StageOneArtifactLike[],
  stageStatus: string | undefined,
): PracticeInsightState {
  const interviewCount = countArtifactsOfType(artifacts, stageOneInterviewType);
  const latestSummary = latestArtifactOfType(artifacts, stageOneSummaryType);
  const content = latestSummary?.content_json ?? {};
  const painPoints = stringListValue(content.pain_points);
  const successCriteria = stringListValue(content.success_criteria);

  const confirmedClues = [
    {
      label: "业务背景",
      ready: stringValue(content.business_context).length > 0,
      value: stringValue(content.business_context) || "需要确认客户业务场景和当前流程。",
    },
    {
      label: "目标用户",
      ready: stringValue(content.target_user).length > 0,
      value: stringValue(content.target_user) || "需要确认谁会使用或维护最终智能体。",
    },
    {
      label: "核心痛点",
      ready: painPoints.length > 0,
      value: painPoints.slice(0, 2).join(" / ") || "需要追问高频、严重、可验证的业务痛点。",
    },
    {
      label: "问题定义",
      ready: stringValue(content.problem_statement).length > 0,
      value: stringValue(content.problem_statement) || "需要形成一句清晰的问题陈述。",
    },
    {
      label: "成功标准",
      ready: successCriteria.length > 0,
      value: successCriteria.slice(0, 2).join(" / ") || "需要追问客户怎样判断项目有效。",
    },
  ];

  return {
    confirmedClues,
    coveredCount: confirmedClues.filter((item) => item.ready).length,
    interviewCount,
    summaryReady: latestSummary !== null,
  };
}

export function deriveStageOneVNextStep(
  artifacts: StageOneArtifactLike[],
  stageStatus: string | undefined,
): StageOneVNextStep {
  if (stageStatus === "completed") {
    return "submit";
  }

  const interviewCount = countArtifactsOfType(artifacts, stageOneInterviewType);
  const hasVisitNotes = latestArtifactOfType(artifacts, stageOneVisitNotesType) !== null;
  const hasSummary = latestArtifactOfType(artifacts, stageOneSummaryType) !== null;
  const hasEvaluation = latestArtifactOfType(artifacts, stageOneEvaluationType) !== null;

  if (hasVisitNotes || hasSummary || hasEvaluation) {
    return "submit";
  }

  return interviewCount > 0 ? "lab" : "guide";
}

export function createStageOneVNextSubmitDraft(
  artifacts: StageOneArtifactLike[],
): StageOneVNextSubmitDraft {
  const hasFormalStageOneArtifact = artifacts.some((artifact) =>
    [
      stageOneInterviewType,
      stageOneVisitNotesType,
      stageOneSummaryType,
      stageOneEvaluationType,
    ].includes(artifact.artifact_type),
  );
  if (!hasFormalStageOneArtifact) {
    return stageOneOpenDesignSubmitFallbackDraft;
  }

  const interviewArtifacts = artifacts
    .filter((artifact) => artifact.artifact_type === stageOneInterviewType)
    .slice()
    .sort(compareArtifactsByCreatedAt);
  const latestVisitNotes = latestArtifactOfType(artifacts, stageOneVisitNotesType);
  const latestSummary = latestArtifactOfType(artifacts, stageOneSummaryType);
  const visitContent = latestVisitNotes?.content_json ?? {};
  const summaryContent = latestSummary?.content_json ?? {};
  const confirmedInformation = stringListValue(visitContent.confirmed_information);
  const requirementHypotheses = stringListValue(visitContent.requirement_hypotheses);
  const risksAndQuestions = stringListValue(visitContent.risks_and_questions);
  const summaryUnconfirmedQuestions = stringListValue(summaryContent.unconfirmed_questions);
  const summaryEvidenceIds = stringListValue(summaryContent.evidence_artifact_ids);

  return {
    quote_excerpts: interviewArtifacts
      .map((artifact) => stringValue(artifact.content_json.ai_customer_response))
      .filter(Boolean)
      .slice(-3),
    visit_notes: {
      confirmed_information: confirmedInformation,
      requirement_hypotheses: requirementHypotheses,
      risks_and_questions: risksAndQuestions,
      next_visit_plan: stringValue(visitContent.next_visit_plan),
      customer_visible_summary: stringValue(visitContent.customer_visible_summary),
    },
    summary: {
      problem_statement:
        stringValue(summaryContent.problem_statement) || requirementHypotheses[0] || "",
      target_user: stringValue(summaryContent.target_user),
      business_context: stringValue(summaryContent.business_context) || confirmedInformation[0] || "",
      pain_points: stringListValue(summaryContent.pain_points),
      success_criteria: stringListValue(summaryContent.success_criteria),
      unconfirmed_questions:
        summaryUnconfirmedQuestions.length > 0 ? summaryUnconfirmedQuestions : risksAndQuestions,
      evidence_artifact_ids:
        summaryEvidenceIds.length > 0
          ? summaryEvidenceIds
          : interviewArtifacts.map((artifact) => artifact.id),
    },
  };
}

export function isStageOneVNextSubmitReady(
  draft: StageOneVNextSubmitDraft,
  checks: StageOneVNextGateChecks,
): boolean {
  return (
    Object.values(checks).every(Boolean) &&
    draft.quote_excerpts.length > 0 &&
    draft.visit_notes.confirmed_information.length > 0 &&
    draft.visit_notes.next_visit_plan.trim().length > 0 &&
    draft.visit_notes.customer_visible_summary.trim().length > 0 &&
    draft.summary.problem_statement.trim().length > 0 &&
    draft.summary.target_user.trim().length > 0 &&
    draft.summary.business_context.trim().length > 0 &&
    draft.summary.pain_points.length > 0 &&
    draft.summary.success_criteria.length > 0
  );
}

export function isStageOneFocusedStep(step: StageOneVNextStep): boolean {
  return step === "guide" || step === "lab" || step === "submit";
}

export function isStageOneFocusedMode(mode: StageOneMode): boolean {
  return mode === "guided" || mode === "practice";
}

export function latestArtifactOfType(
  artifacts: StageOneArtifactLike[],
  artifactType: string,
): StageOneArtifactLike | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === artifactType)
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null
  );
}

export function countArtifactsOfType(
  artifacts: StageOneArtifactLike[],
  artifactType: string,
): number {
  return artifacts.filter((artifact) => artifact.artifact_type === artifactType).length;
}

function compareArtifactsByCreatedAt(
  left: StageOneArtifactLike,
  right: StageOneArtifactLike,
): number {
  return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
}

function stringListValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function summarizeResponsibilities(responsibilities: string[]): string {
  return truncateText(responsibilities.slice(0, 2).join("、"), 28);
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
}
