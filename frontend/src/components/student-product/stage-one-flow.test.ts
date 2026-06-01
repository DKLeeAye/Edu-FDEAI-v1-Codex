import assert from "node:assert/strict";
import test from "node:test";

import {
  createStageOneVNextSubmitDraft,
  createGuidedConversationMessages,
  createPracticeConversationRecords,
  createStageOneProgressItems,
  deriveCustomerIdentity,
  derivePracticeInsightState,
  deriveStageOneVNextStep,
  isPlainEnterSubmitKey,
  isStageOneVNextSubmitReady,
  isStageOneFocusedStep,
  isStageOneFocusedMode,
  latestGuidedConversationScrollKey,
  latestPracticeConversationScrollKey,
  stageOneOpenDesignPracticeSeedFeedback,
  stageOneOpenDesignPracticeSeedTurns,
  type StageOneArtifactLike,
} from "./stage-one-flow.ts";
import { guidedTrainingWorkspaceGridClass } from "./stage-one-layout.ts";
import { parseAiMarkdownBlocks } from "./markdown-format.ts";

const baseArtifact = {
  content_json: {},
  created_at: "2026-05-07T08:00:00.000Z",
  id: "artifact-1",
};

test("stage one progress keeps teaching optional and derives formal chain from project artifacts", () => {
  const artifacts: StageOneArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_1_interview_turn",
      content_json: {
        ai_customer_response: "现在审厂前质检记录整理很慢。",
        user_message: "当前质检流程最卡在哪里？",
      },
    },
    {
      ...baseArtifact,
      created_at: "2026-05-07T08:10:00.000Z",
      id: "artifact-2",
      artifact_type: "stage_1_visit_notes",
      content_json: {
        confirmed_information: ["汽车零部件工厂准备大客户审厂。"],
        customer_visible_summary: "先围绕质检记录整理做小范围梳理。",
        next_visit_plan: "追问字段、样例和一线使用阻力。",
      },
    },
    {
      ...baseArtifact,
      created_at: "2026-05-07T08:20:00.000Z",
      id: "artifact-3",
      artifact_type: "stage_1_problem_summary",
      content_json: {
        business_context: "汽车零部件工厂准备大客户审厂。",
        pain_points: ["质检记录分散", "追溯证据整理慢"],
        problem_statement: "审厂前质检记录分散，人工整理慢且追溯困难。",
        success_criteria: ["审厂材料准备时间缩短"],
        target_user: "生产负责人和质检主管",
      },
    },
    {
      ...baseArtifact,
      created_at: "2026-05-07T08:30:00.000Z",
      id: "artifact-4",
      artifact_type: "stage_1_evaluation",
      content_json: {
        review_summary: "信息覆盖可进入阶段二。",
      },
    },
  ];

  const progress = createStageOneProgressItems(artifacts, "in_practice");

  assert.deepEqual(
    progress.map((item) => [item.key, item.state, item.meta]),
    [
      ["guided", "ready", "推荐完成"],
      ["practice", "done", "1 轮"],
      ["visit_notes", "done", "已整理"],
      ["problem_summary", "done", "已保存"],
      ["evaluation", "done", "已生成"],
    ],
  );
});

test("stage one progress requires visit notes before summary and evaluation", () => {
  const artifacts: StageOneArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_1_interview_turn",
      content_json: {
        ai_customer_response: "现在记录主要在纸质表和 Excel。",
        user_message: "现有记录在哪里？",
      },
    },
    {
      ...baseArtifact,
      created_at: "2026-05-07T08:10:00.000Z",
      id: "artifact-2",
      artifact_type: "stage_1_problem_summary",
      content_json: {
        business_context: "汽车零部件工厂准备大客户审厂。",
        pain_points: ["追溯证据整理慢"],
        problem_statement: "审厂准备依赖人工汇总历史质检记录。",
        success_criteria: ["减少人工整理时间"],
        target_user: "质检主管",
      },
    },
  ];

  const progress = createStageOneProgressItems(artifacts, "in_practice");

  assert.deepEqual(
    progress.map((item) => [item.key, item.state, item.meta]),
    [
      ["guided", "ready", "推荐完成"],
      ["practice", "done", "1 轮"],
      ["visit_notes", "ready", "可整理"],
      ["problem_summary", "done", "已保存"],
      ["evaluation", "locked", "待评估"],
    ],
  );
});

test("stage one progress reflects guided training completion without formal artifacts", () => {
  const progress = createStageOneProgressItems([], "not_started", {
    active_level: "pain_point",
    completed_levels: ["trust_building", "business_context"],
    status: "in_progress",
  });

  assert.deepEqual(
    progress.map((item) => [item.key, item.state, item.meta]),
    [
      ["guided", "active", "2 / 6 关"],
      ["practice", "ready", "待开始"],
      ["visit_notes", "locked", "待访谈"],
      ["problem_summary", "locked", "待整理"],
      ["evaluation", "locked", "待评估"],
    ],
  );
});

test("stage one vNext step starts at guide without formal interview evidence", () => {
  assert.equal(deriveStageOneVNextStep([], "not_started"), "guide");
});

test("stage one vNext step moves to lab after the first formal interview turn", () => {
  const artifacts: StageOneArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_1_interview_turn",
      content_json: {
        user_message: "当前质检追溯最卡在哪里？",
        ai_customer_response: "审厂前要从 MES、Excel 和纸质单里拼材料。",
      },
    },
  ];

  assert.equal(deriveStageOneVNextStep(artifacts, "in_practice"), "lab");
});

test("stage one vNext step opens submit when formal submit artifacts exist", () => {
  const artifacts: StageOneArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_1_interview_turn",
      content_json: {
        user_message: "请介绍资料来源。",
        ai_customer_response: "资料分散在 MES、Excel、纸质单和整改材料里。",
      },
    },
    {
      ...baseArtifact,
      id: "artifact-2",
      artifact_type: "stage_1_visit_notes",
      content_json: {
        confirmed_information: ["审厂追溯材料分散。"],
        risks_and_questions: ["MES 字段完整性待确认。"],
      },
    },
  ];

  assert.equal(deriveStageOneVNextStep(artifacts, "in_practice"), "submit");
});

test("stage one vNext submit draft maps interview evidence into stage one payloads", () => {
  const artifacts: StageOneArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_1_interview_turn",
      content_json: {
        user_message: "审厂追溯材料现在来自哪里？",
        ai_customer_response: "现在要从 MES、Excel、纸质单和共享文件夹里找证据。",
      },
    },
    {
      ...baseArtifact,
      id: "artifact-2",
      artifact_type: "stage_1_visit_notes",
      content_json: {
        confirmed_information: ["质检记录分散在 MES、Excel 和纸质单。"],
        requirement_hypotheses: ["需要减少审厂前人工整理追溯材料的时间。"],
        risks_and_questions: ["字段缺失时需要人工确认。"],
        next_visit_plan: "追问字段样例和验收口径。",
        customer_visible_summary: "先围绕审厂追溯材料整理做试点。",
      },
    },
  ];

  const draft = createStageOneVNextSubmitDraft(artifacts);

  assert.deepEqual(draft.quote_excerpts, [
    "现在要从 MES、Excel、纸质单和共享文件夹里找证据。",
  ]);
  assert.deepEqual(draft.visit_notes.confirmed_information, [
    "质检记录分散在 MES、Excel 和纸质单。",
  ]);
  assert.equal(
    draft.summary.problem_statement,
    "需要减少审厂前人工整理追溯材料的时间。",
  );
  assert.deepEqual(draft.summary.evidence_artifact_ids, ["artifact-1"]);
});

test("stage one vNext submit draft falls back to Open Design seed without formal artifacts", () => {
  const draft = createStageOneVNextSubmitDraft([]);

  assert.match(draft.quote_excerpts[0], /质检记录、异常处置、复检结果/);
  assert.match(draft.visit_notes.customer_visible_summary, /审厂前追溯材料准备/);
  assert.equal(draft.summary.target_user, "制造工厂质量负责人和一线质检员");
  assert.deepEqual(draft.summary.evidence_artifact_ids, ["open-design-seed-interview"]);
});

test("stage one vNext gate requires checks and formal draft fields", () => {
  const draft = createStageOneVNextSubmitDraft([
    {
      ...baseArtifact,
      artifact_type: "stage_1_interview_turn",
      content_json: {
        user_message: "审厂追溯材料现在来自哪里？",
        ai_customer_response: "现在要从 MES、Excel、纸质单和共享文件夹里找证据。",
      },
    },
  ]);

  assert.equal(
    isStageOneVNextSubmitReady(draft, {
      businessGoal: true,
      customerQuote: true,
      dataSource: true,
      projectBoundary: true,
      stageTwoInput: true,
    }),
    false,
  );
});

test("stage one vNext gate opens with complete draft fields and checks", () => {
  const draft = createStageOneVNextSubmitDraft([
    {
      ...baseArtifact,
      artifact_type: "stage_1_interview_turn",
      content_json: {
        user_message: "审厂追溯材料现在来自哪里？",
        ai_customer_response: "现在要从 MES、Excel、纸质单和共享文件夹里找证据。",
      },
    },
    {
      ...baseArtifact,
      id: "artifact-2",
      artifact_type: "stage_1_visit_notes",
      content_json: {
        confirmed_information: ["质检记录分散在 MES、Excel 和纸质单。"],
        customer_visible_summary: "围绕审厂追溯材料整理做试点。",
        next_visit_plan: "追问字段样例和验收口径。",
        requirement_hypotheses: ["需要降低审厂前人工整理追溯材料的时间。"],
        risks_and_questions: ["字段缺失时需要人工确认。"],
      },
    },
    {
      ...baseArtifact,
      id: "artifact-3",
      artifact_type: "stage_1_problem_summary",
      content_json: {
        business_context: "汽车零部件工厂准备大客户审厂。",
        pain_points: ["质检记录分散", "追溯证据整理慢"],
        problem_statement: "审厂前质检记录分散，人工整理慢且追溯困难。",
        success_criteria: ["审厂材料准备时间缩短"],
        target_user: "生产负责人和质检主管",
      },
    },
  ]);

  assert.equal(
    isStageOneVNextSubmitReady(draft, {
      businessGoal: true,
      customerQuote: true,
      dataSource: true,
      projectBoundary: true,
      stageTwoInput: true,
    }),
    true,
  );
});

test("stage one practice insights expose confirmed clue coverage without answer hints", () => {
  const artifacts: StageOneArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_1_problem_summary",
      content_json: {
        business_context: "质检记录分散在纸质表、Excel 和 ERP。",
        pain_points: ["追溯证据整理慢"],
        problem_statement: "审厂准备依赖人工汇总历史质检记录。",
        success_criteria: [],
        target_user: "质检主管",
      },
    },
  ];

  const insights = derivePracticeInsightState(artifacts, "not_started");

  assert.equal(insights.coveredCount, 4);
  assert.equal(insights.confirmedClues[4].ready, false);
  assert.equal("pendingQuestions" in insights, false);
});

test("stage one Open Design practice seed mirrors the interview lab transcript", () => {
  assert.deepEqual(
    stageOneOpenDesignPracticeSeedTurns.map((turn) => turn.kind),
    ["customer", "student", "customer", "student"],
  );
  assert.equal(
    stageOneOpenDesignPracticeSeedTurns.at(-1)?.body,
    "这些资料分散对您和一线质检员分别造成了什么影响？",
  );
  assert.match(stageOneOpenDesignPracticeSeedFeedback, /你已经抓住客户访谈线索/);
});

test("stage one shell uses focused layout only for guided and practice modes", () => {
  assert.equal(isStageOneFocusedMode("home"), false);
  assert.equal(isStageOneFocusedMode("guided"), true);
  assert.equal(isStageOneFocusedMode("practice"), true);
});

test("stage one shell uses focused layout for every Open Design vNext step", () => {
  assert.equal(isStageOneFocusedStep("guide"), true);
  assert.equal(isStageOneFocusedStep("lab"), true);
  assert.equal(isStageOneFocusedStep("submit"), true);
});

test("guided training workspace enters three columns on standard desktop widths", () => {
  assert.match(guidedTrainingWorkspaceGridClass, /xl:grid-cols-\[196px_minmax\(0,1fr\)_300px\]/);
  assert.match(guidedTrainingWorkspaceGridClass, /xl:h-\[calc\(100dvh-132px\)\]/);
  assert.doesNotMatch(guidedTrainingWorkspaceGridClass, /2xl:grid-cols/);
});

test("customer identity copy is derived from persona data", () => {
  const identity = deriveCustomerIdentity({
    name: "李娜",
    position: "质量经理",
    project_concerns: ["历史数据不稳定"],
    release_rules: ["隐藏信息需要追问才释放"],
    responsibilities: ["协调质检员", "跟进客户整改"],
  });

  assert.equal(identity.title, "李娜，质量经理");
  assert.match(identity.description, /协调质检员/);
  assert.match(identity.description, /跟进客户整改/);
  assert.deepEqual(identity.chips, ["角色：质量经理"]);
});

test("customer identity keeps long responsibilities out of chips", () => {
  const identity = deriveCustomerIdentity({
    name: "周明",
    position: "制造工厂质量负责人",
    responsibilities: [
      "协调车间、质检员和质量部准备审厂材料",
      "负责质检异常追溯和客户整改要求跟进",
      "推动质检记录从纸质和 Excel 逐步数字化",
    ],
  });

  assert.equal(identity.title, "周明，制造工厂质量负责人");
  assert.deepEqual(identity.chips, ["角色：制造工厂质量负责人"]);
  assert.ok(identity.description.length <= 62);
});

test("guided conversation starts empty until the student sends the first message", () => {
  const messages = createGuidedConversationMessages({
    levelKey: "trust_building",
    pendingTurn: null,
    seedResponse: "可以，先从职责聊起。",
    turns: [],
  });

  assert.deepEqual(messages, []);
});

test("guided conversation keeps earlier levels in one continuous dialogue", () => {
  const messages = createGuidedConversationMessages({
    levelKey: "business_context",
    pendingTurn: null,
    seedResponse: "不应该显示这句话。",
    turns: [
      {
        customer_response: "可以叫我李经理。",
        level_key: "trust_building",
        student_message: "我怎么称呼您？",
        turn_id: "turn-1",
      },
      {
        customer_response: "质检记录现在主要在纸质表和 Excel。",
        level_key: "business_context",
        student_message: "现在质检记录分别在哪里？",
        turn_id: "turn-2",
      },
    ],
  });

  assert.deepEqual(
    messages.map((message) => [message.role, message.content]),
    [
      ["student", "我怎么称呼您？"],
      ["customer", "可以叫我李经理。"],
      ["student", "现在质检记录分别在哪里？"],
      ["customer", "质检记录现在主要在纸质表和 Excel。"],
    ],
  );
});

test("guided conversation shows pending student message and customer thinking state", () => {
  const messages = createGuidedConversationMessages({
    levelKey: "trust_building",
    pendingTurn: {
      id: "pending-1",
      level_key: "trust_building",
      student_message: "我怎么称呼您？",
    },
    seedResponse: "可以，先从职责聊起。",
    turns: [],
  });

  assert.deepEqual(
    messages.map((message) => [message.role, message.content, message.loading === true]),
    [
      ["student", "我怎么称呼您？", false],
      ["customer", "客户正在思考中", true],
    ],
  );
});

test("conversation scroll keys change when the newest visible message changes", () => {
  const guidedMessages = createGuidedConversationMessages({
    levelKey: "trust_building",
    pendingTurn: {
      id: "pending-1",
      level_key: "trust_building",
      student_message: "我怎么称呼您？",
    },
    seedResponse: "可以，先从职责聊起。",
    turns: [],
  });
  const practiceRecords = createPracticeConversationRecords(
    [
      {
        answer: "现在记录主要在纸质表和 Excel。",
        id: "record-1",
        question: "现有记录在哪里？",
        time: "10:00",
      },
    ],
    { id: "pending-2", question: "还有哪些字段缺失？" },
  );

  assert.equal(
    latestGuidedConversationScrollKey(guidedMessages),
    "2:pending-1-customer-thinking:loading",
  );
  assert.equal(
    latestPracticeConversationScrollKey(practiceRecords),
    "2:pending-2:loading",
  );
});

test("practice conversation appends pending customer thinking record", () => {
  const records = createPracticeConversationRecords(
    [
      {
        answer: "现在记录主要在纸质表和 Excel。",
        id: "record-1",
        question: "现有记录在哪里？",
        time: "10:00",
      },
    ],
    { id: "pending-1", question: "我怎么称呼您？" },
  );

  assert.equal(records.length, 2);
  assert.equal(records[1].question, "我怎么称呼您？");
  assert.equal(records[1].answer, "客户正在思考中");
  assert.equal(records[1].loading, true);
});

test("plain enter submits chat input while shift enter and composing do not", () => {
  assert.equal(isPlainEnterSubmitKey({ key: "Enter" }), true);
  assert.equal(isPlainEnterSubmitKey({ key: "Enter", shiftKey: true }), false);
  assert.equal(isPlainEnterSubmitKey({ isComposing: true, key: "Enter" }), false);
  assert.equal(isPlainEnterSubmitKey({ key: "a" }), false);
});

test("AI markdown evaluation text is normalized into readable blocks", () => {
  const blocks = parseAiMarkdownBlocks(
    "### 周明访谈评估摘要 #### 信息覆盖度 1. **业务现状**：客户描述了质检流程。 2. **核心痛点**：- 质检记录分散。 - 人工整理慢。 3. **约束**：预算有限。 #### 阶段二风险 1. **技术需求不细**：需要补问字段。",
  );

  assert.deepEqual(blocks, [
    { level: 3, text: "周明访谈评估摘要", type: "heading" },
    { level: 4, text: "信息覆盖度", type: "heading" },
    {
      items: [
        "**业务现状**：客户描述了质检流程。",
        "**核心痛点**：",
      ],
      ordered: true,
      type: "list",
    },
    {
      items: ["质检记录分散。", "人工整理慢。"],
      ordered: false,
      type: "list",
    },
    {
      items: ["**约束**：预算有限。"],
      ordered: true,
      start: 3,
      type: "list",
    },
    { level: 4, text: "阶段二风险", type: "heading" },
    {
      items: ["**技术需求不细**：需要补问字段。"],
      ordered: true,
      type: "list",
    },
  ]);
});
