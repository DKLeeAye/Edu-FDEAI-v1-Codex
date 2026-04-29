import { apiBaseUrl } from "@/src/lib/config";

const foundations = [
  "实验包版本绑定",
  "统一 Artifact 模型",
  "AI Gateway 边界",
  "租户 / 院校 / 课程作用域",
  "AI 调用日志",
  "黄灯债务",
  "Rubric 最小模型",
];

const stages = [
  "需求访谈与问题发现",
  "方案定义与可行性判断",
  "知识工程决策",
  "智能体实现与测试",
  "交付验收与运维说明",
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="border-b border-[color:var(--border)] bg-[color:var(--surface)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[color:var(--accent)]">EduFDE MVP</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[color:var(--foreground)]">
              AI 智能体项目交付实训平台
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[color:var(--muted)]">
              当前为项目脚手架占位页。后续将按五阶段交付证据链逐步接入学生端、教师端、
              Artifact、AI Gateway 与学习画像。
            </p>
          </div>
          <div className="rounded border border-[color:var(--border)] px-4 py-3 text-sm text-[color:var(--muted)]">
            API: {apiBaseUrl}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="text-lg font-semibold">五阶段主线</h2>
          <div className="mt-4 grid gap-3">
            {stages.map((stage, index) => (
              <div
                className="flex items-center gap-3 rounded border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3"
                key={stage}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[color:var(--accent)] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{stage}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">MVP 长期地基</h2>
          <div className="mt-4 rounded border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
            <ul className="grid gap-2 text-sm text-[color:var(--muted)]">
              {foundations.map((item) => (
                <li className="flex items-center gap-2" key={item}>
                  <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
