"use client";

import { useState, type CSSProperties } from "react";

import type { Artifact, Course, ExperimentSession, LearningProfile } from "@/src/lib/api";

import {
  buildPortfolioArchiveState,
  buildPortfolioReportState,
  buildPortfolioSummaryCards,
  portfolioAbilityItems,
  portfolioCapabilityReport,
  portfolioEvidenceSyncToastCopy,
  portfolioHeroCopy,
  portfolioNavigationItems,
  portfolioPackageItems,
  portfolioReportGeneratedToastCopy,
  portfolioReviewNotes,
  portfolioStageChainItems,
  portfolioSummaryCopyText,
} from "./portfolio-flow";
import { sanitizeProductText, sortStageRecords, type StageKey } from "./terminology";

type ArtifactsByStage = Record<StageKey, Artifact[]>;

type ProjectPortfolioViewProps = {
  artifactsByStage: ArtifactsByStage;
  course: Course;
  isBusy: boolean;
  learningProfile: LearningProfile | null;
  onBackToWorkspace: () => void;
  onRefresh: () => void;
  onStageOpen: (stageKey: StageKey) => void;
  session: ExperimentSession;
};

export function ProjectPortfolioView({
  artifactsByStage,
  isBusy,
  onBackToWorkspace,
  onRefresh,
  onStageOpen,
  session,
}: ProjectPortfolioViewProps) {
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isReportGenerated, setIsReportGenerated] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const stageRecords = sortStageRecords(session.stage_records);
  const latestImplementation = latestArtifactOfType(
    artifactsByStage.stage_4,
    "stage_4_dify_implementation",
  );
  const latestTestReport = latestArtifactOfType(
    artifactsByStage.stage_4,
    "stage_4_test_report",
  );
  const latestDelivery = latestArtifactOfType(
    artifactsByStage.stage_5,
    "stage_5_delivery_document",
  );
  const latestAcceptance = latestArtifactOfType(
    artifactsByStage.stage_5,
    "stage_5_acceptance_package",
  );
  const latestReview = latestArtifactOfType(
    artifactsByStage.stage_5,
    "stage_5_ai_delivery_review",
  );
  const archiveState = buildPortfolioArchiveState({ artifactsByStage, stageRecords });
  const implementation = latestImplementation?.content_json;
  const testReport = latestTestReport?.content_json;
  const delivery = latestDelivery?.content_json;
  const acceptance = latestAcceptance?.content_json;
  const summaryCards = buildPortfolioSummaryCards({
    acceptance,
    archiveState,
    delivery,
    implementation,
    testReport,
  });

  function showPortfolioToast(message: string) {
    setToastMessage(message);
  }

  function handleRefreshEvidence() {
    onRefresh();
    showPortfolioToast(portfolioEvidenceSyncToastCopy(archiveState.acceptanceGateDone));
  }

  function handleGenerateReport() {
    setIsReportGenerated(true);
    setIsReportOpen(true);
    showPortfolioToast(portfolioReportGeneratedToastCopy);
  }

  function handleExportPortfolio() {
    showPortfolioToast(reportState.exportToastCopy);
  }

  async function handleCopySummary() {
    try {
      await navigator.clipboard.writeText(portfolioSummaryCopyText);
      showPortfolioToast("项目摘要已复制");
    } catch {
      showPortfolioToast("复制失败，请手动复制页面摘要");
    }
  }

  const reportState = buildPortfolioReportState({
    acceptanceGateDone: archiveState.acceptanceGateDone,
    hasGeneratedReport: isReportGenerated,
    hasPersistedDeliveryReview: latestReview !== null,
    readiness: archiveState.readiness,
  });

  return (
    <div className="agent-guide-page portfolio-page">
      <header className="agent-guide-topbar">
        <button className="agent-guide-brand" onClick={onBackToWorkspace} type="button">
          <span>FDE</span>
          <strong>项目档案袋</strong>
        </button>
        <nav aria-label="项目档案袋导航" className="agent-guide-nav">
          {portfolioNavigationItems.map((item) => (
            <button
              className={item === "档案袋" ? "active" : undefined}
              key={item}
              onClick={item === "档案袋" ? undefined : onBackToWorkspace}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="agent-guide-status">
          <span>Final Portfolio</span>
          <strong>{archiveState.headerStatus}</strong>
        </div>
      </header>

      <main className="agent-guide-shell portfolio-shell">
        <section className="agent-guide-hero portfolio-hero" aria-labelledby="portfolio-title">
          <div>
            <p className="agent-kicker">Manufacturing Quality Agent</p>
            <h1 id="portfolio-title">制造业质检 AI 智能体项目档案袋。</h1>
            <p>{portfolioHeroCopy}</p>
          </div>
          <aside className="portfolio-final-card" aria-label="最终归档状态">
            <span>最终状态</span>
            <strong>{archiveState.finalStateTitle}</strong>
            <p>{archiveState.finalStateCopy}</p>
          </aside>
        </section>

        <div className="portfolio-workbench">
          <section className="portfolio-main" aria-label="项目档案袋主内容">
            <section className="agent-guide-section portfolio-overview" aria-labelledby="overview-title">
              <div className="agent-section-head split">
                <div>
                  <p className="agent-kicker">Project Overview</p>
                  <h2 id="overview-title">项目总览：从真实质检场景到可验收智能体。</h2>
                  <p>本项目以汽车零部件工厂质检追溯为背景，训练学生完成 FDE 项目的完整交付链路，而不是只做一个能回答问题的机器人。</p>
                </div>
                <button className="agent-next-link" disabled={isBusy} onClick={handleRefreshEvidence} type="button">
                  拉取项目证据
                </button>
              </div>
              <div className="portfolio-summary-grid">
                {summaryCards.map((card) => (
                  <article key={card.label}>
                    <span>{card.label}</span>
                    <strong>{sanitizeProductText(card.title)}</strong>
                    <p>{sanitizeProductText(card.body)}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="agent-guide-section portfolio-chain-section" aria-labelledby="chain-title">
              <div className="agent-section-head split">
                <div>
                  <p className="agent-kicker">Evidence Chain</p>
                  <h2 id="chain-title">五阶段证据链：每一步都能回到产物和判断依据。</h2>
                  <p>档案袋不是成绩单，而是把学生如何分析、判断、实现、测试和交付的过程证据组织起来。</p>
                </div>
                <span className="portfolio-state">{archiveState.archivedCount} / {archiveState.totalCount} 已归档</span>
              </div>

              <div className="portfolio-stage-chain" aria-label="五阶段证据链">
                {portfolioStageChainItems.map((item) => {
                  const stageKey = item.href as StageKey;
                  const record = stageRecords.find((stage) => stage.stage_key === stageKey);
                  return (
                    <article key={item.number}>
                      <div className="portfolio-stage-index">{item.number}</div>
                      <div>
                        <span>{item.label}</span>
                        <h3>{item.title}</h3>
                        <p>{item.body}</p>
                        <button disabled={record?.status === "locked"} onClick={() => onStageOpen(stageKey)} type="button">
                          {item.actionLabel}
                        </button>
                      </div>
                      <em>{archiveState.stageLabels[stageKey]}</em>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="agent-guide-section portfolio-ability-section" aria-labelledby="ability-title">
              <div className="agent-section-head split">
                <div>
                  <p className="agent-kicker">Capability Profile</p>
                  <h2 id="ability-title">能力画像：按 FDE 交付能力生成，不只看最终分数。</h2>
                  <p>能力画像把每个阶段的证据和评审结果映射到真实项目能力，便于学生复盘，也便于教师了解下一轮训练重点。</p>
                </div>
                <button className="dify-secondary-action" onClick={handleGenerateReport} type="button">
                  生成能力报告
                </button>
              </div>
              <div className="portfolio-ability-grid">
                {portfolioAbilityItems.map((item) => (
                  <article key={item.label} style={{ "--ability": item.value } as CSSProperties}>
                    <span>{item.label}</span>
                    <strong>{item.grade}</strong>
                    <p>{item.note}</p>
                    <i />
                  </article>
                ))}
              </div>
            </section>

            <section className="agent-guide-section portfolio-package-section" aria-labelledby="package-title">
              <div className="agent-section-head split">
                <div>
                  <p className="agent-kicker">Final Package</p>
                  <h2 id="package-title">最终交付包：客户、教师和平台都能追溯。</h2>
                  <p>这些内容共同构成项目档案袋的可交付材料。学生可以逐项查看，也可以导出课程归档包。</p>
                </div>
                <button className="agent-next-link" onClick={handleExportPortfolio} type="button">
                  导出归档包
                </button>
              </div>
              <div className="portfolio-package-grid">
                {portfolioPackageItems.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => onStageOpen(item.href as StageKey)}
                    type="button"
                  >
                    <span>{item.code}</span>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </button>
                ))}
              </div>
            </section>
          </section>

          <aside className="portfolio-side">
            <section className="agent-side-card portfolio-readiness-card">
              <p className="agent-kicker">Archive Gate</p>
              <h2>档案袋完整度</h2>
              <div className="portfolio-ring" style={{ "--ready": reportState.readinessValue } as CSSProperties}>
                <strong>{reportState.readinessValue}%</strong>
                <span>归档度</span>
              </div>
              <ul className="dify-gate-list">
                <li className={session.status === "completed" ? "done" : undefined}>五阶段主线完成</li>
                <li className={latestDelivery ? "done" : undefined}>交付说明文档提交</li>
                <li className={archiveState.acceptanceGateDone ? "done" : undefined}>{archiveState.acceptanceGateLabel}</li>
                <li className={reportState.reportReady ? "done" : undefined}>
                  {reportState.reportGateLabel}
                </li>
              </ul>
            </section>

            <section className="agent-side-card portfolio-review-card">
              <p className="agent-kicker">Review Notes</p>
              <h2>教师与 AI 评审摘要</h2>
              <div className="portfolio-review-list">
                {portfolioReviewNotes.map((item) => (
                  <article key={item.label}>
                    <span>{item.label}</span>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="agent-side-card portfolio-actions-card">
              <p className="agent-kicker">Actions</p>
              <h2>成果操作</h2>
              <button className="agent-next-link" disabled={isBusy} onClick={handleRefreshEvidence} type="button">
                同步最新证据
              </button>
              <button className="dify-secondary-action" onClick={() => void handleCopySummary()} type="button">
                复制项目摘要
              </button>
              <button className="dify-secondary-action" onClick={onBackToWorkspace} type="button">
                返回学生首页
              </button>
            </section>
          </aside>
        </div>
      </main>
      <div
        className="portfolio-report-panel"
        aria-hidden={!isReportOpen}
        data-report-panel
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setIsReportOpen(false);
          }
        }}
      >
        <div className="portfolio-report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-title">
          <header>
            <div>
              <p className="agent-kicker">Capability Report</p>
              <h2 id="report-title">能力报告已生成</h2>
            </div>
            <button
              aria-label="关闭能力报告"
              onClick={() => setIsReportOpen(false)}
              type="button"
            >
              ×
            </button>
          </header>
          <div className="portfolio-report-body">
            <p>{portfolioCapabilityReport.summary}</p>
            <div className="portfolio-report-table">
              {portfolioCapabilityReport.rows.map((row) => (
                <article key={row.name}>
                  <span>{row.name}</span>
                  <strong>{row.level}</strong>
                  <p>{row.note}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
      {toastMessage ? (
        <div aria-live="polite" className="toast show" data-portfolio-toast role="status">
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}

function latestArtifactOfType(artifacts: Artifact[], artifactType: string): Artifact | null {
  return (
    artifacts
      .filter((artifact) => artifact.artifact_type === artifactType)
      .slice()
      .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
      .at(-1) ?? null
  );
}
