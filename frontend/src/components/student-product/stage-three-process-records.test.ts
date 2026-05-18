import assert from "node:assert/strict";
import test from "node:test";

import {
  createCaseStudyRecordPayload,
  createLabExperimentRecordPayload,
} from "./stage-three-process-records.ts";
import type { CaseTeachingLessonKey } from "./stage-three-case-teaching.ts";
import type { LayerObservation } from "./stage-three-rag-lab.ts";

test("case study record payload keeps visited lessons and diagnostic summary", () => {
  const visitedLessons: CaseTeachingLessonKey[] = [
    "data_quality",
    "chunking_failure",
    "retrieval_failure",
    "diagnostic_map",
  ];

  const payload = createCaseStudyRecordPayload(visitedLessons);

  assert.deepEqual(payload.visited_lesson_keys, visitedLessons);
  assert.equal(payload.key_takeaways.length, 4);
  assert.match(payload.diagnostic_summary, /召回不到/);
});

test("lab experiment record payload serializes five layer observations and selected parameters", () => {
  const observations: LayerObservation[] = [
    { layer: "数据准备", knowledgePoint: "先判断知识源。", observation: "材料覆盖 SOP。" },
    { layer: "分块策略", knowledgePoint: "分块保留上下文。", observation: "结构化分块更稳。" },
    { layer: "向量化与存储", knowledgePoint: "Embedding 建立语义空间。", observation: "形成语义簇。" },
    { layer: "召回策略", knowledgePoint: "混合召回平衡相似和精确。", observation: "Top-1 命中。" },
    { layer: "效果评估", knowledgePoint: "评估失败类型。", observation: "Hit Rate 80%。" },
  ];

  const payload = createLabExperimentRecordPayload({
    chunking: { chunkSize: 120, overlap: 20, parentChild: true, strategy: "structural" },
    documentId: "qa-sop",
    hitRate: 0.8,
    observations,
    retrieval: {
      category: "all",
      mode: "hybrid",
      query: "AOI 误判复判",
      useAliases: true,
      vectorWeight: 0.4,
    },
    topResultTitle: "AOI 复判规则",
    vectorQuery: "AOI 误判复判怎么处理",
  });

  assert.deepEqual(
    payload.observations.map((item) => item.layer),
    ["数据准备", "分块策略", "向量化与存储", "召回策略", "效果评估"],
  );
  assert.deepEqual(payload.selected_parameters.chunking, {
    chunk_size: 120,
    overlap: 20,
    parent_child: true,
    strategy: "structural",
  });
  assert.deepEqual(payload.selected_parameters.retrieval, {
    category: "all",
    mode: "hybrid",
    query: "AOI 误判复判",
    use_aliases: true,
    vector_weight: 0.4,
  });
  assert.equal(payload.selected_parameters.hit_rate, 0.8);
});
