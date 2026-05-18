import assert from "node:assert/strict";
import test from "node:test";

import {
  createCaseTeachingLessons,
  getCaseTeachingLesson,
  getDiagnosticRoute,
  summarizeCaseTeachingReadiness,
} from "./stage-three-case-teaching.ts";

test("case teaching exposes four lessons before student project work", () => {
  const lessons = createCaseTeachingLessons();

  assert.deepEqual(
    lessons.map((lesson) => lesson.key),
    ["data_quality", "chunking_failure", "retrieval_failure", "diagnostic_map"],
  );
  assert.equal(lessons.every((lesson) => lesson.badExample.length > 0 && lesson.goodExample.length > 0), true);
});

test("data quality lesson shows concrete bad and good signals", () => {
  const lesson = getCaseTeachingLesson("data_quality");

  assert.equal(lesson.badSignals.includes("批次号缺失"), true);
  assert.equal(lesson.goodSignals.includes("字段命名统一"), true);
  assert.equal(lesson.teachingPoint, "坏数据会让知识库把不完整、重复或不可追溯的信息当成事实。");
});

test("diagnostic route maps three failure types to causes and next action", () => {
  const miss = getDiagnosticRoute("retrieval_miss");
  const wrong = getDiagnosticRoute("retrieval_wrong");
  const poor = getDiagnosticRoute("answer_poor");

  assert.equal(miss.title, "召回不到");
  assert.equal(miss.primaryCheck, "先查数据是否入库，再查 chunk 是否保留关键字段。");
  assert.equal(wrong.causes.includes("相似但无关材料干扰"), true);
  assert.equal(poor.nextAction, "增加 overlap 或父子块，并要求回答引用完整上下文。");
});

test("case teaching readiness summarizes visited lessons without unlocking project decisions", () => {
  const summary = summarizeCaseTeachingReadiness(["data_quality", "retrieval_failure"]);

  assert.equal(summary.completedCount, 2);
  assert.equal(summary.totalCount, 4);
  assert.equal(summary.readyForProjectDecision, false);
  assert.equal(summary.note, "案例教学只建立直觉，不作为项目决策完成条件。");
});
