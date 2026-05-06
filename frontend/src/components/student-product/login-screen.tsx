import { GraduationCap, LogIn, ShieldCheck, UserCog } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

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

const stageHighlights = [
  {
    detail: "像项目顾问一样追问客户背景、真实约束和隐藏诉求。",
    metric: "访谈线索",
  },
  {
    detail: "把需求整理为可交付范围，并判断方案是否值得继续投入。",
    metric: "方案判断",
  },
  {
    detail: "选择资料来源、分块策略、召回路径和评估方式。",
    metric: "知识策略",
  },
  {
    detail: "记录 Dify 构建过程，围绕真实问题完成测试和修正。",
    metric: "实现证据",
  },
  {
    detail: "沉淀交付说明、验收材料和后续运维边界。",
    metric: "项目档案",
  },
];

const deliveryCards = [
  {
    caption: "客户访谈记录",
    detail: "一线质检主管反馈审厂前材料追溯压力集中，异常原因定位依赖人工经验。",
    stage: "1 / 5 阶段",
    title: "需求访谈与问题发现",
  },
  {
    caption: "方案可行性评审",
    detail: "系统建议先限定质检异常追溯场景，把数据质量和一线使用阻力列为交付风险。",
    stage: "2 / 5 阶段",
    title: "方案定义与可行性判断",
  },
  {
    caption: "知识工程决策",
    detail: "选择质检规范、MES 异常记录和审厂材料作为知识来源，明确召回与评估策略。",
    stage: "3 / 5 阶段",
    title: "知识工程决策",
  },
  {
    caption: "智能体测试反馈",
    detail: "围绕审厂追溯、异常问答和记录解释完成测试，沉淀修正项和验收证据。",
    stage: "4 / 5 阶段",
    title: "智能体实现与测试",
  },
  {
    caption: "交付验收档案",
    detail: "形成交付说明、验收记录和运维边界，项目过程可以被教师和学生复盘。",
    stage: "5 / 5 阶段",
    title: "交付验收与运维说明",
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
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [activeDeliveryIndex, setActiveDeliveryIndex] = useState(0);
  const activeStage = stageDefinitions[activeStageIndex] ?? stageDefinitions[0];
  const activeStageHighlight = stageHighlights[activeStageIndex] ?? stageHighlights[0];
  const nextStage = stageDefinitions[(activeStageIndex + 1) % stageDefinitions.length];
  const activeDeliveryCard = deliveryCards[activeDeliveryIndex] ?? deliveryCards[0];
  const completedPercent = useMemo(
    () => Math.round(((activeStageIndex + 1) / stageDefinitions.length) * 100),
    [activeStageIndex],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStageIndex((current) => (current + 1) % stageDefinitions.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveDeliveryIndex((current) => (current + 1) % deliveryCards.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="min-h-dvh bg-[#f4f7fb] text-slate-950 lg:h-dvh lg:overflow-hidden">
      <div className="grid min-h-dvh gap-4 p-3 lg:h-dvh lg:grid-cols-[minmax(600px,1.04fr)_minmax(430px,.96fr)] lg:p-5">
        <section className="flex min-h-[620px] flex-col overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_24px_80px_rgba(20,30,48,.10)] backdrop-blur-2xl lg:h-full lg:min-h-0 xl:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-lg font-extrabold">
              <BrandMark />
              EduFDE
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700">
              MVP 演示环境
            </span>
          </div>

          <div className="mt-10 max-w-4xl xl:mt-12">
            <h1 className="whitespace-nowrap text-[clamp(2.25rem,3.35vw,4.05rem)] font-black leading-[1.03] tracking-normal text-slate-950">
              AI 智能体项目交付实训平台
            </h1>
            <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-slate-600 xl:text-lg xl:leading-8">
              围绕真实项目交付，把需求访谈、方案定义、知识工程、智能体实现、交付验收沉淀为可复盘的学习证据链。
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(20,30,48,.06)]">
            <div className="grid min-h-[166px] gap-4 p-4 md:grid-cols-[1fr_180px] xl:min-h-[178px] xl:p-5">
              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-sm font-black text-emerald-700">
                      {String(activeStage.order).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[.18em] text-slate-400">
                        五阶段方法论
                      </p>
                      <h2 className="mt-1 text-2xl font-black leading-none text-slate-950">
                        {activeStage.title}
                      </h2>
                    </div>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-slate-600 xl:text-base xl:leading-7">
                    {activeStageHighlight.detail}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {stageDefinitions.map((stage, index) => (
                    <button
                      aria-label={`查看${stage.shortTitle}`}
                      className={`h-2.5 flex-1 rounded-full transition ${
                        index === activeStageIndex ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                      key={stage.key}
                      onClick={() => setActiveStageIndex(index)}
                      type="button"
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-[18px] bg-slate-950 p-4 text-white">
                <p className="text-xs font-bold text-slate-400">当前能力证据</p>
                <p className="mt-2 text-2xl font-black">{activeStageHighlight.metric}</p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-[width]"
                    style={{ width: `${completedPercent}%` }}
                  />
                </div>
                <p className="mt-4 text-xs font-bold leading-5 text-slate-400">
                  下一步：{nextStage.shortTitle}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-auto grid gap-4 pt-5 xl:grid-cols-[1fr_230px]">
            <div className="overflow-hidden rounded-[22px] bg-slate-950 p-4 text-white shadow-[0_22px_54px_rgba(16,23,34,.20)] xl:p-5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>制造业质检 AI 项目实训</span>
                <span>{activeDeliveryCard.stage}</span>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-1.5">
                {deliveryCards.map((card, index) => (
                  <span
                    className={`h-2 rounded-full ${
                      index <= activeDeliveryIndex ? "bg-emerald-400" : "bg-slate-700"
                    }`}
                    key={card.title}
                  />
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900 p-4 transition">
                <p className="text-xs font-extrabold text-emerald-300">
                  {activeDeliveryCard.caption}
                </p>
                <h3 className="mt-2 text-lg font-extrabold leading-6">
                  {activeDeliveryCard.title}
                </h3>
                <p className="mt-4 min-h-[72px] text-sm font-medium leading-6 text-slate-300">
                  {activeDeliveryCard.detail}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  {deliveryCards.map((card, index) => (
                    <button
                      aria-label={`查看${card.title}`}
                      className={`h-2 rounded-full transition ${
                        index === activeDeliveryIndex
                          ? "w-8 bg-emerald-400"
                          : "w-2.5 bg-slate-700 hover:bg-slate-600"
                      }`}
                      key={card.title}
                      onClick={() => setActiveDeliveryIndex(index)}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-4 xl:p-5">
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[conic-gradient(#14b8a6_0_82%,#e8edf2_82%_100%)] text-2xl font-extrabold">
                <span className="grid h-[74px] w-[74px] place-items-center rounded-full bg-white">82%</span>
              </div>
              <h3 className="mt-4 text-center text-base font-extrabold">项目交付能力画像</h3>
              <p className="mt-2 text-center text-sm leading-6 text-slate-500">
                从阶段状态、项目证据和评审反馈中生成可解释的学习进展。
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-h-[620px] items-center rounded-[22px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_24px_80px_rgba(26,33,44,.10)] backdrop-blur-2xl lg:h-full lg:min-h-0">
          <div className="mx-auto w-full max-w-md">
            <form
              className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_18px_44px_rgba(26,33,44,.08)] xl:p-6"
              onSubmit={onLogin}
            >
              <div>
                <h2 className="text-3xl font-black leading-tight">登录 EduFDE</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  使用学校或演示账号进入平台。登录后系统会根据账号角色打开对应工作区。
                </p>
              </div>

              <label className="mt-4 block text-sm font-extrabold text-slate-700" htmlFor="email">
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

              <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
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

            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <strong className="text-slate-700">演示入口</strong>
                <span className="font-bold text-slate-400">选择后填充对应账号</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {roleOptions.map((option) => {
                  const active = option.role === selectedRole;
                  return (
                    <button
                      className={`relative min-h-24 rounded-[18px] border bg-white p-4 text-left transition ${
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

            <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-500">
              学生登录后进入实验课程列表，再从课程进入五阶段实验主页。角色选择只用于演示账号填充，真实权限以后端用户角色为准。
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
