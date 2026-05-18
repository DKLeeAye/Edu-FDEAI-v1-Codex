import type {
  StageThreeCaseStudyRecordPayload,
  StageThreeLabExperimentRecordPayload,
} from "@/src/lib/api";

import {
  createCaseTeachingLessons,
  type CaseTeachingLessonKey,
} from "./stage-three-case-teaching.ts";
import type {
  ChunkingParameters,
  HybridRetrievalParameters,
  LayerObservation,
} from "./stage-three-rag-lab.ts";

export function createCaseStudyRecordPayload(
  visitedLessons: CaseTeachingLessonKey[],
): StageThreeCaseStudyRecordPayload {
  const visited = new Set(visitedLessons);
  const lessons = createCaseTeachingLessons().filter((lesson) => visited.has(lesson.key));
  return {
    diagnostic_summary:
      "已完成坏数据、坏分块、坏召回和三类诊断问题的案例学习；后续项目决策应先区分召回不到、召回错了、召回对了但答案质量差，再决定调数据、分块还是召回。",
    key_takeaways: lessons.map((lesson) => lesson.teachingPoint),
    visited_lesson_keys: lessons.map((lesson) => lesson.key),
  };
}

export function createLabExperimentRecordPayload({
  chunking,
  documentId,
  hitRate,
  observations,
  retrieval,
  topResultTitle,
  vectorQuery,
}: {
  chunking: ChunkingParameters;
  documentId: string;
  hitRate: number;
  observations: LayerObservation[];
  retrieval: HybridRetrievalParameters;
  topResultTitle: string;
  vectorQuery: string;
}): StageThreeLabExperimentRecordPayload {
  return {
    observations: observations.map((observation) => ({
      knowledge_point: observation.knowledgePoint,
      layer: observation.layer,
      observation: observation.observation,
    })),
    selected_parameters: {
      chunking: {
        chunk_size: chunking.chunkSize,
        overlap: chunking.overlap,
        parent_child: chunking.parentChild,
        strategy: chunking.strategy,
      },
      document_id: documentId,
      hit_rate: hitRate,
      retrieval: {
        category: retrieval.category,
        mode: retrieval.mode,
        query: retrieval.query,
        use_aliases: retrieval.useAliases,
        vector_weight: retrieval.vectorWeight,
      },
      top_result_title: topResultTitle,
      vector_query: vectorQuery,
    },
  };
}
