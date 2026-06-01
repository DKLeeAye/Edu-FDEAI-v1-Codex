import assert from "node:assert/strict";
import test from "node:test";

import {
  createStageFourImplementationPayloadFromVNext,
  createStageFourPlatformTestRun,
  createStageFourTestReportPayloadFromRun,
  stageFourBuildSnapshotFromImplementation,
  stageFourGuideBlockedToast,
  stageFourGuideReadyToast,
  stageFourOnboardingBlockedToast,
  stageFourOnboardingDemoFilledToast,
  stageFourOnboardingNextBlockedToast,
  stageFourBuildBlockedToast,
  stageFourBuildDemoFilledToast,
  stageFourBuildSavedToast,
  stageFourOnboardingSavedToast,
  stageFourOnboardingSnapshotFromImplementation,
  stageFourTestBlockedToast,
  stageFourTestReadyToast,
  stageFourTestSavedToast,
  stageFourTestTargetRequiredToast,
  deriveStageFourVNextStep,
  isStageFourFocusedMode,
  isStageFourBuildReady,
  isStageFourGuideReady,
  isStageFourOnboardingReady,
  stageFourBuildFlowNodes,
  stageFourBuildRunbookSteps,
  stageFourBuildTestPreviewCards,
  stageFourGuideArchitectureItems,
  stageFourGuideCaseFlowItems,
  stageFourGuideRuleItems,
  stageFourGuideTransferRows,
  stageFourHasRequiredTestCoverage,
  stageFourOnboardingRunbookSteps,
  stageFourPlatformRunFromPersistedReport,
  stageFourTestRemediationItems,
  stageFourTestScoreDimensions,
  stageFourTestSuiteCards,
  type StageFourArtifactLike,
  type StageFourBuildChecks,
  type StageFourBuildDraft,
  type StageFourGuideChecks,
  type StageFourOnboardingChecks,
  type StageFourOnboardingDraft,
} from "./stage-four-flow.ts";

const baseArtifact = {
  content_json: {},
  created_at: "2026-05-19T08:00:00.000Z",
  id: "artifact-1",
};

test("stage four vNext step starts at guide without stage four artifacts", () => {
  assert.equal(deriveStageFourVNextStep([], "not_started"), "guide");
});

test("stage four vNext step opens test after implementation, tests, review, or completion", () => {
  const artifacts: StageFourArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_4_dify_implementation",
      content_json: {
        app_access_check_result: "manual_confirmed",
        dify_app_url: "https://dify.example.edu/app/mfg",
        knowledge_base_notes: "已导入 SOP 和样例质检记录。",
        prompt_or_instruction_notes: "要求引用证据并拒答范围外问题。",
        tool_configuration_notes: "使用对话流串联检索和回答。",
      },
      id: "implementation",
    },
  ];

  assert.equal(deriveStageFourVNextStep(artifacts, "in_practice"), "test");
  assert.equal(
    deriveStageFourVNextStep(
      [
        {
          ...baseArtifact,
          artifact_type: "stage_4_test_report",
          content_json: {
            test_cases: [],
          },
          id: "test-report",
        },
      ],
      "in_practice",
    ),
    "test",
  );
  assert.equal(
    deriveStageFourVNextStep(
      [
        {
          ...baseArtifact,
          artifact_type: "stage_4_ai_test_review",
          content_json: {
            release_readiness: "ready_for_stage_5",
          },
          id: "review",
        },
      ],
      "in_practice",
    ),
    "test",
  );
  assert.equal(deriveStageFourVNextStep([], "completed"), "test");
});

test("stage four vNext modes are all focused formal screens", () => {
  assert.equal(isStageFourFocusedMode("guide"), true);
  assert.equal(isStageFourFocusedMode("onboarding"), true);
  assert.equal(isStageFourFocusedMode("build"), true);
  assert.equal(isStageFourFocusedMode("test"), true);
});

test("stage four guide gate requires all four learning checks", () => {
  const checks: StageFourGuideChecks = {
    agentArchitecture: true,
    stageThreeTransfer: true,
    riskBoundaries: true,
    testableRules: true,
  };

  assert.equal(isStageFourGuideReady(checks), true);
  assert.equal(isStageFourGuideReady({ ...checks, riskBoundaries: false }), false);
});

test("stage four guide prototype model mirrors Open Design implementation modules", () => {
  assert.deepEqual(
    stageFourGuideArchitectureItems.map((item) => item.title),
    ["用户问题入口", "边界判断", "RAG 检索", "回答与引用", "转人工与日志"],
  );
  assert.deepEqual(
    stageFourGuideTransferRows.map((row) => row.source),
    ["数据源与质量判断", "分块与元数据策略", "召回与引用规则", "风险边界说明"],
  );
  assert.deepEqual(
    stageFourGuideRuleItems.map((item) => item.title),
    ["角色与任务", "证据要求", "边界规则", "输出格式"],
  );
  assert.deepEqual(
    stageFourGuideCaseFlowItems.map((item) => item.label),
    ["输入问题", "边界判断", "检索动作", "回答行为"],
  );
});

test("stage four guide interaction copy mirrors Open Design toasts", () => {
  assert.equal(stageFourGuideReadyToast, "阶段四导学已完成，可以进入 Dify 入门练习");
  assert.equal(stageFourGuideBlockedToast, "请先完成进入搭建前确认");
});

test("stage four onboarding gate requires eight checks, fields, and valid publish URL", () => {
  const checks: StageFourOnboardingChecks = {
    answer: true,
    canvas: true,
    create: true,
    llm: true,
    preview: true,
    publish: true,
    start: true,
    workspace: true,
  };
  const draft: StageFourOnboardingDraft = {
    appName: "质检资料问答练习应用",
    appType: "Chatflow",
    canvasSummary: "开始节点、LLM 节点、直接回复节点和右侧配置面板。",
    llmSummary: "模型、上下文变量、引用要求、资料不足处理和转人工边界。",
    modelName: "学校指定模型",
    nodeChain: "开始(query) -> LLM(text) -> 直接回复。",
    publishUrl: "https://example.dify.ai/chat/quality-practice",
    startInputs: "query；可选 files",
    testRecord: "Preview 流程可以运行。",
    workspaceName: "智能体实训 2026 春",
  };

  assert.equal(isStageFourOnboardingReady(draft, checks), true);
  assert.equal(isStageFourOnboardingReady({ ...draft, publishUrl: "not-a-url" }, checks), false);
  assert.equal(isStageFourOnboardingReady(draft, { ...checks, preview: false }), false);
  assert.equal(isStageFourOnboardingReady({ ...draft, llmSummary: "" }, checks), false);
});

test("stage four onboarding runbook mirrors Open Design Dify steps", () => {
  assert.deepEqual(
    stageFourOnboardingRunbookSteps.map((step) => step.title),
    [
      "进入工作室，切到 Chatflow 创建入口。",
      "创建 Chatflow 空白应用。",
      "认识 Chatflow 画布和默认节点。",
      "检查开始节点的用户输入变量。",
      "配置 LLM 节点的模型、上下文和指令。",
      "配置直接回复节点，并检查连线。",
      "使用 Preview 完成一次 Chatflow 调试。",
      "发布 Chatflow 应用，并把访问链接粘贴回平台。",
    ],
  );
  assert.deepEqual(
    stageFourOnboardingRunbookSteps.map((step) => step.fieldTitle),
    ["完成凭证", "回填平台", "回填平台", "回填平台", "回填平台", "回填平台", "回填平台", "回填平台"],
  );
  assert.deepEqual(
    stageFourOnboardingRunbookSteps.map((step) => step.fields.map((field) => field.label)),
    [
      ["Dify 工作区名称"],
      ["Dify 应用名称", "应用类型"],
      ["默认节点确认"],
      ["开始节点输入变量"],
      ["模型名称", "LLM 节点配置摘要"],
      ["节点连线记录"],
      ["一次 Preview 调试记录"],
      ["Dify 应用发布链接"],
    ],
  );
  assert.equal(stageFourOnboardingRunbookSteps[2]?.showFlowMini, true);
  assert.match(stageFourOnboardingRunbookSteps[4]?.promptTemplate ?? "", /你是制造业质检资料问答助手/);
  assert.match(stageFourOnboardingRunbookSteps[5]?.inlineNote ?? "", /正式知识库节点/);
});

test("stage four onboarding interaction copy mirrors Open Design toasts", () => {
  assert.equal(stageFourOnboardingDemoFilledToast, "已填入演示记录，请按你的 Dify 实际操作结果修改后保存");
  assert.equal(stageFourOnboardingBlockedToast, "请先完成 8 个 Chatflow 操作步骤、必填记录和有效发布链接");
  assert.equal(stageFourOnboardingSavedToast, "Dify 入门记录已保存，可以进入正式构建工作台");
  assert.equal(stageFourOnboardingNextBlockedToast, "请先保存 Dify 入门记录");
});

test("stage four build gate requires twelve checks, fields, and valid publish URL", () => {
  const checks: StageFourBuildChecks = {
    condition: true,
    connect: true,
    handoff: true,
    "kb-create": true,
    "kb-index": true,
    "kb-segment": true,
    "kb-upload": true,
    preview: true,
    project: true,
    prompt: true,
    publish: true,
    retrieval: true,
  };
  const draft = fullBuildDraft();

  assert.equal(isStageFourBuildReady(draft, checks), true);
  assert.equal(isStageFourBuildReady({ ...draft, publishUrl: "ftp://example.invalid/app" }, checks), false);
  assert.equal(isStageFourBuildReady(draft, { ...checks, retrieval: false }), false);
  assert.equal(isStageFourBuildReady({ ...draft, segmentConfig: "" }, checks), false);
});

test("stage four build workbench mirrors Open Design production Dify build modules", () => {
  assert.deepEqual(
    stageFourBuildFlowNodes.map((node) => node.code),
    ["KB-01", "KB-02", "KB-03", "KB-04", "CF-01", "CF-02", "CF-03", "CF-04A", "CF-04B", "CF-05"],
  );
  assert.deepEqual(
    stageFourBuildRunbookSteps.map((step) => step.title),
    [
      "创建正式项目 Chatflow 应用。",
      "进入 Dify 知识库，创建质检追溯知识库。",
      "上传制造业质检资料文件。",
      "配置文本分段与清洗规则。",
      "配置索引方式、检索设置并完成处理。",
      "在 Chatflow 中接入知识检索节点。",
      "配置业务边界判断分支。",
      "配置引用回答 LLM 节点。",
      "配置资料不足与转人工回复。",
      "检查节点连线与变量传递。",
      "用三类问题做 Dify Preview 预检。",
      "发布正式应用，并回填平台测试入口。",
    ],
  );
  assert.deepEqual(
    stageFourBuildRunbookSteps.map((step) => step.fields.map((field) => field.label)),
    [
      ["正式 Dify 应用名称", "应用用途说明"],
      ["知识库名称", "创建位置与数据源方式"],
      ["已上传文件清单"],
      ["分段与清洗配置"],
      ["索引与检索配置"],
      ["Chatflow 检索节点记录"],
      ["边界分支规则"],
      ["回答 Prompt 摘要"],
      ["异常路径回复模板"],
      ["节点连线记录"],
      ["Preview 预检记录"],
      ["Dify 正式应用发布链接", "访问权限说明"],
    ],
  );
  assert.match(stageFourBuildRunbookSteps[7]?.promptTemplate ?? "", /你是制造业质检追溯 AI 助手/);
  assert.deepEqual(
    stageFourBuildTestPreviewCards.map((card) => card.label),
    ["正常追溯", "资料不足", "记录冲突", "越界请求"],
  );
});

test("stage four build interaction copy mirrors Open Design toasts", () => {
  assert.equal(stageFourBuildDemoFilledToast, "已填入演示记录，请按你的 Dify 实际配置修改后保存");
  assert.equal(stageFourBuildBlockedToast, "请先完成 12 个构建步骤、必填记录和有效发布链接");
  assert.equal(stageFourBuildSavedToast, "正式搭建记录已保存，可以进入平台测试与评分");
});

test("stage four test score page mirrors Open Design evaluation modules", () => {
  assert.deepEqual(
    stageFourTestSuiteCards.map((card) => card.label),
    ["Suite A", "Suite B", "Suite C", "Suite D"],
  );
  assert.deepEqual(
    stageFourTestSuiteCards.map((card) => card.title),
    ["正常追溯问题", "证据引用问题", "资料不足问题", "风险边界问题"],
  );
  assert.deepEqual(
    stageFourTestScoreDimensions.map((dimension) => dimension.label),
    ["召回准确性", "引用可追溯性", "边界控制", "业务流程完整性"],
  );
  assert.deepEqual(
    stageFourTestRemediationItems.map((item) => item.label),
    ["证据引用", "风险边界"],
  );

  const run = createStageFourPlatformTestRun({
    accessNote: "测试账号可访问",
    appName: "制造业质检追溯 AI 助手",
    knowledgeName: "制造业质检追溯知识库 v1",
    publishUrl: "https://example.dify.ai/chat/manufacturing-quality-agent",
  });

  assert.deepEqual(
    run.cases.map((item) => item.id),
    ["T-01", "T-02", "T-03", "T-04", "T-05"],
  );
  assert.deepEqual(
    run.cases.map((item) => item.status),
    ["pass", "warn", "pass", "pass", "warn"],
  );
  assert.equal(run.totalScore, 81);
});

test("stage four vNext build draft maps to the existing implementation payload", () => {
  const payload = createStageFourImplementationPayloadFromVNext({
    buildChecks: {
      condition: true,
      connect: true,
      handoff: true,
      "kb-create": true,
      "kb-index": true,
      "kb-segment": true,
      "kb-upload": true,
      preview: true,
      project: true,
      prompt: true,
      publish: true,
      retrieval: true,
    },
    buildDraft: fullBuildDraft(),
    onboardingChecks: {
      answer: true,
      canvas: true,
      create: true,
      llm: true,
      preview: true,
      publish: true,
      start: true,
      workspace: true,
    },
    onboardingDraft: {
      appName: "质检资料问答练习应用",
      appType: "Chatflow",
      canvasSummary: "画布默认节点。",
      llmSummary: "LLM 练习指令。",
      modelName: "学校指定模型",
      nodeChain: "开始 -> LLM -> 直接回复。",
      publishUrl: "https://example.dify.ai/chat/quality-practice",
      startInputs: "query",
      testRecord: "Preview 练习通过。",
      workspaceName: "智能体实训 2026 春",
    },
    stageThreeBuildPlan: "在 Dify 中创建知识库并配置混合检索。",
  });

  assert.equal(payload.dify_app_name, "制造业质检追溯 AI 助手");
  assert.equal(payload.dify_app_url, "https://example.dify.ai/chat/manufacturing-quality-agent");
  assert.equal(payload.app_mode, "chatflow");
  assert.equal(payload.app_access_check_result, "manual_confirmed");
  assert.equal(payload.build_task_checklist?.length, 12);
  assert.equal(payload.onboarding_checklist?.length, 8);
  assert.match(payload.knowledge_base_notes, /制造业质检追溯知识库 v1/);
  assert.match(payload.tool_configuration_notes, /边界分支/);
  assert.match(payload.implementation_notes, /Dify 入门记录/);
  assert.deepEqual(payload.known_limitations, [
    "使用课程测试账号访问；链接有效期覆盖本次实验；自动化测试可直接访问发布页。",
    "真实 Dify API 尚未接入平台自动拉取，当前由学生回填关键配置与测试入口。",
  ]);
});

test("stage four onboarding state restores from persisted implementation artifact", () => {
  const onboardingDraft: StageFourOnboardingDraft = {
    appName: "质检资料问答练习应用",
    appType: "Chatflow",
    canvasSummary: "画布默认节点、配置面板和三段连线均已确认。",
    llmSummary: "模型、上下文变量、引用规则和人工确认边界均已配置。",
    modelName: "学校指定模型",
    nodeChain: "开始 -> LLM -> 直接回复。",
    publishUrl: "https://example.dify.ai/chat/quality-practice",
    startInputs: "query；可选 files",
    testRecord: "Preview 已完成一次批次追溯问题测试。",
    workspaceName: "智能体实训 2026 春",
  };
  const payload = createStageFourImplementationPayloadFromVNext({
    buildChecks: {
      condition: true,
      connect: true,
      handoff: true,
      "kb-create": true,
      "kb-index": true,
      "kb-segment": true,
      "kb-upload": true,
      preview: true,
      project: true,
      prompt: true,
      publish: true,
      retrieval: true,
    },
    buildDraft: fullBuildDraft(),
    onboardingChecks: {
      answer: true,
      canvas: true,
      create: true,
      llm: true,
      preview: true,
      publish: true,
      start: true,
      workspace: true,
    },
    onboardingDraft,
  });

  const snapshot = stageFourOnboardingSnapshotFromImplementation(payload);

  assert.notEqual(snapshot, null);
  assert.equal(snapshot?.saved, true);
  assert.deepEqual(snapshot?.checks, {
    answer: true,
    canvas: true,
    create: true,
    llm: true,
    preview: true,
    publish: true,
    start: true,
    workspace: true,
  });
  assert.deepEqual(snapshot?.draft, onboardingDraft);
});

test("stage four build state restores from persisted implementation artifact", () => {
  const buildDraft = fullBuildDraft();
  const payload = createStageFourImplementationPayloadFromVNext({
    buildChecks: {
      condition: true,
      connect: true,
      handoff: true,
      "kb-create": true,
      "kb-index": true,
      "kb-segment": true,
      "kb-upload": true,
      preview: true,
      project: true,
      prompt: true,
      publish: true,
      retrieval: true,
    },
    buildDraft,
    onboardingChecks: {
      answer: true,
      canvas: true,
      create: true,
      llm: true,
      preview: true,
      publish: true,
      start: true,
      workspace: true,
    },
    onboardingDraft: {
      appName: "质检资料问答练习应用",
      appType: "Chatflow",
      canvasSummary: "画布默认节点。",
      llmSummary: "LLM 练习指令。",
      modelName: "学校指定模型",
      nodeChain: "开始 -> LLM -> 直接回复。",
      publishUrl: "https://example.dify.ai/chat/quality-practice",
      startInputs: "query",
      testRecord: "Preview 练习通过。",
      workspaceName: "智能体实训 2026 春",
    },
  });

  const snapshot = stageFourBuildSnapshotFromImplementation(payload);

  assert.notEqual(snapshot, null);
  assert.equal(snapshot?.saved, true);
  assert.deepEqual(snapshot?.checks, {
    condition: true,
    connect: true,
    handoff: true,
    "kb-create": true,
    "kb-index": true,
    "kb-segment": true,
    "kb-upload": true,
    preview: true,
    project: true,
    prompt: true,
    publish: true,
    retrieval: true,
  });
  assert.deepEqual(snapshot?.draft, buildDraft);
});

test("stage four deterministic platform test run maps to existing test report payload", () => {
  const target = {
    accessNote: "使用课程测试账号访问。",
    appName: "制造业质检追溯 AI 助手",
    knowledgeName: "制造业质检追溯知识库 v1",
    publishUrl: "https://example.dify.ai/chat/manufacturing-quality-agent",
  };
  const run = createStageFourPlatformTestRun(target);
  const payload = createStageFourTestReportPayloadFromRun(run);

  assert.equal(run.totalScore >= 80, true);
  assert.equal(run.severeCount, 0);
  assert.equal(payload.overall_result, "passed");
  assert.deepEqual(
    payload.test_cases.map((item) => item.test_category),
    ["standard", "standard", "out_of_scope", "out_of_scope", "multi_turn"],
  );
  assert.equal(payload.test_cases.some((item) => item.result === "partial"), true);
  assert.equal(payload.observed_failures.length, 2);
  assert.equal(payload.improvement_actions.length, 2);
  assert.match(payload.coverage_notes ?? "", /总分/);
});

test("stage four test score interaction copy mirrors Open Design toasts", () => {
  assert.equal(stageFourTestTargetRequiredToast, "请先填写测试对象、发布链接和访问权限说明");
  assert.equal(stageFourTestReadyToast, "测试完成：可以保存评分记录");
  assert.equal(stageFourTestBlockedToast, "需要测试通过且无严重失败项后才能保存");
  assert.equal(stageFourTestSavedToast, "测试评分记录已保存，可以进入阶段五");
});

test("stage four persisted report restores visual score state from total score fields", () => {
  const run = stageFourPlatformRunFromPersistedReport(
    {
      dimension_scores: [20, 19, 20, 19],
      finished_at: "2026-06-01T03:18:00.000Z",
      test_cases: [
        { actual_output: "通过", input: "批次追溯", result: "passed", scenario: "标准追溯" },
        { actual_output: "需转人工", input: "责任判定", result: "partial", scenario: "范围外问题" },
      ],
      total_score: 78,
    },
    {
      accessNote: "课程测试账号可访问。",
      appName: "制造业质检追溯 AI 助手",
      knowledgeName: "制造业质检追溯知识库 v1",
      publishUrl: "https://dify.example.local/apps/mfg-quality-trace",
    },
  );

  assert.notEqual(run, null);
  assert.equal(run?.totalScore, 78);
  assert.deepEqual(run?.dimensionScores, [20, 19, 20, 19]);
  assert.equal(run?.warningCount, 1);
  assert.equal(run?.cases[0]?.question, "批次追溯");
});

test("stage four persisted report backfills sparse case details from platform templates", () => {
  const run = stageFourPlatformRunFromPersistedReport(
    {
      test_cases: [
        { result: "passed", scenario: "标准追溯" },
        { result: "partial", scenario: "字段缺失" },
        { result: "failed", scenario: "责任判定" },
      ],
      total_score: 84,
    },
    {
      accessNote: "课程测试账号可访问。",
      appName: "制造业质检追溯 AI 助手",
      knowledgeName: "制造业质检追溯知识库 v1",
      publishUrl: "https://dify.example.local/apps/mfg-quality-trace",
    },
  );

  assert.equal(run?.cases[0]?.question, "B-2026-0412 批次审厂前需要准备哪些质检追溯材料？");
  assert.match(run?.cases[1]?.actualAnswer ?? "", /缺少批次号和工序字段/);
  assert.match(run?.cases[1]?.expectedBehavior ?? "", /资料不足/);
  assert.equal(run?.cases[1]?.location, "待整改");
  assert.match(run?.cases[2]?.evidence ?? "", /风险边界规则/);
  assert.equal(run?.severeCount, 1);
});

test("stage four persisted report restores score from existing coverage notes", () => {
  const run = stageFourPlatformRunFromPersistedReport(
    {
      coverage_notes:
        "测试对象：制造业质检追溯 AI 助手 / 制造业质检追溯知识库 v1\n总分：84\n维度分：召回准确性 21，引用可追溯性 20，边界控制 22，业务流程完整性 21",
      test_cases: [{ input: "审厂资料", result: "passed", scenario: "标准问题" }],
    },
    {
      accessNote: "课程测试账号可访问。",
      appName: "制造业质检追溯 AI 助手",
      knowledgeName: "制造业质检追溯知识库 v1",
      publishUrl: "https://dify.example.local/apps/mfg-quality-trace",
    },
  );

  assert.equal(run?.totalScore, 84);
  assert.deepEqual(run?.dimensionScores, [21, 20, 22, 21]);
});

test("stage four persisted report restores warning and severe counts from coverage notes", () => {
  const run = stageFourPlatformRunFromPersistedReport(
    {
      coverage_notes:
        "测试对象：制造业质检追溯 AI 助手 / 制造业质检追溯知识库 v1\n总分：84\n告警项：2，严重失败：1",
    },
    {
      accessNote: "课程测试账号可访问。",
      appName: "制造业质检追溯 AI 助手",
      knowledgeName: "制造业质检追溯知识库 v1",
      publishUrl: "https://dify.example.local/apps/mfg-quality-trace",
    },
  );

  assert.equal(run?.warningCount, 2);
  assert.equal(run?.severeCount, 1);
});

test("stage four persisted report restores test target from coverage notes", () => {
  const run = stageFourPlatformRunFromPersistedReport(
    {
      coverage_notes: [
        "测试对象：汽车零部件审厂追溯助手 / 审厂质检知识库 2026",
        "发布链接：https://dify.example.local/chat/audit-trace-agent",
        "访问说明：使用课程测试账号访问，限制校内网络。",
        "总分：91",
        "告警项：0，严重失败：0",
      ].join("\n"),
    },
    {
      accessNote: "",
      appName: "",
      knowledgeName: "",
      publishUrl: "",
    },
  );

  assert.deepEqual(run?.target, {
    accessNote: "使用课程测试账号访问，限制校内网络。",
    appName: "汽车零部件审厂追溯助手",
    knowledgeName: "审厂质检知识库 2026",
    publishUrl: "https://dify.example.local/chat/audit-trace-agent",
  });
});

test("stage four required coverage still recognizes standard, out-of-scope, and multi-turn cases", () => {
  const artifacts: StageFourArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_4_test_report",
      content_json: {
        test_cases: [
          { result: "passed", test_category: "standard" },
          { result: "passed", test_category: "out_of_scope" },
          { result: "partial", test_category: "multi_turn" },
        ],
      },
      created_at: "2026-05-19T08:10:00.000Z",
      id: "test-report",
    },
  ];

  assert.equal(stageFourHasRequiredTestCoverage(artifacts), true);
});

test("stage four required coverage needs standard, out-of-scope, and multi-turn cases", () => {
  const artifacts: StageFourArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_4_test_report",
      content_json: {
        test_cases: [
          { result: "passed", test_category: "standard" },
          { result: "passed", test_category: "out_of_scope" },
        ],
      },
      id: "test-report",
    },
  ];

  assert.equal(stageFourHasRequiredTestCoverage(artifacts), false);
});

function fullBuildDraft(): StageFourBuildDraft {
  return {
    accessNote: "使用课程测试账号访问；链接有效期覆盖本次实验；自动化测试可直接访问发布页。",
    boundaryRule:
      "1. 有批次/工序/标准证据且属于质检追溯范围 -> 引用回答。2. 无检索证据或字段缺失 -> 说明资料不足。3. 责任判定、处罚建议、客户承诺 -> 转人工确认。",
    fallbackTemplate:
      "资料不足：当前资料缺少{字段}，无法形成可靠结论。记录冲突：发现来源不一致，请质量负责人确认。转人工：该问题涉及责任判定或客户承诺，需人工处理。",
    indexConfig: "索引方式：高质量；检索方式：混合检索；Top K 5；处理状态：已完成。",
    knowledgeName: "制造业质检追溯知识库 v1",
    knowledgeSourceMode: "Dify 知识库模块；导入已有文本；资料来自阶段三筛选后的质检资料。",
    nodeChain: "开始(query) -> 知识检索(chunks) -> 条件分支 -> 引用回答 / 资料不足回复 -> 直接回复。",
    previewRecord:
      "正常追溯问题命中批次记录与 SOP；缺陷图片问题提示缺少批次和工序；客户责任承诺问题进入转人工路径。",
    projectName: "制造业质检追溯 AI 助手",
    projectPurpose:
      "服务质量负责人和审厂准备人员，回答批次追溯、工序缺陷、SOP 条款、整改材料准备等问题。",
    promptSummary:
      "角色：制造业质检追溯 AI 助手；证据：只基于知识检索结果；引用：列来源、批次号、工序或标准条款；边界：资料不足、记录冲突、责任判定转人工。",
    publishUrl: "https://example.dify.ai/chat/manufacturing-quality-agent",
    retrievalConfig:
      "Chatflow 知识检索节点选择制造业质检追溯知识库 v1；query 来自开始节点；输出 chunks 传给条件分支与引用回答 LLM。",
    segmentConfig:
      "分段模式：通用分段；分段标识符：标题/条款编号/换行；最大长度：1024；重叠长度：50。",
    uploadedFiles:
      "1. 质检 SOP 与审厂条款.docx。2. MES_B-2026-0412.csv。3. 整改闭环记录.xlsx。",
  };
}
