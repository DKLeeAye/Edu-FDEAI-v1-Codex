"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileCheck2,
  FolderKanban,
  PackageCheck,
  RefreshCw,
} from "lucide-react";

import type { Artifact, Course, ExperimentSession, LearningProfile } from "@/src/lib/api";

import {
  artifactDescription,
  artifactTypeCopy,
  completionStats,
  formatDateTime,
  getStageDefinition,
  profilePercent,
  projectStatusCopy,
  sanitizeProductText,
  sortStageRecords,
  stageDefinitions,
  stageStatusCopy,
  type StageKey,
} from "./terminology";
import { EmptyState, ProgressBar, StatusBadge } from "./ui";

type ArtifactsByStage = Record<StageKey, Artifact[]>;

type ProjectPortfolioViewProps = {
  artifactsByStage: ArtifactsByStage;
  course: Course;
  isBusy: boolean;
  learningProfile: LearningProfile | null;
  onBackToWorkspace: () => void;
  onRefresh: () => void;
  onStageOpen: (stageKey: StageKey) => void;
  session: ExperimentSession;
};

export function ProjectPortfolioView({
  artifactsByStage,
  course,
  isBusy,
  learningProfile,
  onBackToWorkspace,
  onRefresh,
  onStageOpen,
  session,
}: ProjectPortfolioViewProps) {
  const progress = completionStats(session);
  const projectStatus = projectStatusCopy(session.status);
  const allArtifacts = Object.values(artifactsByStage).flat();
  const stageRecords = sortStageRecords(session.stage_records);
  const completed = session.status === "completed" || progress.completed === progress.total;
  const latestDelivery = latestArtifactOfType(
    artifactsByStage.stage_5,
    "stage_5_delivery_document",
  );
  const latestAcceptance = latestArtifactOfType(
    artifactsByStage.stage_5,
    "stage_5_acceptance_package",
  );
  const latestOperations = latestArtifactOfType(
    artifactsByStage.stage_5,
    "stage_5_operations_guide",
  );
  const latestReview = latestArtifactOfType(
    artifactsByStage.stage_5,
    "stage_5_ai_delivery_review",
  );

  return (
    <div className="px-5 py-6 lg:px-7">
      <section className="grid gap-5 rounded-[18px] bg-slate-950 p-6 text-white shadow-[0_14px_40px_rgba(26,33,44,.08)] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="项目档案袋" tone="success" />
            <StatusBadge label={course.code} tone="info" />
            <StatusBadge label={projectStatus.label} tone={projectStatus.tone} />
          </div>
          <h1 className="mt-5 max-w-4xl text-3xl font-extrabold leading-tight">
            {course.title}最终项目档案袋
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
            汇总五阶段过程证据、关键交付材料、阶段完成状态和最终项目完成状态，便于学生复盘与教师验收。
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/15"
              onClick={onBackToWorkspace}
              type="button"
            >
              <ArrowLeft aria-hidden size={16} />
              返回阶段五
            </button>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isBusy}
              onClick={onRefresh}
              type="button"
            >
              <RefreshCw aria-hidden size={16} />
              同步档案袋
            </button>
          </div>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-white/10 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500 text-white">
              <FolderKanban aria-hidden size={20} />
            </span>
            <div>
              <p className="text-xs font-extrabold text-slate-300">最终项目完成状态</p>
              <p className="mt-1 text-xl font-extrabold">
                {completed ? "项目实训已完成" : "交付包待收口"}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4">
            <PortfolioMetric label="阶段完成" value={`${progress.completed} / ${progress.total}`} />
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-300">
                <span>完成度</span>
                <span>{progress.percent}%</span>
              </div>
              <ProgressBar percent={progress.percent} />
            </div>
            <PortfolioMetric label="项目证据" value={`${allArtifacts.length} 项`} />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(26,33,44,.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">五阶段阶段产物汇总</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  每个阶段保留可复盘的过程证据和交付材料摘要。
                </p>
              </div>
              <StatusBadge label={`${allArtifacts.length} 项证据`} tone="info" />
            </div>

            <div className="mt-4 grid gap-4">
              {stageDefinitions.map((stage) => {
                const record = stageRecords.find((item) => item.stage_key === stage.key);
                return (
                  <StagePortfolioCard
                    artifacts={artifactsByStage[stage.key]}
                    key={stage.key}
                    onOpen={() => onStageOpen(stage.key)}
                    stageKey={stage.key}
                    status={record?.status}
                  />
                );
              })}
            </div>
          </section>
        </div>

        <aside className="grid gap-5 xl:sticky xl:top-[92px] xl:self-start">
          <DeliverySummaryCard
            latestAcceptance={latestAcceptance}
            latestDelivery={latestDelivery}
            latestOperations={latestOperations}
            latestReview={latestReview}
          />
          <LearningSnapshotCard learningProfile={learningProfile} />
        </aside>
      </section>
    </div>
  );
}

function StagePortfolioCard({
  artifacts,
  onOpen,
  stageKey,
  status,
}: {
  artifacts: Artifact[];
  onOpen: () => void;
  stageKey: StageKey;
  status?: string;
}) {
  const stage = getStageDefinition(stageKey);
  const statusCopy = stageStatusCopy(status);
  const locked = status === "locked";

  return (
    <article className="rounded-[18px] border border-slate-200 bg-white p-4">
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={`阶段${stage.order}`} tone="default" />
            <StatusBadge label={statusCopy.label} tone={statusCopy.tone} />
          </div>
          <h3 className="mt-3 text-base font-extrabold leading-6 text-slate-950">
            {stage.title}
          </h3>
          <p className="mt-2 text-xs leading-5 text-slate-500">{stage.output}</p>
        </div>

        <div>
          {artifacts.length === 0 ? (
            <EmptyState title="暂无阶段产物">
              完成该阶段任务后，这里会显示可复盘的项目证据。
            </EmptyState>
          ) : (
            <div className="grid gap-3">
              {artifacts.slice(0, 3).map((artifact) => (
                <EvidenceRow artifact={artifact} key={artifact.id} />
              ))}
              {artifacts.length > 3 ? (
                <p className="text-xs font-bold text-slate-400">
                  另有 {artifacts.length - 3} 项阶段证据已纳入档案袋。
                </p>
              ) : null}
            </div>
          )}
        </div>

        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={locked}
          onClick={onOpen}
          type="button"
        >
          查看阶段
          <ChevronRight aria-hidden size={15} />
        </button>
      </div>
    </article>
  );
}

function EvidenceRow({ artifact }: { artifact: Artifact }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={artifactTypeCopy(artifact.artifact_type)} tone="success" />
        <span className="text-xs font-bold text-slate-400">
          {formatDateTime(artifact.created_at)}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">{artifactDescription(artifact)}</p>
    </div>
  );
}

function DeliverySummaryCard({
  latestAcceptance,
  latestDelivery,
  latestOperations,
  latestReview,
}: {
  latestAcceptance: Artifact | null;
  latestDelivery: Artifact | null;
  latestOperations: Artifact | null;
  latestReview: Artifact | null;
}) {
  const delivery = latestDelivery?.content_json;
  const acceptance = latestAcceptance?.content_json;
  const operations = latestOperations?.content_json;
  const review = latestReview?.content_json;
  const finalUrl = stringValue(delivery?.final_agent_url);

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(26,33,44,.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-950">关键交付材料摘要</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            汇总客户验收最需要查看的材料。
          </p>
        </div>
        <PackageCheck aria-hidden className="text-emerald-600" size={22} />
      </div>

      <div className="mt-4 grid gap-3">
        <SummaryBlock
          ready={latestDelivery !== null}
          title="交付说明书"
          value={
            stringValue(delivery?.delivery_summary) ||
            "保存交付说明书后，这里会展示交付范围和应用入口。"
          }
        />
        {finalUrl ? (
          <a
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-extrabold text-white transition hover:bg-emerald-700"
            href={finalUrl}
            rel="noreferrer"
            target="_blank"
          >
            打开最终应用
            <ExternalLink aria-hidden size={15} />
          </a>
        ) : null}
        <SummaryBlock
          ready={latestAcceptance !== null}
          title="验收记录"
          value={
            stringValue(acceptance?.test_evidence_summary) ||
            stringValue(acceptance?.acceptance_scope) ||
            "保存验收记录后，这里会展示验收范围和测试证据摘要。"
          }
        />
        <SummaryBlock
          ready={latestOperations !== null}
          title="维护说明"
          value={
            stringValue(operations?.monitoring_plan) ||
            stringValue(operations?.data_update_plan) ||
            "保存维护说明后，这里会展示数据更新与监控计划。"
          }
        />
        <SummaryBlock
          ready={latestReview !== null}
          title="交付审阅"
          value={
            finalReadinessCopy(stringValue(review?.final_readiness)) ||
            "生成交付审阅后，这里会展示最终准备度。"
          }
        />
      </div>
    </section>
  );
}

function LearningSnapshotCard({ learningProfile }: { learningProfile: LearningProfile | null }) {
  const suggestions = learningProfile?.next_suggestions ?? [];
  const strengths = learningProfile?.strengths ?? [];

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(26,33,44,.06)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <FileCheck2 aria-hidden size={18} />
        </span>
        <div>
          <h2 className="text-lg font-extrabold text-slate-950">学习画像摘要</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            当前完成度 {profilePercent(learningProfile)}%，用于项目复盘和下一步行动。
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {[...strengths, ...suggestions].slice(0, 3).map((item) => (
          <div className="flex gap-2 text-sm leading-6 text-slate-700" key={item}>
            <CheckCircle2 aria-hidden className="mt-1 shrink-0 text-emerald-600" size={15} />
            <span>{sanitizeProductText(item)}</span>
          </div>
        ))}
        {strengths.length === 0 && suggestions.length === 0 ? (
          <p className="text-sm leading-6 text-slate-500">
            完成更多阶段后，系统会生成优势和下一步建议。
          </p>
        ) : null}
      </div>
    </section>
  );
}

function SummaryBlock({
  ready,
  title,
  value,
}: {
  ready: boolean;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-extrabold text-slate-500">{title}</p>
        <StatusBadge label={ready ? "已具备" : "待补齐"} tone={ready ? "success" : "warning"} />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">{sanitizeProductText(value)}</p>
    </div>
  );
}

function PortfolioMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-xs font-extrabold text-slate-300">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-white">{value}</p>
    </div>
  );
}

function latestArtifactOfType(artifacts: Artifact[], artifactType: string): Artifact | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === artifactType)
      .slice()
      .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
      .at(-1) ?? null
  );
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? sanitizeProductText(value) : "";
}

function finalReadinessCopy(value: string): string {
  const map: Record<string, string> = {
    ready_for_teacher_review: "可提交教师复核",
    ready_with_disclosed_risks: "已披露风险，可提交复核",
  };
  return map[value] ?? (value ? sanitizeProductText(value) : "");
}
