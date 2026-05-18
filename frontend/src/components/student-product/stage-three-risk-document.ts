import {
  arrayOrString,
  stringValue,
  type ProjectDecisionReadiness,
} from "./stage-three-project-decision.ts";

export type StageThreeRiskArtifactLike = {
  artifact_type: string;
  content_json: Record<string, unknown>;
  created_at: string;
  id: string;
};

export type RiskForecastLevel = "high" | "medium" | "low";

export type RiskForecastItem = {
  category: string;
  evidence: string;
  level: RiskForecastLevel;
  mitigation: string;
};

export type SubmissionGateCheck = {
  description: string;
  key:
    | "decision_saved"
    | "five_layers_ready"
    | "risk_forecast_ready"
    | "ai_review_ready"
    | "stage_four_handoff_ready";
  label: string;
  ready: boolean;
};

export type SubmissionGate = {
  canSubmit: boolean;
  checks: SubmissionGateCheck[];
};

export type DecisionDocumentSection = {
  body: string;
  title: string;
};

export type DecisionDocumentPreviewModel = {
  generatedAt: string | null;
  sections: DecisionDocumentSection[];
  strategyLabel: string;
  title: string;
};

export function createRiskForecastItems({
  decisionArtifact,
  reviewArtifact,
}: {
  decisionArtifact: StageThreeRiskArtifactLike | null;
  reviewArtifact: StageThreeRiskArtifactLike | null;
}): RiskForecastItem[] {
  const decision = decisionArtifact?.content_json;
  const review = reviewArtifact?.content_json;
  const dataRisks = arrayOrString(decision?.data_quality_risks);
  const dataWarnings = arrayOrString(review?.data_quality_warnings);
  const missingKnowledgeRisks = arrayOrString(review?.missing_knowledge_risks);
  const improvements = arrayOrString(review?.suggested_improvements);
  const strategyRationale = stringValue(decision?.strategy_rationale);
  const evaluationPlan = stringValue(decision?.evaluation_plan);
  const stage4BuildPlan = stringValue(decision?.stage_4_build_plan);

  return [
    {
      category: "数据质量",
      evidence: evidenceText(
        [...dataRisks, ...dataWarnings],
        "尚未写明数据质量风险，阶段四容易直接导入脏数据。",
      ),
      level: dataRisks.length + dataWarnings.length >= 2 ? "high" : dataRisks.length > 0 ? "medium" : "low",
      mitigation:
        "阶段四导入知识库前先清洗与版本确认；对缺字段、旧版本和来源不明材料建立人工复核记录。",
    },
    {
      category: "知识覆盖",
      evidence: evidenceText(
        missingKnowledgeRisks,
        "AI 评审暂未指出知识缺口；仍需按测试问题确认覆盖范围。",
      ),
      level: missingKnowledgeRisks.length > 0 ? "medium" : "low",
      mitigation: improvements.at(0) ?? "补充高频问题、异常样例和边界场景，确保知识库覆盖项目核心问法。",
    },
    {
      category: "分块与召回",
      evidence:
        excerptSection(strategyRationale, "分块策略") ||
        excerptSection(strategyRationale, "召回策略") ||
        "尚未形成明确的分块、Top-K、混合召回或重排序依据。",
      level: strategyRationale ? "medium" : "high",
      mitigation: "在 Dify 中先按本决策配置分块和召回，再用标准问题集对比召回片段是否稳定命中。",
    },
    {
      category: "评估闭环",
      evidence: evaluationPlan || "尚未写明 Hit Rate、失败问题分类和复测方式。",
      level: evaluationPlan ? "low" : "medium",
      mitigation: "至少保留召回不到、召回错了、召回对了但答案质量差三类失败记录，并迭代配置。",
    },
    {
      category: "阶段四执行",
      evidence: stage4BuildPlan || "尚未写明 Dify 构建与验证交接动作。",
      level: stage4BuildPlan ? "low" : "medium",
      mitigation: "把知识来源、策略参数、测试集和风险处理动作带入阶段四构建记录，不只提交应用链接。",
    },
  ];
}

export function createStageThreeSubmissionGate({
  decisionArtifact,
  readiness,
  reviewArtifact,
}: {
  decisionArtifact: StageThreeRiskArtifactLike | null;
  readiness: ProjectDecisionReadiness[];
  reviewArtifact: StageThreeRiskArtifactLike | null;
}): SubmissionGate {
  const risks = createRiskForecastItems({ decisionArtifact, reviewArtifact });
  const decision = decisionArtifact?.content_json;
  const hasRiskForecast = risks.some((risk) => risk.category === "数据质量" && risk.evidence.length > 0);
  const hasStageFourHandoff = stringValue(decision?.stage_4_build_plan).length > 0;
  const checks: SubmissionGateCheck[] = [
    {
      description: "已有正式 stage_3_knowledge_decision Artifact。",
      key: "decision_saved",
      label: "保存知识工程决策",
      ready: decisionArtifact !== null,
    },
    {
      description: "数据、分块、向量、召回、评估五层均具备最小决策依据。",
      key: "five_layers_ready",
      label: "五层决策完整",
      ready: readiness.length > 0 && readiness.every((item) => item.ready),
    },
    {
      description: "已把数据、知识覆盖、召回、评估和阶段四执行风险列入预判。",
      key: "risk_forecast_ready",
      label: "风险预判完整",
      ready: decisionArtifact !== null && hasRiskForecast,
    },
    {
      description: "已有 AI 评审 Artifact，供提交前复核。",
      key: "ai_review_ready",
      label: "AI 评审已生成",
      ready: reviewArtifact !== null,
    },
    {
      description: "阶段四 Dify 构建动作和验证计划已写入文档。",
      key: "stage_four_handoff_ready",
      label: "阶段四交接明确",
      ready: hasStageFourHandoff,
    },
  ];

  return {
    canSubmit: checks.every((check) => check.ready),
    checks,
  };
}

export function createDecisionDocumentPreview({
  decisionArtifact,
  reviewArtifact,
}: {
  decisionArtifact: StageThreeRiskArtifactLike | null;
  reviewArtifact: StageThreeRiskArtifactLike | null;
}): DecisionDocumentPreviewModel {
  const decision = decisionArtifact?.content_json;
  const review = reviewArtifact?.content_json;
  const risks = createRiskForecastItems({ decisionArtifact, reviewArtifact });
  const sections: DecisionDocumentSection[] = [
    section("知识目标", stringValue(decision?.knowledge_goal)),
    section(
      "知识来源与类型",
      listBlock([
        ...arrayOrString(decision?.source_inventory).map((item) => `来源：${item}`),
        ...arrayOrString(decision?.required_knowledge_types).map((item) => `类型：${item}`),
      ]),
    ),
    section("策略与参数依据", stringValue(decision?.strategy_rationale)),
    section(
      "风险预判",
      listBlock(risks.map((risk) => `${risk.category}（${riskLevelLabel(risk.level)}）：${risk.evidence}；应对：${risk.mitigation}`)),
    ),
    section(
      "评估与维护",
      compactParagraphs([stringValue(decision?.evaluation_plan), stringValue(decision?.maintenance_plan)]),
    ),
    section("阶段四交接", stringValue(decision?.stage_4_build_plan)),
    section(
      "AI 评审结论",
      compactParagraphs([
        stringValue(review?.review_summary),
        strategyFitCopy(stringValue(review?.strategy_fit)),
        stageFourReadinessCopy(stringValue(review?.stage_4_readiness)),
      ]),
    ),
  ].filter((item) => item.body.length > 0);

  return {
    generatedAt: decisionArtifact?.created_at ?? null,
    sections,
    strategyLabel: knowledgeStrategyCopy(stringValue(decision?.selected_strategy)),
    title: "知识工程决策文档",
  };
}

function section(title: string, body: string): DecisionDocumentSection {
  return {
    body: body.trim(),
    title,
  };
}

function evidenceText(items: string[], fallback: string): string {
  return items.length > 0 ? items.join("；") : fallback;
}

function listBlock(items: string[]): string {
  return items.filter(Boolean).join("\n");
}

function compactParagraphs(items: string[]): string {
  return items.filter((item) => item.trim().length > 0).join("\n\n");
}

function excerptSection(value: string, title: string): string {
  if (!value) {
    return "";
  }
  const pattern = new RegExp(`【${title}】\\s*([\\s\\S]*?)(?=\\n\\n【|$)`);
  const match = value.match(pattern);
  return match?.[1]?.trim() ?? "";
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

function riskLevelLabel(level: RiskForecastLevel): string {
  const map: Record<RiskForecastLevel, string> = {
    high: "高",
    low: "低",
    medium: "中",
  };
  return map[level];
}

function strategyFitCopy(value: string): string {
  if (value.endsWith("_strategy_needs_stage_four_validation")) {
    return "策略方向可用，需在阶段四验证实际效果";
  }
  return value;
}

function stageFourReadinessCopy(value: string): string {
  const map: Record<string, string> = {
    ready_for_stage_4_build: "可进入阶段四构建",
    ready_with_data_quality_risks: "可进入阶段四，但需持续处理数据质量风险",
  };
  return map[value] ?? value;
}
