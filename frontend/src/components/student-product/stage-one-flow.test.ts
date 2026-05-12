import assert from "node:assert/strict";
import test from "node:test";

import {
  createGuidedConversationMessages,
  createPracticeConversationRecords,
  createStageOneProgressItems,
  deriveCustomerIdentity,
  derivePracticeInsightState,
  isPlainEnterSubmitKey,
  isStageOneFocusedMode,
  latestGuidedConversationScrollKey,
  latestPracticeConversationScrollKey,
  type StageOneArtifactLike,
} from "./stage-one-flow.ts";
import { guidedTrainingWorkspaceGridClass } from "./stage-one-layout.ts";

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
      artifact_type: "stage_1_problem_summary",
      content_json: {
        business_context: "汽车零部件工厂准备大客户审厂。",
        pain_points: ["质检记录分散", "追溯证据整理慢"],
        problem_statement: "审厂前质检记录分散，人工整理慢且追溯困难。",
        success_criteria: ["审厂材料准备时间缩短"],
        target_user: "生产负责人和质检主管",
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
      ["evaluation", "ready", "可提交"],
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
      ["problem_summary", "locked", "待保存"],
      ["evaluation", "locked", "待总结"],
    ],
  );
});

test("stage one practice insights expose confirmed clues and pending questions", () => {
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
  assert.deepEqual(insights.pendingQuestions, [
    "成功标准还不清楚，需要追问客户怎样判断项目有效。",
    "至少完成一轮项目实战拜访，让问题总结有对话证据支撑。",
  ]);
});

test("stage one shell uses focused layout only for guided and practice modes", () => {
  assert.equal(isStageOneFocusedMode("home"), false);
  assert.equal(isStageOneFocusedMode("guided"), true);
  assert.equal(isStageOneFocusedMode("practice"), true);
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
