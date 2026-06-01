import { BookOpen, BriefcaseBusiness, FolderKanban, LogOut, RefreshCw, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import type { CurrentUser } from "@/src/lib/api";

import { roleCopy } from "./terminology";
import { BrandMark, StatusBadge } from "./ui";

type AppArea = "courses" | "workspace" | "profile" | "portfolio";

type AppShellProps = {
  actions?: ReactNode;
  children: ReactNode;
  currentArea: AppArea;
  errorMessage: string;
  isRefreshing: boolean;
  onLogout: () => void;
  onNavigate: (area: AppArea) => void;
  onRefresh: () => void;
  statusMessage: string;
  user: CurrentUser | null;
  variant?: "full" | "compact" | "immersive";
};

const navItems: Array<{
  area: AppArea;
  icon: ReactNode;
  label: string;
}> = [
  { area: "courses", icon: <BookOpen aria-hidden size={18} />, label: "实验课程" },
  { area: "workspace", icon: <BriefcaseBusiness aria-hidden size={18} />, label: "我的项目" },
  { area: "profile", icon: <UserRound aria-hidden size={18} />, label: "学习画像" },
  { area: "portfolio", icon: <FolderKanban aria-hidden size={18} />, label: "项目档案袋" },
];

export function AppShell({
  actions,
  children,
  currentArea,
  errorMessage,
  isRefreshing,
  onLogout,
  onNavigate,
  onRefresh,
  statusMessage,
  user,
  variant = "full",
}: AppShellProps) {
  if (variant === "immersive") {
    return <>{children}</>;
  }

  const compact = variant === "compact";

  return (
    <div
      className={`min-h-screen bg-[#f7f8fb] text-slate-950 ${
        compact ? "lg:grid lg:grid-cols-[76px_1fr]" : "lg:grid lg:grid-cols-[248px_1fr]"
      }`}
    >
      <aside
        className={`hidden bg-slate-950 text-slate-100 lg:flex ${
          compact ? "items-center px-3 py-4" : "px-5 py-6"
        } flex-col`}
      >
        <div className={compact ? "flex flex-col items-center gap-4" : "w-full"}>
          <div
            className={`flex items-center ${
              compact ? "justify-center" : "gap-3"
            } font-extrabold tracking-normal`}
          >
            <BrandMark size={compact ? "lg" : "md"} />
            {compact ? null : <span className="text-lg">EduFDE</span>}
          </div>
          <nav className={`${compact ? "mt-2 grid gap-2" : "mt-8 grid w-full gap-2"}`}>
            {navItems.map((item) => {
              const active = item.area === currentArea;
              return (
                <button
                  className={`group flex items-center rounded-2xl text-sm font-bold transition ${
                    compact
                      ? "h-12 w-12 justify-center"
                      : "min-h-11 justify-start gap-3 px-3"
                  } ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/10 hover:text-slate-100"
                  }`}
                  key={item.area}
                  onClick={() => onNavigate(item.area)}
                  title={item.label}
                  type="button"
                >
                  <span className={active && compact ? "text-emerald-300" : ""}>{item.icon}</span>
                  {compact ? null : <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div
          className={
            compact
              ? "mt-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-sm font-extrabold text-emerald-700"
              : "mt-auto w-full border-t border-white/10 pt-4 text-xs leading-6 text-slate-400"
          }
          title={user?.full_name ?? "未登录"}
        >
          {compact ? (
            user?.full_name?.slice(0, 1) ?? "学"
          ) : (
            <>
              <p className="font-bold text-slate-200">{user?.full_name ?? "未登录"}</p>
              <p>{roleCopy(user?.role)}</p>
            </>
          )}
        </div>
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
          <div className="px-5 py-4 lg:px-7">
            <div className="flex min-h-10 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-500">学生端 / {areaLabel(currentArea)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={errorMessage ? errorMessage : statusMessage}
                    tone={errorMessage ? "danger" : "default"}
                  />
                  {user ? <StatusBadge label={roleCopy(user.role)} tone="info" /> : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {actions}
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isRefreshing}
                  onClick={onRefresh}
                  type="button"
                >
                  <RefreshCw aria-hidden size={16} />
                  刷新
                </button>
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700"
                  onClick={onLogout}
                  type="button"
                >
                  <LogOut aria-hidden size={16} />
                  退出
                </button>
              </div>
            </div>
            <nav className="mt-3 grid grid-cols-4 gap-2 lg:hidden">
              {navItems.map((item) => {
                const active = item.area === currentArea;
                return (
                  <button
                    className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-extrabold transition ${
                      active
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
                    }`}
                    key={item.area}
                    onClick={() => onNavigate(item.area)}
                    title={item.label}
                    type="button"
                  >
                    {item.icon}
                    <span>{compactNavLabel(item.label)}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function areaLabel(area: AppArea): string {
  const labels: Record<AppArea, string> = {
    courses: "实验课程",
    workspace: "我的项目",
    profile: "学习画像",
    portfolio: "项目档案袋",
  };
  return labels[area];
}

function compactNavLabel(label: string): string {
  const labels: Record<string, string> = {
    实验课程: "课程",
    我的项目: "项目",
    学习画像: "画像",
    项目档案袋: "档案袋",
  };
  return labels[label] ?? label;
}
