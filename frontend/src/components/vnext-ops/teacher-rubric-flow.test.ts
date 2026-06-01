import test from "node:test";
import assert from "node:assert/strict";

import type { TeacherRubric } from "@/src/lib/api";
import { createRubricDraftForm, createTeacherRubricDraftPayload } from "./teacher-rubric-flow.ts";

const packageRubric: TeacherRubric = {
  course_id: null,
  created_at: "2026-06-01T00:00:00Z",
  id: "rubric-1",
  name: "阶段二最小 Rubric",
  package_version_id: "package-version-1",
  rubric_json: {
    items: [
      {
        key: "evidence",
        label: "证据完整性",
        score: 40,
      },
    ],
  },
  scope: "package",
  stage_key: "stage_2",
  status: "published",
  total_score: 100,
  updated_at: "2026-06-01T00:00:00Z",
  version: 1,
};

test("rubric draft form is initialized from package rubric with course customization name", () => {
  const form = createRubricDraftForm(packageRubric);

  assert.equal(form.stageKey, "stage_2");
  assert.equal(form.name, "阶段二最小 Rubric · 课程定制");
  assert.equal(form.totalScore, 100);
  assert.match(form.rubricJsonText, /"stage_key": "stage_2"/);
});

test("rubric draft payload parses json and pins the selected stage key", () => {
  const payload = createTeacherRubricDraftPayload({
    name: " 阶段二课程 Rubric ",
    rubricJsonText: "{\"items\":[],\"stage_key\":\"stage_1\"}",
    stageKey: "stage_2",
    totalScore: 120,
  });

  assert.equal(payload.name, "阶段二课程 Rubric");
  assert.equal(payload.total_score, 120);
  assert.deepEqual(payload.rubric_json, { items: [], stage_key: "stage_2" });
});

test("rubric draft payload rejects invalid json", () => {
  assert.throws(
    () =>
      createTeacherRubricDraftPayload({
        name: "非法 Rubric",
        rubricJsonText: "[1,2,3]",
        stageKey: "stage_3",
        totalScore: 100,
      }),
    /必须是对象/,
  );
});
