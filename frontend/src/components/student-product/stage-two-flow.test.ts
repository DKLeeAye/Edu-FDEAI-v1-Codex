import assert from "node:assert/strict";
import test from "node:test";

import {
  createStageTwoProgressItems,
  createStageTwoSectionProgressItems,
  createStageTwoSectionBackfillFromFormalDocuments,
  createStageTwoVNextChapterProgress,
  deriveStageTwoVNextStep,
  getStageTwoVNextChapterSpec,
  isStageTwoGuideReady,
  isStageTwoFocusedMode,
  latestStageTwoSectionReview,
  stageTwoGuideChecksFromArtifacts,
  stageTwoCanComposeDocument,
  stageTwoCanCompleteWithVNextChapters,
  stageTwoVNextChapterSpecs,
  summarizeStageTwoYellowFlags,
  type StageTwoGuideChecks,
  type StageTwoArtifactLike,
} from "./stage-two-flow.ts";

const baseArtifact = {
  content_json: {},
  created_at: "2026-05-13T08:00:00.000Z",
  id: "artifact-1",
};

test("stage two progress does not lock formal documents behind previous document reviews", () => {
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
      ["feasibility_report", "ready", "可编辑"],
      ["technical_solution", "ready", "可编辑"],
      ["stage_completion", "locked", "6 章待确认"],
    ],
  );
  assert.equal(stageTwoCanCompleteWithVNextChapters(artifacts), false);
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
      ["stage_completion", "locked", "6 章待确认"],
    ],
  );
  assert.equal(stageTwoCanCompleteWithVNextChapters(artifacts), false);
  assert.deepEqual(
    yellowFlags.map((flag) => [flag.description, flag.impactStageKey]),
    [
      ["需求文档尚未显式绑定阶段一访谈或总结证据。", "stage_2"],
      ["数据可行性仍有待确认项：需要确认异常编号与处置单的稳定关联字段", "stage_3"],
      ["总体技术方案中的构建风险需要在阶段四回应：结构化字段不稳定", "stage_4"],
    ],
  );
});

test("stage two completion becomes ready when all vNext chapters are saved", () => {
  const artifacts: StageTwoArtifactLike[] = stageTwoVNextChapterSpecs.flatMap((chapter, chapterIndex) =>
    chapter.sectionKeys.map((sectionKey, sectionIndex) => ({
      ...baseArtifact,
      created_at: `2026-05-13T09:${String(chapterIndex * 10 + sectionIndex).padStart(2, "0")}:00.000Z`,
      id: `${sectionKey}-submission`,
      artifact_type: "stage_2_section_submission",
      content_json: {
        document_type:
          sectionKey.startsWith("requirements_")
            ? "requirements_document"
            : sectionKey.startsWith("technical_")
              ? "technical_solution"
              : "feasibility_report",
        section_key: sectionKey,
      },
    })),
  );

  const progress = createStageTwoProgressItems(artifacts, "in_practice");

  assert.deepEqual(
    progress.at(-1),
    {
      key: "stage_completion",
      label: "阶段完成",
      meta: "可完成",
      state: "ready",
    },
  );
  assert.equal(stageTwoCanCompleteWithVNextChapters(artifacts), true);
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

test("stage two focused mode is enabled for every Open Design vNext step", () => {
  assert.equal(isStageTwoFocusedMode("guide"), true);
  assert.equal(isStageTwoFocusedMode("workbench"), true);
});

test("stage two vNext step starts at guide without stage two artifacts", () => {
  assert.equal(deriveStageTwoVNextStep([], "not_started"), "guide");
});

test("stage two vNext step opens workbench after any formal stage two artifact", () => {
  const artifacts: StageTwoArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_2_section_draft",
      content_json: {
        document_type: "requirements_document",
        section_key: "requirements_context",
      },
    },
  ];

  assert.equal(deriveStageTwoVNextStep(artifacts, "in_practice"), "workbench");
  assert.equal(deriveStageTwoVNextStep([], "completed"), "workbench");
});

test("stage two guide requires all four checks before entering workbench", () => {
  const partial: StageTwoGuideChecks = {
    dataBoundary: true,
    documentRoles: true,
    outOfScope: false,
    technicalPlan: true,
  };
  const complete: StageTwoGuideChecks = {
    dataBoundary: true,
    documentRoles: true,
    outOfScope: true,
    technicalPlan: true,
  };

  assert.equal(isStageTwoGuideReady(partial), false);
  assert.equal(isStageTwoGuideReady(complete), true);
});

test("stage two guide checks restore from persisted confirmation artifact", () => {
  const artifacts: StageTwoArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_2_guide_confirmation",
      content_json: {
        checks: {
          dataBoundary: true,
          documentRoles: true,
          outOfScope: true,
          technicalPlan: true,
        },
      },
      id: "guide-confirmation",
    },
  ];

  assert.deepEqual(stageTwoGuideChecksFromArtifacts(artifacts), {
    dataBoundary: true,
    documentRoles: true,
    outOfScope: true,
    technicalPlan: true,
  });
});

test("stage two vNext chapters map six report chapters onto existing nine sections", () => {
  assert.deepEqual(
    stageTwoVNextChapterSpecs.map((chapter) => [chapter.key, chapter.sectionKeys]),
    [
      ["background", ["requirements_context"]],
      ["requirement", ["requirements_scope"]],
      ["feasibility", ["feasibility_data", "feasibility_value"]],
      ["boundary", ["feasibility_technical"]],
      ["technical", ["technical_route", "technical_flow", "technical_handoff"]],
      ["acceptance", ["requirements_acceptance"]],
    ],
  );
  assert.equal(getStageTwoVNextChapterSpec("technical").title, "总体技术方案");
});

test("stage two vNext chapter progress is saved only after every mapped section is submitted", () => {
  const artifacts: StageTwoArtifactLike[] = [
    {
      ...baseArtifact,
      id: "background-submission",
      artifact_type: "stage_2_section_submission",
      content_json: {
        document_type: "requirements_document",
        section_key: "requirements_context",
      },
    },
    {
      ...baseArtifact,
      id: "data-submission",
      artifact_type: "stage_2_section_submission",
      content_json: {
        document_type: "feasibility_report",
        section_key: "feasibility_data",
      },
    },
    {
      ...baseArtifact,
      id: "value-draft",
      artifact_type: "stage_2_section_draft",
      content_json: {
        document_type: "feasibility_report",
        section_key: "feasibility_value",
      },
    },
  ];

  const progress = createStageTwoVNextChapterProgress(artifacts, "in_practice");
  const background = progress.find((chapter) => chapter.key === "background");
  const feasibility = progress.find((chapter) => chapter.key === "feasibility");

  assert.deepEqual(
    progress.map((chapter) => chapter.key),
    ["background", "requirement", "feasibility", "boundary", "technical", "acceptance"],
  );
  assert.equal(background?.state, "saved");
  assert.equal(background?.meta, "1/1 小节已确认");
  assert.equal(feasibility?.state, "needs_review");
  assert.equal(feasibility?.meta, "1/2 小节已确认");
});

test("stage two formal documents backfill vNext chapter draft fields", () => {
  const artifacts: StageTwoArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_2_requirements_document",
      content_json: {
        summary: "围绕审厂追溯和材料整理定义需求边界。",
      },
    },
    {
      ...baseArtifact,
      artifact_type: "stage_2_feasibility_report",
      content_json: {
        summary: "MES 字段可用但一致性存在风险。",
        yellow_flags: ["MES 字段不稳定", "一线录入阻力"],
      },
    },
    {
      ...baseArtifact,
      artifact_type: "stage_2_technical_solution",
      content_json: {
        route: "RAG + 转人工边界 + 审计日志",
      },
    },
  ];

  assert.equal(
    createStageTwoSectionBackfillFromFormalDocuments(
      artifacts,
      "requirements_context",
    ).project_background,
    "围绕审厂追溯和材料整理定义需求边界。",
  );
  assert.deepEqual(
    createStageTwoSectionBackfillFromFormalDocuments(artifacts, "feasibility_data")
      .data_gaps,
    ["MES 字段不稳定", "一线录入阻力"],
  );
  assert.equal(
    createStageTwoSectionBackfillFromFormalDocuments(artifacts, "technical_route")
      .agent_type_rationale,
    "RAG + 转人工边界 + 审计日志",
  );
});
