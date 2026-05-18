import assert from "node:assert/strict";
import test from "node:test";

import {
  chunkManufacturingDocument,
  createLayerObservationSnapshot,
  rankVectorNeighbors,
  runHybridRetrieval,
} from "./stage-three-rag-lab.ts";

test("manufacturing document chunking preserves structure and parent-child context", () => {
  const chunks = chunkManufacturingDocument("qa-sop", {
    chunkSize: 120,
    overlap: 20,
    parentChild: true,
    strategy: "structural",
  });

  const parentChunks = chunks.filter((chunk) => chunk.kind === "parent");
  const childChunks = chunks.filter((chunk) => chunk.kind !== "parent");

  assert.equal(parentChunks.length, 3);
  assert.equal(childChunks.length >= 6, true);
  assert.equal(childChunks[0].sectionPath[0], "第一章 来料检验");
  assert.equal(childChunks.some((chunk) => chunk.parentId === parentChunks[0].id), true);
});

test("vector neighbor ranking moves query toward the expected quality cluster", () => {
  const results = rankVectorNeighbors("AOI 误判复判怎么处理", 3);

  assert.equal(results.length, 3);
  assert.equal(results[0].id, "aoi-review-rule");
  assert.equal(results[0].similarity > results[1].similarity, true);
  assert.equal(results[0].cluster, "检测规则");
});

test("hybrid retrieval combines aliases and vector score deterministically", () => {
  const withoutAliases = runHybridRetrieval({
    category: "all",
    mode: "hybrid",
    query: "外观缺陷判定",
    useAliases: false,
    vectorWeight: 0.4,
  });
  const withAliases = runHybridRetrieval({
    category: "all",
    mode: "hybrid",
    query: "外观缺陷判定",
    useAliases: true,
    vectorWeight: 0.4,
  });

  assert.equal(withAliases[0].id, "appearance-defect-standard");
  assert.equal(withAliases[0].matchedTerms.includes("划伤"), true);
  assert.equal(withAliases[0].hybridScore > withoutAliases[0].hybridScore, true);
});

test("layer observation snapshot exposes the five required lab layers", () => {
  const snapshot = createLayerObservationSnapshot({
    chunkCount: 9,
    hitRate: 0.82,
    topResultTitle: "外观缺陷判定标准",
  });

  assert.deepEqual(
    snapshot.map((item) => item.layer),
    ["数据准备", "分块策略", "向量化与存储", "召回策略", "效果评估"],
  );
  assert.equal(snapshot[1].observation, "当前参数生成 9 个知识块，需检查标题层级是否被保留。");
  assert.equal(snapshot[4].observation, "Hit Rate 82%，首位命中：外观缺陷判定标准。");
});
