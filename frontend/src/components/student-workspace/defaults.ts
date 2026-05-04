import type {
  KnowledgeDecisionFormState,
  StageFiveAcceptancePackageFormState,
  StageFiveDeliveryDocumentFormState,
  StageFiveOperationsGuideFormState,
  StageFourDifyImplementationFormState,
  StageFourTestReportFormState,
  SolutionFormState,
  SummaryFormState,
} from "./types";

export const initialSummary: SummaryFormState = {
  problemStatement: "质检记录依赖人工整理，审厂追溯材料准备压力大。",
  targetUser: "生产部门负责人和一线质检员",
  businessContext: "汽车零部件工厂准备大客户审厂，需要提升质检过程可追溯性。",
  painPoints: "漏检原因难追踪\nMES 数据质量不稳定\n一线员工不愿使用复杂系统",
  successCriteria: "减少人工整理时间\n关键质检记录可追溯\n上线流程不增加一线负担",
};

export const initialSolution: SolutionFormState = {
  solutionTitle: "质检追溯 AI 助手",
  problemSummary: "审厂前质检记录分散，人工整理慢且难以追溯。",
  proposedAgentCapability: "根据质检记录和异常描述生成追溯摘要、风险提示与整改建议。",
  targetWorkflow: "质检员录入异常记录后，生产负责人通过智能体生成审厂追溯材料。",
  dataSources: "MES 质检记录\n不合格品处理单\n审厂检查清单",
  toolOrSystemDependencies: "Dify\nMES 导出的 CSV",
  feasibilityRisks: "MES 数据字段不统一\n一线录入质量不稳定",
  expectedValue: "减少审厂材料人工整理时间，并提升质检问题追溯效率。",
};

export const initialKnowledgeDecision: KnowledgeDecisionFormState = {
  knowledgeGoal: "支撑质检追溯问答、异常原因定位和审厂材料生成。",
  requiredKnowledgeTypes: "质检记录字段说明\n不合格品处理流程\n审厂检查清单",
  sourceInventory: "MES 导出 CSV\n质检 SOP 文档\n历史不合格品处理单",
  selectedStrategy: "rag",
  strategyRationale: "问题需要引用质检记录和 SOP 证据，单纯 prompt 无法覆盖动态数据。",
  dataQualityRisks: "MES 字段命名不统一\n历史处理单存在缺失项",
  maintenancePlan: "每周同步最新质检记录，每月复查 SOP 和审厂清单版本。",
  evaluationPlan: "使用标准审厂问题集检查召回证据覆盖率和回答可追溯性。",
  stage4BuildPlan: "在 Dify 中创建知识库，导入清洗后的 SOP 与样例记录，并配置混合检索。",
};

export const initialStageFourDifyImplementation: StageFourDifyImplementationFormState = {
  difyAppName: "质检追溯 Dify 助手",
  difyAppUrl: "https://dify.example.edu/apps/mfg-qa",
  difyAppId: "dify-app-mfg-qa",
  appMode: "chatflow",
  knowledgeBaseNotes: "已导入质检 SOP、审厂清单和样例质检记录。",
  promptOrInstructionNotes: "要求回答必须引用质检记录证据，并对范围外问题说明无法回答。",
  toolConfigurationNotes: "MVP 暂未启用外部工具，仅保留后续 MES 查询工具配置位。",
  implementationNotes: "按阶段三 RAG 决策配置知识库、混合检索和多轮上下文。",
  knownLimitations: "MES 导出字段仍需人工清洗\n多轮记忆只覆盖当前会话",
};

export const initialStageFourTestReport: StageFourTestReportFormState = {
  testGoal: "验证 Dify 智能体能支持质检追溯、范围外拒答和多轮记忆。",
  testCases: JSON.stringify(
    [
      {
        scenario: "标准审厂问题",
        input: "质检记录数字化需要保存哪些信息？",
        expected_output: "回答应覆盖批次、检验项、结果、责任人和时间。",
        actual_output: "回答覆盖批次、检验项、结果、责任人和时间，并引用 SOP。",
        result: "passed",
        notes: "标准题通过。",
      },
      {
        scenario: "范围外问题",
        input: "今天股市行情怎么样？",
        expected_output: "应拒答并说明不属于质检场景。",
        actual_output: "拒答并引导回到质检追溯问题。",
        result: "passed",
        notes: "范围外拒答通过。",
      },
    ],
    null,
    2,
  ),
  observedFailures: "长问题下回答引用证据不够稳定",
  improvementActions: "补充 SOP 分块标题\n增加范围外问题负样例",
  overallResult: "needs_revision",
};

export const initialStageFiveDeliveryDocument: StageFiveDeliveryDocumentFormState = {
  projectName: "质检追溯 AI 助手交付包",
  finalAgentUrl: "https://dify.example.edu/apps/mfg-qa",
  deliverySummary: "交付一个可供生产负责人查询质检记录和生成审厂追溯摘要的 Dify 应用。",
  coreFeatures: "质检记录问答\n审厂追溯摘要\n范围外问题拒答",
  targetUsers: "生产部门负责人\n一线质检员",
  usageInstructions:
    "用户通过 Dify 链接进入应用，输入质检批次或审厂问题后查看带证据的回答。",
  knownLimitations: "MES 导出字段仍需人工清洗\n多轮记忆只覆盖当前会话",
};

export const initialStageFiveAcceptancePackage: StageFiveAcceptancePackageFormState = {
  acceptanceScope: "围绕质检追溯问答、范围外拒答和多轮上下文进行 MVP 验收。",
  acceptanceCriteria: "标准审厂问题回答可追溯\n范围外问题合理拒答\n多轮追问能保持上下文",
  testEvidenceSummary:
    "阶段四完成 2 个标准测试用例，仍记录 1 个长问题证据引用稳定性问题。",
  unresolvedIssues: "长问题下回答引用证据不够稳定",
  handoverChecklist: "Dify 应用链接\n阶段四测试报告\n已知限制说明\n维护说明",
};

export const initialStageFiveOperationsGuide: StageFiveOperationsGuideFormState = {
  runtimeDependencies: "Dify 云端应用\nDify 知识库\nMES CSV 人工导出文件",
  dataUpdatePlan: "每周导入最新质检记录，每月复核 SOP 和审厂清单版本。",
  monitoringPlan: "每周抽查 10 个典型问题回答，记录无法回答和证据引用异常。",
  commonIssues: "导入 CSV 字段不一致\n长问题需要拆分提问",
  maintenanceOwnerNotes: "由生产质量负责人维护数据源，由课程演示教师协助复核应用配置。",
};
