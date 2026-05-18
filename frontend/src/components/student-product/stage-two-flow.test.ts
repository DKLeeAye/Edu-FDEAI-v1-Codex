import assert from "node:assert/strict";
import test from "node:test";

import {
  createStageTwoProgressItems,
  createStageTwoSectionProgressItems,
  isStageTwoFocusedMode,
  latestStageTwoSectionReview,
  stageTwoCanComposeDocument,
  stageTwoCanCompleteWithFormalDocs,
  summarizeStageTwoYellowFlags,
  type StageTwoArtifactLike,
} from "./stage-two-flow.ts";

const baseArtifact = {
  content_json: {},
  created_at: "2026-05-13T08:00:00.000Z",
  id: "artifact-1",
};

test("stage two progress locks later documents until previous document review passes", () => {
  const artifacts: StageTwoArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_2_requirements_document",
      content_json: {
        project_background: "汽车零部件工厂准备审厂。",
      },
    },
  ];

  const progress = createStageTwoProgressItems(artifacts, "in_practice");

  assert.deepEqual(
    progress.map((item) => [item.key, item.state, item.meta]),
    [
      ["requirements_document", "active", "待评审"],
      ["feasibility_report", "locked", "先评审需求文档"],
      ["technical_solution", "locked", "先评审可行性报告"],
      ["stage_completion", "locked", "3 份文档待完成"],
    ],
  );
  assert.equal(stageTwoCanCompleteWithFormalDocs(artifacts), false);
});

test("stage two progress completes when three formal documents have passing reviews", () => {
  const artifacts: StageTwoArtifactLike[] = [
    {
      ...baseArtifact,
      id: "requirements",
      artifact_type: "stage_2_requirements_document",
    },
    {
      ...baseArtifact,
      created_at: "2026-05-13T08:05:00.000Z",
      id: "requirements-review",
      artifact_type: "stage_2_document_review",
      content_json: {
        document_type: "requirements_document",
        red_flags: [],
        yellow_flags: [
          {
            description: "需求文档尚未显式绑定阶段一访谈或总结证据。",
            impact_stage_key: "stage_2",
          },
        ],
        source_artifact_id: "requirements",
      },
    },
    {
      ...baseArtifact,
      created_at: "2026-05-13T08:10:00.000Z",
      id: "feasibility",
      artifact_type: "stage_2_feasibility_report",
    },
    {
      ...baseArtifact,
      created_at: "2026-05-13T08:15:00.000Z",
      id: "feasibility-review",
      artifact_type: "stage_2_document_review",
      content_json: {
        document_type: "feasibility_report",
        red_flags: [],
        yellow_flags: [
          {
            description: "数据可行性仍有待确认项：需要确认异常编号与处置单的稳定关联字段",
            impact_stage_key: "stage_3",
          },
        ],
        source_artifact_id: "feasibility",
      },
    },
    {
      ...baseArtifact,
      created_at: "2026-05-13T08:20:00.000Z",
      id: "technical",
      artifact_type: "stage_2_technical_solution",
    },
    {
      ...baseArtifact,
      created_at: "2026-05-13T08:25:00.000Z",
      id: "technical-review",
      artifact_type: "stage_2_document_review",
      content_json: {
        document_type: "technical_solution",
        red_flags: [],
        yellow_flags: [
          {
            description: "总体技术方案中的构建风险需要在阶段四回应：结构化字段不稳定",
            impact_stage_key: "stage_4",
          },
        ],
        source_artifact_id: "technical",
      },
    },
  ];

  const progress = createStageTwoProgressItems(artifacts, "in_practice");
  const yellowFlags = summarizeStageTwoYellowFlags(artifacts);

  assert.deepEqual(
    progress.map((item) => [item.key, item.state, item.meta]),
    [
      ["requirements_document", "done", "已评审"],
      ["feasibility_report", "done", "已评审"],
      ["technical_solution", "done", "已评审"],
      ["stage_completion", "ready", "可完成"],
    ],
  );
  assert.equal(stageTwoCanCompleteWithFormalDocs(artifacts), true);
  assert.deepEqual(
    yellowFlags.map((flag) => [flag.description, flag.impactStageKey]),
    [
      ["需求文档尚未显式绑定阶段一访谈或总结证据。", "stage_2"],
      ["数据可行性仍有待确认项：需要确认异常编号与处置单的稳定关联字段", "stage_3"],
      ["总体技术方案中的构建风险需要在阶段四回应：结构化字段不稳定", "stage_4"],
    ],
  );
});

test("stage two section progress requires draft review before section submission and document composition", () => {
  const artifacts: StageTwoArtifactLike[] = [
    {
      ...baseArtifact,
      id: "draft",
      artifact_type: "stage_2_section_draft",
      content_json: {
        document_type: "requirements_document",
        section_key: "requirements_context",
      },
    },
    {
      ...baseArtifact,
      created_at: "2026-05-13T08:05:00.000Z",
      id: "review",
      artifact_type: "stage_2_section_review",
      content_json: {
        can_submit: true,
        document_type: "requirements_document",
        red_flags: [],
        section_key: "requirements_context",
        source_draft_artifact_id: "draft",
      },
    },
    {
      ...baseArtifact,
      created_at: "2026-05-13T08:10:00.000Z",
      id: "submitted-context",
      artifact_type: "stage_2_section_submission",
      content_json: {
        document_type: "requirements_document",
        section_key: "requirements_context",
      },
    },
  ];

  const progress = createStageTwoSectionProgressItems(
    artifacts,
    "requirements_document",
    false,
  );

  assert.equal(latestStageTwoSectionReview(
    artifacts,
    "requirements_document",
    "requirements_context",
    "draft",
  )?.id, "review");
  assert.deepEqual(
    progress.map((item) => [item.key, item.state, item.meta]),
    [
      ["requirements_context", "submitted", "已提交"],
      ["requirements_scope", "draft", "待学习填写"],
      ["requirements_acceptance", "draft", "待学习填写"],
    ],
  );
  assert.equal(stageTwoCanComposeDocument(artifacts, "requirements_document"), false);
});

test("stage two focused mode is only enabled for the guided workbench", () => {
  assert.equal(isStageTwoFocusedMode("home"), false);
  assert.equal(isStageTwoFocusedMode("guided_workbench"), true);
});
