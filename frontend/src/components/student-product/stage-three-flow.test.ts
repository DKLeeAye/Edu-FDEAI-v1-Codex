import assert from "node:assert/strict";
import test from "node:test";

import {
  createStageThreeEntryItems,
  createStageThreeQualityRecordPayload,
  createStageThreeQualitySnapshotFromArtifacts,
  createStageThreeRiskBoundaryRecordPayload,
  createStageThreeRiskBoundarySnapshotFromArtifacts,
  createStageThreeSourceSnapshotFromArtifacts,
  createStageThreeSourceRecordPayload,
  createStageThreeVNextProgressItems,
  deriveStageThreeVNextStep,
  isStageThreeQualityReady,
  isStageThreeFocusedMode,
  isStageThreeSourceReady,
  stageThreeCleaningChecks,
  stageThreeCleaningLogRows,
  stageThreeCleaningPracticeItems,
  stageThreeCleaningPreviewSamples,
  stageThreeCleaningRedlines,
  stageThreeCleaningSavedToast,
  stageThreeCleaningStrategyItems,
  stageThreeChunkingAnatomyItems,
  stageThreeChunkingChecks,
  stageThreeChunkingLabDocuments,
  stageThreeChunkingPracticeItems,
  stageThreeChunkingRedlines,
  stageThreeChunkingSavedToast,
  stageThreeChunkingStrategyRows,
  stageThreeStructureChecks,
  stageThreeStructureChainItems,
  stageThreeStructureDomainItems,
  stageThreeStructureMetadataRows,
  stageThreeStructurePracticeItems,
  stageThreeStructureRedlines,
  stageThreeStructureSavedToast,
  stageThreeVectorConceptItems,
  stageThreeVectorPracticeItems,
  stageThreeVectorQueries,
  stageThreeVectorSavedToast,
  stageThreeVectorStorageRows,
  stageThreeVectorKnowledgePoints,
  stageThreeVectorChecks,
  stageThreeRetrievalChecks,
  stageThreeRetrievalConceptItems,
  stageThreeRetrievalDocuments,
  stageThreeRetrievalGateInitialCopy,
  stageThreeRetrievalPracticeItems,
  stageThreeRetrievalQueries,
  stageThreeRetrievalSavedToast,
  stageThreeRetrievalScoreFactors,
  stageThreeAnswerCases,
  stageThreeAnswerChecks,
  stageThreeAnswerPracticeItems,
  stageThreeAnswerPrinciples,
  stageThreeAnswerQualityFactors,
  stageThreeAnswerSavedToast,
  stageThreeRecallChecks,
  stageThreeRecallCases,
  stageThreeRecallMatrixItems,
  stageThreeRecallPracticeItems,
  stageThreeRecallPrinciples,
  stageThreeRecallSavedState,
  stageThreeRiskBoundaryCases,
  stageThreeRiskBoundaryChecks,
  stageThreeRiskBoundaryMatrixRows,
  stageThreeRiskBoundaryPrinciples,
  stageThreeRiskBoundarySavedToast,
  stageThreeRiskBoundaryTemplateFields,
  stageThreeQualitySamples,
  stageThreeQualityDimensionItems,
  stageThreeQualityImpactItems,
  stageThreeQualityMatrixRows,
  stageThreeQualityPrinciples,
  stageThreeQualitySavedToast,
  stageThreeSourceDecisionItems,
  stageThreeSourceSavedToast,
  type StageThreeQualityChecks,
  type StageThreeQualitySelectionState,
  type StageThreeArtifactLike,
  type StageThreeSourceChecks,
  type StageThreeSourceSelectionState,
} from "./stage-three-flow.ts";

const baseArtifact = {
  content_json: {},
  created_at: "2026-05-19T08:00:00.000Z",
  id: "artifact-1",
};

test("stage three homepage exposes four learning and delivery entries", () => {
  const entries = createStageThreeEntryItems([], "not_started");

  assert.deepEqual(
    entries.map((entry) => [entry.key, entry.state, entry.meta]),
    [
      ["case_teaching", "ready", "建议先完成"],
      ["knowledge_lab", "ready", "五层实验"],
      ["project_decision", "ready", "待决策"],
      ["decision_document", "locked", "先保存决策"],
    ],
  );
});

test("stage three homepage derives delivery readiness from decision and review artifacts", () => {
  const artifacts: StageThreeArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_3_knowledge_decision",
      content_json: {
        selected_strategy: "hybrid",
      },
      id: "decision",
    },
    {
      ...baseArtifact,
      artifact_type: "stage_3_ai_review",
      content_json: {
        review_summary: "决策完整，可以进入阶段四。",
      },
      created_at: "2026-05-19T08:10:00.000Z",
      id: "review",
    },
  ];

  const entries = createStageThreeEntryItems(artifacts, "completed");

  assert.deepEqual(
    entries.map((entry) => [entry.key, entry.state, entry.meta]),
    [
      ["case_teaching", "ready", "建议先完成"],
      ["knowledge_lab", "ready", "五层实验"],
      ["project_decision", "done", "已保存"],
      ["decision_document", "done", "已完成"],
    ],
  );
});

test("stage three focused layout is used for every entry except the homepage", () => {
  assert.equal(isStageThreeFocusedMode("source"), true);
  assert.equal(isStageThreeFocusedMode("quality"), true);
  assert.equal(isStageThreeFocusedMode("decision"), true);
  assert.equal(isStageThreeFocusedMode("review"), true);
});

test("stage three vNext step starts at source without stage three artifacts", () => {
  assert.equal(deriveStageThreeVNextStep([], "not_started"), "source");
});

test("stage three vNext step derives from latest source and quality process records", () => {
  const sourceRecord: StageThreeArtifactLike = {
    ...baseArtifact,
    artifact_type: "stage_3_lab_experiment_record",
    content_json: {
      selected_parameters: {
        vnext_step: "source_decision",
      },
    },
  };
  const qualityRecord: StageThreeArtifactLike = {
    ...baseArtifact,
    artifact_type: "stage_3_lab_experiment_record",
    content_json: {
      selected_parameters: {
        vnext_step: "quality_assessment",
      },
    },
    created_at: "2026-06-01T08:10:00.000Z",
    id: "quality-record",
  };

  assert.equal(deriveStageThreeVNextStep([sourceRecord], "in_practice"), "quality");
  assert.equal(deriveStageThreeVNextStep([sourceRecord, qualityRecord], "in_practice"), "decision");
});

test("stage three vNext step opens review after decision or completion", () => {
  const decision: StageThreeArtifactLike = {
    ...baseArtifact,
    artifact_type: "stage_3_knowledge_decision",
    content_json: {
      knowledge_goal: "支撑审厂追溯问答。",
    },
  };

  assert.equal(deriveStageThreeVNextStep([decision], "in_practice"), "review");
  assert.equal(deriveStageThreeVNextStep([], "completed"), "review");
});

test("stage three source gate requires four correct decisions and four checks", () => {
  const checks: StageThreeSourceChecks = {
    dataTypes: true,
    mesRisk: true,
    paperStructuring: true,
    sourceHandling: true,
  };
  const selections: StageThreeSourceSelectionState = {
    mesExport: "clean",
    paperPhoto: "manual",
    sop: "direct",
    wechatScreenshot: "exclude",
  };

  assert.equal(stageThreeSourceDecisionItems.length, 4);
  assert.equal(isStageThreeSourceReady(selections, checks), true);
  assert.equal(isStageThreeSourceReady({ ...selections, mesExport: "direct" }, checks), false);
  assert.equal(isStageThreeSourceReady(selections, { ...checks, mesRisk: false }), false);
});

test("stage three source interaction copy mirrors Open Design toast", () => {
  assert.equal(stageThreeSourceSavedToast, "数据源识别决策已保存，可进入数据质量评估。");
});

test("stage three quality gate requires sample viewing, correct judgments and checks", () => {
  const checks: StageThreeQualityChecks = {
    cleanVsEvidence: true,
    fieldCompleteness: true,
    noAutoFill: true,
    sourceCredibility: true,
  };
  const selections: StageThreeQualitySelectionState = {
    auditChecklist: "pass",
    mesExport: "clean",
    paperScan: "manual",
    personalMemo: "block",
  };
  const viewed = ["auditChecklist", "mesExport", "paperScan", "personalMemo"] as const;

  assert.equal(stageThreeQualitySamples.length, 4);
  assert.equal(isStageThreeQualityReady(selections, viewed, checks), true);
  assert.equal(isStageThreeQualityReady({ ...selections, paperScan: "pass" }, viewed, checks), false);
  assert.equal(isStageThreeQualityReady(selections, viewed.slice(0, 3), checks), false);
});

test("stage three quality interaction copy mirrors Open Design toast", () => {
  assert.equal(stageThreeQualitySavedToast, "数据质量评估已保存，可以进入清洗与预处理。");
});

test("stage three quality page mirrors Open Design teaching modules", () => {
  assert.deepEqual(
    stageThreeQualityPrinciples.map((item) => [item.label, item.title]),
    [
      ["不是看文件多不多", "看能否被检索和引用"],
      ["不让 AI 补事实", "缺失字段必须显式标记"],
      ["先评估再清洗", "质量问题决定处理策略"],
    ],
  );
  assert.deepEqual(
    stageThreeQualityDimensionItems.map((item) => item.title),
    ["字段完整性", "来源可信度", "口径一致性", "追溯能力", "引用可用性"],
  );
  assert.deepEqual(
    stageThreeQualityMatrixRows.map((item) => [item.sample, item.judgment]),
    [
      ["质检 SOP v3.2", "高质量"],
      ["MES 质检导出", "需清洗"],
      ["Excel 异常台账", "需标准化"],
      ["纸质质检单照片", "低质量"],
    ],
  );
  assert.deepEqual(
    stageThreeQualityImpactItems.map((item) => item.title),
    ["无法定位记录", "召回结果混乱", "引用不可信", "只能描述不能追溯"],
  );
});

test("stage three source and quality record payloads preserve process evidence in lab record artifacts", () => {
  const sourcePayload = createStageThreeSourceRecordPayload({
    checks: {
      dataTypes: true,
      mesRisk: true,
      paperStructuring: true,
      sourceHandling: true,
    },
    selections: {
      mesExport: "clean",
      paperPhoto: "manual",
      sop: "direct",
      wechatScreenshot: "exclude",
    },
  });
  const qualityPayload = createStageThreeQualityRecordPayload({
    checks: {
      cleanVsEvidence: true,
      fieldCompleteness: true,
      noAutoFill: true,
      sourceCredibility: true,
    },
    selections: {
      auditChecklist: "pass",
      mesExport: "clean",
      paperScan: "manual",
      personalMemo: "block",
    },
    viewedSampleKeys: ["auditChecklist", "mesExport", "paperScan", "personalMemo"],
  });

  assert.equal(sourcePayload.selected_parameters.vnext_step, "source_decision");
  assert.equal(qualityPayload.selected_parameters.vnext_step, "quality_assessment");
  assert.equal(sourcePayload.observations[0]?.layer, "数据准备");
  assert.equal(qualityPayload.observations[0]?.layer, "数据准备");
});

test("stage three source snapshot restores from latest persisted source record", () => {
  const olderPayload = createStageThreeSourceRecordPayload({
    checks: {
      dataTypes: false,
      mesRisk: false,
      paperStructuring: false,
      sourceHandling: false,
    },
    selections: {
      mesExport: "direct",
      paperPhoto: "",
      sop: "direct",
      wechatScreenshot: "",
    },
  });
  const latestPayload = createStageThreeSourceRecordPayload({
    checks: {
      dataTypes: true,
      mesRisk: true,
      paperStructuring: true,
      sourceHandling: true,
    },
    selections: {
      mesExport: "clean",
      paperPhoto: "manual",
      sop: "direct",
      wechatScreenshot: "exclude",
    },
  });

  const snapshot = createStageThreeSourceSnapshotFromArtifacts([
    {
      ...baseArtifact,
      artifact_type: "stage_3_lab_experiment_record",
      content_json: olderPayload,
      created_at: "2026-06-01T08:00:00.000Z",
      id: "older-source",
    },
    {
      ...baseArtifact,
      artifact_type: "stage_3_lab_experiment_record",
      content_json: {
        selected_parameters: {
          vnext_step: "quality_assessment",
        },
      },
      created_at: "2026-06-01T08:05:00.000Z",
      id: "quality",
    },
    {
      ...baseArtifact,
      artifact_type: "stage_3_lab_experiment_record",
      content_json: latestPayload,
      created_at: "2026-06-01T08:10:00.000Z",
      id: "latest-source",
    },
  ]);

  assert.deepEqual(snapshot, {
    checks: {
      dataTypes: true,
      mesRisk: true,
      paperStructuring: true,
      sourceHandling: true,
    },
    selections: {
      mesExport: "clean",
      paperPhoto: "manual",
      sop: "direct",
      wechatScreenshot: "exclude",
    },
  });
});

test("stage three quality snapshot restores from latest persisted quality record", () => {
  const olderPayload = createStageThreeQualityRecordPayload({
    checks: {
      cleanVsEvidence: false,
      fieldCompleteness: false,
      noAutoFill: false,
      sourceCredibility: false,
    },
    selections: {
      auditChecklist: "pass",
      mesExport: "",
      paperScan: "",
      personalMemo: "",
    },
    viewedSampleKeys: ["auditChecklist"],
  });
  const latestPayload = createStageThreeQualityRecordPayload({
    checks: {
      cleanVsEvidence: true,
      fieldCompleteness: true,
      noAutoFill: true,
      sourceCredibility: true,
    },
    selections: {
      auditChecklist: "pass",
      mesExport: "clean",
      paperScan: "manual",
      personalMemo: "block",
    },
    viewedSampleKeys: ["auditChecklist", "mesExport", "paperScan", "personalMemo"],
  });

  const snapshot = createStageThreeQualitySnapshotFromArtifacts([
    {
      ...baseArtifact,
      artifact_type: "stage_3_lab_experiment_record",
      content_json: olderPayload,
      created_at: "2026-06-01T08:00:00.000Z",
      id: "older-quality",
    },
    {
      ...baseArtifact,
      artifact_type: "stage_3_lab_experiment_record",
      content_json: latestPayload,
      created_at: "2026-06-01T08:10:00.000Z",
      id: "latest-quality",
    },
  ]);

  assert.deepEqual(snapshot, {
    checks: {
      cleanVsEvidence: true,
      fieldCompleteness: true,
      noAutoFill: true,
      sourceCredibility: true,
    },
    selections: {
      auditChecklist: "pass",
      mesExport: "clean",
      paperScan: "manual",
      personalMemo: "block",
    },
    viewedSampleKeys: ["auditChecklist", "mesExport", "paperScan", "personalMemo"],
  });
});

test("stage three risk boundary record payload preserves final RAG boundary evidence", () => {
  const payload = createStageThreeRiskBoundaryRecordPayload({
    boundaryFields: {
      evidence: "回答必须引用 MES、Excel、SOP 或整改记录。",
      manual: "涉及责任认定、处罚建议和记录冲突时转人工确认。",
      refusal: "范围外或无可引用证据时说明资料不足，不生成推测结论。",
      scope: "仅回答制造业质检追溯和审厂材料准备问题。",
    },
    checks: {
      "已写清支持范围和不可回答内容": true,
      "已定义资料不足时的回复方式": true,
      "已定义责任判定和冲突证据的转人工条件": true,
      "已准备阶段四可测试的边界用例": true,
    },
    selectedChoices: {
      authority: "manual",
      conflict: "manual",
      missing: "insufficient",
      supported: "answer",
    },
  });

  assert.equal(payload.selected_parameters.vnext_step, "risk_boundary");
  assert.equal(payload.selected_parameters.experiment_type, "risk_boundary");
  const boundaryFields = payload.selected_parameters.boundary_fields as Record<string, string>;
  const judgments = payload.selected_parameters.risk_case_judgments as Record<string, string>;
  const judgmentDetails = payload.selected_parameters.risk_case_judgment_details as Array<Record<string, string>>;
  assert.equal(boundaryFields.scope, "仅回答制造业质检追溯和审厂材料准备问题。");
  assert.deepEqual(judgments, {
    authority: "manual",
    conflict: "manual",
    missing: "insufficient",
    supported: "answer",
  });
  assert.equal(judgmentDetails.length, 4);
  assert.equal(payload.observations[0]?.layer, "效果评估");
  assert.equal(payload.observations[1]?.layer, "效果评估");
});

test("stage three risk boundary snapshot restores from persisted process record", () => {
  const payload = createStageThreeRiskBoundaryRecordPayload({
    boundaryFields: {
      evidence: "回答必须引用 MES、Excel、SOP 或整改记录。",
      manual: "涉及责任认定、处罚建议和记录冲突时转人工确认。",
      refusal: "范围外或无可引用证据时说明资料不足，不生成推测结论。",
      scope: "仅回答制造业质检追溯和审厂材料准备问题。",
    },
    checks: {
      "已写清支持范围和不可回答内容": true,
      "已定义资料不足时的回复方式": true,
      "已定义责任判定和冲突证据的转人工条件": true,
      "已准备阶段四可测试的边界用例": true,
    },
    selectedChoices: {
      authority: "manual",
      conflict: "manual",
      missing: "insufficient",
      supported: "answer",
    },
  });

  const snapshot = createStageThreeRiskBoundarySnapshotFromArtifacts([
    {
      ...baseArtifact,
      artifact_type: "stage_3_lab_experiment_record",
      content_json: payload,
      created_at: "2026-06-01T08:20:00.000Z",
      id: "risk",
    },
  ]);

  assert.deepEqual(snapshot, {
    boundaryFields: {
      evidence: "回答必须引用 MES、Excel、SOP 或整改记录。",
      manual: "涉及责任认定、处罚建议和记录冲突时转人工确认。",
      refusal: "范围外或无可引用证据时说明资料不足，不生成推测结论。",
      scope: "仅回答制造业质检追溯和审厂材料准备问题。",
    },
    boundarySaved: true,
    checkState: {
      "已写清支持范围和不可回答内容": true,
      "已定义资料不足时的回复方式": true,
      "已定义责任判定和冲突证据的转人工条件": true,
      "已准备阶段四可测试的边界用例": true,
    },
    selectedChoices: {
      authority: "manual",
      conflict: "manual",
      missing: "insufficient",
      supported: "answer",
    },
  });
});

test("stage three vNext progress summarizes source, quality, decision and review", () => {
  const progress = createStageThreeVNextProgressItems(
    [
      {
        ...baseArtifact,
        artifact_type: "stage_3_lab_experiment_record",
        content_json: {
          selected_parameters: {
            vnext_step: "quality_assessment",
          },
        },
      },
    ],
    "in_practice",
  );

  assert.deepEqual(
    progress.map((item) => [item.key, item.state, item.meta]),
    [
      ["source", "done", "已保存"],
      ["quality", "done", "已保存"],
      ["decision", "ready", "待决策"],
      ["review", "locked", "先保存决策"],
    ],
  );
});

test("stage three cleaning prototype model mirrors Open Design decision modules", () => {
  assert.equal(stageThreeCleaningStrategyItems.length, 5);
  assert.deepEqual(
    stageThreeCleaningStrategyItems.map((item) => item.title),
    ["字段统一", "缺失标记", "去重合并", "结构化转换", "人工复核"],
  );
  assert.deepEqual(
    stageThreeCleaningPreviewSamples.map((sample) => sample.key),
    ["mes", "excel", "scan"],
  );
  assert.equal(stageThreeCleaningLogRows.length, 4);
  assert.deepEqual(
    stageThreeCleaningPracticeItems.map((item) => item.answer),
    ["mapping", "missing", "ocr", "exclude"],
  );
  assert.equal(stageThreeCleaningChecks.length, 4);
  assert.match(stageThreeCleaningRedlines.join("\n"), /不能让 AI 自动补齐关键质检字段/);
});

test("stage three cleaning interaction copy mirrors Open Design toast", () => {
  assert.equal(stageThreeCleaningSavedToast, "清洗策略已保存，可以进入知识结构设计。");
});

test("stage three structure prototype model mirrors Open Design knowledge modules", () => {
  assert.deepEqual(
    stageThreeStructureDomainItems.map((item) => item.title),
    ["制度与标准", "批次追溯记录", "异常与整改案例", "证据与附件"],
  );
  assert.deepEqual(
    stageThreeStructureMetadataRows.map((row) => row.metadata),
    ["批次号", "工序", "缺陷类型", "标准条款", "来源与版本"],
  );
  assert.deepEqual(
    stageThreeStructurePracticeItems.map((item) => item.answer),
    ["standard", "batch", "case", "evidence"],
  );
  assert.deepEqual(
    stageThreeStructureChainItems.map((item) => item.label),
    ["问题", "批次记录", "标准条款", "整改案例", "证据附件"],
  );
  assert.equal(stageThreeStructureChecks.length, 4);
  assert.match(stageThreeStructureRedlines.join("\n"), /不能先切分再回头猜测知识关系/);
});

test("stage three structure interaction copy mirrors Open Design toast", () => {
  assert.equal(stageThreeStructureSavedToast, "知识结构草案已保存，可以进入分块策略。");
});

test("stage three chunking prototype model mirrors Open Design strategy modules", () => {
  assert.deepEqual(
    stageThreeChunkingAnatomyItems.map((item) => item.label),
    ["正文片段", "标题路径", "业务元数据", "来源证据"],
  );
  assert.deepEqual(
    stageThreeChunkingStrategyRows.map((row) => row.sourceType),
    ["SOP / 检验标准", "MES 批次记录", "整改报告", "图片 / 扫描件"],
  );
  assert.deepEqual(
    stageThreeChunkingLabDocuments.map((doc) => doc.key),
    ["sop", "mes", "closure"],
  );
  assert.deepEqual(
    stageThreeChunkingPracticeItems.map((item) => item.answer),
    ["clause", "event", "closure", "attachment"],
  );
  assert.equal(stageThreeChunkingChecks.length, 4);
  assert.match(stageThreeChunkingRedlines.join("\n"), /不能为了字数平均而切断原因、措施和验证结果/);
});

test("stage three chunking interaction copy mirrors Open Design toast", () => {
  assert.equal(stageThreeChunkingSavedToast, "分块策略记录已保存，可以进入向量化与存储。");
});

test("stage three vector storage prototype model mirrors Open Design semantic modules", () => {
  assert.deepEqual(
    stageThreeVectorConceptItems.map((item) => item.title),
    ["Embedding", "相似度", "元数据"],
  );
  assert.deepEqual(
    stageThreeVectorQueries.map((query) => query.key),
    ["audit", "defect", "standard", "rectify"],
  );
  assert.deepEqual(
    stageThreeVectorKnowledgePoints.map((point) => point.id),
    ["v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8"],
  );
  assert.deepEqual(
    stageThreeVectorStorageRows.map((row) => row.field),
    ["chunk_text", "embedding", "metadata", "source_ref"],
  );
  assert.deepEqual(
    stageThreeVectorPracticeItems.map((item) => item.answer),
    ["metadata", "versioned", "manual"],
  );
  assert.equal(stageThreeVectorChecks.length, 3);
});

test("stage three vector storage interaction copy mirrors Open Design save transition", () => {
  assert.equal(stageThreeVectorSavedToast, "向量化与存储设计已保存，可以进入召回策略。");
});

test("stage three retrieval prototype model mirrors Open Design strategy modules", () => {
  assert.deepEqual(
    stageThreeRetrievalConceptItems.map((item) => item.title),
    ["向量召回", "关键词召回", "混合召回"],
  );
  assert.deepEqual(
    stageThreeRetrievalQueries.map((query) => query.key),
    ["audit", "scratch", "standard", "rectify"],
  );
  assert.deepEqual(
    stageThreeRetrievalDocuments.map((doc) => doc.id),
    ["d1", "d2", "d3", "d4", "d5", "d6"],
  );
  assert.deepEqual(
    stageThreeRetrievalScoreFactors.map((factor) => factor.label),
    ["Vector", "Keyword", "Metadata", "Source"],
  );
  assert.deepEqual(
    stageThreeRetrievalPracticeItems.map((item) => item.answer),
    ["hybrid", "keyword", "hybrid"],
  );
  assert.equal(stageThreeRetrievalChecks.length, 3);
  assert.equal(
    stageThreeRetrievalGateInitialCopy,
    "已完成 0/3 个策略判断，0/3 个检查项。",
  );
});

test("stage three retrieval interaction copy mirrors Open Design save transition", () => {
  assert.equal(stageThreeRetrievalSavedToast, "召回策略判断已保存，可以进入回答生成与引用。");
});

test("stage three answer citation prototype model mirrors Open Design citation modules", () => {
  assert.deepEqual(
    stageThreeAnswerPrinciples.map((item) => item.title),
    ["先给结论，再给证据", "证据不足时说明不足", "不替人做责任认定"],
  );
  assert.deepEqual(
    stageThreeAnswerCases.map((item) => item.key),
    ["audit", "scratch", "standard", "missing"],
  );
  assert.deepEqual(
    stageThreeAnswerCases.map((item) => item.evidence.length),
    [3, 3, 3, 3],
  );
  assert.deepEqual(
    stageThreeAnswerQualityFactors.map((factor) => factor.label),
    ["Evidence", "Citation", "Uncertainty", "Boundary"],
  );
  assert.deepEqual(
    stageThreeAnswerPracticeItems.map((item) => item.answer),
    ["revise", "pass", "reject"],
  );
  assert.equal(stageThreeAnswerChecks.length, 3);
});

test("stage three answer citation interaction copy mirrors Open Design save toast", () => {
  assert.equal(stageThreeAnswerSavedToast, "回答生成与引用检查已保存");
});

test("stage three recall test prototype model mirrors Open Design test modules", () => {
  assert.deepEqual(
    stageThreeRecallPrinciples.map((item) => item.title),
    ["范围内能命中", "证据缺失能识别", "范围外能拦截"],
  );
  assert.deepEqual(
    stageThreeRecallCases.map((item) => item.key),
    ["batch", "missing", "conflict", "boundary"],
  );
  assert.deepEqual(
    stageThreeRecallMatrixItems.map((item) => item.label),
    ["范围内", "字段缺失", "记录冲突", "范围外"],
  );
  assert.deepEqual(
    stageThreeRecallPracticeItems.map((item) => item.answer),
    ["chunking", "quality", "boundary"],
  );
  assert.equal(stageThreeRecallChecks.length, 4);
});

test("stage three recall test interaction copy mirrors Open Design save state", () => {
  assert.equal(stageThreeRecallSavedState, "已保存召回测试记录，可进入风险边界。");
});

test("stage three risk boundary prototype model mirrors Open Design boundary modules", () => {
  assert.deepEqual(
    stageThreeRiskBoundaryPrinciples.map((item) => item.title),
    ["有证据才回答", "资料不足要说明", "责任结论转人工"],
  );
  assert.deepEqual(
    stageThreeRiskBoundaryCases.map((item) => item.key),
    ["supported", "missing", "conflict", "authority"],
  );
  assert.deepEqual(
    stageThreeRiskBoundaryCases.map((item) => item.answer),
    ["answer", "insufficient", "manual", "manual"],
  );
  assert.deepEqual(
    stageThreeRiskBoundaryMatrixRows.map((item) => item.riskType),
    ["证据缺失", "记录冲突", "责任判定", "范围外问题"],
  );
  assert.deepEqual(
    stageThreeRiskBoundaryTemplateFields.map((item) => item.key),
    ["scope", "evidence", "manual", "refusal"],
  );
  assert.equal(stageThreeRiskBoundaryChecks.length, 4);
});

test("stage three risk boundary interaction copy mirrors Open Design completion toast", () => {
  assert.equal(stageThreeRiskBoundarySavedToast, "阶段三边界说明已保存，正在进入阶段四导学");
});
