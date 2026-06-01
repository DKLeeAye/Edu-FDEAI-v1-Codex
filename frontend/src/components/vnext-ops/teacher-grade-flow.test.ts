import test from "node:test";
import assert from "node:assert/strict";

import type { TeacherGradeExport, TeacherSessionProgress } from "@/src/lib/api";
import { createTeacherGradeDraftPayload, findGradeExportRow } from "./teacher-grade-flow.ts";

const session: TeacherSessionProgress = {
  artifact_total_count: 4,
  course_id: "course-1",
  id: "session-1",
  stage_records: [
    {
      artifact_count: 2,
      course_id: "course-1",
      id: "stage-1",
      session_id: "session-1",
      stage_key: "stage_1",
      stage_order: 1,
      status: "completed",
      updated_at: "2026-06-01T00:00:00Z",
    },
    {
      artifact_count: 1,
      course_id: "course-1",
      id: "stage-2",
      session_id: "session-1",
      stage_key: "stage_2",
      stage_order: 2,
      status: "completed",
      updated_at: "2026-06-01T00:00:00Z",
    },
    {
      artifact_count: 1,
      course_id: "course-1",
      id: "stage-3",
      session_id: "session-1",
      stage_key: "stage_3",
      stage_order: 3,
      status: "in_progress",
      updated_at: "2026-06-01T00:00:00Z",
    },
    {
      artifact_count: 0,
      course_id: "course-1",
      id: "stage-4",
      session_id: "session-1",
      stage_key: "stage_4",
      stage_order: 4,
      status: "locked",
      updated_at: "2026-06-01T00:00:00Z",
    },
    {
      artifact_count: 0,
      course_id: "course-1",
      id: "stage-5",
      session_id: "session-1",
      stage_key: "stage_5",
      stage_order: 5,
      status: "locked",
      updated_at: "2026-06-01T00:00:00Z",
    },
  ],
  status: "in_progress",
  student: {
    email: "student@example.edu",
    full_name: "学生一",
    id: "student-1",
  },
  updated_at: "2026-06-01T00:00:00Z",
};

test("teacher grade draft payload is derived from session progress and artifacts", () => {
  const payload = createTeacherGradeDraftPayload(session);

  assert.equal(payload.overall_score, 71);
  assert.equal(payload.rubric_scores?.length, 3);
  assert.deepEqual(
    payload.rubric_scores?.map((item) => [item.dimension_key, item.score, item.max_score]),
    [
      ["stage_completion", 18, 45],
      ["artifact_evidence", 8, 20],
      ["teacher_judgement", 35, 35],
    ],
  );
  assert.match(payload.comment ?? "", /学生一/);
});

test("grade export row lookup returns the selected session status", () => {
  const gradeExport: TeacherGradeExport = {
    course_id: "course-1",
    course_title: "课程",
    generated_at: "2026-06-01T00:00:00Z",
    rows: [
      {
        comment: "已发布",
        draft_artifact_id: "draft-1",
        grade_status: "published",
        publication_artifact_id: "publication-1",
        published_at: "2026-06-01T00:00:00Z",
        published_score: 88,
        session_id: "session-1",
        student: session.student,
      },
    ],
  };

  assert.equal(findGradeExportRow(gradeExport, "session-1")?.published_score, 88);
  assert.equal(findGradeExportRow(gradeExport, "missing"), null);
});
