"use client";

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileCheck2,
  GitBranch,
  LinkIcon,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  SearchCheck,
  Settings2,
  Trash2,
  Workflow,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

import type {
  Artifact,
  StageFourAppMode,
  StageFourDifyImplementationPayload,
  StageFourOverallResult,
  StageFourTestCase,
  StageFourTestCaseResult,
  StageFourTestReportPayload,
} from "@/src/lib/api";

import { formatDateTime, sanitizeProductText, stageStatusCopy } from "./terminology";
import { EmptyState, StatusBadge } from "./ui";

type StageFourWorkspaceProps = {
  artifacts: Artifact[];
  isCompletingStage: boolean;
  isRefreshing: boolean;
  isRequestingReview: boolean;
  isSavingImplementation: boolean;
  isSavingTestReport: boolean;
  onCompleteStage: () => Promise<boolean>;
  onRefresh: () => void;
  onRequestReview: () => Promise<boolean>;
  onSaveImplementation: (payload: StageFourDifyImplementationPayload) => Promise<boolean>;
  onSaveTestReport: (payload: StageFourTestReportPayload) => Promise<boolean>;
  stageStatus?: string;
  stageThreeArtifacts: Artifact[];
};

type ImplementationDraft = {
  appId: string;
  appMode: StageFourAppMode;
  appName: string;
  appUrl: string;
  implementationNotes: string;
  knowledgeBaseNotes: string;
  knownLimitations: string;
  promptOrInstructionNotes: string;
  toolConfigurationNotes: string;
};

type TestCaseDraft = {
  actualOutput: string;
  expectedOutput: string;
  id: string;
  input: string;
  notes: string;
  result: StageFourTestCaseResult;
  scenario: string;
};

type TestReportDraft = {
  improvementActions: string;
  observedFailures: string;
  overallResult: StageFourOverallResult;
  testCases: TestCaseDraft[];
  testGoal: string;
};

type ReadinessItem = {
  ready: boolean;
  title: string;
  value: string;
};

const appModeOptions: Array<{
  description: string;
  label: string;
  value: StageFourAppMode;
}> = [
  {
    description: "适合以多轮对话完成质检追溯问答。",
    label: "对话流",
    value: "chatflow",
  },
  {
    description: "适合把判断、检索、生成拆成固定步骤。",
    label: "工作流",
    value: "workflow",
  },
  {
    description: "适合需要工具选择和复杂任务规划的场景。",
    label: "智能体模式",
    value: "agent",
  },
];

const defaultTestCases: TestCaseDraft[] = [
  {
    actualOutput: "",
    expectedOutput: "回答应引用质检记录或 SOP 证据，并覆盖关键字段。",
    id: "standard-question",
    input: "质检记录数字化需要保存哪些信息？",
    notes: "",
    result: "partial",
    scenario: "标准审厂问题",
  },
  {
    actualOutput: "",
    expectedOutput: "应拒答并说明问题不属于当前质检追溯范围。",
    id: "out-of-scope-question",
    input: "今天股市行情怎么样？",
    notes: "",
    result: "partial",
    scenario: "范围外问题",
  },
  {
    actualOutput: "",
    expectedOutput: "应保持上一轮批次或异常背景，并继续给出可追溯回答。",
    id: "multi-turn-question",
    input: "继续用刚才的批次，说明还需要补充哪些审厂材料。",
    notes: "",
    result: "partial",
    scenario: "多轮追问",
  },
];

const emptyImplementationDraft: ImplementationDraft = {
  appId: "",
  appMode: "chatflow",
  appName: "",
  appUrl: "",
  implementationNotes: "",
  knowledgeBaseNotes: "",
  knownLimitations: "",
  promptOrInstructionNotes: "",
  toolConfigurationNotes: "",
};

export function StageFourWorkspace({
  artifacts,
  isCompletingStage,
  isRefreshing,
  isRequestingReview,
  isSavingImplementation,
  isSavingTestReport,
  onCompleteStage,
  onRefresh,
  onRequestReview,
  onSaveImplementation,
  onSaveTestReport,
  stageStatus,
  stageThreeArtifacts,
}: StageFourWorkspaceProps) {
  const status = stageStatusCopy(stageStatus);
  const locked = stageStatus === "locked";
  const completed = stageStatus === "completed";
  const latestImplementationArtifact = useMemo(
    () => latestArtifactOfType(artifacts, "stage_4_dify_implementation"),
    [artifacts],
  );
  const latestTestReportArtifact = useMemo(
    () => latestArtifactOfType(artifacts, "stage_4_test_report"),
    [artifacts],
  );
  const latestReviewArtifact = useMemo(
    () => latestArtifactOfType(artifacts, "stage_4_ai_test_review"),
    [artifacts],
  );
  const latestStageThreeDecision = useMemo(
    () => latestArtifactOfType(stageThreeArtifacts, "stage_3_knowledge_decision"),
    [stageThreeArtifacts],
  );
  const implementationSourceId =
    latestImplementationArtifact?.id ?? latestStageThreeDecision?.id ?? "fallback";
  const implementationSourceDraft = useMemo(
    () =>
      latestImplementationArtifact
        ? implementationDraftFromArtifact(latestImplementationArtifact)
        : implementationDraftFromStageThree(latestStageThreeDecision),
    [latestImplementationArtifact, latestStageThreeDecision],
  );
  const [implementationDraftState, setImplementationDraftState] = useState<{
    draft: ImplementationDraft;
    sourceArtifactId: string;
  }>({
    draft: implementationSourceDraft,
    sourceArtifactId: implementationSourceId,
  });
  const implementationDraft =
    implementationDraftState.sourceArtifactId === implementationSourceId
      ? implementationDraftState.draft
      : implementationSourceDraft;

  const testReportSourceId =
    latestTestReportArtifact?.id ?? latestImplementationArtifact?.id ?? "fallback";
  const testReportSourceDraft = useMemo(
    () =>
      latestTestReportArtifact
        ? testReportDraftFromArtifact(latestTestReportArtifact)
        : defaultTestReportDraft(latestImplementationArtifact),
    [latestTestReportArtifact, latestImplementationArtifact],
  );
  const [testReportDraftState, setTestReportDraftState] = useState<{
    draft: TestReportDraft;
    sourceArtifactId: string;
  }>({
    draft: testReportSourceDraft,
    sourceArtifactId: testReportSourceId,
  });
  const testReportDraft =
    testReportDraftState.sourceArtifactId === testReportSourceId
      ? testReportDraftState.draft
      : testReportSourceDraft;

  const implementationReadiness = useMemo(
    () => createImplementationReadiness(implementationDraft),
    [implementationDraft],
  );
  const testReadiness = useMemo(() => createTestReadiness(testReportDraft), [testReportDraft]);
  const canSaveImplementation = implementationReadiness.every((item) => item.ready);
  const canSaveTestReport =
    latestImplementationArtifact !== null && testReadiness.every((item) => item.ready);
  const canReview = latestImplementationArtifact !== null && latestTestReportArtifact !== null && !locked && !completed;
  const canComplete =
    latestImplementationArtifact !== null &&
    latestTestReportArtifact !== null &&
    latestReviewArtifact !== null &&
    !locked &&
    !completed;

  function updateImplementationDraft(patch: Partial<ImplementationDraft>) {
    setImplementationDraftState({
      draft: { ...implementationDraft, ...patch },
      sourceArtifactId: implementationSourceId,
    });
  }

  function updateTestReportDraft(patch: Partial<TestReportDraft>) {
    setTestReportDraftState({
      draft: { ...testReportDraft, ...patch },
      sourceArtifactId: testReportSourceId,
    });
  }

  function updateTestCase(id: string, patch: Partial<TestCaseDraft>) {
    updateTestReportDraft({
      testCases: testReportDraft.testCases.map((testCase) =>
        testCase.id === id ? { ...testCase, ...patch } : testCase,
      ),
    });
  }

  function addTestCase() {
    updateTestReportDraft({
      testCases: [
        ...testReportDraft.testCases,
        {
          actualOutput: "",
          expectedOutput: "",
          id: `custom-${Date.now()}`,
          input: "",
          notes: "",
          result: "partial",
          scenario: "补充测试项",
        },
      ],
    });
  }

  function removeTestCase(id: string) {
    if (testReportDraft.testCases.length <= 1) {
      return;
    }
    updateTestReportDraft({
      testCases: testReportDraft.testCases.filter((testCase) => testCase.id !== id),
    });
  }

  async function handleSaveImplementation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSaveImplementation || locked || completed) {
      return;
    }
    const appId = implementationDraft.appId.trim();
    await onSaveImplementation({
      app_mode: implementationDraft.appMode,
      dify_app_name: implementationDraft.appName.trim(),
      dify_app_url: implementationDraft.appUrl.trim(),
      ...(appId ? { dify_app_id: appId } : {}),
      implementation_notes: implementationDraft.implementationNotes.trim(),
      knowledge_base_notes: implementationDraft.knowledgeBaseNotes.trim(),
      known_limitations: lines(implementationDraft.knownLimitations),
      prompt_or_instruction_notes: implementationDraft.promptOrInstructionNotes.trim(),
      tool_configuration_notes: implementationDraft.toolConfigurationNotes.trim(),
    });
  }

  async function handleSaveTestReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSaveTestReport || locked || completed) {
      return;
    }
    await onSaveTestReport({
      improvement_actions: lines(testReportDraft.improvementActions),
      observed_failures: lines(testReportDraft.observedFailures),
      overall_result: testReportDraft.overallResult,
      test_cases: testReportDraft.testCases.map(toPayloadTestCase),
      test_goal: testReportDraft.testGoal.trim(),
    });
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[18px] bg-slate-950 p-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="阶段四工作区" tone="success" />
              <StatusBadge label="Dify 路径" tone="info" />
              <StatusBadge label={status.label} tone={status.tone} />
            </div>
            <h3 className="mt-4 text-2xl font-extrabold leading-tight">
              构建可运行智能体，并留下可验收证据
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
              按阶段三决策在 Dify 中完成知识库、Prompt、工作流和发布记录，再用标准问题、范围外问题和多轮问题完成测试验收。
            </p>
          </div>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isRefreshing}
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw aria-hidden size={16} />
            同步阶段进度
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <StageStepCard
            icon={<Bot aria-hidden size={18} />}
            label="Dify 新手村"
            value="概念与操作就绪"
          />
          <StageStepCard
            icon={<Workflow aria-hidden size={18} />}
            label="正式构建任务"
            value={latestImplementationArtifact ? "已保存记录" : "待记录配置"}
          />
          <StageStepCard
            icon={<LinkIcon aria-hidden size={18} />}
            label="应用链接与设计说明"
            value={hasText(implementationDraft.appUrl) ? "已填写链接" : "待填写链接"}
          />
          <StageStepCard
            icon={<ClipboardCheck aria-hidden size={18} />}
            label="测试验收与反馈"
            value={latestReviewArtifact ? "已有反馈" : latestTestReportArtifact ? "待生成反馈" : "待测试"}
          />
        </div>
      </section>

      {locked ? (
        <EmptyState title="阶段四尚未解锁">
          完成阶段三知识工程决策和评审后，智能体实现与测试工作区会自动开启。
        </EmptyState>
      ) : null}

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.14fr)_minmax(360px,.86fr)]">
        <BuildRecordEditor
          canSave={canSaveImplementation}
          completed={completed}
          draft={implementationDraft}
          isSaving={isSavingImplementation}
          latestStageThreeDecision={latestStageThreeDecision}
          locked={locked}
          onChange={updateImplementationDraft}
          onSubmit={handleSaveImplementation}
          readiness={implementationReadiness}
        />
        <TestAndReviewPanel
          canComplete={canComplete}
          canReview={canReview}
          canSaveTestReport={canSaveTestReport}
          completed={completed}
          draft={testReportDraft}
          isCompleting={isCompletingStage}
          isRequestingReview={isRequestingReview}
          isSavingTestReport={isSavingTestReport}
          latestImplementationArtifact={latestImplementationArtifact}
          latestReviewArtifact={latestReviewArtifact}
          latestTestReportArtifact={latestTestReportArtifact}
          locked={locked}
          onAddTestCase={addTestCase}
          onChange={updateTestReportDraft}
          onCompleteStage={onCompleteStage}
          onRemoveTestCase={removeTestCase}
          onRequestReview={onRequestReview}
          onSubmit={handleSaveTestReport}
          onTestCaseChange={updateTestCase}
          readiness={testReadiness}
        />
      </section>
    </div>
  );
}

function BuildRecordEditor({
  canSave,
  completed,
  draft,
  isSaving,
  latestStageThreeDecision,
  locked,
  onChange,
  onSubmit,
  readiness,
}: {
  canSave: boolean;
  completed: boolean;
  draft: ImplementationDraft;
  isSaving: boolean;
  latestStageThreeDecision: Artifact | null;
  locked: boolean;
  onChange: (patch: Partial<ImplementationDraft>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readiness: ReadinessItem[];
}) {
  const stageThreeContent = latestStageThreeDecision?.content_json;
  const stageThreeSources = arrayOrString(stageThreeContent?.source_inventory);
  const stageThreePlan = stringValue(stageThreeContent?.stage_4_build_plan);

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">Dify 构建记录</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            外部工具中完成构建，平台记录链接、关键配置、设计说明和已知限制。
          </p>
        </div>
        <StatusBadge
          label={completed ? "已完成" : canSave ? "可保存" : "待补齐"}
          tone={completed ? "success" : canSave ? "success" : "warning"}
        />
      </div>

      <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
        <p className="text-xs font-extrabold text-emerald-700">承接阶段三构建建议</p>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          {stageThreePlan || "阶段三决策会在这里作为 Dify 构建参考。"}
        </p>
        {stageThreeSources.length > 0 ? (
          <MiniList items={stageThreeSources.slice(0, 4)} title="优先导入的知识来源" />
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {readiness.map((item) => (
          <ReadinessCard key={item.title} ready={item.ready} title={item.title} value={item.value} />
        ))}
      </div>

      <form className="mt-5 grid gap-5" onSubmit={onSubmit}>
        <FormSection
          description="先确认 Dify 基础概念，再说明本项目选择的应用类型。"
          icon={<Bot aria-hidden size={18} />}
          title="Dify 新手村"
        >
          <ConceptGrid />
          <AppModeSelector
            disabled={locked || completed}
            onChange={(value) => onChange({ appMode: value })}
            value={draft.appMode}
          />
        </FormSection>

        <FormSection
          description="记录知识库、Prompt、工具和工作流配置，说明它们如何回应前序决策。"
          icon={<Settings2 aria-hidden size={18} />}
          title="正式构建任务"
        >
          <StageField
            disabled={locked || completed}
            label="知识库配置记录"
            onChange={(value) => onChange({ knowledgeBaseNotes: value })}
            placeholder="说明导入了哪些材料、检索方式、材料清洗或未覆盖内容。"
            required
            rows={5}
            value={draft.knowledgeBaseNotes}
          />
          <StageField
            disabled={locked || completed}
            label="Prompt 与指令设计"
            onChange={(value) => onChange({ promptOrInstructionNotes: value })}
            placeholder="说明角色设定、引用证据要求、拒答边界和输出格式。"
            required
            rows={5}
            value={draft.promptOrInstructionNotes}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <StageField
              disabled={locked || completed}
              label="工具或工作流配置"
              onChange={(value) => onChange({ toolConfigurationNotes: value })}
              placeholder="说明工作流节点、工具配置或暂不接入工具的原因。"
              required
              rows={5}
              value={draft.toolConfigurationNotes}
            />
            <StageField
              disabled={locked || completed}
              label="实现说明"
              onChange={(value) => onChange({ implementationNotes: value })}
              placeholder="说明构建过程、关键取舍，以及与阶段三决策的偏差。"
              required
              rows={5}
              value={draft.implementationNotes}
            />
          </div>
        </FormSection>

        <FormSection
          description="提交可访问入口、可识别名称和已知限制，作为阶段五交付材料的基础。"
          icon={<LinkIcon aria-hidden size={18} />}
          title="应用链接与设计说明"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <StageField
              disabled={locked || completed}
              label="应用名称"
              onChange={(value) => onChange({ appName: value })}
              placeholder="例如：质检追溯 Dify 助手"
              required
              rows={2}
              value={draft.appName}
            />
            <StageField
              disabled={locked || completed}
              label="应用链接"
              onChange={(value) => onChange({ appUrl: value })}
              placeholder="填写 Dify 发布后的访问链接"
              required
              rows={2}
              value={draft.appUrl}
            />
          </div>
          <StageField
            disabled={locked || completed}
            label="应用标识（选填）"
            onChange={(value) => onChange({ appId: value })}
            placeholder="如果课程要求记录 Dify 应用 ID，可填写在这里。"
            rows={2}
            value={draft.appId}
          />
          <StageField
            disabled={locked || completed}
            label="已知限制"
            onChange={(value) => onChange({ knownLimitations: value })}
            placeholder="每行一个限制，例如数据更新依赖手工导入、多轮记忆只覆盖当前会话。"
            required
            rows={4}
            value={draft.knownLimitations}
          />
        </FormSection>

        <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-slate-500">
            {completed
              ? "阶段四已经完成，构建记录可作为阶段五交付材料的一部分复盘。"
              : canSave
                ? "构建记录已具备最小内容，可以保存并进入测试验收。"
                : "补齐应用链接、配置说明和已知限制后再保存。"}
          </p>
          <button
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={locked || completed || isSaving || !canSave}
            type="submit"
          >
            <Save aria-hidden size={16} />
            {isSaving ? "保存中" : "保存构建记录"}
          </button>
        </div>
      </form>
    </section>
  );
}

function TestAndReviewPanel({
  canComplete,
  canReview,
  canSaveTestReport,
  completed,
  draft,
  isCompleting,
  isRequestingReview,
  isSavingTestReport,
  latestImplementationArtifact,
  latestReviewArtifact,
  latestTestReportArtifact,
  locked,
  onAddTestCase,
  onChange,
  onCompleteStage,
  onRemoveTestCase,
  onRequestReview,
  onSubmit,
  onTestCaseChange,
  readiness,
}: {
  canComplete: boolean;
  canReview: boolean;
  canSaveTestReport: boolean;
  completed: boolean;
  draft: TestReportDraft;
  isCompleting: boolean;
  isRequestingReview: boolean;
  isSavingTestReport: boolean;
  latestImplementationArtifact: Artifact | null;
  latestReviewArtifact: Artifact | null;
  latestTestReportArtifact: Artifact | null;
  locked: boolean;
  onAddTestCase: () => void;
  onChange: (patch: Partial<TestReportDraft>) => void;
  onCompleteStage: () => Promise<boolean>;
  onRemoveTestCase: (id: string) => void;
  onRequestReview: () => Promise<boolean>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTestCaseChange: (id: string, patch: Partial<TestCaseDraft>) => void;
  readiness: ReadinessItem[];
}) {
  const implementation = latestImplementationArtifact?.content_json;

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950">测试验收与反馈</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            用标准问题、范围外问题和多轮问题验证应用，再生成测试反馈并确认阶段完成。
          </p>
        </div>
        <StatusBadge
          label={latestReviewArtifact ? "已有反馈" : latestTestReportArtifact ? "待确认" : "待测试"}
          tone={latestReviewArtifact ? "success" : latestTestReportArtifact ? "warning" : "muted"}
        />
      </div>

      <div className="mt-4 grid gap-3">
        <ReviewCheck label="保存 Dify 构建记录" ready={latestImplementationArtifact !== null} />
        <ReviewCheck label="保存测试报告" ready={latestTestReportArtifact !== null} />
        <ReviewCheck label="生成测试反馈" ready={latestReviewArtifact !== null} />
        <ReviewCheck label="解锁交付验收" ready={completed} />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        {latestImplementationArtifact ? (
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={appModeCopy(stringValue(implementation?.app_mode))} tone="info" />
              <span className="text-xs font-bold text-slate-400">
                {formatDateTime(latestImplementationArtifact.created_at)}
              </span>
            </div>
            <p className="text-sm font-extrabold leading-6 text-slate-800">
              {stringValue(implementation?.dify_app_name) || "Dify 应用记录已保存"}
            </p>
            <p className="text-xs leading-5 text-slate-500">
              {stringValue(implementation?.implementation_notes) ||
                "继续补充测试结果后，可以生成阶段反馈。"}
            </p>
          </div>
        ) : (
          <EmptyState title="还没有构建记录">
            先保存应用链接和设计说明，再填写测试报告。
          </EmptyState>
        )}
      </div>

      <form className="mt-5 grid gap-5" onSubmit={onSubmit}>
        <FormSection
          description="测试应覆盖标准问题、范围外问题和多轮追问，避免只验证最顺利路径。"
          icon={<FileCheck2 aria-hidden size={18} />}
          title="测试报告"
        >
          <StageField
            disabled={locked || completed}
            label="测试目标"
            onChange={(value) => onChange({ testGoal: value })}
            placeholder="说明本轮要验证哪些能力和边界。"
            required
            rows={4}
            value={draft.testGoal}
          />

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-extrabold text-slate-800">测试用例</p>
              <button
                className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={locked || completed}
                onClick={onAddTestCase}
                type="button"
              >
                <Plus aria-hidden size={14} />
                新增测试项
              </button>
            </div>
            {draft.testCases.map((testCase, index) => (
              <TestCaseEditor
                disabled={locked || completed}
                key={testCase.id}
                onChange={(patch) => onTestCaseChange(testCase.id, patch)}
                onRemove={() => onRemoveTestCase(testCase.id)}
                removable={draft.testCases.length > 1}
                testCase={testCase}
                title={`测试项 ${index + 1}`}
              />
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <StageField
              disabled={locked || completed}
              label="观察到的问题"
              onChange={(value) => onChange({ observedFailures: value })}
              placeholder="每行一个问题。如果暂未发现，可写“暂无明显问题”。"
              rows={4}
              value={draft.observedFailures}
            />
            <StageField
              disabled={locked || completed}
              label="改进动作"
              onChange={(value) => onChange({ improvementActions: value })}
              placeholder="每行一个后续改进动作，例如补充负样例、调整分块标题。"
              rows={4}
              value={draft.improvementActions}
            />
          </div>
          <OverallResultSelector
            disabled={locked || completed}
            onChange={(value) => onChange({ overallResult: value })}
            value={draft.overallResult}
          />
        </FormSection>

        <div className="grid gap-3 md:grid-cols-2">
          {readiness.map((item) => (
            <ReadinessCard key={item.title} ready={item.ready} title={item.title} value={item.value} />
          ))}
        </div>

        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={locked || completed || isSavingTestReport || !canSaveTestReport}
          type="submit"
        >
          <Save aria-hidden size={16} />
          {isSavingTestReport ? "保存中" : "保存测试报告"}
        </button>
      </form>

      <button
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canReview || isRequestingReview}
        onClick={() => void onRequestReview()}
        type="button"
      >
        <SearchCheck aria-hidden size={16} />
        {isRequestingReview ? "反馈生成中" : "生成测试反馈"}
      </button>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        {latestReviewArtifact ? (
          <TestFeedback artifact={latestReviewArtifact} />
        ) : (
          <EmptyState title="还没有测试反馈">
            保存构建记录和测试报告后，生成反馈来检查测试覆盖、实现风险和交付准备度。
          </EmptyState>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
        {completed
          ? "阶段四已经完成，阶段五可以继续整理交付说明、验收记录和维护边界。"
          : canComplete
            ? "构建记录、测试报告和反馈已就绪，可以确认阶段四完成并开启交付验收。"
            : "保存构建记录、测试报告并生成反馈后，才能确认阶段四完成。"}
      </div>

      <button
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canComplete || isCompleting}
        onClick={() => void onCompleteStage()}
        type="button"
      >
        <CheckCircle2 aria-hidden size={16} />
        {completed ? "阶段四已完成" : isCompleting ? "确认中" : "完成阶段四并解锁阶段五"}
      </button>
    </section>
  );
}

function TestFeedback({ artifact }: { artifact: Artifact }) {
  const content = artifact.content_json;
  const coverage = isRecord(content.test_coverage_feedback) ? content.test_coverage_feedback : null;
  const risks = arrayOrString(content.implementation_risks);
  const suggestions = arrayOrString(content.improvement_suggestions);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label="反馈已生成" tone="success" />
        <span className="text-xs font-bold text-slate-400">{formatDateTime(artifact.created_at)}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewMetric
          label="交付准备度"
          value={releaseReadinessCopy(stringValue(content.release_readiness))}
        />
        <ReviewMetric
          label="总体测试结果"
          value={resultCopy(stringValue(coverage?.overall_result))}
        />
      </div>
      <div>
        <p className="text-xs font-extrabold text-slate-500">反馈摘要</p>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          {stringValue(content.review_summary) || "反馈已生成。"}
        </p>
      </div>
      {coverage ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <ReviewMetric label="测试项" value={String(coverage.total_cases ?? 0)} />
          <ReviewMetric label="通过" value={String(coverage.passed_cases ?? 0)} />
          <ReviewMetric label="未完全通过" value={String(coverage.failed_or_partial_cases ?? 0)} />
        </div>
      ) : null}
      {risks.length > 0 ? <ReviewList icon="warning" items={risks} title="实现风险" /> : null}
      {suggestions.length > 0 ? <ReviewList icon="check" items={suggestions} title="建议改进" /> : null}
    </div>
  );
}

function ConceptGrid() {
  const concepts = [
    { icon: <Bot aria-hidden size={15} />, label: "大模型", value: "负责理解与生成" },
    { icon: <Database aria-hidden size={15} />, label: "知识库", value: "提供外部证据" },
    { icon: <Settings2 aria-hidden size={15} />, label: "工具", value: "连接业务动作" },
    { icon: <MessageCircle aria-hidden size={15} />, label: "记忆", value: "保持上下文" },
    { icon: <GitBranch aria-hidden size={15} />, label: "工作流", value: "组织行为逻辑" },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {concepts.map((concept) => (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3" key={concept.label}>
          <div className="flex items-center gap-2 text-emerald-700">
            {concept.icon}
            <p className="text-xs font-extrabold">{concept.label}</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{concept.value}</p>
        </div>
      ))}
    </div>
  );
}

function FormSection({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-4">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          {icon}
        </span>
        <div>
          <h4 className="text-base font-extrabold text-slate-950">{title}</h4>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

function StageField({
  disabled,
  label,
  onChange,
  placeholder,
  required = false,
  rows = 3,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  rows?: number;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-extrabold text-slate-800">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <textarea
        className="min-h-20 resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 transition placeholder:text-slate-400 focus:border-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </label>
  );
}

function AppModeSelector({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: StageFourAppMode) => void;
  value: StageFourAppMode;
}) {
  return (
    <div>
      <p className="text-sm font-extrabold text-slate-800">应用类型选择</p>
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        {appModeOptions.map((option) => {
          const active = option.value === value;
          return (
            <button
              className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-100 hover:bg-emerald-50"
              }`}
              disabled={disabled}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              <span className="flex items-center gap-2 text-sm font-extrabold">
                <Workflow aria-hidden size={16} />
                {option.label}
              </span>
              <span className="mt-2 block text-xs leading-5 text-slate-500">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OverallResultSelector({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: StageFourOverallResult) => void;
  value: StageFourOverallResult;
}) {
  return (
    <div>
      <p className="text-sm font-extrabold text-slate-800">总体结果</p>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        {[
          { label: "通过", value: "passed" as const },
          { label: "需要修改", value: "needs_revision" as const },
        ].map((option) => {
          const active = option.value === value;
          return (
            <button
              className={`rounded-2xl border p-4 text-left text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-100 hover:bg-emerald-50"
              }`}
              disabled={disabled}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TestCaseEditor({
  disabled,
  onChange,
  onRemove,
  removable,
  testCase,
  title,
}: {
  disabled: boolean;
  onChange: (patch: Partial<TestCaseDraft>) => void;
  onRemove: () => void;
  removable: boolean;
  testCase: TestCaseDraft;
  title: string;
}) {
  return (
    <article className="rounded-[18px] border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-extrabold text-slate-950">{title}</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            记录输入、期望、实际表现和判定结果。
          </p>
        </div>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-red-100 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled || !removable}
          onClick={onRemove}
          title="删除测试项"
          type="button"
        >
          <Trash2 aria-hidden size={15} />
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        <StageField
          disabled={disabled}
          label="测试场景"
          onChange={(value) => onChange({ scenario: value })}
          placeholder="例如：标准审厂问题、范围外问题、多轮追问。"
          required
          rows={2}
          value={testCase.scenario}
        />
        <StageField
          disabled={disabled}
          label="测试输入"
          onChange={(value) => onChange({ input: value })}
          placeholder="填写实际向应用提问的内容。"
          required
          rows={3}
          value={testCase.input}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <StageField
            disabled={disabled}
            label="期望表现"
            onChange={(value) => onChange({ expectedOutput: value })}
            placeholder="说明可接受的回答或拒答标准。"
            required
            rows={4}
            value={testCase.expectedOutput}
          />
          <StageField
            disabled={disabled}
            label="实际表现"
            onChange={(value) => onChange({ actualOutput: value })}
            placeholder="记录应用真实返回内容或关键摘要。"
            required
            rows={4}
            value={testCase.actualOutput}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)]">
          <TestCaseResultSelector
            disabled={disabled}
            onChange={(value) => onChange({ result: value })}
            value={testCase.result}
          />
          <StageField
            disabled={disabled}
            label="备注"
            onChange={(value) => onChange({ notes: value })}
            placeholder="记录截图位置、复测结论或改进判断。"
            rows={3}
            value={testCase.notes}
          />
        </div>
      </div>
    </article>
  );
}

function TestCaseResultSelector({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: StageFourTestCaseResult) => void;
  value: StageFourTestCaseResult;
}) {
  const options: Array<{ label: string; value: StageFourTestCaseResult }> = [
    { label: "通过", value: "passed" },
    { label: "未通过", value: "failed" },
    { label: "部分通过", value: "partial" },
  ];

  return (
    <div>
      <p className="text-sm font-extrabold text-slate-800">判定结果</p>
      <div className="mt-2 grid gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              className={`min-h-10 rounded-xl border px-3 text-left text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-600 hover:border-emerald-100 hover:bg-emerald-50"
              }`}
              disabled={disabled}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StageStepCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <div className="flex items-center gap-2 text-emerald-200">
        {icon}
        <p className="text-xs font-extrabold">{label}</p>
      </div>
      <p className="mt-2 text-sm font-extrabold text-white">{value}</p>
    </div>
  );
}

function ReadinessCard({ ready, title, value }: ReadinessItem) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-extrabold text-slate-500">{title}</p>
        <StatusBadge label={ready ? "已具备" : "待补充"} tone={ready ? "success" : "warning"} />
      </div>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function ReviewCheck({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
      <span
        className={`grid h-8 w-8 place-items-center rounded-full ${
          ready ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
        }`}
      >
        <CheckCircle2 aria-hidden size={16} />
      </span>
      <span className="text-sm font-bold text-slate-700">{label}</span>
    </div>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-xs font-extrabold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold leading-6 text-slate-800">
        {sanitizeProductText(value)}
      </p>
    </div>
  );
}

function ReviewList({
  icon,
  items,
  title,
}: {
  icon: "check" | "warning";
  items: string[];
  title: string;
}) {
  const Icon = icon === "warning" ? AlertTriangle : CheckCircle2;

  return (
    <div>
      <p className="text-xs font-extrabold text-slate-500">{title}</p>
      <ul className="mt-2 grid gap-2">
        {items.slice(0, 5).map((item) => (
          <li className="flex gap-2 text-sm leading-6 text-slate-700" key={item}>
            <Icon
              aria-hidden
              className={icon === "warning" ? "mt-1 shrink-0 text-amber-500" : "mt-1 shrink-0 text-emerald-600"}
              size={15}
            />
            <span>{sanitizeProductText(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniList({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      <p className="text-xs font-extrabold text-emerald-700">{title}</p>
      <ul className="mt-2 grid gap-1">
        {items.map((item) => (
          <li className="flex gap-2 text-xs leading-5 text-emerald-900" key={item}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{sanitizeProductText(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function createImplementationReadiness(draft: ImplementationDraft): ReadinessItem[] {
  return [
    {
      ready: hasText(draft.appName) && hasText(draft.appUrl),
      title: "应用入口",
      value: hasText(draft.appUrl) ? "链接已填写" : "待填写发布链接",
    },
    {
      ready: hasText(draft.knowledgeBaseNotes),
      title: "知识库",
      value: hasText(draft.knowledgeBaseNotes) ? "配置已记录" : "待记录知识来源与检索设置",
    },
    {
      ready: hasText(draft.promptOrInstructionNotes) && hasText(draft.toolConfigurationNotes),
      title: "行为逻辑",
      value: "Prompt、工具或工作流说明",
    },
    {
      ready: hasText(draft.implementationNotes) && lines(draft.knownLimitations).length > 0,
      title: "边界说明",
      value: hasText(draft.knownLimitations) ? "已记录限制" : "待记录已知限制",
    },
  ];
}

function createTestReadiness(draft: TestReportDraft): ReadinessItem[] {
  const completedCases = draft.testCases.filter(isCompleteTestCase).length;
  return [
    {
      ready: hasText(draft.testGoal),
      title: "测试目标",
      value: hasText(draft.testGoal) ? "目标已说明" : "待说明验收范围",
    },
    {
      ready: draft.testCases.length > 0 && completedCases === draft.testCases.length,
      title: "测试用例",
      value: `${completedCases} / ${draft.testCases.length} 项完整`,
    },
    {
      ready: hasText(draft.observedFailures) || draft.overallResult === "passed",
      title: "问题记录",
      value: hasText(draft.observedFailures) ? "已记录问题" : "通过时可无问题",
    },
    {
      ready: hasText(draft.improvementActions) || draft.overallResult === "passed",
      title: "改进动作",
      value: hasText(draft.improvementActions) ? "已记录动作" : "通过时可无改进项",
    },
  ];
}

function implementationDraftFromArtifact(artifact: Artifact): ImplementationDraft {
  const content = artifact.content_json;
  return {
    appId: stringValue(content.dify_app_id),
    appMode: normalizeAppMode(content.app_mode),
    appName: stringValue(content.dify_app_name),
    appUrl: stringValue(content.dify_app_url),
    implementationNotes: stringValue(content.implementation_notes),
    knowledgeBaseNotes: stringValue(content.knowledge_base_notes),
    knownLimitations: arrayOrString(content.known_limitations).join("\n"),
    promptOrInstructionNotes: stringValue(content.prompt_or_instruction_notes),
    toolConfigurationNotes: stringValue(content.tool_configuration_notes),
  };
}

function implementationDraftFromStageThree(artifact: Artifact | null): ImplementationDraft {
  if (!artifact) {
    return emptyImplementationDraft;
  }
  const content = artifact.content_json;
  const sources = arrayOrString(content.source_inventory);
  const buildPlan = stringValue(content.stage_4_build_plan);
  const risks = arrayOrString(content.data_quality_risks);

  return {
    ...emptyImplementationDraft,
    implementationNotes:
      buildPlan || "按阶段三知识工程决策配置 Dify 应用，并记录实际偏差。",
    knowledgeBaseNotes:
      sources.length > 0
        ? `计划导入：\n${sources.join("\n")}`
        : "按阶段三知识来源清单整理材料并导入知识库。",
    knownLimitations: risks.length > 0 ? risks.join("\n") : "",
    promptOrInstructionNotes:
      "要求回答围绕质检追溯场景，引用知识库证据，并对范围外问题明确拒答。",
    toolConfigurationNotes: "本轮优先完成 Dify 知识库与对话流程配置，外部系统工具接入后续验证。",
  };
}

function defaultTestReportDraft(implementationArtifact: Artifact | null): TestReportDraft {
  const implementation = implementationArtifact?.content_json;
  return {
    improvementActions: "",
    observedFailures: "",
    overallResult: "needs_revision",
    testCases: defaultTestCases,
    testGoal: implementationArtifact
      ? `验证“${stringValue(implementation?.dify_app_name) || "Dify 应用"}”能覆盖标准问题、范围外拒答和多轮追问。`
      : "验证 Dify 智能体能覆盖标准问题、范围外拒答和多轮追问。",
  };
}

function testReportDraftFromArtifact(artifact: Artifact): TestReportDraft {
  const content = artifact.content_json;
  return {
    improvementActions: arrayOrString(content.improvement_actions).join("\n"),
    observedFailures: arrayOrString(content.observed_failures).join("\n"),
    overallResult: normalizeOverallResult(content.overall_result),
    testCases: testCasesFromContent(content.test_cases),
    testGoal: stringValue(content.test_goal),
  };
}

function testCasesFromContent(value: unknown): TestCaseDraft[] {
  if (!Array.isArray(value)) {
    return defaultTestCases;
  }
  const testCases = value.filter(isRecord).map((item, index) => ({
    actualOutput: stringValue(item.actual_output),
    expectedOutput: stringValue(item.expected_output),
    id: `saved-${index}-${stringValue(item.scenario) || "case"}`,
    input: stringValue(item.input),
    notes: stringValue(item.notes),
    result: normalizeTestCaseResult(item.result),
    scenario: stringValue(item.scenario),
  }));
  return testCases.length > 0 ? testCases : defaultTestCases;
}

function toPayloadTestCase(testCase: TestCaseDraft): StageFourTestCase {
  const notes = testCase.notes.trim();
  return {
    actual_output: testCase.actualOutput.trim(),
    expected_output: testCase.expectedOutput.trim(),
    input: testCase.input.trim(),
    result: testCase.result,
    scenario: testCase.scenario.trim(),
    ...(notes ? { notes } : {}),
  };
}

function isCompleteTestCase(testCase: TestCaseDraft): boolean {
  return (
    hasText(testCase.scenario) &&
    hasText(testCase.input) &&
    hasText(testCase.expectedOutput) &&
    hasText(testCase.actualOutput)
  );
}

function latestArtifactOfType(artifacts: Artifact[], artifactType: string): Artifact | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === artifactType)
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null
  );
}

function compareArtifactsByCreatedAt(left: Artifact, right: Artifact): number {
  return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function arrayOrString(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeProductText(String(item)))
      .filter((item) => item.trim().length > 0);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return lines(value).map(sanitizeProductText);
  }
  return [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? sanitizeProductText(value) : "";
}

function normalizeAppMode(value: unknown): StageFourAppMode {
  if (value === "chatflow" || value === "workflow" || value === "agent") {
    return value;
  }
  return "chatflow";
}

function normalizeOverallResult(value: unknown): StageFourOverallResult {
  return value === "passed" ? "passed" : "needs_revision";
}

function normalizeTestCaseResult(value: unknown): StageFourTestCaseResult {
  if (value === "passed" || value === "failed" || value === "partial") {
    return value;
  }
  return "partial";
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

function releaseReadinessCopy(value: string): string {
  const map: Record<string, string> = {
    needs_revision_before_stage_5: "需要修改后再进入交付准备",
    ready_for_stage_5: "可进入交付准备",
  };
  return map[value] ?? (value ? sanitizeProductText(value) : "待人工复核");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
