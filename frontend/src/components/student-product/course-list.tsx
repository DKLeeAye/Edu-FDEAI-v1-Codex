import { ArrowRight, BookOpen, Clock3 } from "lucide-react";
import type { CSSProperties } from "react";

import type { Course, ExperimentSession, LearningProfile } from "@/src/lib/api";

import {
  completionStats,
  getStageDefinition,
  pickActiveStageKey,
  profilePercent,
  projectStatusCopy,
  stageDefinitions,
} from "./terminology";
import { EmptyState, Metric, ProgressBar, StatusBadge } from "./ui";

type CourseListProps = {
  courses: Course[];
  isBusy: boolean;
  learningProfile: LearningProfile | null;
  onEnterCourse: (course: Course) => void;
  onRefresh: () => void;
  sessions: ExperimentSession[];
  studentName: string;
};

export function CourseList({
  courses,
  isBusy,
  learningProfile,
  onEnterCourse,
  onRefresh,
  sessions,
  studentName,
}: CourseListProps) {
  const activeCourseCount = courses.length;
  const firstProject = sessions[0] ?? null;
  const stats = completionStats(firstProject);
  const evidenceTotal = learningProfile
    ? Object.values(learningProfile.artifact_count_by_stage).reduce((sum, count) => sum + count, 0)
    : 0;
  const profileSummary =
    learningProfile?.next_suggestions[0] ??
    learningProfile?.strengths[0] ??
    "进入实验课程后，系统会根据阶段进度生成学习建议。";
  const profileRingStyle = {
    "--profile": `${profilePercent(learningProfile)}%`,
  } as CSSProperties;

  return (
    <div className="px-5 py-6 lg:px-8">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)]">
        <div className="grid gap-6 rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(26,33,44,.06)] lg:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-slate-950">
              选择实验课程，开始一次完整的 AI 智能体项目交付
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
              每门实验课程绑定一个行业实验包版本。进入课程后，你将围绕五阶段完成访谈、方案、知识工程、智能体实现和交付验收。
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Metric label="进行中课程" value={`${activeCourseCount}`} />
              <Metric label="项目阶段" value={`${stageDefinitions.length}`} />
              <Metric label="项目证据" value={`${evidenceTotal}`} />
            </div>
          </div>

          <div className="rounded-[18px] bg-slate-950 p-5 text-white">
            <h2 className="text-base font-extrabold">五阶段项目主线</h2>
            <div className="mt-5 grid gap-3">
              {stageDefinitions.map((stage) => {
                const completed = firstProject
                  ? firstProject.stage_records.some(
                      (record) => record.stage_key === stage.key && record.status === "completed",
                    )
                  : false;
                return (
                  <div
                    className="grid grid-cols-[32px_1fr_auto] items-center gap-3 text-xs text-slate-300"
                    key={stage.key}
                  >
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-extrabold ${
                        completed ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {stage.order}
                    </span>
                    <span>{stage.title}</span>
                    <span className="text-slate-500">{completed ? "完成" : "推进中"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(26,33,44,.06)]">
          <div
            className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-[conic-gradient(#14b8a6_0_var(--profile),#e8edf2_var(--profile)_100%)] text-2xl font-extrabold"
            style={profileRingStyle}
          >
            <span className="grid h-[88px] w-[88px] place-items-center rounded-full bg-white">
              {profilePercent(learningProfile)}%
            </span>
          </div>
          <h2 className="mt-4 text-center text-lg font-extrabold">当前学习画像</h2>
          <p className="mt-2 text-center text-sm leading-6 text-slate-500">{profileSummary}</p>
        </aside>
      </section>

      <section className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-extrabold text-slate-950">我的实验课程</h2>
          <div className="flex gap-2">
            <span className="rounded-full bg-slate-950 px-3 py-2 text-xs font-extrabold text-white">
              全部
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">
              进行中
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">
              已完成
            </span>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="暂无可进入课程">
              请先运行演示数据初始化，或等待教师发布实验课程。
            </EmptyState>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {courses.map((course) => {
              const project = sessions.find((session) => session.course_id === course.id) ?? null;
              const projectStats = completionStats(project);
              const projectStatus = projectStatusCopy(project?.status);
              return (
                <article
                  className="flex min-h-[292px] flex-col rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(26,33,44,.06)]"
                  key={course.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <StatusBadge label={courseStatusCopy(course.status)} tone="success" />
                    <span className="text-xs font-extrabold text-slate-400">{course.code}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold leading-tight text-slate-950">
                    {course.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    面向生产质检场景，训练学生完成从业务访谈到 Dify 智能体交付的完整项目流程。
                  </p>
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>项目进度</span>
                      <span>
                        {projectStats.completed} / {projectStats.total} 阶段
                      </span>
                    </div>
                    <ProgressBar percent={projectStats.percent} />
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <StatusBadge label={projectStatus.label} tone={projectStatus.tone} />
                    <span className="text-xs text-slate-400">
                      {project ? `当前阶段：${currentStageTitle(project)}` : "尚未开始"}
                    </span>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                    <button
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isBusy}
                      onClick={() => onEnterCourse(course)}
                      type="button"
                    >
                      {project ? "继续项目" : "进入实验"}
                      <ArrowRight aria-hidden size={16} />
                    </button>
                    <button
                      className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
                      disabled={isBusy}
                      onClick={onRefresh}
                      type="button"
                    >
                      刷新课程
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(26,33,44,.06)]">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-950">
            <Clock3 aria-hidden size={18} />
            最近项目动态
          </h2>
          <div className="mt-4 grid gap-3">
            <ActivityItem
              label={
                firstProject
                  ? `${studentName} 的项目记录已创建，当前进度 ${stats.completed} / ${stats.total} 阶段`
                  : "暂无项目动态"
              }
              time={firstProject ? "当前" : ""}
            />
            <ActivityItem label="项目证据会随各阶段提交持续沉淀" time="自动同步" />
            <ActivityItem label="完成当前阶段后，下一阶段会按顺序解锁" time="流程规则" />
          </div>
        </div>
        <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(26,33,44,.06)]">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-950">
            <BookOpen aria-hidden size={18} />
            下一步建议
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">{profileSummary}</p>
        </div>
      </section>
    </div>
  );
}

function ActivityItem({ label, time }: { label: string; time: string }) {
  return (
    <div className="grid grid-cols-[10px_1fr_auto] items-start gap-3 text-sm leading-6 text-slate-500">
      <span className="mt-2 h-2.5 w-2.5 rounded-full bg-emerald-500" />
      <span>{label}</span>
      <time className="text-xs font-bold text-slate-400">{time}</time>
    </div>
  );
}

function courseStatusCopy(status: string): string {
  const map: Record<string, string> = {
    active: "已发布",
    draft: "草稿",
    archived: "已归档",
  };
  return map[status] ?? "已发布";
}

function currentStageTitle(project: ExperimentSession): string {
  return getStageDefinition(pickActiveStageKey(project)).title;
}
