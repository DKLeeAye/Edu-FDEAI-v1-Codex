import type {
  KnowledgeDecisionFormState,
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
