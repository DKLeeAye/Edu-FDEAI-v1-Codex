export type CaseTeachingLessonKey =
  | "data_quality"
  | "chunking_failure"
  | "retrieval_failure"
  | "diagnostic_map";

export type DiagnosticFailureKey = "retrieval_miss" | "retrieval_wrong" | "answer_poor";

export type CaseTeachingLesson = {
  badExample: string;
  badSignals: string[];
  comparisonQuestion: string;
  goodExample: string;
  goodSignals: string[];
  key: CaseTeachingLessonKey;
  label: string;
  teachingPoint: string;
};

export type DiagnosticRoute = {
  causes: string[];
  failure: DiagnosticFailureKey;
  nextAction: string;
  primaryCheck: string;
  title: string;
};

export type CaseTeachingReadiness = {
  completedCount: number;
  note: string;
  readyForProjectDecision: boolean;
  totalCount: number;
};

const lessons: CaseTeachingLesson[] = [
  {
    badExample: "来料记录：供应商 A，日期 5 月，外观异常若干，处理结果见附件。",
    badSignals: ["批次号缺失", "异常描述含糊", "附件不可追溯", "处理结论缺少责任人"],
    comparisonQuestion: "如果学生把这段材料直接入库，智能体能否回答“是哪一批材料出问题”？",
    goodExample: "来料记录：供应商 A，批次 MFG-2026-0507-03，抽检 80 件，发现 6 件边缘毛刺，质量工程师李明已判定隔离复检。",
    goodSignals: ["批次号完整", "字段命名统一", "缺陷类型明确", "抽检数量可计算", "处置责任人明确"],
    key: "data_quality",
    label: "数据质量找茬",
    teachingPoint: "坏数据会让知识库把不完整、重复或不可追溯的信息当成事实。",
  },
  {
    badExample: "chunk A：AOI 告警图片需由复判员确认。连续三次误判同一位置时，应检查光源、镜头清洁度...\nchunk B：...和模板阈值。出现客户投诉漏检时，需回溯最近三批 AOI 参数。",
    badSignals: ["关键句被切断", "检查动作分散到两个块", "标题层级丢失", "召回后上下文不足"],
    comparisonQuestion: "如果只召回 chunk A，学生能否知道完整处置动作？",
    goodExample: "chunk：2.1 AOI 复判规则。AOI 告警图片需由复判员确认。连续三次误判同一位置时，应检查光源、镜头清洁度和模板阈值。",
    goodSignals: ["标题和正文同块", "动作完整", "关键字段未断开", "可直接作为回答证据"],
    key: "chunking_failure",
    label: "分块策略失败案例",
    teachingPoint: "坏分块会让模型找到片段却拿不到完整上下文，最终回答缺步骤、缺条件或断章取义。",
  },
  {
    badExample: "问题：AOI 连续误判怎么办？召回结果：出货 AQL 抽样标准、包装标签照片要求、客户经理同步流程。",
    badSignals: ["语义簇偏离", "Top-1 不相关", "关键词未补强 AOI", "没有复判规则证据"],
    comparisonQuestion: "这个召回结果看起来都和质检有关，为什么仍然是坏召回？",
    goodExample: "问题：AOI 连续误判怎么办？召回结果：AOI 复判规则、设备光源检查、模板阈值变更记录。",
    goodSignals: ["Top-1 命中复判规则", "设备维护证据补充原因", "业务术语 AOI 被识别", "结果能支撑下一步处置"],
    key: "retrieval_failure",
    label: "召回失败案例",
    teachingPoint: "坏召回不是“没有结果”才算失败；看似相关但无法支撑回答的材料也会误导智能体。",
  },
  {
    badExample: "学生只写“模型回答不好”，没有区分是找不到、找错了，还是找到了但上下文不够。",
    badSignals: ["问题归因过粗", "无法决定调数据还是调检索", "缺少可复现实验", "阶段四无调试路径"],
    comparisonQuestion: "面对回答失败时，第一步应该改 prompt，还是先诊断召回链路？",
    goodExample: "先归类：召回不到、召回错了、答案质量差。再分别检查入库范围、分块结构、Top-K、别名、overlap 和引用约束。",
    goodSignals: ["三类问题分开诊断", "每类都有优先检查项", "能转成阶段四调试任务", "避免盲目改 prompt"],
    key: "diagnostic_map",
    label: "三类诊断问题",
    teachingPoint: "诊断地图帮助学生把“回答不好”拆成可行动的 RAG 调试问题。",
  },
];

const diagnosticRoutes: DiagnosticRoute[] = [
  {
    causes: ["材料未入库", "chunk 未保留关键字段", "Top-K 过小", "过滤条件过窄"],
    failure: "retrieval_miss",
    nextAction: "确认知识源覆盖范围，放宽过滤条件，并检查关键字段是否进入 chunk。",
    primaryCheck: "先查数据是否入库，再查 chunk 是否保留关键字段。",
    title: "召回不到",
  },
  {
    causes: ["相似但无关材料干扰", "业务别名缺失", "关键词权重过低", "分类过滤缺失"],
    failure: "retrieval_wrong",
    nextAction: "补充业务别名、元数据过滤和关键词权重，必要时加入重排序。",
    primaryCheck: "先看 Top-1 是否能直接支撑回答，再看 Top-3 是否同属一个业务问题。",
    title: "召回错了",
  },
  {
    causes: ["上下文被切断", "overlap 不足", "父子块缺失", "回答模板未要求引用证据"],
    failure: "answer_poor",
    nextAction: "增加 overlap 或父子块，并要求回答引用完整上下文。",
    primaryCheck: "先看召回块是否正确，再看块内是否包含完整条件、动作和例外。",
    title: "答案质量差",
  },
];

export function createCaseTeachingLessons(): CaseTeachingLesson[] {
  return lessons;
}

export function getCaseTeachingLesson(key: CaseTeachingLessonKey): CaseTeachingLesson {
  return lessons.find((lesson) => lesson.key === key) ?? lessons[0];
}

export function getDiagnosticRoute(failure: DiagnosticFailureKey): DiagnosticRoute {
  return diagnosticRoutes.find((route) => route.failure === failure) ?? diagnosticRoutes[0];
}

export function createDiagnosticRoutes(): DiagnosticRoute[] {
  return diagnosticRoutes;
}

export function summarizeCaseTeachingReadiness(visitedLessons: CaseTeachingLessonKey[]): CaseTeachingReadiness {
  const visited = new Set(visitedLessons);
  return {
    completedCount: lessons.filter((lesson) => visited.has(lesson.key)).length,
    note: "案例教学只建立直觉，不作为项目决策完成条件。",
    readyForProjectDecision: false,
    totalCount: lessons.length,
  };
}
