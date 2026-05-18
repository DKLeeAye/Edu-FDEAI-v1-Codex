import assert from "node:assert/strict";
import test from "node:test";

import {
  createDecisionDocumentPreview,
  createRiskForecastItems,
  createStageThreeSubmissionGate,
  type StageThreeRiskArtifactLike,
} from "./stage-three-risk-document.ts";

const baseArtifact = {
  artifact_type: "stage_3_knowledge_decision",
  content_json: {},
  created_at: "2026-05-19T08:00:00.000Z",
  id: "artifact-1",
} satisfies StageThreeRiskArtifactLike;

const completeReadiness = [
  { description: "目标、来源和风险", ready: true, title: "数据准备" },
  { description: "切分方式与依据", ready: true, title: "分块策略" },
  { description: "语义表示与存储", ready: true, title: "向量化与存储" },
  { description: "检索、重排和 Top-K", ready: true, title: "召回策略" },
  { description: "评估、维护和构建建议", ready: true, title: "效果评估" },
];

test("risk forecast combines decision risks with review warnings and mitigation", () => {
  const decision = {
    ...baseArtifact,
    content_json: {
      data_quality_risks: ["SOP 版本不一致", "AOI 记录字段缺失"],
      evaluation_plan: "用标准问题集复测 Hit Rate，并记录召回不到、召回错了、答案质量差三类问题。",
      stage_4_build_plan: "在 Dify 中导入 SOP，配置混合召回，并保留失败问题复测记录。",
      strategy_rationale:
        "【分块策略】\n按章节切分并保留重叠。\n\n【召回策略】\n混合召回并启用重排序。",
    },
  } satisfies StageThreeRiskArtifactLike;
  const review = {
    ...baseArtifact,
    artifact_type: "stage_3_ai_review",
    content_json: {
      data_quality_warnings: ["SOP 版本需要建立维护责任人"],
      missing_knowledge_risks: ["缺少 AOI 误报样例"],
      suggested_improvements: ["补充异常样本并标注来源"],
    },
    id: "review-1",
  } satisfies StageThreeRiskArtifactLike;

  const risks = createRiskForecastItems({ decisionArtifact: decision, reviewArtifact: review });

  assert.deepEqual(
    risks.map((risk) => [risk.category, risk.level]),
    [
      ["数据质量", "high"],
      ["知识覆盖", "medium"],
      ["分块与召回", "medium"],
      ["评估闭环", "low"],
      ["阶段四执行", "low"],
    ],
  );
  assert.match(risks[0].evidence, /SOP 版本不一致/);
  assert.match(risks[0].mitigation, /先清洗与版本确认/);
  assert.match(risks[1].evidence, /缺少 AOI 误报样例/);
});

test("submission gate requires saved decision, five layers, risk forecast, review and stage four handoff", () => {
  const decision = {
    ...baseArtifact,
    content_json: {
      data_quality_risks: ["SOP 版本不一致"],
      evaluation_plan: "用标准问题集复测 Hit Rate。",
      stage_4_build_plan: "导入 Dify 并复测。",
    },
  } satisfies StageThreeRiskArtifactLike;
  const review = {
    ...baseArtifact,
    artifact_type: "stage_3_ai_review",
    content_json: {
      review_summary: "决策完整。",
    },
    id: "review-1",
  } satisfies StageThreeRiskArtifactLike;

  const blocked = createStageThreeSubmissionGate({
    decisionArtifact: decision,
    readiness: [{ ...completeReadiness[0], ready: false }, ...completeReadiness.slice(1)],
    reviewArtifact: null,
  });
  const ready = createStageThreeSubmissionGate({
    decisionArtifact: decision,
    readiness: completeReadiness,
    reviewArtifact: review,
  });

  assert.equal(blocked.canSubmit, false);
  assert.deepEqual(
    blocked.checks.map((check) => [check.key, check.ready]),
    [
      ["decision_saved", true],
      ["five_layers_ready", false],
      ["risk_forecast_ready", true],
      ["ai_review_ready", false],
      ["stage_four_handoff_ready", true],
    ],
  );
  assert.equal(ready.canSubmit, true);
});

test("decision document preview exposes formal sections for final review", () => {
  const decision = {
    ...baseArtifact,
    content_json: {
      data_quality_risks: ["SOP 版本不一致"],
      evaluation_plan: "用标准问题集复测 Hit Rate。",
      knowledge_goal: "支持质检员查询缺陷判定和追溯规则。",
      maintenance_plan: "每周复查材料版本。",
      required_knowledge_types: ["质检 SOP", "缺陷标准"],
      selected_strategy: "hybrid",
      source_inventory: ["质检 SOP v3"],
      stage_4_build_plan: "在 Dify 中配置知识库、混合召回和测试问题集。",
      strategy_rationale: "【召回策略】\n混合召回。",
    },
  } satisfies StageThreeRiskArtifactLike;
  const review = {
    ...baseArtifact,
    artifact_type: "stage_3_ai_review",
    content_json: {
      review_summary: "方向可行，但需要阶段四继续验证。",
      stage_4_readiness: "ready_with_data_quality_risks",
      strategy_fit: "hybrid_strategy_needs_stage_four_validation",
    },
    id: "review-1",
  } satisfies StageThreeRiskArtifactLike;

  const preview = createDecisionDocumentPreview({
    decisionArtifact: decision,
    reviewArtifact: review,
  });

  assert.equal(preview.title, "知识工程决策文档");
  assert.equal(preview.strategyLabel, "混合策略");
  assert.deepEqual(
    preview.sections.map((section) => section.title),
    ["知识目标", "知识来源与类型", "策略与参数依据", "风险预判", "评估与维护", "阶段四交接", "AI 评审结论"],
  );
  assert.match(preview.sections.at(-1)?.body ?? "", /可进入阶段四，但需持续处理数据质量风险/);
});
