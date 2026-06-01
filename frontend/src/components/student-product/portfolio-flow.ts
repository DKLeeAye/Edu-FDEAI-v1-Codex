export type PortfolioSummaryCard = {
  body: string;
  label: string;
  title: string;
};

export type PortfolioStageChainItem = {
  actionLabel: string;
  body: string;
  href: string;
  label: string;
  number: string;
  title: string;
};

export type PortfolioAbilityItem = {
  grade: string;
  label: string;
  note: string;
  value: number;
};

export type PortfolioPackageItem = {
  body: string;
  code: string;
  href: string;
  title: string;
};

export type PortfolioReviewNote = {
  body: string;
  label: string;
};

export type PortfolioCapabilityReportRow = {
  level: string;
  name: string;
  note: string;
};

export type PortfolioCapabilityReport = {
  rows: PortfolioCapabilityReportRow[];
  summary: string;
  title: string;
};

export type PortfolioStageKey = "stage_1" | "stage_2" | "stage_3" | "stage_4" | "stage_5";

export type PortfolioArchiveArtifact = {
  artifact_type: string;
  content_json?: Record<string, unknown>;
  created_at?: string;
  status?: string;
};

export type PortfolioArchiveStageRecord = {
  stage_key: string;
  status: string;
};

export type PortfolioArchiveState = {
  acceptanceGateDone: boolean;
  acceptanceGateLabel: string;
  archivedCount: number;
  finalStateCopy: string;
  finalStateTitle: string;
  headerStatus: string;
  readiness: number;
  stageLabels: Record<PortfolioStageKey, string>;
  testScoreTitle: string;
  totalCount: number;
};

export type PortfolioReportState = {
  exportToastCopy: string;
  readinessValue: number;
  reportGateLabel: string;
  reportReady: boolean;
};

export type PortfolioSummaryCardInput = {
  acceptance?: Record<string, unknown>;
  archiveState: Pick<PortfolioArchiveState, "acceptanceGateDone" | "testScoreTitle">;
  delivery?: Record<string, unknown>;
  implementation?: Record<string, unknown>;
  testReport?: Record<string, unknown>;
};

export const portfolioNavigationItems = ["交付文档", "验收确认", "档案袋"] as const;

export const portfolioAcceptanceUnsyncedToastCopy =
  "未检测到阶段五验收记录，已保留演示档案结构";

export const portfolioAcceptanceSyncedToastCopy = "已同步最新项目证据";

export const portfolioReportGeneratedToastCopy = "能力报告已生成";

export const portfolioExportBlockedToastCopy = "请先生成能力报告，再导出归档包";

export const portfolioExportReadyToastCopy =
  "归档包已准备：交付文档、验收记录、测试评分和能力报告";

export const portfolioSummaryCopyText =
  "制造业质检追溯 AI 智能体项目：学生完成需求访谈、技术方案、RAG 决策、Dify Chatflow 搭建、平台自动化测试、交付文档和验收确认，最终形成项目档案袋与能力报告。";

export const portfolioHeroCopy =
  "这里汇总学生从需求访谈、技术方案、RAG 决策、Dify 实现到交付验收的完整证据链。能力画像只基于阶段产物、评审记录和验收证据生成，不用单一分数替代学习过程。";

export function portfolioEvidenceSyncToastCopy(acceptanceGateDone: boolean): string {
  return acceptanceGateDone ? portfolioAcceptanceSyncedToastCopy : portfolioAcceptanceUnsyncedToastCopy;
}

export const portfolioSummaryCards: PortfolioSummaryCard[] = [
  {
    body: "面向质量负责人周明的审厂追溯、异常整改和资料查询场景。",
    label: "实验项目",
    title: "制造业质检追溯 AI 智能体",
  },
  {
    body: "发布链接会在交付验收记录保存后同步到档案袋。",
    label: "Dify 应用",
    title: "未同步",
  },
  {
    body: "覆盖正常追溯、证据引用、资料不足和风险边界四类问题。",
    label: "平台测试",
    title: "--",
  },
  {
    body: "完成交付验收确认后，档案袋会记录最终归档依据。",
    label: "验收结论",
    title: "未确认",
  },
];

export function buildPortfolioReportState({
  acceptanceGateDone,
  hasGeneratedReport,
  hasPersistedDeliveryReview,
  readiness,
}: {
  acceptanceGateDone: boolean;
  hasGeneratedReport: boolean;
  hasPersistedDeliveryReview: boolean;
  readiness: number;
}): PortfolioReportState {
  const reportReady = hasGeneratedReport || hasPersistedDeliveryReview;
  return {
    exportToastCopy: reportReady ? portfolioExportReadyToastCopy : portfolioExportBlockedToastCopy,
    readinessValue: reportReady ? (acceptanceGateDone ? 100 : 86) : readiness,
    reportGateLabel: reportReady ? "能力报告已生成" : "能力报告待生成",
    reportReady,
  };
}

export function buildPortfolioSummaryCards({
  acceptance,
  archiveState,
  delivery,
  implementation,
  testReport,
}: PortfolioSummaryCardInput): PortfolioSummaryCard[] {
  const acceptanceTarget = targetFromAcceptanceScope(acceptance?.acceptance_scope);
  return portfolioSummaryCards.map((card) => {
    if (card.label === "Dify 应用") {
      if (!archiveState.acceptanceGateDone) {
        return card;
      }
      return {
        ...card,
        body:
          textValue(delivery?.final_agent_url) ||
          textValue(implementation?.dify_app_url) ||
          acceptanceTarget.publishUrl ||
          card.body,
        title:
          textValue(delivery?.project_name).replace(/交付说明文档/g, "") ||
          textValue(implementation?.dify_app_name) ||
          acceptanceTarget.appName ||
          card.title,
      };
    }
    if (card.label === "平台测试") {
      return {
        ...card,
        body: textValue(testReport?.test_goal) || card.body,
        title: archiveState.testScoreTitle === "--" ? card.title : archiveState.testScoreTitle,
      };
    }
    if (card.label === "验收结论") {
      if (!archiveState.acceptanceGateDone) {
        return card;
      }
      return {
        ...card,
        body: textValue(acceptance?.acceptance_scope) || card.body,
        title: "已确认",
      };
    }
    return card;
  });
}

export const portfolioStageChainItems: PortfolioStageChainItem[] = [
  {
    actionLabel: "查看阶段一产物",
    body: "围绕审厂追溯压力、MES 字段缺失、一线重复录入和客户验收关注点形成阶段一产物。",
    href: "stage_1",
    label: "需求访谈与业务理解",
    number: "01",
    title: "访谈记录、需求假设、待确认问题",
  },
  {
    actionLabel: "查看阶段二工作台",
    body: "把访谈证据转成需求分析、可行性判断、RAG 技术路线、智能体边界和验收指标。",
    href: "stage_2",
    label: "需求分析与技术方案",
    number: "02",
    title: "可行性研究报告、总体技术方案",
  },
  {
    actionLabel: "查看 RAG 决策路径",
    body: "通过 10 个独立页面形成知识库建设前的判断链，明确资料范围、召回策略和回答边界。",
    href: "stage_3",
    label: "RAG 知识工程决策",
    number: "03",
    title: "数据质量、分块、向量化、召回与风险边界",
  },
  {
    actionLabel: "查看阶段四评分",
    body: "学生在 Dify 中完成知识库创建、文件上传、节点配置、连线、发布和平台自动化测试。",
    href: "stage_4",
    label: "Dify Chatflow 实现与测试",
    number: "04",
    title: "知识库创建、Chatflow 节点、发布链接、平台评分",
  },
  {
    actionLabel: "查看验收确认",
    body: "学生完成客户可读交付文档，回答验收追问，并形成可进入档案袋的最终交付证据。",
    href: "stage_5",
    label: "交付文档与验收确认",
    number: "05",
    title: "交付说明文档、模拟客户验收、最终归档结论",
  },
];

export const portfolioAbilityItems: PortfolioAbilityItem[] = [
  {
    grade: "A-",
    label: "需求访谈",
    note: "能追问隐藏约束，并区分客户原话、事实和个人判断。",
    value: 86,
  },
  {
    grade: "B+",
    label: "方案设计",
    note: "能把需求转成可行性研究、边界和总体技术方案。",
    value: 82,
  },
  {
    grade: "A-",
    label: "知识工程",
    note: "能判断资料质量、分块策略、召回策略和风险边界。",
    value: 88,
  },
  {
    grade: "B+",
    label: "智能体实现",
    note: "能在 Dify 中完成知识库、Chatflow 节点、连线与发布。",
    value: 80,
  },
  {
    grade: "B+",
    label: "测试调优",
    note: "能通过平台测试识别 Prompt、知识库和边界规则问题。",
    value: 84,
  },
  {
    grade: "A",
    label: "交付表达",
    note: "能写清客户使用说明、已知限制和维护更新责任。",
    value: 90,
  },
];

export const portfolioPackageItems: PortfolioPackageItem[] = [
  {
    body: "项目背景、使用说明、资料范围、边界、测试与维护。",
    code: "DOC",
    href: "stage_5",
    title: "交付说明文档",
  },
  {
    body: "交付包清单、客户追问、验收结论和归档依据。",
    code: "ACC",
    href: "stage_5",
    title: "交付验收记录",
  },
  {
    body: "测试集、实际回答、问题定位和整改建议。",
    code: "TST",
    href: "stage_4",
    title: "平台测试评分",
  },
  {
    body: "知识库何时回答、何时资料不足、何时转人工。",
    code: "RAG",
    href: "stage_3",
    title: "RAG 风险边界",
  },
];

export const portfolioReviewNotes: PortfolioReviewNote[] = [
  {
    body: "能把客户审厂压力转成可执行的数据、知识库和智能体边界设计。",
    label: "优势",
  },
  {
    body: "后续项目可加强真实系统接口、图片缺陷标注和长期运维责任设计。",
    label: "需继续训练",
  },
  {
    body: "请先同步验收记录，再导出最终档案袋。",
    label: "归档提醒",
  },
];

export const portfolioCapabilityReport: PortfolioCapabilityReport = {
  title: "制造业质检 AI 智能体项目能力报告",
  summary:
    "学生已完成从客户访谈到交付验收的完整 FDE 项目链路，能力优势集中在需求边界识别、RAG 决策和交付表达，后续建议加强真实接口接入与长期运维责任设计。",
  rows: [
    {
      name: "需求访谈",
      level: "A-",
      note: "能够追问客户审厂、资料分散和一线录入阻力，并形成待确认问题清单。",
    },
    {
      name: "技术方案",
      level: "B+",
      note: "可将访谈证据转成可行性研究、总体技术方案和验收指标。",
    },
    {
      name: "知识工程",
      level: "A-",
      note: "完成数据源识别、质量评估、清洗、分块、向量化、召回、引用和风险边界判断。",
    },
    {
      name: "智能体实现",
      level: "B+",
      note: "完成 Dify 知识库创建、Chatflow 节点配置、发布链接回填和平台自动化测试。",
    },
    {
      name: "交付表达",
      level: "A",
      note: "能写清客户使用方式、已知限制、维护责任和最终验收结论。",
    },
  ],
};

export function buildPortfolioArchiveState({
  artifactsByStage,
  stageRecords,
}: {
  artifactsByStage: Record<PortfolioStageKey, PortfolioArchiveArtifact[]>;
  stageRecords: PortfolioArchiveStageRecord[];
}): PortfolioArchiveState {
  const statusByStage = Object.fromEntries(
    stageRecords.map((record) => [record.stage_key, record.status]),
  ) as Partial<Record<PortfolioStageKey, string>>;
  const hasStageFourTest = artifactsByStage.stage_4.some(
    (artifact) => artifact.artifact_type === "stage_4_test_report",
  );
  const hasDeliveryDocument = artifactsByStage.stage_5.some(
    (artifact) => artifact.artifact_type === "stage_5_delivery_document",
  );
  const hasAcceptance = artifactsByStage.stage_5.some(
    (artifact) => isFinalAcceptanceArtifact(artifact),
  );
  const hasReview = artifactsByStage.stage_5.some(
    (artifact) => artifact.artifact_type === "stage_5_ai_delivery_review",
  );
  const archivedStages: Record<PortfolioStageKey, boolean> = {
    stage_1: statusByStage.stage_1 === "completed",
    stage_2: statusByStage.stage_2 === "completed",
    stage_3: statusByStage.stage_3 === "completed",
    stage_4: statusByStage.stage_4 === "completed" || hasStageFourTest,
    stage_5: statusByStage.stage_5 === "completed" || hasAcceptance,
  };
  const archivedCount = Object.values(archivedStages).filter(Boolean).length;
  const testScoreTitle = stageFourTestScore(artifactsByStage.stage_4);

  return {
    acceptanceGateDone: hasAcceptance,
    acceptanceGateLabel: hasAcceptance ? "验收记录已同步" : "验收记录待同步",
    archivedCount,
    finalStateCopy: hasAcceptance
      ? "档案袋已同步交付对象、验收结论和最终归档说明。"
      : "点击“拉取项目证据”后，将从阶段四测试、交付文档和验收确认中同步最终归档状态。",
    finalStateTitle: hasAcceptance ? "项目已具备归档条件" : "待拉取验收记录",
    headerStatus: archivedCount > 0 || hasDeliveryDocument ? "成果归档" : "项目档案袋",
    readiness: hasAcceptance ? (hasReview ? 100 : 88) : archivedCount >= 4 || hasDeliveryDocument ? 72 : 40,
    stageLabels: {
      stage_1: archivedStages.stage_1 ? "已完成" : "待同步",
      stage_2: archivedStages.stage_2 ? "已完成" : "待同步",
      stage_3: archivedStages.stage_3 ? "已完成" : "待同步",
      stage_4: hasStageFourTest ? "课堂演示记录" : archivedStages.stage_4 ? "已归档" : "待同步",
      stage_5: hasAcceptance ? "已归档" : "待同步",
    },
    testScoreTitle,
    totalCount: 5,
  };
}

function stageFourTestScore(artifacts: PortfolioArchiveArtifact[]): string {
  const report = latestPortfolioArtifactOfType(artifacts, "stage_4_test_report");
  const rawScore = report?.content_json?.total_score;
  if (typeof rawScore === "number" && Number.isFinite(rawScore)) {
    return `${rawScore} 分`;
  }
  if (typeof rawScore === "string" && rawScore.trim()) {
    const scoreText = rawScore.trim();
    return scoreText.includes("分") ? scoreText : `${scoreText} 分`;
  }
  const coverageScore = textValue(report?.content_json?.coverage_notes).match(/总分[：:]\s*(\d+)/);
  if (coverageScore?.[1]) {
    return `${coverageScore[1]} 分`;
  }
  return "--";
}

function latestPortfolioArtifactOfType(
  artifacts: PortfolioArchiveArtifact[],
  artifactType: string,
): PortfolioArchiveArtifact | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === artifactType)
      .slice()
      .sort((left, right) => artifactTimestamp(left) - artifactTimestamp(right))
      .at(-1) ?? null
  );
}

function isFinalAcceptanceArtifact(artifact: PortfolioArchiveArtifact): boolean {
  if (artifact.artifact_type !== "stage_5_acceptance_package") {
    return false;
  }
  if (!["submitted", "reviewed", "accepted"].includes(artifact.status ?? "submitted")) {
    return false;
  }
  const decision = textValue(artifact.content_json?.acceptance_decision);
  if (decision === "revise") {
    return false;
  }
  if (decision === "pass" || decision === "conditional") {
    return true;
  }
  const scope = textValue(artifact.content_json?.acceptance_scope);
  if (/验收结论[：:]\s*退回修改/.test(scope)) {
    return false;
  }
  if (/验收结论[：:]\s*(通过验收|有条件通过)/.test(scope)) {
    return true;
  }
  return true;
}

function artifactTimestamp(artifact: PortfolioArchiveArtifact): number {
  const timestamp = Date.parse(artifact.created_at ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function targetFromAcceptanceScope(value: unknown): { appName: string; publishUrl: string } {
  const lines = textValue(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const targetLine = lines.find(
    (line) => line.startsWith("交付对象：") || line.startsWith("交付对象:"),
  );
  const targetText = targetLine?.replace(/^交付对象[：:]\s*/, "").trim() ?? "";
  const [appName] = targetText.split(/\s*\/\s*/, 1).map((item) => item.trim());
  const publishLine = lines.find(
    (line) => line.startsWith("发布链接：") || line.startsWith("发布链接:"),
  );
  return {
    appName: appName || "",
    publishUrl: publishLine?.replace(/^发布链接[：:]\s*/, "").trim() ?? "",
  };
}
