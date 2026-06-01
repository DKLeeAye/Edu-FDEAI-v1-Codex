export type StageFourMode = "guide" | "onboarding" | "build" | "test";

export type StageFourVNextStep = StageFourMode;

export type StageFourGuideChecks = {
  agentArchitecture: boolean;
  riskBoundaries: boolean;
  stageThreeTransfer: boolean;
  testableRules: boolean;
};

export type StageFourGuideArchitectureItem = {
  body: string;
  number: string;
  title: string;
};

export type StageFourGuideTransferRow = {
  check: string;
  source: string;
  target: string;
};

export type StageFourGuideRuleItem = {
  body: string;
  title: string;
};

export type StageFourGuideCaseFlowItem = {
  body: string;
  label: string;
};

export type StageFourOnboardingStepKey =
  | "workspace"
  | "create"
  | "canvas"
  | "start"
  | "llm"
  | "answer"
  | "preview"
  | "publish";

export type StageFourOnboardingChecks = Record<StageFourOnboardingStepKey, boolean>;

export type StageFourOnboardingDraft = {
  appName: string;
  appType: string;
  canvasSummary: string;
  llmSummary: string;
  modelName: string;
  nodeChain: string;
  publishUrl: string;
  startInputs: string;
  testRecord: string;
  workspaceName: string;
};

export type StageFourOnboardingSnapshot = {
  checks: StageFourOnboardingChecks;
  draft: StageFourOnboardingDraft;
  saved: boolean;
};

export type StageFourOnboardingField = {
  draftKey: keyof StageFourOnboardingDraft;
  kind: "input" | "select" | "textarea";
  label: string;
  options?: string[];
  placeholder: string;
  rows?: number;
};

export type StageFourOnboardingRunbookStep = {
  confirmLabel: string;
  fieldTitle: string;
  fields: StageFourOnboardingField[];
  goal: string;
  inlineNote?: string;
  instructionTitle: string;
  instructions: string[];
  key: StageFourOnboardingStepKey;
  number: string;
  promptTemplate?: string;
  showFlowMini?: boolean;
  testQuestions?: string[];
  title: string;
};

export type StageFourBuildStepKey =
  | "project"
  | "kb-create"
  | "kb-upload"
  | "kb-segment"
  | "kb-index"
  | "retrieval"
  | "condition"
  | "prompt"
  | "handoff"
  | "connect"
  | "preview"
  | "publish";

export type StageFourBuildChecks = Record<StageFourBuildStepKey, boolean>;

export type StageFourBuildDraft = {
  accessNote: string;
  boundaryRule: string;
  fallbackTemplate: string;
  indexConfig: string;
  knowledgeName: string;
  knowledgeSourceMode: string;
  nodeChain: string;
  previewRecord: string;
  projectName: string;
  projectPurpose: string;
  promptSummary: string;
  publishUrl: string;
  retrievalConfig: string;
  segmentConfig: string;
  uploadedFiles: string;
};

export type StageFourBuildSnapshot = {
  checks: StageFourBuildChecks;
  draft: StageFourBuildDraft;
  saved: boolean;
};

export type StageFourBuildField = {
  draftKey: keyof StageFourBuildDraft;
  kind: "input" | "textarea";
  label: string;
  placeholder: string;
  rows?: number;
};

export type StageFourBuildFlowNode = {
  body: string;
  code: string;
  className: string;
  title: string;
};

export type StageFourBuildRunbookStep = {
  confirmLabel: string;
  fieldTitle: string;
  fields: StageFourBuildField[];
  goal: string;
  instructionTitle: string;
  instructions: string[];
  key: StageFourBuildStepKey;
  number: string;
  promptTemplate?: string;
  testQuestions?: string[];
  title: string;
};

export type StageFourBuildTestPreviewCard = {
  body: string;
  label: string;
  title: string;
};

export type StageFourImplementationPayloadLike = {
  app_access_check_notes?: string;
  app_access_check_result?: "unchecked" | "manual_confirmed" | "reachable" | "blocked";
  app_mode: "chatflow" | "workflow" | "agent";
  build_task_checklist?: string[];
  dify_app_name: string;
  dify_app_url: string;
  implementation_notes: string;
  knowledge_base_notes: string;
  known_limitations: string[];
  onboarding_checklist?: string[];
  prompt_or_instruction_notes: string;
  stage_three_alignment_notes?: string;
  tool_configuration_notes: string;
};

export type StageFourTestTargetDraft = {
  accessNote: string;
  appName: string;
  knowledgeName: string;
  publishUrl: string;
};

export type StageFourPlatformTestStatus = "pass" | "warn" | "fail";

export type StageFourPlatformTestCase = {
  actualAnswer: string;
  expectedBehavior: string;
  evidence: string;
  id: string;
  location: string;
  question: string;
  scores: [number, number, number, number];
  status: StageFourPlatformTestStatus;
  suite: string;
  testCategory: "standard" | "out_of_scope" | "multi_turn" | "custom";
};

export type StageFourPlatformTestRun = {
  cases: StageFourPlatformTestCase[];
  dimensionScores: [number, number, number, number];
  finishedAt: string;
  severeCount: number;
  target: StageFourTestTargetDraft;
  totalScore: number;
  warningCount: number;
};

export type StageFourTestSuiteCard = {
  body: string;
  label: string;
  title: string;
};

export type StageFourTestScoreDimension = {
  index: 0 | 1 | 2 | 3;
  label: string;
};

export type StageFourTestRemediationItem = {
  body: string;
  label: string;
  title: string;
  tone: "pass" | "warn" | "fail";
};

export type StageFourTestReportPayloadLike = {
  coverage_notes?: string;
  improvement_actions: string[];
  observed_failures: string[];
  overall_result: "passed" | "needs_revision";
  test_cases: Array<{
    actual_output: string;
    evidence_note?: string;
    expected_output: string;
    input: string;
    notes?: string;
    result: "passed" | "failed" | "partial";
    scenario: string;
    test_category?: "standard" | "out_of_scope" | "multi_turn" | "custom";
  }>;
  test_goal: string;
};

export const stageFourTestTargetRequiredToast = "请先填写测试对象、发布链接和访问权限说明";
export const stageFourTestReadyToast = "测试完成：可以保存评分记录";
export const stageFourTestBlockedToast = "需要测试通过且无严重失败项后才能保存";
export const stageFourTestSavedToast = "测试评分记录已保存，可以进入阶段五";
export const stageFourGuideReadyToast = "阶段四导学已完成，可以进入 Dify 入门练习";
export const stageFourGuideBlockedToast = "请先完成进入搭建前确认";
export const stageFourOnboardingDemoFilledToast = "已填入演示记录，请按你的 Dify 实际操作结果修改后保存";
export const stageFourOnboardingBlockedToast = "请先完成 8 个 Chatflow 操作步骤、必填记录和有效发布链接";
export const stageFourOnboardingSavedToast = "Dify 入门记录已保存，可以进入正式构建工作台";
export const stageFourOnboardingNextBlockedToast = "请先保存 Dify 入门记录";
export const stageFourBuildDemoFilledToast = "已填入演示记录，请按你的 Dify 实际配置修改后保存";
export const stageFourBuildBlockedToast = "请先完成 12 个构建步骤、必填记录和有效发布链接";
export const stageFourBuildSavedToast = "正式搭建记录已保存，可以进入平台测试与评分";

export type StageFourTaskKey =
  | "onboarding"
  | "knowledge_base"
  | "behavior_design"
  | "app_submission"
  | "test_review"
  | "stage_completion";

export type StageFourTaskState = "locked" | "ready" | "active" | "done";

export type StageFourArtifactLike = {
  artifact_type: string;
  content_json: Record<string, unknown>;
  created_at: string;
  id: string;
};

export type StageFourTaskItem = {
  description: string;
  evidenceLabel: string;
  key: StageFourTaskKey;
  label: string;
  meta: string;
  state: StageFourTaskState;
};

export const stageFourImplementationType = "stage_4_dify_implementation";
export const stageFourTestReportType = "stage_4_test_report";
export const stageFourAiReviewType = "stage_4_ai_test_review";

const requiredTestCategories = ["standard", "out_of_scope", "multi_turn"] as const;

export const stageFourGuideArchitectureItems: StageFourGuideArchitectureItem[] = [
  {
    body: "接收质检员、质量负责人或审厂准备人员提出的批次、工序、缺陷与材料问题。",
    number: "01",
    title: "用户问题入口",
  },
  {
    body: "先判断是否属于质检追溯范围，是否涉及责任认定、处罚建议或资料不足。",
    number: "02",
    title: "边界判断",
  },
  {
    body: "调用阶段三设计的知识库、召回策略、元数据过滤和风险边界规则。",
    number: "03",
    title: "RAG 检索",
  },
  {
    body: "按证据组织答案，标注来源、批次号、标准条款和记录版本。",
    number: "04",
    title: "回答与引用",
  },
  {
    body: "遇到记录冲突、责任结论或证据缺口时转人工，并保存问题、证据和处理状态。",
    number: "05",
    title: "转人工与日志",
  },
];

export const stageFourGuideTransferRows: StageFourGuideTransferRow[] = [
  {
    check: "低质量样本是否被排除或标记为待补充",
    source: "数据源与质量判断",
    target: "知识库接入范围、资料排除清单",
  },
  {
    check: "回答能否追溯到批次、工序、缺陷类型和来源文件",
    source: "分块与元数据策略",
    target: "chunk 配置、metadata filter、来源引用字段",
  },
  {
    check: "是否减少误召回，并保留可读的引用说明",
    source: "召回与引用规则",
    target: "Top-K、混合检索、引用格式、证据链展示",
  },
  {
    check: "资料不足、记录冲突、责任判定是否有明确行为",
    source: "风险边界说明",
    target: "Prompt 边界、工作流分支、转人工条件",
  },
];

export const stageFourGuideRuleItems: StageFourGuideRuleItem[] = [
  {
    body: "你是制造业质检追溯助手，帮助质量负责人查询批次、工序、缺陷、整改和审厂材料。",
    title: "角色与任务",
  },
  {
    body: "回答必须引用 MES、Excel 台账、SOP 条款、整改记录或附件编号，不得补造来源。",
    title: "证据要求",
  },
  {
    body: "资料缺失时说明缺口；记录冲突时并列证据；责任判定、处罚建议和客户承诺转人工。",
    title: "边界规则",
  },
  {
    body: "先给结论，再列证据来源，最后给待确认事项和下一步建议。",
    title: "输出格式",
  },
];

export const stageFourGuideCaseFlowItems: StageFourGuideCaseFlowItem[] = [
  {
    body: "B-2026-0412 批次审厂前需要准备哪些质检追溯材料？",
    label: "输入问题",
  },
  {
    body: "属于质检追溯范围，允许回答；需引用批次记录和审厂清单。",
    label: "边界判断",
  },
  {
    body: "按批次号过滤，混合召回 MES 终检记录、Excel 台账、整改记录和 SOP 条款。",
    label: "检索动作",
  },
  {
    body: "列出材料清单、来源编号、缺失资料和人工确认项。",
    label: "回答行为",
  },
];

export const stageFourOnboardingStepOrder: StageFourOnboardingStepKey[] = [
  "workspace",
  "create",
  "canvas",
  "start",
  "llm",
  "answer",
  "preview",
  "publish",
];

export const stageFourOnboardingRunbookSteps: StageFourOnboardingRunbookStep[] = [
  {
    confirmLabel: "我已进入工作室，并确认能找到 Chatflow 创建入口",
    fieldTitle: "完成凭证",
    fields: [
      {
        draftKey: "workspaceName",
        kind: "input",
        label: "Dify 工作区名称",
        placeholder: "例如：智能体实训 2026 春",
      },
    ],
    goal: "目标：确认账号可用，并能找到截图中的工作室、Chatflow 类型和创建空白应用入口。",
    instructionTitle: "Dify 中这样做",
    instructions: [
      "打开学校提供的 Dify 地址，使用课程账号登录。",
      "顶部导航进入工作室。",
      "在应用类型筛选中找到 Chatflow，再点击创建空白应用。",
      "不要从模板导入 DSL，本页只做 Chatflow 新手练习。",
    ],
    key: "workspace",
    number: "01",
    title: "进入工作室，切到 Chatflow 创建入口。",
  },
  {
    confirmLabel: "我已创建 Chatflow 练习应用，并回填应用名称与类型",
    fieldTitle: "回填平台",
    fields: [
      {
        draftKey: "appName",
        kind: "input",
        label: "Dify 应用名称",
        placeholder: "质检资料问答练习应用",
      },
      {
        draftKey: "appType",
        kind: "select",
        label: "应用类型",
        options: ["Chatflow"],
        placeholder: "选择类型",
      },
    ],
    goal: "目标：按照截图中的创建弹窗，明确选择 Chatflow，并填写练习应用名称。",
    instructionTitle: "Dify 中这样做",
    instructions: [
      "点击创建空白应用。",
      "在应用类型里选择 Chatflow，确认不是“工作流”或“聊天助手”。",
      "应用名称填写：质检资料问答练习应用。",
      "应用描述填写：用于练习 Chatflow 节点配置、连线、预览和发布回填。",
      "点击创建进入画布。",
    ],
    key: "create",
    number: "02",
    title: "创建 Chatflow 空白应用。",
  },
  {
    confirmLabel: "我已识别默认节点、右侧配置面板和节点连线",
    fieldTitle: "回填平台",
    fields: [
      {
        draftKey: "canvasSummary",
        kind: "textarea",
        label: "默认节点确认",
        placeholder: "记录你在画布上看到的节点，例如：开始节点、LLM 节点、直接回复节点，以及它们的连线关系。",
        rows: 5,
      },
    ],
    goal: "目标：先看懂截图中的三个节点和右侧配置面板，再开始改配置。",
    instructionTitle: "画布上需要识别",
    instructions: [
      "开始节点：接收用户问题和文件输入。",
      "LLM 节点：负责理解用户问题并生成回答。",
      "直接回复节点：把 LLM 的 text 输出给用户。",
      "右侧配置面板：点击节点后会显示模型、上下文、记忆、输出等配置。",
    ],
    key: "canvas",
    number: "03",
    showFlowMini: true,
    title: "认识 Chatflow 画布和默认节点。",
  },
  {
    confirmLabel: "我已检查开始节点，并记录用户输入变量",
    fieldTitle: "回填平台",
    fields: [
      {
        draftKey: "startInputs",
        kind: "input",
        label: "开始节点输入变量",
        placeholder: "例如：query；可选 files",
      },
    ],
    goal: "目标：理解后续 LLM 节点的上下文变量来自哪里。",
    instructionTitle: "Dify 中这样做",
    instructions: [
      "点击画布中的开始 / 用户输入节点。",
      "查看默认输入变量，重点确认 query 是否作为用户问题输入。",
      "如果课程环境提供文件输入，确认 files 是否存在；本练习不要求上传正式资料。",
      "不要删除默认输入变量，后面的 LLM 节点要引用它们。",
    ],
    key: "start",
    number: "04",
    title: "检查开始节点的用户输入变量。",
  },
  {
    confirmLabel: "我已配置 LLM 节点，并记录模型与指令摘要",
    fieldTitle: "回填平台",
    fields: [
      {
        draftKey: "modelName",
        kind: "input",
        label: "模型名称",
        placeholder: "例如：GPT-4o / 学校指定模型",
      },
      {
        draftKey: "llmSummary",
        kind: "textarea",
        label: "LLM 节点配置摘要",
        placeholder: "写明模型、上下文变量、角色指令、引用要求、资料不足处理和转人工边界。",
        rows: 6,
      },
    ],
    goal: "目标：让 Chatflow 具备最基本的质检问答边界，而不是开放式闲聊。",
    instructionTitle: "LLM 节点配置步骤",
    instructions: [
      "点击 LLM 节点，确认右侧出现 LLM 设置面板。",
      "在模型中选择学校指定模型；如果暂未指定，记录你实际选择的模型名称。",
      "在上下文中引用开始节点的用户问题变量，例如 用户输入 / query。",
      "在指令或系统提示中写入下面的质检问答边界。",
      "保持“记忆”开启或按教师要求设置记忆窗口；本练习先不启用视觉和结构化输出。",
    ],
    key: "llm",
    number: "05",
    promptTemplate:
      "你是制造业质检资料问答助手。\n你只能根据课程提供的质检 SOP、质检记录和审厂材料回答。\n回答时必须说明资料来源或引用依据。\n如果资料不足、记录冲突或涉及责任判定，请提示需要人工确认，不要编造结论。\n回答应简洁，优先列出批次号、工序、缺陷类型和需要准备的审厂材料。",
    title: "配置 LLM 节点的模型、上下文和指令。",
  },
  {
    confirmLabel: "我已配置直接回复节点，并确认节点连线正确",
    fieldTitle: "回填平台",
    fields: [
      {
        draftKey: "nodeChain",
        kind: "textarea",
        label: "节点连线记录",
        placeholder: "例如：开始节点(query) → LLM 节点(text) → 直接回复节点(reply=LLM/text)。",
        rows: 5,
      },
    ],
    goal: "目标：确认 Chatflow 的输出真的来自 LLM 节点，而不是断在画布中间。",
    inlineNote: "本练习只要求掌握节点连线和 LLM 输出变量。正式知识库节点、条件分支和工具调用会在后续构建工作台完成。",
    instructionTitle: "Dify 中这样做",
    instructions: [
      "确认画布连线为：开始节点 → LLM 节点 → 直接回复节点。",
      "点击直接回复节点，在回复内容里选择 LLM / text 输出变量。",
      "如果连线断开，拖拽节点右侧连接点到下一个节点左侧连接点，直到流程线连接成功。",
      "点击画布上方滚动至选中节点或缩放工具，确认三个节点都在可视范围内。",
    ],
    key: "answer",
    number: "06",
    title: "配置直接回复节点，并检查连线。",
  },
  {
    confirmLabel: "我已完成一次 Preview 调试，并记录测试结果",
    fieldTitle: "回填平台",
    fields: [
      {
        draftKey: "testRecord",
        kind: "textarea",
        label: "一次 Preview 调试记录",
        placeholder: "记录测试问题、Dify 回复摘要、节点是否成功运行、是否出现变量或模型配置问题。",
        rows: 6,
      },
    ],
    goal: "目标：确认画布能从用户输入走到 LLM，再由直接回复节点输出。",
    instructionTitle: "建议测试问题",
    instructions: [
      "点击画布右上角 Preview / 预览。",
      "在预览窗口输入上面的任一问题。",
      "观察是否出现 Workflow Process 或节点运行过程。",
      "如果无回复，回到画布检查 LLM 模型、上下文变量和直接回复节点变量。",
    ],
    key: "preview",
    number: "07",
    testQuestions: [
      "B-2026-0412 批次审厂前需要准备哪些质检资料？",
      "如果 MES 记录缺少异常原因，能否直接判断责任部门？",
      "外观划伤问题需要引用哪些 SOP 条款？",
    ],
    title: "使用 Preview 完成一次 Chatflow 调试。",
  },
  {
    confirmLabel: "我已发布 Chatflow 应用，并粘贴可访问的发布链接",
    fieldTitle: "回填平台",
    fields: [
      {
        draftKey: "publishUrl",
        kind: "input",
        label: "Dify 应用发布链接",
        placeholder: "https://...",
      },
    ],
    goal: "目标：理解正式项目为什么必须提交可访问的 Dify 发布链接，平台后续会用它进行自动化测试。",
    instructionTitle: "Dify 中这样做",
    instructions: [
      "点击画布右上角发布 / Publish。",
      "确认应用可以通过链接访问。",
      "复制发布链接，不要复制控制台编辑地址。",
      "保存后回到 EduFDE，粘贴发布链接和调试记录。",
    ],
    key: "publish",
    number: "08",
    title: "发布 Chatflow 应用，并把访问链接粘贴回平台。",
  },
];

export const stageFourBuildStepOrder: StageFourBuildStepKey[] = [
  "project",
  "kb-create",
  "kb-upload",
  "kb-segment",
  "kb-index",
  "retrieval",
  "condition",
  "prompt",
  "handoff",
  "connect",
  "preview",
  "publish",
];

export const stageFourBuildFlowNodes: StageFourBuildFlowNode[] = [
  {
    body: "进入 Dify 知识库，选择导入已有文本并新建质检追溯知识库。",
    className: "knowledge",
    code: "KB-01",
    title: "创建知识库",
  },
  {
    body: "上传 SOP、MES 导出、Excel 台账、整改报告和审厂材料。",
    className: "upload",
    code: "KB-02",
    title: "上传资料",
  },
  {
    body: "配置分段标识符、最大长度、重叠长度和文本预处理规则。",
    className: "segment",
    code: "KB-03",
    title: "分段清洗",
  },
  {
    body: "配置索引方式、检索方式、Top K，并确认处理完成。",
    className: "index",
    code: "KB-04",
    title: "索引检索",
  },
  {
    body: "接收用户问题 query，并作为检索查询变量传递。",
    className: "start",
    code: "CF-01",
    title: "开始节点",
  },
  {
    body: "调用已创建的质检追溯知识库，不在此处重新配置建库参数。",
    className: "retrieval",
    code: "CF-02",
    title: "知识检索",
  },
  {
    body: "根据证据是否充分、是否越界，决定回答或转人工。",
    className: "condition",
    code: "CF-03",
    title: "边界判断",
  },
  {
    body: "基于检索证据组织答复，并说明来源。",
    className: "llm",
    code: "CF-04A",
    title: "引用回答",
  },
  {
    body: "提示缺口、记录原因，不编造责任结论。",
    className: "handoff",
    code: "CF-04B",
    title: "资料不足 / 转人工",
  },
  {
    body: "发布应用链接，交给 EduFDE 自动化测试。",
    className: "final",
    code: "CF-05",
    title: "发布与回填",
  },
];

export const stageFourBuildRunbookSteps: StageFourBuildRunbookStep[] = [
  {
    confirmLabel: "我已创建正式 Chatflow 应用，并回填名称与用途",
    fieldTitle: "同步到平台",
    fields: [
      {
        draftKey: "projectName",
        kind: "input",
        label: "正式 Dify 应用名称",
        placeholder: "制造业质检追溯 AI 助手",
      },
      {
        draftKey: "projectPurpose",
        kind: "textarea",
        label: "应用用途说明",
        placeholder: "说明该应用服务哪些角色、回答哪些质检追溯问题、不能处理哪些问题。",
        rows: 4,
      },
    ],
    goal: "目标：在 Dify 中新建正式应用，保留默认开始节点，后续用于接入已创建的知识库。",
    instructionTitle: "Dify 中这样做",
    instructions: [
      "在工作室点击创建空白应用，类型选择 Chatflow。",
      "应用名称建议为：制造业质检追溯 AI 助手。",
      "应用描述写清楚：面向审厂追溯、质检记录查询和资料缺口提醒。",
      "进入画布后先保存应用，后续再逐步添加知识检索和分支节点。",
    ],
    key: "project",
    number: "01",
    title: "创建正式项目 Chatflow 应用。",
  },
  {
    confirmLabel: "我已创建正式知识库容器，并记录数据源方式",
    fieldTitle: "同步到平台",
    fields: [
      {
        draftKey: "knowledgeName",
        kind: "input",
        label: "知识库名称",
        placeholder: "制造业质检追溯知识库 v1",
      },
      {
        draftKey: "knowledgeSourceMode",
        kind: "textarea",
        label: "创建位置与数据源方式",
        placeholder: "记录：知识库模块 / 导入已有文本 / 使用课程质检资料文件。",
        rows: 4,
      },
    ],
    goal: "目标：先建立知识库容器，后续分段、索引和检索参数都在这里完成。",
    instructionTitle: "Dify 中这样做",
    instructions: [
      "切换到顶部导航的知识库。",
      "点击创建知识库，选择导入已有文本。",
      "知识库名称建议为：制造业质检追溯知识库 v1。",
      "不要选择 Notion 或 Web 同步；本项目先使用课程整理后的质检资料文件。",
    ],
    key: "kb-create",
    number: "02",
    title: "进入 Dify 知识库，创建质检追溯知识库。",
  },
  {
    confirmLabel: "我已上传经筛选的正式质检资料，并记录文件清单",
    fieldTitle: "同步到平台",
    fields: [
      {
        draftKey: "uploadedFiles",
        kind: "textarea",
        label: "已上传文件清单",
        placeholder: "逐项记录文件名、资料类型、来源和是否已通过阶段三质量评估。",
        rows: 6,
      },
    ],
    goal: "目标：把阶段三筛选后的资料上传到 Dify，而不是把未经判断的原始资料全部放进去。",
    instructionTitle: "Dify 中这样做",
    instructions: [
      "在选择数据源页选择导入已有文本。",
      "上传教师提供的 SOP、MES 导出、Excel 台账、整改报告或审厂材料。",
      "确认每个文件名称清晰，能反映批次、工序、标准或资料类型。",
      "如果文件中仍有纸质 OCR 错误或图片未标注，先回到阶段三记录为待处理，不直接进入正式知识库。",
    ],
    key: "kb-upload",
    number: "03",
    title: "上传制造业质检资料文件。",
  },
  {
    confirmLabel: "我已配置分段与清洗规则，并记录参数依据",
    fieldTitle: "同步到平台",
    fields: [
      {
        draftKey: "segmentConfig",
        kind: "textarea",
        label: "分段与清洗配置",
        placeholder: "记录分段模式、分段标识符、最大长度、重叠长度、文本预处理规则，以及这些设置对应阶段三哪一条分块策略。",
        rows: 7,
      },
    ],
    goal: "目标：根据资料类型配置分段标识、最大长度、重叠长度和文本预处理规则。",
    instructionTitle: "Dify 中这样做",
    instructions: [
      "进入文本分段与清洗页面。",
      "选择通用或父子分段模式；SOP 和标准条款优先保持标题层级。",
      "记录分段标识符，例如换行、标题符号或标准条款编号。",
      "设置分段最大长度和重叠长度；参考前一页分块策略，不机械套默认值。",
      "按需启用文本预处理，例如替换连续空格、换行符、制表符；不要删除有意义的批次号或标准编号。",
    ],
    key: "kb-segment",
    number: "04",
    title: "配置文本分段与清洗规则。",
  },
  {
    confirmLabel: "我已完成知识库处理，并记录索引与检索配置",
    fieldTitle: "同步到平台",
    fields: [
      {
        draftKey: "indexConfig",
        kind: "textarea",
        label: "索引与检索配置",
        placeholder: "记录索引方式、Top K、检索方式、是否使用倒排索引/混合检索，以及 Dify 处理完成状态。",
        rows: 6,
      },
    ],
    goal: "目标：在知识库创建阶段完成索引与检索基础配置，确认 Dify 显示处理完成。",
    instructionTitle: "Dify 中这样做",
    instructions: [
      "选择索引方式。高质量模式更适合正式质检追溯，经济模式仅用于练习或低风险资料。",
      "配置检索设置，例如倒排索引、Top K 和是否使用混合检索。",
      "点击保存并处理，等待 Dify 显示处理完成 / 知识库已创建。",
      "在处理完成页核对知识库名称、分段模式、最大长度、预处理规则、索引方式和检索设置。",
    ],
    key: "kb-index",
    number: "05",
    title: "配置索引方式、检索设置并完成处理。",
  },
  {
    confirmLabel: "我已在 Chatflow 中接入知识检索节点，并记录变量关系",
    fieldTitle: "同步到平台",
    fields: [
      {
        draftKey: "retrievalConfig",
        kind: "textarea",
        label: "Chatflow 检索节点记录",
        placeholder: "记录：节点名称、所选知识库、query 变量来源、输出变量名称、是否启用阶段三确定的检索策略。",
        rows: 5,
      },
    ],
    goal: "目标：把已创建的知识库连接到正式 Chatflow，而不是在节点里重新做建库配置。",
    instructionTitle: "Dify 中这样做",
    instructions: [
      "回到正式 Chatflow 应用画布。",
      "在开始节点后新增知识检索 / Knowledge Retrieval 节点。",
      "选择刚创建成功的制造业质检追溯知识库 v1。",
      "确认检索查询使用开始节点的 query 变量。",
      "检查节点输出是否会传给后续边界判断和 LLM 节点。",
    ],
    key: "retrieval",
    number: "06",
    title: "在 Chatflow 中接入知识检索节点。",
  },
  {
    confirmLabel: "我已把风险边界配置成 Chatflow 分支规则",
    fieldTitle: "同步到平台",
    fields: [
      {
        draftKey: "boundaryRule",
        kind: "textarea",
        label: "边界分支规则",
        placeholder: "记录至少 3 条分支规则，例如：无引用证据 → 资料不足；责任归属问题 → 转人工；范围内且有证据 → 引用回答。",
        rows: 6,
      },
    ],
    goal: "目标：把阶段三风险边界变成 Chatflow 中可执行的条件分支。",
    instructionTitle: "Dify 中这样做",
    instructions: [
      "在知识检索节点后新增条件分支 / IF-ELSE 节点。",
      "分支一：检索结果充分且问题属于质检追溯范围，进入引用回答。",
      "分支二：证据为空、记录冲突、涉及责任判定或处罚建议，进入资料不足/转人工回复。",
      "如果 Dify 当前条件表达式不支持复杂判断，可先用 LLM 分类节点或变量标记辅助判断。",
    ],
    key: "condition",
    number: "07",
    title: "配置业务边界判断分支。",
  },
  {
    confirmLabel: "我已配置引用回答 LLM 节点，并记录 Prompt 摘要",
    fieldTitle: "同步到平台",
    fields: [
      {
        draftKey: "promptSummary",
        kind: "textarea",
        label: "回答 Prompt 摘要",
        placeholder: "记录角色、任务范围、证据要求、引用格式、边界处理和输出格式。",
        rows: 7,
      },
    ],
    goal: "目标：让智能体基于检索证据回答，并明确来源、缺口和待确认事项。",
    instructionTitle: "建议 Prompt 结构",
    instructions: [
      "点击引用回答路径中的 LLM 节点。",
      "把知识检索结果作为上下文变量传入。",
      "将角色、证据、引用、边界和格式要求写入指令。",
      "在 Preview 中确认回答不会脱离证据。",
    ],
    key: "prompt",
    number: "08",
    promptTemplate:
      "你是制造业质检追溯 AI 助手。\n任务：回答批次、工序、缺陷、整改和审厂材料准备相关问题。\n证据：只能使用知识检索节点返回的内容。\n引用：回答必须列出来源文件、批次号、工序或标准条款。\n边界：资料不足、记录冲突、责任判定、处罚建议必须提示人工确认。\n格式：先给结论，再列证据来源，最后列待确认事项。",
    title: "配置引用回答 LLM 节点。",
  },
  {
    confirmLabel: "我已配置异常路径，并记录转人工模板",
    fieldTitle: "同步到平台",
    fields: [
      {
        draftKey: "fallbackTemplate",
        kind: "textarea",
        label: "异常路径回复模板",
        placeholder: "写入资料不足、记录冲突、转人工三类回复模板。",
        rows: 6,
      },
    ],
    goal: "目标：让智能体在无法可靠回答时给出合规提示，而不是继续生成看似完整的答案。",
    instructionTitle: "Dify 中这样做",
    instructions: [
      "在边界分支的异常路径后新增直接回复或 LLM 节点。",
      "资料不足时说明缺少哪些字段或证据，例如批次号、异常原因、复检结果。",
      "记录冲突时并列证据来源，提示质量负责人确认。",
      "责任判定、处罚建议、客户承诺类问题必须转人工。",
    ],
    key: "handoff",
    number: "09",
    title: "配置资料不足与转人工回复。",
  },
  {
    confirmLabel: "我已检查节点连线和变量传递",
    fieldTitle: "同步到平台",
    fields: [
      {
        draftKey: "nodeChain",
        kind: "textarea",
        label: "节点连线记录",
        placeholder: "例如：开始(query) → 知识检索(chunks) → 条件分支 → 引用回答 LLM / 资料不足回复 → 直接回复。",
        rows: 6,
      },
    ],
    goal: "目标：确认用户问题、检索结果和回答输出在 Chatflow 中完整流转。",
    instructionTitle: "需要逐项检查",
    instructions: [
      "开始节点 query 是否进入知识检索节点。",
      "知识检索结果是否进入边界分支和引用回答 LLM。",
      "引用回答路径是否连接到直接回复。",
      "资料不足/转人工路径是否连接到对应回复节点。",
      "所有最终路径都能到达用户可见输出。",
    ],
    key: "connect",
    number: "10",
    title: "检查节点连线与变量传递。",
  },
  {
    confirmLabel: "我已完成 Preview 预检，并记录结果",
    fieldTitle: "同步到平台",
    fields: [
      {
        draftKey: "previewRecord",
        kind: "textarea",
        label: "Preview 预检记录",
        placeholder: "记录至少 3 个问题、命中路径、Dify 回复摘要、发现的问题和是否需要调整。",
        rows: 7,
      },
    ],
    goal: "目标：在平台自动测试前，先确认正常问题、资料不足问题和转人工问题都能走到正确路径。",
    instructionTitle: "建议预检问题",
    instructions: [
      "打开 Dify Preview，分别输入三类问题。",
      "检查正常问题是否有引用，资料不足是否说明缺口，范围外是否转人工。",
      "把一次成功记录和一次需修改记录同步回平台。",
    ],
    key: "preview",
    number: "11",
    testQuestions: [
      "范围内：B-2026-0412 批次审厂前需要准备哪些质检追溯材料？",
      "资料不足：这条缺陷图片能否直接判断责任部门？",
      "范围外：请帮我承诺客户这批产品不会再出现问题。",
    ],
    title: "用三类问题做 Dify Preview 预检。",
  },
  {
    confirmLabel: "我已发布正式应用，并回填测试入口",
    fieldTitle: "同步到平台",
    fields: [
      {
        draftKey: "publishUrl",
        kind: "input",
        label: "Dify 正式应用发布链接",
        placeholder: "https://...",
      },
      {
        draftKey: "accessNote",
        kind: "textarea",
        label: "访问权限说明",
        placeholder: "说明是否需要登录、测试账号、有效期或访问限制。",
        rows: 4,
      },
    ],
    goal: "目标：提交可访问的 Dify 应用链接，供 EduFDE 执行自动化测试和评分。",
    instructionTitle: "Dify 中这样做",
    instructions: [
      "点击发布，确认复制的是用户访问链接，不是编辑器地址。",
      "在无登录或测试账号环境下确认链接可访问。",
      "如果学校要求访问密钥或测试账号，在平台记录权限说明。",
      "保存后进入 EduFDE 自动化测试与评分环节。",
    ],
    key: "publish",
    number: "12",
    title: "发布正式应用，并回填平台测试入口。",
  },
];

export const stageFourBuildTestPreviewCards: StageFourBuildTestPreviewCard[] = [
  {
    body: "检查是否能引用批次、工序、SOP 和整改证据。",
    label: "正常追溯",
    title: "批次 B-2026-0412 审厂材料准备",
  },
  {
    body: "检查是否说明缺口，而不是编造结论。",
    label: "资料不足",
    title: "缺陷图片没有批次和工序标注",
  },
  {
    body: "检查是否并列证据并转人工确认。",
    label: "记录冲突",
    title: "MES 与 Excel 异常原因不一致",
  },
  {
    body: "检查是否拒绝越权承诺并提示人工处理。",
    label: "越界请求",
    title: "要求承诺客户质量责任",
  },
];

export const stageFourTestSuiteCards: StageFourTestSuiteCard[] = [
  {
    body: "批次、工序、缺陷、SOP 条款和整改记录是否能被正确检索并组织回答。",
    label: "Suite A",
    title: "正常追溯问题",
  },
  {
    body: "回答是否列出来源文件、批次号、标准条款或记录版本，避免只给结论。",
    label: "Suite B",
    title: "证据引用问题",
  },
  {
    body: "缺字段、缺图片标注、缺复检记录时，是否说明资料缺口而不是编造。",
    label: "Suite C",
    title: "资料不足问题",
  },
  {
    body: "责任判定、处罚建议、客户承诺和质量事故归因是否触发转人工。",
    label: "Suite D",
    title: "风险边界问题",
  },
];

export const stageFourTestScoreDimensions: StageFourTestScoreDimension[] = [
  { index: 0, label: "召回准确性" },
  { index: 1, label: "引用可追溯性" },
  { index: 2, label: "边界控制" },
  { index: 3, label: "业务流程完整性" },
];

export const stageFourTestRemediationItems: StageFourTestRemediationItem[] = [
  {
    body: "优化引用回答 Prompt，要求输出条款编号、来源段落和记录版本。",
    label: "证据引用",
    title: "回 Dify：补强引用格式",
    tone: "warn",
  },
  {
    body: "检查条件分支与转人工节点，记录冲突时必须输出人工确认路径。",
    label: "风险边界",
    title: "回 Dify：修正转人工分支",
    tone: "warn",
  },
];

export function createStageFourTaskItems(
  artifacts: StageFourArtifactLike[],
  stageStatus: string | undefined,
): StageFourTaskItem[] {
  const locked = stageStatus === "locked";
  const completed = stageStatus === "completed";
  const implementation = latestStageFourArtifactOfType(artifacts, stageFourImplementationType);
  const testReport = latestStageFourArtifactOfType(artifacts, stageFourTestReportType);
  const review = latestStageFourArtifactOfType(artifacts, stageFourAiReviewType);
  const hasImplementation = implementation !== null;
  const hasTestReport = testReport !== null;
  const hasReview = review !== null;

  if (locked) {
    return stageFourTaskOrder().map((key) =>
      task(key, taskLabel(key), taskEvidenceLabel(key), "待解锁", "locked"),
    );
  }

  return [
    task(
      "onboarding",
      "Dify 新手村",
      "概念路径确认",
      hasImplementation ? "路径已确认" : "先确认路径",
      hasImplementation ? "done" : "active",
    ),
    task(
      "knowledge_base",
      "知识库搭建",
      "知识库构建记录",
      hasText(implementation?.content_json.knowledge_base_notes) ? "知识库已记录" : "承接阶段三",
      hasText(implementation?.content_json.knowledge_base_notes) ? "done" : "ready",
    ),
    task(
      "behavior_design",
      "Prompt 与流程",
      "行为设计说明",
      hasBehaviorDesign(implementation) ? "行为逻辑已记录" : "Prompt 与流程",
      hasBehaviorDesign(implementation) ? "done" : "ready",
    ),
    task(
      "app_submission",
      "应用提交",
      "应用链接与限制",
      hasText(implementation?.content_json.dify_app_url) ? "链接已提交" : "待提交链接",
      hasText(implementation?.content_json.dify_app_url) ? "done" : "ready",
    ),
    task(
      "test_review",
      "测试验收",
      "测试报告与反馈",
      hasReview ? "已有反馈" : hasTestReport ? "待生成反馈" : hasImplementation ? "可开始测试" : "先保存构建记录",
      hasReview ? "done" : hasTestReport || hasImplementation ? "ready" : "locked",
    ),
    task(
      "stage_completion",
      "阶段收口",
      "阶段五输入证据",
      completed ? "已完成" : hasReview ? "可完成" : "待反馈",
      completed ? "done" : hasReview ? "ready" : "locked",
    ),
  ];
}

export function isStageFourFocusedMode(mode: StageFourMode): boolean {
  return mode === "guide" || mode === "onboarding" || mode === "build" || mode === "test";
}

export function deriveStageFourVNextStep(
  artifacts: StageFourArtifactLike[],
  stageStatus?: string,
): StageFourVNextStep {
  if (stageStatus === "completed") {
    return "test";
  }
  if (
    latestStageFourArtifactOfType(artifacts, stageFourAiReviewType) !== null ||
    latestStageFourArtifactOfType(artifacts, stageFourTestReportType) !== null ||
    latestStageFourArtifactOfType(artifacts, stageFourImplementationType) !== null
  ) {
    return "test";
  }
  return "guide";
}

export function isStageFourGuideReady(checks: StageFourGuideChecks): boolean {
  return Object.values(checks).every(Boolean);
}

export function isStageFourOnboardingReady(
  draft: StageFourOnboardingDraft,
  checks: StageFourOnboardingChecks,
): boolean {
  return (
    stageFourOnboardingStepOrder.every((key) => checks[key]) &&
    [
      draft.workspaceName,
      draft.appName,
      draft.appType,
      draft.canvasSummary,
      draft.startInputs,
      draft.modelName,
      draft.llmSummary,
      draft.nodeChain,
      draft.testRecord,
      draft.publishUrl,
    ].every(hasText) &&
    isHttpUrl(draft.publishUrl)
  );
}

export function isStageFourBuildReady(
  draft: StageFourBuildDraft,
  checks: StageFourBuildChecks,
): boolean {
  return (
    stageFourBuildStepOrder.every((key) => checks[key]) &&
    [
      draft.projectName,
      draft.projectPurpose,
      draft.knowledgeName,
      draft.knowledgeSourceMode,
      draft.uploadedFiles,
      draft.segmentConfig,
      draft.indexConfig,
      draft.retrievalConfig,
      draft.boundaryRule,
      draft.promptSummary,
      draft.fallbackTemplate,
      draft.nodeChain,
      draft.previewRecord,
      draft.publishUrl,
      draft.accessNote,
    ].every(hasText) &&
    isHttpUrl(draft.publishUrl)
  );
}

export function stageFourOnboardingSnapshotFromImplementation(
  content: Partial<StageFourImplementationPayloadLike> | Record<string, unknown> | null | undefined,
): StageFourOnboardingSnapshot | null {
  if (!content) {
    return null;
  }
  const source = content as Record<string, unknown>;
  const onboardingChecklist = Array.isArray(source.onboarding_checklist)
    ? source.onboarding_checklist.filter((item): item is StageFourOnboardingStepKey =>
        typeof item === "string" &&
        stageFourOnboardingStepOrder.includes(item as StageFourOnboardingStepKey),
      )
    : [];
  const checks = Object.fromEntries(
    stageFourOnboardingStepOrder.map((key) => [key, onboardingChecklist.includes(key)]),
  ) as StageFourOnboardingChecks;
  const notes = stringFromUnknown(source.implementation_notes);
  const onboardingSection = sectionBody(notes, "Dify 入门记录");
  if (!onboardingSection && onboardingChecklist.length === 0) {
    return null;
  }
  const appParts = labelValue(onboardingSection, "练习应用").split(/\s+\/\s+/);
  const draft: StageFourOnboardingDraft = {
    appName: appParts[0]?.trim() ?? "",
    appType: appParts[1]?.trim() || "Chatflow",
    canvasSummary: labelValue(onboardingSection, "画布识别"),
    llmSummary: labelValue(onboardingSection, "LLM 配置"),
    modelName: labelValue(onboardingSection, "模型"),
    nodeChain: labelValue(onboardingSection, "节点连线"),
    publishUrl: labelValue(onboardingSection, "练习发布链接"),
    startInputs: labelValue(onboardingSection, "开始变量"),
    testRecord: labelValue(onboardingSection, "Preview 调试"),
    workspaceName: labelValue(onboardingSection, "工作区"),
  };
  return {
    checks,
    draft,
    saved: isStageFourOnboardingReady(draft, checks),
  };
}

export function stageFourBuildSnapshotFromImplementation(
  content: Partial<StageFourImplementationPayloadLike> | Record<string, unknown> | null | undefined,
): StageFourBuildSnapshot | null {
  if (!content) {
    return null;
  }
  const source = content as Record<string, unknown>;
  const buildChecklist = Array.isArray(source.build_task_checklist)
    ? source.build_task_checklist.filter((item): item is StageFourBuildStepKey =>
        typeof item === "string" &&
        stageFourBuildStepOrder.includes(item as StageFourBuildStepKey),
      )
    : [];
  const checks = Object.fromEntries(
    stageFourBuildStepOrder.map((key) => [key, buildChecklist.includes(key)]),
  ) as StageFourBuildChecks;
  const implementationNotes = stringFromUnknown(source.implementation_notes);
  const knowledgeBaseNotes = stringFromUnknown(source.knowledge_base_notes);
  const toolConfigurationNotes = stringFromUnknown(source.tool_configuration_notes);
  const hasBuildRecord =
    buildChecklist.length > 0 ||
    hasText(implementationNotes) ||
    hasText(knowledgeBaseNotes) ||
    hasText(toolConfigurationNotes);
  if (!hasBuildRecord) {
    return null;
  }
  const draft: StageFourBuildDraft = {
    accessNote: stringFromUnknown(source.app_access_check_notes),
    boundaryRule: sectionBody(toolConfigurationNotes, "边界分支规则"),
    fallbackTemplate: sectionBody(toolConfigurationNotes, "异常路径回复模板"),
    indexConfig: sectionBody(knowledgeBaseNotes, "索引与检索配置"),
    knowledgeName: sectionBody(knowledgeBaseNotes, "知识库名称"),
    knowledgeSourceMode: sectionBody(knowledgeBaseNotes, "创建位置与数据源方式"),
    nodeChain: sectionBody(toolConfigurationNotes, "节点连线记录"),
    previewRecord: sectionBody(implementationNotes, "Preview 预检记录"),
    projectName: stringFromUnknown(source.dify_app_name),
    projectPurpose: sectionBody(implementationNotes, "应用用途"),
    promptSummary: stringFromUnknown(source.prompt_or_instruction_notes),
    publishUrl: stringFromUnknown(source.dify_app_url),
    retrievalConfig: sectionBody(toolConfigurationNotes, "Chatflow 检索节点记录"),
    segmentConfig: sectionBody(knowledgeBaseNotes, "分段与清洗配置"),
    uploadedFiles: sectionBody(knowledgeBaseNotes, "已上传文件清单"),
  };
  return {
    checks,
    draft,
    saved: isStageFourBuildReady(draft, checks),
  };
}

export function createStageFourImplementationPayloadFromVNext({
  buildChecks,
  buildDraft,
  onboardingChecks,
  onboardingDraft,
  stageThreeBuildPlan,
}: {
  buildChecks: StageFourBuildChecks;
  buildDraft: StageFourBuildDraft;
  onboardingChecks: StageFourOnboardingChecks;
  onboardingDraft: StageFourOnboardingDraft;
  stageThreeBuildPlan?: string;
}): StageFourImplementationPayloadLike {
  const completedOnboardingSteps = stageFourOnboardingStepOrder.filter(
    (key) => onboardingChecks[key],
  );
  const completedBuildSteps = stageFourBuildStepOrder.filter((key) => buildChecks[key]);
  const stageThreeAlignment = stageThreeBuildPlan?.trim() || "按阶段三知识工程决策配置正式 Dify Chatflow。";

  return {
    app_access_check_notes: buildDraft.accessNote.trim(),
    app_access_check_result: "manual_confirmed",
    app_mode: "chatflow",
    build_task_checklist: completedBuildSteps,
    dify_app_name: buildDraft.projectName.trim(),
    dify_app_url: buildDraft.publishUrl.trim(),
    implementation_notes: joinSections([
      ["应用用途", buildDraft.projectPurpose],
      ["Preview 预检记录", buildDraft.previewRecord],
      [
        "Dify 入门记录",
        joinLines([
          `工作区：${onboardingDraft.workspaceName}`,
          `练习应用：${onboardingDraft.appName} / ${onboardingDraft.appType}`,
          `画布识别：${onboardingDraft.canvasSummary}`,
          `开始变量：${onboardingDraft.startInputs}`,
          `模型：${onboardingDraft.modelName}`,
          `LLM 配置：${onboardingDraft.llmSummary}`,
          `节点连线：${onboardingDraft.nodeChain}`,
          `Preview 调试：${onboardingDraft.testRecord}`,
          `练习发布链接：${onboardingDraft.publishUrl}`,
        ]),
      ],
      ["阶段三对齐", stageThreeAlignment],
    ]),
    knowledge_base_notes: joinSections([
      ["知识库名称", buildDraft.knowledgeName],
      ["创建位置与数据源方式", buildDraft.knowledgeSourceMode],
      ["已上传文件清单", buildDraft.uploadedFiles],
      ["分段与清洗配置", buildDraft.segmentConfig],
      ["索引与检索配置", buildDraft.indexConfig],
    ]),
    known_limitations: [
      buildDraft.accessNote.trim(),
      "真实 Dify API 尚未接入平台自动拉取，当前由学生回填关键配置与测试入口。",
    ].filter(Boolean),
    onboarding_checklist: completedOnboardingSteps,
    prompt_or_instruction_notes: buildDraft.promptSummary.trim(),
    stage_three_alignment_notes: stageThreeAlignment,
    tool_configuration_notes: joinSections([
      ["Chatflow 检索节点记录", buildDraft.retrievalConfig],
      ["边界分支规则", buildDraft.boundaryRule],
      ["异常路径回复模板", buildDraft.fallbackTemplate],
      ["节点连线记录", buildDraft.nodeChain],
    ]),
  };
}

const stageFourPlatformTestCaseTemplates: StageFourPlatformTestCase[] = [
  {
    actualAnswer:
      "已列出 MES 终检记录、SOP 8.3.2、Excel 台账和整改闭环表，说明还需补充复检照片编号。",
    evidence: "MES_B-2026-0412.csv / SOP_QC_8.3.2 / CAPA-0412.xlsx",
    expectedBehavior: "列出批次记录、SOP 条款、整改记录和缺失项，并引用来源。",
    id: "T-01",
    location: "通过",
    question: "B-2026-0412 批次审厂前需要准备哪些质检追溯材料？",
    scores: [23, 22, 20, 21],
    status: "pass",
    suite: "Suite A 正常追溯问题",
    testCategory: "standard",
  },
  {
    actualAnswer:
      "回答提到了“按外观检验标准返工”，但没有稳定列出条款编号，只引用了 SOP 文件名。",
    evidence: "SOP_外观检验标准.docx",
    expectedBehavior: "引用 SOP 条款和缺陷分类标准，不只给经验性回答。",
    id: "T-02",
    location: "回 Dify：优化引用回答 Prompt，要求输出条款编号和来源段落。",
    question: "外观划伤缺陷的返工标准依据是什么？",
    scores: [20, 16, 19, 20],
    status: "warn",
    suite: "Suite B 证据引用问题",
    testCategory: "standard",
  },
  {
    actualAnswer: "已提示当前图片记录缺少批次号和工序字段，无法可靠追溯，需要人工补充标注。",
    evidence: "IMG_defect_0412.jpg metadata missing",
    expectedBehavior: "识别图片缺少批次与工序标注，提示资料不足或要求补录。",
    id: "T-03",
    location: "通过",
    question: "这张缺陷图片属于哪个批次、哪个工序？",
    scores: [21, 21, 24, 21],
    status: "pass",
    suite: "Suite C 资料不足问题",
    testCategory: "out_of_scope",
  },
  {
    actualAnswer: "已拒绝直接判定责任，列出需复核的证据范围，并建议质量负责人介入。",
    evidence: "风险边界规则 RB-04",
    expectedBehavior: "拒绝直接责任判定，说明需要人工复核。",
    id: "T-04",
    location: "通过",
    question: "请直接判断这次质量事故责任是否应由供应商承担。",
    scores: [20, 19, 24, 22],
    status: "pass",
    suite: "Suite D 风险边界问题",
    testCategory: "out_of_scope",
  },
  {
    actualAnswer: "回答能列出两个来源，但没有明确进入转人工路径，仍给出“以 MES 为准”的偏判断表达。",
    evidence: "MES_B-2026-0412.csv / Excel_QC_log.xlsx",
    expectedBehavior: "并列冲突证据，触发转人工确认，不选择单一来源下结论。",
    id: "T-05",
    location: "回 Dify：检查条件分支与转人工节点，记录冲突时必须输出人工确认路径。",
    question: "如果 MES 与 Excel 对异常原因记录不一致，下一步应该怎么处理？",
    scores: [19, 18, 18, 18],
    status: "warn",
    suite: "Suite D 风险边界问题",
    testCategory: "multi_turn",
  },
];

export function createStageFourPlatformTestRun(
  target: StageFourTestTargetDraft,
  finishedAt = new Date().toISOString(),
): StageFourPlatformTestRun {
  const cases = cloneStageFourPlatformTestCaseTemplates();
  const dimensionScores = averageDimensionScores(cases);
  return {
    cases,
    dimensionScores,
    finishedAt,
    severeCount: cases.filter((item) => item.status === "fail").length,
    target,
    totalScore: dimensionScores.reduce((sum, value) => sum + value, 0),
    warningCount: cases.filter((item) => item.status === "warn").length,
  };
}

export function createStageFourTestReportPayloadFromRun(
  run: StageFourPlatformTestRun,
): StageFourTestReportPayloadLike {
  const issues = run.cases.filter((item) => item.status !== "pass");
  return {
    coverage_notes: joinLines([
      `测试对象：${run.target.appName} / ${run.target.knowledgeName}`,
      `发布链接：${run.target.publishUrl}`,
      `访问说明：${run.target.accessNote}`,
      `总分：${run.totalScore}`,
      `维度分：召回准确性 ${run.dimensionScores[0]}，引用可追溯性 ${run.dimensionScores[1]}，边界控制 ${run.dimensionScores[2]}，业务流程完整性 ${run.dimensionScores[3]}`,
      `告警项：${run.warningCount}，严重失败：${run.severeCount}`,
    ]),
    improvement_actions: issues.map((item) => `${item.id} ${item.suite}: ${item.location}`),
    observed_failures: issues.map((item) => `${item.id} ${item.suite}: ${item.actualAnswer}`),
    overall_result: run.totalScore >= 80 && run.severeCount === 0 ? "passed" : "needs_revision",
    test_cases: run.cases.map((item) => ({
      actual_output: item.actualAnswer,
      evidence_note: item.evidence,
      expected_output: item.expectedBehavior,
      input: item.question,
      notes: item.location,
      result: item.status === "pass" ? "passed" : item.status === "warn" ? "partial" : "failed",
      scenario: `${item.id} · ${item.suite}`,
      test_category: item.testCategory,
    })),
    test_goal: "验证已发布 Dify Chatflow 是否达到阶段五交付门槛。",
  };
}

export function stageFourPlatformRunFromPersistedReport(
  content: Record<string, unknown> | null | undefined,
  target: StageFourTestTargetDraft,
): StageFourPlatformTestRun | null {
  if (!content) {
    return null;
  }

  const totalScore = numberFromUnknown(content.total_score) ?? scoreFromCoverageNotes(content.coverage_notes);
  if (totalScore === null) {
    return null;
  }

  const dimensionScores =
    dimensionScoresFromUnknown(content.dimension_scores) ??
    dimensionScoresFromCoverageNotes(content.coverage_notes) ??
    distributeScore(totalScore);
  const cases = casesFromPersistedReport(content.test_cases);
  const warningCount =
    cases.length > 0
      ? cases.filter((item) => item.status === "warn").length
      : countFromCoverageNotes(content.coverage_notes, "告警项");
  const severeCount =
    cases.length > 0
      ? cases.filter((item) => item.status === "fail").length
      : countFromCoverageNotes(content.coverage_notes, "严重失败");
  return {
    cases,
    dimensionScores,
    finishedAt: stringFromUnknown(content.finished_at) || stringFromUnknown(content.created_at) || "",
    severeCount,
    target: stageFourTestTargetFromPersistedReport(content, target),
    totalScore,
    warningCount,
  };
}

export function stageFourHasRequiredTestCoverage(artifacts: StageFourArtifactLike[]): boolean {
  const report = latestStageFourArtifactOfType(artifacts, stageFourTestReportType);
  const cases = report?.content_json.test_cases;
  if (!Array.isArray(cases)) {
    return false;
  }

  const categorySet = new Set(
    cases
      .filter(isRecord)
      .map((item) => normalizeTestCategory(item.test_category, item.scenario))
      .filter(Boolean),
  );
  return requiredTestCategories.every((category) => categorySet.has(category));
}

export function latestStageFourArtifactOfType(
  artifacts: StageFourArtifactLike[],
  artifactType: string,
): StageFourArtifactLike | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === artifactType)
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null
  );
}

function stageFourTaskOrder(): StageFourTaskKey[] {
  return [
    "onboarding",
    "knowledge_base",
    "behavior_design",
    "app_submission",
    "test_review",
    "stage_completion",
  ];
}

function task(
  key: StageFourTaskKey,
  label: string,
  evidenceLabel: string,
  meta: string,
  state: StageFourTaskState,
): StageFourTaskItem {
  return {
    description: taskDescription(key),
    evidenceLabel,
    key,
    label,
    meta,
    state,
  };
}

function taskLabel(key: StageFourTaskKey): string {
  const labels: Record<StageFourTaskKey, string> = {
    app_submission: "应用提交",
    behavior_design: "Prompt 与流程",
    knowledge_base: "知识库搭建",
    onboarding: "Dify 新手村",
    stage_completion: "阶段收口",
    test_review: "测试验收",
  };
  return labels[key];
}

function taskEvidenceLabel(key: StageFourTaskKey): string {
  const labels: Record<StageFourTaskKey, string> = {
    app_submission: "应用链接与限制",
    behavior_design: "行为设计说明",
    knowledge_base: "知识库构建记录",
    onboarding: "概念路径确认",
    stage_completion: "阶段五输入证据",
    test_review: "测试报告与反馈",
  };
  return labels[key];
}

function taskDescription(key: StageFourTaskKey): string {
  const descriptions: Record<StageFourTaskKey, string> = {
    app_submission: "提交可访问应用、应用标识和已知限制，作为阶段五交付基础。",
    behavior_design: "说明 Prompt、工作流、工具和记忆如何约束智能体行为。",
    knowledge_base: "按阶段三决策导入材料，并记录检索、清洗和未覆盖范围。",
    onboarding: "确认 Dify 路径、智能体核心构件和本项目应用类型。",
    stage_completion: "检查构建记录、测试报告和 AI 反馈是否足以进入交付阶段。",
    test_review: "覆盖标准题、范围外题和多轮题，形成测试结论和改进动作。",
  };
  return descriptions[key];
}

function hasBehaviorDesign(artifact: StageFourArtifactLike | null): boolean {
  return (
    hasText(artifact?.content_json.prompt_or_instruction_notes) &&
    hasText(artifact?.content_json.tool_configuration_notes)
  );
}

function normalizeTestCategory(value: unknown, scenario: unknown): string {
  if (value === "standard" || value === "out_of_scope" || value === "multi_turn") {
    return value;
  }
  const scenarioText = typeof scenario === "string" ? scenario : "";
  if (/范围外|拒答|out.?of.?scope/i.test(scenarioText)) {
    return "out_of_scope";
  }
  if (/多轮|追问|上下文|memory|multi/i.test(scenarioText)) {
    return "multi_turn";
  }
  if (/标准|审厂|standard|baseline/i.test(scenarioText)) {
    return "standard";
  }
  return "";
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function casesFromPersistedReport(value: unknown): StageFourPlatformTestCase[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).map((item, index) => {
    const status = statusFromResult(item.result);
    const scenario = stringFromUnknown(item.scenario) || `测试场景 ${index + 1}`;
    const fallback = stageFourPlatformTestCaseTemplateFor(item, index, scenario);
    const question =
      stringFromUnknown(item.input) ||
      stringFromUnknown(item.question) ||
      fallback?.question ||
      `测试问题 ${index + 1}`;
    return {
      actualAnswer:
        stringFromUnknown(item.actual_output) ||
        stringFromUnknown(item.actualAnswer) ||
        fallback?.actualAnswer ||
        "",
      evidence:
        stringFromUnknown(item.evidence_note) ||
        stringFromUnknown(item.evidence) ||
        fallback?.evidence ||
        "",
      expectedBehavior:
        stringFromUnknown(item.expected_output) ||
        stringFromUnknown(item.expectedBehavior) ||
        fallback?.expectedBehavior ||
        "",
      id:
        stringFromUnknown(item.id) ||
        fallback?.id ||
        `T-${String(index + 1).padStart(2, "0")}`,
      location:
        stringFromUnknown(item.notes) ||
        (fallback?.status === status ? fallback.location : "") ||
        (status === "pass" ? "通过" : "待整改"),
      question,
      scores: scoresFromUnknown(item.scores) ?? fallback?.scores ?? [0, 0, 0, 0],
      status,
      suite: scenario || fallback?.suite || `测试场景 ${index + 1}`,
      testCategory:
        testCategoryFromUnknown(item.test_category, scenario) ??
        fallback?.testCategory ??
        "custom",
    };
  });
}

function cloneStageFourPlatformTestCaseTemplates(): StageFourPlatformTestCase[] {
  return stageFourPlatformTestCaseTemplates.map((item) => ({
    ...item,
    scores: [...item.scores],
  }));
}

function stageFourPlatformTestCaseTemplateFor(
  item: Record<string, unknown>,
  index: number,
  scenario: string,
): StageFourPlatformTestCase | null {
  const text = [
    scenario,
    stringFromUnknown(item.input),
    stringFromUnknown(item.question),
    stringFromUnknown(item.test_category),
  ].join(" ");
  const templates = stageFourPlatformTestCaseTemplates;
  if (/字段缺失|资料不足|缺少|missing/i.test(text)) {
    return templates[2] ?? null;
  }
  if (/责任判定|责任|范围外|拒答|out.?of.?scope/i.test(text)) {
    return templates[3] ?? null;
  }
  if (/冲突|多轮|追问|上下文|multi/i.test(text)) {
    return templates[4] ?? null;
  }
  if (/证据|引用|SOP|条款/i.test(text)) {
    return templates[1] ?? null;
  }
  return templates[index] ?? templates[0] ?? null;
}

function statusFromResult(value: unknown): StageFourPlatformTestStatus {
  if (value === "passed" || value === "pass") {
    return "pass";
  }
  if (value === "failed" || value === "fail") {
    return "fail";
  }
  return "warn";
}

function testCategoryFromUnknown(
  value: unknown,
  scenario: string,
): StageFourPlatformTestCase["testCategory"] {
  const normalized = normalizeTestCategory(value, scenario);
  return normalized === "standard" || normalized === "out_of_scope" || normalized === "multi_turn"
    ? normalized
    : "custom";
}

function scoreFromCoverageNotes(value: unknown): number | null {
  const match = /总分[：:]\s*(\d+)/.exec(stringFromUnknown(value));
  return match ? Number(match[1]) : null;
}

function dimensionScoresFromCoverageNotes(value: unknown): [number, number, number, number] | null {
  const text = stringFromUnknown(value);
  const match =
    /召回准确性\s*(\d+)[\s\S]*引用可追溯性\s*(\d+)[\s\S]*边界控制\s*(\d+)[\s\S]*业务流程完整性\s*(\d+)/.exec(
      text,
    );
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
}

function countFromCoverageNotes(value: unknown, label: "告警项" | "严重失败"): number {
  const match = new RegExp(`${label}[：:]\\s*(\\d+)`).exec(stringFromUnknown(value));
  return match ? Number(match[1]) : 0;
}

export function stageFourTestTargetFromPersistedReport(
  content: Record<string, unknown> | null | undefined,
  fallback: StageFourTestTargetDraft,
): StageFourTestTargetDraft {
  const lines = stringFromUnknown(content?.coverage_notes)
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
  const accessLine = lines.find(
    (line) => line.startsWith("访问说明：") || line.startsWith("访问说明:"),
  );

  return {
    accessNote: accessLine?.replace(/^访问说明[：:]\s*/, "").trim() || fallback.accessNote,
    appName: appName || fallback.appName,
    knowledgeName: knowledgeName || fallback.knowledgeName,
    publishUrl: publishLine?.replace(/^发布链接[：:]\s*/, "").trim() || fallback.publishUrl,
  };
}

function dimensionScoresFromUnknown(value: unknown): [number, number, number, number] | null {
  const scores = scoresFromUnknown(value);
  return scores;
}

function scoresFromUnknown(value: unknown): [number, number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 4) {
    return null;
  }
  const scores = value.map(numberFromUnknown);
  return scores.every((score): score is number => typeof score === "number")
    ? (scores as [number, number, number, number])
    : null;
}

function distributeScore(totalScore: number): [number, number, number, number] {
  const base = Math.floor(totalScore / 4);
  const remainder = totalScore - base * 4;
  return [0, 1, 2, 3].map((index) => base + (index < remainder ? 1 : 0)) as [
    number,
    number,
    number,
    number,
  ];
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

function stringFromUnknown(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function compareArtifactsByCreatedAt(
  left: StageFourArtifactLike,
  right: StageFourArtifactLike,
): number {
  return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function joinLines(lines: string[]): string {
  return lines.map((line) => line.trim()).filter(Boolean).join("\n");
}

function joinSections(sections: Array<[string, string]>): string {
  return sections
    .map(([title, body]) => {
      const text = body.trim();
      return text ? `【${title}】\n${text}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function sectionBody(source: string, title: string): string {
  const marker = `【${title}】`;
  const startIndex = source.indexOf(marker);
  if (startIndex < 0) {
    return "";
  }
  const bodyStart = startIndex + marker.length;
  const nextSectionIndex = source.indexOf("\n\n【", bodyStart);
  return (nextSectionIndex < 0 ? source.slice(bodyStart) : source.slice(bodyStart, nextSectionIndex)).trim();
}

function labelValue(section: string, label: string): string {
  const marker = `${label}：`;
  const line = section
    .split(/\r?\n/)
    .find((item) => item.trim().startsWith(marker));
  return line ? line.trim().slice(marker.length).trim() : "";
}

function averageDimensionScores(
  cases: StageFourPlatformTestCase[],
): [number, number, number, number] {
  const totals: [number, number, number, number] = [0, 0, 0, 0];
  cases.forEach((item) => {
    item.scores.forEach((score, index) => {
      totals[index] += score;
    });
  });
  return totals.map((value) => Math.round(value / cases.length)) as [
    number,
    number,
    number,
    number,
  ];
}
