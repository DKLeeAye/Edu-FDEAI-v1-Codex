export type StageThreeMode =
  | "source"
  | "quality"
  | "decision"
  | "review";

export type StageThreeVNextStep = StageThreeMode;

type StageThreeLegacyMode =
  | "case_teaching"
  | "knowledge_lab"
  | "project_decision"
  | "decision_document";

export type StageThreeSourceDecisionKey = "sop" | "mesExport" | "paperPhoto" | "wechatScreenshot";
export type StageThreeSourceDecisionValue = "direct" | "clean" | "manual" | "exclude" | "";
export type StageThreeSourceSelectionState = Record<
  StageThreeSourceDecisionKey,
  StageThreeSourceDecisionValue
>;

export type StageThreeQualitySampleKey =
  | "auditChecklist"
  | "mesExport"
  | "paperScan"
  | "personalMemo";
export type StageThreeQualityDecisionValue = "pass" | "clean" | "manual" | "block" | "";
export type StageThreeQualitySelectionState = Record<
  StageThreeQualitySampleKey,
  StageThreeQualityDecisionValue
>;

export type StageThreeSourceChecks = {
  dataTypes: boolean;
  mesRisk: boolean;
  paperStructuring: boolean;
  sourceHandling: boolean;
};

export type StageThreeQualityChecks = {
  cleanVsEvidence: boolean;
  fieldCompleteness: boolean;
  noAutoFill: boolean;
  sourceCredibility: boolean;
};

export type StageThreeSourceSnapshot = {
  checks: StageThreeSourceChecks;
  selections: StageThreeSourceSelectionState;
};

export type StageThreeQualitySnapshot = {
  checks: StageThreeQualityChecks;
  selections: StageThreeQualitySelectionState;
  viewedSampleKeys: StageThreeQualitySampleKey[];
};

export type StageThreeRiskBoundarySnapshot = {
  boundaryFields: Record<StageThreeRiskBoundaryTemplateField["key"], string>;
  boundarySaved: boolean;
  checkState: Record<string, boolean>;
  selectedChoices: Record<StageThreeRiskBoundaryCaseKey, StageThreeRiskBoundaryChoice | "">;
};

export type StageThreeArtifactLike = {
  artifact_type: string;
  content_json: Record<string, unknown>;
  created_at: string;
  id: string;
};

export const stageThreeSourceSavedToast = "数据源识别决策已保存，可进入数据质量评估。";
export const stageThreeQualitySavedToast = "数据质量评估已保存，可以进入清洗与预处理。";
export const stageThreeCleaningSavedToast = "清洗策略已保存，可以进入知识结构设计。";
export const stageThreeStructureSavedToast = "知识结构草案已保存，可以进入分块策略。";
export const stageThreeChunkingSavedToast = "分块策略记录已保存，可以进入向量化与存储。";
export const stageThreeVectorSavedToast = "向量化与存储设计已保存，可以进入召回策略。";

export type StageThreeEntryState = "locked" | "ready" | "active" | "done";

export type StageThreeEntryItem = {
  description: string;
  evidenceLabel: string;
  key: StageThreeLegacyMode;
  label: string;
  meta: string;
  state: StageThreeEntryState;
};

export type StageThreeVNextProgressState = "locked" | "ready" | "active" | "done";

export type StageThreeVNextProgressItem = {
  key: StageThreeVNextStep;
  label: string;
  meta: string;
  state: StageThreeVNextProgressState;
};

export type StageThreeSourceDecisionItem = {
  description: string;
  expected: Exclude<StageThreeSourceDecisionValue, "">;
  feedback: string;
  key: StageThreeSourceDecisionKey;
  label: string;
  title: string;
};

export type StageThreeQualitySample = {
  description: string;
  expected: Exclude<StageThreeQualityDecisionValue, "">;
  explanation: string;
  key: StageThreeQualitySampleKey;
  rawText: string;
  sourceLabel: string;
  title: string;
};

export type StageThreeQualityDimensionItem = {
  description: string;
  number: string;
  title: string;
};

export type StageThreeQualityPrincipleItem = {
  description: string;
  label: string;
  title: string;
};

export type StageThreeQualityMatrixRow = {
  defect: string;
  impact: string;
  judgment: string;
  judgmentTone: "good" | "mid" | "risk";
  sample: string;
  sampleType: string;
};

export type StageThreeQualityImpactItem = {
  description: string;
  label: string;
  title: string;
};

export type StageThreeCleaningPracticeAnswer = "mapping" | "missing" | "ocr" | "exclude";
export type StageThreeCleaningPracticeOptionValue =
  | StageThreeCleaningPracticeAnswer
  | "merge";

export type StageThreeCleaningStrategyItem = {
  description: string;
  number: string;
  title: string;
};

export type StageThreeCleaningPreviewSample = {
  changes: string[];
  clean: Array<[string, string]>;
  key: "mes" | "excel" | "scan";
  label: string;
  raw: string;
};

export type StageThreeCleaningLogRow = {
  action: string;
  evidence: string;
  result: string;
  trace: string;
};

export type StageThreeCleaningPracticeItem = {
  answer: StageThreeCleaningPracticeAnswer;
  description: string;
  options: Array<{ label: string; value: StageThreeCleaningPracticeOptionValue }>;
  sampleLabel: string;
  title: string;
};

export type StageThreeStructurePracticeAnswer = "standard" | "batch" | "case" | "evidence";

export type StageThreeStructureDomainItem = {
  description: string;
  label: string;
  title: string;
};

export type StageThreeStructureMetadataRow = {
  example: string;
  metadata: string;
  purpose: string;
  risk: string;
};

export type StageThreeStructurePracticeItem = {
  answer: StageThreeStructurePracticeAnswer;
  description: string;
  options: Array<{ label: string; value: StageThreeStructurePracticeAnswer }>;
  sampleLabel: string;
  title: string;
};

export type StageThreeStructureChainItem = {
  label: string;
  title: string;
};

export type StageThreeChunkingPracticeAnswer = "clause" | "event" | "closure" | "attachment";
export type StageThreeChunkingPracticeOptionValue =
  | StageThreeChunkingPracticeAnswer
  | "row"
  | "whole";

export type StageThreeChunkingAnatomyItem = {
  description: string;
  label: string;
  title: string;
};

export type StageThreeChunkingStrategyRow = {
  commonMistake: string;
  keep: string;
  role: string;
  sourceType: string;
  unit: string;
};

export type StageThreeChunkingLabDocument = {
  key: "sop" | "mes" | "closure";
  meta: string;
  note: string;
  text: string;
  title: string;
};

export type StageThreeChunkingPracticeItem = {
  answer: StageThreeChunkingPracticeAnswer;
  description: string;
  options: Array<{ label: string; value: StageThreeChunkingPracticeOptionValue }>;
  sampleLabel: string;
  title: string;
};

export type StageThreeVectorPracticeAnswer = "metadata" | "versioned" | "manual";
export type StageThreeVectorPracticeOptionValue =
  | StageThreeVectorPracticeAnswer
  | "plain"
  | "exclude";

export type StageThreeVectorConceptItem = {
  description: string;
  number: string;
  title: string;
};

export type StageThreeVectorQuery = {
  key: "audit" | "defect" | "standard" | "rectify";
  label: string;
  vector: [number, number];
};

export type StageThreeVectorKnowledgePoint = {
  category: StageThreeVectorQuery["key"];
  id: string;
  label: string;
  meta: string;
  ref: string;
  vector: [number, number];
};

export type StageThreeVectorStorageRow = {
  example: string;
  field: string;
  purpose: string;
};

export type StageThreeVectorPracticeItem = {
  answer: StageThreeVectorPracticeAnswer;
  description: string;
  options: Array<{ label: string; value: StageThreeVectorPracticeOptionValue }>;
  sampleLabel: string;
  title: string;
};

export type StageThreeRetrievalMode = "hybrid" | "vector" | "keyword";
export type StageThreeRetrievalQueryKey = "audit" | "scratch" | "standard" | "rectify";
export type StageThreeRetrievalFilter = "all" | "batch" | "process" | "standard" | "rectify";
export type StageThreeRetrievalPracticeAnswer = StageThreeRetrievalMode;

export type StageThreeRetrievalConceptItem = {
  description: string;
  number: string;
  title: string;
};

export type StageThreeRetrievalQuery = {
  insight: string;
  key: StageThreeRetrievalQueryKey;
  keywords: string[];
  label: string;
};

export type StageThreeRetrievalDocument = {
  id: string;
  keywords: string[];
  meta: {
    batch: string;
    defect: string;
    kind: "audit" | "defect" | "rectify" | "standard";
    process: string;
    standard: string;
  };
  source: string;
  text: string;
  title: string;
  type: "audit" | "excel" | "mes" | "rectify" | "standard";
  vector: Record<StageThreeRetrievalQueryKey, number>;
};

export type StageThreeRetrievalScoreFactor = {
  description: string;
  label: string;
  title: string;
};

export type StageThreeRetrievalPracticeItem = {
  answer: StageThreeRetrievalPracticeAnswer;
  description: string;
  options: Array<{ label: string; value: StageThreeRetrievalMode }>;
  sampleLabel: string;
  title: string;
};

export type StageThreeAnswerPolicy = "strict" | "balanced" | "loose";
export type StageThreeAnswerCitationGrain = "chunk" | "field" | "source";
export type StageThreeAnswerCaseKey = "audit" | "scratch" | "standard" | "missing";
export type StageThreeAnswerPracticeAnswer = "pass" | "revise" | "reject";

export type StageThreeAnswerPrinciple = {
  description: string;
  number: string;
  title: string;
};

export type StageThreeAnswerEvidence = {
  field: string;
  id: string;
  source: string;
  supports: string;
  title: string;
};

export type StageThreeAnswerCase = {
  answer: Record<StageThreeAnswerPolicy, string>;
  evidence: StageThreeAnswerEvidence[];
  key: StageThreeAnswerCaseKey;
  question: string;
  warning: Record<StageThreeAnswerPolicy, string>;
};

export type StageThreeAnswerQualityFactor = {
  description: string;
  label: string;
  title: string;
};

export type StageThreeAnswerPracticeItem = {
  answer: StageThreeAnswerPracticeAnswer;
  description: string;
  options: Array<{ label: string; value: StageThreeAnswerPracticeAnswer }>;
  sampleLabel: string;
  title: string;
};

export type StageThreeRecallCaseKey = "batch" | "missing" | "conflict" | "boundary";
export type StageThreeRecallPracticeAnswer =
  | "answer"
  | "boundary"
  | "chunking"
  | "quality"
  | "retrieval"
  | "structure"
  | "vector";

export type StageThreeRecallPrinciple = {
  description: string;
  number: string;
  title: string;
};

export type StageThreeRecallResult = {
  id: string;
  meta: string;
  score: number;
  source: string;
  target: boolean;
  title: string;
};

export type StageThreeRecallCase = {
  expected: string[];
  goal: string;
  key: StageThreeRecallCaseKey;
  question: string;
  results: StageThreeRecallResult[];
  type: string;
};

export type StageThreeRecallMatrixItem = {
  fallback: string;
  label: string;
  title: string;
  description: string;
};

export type StageThreeRecallPracticeItem = {
  answer: StageThreeRecallPracticeAnswer;
  description: string;
  options: Array<{ label: string; value: StageThreeRecallPracticeAnswer }>;
  sampleLabel: string;
  title: string;
};

export type StageThreeRiskBoundaryChoice = "answer" | "insufficient" | "manual" | "refuse";
export type StageThreeRiskBoundaryCaseKey = "supported" | "missing" | "conflict" | "authority";

export type StageThreeRiskBoundaryPrinciple = {
  description: string;
  number: string;
  title: string;
};

export type StageThreeRiskBoundaryCase = {
  answer: StageThreeRiskBoundaryChoice;
  context: string;
  evidence: string[];
  fail: string;
  key: StageThreeRiskBoundaryCaseKey;
  pass: string;
  question: string;
  type: string;
};

export type StageThreeRiskBoundaryMatrixRow = {
  action: string;
  implementation: string;
  riskType: string;
  signal: string;
};

export type StageThreeRiskBoundaryTemplateField = {
  key: "scope" | "evidence" | "manual" | "refusal";
  title: string;
  value: string;
};

export type StageThreeRiskBoundaryRecordInput = {
  boundaryFields: Record<StageThreeRiskBoundaryTemplateField["key"], string>;
  checks: Record<string, boolean>;
  selectedChoices: Record<StageThreeRiskBoundaryCaseKey, StageThreeRiskBoundaryChoice | "">;
};

export type StageThreeLabRecordPayloadLike = {
  observations: Array<{
    knowledge_point: string;
    layer: string;
    observation: string;
  }>;
  selected_parameters: Record<string, unknown>;
};

const stageThreeCaseRecordType = "stage_3_case_study_record";
const stageThreeLabRecordType = "stage_3_lab_experiment_record";
const stageThreeDecisionType = "stage_3_knowledge_decision";
const stageThreeReviewType = "stage_3_ai_review";

export const stageThreeSourceDecisionItems: StageThreeSourceDecisionItem[] = [
  {
    description: "包含检验项目、合格标准、不合格品处理步骤，版本号和生效日期清楚。",
    expected: "direct",
    feedback: "稳定制度类资料可以作为知识库基础，但仍需保留版本号和来源。",
    key: "sop",
    label: "资料 01",
    title: "质检 SOP v3.2",
  },
  {
    description: "有批次号、检验时间和检验结果，但异常原因和复检结论缺失较多。",
    expected: "clean",
    feedback: "动态记录需要字段统一、缺失标记和来源保留后再进入知识流程。",
    key: "mesExport",
    label: "资料 02",
    title: "MES 质检导出 CSV",
  },
  {
    description: "包含一线签字和处置备注，但照片清晰度不一，字段没有标准化。",
    expected: "manual",
    feedback: "纸质或图片材料应先结构化，并标记低置信字段需要人工复核。",
    key: "paperPhoto",
    label: "资料 03",
    title: "纸质质检单照片",
  },
  {
    description: "包含零散讨论和个人判断，没有来源版本、字段结构和正式确认记录。",
    expected: "exclude",
    feedback: "非正式截图缺少可信来源和结构，不应作为知识库依据。",
    key: "wechatScreenshot",
    label: "资料 04",
    title: "微信群临时沟通截图",
  },
];

export const stageThreeQualitySamples: StageThreeQualitySample[] = [
  {
    description: "查看清单原文后，判断它是否适合进入 RAG 知识库。",
    expected: "pass",
    explanation: "来源、版本和条目编号清楚，可作为高质量候选进入后续结构设计。",
    key: "auditChecklist",
    rawText:
      "文件名：客户审厂检查清单_2026Q2.xlsx\n条目编号：Q2-TR-018\n条目名称：产品批次异常追溯材料\n证据要求：批次号、工序、缺陷类型、首检记录、复检结论、整改责任人\n维护部门：质量体系办公室\n版本：2026-Q2",
    sourceLabel: "样本 A · 审厂材料",
    title: "客户审厂检查清单 2026-Q2",
  },
  {
    description: "查看导出记录原始内容后，判断它需要怎样处理。",
    expected: "clean",
    explanation: "可进入知识流程，但必须先处理缺失字段和口径不统一问题。",
    key: "mesExport",
    rawText:
      "来源：MES 系统导出\n时间范围：2026-03 至 2026-05\n字段：批次号、工序、检验时间、结果、缺陷类型\n问题：异常原因字段缺失 38%，复检结论存在空值。",
    sourceLabel: "样本 B · MES 导出",
    title: "三个月 MES 质检导出表",
  },
  {
    description: "查看扫描识别结果后，判断它能否直接作为知识资料。",
    expected: "manual",
    explanation: "图片和扫描件需要 OCR、字段抽取和人工复核后才能进入。",
    key: "paperScan",
    rawText:
      "返工处置纸质单扫描件：签字区域部分遮挡，手写处置原因识别置信度低，缺少标准字段名，需要人工复核。",
    sourceLabel: "样本 C · 纸质扫描",
    title: "返工处置纸质单扫描件",
  },
  {
    description: "查看备忘录原文后，判断它是否适合作为 RAG 引用依据。",
    expected: "block",
    explanation: "个人经验没有正式来源和证据编号，不能作为审厂引用知识。",
    key: "personalMemo",
    rawText:
      "文件名：色差问题经验.txt\n来源：质量主管个人桌面文档\n内容：个人经验总结，未标记批次、客户、审批人和生效时间。",
    sourceLabel: "样本 D · 个人备忘",
    title: "质量主管个人备忘录",
  },
];

export const stageThreeQualityDimensionItems: StageThreeQualityDimensionItem[] = [
  {
    description: "批次号、工序、缺陷类型、检验时间、责任岗位是否稳定存在。",
    number: "01",
    title: "字段完整性",
  },
  {
    description: "能否确认资料版本、生效日期、维护人、审核来源和变更记录。",
    number: "02",
    title: "来源可信度",
  },
  {
    description: "同一字段是否使用统一命名，跨系统记录是否存在冲突。",
    number: "03",
    title: "口径一致性",
  },
  {
    description: "是否能从问题定位到批次、工序、异常处置和复检结果。",
    number: "04",
    title: "追溯能力",
  },
  {
    description: "回答能否明确引用 SOP 条款、记录编号、审厂清单或整改证据。",
    number: "05",
    title: "引用可用性",
  },
];

export const stageThreeQualityPrinciples: StageThreeQualityPrincipleItem[] = [
  {
    description: "资料必须能回到批次、工序、标准条款或原始质检记录，否则不能支撑可信回答。",
    label: "不是看文件多不多",
    title: "看能否被检索和引用",
  },
  {
    description: "批次号、缺陷类型、复检结论缺失时，系统只能提示不足，不能自动推断。",
    label: "不让 AI 补事实",
    title: "缺失字段必须显式标记",
  },
  {
    description: "字段不统一进入清洗，来源不明需补证，无法引用的资料暂不纳入知识库。",
    label: "先评估再清洗",
    title: "质量问题决定处理策略",
  },
];

export const stageThreeQualityMatrixRows: StageThreeQualityMatrixRow[] = [
  {
    defect: "版本清楚，字段稳定",
    impact: "适合用于标准条款引用",
    judgment: "高质量",
    judgmentTone: "good",
    sample: "质检 SOP v3.2",
    sampleType: "制度知识",
  },
  {
    defect: "异常原因和复检结论缺失",
    impact: "可检索批次，但回答必须提示缺口",
    judgment: "需清洗",
    judgmentTone: "mid",
    sample: "MES 质检导出",
    sampleType: "动态记录",
  },
  {
    defect: "表头不统一，责任字段混乱",
    impact: "召回可能混淆同义字段",
    judgment: "需标准化",
    judgmentTone: "mid",
    sample: "Excel 异常台账",
    sampleType: "人工台账",
  },
  {
    defect: "图片模糊，字段不可直接读取",
    impact: "不能直接入库，需 OCR 与人工复核",
    judgment: "低质量",
    judgmentTone: "risk",
    sample: "纸质质检单照片",
    sampleType: "原始材料",
  },
];

export const stageThreeQualityImpactItems: StageThreeQualityImpactItem[] = [
  {
    description: "学生问“B-240315 批次为什么被退回”时，系统找不到对应检验记录。",
    label: "缺批次号",
    title: "无法定位记录",
  },
  {
    description: "“缺陷类别 / 异常类型 / 不良原因”被当成不同字段，答案证据不完整。",
    label: "字段命名不一致",
    title: "召回结果混乱",
  },
  {
    description: "回答引用了过期 SOP 或未审核台账，无法用于审厂材料准备。",
    label: "来源版本不清",
    title: "引用不可信",
  },
  {
    description: "缺陷图片没有工序和批次信息，智能体无法说明图片属于哪个处置流程。",
    label: "图片缺少标注",
    title: "只能描述不能追溯",
  },
];

export const stageThreeCleaningStrategyItems: StageThreeCleaningStrategyItem[] = [
  {
    description: "把“批号 / 批次 / Lot No.”统一到“批次号”，避免召回时把同义字段拆散。",
    number: "01",
    title: "字段统一",
  },
  {
    description: "缺异常原因、复检结论、责任岗位时写入“待确认”，并保留缺失原因。",
    number: "02",
    title: "缺失标记",
  },
  {
    description: "同一批次多份重复台账要合并，但必须保留来源文件和更新时间。",
    number: "03",
    title: "去重合并",
  },
  {
    description: "纸质单、扫描件、照片先做 OCR 或人工录入，再拆为字段化记录。",
    number: "04",
    title: "结构化转换",
  },
  {
    description: "OCR 置信度低、签字被遮挡、手写内容模糊时必须进入人工确认。",
    number: "05",
    title: "人工复核",
  },
];

export const stageThreeCleaningPreviewSamples: StageThreeCleaningPreviewSample[] = [
  {
    changes: [
      "保留批次号和工序字段，作为后续检索主键。",
      "将空白异常原因显式标记为“缺失”，不允许系统补编。",
      "记录来源文件，保证后续回答可回溯。",
    ],
    clean: [
      ["批次号", "B-240315 / B-240522"],
      ["工序", "喷涂"],
      ["缺陷类型", "色差；划伤"],
      ["缺失标记", "异常原因缺失，需质量工程师补充"],
      ["来源", "MES_QA_export_202603-202605.csv"],
    ],
    key: "mes",
    label: "MES 导出",
    raw:
      "batch_id,process,result,defect_type,reason,recheck\nB-240315,喷涂,NG,色差,,pass\nB-240522,喷涂,NG,划伤,,待复检",
  },
  {
    changes: [
      "建立字段映射表，统一批次、工序、缺陷类型等核心字段。",
      "合并同义表头，避免后续召回时把同一字段拆散。",
      "保留原始表头与映射关系，便于教师和企业客户复核。",
    ],
    clean: [
      ["批次号", "B-240315 / B-240419"],
      ["工序", "喷涂；装配"],
      ["缺陷类型", "色差；间隙超差"],
      ["字段映射", "批号 / Lot No. → 批次号；工段 → 工序"],
      ["来源", "Excel 异常台账_质量部_2026Q2.xlsx"],
    ],
    key: "excel",
    label: "Excel 台账",
    raw:
      "批号,工段,异常类别,责任人\nB-240315,喷涂,色差,赵强\nLot No.,工序,不良原因,负责人\nB-240419,装配,间隙超差,陈敏",
  },
  {
    changes: [
      "OCR 结果不直接作为事实，关键字段必须人工复核。",
      "将容易混淆的 O / 0、I / 1 标为复核项。",
      "保留原图、OCR 文本和复核记录三类证据。",
    ],
    clean: [
      ["批次号", "B-240519（人工复核后修正）"],
      ["工序", "喷涂"],
      ["异常描述", "色差偏大，返工后复检合格"],
      ["复核标记", "处置人字段不完整，需现场确认"],
      ["来源", "原始扫描件 + OCR 结果 + 人工复核记录"],
    ],
    key: "scan",
    label: "纸质扫描",
    raw:
      "图片文件：rework_sheet_20260512_03.jpg\nOCR：批次 B-24O5I9；工序 喷涂；处置人 王□；日期 2026/05/12\n备注：图片倾斜，红色印章覆盖部分字段。",
  },
];

export const stageThreeCleaningLogRows: StageThreeCleaningLogRow[] = [
  {
    action: "字段映射",
    evidence: "Excel 异常台账",
    result: "批号、批次、Lot 统一为批次号",
    trace: "字段映射表 v1",
  },
  {
    action: "缺失标记",
    evidence: "MES 质检导出",
    result: "异常原因、复检结论标记为待确认",
    trace: "缺失字段清单",
  },
  {
    action: "OCR + 复核",
    evidence: "返工纸质单扫描",
    result: "拆成批次、工序、异常描述、处置人",
    trace: "原图 + 复核人记录",
  },
  {
    action: "排除引用",
    evidence: "个人备忘录",
    result: "仅作为访谈线索，不进入引用知识",
    trace: "排除原因说明",
  },
];

export const stageThreeCleaningPracticeItems: StageThreeCleaningPracticeItem[] = [
  {
    answer: "mapping",
    description: "如果不处理，后续分块与召回会把同一业务字段拆成不同含义。",
    options: [
      { label: "建立字段映射表，统一命名", value: "mapping" },
      { label: "先做 OCR，再人工复核", value: "ocr" },
      { label: "直接排除，不保留线索", value: "exclude" },
      { label: "只做去重合并", value: "merge" },
    ],
    sampleLabel: "样本 01 · Excel 异常台账",
    title: "同一字段出现“批号 / 批次 / Lot No.”三种写法。",
  },
  {
    answer: "missing",
    description: "这类记录可以进入流程，但回答时不能把缺失字段当成事实。",
    options: [
      { label: "只统一字段名称", value: "mapping" },
      { label: "标记缺失字段，并列入待确认清单", value: "missing" },
      { label: "全部排除，不进入后续流程", value: "exclude" },
      { label: "合并重复批次记录即可", value: "merge" },
    ],
    sampleLabel: "样本 02 · MES 质检导出",
    title: "批次和工序存在，但异常原因与复检结论大量为空。",
  },
  {
    answer: "ocr",
    description: "它有原始证据价值，但不能直接当成结构化知识条目。",
    options: [
      { label: "建立同义字段映射", value: "mapping" },
      { label: "只标记为空值", value: "missing" },
      { label: "OCR 提取字段，并由人工复核关键项", value: "ocr" },
      { label: "直接作为高质量资料入库", value: "exclude" },
    ],
    sampleLabel: "样本 03 · 返工纸质单扫描",
    title: "扫描件包含手写批次与签字，但有阴影和遮挡。",
  },
  {
    answer: "exclude",
    description: "它可作为后续访谈线索，但不能作为审厂回答的引用依据。",
    options: [
      { label: "字段统一后直接进入知识库", value: "mapping" },
      { label: "OCR 后作为引用资料", value: "ocr" },
      { label: "标记缺失后直接引用", value: "missing" },
      { label: "暂不纳入引用知识，只保留为线索", value: "exclude" },
    ],
    sampleLabel: "样本 04 · 个人经验备忘",
    title: "没有日期、审核人、证据编号，只记录“色差通常和温湿度有关”。",
  },
];

export const stageThreeCleaningChecks = [
  "我能区分字段统一、缺失标记、OCR 与排除引用。",
  "我知道清洗不能替原始资料补编事实。",
  "我能说明清洗后的条目如何回到原始来源。",
  "我能把清洗结果交给下一步知识结构设计。",
];

export const stageThreeCleaningRedlines = [
  "不能把 OCR 结果当作百分百正确事实。",
  "不能删除原始文件与来源信息。",
  "不能把个人经验备忘当成正式审厂引用。",
  "不能让 AI 自动补齐关键质检字段。",
];

export const stageThreeStructureDomainItems: StageThreeStructureDomainItem[] = [
  {
    description: "SOP、检验标准、客户审厂条款。",
    label: "域 A",
    title: "制度与标准",
  },
  {
    description: "MES 导出、检验台账、复检结果。",
    label: "域 B",
    title: "批次追溯记录",
  },
  {
    description: "不良原因、处置动作、责任岗位。",
    label: "域 C",
    title: "异常与整改案例",
  },
  {
    description: "图片、扫描件、签字记录、审厂材料。",
    label: "域 D",
    title: "证据与附件",
  },
];

export const stageThreeStructureMetadataRows: StageThreeStructureMetadataRow[] = [
  {
    example: "B-240315、B-240522",
    metadata: "批次号",
    purpose: "定位追溯对象",
    risk: "无法回答按批次追溯的问题",
  },
  {
    example: "来料、喷涂、装配、终检",
    metadata: "工序",
    purpose: "区分问题发生环节",
    risk: "召回结果混入不相关流程",
  },
  {
    example: "色差、划伤、间隙超差",
    metadata: "缺陷类型",
    purpose: "组织异常案例",
    risk: "难以形成同类问题经验",
  },
  {
    example: "SOP-QA-17 第 4.2 条",
    metadata: "标准条款",
    purpose: "连接制度与判断依据",
    risk: "回答缺少制度依据",
  },
  {
    example: "MES_QA_export_2026Q2.csv v3",
    metadata: "来源与版本",
    purpose: "支撑引用和审计",
    risk: "无法说明答案来自哪里",
  },
];

const stageThreeStructurePracticeOptions: Array<{
  label: string;
  value: StageThreeStructurePracticeAnswer;
}> = [
  { label: "制度与标准", value: "standard" },
  { label: "批次追溯记录", value: "batch" },
  { label: "异常与整改案例", value: "case" },
  { label: "证据与附件", value: "evidence" },
];

export const stageThreeStructurePracticeItems: StageThreeStructurePracticeItem[] = [
  {
    answer: "standard",
    description: "包含检验阈值、复检动作和责任岗位，用于回答“依据是什么”。",
    options: stageThreeStructurePracticeOptions,
    sampleLabel: "样本 01 · 检验标准条款",
    title: "SOP-QA-17：喷涂色差判定标准与复检要求。",
  },
  {
    answer: "batch",
    description: "包含批次、工序、检验结果和复检结论，用于回答“这个批次发生了什么”。",
    options: stageThreeStructurePracticeOptions,
    sampleLabel: "样本 02 · MES 批次记录",
    title: "B-240315 批次喷涂工序 NG，缺陷类型为色差，复检结论合格。",
  },
  {
    answer: "case",
    description: "包含原因分析、处置措施、责任岗位和结果确认，用于沉淀异常处理经验。",
    options: stageThreeStructurePracticeOptions,
    sampleLabel: "样本 03 · 整改闭环记录",
    title: "色差异常由喷涂线温湿度波动引起，已调整参数并完成复验。",
  },
  {
    answer: "evidence",
    description: "它不是主要解释文本，但可作为审厂追溯回答的原始证据附件。",
    options: stageThreeStructurePracticeOptions,
    sampleLabel: "样本 04 · 复检签字扫描件",
    title: "返工纸质单扫描件，包含班组长签字、复检日期和红色审查章。",
  },
];

export const stageThreeStructureChainItems: StageThreeStructureChainItem[] = [
  { label: "问题", title: "B-240315 色差是否完成闭环？" },
  { label: "批次记录", title: "喷涂工序 NG，复检合格" },
  { label: "标准条款", title: "SOP-QA-17 色差复检要求" },
  { label: "整改案例", title: "温湿度参数调整 + 复验" },
  { label: "证据附件", title: "复检签字扫描件" },
];

export const stageThreeStructureChecks = [
  "我能区分制度、批次、案例和证据附件四类知识域。",
  "我能说明每条知识至少需要哪些元数据。",
  "我知道审厂回答通常需要跨知识域引用。",
  "我能把结构设计结果交给下一步分块策略。",
];

export const stageThreeStructureRedlines = [
  "不能把制度标准和批次记录混成同一类文本。",
  "不能删除来源文件、版本和责任记录。",
  "不能让图片证据脱离对应批次与工序。",
  "不能先切分再回头猜测知识关系。",
];

export const stageThreeChunkingAnatomyItems: StageThreeChunkingAnatomyItem[] = [
  {
    description: "保留能独立表达一个判断或事件的正文，不让一句话脱离主题。",
    label: "正文片段",
    title: "喷涂工序色差复检要求",
  },
  {
    description: "帮助模型理解该片段属于哪个制度章节或业务场景。",
    label: "标题路径",
    title: "SOP-QA-17 / 4.2 / 复检流程",
  },
  {
    description: "支持按批次、工序、缺陷过滤召回，减少无关文本混入。",
    label: "业务元数据",
    title: "批次号、工序、缺陷类型、标准条款",
  },
  {
    description: "让最终回答可以给出可追溯引用，而不是只给结论。",
    label: "来源证据",
    title: "文件名、版本、页码、更新时间",
  },
];

export const stageThreeChunkingStrategyRows: StageThreeChunkingStrategyRow[] = [
  {
    commonMistake: "把条款和适用条件拆开，导致答案缺依据",
    keep: "标题路径、条款编号、适用工序、版本",
    role: "制度依据",
    sourceType: "SOP / 检验标准",
    unit: "按章节、条款、检验步骤切分",
  },
  {
    commonMistake: "机械按行切分，无法回答完整批次链路",
    keep: "批次号、工序、检验结果、复检状态",
    role: "追溯事实",
    sourceType: "MES 批次记录",
    unit: "按批次 + 工序 + 缺陷事件聚合",
  },
  {
    commonMistake: "只切出措施，丢失原因和验证结论",
    keep: "异常原因、处置动作、责任岗位、确认结果",
    role: "闭环经验",
    sourceType: "整改报告",
    unit: "按问题、原因、措施、验证结果形成闭环块",
  },
  {
    commonMistake: "只存图片文件名，回答时无法说明证据含义",
    keep: "图片说明、批次、工序、附件路径、签字信息",
    role: "原始证据",
    sourceType: "图片 / 扫描件",
    unit: "不单独作为正文块，绑定到对应记录",
  },
];

export const stageThreeChunkingLabDocuments: StageThreeChunkingLabDocument[] = [
  {
    key: "sop",
    meta: "SOP-QA-17 / 喷涂 / 色差 / 复检",
    note: "适合观察结构分块如何保留标题路径、条款编号和审厂证据要求。",
    text:
      "SOP-QA-17 喷涂色差复检条款\n4.2 色差 NG 记录要求：当喷涂工序出现色差 NG 时，质检员必须记录批次号、色差等级、检测光源、责任线体和首检时间。\n4.3 复检流程：工艺工程师调整喷涂参数后，质检员应在同一批次内抽取 5 件样品复检，并记录复检结果。\n4.4 审厂证据：涉及客户审厂的批次，必须附原始检验记录、复检记录、参数调整说明和质量工程师确认签名。",
    title: "SOP-QA-17 喷涂色差复检条款",
  },
  {
    key: "mes",
    meta: "MES / B-240315 / 喷涂 / 色差 NG",
    note: "适合观察批次事件聚合如何把多行系统记录合成可追溯知识块。",
    text:
      "MES 批次追溯导出：B-240315\n08:42 喷涂线 L2 完成首检，检验结果：色差 NG，检验人：赵敏，缺陷等级：B。\n09:05 工艺工程师调整喷涂温度与输送速度，调整单号：PRC-240315-02。\n09:46 复检抽样 5 件，其中 5 件合格，复检结论：允许放行，确认人：质量工程师王磊。",
    title: "MES B-240315 批次异常追溯记录",
  },
  {
    key: "closure",
    meta: "整改报告 / CAR-2024-031 / 色差 / 审厂证据",
    note: "适合观察问题闭环分块如何保留原因、措施和验证结论。",
    text:
      "CAR-2024-031 色差异常整改报告\n问题描述：B-240315 批次喷涂件在客户审厂抽查中发现色差记录与复检记录分散。\n原因分析：MES 记录中缺少附件状态字段，Excel 台账使用“批号”和“批次”两种字段命名。\n永久措施：统一批次字段命名，新增附件状态字段，要求复检扫描件在当班完成绑定。\n验证结论：连续 3 个批次完成资料包抽查，均可在 2 分钟内定位原始记录、复检记录和签字证据。",
    title: "CAR-2024-031 色差异常整改报告",
  },
];

export const stageThreeChunkingPracticeItems: StageThreeChunkingPracticeItem[] = [
  {
    answer: "clause",
    description: "后续问题通常会问“依据是什么”和“复检应该怎么做”。",
    options: [
      { label: "按条款与步骤切分，保留标题路径", value: "clause" },
      { label: "按每一行记录切分", value: "row" },
      { label: "只作为附件绑定到记录", value: "attachment" },
      { label: "整份文档作为一个块", value: "whole" },
    ],
    sampleLabel: "样本 01 · SOP 条款",
    title: "喷涂色差判定标准包含适用条件、检测方法和复检要求。",
  },
  {
    answer: "event",
    description: "学生要保证后续能回答“这个批次的问题是否闭环”。",
    options: [
      { label: "按制度条款切分", value: "clause" },
      { label: "按批次 + 工序 + 缺陷事件聚合", value: "event" },
      { label: "只保留图片附件", value: "attachment" },
      { label: "整份 CSV 作为一个块", value: "whole" },
    ],
    sampleLabel: "样本 02 · MES 批次导出",
    title: "B-240315 批次从喷涂 NG 到复检合格包含 4 条系统记录。",
  },
  {
    answer: "closure",
    description: "后续问题会问“原因是什么、如何处理、是否验证完成”。",
    options: [
      { label: "按段落随机切分", value: "row" },
      { label: "只按批次号聚合", value: "event" },
      { label: "按问题闭环切分，保留原因-措施-验证", value: "closure" },
      { label: "只保留签字页", value: "attachment" },
    ],
    sampleLabel: "样本 03 · 整改报告",
    title: "色差异常报告包含原因、临时措施、永久措施和复验结论。",
  },
  {
    answer: "attachment",
    description: "它的主要价值是作为审厂引用证据，而不是独立回答问题。",
    options: [
      { label: "按条款与步骤切分", value: "clause" },
      { label: "按批次事件聚合为正文块", value: "event" },
      { label: "绑定到对应批次记录，作为证据附件", value: "attachment" },
      { label: "不记录来源，单独存文件名", value: "whole" },
    ],
    sampleLabel: "样本 04 · 复检签字扫描件",
    title: "扫描件记录班组长签字和复检日期，但正文信息很少。",
  },
];

export const stageThreeChunkingChecks = [
  "我能区分按条款、按事件、按闭环和按附件绑定的分块边界。",
  "我知道每个块必须携带标题路径、业务元数据和来源信息。",
  "我能说明切得过碎和切得过大会分别造成什么问题。",
  "我能把分块策略交给下一步向量化与存储。",
];

export const stageThreeChunkingRedlines = [
  "不能把整份 SOP 或整张台账直接作为一个知识块。",
  "不能让块脱离批次号、工序、缺陷类型和来源版本。",
  "不能把图片证据当作无上下文的独立文本。",
  "不能为了字数平均而切断原因、措施和验证结果。",
];

export const stageThreeVectorConceptItems: StageThreeVectorConceptItem[] = [
  {
    description: "把文本 chunk 转成高维向量。这里用二维图示简化展示“语义距离”。",
    number: "01",
    title: "Embedding",
  },
  {
    description: "查询也会被向量化，系统按距离或相似度找出最接近的知识块。",
    number: "02",
    title: "相似度",
  },
  {
    description: "批次号、工序、缺陷类型、来源版本用于过滤范围和保证引用可信。",
    number: "03",
    title: "元数据",
  },
];

export const stageThreeVectorQueries: StageThreeVectorQuery[] = [
  { key: "audit", label: "审厂前怎么快速找到某批次的质检证据？", vector: [0.22, 0.70] },
  { key: "defect", label: "同一种划伤缺陷近期在哪些工序重复出现？", vector: [0.74, 0.66] },
  { key: "standard", label: "AQL 抽检标准中关键外观缺陷如何判定？", vector: [0.30, 0.20] },
  { key: "rectify", label: "客户投诉后的整改闭环材料在哪里？", vector: [0.64, 0.26] },
];

export const stageThreeVectorKnowledgePoints: StageThreeVectorKnowledgePoint[] = [
  {
    category: "audit",
    id: "v1",
    label: "B-2026-0412 终检异常",
    meta: "批次 B-2026-0412 · 终检 · 划伤",
    ref: "MES 终检记录",
    vector: [0.18, 0.76],
  },
  {
    category: "audit",
    id: "v2",
    label: "审厂追溯资料清单",
    meta: "客户 A · 审厂 · 追溯材料",
    ref: "审厂准备表",
    vector: [0.26, 0.66],
  },
  {
    category: "defect",
    id: "v3",
    label: "外观划伤重复发生",
    meta: "缺陷：外观划伤 · 工序：终检",
    ref: "Excel 缺陷台账",
    vector: [0.72, 0.72],
  },
  {
    category: "defect",
    id: "v4",
    label: "注塑毛边异常趋势",
    meta: "缺陷：毛边 · 工序：注塑",
    ref: "质量周报",
    vector: [0.82, 0.58],
  },
  {
    category: "standard",
    id: "v5",
    label: "AQL 抽样检验标准",
    meta: "标准：AQL · 版本 2026.1",
    ref: "SOP-QC-014",
    vector: [0.24, 0.24],
  },
  {
    category: "standard",
    id: "v6",
    label: "关键外观缺陷判定",
    meta: "标准条款 4.2 · 外观缺陷",
    ref: "外观检验规范",
    vector: [0.38, 0.18],
  },
  {
    category: "rectify",
    id: "v7",
    label: "客户投诉整改报告",
    meta: "客户投诉 · 8D · 整改闭环",
    ref: "CAR-2026-03",
    vector: [0.70, 0.22],
  },
  {
    category: "rectify",
    id: "v8",
    label: "临时隔离与复检记录",
    meta: "隔离区 · 复检 · 责任人确认",
    ref: "复检台账",
    vector: [0.58, 0.34],
  },
];

export const stageThreeVectorStorageRows: StageThreeVectorStorageRow[] = [
  {
    example: "“B-2026-0412 批次终检发现外观划伤 3 件...”",
    field: "chunk_text",
    purpose: "供模型生成回答和引用原文。",
  },
  {
    example: "[0.18, 0.74, ...]",
    field: "embedding",
    purpose: "用于计算查询与知识块的语义相似度。",
  },
  {
    example: "批次号、工序、缺陷类型、来源版本、责任人",
    field: "metadata",
    purpose: "用于过滤、权限隔离、版本控制和审计追溯。",
  },
  {
    example: "MES-终检记录-2026-04-12 / 附件 P03",
    field: "source_ref",
    purpose: "让回答能回到真实证据，不变成“无来源结论”。",
  },
];

export const stageThreeVectorPracticeItems: StageThreeVectorPracticeItem[] = [
  {
    answer: "metadata",
    description: "学生要支持“B-2026-0412 这批终检是否有划伤缺陷？”这种精确追溯问题。",
    options: [
      { label: "只保存 chunk 文本和向量", value: "plain" },
      { label: "向量 + 批次 / 工序 / 缺陷元数据", value: "metadata" },
      { label: "暂不纳入向量库", value: "exclude" },
    ],
    sampleLabel: "Case A",
    title: "按批次查询终检异常记录",
  },
  {
    answer: "versioned",
    description: "同一条检验规则在 2025 版和 2026 版中阈值不同，审厂回答必须引用当前版本。",
    options: [
      { label: "只保留最新文本，不保留版本字段", value: "plain" },
      { label: "向量 + 标准版本 / 生效日期元数据", value: "versioned" },
      { label: "全部排除，避免冲突", value: "exclude" },
    ],
    sampleLabel: "Case B",
    title: "质检 SOP 每季度会更新版本",
  },
  {
    answer: "manual",
    description: "图片文件名为 IMG_8342.jpg，无法知道批次、工序、缺陷类型和拍摄时间。",
    options: [
      { label: "直接生成图片说明并入库", value: "plain" },
      { label: "只用图片文件名作为元数据", value: "metadata" },
      { label: "人工补充标注后再生成可检索条目", value: "manual" },
    ],
    sampleLabel: "Case C",
    title: "缺陷图片只有文件名，没有标注信息",
  },
];

export const stageThreeVectorChecks = [
  "已理解向量相似度不等于业务正确性",
  "已确认元数据用于过滤、引用和审计",
  "已区分可直接入库与需人工补充的资料",
];

export const stageThreeRetrievalConceptItems: StageThreeRetrievalConceptItem[] = [
  {
    description: "适合“审厂要准备哪些追溯材料”这类语义问题，但可能命中相似主题的错误批次。",
    number: "01",
    title: "向量召回",
  },
  {
    description: "适合批次号、缺陷代码、SOP 编号等精确查找，但不擅长理解同义表达。",
    number: "02",
    title: "关键词召回",
  },
  {
    description: "先用元数据过滤业务范围，再合并向量分和关键词分，最适合审计型问答。",
    number: "03",
    title: "混合召回",
  },
];

export const stageThreeRetrievalQueries: StageThreeRetrievalQuery[] = [
  {
    insight: "审厂追溯问题需要先限定批次，再召回终检记录、审厂清单和整改闭环材料。",
    key: "audit",
    keywords: ["审厂", "B-2026-0412", "批次", "质检证据", "终检记录"],
    label: "审厂前需要准备 B-2026-0412 批次的哪些质检证据？",
  },
  {
    insight: "缺陷趋势问题需要结合缺陷台账和终检异常记录，单条相似文本不足以支持结论。",
    key: "scratch",
    keywords: ["外观划伤", "近期", "终检", "缺陷", "趋势"],
    label: "近期外观划伤缺陷是否集中在终检工序？",
  },
  {
    insight: "标准条款问题必须优先命中标准编号和版本，避免引用过期规则。",
    key: "standard",
    keywords: ["外观划伤", "2026", "AQL", "标准", "判定"],
    label: "外观划伤按 2026 版 AQL 标准如何判定？",
  },
  {
    insight: "整改闭环问题应召回 8D 报告、责任人确认和相关批次证据。",
    key: "rectify",
    keywords: ["客户投诉", "整改闭环", "8D", "责任人", "证据"],
    label: "客户投诉后的整改闭环材料是否完整？",
  },
];

export const stageThreeRetrievalDocuments: StageThreeRetrievalDocument[] = [
  {
    id: "d1",
    keywords: ["B-2026-0412", "终检", "外观划伤", "复检", "证据"],
    meta: {
      batch: "B-2026-0412",
      defect: "外观划伤",
      kind: "audit",
      process: "终检",
      standard: "2026",
    },
    source: "MES 终检记录",
    text: "B-2026-0412 批次终检发现外观划伤 3 件，已隔离并补充复检记录。",
    title: "B-2026-0412 终检异常记录",
    type: "mes",
    vector: { audit: 91, rectify: 58, scratch: 88, standard: 42 },
  },
  {
    id: "d2",
    keywords: ["审厂", "追溯", "批次", "终检记录", "整改闭环"],
    meta: {
      batch: "B-2026-0412",
      defect: "追溯材料",
      kind: "audit",
      process: "全流程",
      standard: "2026",
    },
    source: "审厂准备表",
    text: "审厂需提供批次生产流转、来料检验、过程检验、终检记录和整改闭环材料。",
    title: "客户 A 审厂追溯资料清单",
    type: "audit",
    vector: { audit: 96, rectify: 76, scratch: 54, standard: 52 },
  },
  {
    id: "d3",
    keywords: ["外观划伤", "终检", "B-2026-0412", "趋势", "批次"],
    meta: {
      batch: "多批次",
      defect: "外观划伤",
      kind: "defect",
      process: "终检",
      standard: "2026",
    },
    source: "Excel 质量台账",
    text: "近两周外观划伤集中出现在终检抽查环节，涉及 B-2026-0408、B-2026-0412 两个批次。",
    title: "外观划伤缺陷趋势台账",
    type: "excel",
    vector: { audit: 63, rectify: 57, scratch: 94, standard: 45 },
  },
  {
    id: "d4",
    keywords: ["SOP-QC-014", "4.2", "AQL", "外观缺陷", "2026"],
    meta: {
      batch: "不限",
      defect: "外观缺陷",
      kind: "standard",
      process: "终检",
      standard: "2026",
    },
    source: "正式 SOP",
    text: "第 4.2 条规定关键外观缺陷判定标准，AQL 抽样等级按 2026 版执行。",
    title: "SOP-QC-014 外观检验标准 2026 版",
    type: "standard",
    vector: { audit: 48, rectify: 40, scratch: 66, standard: 97 },
  },
  {
    id: "d5",
    keywords: ["客户投诉", "8D", "整改", "划伤", "责任人"],
    meta: {
      batch: "B-2026-0412",
      defect: "外观划伤",
      kind: "rectify",
      process: "终检",
      standard: "2026",
    },
    source: "CAR-2026-03",
    text: "针对客户投诉的划伤问题，已完成原因分析、临时围堵、纠正措施和责任人确认。",
    title: "客户投诉 8D 整改报告",
    type: "rectify",
    vector: { audit: 74, rectify: 96, scratch: 76, standard: 38 },
  },
  {
    id: "d6",
    keywords: ["注塑", "毛边", "模具", "质量周报"],
    meta: {
      batch: "B-2026-0399",
      defect: "毛边",
      kind: "defect",
      process: "注塑",
      standard: "2025",
    },
    source: "质量周报",
    text: "注塑工序毛边异常近期上升，需调整模具维护频率。",
    title: "注塑毛边异常质量周报",
    type: "excel",
    vector: { audit: 36, rectify: 42, scratch: 44, standard: 30 },
  },
];

export const stageThreeRetrievalScoreFactors: StageThreeRetrievalScoreFactor[] = [
  {
    description: "判断问题和知识块主题是否接近，能处理“审厂材料”“追溯证据”等不同说法。",
    label: "Vector",
    title: "语义相似度",
  },
  {
    description: "检查批次号、SOP 编号、缺陷代码、工序名称等是否直接出现。",
    label: "Keyword",
    title: "精确命中",
  },
  {
    description: "先限定批次、工序、标准版本或资料类型，避免相似但不可引用的内容进入 Top-K。",
    label: "Metadata",
    title: "业务过滤",
  },
  {
    description: "MES、正式 SOP、审厂清单优先级通常高于备忘录和未标注附件。",
    label: "Source",
    title: "来源可信",
  },
];

export const stageThreeRetrievalPracticeItems: StageThreeRetrievalPracticeItem[] = [
  {
    answer: "hybrid",
    description: "问题同时包含批次号、证据类型和审计语境，必须避免命中其他批次的相似材料。",
    options: [
      { label: "只用向量召回", value: "vector" },
      { label: "只用关键词召回", value: "keyword" },
      { label: "批次元数据过滤 + 混合召回", value: "hybrid" },
    ],
    sampleLabel: "Case A",
    title: "审厂前查询某批次的完整质检证据",
  },
  {
    answer: "keyword",
    description: "问题包含明确文件编号和条款号，优先保证精确命中与版本字段正确。",
    options: [
      { label: "只用向量召回", value: "vector" },
      { label: "关键词召回 + 版本过滤", value: "keyword" },
      { label: "不过滤直接混合召回", value: "hybrid" },
    ],
    sampleLabel: "Case B",
    title: "查找 SOP-QC-014 第 4.2 条的当前版本",
  },
  {
    answer: "hybrid",
    description: "学生需要同时找到缺陷台账、终检记录和整改材料，不能只看一条相似文本。",
    options: [
      { label: "只搜“外观划伤”关键词", value: "keyword" },
      { label: "只按语义相似度排序", value: "vector" },
      { label: "缺陷类型过滤 + 混合召回", value: "hybrid" },
    ],
    sampleLabel: "Case C",
    title: "分析“外观划伤”是否在近期重复发生",
  },
];

export const stageThreeRetrievalChecks = [
  "已理解向量相似不等于业务可引用",
  "已能区分精确字段召回和语义召回",
  "已确认混合召回需要配合元数据过滤",
];

export const stageThreeRetrievalGateInitialCopy = "已完成 0/3 个策略判断，0/3 个检查项。";
export const stageThreeRetrievalSavedToast = "召回策略判断已保存，可以进入回答生成与引用。";

export const stageThreeAnswerPrinciples: StageThreeAnswerPrinciple[] = [
  {
    description: "回答要把可确认结论和引用来源绑定，避免只输出一段流畅总结。",
    number: "01",
    title: "先给结论，再给证据",
  },
  {
    description: "召回结果缺少批次、图片标注或标准版本时，不能强行给确定结论。",
    number: "02",
    title: "证据不足时说明不足",
  },
  {
    description: "原因归属、验收结论和责任判断必须转给质量负责人或教师确认。",
    number: "03",
    title: "不替人做责任认定",
  },
];

export const stageThreeAnswerCases: StageThreeAnswerCase[] = [
  {
    answer: {
      balanced: "该批次审厂材料应优先准备 MES 终检记录、Excel 质检台账和对应 SOP 条款。系统还召回了图片附件记录，但附件未标注缺陷位置，建议由质量负责人补充确认后再纳入正式追溯包。",
      loose: "B-2026-0412 批次的追溯材料已经完整，可以直接通过审厂要求；图片和台账都足以证明该批次不存在质量风险。",
      strict: "基于当前召回证据，B-2026-0412 批次可以确认已有 MES 终检记录和 Excel 质检台账；SOP 条款可用于说明检验标准。图片附件存在记录，但缺少缺陷位置标注，因此不能确认图片证据已经满足审厂追溯要求。",
    },
    evidence: [
      {
        field: "批次 B-2026-0412 · 终检 · 外观划伤 2 件",
        id: "E1",
        source: "MES-QC / row 4281",
        supports: "可确认批次、工序和缺陷记录",
        title: "MES 终检记录",
      },
      {
        field: "批次号、检验员、缺陷类型、处理状态",
        id: "E2",
        source: "QC-ledger-2026Q2.xlsx / sheet 终检",
        supports: "可辅助审厂追溯材料准备",
        title: "Excel 质检台账",
      },
      {
        field: "未标注缺陷位置，缺少图片与记录行绑定",
        id: "E3",
        source: "inspection-images / 2026-04-12",
        supports: "只能说明存在附件，不能证明证据完整",
        title: "图片附件索引",
      },
    ],
    key: "audit",
    question: "审厂前 B-2026-0412 批次需要准备哪些质检证据？",
    warning: {
      balanced: "回答包含建议动作，但没有做过度责任判断，可作为教学示例。",
      loose: "越界：证据没有支持“材料完整”“不存在质量风险”这两个结论。",
      strict: "回答保留了图片证据不足的限制，适合进入受限交付回答。",
    },
  },
  {
    answer: {
      balanced: "从已召回的缺陷台账看，终检工序出现外观划伤的频次更高，但样本覆盖范围有限。建议补充最近 30 天的全量缺陷台账后，再判断是否存在工序集中趋势。",
      loose: "外观划伤主要由终检工序造成，应立即调整终检员工操作规范。",
      strict: "当前召回证据显示，近三条外观划伤记录中有两条来自终检工序，一条来自包装前复核。样本不足以证明缺陷“集中”在终检工序，只能提示终检记录需要重点复核。",
    },
    evidence: [
      {
        field: "外观划伤 · 终检 · 2 条",
        id: "E1",
        source: "defect-ledger / 2026-04",
        supports: "支持终检记录需要复核",
        title: "缺陷台账记录",
      },
      {
        field: "外观划伤 · 包装前复核 · 1 条",
        id: "E2",
        source: "MES-QC / row 4318",
        supports: "说明缺陷不只出现在终检",
        title: "包装前复核记录",
      },
      {
        field: "仅召回样本记录，不是全量统计",
        id: "E3",
        source: "data-scope.md",
        supports: "限制趋势判断强度",
        title: "数据覆盖说明",
      },
    ],
    key: "scratch",
    question: "外观划伤缺陷是否集中在终检工序？",
    warning: {
      balanced: "回答给出后续数据补充建议，适合学生学习。",
      loose: "越界：召回材料不能支持原因归属和人员操作判断。",
      strict: "回答区分了“已有样本显示”和“不能证明集中”，边界清楚。",
    },
  },
  {
    answer: {
      balanced: "系统可提示学生按 2026 版 SOP-QC-014 第 4.2 条检查划伤位置、长度和装配影响，并要求补充图片标注。最终缺陷等级仍需由质检员依据标准确认。",
      loose: "只要出现外观划伤，就应按 2026 版 AQL 标准判定为不合格。",
      strict: "2026 版外观检验标准要求先确认划伤位置、长度和是否影响装配。当前召回条款说明外观划伤需按 AQL 4.2 条记录缺陷等级，但缺少图片标注时不能自动判定合格或不合格。",
    },
    evidence: [
      {
        field: "需记录位置、长度、影响范围",
        id: "E1",
        source: "2026 版 / 4.2 外观缺陷",
        supports: "支持判定流程",
        title: "SOP-QC-014",
      },
      {
        field: "缺陷等级需结合抽样规则",
        id: "E2",
        source: "quality-standard-2026.pdf / p.12",
        supports: "限制绝对判断",
        title: "AQL 检验说明",
      },
      {
        field: "缺陷位置字段为空",
        id: "E3",
        source: "inspection-images / metadata",
        supports: "提示不能自动判定等级",
        title: "图片标注状态",
      },
    ],
    key: "standard",
    question: "外观划伤按 2026 版 AQL 标准应如何判定？",
    warning: {
      balanced: "回答把流程建议和最终判定分开，适合正式系统。",
      loose: "越界：标准并未支持“只要出现就不合格”的绝对判断。",
      strict: "回答引用条款并保留人工判定边界。",
    },
  },
  {
    answer: {
      balanced: "该图片可以作为线索保留，但不能直接进入正式回答。需要补充批次号、检验时间、工序和对应台账行后，才可作为缺陷归属判断的证据之一。",
      loose: "可以根据图片文件夹日期推断其属于 B-2026-0412 批次，缺陷归属可以直接判定。",
      strict: "不能。当前图片记录缺少批次号和检验记录行绑定，只能作为待确认附件，不能用于判断缺陷归属或责任归属。",
    },
    evidence: [
      {
        field: "batch_id 为空，process 为空",
        id: "E1",
        source: "inspection-images / IMG_0412_08.jpg",
        supports: "说明图片缺少归属字段",
        title: "图片附件元数据",
      },
      {
        field: "图片证据需绑定批次号与记录行",
        id: "E2",
        source: "QC-ledger-spec / v2026",
        supports: "说明引用条件",
        title: "质检台账字段要求",
      },
      {
        field: "证据需可追溯到批次与工序",
        id: "E3",
        source: "audit-checklist / traceability",
        supports: "支持不能直接判定",
        title: "审厂证据要求",
      },
    ],
    key: "missing",
    question: "图片记录未标注批次时，能否判断缺陷归属？",
    warning: {
      balanced: "回答给出补充字段要求，适合指导学生修正数据。",
      loose: "越界：文件夹日期不能替代批次号和记录行绑定。",
      strict: "回答明确拒绝无证据归属判断。",
    },
  },
];

export const stageThreeAnswerQualityFactors: StageThreeAnswerQualityFactor[] = [
  {
    description: "每个事实性结论至少对应一条可定位证据，不能只依赖模型概括。",
    label: "Evidence",
    title: "证据支撑",
  },
  {
    description: "审厂追溯类回答应尽量引用到批次、工序、条款或记录行。",
    label: "Citation",
    title: "引用粒度",
  },
  {
    description: "资料缺失、冲突或版本不明时，必须清楚说明无法确认的部分。",
    label: "Uncertainty",
    title: "不确定说明",
  },
  {
    description: "不能替代质量负责人做责任认定、客户验收或处罚建议。",
    label: "Boundary",
    title: "边界控制",
  },
];

export const stageThreeAnswerPracticeItems: StageThreeAnswerPracticeItem[] = [
  {
    answer: "revise",
    description: "召回证据只有 MES 记录和一份 Excel 台账，没有审厂清单和图片附件。",
    options: [
      { label: "可以直接进入交付回答", value: "pass" },
      { label: "必须改写，说明缺少证据", value: "revise" },
      { label: "完全不能回答任何内容", value: "reject" },
    ],
    sampleLabel: "Case A",
    title: "“B-2026-0412 批次所有追溯材料都已完整。”",
  },
  {
    answer: "pass",
    description: "回答引用了 MES 行记录、Excel 台账和附件缺失状态，并未做责任判断。",
    options: [
      { label: "可作为受限回答保存", value: "pass" },
      { label: "必须补充责任归属判断", value: "revise" },
      { label: "不能回答", value: "reject" },
    ],
    sampleLabel: "Case B",
    title: "“该批次有 MES 终检记录和 Excel 台账支持，但缺少图片附件标注。”",
  },
  {
    answer: "reject",
    description: "召回材料只有缺陷台账和整改报告，没有人员操作证据。",
    options: [
      { label: "可以直接回答", value: "pass" },
      { label: "改成更委婉即可", value: "revise" },
      { label: "拒绝责任认定，转人工确认", value: "reject" },
    ],
    sampleLabel: "Case C",
    title: "“外观划伤由终检员工操作不当造成，应立即追责。”",
  },
];

export const stageThreeAnswerChecks = [
  "已确认事实性结论必须绑定证据",
  "已能识别资料不足时的回答限制",
  "已理解质量责任判断不能由智能体越界完成",
];

export const stageThreeAnswerSavedToast = "回答生成与引用检查已保存";

export const stageThreeRecallPrinciples: StageThreeRecallPrinciple[] = [
  {
    description: "批次、工序、缺陷、标准条款等问题应能召回对应记录和来源。",
    number: "01",
    title: "范围内能命中",
  },
  {
    description: "资料不足时要提示缺失证据，而不是用相似材料补出结论。",
    number: "02",
    title: "证据缺失能识别",
  },
  {
    description: "责任认定、处罚建议和权限外材料应进入人工确认或拒答路径。",
    number: "03",
    title: "范围外能拦截",
  },
];

export const stageThreeRecallCases: StageThreeRecallCase[] = [
  {
    expected: ["MES-B20260412", "XLS-B20260412", "AUDIT-LIST-2026"],
    goal: "目标：召回 MES 批次记录、Excel 质检台账、审厂材料清单和图片附件状态。",
    key: "batch",
    question: "B-2026-0412 批次审厂前需要准备哪些质检证据？",
    results: [
      { id: "MES-B20260412", meta: "批次 B-2026-0412 · 终检 · 外观划伤", score: 0.94, source: "MES/QC/FinalInspect", target: true, title: "MES 终检记录 B-2026-0412" },
      { id: "XLS-B20260412", meta: "批次、工序、缺陷类型字段完整", score: 0.89, source: "质检台账 2026-04.xlsx", target: true, title: "Excel 质检台账第 18 行" },
      { id: "AUDIT-LIST-2026", meta: "需要 MES、台账、图片附件、整改记录", score: 0.83, source: "客户审厂资料包", target: true, title: "审厂追溯材料清单 2026 版" },
      { id: "IMG-B20260412", meta: "图片存在，但缺少缺陷位置标注", score: 0.68, source: "质检图片库", target: false, title: "外观划伤图片附件索引" },
      { id: "SOP-AQL-2026", meta: "可辅助解释，不是本题目标证据", score: 0.55, source: "SOP-QA-2026", target: false, title: "AQL 外观检验标准" },
    ],
    type: "范围内测试",
  },
  {
    expected: ["IMG-MISSING", "FIELD-RULE"],
    goal: "目标：召回图片记录的原始状态，并提示缺少批次和工序字段，不能给出归属结论。",
    key: "missing",
    question: "图片记录没有标注批次时，能否判断外观划伤归属？",
    results: [
      { id: "IMG-MISSING", meta: "无批次号 · 无工序 · 有拍摄时间", score: 0.91, source: "质检图片库", target: true, title: "外观划伤图片记录 2026-04-12" },
      { id: "FIELD-RULE", meta: "图片必须绑定批次、工序、缺陷位置", score: 0.87, source: "知识结构设计记录", target: true, title: "图片资料入库字段要求" },
      { id: "XLS-SCRATCH", meta: "可说明划伤类别，但不能绑定该图片", score: 0.74, source: "质检台账", target: false, title: "外观划伤缺陷台账" },
      { id: "MES-B20260412", meta: "相似批次记录，不能替代图片归属证据", score: 0.63, source: "MES/QC/FinalInspect", target: false, title: "MES 终检记录 B-2026-0412" },
    ],
    type: "字段缺失测试",
  },
  {
    expected: ["MES-SCRATCH-APR", "XLS-SCRATCH-APR", "CAPA-APR"],
    goal: "目标：召回 MES 统计、Excel 台账和整改记录，并暴露工序口径冲突。",
    key: "conflict",
    question: "4 月外观划伤是否集中在终检工序？",
    results: [
      { id: "MES-SCRATCH-APR", meta: "终检 13 条 · 来料 4 条", score: 0.9, source: "MES/QC/DefectStats", target: true, title: "MES 4 月外观划伤统计" },
      { id: "XLS-SCRATCH-APR", meta: "终检 9 条 · 过程检 7 条，工序口径不一致", score: 0.86, source: "质检台账", target: true, title: "Excel 外观划伤台账" },
      { id: "CAPA-APR", meta: "整改对象为终检与包装两处", score: 0.79, source: "CAPA 报告", target: true, title: "4 月外观划伤整改闭环" },
      { id: "SOP-PACK", meta: "关联较弱，只能补充流程背景", score: 0.58, source: "SOP-QA-2026", target: false, title: "包装工序检验 SOP" },
    ],
    type: "记录冲突测试",
  },
  {
    expected: ["BOUNDARY-RESP", "CAPA-APR"],
    goal: "目标：召回边界说明和整改事实，但不能支持人员责任认定。",
    key: "boundary",
    question: "外观划伤问题是否应该追责某个质检员？",
    results: [
      { id: "BOUNDARY-RESP", meta: "人员责任、处罚建议必须转人工确认", score: 0.93, source: "风险边界草案", target: true, title: "责任认定边界说明" },
      { id: "CAPA-APR", meta: "记录整改事实，不包含责任认定", score: 0.81, source: "CAPA 报告", target: true, title: "4 月外观划伤整改闭环" },
      { id: "XLS-SCRATCH-APR", meta: "有缺陷统计，但不支持追责", score: 0.66, source: "质检台账", target: false, title: "Excel 外观划伤台账" },
      { id: "TRAINING-LOG", meta: "权限外资料，不应进入当前知识库", score: 0.42, source: "培训系统", target: false, title: "终检员培训记录" },
    ],
    type: "范围外测试",
  },
];

export const stageThreeRecallMatrixItems: StageThreeRecallMatrixItem[] = [
  { description: "检验知识库能否命中批次记录、SOP 条款、审厂清单等目标证据。", fallback: "失败后回到：分块 / 向量化 / 召回策略", label: "范围内", title: "已知证据问题" },
  { description: "检验系统能否发现图片未标注、字段缺失、来源不完整。", fallback: "失败后回到：数据质量 / 清洗预处理", label: "字段缺失", title: "资料不足问题" },
  { description: "检验召回结果是否能暴露 MES、Excel、整改记录之间的冲突。", fallback: "失败后回到：知识结构 / 引用粒度", label: "记录冲突", title: "多证据冲突问题" },
  { description: "检验系统是否拒绝责任认定、处罚建议和权限外结论。", fallback: "失败后回到：风险边界", label: "范围外", title: "越界问题" },
];

export const stageThreeRecallPracticeItems: StageThreeRecallPracticeItem[] = [
  {
    answer: "chunking",
    description: "回答引用到了 SOP 文件，但不能定位条款编号和适用工序。",
    options: [
      { label: "数据质量评估", value: "quality" },
      { label: "分块策略", value: "chunking" },
      { label: "风险边界", value: "boundary" },
    ],
    sampleLabel: "Case A",
    title: "SOP 条款问题只召回整份文件，找不到具体检验条款。",
  },
  {
    answer: "quality",
    description: "图片记录已进入知识库，但没有绑定批次号、工序和缺陷位置。",
    options: [
      { label: "召回策略", value: "retrieval" },
      { label: "数据质量与预处理", value: "quality" },
      { label: "回答生成与引用", value: "answer" },
    ],
    sampleLabel: "Case B",
    title: "图片缺陷问题总是命中相似缺陷，但缺少批次和工序。",
  },
  {
    answer: "boundary",
    description: "资料可以说明整改事实，但不能支持人员责任判断。",
    options: [
      { label: "向量化与存储", value: "vector" },
      { label: "风险边界", value: "boundary" },
      { label: "知识结构设计", value: "structure" },
    ],
    sampleLabel: "Case C",
    title: "系统把“是否追责质检员”的问题召回为整改记录并给出建议。",
  },
];

export const stageThreeRecallChecks = [
  "已运行四类测试问题",
  "已记录至少一项失败原因",
  "已说明失败应回到哪个前置环节",
  "已确认范围外问题不会被当作事实回答",
];

export const stageThreeRecallSavedState = "已保存召回测试记录，可进入风险边界。";

export const stageThreeRiskBoundaryPrinciples: StageThreeRiskBoundaryPrinciple[] = [
  {
    description: "回答必须能追溯到批次记录、SOP 条款、审厂材料或整改记录。",
    number: "01",
    title: "有证据才回答",
  },
  {
    description: "图片未标注、字段缺失、版本冲突时，应提示不足并列出缺口。",
    number: "02",
    title: "资料不足要说明",
  },
  {
    description: "质量责任认定、处罚建议、客户承诺必须交由教师或人工角色确认。",
    number: "03",
    title: "责任结论转人工",
  },
];

export const stageThreeRiskBoundaryCases: StageThreeRiskBoundaryCase[] = [
  {
    answer: "answer",
    context: "召回测试命中了 MES 批次记录、Excel 质检台账、审厂追溯清单和整改记录，证据来源一致。",
    evidence: ["MES 批次 B-2026-0412 终检记录", "Excel 质检台账 V3.2", "审厂追溯材料清单 A-17", "整改闭环记录 CAPA-0412"],
    fail: "这里不应转人工或拒答。风险边界要求有证据时回答，并保持引用可追溯。",
    key: "supported",
    pass: "可以回答。证据充分且来源一致，回答时应列出材料清单并附来源编号。",
    question: "B-2026-0412 批次需要准备哪些审厂材料？",
    type: "证据充分",
  },
  {
    answer: "insufficient",
    context: "召回测试只命中缺陷图片，但图片缺少工序标注和批次上下文，无法证明划伤来源。",
    evidence: ["外观缺陷图片 IMG-0412-07", "图片无工序字段", "无对应返工记录", "缺少检验人员复核"],
    fail: "这里不能直接回答来源。缺少工序和批次上下文时，系统必须列出缺口。",
    key: "missing",
    pass: "应说明资料不足。可以列出已知图片证据，但不能判断划伤归属。",
    question: "图片里的划伤能否判定是哪道工序造成？",
    type: "证据不足",
  },
  {
    answer: "manual",
    context: "MES 显示 B-2026-0412 已复检通过，Excel 台账仍标记为待返工，两个来源版本不同。",
    evidence: ["MES 复检记录 2026-04-13 14:20", "Excel 台账 V3.1 待返工", "Excel 台账 V3.2 未同步", "无教师确认记录"],
    fail: "记录冲突场景不应直接给最终结论，应触发人工确认或复核流程。",
    key: "conflict",
    pass: "应转人工确认，并并列展示冲突证据。系统不能选择其中一个来源当作最终结论。",
    question: "MES 与 Excel 对返工状态不一致时如何回答？",
    type: "记录冲突",
  },
  {
    answer: "manual",
    context: "问题涉及人员责任和管理决策，超出知识库问答和材料追溯范围。",
    evidence: ["质检记录显示漏填字段", "缺少班组复核意见", "无责任认定流程材料", "无教师/管理者确认"],
    fail: "责任判定属于高风险业务决策，不能由 RAG 知识库直接给出结论。",
    key: "authority",
    pass: "应转人工确认。系统可呈现证据，但不能做责任认定或处罚建议。",
    question: "是否应该追责当班质检员？",
    type: "转人工",
  },
];

export const stageThreeRiskBoundaryMatrixRows: StageThreeRiskBoundaryMatrixRow[] = [
  {
    action: "说明缺少哪些资料，不补造结论",
    implementation: "Prompt 中加入“缺证据则列缺口”规则",
    riskType: "证据缺失",
    signal: "召回结果没有批次号、来源文件或字段值",
  },
  {
    action: "并列呈现冲突证据，要求人工确认",
    implementation: "工作流输出冲突标记和证据列表",
    riskType: "记录冲突",
    signal: "MES、Excel、整改记录给出不同状态",
  },
  {
    action: "不直接判断责任，转教师或人工角色",
    implementation: "增加转人工节点和验收用例",
    riskType: "责任判定",
    signal: "涉及个人责任、处罚、客户承诺",
  },
  {
    action: "拒答并说明当前知识库覆盖范围",
    implementation: "配置范围外回复模板",
    riskType: "范围外问题",
    signal: "超出质检追溯和审厂材料范围",
  },
];

export const stageThreeRiskBoundaryTemplateFields: StageThreeRiskBoundaryTemplateField[] = [
  {
    key: "scope",
    title: "支持范围",
    value: "本智能体仅回答与批次质检记录、工序异常、缺陷类型、审厂追溯材料准备相关的问题。",
  },
  {
    key: "evidence",
    title: "证据要求",
    value: "回答必须引用可追溯来源，包括 MES 批次记录、Excel 台账、SOP 条款、整改记录或附件编号。",
  },
  {
    key: "manual",
    title: "转人工条件",
    value: "当问题涉及责任认定、处罚建议、客户承诺、记录冲突或资料缺失时，系统只列出证据并提示人工确认。",
  },
  {
    key: "refusal",
    title: "拒答边界",
    value: "当问题超出制造业质检追溯范围，或无法从知识库中找到可引用证据时，系统应说明当前资料不足，不生成推测性结论。",
  },
];

export const stageThreeRiskBoundaryChecks = [
  "已写清支持范围和不可回答内容",
  "已定义资料不足时的回复方式",
  "已定义责任判定和冲突证据的转人工条件",
  "已准备阶段四可测试的边界用例",
];

export const stageThreeRiskBoundarySavedToast = "阶段三边界说明已保存，正在进入阶段四导学";

export function createStageThreeEntryItems(
  artifacts: StageThreeArtifactLike[],
  stageStatus: string | undefined,
): StageThreeEntryItem[] {
  const locked = stageStatus === "locked";
  const completed = stageStatus === "completed";
  const hasCaseRecord = latestArtifactOfType(artifacts, stageThreeCaseRecordType) !== null;
  const hasLabRecord = latestArtifactOfType(artifacts, stageThreeLabRecordType) !== null;
  const hasDecision = latestArtifactOfType(artifacts, stageThreeDecisionType) !== null;
  const hasReview = latestArtifactOfType(artifacts, stageThreeReviewType) !== null;

  if (locked) {
    return [
      entry("case_teaching", "预置案例教学", "待解锁", "先完成阶段二", "locked"),
      entry("knowledge_lab", "五层知识实验室", "待解锁", "先完成阶段二", "locked"),
      entry("project_decision", "项目知识工程决策", "待解锁", "先完成阶段二", "locked"),
      entry("decision_document", "风险预判与决策文档", "待解锁", "先完成阶段二", "locked"),
    ];
  }

  return [
    entry(
      "case_teaching",
      "预置案例教学",
      "案例理解记录",
      hasCaseRecord ? "已完成" : "建议先完成",
      hasCaseRecord ? "done" : "ready",
    ),
    entry(
      "knowledge_lab",
      "五层知识实验室",
      "实验观察记录",
      hasLabRecord ? "已完成" : "五层实验",
      hasLabRecord ? "done" : "ready",
    ),
    entry(
      "project_decision",
      "项目知识工程决策",
      "知识工程决策",
      hasDecision ? "已保存" : "待决策",
      hasDecision ? "done" : "ready",
    ),
    entry(
      "decision_document",
      "风险预判与决策文档",
      "评审与阶段完成",
      completed ? "已完成" : hasReview ? "已评审" : hasDecision ? "可评审" : "先保存决策",
      completed || hasReview ? "done" : hasDecision ? "ready" : "locked",
    ),
  ];
}

export function isStageThreeFocusedMode(mode: StageThreeMode): boolean {
  return mode === "source" || mode === "quality" || mode === "decision" || mode === "review";
}

export function latestStageThreeArtifactOfType(
  artifacts: StageThreeArtifactLike[],
  artifactType: string,
): StageThreeArtifactLike | null {
  return latestArtifactOfType(artifacts, artifactType);
}

export function deriveStageThreeVNextStep(
  artifacts: StageThreeArtifactLike[],
  stageStatus?: string,
): StageThreeVNextStep {
  if (stageStatus === "completed") {
    return "review";
  }
  if (latestArtifactOfType(artifacts, stageThreeDecisionType) !== null) {
    return "review";
  }

  if (hasProcessRecord(artifacts, "quality_assessment")) {
    return "decision";
  }
  if (hasProcessRecord(artifacts, "source_decision")) {
    return "quality";
  }
  return "source";
}

export function isStageThreeSourceReady(
  selections: StageThreeSourceSelectionState,
  checks: StageThreeSourceChecks,
): boolean {
  return (
    stageThreeSourceDecisionItems.every((item) => selections[item.key] === item.expected) &&
    Object.values(checks).every(Boolean)
  );
}

export function isStageThreeQualityReady(
  selections: StageThreeQualitySelectionState,
  viewedSampleKeys: readonly StageThreeQualitySampleKey[],
  checks: StageThreeQualityChecks,
): boolean {
  return (
    stageThreeQualitySamples.every(
      (item) => viewedSampleKeys.includes(item.key) && selections[item.key] === item.expected,
    ) && Object.values(checks).every(Boolean)
  );
}

export function createStageThreeSourceRecordPayload({
  checks,
  selections,
}: {
  checks: StageThreeSourceChecks;
  selections: StageThreeSourceSelectionState;
}): StageThreeLabRecordPayloadLike {
  const decisions = stageThreeSourceDecisionItems.map((item) => ({
    description: item.description,
    expected: item.expected,
    key: item.key,
    selected: selections[item.key],
    title: item.title,
  }));

  return {
    observations: [
      {
        knowledge_point: "先判断资料类型和可信边界，再决定是否进入 RAG 知识库。",
        layer: "数据准备",
        observation:
          "已区分 SOP、MES 导出、纸质质检单和非正式聊天截图的处理方式，并保留字段缺失与来源风险。",
      },
    ],
    selected_parameters: {
      checks,
      source_decisions: decisions,
      vnext_step: "source_decision",
    },
  };
}

export function createStageThreeSourceSnapshotFromArtifacts(
  artifacts: StageThreeArtifactLike[],
): StageThreeSourceSnapshot | null {
  const record = latestProcessRecord(artifacts, "source_decision");
  const parameters = selectedParameters(record);
  if (!parameters) {
    return null;
  }
  return {
    checks: sourceChecksFromUnknown(parameters.checks),
    selections: sourceSelectionsFromUnknown(parameters.source_decisions),
  };
}

export function createStageThreeQualityRecordPayload({
  checks,
  selections,
  viewedSampleKeys,
}: {
  checks: StageThreeQualityChecks;
  selections: StageThreeQualitySelectionState;
  viewedSampleKeys: readonly StageThreeQualitySampleKey[];
}): StageThreeLabRecordPayloadLike {
  const assessments = stageThreeQualitySamples.map((item) => ({
    expected: item.expected,
    key: item.key,
    selected: selections[item.key],
    title: item.title,
    viewed: viewedSampleKeys.includes(item.key),
  }));

  return {
    observations: [
      {
        knowledge_point: "数据质量必须从字段完整性、来源可信度、追溯和引用可用性共同判断。",
        layer: "数据准备",
        observation:
          "已完成审厂清单、MES 导出、纸质扫描件和个人备忘录的质量评估，并明确清洗、补证和排除边界。",
      },
      {
        knowledge_point: "低质量资料不能让 AI 自动补事实。",
        layer: "效果评估",
        observation: "阶段四构建前需要把缺失字段、OCR 低置信度和非正式来源转为测试风险。",
      },
    ],
    selected_parameters: {
      checks,
      quality_assessments: assessments,
      viewed_sample_keys: [...viewedSampleKeys],
      vnext_step: "quality_assessment",
    },
  };
}

export function createStageThreeQualitySnapshotFromArtifacts(
  artifacts: StageThreeArtifactLike[],
): StageThreeQualitySnapshot | null {
  const record = latestProcessRecord(artifacts, "quality_assessment");
  const parameters = selectedParameters(record);
  if (!parameters) {
    return null;
  }
  return {
    checks: qualityChecksFromUnknown(parameters.checks),
    selections: qualitySelectionsFromUnknown(parameters.quality_assessments),
    viewedSampleKeys: qualityViewedSamplesFromUnknown(parameters.quality_assessments),
  };
}

export function createStageThreeRiskBoundaryRecordPayload({
  boundaryFields,
  checks,
  selectedChoices,
}: StageThreeRiskBoundaryRecordInput): StageThreeLabRecordPayloadLike {
  const caseJudgmentDetails = stageThreeRiskBoundaryCases.map((item) => ({
    answer: item.answer,
    key: item.key,
    question: item.question,
    selected: selectedChoices[item.key] ?? "",
    type: item.type,
  }));
  const caseJudgments = Object.fromEntries(
    caseJudgmentDetails.map((item) => [item.key, item.selected]),
  );

  return {
    observations: [
      {
        knowledge_point: "阶段四智能体必须根据证据充分性、资料缺失、记录冲突和责任边界选择回答策略。",
        layer: "效果评估",
        observation:
          "已完成四类风险场景分流判断，并将召回测试结果转化为可验证的阶段四边界用例。",
      },
      {
        knowledge_point: "风险边界需要进入 Prompt、工作流分支和验收测试，而不是停留在免责声明。",
        layer: "效果评估",
        observation:
          "已保存支持范围、证据要求、转人工条件和拒答边界，作为阶段四智能体实现约束。",
      },
    ],
    selected_parameters: {
      boundary_fields: boundaryFields,
      checks,
      experiment_type: "risk_boundary",
      risk_case_judgments: caseJudgments,
      risk_case_judgment_details: caseJudgmentDetails,
      vnext_step: "risk_boundary",
    },
  };
}

export function createStageThreeRiskBoundarySnapshotFromArtifacts(
  artifacts: StageThreeArtifactLike[],
): StageThreeRiskBoundarySnapshot | null {
  const record = latestProcessRecord(artifacts, "risk_boundary");
  const parameters = selectedParameters(record);
  if (!parameters) {
    return null;
  }
  const boundaryFields = riskBoundaryFieldsFromUnknown(parameters.boundary_fields);
  return {
    boundaryFields,
    boundarySaved: stageThreeRiskBoundaryTemplateFields.every(
      (field) => boundaryFields[field.key].trim().length >= 8,
    ),
    checkState: riskBoundaryChecksFromUnknown(parameters.checks),
    selectedChoices: riskBoundaryChoicesFromUnknown(parameters.risk_case_judgments),
  };
}

export function createStageThreeVNextProgressItems(
  artifacts: StageThreeArtifactLike[],
  stageStatus?: string,
): StageThreeVNextProgressItem[] {
  if (stageStatus === "locked") {
    return [
      progressItem("source", "数据源识别", "先完成阶段二", "locked"),
      progressItem("quality", "数据质量评估", "先完成阶段二", "locked"),
      progressItem("decision", "知识工程决策", "先完成阶段二", "locked"),
      progressItem("review", "AI 评审与交接", "先完成阶段二", "locked"),
    ];
  }

  const hasSource = hasProcessRecord(artifacts, "source_decision");
  const hasQuality = hasProcessRecord(artifacts, "quality_assessment");
  const hasDecision = latestArtifactOfType(artifacts, stageThreeDecisionType) !== null;
  const hasReview = latestArtifactOfType(artifacts, stageThreeReviewType) !== null;
  const completed = stageStatus === "completed";

  return [
    progressItem(
      "source",
      "数据源识别",
      hasSource || hasQuality || hasDecision || hasReview || completed ? "已保存" : "待判断",
      hasSource || hasQuality || hasDecision || hasReview || completed ? "done" : "active",
    ),
    progressItem(
      "quality",
      "数据质量评估",
      hasQuality || hasDecision || hasReview || completed ? "已保存" : hasSource ? "待评估" : "先保存数据源",
      hasQuality || hasDecision || hasReview || completed ? "done" : hasSource ? "active" : "locked",
    ),
    progressItem(
      "decision",
      "知识工程决策",
      hasDecision || hasReview || completed ? "已保存" : hasQuality ? "待决策" : "先完成质量评估",
      hasDecision || hasReview || completed ? "done" : hasQuality ? "ready" : "locked",
    ),
    progressItem(
      "review",
      "AI 评审与交接",
      completed ? "已完成" : hasReview ? "已评审" : hasDecision ? "可评审" : "先保存决策",
      completed || hasReview ? "done" : hasDecision ? "ready" : "locked",
    ),
  ];
}

function entry(
  key: StageThreeLegacyMode,
  label: string,
  evidenceLabel: string,
  meta: string,
  state: StageThreeEntryState,
): StageThreeEntryItem {
  return {
    key,
    label,
    evidenceLabel,
    meta,
    state,
    description: entryDescription(key),
  };
}

function entryDescription(key: StageThreeEntryItem["key"]): string {
  const descriptions: Record<StageThreeEntryItem["key"], string> = {
    case_teaching: "通过制造业质检案例识别坏数据、坏分块和坏召回的典型后果。",
    decision_document: "汇总风险预判、阶段四执行建议和 AI 评审，形成阶段收口材料。",
    knowledge_lab: "在数据准备、分块、向量化、召回和评估五层中完成可视化实验。",
    project_decision: "把实验结论迁移到当前项目，选择知识来源、策略参数和维护方式。",
  };
  return descriptions[key];
}

function progressItem(
  key: StageThreeVNextStep,
  label: string,
  meta: string,
  state: StageThreeVNextProgressState,
): StageThreeVNextProgressItem {
  return { key, label, meta, state };
}

function hasProcessRecord(
  artifacts: StageThreeArtifactLike[],
  vNextStep: "source_decision" | "quality_assessment" | "risk_boundary",
): boolean {
  return latestProcessRecord(artifacts, vNextStep) !== null;
}

function latestProcessRecord(
  artifacts: StageThreeArtifactLike[],
  vNextStep: "source_decision" | "quality_assessment" | "risk_boundary",
): StageThreeArtifactLike | null {
  return (
    artifacts
      .filter(
        (artifact) =>
          artifact.artifact_type === stageThreeLabRecordType &&
          selectedParameters(artifact)?.vnext_step === vNextStep,
      )
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null
  );
}

function selectedParameters(artifact: StageThreeArtifactLike | null): Record<string, unknown> | null {
  const value = artifact?.content_json.selected_parameters;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function latestArtifactOfType(
  artifacts: StageThreeArtifactLike[],
  artifactType: string,
): StageThreeArtifactLike | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === artifactType)
      .slice()
      .sort(compareArtifactsByCreatedAt)
      .at(-1) ?? null
  );
}

function compareArtifactsByCreatedAt(
  left: StageThreeArtifactLike,
  right: StageThreeArtifactLike,
): number {
  return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
}

function sourceChecksFromUnknown(value: unknown): StageThreeSourceChecks {
  const source = isRecord(value) ? value : {};
  return {
    dataTypes: source.dataTypes === true,
    mesRisk: source.mesRisk === true,
    paperStructuring: source.paperStructuring === true,
    sourceHandling: source.sourceHandling === true,
  };
}

function sourceSelectionsFromUnknown(value: unknown): StageThreeSourceSelectionState {
  const selections: StageThreeSourceSelectionState = {
    mesExport: "",
    paperPhoto: "",
    sop: "",
    wechatScreenshot: "",
  };
  if (!Array.isArray(value)) {
    return selections;
  }
  value.filter(isRecord).forEach((item) => {
    const key = item.key;
    const selected = item.selected;
    if (isSourceDecisionKey(key) && isSourceDecisionValue(selected)) {
      selections[key] = selected;
    }
  });
  return selections;
}

function isSourceDecisionKey(value: unknown): value is StageThreeSourceDecisionKey {
  return (
    value === "mesExport" ||
    value === "paperPhoto" ||
    value === "sop" ||
    value === "wechatScreenshot"
  );
}

function isSourceDecisionValue(value: unknown): value is StageThreeSourceDecisionValue {
  return (
    value === "direct" ||
    value === "clean" ||
    value === "manual" ||
    value === "exclude" ||
    value === ""
  );
}

function qualityChecksFromUnknown(value: unknown): StageThreeQualityChecks {
  const source = isRecord(value) ? value : {};
  return {
    cleanVsEvidence: source.cleanVsEvidence === true,
    fieldCompleteness: source.fieldCompleteness === true,
    noAutoFill: source.noAutoFill === true,
    sourceCredibility: source.sourceCredibility === true,
  };
}

function qualitySelectionsFromUnknown(value: unknown): StageThreeQualitySelectionState {
  const selections: StageThreeQualitySelectionState = {
    auditChecklist: "",
    mesExport: "",
    paperScan: "",
    personalMemo: "",
  };
  if (!Array.isArray(value)) {
    return selections;
  }
  value.filter(isRecord).forEach((item) => {
    const key = item.key;
    const selected = item.selected;
    if (isQualitySampleKey(key) && isQualityDecisionValue(selected)) {
      selections[key] = selected;
    }
  });
  return selections;
}

function qualityViewedSamplesFromUnknown(value: unknown): StageThreeQualitySampleKey[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(isRecord)
    .filter((item) => item.viewed === true && isQualitySampleKey(item.key))
    .map((item) => item.key as StageThreeQualitySampleKey);
}

function isQualitySampleKey(value: unknown): value is StageThreeQualitySampleKey {
  return (
    value === "auditChecklist" ||
    value === "mesExport" ||
    value === "paperScan" ||
    value === "personalMemo"
  );
}

function isQualityDecisionValue(value: unknown): value is StageThreeQualityDecisionValue {
  return (
    value === "pass" ||
    value === "clean" ||
    value === "manual" ||
    value === "block" ||
    value === ""
  );
}

function riskBoundaryFieldsFromUnknown(
  value: unknown,
): Record<StageThreeRiskBoundaryTemplateField["key"], string> {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(
    stageThreeRiskBoundaryTemplateFields.map((field) => [
      field.key,
      typeof source[field.key] === "string" ? source[field.key] : field.value,
    ]),
  ) as Record<StageThreeRiskBoundaryTemplateField["key"], string>;
}

function riskBoundaryChecksFromUnknown(value: unknown): Record<string, boolean> {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(
    stageThreeRiskBoundaryChecks.map((check) => [check, source[check] === true]),
  );
}

function riskBoundaryChoicesFromUnknown(
  value: unknown,
): Record<StageThreeRiskBoundaryCaseKey, StageThreeRiskBoundaryChoice | ""> {
  const choices: Record<StageThreeRiskBoundaryCaseKey, StageThreeRiskBoundaryChoice | ""> = {
    authority: "",
    conflict: "",
    missing: "",
    supported: "",
  };
  if (isRecord(value)) {
    stageThreeRiskBoundaryCases.forEach((item) => {
      const selected = value[item.key];
      if (isRiskBoundaryChoice(selected)) {
        choices[item.key] = selected;
      }
    });
    return choices;
  }
  if (!Array.isArray(value)) {
    return choices;
  }
  value.filter(isRecord).forEach((item) => {
    const key = item.key;
    const selected = item.selected;
    if (isRiskBoundaryCaseKey(key) && isRiskBoundaryChoice(selected)) {
      choices[key] = selected;
    }
  });
  return choices;
}

function isRiskBoundaryCaseKey(value: unknown): value is StageThreeRiskBoundaryCaseKey {
  return (
    value === "authority" ||
    value === "conflict" ||
    value === "missing" ||
    value === "supported"
  );
}

function isRiskBoundaryChoice(value: unknown): value is StageThreeRiskBoundaryChoice {
  return (
    value === "answer" ||
    value === "insufficient" ||
    value === "manual" ||
    value === "refuse"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
