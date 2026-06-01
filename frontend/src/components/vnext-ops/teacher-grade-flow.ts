import type {
  TeacherGradeDraftPayload,
  TeacherGradeExport,
  TeacherGradeExportRow,
  TeacherSessionProgress,
} from "@/src/lib/api";

export function createTeacherGradeDraftPayload(
  session: TeacherSessionProgress,
): TeacherGradeDraftPayload {
  const totalStages = Math.max(session.stage_records.length, 1);
  const completedStages = session.stage_records.filter((stage) => stage.status === "completed").length;
  const completionScore = Math.round((completedStages / totalStages) * 45);
  const artifactScore = Math.min(session.artifact_total_count, 10) * 2;
  const overallScore = Math.max(0, Math.min(100, 45 + completionScore + artifactScore));
  const teacherJudgementScore = Math.min(35, Math.max(0, overallScore - completionScore - artifactScore));

  return {
    overall_score: overallScore,
    rubric_scores: [
      {
        comment: `${completedStages} / ${totalStages} 个阶段已完成。`,
        dimension_key: "stage_completion",
        dimension_name: "阶段完成度",
        max_score: 45,
        score: completionScore,
      },
      {
        comment: `${session.artifact_total_count} 个 Artifact 纳入教师复核。`,
        dimension_key: "artifact_evidence",
        dimension_name: "证据链完整度",
        max_score: 20,
        score: artifactScore,
      },
      {
        comment: "教师发布前需结合 AI Rubric 与课堂表现最终确认。",
        dimension_key: "teacher_judgement",
        dimension_name: "教师综合判断",
        max_score: 35,
        score: teacherJudgementScore,
      },
    ],
    comment: `${session.student.full_name} 的项目成绩草稿由当前阶段进度和 Artifact 证据生成，发布前需教师最终确认。`,
  };
}

export function findGradeExportRow(
  gradeExport: TeacherGradeExport | null,
  sessionId: string,
): TeacherGradeExportRow | null {
  return gradeExport?.rows.find((row) => row.session_id === sessionId) ?? null;
}
