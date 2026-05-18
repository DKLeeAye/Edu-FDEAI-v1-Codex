export type StageThreeMode =
  | "home"
  | "case_teaching"
  | "knowledge_lab"
  | "project_decision"
  | "decision_document";

export type StageThreeArtifactLike = {
  artifact_type: string;
  content_json: Record<string, unknown>;
  created_at: string;
  id: string;
};

export type StageThreeEntryState = "locked" | "ready" | "active" | "done";

export type StageThreeEntryItem = {
  description: string;
  evidenceLabel: string;
  key: Exclude<StageThreeMode, "home">;
  label: string;
  meta: string;
  state: StageThreeEntryState;
};

const stageThreeCaseRecordType = "stage_3_case_study_record";
const stageThreeLabRecordType = "stage_3_lab_experiment_record";
const stageThreeDecisionType = "stage_3_knowledge_decision";
const stageThreeReviewType = "stage_3_ai_review";

export function createStageThreeEntryItems(
  artifacts: StageThreeArtifactLike[],
  stageStatus: string | undefined,
): StageThreeEntryItem[] {
  const locked = stageStatus === "locked";
  const completed = stageStatus === "completed";
  const hasCaseRecord = latestArtifactOfType(artifacts, stageThreeCaseRecordType) !== null;
  const hasLabRecord = latestArtifactOfType(artifacts, stageThreeLabRecordType) !== null;
  const hasDecision = latestArtifactOfType(artifacts, stageThreeDecisionType) !== null;
  const hasReview = latestArtifactOfType(artifacts, stageThreeReviewType) !== null;

  if (locked) {
    return [
      entry("case_teaching", "预置案例教学", "待解锁", "先完成阶段二", "locked"),
      entry("knowledge_lab", "五层知识实验室", "待解锁", "先完成阶段二", "locked"),
      entry("project_decision", "项目知识工程决策", "待解锁", "先完成阶段二", "locked"),
      entry("decision_document", "风险预判与决策文档", "待解锁", "先完成阶段二", "locked"),
    ];
  }

  return [
    entry(
      "case_teaching",
      "预置案例教学",
      "案例理解记录",
      hasCaseRecord ? "已完成" : "建议先完成",
      hasCaseRecord ? "done" : "ready",
    ),
    entry(
      "knowledge_lab",
      "五层知识实验室",
      "实验观察记录",
      hasLabRecord ? "已完成" : "五层实验",
      hasLabRecord ? "done" : "ready",
    ),
    entry(
      "project_decision",
      "项目知识工程决策",
      "知识工程决策",
      hasDecision ? "已保存" : "待决策",
      hasDecision ? "done" : "ready",
    ),
    entry(
      "decision_document",
      "风险预判与决策文档",
      "评审与阶段完成",
      completed ? "已完成" : hasReview ? "已评审" : hasDecision ? "可评审" : "先保存决策",
      completed || hasReview ? "done" : hasDecision ? "ready" : "locked",
    ),
  ];
}

export function isStageThreeFocusedMode(mode: StageThreeMode): boolean {
  return mode !== "home";
}

export function latestStageThreeArtifactOfType(
  artifacts: StageThreeArtifactLike[],
  artifactType: string,
): StageThreeArtifactLike | null {
  return latestArtifactOfType(artifacts, artifactType);
}

function entry(
  key: StageThreeEntryItem["key"],
  label: string,
  evidenceLabel: string,
  meta: string,
  state: StageThreeEntryState,
): StageThreeEntryItem {
  return {
    key,
    label,
    evidenceLabel,
    meta,
    state,
    description: entryDescription(key),
  };
}

function entryDescription(key: StageThreeEntryItem["key"]): string {
  const descriptions: Record<StageThreeEntryItem["key"], string> = {
    case_teaching: "通过制造业质检案例识别坏数据、坏分块和坏召回的典型后果。",
    decision_document: "汇总风险预判、阶段四执行建议和 AI 评审，形成阶段收口材料。",
    knowledge_lab: "在数据准备、分块、向量化、召回和评估五层中完成可视化实验。",
    project_decision: "把实验结论迁移到当前项目，选择知识来源、策略参数和维护方式。",
  };
  return descriptions[key];
}

function latestArtifactOfType(
  artifacts: StageThreeArtifactLike[],
  artifactType: string,
): StageThreeArtifactLike | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === artifactType)
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null
  );
}

function compareArtifactsByCreatedAt(
  left: StageThreeArtifactLike,
  right: StageThreeArtifactLike,
): number {
  return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
}
