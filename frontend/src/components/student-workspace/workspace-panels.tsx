import { LogIn, RefreshCw } from "lucide-react";
import type { FormEvent } from "react";

import type { Course, CurrentUser, ExperimentSession } from "@/src/lib/api";

import { InfoRow, StatusPill } from "./common";
import { stageLabel, stageTone } from "./utils";

type LoginPanelProps = {
  email: string;
  isLoggingIn: boolean;
  onEmailChange: (value: string) => void;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  onPasswordChange: (value: string) => void;
  password: string;
};

type WorkspacePanelProps = {
  artifactCount: number;
  course: Course | null;
  coursesCount: number;
  errorMessage: string;
  isBootstrapping: boolean;
  onRefresh: () => void;
  session: ExperimentSession | null;
  token: string | null;
  user: CurrentUser | null;
};

export function LoginPanel({
  email,
  isLoggingIn,
  onEmailChange,
  onLogin,
  onPasswordChange,
  password,
}: LoginPanelProps) {
  return (
    <section className="panel p-5">
      <h2 className="section-title">学生登录</h2>
      <form className="mt-4 space-y-3" onSubmit={onLogin}>
        <label className="field-label" htmlFor="email">
          邮箱
        </label>
        <input
          className="field-input"
          id="email"
          onChange={(event) => onEmailChange(event.target.value)}
          type="email"
          value={email}
        />
        <label className="field-label" htmlFor="password">
          密码
        </label>
        <input
          className="field-input"
          id="password"
          onChange={(event) => onPasswordChange(event.target.value)}
          type="password"
          value={password}
        />
        <button className="primary-button w-full" disabled={isLoggingIn} type="submit">
          <LogIn aria-hidden size={16} />
          {isLoggingIn ? "登录中" : "登录"}
        </button>
      </form>
    </section>
  );
}

export function WorkspacePanel({
  artifactCount,
  course,
  coursesCount,
  errorMessage,
  isBootstrapping,
  onRefresh,
  session,
  token,
  user,
}: WorkspacePanelProps) {
  return (
    <section className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="section-title">当前工作区</h2>
        <button
          className="icon-button"
          disabled={token === null || isBootstrapping}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw aria-hidden size={16} />
          刷新
        </button>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <InfoRow label="用户" value={user ? `${user.full_name} · ${user.role}` : "未登录"} />
        <InfoRow label="课程" value={course ? `${course.title} · ${course.code}` : "未就绪"} />
        <InfoRow label="Session" value={session?.id ?? "未创建"} />
        <InfoRow label="Session 状态" value={session?.status ?? "未就绪"} />
        <InfoRow label="课程数" value={`${coursesCount}`} />
        <InfoRow label="Artifact" value={`${artifactCount}`} />
      </dl>
      <StageStatusList session={session} />
      {errorMessage ? (
        <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
    </section>
  );
}

function StageStatusList({ session }: { session: ExperimentSession | null }) {
  return (
    <div className="mt-4 border-t border-[color:var(--border)] pt-4">
      <h3 className="text-sm font-semibold text-[color:var(--foreground)]">五阶段状态</h3>
      <div className="mt-3 grid gap-2">
        {session?.stage_records
          .slice()
          .sort((left, right) => left.stage_order - right.stage_order)
          .map((record) => (
            <div
              className="flex items-center justify-between gap-3 rounded border border-[color:var(--border)] bg-white px-3 py-2 text-sm"
              key={record.id}
            >
              <span>{stageLabel(record.stage_key)}</span>
              <StatusPill label={record.status} tone={stageTone(record.status)} />
            </div>
          )) ?? (
          <div className="empty-state text-sm text-[color:var(--muted)]">
            登录后显示阶段状态
          </div>
        )}
      </div>
    </div>
  );
}
