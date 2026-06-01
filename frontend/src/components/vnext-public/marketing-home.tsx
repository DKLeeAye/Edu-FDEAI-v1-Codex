"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { CSSProperties } from "react";

export function MarketingHome() {
  useEffect(() => {
    document.body.classList.add("marketing-page");
    document.documentElement.classList.add("motion-ready");

    const header = document.querySelector<HTMLElement>("[data-elevate]");
    const updateHeader = () => {
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(window.scrollY / maxScroll, 1);
      header?.classList.toggle("elevated", window.scrollY > 12);
      header?.style.setProperty("--scroll-progress", String(progress));
    };

    const revealItems = document.querySelectorAll<HTMLElement>(
      ".hero-copy > *, .hero-visual, .client-strip, .section-heading, .lab-card, .workflow-panel, .capability-grid article, .deployment-section, .login-entry > *, .final-cta > *",
    );
    revealItems.forEach((item, index) => {
      item.classList.add("reveal-item");
      item.style.setProperty("--reveal-delay", `${Math.min(index * 45, 360)}ms`);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    revealItems.forEach((item) => observer.observe(item));

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateHeader);
      observer.disconnect();
      document.body.classList.remove("marketing-page");
      document.documentElement.classList.remove("motion-ready");
    };
  }, []);

  return (
    <>
      <header className="site-header" data-elevate>
        <Link className="site-brand" href="/" aria-label="EduFDE 首页">
          <span className="site-brand-mark">FDE</span>
          <span>
            <strong>EduFDE</strong>
            <small>教育版 FDE 实训平台</small>
          </span>
        </Link>
        <nav className="site-nav" aria-label="主导航">
          <a href="#student-lab">学生实训</a>
          <a href="#teaching-loop">教学闭环</a>
          <a href="#platform">平台能力</a>
          <a href="#deployment">高校部署</a>
        </nav>
        <div className="site-actions">
          <a className="site-link" href="/login">
            进入平台
          </a>
          <a className="site-button" href="#pilot">
            申请试点
          </a>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <p className="hero-overline">高校 AI 智能体实训平台</p>
            <h1 className="title-lines hero-title">
              <span>让 AI 项目实训</span>
              <span>成为可交付的课堂系统</span>
            </h1>
            <p className="hero-lead">
              EduFDE 面向软件工程、人工智能应用与产业实践课程，把真实客户需求、五阶段交付过程、AI
              评审与教师确认统一到一个产品化平台里，帮助学生完成从需求访谈到交付验收的完整训练。
            </p>
            <div className="hero-actions">
              <a className="site-button large" href="/login">
                进入平台
              </a>
              <a className="site-button secondary large" href="#student-lab">
                查看学生实训路径
              </a>
            </div>
            <dl className="hero-proof" aria-label="平台核心能力">
              <div>
                <dt>5 阶段</dt>
                <dd>需求访谈、方案定义、知识决策、实现测试、交付验收</dd>
              </div>
              <div>
                <dt>3 身份</dt>
                <dd>学生、教师、管理员分角色进入不同工作台</dd>
              </div>
              <div>
                <dt>全证据链</dt>
                <dd>过程记录、Rubric、AI 评审与教师确认留痕</dd>
              </div>
            </dl>
          </div>

          <div className="hero-visual" aria-label="EduFDE 产品界面展示">
            <div className="browser-frame">
              <div className="browser-bar">
                <span />
                <span />
                <span />
                <em>edufde.edu.cn/course/agent-delivery</em>
              </div>
              <div className="product-shot">
                <aside className="shot-rail">
                  <strong>EduFDE</strong>
                  <span className="active">实验区</span>
                  <span>阶段任务</span>
                  <span>AI 评审</span>
                  <span>档案袋</span>
                </aside>
                <section className="shot-main">
                  <div className="shot-topline">
                    <div>
                      <small>学生工作台</small>
                      <h2>企业知识库智能客服项目</h2>
                    </div>
                    <button type="button">继续实训</button>
                  </div>
                  <div className="shot-stage-row">
                    <span className="done">访谈</span>
                    <span className="current">方案</span>
                    <span>知识</span>
                    <span>实现</span>
                    <span>验收</span>
                  </div>
                  <div className="shot-grid">
                    <article className="shot-card primary">
                      <small>当前任务</small>
                      <h3>补全红黄灯边界与客户确认问题</h3>
                      <p>AI 导师已标出 3 个未确认约束，提交前需补充证据。</p>
                    </article>
                    <article className="shot-card">
                      <small>Rubric 预检</small>
                      <div className="score-line">
                        <strong>82</strong>
                        <span>/ 100</span>
                      </div>
                      <p>需求完整性通过，风险说明不足。</p>
                    </article>
                    <article className="shot-card wide">
                      <small>证据链</small>
                      <div className="evidence-bars">
                        <span style={{ "--h": "72%" } as CSSProperties} />
                        <span style={{ "--h": "48%" } as CSSProperties} />
                        <span style={{ "--h": "64%" } as CSSProperties} />
                        <span style={{ "--h": "34%" } as CSSProperties} />
                        <span style={{ "--h": "82%" } as CSSProperties} />
                      </div>
                    </article>
                  </div>
                </section>
              </div>
            </div>
            <div className="floating-review">
              <small>AI 评审提示</small>
              <strong>方案目标与测试指标尚未闭环</strong>
              <p>建议补充“拒答策略”和“知识源更新时间”两个验收条件。</p>
            </div>
          </div>
        </section>

        <section className="client-strip" aria-label="适用教学场景">
          <span>适用于</span>
          <strong>软件工程课程设计</strong>
          <strong>人工智能应用实践</strong>
          <strong>大模型智能体实训</strong>
          <strong>校企项目交付训练</strong>
        </section>

        <section className="section-block" id="student-lab">
          <div className="section-heading">
            <p>Student Experience</p>
            <h2 className="title-lines">
              <span>学生从实验开始</span>
              <span>而不是从文档开始</span>
            </h2>
            <span>
              首页实验区会聚合可开始、进行中、待补交的实验。学生点击实验后进入阶段化教学页，每个阶段都同时提供任务说明、实训操作、AI
              导师反馈和产物提交。
            </span>
          </div>
          <div className="lab-showcase">
            <article className="lab-card active">
              <div className="lab-card-top">
                <span className="lab-state">进行中</span>
                <span className="mono">Week 04</span>
              </div>
              <h3>企业知识库智能客服项目</h3>
              <p>当前处于方案定义阶段，需要提交需求文档、风险边界和验收指标。</p>
              <div className="mini-progress">
                <span style={{ "--value": "44%" } as CSSProperties} />
              </div>
              <a href="/login?role=student">登录进入实验区</a>
            </article>
            <article className="lab-card">
              <div className="lab-card-top">
                <span className="lab-state ready">可开始</span>
                <span className="mono">Lab 02</span>
              </div>
              <h3>校园政策问答 Agent</h3>
              <p>从访谈虚拟教务客户开始，训练隐藏需求识别与知识库结构化。</p>
              <div className="mini-progress">
                <span style={{ "--value": "0%" } as CSSProperties} />
              </div>
              <a href="/login?role=student">登录后开始</a>
            </article>
            <article className="lab-card">
              <div className="lab-card-top">
                <span className="lab-state review">待确认</span>
                <span className="mono">Review</span>
              </div>
              <h3>招生咨询 RAG 助手</h3>
              <p>AI 已完成 Rubric 预评，等待学生补充测试记录后进入教师确认。</p>
              <div className="mini-progress">
                <span style={{ "--value": "78%" } as CSSProperties} />
              </div>
              <a href="/login?role=student">登录查看评审</a>
            </article>
          </div>
        </section>

        <section className="split-section" id="teaching-loop">
          <div className="section-heading compact">
            <p>Teaching Loop</p>
            <h2 className="title-lines">
              <span>教师看到班级运行状态</span>
              <span>而不是零散作业文件</span>
            </h2>
            <span>平台把学生过程、AI 预评、阶段卡点和教师确认动作组织成一个可运营的教学闭环。</span>
          </div>
          <div className="workflow-panel">
            <div className="workflow-row">
              <span>01</span>
              <div>
                <strong>课前配置实验包</strong>
                <p>选择项目剧本、Rubric、AI 客户 Prompt 与知识库材料。</p>
              </div>
            </div>
            <div className="workflow-row">
              <span>02</span>
              <div>
                <strong>课中监控红黄灯</strong>
                <p>识别阶段拖延、证据不足、AI 误用和共性教学卡点。</p>
              </div>
            </div>
            <div className="workflow-row">
              <span>03</span>
              <div>
                <strong>确认 AI 评审结果</strong>
                <p>教师保留最终评分与反馈权，所有修改写入审计日志。</p>
              </div>
            </div>
          </div>
        </section>

        <section className="capability-band" id="platform">
          <div className="section-heading center">
            <p>Platform System</p>
            <h2 className="title-lines">
              <span>围绕 FDE 能力培养</span>
              <span>沉淀平台能力</span>
            </h2>
          </div>
          <div className="capability-grid">
            <article>
              <span />
              <h3>实验包资产库</h3>
              <p>沉淀项目剧本、角色资料、教学资源、评价标准和 AI 配置版本。</p>
            </article>
            <article>
              <span />
              <h3>五阶段实训引擎</h3>
              <p>每个阶段都有目标、任务、模板、提交物、预检与教师确认。</p>
            </article>
            <article>
              <span />
              <h3>AI 客户与 AI 导师</h3>
              <p>模拟需求访谈、隐藏约束、方案追问、Rubric 解释和证据定位。</p>
            </article>
            <article>
              <span />
              <h3>项目档案袋</h3>
              <p>自动汇总阶段产物、关键反馈、修改历史与能力画像报告。</p>
            </article>
          </div>
        </section>

        <section className="deployment-section" id="deployment">
          <div>
            <p className="hero-overline">Deployment</p>
            <h2 className="title-lines">
              <span>支持课程试点</span>
              <span>学院租户与专有化部署</span>
            </h2>
            <p>
              管理员端集中管理组织、课程、实验包、模型配置、License、审计日志与数据边界。高校可从单门课程开课开始，逐步沉淀学院级
              AI 项目实训体系。
            </p>
          </div>
          <div className="deployment-card">
            <div className="deploy-row">
              <strong>SaaS 试点租户</strong>
              <span>快速开课</span>
            </div>
            <div className="deploy-row">
              <strong>学院专有租户</strong>
              <span>统一实验包与账号</span>
            </div>
            <div className="deploy-row">
              <strong>私有化实例</strong>
              <span>模型与数据边界可控</span>
            </div>
          </div>
        </section>

        <section className="login-entry" id="login-entry">
          <div>
            <p className="hero-overline">Account Portal</p>
            <h2 className="title-lines">
              <span>统一登录入口</span>
              <span>按身份进入工作台</span>
            </h2>
            <p>
              学生、教师与管理员使用同一入口登录。平台会根据账号角色自动进入对应工作台，保持课程、实验、评审与部署管理之间的权限边界清晰。
            </p>
          </div>
          <div className="role-entry-grid">
            <a href="/login?role=student">
              <strong>学生</strong>
              <span>进入实验区与五阶段实训</span>
            </a>
            <a href="/login?role=teacher">
              <strong>教师</strong>
              <span>进入课程运行与 AI 评审</span>
            </a>
            <a href="/login?role=admin">
              <strong>管理员</strong>
              <span>进入租户、License 与审计</span>
            </a>
          </div>
        </section>

        <section className="final-cta" id="pilot">
          <h2 className="title-lines">
            <span>从一门课程开始</span>
            <span>建立可持续实训体系</span>
          </h2>
          <p>
            将实验包、评价标准、AI 评审与学生项目档案袋沉淀为可复用的教学资产，让 AI
            智能体项目训练进入可运营、可评估、可持续迭代的课堂系统。
          </p>
          <a className="site-button large" href="/login">
            进入平台
          </a>
        </section>
      </main>
    </>
  );
}
