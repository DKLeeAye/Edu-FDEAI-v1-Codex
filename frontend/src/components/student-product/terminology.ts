import type { Artifact, ExperimentSession, LearningProfile, StageRecord } from "@/src/lib/api";

export type StageKey = "stage_1" | "stage_2" | "stage_3" | "stage_4" | "stage_5";

export type Tone = "default" | "info" | "success" | "warning" | "danger" | "muted";

export type StageDefinition = {
  key: StageKey;
  order: number;
  shortTitle: string;
  title: string;
  summary: string;
  output: string;
  modules: Array<{
    title: string;
    description: string;
  }>;
  nextAction: string;
};

export const stageKeys: StageKey[] = ["stage_1", "stage_2", "stage_3", "stage_4", "stage_5"];

export const stageDefinitions: StageDefinition[] = [
  {
    key: "stage_1",
    order: 1,
    shortTitle: "需求访谈",
    title: "需求访谈与问题发现",
    summary: "从客户语境中识别真实痛点、隐藏约束、数据基础和成功标准。",
    output: "访谈记录、问题发现总结、需求假设与未确认问题清单",
    modules: [
      { title: "教学引导模式", description: "按破冰、现状、痛点、约束、数据、总结六个关卡训练访谈能力。" },
      { title: "项目实战拜访", description: "围绕制造业质检客户完成多轮拜访，沉淀关键对话证据。" },
      { title: "问题发现总结", description: "把访谈线索整理为可进入方案定义的业务问题。" },
    ],
    nextAction: "完成问题发现总结后进入方案定义。",
  },
  {
    key: "stage_2",
    order: 2,
    shortTitle: "方案定义",
    title: "方案定义与可行性判断",
    summary: "把客户访谈信息转化为可交付方案边界，并判断数据、技术和价值可行性。",
    output: "需求文档、可行性报告、总体技术方案与评审记录",
    modules: [
      { title: "需求文档", description: "用业务语言澄清客户真正要解决的问题。" },
      { title: "可行性报告", description: "判断数据条件、技术边界、风险和预期价值。" },
      { title: "总体技术方案", description: "明确智能体能力、工作流、依赖系统和验收标准。" },
    ],
    nextAction: "通过方案评审后进入知识工程决策。",
  },
  {
    key: "stage_3",
    order: 3,
    shortTitle: "知识工程",
    title: "知识工程决策",
    summary: "判断智能体需要哪些知识来源、如何组织知识，以及阶段四如何执行。",
    output: "知识工程决策文档、数据质量风险、召回策略和阶段四执行建议",
    modules: [
      { title: "数据准备", description: "识别格式、内容、结构和完整性风险。" },
      { title: "分块与召回策略", description: "对比不同组织方式，形成适合当前项目的知识策略。" },
      { title: "决策文档", description: "记录知识目标、来源清单、策略选择、风险和构建计划。" },
    ],
    nextAction: "补齐风险预判后进入智能体实现与测试。",
  },
  {
    key: "stage_4",
    order: 4,
    shortTitle: "实现测试",
    title: "智能体实现与测试",
    summary: "根据方案和知识工程决策，在 Dify 路径中构建可运行智能体并完成测试。",
    output: "智能体应用、设计说明、测试报告和已知问题清单",
    modules: [
      { title: "Dify 新手村", description: "掌握知识库、工作流、Prompt 和工具配置的基础操作。" },
      { title: "正式构建任务", description: "按前序决策搭建智能体，记录关键配置和能力边界。" },
      { title: "测试验收", description: "覆盖标准问题、范围外问题和多轮问题，形成测试结果。" },
    ],
    nextAction: "测试反馈通过后进入交付验收与运维说明。",
  },
  {
    key: "stage_5",
    order: 5,
    shortTitle: "交付验收",
    title: "交付验收与运维说明",
    summary: "把可运行智能体转化为客户可接收、可使用、可维护的交付成果。",
    output: "交付说明书、验收记录、运维说明和最终项目档案袋",
    modules: [
      { title: "交付说明书", description: "说明应用入口、核心功能、使用步骤和能力边界。" },
      { title: "验收记录", description: "对齐阶段二验收标准和阶段四测试证据。" },
      { title: "限制与维护说明", description: "披露已知问题、知识库更新流程和外部工具依赖。" },
    ],
    nextAction: "完成最终交付包后生成项目档案袋和学习画像。",
  },
];

export function isStageKey(value: string): value is StageKey {
  return stageKeys.includes(value as StageKey);
}

export function getStageDefinition(stageKey: string): StageDefinition {
  return stageDefinitions.find((stage) => stage.key === stageKey) ?? stageDefinitions[0];
}

export function stageStatusCopy(status: string | undefined): { label: string; tone: Tone } {
  const statusMap: Record<string, { label: string; tone: Tone }> = {
    locked: { label: "未解锁", tone: "muted" },
    not_started: { label: "待开始", tone: "default" },
    in_learning: { label: "学习中", tone: "info" },
    in_practice: { label: "进行中", tone: "warning" },
    submitted: { label: "待评审", tone: "info" },
    revision_required: { label: "需修改", tone: "danger" },
    warning_confirmed: { label: "附条件通过", tone: "warning" },
    completed: { label: "已完成", tone: "success" },
    skipped: { label: "已跳过", tone: "muted" },
  };
  return status ? (statusMap[status] ?? { label: "未就绪", tone: "muted" }) : { label: "未就绪", tone: "muted" };
}

export function projectStatusCopy(status: string | undefined): { label: string; tone: Tone } {
  const statusMap: Record<string, { label: string; tone: Tone }> = {
    not_started: { label: "待开始", tone: "default" },
    in_progress: { label: "进行中", tone: "warning" },
    completed: { label: "已完成", tone: "success" },
    archived: { label: "已归档", tone: "muted" },
  };
  return status ? (statusMap[status] ?? { label: "未就绪", tone: "muted" }) : { label: "未创建", tone: "muted" };
}

export function roleCopy(role: string | undefined): string {
  const roleMap: Record<string, string> = {
    student: "学生",
    teacher: "教师",
    admin: "管理员",
  };
  return role ? (roleMap[role] ?? "用户") : "访客";
}

export function artifactTypeCopy(type: string): string {
  const typeMap: Record<string, string> = {
    stage_1_interview_turn: "客户访谈记录",
    stage_1_problem_summary: "问题发现总结",
    stage_2_solution_definition: "方案定义",
    stage_2_ai_review: "可行性评审",
    stage_3_knowledge_decision: "知识工程决策",
    stage_3_ai_review: "知识工程评审",
    stage_4_dify_implementation: "智能体构建记录",
    stage_4_test_report: "测试报告",
    stage_4_ai_test_review: "测试反馈",
    stage_5_delivery_document: "交付说明书",
    stage_5_acceptance_package: "验收材料",
    stage_5_operations_guide: "运维说明",
    stage_5_ai_delivery_review: "交付审阅",
  };
  return typeMap[type] ?? "阶段产物";
}

export function artifactDescription(artifact: Artifact): string {
  const content = artifact.content_json;
  const candidatesByType: Record<string, string[]> = {
    stage_1_interview_turn: [
      stringValue(content.user_message),
      stringValue(content.ai_customer_response),
    ],
    stage_1_problem_summary: [stringValue(content.problem_statement), stringValue(content.target_user)],
    stage_2_solution_definition: [
      stringValue(content.solution_title),
      stringValue(content.problem_summary),
    ],
    stage_2_ai_review: [
      feasibilityJudgementCopy(stringValue(content.feasibility_judgement)),
      "可行性评审已生成",
    ],
    stage_3_knowledge_decision: [
      stringValue(content.knowledge_goal),
      strategyCopy(stringValue(content.selected_strategy)),
    ],
    stage_3_ai_review: [
      strategyFitCopy(stringValue(content.strategy_fit)),
      stageFourReadinessCopy(stringValue(content.stage_4_readiness)),
    ],
    stage_4_dify_implementation: [
      stringValue(content.dify_app_name),
      appModeCopy(stringValue(content.app_mode)),
      stringValue(content.dify_app_url),
    ],
    stage_4_test_report: [
      stringValue(content.test_goal),
      resultCopy(stringValue(content.overall_result)),
    ],
    stage_4_ai_test_review: [
      releaseReadinessCopy(stringValue(content.release_readiness)),
      "测试反馈已生成",
    ],
    stage_5_delivery_document: [
      stringValue(content.project_name),
      stringValue(content.delivery_summary),
    ],
    stage_5_acceptance_package: [
      stringValue(content.acceptance_scope),
      stringValue(content.test_evidence_summary),
    ],
    stage_5_operations_guide: [
      stringValue(content.data_update_plan),
      stringValue(content.monitoring_plan),
    ],
    stage_5_ai_delivery_review: [
      finalReadinessCopy(stringValue(content.final_readiness)),
      "交付审阅已生成",
    ],
  };
  return (
    candidatesByType[artifact.artifact_type]
      ?.filter(Boolean)
      .slice(0, 2)
      .join(" / ") || "已保存项目证据"
  );
}

export function sanitizeProductText(value: string): string {
  let normalized = value.replace(/^Fake\s+[a-z0-9_]+\s+response:\s*/i, "").trim();
  const replacements: Array<[RegExp, string]> = [
    [/\bneeds_revision_before_stage_5\b/g, "需要修改后再进入交付准备"],
    [/\bready_with_disclosed_risks\b/g, "已披露风险，可提交复核"],
    [/\bready_for_teacher_review\b/g, "可提交教师复核"],
    [/\bready_with_data_quality_risks\b/g, "可进入阶段四，但需持续处理数据质量风险"],
    [/\bready_for_stage_5\b/g, "可进入交付准备"],
    [/\bready_for_stage_4_build\b/g, "可进入阶段四构建"],
    [/\bneeds_revision_review\b/g, "需要补充后通过"],
    [/\bneeds_revision\b/g, "需要修改"],
    [/\bconditional_pass\b/g, "附条件通过"],
    [/\bapproved\b/g, "通过"],
    [/\brejected\b/g, "阻塞修改"],
    [/\bpassed\b/g, "通过"],
    [/\bfailed\b/g, "未通过"],
    [/\bpartial\b/g, "部分通过"],
    [/\bchatflow\b/g, "对话流"],
    [/\bworkflow\b/g, "工作流"],
    [/\bstage_1\b/g, "阶段一"],
    [/\bstage_2\b/g, "阶段二"],
    [/\bstage_3\b/g, "阶段三"],
    [/\bstage_4\b/g, "阶段四"],
    [/\bstage_5\b/g, "阶段五"],
    [/\bArtifact\b/g, "项目证据"],
    [/\bAI Log\b/gi, "AI 调用记录"],
    [/\bJSON\b/g, "结构化内容"],
    [/\bfake provider\b/gi, "演示反馈源"],
    [/\bFake\b/g, "演示反馈"],
  ];
  for (const [pattern, replacement] of replacements) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "时间未记录";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function sortStageRecords(records: StageRecord[]): StageRecord[] {
  return records.slice().sort((left, right) => left.stage_order - right.stage_order);
}

export function pickActiveStageKey(session: ExperimentSession | null): StageKey {
  if (!session) {
    return "stage_1";
  }
  const sortedRecords = sortStageRecords(session.stage_records);
  if (session.status === "completed") {
    return "stage_5";
  }
  const activeRecord =
    sortedRecords.find((record) =>
      ["in_practice", "in_learning", "submitted", "revision_required", "warning_confirmed"].includes(
        record.status,
      ),
    ) ??
    sortedRecords.find((record) => record.status === "not_started") ??
    sortedRecords
      .slice()
      .reverse()
      .find((record) => record.status !== "locked") ??
    sortedRecords[0];
  return activeRecord && isStageKey(activeRecord.stage_key) ? activeRecord.stage_key : "stage_1";
}

export function completionStats(session: ExperimentSession | null): {
  completed: number;
  total: number;
  percent: number;
} {
  const total = stageDefinitions.length;
  const completed =
    session?.stage_records.filter((record) => record.status === "completed").length ?? 0;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}

export function evidenceCountByStage(artifacts: Artifact[], stageKey: StageKey): number {
  return artifacts.filter((artifact) => artifact.stage_key === stageKey).length;
}

export function profilePercent(profile: LearningProfile | null): number {
  return profile ? Math.round(profile.completion_ratio * 100) : 0;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? sanitizeProductText(value) : "";
}

function strategyCopy(value: string): string {
  const map: Record<string, string> = {
    prompt_only: "仅提示词策略",
    rag: "基于知识库的问答",
    tool_calling: "工具调用策略",
    hybrid: "混合策略",
  };
  return map[value] ?? value;
}

function feasibilityJudgementCopy(value: string): string {
  const map: Record<string, string> = {
    approved: "通过",
    conditional_pass: "附条件通过",
    needs_revision_review: "需要补充后通过",
    rejected: "阻塞修改",
  };
  return map[value] ?? value;
}

function appModeCopy(value: string): string {
  const map: Record<string, string> = {
    chatflow: "对话流",
    workflow: "工作流",
    agent: "智能体模式",
  };
  return map[value] ?? value;
}

function resultCopy(value: string): string {
  const map: Record<string, string> = {
    passed: "通过",
    needs_revision: "需要修改",
  };
  return map[value] ?? value;
}

function releaseReadinessCopy(value: string): string {
  const map: Record<string, string> = {
    needs_revision_before_stage_5: "需要修改后再进入交付准备",
    ready_for_stage_5: "可进入交付准备",
  };
  return map[value] ?? value;
}

function finalReadinessCopy(value: string): string {
  const map: Record<string, string> = {
    ready_for_teacher_review: "可提交教师复核",
    ready_with_disclosed_risks: "已披露风险，可提交复核",
  };
  return map[value] ?? value;
}

function strategyFitCopy(value: string): string {
  if (value.endsWith("_strategy_needs_stage_four_validation")) {
    return "策略方向可用，需在阶段四验证实际效果";
  }
  return value;
}

function stageFourReadinessCopy(value: string): string {
  const map: Record<string, string> = {
    ready_for_stage_4_build: "可进入阶段四构建",
    ready_with_data_quality_risks: "可进入阶段四，但需持续处理数据质量风险",
  };
  return map[value] ?? value;
}
