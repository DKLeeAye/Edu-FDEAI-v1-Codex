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
