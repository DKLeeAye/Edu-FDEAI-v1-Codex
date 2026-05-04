import type { Artifact } from "@/src/lib/api";

import type { StatusTone } from "./types";

export function lines(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function artifactDescription(artifact: Artifact): string {
  if (artifact.artifact_type === "stage_1_interview_turn") {
    return [
      stringValue(artifact.content_json.user_message),
      stringValue(artifact.content_json.ai_customer_response),
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (artifact.artifact_type === "stage_1_problem_summary") {
    return stringValue(artifact.content_json.problem_statement);
  }

  if (artifact.artifact_type === "stage_2_solution_definition") {
    return [
      stringValue(artifact.content_json.solution_title),
      stringValue(artifact.content_json.problem_summary),
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (artifact.artifact_type === "stage_2_ai_review") {
    return [
      stringValue(artifact.content_json.feasibility_judgement),
      stringValue(artifact.content_json.review_summary),
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (artifact.artifact_type === "stage_3_knowledge_decision") {
    return [
      stringValue(artifact.content_json.knowledge_goal),
      stringValue(artifact.content_json.selected_strategy),
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (artifact.artifact_type === "stage_3_ai_review") {
    return [
      stringValue(artifact.content_json.strategy_fit),
      stringValue(artifact.content_json.stage_4_readiness),
      stringValue(artifact.content_json.review_summary),
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (artifact.artifact_type === "stage_4_dify_implementation") {
    return [
      stringValue(artifact.content_json.dify_app_name),
      stringValue(artifact.content_json.app_mode),
      stringValue(artifact.content_json.dify_app_url),
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (artifact.artifact_type === "stage_4_test_report") {
    return [
      stringValue(artifact.content_json.test_goal),
      stringValue(artifact.content_json.overall_result),
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (artifact.artifact_type === "stage_4_ai_test_review") {
    return [
      stringValue(artifact.content_json.release_readiness),
      stringValue(artifact.content_json.review_summary),
    ]
      .filter(Boolean)
      .join(" / ");
  }

  return JSON.stringify(artifact.content_json);
}

export function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function stringListValue(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function stageLabel(stageKey: string): string {
  const labels: Record<string, string> = {
    stage_1: "阶段一",
    stage_2: "阶段二",
    stage_3: "阶段三",
    stage_4: "阶段四",
    stage_5: "阶段五",
  };
  return `${labels[stageKey] ?? stageKey} · ${stageKey}`;
}

export function stageTone(status: string | undefined): StatusTone {
  if (status === "completed" || status === "in_practice" || status === "not_started") {
    return "accent";
  }
  if (status === "revision_required") {
    return "danger";
  }
  return "normal";
}
