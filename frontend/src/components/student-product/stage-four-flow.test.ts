import assert from "node:assert/strict";
import test from "node:test";

import {
  createStageFourTaskItems,
  isStageFourFocusedMode,
  stageFourHasRequiredTestCoverage,
  type StageFourArtifactLike,
} from "./stage-four-flow.ts";

const baseArtifact = {
  content_json: {},
  created_at: "2026-05-19T08:00:00.000Z",
  id: "artifact-1",
};

test("stage four task rail starts with build tasks ready and testing locked", () => {
  const tasks = createStageFourTaskItems([], "not_started");

  assert.deepEqual(
    tasks.map((task) => [task.key, task.state, task.meta]),
    [
      ["onboarding", "active", "先确认路径"],
      ["knowledge_base", "ready", "承接阶段三"],
      ["behavior_design", "ready", "Prompt 与流程"],
      ["app_submission", "ready", "待提交链接"],
      ["test_review", "locked", "先保存构建记录"],
      ["stage_completion", "locked", "待反馈"],
    ],
  );
});

test("stage four task rail derives readiness from implementation, tests, and review", () => {
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
    {
      ...baseArtifact,
      artifact_type: "stage_4_ai_test_review",
      content_json: {
        release_readiness: "needs_revision_before_stage_5",
      },
      created_at: "2026-05-19T08:20:00.000Z",
      id: "review",
    },
  ];

  const tasks = createStageFourTaskItems(artifacts, "in_practice");

  assert.deepEqual(
    tasks.map((task) => [task.key, task.state, task.meta]),
    [
      ["onboarding", "done", "路径已确认"],
      ["knowledge_base", "done", "知识库已记录"],
      ["behavior_design", "done", "行为逻辑已记录"],
      ["app_submission", "done", "链接已提交"],
      ["test_review", "done", "已有反馈"],
      ["stage_completion", "ready", "可完成"],
    ],
  );
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

test("stage four focused mode is only enabled for the build and test workbench", () => {
  assert.equal(isStageFourFocusedMode("home"), false);
  assert.equal(isStageFourFocusedMode("build_test_workbench"), true);
});
