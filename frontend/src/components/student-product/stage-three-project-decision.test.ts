import assert from "node:assert/strict";
import test from "node:test";

import {
  createProjectDecisionDraft,
  createProjectDecisionPayload,
  createProjectDecisionReadiness,
  createStageThreeLabDecisionInsights,
  type StageThreeProjectArtifactLike,
} from "./stage-three-project-decision.ts";

const baseArtifact = {
  artifact_type: "stage_2_technical_solution",
  content_json: {},
  created_at: "2026-05-19T08:00:00.000Z",
  id: "artifact-1",
} satisfies StageThreeProjectArtifactLike;

test("project decision draft combines stage two handoff with lab decision insights", () => {
  const solution = {
    ...baseArtifact,
    content_json: {
      data_sources: ["质检 SOP", "AOI 设备维护记录"],
      knowledge_base_rationale: "质检问题需要引用制度材料并追溯记录。",
      knowledge_base_strategy: "hybrid",
      proposed_agent_capability: "支持质检员查询缺陷判定、AOI 复判和漏检追溯。",
      stage_four_build_plan: "在 Dify 中配置知识库、混合检索和测试问题集。",
      technical_risks: ["SOP 版本不一致"],
    },
  } satisfies StageThreeProjectArtifactLike;

  const draft = createProjectDecisionDraft({
    decisionArtifact: null,
    feasibilityArtifact: null,
    labRecordArtifact: null,
    stageTwoSolutionArtifact: solution,
  });

  assert.equal(draft.selectedStrategy, "hybrid");
  assert.equal(draft.knowledgeGoal, "支持质检员查询缺陷判定、AOI 复判和漏检追溯。");
  assert.match(draft.chunkingDecision, /结构化章节/);
  assert.match(draft.embeddingStorageDecision, /中文制造业质检/);
  assert.match(draft.retrievalDecision, /混合召回/);
  assert.match(draft.evaluationPlan, /Hit Rate/);
  assert.match(draft.sourceInventory, /质检 SOP/);
  assert.match(draft.dataQualityRisks, /SOP 版本不一致/);
});

test("saved decision artifact remains the source of truth for project decision draft", () => {
  const decision = {
    ...baseArtifact,
    artifact_type: "stage_3_knowledge_decision",
    content_json: {
      data_quality_risks: ["批次号缺失"],
      evaluation_plan: "用十个标准问题复测。",
      knowledge_goal: "回答质检追溯问题。",
      maintenance_plan: "每周复查一次材料。",
      required_knowledge_types: ["SOP"],
      selected_strategy: "rag",
      source_inventory: ["质检 SOP v3"],
      stage_4_build_plan: "导入 Dify 知识库并记录偏差。",
      strategy_rationale:
        "【分块策略】\n按章节切分。\n\n【向量化与存储】\n使用中文向量模型。\n\n【召回策略】\n混合召回。\n\n【策略选择依据】\n材料稳定且需要引用原文。",
    },
  } satisfies StageThreeProjectArtifactLike;

  const draft = createProjectDecisionDraft({
    decisionArtifact: decision,
    feasibilityArtifact: null,
    labRecordArtifact: null,
    stageTwoSolutionArtifact: null,
  });

  assert.equal(draft.knowledgeGoal, "回答质检追溯问题。");
  assert.equal(draft.chunkingDecision, "按章节切分。");
  assert.equal(draft.embeddingStorageDecision, "使用中文向量模型。");
  assert.equal(draft.retrievalDecision, "混合召回。");
  assert.equal(draft.strategyRationale, "材料稳定且需要引用原文。");
});

test("project decision readiness requires all five knowledge layers", () => {
  const incomplete = createProjectDecisionDraft({
    decisionArtifact: null,
    feasibilityArtifact: null,
    labRecordArtifact: null,
    stageTwoSolutionArtifact: null,
  });
  const complete = {
    ...incomplete,
    chunkingDecision: "按章节切分。",
    dataQualityRisks: "SOP 版本不一致",
    embeddingStorageDecision: "使用中文向量模型。",
    evaluationPlan: "用标准问题集复测 Hit Rate。",
    knowledgeGoal: "回答质检问题。",
    maintenancePlan: "每周维护。",
    requiredKnowledgeTypes: "SOP",
    retrievalDecision: "混合召回。",
    sourceInventory: "质检 SOP",
    stage4BuildPlan: "导入 Dify。",
    strategyRationale: "需要引用材料。",
  };

  assert.equal(createProjectDecisionReadiness(incomplete).every((item) => item.ready), false);
  assert.equal(createProjectDecisionReadiness(complete).every((item) => item.ready), true);
});

test("project decision payload preserves structured strategy rationale sections", () => {
  const draft = createProjectDecisionDraft({
    decisionArtifact: null,
    feasibilityArtifact: null,
    labRecordArtifact: null,
    stageTwoSolutionArtifact: {
      ...baseArtifact,
      content_json: {
        data_sources: ["质检 SOP"],
        proposed_agent_capability: "回答质检问题。",
      },
    },
  });

  const payload = createProjectDecisionPayload({
    ...draft,
    dataQualityRisks: "字段缺失\n版本过期",
    requiredKnowledgeTypes: "SOP\n缺陷标准",
    sourceInventory: "质检 SOP",
  });

  assert.deepEqual(payload.data_quality_risks, ["字段缺失", "版本过期"]);
  assert.deepEqual(payload.required_knowledge_types, ["SOP", "缺陷标准"]);
  assert.match(payload.strategy_rationale, /【分块策略】/);
  assert.match(payload.strategy_rationale, /【向量化与存储】/);
  assert.match(payload.strategy_rationale, /【召回策略】/);
});

test("lab decision insights expose five migration hints for the project page", () => {
  const insights = createStageThreeLabDecisionInsights(null);

  assert.deepEqual(
    insights.map((insight) => insight.layer),
    ["数据准备", "分块策略", "向量化与存储", "召回策略", "效果评估"],
  );
  assert.equal(insights.every((insight) => insight.decisionHint.length > 0), true);
});
