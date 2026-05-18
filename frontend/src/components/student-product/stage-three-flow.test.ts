import assert from "node:assert/strict";
import test from "node:test";

import {
  createStageThreeEntryItems,
  isStageThreeFocusedMode,
  type StageThreeArtifactLike,
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
  assert.equal(isStageThreeFocusedMode("home"), false);
  assert.equal(isStageThreeFocusedMode("case_teaching"), true);
  assert.equal(isStageThreeFocusedMode("knowledge_lab"), true);
  assert.equal(isStageThreeFocusedMode("project_decision"), true);
  assert.equal(isStageThreeFocusedMode("decision_document"), true);
});
