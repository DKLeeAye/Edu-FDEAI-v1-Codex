import { GraduationCap, LogIn, ShieldCheck, UserCog } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

import { stageDefinitions } from "./terminology";
import { BrandMark } from "./ui";

export type DemoRole = "student" | "teacher" | "admin";

type LoginScreenProps = {
  email: string;
  errorMessage: string;
  isLoggingIn: boolean;
  onEmailChange: (value: string) => void;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  onPasswordChange: (value: string) => void;
  onRoleSelect: (role: DemoRole) => void;
  password: string;
  selectedRole: DemoRole;
  statusMessage: string;
};

const roleOptions: Array<{
  description: string;
  icon: ReactNode;
  label: string;
  role: DemoRole;
}> = [
  {
    description: "实验课程与五阶段项目",
    icon: <GraduationCap aria-hidden size={18} />,
    label: "学生",
    role: "student",
  },
  {
    description: "课程进度与学生证据",
    icon: <ShieldCheck aria-hidden size={18} />,
    label: "教师",
    role: "teacher",
  },
  {
    description: "实验包与组织配置",
    icon: <UserCog aria-hidden size={18} />,
    label: "管理",
    role: "admin",
  },
];

export function LoginScreen({
  email,
  errorMessage,
  isLoggingIn,
  onEmailChange,
  onLogin,
  onPasswordChange,
  onRoleSelect,
  password,
  selectedRole,
  statusMessage,
}: LoginScreenProps) {
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <div className="grid min-h-screen gap-7 p-3 lg:grid-cols-[minmax(560px,1.08fr)_minmax(430px,.92fr)] lg:p-7">
        <section className="flex min-h-[620px] flex-col overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(26,33,44,.10)] backdrop-blur-2xl sm:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-lg font-extrabold">
              <BrandMark />
              EduFDE
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700">
              MVP 演示环境
            </span>
          </div>

          <div className="mt-16 max-w-3xl">
            <h1 className="max-w-3xl text-5xl font-extrabold leading-[.99] tracking-normal text-slate-950 sm:text-6xl xl:text-7xl">
              AI 智能体项目交付实训平台
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              围绕真实项目交付，把需求访谈、方案定义、知识工程、智能体实现、交付验收沉淀为可复盘的学习证据链。
            </p>
          </div>

          <div className="mt-8 grid gap-2 md:grid-cols-5">
            {stageDefinitions.map((stage) => (
              <div
                className="flex min-h-24 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4"
                key={stage.key}
              >
                <span className="text-xs font-extrabold text-slate-400">
                  {String(stage.order).padStart(2, "0")}
                </span>
                <strong className="mt-4 text-sm font-extrabold leading-5 text-slate-900">
                  {stage.shortTitle}
                </strong>
              </div>
            ))}
          </div>

          <div className="mt-auto grid gap-4 pt-8 xl:grid-cols-[1fr_260px]">
            <div className="rounded-[22px] bg-slate-950 p-5 text-white shadow-[0_22px_54px_rgba(16,23,34,.20)]">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>制造业质检 AI 项目实训</span>
                <span>3 / 5 阶段</span>
              </div>
              <div className="mt-5 grid grid-cols-5 gap-1.5">
                {stageDefinitions.map((stage) => (
                  <span
                    className={`h-2 rounded-full ${
                      stage.order <= 3 ? "bg-emerald-400" : "bg-slate-700"
                    }`}
                    key={stage.key}
                  />
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-4">
                <h3 className="text-base font-extrabold">知识工程决策</h3>
                <div className="mt-4 h-2 rounded-full bg-slate-700" />
                <div className="mt-3 h-2 rounded-full bg-slate-700" />
                <div className="mt-3 h-2 w-7/12 rounded-full bg-slate-700" />
              </div>
              <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900 p-4">
                <h3 className="text-base font-extrabold">评审反馈与阶段产物</h3>
                <div className="mt-4 h-2 rounded-full bg-slate-700" />
                <div className="mt-3 h-2 w-8/12 rounded-full bg-slate-700" />
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-5">
              <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-[conic-gradient(#14b8a6_0_82%,#e8edf2_82%_100%)] text-2xl font-extrabold">
                <span className="grid h-[88px] w-[88px] place-items-center rounded-full bg-white">82%</span>
              </div>
              <h3 className="mt-4 text-center text-base font-extrabold">项目交付能力画像</h3>
              <p className="mt-2 text-center text-sm leading-6 text-slate-500">
                从阶段状态、项目证据和评审反馈中生成可解释的学习进展。
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center rounded-[24px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_24px_80px_rgba(26,33,44,.10)] backdrop-blur-2xl sm:p-8">
          <div className="mx-auto w-full max-w-md">
            <form
              className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(26,33,44,.08)]"
              onSubmit={onLogin}
            >
              <div>
                <h2 className="text-3xl font-extrabold leading-tight">登录 EduFDE</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  使用学校或演示账号进入平台。登录后系统会根据账号角色打开对应工作区。
                </p>
              </div>

              <label className="mt-5 block text-sm font-extrabold text-slate-700" htmlFor="email">
                邮箱
              </label>
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                id="email"
                onChange={(event) => onEmailChange(event.target.value)}
                type="email"
                value={email}
              />

              <label
                className="mt-4 block text-sm font-extrabold text-slate-700"
                htmlFor="password"
              >
                密码
              </label>
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                id="password"
                onChange={(event) => onPasswordChange(event.target.value)}
                type="password"
                value={password}
              />

              <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                <span>记住本次演示账号</span>
                <button
                  className="text-emerald-700 hover:text-emerald-800"
                  onClick={() => onRoleSelect(selectedRole)}
                  type="button"
                >
                  使用演示账号
                </button>
              </div>

              <button
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoggingIn}
                type="submit"
              >
                <LogIn aria-hidden size={17} />
                {isLoggingIn ? "登录中" : "登录"}
              </button>

              {errorMessage ? (
                <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  {errorMessage}
                </p>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-500">{statusMessage}</p>
              )}
            </form>

            <div className="mt-5">
              <div className="flex items-center justify-between text-sm">
                <strong className="text-slate-700">演示入口</strong>
                <span className="font-bold text-slate-400">选择后填充对应账号</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {roleOptions.map((option) => {
                  const active = option.role === selectedRole;
                  return (
                    <button
                      className={`relative min-h-28 rounded-[18px] border bg-white p-4 text-left transition ${
                        active
                          ? "border-emerald-400 shadow-[0_0_0_4px_rgba(20,184,166,.12)]"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      key={option.role}
                      onClick={() => onRoleSelect(option.role)}
                      type="button"
                    >
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-xl ${
                          option.role === "student"
                            ? "bg-emerald-50 text-emerald-700"
                            : option.role === "teacher"
                              ? "bg-sky-50 text-sky-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {option.icon}
                      </span>
                      <strong className="mt-3 block text-sm font-extrabold text-slate-900">
                        {option.label}
                      </strong>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-500">
              学生登录后进入实验课程列表，再从课程进入五阶段实验主页。角色选择只用于演示账号填充，真实权限以后端用户角色为准。
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
