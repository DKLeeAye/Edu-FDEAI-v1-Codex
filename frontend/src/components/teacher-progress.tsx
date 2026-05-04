import type {
  TeacherArtifactSummary,
  TeacherCourseProgress,
  TeacherSessionProgress,
} from "@/src/lib/api";

import { StatusPill } from "./student-workspace/common";
import { formatTime, shortId, stageLabel, stageTone } from "./student-workspace/utils";

type TeacherProgressViewProps = {
  artifacts: TeacherArtifactSummary[];
  courses: TeacherCourseProgress[];
  isLoadingArtifacts: boolean;
  onCourseChange: (courseId: string) => void;
  onSessionChange: (sessionId: string) => void;
  onStageChange: (stageKey: string) => void;
  selectedCourse: TeacherCourseProgress | null;
  selectedSession: TeacherSessionProgress | null;
  selectedStageKey: string;
};

const stageOptions = ["stage_1", "stage_2", "stage_3", "stage_4", "stage_5"];

export function TeacherProgressView({
  artifacts,
  courses,
  isLoadingArtifacts,
  onCourseChange,
  onSessionChange,
  onStageChange,
  selectedCourse,
  selectedSession,
  selectedStageKey,
}: TeacherProgressViewProps) {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-5">
        <section className="panel p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1">
              <label className="field-label" htmlFor="teacher-course">
                课程
              </label>
              <select
                className="field-select"
                id="teacher-course"
                onChange={(event) => onCourseChange(event.target.value)}
                value={selectedCourse?.id ?? ""}
              >
                {courses.length === 0 ? <option value="">暂无课程</option> : null}
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title} · {course.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0 flex-1">
              <label className="field-label" htmlFor="teacher-session">
                学生 Session
              </label>
              <select
                className="field-select"
                id="teacher-session"
                onChange={(event) => onSessionChange(event.target.value)}
                value={selectedSession?.id ?? ""}
              >
                {selectedCourse?.sessions.length ? null : <option value="">暂无 Session</option>}
                {selectedCourse?.sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.student.full_name} · {shortId(session.id)}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0 flex-1">
              <label className="field-label" htmlFor="teacher-stage">
                阶段
              </label>
              <select
                className="field-select"
                id="teacher-stage"
                onChange={(event) => onStageChange(event.target.value)}
                value={selectedStageKey}
              >
                {stageOptions.map((stageKey) => (
                  <option key={stageKey} value={stageKey}>
                    {stageLabel(stageKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title">学生进度</h2>
            <StatusPill
              label={`${selectedCourse?.sessions.length ?? 0} sessions`}
              tone="normal"
            />
          </div>
          <div className="mt-4 grid gap-3">
            {selectedCourse?.sessions.length ? (
              selectedCourse.sessions.map((session) => (
                <SessionProgressRow
                  isSelected={session.id === selectedSession?.id}
                  key={session.id}
                  onSelect={() => onSessionChange(session.id)}
                  session={session}
                />
              ))
            ) : (
              <div className="empty-state text-sm text-[color:var(--muted)]">
                当前课程暂无学生 session
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="section-title">Artifact 摘要</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              {selectedSession
                ? `${selectedSession.student.full_name} · ${stageLabel(selectedStageKey)}`
                : "请选择学生 session"}
            </p>
          </div>
          <StatusPill
            label={isLoadingArtifacts ? "loading" : `${artifacts.length} artifacts`}
            tone="accent"
          />
        </div>
        <div className="mt-4 grid gap-3">
          {artifacts.length === 0 ? (
            <div className="empty-state text-sm text-[color:var(--muted)]">
              {isLoadingArtifacts ? "正在加载 Artifact" : "当前阶段暂无 Artifact"}
            </div>
          ) : (
            artifacts.map((artifact) => (
              <article className="artifact-row" key={artifact.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill label={artifact.artifact_type} tone="accent" />
                  <span className="text-xs text-[color:var(--muted)]">
                    {formatTime(artifact.updated_at)}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                  {artifact.title}
                </h3>
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  {shortId(artifact.id)} · {artifact.status}
                </p>
                <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-xs leading-5 text-[color:var(--foreground)]">
                  {formatContent(artifact.content_json)}
                </pre>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}

function SessionProgressRow({
  isSelected,
  onSelect,
  session,
}: {
  isSelected: boolean;
  onSelect: () => void;
  session: TeacherSessionProgress;
}) {
  return (
    <button
      className={`artifact-row text-left transition ${
        isSelected ? "border-[color:var(--accent)] shadow-sm" : ""
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">
            {session.student.full_name}
          </h3>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            {session.student.email} · {shortId(session.id)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label={session.status} tone={stageTone(session.status)} />
          <StatusPill label={`${session.artifact_total_count} artifacts`} tone="normal" />
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-5">
        {session.stage_records.map((stage) => (
          <div
            className="rounded border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-2 py-2"
            key={stage.id}
          >
            <p className="text-xs font-semibold text-[color:var(--foreground)]">
              {stageLabel(stage.stage_key)}
            </p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              {stage.status} · {stage.artifact_count}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-[color:var(--muted)]">
        最近更新：{formatTime(session.updated_at)}
      </p>
    </button>
  );
}

function formatContent(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}
