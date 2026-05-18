export type StageFourMode = "home" | "build_test_workbench";

export type StageFourTaskKey =
  | "onboarding"
  | "knowledge_base"
  | "behavior_design"
  | "app_submission"
  | "test_review"
  | "stage_completion";

export type StageFourTaskState = "locked" | "ready" | "active" | "done";

export type StageFourArtifactLike = {
  artifact_type: string;
  content_json: Record<string, unknown>;
  created_at: string;
  id: string;
};

export type StageFourTaskItem = {
  description: string;
  evidenceLabel: string;
  key: StageFourTaskKey;
  label: string;
  meta: string;
  state: StageFourTaskState;
};

export const stageFourImplementationType = "stage_4_dify_implementation";
export const stageFourTestReportType = "stage_4_test_report";
export const stageFourAiReviewType = "stage_4_ai_test_review";

const requiredTestCategories = ["standard", "out_of_scope", "multi_turn"] as const;

export function createStageFourTaskItems(
  artifacts: StageFourArtifactLike[],
  stageStatus: string | undefined,
): StageFourTaskItem[] {
  const locked = stageStatus === "locked";
  const completed = stageStatus === "completed";
  const implementation = latestStageFourArtifactOfType(artifacts, stageFourImplementationType);
  const testReport = latestStageFourArtifactOfType(artifacts, stageFourTestReportType);
  const review = latestStageFourArtifactOfType(artifacts, stageFourAiReviewType);
  const hasImplementation = implementation !== null;
  const hasTestReport = testReport !== null;
  const hasReview = review !== null;

  if (locked) {
    return stageFourTaskOrder().map((key) =>
      task(key, taskLabel(key), taskEvidenceLabel(key), "待解锁", "locked"),
    );
  }

  return [
    task(
      "onboarding",
      "Dify 新手村",
      "概念路径确认",
      hasImplementation ? "路径已确认" : "先确认路径",
      hasImplementation ? "done" : "active",
    ),
    task(
      "knowledge_base",
      "知识库搭建",
      "知识库构建记录",
      hasText(implementation?.content_json.knowledge_base_notes) ? "知识库已记录" : "承接阶段三",
      hasText(implementation?.content_json.knowledge_base_notes) ? "done" : "ready",
    ),
    task(
      "behavior_design",
      "Prompt 与流程",
      "行为设计说明",
      hasBehaviorDesign(implementation) ? "行为逻辑已记录" : "Prompt 与流程",
      hasBehaviorDesign(implementation) ? "done" : "ready",
    ),
    task(
      "app_submission",
      "应用提交",
      "应用链接与限制",
      hasText(implementation?.content_json.dify_app_url) ? "链接已提交" : "待提交链接",
      hasText(implementation?.content_json.dify_app_url) ? "done" : "ready",
    ),
    task(
      "test_review",
      "测试验收",
      "测试报告与反馈",
      hasReview ? "已有反馈" : hasTestReport ? "待生成反馈" : hasImplementation ? "可开始测试" : "先保存构建记录",
      hasReview ? "done" : hasTestReport || hasImplementation ? "ready" : "locked",
    ),
    task(
      "stage_completion",
      "阶段收口",
      "阶段五输入证据",
      completed ? "已完成" : hasReview ? "可完成" : "待反馈",
      completed ? "done" : hasReview ? "ready" : "locked",
    ),
  ];
}

export function isStageFourFocusedMode(mode: StageFourMode): boolean {
  return mode !== "home";
}

export function stageFourHasRequiredTestCoverage(artifacts: StageFourArtifactLike[]): boolean {
  const report = latestStageFourArtifactOfType(artifacts, stageFourTestReportType);
  const cases = report?.content_json.test_cases;
  if (!Array.isArray(cases)) {
    return false;
  }

  const categorySet = new Set(
    cases
      .filter(isRecord)
      .map((item) => normalizeTestCategory(item.test_category, item.scenario))
      .filter(Boolean),
  );
  return requiredTestCategories.every((category) => categorySet.has(category));
}

export function latestStageFourArtifactOfType(
  artifacts: StageFourArtifactLike[],
  artifactType: string,
): StageFourArtifactLike | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === artifactType)
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null
  );
}

function stageFourTaskOrder(): StageFourTaskKey[] {
  return [
    "onboarding",
    "knowledge_base",
    "behavior_design",
    "app_submission",
    "test_review",
    "stage_completion",
  ];
}

function task(
  key: StageFourTaskKey,
  label: string,
  evidenceLabel: string,
  meta: string,
  state: StageFourTaskState,
): StageFourTaskItem {
  return {
    description: taskDescription(key),
    evidenceLabel,
    key,
    label,
    meta,
    state,
  };
}

function taskLabel(key: StageFourTaskKey): string {
  const labels: Record<StageFourTaskKey, string> = {
    app_submission: "应用提交",
    behavior_design: "Prompt 与流程",
    knowledge_base: "知识库搭建",
    onboarding: "Dify 新手村",
    stage_completion: "阶段收口",
    test_review: "测试验收",
  };
  return labels[key];
}

function taskEvidenceLabel(key: StageFourTaskKey): string {
  const labels: Record<StageFourTaskKey, string> = {
    app_submission: "应用链接与限制",
    behavior_design: "行为设计说明",
    knowledge_base: "知识库构建记录",
    onboarding: "概念路径确认",
    stage_completion: "阶段五输入证据",
    test_review: "测试报告与反馈",
  };
  return labels[key];
}

function taskDescription(key: StageFourTaskKey): string {
  const descriptions: Record<StageFourTaskKey, string> = {
    app_submission: "提交可访问应用、应用标识和已知限制，作为阶段五交付基础。",
    behavior_design: "说明 Prompt、工作流、工具和记忆如何约束智能体行为。",
    knowledge_base: "按阶段三决策导入材料，并记录检索、清洗和未覆盖范围。",
    onboarding: "确认 Dify 路径、智能体核心构件和本项目应用类型。",
    stage_completion: "检查构建记录、测试报告和 AI 反馈是否足以进入交付阶段。",
    test_review: "覆盖标准题、范围外题和多轮题，形成测试结论和改进动作。",
  };
  return descriptions[key];
}

function hasBehaviorDesign(artifact: StageFourArtifactLike | null): boolean {
  return (
    hasText(artifact?.content_json.prompt_or_instruction_notes) &&
    hasText(artifact?.content_json.tool_configuration_notes)
  );
}

function normalizeTestCategory(value: unknown, scenario: unknown): string {
  if (value === "standard" || value === "out_of_scope" || value === "multi_turn") {
    return value;
  }
  const scenarioText = typeof scenario === "string" ? scenario : "";
  if (/范围外|拒答|out.?of.?scope/i.test(scenarioText)) {
    return "out_of_scope";
  }
  if (/多轮|追问|上下文|memory|multi/i.test(scenarioText)) {
    return "multi_turn";
  }
  if (/标准|审厂|standard|baseline/i.test(scenarioText)) {
    return "standard";
  }
  return "";
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareArtifactsByCreatedAt(
  left: StageFourArtifactLike,
  right: StageFourArtifactLike,
): number {
  return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
}
