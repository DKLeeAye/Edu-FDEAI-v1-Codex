"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  GitBranch,
  SearchX,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type { StageThreeCaseStudyRecordPayload } from "@/src/lib/api";

import { createCaseStudyRecordPayload } from "./stage-three-process-records";
import {
  createCaseTeachingLessons,
  createDiagnosticRoutes,
  getCaseTeachingLesson,
  summarizeCaseTeachingReadiness,
  type CaseTeachingLesson,
  type CaseTeachingLessonKey,
} from "./stage-three-case-teaching";
import { StatusBadge } from "./ui";

const lessonIcons: Record<CaseTeachingLessonKey, ReactNode> = {
  chunking_failure: <GitBranch aria-hidden size={18} />,
  data_quality: <ClipboardCheck aria-hidden size={18} />,
  diagnostic_map: <Eye aria-hidden size={18} />,
  retrieval_failure: <SearchX aria-hidden size={18} />,
};

export function StageThreeCaseTeaching({
  disabled,
  isSavingRecord,
  onSaveRecord,
  recordSaved,
}: {
  disabled: boolean;
  isSavingRecord: boolean;
  onSaveRecord: (payload: StageThreeCaseStudyRecordPayload) => Promise<boolean>;
  recordSaved: boolean;
}) {
  const lessons = useMemo(() => createCaseTeachingLessons(), []);
  const [activeLessonKey, setActiveLessonKey] = useState<CaseTeachingLessonKey>("data_quality");
  const [visited, setVisited] = useState<CaseTeachingLessonKey[]>(["data_quality"]);
  const activeLesson = getCaseTeachingLesson(activeLessonKey);
  const readiness = summarizeCaseTeachingReadiness(visited);
  const canSave = !disabled && readiness.completedCount === readiness.totalCount;

  function selectLesson(key: CaseTeachingLessonKey) {
    setActiveLessonKey(key);
    setVisited((current) => (current.includes(key) ? current : [...current, key]));
  }

  async function handleSaveRecord() {
    if (!canSave || isSavingRecord) {
      return;
    }
    await onSaveRecord(createCaseStudyRecordPayload(visited));
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-[18px] border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="教学入口" tone="info" />
              <StatusBadge label={`${readiness.completedCount} / ${readiness.totalCount} 已查看`} tone="success" />
            </div>
            <h3 className="mt-4 text-2xl font-extrabold leading-tight text-slate-950">预置案例教学</h3>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-500">
              先看别人的案例，不碰自己的项目。目标是让学生建立直觉：坏数据、坏分块、坏召回分别长什么样，以及如何做第一轮诊断。
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500 xl:w-[360px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-extrabold text-slate-950">学习边界</p>
              <StatusBadge label={recordSaved ? "已保存记录" : "过程记录"} tone={recordSaved ? "success" : "muted"} />
            </div>
            <p className="mt-1">{readiness.note}</p>
            <button
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canSave || isSavingRecord}
              onClick={() => void handleSaveRecord()}
              type="button"
            >
              {isSavingRecord ? "保存中" : recordSaved ? "更新案例学习记录" : "保存案例学习记录"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[18px] border border-slate-200 bg-white p-4">
          <p className="px-2 text-xs font-extrabold text-slate-400">案例目录</p>
          <div className="mt-3 grid gap-2">
            {lessons.map((lesson, index) => {
              const active = activeLessonKey === lesson.key;
              const done = visited.includes(lesson.key);
              return (
                <button
                  className={`flex min-h-[82px] items-center gap-3 rounded-2xl border px-3 text-left transition ${
                    active
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200 hover:bg-white"
                  }`}
                  key={lesson.key}
                  onClick={() => selectLesson(lesson.key)}
                  type="button"
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${active ? "bg-emerald-600 text-white" : "bg-white text-emerald-700"}`}>
                    {lessonIcons[lesson.key]}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-extrabold text-slate-400">0{index + 1}</span>
                    <span className="block text-sm font-extrabold">{lesson.label}</span>
                    <span className="mt-1 block text-xs font-bold text-slate-500">{done ? "已查看" : "待查看"}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="grid gap-4">
          <TeachingPoint lesson={activeLesson} />
          <ComparisonBoard lesson={activeLesson} />
          <DiagnosticMap />
        </div>
      </div>
    </section>
  );
}

function TeachingPoint({ lesson }: { lesson: CaseTeachingLesson }) {
  return (
    <section className="grid gap-3 rounded-[18px] border border-slate-200 bg-white p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.55fr)]">
      <div className="rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-emerald-700">
          <Sparkles aria-hidden size={18} />
          <p className="text-xs font-extrabold">知识点说明</p>
        </div>
        <p className="mt-2 text-sm leading-7 text-slate-600">{lesson.teachingPoint}</p>
      </div>
      <div className="rounded-2xl bg-amber-50 p-4">
        <div className="flex items-center gap-2 text-amber-700">
          <AlertTriangle aria-hidden size={18} />
          <p className="text-xs font-extrabold">对比问题</p>
        </div>
        <p className="mt-2 text-sm leading-7 text-amber-900">{lesson.comparisonQuestion}</p>
      </div>
    </section>
  );
}

function ComparisonBoard({ lesson }: { lesson: CaseTeachingLesson }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <ExampleCard
        content={lesson.badExample}
        icon={<XCircle aria-hidden size={18} />}
        signals={lesson.badSignals}
        title="坏例子"
        tone="bad"
      />
      <ExampleCard
        content={lesson.goodExample}
        icon={<CheckCircle2 aria-hidden size={18} />}
        signals={lesson.goodSignals}
        title="好例子"
        tone="good"
      />
    </section>
  );
}

function ExampleCard({
  content,
  icon,
  signals,
  title,
  tone,
}: {
  content: string;
  icon: ReactNode;
  signals: string[];
  title: string;
  tone: "bad" | "good";
}) {
  const bad = tone === "bad";
  return (
    <article className={`rounded-[18px] border p-5 ${bad ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
      <div className={`flex items-center gap-2 ${bad ? "text-rose-700" : "text-emerald-700"}`}>
        {icon}
        <h3 className="text-base font-extrabold">{title}</h3>
      </div>
      <pre className="mt-4 min-h-[180px] whitespace-pre-wrap rounded-2xl bg-white/80 p-4 text-sm leading-7 text-slate-700">
        {content}
      </pre>
      <div className="mt-4 grid gap-2">
        {signals.map((signal) => (
          <div className="flex items-start gap-2 rounded-2xl bg-white/70 p-3 text-sm font-bold text-slate-700" key={signal}>
            {bad ? (
              <XCircle aria-hidden className="mt-0.5 shrink-0 text-rose-600" size={15} />
            ) : (
              <CheckCircle2 aria-hidden className="mt-0.5 shrink-0 text-emerald-600" size={15} />
            )}
            <span>{signal}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function DiagnosticMap() {
  const routes = createDiagnosticRoutes();
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">三类诊断地图</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            看完好坏对比后，学生需要把失败现象归到可行动的诊断路径。
          </p>
        </div>
        <StatusBadge label="先诊断，再调参" tone="warning" />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {routes.map((route) => (
          <article className="flex min-h-[280px] flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4" key={route.failure}>
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-base font-extrabold text-slate-950">{route.title}</h4>
              <ArrowRight aria-hidden className="text-emerald-700" size={18} />
            </div>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-700">{route.primaryCheck}</p>
            <div className="mt-4">
              <p className="text-xs font-extrabold text-slate-400">常见原因</p>
              <ul className="mt-2 grid gap-2">
                {route.causes.map((cause) => (
                  <li className="flex gap-2 text-sm leading-6 text-slate-600" key={cause}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-auto rounded-2xl bg-slate-950 p-3">
              <p className="text-xs font-extrabold text-emerald-200">下一步动作</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">{route.nextAction}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
