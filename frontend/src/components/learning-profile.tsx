import type { LearningProfile } from "@/src/lib/api";

import { StatusPill } from "./student-workspace/common";
import { stageLabel, stageTone } from "./student-workspace/utils";

type LearningProfilePanelProps = {
  isLoading: boolean;
  profile: LearningProfile | null;
  subtitle?: string;
  title?: string;
};

export function LearningProfilePanel({
  isLoading,
  profile,
  subtitle,
  title = "学习画像",
}: LearningProfilePanelProps) {
  const artifactTotal = profile
    ? Object.values(profile.artifact_count_by_stage).reduce((sum, count) => sum + count, 0)
    : 0;
  const aiReviewTotal = profile
    ? Object.values(profile.ai_review_count_by_stage).reduce((sum, count) => sum + count, 0)
    : 0;
  const completionPercent = profile ? Math.round(profile.completion_ratio * 100) : 0;

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {subtitle ?? (profile ? profile.student.full_name : "请选择 session")}
          </p>
        </div>
        <StatusPill
          label={isLoading ? "loading" : profile ? `${completionPercent}%` : "未加载"}
          tone={profile?.session_status === "completed" ? "accent" : "normal"}
        />
      </div>

      {profile === null ? (
        <div className="empty-state mt-4 text-sm text-[color:var(--muted)]">
          {isLoading ? "正在加载学习画像" : "暂无学习画像"}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Metric label="阶段完成" value={`${profile.completed_stage_count}/${profile.total_stage_count}`} />
            <Metric label="Artifact" value={`${artifactTotal}`} />
            <Metric label="AI 反馈" value={`${aiReviewTotal}`} />
          </div>

          <div className="grid gap-2">
            {profile.stage_status_summary.map((stage) => (
              <div
                className="grid gap-2 rounded border border-[color:var(--border)] bg-white px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"
                key={stage.stage_key}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[color:var(--foreground)]">
                    {stageLabel(stage.stage_key)}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">
                    Artifact {profile.artifact_count_by_stage[stage.stage_key] ?? 0} · AI 反馈{" "}
                    {profile.ai_review_count_by_stage[stage.stage_key] ?? 0}
                  </p>
                </div>
                <StatusPill label={stage.status} tone={stageTone(stage.status)} />
              </div>
            ))}
          </div>

          <ProfileList emptyLabel="暂无明确优势信号" items={profile.strengths} title="优势" />
          <ProfileList emptyLabel="暂无规则风险" items={profile.risks} title="风险" />
          <ProfileList
            emptyLabel="暂无下一步建议"
            items={profile.next_suggestions}
            title="下一步"
          />
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2">
      <p className="text-xs font-semibold text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[color:var(--foreground)]">{value}</p>
    </div>
  );
}

function ProfileList({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: string[];
  title: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-[color:var(--muted)]">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[color:var(--muted)]">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
