"use client";

import {
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  Layers3,
  LineChart,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type { StageThreeLabExperimentRecordPayload } from "@/src/lib/api";

import { createLabExperimentRecordPayload } from "./stage-three-process-records";
import {
  chunkManufacturingDocument,
  createLayerObservationSnapshot,
  getManufacturingDocument,
  inferVectorQueryPoint,
  manufacturingDocuments,
  rankVectorNeighbors,
  runHybridRetrieval,
  vectorSpacePoints,
  type ChunkingParameters,
  type HybridRetrievalParameters,
  type RagChunk,
  type RagChunkingStrategy,
  type RagRetrievalMode,
} from "./stage-three-rag-lab";
import { StatusBadge } from "./ui";

type LayerReadinessLike = {
  description: string;
  ready: boolean;
  title: string;
};

type LabLayerKey = "data" | "chunking" | "vector" | "retrieval" | "evaluation";

const labLayers: Array<{
  icon: ReactNode;
  key: LabLayerKey;
  label: string;
  title: string;
}> = [
  { icon: <Database aria-hidden size={18} />, key: "data", label: "01", title: "数据准备" },
  { icon: <Layers3 aria-hidden size={18} />, key: "chunking", label: "02", title: "分块策略" },
  { icon: <Sparkles aria-hidden size={18} />, key: "vector", label: "03", title: "向量化与存储" },
  { icon: <Search aria-hidden size={18} />, key: "retrieval", label: "04", title: "召回策略" },
  { icon: <LineChart aria-hidden size={18} />, key: "evaluation", label: "05", title: "效果评估" },
];

const vectorQueryPresets = ["AOI 误判复判怎么处理", "外观缺陷判定", "光源亮度异常", "AQL 出货抽样"];
const retrievalQueryPresets = ["外观缺陷判定", "AOI 误判复判", "客户投诉漏检追溯", "出货 AQL 抽样"];

export function StageThreeRagLab({
  disabled,
  isSavingRecord,
  onSaveRecord,
  readiness,
  recordSaved,
}: {
  disabled: boolean;
  isSavingRecord: boolean;
  onSaveRecord: (payload: StageThreeLabExperimentRecordPayload) => Promise<boolean>;
  readiness: LayerReadinessLike[];
  recordSaved: boolean;
}) {
  const [activeLayer, setActiveLayer] = useState<LabLayerKey>("data");
  const [documentId, setDocumentId] = useState("qa-sop");
  const [chunking, setChunking] = useState<ChunkingParameters>({
    chunkSize: 120,
    overlap: 20,
    parentChild: true,
    strategy: "structural",
  });
  const [vectorQuery, setVectorQuery] = useState("AOI 误判复判怎么处理");
  const [retrieval, setRetrieval] = useState<HybridRetrievalParameters>({
    category: "all",
    mode: "hybrid",
    query: "外观缺陷判定",
    useAliases: true,
    vectorWeight: 0.4,
  });

  const document = getManufacturingDocument(documentId);
  const chunks = useMemo(() => chunkManufacturingDocument(documentId, chunking), [chunking, documentId]);
  const childChunks = useMemo(() => chunks.filter((chunk) => chunk.kind !== "parent"), [chunks]);
  const vectorResults = useMemo(() => rankVectorNeighbors(vectorQuery, 5), [vectorQuery]);
  const retrievalResults = useMemo(() => runHybridRetrieval(retrieval), [retrieval]);
  const hitRate = useMemo(() => calculateHitRate(retrievalResults), [retrievalResults]);
  const observations = useMemo(
    () =>
      createLayerObservationSnapshot({
        chunkCount: childChunks.length,
        hitRate,
        topResultTitle: retrievalResults[0]?.title ?? "暂无结果",
      }),
    [childChunks.length, hitRate, retrievalResults],
  );

  const activeObservation = observations.find((item) => layerKeyFromTitle(item.layer) === activeLayer) ?? observations[0];

  async function handleSaveRecord() {
    if (disabled || isSavingRecord) {
      return;
    }
    await onSaveRecord(
      createLabExperimentRecordPayload({
        chunking,
        documentId,
        hitRate,
        observations,
        retrieval,
        topResultTitle: retrievalResults[0]?.title ?? "暂无结果",
        vectorQuery,
      }),
    );
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-[18px] border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="实验入口" tone="info" />
              <StatusBadge label={`${childChunks.length} 个子块`} tone="success" />
              <StatusBadge label={`Hit Rate ${Math.round(hitRate * 100)}%`} tone="info" />
            </div>
            <h3 className="mt-4 text-2xl font-extrabold leading-tight text-slate-950">五层知识实验室</h3>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-500">
              每一层都包含知识点说明、可视化演示、参数选择和观察记录。这里使用制造业质检材料模拟 RAG 决策，不连接真实向量库。
            </p>
          </div>
          <div className="grid gap-3 xl:w-[380px]">
            <select
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-400"
              onChange={(event) => setDocumentId(event.target.value)}
              value={documentId}
            >
              {manufacturingDocuments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled || isSavingRecord}
              onClick={() => void handleSaveRecord()}
              type="button"
            >
              {isSavingRecord ? "保存中" : recordSaved ? "更新实验观察记录" : "保存实验观察记录"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[18px] border border-slate-200 bg-white p-4">
          <p className="px-2 text-xs font-extrabold text-slate-400">五层路径</p>
          <div className="mt-3 grid gap-2">
            {labLayers.map((layer) => {
              const readinessItem = readiness.find((item) => item.title === layer.title);
              const active = activeLayer === layer.key;
              return (
                <button
                  className={`flex min-h-[76px] items-center gap-3 rounded-2xl border px-3 text-left transition ${
                    active
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200 hover:bg-white"
                  }`}
                  key={layer.key}
                  onClick={() => setActiveLayer(layer.key)}
                  type="button"
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${active ? "bg-emerald-600 text-white" : "bg-white text-emerald-700"}`}>
                    {layer.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-extrabold text-slate-400">{layer.label}</span>
                    <span className="block text-sm font-extrabold">{layer.title}</span>
                    <span className="mt-1 block text-xs font-bold text-slate-500">
                      {readinessItem?.ready ? "项目决策已记录" : "待观察"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="grid gap-4">
          <LayerHeader observation={activeObservation} />
          {activeLayer === "data" ? (
            <DataPreparationLayer document={document} />
          ) : activeLayer === "chunking" ? (
            <ChunkingLayer
              childChunks={childChunks}
              chunks={chunks}
              documentText={document.rawText}
              parameters={chunking}
              onChange={setChunking}
            />
          ) : activeLayer === "vector" ? (
            <VectorLayer query={vectorQuery} results={vectorResults} onQueryChange={setVectorQuery} />
          ) : activeLayer === "retrieval" ? (
            <RetrievalLayer parameters={retrieval} results={retrievalResults} onChange={setRetrieval} />
          ) : (
            <EvaluationLayer hitRate={hitRate} observations={observations} results={retrievalResults} />
          )}
        </div>
      </div>
    </section>
  );
}

function LayerHeader({ observation }: { observation: { knowledgePoint: string; layer: string; observation: string } }) {
  return (
    <section className="grid gap-3 rounded-[18px] border border-slate-200 bg-white p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.55fr)]">
      <LabBlock icon={<BookOpen aria-hidden size={18} />} label="知识点说明">
        {observation.knowledgePoint}
      </LabBlock>
      <LabBlock icon={<FileText aria-hidden size={18} />} label="观察记录">
        {observation.observation}
      </LabBlock>
    </section>
  );
}

function DataPreparationLayer({ document }: { document: { category: string; rawText: string; title: string } }) {
  const checks = [
    ["来源完整性", "SOP、设备维护和质量记录需要能追溯到批次或责任人。"],
    ["格式清洁度", "页眉页脚、重复段落和扫描噪声会污染 chunk。"],
    ["业务元数据", "文档类型、工序、设备、缺陷类型会影响过滤和召回。"],
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <LabPanel title="可视化演示">
        <div className="grid gap-3 lg:grid-cols-3">
          {["原始材料", "清洗与标注", "可入库知识源"].map((label, index) => (
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={label}>
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-emerald-700">{index + 1}</span>
                {index < 2 ? <span className="h-px flex-1 bg-slate-200" /> : null}
              </div>
              <h4 className="mt-4 text-sm font-extrabold text-slate-950">{label}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {index === 0
                  ? "质检 SOP、设备点检、漏检追溯记录。"
                  : index === 1
                    ? "去除噪声、补齐标题、写入工序和缺陷元数据。"
                    : "进入分块、向量化和召回实验。"}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white">
          <p className="text-xs font-extrabold text-emerald-200">当前样本文档</p>
          <h4 className="mt-2 text-base font-extrabold">{document.title}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-300">{document.rawText.slice(0, 180)}...</p>
        </div>
      </LabPanel>
      <LabPanel title="参数选择">
        <div className="grid gap-3">
          {checks.map(([title, description]) => (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={title}>
              <div className="flex items-start gap-2">
                <CheckCircle2 aria-hidden className="mt-0.5 shrink-0 text-emerald-600" size={16} />
                <div>
                  <p className="text-sm font-extrabold text-slate-900">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </LabPanel>
    </div>
  );
}

function ChunkingLayer({
  childChunks,
  chunks,
  documentText,
  onChange,
  parameters,
}: {
  childChunks: RagChunk[];
  chunks: RagChunk[];
  documentText: string;
  onChange: (parameters: ChunkingParameters) => void;
  parameters: ChunkingParameters;
}) {
  const visibleChunks = childChunks.slice(0, 8);
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <LabPanel title="可视化演示">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="max-h-[480px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
            {renderChunkedPreview(documentText, visibleChunks)}
          </div>
          <div className="grid max-h-[480px] gap-2 overflow-auto">
            {visibleChunks.map((chunk, index) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-3" key={chunk.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold text-emerald-700">chunk {index + 1}</p>
                  <p className="text-xs font-bold text-slate-400">{chunk.content.length} 字</p>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{chunk.content}</p>
                <p className="mt-2 text-xs font-bold text-slate-400">{chunk.sectionPath.join(" / ")}</p>
              </article>
            ))}
          </div>
        </div>
      </LabPanel>
      <LabPanel title="参数选择">
        <ControlGroup label="分块策略">
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none"
            onChange={(event) => onChange({ ...parameters, strategy: event.target.value as RagChunkingStrategy })}
            value={parameters.strategy}
          >
            <option value="fixed">固定长度</option>
            <option value="sentence">句子滑窗</option>
            <option value="structural">结构化分块</option>
            <option value="semantic">语义分块</option>
          </select>
        </ControlGroup>
        <RangeControl
          disabled={parameters.strategy === "structural"}
          label="Chunk Size"
          max={260}
          min={80}
          onChange={(value) => onChange({ ...parameters, chunkSize: value })}
          step={20}
          suffix=" 字"
          value={parameters.chunkSize}
        />
        <RangeControl
          disabled={parameters.strategy === "structural"}
          label="Overlap"
          max={80}
          min={0}
          onChange={(value) => onChange({ ...parameters, overlap: value })}
          step={10}
          suffix=" 字"
          value={parameters.overlap}
        />
        <button
          className={`mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-extrabold transition ${
            parameters.parentChild
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-white text-slate-600"
          }`}
          onClick={() => onChange({ ...parameters, parentChild: !parameters.parentChild })}
          type="button"
        >
          {parameters.parentChild ? "已启用父子分块" : "启用父子分块"}
        </button>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-extrabold text-slate-900">当前结果</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            共 {childChunks.length} 个子块，{chunks.length - childChunks.length} 个父块。
          </p>
        </div>
      </LabPanel>
    </div>
  );
}

function VectorLayer({
  onQueryChange,
  query,
  results,
}: {
  onQueryChange: (query: string) => void;
  query: string;
  results: Array<{ cluster: string; id: string; label: string; point: [number, number]; similarity: number }>;
}) {
  const queryPoint = inferVectorQueryPoint(query);
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <LabPanel title="可视化演示">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <svg aria-label="向量空间二维示意图" className="h-[420px] w-full" viewBox="0 0 520 420">
            <defs>
              <pattern height="40" id="rag-grid" patternUnits="userSpaceOnUse" width="40">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
              </pattern>
            </defs>
            <rect fill="url(#rag-grid)" height="340" rx="16" width="440" x="40" y="40" />
            {results.slice(0, 3).map((point) => (
              <line
                key={point.id}
                stroke="#10b981"
                strokeDasharray="6 6"
                strokeOpacity="0.55"
                strokeWidth="2"
                x1={toCanvas(queryPoint)[0]}
                x2={toCanvas(point.point)[0]}
                y1={toCanvas(queryPoint)[1]}
                y2={toCanvas(point.point)[1]}
              />
            ))}
            {vectorSpacePoints.map((point) => {
              const [x, y] = toCanvas(point.point);
              const ranked = results.findIndex((item) => item.id === point.id);
              return (
                <g key={point.id}>
                  <circle fill={clusterColor(point.cluster)} opacity={ranked >= 0 ? "0.22" : "0"} r={ranked >= 0 ? 20 : 0} cx={x} cy={y} />
                  <circle fill={clusterColor(point.cluster)} r={ranked >= 0 ? 8 : 6} cx={x} cy={y} />
                  {ranked >= 0 && ranked < 3 ? (
                    <text fill="#0f172a" fontSize="12" fontWeight="800" x={x + 12} y={y - 10}>
                      #{ranked + 1}
                    </text>
                  ) : null}
                  <text fill="#475569" fontSize="11" textAnchor="middle" x={x} y={y + 24}>
                    {point.label}
                  </text>
                </g>
              );
            })}
            <circle cx={toCanvas(queryPoint)[0]} cy={toCanvas(queryPoint)[1]} fill="#f97316" r="13" stroke="#fff" strokeWidth="4" />
            <text fill="#ea580c" fontSize="13" fontWeight="800" textAnchor="middle" x={toCanvas(queryPoint)[0]} y={toCanvas(queryPoint)[1] - 22}>
              Q
            </text>
          </svg>
        </div>
      </LabPanel>
      <LabPanel title="参数选择">
        <ControlGroup label="查询问题">
          <div className="grid gap-2">
            {vectorQueryPresets.map((item) => (
              <button
                className={`min-h-10 rounded-xl border px-3 text-left text-sm font-bold transition ${
                  query === item ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                }`}
                key={item}
                onClick={() => onQueryChange(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </ControlGroup>
        <div className="mt-4 grid gap-2">
          {results.map((item, index) => (
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3" key={item.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-slate-900">#{index + 1} {item.label}</p>
                <p className="text-sm font-extrabold text-emerald-700">{Math.round(item.similarity * 100)}%</p>
              </div>
              <p className="mt-1 text-xs font-bold text-slate-400">{item.cluster}</p>
            </article>
          ))}
        </div>
      </LabPanel>
    </div>
  );
}

function RetrievalLayer({
  onChange,
  parameters,
  results,
}: {
  onChange: (parameters: HybridRetrievalParameters) => void;
  parameters: HybridRetrievalParameters;
  results: Array<{ category: string; hybridScore: number; id: string; keywordScore: number; matchedTerms: string[]; title: string; vectorScore: number }>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <LabPanel title="可视化演示">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid grid-cols-[56px_minmax(180px,1fr)_84px_84px_92px] gap-2 bg-slate-50 px-4 py-3 text-xs font-extrabold text-slate-500">
            <span>#</span>
            <span>候选知识块</span>
            <span className="text-right">Vec</span>
            <span className="text-right">Kw</span>
            <span className="text-right">Final</span>
          </div>
          <div className="divide-y divide-slate-100">
            {results.map((item, index) => (
              <article className={`grid grid-cols-[56px_minmax(180px,1fr)_84px_84px_92px] gap-2 px-4 py-4 text-sm ${index === 0 ? "bg-emerald-50/70" : "bg-white"}`} key={item.id}>
                <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-extrabold ${index === 0 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {index + 1}
                </span>
                <span>
                  <span className="block font-extrabold text-slate-900">{item.title}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {item.matchedTerms.slice(0, 3).map((term) => (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700" key={term}>
                        {term}
                      </span>
                    ))}
                  </span>
                </span>
                <ScoreCell active={parameters.mode === "vector"} value={item.vectorScore} />
                <ScoreCell active={parameters.mode === "keyword"} value={item.keywordScore} />
                <ScoreCell active={parameters.mode === "hybrid"} value={item.hybridScore} />
              </article>
            ))}
          </div>
        </div>
      </LabPanel>
      <LabPanel title="参数选择">
        <ControlGroup label="检索问题">
          <div className="grid gap-2">
            {retrievalQueryPresets.map((item) => (
              <button
                className={`min-h-10 rounded-xl border px-3 text-left text-sm font-bold transition ${
                  parameters.query === item ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                }`}
                key={item}
                onClick={() => onChange({ ...parameters, query: item })}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </ControlGroup>
        <SegmentedControl
          label="召回模式"
          onChange={(mode) => onChange({ ...parameters, mode })}
          options={[
            ["vector", "向量"],
            ["keyword", "关键词"],
            ["hybrid", "混合"],
          ]}
          value={parameters.mode}
        />
        <button
          className={`mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-extrabold transition ${
            parameters.useAliases ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600"
          }`}
          onClick={() => onChange({ ...parameters, useAliases: !parameters.useAliases })}
          type="button"
        >
          {parameters.useAliases ? "已启用业务别名" : "启用业务别名"}
        </button>
        <RangeControl
          disabled={parameters.mode !== "hybrid"}
          label="向量权重"
          max={0.8}
          min={0.2}
          onChange={(value) => onChange({ ...parameters, vectorWeight: value })}
          step={0.1}
          suffix=""
          value={parameters.vectorWeight}
        />
      </LabPanel>
    </div>
  );
}

function EvaluationLayer({
  hitRate,
  observations,
  results,
}: {
  hitRate: number;
  observations: Array<{ layer: string; observation: string }>;
  results: Array<{ hybridScore: number; id: string; title: string }>;
}) {
  const metrics = [
    ["Hit Rate", `${Math.round(hitRate * 100)}%`, "Top-3 中达到可用阈值的比例"],
    ["Top-1", results[0]?.title ?? "暂无结果", "首位命中是否是学生真正需要的材料"],
    ["误召回", `${results.filter((item) => item.hybridScore < 0.55).length} 项`, "低分结果需要检查关键词、别名或过滤条件"],
  ];
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <LabPanel title="可视化演示">
        <div className="grid gap-4 lg:grid-cols-3">
          {metrics.map(([label, value, detail]) => (
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5" key={label}>
              <p className="text-xs font-extrabold text-slate-400">{label}</p>
              <p className="mt-3 text-2xl font-extrabold text-slate-950">{value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-slate-950 p-5">
          <p className="text-xs font-extrabold text-emerald-200">阶段四交接判断</p>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            如果 Hit Rate 低于 70%，先回到数据准备、分块和召回策略调整；如果 Top-1 命中但回答质量差，优先检查答案模板和引用约束。
          </p>
        </div>
      </LabPanel>
      <LabPanel title="观察记录">
        <div className="grid gap-3">
          {observations.map((item) => (
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={item.layer}>
              <p className="text-sm font-extrabold text-slate-900">{item.layer}</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">{item.observation}</p>
            </article>
          ))}
        </div>
      </LabPanel>
    </div>
  );
}

function LabPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2 text-slate-950">
        <SlidersHorizontal aria-hidden className="text-emerald-700" size={18} />
        <h3 className="text-base font-extrabold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function LabBlock({ children, icon, label }: { children: ReactNode; icon: ReactNode; label: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-emerald-700">
        {icon}
        <p className="text-xs font-extrabold">{label}</p>
      </div>
      <p className="mt-2 text-sm leading-7 text-slate-600">{children}</p>
    </div>
  );
}

function ControlGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-extrabold text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function RangeControl({
  disabled = false,
  label,
  max,
  min,
  onChange,
  step,
  suffix,
  value,
}: {
  disabled?: boolean;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  suffix: string;
  value: number;
}) {
  return (
    <label className={`mt-4 block ${disabled ? "opacity-45" : ""}`}>
      <span className="mb-2 flex items-center justify-between text-xs font-extrabold text-slate-400">
        <span>{label}</span>
        <span>{value}{suffix}</span>
      </span>
      <input
        className="w-full accent-emerald-600"
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

function SegmentedControl<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<[T, string]>;
  value: T;
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-extrabold text-slate-400">{label}</p>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
        {options.map(([optionValue, optionLabel]) => (
          <button
            className={`min-h-10 rounded-lg text-sm font-extrabold transition ${
              value === optionValue ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
            key={optionValue}
            onClick={() => onChange(optionValue)}
            type="button"
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreCell({ active, value }: { active: boolean; value: number }) {
  return (
    <span className={`self-start rounded-lg px-2 py-1 text-right font-mono text-sm font-extrabold ${active ? "bg-emerald-100 text-emerald-700" : "text-slate-500"}`}>
      {value.toFixed(2)}
    </span>
  );
}

function renderChunkedPreview(text: string, chunks: RagChunk[]): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastEnd = 0;
  for (const [index, chunk] of chunks.entries()) {
    if (chunk.startOffset > lastEnd) {
      nodes.push(<span key={`gap-${chunk.id}`}>{text.slice(lastEnd, chunk.startOffset)}</span>);
    }
    nodes.push(
      <mark className="rounded-md px-1 text-slate-950" key={chunk.id} style={{ backgroundColor: chunkColor(index) }}>
        {text.slice(chunk.startOffset, chunk.endOffset)}
      </mark>,
    );
    lastEnd = chunk.endOffset;
  }
  if (lastEnd < Math.min(text.length, 1200)) {
    nodes.push(<span key="tail">{text.slice(lastEnd, 1200)}</span>);
  }
  return nodes;
}

function calculateHitRate(results: Array<{ hybridScore: number }>): number {
  const topThree = results.slice(0, 3);
  if (topThree.length === 0) {
    return 0;
  }
  return topThree.filter((item) => item.hybridScore >= 0.62).length / topThree.length;
}

function layerKeyFromTitle(title: string): LabLayerKey {
  const map: Record<string, LabLayerKey> = {
    分块策略: "chunking",
    向量化与存储: "vector",
    召回策略: "retrieval",
    效果评估: "evaluation",
    数据准备: "data",
  };
  return map[title] ?? "data";
}

function toCanvas(point: [number, number]): [number, number] {
  return [40 + point[0] * 440, 380 - point[1] * 340];
}

function clusterColor(cluster: string): string {
  const colors: Record<string, string> = {
    检测规则: "#10b981",
    缺陷标准: "#f97316",
    设备维护: "#2563eb",
    质量记录: "#8b5cf6",
  };
  return colors[cluster] ?? "#64748b";
}

function chunkColor(index: number): string {
  return ["#dcfce7", "#dbeafe", "#fef3c7", "#ede9fe", "#fee2e2"][index % 5];
}
