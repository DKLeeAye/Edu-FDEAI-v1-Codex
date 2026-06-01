import assert from "node:assert/strict";
import test from "node:test";

import { selectPrimaryCourse } from "./course-selection.ts";

const courses = [
  { id: "late", title: "制造业质检 AI 交付验收实训" },
  { id: "qa", title: "制造业质检 AI 客户访谈实训" },
];

test("selectPrimaryCourse prefers the active course with stronger stage progress over raw course order", () => {
  const selected = selectPrimaryCourse(courses, [
    {
      course_id: "late",
      id: "late-session",
      stage_records: [
        { stage_key: "stage_1", status: "not_started" },
        { stage_key: "stage_2", status: "locked" },
      ],
      status: "not_started",
    },
    {
      course_id: "qa",
      id: "qa-session",
      stage_records: [
        { stage_key: "stage_1", status: "completed" },
        { stage_key: "stage_2", status: "completed" },
        { stage_key: "stage_3", status: "in_practice" },
      ],
      status: "in_progress",
    },
  ]);

  assert.equal(selected?.id, "qa");
});

test("selectPrimaryCourse keeps the first course when no session progress is available", () => {
  assert.equal(selectPrimaryCourse(courses, [])?.id, "late");
});
