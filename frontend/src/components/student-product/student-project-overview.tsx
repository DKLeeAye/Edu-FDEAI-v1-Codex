import type { Artifact, Course, ExperimentSession, LearningProfile } from "@/src/lib/api";

import { getStageDefinition, pickActiveStageKey, stageDefinitions, type StageKey } from "./terminology";

type StudentProjectOverviewProps = {
  artifactsByStage: Record<StageKey, Artifact[]>;
  course: Course;
  learningProfile: LearningProfile | null;
  onBackToDetail: () => void;
  onOpenPortfolio: () => void;
  onStartStage: (stageKey: StageKey) => void;
  session: ExperimentSession;
};

export function StudentProjectOverview({
  artifactsByStage,
  course,
  learningProfile,
  onBackToDetail,
  onOpenPortfolio,
  onStartStage,
  session,
}: StudentProjectOverviewProps) {
  const activeStageKey = pickActiveStageKey(session);
  const activeStage = getStageDefinition(activeStageKey);
  const artifactTotal = Object.values(artifactsByStage).reduce(
    (total, artifacts) => total + artifacts.length,
    0,
  );
  const progress = learningProfile
    ? `${Math.round(learningProfile.completion_ratio * 100)}%`
    : `${Math.round((completedStageCount(session) / stageDefinitions.length) * 100)}%`;

  return (
    <div className="shell">
      <aside className="sidebar">
        <button className="brand" onClick={onBackToDetail} type="button">
          <div className="brand-mark">FDE</div>
          <div className="brand-copy">
            <div className="brand-title">EduFDE</div>
            <div className="brand-subtitle">AI 智能体项目交付实训</div>
          </div>
        </button>
        <div className="nav-group">Platform</div>
        <button className="nav-link" onClick={onBackToDetail} type="button">
          <span>实验说明</span>
        </button>
        <button className="nav-link active" type="button">
          <span>学生项目</span>
        </button>
        <button className="nav-link" onClick={onStartStage.bind(null, activeStageKey)} type="button">
          <span>继续阶段</span>
        </button>
        <button className="nav-link" onClick={onOpenPortfolio} type="button">
          <span>档案袋</span>
        </button>
        <div className="sidebar-footer">
          <strong>证据链状态</strong>
          <p>课程、阶段产物、AI 评审与教师确认统一进入项目档案袋。</p>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <div className="crumb">学生端 / 项目交付证据链</div>
            <h1>学生项目工作台</h1>
            <p className="lead">
              学生围绕一个真实 AI 智能体项目推进五阶段交付，每一步都有输入、操作、质量门禁、输出物和可沉淀证据。
            </p>
          </div>
          <div className="actions">
            <button className="btn primary" onClick={() => onStartStage(activeStageKey)} type="button">
              继续当前阶段
            </button>
            <button className="btn" onClick={onOpenPortfolio} type="button">
              提交阶段产物
            </button>
          </div>
        </div>

        <section className="grid cols-4" style={{ marginBottom: 18 }}>
          <MetricCard label="总进度" value={progress} note={`${activeStage.title}进行中`} />
          <MetricCard label="Artifact" value={`${artifactTotal}`} note="已进入档案袋" />
          <MetricCard label="黄灯债务" value="3" note="允许带债前进" tone="warn" />
          <MetricCard label="导师反馈" value="7" note="今日新增 2 条" tone="good" />
        </section>

        <section className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-body">
            <StageRail activeStageKey={activeStageKey} onStartStage={onStartStage} />
          </div>
        </section>

        <section className="layout">
          <div className="grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">当前项目：{course.title}</h2>
                  <p className="panel-subtitle">
                    目标是交付一个能处理质检追溯、审厂材料与异常转人工策略的 AI 智能体。
                  </p>
                </div>
                <span className="status warn">{activeStage.shortTitle}</span>
              </div>
              <div className="panel-body">
                <StageRail activeStageKey={activeStageKey} onStartStage={onStartStage} />
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2 className="panel-title">阶段产物</h2>
              </div>
              <div className="panel-body">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>产物</th>
                        <th>阶段</th>
                        <th>状态</th>
                        <th>证据</th>
                      </tr>
                    </thead>
                    <tbody>
                      {artifactRows(artifactsByStage).map((row) => (
                        <tr key={`${row.stage}-${row.name}`}>
                          <td>{row.name}</td>
                          <td>{row.stage}</td>
                          <td>
                            <span className={`status ${row.tone}`}>{row.state}</span>
                          </td>
                          <td>{row.evidence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>

          <aside className="grid">
            <section className="panel">
              <div className="panel-header">
                <h2 className="panel-title">AI 导师提示</h2>
              </div>
              <div className="panel-body">
                <div className="evidence-list">
                  <Evidence title="不要直接进入构建" text="阶段三需要先判断数据质量与风险，平台不会代替你真实构建知识库。" />
                  <Evidence title="补齐召回策略理由" text="请说明为什么选择向量召回 + 关键词兜底，而不是只做向量召回。" />
                  <Evidence title="把黄灯债务写清楚" text="权限不明、数据过期、字段缺失都要进入后续测试建议。" />
                </div>
              </div>
            </section>
            <section className="panel">
              <div className="panel-header">
                <h2 className="panel-title">能力证据</h2>
              </div>
              <div className="panel-body grid">
                <MetricCard label="需求访谈" value="B+" note="隐藏约束覆盖良好" tone="good" />
                <MetricCard label="方案判断" value="A-" note="红灯边界表达清楚" tone="good" />
                <MetricCard label="知识工程" value="C+" note="风险预判不足" tone="warn" />
              </div>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}

function StageRail({
  activeStageKey,
  onStartStage,
}: {
  activeStageKey: StageKey;
  onStartStage: (stageKey: StageKey) => void;
}) {
  return (
    <div className="stage-rail">
      {stageDefinitions.map((stage) => (
        <button
          className={`stage ${stage.key === activeStageKey ? "active" : ""}`}
          key={stage.key}
          onClick={() => onStartStage(stage.key)}
          type="button"
        >
          <div className="stage-num">{String(stage.order).padStart(2, "0")}</div>
          <h3>{stage.shortTitle}</h3>
          <p>{stage.summary}</p>
        </button>
      ))}
    </div>
  );
}

function MetricCard({
  label,
  note,
  tone = "",
  value,
}: {
  label: string;
  note: string;
  tone?: string;
  value: string;
}) {
  return (
    <article className={`metric ${tone}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
    </article>
  );
}

function Evidence({ text, title }: { text: string; title: string }) {
  return (
    <div className="evidence">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function completedStageCount(session: ExperimentSession) {
  return session.stage_records.filter((record) => record.status === "completed").length;
}

function artifactRows(artifactsByStage: Record<StageKey, Artifact[]>) {
  const rows = stageDefinitions.flatMap((stage) => {
    const artifacts = artifactsByStage[stage.key] ?? [];
    if (artifacts.length === 0) {
      return [];
    }
    return artifacts.slice(0, 2).map((artifact) => ({
      evidence: artifact.title,
      name: artifactTypeCopy(artifact.artifact_type),
      stage: stage.title,
      state: artifact.status === "reviewed" ? "已评审" : artifact.status,
      tone: artifact.status === "reviewed" || artifact.status === "accepted" ? "ok" : "warn",
    }));
  });

  return rows.length
    ? rows.slice(0, 5)
    : [
        {
          evidence: "关键对话 14 段",
          name: "客户访谈记录",
          stage: "阶段一",
          state: "已评审",
          tone: "ok",
        },
        {
          evidence: "修改记录 6 条",
          name: "需求文档 v2",
          stage: "阶段二",
          state: "教师确认",
          tone: "ok",
        },
        {
          evidence: "缺少召回风险",
          name: "知识工程决策表",
          stage: "阶段三",
          state: "草稿",
          tone: "warn",
        },
      ];
}

function artifactTypeCopy(type: string) {
  const map: Record<string, string> = {
    stage_1_evaluation: "阶段一综合评估",
    stage_1_interview_turn: "客户访谈记录",
    stage_1_problem_summary: "问题发现总结",
    stage_1_visit_notes: "拜访间整理",
    stage_2_solution_definition: "需求文档 v2",
    stage_2_technical_solution: "总体技术方案",
    stage_3_knowledge_decision: "知识工程决策表",
    stage_4_dify_implementation: "智能体实现记录",
    stage_4_test_report: "测试报告",
    stage_5_acceptance_package: "交付验收包",
  };
  return map[type] ?? type;
}
