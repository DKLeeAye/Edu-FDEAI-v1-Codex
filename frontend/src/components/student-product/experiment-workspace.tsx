import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Lock,
  MessageCircle,
  PackageCheck,
  Route,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import type {
  Artifact,
  Course,
  ExperimentSession,
  LearningProfile,
  StageFiveAcceptancePackagePayload,
  StageFiveDeliveryDocumentPayload,
  StageFiveOperationsGuidePayload,
  StageFourDifyImplementationPayload,
  StageFourTestReportPayload,
  StageOneSummaryPayload,
  StageThreeKnowledgeDecisionPayload,
  StageTwoSolutionDefinitionPayload,
} from "@/src/lib/api";

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
  type StageDefinition,
  type StageKey,
} from "./terminology";
import { StageOneWorkspace } from "./stage-one-workspace";
import { StageFiveWorkspace } from "./stage-five-workspace";
import { StageFourWorkspace } from "./stage-four-workspace";
import { StageThreeWorkspace } from "./stage-three-workspace";
import { StageTwoWorkspace } from "./stage-two-workspace";
import { EmptyState, ProgressBar, StatusBadge } from "./ui";

type ArtifactsByStage = Record<StageKey, Artifact[]>;

type ExperimentWorkspaceProps = {
  activeStageKey: StageKey;
  artifactsByStage: ArtifactsByStage;
  course: Course;
  isBusy: boolean;
  isCompletingStageFour: boolean;
  isCompletingStageFive: boolean;
  isCompletingStageOne: boolean;
  isCompletingStageThree: boolean;
  isCompletingStageTwo: boolean;
  isRequestingStageFourReview: boolean;
  isRequestingStageFiveReview: boolean;
  isRequestingStageThreeReview: boolean;
  isSavingStageOneSummary: boolean;
  isSavingStageFiveAcceptancePackage: boolean;
  isSavingStageFiveDeliveryDocument: boolean;
  isSavingStageFiveOperationsGuide: boolean;
  isSavingStageFourImplementation: boolean;
  isSavingStageFourTestReport: boolean;
  isSavingStageThreeDecision: boolean;
  isRequestingStageTwoReview: boolean;
  isSavingStageTwoSolution: boolean;
  isSendingStageOneInterview: boolean;
  learningProfile: LearningProfile | null;
  onAskStageOneCustomer: (message: string) => Promise<boolean>;
  onBackToCourses: () => void;
  onCompleteStageFour: () => Promise<boolean>;
  onCompleteStageFive: () => Promise<boolean>;
  onCompleteStageOne: () => Promise<boolean>;
  onCompleteStageThree: () => Promise<boolean>;
  onCompleteStageTwo: () => Promise<boolean>;
  onRefresh: () => void;
  onRequestStageFourReview: () => Promise<boolean>;
  onRequestStageFiveReview: () => Promise<boolean>;
  onRequestStageThreeReview: () => Promise<boolean>;
  onRequestStageTwoReview: () => Promise<boolean>;
  onSaveStageFiveAcceptancePackage: (payload: StageFiveAcceptancePackagePayload) => Promise<boolean>;
  onSaveStageFiveDeliveryDocument: (payload: StageFiveDeliveryDocumentPayload) => Promise<boolean>;
  onSaveStageFiveOperationsGuide: (payload: StageFiveOperationsGuidePayload) => Promise<boolean>;
  onSaveStageFourImplementation: (payload: StageFourDifyImplementationPayload) => Promise<boolean>;
  onSaveStageFourTestReport: (payload: StageFourTestReportPayload) => Promise<boolean>;
  onSaveStageOneSummary: (payload: StageOneSummaryPayload) => Promise<boolean>;
  onSaveStageThreeDecision: (payload: StageThreeKnowledgeDecisionPayload) => Promise<boolean>;
  onSaveStageTwoSolution: (payload: StageTwoSolutionDefinitionPayload) => Promise<boolean>;
  onStageSelect: (stageKey: StageKey) => void;
  session: ExperimentSession;
};

const stageIcons = [MessageCircle, FileText, Route, Sparkles, PackageCheck];

export function ExperimentWorkspace({
  activeStageKey,
  artifactsByStage,
  course,
  isBusy,
  isCompletingStageFour,
  isCompletingStageFive,
  isCompletingStageOne,
  isCompletingStageThree,
  isCompletingStageTwo,
  isRequestingStageFourReview,
  isRequestingStageFiveReview,
  isRequestingStageThreeReview,
  isSavingStageOneSummary,
  isSavingStageFiveAcceptancePackage,
  isSavingStageFiveDeliveryDocument,
  isSavingStageFiveOperationsGuide,
  isSavingStageFourImplementation,
  isSavingStageFourTestReport,
  isSavingStageThreeDecision,
  isRequestingStageTwoReview,
  isSavingStageTwoSolution,
  isSendingStageOneInterview,
  learningProfile,
  onAskStageOneCustomer,
  onBackToCourses,
  onCompleteStageFour,
  onCompleteStageFive,
  onCompleteStageOne,
  onCompleteStageThree,
  onCompleteStageTwo,
  onRefresh,
  onRequestStageFourReview,
  onRequestStageFiveReview,
  onRequestStageThreeReview,
  onRequestStageTwoReview,
  onSaveStageFiveAcceptancePackage,
  onSaveStageFiveDeliveryDocument,
  onSaveStageFiveOperationsGuide,
  onSaveStageFourImplementation,
  onSaveStageFourTestReport,
  onSaveStageOneSummary,
  onSaveStageThreeDecision,
  onSaveStageTwoSolution,
  onStageSelect,
  session,
}: ExperimentWorkspaceProps) {
  const activeStage = getStageDefinition(activeStageKey);
  const activeRecord =
    session.stage_records.find((record) => record.stage_key === activeStageKey) ?? null;
  const activeStatus = stageStatusCopy(activeRecord?.status);
  const projectStatus = projectStatusCopy(session.status);
  const progress = completionStats(session);
  const allArtifacts = Object.values(artifactsByStage).flat();

  return (
    <div className="px-5 py-6 lg:px-7">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <button
            className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
            onClick={onBackToCourses}
            type="button"
          >
            <ArrowLeft aria-hidden size={16} />
            返回课程列表
          </button>
          <h1 className="text-3xl font-extrabold leading-tight text-slate-950">{course.title}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-500">
            围绕生产质检场景完成一次完整 AI 智能体项目交付。当前聚焦：
            {activeStage.title}。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <StatusBadge label={course.code} tone="success" />
          <StatusBadge label={activeStatus.label} tone={activeStatus.tone} />
          <StatusBadge label={`${allArtifacts.length} 项证据`} tone="info" />
        </div>
      </section>

      <section className="mt-5 grid gap-4 rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(26,33,44,.06)] md:grid-cols-3">
        <ProjectMetric label="项目状态" value={projectStatus.label} />
        <ProjectMetric label="完成进度" value={`${progress.completed} / ${progress.total} 阶段`} />
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>交付主线</span>
            <span>{progress.percent}%</span>
          </div>
          <ProgressBar percent={progress.percent} />
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[236px_minmax(520px,1fr)_340px]">
        <StageProgressRail
          activeStageKey={activeStageKey}
          onStageSelect={onStageSelect}
          session={session}
        />

        <main className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(26,33,44,.06)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold leading-tight text-slate-950">
                阶段{activeStage.order}：{activeStage.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">{activeStage.summary}</p>
            </div>
            <StatusBadge label={activeStatus.label} tone={activeStatus.tone} />
          </div>

          <div className="p-5">
            {activeStageKey === "stage_1" ? (
              <StageOneWorkspace
                artifacts={artifactsByStage.stage_1}
                isCompletingStage={isCompletingStageOne}
                isRefreshing={isBusy}
                isSavingSummary={isSavingStageOneSummary}
                isSendingInterview={isSendingStageOneInterview}
                onAskCustomer={onAskStageOneCustomer}
                onCompleteStage={onCompleteStageOne}
                onRefresh={onRefresh}
                onSaveSummary={onSaveStageOneSummary}
                stageStatus={activeRecord?.status}
              />
            ) : activeStageKey === "stage_2" ? (
              <StageTwoWorkspace
                artifacts={artifactsByStage.stage_2}
                isCompletingStage={isCompletingStageTwo}
                isRefreshing={isBusy}
                isRequestingReview={isRequestingStageTwoReview}
                isSavingSolution={isSavingStageTwoSolution}
                onCompleteStage={onCompleteStageTwo}
                onRefresh={onRefresh}
                onRequestReview={onRequestStageTwoReview}
                onSaveSolution={onSaveStageTwoSolution}
                stageOneArtifacts={artifactsByStage.stage_1}
                stageStatus={activeRecord?.status}
              />
            ) : activeStageKey === "stage_3" ? (
              <StageThreeWorkspace
                artifacts={artifactsByStage.stage_3}
                isCompletingStage={isCompletingStageThree}
                isRefreshing={isBusy}
                isRequestingReview={isRequestingStageThreeReview}
                isSavingDecision={isSavingStageThreeDecision}
                onCompleteStage={onCompleteStageThree}
                onRefresh={onRefresh}
                onRequestReview={onRequestStageThreeReview}
                onSaveDecision={onSaveStageThreeDecision}
                stageStatus={activeRecord?.status}
                stageTwoArtifacts={artifactsByStage.stage_2}
              />
            ) : activeStageKey === "stage_4" ? (
              <StageFourWorkspace
                artifacts={artifactsByStage.stage_4}
                isCompletingStage={isCompletingStageFour}
                isRefreshing={isBusy}
                isRequestingReview={isRequestingStageFourReview}
                isSavingImplementation={isSavingStageFourImplementation}
                isSavingTestReport={isSavingStageFourTestReport}
                onCompleteStage={onCompleteStageFour}
                onRefresh={onRefresh}
                onRequestReview={onRequestStageFourReview}
                onSaveImplementation={onSaveStageFourImplementation}
                onSaveTestReport={onSaveStageFourTestReport}
                stageStatus={activeRecord?.status}
                stageThreeArtifacts={artifactsByStage.stage_3}
              />
            ) : activeStageKey === "stage_5" ? (
              <StageFiveWorkspace
                allStageArtifacts={artifactsByStage}
                artifacts={artifactsByStage.stage_5}
                isCompletingStage={isCompletingStageFive}
                isRefreshing={isBusy}
                isRequestingReview={isRequestingStageFiveReview}
                isSavingAcceptancePackage={isSavingStageFiveAcceptancePackage}
                isSavingDeliveryDocument={isSavingStageFiveDeliveryDocument}
                isSavingOperationsGuide={isSavingStageFiveOperationsGuide}
                learningProfile={learningProfile}
                onCompleteStage={onCompleteStageFive}
                onRefresh={onRefresh}
                onRequestReview={onRequestStageFiveReview}
                onSaveAcceptancePackage={onSaveStageFiveAcceptancePackage}
                onSaveDeliveryDocument={onSaveStageFiveDeliveryDocument}
                onSaveOperationsGuide={onSaveStageFiveOperationsGuide}
                sessionStatus={session.status}
                stageStatus={activeRecord?.status}
              />
            ) : (
              <StageOverview
                activeRecordStatus={activeRecord?.status}
                activeStage={activeStage}
                isBusy={isBusy}
                onRefresh={onRefresh}
              />
            )}
          </div>
        </main>

        <ContextPanel
          activeStageKey={activeStageKey}
          artifacts={artifactsByStage[activeStageKey]}
          learningProfile={learningProfile}
          session={session}
        />
      </section>
    </div>
  );
}

function StageProgressRail({
  activeStageKey,
  onStageSelect,
  session,
}: {
  activeStageKey: StageKey;
  onStageSelect: (stageKey: StageKey) => void;
  session: ExperimentSession;
}) {
  const records = sortStageRecords(session.stage_records);

  return (
    <aside className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(26,33,44,.06)] xl:sticky xl:top-[92px]">
      <h2 className="px-1 text-sm font-extrabold text-slate-500">五阶段交付主线</h2>
      <div className="mt-4 grid gap-2">
        {stageDefinitions.map((stage, index) => {
          const record = records.find((item) => item.stage_key === stage.key);
          const status = stageStatusCopy(record?.status);
          const active = stage.key === activeStageKey;
          const locked = record?.status === "locked";
          const Icon = stageIcons[index] ?? FileText;

          return (
            <button
              className={`grid grid-cols-[34px_1fr] gap-3 rounded-2xl border p-3 text-left transition ${
                active
                  ? "border-slate-950 bg-slate-950 text-white"
                  : locked
                    ? "border-slate-100 bg-slate-50 text-slate-400"
                    : "border-transparent bg-white text-slate-700 hover:border-emerald-100 hover:bg-emerald-50"
              }`}
              disabled={locked}
              key={stage.key}
              onClick={() => onStageSelect(stage.key)}
              type="button"
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-xl ${
                  active || record?.status === "completed"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {locked ? <Lock aria-hidden size={15} /> : <Icon aria-hidden size={15} />}
              </span>
              <span className="min-w-0">
                <strong className="block text-sm font-extrabold leading-5">{stage.title}</strong>
                <span className={`mt-1 block text-xs font-bold ${active ? "text-white/70" : ""}`}>
                  {status.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function StageOverview({
  activeRecordStatus,
  activeStage,
  isBusy,
  onRefresh,
}: {
  activeRecordStatus?: string;
  activeStage: StageDefinition;
  isBusy: boolean;
  onRefresh: () => void;
}) {
  return (
    <>
      <section>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-extrabold text-slate-950">核心任务</h3>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isBusy}
            onClick={onRefresh}
            type="button"
          >
            同步进度
          </button>
        </div>

        <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {activeStage.modules.map((module, index) => (
            <div className="grid gap-3 p-4 sm:grid-cols-[42px_1fr]" key={module.title}>
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-sm font-extrabold text-emerald-700">
                {index + 1}
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-slate-950">{module.title}</h4>
                <p className="mt-1 text-sm leading-6 text-slate-500">{module.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <ClipboardList aria-hidden className="mt-1 text-emerald-700" size={18} />
          <div>
            <h3 className="text-sm font-extrabold text-slate-950">阶段产出</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{activeStage.output}</p>
          </div>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800"
          href="/dev-workbench"
        >
          进入阶段操作
          <ChevronRight aria-hidden size={16} />
        </Link>
        <span className="text-sm leading-6 text-slate-500">
          {stageNextStep(activeRecordStatus, activeStage.nextAction)}
        </span>
      </div>
    </>
  );
}

function ContextPanel({
  activeStageKey,
  artifacts,
  learningProfile,
  session,
}: {
  activeStageKey: StageKey;
  artifacts: Artifact[];
  learningProfile: LearningProfile | null;
  session: ExperimentSession;
}) {
  const activeStage = getStageDefinition(activeStageKey);
  const profileSuggestion =
    learningProfile?.next_suggestions[0] ??
    learningProfile?.risks[0] ??
    "完成阶段任务后，这里会显示下一步建议。";
  const profileRingStyle = {
    "--profile": `${profilePercent(learningProfile)}%`,
  } as CSSProperties;

  return (
    <aside className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(26,33,44,.06)] xl:sticky xl:top-[92px]">
      {activeStageKey === "stage_1" ? <StageOneContext artifacts={artifacts} /> : null}
      {activeStageKey === "stage_2" ? <StageTwoContext artifacts={artifacts} /> : null}
      {activeStageKey === "stage_3" ? <StageThreeContext artifacts={artifacts} /> : null}
      {activeStageKey === "stage_4" ? <StageFourContext artifacts={artifacts} /> : null}
      {activeStageKey === "stage_5" ? <StageFiveContext artifacts={artifacts} /> : null}

      <section
        className={`border-b border-slate-100 ${
          activeStageKey === "stage_1" ||
          activeStageKey === "stage_2" ||
          activeStageKey === "stage_3" ||
          activeStageKey === "stage_4" ||
          activeStageKey === "stage_5"
            ? "py-4"
            : "pb-4"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-slate-950">阶段产物</h2>
          <StatusBadge label={`${artifacts.length} 项`} tone="info" />
        </div>
        <div className="mt-3 grid gap-3">
          {artifacts.length === 0 ? (
            <EmptyState title="暂无阶段产物">
              {activeStageKey === "stage_1"
                  ? "完成客户访谈或保存问题发现总结后，项目证据会在这里汇总。"
                  : activeStageKey === "stage_2"
                    ? "保存方案文档或生成可行性评审后，项目证据会在这里汇总。"
                    : activeStageKey === "stage_3"
                      ? "保存知识工程决策或生成评审后，项目证据会在这里汇总。"
                      : activeStageKey === "stage_4"
                        ? "保存构建记录、测试报告或生成反馈后，项目证据会在这里汇总。"
                        : "保存交付说明书、验收记录、维护说明或生成交付审阅后，项目证据会在这里汇总。"}
            </EmptyState>
          ) : (
            artifacts.slice(0, 4).map((artifact) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-3" key={artifact.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={artifactTypeCopy(artifact.artifact_type)} tone="success" />
                  <span className="text-xs font-bold text-slate-400">
                    {formatDateTime(artifact.created_at)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-extrabold text-slate-950">{artifact.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {artifactDescription(artifact)}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="border-b border-slate-100 py-4">
        <h2 className="text-base font-extrabold text-slate-950">下一步</h2>
        <div className="mt-3 rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-700">
          {stageNextStep(
            session.stage_records.find((record) => record.stage_key === activeStageKey)?.status,
            activeStage.nextAction,
          )}
        </div>
      </section>

      <section className="pt-4">
        <h2 className="text-base font-extrabold text-slate-950">学习画像</h2>
        <div className="mt-3 grid grid-cols-[58px_1fr] items-center gap-3">
          <div
            className="grid h-14 w-14 place-items-center rounded-full bg-[conic-gradient(#14b8a6_0_var(--profile),#e8edf2_var(--profile)_100%)] text-sm font-extrabold"
            style={profileRingStyle}
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white">
              {profilePercent(learningProfile)}%
            </span>
          </div>
          <p className="text-xs leading-5 text-slate-500">{profileSuggestion}</p>
        </div>
      </section>
    </aside>
  );
}

function StageFourContext({ artifacts }: { artifacts: Artifact[] }) {
  const latestImplementation =
    artifacts
      .filter((artifact) => artifact.artifact_type === "stage_4_dify_implementation")
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null;
  const latestTestReport =
    artifacts
      .filter((artifact) => artifact.artifact_type === "stage_4_test_report")
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null;
  const latestReview =
    artifacts
      .filter((artifact) => artifact.artifact_type === "stage_4_ai_test_review")
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null;
  const implementation = latestImplementation?.content_json;
  const testReport = latestTestReport?.content_json;
  const review = latestReview?.content_json;
  const limitations = latestImplementation ? readableList(implementation?.known_limitations) : [];
  const risks = latestReview
    ? readableList(review?.implementation_risks)
    : latestTestReport
      ? readableList(testReport?.observed_failures)
      : limitations;
  const appUrl = stringValue(implementation?.dify_app_url);

  return (
    <section className="border-b border-slate-100 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-slate-950">构建与测试</h2>
        <StatusBadge
          label={latestReview ? "已有反馈" : latestTestReport ? "已测试" : latestImplementation ? "已记录" : "待构建"}
          tone={latestReview ? "success" : latestTestReport || latestImplementation ? "warning" : "muted"}
        />
      </div>
      <div className="mt-3 rounded-2xl bg-slate-50 p-4">
        {latestImplementation ? (
          <div className="grid gap-3">
            <div>
              <p className="text-sm font-extrabold leading-6 text-slate-800">
                {stringValue(implementation?.dify_app_name) || "Dify 应用记录已保存"}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {appModeCopy(stringValue(implementation?.app_mode))}
              </p>
              {appUrl ? (
                <a
                  className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 transition hover:text-emerald-800"
                  href={appUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  打开应用链接
                  <ChevronRight aria-hidden size={13} />
                </a>
              ) : null}
            </div>
            {latestTestReport ? (
              <div className="rounded-2xl bg-white p-3">
                <p className="text-xs font-extrabold text-slate-500">测试结果</p>
                <p className="mt-1 text-xs leading-5 text-slate-700">
                  {resultCopy(stringValue(testReport?.overall_result))} /{" "}
                  {stringValue(testReport?.test_goal) || "测试报告已保存。"}
                </p>
              </div>
            ) : null}
            {latestReview ? (
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-xs font-extrabold text-emerald-700">反馈摘要</p>
                <p className="mt-1 text-xs leading-5 text-emerald-900">
                  {stringValue(review?.review_summary) || "测试反馈已生成。"}
                </p>
              </div>
            ) : null}
            {risks.length > 0 ? <ContextMiniList title="风险与限制" items={risks.slice(0, 3)} /> : null}
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-500">
            保存 Dify 构建记录后，这里会汇总应用入口、测试结果和反馈摘要。
          </p>
        )}
      </div>
    </section>
  );
}

function StageFiveContext({ artifacts }: { artifacts: Artifact[] }) {
  const latestDelivery =
    artifacts
      .filter((artifact) => artifact.artifact_type === "stage_5_delivery_document")
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null;
  const latestAcceptance =
    artifacts
      .filter((artifact) => artifact.artifact_type === "stage_5_acceptance_package")
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null;
  const latestOperations =
    artifacts
      .filter((artifact) => artifact.artifact_type === "stage_5_operations_guide")
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null;
  const latestReview =
    artifacts
      .filter((artifact) => artifact.artifact_type === "stage_5_ai_delivery_review")
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null;
  const delivery = latestDelivery?.content_json;
  const acceptance = latestAcceptance?.content_json;
  const operations = latestOperations?.content_json;
  const review = latestReview?.content_json;
  const appUrl = stringValue(delivery?.final_agent_url);
  const risks = latestReview
    ? [...readableList(review?.acceptance_risks), ...readableList(review?.operations_risks)]
    : [
        ...readableList(acceptance?.unresolved_issues),
        ...readableList(operations?.common_issues),
        ...readableList(delivery?.known_limitations),
      ];

  return (
    <section className="border-b border-slate-100 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-slate-950">交付收口</h2>
        <StatusBadge
          label={latestReview ? "已审阅" : latestOperations ? "待审阅" : latestDelivery ? "整理中" : "待成稿"}
          tone={latestReview ? "success" : latestOperations || latestDelivery ? "warning" : "muted"}
        />
      </div>
      <div className="mt-3 rounded-2xl bg-slate-50 p-4">
        {latestDelivery ? (
          <div className="grid gap-3">
            <div>
              <p className="text-sm font-extrabold leading-6 text-slate-800">
                {stringValue(delivery?.project_name) || "交付说明书已保存"}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {stringValue(delivery?.delivery_summary) || "已形成交付说明。"}
              </p>
              {appUrl ? (
                <a
                  className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 transition hover:text-emerald-800"
                  href={appUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  打开最终应用
                  <ChevronRight aria-hidden size={13} />
                </a>
              ) : null}
            </div>
            {latestAcceptance ? (
              <div className="rounded-2xl bg-white p-3">
                <p className="text-xs font-extrabold text-slate-500">验收记录</p>
                <p className="mt-1 text-xs leading-5 text-slate-700">
                  {stringValue(acceptance?.acceptance_scope) || "验收材料已保存。"}
                </p>
              </div>
            ) : null}
            {latestOperations ? (
              <div className="rounded-2xl bg-white p-3">
                <p className="text-xs font-extrabold text-slate-500">维护说明</p>
                <p className="mt-1 text-xs leading-5 text-slate-700">
                  {stringValue(operations?.monitoring_plan) || "维护说明已保存。"}
                </p>
              </div>
            ) : null}
            {latestReview ? (
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-xs font-extrabold text-emerald-700">审阅摘要</p>
                <p className="mt-1 text-xs leading-5 text-emerald-900">
                  {finalReadinessCopy(stringValue(review?.final_readiness))}
                </p>
              </div>
            ) : null}
            {risks.length > 0 ? <ContextMiniList title="风险与限制" items={risks.slice(0, 3)} /> : null}
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-500">
            保存交付说明书后，这里会汇总应用入口、验收范围、维护计划和交付审阅摘要。
          </p>
        )}
      </div>
    </section>
  );
}

function StageThreeContext({ artifacts }: { artifacts: Artifact[] }) {
  const latestDecision =
    artifacts
      .filter((artifact) => artifact.artifact_type === "stage_3_knowledge_decision")
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null;
  const latestReview =
    artifacts
      .filter((artifact) => artifact.artifact_type === "stage_3_ai_review")
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null;
  const decision = latestDecision?.content_json;
  const review = latestReview?.content_json;
  const sources = latestDecision ? readableList(decision?.source_inventory) : [];
  const dataRisks = latestReview
    ? readableList(review?.data_quality_warnings)
    : latestDecision
      ? readableList(decision?.data_quality_risks)
      : [];
  const improvements = latestReview ? readableList(review?.suggested_improvements) : [];

  return (
    <section className="border-b border-slate-100 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-slate-950">知识工程决策</h2>
        <StatusBadge
          label={latestReview ? "已评审" : latestDecision ? "已成稿" : "待成稿"}
          tone={latestReview ? "success" : latestDecision ? "warning" : "muted"}
        />
      </div>
      <div className="mt-3 rounded-2xl bg-slate-50 p-4">
        {latestDecision ? (
          <div className="grid gap-3">
            <div>
              <p className="text-sm font-extrabold leading-6 text-slate-800">
                {stringValue(decision?.knowledge_goal) || "知识工程决策已保存"}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {knowledgeStrategyCopy(stringValue(decision?.selected_strategy))}
              </p>
            </div>
            {sources.length > 0 ? <ContextMiniList title="知识来源" items={sources.slice(0, 3)} /> : null}
            {dataRisks.length > 0 ? (
              <ContextMiniList title="风险提示" items={dataRisks.slice(0, 3)} />
            ) : null}
            {latestReview ? (
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-xs font-extrabold text-emerald-700">评审摘要</p>
                <p className="mt-1 text-xs leading-5 text-emerald-900">
                  {stringValue(review?.review_summary) || "知识工程评审已生成。"}
                </p>
              </div>
            ) : null}
            {improvements.length > 0 ? (
              <ContextMiniList title="建议改进" items={improvements.slice(0, 3)} />
            ) : null}
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-500">
            保存数据准备、分块、向量化、召回和评估决策后，这里会汇总阶段三的关键判断。
          </p>
        )}
      </div>
    </section>
  );
}

function StageTwoContext({ artifacts }: { artifacts: Artifact[] }) {
  const latestSolution =
    artifacts
      .filter((artifact) => artifact.artifact_type === "stage_2_solution_definition")
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null;
  const latestReview =
    artifacts
      .filter((artifact) => artifact.artifact_type === "stage_2_ai_review")
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null;
  const solution = latestSolution?.content_json;
  const review = latestReview?.content_json;
  const dataSources = latestSolution ? readableList(solution?.data_sources) : [];
  const risks = latestReview
    ? readableList(review?.key_risks)
    : latestSolution
      ? readableList(solution?.feasibility_risks)
      : [];
  const improvements = latestReview ? readableList(review?.suggested_improvements) : [];

  return (
    <section className="border-b border-slate-100 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-slate-950">方案与评审</h2>
        <StatusBadge label={latestReview ? "已评审" : latestSolution ? "已成稿" : "待成稿"} tone={latestReview ? "success" : latestSolution ? "warning" : "muted"} />
      </div>
      <div className="mt-3 rounded-2xl bg-slate-50 p-4">
        {latestSolution ? (
          <div className="grid gap-3">
            <div>
              <p className="text-sm font-extrabold leading-6 text-slate-800">
                {stringValue(solution?.solution_title) || "方案文档已保存"}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {stringValue(solution?.problem_summary) || "已形成阶段二方案判断。"}
              </p>
            </div>
            {dataSources.length > 0 ? (
              <ContextMiniList title="数据来源" items={dataSources.slice(0, 3)} />
            ) : null}
            {risks.length > 0 ? (
              <ContextMiniList title="风险提示" items={risks.slice(0, 3)} />
            ) : null}
            {latestReview ? (
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-xs font-extrabold text-emerald-700">评审摘要</p>
                <p className="mt-1 text-xs leading-5 text-emerald-900">
                  {stringValue(review?.review_summary) || "可行性评审已生成。"}
                </p>
              </div>
            ) : null}
            {improvements.length > 0 ? (
              <ContextMiniList title="建议改进" items={improvements.slice(0, 3)} />
            ) : null}
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-500">
            保存需求文档、可行性报告和总体技术方案后，这里会汇总阶段二的关键判断。
          </p>
        )}
      </div>
    </section>
  );
}

function StageOneContext({ artifacts }: { artifacts: Artifact[] }) {
  const interviewCount = artifacts.filter(
    (artifact) => artifact.artifact_type === "stage_1_interview_turn",
  ).length;
  const latestSummary =
    artifacts
      .filter((artifact) => artifact.artifact_type === "stage_1_problem_summary")
      .slice()
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0] ??
    null;
  const painPoints = latestSummary ? readableList(latestSummary.content_json.pain_points) : [];
  const successCriteria = latestSummary
    ? readableList(latestSummary.content_json.success_criteria)
    : [];

  return (
    <section className="border-b border-slate-100 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-slate-950">访谈线索</h2>
        <StatusBadge label={`${interviewCount} 轮`} tone="success" />
      </div>
      <div className="mt-3 rounded-2xl bg-slate-50 p-4">
        {latestSummary ? (
          <div className="grid gap-3">
            <p className="text-sm font-extrabold leading-6 text-slate-800">
              {stringValue(latestSummary.content_json.problem_statement) || "问题发现总结已保存"}
            </p>
            {painPoints.length > 0 ? (
              <ContextMiniList title="核心痛点" items={painPoints.slice(0, 3)} />
            ) : null}
            {successCriteria.length > 0 ? (
              <ContextMiniList title="成功标准" items={successCriteria.slice(0, 2)} />
            ) : null}
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-500">
            完成客户追问并保存问题发现总结后，这里会汇总关键线索。
          </p>
        )}
      </div>
    </section>
  );
}

function ContextMiniList({ items, title }: { items: string[]; title: string }) {
  return (
    <div>
      <p className="text-xs font-extrabold text-slate-500">{title}</p>
      <ul className="mt-2 grid gap-1">
        {items.map((item) => (
          <li className="flex gap-2 text-xs leading-5 text-slate-600" key={item}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProjectMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-extrabold text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-slate-950">{value}</p>
    </div>
  );
}

function stageNextStep(status: string | undefined, defaultText: string): string {
  if (status === "locked") {
    return "完成前序阶段后，本阶段会自动开启。";
  }
  if (status === "completed") {
    return "本阶段已完成，可以复盘产物并进入下一阶段。";
  }
  return defaultText;
}

function readableList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeProductText(String(item)))
      .filter((item) => item.trim().length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => sanitizeProductText(item.trim()))
      .filter(Boolean);
  }
  return [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? sanitizeProductText(value) : "";
}

function compareArtifactsByCreatedAt(left: Artifact, right: Artifact): number {
  return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
}

function knowledgeStrategyCopy(value: string): string {
  const map: Record<string, string> = {
    hybrid: "混合策略",
    prompt_only: "提示词优先",
    rag: "知识库问答",
    tool_calling: "工具调用优先",
  };
  return map[value] ?? "知识策略";
}

function appModeCopy(value: string): string {
  const map: Record<string, string> = {
    agent: "智能体模式",
    chatflow: "对话流",
    workflow: "工作流",
  };
  return map[value] ?? "Dify 应用";
}

function resultCopy(value: string): string {
  const map: Record<string, string> = {
    needs_revision: "需要修改",
    passed: "通过",
  };
  return map[value] ?? "待复核";
}

function finalReadinessCopy(value: string): string {
  const map: Record<string, string> = {
    ready_for_teacher_review: "可提交教师复核",
    ready_with_disclosed_risks: "已披露风险，可提交复核",
  };
  return map[value] ?? (value || "待复核");
}
