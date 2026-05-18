export type RagChunkingStrategy = "fixed" | "sentence" | "structural" | "semantic";

export type RagRetrievalMode = "vector" | "keyword" | "hybrid";

export type ManufacturingDocument = {
  category: string;
  id: string;
  rawText: string;
  title: string;
};

export type RagChunk = {
  content: string;
  endOffset: number;
  id: string;
  kind: "parent" | "heading" | "paragraph" | "semantic" | "window";
  parentId?: string;
  sectionPath: string[];
  startOffset: number;
};

export type ChunkingParameters = {
  chunkSize: number;
  overlap: number;
  parentChild: boolean;
  strategy: RagChunkingStrategy;
};

export type VectorNeighbor = {
  cluster: string;
  id: string;
  label: string;
  point: [number, number];
  similarity: number;
};

export type HybridRetrievalParameters = {
  category: "all" | "检测规则" | "缺陷标准" | "设备维护" | "质量记录";
  mode: RagRetrievalMode;
  query: string;
  useAliases: boolean;
  vectorWeight: number;
};

export type HybridRetrievalResult = {
  category: HybridRetrievalParameters["category"];
  hybridScore: number;
  id: string;
  keywordScore: number;
  matchedTerms: string[];
  title: string;
  vectorScore: number;
};

export type LayerObservation = {
  layer: "数据准备" | "分块策略" | "向量化与存储" | "召回策略" | "效果评估";
  knowledgePoint: string;
  observation: string;
};

type SectionMarker = {
  index: number;
  isChapter: boolean;
  label: string;
};

const SECTION_MARKER_PATTERN = /^(第[一二三四五六七八九十]+章\s+.+|[0-9]+\.[0-9]+\s+.+)$/gm;

export const manufacturingDocuments: ManufacturingDocument[] = [
  {
    category: "质检 SOP",
    id: "qa-sop",
    title: "制造质检 SOP - 来料、AOI 与出货检验",
    rawText: `第一章 来料检验
1.1 供应商批次核验
质检员需核对供应商名称、批次号、来料日期和抽检比例。缺少批次号的材料不得进入生产线。

1.2 外观缺陷判定
外观缺陷包括划伤、污渍、毛刺、变形和标签破损。轻微划伤需记录位置和数量，严重划伤直接判为不合格。

第二章 AOI 检测
2.1 AOI 复判规则
AOI 告警图片需由复判员确认。连续三次误判同一位置时，应检查光源、镜头清洁度和模板阈值。

2.2 漏检追溯
出现客户投诉漏检时，需回溯最近三批 AOI 参数、复判记录和人工抽检记录，并形成 8D 问题单。

第三章 出货检验
3.1 抽样标准
出货前按 AQL 0.65 执行抽样。关键尺寸、外观缺陷和包装标签均需留存照片证据。

3.2 异常处置
发现批量异常时暂停出货，质量工程师需在 2 小时内给出处置意见，并同步生产、仓储和客户经理。`,
  },
  {
    category: "设备维护",
    id: "device-maintenance",
    title: "AOI 设备维护记录",
    rawText: `第一章 日常点检
1.1 光源检查
每班开机前检查光源亮度，亮度衰减超过 10% 时需更换光源组件。

1.2 镜头清洁
镜头表面不得有灰尘、水汽和油污。清洁后需拍摄标准板验证图像清晰度。

第二章 参数维护
2.1 模板阈值
模板阈值变更必须记录变更人、原因和验证样本。未经确认不得覆盖历史模板。

2.2 误判分析
误判率连续两天超过 8% 时，设备工程师需联合质量工程师复核检测区域和光源角度。`,
  },
];

export const vectorSpacePoints: VectorNeighbor[] = [
  { cluster: "检测规则", id: "aoi-review-rule", label: "AOI 复判规则", point: [0.78, 0.82], similarity: 0 },
  { cluster: "检测规则", id: "aoi-miss-trace", label: "漏检追溯流程", point: [0.72, 0.74], similarity: 0 },
  { cluster: "缺陷标准", id: "appearance-defect", label: "外观缺陷判定", point: [0.18, 0.80], similarity: 0 },
  { cluster: "缺陷标准", id: "scratch-severity", label: "划伤等级记录", point: [0.24, 0.72], similarity: 0 },
  { cluster: "设备维护", id: "light-check", label: "光源亮度检查", point: [0.80, 0.28], similarity: 0 },
  { cluster: "设备维护", id: "lens-cleaning", label: "镜头清洁验证", point: [0.88, 0.20], similarity: 0 },
  { cluster: "质量记录", id: "aql-sampling", label: "AQL 抽样标准", point: [0.22, 0.24], similarity: 0 },
  { cluster: "质量记录", id: "shipping-evidence", label: "出货照片证据", point: [0.34, 0.18], similarity: 0 },
];

const hybridIndex: Array<{
  aliases: string[];
  category: Exclude<HybridRetrievalParameters["category"], "all">;
  content: string;
  id: string;
  intentPoint: [number, number];
  title: string;
}> = [
  {
    aliases: ["划伤", "污渍", "毛刺", "变形", "标签破损"],
    category: "缺陷标准",
    content: "外观缺陷包括划伤、污渍、毛刺、变形和标签破损，严重划伤直接判为不合格。",
    id: "appearance-defect-standard",
    intentPoint: [0.18, 0.80],
    title: "外观缺陷判定标准",
  },
  {
    aliases: ["AOI", "误判", "复判", "模板阈值"],
    category: "检测规则",
    content: "AOI 告警图片需由复判员确认，连续三次误判同一位置时检查光源、镜头和模板阈值。",
    id: "aoi-review-standard",
    intentPoint: [0.78, 0.82],
    title: "AOI 复判规则",
  },
  {
    aliases: ["漏检", "客户投诉", "8D", "追溯"],
    category: "质量记录",
    content: "客户投诉漏检时，需回溯最近三批 AOI 参数、复判记录和人工抽检记录。",
    id: "miss-tracing-record",
    intentPoint: [0.72, 0.74],
    title: "漏检追溯记录",
  },
  {
    aliases: ["光源", "镜头", "清洁", "亮度"],
    category: "设备维护",
    content: "光源亮度衰减超过 10% 时需更换组件，镜头清洁后需拍摄标准板验证。",
    id: "device-maintenance-check",
    intentPoint: [0.84, 0.24],
    title: "AOI 设备点检记录",
  },
  {
    aliases: ["AQL", "抽样", "出货", "照片证据"],
    category: "质量记录",
    content: "出货前按 AQL 0.65 执行抽样，关键尺寸、外观缺陷和包装标签均需留存照片证据。",
    id: "shipping-sampling-plan",
    intentPoint: [0.24, 0.22],
    title: "出货抽样与证据要求",
  },
];

export function getManufacturingDocument(documentId: string): ManufacturingDocument {
  return manufacturingDocuments.find((document) => document.id === documentId) ?? manufacturingDocuments[0];
}

export function chunkManufacturingDocument(
  documentId: string,
  parameters: ChunkingParameters,
): RagChunk[] {
  const document = getManufacturingDocument(documentId);
  const markers = parseSectionMarkers(document.rawText);
  const childChunks =
    parameters.strategy === "structural"
      ? structuralChunks(document.rawText, markers)
      : parameters.strategy === "sentence"
        ? sentenceChunks(document.rawText, markers, parameters)
        : parameters.strategy === "semantic"
          ? semanticChunks(document.rawText, markers, parameters)
          : fixedChunks(document.rawText, markers, parameters);

  if (!parameters.parentChild) {
    return childChunks;
  }

  const chapterGroups = new Map<string, RagChunk[]>();
  for (const chunk of childChunks) {
    const chapter = chunk.sectionPath[0] ?? "未归类";
    chapterGroups.set(chapter, [...(chapterGroups.get(chapter) ?? []), chunk]);
  }

  const parentChunks = Array.from(chapterGroups.entries()).map(([chapter, chunks], index) => {
    const parentId = `parent-${index + 1}`;
    for (const child of chunks) {
      child.parentId = parentId;
    }
    return {
      content: chapter,
      endOffset: Math.max(...chunks.map((chunk) => chunk.endOffset)),
      id: parentId,
      kind: "parent" as const,
      sectionPath: [chapter],
      startOffset: Math.min(...chunks.map((chunk) => chunk.startOffset)),
    };
  });

  return [...parentChunks, ...childChunks];
}

export function rankVectorNeighbors(query: string, topK: number): VectorNeighbor[] {
  const queryPoint = inferQueryPoint(query);
  return vectorSpacePoints
    .map((point) => ({
      ...point,
      similarity: roundScore(similarity(queryPoint, point.point)),
    }))
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, topK);
}

export function runHybridRetrieval(parameters: HybridRetrievalParameters): HybridRetrievalResult[] {
  const queryPoint = inferQueryPoint(parameters.query);
  const keywordWeight = 1 - parameters.vectorWeight;
  return hybridIndex
    .filter((item) => parameters.category === "all" || item.category === parameters.category)
    .map((item) => {
      const vectorScore = roundScore(similarity(queryPoint, item.intentPoint));
      const keyword = keywordScore(parameters.query, item, parameters.useAliases);
      const hybridScore =
        parameters.mode === "vector"
          ? vectorScore
          : parameters.mode === "keyword"
            ? keyword.score
            : roundScore(vectorScore * parameters.vectorWeight + keyword.score * keywordWeight);
      return {
        category: item.category,
        hybridScore,
        id: item.id,
        keywordScore: keyword.score,
        matchedTerms: keyword.matchedTerms,
        title: item.title,
        vectorScore,
      };
    })
    .sort((left, right) => right.hybridScore - left.hybridScore || right.keywordScore - left.keywordScore);
}

export function createLayerObservationSnapshot({
  chunkCount,
  hitRate,
  topResultTitle,
}: {
  chunkCount: number;
  hitRate: number;
  topResultTitle: string;
}): LayerObservation[] {
  const hitRatePercent = `${Math.round(hitRate * 100)}%`;
  return [
    {
      knowledgePoint: "先判断知识源是否干净、完整、可追溯，再决定是否进入知识库。",
      layer: "数据准备",
      observation: "当前材料覆盖质检 SOP 与设备维护，但仍需标记缺陷照片和批次记录是否齐备。",
    },
    {
      knowledgePoint: "分块决定模型能否在召回时拿到完整上下文。",
      layer: "分块策略",
      observation: `当前参数生成 ${chunkCount} 个知识块，需检查标题层级是否被保留。`,
    },
    {
      knowledgePoint: "Embedding 把文本映射到语义空间，相近问题会靠近相似知识块。",
      layer: "向量化与存储",
      observation: "AOI、外观缺陷、设备维护和质量记录已形成四个可解释语义簇。",
    },
    {
      knowledgePoint: "召回策略需要在语义相似、关键词精确和业务别名之间取平衡。",
      layer: "召回策略",
      observation: "混合检索用于兼顾 AOI、AQL、8D 等精确术语与自然语言问题。",
    },
    {
      knowledgePoint: "只看模型回答不够，需要观察命中率、首位命中和误召回。",
      layer: "效果评估",
      observation: `Hit Rate ${hitRatePercent}，首位命中：${topResultTitle}。`,
    },
  ];
}

function parseSectionMarkers(text: string): SectionMarker[] {
  const markers: SectionMarker[] = [];
  let match: RegExpExecArray | null;
  while ((match = SECTION_MARKER_PATTERN.exec(text)) !== null) {
    markers.push({
      index: match.index,
      isChapter: match[1].startsWith("第"),
      label: match[1].trim(),
    });
  }
  return markers;
}

function fixedChunks(text: string, markers: SectionMarker[], parameters: ChunkingParameters): RagChunk[] {
  const chunks: RagChunk[] = [];
  const step = Math.max(20, parameters.chunkSize - parameters.overlap);
  for (let start = 0; start < text.length; start += step) {
    const end = Math.min(start + parameters.chunkSize, text.length);
    const content = text.slice(start, end).trim();
    if (content.length > 0) {
      chunks.push({
        content,
        endOffset: end,
        id: `chunk-${chunks.length + 1}`,
        kind: "window",
        sectionPath: sectionPathForOffset(markers, start),
        startOffset: start,
      });
    }
    if (end >= text.length) {
      break;
    }
  }
  return chunks;
}

function sentenceChunks(text: string, markers: SectionMarker[], parameters: ChunkingParameters): RagChunk[] {
  const sentences = text
    .split(/(?<=[。！？\n])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const sentencesPerChunk = Math.max(2, Math.floor(parameters.chunkSize / 60));
  const overlapSentences = Math.floor(sentencesPerChunk * (parameters.overlap / Math.max(parameters.chunkSize, 1)));
  const step = Math.max(1, sentencesPerChunk - overlapSentences);
  const chunks: RagChunk[] = [];
  let offset = 0;

  for (let index = 0; index < sentences.length; index += step) {
    const selected = sentences.slice(index, index + sentencesPerChunk);
    const content = selected.join("");
    const startOffset = text.indexOf(selected[0], offset);
    const endOffset = startOffset + content.length;
    chunks.push({
      content,
      endOffset,
      id: `chunk-${chunks.length + 1}`,
      kind: "paragraph",
      sectionPath: sectionPathForOffset(markers, Math.max(startOffset, 0)),
      startOffset: Math.max(startOffset, 0),
    });
    offset = Math.max(endOffset, offset);
    if (index + sentencesPerChunk >= sentences.length) {
      break;
    }
  }
  return chunks;
}

function structuralChunks(text: string, markers: SectionMarker[]): RagChunk[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: RagChunk[] = [];
  let searchOffset = 0;
  for (const paragraph of paragraphs) {
    const content = paragraph.trim();
    if (!content) {
      searchOffset += paragraph.length;
      continue;
    }
    const startOffset = text.indexOf(paragraph, searchOffset);
    const isHeading = /^(第[一二三四五六七八九十]+章|[0-9]+\.[0-9]+)/.test(content);
    chunks.push({
      content,
      endOffset: startOffset + paragraph.length,
      id: `chunk-${chunks.length + 1}`,
      kind: isHeading ? "heading" : "paragraph",
      sectionPath: sectionPathForOffset(markers, Math.max(startOffset, 0)),
      startOffset: Math.max(startOffset, 0),
    });
    searchOffset = startOffset + paragraph.length;
  }
  return chunks;
}

function semanticChunks(text: string, markers: SectionMarker[], parameters: ChunkingParameters): RagChunk[] {
  const structural = structuralChunks(text, markers);
  const chunks: RagChunk[] = [];
  let buffer: RagChunk[] = [];
  for (const chunk of structural) {
    const nextLength = buffer.reduce((sum, item) => sum + item.content.length, 0) + chunk.content.length;
    if (buffer.length > 0 && (chunk.kind === "heading" || nextLength > parameters.chunkSize * 1.25)) {
      chunks.push(mergeSemanticChunk(buffer, chunks.length + 1));
      buffer = [];
    }
    buffer.push(chunk);
  }
  if (buffer.length > 0) {
    chunks.push(mergeSemanticChunk(buffer, chunks.length + 1));
  }
  return chunks;
}

function mergeSemanticChunk(chunks: RagChunk[], index: number): RagChunk {
  return {
    content: chunks.map((chunk) => chunk.content).join("\n\n"),
    endOffset: chunks.at(-1)?.endOffset ?? chunks[0].endOffset,
    id: `chunk-${index}`,
    kind: "semantic",
    sectionPath: chunks[0].sectionPath,
    startOffset: chunks[0].startOffset,
  };
}

function sectionPathForOffset(markers: SectionMarker[], offset: number): string[] {
  const path: string[] = [];
  for (const marker of markers) {
    if (marker.index > offset) {
      break;
    }
    if (marker.isChapter) {
      path.splice(0, path.length, marker.label);
    } else if (path.length === 0) {
      path.push(marker.label);
    } else {
      path[1] = marker.label;
    }
  }
  return path;
}

function inferQueryPoint(query: string): [number, number] {
  const normalized = query.toLowerCase();
  if (normalized.includes("aoi") || query.includes("复判") || query.includes("误判")) {
    return [0.78, 0.80];
  }
  if (query.includes("漏检") || query.includes("追溯") || normalized.includes("8d")) {
    return [0.72, 0.74];
  }
  if (query.includes("外观") || query.includes("缺陷") || query.includes("划伤") || query.includes("污渍")) {
    return [0.19, 0.79];
  }
  if (query.includes("光源") || query.includes("镜头") || query.includes("设备")) {
    return [0.84, 0.25];
  }
  if (normalized.includes("aql") || query.includes("抽样") || query.includes("出货")) {
    return [0.24, 0.22];
  }
  return [0.5, 0.5];
}

export function inferVectorQueryPoint(query: string): [number, number] {
  return inferQueryPoint(query);
}

function keywordScore(
  query: string,
  item: (typeof hybridIndex)[number],
  useAliases: boolean,
): { matchedTerms: string[]; score: number } {
  const normalizedQuery = query.toLowerCase();
  const searchableText = `${item.title} ${item.content}`.toLowerCase();
  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const matchedTerms: string[] = [];
  let score = 0;

  for (const term of queryTerms) {
    if (term.length > 0 && searchableText.includes(term)) {
      score += 0.35;
      matchedTerms.push(term);
    }
  }

  if (useAliases) {
    for (const alias of item.aliases) {
      const aliasLower = alias.toLowerCase();
      if (searchableText.includes(aliasLower) && isAliasRelevant(normalizedQuery, aliasLower, item)) {
        score += 0.14;
        matchedTerms.push(alias);
      }
    }
  }

  return {
    matchedTerms: [...new Set(matchedTerms)].slice(0, 5),
    score: roundScore(Math.min(score, 1)),
  };
}

function isAliasRelevant(
  normalizedQuery: string,
  aliasLower: string,
  item: (typeof hybridIndex)[number],
): boolean {
  return (
    normalizedQuery.includes(aliasLower) ||
    item.title.toLowerCase().includes(normalizedQuery) ||
    normalizedQuery.includes("外观缺陷") ||
    normalizedQuery.includes("aoi") ||
    normalizedQuery.includes("iso") ||
    normalizedQuery.includes("aql")
  );
}

function similarity(left: [number, number], right: [number, number]): number {
  const distance = Math.sqrt((left[0] - right[0]) ** 2 + (left[1] - right[1]) ** 2);
  return Math.max(0, 1 - distance / 1.2);
}

function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}
