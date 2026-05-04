import type { Artifact } from "@/src/lib/api";

import type { StatusTone } from "./types";
import { shortId, stringListValue, stringValue } from "./utils";

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-normal text-[color:var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 break-all text-[color:var(--foreground)]">{value}</dd>
    </div>
  );
}

export function TextField({
  disabled = false,
  label,
  onChange,
  rows = 3,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  rows?: number;
  value: string;
}) {
  const id = label.replace(/\s+/g, "-");
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        className="field-textarea"
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
    </div>
  );
}

export function StatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  const className =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "accent"
        ? "border-teal-200 bg-teal-50 text-teal-800"
        : "border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--muted)]";
  return <span className={`status-pill ${className}`}>{label}</span>;
}

export function ReviewSummary({ artifact }: { artifact: Artifact }) {
  const content = artifact.content_json;
  const keyRisks = stringListValue(content.key_risks);
  const improvements = stringListValue(content.suggested_improvements);
  const aiCallLogId = stringValue(content.ai_call_log_id);
  return (
    <article className="rounded border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label="AI 评审" tone="accent" />
        {aiCallLogId ? (
          <span className="text-xs text-[color:var(--muted)]">AI Log {shortId(aiCallLogId)}</span>
        ) : null}
      </div>
      <p className="mt-2 font-semibold text-[color:var(--foreground)]">
        {stringValue(content.feasibility_judgement) || "未返回可行性判断"}
      </p>
      <p className="mt-2 leading-6 text-[color:var(--muted)]">
        {stringValue(content.review_summary)}
      </p>
      {keyRisks.length > 0 ? <ReviewList items={keyRisks} title="关键风险" /> : null}
      {improvements.length > 0 ? <ReviewList items={improvements} title="改进建议" /> : null}
    </article>
  );
}

export function KnowledgeReviewSummary({ artifact }: { artifact: Artifact }) {
  const content = artifact.content_json;
  const missingKnowledgeRisks = stringListValue(content.missing_knowledge_risks);
  const dataQualityWarnings = stringListValue(content.data_quality_warnings);
  const improvements = stringListValue(content.suggested_improvements);
  const aiCallLogId = stringValue(content.ai_call_log_id);
  return (
    <article className="rounded border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label="AI 决策评审" tone="accent" />
        {aiCallLogId ? (
          <span className="text-xs text-[color:var(--muted)]">AI Log {shortId(aiCallLogId)}</span>
        ) : null}
      </div>
      <p className="mt-2 font-semibold text-[color:var(--foreground)]">
        策略匹配度：{stringValue(content.strategy_fit) || "未返回"}
      </p>
      <p className="mt-1 font-semibold text-[color:var(--foreground)]">
        阶段四准备度：{stringValue(content.stage_4_readiness) || "未返回"}
      </p>
      <p className="mt-2 leading-6 text-[color:var(--muted)]">
        {stringValue(content.review_summary)}
      </p>
      {missingKnowledgeRisks.length > 0 ? (
        <ReviewList title="知识缺口风险" items={missingKnowledgeRisks} />
      ) : null}
      {dataQualityWarnings.length > 0 ? (
        <ReviewList title="数据质量警示" items={dataQualityWarnings} />
      ) : null}
      {improvements.length > 0 ? <ReviewList title="改进建议" items={improvements} /> : null}
    </article>
  );
}

export function ReviewList({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="mt-3">
      <p className="font-semibold text-[color:var(--foreground)]">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-[color:var(--muted)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
