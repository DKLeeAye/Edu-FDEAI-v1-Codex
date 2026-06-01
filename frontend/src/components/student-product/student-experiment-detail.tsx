import Link from "next/link";
import type { CSSProperties } from "react";

import type { Course, ExperimentSession } from "@/src/lib/api";

import { getStageDefinition, pickActiveStageKey, type StageKey } from "./terminology";

type StudentExperimentDetailProps = {
  course: Course;
  isBusy: boolean;
  onBackHome: () => void;
  onOpenPortfolio: () => void;
  onOpenProject: () => void;
  onStartStage: (stageKey: StageKey) => void;
  session: ExperimentSession;
};

const stageRows: Array<{
  description: string;
  key: StageKey;
  label: string;
  number: string;
  status: string;
}> = [
  {
    description: "先学习访谈方法，再追问审厂压力、数据来源、一线阻力和真实业务驱动力。",
    key: "stage_1",
    label: "需求访谈与问题发现",
    number: "01",
    status: "导学",
  },
  {
    description: "把访谈证据转化为需求分析、可行性研究报告和总体技术方案。",
    key: "stage_2",
    label: "需求分析与技术方案设计",
    number: "02",
    status: "待进入",
  },
  {
    description: "判断 SOP、审厂清单、MES 导出和脏数据如何进入知识体系。",
    key: "stage_3",
    label: "知识工程决策",
    number: "03",
    status: "待进入",
  },
  {
    description: "先理解角色、Prompt、知识库、边界和测试集如何组成可交付智能体，再进入搭建。",
    key: "stage_4",
    label: "智能体实现与测试",
    number: "04",
    status: "待进入",
  },
  {
    description: "说明客户如何使用、如何验收、如何维护，以及已知限制。",
    key: "stage_5",
    label: "交付验收与运维说明",
    number: "05",
    status: "待进入",
  },
];

export function StudentExperimentDetail({
  course,
  isBusy,
  onBackHome,
  onOpenPortfolio,
  onOpenProject,
  onStartStage,
  session,
}: StudentExperimentDetailProps) {
  const activeStage = pickActiveStageKey(session);
  const activeStageTitle = getStageDefinition(activeStage).title;

  return (
    <div className="student-detail-page experiment-brief-page quality-experiment-page">
      <aside className="student-rail" aria-label="学生端导航">
        <Link className="student-brand" href="/">
          <span className="site-brand-mark">FDE</span>
          <span>
            <strong>EduFDE</strong>
            <small>学生实验区</small>
          </span>
        </Link>

        <nav className="student-nav" aria-label="学生端主导航">
          <button onClick={onBackHome} type="button">
            <span>学习首页</span>
            <small>实验入口</small>
          </button>
          <button className="active" type="button">
            <span>实验说明</span>
            <small>制造业质检</small>
          </button>
          <button onClick={onOpenPortfolio} type="button">
            <span>能力档案</span>
            <small>过程证据与报告</small>
          </button>
        </nav>

        <div className="student-rail-card">
          <strong>当前课程包</strong>
          <p>制造业质检 AI 智能体项目实训已开放。建议先读懂审厂追溯场景，再进入需求访谈。</p>
          <div className="mini-progress" aria-label="实验启动准备">
            <span style={{ "--value": "28%" } as CSSProperties} />
          </div>
        </div>
      </aside>

      <main className="student-workspace experiment-brief-workspace quality-workspace">
        <header className="student-topbar experiment-brief-topbar quality-topbar">
          <div>
            <p className="student-kicker">Manufacturing Quality · Course Pack v1.0</p>
            <h1>质检追溯与审厂材料准备 AI 助手</h1>
            <p className="experiment-brief-lead">
              你将扮演 AI 项目交付团队，面对一家中型汽车零部件工厂的质量负责人，从访谈中识别真实问题，并交付一个可解释、可验收、不过度承诺的质检
              AI 助手。
            </p>
          </div>
          <div className="student-top-actions">
            <button className="student-icon-button" type="button" aria-label="查看通知">
              <span className="dot" />
            </button>
            <div className="student-profile" aria-label="当前学生">
              <span>林同学</span>
              <strong>软件工程 2203</strong>
            </div>
          </div>
        </header>

        <section className="quality-brief-hero" aria-label="实验启动信息">
          <div className="quality-hero-main">
            <div className="experiment-label-row">
              <span className="student-pill blue">正在进行</span>
              <span className="student-pill amber">小组项目</span>
              <span className="student-pill green">12-20 学时</span>
            </div>
            <h2>客户说“想用 AI 提升质检效率”，但真正压力来自审厂追溯。</h2>
            <p>
              本实验不是训练你做一个能聊天的 Demo，而是训练你判断：哪些质检资料可以进入知识库，哪些数据缺口必须暴露，哪些问题必须拒答或转人工。
            </p>
            <div className="quality-hero-actions">
              <button className="student-primary-button" disabled={isBusy} onClick={onOpenProject} type="button">
                开始需求访谈
              </button>
              <a className="student-secondary-button" href="#experiment-path">
                查看五阶段路径
              </a>
            </div>
          </div>

          <aside className="quality-brief-card" aria-label="实验任务书">
            <span className="quality-card-label">实验任务书</span>
            <dl>
              <div>
                <dt>案例企业</dt>
                <dd>中型汽车零部件工厂</dd>
              </div>
              <div>
                <dt>AI 客户</dt>
                <dd>周明 · 制造工厂质量负责人</dd>
              </div>
              <div>
                <dt>业务压力</dt>
                <dd>大客户审厂要求质检过程可追溯</dd>
              </div>
              <div>
                <dt>交付形态</dt>
                <dd>RAG 问答 + 追溯说明 + 缺失字段提醒</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="quality-section quality-context-section" aria-label="业务场景">
          <div className="quality-section-head">
            <p className="student-kicker">Business Context</p>
            <h2>先看清工厂正在经历什么</h2>
          </div>

          <div className="quality-context-layout">
            <article className="quality-story-panel">
              <span>核心业务矛盾</span>
              <p>
                工厂一直在做质检，但记录分散在 MES、Excel、纸质质检单、SOP、不合格品处理单和客户整改材料中。审厂前，质量负责人需要跨系统拼接证据，才能说明某批次异常如何发现、处理、复检和整改。
              </p>
            </article>
            <div className="quality-friction-list">
              <article>
                <strong>资料分散</strong>
                <p>追溯说明需要同时引用流程文件、质检记录、客户要求和整改证明。</p>
              </article>
              <article>
                <strong>字段不完整</strong>
                <p>MES 只保留部分结构化字段，异常原因、处置过程、复检结果经常缺失。</p>
              </article>
              <article>
                <strong>一线阻力</strong>
                <p>如果方案要求质检员重复录入完整数据，项目落地会变成额外负担。</p>
              </article>
            </div>
          </div>
        </section>

        <section className="quality-section quality-boundary-section" aria-label="智能体边界">
          <div className="quality-section-head split">
            <div>
              <p className="student-kicker">Agent Scope</p>
              <h2>这个智能体解决什么，也不解决什么</h2>
            </div>
            <p>页面保留真实边界，是为了训练学生不要把“AI 能生成回答”误认为“项目可以交付”。</p>
          </div>

          <div className="quality-boundary-grid">
            <article className="quality-scope-card positive">
              <h3>应该解决</h3>
              <ul>
                <li>查询质检 SOP、不合格品处理流程和审厂要求</li>
                <li>基于已有记录生成异常追溯说明初稿</li>
                <li>识别追溯字段与证据缺口</li>
                <li>辅助准备审厂材料清单和客户问答</li>
              </ul>
            </article>
            <article className="quality-scope-card negative">
              <h3>不能承诺</h3>
              <ul>
                <li>不替代 MES、ERP 或质量管理系统</li>
                <li>不自动判定产品是否合格</li>
                <li>不伪造缺失的质检数据</li>
                <li>不替代质量负责人作最终判断</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="quality-section quality-outcome-section" aria-label="交付成果">
          <div className="quality-section-head">
            <p className="student-kicker">Deliverables</p>
            <h2>完成实验后，你要留下这些交付证据</h2>
          </div>

          <div className="quality-deliverable-map">
            {["访谈与问题发现", "方案与可行性", "知识工程决策", "实现与测试", "交付验收"].map((title, index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{deliverableCopy[index]}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="quality-section quality-task-section" aria-label="典型使用任务">
          <div className="quality-section-head split">
            <div>
              <p className="student-kicker">Agent Tasks</p>
              <h2>智能体必须经得起这些任务测试</h2>
            </div>
            <p>这些问题会在阶段四和阶段五作为测试与验收依据。</p>
          </div>

          <div className="quality-task-board">
            {taskCards.map((task) => (
              <article key={task.title}>
                <span>{task.category}</span>
                <strong>{task.title}</strong>
                <p>{task.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="quality-section" id="experiment-path" aria-label="五阶段路径">
          <div className="quality-section-head split">
            <div>
              <p className="student-kicker">Five Stages</p>
              <h2>五阶段实训路径</h2>
            </div>
            <p>每个阶段进入独立教学与实训空间，详情页只提供总览和入口。</p>
          </div>

          <div className="quality-stage-table">
            {stageRows.map((stage) => (
              <button
                className={`quality-stage-row ${activeStage === stage.key ? "active" : ""}`}
                disabled={isBusy}
                key={stage.key}
                onClick={() => onStartStage(stage.key)}
                type="button"
              >
                <span>{stage.number}</span>
                <strong>{stage.label}</strong>
                <p>{stage.description}</p>
                <em>{activeStage === stage.key ? activeStageTitle : stage.status}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="quality-section quality-resource-section" aria-label="开始前准备">
          <div className="quality-section-head">
            <p className="student-kicker">Before Start</p>
            <h2>开始前会用到的课程材料</h2>
          </div>
          <div className="quality-resource-strip">
            <span>{course.code}</span>
            <span>质检 SOP</span>
            <span>不合格品处理流程</span>
            <span>审厂检查清单</span>
            <span>MES 质检记录样例</span>
            <span>Excel 质检异常台账</span>
            <span>质检字段字典</span>
            <span>脏数据样例</span>
          </div>
        </section>
      </main>
    </div>
  );
}

const deliverableCopy = [
  "访谈记录、已确认事实、需求假设、未确认问题和关键对话证据。",
  "需求文档、可行性报告、总体技术方案、红黄灯风险和 AI 评审记录。",
  "知识来源选择、分块召回策略、数据质量风险判断和缺失字段提醒逻辑。",
  "Dify 智能体链接、Prompt 或工作流说明、标准题/范围外题/多轮题测试报告。",
  "交付文档、验收记录、运维说明、客户演示脚本和最终项目档案袋。",
];

const taskCards = [
  {
    category: "制度查询",
    description: "检索 SOP 与处理流程，给出步骤化回答，并提醒保留记录。",
    title: "不合格品发现后应如何处理？",
  },
  {
    category: "审厂准备",
    description: "区分必须字段和建议字段，帮助质量负责人准备材料。",
    title: "质检记录数字化需要准备哪些信息？",
  },
  {
    category: "追溯说明",
    description: "引用已有记录，标注缺失信息，不把不确定内容写成事实。",
    title: "根据异常记录生成审厂用追溯说明。",
  },
  {
    category: "字段检查",
    description: "检查批次、检验员、处置结果、复检结果、整改措施等字段。",
    title: "这条记录能否支撑完整追溯？",
  },
  {
    category: "范围外拒答",
    description: "明确拒答，并引导回质检流程、异常追溯或审厂材料问题。",
    title: "今天股市行情怎么样？",
  },
];
