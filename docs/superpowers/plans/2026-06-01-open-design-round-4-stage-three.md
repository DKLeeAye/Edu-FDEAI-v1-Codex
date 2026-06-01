# Open Design 第二轮第 4 轮：阶段三知识工程决策链路

## 目标

以 Open Design `08-*` RAG 系列页面为视觉基准，将阶段三数据源识别、数据质量评估和后续 RAG 学习细页迁移到 Next.js 学生端，并保留现有阶段三 Artifact 与门禁链路。

## 本轮已覆盖

- `08-knowledge-decision.html`：数据源识别页面外壳、顶部导航、RAG 流程导航、Hero、原则条、练习和检查门禁。
- `08-rag-data-quality.html`：数据质量评估页面外壳、顶部导航、RAG 流程导航、Hero、原则条、样本查看、质量判断和检查门禁。
- `08-rag-cleaning.html` 至 `08-rag-risk-boundary.html`：已接入阶段三页内 10 步 RAG 导航，提供清洗与预处理、知识结构设计、分块策略、向量化与存储、召回策略、回答生成与引用、召回测试和风险边界的 Open Design 风格学习页。
- 继续保留现有阶段三后端能力：数据源识别记录、质量评估记录、知识工程决策、AI 评审、阶段完成门禁。

## 验证

- `cd frontend && npm run typecheck`
- `cd frontend && npm run lint`
- `cd frontend && npm run test:stage-three`
- `git diff --check`
- 截图对照：
  - `/private/tmp/edufde-v2-round4-ref-knowledge-decision.png`
  - `/private/tmp/edufde-v2-round4-ref-rag-data-quality.png`
  - `/private/tmp/edufde-v2-round4-prod-stage-three-current.png`
  - `/private/tmp/edufde-v2-round4-prod-rag-data-quality.png`
  - `/private/tmp/edufde-v2-round4b-ref-rag-cleaning.png`
  - `/private/tmp/edufde-v2-round4b-prod-rag-cleaning.png`
  - `/private/tmp/edufde-v2-round4b-ref-rag-risk-boundary.png`
  - `/private/tmp/edufde-v2-round4b-prod-rag-risk-boundary.png`

## 已知差异

- 当前 demo 数据已完成阶段三，因此从实验详情进入阶段三时默认落在 `review` 状态；截图通过“返回”链路回退到数据质量评估页验证。
- `08-rag-cleaning.html` 至 `08-rag-risk-boundary.html` 已完成生产前端路由内承载和页内导航覆盖；当前细页内容是 Open Design 风格的结构化生产页，尚未逐块复刻每个静态 HTML 的全部版式细节，后续如继续提高像素级一致性，应按单页做更细的视觉差异收敛。
