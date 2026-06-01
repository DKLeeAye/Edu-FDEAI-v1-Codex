import type { TeacherRubric, TeacherRubricDraftPayload } from "@/src/lib/api";

export type TeacherRubricDraftForm = {
  name: string;
  rubricJsonText: string;
  stageKey: string;
  totalScore: number;
};

export function createRubricDraftForm(rubric: TeacherRubric | null): TeacherRubricDraftForm {
  if (rubric === null) {
    return {
      name: "",
      rubricJsonText: "{\n  \"items\": []\n}",
      stageKey: "stage_1",
      totalScore: 100,
    };
  }

  return {
    name: rubric.scope === "course" ? rubric.name : `${rubric.name} · 课程定制`,
    rubricJsonText: JSON.stringify(
      {
        ...rubric.rubric_json,
        stage_key: rubric.stage_key,
      },
      null,
      2,
    ),
    stageKey: rubric.stage_key,
    totalScore: rubric.total_score,
  };
}

export function createTeacherRubricDraftPayload(
  form: TeacherRubricDraftForm,
): TeacherRubricDraftPayload {
  let rubricJson: unknown;
  try {
    rubricJson = JSON.parse(form.rubricJsonText);
  } catch {
    throw new Error("Rubric JSON 格式不正确");
  }
  if (typeof rubricJson !== "object" || rubricJson === null || Array.isArray(rubricJson)) {
    throw new Error("Rubric JSON 必须是对象");
  }

  return {
    name: form.name.trim(),
    rubric_json: {
      ...(rubricJson as Record<string, unknown>),
      stage_key: form.stageKey,
    },
    total_score: form.totalScore,
  };
}
