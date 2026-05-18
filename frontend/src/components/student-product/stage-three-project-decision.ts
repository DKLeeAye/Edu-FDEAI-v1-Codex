import type {
  StageThreeKnowledgeDecisionPayload,
  StageThreeKnowledgeStrategy,
} from "@/src/lib/api";

import {
  createLayerObservationSnapshot,
  type LayerObservation,
} from "./stage-three-rag-lab.ts";

export type StageThreeProjectArtifactLike = {
  artifact_type: string;
  content_json: Record<string, unknown>;
  created_at: string;
  id: string;
};

export type ProjectDecisionDraft = {
  chunkingDecision: string;
  dataQualityRisks: string;
  embeddingStorageDecision: string;
  evaluationPlan: string;
  knowledgeGoal: string;
  maintenancePlan: string;
  requiredKnowledgeTypes: string;
  retrievalDecision: string;
  selectedStrategy: StageThreeKnowledgeStrategy;
  sourceInventory: string;
  stage4BuildPlan: string;
  strategyRationale: string;
};

export type ProjectDecisionReadiness = {
  description: string;
  ready: boolean;
  title: string;
};

export type StageThreeLabDecisionInsight = LayerObservation & {
  decisionHint: string;
};

export const emptyProjectDecisionDraft: ProjectDecisionDraft = {
  chunkingDecision: "",
  dataQualityRisks: "",
  embeddingStorageDecision: "",
  evaluationPlan: "",
  knowledgeGoal: "",
  maintenancePlan: "",
  requiredKnowledgeTypes: "",
  retrievalDecision: "",
  selectedStrategy: "rag",
  sourceInventory: "",
  stage4BuildPlan: "",
  strategyRationale: "",
};

export function createProjectDecisionDraft({
  decisionArtifact,
  feasibilityArtifact,
  labRecordArtifact,
  stageTwoSolutionArtifact,
}: {
  decisionArtifact: StageThreeProjectArtifactLike | null;
  feasibilityArtifact: StageThreeProjectArtifactLike | null;
  labRecordArtifact: StageThreeProjectArtifactLike | null;
  stageTwoSolutionArtifact: StageThreeProjectArtifactLike | null;
}): ProjectDecisionDraft {
  if (decisionArtifact) {
    return draftFromDecisionArtifact(decisionArtifact);
  }

  const draft = draftFromStageTwoSolution(stageTwoSolutionArtifact, feasibilityArtifact);
  const insights = createStageThreeLabDecisionInsights(labRecordArtifact);

  return {
    ...draft,
    chunkingDecision: draft.chunkingDecision || insightHint(insights, "分块策略"),
    embeddingStorageDecision: draft.embeddingStorageDecision || insightHint(insights, "向量化与存储"),
    evaluationPlan: draft.evaluationPlan || insightHint(insights, "效果评估"),
    retrievalDecision: draft.retrievalDecision || insightHint(insights, "召回策略"),
  };
}

export function createProjectDecisionPayload(
  draft: ProjectDecisionDraft,
): StageThreeKnowledgeDecisionPayload {
  return {
    data_quality_risks: lines(draft.dataQualityRisks),
    evaluation_plan: draft.evaluationPlan.trim(),
    knowledge_goal: draft.knowledgeGoal.trim(),
    maintenance_plan: draft.maintenancePlan.trim(),
    required_knowledge_types: lines(draft.requiredKnowledgeTypes),
    selected_strategy: draft.selectedStrategy,
    source_inventory: lines(draft.sourceInventory),
    stage_4_build_plan: draft.stage4BuildPlan.trim(),
    strategy_rationale: buildStrategyRationale(draft),
  };
}

export function createProjectDecisionReadiness(
  draft: ProjectDecisionDraft,
): ProjectDecisionReadiness[] {
  return [
    {
      description: "目标、来源和风险",
      ready:
        hasText(draft.knowledgeGoal) &&
        lines(draft.requiredKnowledgeTypes).length > 0 &&
        lines(draft.sourceInventory).length > 0 &&
        lines(draft.dataQualityRisks).length > 0,
      title: "数据准备",
    },
    {
      description: "切分方式与依据",
      ready: hasText(draft.chunkingDecision),
      title: "分块策略",
    },
    {
      description: "语义表示与存储",
      ready: hasText(draft.embeddingStorageDecision),
      title: "向量化与存储",
    },
    {
      description: "检索、重排和 Top-K",
      ready: hasText(draft.retrievalDecision) && hasText(draft.strategyRationale),
      title: "召回策略",
    },
    {
      description: "评估、维护和构建建议",
      ready:
        hasText(draft.evaluationPlan) &&
        hasText(draft.maintenancePlan) &&
        hasText(draft.stage4BuildPlan),
      title: "效果评估",
    },
  ];
}

export function createStageThreeLabDecisionInsights(
  labRecordArtifact: StageThreeProjectArtifactLike | null,
): StageThreeLabDecisionInsight[] {
  const observations = observationsFromLabRecord(labRecordArtifact);
  return observations.map((observation) => ({
    ...observation,
    decisionHint: defaultDecisionHint(observation.layer, observation.observation),
  }));
}

export function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function arrayOrString(value: unknown): string[] {
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

export function stringValue(value: unknown): string {
  return typeof value === "string" ? sanitizeProductText(value) : "";
}

export function normalizeStrategy(value: unknown): StageThreeKnowledgeStrategy {
  if (
    value === "prompt_only" ||
    value === "rag" ||
    value === "tool_calling" ||
    value === "hybrid"
  ) {
    return value;
  }
  return "rag";
}

export function draftFromDecisionArtifact(
  artifact: StageThreeProjectArtifactLike,
): ProjectDecisionDraft {
  const content = artifact.content_json;
  const strategyRationale = stringValue(content.strategy_rationale);
  const parsedChunkingDecision = sectionValue(strategyRationale, "分块策略");
  const parsedEmbeddingDecision = sectionValue(strategyRationale, "向量化与存储");
  const parsedRetrievalDecision = sectionValue(strategyRationale, "召回策略");
  const parsedRationale = sectionValue(strategyRationale, "策略选择依据");

  return {
    chunkingDecision: parsedChunkingDecision || strategyRationale,
    dataQualityRisks: arrayOrString(content.data_quality_risks).join("\n"),
    embeddingStorageDecision: parsedEmbeddingDecision,
    evaluationPlan: stringValue(content.evaluation_plan),
    knowledgeGoal: stringValue(content.knowledge_goal),
    maintenancePlan: stringValue(content.maintenance_plan),
    requiredKnowledgeTypes: arrayOrString(content.required_knowledge_types).join("\n"),
    retrievalDecision: parsedRetrievalDecision,
    selectedStrategy: normalizeStrategy(content.selected_strategy),
    sourceInventory: arrayOrString(content.source_inventory).join("\n"),
    stage4BuildPlan: stringValue(content.stage_4_build_plan),
    strategyRationale: parsedRationale || strategyRationale,
  };
}

export function buildStrategyRationale(draft: ProjectDecisionDraft): string {
  return [
    section("分块策略", draft.chunkingDecision),
    section("向量化与存储", draft.embeddingStorageDecision),
    section("召回策略", draft.retrievalDecision),
    section("策略选择依据", draft.strategyRationale),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function draftFromStageTwoSolution(
  artifact: StageThreeProjectArtifactLike | null,
  feasibilityArtifact: StageThreeProjectArtifactLike | null,
): ProjectDecisionDraft {
  if (!artifact && !feasibilityArtifact) {
    return emptyProjectDecisionDraft;
  }
  const content = artifact?.content_json ?? {};
  const feasibility = feasibilityArtifact?.content_json ?? {};
  const dataSources =
    arrayOrString(feasibility.data_sources).length > 0
      ? arrayOrString(feasibility.data_sources)
      : arrayOrString(content.data_sources);
  const risks = [
    ...arrayOrString(feasibility.data_gaps),
    ...arrayOrString(feasibility.technical_risks),
    ...arrayOrString(content.technical_risks),
    ...arrayOrString(content.feasibility_risks),
  ];
  const capability =
    stringValue(content.stage_three_starting_point) ||
    stringValue(content.proposed_agent_capability) ||
    stringValue(feasibility.ai_capable_scope);

  return {
    ...emptyProjectDecisionDraft,
    dataQualityRisks: risks.join("\n"),
    knowledgeGoal:
      capability ||
      stringValue(content.problem_summary) ||
      "支撑当前智能体完成业务问答、追溯和材料生成。",
    maintenancePlan:
      dataSources.length > 0
        ? `按课程演示节奏复查 ${dataSources[0]} 等材料版本，记录数据更新和清洗责任。`
        : "",
    requiredKnowledgeTypes: dataSources.join("\n"),
    selectedStrategy: knowledgeBaseStrategyToStageThreeStrategy(
      stringValue(content.knowledge_base_strategy),
    ),
    sourceInventory: dataSources.join("\n"),
    stage4BuildPlan:
      stringValue(content.stage_four_build_plan) ||
      (dataSources.length > 0
        ? "在阶段四中按本决策整理材料、配置知识库、验证召回效果，并记录偏离原因。"
        : ""),
    strategyRationale: stringValue(content.knowledge_base_rationale),
  };
}

function observationsFromLabRecord(
  labRecordArtifact: StageThreeProjectArtifactLike | null,
): LayerObservation[] {
  const saved = labRecordArtifact?.content_json.observations ?? labRecordArtifact?.content_json.layer_observations;
  if (Array.isArray(saved) && saved.length > 0) {
    return saved.flatMap((item) => {
      if (!isLayerObservationLike(item)) {
        return [];
      }
      return [
        {
          knowledgePoint: stringValue(item.knowledgePoint),
          layer: item.layer,
          observation: stringValue(item.observation),
        },
      ];
    });
  }

  return createLayerObservationSnapshot({
    chunkCount: 9,
    hitRate: 0.82,
    topResultTitle: "外观缺陷判定标准",
  });
}

function isLayerObservationLike(value: unknown): value is LayerObservation {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as Partial<LayerObservation>;
  return (
    item.layer === "数据准备" ||
    item.layer === "分块策略" ||
    item.layer === "向量化与存储" ||
    item.layer === "召回策略" ||
    item.layer === "效果评估"
  );
}

function defaultDecisionHint(layer: LayerObservation["layer"], observation: string): string {
  const hints: Record<LayerObservation["layer"], string> = {
    分块策略: `优先采用结构化章节切分，并在阶段四验证块大小、标题层级和父子块上下文。实验观察：${observation}`,
    召回策略: `优先配置混合召回，保留关键词命中和向量语义召回，并根据问题集调节 Top-K 与权重。实验观察：${observation}`,
    向量化与存储: `当前材料以中文制造业质检语料为主，向量化方案应关注中文语义相近问题、材料版本和权限边界。实验观察：${observation}`,
    数据准备: `先盘点材料来源、字段完整性、版本一致性和业务元数据，避免把脏数据直接导入知识库。实验观察：${observation}`,
    效果评估: `阶段四应使用标准问题集复测 Hit Rate，并记录召回不到、召回错了、答案质量差三类问题。实验观察：${observation}`,
  };
  return hints[layer];
}

function insightHint(insights: StageThreeLabDecisionInsight[], layer: LayerObservation["layer"]): string {
  return insights.find((insight) => insight.layer === layer)?.decisionHint ?? "";
}

function knowledgeBaseStrategyToStageThreeStrategy(value: string): StageThreeKnowledgeStrategy {
  if (value === "none") {
    return "prompt_only";
  }
  if (value === "structured") {
    return "tool_calling";
  }
  if (value === "hybrid") {
    return "hybrid";
  }
  return "rag";
}

function section(title: string, value: string): string {
  return value.trim() ? `【${title}】\n${value.trim()}` : "";
}

function sectionValue(value: string, title: string): string {
  const pattern = new RegExp(`【${title}】\\n([\\s\\S]*?)(?=\\n\\n【|$)`);
  return pattern.exec(value)?.[1]?.trim() ?? "";
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function sanitizeProductText(value: string): string {
  return value.replace(/\bstage_([1-5])\b/gi, "阶段$1").trim();
}
