import type { Artifact } from "@/src/lib/api";

import { StatusPill } from "./common";
import { artifactDescription, formatTime, stageTone } from "./utils";

type ArtifactListProps = {
  artifacts: Artifact[];
  description?: string;
  emptyLabel: string;
  status?: string;
  statusFallback?: string;
  title: string;
};

export function ArtifactList({
  artifacts,
  description,
  emptyLabel,
  status,
  statusFallback = "locked",
  title,
}: ArtifactListProps) {
  return (
    <section className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-[color:var(--muted)]">{description}</p>
          ) : null}
        </div>
        {status !== undefined ? (
          <StatusPill label={status ?? statusFallback} tone={stageTone(status)} />
        ) : null}
      </div>
      <div className="mt-4 grid gap-3">
        {artifacts.length === 0 ? (
          <div className="empty-state text-sm text-[color:var(--muted)]">{emptyLabel}</div>
        ) : (
          artifacts.map((artifact) => (
            <article className="artifact-row" key={artifact.id}>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill label={artifact.artifact_type} tone="accent" />
                <span className="text-xs text-[color:var(--muted)]">
                  {formatTime(artifact.created_at)}
                </span>
              </div>
              <h3 className="mt-2 text-sm font-semibold">{artifact.title}</h3>
              <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                {artifactDescription(artifact)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
