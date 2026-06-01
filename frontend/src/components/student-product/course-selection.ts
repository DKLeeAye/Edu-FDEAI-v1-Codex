import type { Course } from "@/src/lib/api";

type CourseCandidate = Pick<Course, "id">;
type SessionCandidate = {
  [key: string]: unknown;
  course_id: string;
  stage_records: Array<{ [key: string]: unknown; status: string }>;
  status: string;
};

export function selectPrimaryCourse<TCourse extends CourseCandidate>(
  courses: TCourse[],
  sessions: SessionCandidate[],
): TCourse | null {
  if (courses.length === 0) {
    return null;
  }

  const sessionByCourseId = new Map(sessions.map((session) => [session.course_id, session]));
  return courses
    .map((course, index) => ({
      course,
      index,
      score: courseProgressScore(sessionByCourseId.get(course.id)),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)[0].course;
}

function courseProgressScore(session?: SessionCandidate): number {
  if (!session) {
    return 0;
  }
  const statusScore = session.status === "in_progress" ? 1000 : session.status === "completed" ? 900 : 0;
  const stageScore = session.stage_records.reduce((total, record) => {
    if (record.status === "completed") {
      return total + 20;
    }
    if (record.status === "in_practice") {
      return total + 12;
    }
    if (record.status === "not_started") {
      return total + 4;
    }
    return total;
  }, 0);
  return statusScore + stageScore;
}
