export type StageTwoDocumentKey =
  | "requirements_document"
  | "feasibility_report"
  | "technical_solution";

export type StageTwoVNextStep = "guide" | "workbench";

export type StageTwoMode = StageTwoVNextStep;

export type StageTwoSectionKey =
  | "requirements_context"
  | "requirements_scope"
  | "requirements_acceptance"
  | "feasibility_data"
  | "feasibility_technical"
  | "feasibility_value"
  | "technical_route"
  | "technical_flow"
  | "technical_handoff";

export type StageTwoProgressKey = StageTwoDocumentKey | "stage_completion";

export type StageTwoProgressState = "locked" | "ready" | "active" | "done";

export type StageTwoSectionState = "locked" | "draft" | "needs_review" | "ready_to_submit" | "submitted";

export type StageTwoGuideChecks = {
  dataBoundary: boolean;
  documentRoles: boolean;
  outOfScope: boolean;
  technicalPlan: boolean;
};

export type StageTwoVNextChapterKey =
  | "background"
  | "requirement"
  | "feasibility"
  | "boundary"
  | "technical"
  | "acceptance";

export type StageTwoVNextChapterState =
  | "draft"
  | "needs_review"
  | "ready_to_save"
  | "saved"
  | "locked";

export type StageTwoArtifactLike = {
  artifact_type: string;
  content_json: Record<string, unknown>;
  created_at: string;
  id: string;
};

export type StageTwoProgressItem = {
  key: StageTwoProgressKey;
  label: string;
  meta: string;
  state: StageTwoProgressState;
};

export type StageTwoYellowFlagSummary = {
  description: string;
  impactStageKey: string;
};

export type StageTwoSectionSpec = {
  checkpoints: string[];
  documentType: StageTwoDocumentKey;
  fields: Array<{
    key: string;
    label: string;
    multiline?: boolean;
    options?: Array<[string, string]>;
    placeholder: string;
    required?: boolean;
  }>;
  key: StageTwoSectionKey;
  learningGoal: string;
  title: string;
};

export type StageTwoSectionProgress = {
  documentType: StageTwoDocumentKey;
  key: StageTwoSectionKey;
  label: string;
  meta: string;
  state: StageTwoSectionState;
};

export type StageTwoVNextChapterSpec = {
  key: StageTwoVNextChapterKey;
  kicker: string;
  methodBody: string;
  methodTitle: string;
  number: string;
  sectionKeys: StageTwoSectionKey[];
  title: string;
};

export type StageTwoVNextChapterProgress = {
  key: StageTwoVNextChapterKey;
  label: string;
  meta: string;
  state: StageTwoVNextChapterState;
};

export const stageTwoDocumentArtifactTypes: Record<StageTwoDocumentKey, string> = {
  feasibility_report: "stage_2_feasibility_report",
  requirements_document: "stage_2_requirements_document",
  technical_solution: "stage_2_technical_solution",
};

export const stageTwoDocumentLabels: Record<StageTwoDocumentKey, string> = {
  feasibility_report: "可行性报告",
  requirements_document: "需求文档",
  technical_solution: "总体技术方案",
};

export const stageTwoVNextChapterSpecs: StageTwoVNextChapterSpec[] = [
  {
    key: "background",
    kicker: "Background",
    methodBody: "先说明客户所在场景、审厂压力、当前处理方式和主要阻塞点。不要提前承诺技术方案。",
    methodTitle: "这一章不是写“客户想做 AI”，而是写清楚业务为什么需要被解决。",
    number: "01",
    sectionKeys: ["requirements_context"],
    title: "项目背景与客户问题",
  },
  {
    key: "requirement",
    kicker: "Requirement Analysis",
    methodBody: "说明谁使用、在什么场景使用、输入什么、期望得到什么、有哪些限制条件。",
    methodTitle: "需求分析要把“想要一个智能体”拆成用户、场景、任务和约束。",
    number: "02",
    sectionKeys: ["requirements_scope"],
    title: "需求分析",
  },
  {
    key: "feasibility",
    kicker: "Feasibility Study",
    methodBody: "分别评估业务价值、数据条件、技术路径、组织落地和风险边界。",
    methodTitle: "可行性研究不是证明“肯定能做”，而是诚实判断可做范围。",
    number: "03",
    sectionKeys: ["feasibility_data", "feasibility_value"],
    title: "可行性研究",
  },
  {
    key: "boundary",
    kicker: "Capability Boundary",
    methodBody: "用明确句子写出范围内、范围外和转人工条件，避免项目被无限扩大。",
    methodTitle: "好的技术方案必须写清楚“做什么”和“不做什么”。",
    number: "04",
    sectionKeys: ["feasibility_technical"],
    title: "能力边界",
  },
  {
    key: "technical",
    kicker: "Technical Architecture",
    methodBody: "说明知识库放什么、结构化数据怎么来、工作流如何处理风险、输出如何带证据。",
    methodTitle: "总体技术方案要让实现团队知道数据、流程、智能体和验收如何连接。",
    number: "05",
    sectionKeys: ["technical_route", "technical_flow", "technical_handoff"],
    title: "总体技术方案",
  },
  {
    key: "acceptance",
    kicker: "Acceptance & Risk",
    methodBody: "把验收拆成范围内回答、范围外拒答、缺失字段提示、证据引用和人工确认。",
    methodTitle: "验收标准要能被测试，风险说明要能被追踪。",
    number: "06",
    sectionKeys: ["requirements_acceptance"],
    title: "验收与风险说明",
  },
];

const stageTwoDocumentOrder: StageTwoDocumentKey[] = [
  "requirements_document",
  "feasibility_report",
  "technical_solution",
];

export const stageTwoSectionSpecs: StageTwoSectionSpec[] = [
  {
    checkpoints: ["引用阶段一事实", "说明现有流程", "不提前写技术方案"],
    documentType: "requirements_document",
    fields: [
      {
        key: "project_background",
        label: "项目背景",
        multiline: true,
        placeholder: "客户业务背景、项目触发原因、当前压力。",
        required: true,
      },
      {
        key: "current_business_process",
        label: "当前业务现状",
        multiline: true,
        placeholder: "现有流程怎么跑，谁参与，资料在哪里流转。",
        required: true,
      },
      {
        key: "evidence_summary",
        label: "证据说明",
        multiline: true,
        placeholder: "写出这一节依据的阶段一访谈或总结事实。",
      },
    ],
    key: "requirements_context",
    learningGoal: "把阶段一访谈事实转成客户能读懂的项目背景和业务现状。",
    title: "背景与现状",
  },
  {
    checkpoints: ["痛点具体", "目标对应痛点", "范围不过度扩张"],
    documentType: "requirements_document",
    fields: [
      {
        key: "pain_points",
        label: "核心痛点",
        multiline: true,
        placeholder: "每行一个具体痛点。",
        required: true,
      },
      {
        key: "requirement_goals",
        label: "需求目标",
        multiline: true,
        placeholder: "每行一个业务目标。",
        required: true,
      },
      {
        key: "out_of_scope",
        label: "暂不纳入范围",
        multiline: true,
        placeholder: "每行一个暂不承诺的事项。",
      },
    ],
    key: "requirements_scope",
    learningGoal: "从访谈噪声中提炼真正要解决的痛点，并转成清晰的需求目标。",
    title: "痛点与目标",
  },
  {
    checkpoints: ["验收标准可观察", "约束来自客户现实", "保留待确认问题"],
    documentType: "requirements_document",
    fields: [
      {
        key: "acceptance_criteria",
        label: "验收标准初稿",
        multiline: true,
        placeholder: "每行一个可观察、可测试的验收标准。",
        required: true,
      },
      {
        key: "constraints",
        label: "约束条件",
        multiline: true,
        placeholder: "每行一个时间、系统、人员或数据约束。",
        required: true,
      },
      {
        key: "open_questions",
        label: "仍需确认的问题",
        multiline: true,
        placeholder: "每行一个后续需要追问或验证的问题。",
      },
    ],
    key: "requirements_acceptance",
    learningGoal: "把需求目标转成可观察的验收标准，并记录当前项目边界。",
    title: "验收与约束",
  },
  {
    checkpoints: ["列出关键数据来源", "判断数据质量", "说明数据差距"],
    documentType: "feasibility_report",
    fields: [
      {
        key: "data_sources",
        label: "数据来源盘点",
        multiline: true,
        placeholder: "每行一个数据来源。",
        required: true,
      },
      {
        key: "data_quality_assessment",
        label: "数据质量评估",
        multiline: true,
        placeholder: "判断完整性、准确性、可用性和主要依据。",
        required: true,
      },
      {
        key: "data_gaps",
        label: "数据差距",
        multiline: true,
        placeholder: "每行一个待确认或缺失的数据条件。",
      },
      {
        key: "data_feasibility_conclusion",
        label: "数据可行性结论",
        options: [
          ["feasible", "可行"],
          ["needs_supplement", "需补充后可行"],
          ["not_feasible", "暂不可行"],
        ],
        placeholder: "",
        required: true,
      },
    ],
    key: "feasibility_data",
    learningGoal: "判断当前数据是否支撑 AI 方案，而不是只罗列数据名称。",
    title: "数据可行性",
  },
  {
    checkpoints: ["避免过度承诺", "说明人工判断边界", "形成技术风险"],
    documentType: "feasibility_report",
    fields: [
      {
        key: "ai_capable_scope",
        label: "AI 能解决的部分",
        multiline: true,
        placeholder: "明确 AI 介入点，不夸大承诺。",
        required: true,
      },
      {
        key: "ai_limitations",
        label: "AI 不能解决的部分",
        multiline: true,
        placeholder: "写清边界、人工判断和外部系统限制。",
        required: true,
      },
      {
        key: "technical_risks",
        label: "技术风险",
        multiline: true,
        placeholder: "每行一个构建或验证阶段要回应的技术风险。",
      },
      {
        key: "technical_feasibility_conclusion",
        label: "技术可行性结论",
        options: [
          ["feasible", "可行"],
          ["conditional", "有条件可行"],
          ["not_recommended", "不建议"],
        ],
        placeholder: "",
        required: true,
      },
    ],
    key: "feasibility_technical",
    learningGoal: "区分 AI 能做、不能做和必须在后续验证的技术风险。",
    title: "技术可行性",
  },
  {
    checkpoints: ["说明业务收益", "估计实施成本", "建议与结论一致"],
    documentType: "feasibility_report",
    fields: [
      {
        key: "expected_benefits",
        label: "预期收益",
        multiline: true,
        placeholder: "业务价值，尽量量化。",
        required: true,
      },
      {
        key: "implementation_cost",
        label: "实施成本",
        multiline: true,
        placeholder: "时间、人力、系统改造或试点成本。",
        required: true,
      },
      {
        key: "roi_conclusion",
        label: "ROI 结论",
        options: [
          ["worth_doing", "值得做"],
          ["conditional", "有条件值得做"],
          ["not_worth_doing", "不建议投入"],
        ],
        placeholder: "",
        required: true,
      },
      {
        key: "overall_recommendation",
        label: "综合建议",
        options: [
          ["proceed", "继续推进"],
          ["adjust_scope", "调整范围后推进"],
          ["pause", "暂缓"],
        ],
        placeholder: "",
        required: true,
      },
    ],
    key: "feasibility_value",
    learningGoal: "用收益、成本和范围建议判断项目是否值得继续推进。",
    title: "价值与综合建议",
  },
  {
    checkpoints: ["知识库路线匹配数据形态", "智能体类型匹配流程", "解释选择依据"],
    documentType: "technical_solution",
    fields: [
      {
        key: "knowledge_base_strategy",
        label: "知识库方案初选",
        options: [
          ["document", "文档型知识库"],
          ["structured", "结构化数据知识库"],
          ["hybrid", "混合型知识库"],
          ["none", "暂不使用知识库"],
        ],
        placeholder: "",
        required: true,
      },
      {
        key: "knowledge_base_rationale",
        label: "知识库选择依据",
        multiline: true,
        placeholder: "结合数据形态解释为什么这样选。",
        required: true,
      },
      {
        key: "agent_type",
        label: "智能体类型初选",
        options: [
          ["chat", "对话型"],
          ["workflow", "工作流型"],
          ["hybrid", "混合型"],
        ],
        placeholder: "",
        required: true,
      },
      {
        key: "agent_type_rationale",
        label: "智能体类型选择依据",
        multiline: true,
        placeholder: "结合业务流程解释为什么这样选。",
        required: true,
      },
    ],
    key: "technical_route",
    learningGoal: "基于数据形态和业务流程选择知识库策略与智能体类型。",
    title: "知识库与智能体路线",
  },
  {
    checkpoints: ["数据流闭环", "部署方式适合 MVP", "避免过早接生产系统"],
    documentType: "technical_solution",
    fields: [
      {
        key: "data_flow",
        label: "数据流向设计",
        multiline: true,
        placeholder: "说明数据从哪里来、如何进入知识库或工作流、最后如何输出。",
        required: true,
      },
      {
        key: "deployment_option",
        label: "部署方式初选",
        options: [
          ["local_demo", "本地演示"],
          ["saas", "云端 SaaS"],
          ["private", "私有化部署"],
          ["hybrid", "混合部署"],
        ],
        placeholder: "",
        required: true,
      },
      {
        key: "deployment_rationale",
        label: "部署方式选择依据",
        multiline: true,
        placeholder: "说明为什么当前阶段选择这种部署方式。",
        required: true,
      },
    ],
    key: "technical_flow",
    learningGoal: "让后续实现者知道数据如何进入系统、如何输出，以及当前部署边界。",
    title: "数据流与部署方式",
  },
  {
    checkpoints: ["给出阶段三起点", "给出阶段四构建计划", "保留技术风险"],
    documentType: "technical_solution",
    fields: [
      {
        key: "stage_three_starting_point",
        label: "阶段三起点",
        multiline: true,
        placeholder: "给知识工程决策的输入，例如优先盘点哪些字段或文档。",
        required: true,
      },
      {
        key: "stage_four_build_plan",
        label: "阶段四构建计划",
        multiline: true,
        placeholder: "给 Dify 构建的初始路线。",
        required: true,
      },
      {
        key: "technical_risks",
        label: "技术风险备注",
        multiline: true,
        placeholder: "每行一个后续构建和测试要验证的风险。",
      },
    ],
    key: "technical_handoff",
    learningGoal: "把技术方案转成阶段三知识工程和阶段四构建的起点。",
    title: "后续阶段交接",
  },
];

export const stageTwoDocumentSections: Record<StageTwoDocumentKey, StageTwoSectionKey[]> = {
  feasibility_report: ["feasibility_data", "feasibility_technical", "feasibility_value"],
  requirements_document: [
    "requirements_context",
    "requirements_scope",
    "requirements_acceptance",
  ],
  technical_solution: ["technical_route", "technical_flow", "technical_handoff"],
};

export function createStageTwoProgressItems(
  artifacts: StageTwoArtifactLike[],
  stageStatus?: string,
): StageTwoProgressItem[] {
  if (stageStatus === "locked") {
    return [
      progressItem("requirements_document", "locked", "待解锁"),
      progressItem("feasibility_report", "locked", "待解锁"),
      progressItem("technical_solution", "locked", "待解锁"),
      {
        key: "stage_completion",
        label: "阶段完成",
        meta: "待解锁",
        state: "locked",
      },
    ];
  }

  const requirements = documentState(artifacts, "requirements_document");
  const feasibility = documentState(artifacts, "feasibility_report");
  const technical = documentState(artifacts, "technical_solution");

  const items: StageTwoProgressItem[] = [
    progressItem("requirements_document", requirements.state, requirements.meta),
    requirements.reviewPassed
      ? progressItem("feasibility_report", feasibility.state, feasibility.meta)
      : progressItem("feasibility_report", "locked", "先评审需求文档"),
    feasibility.reviewPassed
      ? progressItem("technical_solution", technical.state, technical.meta)
      : progressItem("technical_solution", "locked", "先评审可行性报告"),
  ];

  const completeReady = stageTwoCanCompleteWithFormalDocs(artifacts);
  items.push({
    key: "stage_completion",
    label: "阶段完成",
    meta:
      stageStatus === "completed"
        ? "已完成"
        : completeReady
          ? "可完成"
          : `${items.filter((item) => item.state !== "done").length} 份文档待完成`,
    state: stageStatus === "completed" ? "done" : completeReady ? "ready" : "locked",
  });
  return items;
}

export function createStageTwoSectionProgressItems(
  artifacts: StageTwoArtifactLike[],
  documentKey: StageTwoDocumentKey,
  documentLocked: boolean,
): StageTwoSectionProgress[] {
  return stageTwoDocumentSections[documentKey].map((sectionKey) => {
    const spec = stageTwoSectionSpecs.find((item) => item.key === sectionKey);
    const state = documentLocked ? "locked" : sectionState(artifacts, documentKey, sectionKey);
    return {
      documentType: documentKey,
      key: sectionKey,
      label: spec?.title ?? sectionKey,
      meta: sectionStateCopy(state),
      state,
    };
  });
}

export function stageTwoCanComposeDocument(
  artifacts: StageTwoArtifactLike[],
  documentKey: StageTwoDocumentKey,
): boolean {
  return stageTwoDocumentSections[documentKey].every(
    (sectionKey) =>
      latestStageTwoSectionSubmission(artifacts, documentKey, sectionKey) !== null,
  );
}

export function stageTwoCanCompleteWithFormalDocs(artifacts: StageTwoArtifactLike[]): boolean {
  return stageTwoDocumentOrder.every((documentKey) => documentState(artifacts, documentKey).reviewPassed);
}

export function isStageTwoFocusedMode(mode: StageTwoMode): boolean {
  return mode === "guide" || mode === "workbench";
}

export function deriveStageTwoVNextStep(
  artifacts: StageTwoArtifactLike[],
  stageStatus?: string,
): StageTwoVNextStep {
  if (stageStatus === "completed") {
    return "workbench";
  }
  return artifacts.length > 0 ? "workbench" : "guide";
}

export function isStageTwoGuideReady(checks: StageTwoGuideChecks): boolean {
  return Object.values(checks).every(Boolean);
}

export function getStageTwoVNextChapterSpec(
  chapterKey: StageTwoVNextChapterKey,
): StageTwoVNextChapterSpec {
  return (
    stageTwoVNextChapterSpecs.find((chapter) => chapter.key === chapterKey) ??
    stageTwoVNextChapterSpecs[0]
  );
}

export function createStageTwoVNextChapterProgress(
  artifacts: StageTwoArtifactLike[],
  stageStatus?: string,
): StageTwoVNextChapterProgress[] {
  return stageTwoVNextChapterSpecs.map((chapter) => {
    if (stageStatus === "locked") {
      return {
        key: chapter.key,
        label: chapter.title,
        meta: "未解锁",
        state: "locked",
      };
    }

    const submittedCount = chapter.sectionKeys.filter((sectionKey) => {
      const documentType = getStageTwoSectionDocumentType(sectionKey);
      return latestStageTwoSectionSubmission(artifacts, documentType, sectionKey) !== null;
    }).length;
    if (submittedCount === chapter.sectionKeys.length) {
      return {
        key: chapter.key,
        label: chapter.title,
        meta: `${submittedCount}/${chapter.sectionKeys.length} 小节已确认`,
        state: "saved",
      };
    }

    const draftCount = chapter.sectionKeys.filter((sectionKey) => {
      const documentType = getStageTwoSectionDocumentType(sectionKey);
      return latestStageTwoSectionDraft(artifacts, documentType, sectionKey) !== null;
    }).length;
    const readyCount = chapter.sectionKeys.filter((sectionKey) => {
      const documentType = getStageTwoSectionDocumentType(sectionKey);
      const draft = latestStageTwoSectionDraft(artifacts, documentType, sectionKey);
      const review = latestStageTwoSectionReview(artifacts, documentType, sectionKey, draft?.id);
      return review?.content_json.can_submit === true && !hasRedFlags(review);
    }).length;
    if (readyCount === chapter.sectionKeys.length) {
      return {
        key: chapter.key,
        label: chapter.title,
        meta: "可确认保存",
        state: "ready_to_save",
      };
    }
    if (draftCount > 0 || readyCount > 0 || submittedCount > 0) {
      return {
        key: chapter.key,
        label: chapter.title,
        meta: `${submittedCount}/${chapter.sectionKeys.length} 小节已确认`,
        state: "needs_review",
      };
    }
    return {
      key: chapter.key,
      label: chapter.title,
      meta: "待撰写",
      state: "draft",
    };
  });
}

export function getStageTwoSectionDocumentType(
  sectionKey: StageTwoSectionKey,
): StageTwoDocumentKey {
  const spec = stageTwoSectionSpecs.find((section) => section.key === sectionKey);
  return spec?.documentType ?? "requirements_document";
}

export function createStageTwoSectionBackfillFromFormalDocuments(
  artifacts: StageTwoArtifactLike[],
  sectionKey: StageTwoSectionKey,
): Record<string, unknown> {
  const requirements = latestStageTwoDocumentArtifact(artifacts, "requirements_document");
  const feasibility = latestStageTwoDocumentArtifact(artifacts, "feasibility_report");
  const technical = latestStageTwoDocumentArtifact(artifacts, "technical_solution");
  const requirementContent = requirements?.content_json ?? {};
  const feasibilityContent = feasibility?.content_json ?? {};
  const technicalContent = technical?.content_json ?? {};
  const requirementSummary = stringValue(requirementContent.summary);
  const feasibilitySummary = stringValue(feasibilityContent.summary);
  const technicalSummary = stringValue(technicalContent.summary);
  const feasibilityYellowFlags = stringListValue(feasibilityContent.yellow_flags);
  const route = stringValue(technicalContent.route);

  if (sectionKey === "requirements_context" && requirementSummary) {
    return {
      current_business_process: requirementSummary,
      evidence_summary: requirementSummary,
      project_background: requirementSummary,
    };
  }
  if (sectionKey === "requirements_scope" && requirementSummary) {
    return {
      pain_points: requirementSummary,
      requirement_goals: requirementSummary,
      out_of_scope: stringListValue(requirementContent.out_of_scope),
    };
  }
  if (sectionKey === "requirements_acceptance" && requirementSummary) {
    return {
      acceptance_criteria: stringListValue(requirementContent.acceptance_criteria),
      constraints: stringListValue(requirementContent.constraints),
      open_questions: requirementSummary,
    };
  }
  if (sectionKey === "feasibility_data" && (feasibilitySummary || feasibilityYellowFlags.length > 0)) {
    return {
      data_feasibility_conclusion: "needs_supplement",
      data_gaps: feasibilityYellowFlags,
      data_quality_assessment: feasibilitySummary,
      data_sources: stringListValue(feasibilityContent.data_sources),
    };
  }
  if (sectionKey === "feasibility_technical" && (feasibilitySummary || feasibilityYellowFlags.length > 0)) {
    return {
      ai_capable_scope: feasibilitySummary,
      ai_limitations: feasibilityYellowFlags,
      technical_feasibility_conclusion: "conditional",
      technical_risks: feasibilityYellowFlags,
    };
  }
  if (sectionKey === "feasibility_value" && feasibilitySummary) {
    return {
      expected_benefits: feasibilitySummary,
      implementation_cost: stringValue(feasibilityContent.implementation_cost),
      overall_recommendation: "adjust_scope",
      roi_conclusion: "conditional",
    };
  }
  if (sectionKey === "technical_route" && (technicalSummary || route)) {
    return {
      agent_type: "workflow",
      agent_type_rationale: route || technicalSummary,
      knowledge_base_rationale: technicalSummary || route,
      knowledge_base_strategy: "structured",
    };
  }
  if (sectionKey === "technical_flow" && (technicalSummary || route)) {
    return {
      data_flow: technicalSummary || route,
      deployment_option: "local_demo",
      deployment_rationale: route || technicalSummary,
    };
  }
  if (sectionKey === "technical_handoff" && (technicalSummary || route || feasibilityYellowFlags.length > 0)) {
    return {
      stage_four_build_plan: route || technicalSummary,
      stage_three_starting_point: feasibilityYellowFlags,
      technical_risks: feasibilityYellowFlags,
    };
  }
  return {};
}

export function summarizeStageTwoYellowFlags(
  artifacts: StageTwoArtifactLike[],
): StageTwoYellowFlagSummary[] {
  return artifacts
    .filter((artifact) => artifact.artifact_type === "stage_2_document_review")
    .slice()
    .sort(compareArtifactsByCreatedAt)
    .flatMap((artifact) => {
      const yellowFlags = artifact.content_json.yellow_flags;
      if (!Array.isArray(yellowFlags)) {
        return [];
      }
      return yellowFlags
        .map((flag) => {
          if (!isRecord(flag)) {
            return null;
          }
          const description = stringValue(flag.description);
          if (!description) {
            return null;
          }
          return {
            description,
            impactStageKey: stringValue(flag.impact_stage_key) || "stage_2",
          };
        })
        .filter((flag): flag is StageTwoYellowFlagSummary => flag !== null);
    });
}

export function latestStageTwoDocumentArtifact<TArtifact extends StageTwoArtifactLike>(
  artifacts: TArtifact[],
  documentKey: StageTwoDocumentKey,
): TArtifact | null {
  return latestArtifactOfType(artifacts, stageTwoDocumentArtifactTypes[documentKey]);
}

export function latestStageTwoDocumentReview<TArtifact extends StageTwoArtifactLike>(
  artifacts: TArtifact[],
  documentKey: StageTwoDocumentKey,
  sourceArtifactId?: string,
): TArtifact | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === "stage_2_document_review")
      .filter((artifact) => artifact.content_json.document_type === documentKey)
      .filter(
        (artifact) =>
          !sourceArtifactId || artifact.content_json.source_artifact_id === sourceArtifactId,
      )
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null
  );
}

export function latestStageTwoSectionDraft<TArtifact extends StageTwoArtifactLike>(
  artifacts: TArtifact[],
  documentKey: StageTwoDocumentKey,
  sectionKey: StageTwoSectionKey,
): TArtifact | null {
  return latestStageTwoSectionArtifact(
    artifacts,
    "stage_2_section_draft",
    documentKey,
    sectionKey,
  );
}

export function latestStageTwoSectionReview<TArtifact extends StageTwoArtifactLike>(
  artifacts: TArtifact[],
  documentKey: StageTwoDocumentKey,
  sectionKey: StageTwoSectionKey,
  sourceDraftArtifactId?: string,
): TArtifact | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === "stage_2_section_review")
      .filter((artifact) => artifact.content_json.document_type === documentKey)
      .filter((artifact) => artifact.content_json.section_key === sectionKey)
      .filter(
        (artifact) =>
          !sourceDraftArtifactId ||
          artifact.content_json.source_draft_artifact_id === sourceDraftArtifactId,
      )
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null
  );
}

export function latestStageTwoSectionSubmission<TArtifact extends StageTwoArtifactLike>(
  artifacts: TArtifact[],
  documentKey: StageTwoDocumentKey,
  sectionKey: StageTwoSectionKey,
): TArtifact | null {
  return latestStageTwoSectionArtifact(
    artifacts,
    "stage_2_section_submission",
    documentKey,
    sectionKey,
  );
}

function documentState(artifacts: StageTwoArtifactLike[], documentKey: StageTwoDocumentKey) {
  const documentArtifact = latestStageTwoDocumentArtifact(artifacts, documentKey);
  const reviewArtifact = latestStageTwoDocumentReview(artifacts, documentKey, documentArtifact?.id);
  const reviewPassed = reviewArtifact !== null && !hasRedFlags(reviewArtifact);
  if (reviewPassed) {
    return { meta: "已评审", reviewPassed: true, state: "done" as const };
  }
  if (documentArtifact !== null) {
    return { meta: "待评审", reviewPassed: false, state: "active" as const };
  }
  return { meta: "可编辑", reviewPassed: false, state: "ready" as const };
}

function sectionState(
  artifacts: StageTwoArtifactLike[],
  documentKey: StageTwoDocumentKey,
  sectionKey: StageTwoSectionKey,
): StageTwoSectionState {
  const submission = latestStageTwoSectionSubmission(artifacts, documentKey, sectionKey);
  if (submission !== null) {
    return "submitted";
  }
  const draft = latestStageTwoSectionDraft(artifacts, documentKey, sectionKey);
  if (draft === null) {
    return "draft";
  }
  const review = latestStageTwoSectionReview(artifacts, documentKey, sectionKey, draft.id);
  if (review === null) {
    return "needs_review";
  }
  const canSubmit = review.content_json.can_submit === true && !hasRedFlags(review);
  return canSubmit ? "ready_to_submit" : "needs_review";
}

function sectionStateCopy(state: StageTwoSectionState): string {
  const map: Record<StageTwoSectionState, string> = {
    draft: "待学习填写",
    locked: "未解锁",
    needs_review: "待 AI 追问",
    ready_to_submit: "可提交小节",
    submitted: "已提交",
  };
  return map[state];
}

function progressItem(
  key: StageTwoDocumentKey,
  state: StageTwoProgressState,
  meta: string,
): StageTwoProgressItem {
  return {
    key,
    label: stageTwoDocumentLabels[key],
    meta,
    state,
  };
}

function latestStageTwoSectionArtifact<TArtifact extends StageTwoArtifactLike>(
  artifacts: TArtifact[],
  artifactType: string,
  documentKey: StageTwoDocumentKey,
  sectionKey: StageTwoSectionKey,
): TArtifact | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === artifactType)
      .filter((artifact) => artifact.content_json.document_type === documentKey)
      .filter((artifact) => artifact.content_json.section_key === sectionKey)
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null
  );
}

function latestArtifactOfType<TArtifact extends StageTwoArtifactLike>(
  artifacts: TArtifact[],
  artifactType: string,
): TArtifact | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === artifactType)
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null
  );
}

function hasRedFlags(artifact: StageTwoArtifactLike): boolean {
  const redFlags = artifact.content_json.red_flags;
  return Array.isArray(redFlags) && redFlags.length > 0;
}

function compareArtifactsByCreatedAt(left: StageTwoArtifactLike, right: StageTwoArtifactLike) {
  return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringListValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  const text = stringValue(value);
  return text
    ? text
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}
