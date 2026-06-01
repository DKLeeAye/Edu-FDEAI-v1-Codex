import assert from "node:assert/strict";
import test from "node:test";

import {
  createStageFiveAcceptancePackagePayloadFromVNext,
  createStageFiveAcceptanceQuestions,
  createStageFiveDeliveryDocumentPayloadFromVNext,
  createStageFiveOperationsGuidePayloadFromVNext,
  createStageFiveDeliveryPreviewSections,
  createStageFiveDemoScriptCopyText,
  deriveStageFiveVNextStep,
  canSaveStageFiveChapter,
  isStageFiveAcceptanceReady,
  isStageFiveDocumentReady,
  isStageFiveFocusedMode,
  scoreStageFiveChapter,
  stageFiveAcceptanceTargetFromArtifacts,
  stageFiveScoreFromStageFourTestReport,
  stageFiveAcceptanceStateFromArtifacts,
  stageFiveDocumentSnapshotFromArtifacts,
  stageFiveChapterKeys,
  stageFiveDeliveryChapterModels,
  stageFiveDeliveryContextCards,
  stageFiveAcceptanceAgendaItems,
  stageFiveAcceptanceReadinessGates,
  stageFiveAcceptanceBlockedToast,
  stageFiveAcceptanceNavigationItems,
  stageFiveAcceptanceSavedToast,
  stageFiveDeliveryPackageChecksFromArtifacts,
  stageFiveDeliveryPackageItems,
  stageFiveDemoScriptCopyFallbackToast,
  stageFiveDemoScriptCopyToast,
  stageFiveDemoScriptSteps,
  stageFiveSignoffOptions,
  stageFiveDeliveryPackageKeys,
  stageFiveSignoffCheckKeys,
  type StageFiveAcceptanceState,
  type StageFiveArtifactLike,
  type StageFiveChapterDrafts,
  type StageFiveChapterStatuses,
} from "./stage-five-flow.ts";

const baseArtifact = {
  content_json: {},
  created_at: "2026-05-20T08:00:00.000Z",
  id: "artifact-1",
};

test("stage five vNext step starts at document without delivery artifacts", () => {
  assert.equal(deriveStageFiveVNextStep([], "not_started"), "document");
});

test("stage five vNext step opens acceptance after document handoff, acceptance, review, or completion", () => {
  const delivery: StageFiveArtifactLike = {
    ...baseArtifact,
    artifact_type: "stage_5_delivery_document",
    id: "delivery",
  };
  const operations: StageFiveArtifactLike = {
    ...baseArtifact,
    artifact_type: "stage_5_operations_guide",
    id: "operations",
  };
  const acceptance: StageFiveArtifactLike = {
    ...baseArtifact,
    artifact_type: "stage_5_acceptance_package",
    id: "acceptance",
  };
  const review: StageFiveArtifactLike = {
    ...baseArtifact,
    artifact_type: "stage_5_ai_delivery_review",
    id: "review",
  };

  assert.equal(deriveStageFiveVNextStep([delivery, operations], "in_practice"), "acceptance");
  assert.equal(deriveStageFiveVNextStep([acceptance], "in_practice"), "acceptance");
  assert.equal(deriveStageFiveVNextStep([review], "in_practice"), "acceptance");
  assert.equal(deriveStageFiveVNextStep([], "completed"), "acceptance");
});

test("stage five vNext modes are focused formal screens", () => {
  assert.equal(isStageFiveFocusedMode("document"), true);
  assert.equal(isStageFiveFocusedMode("acceptance"), true);
});

test("stage five acceptance navigation mirrors Open Design topbar", () => {
  assert.deepEqual(stageFiveAcceptanceNavigationItems, [
    "阶段三 RAG",
    "阶段四测试",
    "交付文档",
    "验收确认",
  ]);
});

test("stage five document gate requires all six saved pass chapters", () => {
  const statuses = completeChapterStatuses();

  assert.equal(isStageFiveDocumentReady(statuses), true);
  assert.equal(isStageFiveDocumentReady({ ...statuses, boundary: "revise" }), false);
  assert.equal(isStageFiveDocumentReady({ ...statuses, maintenance: "unchecked" }), false);
});

test("stage five chapter save gate only accepts passed AI review", () => {
  assert.equal(canSaveStageFiveChapter("pass"), true);
  assert.equal(canSaveStageFiveChapter("revise"), false);
  assert.equal(canSaveStageFiveChapter("rewrite"), false);
  assert.equal(canSaveStageFiveChapter("unchecked"), false);
});

test("stage five local chapter scoring separates formal delivery text from weak text", () => {
  const strong = scoreStageFiveChapter(
    "goal",
    [
      "本章面向客户质量负责人说明 Dify 交付对象、审厂使用方式、验收依据和维护责任。",
      "文档引用知识库、平台测试评分、SOP、MES、批次资料和风险边界，说明资料不足、转人工和责任判定限制。",
      "客户可以按交付说明使用智能体查询质检追溯证据，并在缺失字段或记录冲突时进入人工复核。",
    ].join("\n"),
  );
  const weak = scoreStageFiveChapter("goal", "我们完成了课程项目。");

  assert.equal(strong.status, "pass");
  assert.equal(strong.score >= 80, true);
  assert.equal(weak.status, "rewrite");
  assert.equal(weak.score < 60, true);
});

test("stage five delivery document model mirrors Open Design chapter workspace", () => {
  assert.deepEqual(
    stageFiveDeliveryContextCards.map((card) => card.title),
    ["Dify 应用与测试评分", "RAG 边界与资料范围", "客户可读交付说明文档"],
  );
  assert.deepEqual(
    stageFiveDeliveryChapterModels.map((chapter) => [chapter.number, chapter.id, chapter.title]),
    [
      ["01", "chapter-goal", "交付目标与项目概览"],
      ["02", "chapter-usage", "智能体使用说明"],
      ["03", "chapter-scope", "知识库资料范围"],
      ["04", "chapter-boundary", "支持问题与使用边界"],
      ["05", "chapter-test", "测试结果与验收结论"],
      ["06", "chapter-maintenance", "维护与更新说明"],
    ],
  );
  assert.deepEqual(
    stageFiveDeliveryChapterModels.map((chapter) => chapter.writingFields.map((field) => field.label)),
    [
      ["交付目标", "适用场景"],
      ["推荐提问方式", "回答阅读方式", "异常处理方式", "访问与权限说明"],
      ["已纳入资料范围", "未纳入或需谨慎使用的资料"],
      ["支持的问题类型", "不支持与转人工场景"],
      ["测试结果摘要", "验收结论"],
      ["维护责任与更新触发", "问题反馈与后续计划"],
    ],
  );
  assert.equal(stageFiveDeliveryChapterModels[1]?.methodGrid.variant, "five");
  assert.equal(stageFiveDeliveryChapterModels[3]?.methodGrid.variant, "feasibility");
  assert.equal(stageFiveDeliveryChapterModels[4]?.evidence.variant, "acceptance-board");
});

test("stage five chapter drafts map to existing delivery document payload", () => {
  const payload = createStageFiveDeliveryDocumentPayloadFromVNext({
    chapters: fullChapterDrafts(),
    stageFourImplementation: {
      dify_app_name: "制造业质检追溯 AI 助手",
      dify_app_url: "https://example.dify.ai/chat/manufacturing-quality-agent",
    },
  });

  assert.equal(payload.project_name, "制造业质检追溯 AI 助手交付说明文档");
  assert.equal(payload.final_agent_url, "https://example.dify.ai/chat/manufacturing-quality-agent");
  assert.match(payload.delivery_summary, /交付目标/);
  assert.match(payload.delivery_summary, /验收结论/);
  assert.deepEqual(payload.target_users, ["质量负责人", "质量工程师", "审厂材料准备人员"]);
  assert.equal(payload.core_features.some((item) => item.includes("批次追溯")), true);
  assert.match(payload.usage_instructions, /推荐提问方式/);
  assert.equal(payload.known_limitations.some((item) => item.includes("责任判定")), true);
});

test("stage five delivery preview exposes all Open Design document chapters and fields", () => {
  const sections = createStageFiveDeliveryPreviewSections(fullChapterDrafts());

  assert.deepEqual(
    sections.map((section) => [section.number, section.title]),
    [
      ["01", "交付目标与项目概览"],
      ["02", "智能体使用说明"],
      ["03", "知识库资料范围"],
      ["04", "支持问题与使用边界"],
      ["05", "测试结果与验收结论"],
      ["06", "维护与更新说明"],
    ],
  );
  assert.deepEqual(
    sections[0]?.fields.map((field) => field.label),
    ["交付目标", "适用场景"],
  );
  assert.match(sections[1]?.fields[0]?.value ?? "", /批次号/);
  assert.match(sections[5]?.fields[1]?.value ?? "", /问题类型/);
});

test("stage five chapter drafts map to existing operations guide payload", () => {
  const payload = createStageFiveOperationsGuidePayloadFromVNext({
    chapters: fullChapterDrafts(),
    stageFourImplementation: {
      dify_app_name: "制造业质检追溯 AI 助手",
      knowledge_base_notes: "知识库名称：制造业质检追溯知识库 v1",
    },
    stageFourTestReport: {
      improvement_actions: ["T-02: 优化引用回答 Prompt", "T-05: 增加转人工路径"],
      observed_failures: ["T-05 记录冲突时需要人工确认"],
    },
  });

  assert.deepEqual(payload.runtime_dependencies.slice(0, 4), [
    "Dify Chatflow 发布应用",
    "制造业质检追溯知识库 v1",
    "课程阶段三清洗后的 SOP、MES、Excel 与审厂资料",
    "阶段四平台自动化测试集",
  ]);
  assert.match(payload.data_update_plan, /知识库资料应由质量负责人/);
  assert.match(payload.monitoring_plan, /重新执行召回测试和平台自动化测试/);
  assert.equal(payload.common_issues.some((item) => item.includes("T-05")), true);
  assert.match(payload.maintenance_owner_notes, /问题反馈与后续计划/);
});

test("stage five document drafts restore from persisted delivery and operations artifacts", () => {
  const chapterDrafts = fullChapterDrafts();
  const deliveryDocument = createStageFiveDeliveryDocumentPayloadFromVNext({
    chapters: chapterDrafts,
    stageFourImplementation: {
      dify_app_name: "制造业质检追溯 AI 助手",
      dify_app_url: "https://example.dify.ai/chat/manufacturing-quality-agent",
    },
  });
  const operationsGuide = createStageFiveOperationsGuidePayloadFromVNext({
    chapters: chapterDrafts,
    stageFourImplementation: {
      dify_app_name: "制造业质检追溯 AI 助手",
      knowledge_base_notes: "知识库名称：制造业质检追溯知识库 v1",
    },
    stageFourTestReport: {
      improvement_actions: ["T-02: 优化引用回答 Prompt"],
      observed_failures: ["T-05 记录冲突时需要人工确认"],
    },
  });

  const snapshot = stageFiveDocumentSnapshotFromArtifacts({
    deliveryDocument,
    operationsGuide,
    stageFourImplementation: {
      dify_app_name: "制造业质检追溯 AI 助手",
      dify_app_url: "https://example.dify.ai/chat/manufacturing-quality-agent",
    },
    stageFourTestReport: {
      coverage_notes: "总分：84；告警项：2；严重失败：0。",
    },
  });

  assert.deepEqual(snapshot.drafts, chapterDrafts);
  assert.deepEqual(snapshot.statuses, completeChapterStatuses());
});

test("stage five acceptance readiness requires target, package, document, review, and signoff", () => {
  const state = fullAcceptanceState();

  assert.equal(isStageFiveAcceptanceReady(state), true);
  assert.equal(isStageFiveAcceptanceReady({ ...state, hasDeliveryDocument: false }), false);
  assert.equal(
    isStageFiveAcceptanceReady({
      ...state,
      packageChecks: { ...state.packageChecks, demoScript: false },
    }),
    false,
  );
  assert.equal(isStageFiveAcceptanceReady({ ...state, reviewDone: false }), false);
  assert.equal(isStageFiveAcceptanceReady({ ...state, signoffNote: "太短" }), false);
});

test("stage five delivery acceptance model mirrors Open Design handoff workflow", () => {
  assert.deepEqual(
    stageFiveAcceptanceAgendaItems.map((item) => item.title),
    ["确认交付对象", "演示核心用例", "回答客户追问", "形成验收结论"],
  );
  assert.deepEqual(
    stageFiveDeliveryPackageItems.map((item) => item.label),
    [
      "Dify 发布链接",
      "平台自动化测试记录",
      "客户使用说明",
      "已知限制说明",
      "维护与更新说明",
      "客户演示脚本",
      "下一版本建议",
    ],
  );
  assert.deepEqual(
    stageFiveAcceptanceReadinessGates.map((gate) => gate.label),
    ["交付对象完整", "交付包清单完成", "交付说明文档已提交", "模拟验收已完成", "验收结论已确认"],
  );
  assert.deepEqual(
    stageFiveSignoffOptions.map((option) => option.title),
    ["通过验收", "有条件通过", "退回修改"],
  );
  assert.deepEqual(stageFiveDemoScriptSteps, [
    "展示应用链接与知识库来源。",
    "演示批次追溯和 SOP 引用问题。",
    "演示资料不足时的边界提示。",
    "说明维护责任与下一版本计划。",
  ]);
});

test("stage five acceptance interaction copy mirrors Open Design toasts and demo script", () => {
  assert.equal(stageFiveAcceptanceBlockedToast, "请先完成交付对象、清单、说明和模拟验收");
  assert.equal(stageFiveAcceptanceSavedToast, "交付验收记录已保存，可以进入项目档案袋");
  assert.equal(stageFiveDemoScriptCopyToast, "客户演示脚本已复制");
  assert.equal(stageFiveDemoScriptCopyFallbackToast, "复制失败，请手动复制侧栏脚本");
  assert.equal(
    createStageFiveDemoScriptCopyText(),
    [
      "1. 展示制造业质检追溯 AI 助手链接。",
      "2. 演示批次追溯、SOP 引用和资料不足提示。",
      "3. 说明不做责任判定、不伪造缺失数据。",
      "4. 说明知识库维护责任和下一版本计划。",
    ].join("\n"),
  );
});

test("stage five acceptance state maps to existing acceptance package payload", () => {
  const questions = createStageFiveAcceptanceQuestions();
  const payload = createStageFiveAcceptancePackagePayloadFromVNext({
    acceptanceState: fullAcceptanceState(),
    questions,
    stageFourTestReport: {
      coverage_notes: "总分：84；告警项：2；严重失败：0。",
      improvement_actions: ["T-02: 优化引用回答 Prompt", "T-05: 增加转人工路径"],
    },
  });

  assert.match(payload.acceptance_scope, /制造业质检追溯 AI 助手/);
  assert.match(payload.acceptance_scope, /有条件通过/);
  assert.equal(payload.acceptance_criteria.length, 10);
  assert.equal(payload.acceptance_criteria.some((item) => item.includes("客户追问 01")), true);
  assert.match(payload.test_evidence_summary, /总分：84/);
  assert.equal(payload.unresolved_issues.some((item) => item.includes("T-05")), true);
  assert.equal(payload.handover_checklist.length, 10);
});

test("stage five acceptance state restores from persisted artifacts", () => {
  const originalState = fullAcceptanceState();
  const questions = createStageFiveAcceptanceQuestions();
  const acceptancePackage = createStageFiveAcceptancePackagePayloadFromVNext({
    acceptanceState: originalState,
    questions,
    stageFourTestReport: {
      coverage_notes: "总分：84；告警项：2；严重失败：0。",
      improvement_actions: ["T-02: 优化引用回答 Prompt", "T-05: 增加转人工路径"],
    },
  });

  const restoredState = stageFiveAcceptanceStateFromArtifacts({
    acceptancePackage,
    deliveryDocument: {
      final_agent_url: "https://example.dify.ai/chat/manufacturing-quality-agent",
      project_name: "制造业质检追溯 AI 助手交付说明文档",
    },
    operationsGuide: {
      data_update_plan: "知识库资料应由质量负责人维护。",
    },
    stageFourImplementation: {
      dify_app_name: "制造业质检追溯 AI 助手",
      dify_app_url: "https://example.dify.ai/chat/manufacturing-quality-agent",
      knowledge_base_notes: "知识库名称：制造业质检追溯知识库 v1",
    },
    stageFourTestReport: {
      total_score: 84,
    },
  });

  assert.equal(isStageFiveAcceptanceReady(restoredState), true);
  assert.equal(restoredState.decision, originalState.decision);
  assert.equal(restoredState.signoffNote, originalState.signoffNote);
  assert.deepEqual(restoredState.target, originalState.target);
  assert.deepEqual(restoredState.packageChecks, originalState.packageChecks);
  assert.deepEqual(restoredState.archiveChecks, originalState.archiveChecks);
  assert.equal(restoredState.hasDeliveryDocument, true);
  assert.equal(restoredState.hasOperationsGuide, true);
  assert.equal(restoredState.reviewDone, true);
});

test("stage five acceptance package checks backfill from upstream delivery evidence", () => {
  const checks = stageFiveDeliveryPackageChecksFromArtifacts({
    acceptancePackage: {
      acceptance_criteria: ["标准问题命中 SOP"],
      acceptance_scope: "审厂追溯问答、资料来源说明、字段缺失提醒和越界拒答。",
    },
    deliveryDocument: {
      delivery_summary: "面向质量负责人和审厂材料准备人员的有限范围 RAG 助手。",
      final_agent_url: "https://dify.example.local/apps/mfg-quality-trace",
      known_limitations: ["字段缺失时不能自动生成结论", "责任归属必须转人工"],
      project_name: "制造业质检追溯 AI 助手交付说明文档",
    },
    operationsGuide: {
      common_issues: ["召回不到整改证明", "MES 导出字段缺失"],
      data_update_plan: "每月更新 SOP 与审厂清单，异常台账按批次追加。",
      maintenance_owner_notes: "质量部负责知识库材料更新，IT 负责权限和发布链接。",
    },
    stageFourImplementation: {
      dify_app_name: "制造业质检追溯 AI 助手",
      dify_app_url: "https://dify.example.local/apps/mfg-quality-trace",
      knowledge_base_notes: "知识库名称：制造业质检追溯知识库 v1",
    },
    stageFourTestReport: {
      improvement_actions: ["补充字段缺失提示模板", "强化责任判定拒答边界"],
      test_cases: [{ result: "passed", scenario: "标准追溯" }],
      total_score: 84,
    },
  });

  assert.deepEqual(checks, fullAcceptanceState().packageChecks);
});

test("stage five legacy acceptance package uses upstream evidence for package checklist", () => {
  const restoredState = stageFiveAcceptanceStateFromArtifacts({
    acceptancePackage: {
      acceptance_criteria: ["标准问题命中 SOP"],
      acceptance_scope: "审厂追溯问答、资料来源说明、字段缺失提醒和越界拒答。",
      unresolved_issues: ["客户验收口径待最终确认"],
    },
    deliveryDocument: {
      delivery_summary: "面向质量负责人和审厂材料准备人员的有限范围 RAG 助手。",
      final_agent_url: "https://dify.example.local/apps/mfg-quality-trace",
      known_limitations: ["字段缺失时不能自动生成结论", "责任归属必须转人工"],
      project_name: "制造业质检追溯 AI 助手交付说明文档",
    },
    operationsGuide: {
      common_issues: ["召回不到整改证明", "MES 导出字段缺失"],
      data_update_plan: "每月更新 SOP 与审厂清单，异常台账按批次追加。",
      maintenance_owner_notes: "质量部负责知识库材料更新，IT 负责权限和发布链接。",
    },
    stageFourImplementation: {
      dify_app_name: "制造业质检追溯 AI 助手",
      dify_app_url: "https://dify.example.local/apps/mfg-quality-trace",
      knowledge_base_notes: "知识库名称：制造业质检追溯知识库 v1",
    },
    stageFourTestReport: {
      improvement_actions: ["补充字段缺失提示模板", "强化责任判定拒答边界"],
      test_cases: [{ result: "passed", scenario: "标准追溯" }],
      total_score: 84,
    },
  });

  assert.equal(
    stageFiveDeliveryPackageKeys.every((key) => restoredState.packageChecks[key]),
    true,
  );
  assert.equal(restoredState.reviewDone, true);
  assert.equal(isStageFiveAcceptanceReady(restoredState), false);
});

test("stage five acceptance state restores target from acceptance package when upstream artifacts are missing", () => {
  const originalState = {
    ...fullAcceptanceState(),
    target: {
      appName: "汽车零部件审厂追溯助手",
      knowledgeName: "审厂质检知识库 2026",
      publishUrl: "https://dify.example.local/chat/audit-trace-agent",
      stageFourScore: 91,
    },
  };
  const acceptancePackage = createStageFiveAcceptancePackagePayloadFromVNext({
    acceptanceState: originalState,
    questions: createStageFiveAcceptanceQuestions(),
    stageFourTestReport: {
      total_score: 91,
    },
  });

  const restoredState = stageFiveAcceptanceStateFromArtifacts({
    acceptancePackage,
    deliveryDocument: null,
    operationsGuide: {
      data_update_plan: "知识库资料应由质量负责人维护。",
    },
    stageFourImplementation: null,
    stageFourTestReport: {
      total_score: 91,
    },
  });

  assert.deepEqual(restoredState.target, originalState.target);
});

test("stage five acceptance readiness blocks revise decision from final archive", () => {
  const state = {
    ...fullAcceptanceState(),
    decision: "revise" as const,
    signoffNote:
      "交付说明、测试结果和边界说明仍不足，需要回到阶段四测试评分和交付说明文档页面完成修订后再发起验收。",
  };

  assert.equal(isStageFiveAcceptanceReady(state), false);
});

test("stage five extracts stage four score from persisted report content", () => {
  assert.equal(stageFiveScoreFromStageFourTestReport({ total_score: 78 }), 78);
  assert.equal(
    stageFiveScoreFromStageFourTestReport({
      coverage_notes: "测试对象：制造业质检追溯 AI 助手\n总分：84\n告警项：2",
    }),
    84,
  );
  assert.equal(stageFiveScoreFromStageFourTestReport({ coverage_notes: "暂无评分" }), null);
});

test("stage five acceptance target restores from stage four test report coverage notes", () => {
  const target = stageFiveAcceptanceTargetFromArtifacts({
    deliveryDocument: null,
    stageFourImplementation: null,
    stageFourTestReport: {
      coverage_notes: [
        "测试对象：汽车零部件审厂追溯助手 / 审厂质检知识库 2026",
        "发布链接：https://dify.example.local/chat/audit-trace-agent",
        "访问说明：使用课程测试账号访问，限制校内网络。",
        "总分：91",
      ].join("\n"),
    },
  });

  assert.deepEqual(target, {
    appName: "汽车零部件审厂追溯助手",
    knowledgeName: "审厂质检知识库 2026",
    publishUrl: "https://dify.example.local/chat/audit-trace-agent",
    stageFourScore: 91,
  });
});

function completeChapterStatuses(): StageFiveChapterStatuses {
  return Object.fromEntries(stageFiveChapterKeys.map((key) => [key, "pass"])) as StageFiveChapterStatuses;
}

function fullChapterDrafts(): StageFiveChapterDrafts {
  return {
    boundary: {
      supported:
        "智能体支持围绕批次追溯、缺陷类型、质检 SOP、审厂资料准备和整改闭环记录的问答。",
      unsupported:
        "智能体不支持质量责任判定、客户索赔结论、处罚建议、替代审批和自动补齐缺失字段。",
    },
    goal: {
      purpose:
        "本项目交付一个面向制造业质检追溯场景的 AI 问答助手，帮助质量负责人准备审厂追溯证据。",
      scenario:
        "该助手适用于批次追溯、缺陷类型查询、SOP 条款确认和整改闭环材料准备，不用于质量责任判定。",
    },
    maintenance: {
      feedback:
        "客户发现回答缺少来源、引用错误、资料不足提示不清或风险边界判断不当时，应记录问题类型并进入整改闭环。",
      owner:
        "知识库资料应由质量负责人或指定维护人定期更新。新增 SOP、MES 字段或整改资料后，应重新执行召回测试和平台自动化测试。",
    },
    scope: {
      excluded:
        "未标注缺陷位置的图片、无法识别字段的纸质扫描件、缺少批次号的手工记录暂不作为确定性证据。",
      included:
        "本次知识库纳入质检 SOP、审厂资料清单、MES 批次导出记录、Excel 异常处置台账和整改闭环资料。",
    },
    test: {
      conclusion:
        "在当前资料范围和边界规则下，智能体可作为审厂追溯资料查询与准备辅助工具交付试用。",
      summary:
        "平台自动化测试覆盖正常追溯、证据引用、资料不足和风险边界四类场景，用于确认引用、边界和转人工规则。",
    },
    usage: {
      access:
        "Dify 应用发布链接仅供课程验收和授权测试使用，应同步提供访问有效期和访问限制说明。",
      answer:
        "客户应重点查看回答中的来源文件、批次记录、SOP 条款和资料缺口提示。",
      exception:
        "当智能体提示字段缺失、记录冲突或需要人工确认时，客户不应将回答作为最终质量结论。",
      questions:
        "建议客户使用“批次号 + 业务任务”或“缺陷类型 + 工序 + 资料需求”的方式提问。",
    },
  };
}

function fullAcceptanceState(): StageFiveAcceptanceState {
  return {
    archiveChecks: Object.fromEntries(stageFiveSignoffCheckKeys.map((key) => [key, true])) as Record<
      (typeof stageFiveSignoffCheckKeys)[number],
      boolean
    >,
    decision: "conditional",
    hasDeliveryDocument: true,
    hasOperationsGuide: true,
    packageChecks: Object.fromEntries(stageFiveDeliveryPackageKeys.map((key) => [key, true])) as Record<
      (typeof stageFiveDeliveryPackageKeys)[number],
      boolean
    >,
    reviewDone: true,
    signoffNote:
      "基于阶段四平台测试评分、交付说明文档和模拟客户验收追问，本项目可进入课程交付档案，但需记录引用条款和转人工路径的后续优化。",
    target: {
      appName: "制造业质检追溯 AI 助手",
      knowledgeName: "制造业质检追溯知识库 v1",
      publishUrl: "https://example.dify.ai/chat/manufacturing-quality-agent",
      stageFourScore: 84,
    },
  };
}
