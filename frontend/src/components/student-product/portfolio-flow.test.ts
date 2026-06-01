import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPortfolioArchiveState,
  buildPortfolioReportState,
  buildPortfolioSummaryCards,
  portfolioAcceptanceUnsyncedToastCopy,
  portfolioAcceptanceSyncedToastCopy,
  portfolioEvidenceSyncToastCopy,
  portfolioNavigationItems,
  portfolioHeroCopy,
  portfolioAbilityItems,
  portfolioCapabilityReport,
  portfolioPackageItems,
  portfolioReviewNotes,
  portfolioStageChainItems,
  portfolioSummaryCards,
  portfolioExportBlockedToastCopy,
  portfolioExportReadyToastCopy,
  portfolioSummaryCopyText,
} from "./portfolio-flow.ts";

test("portfolio model mirrors Open Design final archive modules", () => {
  assert.deepEqual(
    portfolioSummaryCards.map((item) => item.label),
    ["实验项目", "Dify 应用", "平台测试", "验收结论"],
  );
  assert.deepEqual(
    portfolioStageChainItems.map((item) => [item.number, item.title]),
    [
      ["01", "访谈记录、需求假设、待确认问题"],
      ["02", "可行性研究报告、总体技术方案"],
      ["03", "数据质量、分块、向量化、召回与风险边界"],
      ["04", "知识库创建、Chatflow 节点、发布链接、平台评分"],
      ["05", "交付说明文档、模拟客户验收、最终归档结论"],
    ],
  );
  assert.deepEqual(
    portfolioStageChainItems.map((item) => item.actionLabel),
    ["查看阶段一产物", "查看阶段二工作台", "查看 RAG 决策路径", "查看阶段四评分", "查看验收确认"],
  );
  assert.deepEqual(
    portfolioAbilityItems.map((item) => item.label),
    ["需求访谈", "方案设计", "知识工程", "智能体实现", "测试调优", "交付表达"],
  );
  assert.deepEqual(
    portfolioPackageItems.map((item) => item.code),
    ["DOC", "ACC", "TST", "RAG"],
  );
  assert.deepEqual(
    portfolioReviewNotes.map((item) => item.label),
    ["优势", "需继续训练", "归档提醒"],
  );
  assert.deepEqual(portfolioNavigationItems, ["交付文档", "验收确认", "档案袋"]);
  assert.equal(
    portfolioAcceptanceUnsyncedToastCopy,
    "未检测到阶段五验收记录，已保留演示档案结构",
  );
  assert.equal(portfolioAcceptanceSyncedToastCopy, "已同步最新项目证据");
  assert.equal(portfolioEvidenceSyncToastCopy(false), portfolioAcceptanceUnsyncedToastCopy);
  assert.equal(portfolioEvidenceSyncToastCopy(true), portfolioAcceptanceSyncedToastCopy);
  assert.equal(
    portfolioHeroCopy,
    "这里汇总学生从需求访谈、技术方案、RAG 决策、Dify 实现到交付验收的完整证据链。能力画像只基于阶段产物、评审记录和验收证据生成，不用单一分数替代学习过程。",
  );
  assert.equal(portfolioCapabilityReport.title, "制造业质检 AI 智能体项目能力报告");
  assert.equal(portfolioCapabilityReport.rows.length, 5);
  assert.deepEqual(
    portfolioCapabilityReport.rows.map((row) => [row.name, row.level]),
    [
      ["需求访谈", "A-"],
      ["技术方案", "B+"],
      ["知识工程", "A-"],
      ["智能体实现", "B+"],
      ["交付表达", "A"],
    ],
  );
  assert.equal(portfolioExportBlockedToastCopy, "请先生成能力报告，再导出归档包");
  assert.equal(
    portfolioExportReadyToastCopy,
    "归档包已准备：交付文档、验收记录、测试评分和能力报告",
  );
  assert.match(portfolioSummaryCopyText, /需求访谈、技术方案、RAG 决策/);
});

test("portfolio archive state mirrors Open Design when acceptance is not synced", () => {
  const state = buildPortfolioArchiveState({
    artifactsByStage: {
      stage_1: [{ artifact_type: "stage_1_problem_summary" }],
      stage_2: [{ artifact_type: "stage_2_ai_review" }],
      stage_3: [{ artifact_type: "stage_3_ai_review" }],
      stage_4: [{ artifact_type: "stage_4_test_report", content_json: { total_score: 84 } }],
      stage_5: [{ artifact_type: "stage_5_delivery_document" }],
    },
    stageRecords: [
      { stage_key: "stage_1", status: "completed" },
      { stage_key: "stage_2", status: "completed" },
      { stage_key: "stage_3", status: "completed" },
      { stage_key: "stage_4", status: "in_practice" },
      { stage_key: "stage_5", status: "not_started" },
    ],
  });

  assert.equal(state.headerStatus, "成果归档");
  assert.equal(state.finalStateTitle, "待拉取验收记录");
  assert.equal(
    state.finalStateCopy,
    "点击“拉取项目证据”后，将从阶段四测试、交付文档和验收确认中同步最终归档状态。",
  );
  assert.equal(state.archivedCount, 4);
  assert.equal(state.readiness, 72);
  assert.equal(state.stageLabels.stage_4, "课堂演示记录");
  assert.equal(state.stageLabels.stage_5, "待同步");
  assert.equal(state.testScoreTitle, "84 分");
  assert.equal(state.acceptanceGateLabel, "验收记录待同步");
  assert.equal(state.acceptanceGateDone, false);
});

test("portfolio archive state marks final evidence after acceptance sync", () => {
  const state = buildPortfolioArchiveState({
    artifactsByStage: {
      stage_1: [{ artifact_type: "stage_1_problem_summary" }],
      stage_2: [{ artifact_type: "stage_2_ai_review" }],
      stage_3: [{ artifact_type: "stage_3_ai_review" }],
      stage_4: [{ artifact_type: "stage_4_test_report", content_json: { total_score: 78 } }],
      stage_5: [
        { artifact_type: "stage_5_delivery_document" },
        {
          artifact_type: "stage_5_acceptance_package",
          status: "submitted",
          content_json: { acceptance_decision: "conditional" },
        },
      ],
    },
    stageRecords: [
      { stage_key: "stage_1", status: "completed" },
      { stage_key: "stage_2", status: "completed" },
      { stage_key: "stage_3", status: "completed" },
      { stage_key: "stage_4", status: "in_practice" },
      { stage_key: "stage_5", status: "not_started" },
    ],
  });

  assert.equal(state.finalStateTitle, "项目已具备归档条件");
  assert.equal(state.archivedCount, 5);
  assert.equal(state.readiness, 88);
  assert.equal(state.stageLabels.stage_5, "已归档");
  assert.equal(state.acceptanceGateLabel, "验收记录已同步");
  assert.equal(state.acceptanceGateDone, true);
});

test("portfolio archive state restores stage four score from coverage notes", () => {
  const state = buildPortfolioArchiveState({
    artifactsByStage: {
      stage_1: [{ artifact_type: "stage_1_problem_summary" }],
      stage_2: [{ artifact_type: "stage_2_ai_review" }],
      stage_3: [{ artifact_type: "stage_3_ai_review" }],
      stage_4: [
        {
          artifact_type: "stage_4_test_report",
          content_json: {
            coverage_notes: "测试对象：制造业质检追溯 AI 助手\n总分：84\n告警项：2",
          },
        },
      ],
      stage_5: [{ artifact_type: "stage_5_delivery_document" }],
    },
    stageRecords: [
      { stage_key: "stage_1", status: "completed" },
      { stage_key: "stage_2", status: "completed" },
      { stage_key: "stage_3", status: "completed" },
      { stage_key: "stage_4", status: "in_practice" },
      { stage_key: "stage_5", status: "not_started" },
    ],
  });

  assert.equal(state.testScoreTitle, "84 分");
});

test("portfolio archive state uses the latest stage four test report score", () => {
  const state = buildPortfolioArchiveState({
    artifactsByStage: {
      stage_1: [{ artifact_type: "stage_1_problem_summary" }],
      stage_2: [{ artifact_type: "stage_2_ai_review" }],
      stage_3: [{ artifact_type: "stage_3_ai_review" }],
      stage_4: [
        {
          artifact_type: "stage_4_test_report",
          content_json: { total_score: 78 },
          created_at: "2026-06-01T08:00:00.000Z",
        },
        {
          artifact_type: "stage_4_test_report",
          content_json: { total_score: 86 },
          created_at: "2026-06-01T10:00:00.000Z",
        },
      ],
      stage_5: [{ artifact_type: "stage_5_delivery_document" }],
    },
    stageRecords: [
      { stage_key: "stage_1", status: "completed" },
      { stage_key: "stage_2", status: "completed" },
      { stage_key: "stage_3", status: "completed" },
      { stage_key: "stage_4", status: "in_practice" },
      { stage_key: "stage_5", status: "not_started" },
    ],
  });

  assert.equal(state.testScoreTitle, "86 分");
});

test("portfolio archive state does not sync draft acceptance package into final archive", () => {
  const state = buildPortfolioArchiveState({
    artifactsByStage: {
      stage_1: [{ artifact_type: "stage_1_problem_summary" }],
      stage_2: [{ artifact_type: "stage_2_ai_review" }],
      stage_3: [{ artifact_type: "stage_3_ai_review" }],
      stage_4: [{ artifact_type: "stage_4_test_report", content_json: { total_score: 84 } }],
      stage_5: [
        { artifact_type: "stage_5_delivery_document" },
        { artifact_type: "stage_5_acceptance_package", status: "draft" },
      ],
    },
    stageRecords: [
      { stage_key: "stage_1", status: "completed" },
      { stage_key: "stage_2", status: "completed" },
      { stage_key: "stage_3", status: "completed" },
      { stage_key: "stage_4", status: "in_practice" },
      { stage_key: "stage_5", status: "not_started" },
    ],
  });

  assert.equal(state.finalStateTitle, "待拉取验收记录");
  assert.equal(state.archivedCount, 4);
  assert.equal(state.readiness, 72);
  assert.equal(state.stageLabels.stage_5, "待同步");
  assert.equal(state.acceptanceGateDone, false);
});

test("portfolio archive state does not sync revise acceptance package into final archive", () => {
  const state = buildPortfolioArchiveState({
    artifactsByStage: {
      stage_1: [{ artifact_type: "stage_1_problem_summary" }],
      stage_2: [{ artifact_type: "stage_2_ai_review" }],
      stage_3: [{ artifact_type: "stage_3_ai_review" }],
      stage_4: [{ artifact_type: "stage_4_test_report", content_json: { total_score: 84 } }],
      stage_5: [
        { artifact_type: "stage_5_delivery_document" },
        {
          artifact_type: "stage_5_acceptance_package",
          status: "submitted",
          content_json: {
            acceptance_scope:
              "交付对象：制造业质检追溯 AI 助手\n验收结论：退回修改\n交付说明、测试结果和边界说明仍不足。",
          },
        },
      ],
    },
    stageRecords: [
      { stage_key: "stage_1", status: "completed" },
      { stage_key: "stage_2", status: "completed" },
      { stage_key: "stage_3", status: "completed" },
      { stage_key: "stage_4", status: "in_practice" },
      { stage_key: "stage_5", status: "not_started" },
    ],
  });

  assert.equal(state.finalStateTitle, "待拉取验收记录");
  assert.equal(state.archivedCount, 4);
  assert.equal(state.readiness, 72);
  assert.equal(state.stageLabels.stage_5, "待同步");
  assert.equal(state.acceptanceGateDone, false);
});

test("portfolio summary keeps final delivery fields hidden until acceptance is synced", () => {
  const cards = buildPortfolioSummaryCards({
    acceptance: { acceptance_scope: "审厂追溯问答、资料来源说明和字段缺失提醒。" },
    archiveState: {
      acceptanceGateDone: false,
      testScoreTitle: "84 分",
    },
    delivery: {
      final_agent_url: "https://dify.example.local/apps/mfg-quality-trace",
      project_name: "制造业质检追溯 AI 助手",
    },
    implementation: {
      dify_app_name: "制造业质检追溯 AI 助手",
      dify_app_url: "https://dify.example.local/apps/mfg-quality-trace",
    },
    testReport: {
      test_goal: "验证质检追溯问答、缺失字段提醒和越界拒答。",
    },
  });

  const difyCard = cards.find((card) => card.label === "Dify 应用");
  const acceptanceCard = cards.find((card) => card.label === "验收结论");
  const testCard = cards.find((card) => card.label === "平台测试");

  assert.equal(difyCard?.title, "未同步");
  assert.equal(difyCard?.body, "发布链接会在交付验收记录保存后同步到档案袋。");
  assert.equal(acceptanceCard?.title, "未确认");
  assert.equal(
    acceptanceCard?.body,
    "完成交付验收确认后，档案袋会记录最终归档依据。",
  );
  assert.equal(testCard?.title, "84 分");
});

test("portfolio summary restores delivery target from acceptance package when upstream artifacts are missing", () => {
  const cards = buildPortfolioSummaryCards({
    acceptance: {
      acceptance_scope: [
        "交付对象：汽车零部件审厂追溯助手 / 审厂质检知识库 2026",
        "发布链接：https://dify.example.local/chat/audit-trace-agent",
        "验收结论：有条件通过",
        "交付验收已完成，后续需要补充更多审厂样例。",
      ].join("\n"),
    },
    archiveState: {
      acceptanceGateDone: true,
      testScoreTitle: "91 分",
    },
    delivery: undefined,
    implementation: undefined,
    testReport: undefined,
  });

  const difyCard = cards.find((card) => card.label === "Dify 应用");
  assert.equal(difyCard?.title, "汽车零部件审厂追溯助手");
  assert.equal(difyCard?.body, "https://dify.example.local/chat/audit-trace-agent");
});

test("portfolio report state treats persisted delivery review as generated report evidence", () => {
  const state = buildPortfolioReportState({
    acceptanceGateDone: true,
    hasGeneratedReport: false,
    hasPersistedDeliveryReview: true,
    readiness: 88,
  });

  assert.equal(state.reportReady, true);
  assert.equal(state.readinessValue, 100);
  assert.equal(state.reportGateLabel, "能力报告已生成");
  assert.equal(state.exportToastCopy, portfolioExportReadyToastCopy);
});
