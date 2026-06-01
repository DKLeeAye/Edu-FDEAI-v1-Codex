import Link from "next/link";
import type { CSSProperties } from "react";

import type { Course, ExperimentSession, LearningProfile } from "@/src/lib/api";

import { selectPrimaryCourse } from "./course-selection";
import { getStageDefinition, pickActiveStageKey } from "./terminology";

type CourseListProps = {
  courses: Course[];
  isBusy: boolean;
  learningProfile: LearningProfile | null;
  onEnterCourse: (course: Course) => void;
  onRefresh: () => void;
  sessions: ExperimentSession[];
  studentName: string;
};

const defaultExperimentCards = [
  {
    description: "从招生政策、专业介绍和常见问答中组织知识，搭建可解释的咨询型智能体。",
    meta: "建议 2 学时",
    status: "可开始",
    statusClass: "green",
    title: "招生咨询智能体实验",
    training: "训练重点：需求澄清",
  },
  {
    description: "处理选课、成绩、补考和学籍规则，学习如何识别高风险边界与转人工条件。",
    meta: "建议 3 学时",
    status: "可开始",
    statusClass: "green",
    title: "教务问答智能体实验",
    training: "训练重点：边界判断",
  },
  {
    description: "围绕设备预约、冲突处理和审批规则，完成一次轻量级流程型智能体交付。",
    meta: "上周",
    status: "已完成",
    statusClass: "green",
    title: "实验室设备预约智能体实验",
    training: "已进入能力档案",
  },
];

export function CourseList({
  courses,
  isBusy,
  learningProfile,
  onEnterCourse,
  onRefresh,
  sessions,
  studentName,
}: CourseListProps) {
  const primaryCourse = selectPrimaryCourse(courses, sessions);
  const primarySession =
    (primaryCourse
      ? sessions.find((session) => session.course_id === primaryCourse.id)
      : sessions[0]) ?? null;
  const activeStage = primarySession
    ? getStageDefinition(pickActiveStageKey(primarySession)).title
    : "需求访谈";
  const progressPercent = learningProfile
    ? Math.max(8, Math.round(learningProfile.completion_ratio * 100))
    : primarySession
      ? 24
      : 0;
  const displayName = normalizeStudentName(studentName);

  function enterPrimaryCourse() {
    if (primaryCourse && !isBusy) {
      onEnterCourse(primaryCourse);
    }
  }

  return (
    <div className="student-detail-page student-home-page">
      <aside className="student-rail" aria-label="学生端导航">
        <Link className="student-brand" href="/">
          <span className="site-brand-mark">FDE</span>
          <span>
            <strong>EduFDE</strong>
            <small>学生实验区</small>
          </span>
        </Link>

        <nav className="student-nav" aria-label="学生端主导航">
          <a className="active" href="#experiments">
            <span>学习首页</span>
            <small>实验入口</small>
          </a>
          <button disabled={!primaryCourse || isBusy} onClick={enterPrimaryCourse} type="button">
            <span>实验详情</span>
            <small>当前项目</small>
          </button>
          <a href="#portfolio-preview">
            <span>能力档案</span>
            <small>过程证据与报告</small>
          </a>
        </nav>

        <div className="student-rail-card">
          <strong>课程提醒</strong>
          <p>本周建议先继续“制造业质检 AI 智能体实验”，完成需求访谈后再进入方案定义。</p>
          <div className="mini-progress" aria-label="本周学习节奏">
            <span style={{ "--value": `${Math.max(progressPercent, 64)}%` } as CSSProperties} />
          </div>
        </div>
      </aside>

      <main className="student-workspace student-home-workspace">
        <header className="student-topbar student-home-topbar">
          <div className="student-home-welcome">
            <p className="student-kicker">Student Portal</p>
            <h1>上午好，{displayName}</h1>
            <p className="student-home-lead">
              这里汇总你当前可以进入的实训实验。选择一个实验后，再进入对应的五阶段教学与实训空间。
            </p>
            <div className="portal-facts" aria-label="当前课程信息">
              <span>
                <strong>当前课程</strong>
                AI 智能体项目交付实训
              </span>
              <span>
                <strong>教学班级</strong>
                软件工程 2203
              </span>
              <span>
                <strong>本周安排</strong>
                {Math.max(courses.length, 1)} 个实验可继续
              </span>
            </div>
          </div>
          <div className="student-top-actions">
            <button
              className="student-icon-button"
              onClick={onRefresh}
              type="button"
              aria-label="查看通知"
            >
              <span className="dot" />
            </button>
            <div className="student-profile" aria-label="当前学生">
              <span>软件工程 2203</span>
              <strong>AI 智能体项目交付实训</strong>
            </div>
          </div>
        </header>

        <section className="student-home-hero" aria-label="当前可继续实验">
          <article className="featured-experiment">
            <div className="featured-experiment-main">
              <div className="experiment-label-row">
                <span className="student-pill blue">正在进行</span>
                <span className="student-pill amber">周四课堂检查</span>
              </div>
              <h2>{primaryCourse?.title ?? "制造业质检 AI 智能体实验"}</h2>
              <p>围绕汽车零部件工厂审厂追溯场景，完成一次从客户访谈到 AI 助手交付的 FDE 项目实战。</p>
            </div>
            <div className="experiment-meta-grid" aria-label="实验关键信息">
              <span>
                <strong>当前阶段</strong>
                {activeStage}
              </span>
              <span>
                <strong>课程周次</strong>第 4 周
              </span>
              <span>
                <strong>截止时间</strong>周五 18:00
              </span>
            </div>
            <div className="student-hero-actions">
              <button className="student-primary-button" disabled={!primaryCourse || isBusy} onClick={enterPrimaryCourse} type="button">
                继续实验
              </button>
              <a className="student-secondary-button" href="#experiments">
                查看全部实验
              </a>
            </div>
          </article>
        </section>

        <section className="student-home-section" id="experiments">
          <div className="student-section-head">
            <div>
              <p className="student-kicker">Experiments</p>
              <h2>我的实训实验</h2>
            </div>
            <div className="experiment-filter" role="tablist" aria-label="筛选实验">
              <button className="active" type="button">
                全部
              </button>
              <button type="button">进行中</button>
              <button type="button">可开始</button>
              <button type="button">已完成</button>
            </div>
          </div>

          <div className="experiment-grid" data-experiment-grid>
            {primaryCourse ? (
              <article className="experiment-card highlighted" data-status="active">
                <div className="experiment-card-head">
                  <span className="student-pill blue">进行中</span>
                  <small>第 4 周</small>
                </div>
                <h3>{primaryCourse.title}</h3>
                <p>围绕质检 SOP、MES 记录、异常台账和审厂材料，完成追溯助手的项目交付训练。</p>
                <div className="experiment-card-foot">
                  <span>当前：{activeStage}</span>
                  <button disabled={isBusy} onClick={enterPrimaryCourse} type="button">
                    进入实验
                  </button>
                </div>
              </article>
            ) : (
              <article className="experiment-card highlighted" data-status="active">
                <div className="experiment-card-head">
                  <span className="student-pill amber">待发布</span>
                  <small>暂无课程</small>
                </div>
                <h3>等待教师发布实验</h3>
                <p>请先初始化演示数据，或等待教师发布可进入的实验课程。</p>
                <div className="experiment-card-foot">
                  <span>当前：未开始</span>
                  <button disabled={isBusy} onClick={onRefresh} type="button">
                    刷新课程
                  </button>
                </div>
              </article>
            )}

            {defaultExperimentCards.map((card) => (
              <article className="experiment-card" data-status="available" key={card.title}>
                <div className="experiment-card-head">
                  <span className={`student-pill ${card.statusClass}`}>{card.status}</span>
                  <small>{card.meta}</small>
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <div className="experiment-card-foot">
                  <span>{card.training}</span>
                  <button disabled={isBusy || !primaryCourse} onClick={enterPrimaryCourse} type="button">
                    查看说明
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="student-home-section philosophy-section" aria-label="FDE 教学理念">
          <div className="student-section-head">
            <div>
              <p className="student-kicker">FDE Learning</p>
              <h2>在真实交付路径中训练 AI 应用能力</h2>
            </div>
          </div>

          <div className="philosophy-grid">
            <article>
              <span>01</span>
              <h3>从真实问题开始</h3>
              <p>每个实验都从客户场景、业务约束和未确认问题出发，先训练你把需求问清楚。</p>
            </article>
            <article>
              <span>02</span>
              <h3>用 AI 协作完成交付</h3>
              <p>平台不会只检查最终答案，而是引导你在访谈、方案、知识、构建和验收中持续协作。</p>
            </article>
            <article>
              <span>03</span>
              <h3>用证据沉淀成长</h3>
              <p>关键对话、阶段产物、教师确认和 AI 反馈会形成能力证据，帮助你复盘每次项目判断。</p>
            </article>
          </div>
        </section>

        <section className="student-home-section info-section" id="portfolio-preview" aria-label="课程基本信息">
          <article className="student-home-card">
            <h3>课程安排</h3>
            <p>本课程采用项目制训练，每个实验围绕一个可交付的 AI 智能体场景展开。</p>
          </article>
          <article className="student-home-card">
            <h3>学习支持</h3>
            <p>遇到业务理解、资料质量或工具构建问题时，可在实验详情中查看教师提示与课程资料。</p>
          </article>
          <article className="student-home-card">
            <h3>能力档案</h3>
            <p>完成实验后，系统会把关键证据沉淀到你的课程能力档案中，便于期末复盘和展示。</p>
          </article>
        </section>
      </main>
    </div>
  );
}

function normalizeStudentName(studentName: string) {
  const trimmed = studentName.trim();
  if (!trimmed) {
    return "林同学";
  }
  if (trimmed.endsWith("同学")) {
    return trimmed;
  }
  return `${trimmed.replace(/\s+/g, "").slice(0, 2)}同学`;
}
