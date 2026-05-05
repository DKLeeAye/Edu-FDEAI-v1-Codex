"use client";

import {
  ArrowLeft,
  CheckCircle2,
  FolderKanban,
  RefreshCw,
  Route,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import type { Artifact, Course, ExperimentSession, LearningProfile } from "@/src/lib/api";

import {
  completionStats,
  profilePercent,
  sanitizeProductText,
  sortStageRecords,
  stageDefinitions,
  stageStatusCopy,
  type StageKey,
} from "./terminology";
import { ProgressBar, StatusBadge } from "./ui";

type ArtifactsByStage = Record<StageKey, Artifact[]>;

type LearningProfileViewProps = {
  artifactsByStage: ArtifactsByStage;
  course: Course;
  isBusy: boolean;
  learningProfile: LearningProfile | null;
  onBackToWorkspace: () => void;
  onPortfolioOpen: () => void;
  onRefresh: () => void;
  session: ExperimentSession;
};

export function LearningProfileView({
  artifactsByStage,
  course,
  isBusy,
  learningProfile,
  onBackToWorkspace,
  onPortfolioOpen,
  onRefresh,
  session,
}: LearningProfileViewProps) {
  const profileValue = profilePercent(learningProfile);
  const profileRingStyle = {
    "--profile": `${profileValue}%`,
  } as CSSProperties;
  const progress = completionStats(session);
  const allArtifacts = Object.values(artifactsByStage).flat();
  const aiReviewCount = learningProfile
    ? Object.values(learningProfile.ai_review_count_by_stage).reduce((sum, count) => sum + count, 0)
    : 0;

  return (
    <div className="px-5 py-6 lg:px-7">
      <section className="grid gap-5 rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(26,33,44,.06)] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="学习画像" tone="success" />
            <StatusBadge label={course.code} tone="info" />
          </div>
          <h1 className="mt-5 max-w-4xl text-3xl font-extrabold leading-tight text-slate-950">
            {course.title}学习画像
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-500">
            基于当前五阶段进度、项目证据和评审反馈，即时生成完成度、优势、风险和下一步建议。
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              onClick={onBackToWorkspace}
              type="button"
            >
              <ArrowLeft aria-hidden size={16} />
              返回项目工作区
            </button>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isBusy}
              onClick={onRefresh}
              type="button"
            >
              <RefreshCw aria-hidden size={16} />
              同步画像
            </button>
          </div>
        </div>

        <div className="rounded-[18px] bg-slate-950 p-5 text-white">
          <div
            className="mx-auto grid h-32 w-32 place-items-center rounded-full bg-[conic-gradient(#14b8a6_0_var(--profile),#334155_var(--profile)_100%)] text-3xl font-extrabold"
            style={profileRingStyle}
          >
            <span className="grid h-24 w-24 place-items-center rounded-full bg-slate-950">
              {profileValue}%
            </span>
          </div>
          <h2 className="mt-5 text-center text-lg font-extrabold">当前完成度</h2>
          <p className="mt-2 text-center text-sm leading-6 text-slate-300">
            已完成 {progress.completed} / {progress.total} 个阶段
          </p>
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-4">
        <ProfileMetric label="完成阶段" value={`${progress.completed} / ${progress.total}`} />
        <ProfileMetric label="项目证据" value={`${allArtifacts.length} 项`} />
        <ProfileMetric label="评审反馈" value={`${aiReviewCount} 次`} />
        <ProfileMetric label="项目状态" value={session.status === "completed" ? "已完成" : "推进中"} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(26,33,44,.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">阶段表现分布</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  查看每个阶段的完成状态、项目证据数量和评审反馈数量。
                </p>
              </div>
              <StatusBadge label={`${profileValue}%`} tone="success" />
            </div>

            <div className="mt-4 grid gap-3">
              {stageDefinitions.map((stage) => {
                const record = sortStageRecords(session.stage_records).find(
                  (item) => item.stage_key === stage.key,
                );
                const evidenceCount =
                  learningProfile?.artifact_count_by_stage[stage.key] ??
                  artifactsByStage[stage.key].length;
                const reviewCount = learningProfile?.ai_review_count_by_stage[stage.key] ?? 0;
                return (
                  <StageProfileRow
                    evidenceCount={evidenceCount}
                    key={stage.key}
                    reviewCount={reviewCount}
                    stageKey={stage.key}
                    status={record?.status}
                  />
                );
              })}
            </div>
          </section>

          <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(26,33,44,.06)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold text-slate-950">完成度趋势</h2>
              <StatusBadge label={`${progress.percent}%`} tone="info" />
            </div>
            <ProgressBar percent={progress.percent} />
            <p className="mt-3 text-sm leading-6 text-slate-500">
              画像随阶段完成、项目证据保存和评审反馈生成自动更新，适合作为阶段复盘参考。
            </p>
          </section>
        </div>

        <aside className="grid gap-5 xl:sticky xl:top-[92px] xl:self-start">
          <InsightCard
            emptyText="完成完整项目链路后，这里会展示可复盘的能力优势。"
            icon={<Sparkles aria-hidden size={18} />}
            items={learningProfile?.strengths ?? []}
            title="优势"
            tone="success"
          />
          <InsightCard
            emptyText="暂无明显风险；继续补齐阶段证据和评审反馈。"
            icon={<ShieldAlert aria-hidden size={18} />}
            items={learningProfile?.risks ?? []}
            title="风险"
            tone="warning"
          />
          <InsightCard
            emptyText="进入项目工作区后，系统会结合当前进度给出下一步建议。"
            icon={<TrendingUp aria-hidden size={18} />}
            items={learningProfile?.next_suggestions ?? []}
            title="下一步建议"
            tone="info"
          />
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800"
            onClick={onPortfolioOpen}
            type="button"
          >
            <FolderKanban aria-hidden size={16} />
            查看项目档案袋
          </button>
        </aside>
      </section>
    </div>
  );
}

function StageProfileRow({
  evidenceCount,
  reviewCount,
  stageKey,
  status,
}: {
  evidenceCount: number;
  reviewCount: number;
  stageKey: StageKey;
  status?: string;
}) {
  const stage = stageDefinitions.find((item) => item.key === stageKey) ?? stageDefinitions[0];
  const statusCopy = stageStatusCopy(status);

  return (
    <article className="grid gap-4 rounded-[18px] border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Route aria-hidden size={18} />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-slate-950">{stage.title}</h3>
            <StatusBadge label={statusCopy.label} tone={statusCopy.tone} />
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">{stage.summary}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MiniMetric label="阶段产物" value={`${evidenceCount} 项`} />
        <MiniMetric label="评审反馈" value={`${reviewCount} 次`} />
      </div>
    </article>
  );
}

function InsightCard({
  emptyText,
  icon,
  items,
  title,
  tone,
}: {
  emptyText: string;
  icon: ReactNode;
  items: string[];
  title: string;
  tone: "info" | "success" | "warning";
}) {
  const toneClass = {
    info: "bg-sky-50 text-sky-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(26,33,44,.06)]">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-2xl ${toneClass}`}>
          {icon}
        </span>
        <h2 className="text-lg font-extrabold text-slate-950">{title}</h2>
      </div>
      <div className="mt-4 grid gap-2">
        {items.length === 0 ? (
          <p className="text-sm leading-6 text-slate-500">{emptyText}</p>
        ) : (
          items.map((item) => (
            <div className="flex gap-2 text-sm leading-6 text-slate-700" key={item}>
              <CheckCircle2 aria-hidden className="mt-1 shrink-0 text-emerald-600" size={15} />
              <span>{sanitizeProductText(item)}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(26,33,44,.06)]">
      <p className="text-xs font-extrabold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-950">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-extrabold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-slate-800">{value}</p>
    </div>
  );
}
