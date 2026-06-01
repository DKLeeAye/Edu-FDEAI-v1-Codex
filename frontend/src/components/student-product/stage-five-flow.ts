export type StageFiveMode = "document" | "acceptance";

export type StageFiveVNextStep = StageFiveMode;

export type StageFiveArtifactLike = {
  artifact_type: string;
  content_json: Record<string, unknown>;
  created_at: string;
  id: string;
};

export type StageFiveChapterKey =
  | "goal"
  | "usage"
  | "scope"
  | "boundary"
  | "test"
  | "maintenance";

export type StageFiveChapterStatus = "unchecked" | "pass" | "revise" | "rewrite";

export type StageFiveChapterStatuses = Record<StageFiveChapterKey, StageFiveChapterStatus>;

export type StageFiveChapterDrafts = {
  boundary: {
    supported: string;
    unsupported: string;
  };
  goal: {
    purpose: string;
    scenario: string;
  };
  maintenance: {
    feedback: string;
    owner: string;
  };
  scope: {
    excluded: string;
    included: string;
  };
  test: {
    conclusion: string;
    summary: string;
  };
  usage: {
    access: string;
    answer: string;
    exception: string;
    questions: string;
  };
};

export type StageFiveDeliveryDocumentPayloadLike = {
  core_features: string[];
  delivery_summary: string;
  final_agent_url: string;
  known_limitations: string[];
  project_name: string;
  target_users: string[];
  usage_instructions: string;
};

export type StageFiveOperationsGuidePayloadLike = {
  common_issues: string[];
  data_update_plan: string;
  maintenance_owner_notes: string;
  monitoring_plan: string;
  runtime_dependencies: string[];
};

export type StageFiveAcceptancePackagePayloadLike = {
  acceptance_criteria: string[];
  acceptance_scope: string;
  handover_checklist: string[];
  test_evidence_summary: string;
  unresolved_issues: string[];
};

export type StageFiveDeliveryPackageKey =
  | "publishLink"
  | "platformTest"
  | "usageGuide"
  | "knownLimitations"
  | "maintenanceGuide"
  | "demoScript"
  | "nextVersion";

export type StageFiveSignoffCheckKey = "testEvidence" | "boundary" | "maintenance";

export type StageFiveAcceptanceDecision = "pass" | "conditional" | "revise" | "";

export type StageFiveAcceptanceTarget = {
  appName: string;
  knowledgeName: string;
  publishUrl: string;
  stageFourScore?: number | null;
};

export type StageFiveAcceptanceState = {
  archiveChecks: Record<StageFiveSignoffCheckKey, boolean>;
  decision: StageFiveAcceptanceDecision;
  hasDeliveryDocument: boolean;
  hasOperationsGuide: boolean;
  packageChecks: Record<StageFiveDeliveryPackageKey, boolean>;
  reviewDone: boolean;
  signoffNote: string;
  target: StageFiveAcceptanceTarget;
};

export type StageFiveAcceptanceQuestion = {
  answer: string;
  label: string;
  question: string;
};

export const stageFiveAcceptanceNavigationItems = [
  "阶段三 RAG",
  "阶段四测试",
  "交付文档",
  "验收确认",
] as const;

export type StageFiveAcceptanceArtifactSnapshot = {
  acceptancePackage?: Record<string, unknown> | null;
  deliveryDocument?: Record<string, unknown> | null;
  operationsGuide?: Record<string, unknown> | null;
  stageFourImplementation?: Record<string, unknown> | null;
  stageFourTestReport?: Record<string, unknown> | null;
};

export type StageFiveDocumentArtifactSnapshot = {
  deliveryDocument?: Record<string, unknown> | null;
  operationsGuide?: Record<string, unknown> | null;
  stageFourImplementation?: Record<string, unknown> | null;
  stageFourTestReport?: Record<string, unknown> | null;
  stageThreeDecision?: Record<string, unknown> | null;
};

export type StageFiveDocumentSnapshot = {
  drafts: StageFiveChapterDrafts;
  statuses: StageFiveChapterStatuses;
};

export type StageFiveChapterScore = {
  checkedAt: string;
  chapter: StageFiveChapterKey;
  dimensions: Array<{
    label: string;
    note: string;
    pass: boolean;
  }>;
  issues: string[];
  score: number;
  status: StageFiveChapterStatus;
  suggestions: string[];
};

export type StageFiveDeliveryContextCard = {
  body: string;
  label: string;
  title: string;
};

export type StageFiveDeliveryWritingField = {
  draftKey: string;
  label: string;
  rows: number;
};

export type StageFiveDeliveryEvidence =
  | {
      items: Array<{ body: string; label: string }>;
      variant: "rows";
    }
  | {
      items: Array<{ body: string; label: string }>;
      variant: "grid" | "tech-source-grid" | "acceptance-board";
    }
  | {
      items: string[];
      variant: "boundary-list";
    };

export type StageFiveDeliveryChapterModel = {
  evidence: StageFiveDeliveryEvidence;
  id: string;
  key: StageFiveChapterKey;
  kicker: string;
  methodBody: string;
  methodGrid: {
    items: Array<{ label: string; tone?: "ok" | "warn" | "danger" }>;
    variant: "default" | "five" | "feasibility";
  };
  methodTitle: string;
  number: string;
  title: string;
  writingFields: StageFiveDeliveryWritingField[];
  writingTitle: string;
};

export type StageFiveDeliveryPreviewSection = {
  fields: Array<{
    label: string;
    value: string;
  }>;
  number: string;
  title: string;
};

export type StageFiveAcceptanceAgendaItem = {
  body: string;
  number: string;
  title: string;
};

export type StageFiveDeliveryPackageItem = {
  body: string;
  key: StageFiveDeliveryPackageKey;
  label: string;
};

export type StageFiveAcceptanceReadinessGate = {
  key: "target" | "package" | "docs" | "review" | "signoff";
  label: string;
};

export type StageFiveSignoffOption = {
  body: string;
  decision: Exclude<StageFiveAcceptanceDecision, "">;
  title: string;
};

export const stageFiveDeliveryDocumentType = "stage_5_delivery_document";
export const stageFiveAcceptancePackageType = "stage_5_acceptance_package";
export const stageFiveOperationsGuideType = "stage_5_operations_guide";
export const stageFiveAiReviewType = "stage_5_ai_delivery_review";

export const stageFiveChapterKeys = [
  "goal",
  "usage",
  "scope",
  "boundary",
  "test",
  "maintenance",
] as const satisfies readonly StageFiveChapterKey[];

export const stageFiveDeliveryPackageKeys = [
  "publishLink",
  "platformTest",
  "usageGuide",
  "knownLimitations",
  "maintenanceGuide",
  "demoScript",
  "nextVersion",
] as const satisfies readonly StageFiveDeliveryPackageKey[];

export const stageFiveSignoffCheckKeys = [
  "testEvidence",
  "boundary",
  "maintenance",
] as const satisfies readonly StageFiveSignoffCheckKey[];

export const stageFiveChapterSpecs: Array<{
  description: string;
  key: StageFiveChapterKey;
  kicker: string;
  number: string;
  title: string;
}> = [
  {
    description: "说明客户拿到的是什么、面向谁、解决什么审厂追溯任务。",
    key: "goal",
    kicker: "Delivery Goal",
    number: "01",
    title: "交付目标与项目概览",
  },
  {
    description: "说明客户怎么提问、怎么看引用、遇到资料不足时怎么处理。",
    key: "usage",
    kicker: "Usage Guide",
    number: "02",
    title: "智能体使用说明",
  },
  {
    description: "说明知识库纳入资料、未纳入资料和不能作为确定性证据的范围。",
    key: "scope",
    kicker: "Knowledge Scope",
    number: "03",
    title: "知识库资料范围",
  },
  {
    description: "写清可回答问题、资料不足、转人工和不支持的高风险边界。",
    key: "boundary",
    kicker: "Supported Questions",
    number: "04",
    title: "支持问题与使用边界",
  },
  {
    description: "用平台测试证据说明是否达到交付试用和客户验收门槛。",
    key: "test",
    kicker: "Test & Acceptance",
    number: "05",
    title: "测试结果与验收结论",
  },
  {
    description: "说明谁维护资料、何时重测、怎么记录问题和版本变化。",
    key: "maintenance",
    kicker: "Maintenance",
    number: "06",
    title: "维护与更新说明",
  },
];

export const stageFiveDeliveryContextCards: StageFiveDeliveryContextCard[] = [
  {
    body: "发布链接、知识库名称、自动化测试结果和整改建议。",
    label: "阶段四输入",
    title: "Dify 应用与测试评分",
  },
  {
    body: "可回答范围、资料不足提示、转人工规则和风险边界。",
    label: "阶段三输入",
    title: "RAG 边界与资料范围",
  },
  {
    body: "用于客户接收、教师评审、档案袋归档和后续维护。",
    label: "本页产物",
    title: "客户可读交付说明文档",
  },
];

export const stageFiveDeliveryChapterModels: StageFiveDeliveryChapterModel[] = [
  {
    evidence: {
      items: [
        {
          body: "汽车零部件工厂在客户审厂前，需要快速准备批次质检记录、异常处置、复检结果和整改证据。",
          label: "客户场景",
        },
        {
          body: "Dify Chatflow 应用：制造业质检追溯 AI 助手；知识库：制造业质检追溯知识库 v1。",
          label: "交付对象",
        },
        {
          body: "平台自动化测试覆盖正常追溯、证据引用、资料不足和风险边界四类问题。",
          label: "测试基础",
        },
      ],
      variant: "rows",
    },
    id: "chapter-goal",
    key: "goal",
    kicker: "Delivery Goal",
    methodBody:
      "这一章需要写清项目背景、交付对象、适用角色和客户可以用它完成的业务任务。避免写成“我们做了一个 AI 项目”，要写成客户可接收的交付说明。",
    methodGrid: {
      items: [
        { label: "交付对象" },
        { label: "使用角色" },
        { label: "业务场景" },
        { label: "交付价值" },
      ],
      variant: "default",
    },
    methodTitle: "交付文档开头要说明客户拿到的是什么，而不是复述课程过程。",
    number: "01",
    title: "交付目标与项目概览",
    writingFields: [
      { draftKey: "purpose", label: "交付目标", rows: 4 },
      { draftKey: "scenario", label: "适用场景", rows: 4 },
    ],
    writingTitle: "项目概览段落",
  },
  {
    evidence: {
      items: [
        { body: "批次号、缺陷类型、工序名称、SOP 条款或审厂问题。", label: "输入线索" },
        { body: "回答需包含结论、来源引用、缺失资料提示和必要转人工说明。", label: "输出要求" },
        { body: "质量负责人、质量工程师、审厂材料准备人员。", label: "客户角色" },
        { body: "字段缺失、图片未标注、记录冲突时不能给确定性结论。", label: "限制条件" },
      ],
      variant: "grid",
    },
    id: "chapter-usage",
    key: "usage",
    kicker: "Usage Guide",
    methodBody:
      "不要只写“点击链接使用”。需要说明推荐提问方式、回答结构、引用含义、资料不足时的处理动作，以及客户如何把回答用于审厂准备。",
    methodGrid: {
      items: [
        { label: "访问入口" },
        { label: "提问方式" },
        { label: "回答结构" },
        { label: "引用阅读" },
        { label: "异常处理" },
      ],
      variant: "five",
    },
    methodTitle: "使用说明要让客户知道怎么提问、怎么看引用、怎么处理资料不足。",
    number: "02",
    title: "智能体使用说明",
    writingFields: [
      { draftKey: "questions", label: "推荐提问方式", rows: 4 },
      { draftKey: "answer", label: "回答阅读方式", rows: 4 },
      { draftKey: "exception", label: "异常处理方式", rows: 4 },
      { draftKey: "access", label: "访问与权限说明", rows: 4 },
    ],
    writingTitle: "客户使用说明",
  },
  {
    evidence: {
      items: [
        { body: "作为稳定制度资料进入知识库，回答时引用条款和文件版本。", label: "SOP / 标准" },
        { body: "用于批次、工序、检验时间等结构化线索，字段缺失需提示。", label: "MES 导出" },
        { body: "用于异常处置、复检和整改闭环记录，需统一字段口径。", label: "Excel 台账" },
        { body: "未标注图片和低质量扫描件不能作为确定性证据。", label: "图片 / 纸质单" },
      ],
      variant: "tech-source-grid",
    },
    id: "chapter-scope",
    key: "scope",
    kicker: "Knowledge Scope",
    methodBody:
      "这一章需要把阶段三的数据质量评估、分块、向量化、召回测试和风险边界转成客户可理解的资料说明。客户需要知道回答来自哪里，也要知道哪些资料暂未纳入。",
    methodGrid: {
      items: [
        { label: "资料来源" },
        { label: "处理方式" },
        { label: "引用粒度" },
        { label: "未纳入资料" },
      ],
      variant: "default",
    },
    methodTitle: "资料范围要写清“用了什么、没用什么、为什么不能直接回答”。",
    number: "03",
    title: "知识库资料范围",
    writingFields: [
      { draftKey: "included", label: "已纳入资料范围", rows: 5 },
      { draftKey: "excluded", label: "未纳入或需谨慎使用的资料", rows: 5 },
    ],
    writingTitle: "资料范围说明",
  },
  {
    evidence: {
      items: [
        "可回答：批次追溯、SOP 条款、缺陷类型说明、整改记录查询。",
        "资料不足：MES 缺字段、复检记录缺失、图片无标注、纸质单据不可识别。",
        "转人工：质量责任归属、客户索赔、处罚建议、记录冲突。",
      ],
      variant: "boundary-list",
    },
    id: "chapter-boundary",
    key: "boundary",
    kicker: "Supported Questions",
    methodBody:
      "客户最容易误用 AI 的地方，是把追溯助手当成判责系统。这里要把阶段三风险边界和阶段四测试结果写成清楚的客户规则。",
    methodGrid: {
      items: [
        { label: "可回答", tone: "ok" },
        { label: "资料不足", tone: "warn" },
        { label: "需转人工", tone: "danger" },
        { label: "不支持", tone: "danger" },
      ],
      variant: "feasibility",
    },
    methodTitle: "交付说明必须明确哪些问题能答，哪些问题必须提示资料不足或转人工。",
    number: "04",
    title: "支持问题与使用边界",
    writingFields: [
      { draftKey: "supported", label: "支持的问题类型", rows: 4 },
      { draftKey: "unsupported", label: "不支持与转人工场景", rows: 4 },
    ],
    writingTitle: "使用边界声明",
  },
  {
    evidence: {
      items: [
        { body: "正常追溯、证据引用、资料不足、风险边界四类测试集。", label: "测试覆盖" },
        { body: "召回准确性、引用可追溯性、边界控制、业务流程完整性。", label: "评分维度" },
        { body: "失败项需定位到 Prompt、知识库、召回、分支或边界规则。", label: "整改闭环" },
      ],
      variant: "acceptance-board",
    },
    id: "chapter-test",
    key: "test",
    kicker: "Test & Acceptance",
    methodBody:
      "这一章要概括平台自动化测试覆盖了哪些题型、通过了哪些维度、仍有哪些整改建议。测试失败项不能被隐藏，应写成客户可理解的限制和后续计划。",
    methodGrid: {
      items: [
        { label: "追溯题", tone: "ok" },
        { label: "引用题", tone: "ok" },
        { label: "资料不足题", tone: "warn" },
        { label: "风险边界题", tone: "danger" },
      ],
      variant: "feasibility",
    },
    methodTitle: "验收结论必须基于测试证据，而不是一句“运行正常”。",
    number: "05",
    title: "测试结果与验收结论",
    writingFields: [
      { draftKey: "summary", label: "测试结果摘要", rows: 5 },
      { draftKey: "conclusion", label: "验收结论", rows: 4 },
    ],
    writingTitle: "测试与验收结论",
  },
  {
    evidence: {
      items: [
        {
          body: "SOP、审厂要求、MES 字段、整改闭环资料更新后，召回结果和引用内容都会变化。",
          label: "资料变化",
        },
        {
          body: "新增资料、修改 Prompt 或调整 Chatflow 分支后，应重新执行平台自动化测试。",
          label: "测试要求",
        },
        {
          body: "客户发现回答无来源、引用错误、边界判断错误时，需要记录问题并进入整改闭环。",
          label: "反馈机制",
        },
      ],
      variant: "rows",
    },
    id: "chapter-maintenance",
    key: "maintenance",
    kicker: "Maintenance",
    methodBody:
      "如果知识库资料或 Prompt 变化，没有重新测试就继续使用，会破坏交付可信度。维护说明要写清责任人、更新触发条件和重新验收要求。",
    methodGrid: {
      items: [
        { label: "资料维护" },
        { label: "Prompt 版本" },
        { label: "测试回归" },
        { label: "问题反馈" },
      ],
      variant: "default",
    },
    methodTitle: "交付不是结束，还要说明谁维护资料、何时重测、怎么处理版本变化。",
    number: "06",
    title: "维护与更新说明",
    writingFields: [
      { draftKey: "owner", label: "维护责任与更新触发", rows: 5 },
      { draftKey: "feedback", label: "问题反馈与后续计划", rows: 4 },
    ],
    writingTitle: "维护与更新计划",
  },
];

export const stageFiveAcceptanceAgendaItems: StageFiveAcceptanceAgendaItem[] = [
  {
    body: "应用链接、知识库名称、发布版本、测试评分可追溯。",
    number: "01",
    title: "确认交付对象",
  },
  {
    body: "演示批次追溯、SOP 引用、资料不足提示三类问题。",
    number: "02",
    title: "演示核心用例",
  },
  {
    body: "解释缺失数据、责任判定、知识库维护和版本更新边界。",
    number: "03",
    title: "回答客户追问",
  },
  {
    body: "记录是否通过、是否需整改，以及进入项目档案袋的依据。",
    number: "04",
    title: "形成验收结论",
  },
];

export const stageFiveDeliveryPackageItems: StageFiveDeliveryPackageItem[] = [
  {
    body: "客户可打开并完成基础问答。",
    key: "publishLink",
    label: "Dify 发布链接",
  },
  {
    body: "包含测试题、回答、引用、评分和整改结果。",
    key: "platformTest",
    label: "平台自动化测试记录",
  },
  {
    body: "说明适用问题、提问方式、引用结果如何阅读。",
    key: "usageGuide",
    label: "客户使用说明",
  },
  {
    body: "列出缺字段、图片标注、责任判定等边界。",
    key: "knownLimitations",
    label: "已知限制说明",
  },
  {
    body: "说明知识库资料、Prompt、测试集由谁维护。",
    key: "maintenanceGuide",
    label: "维护与更新说明",
  },
  {
    body: "准备 3 个范围内问题和 2 个边界问题。",
    key: "demoScript",
    label: "客户演示脚本",
  },
  {
    body: "把本期不做的问题转成后续改进计划。",
    key: "nextVersion",
    label: "下一版本建议",
  },
];

export const stageFiveAcceptanceReadinessGates: StageFiveAcceptanceReadinessGate[] = [
  { key: "target", label: "交付对象完整" },
  { key: "package", label: "交付包清单完成" },
  { key: "docs", label: "交付说明文档已提交" },
  { key: "review", label: "模拟验收已完成" },
  { key: "signoff", label: "验收结论已确认" },
];

export const stageFiveSignoffOptions: StageFiveSignoffOption[] = [
  {
    body: "交付材料完整，已说明使用边界，可进入档案袋。",
    decision: "pass",
    title: "通过验收",
  },
  {
    body: "可归档，但需要记录后续整改项或维护安排。",
    decision: "conditional",
    title: "有条件通过",
  },
  {
    body: "交付说明、测试结果或边界说明仍不足，需要回到前序页面修订。",
    decision: "revise",
    title: "退回修改",
  },
];

export const stageFiveDemoScriptSteps = [
  "展示应用链接与知识库来源。",
  "演示批次追溯和 SOP 引用问题。",
  "演示资料不足时的边界提示。",
  "说明维护责任与下一版本计划。",
];

export const stageFiveAcceptanceBlockedToast = "请先完成交付对象、清单、说明和模拟验收";
export const stageFiveAcceptanceSavedToast = "交付验收记录已保存，可以进入项目档案袋";
export const stageFiveDemoScriptCopyToast = "客户演示脚本已复制";
export const stageFiveDemoScriptCopyFallbackToast = "复制失败，请手动复制侧栏脚本";

export function createStageFiveDemoScriptCopyText(): string {
  return [
    "1. 展示制造业质检追溯 AI 助手链接。",
    "2. 演示批次追溯、SOP 引用和资料不足提示。",
    "3. 说明不做责任判定、不伪造缺失数据。",
    "4. 说明知识库维护责任和下一版本计划。",
  ].join("\n");
}

export function deriveStageFiveVNextStep(
  artifacts: StageFiveArtifactLike[],
  stageStatus?: string,
): StageFiveVNextStep {
  if (stageStatus === "completed") {
    return "acceptance";
  }
  if (
    latestStageFiveArtifactOfType(artifacts, stageFiveAiReviewType) !== null ||
    latestStageFiveArtifactOfType(artifacts, stageFiveAcceptancePackageType) !== null
  ) {
    return "acceptance";
  }
  return latestStageFiveArtifactOfType(artifacts, stageFiveDeliveryDocumentType) !== null &&
    latestStageFiveArtifactOfType(artifacts, stageFiveOperationsGuideType) !== null
    ? "acceptance"
    : "document";
}

export function isStageFiveFocusedMode(mode: StageFiveMode): boolean {
  return mode === "document" || mode === "acceptance";
}

export function isStageFiveDocumentReady(statuses: StageFiveChapterStatuses): boolean {
  return stageFiveChapterKeys.every((key) => statuses[key] === "pass");
}

export function canSaveStageFiveChapter(status: StageFiveChapterStatus): boolean {
  return status === "pass";
}

export function createStageFiveDeliveryPreviewSections(
  chapters: StageFiveChapterDrafts,
): StageFiveDeliveryPreviewSection[] {
  return stageFiveDeliveryChapterModels.map((chapter) => ({
    fields: chapter.writingFields.map((field) => ({
      label: field.label,
      value: stageFiveChapterDraftFieldValue(chapters, chapter.key, field.draftKey) || "—",
    })),
    number: chapter.number,
    title: chapter.title,
  }));
}

export function scoreStageFiveChapter(
  chapter: StageFiveChapterKey,
  text: string,
  checkedAt = new Date().toISOString(),
): StageFiveChapterScore {
  const normalized = text.trim();
  const lengthScore = Math.min(24, Math.floor(normalized.length / 30));
  const customerScore = /(客户|质量负责人|审厂|使用|交付|验收|维护)/.test(normalized) ? 18 : 8;
  const evidenceScore = /(Dify|知识库|测试|评分|引用|MES|SOP|批次|资料|边界)/.test(normalized)
    ? 20
    : 8;
  const boundaryScore = /(不能|不支持|资料不足|转人工|限制|风险|缺失|责任|人工复核)/.test(
    normalized,
  )
    ? 18
    : 7;
  const structureScore = normalized.length >= 180 ? 6 : 0;
  const score = Math.min(
    96,
    34 + lengthScore + customerScore + evidenceScore + boundaryScore + structureScore,
  );
  const status: StageFiveChapterStatus =
    score >= 80 ? "pass" : score >= 60 ? "revise" : "rewrite";
  const dimensions = [
    {
      label: "客户可读",
      note: "是否面向客户说明如何接收、使用和理解交付物。",
      pass: customerScore >= 18,
    },
    {
      label: "项目证据",
      note: "是否引用 Dify 应用、知识库、测试评分、资料范围等事实依据。",
      pass: evidenceScore >= 20,
    },
    {
      label: "边界清楚",
      note: "是否写清资料不足、转人工、维护限制和责任边界。",
      pass: boundaryScore >= 18,
    },
    {
      label: "交付颗粒度",
      note: "是否达到正式交付说明文档的段落完整度。",
      pass: normalized.length >= 180,
    },
  ];
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (normalized.length < 180) {
    issues.push("本章内容偏短，还不足以作为客户可接收的交付文档段落。");
    suggestions.push("补充客户如何使用、可依据哪些证据、遇到限制时如何处理。");
  }
  if (customerScore < 18) {
    issues.push("客户阅读视角不足，仍像课程过程记录。");
    suggestions.push("改成客户能直接理解的说明，避免只写课程实现过程。");
  }
  if (evidenceScore < 20) {
    issues.push("缺少真实项目证据，交付文档可能无法支撑验收。");
    suggestions.push("引用 Dify 应用、知识库范围、平台测试评分、SOP/MES/批次资料或边界规则。");
  }
  if (boundaryScore < 18) {
    issues.push("使用边界或维护限制不够清楚，容易造成客户误用。");
    suggestions.push("写清资料不足、字段缺失、责任判定、记录冲突等场景的处理方式。");
  }
  if (issues.length === 0) {
    issues.push("本章达到保存门槛，可继续压缩重复表达并统一客户交付语气。");
    suggestions.push("保存前检查是否避免夸大智能体能力，并确认每个结论都有来源。");
  }

  return {
    checkedAt,
    chapter,
    dimensions,
    issues,
    score,
    status,
    suggestions,
  };
}

export function createStageFiveDeliveryDocumentPayloadFromVNext({
  chapters,
  stageFourImplementation,
}: {
  chapters: StageFiveChapterDrafts;
  stageFourImplementation?: Record<string, unknown> | null;
}): StageFiveDeliveryDocumentPayloadLike {
  const appName = stringValue(stageFourImplementation?.dify_app_name) || "制造业质检追溯 AI 助手";
  const appUrl =
    stringValue(stageFourImplementation?.dify_app_url) ||
    "https://example.dify.ai/chat/manufacturing-quality-agent";

  return {
    core_features: [
      "批次追溯资料查询",
      "SOP 与审厂材料引用",
      "资料不足提示与范围外问题拒答",
      "整改闭环材料准备辅助",
    ],
    delivery_summary: joinSections([
      ["交付目标", chapters.goal.purpose],
      ["适用场景", chapters.goal.scenario],
      ["资料范围", chapters.scope.included],
      ["未纳入资料", chapters.scope.excluded],
      ["边界声明", chapters.boundary.unsupported],
      ["测试结果", chapters.test.summary],
      ["验收结论", chapters.test.conclusion],
    ]),
    final_agent_url: appUrl,
    known_limitations: uniqueNonEmptyLines([
      ...lines(chapters.boundary.unsupported),
      ...lines(chapters.scope.excluded),
      ...lines(chapters.usage.exception),
    ]),
    project_name: `${appName}交付说明文档`,
    target_users: ["质量负责人", "质量工程师", "审厂材料准备人员"],
    usage_instructions: joinSections([
      ["推荐提问方式", chapters.usage.questions],
      ["回答阅读方式", chapters.usage.answer],
      ["异常处理方式", chapters.usage.exception],
      ["访问与权限说明", chapters.usage.access],
      ["支持的问题类型", chapters.boundary.supported],
    ]),
  };
}

export function stageFiveDocumentSnapshotFromArtifacts({
  deliveryDocument,
  operationsGuide,
  stageFourImplementation,
  stageFourTestReport,
  stageThreeDecision,
}: StageFiveDocumentArtifactSnapshot): StageFiveDocumentSnapshot {
  const deliverySummary = stringValue(deliveryDocument?.delivery_summary);
  const usageInstructions = stringValue(deliveryDocument?.usage_instructions);
  const maintenanceNotes = stringValue(operationsGuide?.maintenance_owner_notes);
  const stageThreeSources = arrayOrString(stageThreeDecision?.source_inventory);
  const stageThreeRisks = arrayOrString(stageThreeDecision?.data_quality_risks);
  const stageThreeGoal = stringValue(stageThreeDecision?.knowledge_goal);
  const implementationAppName =
    stringValue(stageFourImplementation?.dify_app_name) || "制造业质检追溯 AI 助手";
  const testFailures = arrayOrString(stageFourTestReport?.observed_failures);
  const deliveryLimitations = arrayOrString(deliveryDocument?.known_limitations);

  const drafts: StageFiveChapterDrafts = {
    boundary: {
      supported:
        sectionValue(usageInstructions, "支持的问题类型") ||
        arrayOrString(deliveryDocument?.core_features).join("；") ||
        "智能体支持围绕批次追溯、缺陷类型、质检 SOP、审厂资料准备和整改闭环记录的问答。范围内问题应返回结论摘要、引用来源和必要的资料缺口提示。",
      unsupported:
        sectionValue(deliverySummary, "边界声明") ||
        deliveryLimitations.join("\n") ||
        "智能体不支持质量责任判定、客户索赔结论、处罚建议、替代审批和自动补齐缺失字段。涉及责任归属、记录冲突或缺失关键字段时，应提示资料不足并转人工确认。",
    },
    goal: {
      purpose:
        sectionValue(deliverySummary, "交付目标") ||
        stringValue(deliveryDocument?.delivery_summary) ||
        `本项目交付一个面向制造业质检追溯场景的 ${implementationAppName}，帮助质量负责人在客户审厂、内部复盘和异常追溯时快速查询质检记录、SOP 条款、整改材料和资料缺口。`,
      scenario:
        sectionValue(deliverySummary, "适用场景") ||
        stageThreeGoal ||
        "该助手适用于批次追溯、缺陷类型查询、SOP 条款确认、整改闭环材料准备等场景；不用于质量责任判定、客户索赔结论或替代 MES/质量管理系统审批。",
    },
    maintenance: {
      feedback:
        sectionValue(maintenanceNotes, "问题反馈与后续计划") ||
        stringValue(operationsGuide?.maintenance_owner_notes) ||
        "客户发现回答缺少来源、引用错误、资料不足提示不清或风险边界判断不当时，应记录问题类型、测试问题、实际回答和期望行为，并回到 Dify 配置或知识库资料处理环节整改。",
      owner:
        sectionValue(maintenanceNotes, "维护责任与更新触发") ||
        stringValue(operationsGuide?.data_update_plan) ||
        "知识库资料应由质量负责人或指定维护人定期更新。新增 SOP、客户审厂要求、MES 字段、Excel 台账或整改闭环资料后，应记录版本变化，并重新执行召回测试和平台自动化测试。",
    },
    scope: {
      excluded:
        sectionValue(deliverySummary, "未纳入资料") ||
        stageThreeRisks.join("\n") ||
        "未标注缺陷位置的图片、无法识别字段的纸质扫描件、缺少批次号的手工记录、来源不明的口头说明暂不作为确定性证据。",
      included:
        sectionValue(deliverySummary, "资料范围") ||
        stageThreeSources.join("\n") ||
        "本次知识库纳入质检 SOP、审厂资料清单、MES 批次导出记录、Excel 异常处置台账和已完成字段整理的整改闭环资料。",
    },
    test: {
      conclusion:
        sectionValue(deliverySummary, "验收结论") ||
        (stringValue(stageFourTestReport?.overall_result) === "passed"
          ? "在当前资料范围和边界规则下，智能体可作为审厂追溯资料查询与准备辅助工具交付试用。若客户扩展到责任判定、索赔建议或未结构化图片识别，需要新增资料处理与人工审核流程后重新验收。"
          : "测试中仍存在需要整改的项，交付前应明确限制、整改计划和重新验收要求。"),
      summary:
        sectionValue(deliverySummary, "测试结果") ||
        stringValue(stageFourTestReport?.coverage_notes) ||
        testFailures.join("\n") ||
        "平台自动化测试覆盖正常追溯、证据引用、资料不足和风险边界四类场景。测试结果用于确认智能体是否能命中正确证据、引用来源、控制越界回答，并在高风险问题中触发转人工规则。",
    },
    usage: {
      access:
        sectionValue(usageInstructions, "访问与权限说明") ||
        `Dify 应用发布链接 ${stringValue(stageFourImplementation?.dify_app_url) || "需在交付时确认"} 仅供课程验收和授权测试使用。若应用需要测试账号、访问密钥或白名单，应同步提供有效期和访问限制说明。`,
      answer:
        sectionValue(usageInstructions, "回答阅读方式") ||
        "客户应重点查看回答中的来源文件、批次记录、SOP 条款和资料缺口提示。若回答提示资料不足，应回到原始系统或人工补充记录后再使用结论。",
      exception:
        sectionValue(usageInstructions, "异常处理方式") ||
        "当智能体提示字段缺失、记录冲突或需要人工确认时，客户不应将回答作为最终质量结论，而应转给质量负责人或相关系统维护人复核。",
      questions:
        sectionValue(usageInstructions, "推荐提问方式") ||
        "建议客户使用“批次号 + 业务任务”或“缺陷类型 + 工序 + 资料需求”的方式提问，例如“B-2026-0412 批次审厂前需要准备哪些质检追溯材料？”",
    },
  };

  return {
    drafts,
    statuses:
      deliveryDocument && operationsGuide
        ? (Object.fromEntries(stageFiveChapterKeys.map((key) => [key, "pass"])) as StageFiveChapterStatuses)
        : (Object.fromEntries(stageFiveChapterKeys.map((key) => [key, "unchecked"])) as StageFiveChapterStatuses),
  };
}

export function createStageFiveOperationsGuidePayloadFromVNext({
  chapters,
  stageFourImplementation,
  stageFourTestReport,
}: {
  chapters: StageFiveChapterDrafts;
  stageFourImplementation?: Record<string, unknown> | null;
  stageFourTestReport?: Record<string, unknown> | null;
}): StageFiveOperationsGuidePayloadLike {
  const knowledgeName = extractKnowledgeName(stageFourImplementation?.knowledge_base_notes);
  const failures = arrayOrString(stageFourTestReport?.observed_failures);
  const actions = arrayOrString(stageFourTestReport?.improvement_actions);

  return {
    common_issues: uniqueNonEmptyLines([
      ...failures,
      ...actions,
      ...lines(chapters.scope.excluded),
      ...lines(chapters.boundary.unsupported),
    ]),
    data_update_plan: chapters.maintenance.owner.trim(),
    maintenance_owner_notes: joinSections([
      ["维护责任与更新触发", chapters.maintenance.owner],
      ["问题反馈与后续计划", chapters.maintenance.feedback],
    ]),
    monitoring_plan: joinLines([
      chapters.test.summary,
      chapters.maintenance.owner,
      chapters.maintenance.feedback,
      "新增资料、修改 Prompt 或调整 Chatflow 分支后，应重新执行召回测试和平台自动化测试。",
    ]),
    runtime_dependencies: [
      "Dify Chatflow 发布应用",
      knowledgeName,
      "课程阶段三清洗后的 SOP、MES、Excel 与审厂资料",
      "阶段四平台自动化测试集",
    ],
  };
}

export function createStageFiveAcceptanceQuestions(): StageFiveAcceptanceQuestion[] {
  return [
    {
      answer: "需要说明图片缺少批次和工序标注，系统不能编造关联，只能提示补充元数据后再检索。",
      label: "客户追问 01",
      question: "如果客户问“为什么某张缺陷图片无法追溯到批次”，你如何解释？",
    },
    {
      answer: "应说明责任判定不在本期智能体范围内，需要质量负责人结合完整证据人工复核。",
      label: "客户追问 02",
      question: "客户要求系统直接判断质量事故责任，交付时如何说明边界？",
    },
    {
      answer: "交付说明中应明确资料维护人、更新频率，以及更新后必须重新执行召回测试和平台评分。",
      label: "客户追问 03",
      question: "后续 SOP 更新后，谁负责维护知识库和测试集？",
    },
  ];
}

export function isStageFiveAcceptanceReady(state: StageFiveAcceptanceState): boolean {
  return (
    hasText(state.target.appName) &&
    hasText(state.target.knowledgeName) &&
    isHttpUrl(state.target.publishUrl) &&
    stageFiveDeliveryPackageKeys.every((key) => state.packageChecks[key]) &&
    state.hasDeliveryDocument &&
    state.hasOperationsGuide &&
    state.reviewDone &&
    isStageFiveAcceptanceDecisionArchivable(state.decision) &&
    state.signoffNote.trim().length >= 36 &&
    stageFiveSignoffCheckKeys.every((key) => state.archiveChecks[key])
  );
}

export function isStageFiveAcceptanceDecisionArchivable(
  decision: StageFiveAcceptanceDecision,
): boolean {
  return decision === "pass" || decision === "conditional";
}

export function createStageFiveAcceptancePackagePayloadFromVNext({
  acceptanceState,
  questions,
  stageFourTestReport,
}: {
  acceptanceState: StageFiveAcceptanceState;
  questions: StageFiveAcceptanceQuestion[];
  stageFourTestReport?: Record<string, unknown> | null;
}): StageFiveAcceptancePackagePayloadLike {
  const packageLabels = stageFiveDeliveryPackageKeys.map(deliveryPackageLabel);
  const archiveLabels = stageFiveSignoffCheckKeys.map(signoffCheckLabel);
  const actions = arrayOrString(stageFourTestReport?.improvement_actions);
  const scoreCopy =
    typeof acceptanceState.target.stageFourScore === "number"
      ? `阶段四测试评分：${acceptanceState.target.stageFourScore}。`
      : "";

  return {
    acceptance_criteria: [
      ...packageLabels.map((label) => `交付包包含：${label}`),
      ...questions.map((item) => `${item.label}: ${item.question}`),
    ],
    acceptance_scope: joinLines([
      `交付对象：${acceptanceState.target.appName} / ${acceptanceState.target.knowledgeName}`,
      `发布链接：${acceptanceState.target.publishUrl}`,
      `验收结论：${decisionLabel(acceptanceState.decision)}`,
      acceptanceState.signoffNote,
    ]),
    handover_checklist: [
      ...packageLabels.map((label) => `已核对 ${label}`),
      ...archiveLabels.map((label) => `已确认 ${label}`),
    ],
    test_evidence_summary: joinLines([
      scoreCopy,
      stringValue(stageFourTestReport?.coverage_notes),
      "模拟客户验收已围绕使用价值、证据引用、限制说明和维护责任发起追问。",
    ]),
    unresolved_issues: uniqueNonEmptyLines([
      ...(acceptanceState.decision === "pass" ? [] : [acceptanceState.signoffNote]),
      ...actions,
    ]),
  };
}

export function stageFiveAcceptanceStateFromArtifacts({
  acceptancePackage,
  deliveryDocument,
  operationsGuide,
  stageFourImplementation,
  stageFourTestReport,
}: StageFiveAcceptanceArtifactSnapshot): StageFiveAcceptanceState {
  const hasAcceptance = acceptancePackage !== null && acceptancePackage !== undefined;
  const packageChecksFromArtifacts = stageFiveDeliveryPackageChecksFromArtifacts({
    acceptancePackage,
    deliveryDocument,
    operationsGuide,
    stageFourImplementation,
    stageFourTestReport,
  });
  const targetFromArtifacts = stageFiveAcceptanceTargetFromArtifacts({
    deliveryDocument,
    stageFourImplementation,
    stageFourTestReport,
  });
  return {
    archiveChecks: Object.fromEntries(
      stageFiveSignoffCheckKeys.map((key) => [
        key,
        hasAcceptance && artifactChecklistHasLabel(acceptancePackage?.handover_checklist, signoffCheckLabel(key)),
      ]),
    ) as StageFiveAcceptanceState["archiveChecks"],
    decision: hasAcceptance ? decisionFromAcceptanceScope(acceptancePackage?.acceptance_scope) : "",
    hasDeliveryDocument: deliveryDocument !== null && deliveryDocument !== undefined,
    hasOperationsGuide: operationsGuide !== null && operationsGuide !== undefined,
    packageChecks: Object.fromEntries(
      stageFiveDeliveryPackageKeys.map((key) => [
        key,
        (hasAcceptance &&
          artifactChecklistHasLabel(acceptancePackage?.handover_checklist, deliveryPackageLabel(key))) ||
          packageChecksFromArtifacts[key],
      ]),
    ) as StageFiveAcceptanceState["packageChecks"],
    reviewDone: hasAcceptance,
    signoffNote:
      signoffNoteFromAcceptanceScope(acceptancePackage?.acceptance_scope) ||
      "基于阶段四平台测试评分、交付说明文档和模拟客户验收追问，本项目可作为制造业质检追溯资料查询助手进入课程交付档案。当前版本支持批次追溯、SOP 引用和资料不足提示，不承担质量事故责任判定。",
    target:
      targetFromAcceptanceScope(acceptancePackage?.acceptance_scope, targetFromArtifacts) ??
      targetFromArtifacts,
  };
}

export function stageFiveDeliveryPackageChecksFromArtifacts({
  deliveryDocument,
  operationsGuide,
  stageFourImplementation,
  stageFourTestReport,
}: StageFiveAcceptanceArtifactSnapshot): StageFiveAcceptanceState["packageChecks"] {
  const target = stageFiveAcceptanceTargetFromArtifacts({
    deliveryDocument,
    stageFourImplementation,
    stageFourTestReport,
  });
  const hasDeliveryDocument = deliveryDocument !== null && deliveryDocument !== undefined;
  const hasOperationsGuide = operationsGuide !== null && operationsGuide !== undefined;
  const hasPlatformTest =
    stageFiveScoreFromStageFourTestReport(stageFourTestReport) !== null ||
    Array.isArray(stageFourTestReport?.test_cases) ||
    hasText(stringValue(stageFourTestReport?.overall_result));
  const hasUsageGuide =
    hasDeliveryDocument &&
    (hasText(stringValue(deliveryDocument?.usage_instructions)) ||
      hasText(stringValue(deliveryDocument?.delivery_summary)) ||
      hasText(stringValue(deliveryDocument?.project_name)));
  const hasKnownLimitations =
    hasDeliveryDocument && arrayOrString(deliveryDocument?.known_limitations).length > 0;
  const hasMaintenanceGuide =
    hasOperationsGuide &&
    (hasText(stringValue(operationsGuide?.maintenance_owner_notes)) ||
      hasText(stringValue(operationsGuide?.data_update_plan)) ||
      hasText(stringValue(operationsGuide?.monitoring_plan)) ||
      arrayOrString(operationsGuide?.runtime_dependencies).length > 0 ||
      arrayOrString(operationsGuide?.common_issues).length > 0);
  const hasNextVersionPlan =
    hasOperationsGuide &&
    (arrayOrString(operationsGuide?.common_issues).length > 0 ||
      arrayOrString(stageFourTestReport?.improvement_actions).length > 0 ||
      hasText(stringValue(operationsGuide?.data_update_plan)));

  return {
    demoScript: isHttpUrl(target.publishUrl) && hasUsageGuide && hasPlatformTest,
    knownLimitations: hasKnownLimitations,
    maintenanceGuide: hasMaintenanceGuide,
    nextVersion: hasNextVersionPlan,
    platformTest: hasPlatformTest,
    publishLink: isHttpUrl(target.publishUrl),
    usageGuide: hasUsageGuide,
  };
}

export function stageFiveAcceptanceTargetFromArtifacts({
  deliveryDocument,
  stageFourImplementation,
  stageFourTestReport,
}: Pick<
  StageFiveAcceptanceArtifactSnapshot,
  "deliveryDocument" | "stageFourImplementation" | "stageFourTestReport"
>): StageFiveAcceptanceTarget {
  const targetFromTestReport = targetFromStageFourTestReport(stageFourTestReport);
  return {
    appName:
      stringValue(stageFourImplementation?.dify_app_name) ||
      stringValue(deliveryDocument?.project_name).replace(/交付说明文档|交付包/g, "").trim() ||
      targetFromTestReport.appName ||
      "制造业质检追溯 AI 助手",
    knowledgeName:
      extractKnowledgeName(stageFourImplementation?.knowledge_base_notes) ||
      targetFromTestReport.knowledgeName ||
      "制造业质检追溯知识库 v1",
    publishUrl:
      stringValue(deliveryDocument?.final_agent_url) ||
      stringValue(stageFourImplementation?.dify_app_url) ||
      targetFromTestReport.publishUrl ||
      "https://example.dify.ai/chat/manufacturing-quality-agent",
    stageFourScore: stageFiveScoreFromStageFourTestReport(stageFourTestReport),
  };
}

export function stageFiveScoreFromStageFourTestReport(
  content: Record<string, unknown> | null | undefined,
): number | null {
  if (!content) {
    return null;
  }
  const explicitScore = numberFromUnknown(content.total_score);
  if (explicitScore !== null) {
    return explicitScore;
  }
  const match = /总分[：:]\s*(\d+)/.exec(stringValue(content.coverage_notes));
  return match ? Number(match[1]) : null;
}

export function latestStageFiveArtifactOfType(
  artifacts: StageFiveArtifactLike[],
  artifactType: string,
): StageFiveArtifactLike | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === artifactType)
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null
  );
}

export function deliveryPackageLabel(key: StageFiveDeliveryPackageKey): string {
  const labels: Record<StageFiveDeliveryPackageKey, string> = {
    demoScript: "客户演示脚本",
    knownLimitations: "已知限制说明",
    maintenanceGuide: "维护与更新说明",
    nextVersion: "下一版本建议",
    platformTest: "平台自动化测试记录",
    publishLink: "Dify 发布链接",
    usageGuide: "客户使用说明",
  };
  return labels[key];
}

export function signoffCheckLabel(key: StageFiveSignoffCheckKey): string {
  const labels: Record<StageFiveSignoffCheckKey, string> = {
    boundary: "已说明智能体不能替代人工质量责任判定",
    maintenance: "已记录知识库维护与重新测试责任",
    testEvidence: "验收结论已引用平台自动化测试结果",
  };
  return labels[key];
}

export function decisionLabel(decision: StageFiveAcceptanceDecision): string {
  const labels: Record<StageFiveAcceptanceDecision, string> = {
    "": "未确认",
    conditional: "有条件通过",
    pass: "通过验收",
    revise: "退回修改",
  };
  return labels[decision];
}

function extractKnowledgeName(value: unknown): string {
  const text = stringValue(value);
  const match = /知识库名称[：:]\s*([^\n\r]+)/.exec(text);
  return match?.[1]?.trim() || "";
}

function artifactChecklistHasLabel(value: unknown, label: string): boolean {
  return arrayOrString(value).some((item) => item.includes(label));
}

function decisionFromAcceptanceScope(value: unknown): StageFiveAcceptanceDecision {
  const text = stringValue(value);
  if (text.includes("验收结论：通过验收") || text.includes("验收结论: 通过验收")) {
    return "pass";
  }
  if (text.includes("验收结论：有条件通过") || text.includes("验收结论: 有条件通过")) {
    return "conditional";
  }
  if (text.includes("验收结论：退回修改") || text.includes("验收结论: 退回修改")) {
    return "revise";
  }
  return "";
}

function signoffNoteFromAcceptanceScope(value: unknown): string {
  return stringValue(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith("交付对象：") &&
        !line.startsWith("交付对象:") &&
        !line.startsWith("发布链接：") &&
        !line.startsWith("发布链接:") &&
        !line.startsWith("验收结论：") &&
        !line.startsWith("验收结论:"),
    )
    .join("\n");
}

function targetFromAcceptanceScope(
  value: unknown,
  fallback: StageFiveAcceptanceTarget,
): StageFiveAcceptanceTarget | null {
  const scopeLines = stringValue(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const targetLine = scopeLines.find(
    (line) => line.startsWith("交付对象：") || line.startsWith("交付对象:"),
  );
  if (!targetLine) {
    return null;
  }
  const targetText = targetLine.replace(/^交付对象[：:]\s*/, "").trim();
  const [appName, knowledgeName] = targetText.split(/\s*\/\s*/, 2).map((item) => item.trim());
  if (!appName) {
    return null;
  }
  const publishLine = scopeLines.find(
    (line) => line.startsWith("发布链接：") || line.startsWith("发布链接:"),
  );
  const publishUrl = publishLine?.replace(/^发布链接[：:]\s*/, "").trim();
  return {
    appName,
    knowledgeName: knowledgeName || fallback.knowledgeName,
    publishUrl: publishUrl || fallback.publishUrl,
    stageFourScore: fallback.stageFourScore,
  };
}

function targetFromStageFourTestReport(
  content: Record<string, unknown> | null | undefined,
): Pick<StageFiveAcceptanceTarget, "appName" | "knowledgeName" | "publishUrl"> {
  const lines = stringValue(content?.coverage_notes)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const targetLine = lines.find(
    (line) => line.startsWith("测试对象：") || line.startsWith("测试对象:"),
  );
  const targetText = targetLine?.replace(/^测试对象[：:]\s*/, "").trim() ?? "";
  const [appName, knowledgeName] = targetText.split(/\s*\/\s*/, 2).map((item) => item.trim());
  const publishLine = lines.find(
    (line) => line.startsWith("发布链接：") || line.startsWith("发布链接:"),
  );
  return {
    appName: appName || "",
    knowledgeName: knowledgeName || "",
    publishUrl: publishLine?.replace(/^发布链接[：:]\s*/, "").trim() ?? "",
  };
}

function compareArtifactsByCreatedAt(a: StageFiveArtifactLike, b: StageFiveArtifactLike): number {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function arrayOrString(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  const text = stringValue(value);
  return text ? lines(text) : [];
}

function hasText(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function joinLines(values: Array<string | undefined | null>): string {
  return values.map((value) => String(value ?? "").trim()).filter(Boolean).join("\n");
}

function joinSections(sections: Array<[string, string | undefined | null]>): string {
  return sections
    .map(([label, value]) => {
      const text = String(value ?? "").trim();
      return text ? `${label}：${text}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function sectionValue(source: string, label: string): string {
  const pattern = new RegExp(
    `(?:^|\\n\\n)${escapeRegExp(label)}[：:]\\s*([\\s\\S]*?)(?=\\n\\n[^\\n：:]{2,24}[：:]|$)`,
  );
  return pattern.exec(source)?.[1]?.trim() ?? "";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lines(value: string): string[] {
  return value
    .split(/\r?\n|；|;/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stageFiveChapterDraftFieldValue(
  drafts: StageFiveChapterDrafts,
  chapter: StageFiveChapterKey,
  draftKey: string,
): string {
  return ((drafts[chapter] as Record<string, string>)[draftKey] ?? "").trim();
}

function uniqueNonEmptyLines(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}
