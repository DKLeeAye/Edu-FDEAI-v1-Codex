# EduFDE 第二阶段开发进度

> 本文件从第二阶段开始重新轻量记录。第一阶段原始进度流水已归档到 `docs/dev/archive/phase-1-productization-archive/progress.phase-1-original.md`。

## 一、当前阶段

当前阶段：**第二阶段，产品化精修与真实能力迭代**。

第一阶段已经完成：

- MVP 本地演示闭环。
- 正式学生端第一轮产品化。
- 登录页、课程列表、五阶段工作区、项目档案袋和学习画像展示。
- 阶段一教学引导模式第一轮功能体验。
- 阶段二三份文档串行工作台。
- 阶段三案例教学、五层知识实验室、项目决策和风险文档。
- 阶段四 Dify 构建与测试记录。
- 阶段五交付、验收和运维材料。
- AI Gateway fake provider 与硅基流动真实 provider 接入。
- 基础教师进度视图和规则学习画像。

当前优先主线：

1. Open Design vNext 第二轮像素级复刻升级。
2. 第 0 轮统一入口与登录页，第 1 轮学生入口与项目选择，第 2 轮阶段一访谈，后续依次推进阶段二至阶段五、AI 评审、教师端和管理端。
3. 复刻过程中补齐真实后端数据、权限、Artifact、AI Gateway、Rubric 和验收能力。
4. 黄灯债务确认、回应和清除闭环。
5. 课程成员权限、正式教师后台和真实 Dify API 后续分切片推进。

## 二、当前实现基线

已具备：

- 学生端：登录、课程列表、实验项目、五阶段工作区、最终项目档案袋、学习画像。
- 旧联调入口：`/dev-workbench` 保留学生五阶段、教师进度和学习画像低层验证能力。
- 后端：认证、课程、实验会话、统一 Artifact、阶段一至五服务、教师进度、学习画像、AI Gateway。
- 数据地基：租户、院校、用户、实验包版本、课程、实验会话、阶段记录、Artifact、Rubric、黄灯债务、AI 调用日志。
- AI：fake provider 和硅基流动 provider 均通过 AI Gateway 接入。

临时边界：

- 教师读取课程数据仍暂以 `courses.created_by_user_id` 判断。
- 学习画像仍是规则即时计算，不持久化。
- 项目档案袋当前由前端聚合阶段产物展示。
- 真实 Dify API、文件解析、向量库、正式评分和教师批改尚未实现。

## 三、最近完成

### 2026-06-02 阶段一整理提交页纳入固定视觉 QA

- 补齐 `06-interview-submit.html` 固定截图覆盖：`capture_open_design_vnext_qa.py` 现在同时采集 `round2-ref-interview-submit.png` 和从生产访谈实验室点击“完成并退出”后的 `round2-prod-interview-submit.png`。
- 修正生产整理提交页在无正式阶段一 Artifact 时出现空白表单的问题：新增 Open Design 提交页兜底草稿，仅在完全没有阶段一正式 Artifact 时启用；一旦存在真实访谈、拜访整理、问题总结或评估 Artifact，仍优先使用真实后端证据。
- 已重新补跑固定视觉 QA：`/private/tmp/edufde-vnext-qa-captures-current-17/manifest.json`，截图数 62，生产前端基址 `http://127.0.0.1:3002`。新 `round2-prod-interview-submit.png` 已显示访谈证据整理、需求理解草稿和提交前检查，和 Open Design 参考页默认填充状态对齐。

验证：

- `cd frontend && npm run test:stage-one`：通过，24 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `cd frontend && npm run build`：通过；沙箱内首次运行被 Turbopack 子进程端口绑定限制拦截，提升权限后通过，`/`、`/dev-workbench`、`/login` 均完成静态预渲染。
- `cd frontend && npm run test:stage-two`：通过，10 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run test:stage-three`：通过，51 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run test:stage-four`：通过，25 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run test:stage-five`：通过，23 项测试通过，保留 Node ESM warning。
- `cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts`：通过，10 项测试通过，保留 Node ESM warning。
- `cd . && .venv/bin/python -m pytest backend/tests/test_open_design_vnext_qa_script.py`：通过，5 项测试通过。
- `cd . && .venv/bin/python -m pytest backend/tests -q`：通过，146 项测试通过，保留 1 条 LangGraph pending deprecation warning。
- `cd . && .venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed --prod-base http://127.0.0.1:3002 --api-base http://127.0.0.1:18002 --ref-base http://127.0.0.1:4175 --cdp-base http://127.0.0.1:9224 --output-dir /private/tmp/edufde-vnext-qa-captures-current-17`：通过，62 张截图。

### 2026-06-02 阶段三风险边界预览默认隐藏修正

- 修正 `08-rag-risk-boundary.html` 对应生产风险边界页在初始截图中错误显示边界声明预览框的问题。
- 根因是 `.risk-preview { display: grid; }` 覆盖了 React 输出的 `hidden` 属性；新增 `.risk-preview[hidden] { display: none; }`，保留点击“预览边界声明”后的展开交互。
- 已重新补跑固定视觉 QA：`/private/tmp/edufde-vnext-qa-captures-current-15/manifest.json`，截图数 60，生产前端基址 `http://127.0.0.1:3002`。新 `round4-prod-rag-risk-boundary.png` 已确认底部预览默认隐藏，页面底部与 Open Design 参考图一致只显示“预览边界声明 / 保存边界草稿”按钮。

验证：

- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `cd . && .venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed --prod-base http://127.0.0.1:3002 --api-base http://127.0.0.1:18002 --ref-base http://127.0.0.1:4175 --cdp-base http://127.0.0.1:9224 --output-dir /private/tmp/edufde-vnext-qa-captures-current-15`：通过，60 张截图。

### 2026-06-02 阶段五交付文档只读表单色彩对齐

- 修正 `10-delivery-document.html` 对应生产交付文档页在 late QA 只读/回访态中，章节事实依据区和撰写区控件呈现偏红/偏粉的问题。
- 在 `.delivery-doc-page` 下增加页面专属冷灰蓝覆盖，限定影响交付文档页的 `evidence-shelf`、`textarea` 和 `select`，避免影响阶段二、阶段三和其他工作台表单样式。
- 已重新补跑固定视觉 QA：`/private/tmp/edufde-vnext-qa-captures-current-14/manifest.json`，截图数 60，生产前端基址 `http://127.0.0.1:3002`。新 `round6-prod-delivery-document-late.png` 中第一章证据区 RGB 均值已从修正前约 `[241,237,239]` 对齐到 `[236,241,244]`，接近参考图 `[237,242,246]`。

验证：

- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `cd . && .venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed --prod-base http://127.0.0.1:3002 --api-base http://127.0.0.1:18002 --ref-base http://127.0.0.1:4175 --cdp-base http://127.0.0.1:9224 --output-dir /private/tmp/edufde-vnext-qa-captures-current-14`：通过，60 张截图。

### 2026-06-02 阶段五验收清单 legacy 回填修正

- 修正 `10-delivery-acceptance.html` 对应生产验收确认页在 legacy `stage_5_acceptance_package` 缺少新版 `handover_checklist` 时，右侧 Readiness 已显示交付材料存在、但主体 Delivery Package 仍为 `0 / 7` 的状态不一致问题。
- 新增 `stageFiveDeliveryPackageChecksFromArtifacts(...)`，从交付文档、运维说明、阶段四实现记录和阶段四测试报告推导交付包七项清单；新版 `handover_checklist` 明确值仍优先保留。
- 已重新补跑固定视觉 QA：`/private/tmp/edufde-vnext-qa-captures-current-11/manifest.json`，截图数 60，生产前端基址 `http://127.0.0.1:3002`。新 `round6-prod-delivery-acceptance-late.png` 已显示交付包 `7 / 7`，Readiness 为 `80%`，仅保留最终验收结论未确认。

验证：

- `cd frontend && npm run test:stage-five`：通过，23 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `cd . && .venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed --prod-base http://127.0.0.1:3002 --api-base http://127.0.0.1:18002 --ref-base http://127.0.0.1:4175 --cdp-base http://127.0.0.1:9224 --output-dir /private/tmp/edufde-vnext-qa-captures-current-11`：通过，60 张截图。

### 2026-06-02 阶段四测试评分稀疏报告详情回填修正

- 修正 `09-agent-test-score.html` 对应生产测试评分页在旧 `stage_4_test_report.test_cases` 只有 `scenario` / `result` 时，Run Results 详情格子大面积空白的问题。
- 抽出阶段四平台测试用例模板，持久化报告仍决定状态、分数和结论；当旧报告缺少 `input`、`expected_output`、`actual_output` 或 `evidence_note` 时，按场景模板兜底展示测试问题、期望行为、智能体回答、命中证据和问题定位。
- 已重新补跑固定视觉 QA：`/private/tmp/edufde-vnext-qa-captures-current-10/manifest.json`，截图数 60，生产前端基址 `http://127.0.0.1:3002`。新 `round5-prod-agent-test-score-late.png` 已恢复三条测试结果详情。

验证：

- `cd frontend && npm run test:stage-four`：通过，25 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `cd . && .venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed --prod-base http://127.0.0.1:3002 --api-base http://127.0.0.1:18002 --ref-base http://127.0.0.1:4175 --cdp-base http://127.0.0.1:9224 --output-dir /private/tmp/edufde-vnext-qa-captures-current-10`：通过，60 张截图。

### 2026-06-02 阶段二方案工作台正式文档回填修正

- 修正 `07-solution-definition.html` 对应生产方案工作台在只有正式三份阶段二文档、但缺少或存在空白 section draft / submission Artifact 时的空字段问题。
- 新增 `createStageTwoSectionBackfillFromFormalDocuments(...)`，可从 `stage_2_requirements_document`、`stage_2_feasibility_report` 和 `stage_2_technical_solution` 派生六章工作台字段兜底内容。
- `StageTwoWorkspace` 现在按字段合并：已保存的学生草稿内容优先；字段为空时才使用正式文档回填，避免覆盖真实学生输入。
- 已重新补跑固定视觉 QA：`/private/tmp/edufde-vnext-qa-captures-current-9/manifest.json`，截图数 60，生产前端基址 `http://127.0.0.1:3002`。新 `round3-prod-stage-two-solution.png` 已恢复项目背景、需求目标、能力边界、总体技术方案和验收风险等章节内容；少数字段仍显示占位，是因为当前 seed 的正式文档未包含对应数据源或成本细项。

验证：

- `cd frontend && npm run test:stage-two`：通过，10 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `cd . && .venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed --prod-base http://127.0.0.1:3002 --api-base http://127.0.0.1:18002 --ref-base http://127.0.0.1:4175 --cdp-base http://127.0.0.1:9224 --output-dir /private/tmp/edufde-vnext-qa-captures-current-9`：通过，60 张截图。

### 2026-06-02 固定视觉 QA 第 1 轮账号边界修正

- 修正 `backend/scripts/capture_open_design_vnext_qa.py` 的第 1 轮学生页截图账号选择。
- 第 1 轮学生首页、实验详情和项目总览现在使用主 visual QA 学生 `lin@edufde.demo`，不再被阶段一专用账号 `wang@edufde.demo` 的未访谈状态污染。
- 第 2 轮阶段一导学和访谈实验室仍继续使用 `wang@edufde.demo`，确保 `06-interview-guide.html` / `06-interview-lab.html` 可以稳定对标未进入访谈的 Open Design 状态。
- 新增 QA 脚本测试，锁定 `ROUND_ONE_STUDENT_EMAIL != ROUND_TWO_STAGE_ONE_STUDENT_EMAIL`。
- 已重新补跑固定视觉 QA：`/private/tmp/edufde-vnext-qa-captures-current-7/manifest.json`，截图数 60，生产前端基址 `http://127.0.0.1:3002`。新 `round1-prod-student-home.png` 已显示 `林同学`，`round1-prod-student-project.png` 已进入主链路知识工程决策态。

验证：

- `cd . && .venv/bin/python -m pytest backend/tests/test_open_design_vnext_qa_script.py -q`：通过，5 项测试通过。
- `cd . && .venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed --prod-base http://127.0.0.1:3002 --api-base http://127.0.0.1:18002 --ref-base http://127.0.0.1:4175 --cdp-base http://127.0.0.1:9224 --output-dir /private/tmp/edufde-vnext-qa-captures-current-7`：通过，60 张截图。

### 2026-06-02 阶段一访谈页兜底对话对齐

- 对照 `06-interview-lab.html` 与最新 `round2-prod-stage-one-interview.png`，修正阶段一访谈实验室在无真实访谈 Artifact 时的 Open Design 兜底态。
- 新增 `stageOneOpenDesignPracticeSeedTurns` 和 `stageOneOpenDesignPracticeSeedFeedback`，将参考图中的四条兜底对话和 AI 实时反馈文案纳入 flow 层测试。
- 生产页现在会显示第二轮学生追问 `这些资料分散对您和一线质检员分别造成了什么影响？`，右侧 AI 实时反馈也恢复为 `你已经抓住客户访谈线索...`。
- 已重新补跑固定视觉 QA：`/private/tmp/edufde-vnext-qa-captures-current-6/manifest.json`，截图数 60，生产前端基址 `http://127.0.0.1:3002`。新 `round2-prod-stage-one-interview.png` 已包含参考图第二轮学生追问。

验证：

- `cd frontend && npm run test:stage-one`：通过，23 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `cd . && .venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed --prod-base http://127.0.0.1:3002 --api-base http://127.0.0.1:18002 --ref-base http://127.0.0.1:4175 --cdp-base http://127.0.0.1:9224 --output-dir /private/tmp/edufde-vnext-qa-captures-current-6`：通过，60 张截图。

### 2026-06-02 阶段五验收页顶部导航精修

- 对照 `10-delivery-acceptance.html` 与最新 `round6-prod-delivery-acceptance-late.png`，移除生产验收确认页顶部导航里多出来的 `同步进度`。
- 新增 `stageFiveAcceptanceNavigationItems`，将验收确认页顶部导航固定为 Open Design 原型四项：`阶段三 RAG`、`阶段四测试`、`交付文档`、`验收确认`。
- 已重新补跑固定视觉 QA：`/private/tmp/edufde-vnext-qa-captures-current-5/manifest.json`，截图数 60，生产前端基址 `http://127.0.0.1:3002`。新 `round6-prod-delivery-acceptance-late.png` 顶部导航已显示原型四项，且不再显示 `同步进度`。

验证：

- `cd frontend && npm run test:stage-five`：通过，21 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `cd . && .venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed --prod-base http://127.0.0.1:3002 --api-base http://127.0.0.1:18002 --ref-base http://127.0.0.1:4175 --cdp-base http://127.0.0.1:9224 --output-dir /private/tmp/edufde-vnext-qa-captures-current-5`：通过，60 张截图。

### 2026-06-02 项目档案袋首屏 Toast 遮挡修正

- 对照 `12-portfolio-report.html` 与最新 `round7-prod-portfolio-report.png`，修正档案袋首屏自动显示未同步 toast 的视觉偏差。
- 首次进入项目档案袋时不再自动渲染 `data-portfolio-toast`，避免遮挡右侧 `Review Notes` 卡片。
- `拉取项目证据` 和 `同步最新证据` 仍保留交互反馈：未检测到有效阶段五验收记录时显示 `未检测到阶段五验收记录，已保留演示档案结构`；验收已同步时显示 `已同步最新项目证据`。
- 新增 `portfolioEvidenceSyncToastCopy(...)` 和 `portfolioAcceptanceSyncedToastCopy`，把同步动作 toast 文案纳入模型测试。
- 已重新补跑固定视觉 QA：`/private/tmp/edufde-vnext-qa-captures-current-3/manifest.json`，截图数 60，生产前端基址 `http://127.0.0.1:3002`。新 `round7-prod-portfolio-report.png` 首屏 Review Notes 不再被 toast 覆盖。

验证：

- `cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts`：通过，10 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `cd . && .venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed --prod-base http://127.0.0.1:3002 --api-base http://127.0.0.1:18002 --ref-base http://127.0.0.1:4175 --cdp-base http://127.0.0.1:9224 --output-dir /private/tmp/edufde-vnext-qa-captures-current-3`：通过，60 张截图。

### 2026-06-02 固定视觉 QA 阶段四测试评分截图修正

- 修正 `backend/scripts/capture_open_design_vnext_qa.py` 中 late 阶段四测试评分页的等待文案。
- 新增 `LATE_STAGE_FOUR_STEPS` 常量，把 late 阶段四四个生产截图步骤从函数内联数据抽出，避免等待文案再次无测试覆盖地漂移。
- 新增 QA 脚本测试，锁定 `round5-prod-agent-test-score-late` 等待当前生产页标题 `用平台测试集验证 Dify 智能体是否达到交付门槛`。
- 已重新补跑固定视觉 QA：`/private/tmp/edufde-vnext-qa-captures-current-2/manifest.json`，截图数 60，生产前端基址 `http://127.0.0.1:3002`。本次确认 `round5-prod-agent-test-score-late.png`、`round6-prod-delivery-document-late.png`、`round6-prod-delivery-acceptance-late.png` 和 `round7-prod-portfolio-report.png` 均可生成。

验证：

- `cd . && .venv/bin/python -m pytest backend/tests/test_open_design_vnext_qa_script.py -q`：通过，4 项测试通过。
- `cd . && .venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed --prod-base http://127.0.0.1:3002 --api-base http://127.0.0.1:18002 --ref-base http://127.0.0.1:4175 --cdp-base http://127.0.0.1:9224 --output-dir /private/tmp/edufde-vnext-qa-captures-current-2`：通过，60 张截图。

### 2026-06-02 阶段三风险边界回访状态修正

- 修正 `08-rag-risk-boundary.html` 风险边界页的回访状态。
- 新增 `createStageThreeRiskBoundarySnapshotFromArtifacts(...)`，从最新 `stage_3_lab_experiment_record` 且 `selected_parameters.vnext_step = risk_boundary` 的过程记录恢复风险场景判断、边界字段、阶段四检查项和边界保存状态。
- `StageThreeRiskBoundaryLearningView` 首次进入时读取风险边界快照，避免刷新或重新登录后回到默认边界草稿和空白判断状态。

验证：

- TDD 红灯：`cd frontend && npm run test:stage-three` 先因 `createStageThreeRiskBoundarySnapshotFromArtifacts(...)` 不存在失败。
- `cd frontend && npm run test:stage-three`：通过，51 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-02 阶段三源识别与质量评估回访状态修正

- 修正 `08-knowledge-decision.html` 数据源识别页和 `08-rag-data-quality.html` 数据质量评估页的回访状态。
- 新增 `createStageThreeSourceSnapshotFromArtifacts(...)`，从最新 `stage_3_lab_experiment_record` 的 `source_decisions` 和 `checks` 恢复数据源处理判断与检查项。
- 新增 `createStageThreeQualitySnapshotFromArtifacts(...)`，从最新 `stage_3_lab_experiment_record` 的 `quality_assessments` 和 `checks` 恢复质量判断、已查看样本和检查项。
- `StageThreeWorkspace` 首次进入阶段三前两页时会读取这些快照，避免刷新或重新登录后回到空白判断状态。

验证：

- TDD 红灯：`cd frontend && npm run test:stage-three` 先因 `createStageThreeSourceSnapshotFromArtifacts(...)` 不存在失败。
- `cd frontend && npm run test:stage-three`：通过，50 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-02 阶段五验收对象从测试报告恢复修正

- 修正 `10-delivery-acceptance.html` 对应生产页在验收包尚未生成时的交付对象恢复逻辑。
- `stageFiveAcceptanceTargetFromArtifacts(...)` 现在可从 `stage_4_test_report.coverage_notes` 恢复应用名称、知识库名称和发布链接，同时继续从测试报告恢复阶段四评分。
- 当交付文档和阶段四 implementation Artifact 暂缺、但阶段四测试报告已存在时，验收确认页不再回退到默认项目名和 example Dify 链接。

验证：

- TDD 红灯：`cd frontend && npm run test:stage-five` 先因验收对象回退到默认值失败。
- `cd frontend && npm run test:stage-five`：通过，20 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-02 项目档案袋验收对象回访状态修正

- 修正 `12-portfolio-report.html` 对应生产页的项目总览恢复逻辑。
- `buildPortfolioSummaryCards(...)` 现在会在验收已同步时，从 `stage_5_acceptance_package.acceptance_scope` 恢复交付对象和发布链接。
- 当交付文档或阶段四 implementation Artifact 暂缺时，档案袋 Dify 应用卡片不再回退到“未同步”，仍可展示验收包里的交付对象与发布链接。

验证：

- TDD 红灯：`cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts` 先因 Dify 应用卡片回退到“未同步”失败。
- `cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts`：通过，10 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-02 阶段四测试评分对象回访状态修正

- 修正 `09-agent-test-score.html` 对应生产页的测试对象恢复逻辑。
- `stageFourPlatformRunFromPersistedReport(...)` 现在会从 `stage_4_test_report.coverage_notes` 中恢复测试对象、知识库名称、发布链接和访问说明。
- `StageFourWorkspace` 初始化测试页目标字段时也会读取已保存测试报告，避免 implementation Artifact 暂缺或不完整时，Quality Gate 的“测试对象记录完整”回访后仍保持未完成。

验证：

- TDD 红灯：`cd frontend && npm run test:stage-four` 先因测试对象回退为空字段失败。
- `cd frontend && npm run test:stage-four`：通过，24 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-02 阶段五验收对象回访状态修正

- 修正 `10-delivery-acceptance.html` 对应生产页的验收对象恢复逻辑。
- `stageFiveAcceptanceStateFromArtifacts(...)` 现在会优先从 `stage_5_acceptance_package.acceptance_scope` 中恢复交付对象、知识库名称和发布链接。
- 当阶段四 implementation 或交付文档 Artifact 暂缺时，重新进入验收确认页不会回退到演示默认项目名、默认知识库和 example 发布链接；阶段四分数仍从测试报告恢复。

验证：

- TDD 红灯：`cd frontend && npm run test:stage-five` 先因验收对象回退到默认值失败。
- `cd frontend && npm run test:stage-five`：通过，19 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-02 项目档案袋能力报告回访状态修正

- 新增 `buildPortfolioReportState(...)`，把能力报告生成、归档度和导出提示从 JSX 本地分支抽到可测试模型。
- 项目档案袋现在把已存在的 `stage_5_ai_delivery_review` 作为能力报告已生成的可回访证据。
- 刷新或重新登录后，只要已有阶段五 AI 交付审阅 Artifact，侧栏会显示“能力报告已生成”，归档度按已生成状态计算，导出归档包不再被本地 `isReportGenerated=false` 阻断。

验证：

- TDD 红灯：`cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts` 先因 `buildPortfolioReportState` 不存在失败。
- `cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts`：通过，9 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-02 项目档案袋退回修改误归档修正

- 修正 `12-portfolio-report.html` 对应生产页的阶段五验收同步判断。
- 项目档案袋现在同时检查 `stage_5_acceptance_package` 的 Artifact 状态和验收结论内容：
  - `draft` 不计入最终验收同步。
  - `submitted` 但验收结论为“退回修改”不计入最终验收同步。
  - “通过验收”和“有条件通过”仍可进入最终归档态。
- 该修正让档案袋与阶段五 Final Gate 的归档语义一致，避免学生退回修改后仍看到“项目已具备归档条件”。

验证：

- TDD 红灯：`cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts` 先因 `退回修改` 验收包被误归档失败。
- `cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts`：通过，8 项测试通过，保留 Node ESM warning。

### 2026-06-02 阶段五退回修改归档门禁修正

- 修正 `10-delivery-acceptance.html` 对应生产页的最终归档门禁。
- `isStageFiveAcceptanceReady(...)` 现在只允许“通过验收”和“有条件通过”进入最终归档保存；“退回修改”仍可作为验收结论选项展示，但不能让 Final Gate 通过。
- 页面侧 Readiness 的签收判断复用同一归档判断，避免退回修改时完成度误显示为签收完成。

验证：

- TDD 红灯：`cd frontend && npm run test:stage-five` 先因 `退回修改` 被误判为可归档失败。
- `cd frontend && npm run test:stage-five`：通过，18 项测试通过，保留 Node ESM warning。

### 2026-06-02 阶段四测试评分 Artifact 告警恢复

- 补齐 `09-agent-test-score.html` 对应生产页的旧测试报告恢复逻辑。
- 当 `stage_4_test_report` 只有 `coverage_notes` 而没有结构化 `test_cases` 时，页面现在可从 `告警项：2，严重失败：1` 恢复告警数和严重失败数。
- 该修正避免学生重新进入阶段四测试评分页时，Quality Gate 把已有严重失败的旧报告误显示为“无严重失败项”。

验证：

- TDD 红灯：`cd frontend && npm run test:stage-four` 先因 `coverage_notes` 告警数和严重失败数无法恢复失败。
- `cd frontend && npm run test:stage-four`：通过，23 项测试通过，保留 Node ESM warning。

### 2026-06-02 学生端目标边界收敛与项目档案袋评分恢复

- 目标模式范围已按最新要求收敛为学生端完成即可结束；教师端和 Rubric 规则结构化编辑器暂不继续推进。
- 已撤回本轮误启动的教师 / Rubric 前端结构化编辑改动，保持既有最小 Rubric JSON 表单能力不扩展。
- 项目档案袋阶段四测试评分恢复逻辑已补齐：优先读取最新 `stage_4_test_report`，当 `content_json.total_score` 不存在时，可从 `coverage_notes` 中明确的“总分：84”字段恢复为 `84 分`。
- 该修正用于避免学生重新进入 `12-portfolio-report.html` 对应档案袋时，阶段四已有测试报告但平台测试卡片仍显示 `--`，或多次测试后继续显示旧分数。

验证：

- TDD 红灯：`cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts` 先因 `coverage_notes` 评分无法恢复失败。
- TDD 红灯：`cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts` 再因多份阶段四测试报告时误读旧分数失败。
- `cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts`：通过，7 项测试通过，保留 Node ESM warning。
- `cd frontend && node --experimental-strip-types --test src/components/vnext-ops/teacher-rubric-flow.test.ts`：通过，3 项测试通过，确认撤回后教师 / Rubric 最小表单测试仍稳定。

### 2026-06-02 阶段五验收 Artifact 恢复闭环

- 新增 `stageFiveDocumentSnapshotFromArtifacts(...)`，从 `stage_5_delivery_document`、`stage_5_operations_guide`、阶段四 Dify implementation / 测试报告和阶段三知识工程决策恢复 `10-delivery-document.html` 对应的 6 章草稿与章节保存状态。
- 扩展阶段五交付文档 payload，在 `delivery_summary` 中结构化保存“未纳入资料”，避免重新进入文档页时知识库范围章节只能依赖旧的限制项拼接。
- 新增 `stageFiveAcceptanceStateFromArtifacts(...)` 和 `stageFiveAcceptanceTargetFromArtifacts(...)`，从 `stage_5_acceptance_package`、`stage_5_delivery_document`、`stage_5_operations_guide`、阶段四 Dify implementation 和阶段四测试报告恢复验收页状态。
- 恢复内容包括交付对象、知识库名称、发布链接、阶段四测试评分、交付包清单、文档/运维说明提交状态、模拟验收状态、验收结论、归档检查和验收说明。
- `StageFiveWorkspace` 改为复用这些纯函数，避免文档与验收恢复逻辑只存在于组件私有实现中，后续更容易用单测锁住 `10-delivery-document.html` 和 `10-delivery-acceptance.html` 对应生产页的真实 Artifact 状态。

验证：

- `cd frontend && npm run test:stage-five`：通过，17 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-02 阶段四 Dify 入门 Artifact 恢复闭环

- 新增 `stageFourOnboardingSnapshotFromImplementation(...)`，从现有 `stage_4_dify_implementation` Artifact 的 `implementation_notes` 与 `onboarding_checklist` 恢复 Dify 入门页 8 步检查、保存状态和关键回填字段。
- 新增 `stageFourBuildSnapshotFromImplementation(...)`，从同一 Artifact 的 `knowledge_base_notes`、`tool_configuration_notes`、`implementation_notes`、`build_task_checklist` 和应用链接字段恢复正式搭建页 12 步检查、保存状态和全部回填字段。
- 扩展阶段四 implementation payload 中的 `Dify 入门记录` 段落，保存画布识别、开始变量、模型、LLM 配置、节点连线、Preview 调试和练习发布链接，不新增后端 Artifact 类型。
- 阶段四工作区改为未编辑时读取 Artifact 快照、用户编辑后切到本地草稿，避免刷新或重新进入后 `09-dify-onboarding.html` 和 `09-agent-build-test.html` 对应页面退回空白状态。

验证：

- `cd frontend && npm run test:stage-four`：通过，22 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-01 Open Design vNext 第二轮像素级复刻目标与第 0 轮入口 / 登录页

- 新目标已通过目标模式创建：以 `http://127.0.0.1:4175/index.html#login-entry` 为第一入口，按 Open Design 静态原型逐页一比一复刻到 Next.js 生产前端，并在复刻过程中补齐真实后端数据、权限、Artifact、AI Gateway、Rubric 和验收能力。
- 新增 `docs/superpowers/specs/2026-06-01-open-design-pixel-replication-v2-design.md`，记录第 0 轮至第 8 轮页面清单、复刻标准、后端边界和验收门禁。
- 新增 `docs/superpowers/plans/2026-06-01-open-design-round-0-public-login.md`，记录第 0 轮统一入口与登录页实施计划和验证证据。
- 新增 `frontend/app/open-design-vnext.css`，从 Open Design `assets/app.css` 迁移原型视觉基线，后续逐页复刻不再以旧 Tailwind 组件风格作为视觉基准。
- 新增 `frontend/src/components/vnext-public/marketing-home.tsx`，将 Open Design `index.html` 迁移为生产 Next.js 公共首页，保留 `#login-entry` 统一入口结构。
- 新增 `frontend/src/components/vnext-public/login-portal.tsx` 和 `frontend/app/login/page.tsx`，将 Open Design `login.html` 迁移为生产登录页，并接入真实 `login` API。
- 新增 `frontend/src/lib/auth-storage.ts`，统一生产 token storage key。
- 修改 `frontend/app/page.tsx`，未登录状态不再显示旧 React 登录屏，而是显示 Open Design 公共首页；登录后仍进入现有已认证工作区，作为第 1 轮继续复刻的承接。
- 修改 `frontend/next.config.mjs`，关闭 dev indicator，避免本地视觉对比时出现 Open Design 中不存在的 Next.js 标记。

验证：

- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。
- 当前仓库后端已在 `http://127.0.0.1:18002` 启动，`/health` 返回 `EduFDE Core API`。
- `POST http://127.0.0.1:18002/api/v1/auth/login` 使用 `student@edufde.demo / EduFDE-demo-123` 返回 bearer token。
- 生产前端已在 `http://127.0.0.1:3001` 启动并指向 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:18002`。
- 截图已保存：
  - Open Design 首页顶部参考：`/private/tmp/edufde-v2-round0-ref-top.png`
  - 生产首页：`/private/tmp/edufde-v2-round0-prod-home.png`
  - Open Design 登录页参考：`/private/tmp/edufde-v2-round0-ref-login.png`
  - 生产登录页：`/private/tmp/edufde-v2-round0-prod-login.png`

已知偏差：

- `index.html#login-entry` 在 headless Chrome `--screenshot` 模式下受静态原型 hash/reveal 交互影响，截图为空白视口；Open Design 顶部首页截图与生产顶部首页截图已完成对比，`#login-entry` 仍可通过浏览器手动查看。
- 生产 `/login?role=student` 为了联调真实登录预填 demo 账号密码；Open Design 静态参考为空输入。后续可增加视觉 QA 模式隐藏预填值。

### 2026-06-01 第 1 轮学生首页像素级复刻启动

- 已读取 `student-home.html`、`student-experiment-detail.html` 和 `05-student-project.html` 原型，确认第 1 轮应先替换登录后的学生首页，再进入实验详情和项目阶段壳层。
- 重写 `frontend/src/components/student-product/course-list.tsx`，将旧 Tailwind 课程卡片页替换为 Open Design `student-home.html` 的学生侧栏、欢迎区、当前实验 Hero、实验卡片、FDE 教学理念和课程信息区。
- 修改 `frontend/app/page.tsx`，学生登录后的 `courses` view 不再套旧 `AppShell`，直接渲染 Open Design 学生首页。
- 学生首页继续接入真实课程、实验会话、阶段状态和学习画像数据，`继续实验 / 进入实验` 仍调用现有 `onEnterCourse`，不会绕过后端会话逻辑。

验证：

- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- 使用当前 EduFDE 后端登录 API 获取学生 token，并通过 Chrome CDP 写入 production localStorage 后截图验证登录后学生首页渲染。
- Open Design 学生首页参考截图：`/private/tmp/edufde-v2-round1-ref-student-home.png`。
- 生产学生首页截图：`/private/tmp/edufde-v2-round1-prod-student-home.png`。

已知偏差：

- 生产学生首页使用真实 demo 数据，因此显示 `演示同学`、1 个实验可继续、当前阶段为真实会话阶段；Open Design 原型为 `林同学`、2 个实验可继续、当前阶段为需求访谈。后续需要建立视觉 QA seed 或演示数据映射，使截图级验收不受真实完成态数据干扰。
- 第 1 轮尚未完成 `student-experiment-detail.html` 和 `05-student-project.html` 的生产复刻。

### 2026-06-01 教师端 Open Design vNext P0 设计准备

- 新增 `docs/superpowers/specs/2026-06-01-teacher-vnext-p0-design.md`，将教师端第一批正式产品化切片收敛为 `教师工作台 -> 课程运行看板 -> 课中五阶段进度矩阵 -> 学生阶段 Artifact 摘要与学习画像`。
- 明确教师端 P0 以 Open Design vNext 的 `01-teacher-dashboard.html` 和 `04-class-monitor.html` 为体验基准；`02-course-setup.html` 与 `03-experiment-library.html` 涉及课程发布、实验包版本治理、Rubric 配置、模型配额等后端能力，暂作为后续切片输入。
- 明确 P0 不新增后端接口，复用现有教师进度接口和学习画像接口；教师课程读取边界继续暂用 `courses.created_by_user_id`，后续仍需课程成员权限模型替换。
- 明确后续实施应新增正式教师端组件模块，替换 `frontend/app/page.tsx` 中教师角色的“待开放”状态，同时保留 `/dev-workbench` 作为低层联调入口。

验证：

- 已完成规格自查，`docs/superpowers/specs/2026-06-01-teacher-vnext-p0-design.md` 中未发现 `TBD`、`TODO`、`待定` 或占位标记。
- 本次只更新设计和治理文档，未改动运行代码，未运行前后端测试。

### 2026-06-01 阶段五新版交付验收流程 P0

- 新增 `docs/superpowers/specs/2026-06-01-stage-five-vnext-delivery-design.md`，把 Open Design vNext 阶段五固化为 `交付文档工作台 -> 交付验收确认 -> AI 交付审阅 -> 完成项目并进入档案袋` 正式路径；旧阶段五三张独立表单不再作为正式产品路径。
- 新增 `docs/superpowers/plans/2026-06-01-stage-five-vnext-delivery.md`，完成阶段五 vNext 的实施计划、TDD 执行记录和验收证据。
- 新增阶段五 vNext helper：`deriveStageFiveVNextStep`、6 章交付文档章节模型、本地章节评分、文档门禁、交付说明 / 运维说明 payload 映射、验收准备度门禁、模拟客户验收追问和验收材料 payload 映射。
- `ExperimentWorkspace` 的阶段五状态改为和阶段一至阶段四一致的 derived/manual step 模型，并纳入聚焦式 vNext 布局。
- `StageFiveWorkspace` 已切换为新版两步正式工作台：
  - `document`：6 章交付说明文档撰写、AI 检查、章节保存和文档提交。
  - `acceptance`：交付对象、7 项交付包清单、交付文档确认、模拟客户验收、验收结论、AI 交付审阅和最终完成。
- P0 后端合约保持不变：文档提交继续保存 `stage_5_delivery_document` 与 `stage_5_operations_guide`，验收确认继续保存 `stage_5_acceptance_package`，AI 审阅继续通过 AI Gateway 保存 `stage_5_ai_delivery_review`，阶段完成继续将 session 置为 completed。
- 阶段五正式组件中已移除旧正式主路径中的三表单体验和旧完整性提示文案。

验证：

- `cd frontend && npm run test:stage-five`：通过，9 项测试通过。
- `cd frontend && npm run test:stage-four`：通过，10 项测试通过。
- `cd frontend && npm run test:stage-one`：通过，22 项测试通过。
- `cd frontend && npm run test:stage-two`：通过，9 项测试通过。
- `cd frontend && npm run test:stage-three`：通过，28 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python -m pytest backend/tests/test_stage_five.py -q`：通过，18 项测试通过；存在 1 条 LangGraph deprecation warning。
- 浏览器验证：Browser 插件仍返回无可用 Codex browser route，改用本地 headless Chrome CDP 访问 `http://127.0.0.1:3002` + `http://127.0.0.1:18002`；本地后端以 `AI_PROVIDER=fake` 启动用于验收。使用本地验证学生 `codex-stage-four-vnext-20260531183604@edufde.demo` 从阶段五 unlocked 状态完整走通 6 章文档 AI 检查和保存、提交交付文档、保存交付验收记录、生成 AI 交付审阅、完成阶段五并进入最终项目档案袋。
- 浏览器 console：阶段五完整流程中 error/warn 为 0。
- 移动视口验证：`390x844` 下阶段五验收确认页可见，`documentElement.scrollWidth=390`、`body.scrollWidth=390`，无横向溢出。
- 后端落库核对：验证会话 `403a19f0-b02c-49eb-9fa0-242640f1dad0` 最终状态为 `session_status=completed`，`stage_1` 至 `stage_5` 均为 `completed`；阶段五 Artifact 包含 `stage_5_delivery_document=1`、`stage_5_operations_guide=1`、`stage_5_acceptance_package=1`、`stage_5_ai_delivery_review=1`。
- 截图保存到 `/private/tmp/edufde-stage-five-vnext-document.png`、`/private/tmp/edufde-stage-five-vnext-acceptance.png`、`/private/tmp/edufde-stage-five-vnext-completed.png`、`/private/tmp/edufde-stage-five-vnext-mobile.png`。

已验证边界：

- 本次 P0 使用本地确定性章节评分和模拟客户验收追问，不新增后端章节表或真实客户会议记录。
- 阶段五文档页会一次提交交付说明和运维说明两个现有 Artifact；验收页提交验收材料 Artifact，随后复用既有 AI Gateway 交付审阅。
- 浏览器验证使用 headless Chrome CDP fallback，未使用 Browser 插件截图能力，原因是插件返回无可用 route。

### 2026-06-01 阶段四新版智能体构建与测试流程 P0

- 新增 `docs/superpowers/specs/2026-06-01-stage-four-vnext-agent-build-design.md`，把 Open Design vNext 阶段四固化为 `实现导学 -> Dify 入门 -> 正式搭建工作台 -> 测试与评分` 正式路径；旧 `home -> build_test_workbench` 和任务轨不再作为正式产品路径。
- 新增 `docs/superpowers/plans/2026-06-01-stage-four-vnext-agent-build.md`，完成阶段四 vNext 的实施计划、TDD 执行记录和验收证据。
- 阶段四正式路径已切换为新版 09 系列流程：导学页承接阶段三知识工程决策，Dify 入门要求 8 个 Chatflow 操作步骤，正式搭建要求 12 个知识库 / Chatflow 构建步骤，测试评分页运行平台模拟测试集并保存评分记录。
- P0 后端合约保持不变：正式构建继续保存为 `stage_4_dify_implementation`，平台测试继续保存为 `stage_4_test_report`，AI 测试反馈继续保存为 `stage_4_ai_test_review`，阶段完成继续解锁阶段五。
- 新增阶段四 vNext helper：`deriveStageFourVNextStep`、导学 / 入门 / 构建门禁、vNext 构建 draft 到现有 implementation payload 的映射、确定性平台测试 run 和测试报告 payload 映射。
- `ExperimentWorkspace` 的阶段四状态改为和阶段一至阶段三一致的 derived/manual step 模型，重新进入已有阶段四产物的会话时会自动恢复到测试评分页。
- 阶段四正式组件中已移除旧正式主路径文案 `阶段四主页`、`阶段四核心工作台`、`阶段四任务轨`。

验证：

- `cd frontend && npm run test:stage-four`：通过，10 项测试通过。
- `cd frontend && npm run test:stage-one`：通过，22 项测试通过。
- `cd frontend && npm run test:stage-two`：通过，9 项测试通过。
- `cd frontend && npm run test:stage-three`：通过，28 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python -m pytest backend/tests/test_stage_four.py -q`：通过，16 项测试通过；存在 1 条 LangGraph deprecation warning。
- 浏览器验证：Browser 插件仍返回无可用 Codex browser route，改用本地 headless Chrome CDP 访问 `http://127.0.0.1:3002` + `http://127.0.0.1:18002`；本地后端以 `AI_PROVIDER=fake` 启动用于验收。使用本地验证学生 `codex-stage-four-vnext-20260531183604@edufde.demo` 完整走通实现导学 4 项检查、Dify 入门演示记录、正式搭建演示记录保存、测试对象拉取、自动化测试评分、测试评分记录保存、AI 测试反馈生成、阶段四完成。最终数据库状态为 `stage_1=completed`、`stage_2=completed`、`stage_3=completed`、`stage_4=completed`、`stage_5=not_started`。
- 后端落库核对：验证会话 `403a19f0-b02c-49eb-9fa0-242640f1dad0` 包含 `stage_3_knowledge_decision=accepted`、`stage_4_dify_implementation=draft`、`stage_4_test_report=draft`、`stage_4_ai_test_review=reviewed`。
- 浏览器 console：阶段四完整流程中 error/warn 为 0。
- 截图保存到 `/private/tmp/edufde-stage-four-vnext-completed.png`。

已验证边界：

- 本次 P0 采用确定性平台测试集模拟自动化评分，未真实调用 Dify API 或学生发布链接。
- Dify 入门记录作为阶段四 implementation payload 的组成部分保存，不新增独立后端 Artifact 类型。
- 浏览器验证使用 headless Chrome CDP fallback，未使用 Browser 插件截图能力，原因是插件返回无可用 route。

### 2026-06-01 阶段三新版知识工程决策流程 P0

- 新增 `docs/superpowers/specs/2026-06-01-stage-three-vnext-knowledge-design.md`，把 Open Design vNext 阶段三固化为 `数据源识别 -> 数据质量评估 -> 知识工程决策 -> AI 评审与阶段四交接` 正式路径；旧案例教学 / 五层实验室 / 项目决策 / 风险文档四入口不再作为正式首屏。
- 新增 `docs/superpowers/plans/2026-06-01-stage-three-vnext-knowledge.md`，完成阶段三 vNext 的实施计划、执行记录和验收证据。
- 阶段三正式路径已切换为新版 RAG 知识工程流程：首屏是数据源识别，随后进入数据质量评估，再承接现有知识工程决策文档和 AI 评审完成阶段三。
- P0 后端合约保持不变：数据源识别和质量评估过程证据复用 `stage_3_lab_experiment_record`，并通过 `selected_parameters.vnext_step` 区分 `source_decision` 与 `quality_assessment`；正式决策继续保存为 `stage_3_knowledge_decision`，AI 评审继续保存为 `stage_3_ai_review`，阶段完成继续解锁阶段四。
- `ExperimentWorkspace` 的阶段三状态改为和阶段一、二一致的 derived/manual step 模型，重新进入已有阶段三产物的会话时会自动恢复到当前应处步骤。
- 阶段三正式组件中已移除旧正式主路径文案 `知识工程决策中心`、`预置案例教学`、`五层知识实验室`、`四入口推进`。

验证：

- `cd frontend && npm run test:stage-three`：通过，28 项测试通过。
- `cd frontend && npm run test:stage-one`：通过，22 项测试通过。
- `cd frontend && npm run test:stage-two`：通过，9 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python -m pytest backend/tests/test_stage_three.py -q`：通过，13 项测试通过；存在 1 条 LangGraph deprecation warning。
- 浏览器验证：Browser 插件本轮无可用 Codex browser route，改用本地 headless Chrome CDP 访问 `http://127.0.0.1:3002` + `http://127.0.0.1:18002`；使用本地验证学生 `codex-stage-three-vnext-20260531175957@edufde.demo` 完整走通数据源识别 4 项判断与 4 项检查、数据质量 4 个样本详情与 4 项判断、知识工程决策保存、AI 评审生成、阶段三完成并解锁阶段四。最终页面显示 `阶段三已完成，阶段四已解锁`。
- 后端落库核对：验证会话 `ad6e4a21-727f-4c10-9c9c-b67c03b0ba75` 的阶段状态为 `stage_1=completed`、`stage_2=completed`、`stage_3=completed`、`stage_4=not_started`、`stage_5=locked`；Artifact 包含 `stage_2_technical_solution=1`、`stage_3_lab_experiment_record=2`、`stage_3_knowledge_decision=1`、`stage_3_ai_review=1`；两个 lab record 的 `vnext_step` 分别为 `source_decision`、`quality_assessment`。
- 浏览器 console：阶段三完成态页面重载并重新进入后无业务 error/warn；仅存在 `http://127.0.0.1:3002/favicon.ico` 404。
- 截图保存到 `/private/tmp/edufde-stage-three-vnext-source.png`、`/private/tmp/edufde-stage-three-vnext-decision.png`、`/private/tmp/edufde-stage-three-vnext-completed.png`。

已验证边界：

- 本次 P0 重点覆盖阶段三主路径和后端持久化；旧案例教学和五层实验室底层 helper/test 仍在仓库中作为遗留能力保留，但不再由正式 `StageThreeWorkspace` 渲染。
- 数据源识别和质量评估暂复用 lab record Artifact，不新增后端表；后续如要做教师逐项批改、数据集版本管理或质量评分，可以再拆正式结构化模型。
- 浏览器验证使用 headless Chrome CDP fallback，未使用 Browser 插件截图能力，原因是插件返回无可用 route。

### 2026-06-01 阶段二新版方案定义流程 P0

- 新增 `docs/superpowers/specs/2026-06-01-stage-two-vnext-solution-design.md`，把 Open Design vNext 阶段二固化为 `guide -> workbench` 正式体验：旧阶段二三份文档串行首页不再作为正式入口。
- 新增 `docs/superpowers/plans/2026-06-01-stage-two-vnext-solution.md`，完成阶段二 vNext 的 TDD 和实施计划记录。
- 阶段二正式路径已切换为新版导学页和六章方案工作台：`项目背景与客户问题`、`需求分析`、`可行性研究`、`能力边界`、`总体技术方案`、`验收与风险说明`。
- 六章 UI 继续映射到现有九个后端小节，保持 Artifact、AI Gateway、小节追问、文档汇总、文档评审、黄灯债务和阶段三解锁合约不变：
  - `background -> requirements_context`
  - `requirement -> requirements_scope`
  - `feasibility -> feasibility_data + feasibility_value`
  - `boundary -> feasibility_technical`
  - `technical -> technical_route + technical_flow + technical_handoff`
  - `acceptance -> requirements_acceptance`
- 新增阶段二导学四项确认门禁、六章章节进度、章节级保存草稿、章节级 AI 检查、章节级确认保存和报告预览。
- 修复阶段一 / 阶段二 vNext step 在异步 Artifact 加载后的恢复逻辑：重新进入已有阶段产物的会话时会回到派生出的正式工作区，仍允许学生手动返回导学页。

验证：

- `cd frontend && npm run test:stage-two`：通过，9 项测试通过。
- `cd frontend && npm run test:stage-one`：通过，22 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python -m pytest backend/tests/test_stage_two.py -q`：通过，11 项测试通过；存在 1 条 LangGraph deprecation warning。
- 浏览器验证：使用 `http://127.0.0.1:3002` + `http://127.0.0.1:18002`，从 `codex-stage-one-clean@edufde.demo` 的阶段一完成会话进入阶段二；确认首屏为新版导学页，4 项检查后进入六章工作台；旧文案 `先学会判断`、`进入阶段二核心操作区`、`三份文档串行` 未出现在正式工作台；第一章完成 `保存本章草稿 -> AI 检查本章 -> 确认合格并保存本章`，报告预览可打开；浏览器 console error/warn 为 0。截图保存到 `/private/tmp/edufde-stage-two-vnext-workbench.png`。
- 浏览器刷新恢复验证：阶段二已有小节 Artifact 后，重新进入项目会直接恢复到新版六章工作台；第一章状态显示为 `已保存 · 1/1 小节已确认`，不再重复显示 `已保存 · 已保存`。
- 后端落库核对：阶段二 `requirements_context` 已生成 `stage_2_section_draft`、`stage_2_section_review`、`stage_2_section_submission` 三类 Artifact，状态分别为 `draft`、`reviewed`、`submitted`。

已验证边界：

- 本次浏览器主动验收覆盖第一章小节级链路和报告预览；六章全部写完、三份正式文档汇总、文档级 AI 评审、阶段二完成解锁阶段三仍由既有后端回归测试覆盖，尚未在新版六章 UI 中手动全量跑完。
- 阶段二旧底层接口和文档级能力保留为后端契约，不作为正式首屏流程展示。

### 2026-06-01 阶段一新版访谈流程 P0 正式开发启动

- 新增 `docs/superpowers/specs/2026-06-01-stage-one-vnext-interview-design.md`，把 Open Design vNext 的 `06-interview-guide.html`、`06-interview-lab.html` 和 `06-interview-submit.html` 固化为阶段一正式开发切片规格。
- 新增 `docs/superpowers/plans/2026-06-01-stage-one-vnext-interview.md`，形成 guide → lab → submit 的实施计划和 TDD 执行步骤。
- 已完成计划 Task 1：为阶段一 vNext 步骤推导、提交草稿映射和提交门禁补充前端纯函数测试与实现。
- 已完成计划 Task 2：`ExperimentWorkspace` 和 `StageOneWorkspace` 已从旧 `home/guided/practice` 状态边界切换到新版 `guide/lab/submit` step 边界。
- 已完成计划 Task 3：新增阶段一 vNext 导学页 `StageOneGuideView`，正式首屏不再展示旧“教学引导 / 项目实战”双入口。
- 已完成计划 Task 4：新增阶段一 vNext 访谈实验室 `StageOneInterviewLabView`，按新版 `06-interview-lab.html` 建立 AI 客户访谈、推荐追问、实时反馈、需求/痛点/关键信息、待追问问题、实训评分和访谈记录草稿面板。
- 已完成计划 Task 5：新增阶段一 vNext 整理提交页 `StageOneSubmitView`，按新版 `06-interview-submit.html` 建立访谈证据整理、需求理解草稿、提交前检查、AI 预评建议和阶段一提交 action card。
- 新增 `deriveStageOneVNextStep`、`createStageOneVNextSubmitDraft`、`isStageOneVNextSubmitReady`、`isStageOneFocusedStep` 等前端 helper，为后续替换旧“双入口”正式 UI 打基础。
- 阶段一正式路径已从旧 `home/guided/practice` 双入口切换为 `guide/lab/submit`，旧六关卡教学引导 API 和低层组件代码暂未删除，但已从正式阶段一主路径 props 中移出。

验证：

- `cd frontend && npm run test:stage-one`：通过，22 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `cd frontend && npm run test:stage-two`：通过，4 项测试通过。
- `cd frontend && npm run test:stage-three`：通过，21 项测试通过。
- `cd frontend && npm run test:stage-four`：通过，4 项测试通过。
- `.venv/bin/python -m pytest backend/tests/test_stage_one.py -q`：通过，16 项测试通过；系统 `python3` 为 Python 3.9，会因后端 Python 3.11+ 类型语法在收集阶段失败，后续后端验证应使用 `.venv`。
- 浏览器验证：使用 `http://127.0.0.1:3002` + `http://127.0.0.1:18002` 登录 demo 学生成功，项目工作区可打开；从已完成项目进入阶段一后确认 vNext 提交整理页渲染，包含 `把客户访谈整理成可进入阶段二的需求证据。`、`访谈证据整理`、`需求理解草稿`、`提交前检查` 等新版界面元素；旧 `项目实战模式` 和 `返回阶段一主页` 不再出现；完成态 action 按钮显示为 `阶段一已提交` 且禁用；浏览器 console error/warn 为 0。截图保存到 `/private/tmp/edufde-stage-one-vnext-submit.png` 和 `/private/tmp/edufde-stage-one-vnext-submit-actions.png`。
- clean 会话浏览器验收：新增本地验证学生 `codex-stage-one-clean@edufde.demo`，完整走通 `guide -> lab -> submit` 主动交互闭环；确认首屏为新版导学页，访谈实验室可发送问题并持久化 AI 客户回复，整理提交页可保存访谈记录和需求草稿、生成综合评估、完成 5 项提交前检查并提交阶段一；提交后阶段一显示已完成，阶段二解锁；旧 `教学引导模式 / 项目实战模式` 双入口未出现；浏览器 console error/warn 为 0。截图保存到 `/private/tmp/edufde-stage-one-clean-e2e-complete.png`。
- clean 会话后端落库核对：该验证学生仅有 1 个实验会话，状态为 `in_progress`；阶段状态为 `stage_1=completed`、`stage_2=not_started`、`stage_3/stage_4/stage_5=locked`；Artifact 类型包含 `stage_1_interview_turn`、`stage_1_visit_notes`、`stage_1_problem_summary`、`stage_1_evaluation`。
- `git diff --check`：通过。

### 2026-05-31 Open Design vNext 前端原型接收区准备

- 新增 `docs/prototypes/open-design-vnext/`，用于接收外部 Open Design 设计平台导出的新版静态前端原型。
- 新增原型接收区 README，明确该目录文件作为正式产品体验基准，不作为生产前端源码直接接入。
- 更新 `docs/README.md`、`docs/EduFDE_前端产品UI设计规格_v2.0.md` 和 `docs/dev/current-context.md`，声明前端驱动型产品化迭代的设计输入位置和工程边界。
- 2026-05-31 后续补充：确认 Open Design vNext 原型已拷贝完成，当前包含 69 个文件、34 个 HTML 页面、全局 CSS / JS、PNG 设计截图和伴随文档副本。
- 新增 `docs/dev/open-design-vnext-prototype-audit-2026-05-31.md`，完成初步原型审计、页面范围映射、当前实现差异、Artifact 映射建议和后续迁移切片顺序。
- 更新 `docs/dev/decisions.md`，明确 Open Design vNext 原型作为设计输入，不作为生产源码直接接入，并采用垂直切片迁移策略。
- 2026-05-31 再确认：Open Design vNext 是升级后的正式产品体验基准。与新版设计冲突的旧阶段一“教学引导模式 / 项目实战模式”双入口不再作为正式产品形态保留，只能作为遗留兼容或迁移辅助。

验证：

- 已读取原型目录、关键 HTML、`assets/app.css`、`assets/app.js`、`critique.json` 和导出元数据。
- 已通过本地静态服务确认原型需要以 HTTP 根目录方式查看，不能直接依赖 `file://`。
- 未运行后端或前端测试，本次改动不涉及业务代码。

### 2026-05-31 第一阶段工程治理文档归档与第二阶段上下文压缩

- 建立第一阶段归档目录：`docs/dev/archive/phase-1-productization-archive/`。
- 归档上一阶段原始工程治理文件，包括旧版 `AGENTS.md`、`docs/dev/README.md`、`progress.md`、`decisions.md`、MVP 收口审查、阶段性复盘、阶段一 UI 精修基线和 student2 走查材料。
- 重写根目录 `AGENTS.md` 为第二阶段轻量开发指南。
- 重写 `docs/dev/README.md`、`progress.md`、`decisions.md`，压缩默认上下文。
- 新增 `docs/dev/current-context.md` 和 `docs/dev/phase-2-governance.md`。

验证：

- 已检查当前活跃文档对已移出旧路径的引用：无结果。
- 已检查当前活跃文档临时标记：无结果。
- 已统计当前默认治理上下文：`AGENTS.md` 与 `docs/dev` 活跃治理文件合计 920 行。
- 已检查归档目录：student2 走查 README 和 9 张截图已归档。
- `git diff --check`：通过。

### 2026-06-01 Open Design 第二轮第 1 轮：学生入口与项目选择复刻

- 已将登录后的学生端入口从旧 `AppShell / CourseList` 视觉体系迁移为 Open Design `student-home.html` 风格，并继续使用真实课程、实验会话和学习画像数据。
- 已新增 `StudentExperimentDetail`，复刻 `student-experiment-detail.html` / 制造业质检实验说明页；课程入口现在先进入实验说明页，再进入项目工作台或具体阶段工作区。
- 已新增 `StudentProjectOverview`，复刻 `05-student-project.html` 的学生项目工作台总览结构；指标、Artifact 数量、阶段状态和产物表接入真实后端数据。
- 已补充 Open Design CSS 中 React `button` 元素的兼容覆盖，确保新版页面使用按钮承载真实交互时仍继承静态原型的卡片、导航和阶段行视觉。
- 已新增执行记录：`docs/superpowers/plans/2026-06-01-open-design-round-1-student-entry.md`。

验证：

- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。
- 本地服务：Open Design 原型 `http://127.0.0.1:4175/index.html#login-entry`，Next.js 生产前端 `http://127.0.0.1:3001`，FastAPI 后端 `http://127.0.0.1:18002`。
- 截图验收：
  - `/private/tmp/edufde-v2-round1-ref-student-home.png`
  - `/private/tmp/edufde-v2-round1-prod-student-home.png`
  - `/private/tmp/edufde-v2-round1-ref-experiment-detail.png`
  - `/private/tmp/edufde-v2-round1-prod-experiment-detail.png`
  - `/private/tmp/edufde-v2-round1-ref-project-overview.png`
  - `/private/tmp/edufde-v2-round1-prod-project-overview.png`
- 已知差异：生产页使用真实 demo 数据，因此学生姓名、当前阶段、完成率、Artifact 数量和产物表内容可能与静态截图不同；后续如需做严格视觉回归，应补一个固定视觉 QA seed。

### 2026-06-01 Open Design 第二轮第 2 轮：阶段一需求访谈链路复刻

- 已将阶段一 `lab` 访谈实战页从旧 Tailwind 工作台视觉切换为 Open Design `06-interview-lab.html` 的训练中心结构。
- 新版访谈页已接入现有真实能力：AI Gateway 客户回应、访谈消息列表、推荐追问、访谈记录保存、需求/痛点/待追问信息和评分状态。
- 已将阶段一 `guide` 导学页从旧 Tailwind 工作区替换为 Open Design `06-interview-guide.html` 的学生侧栏、导学 Hero、准备清单、六维度、记录模板、需求转化和判断清单结构。
- 已将阶段一 `submit` 整理提交页替换为 Open Design `06-interview-submit.html` 的产物整理结构，并保留访谈记录保存、需求草稿保存、AI 综合评估、5 项 gate check 和阶段完成逻辑。
- 已将 Stage 01 vNext 的 `guide / lab / submit` 都纳入 focused workspace，从旧 `AppShell` 和旧项目工作区中释放，避免继续出现旧侧栏和旧顶部栏包裹导致的视觉偏差。
- 已修正提交页顶部导航，可显式回到导学和访谈实战。
- 已新增执行记录：`docs/superpowers/plans/2026-06-01-open-design-round-2-stage-one.md`。

验证：

- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `cd frontend && npm run test:stage-one`：通过，22 项测试通过。
- `git diff --check`：通过。
- 截图验收：
  - `/private/tmp/edufde-v2-round2-ref-interview-guide.png`
  - `/private/tmp/edufde-v2-round2-prod-interview-guide.png`
  - `/private/tmp/edufde-v2-round2-ref-interview-lab.png`
  - `/private/tmp/edufde-v2-round2-prod-interview-lab.png`
  - `/private/tmp/edufde-v2-round2-ref-interview-submit.png`
  - `/private/tmp/edufde-v2-round2-prod-interview-submit.png`
- 已知差异：生产页使用真实 demo 会话，因此对话内容、数量、右侧识别项、提交页状态和 gate check 可能与静态原型不同；当前 demo 已完成阶段一，所以提交页显示 `已提交` 和 `5/5`。

### 2026-06-01 Open Design 第二轮第 3 轮：阶段二方案定义链路复刻

- 已确认阶段二权威原型页面为 `07-solution-guide.html` 和 `07-solution-definition.html`。
- 已将阶段二 `guide` 导学页切换为 Open Design `solution-guide-page` 结构，包括顶部导航、导学 Hero、阶段衔接、三类产物、访谈证据转方案判断、可行性四问、技术方案流程和进入工作台前检查。
- 已将阶段二 `workbench` 工作台切换为 Open Design `solution-workbench-page` 结构，包括顶部导航、折叠章节目录、阶段二 Hero、上下文条、六个报告章节、写作教学、阶段一证据和学生撰写区。
- 已保留现有后端链路：六个 Open Design 报告章节映射到现有九个阶段二小节，继续支持草稿保存、小节 AI 检查、章节确认、正式文档汇总、文档级评审、黄灯风险提示和阶段完成门禁。
- 已将 Stage 02 vNext 的 `guide / workbench` 都纳入 focused workspace，避免旧项目工作区包裹造成视觉偏差。
- 已新增执行记录：`docs/superpowers/plans/2026-06-01-open-design-round-3-stage-two.md`。

验证：

- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `cd frontend && npm run test:stage-two`：通过，9 项测试通过。
- `git diff --check`：通过。
- 截图验收：
  - `/private/tmp/edufde-v2-round3-ref-solution-guide.png`
  - `/private/tmp/edufde-v2-round3-prod-solution-guide.png`
  - `/private/tmp/edufde-v2-round3-ref-solution-definition.png`
  - `/private/tmp/edufde-v2-round3-prod-solution-definition.png`
- 已知差异：生产页使用真实 demo 会话；当前本地 demo 阶段二已完成，所以工作台顶部显示 `阶段二已完成`，静态原型为可提交空白训练态。

### 2026-06-01 Open Design 第二轮第 4 轮：阶段三知识工程决策链路复刻

- 已确认阶段三 Open Design 原型包含完整 `08-*` RAG 系列页面：数据源识别、数据质量评估、清洗与预处理、知识结构、分块、向量存储、召回、引用、召回测试和风险边界。
- 已先将阶段三 `source` 数据源识别页切换到 Open Design `rag-decision-page` 外壳，包含 `rag-topbar`、`rag-flow-nav`、`rag-hero`、原则条、练习区和保存门禁。
- 已将阶段三 `quality` 数据质量评估页切换到 Open Design `rag-decision-page` 外壳，包含 `rag-topbar`、`rag-flow-nav`、`rag-hero`、原则条、样本查看、质量判断和保存门禁。
- 已补齐阶段三页内 RAG 10 步导航，`source / quality / cleaning / structure / chunking / vector / retrieval / citation / recall / risk` 可在生产前端内部切换。
- 已为 `08-rag-cleaning.html` 至 `08-rag-risk-boundary.html` 提供 Open Design 风格的生产前端学习页承载，覆盖清洗、结构、分块、向量、召回、引用、测试和风险边界。
- 已保留现有阶段三后端能力：数据源识别过程记录、质量评估过程记录、知识工程决策、AI 评审、Rubric/门禁和阶段完成。
- 已新增执行记录：`docs/superpowers/plans/2026-06-01-open-design-round-4-stage-three.md`。

验证：

- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `cd frontend && npm run test:stage-three`：通过，28 项测试通过。
- `git diff --check`：通过。
- 截图验收：
  - `/private/tmp/edufde-v2-round4-ref-knowledge-decision.png`
  - `/private/tmp/edufde-v2-round4-ref-rag-data-quality.png`
  - `/private/tmp/edufde-v2-round4-prod-stage-three-current.png`
  - `/private/tmp/edufde-v2-round4-prod-rag-data-quality.png`
  - `/private/tmp/edufde-v2-round4b-ref-rag-cleaning.png`
  - `/private/tmp/edufde-v2-round4b-prod-rag-cleaning.png`
  - `/private/tmp/edufde-v2-round4b-ref-rag-risk-boundary.png`
  - `/private/tmp/edufde-v2-round4b-prod-rag-risk-boundary.png`
- 已知差异：当前 demo 数据已完成阶段三，直接进入阶段三会落在 `review` 状态；生产数据质量页截图通过“返回”链路回退后验证。`08-rag-cleaning.html` 至 `08-rag-risk-boundary.html` 已完成生产前端承载和导航覆盖，但内容细节仍是结构化生产页，尚未逐块复刻每个静态原型页的全部视觉模块。

### 2026-06-01 Open Design vNext 固定截图脚本：阶段三 RAG 01-10 覆盖补齐

- 已扩展 `backend/scripts/capture_open_design_vnext_qa.py` 的阶段三固定截图范围：
  - 参考页新增 `08-rag-data-quality.html`、`08-rag-cleaning.html`、`08-rag-structure.html`、`08-rag-chunking.html`、`08-rag-vector-storage.html`、`08-rag-retrieval.html`、`08-rag-answer-citation.html`、`08-rag-recall-test.html`、`08-rag-risk-boundary.html`。
  - 生产页新增 `round4-prod-rag-source.png`、`round4-prod-rag-data-quality.png`、`round4-prod-rag-cleaning.png` 至 `round4-prod-rag-risk-boundary.png`，通过阶段三工作区内部 RAG 导航逐页切换捕获。
- 已重新运行固定视觉 QA 脚本，当前输出目录 `/private/tmp/edufde-vnext-qa-captures/` 包含 51 张截图，manifest 为 `/private/tmp/edufde-vnext-qa-captures/manifest.json`。
- 抽查 `round4-ref-rag-cleaning.png` 与 `round4-prod-rag-cleaning.png` 后确认：生产端页面承载和导航状态稳定；后续已在下一条记录中完成清洗页专用模块复刻，其他 RAG 学习页仍保留为 P1 视觉精修缺口。

验证：

- `.venv/bin/python -m py_compile backend/scripts/capture_open_design_vnext_qa.py`：通过。
- `.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py`：通过，捕获 51 张截图。

### 2026-06-01 Open Design vNext 阶段三 RAG：清洗与预处理页专用复刻

- 已将生产端 `round4-prod-rag-cleaning.png` 从通用 RAG 学习页改为贴近 `08-rag-cleaning.html` 的专用页面结构：
  - 清洗策略板：字段统一、缺失标记、去重合并、结构化转换、人工复核。
  - Before / After 转换实验：MES 导出、Excel 台账、纸质扫描三类样本模型，当前默认展示 MES 导出。
  - 清洗处理日志：字段映射、缺失标记、OCR + 复核、排除引用四类处理动作。
  - 策略判断练习：四个制造业质检样本和对应处理策略选项。
  - 右侧门禁：Cleaning Gate、Checklist、本环节红线、前后衔接。
- 已新增 `stageThreeCleaning*` 纯数据模型，并在 `stage-three-flow.test.ts` 中固定清洗页的 5 类策略、3 个预览样本、4 条日志、4 道练习、4 条检查和 4 条红线。
- 已重新运行固定截图脚本，`/private/tmp/edufde-vnext-qa-captures/round4-prod-rag-cleaning.png` 已生成新的专用页面截图。
- 剩余差异：清洗页当前为静态默认 MES 样本展示，尚未复刻 Open Design 原型中 tab/select/checklist 的前端交互脚本和保存 toast；该交互可在后续阶段三视觉精修中继续补齐。

验证：

- `cd frontend && npm run test:stage-three`：通过，29 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed`：通过，捕获 51 张截图。

### 2026-06-01 Open Design vNext 阶段三 RAG：知识结构设计页专用复刻

- 已将生产端 `round4-prod-rag-structure.png` 从通用 RAG 学习页改为贴近 `08-rag-structure.html` 的专用页面结构：
  - 结构图：中心审厂追溯问题 + 制度与标准、批次追溯记录、异常与整改案例、证据与附件四个知识域。
  - 元数据骨架：批次号、工序、缺陷类型、标准条款、来源与版本五类字段。
  - 结构归类练习：四个制造业质检样本和对应知识域选项。
  - 关系链：问题、批次记录、标准条款、整改案例、证据附件。
  - 右侧门禁：Structure Gate、Checklist、本环节红线、前后衔接。
- 已新增 `stageThreeStructure*` 纯数据模型，并在 `stage-three-flow.test.ts` 中固定结构页的 4 个知识域、5 行元数据、4 道归类练习、5 段关系链、4 条检查和 4 条红线。
- 已重新运行固定截图脚本，`/private/tmp/edufde-vnext-qa-captures/round4-prod-rag-structure.png` 已生成新的专用页面截图。
- 剩余差异：结构页当前为静态默认展示，尚未复刻 Open Design 原型中 select/checklist 的前端交互脚本和保存 toast；该交互可在后续阶段三视觉精修中继续补齐。

验证：

- `cd frontend && npm run test:stage-three`：通过，30 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed`：通过，捕获 51 张截图。

### 2026-06-01 Open Design vNext 阶段三 RAG：分块策略页专用复刻

- 已将生产端 `round4-prod-rag-chunking.png` 从通用 RAG 学习页改为贴近 `08-rag-chunking.html` 的专用页面结构：
  - Chunk Anatomy：正文片段、标题路径、业务元数据、来源证据四个组成。
  - Strategy Matrix：SOP / 检验标准、MES 批次记录、整改报告、图片 / 扫描件四类资料的分块单位、必留字段和常见错误。
  - Chunking Simulator：制造业质检资料分块实验预览，默认展示 SOP 结构分块、chunk 高亮和 chunk list。
  - Decision Practice：四个资料样本和分块策略选择。
  - 右侧门禁：Chunking Gate、Checklist、本环节红线、前后衔接。
- 已新增 `stageThreeChunking*` 纯数据模型，并在 `stage-three-flow.test.ts` 中固定分块页的 4 个 chunk 组成、4 行策略矩阵、3 个实验样本、4 道判断练习、4 条检查和 4 条红线。
- 已重新运行固定截图脚本，`/private/tmp/edufde-vnext-qa-captures/round4-prod-rag-chunking.png` 已生成新的专用页面截图。
- 剩余差异：分块页当前为静态默认 SOP 结构分块展示，尚未复刻 Open Design 原型中 lab 参数联动、select/checklist 的前端交互脚本和保存 toast；该交互可在后续阶段三视觉精修中继续补齐。

验证：

- `cd frontend && npm run test:stage-three`：通过，31 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed`：通过，捕获 51 张截图。

### 2026-06-01 Open Design vNext 阶段三 RAG：向量化与存储页专用复刻

- 已将生产端 `round4-prod-rag-vector-storage.png` 从通用 RAG 学习页改为贴近 `08-rag-vector-storage.html` 的专用页面结构：
  - Concept：Embedding、相似度、元数据三项核心概念。
  - Visualization：制造业质检二维向量空间、查询点、知识块节点、Top-K 相似结果和图例。
  - Storage Model：`chunk_text`、`embedding`、`metadata`、`source_ref` 四类存储字段。
  - Decision Practice：批次查询、SOP 版本、缺陷图片三类向量存储策略判断。
  - 右侧门禁：Quality Gate、存储检查和下一环节入口。
- 已新增 `stageThreeVector*` 纯数据模型，并在 `stage-three-flow.test.ts` 中固定向量页的 3 个概念、4 个查询、8 个知识块、4 行存储字段、3 道策略判断和 3 条检查。
- 已重新运行固定截图脚本，`/private/tmp/edufde-vnext-qa-captures/round4-prod-rag-vector-storage.png` 已生成新的专用页面截图。
- 剩余差异：向量页当前为静态默认查询和 Top-K 展示，尚未复刻 Open Design 原型中查询/过滤联动、select/checklist 的前端交互脚本和保存状态；该交互可在后续阶段三视觉精修中继续补齐。

验证：

- `cd frontend && npm run test:stage-three`：通过，32 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed`：通过，捕获 51 张截图。

### 2026-06-01 Open Design 第二轮第 5 轮：阶段四智能体实现与测试链路复刻

- 已确认阶段四 Open Design 原型页面为 `09-agent-guide.html`、`09-dify-onboarding.html`、`09-agent-build-test.html` 和 `09-agent-test-score.html`。
- 已将阶段四生产前端切换到 Open Design `agent-guide-page` 外壳，包含 `agent-guide-topbar`、`agent-flow-nav`、四页 Hero 和对应主布局。
- 已迁移 `guide` 实现导学页的模块关系、阶段三成果承接和学习门禁结构。
- 已迁移 `onboarding` Dify 入门页的概念卡片、8 步操作记录和平台完整性门禁结构。
- 已迁移 `build` 正式搭建工作台的目标构建路径、知识库/Chatflow 构建步骤和保存门禁结构。
- 已迁移 `test` 自动化测试评分页的测试对象、测试集、测试结果、评分侧栏、AI 测试反馈和阶段完成结构。
- 已保留现有阶段四后端能力：Dify 实现 Artifact、测试报告 Artifact、AI Gateway 测试反馈、Rubric/门禁和阶段完成解锁阶段五。
- 已新增执行记录：`docs/superpowers/plans/2026-06-01-open-design-round-5-stage-four.md`。

验证：

- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `cd frontend && npm run test:stage-four`：通过，10 项测试通过。
- `git diff --check`：通过。
- 截图验收：
  - `/private/tmp/edufde-v2-round5-ref-agent-guide.png`
  - `/private/tmp/edufde-v2-round5-prod-agent-guide.png`
  - `/private/tmp/edufde-v2-round5-ref-dify-onboarding.png`
  - `/private/tmp/edufde-v2-round5-prod-dify-onboarding.png`
  - `/private/tmp/edufde-v2-round5-ref-agent-build-test.png`
  - `/private/tmp/edufde-v2-round5-prod-agent-build-test.png`
  - `/private/tmp/edufde-v2-round5-ref-agent-test-score.png`
  - `/private/tmp/edufde-v2-round5-prod-agent-test-score.png`
- 已知差异：当前 demo 数据已完成阶段四，所以生产前端顶部显示 `已完成`，测试页预填历史构建记录；静态原型为本地脚本驱动的训练态。生产前端内部表单、Artifact 摘要和 AI 反馈组件保留真实业务控件，仍需后续逐页细化像素级一致性。

### 2026-06-01 Open Design 第二轮第 6 轮：阶段五交付验收链路复刻

- 已确认阶段五 Open Design 原型页面为 `10-delivery-document.html` 和 `10-delivery-acceptance.html`。
- 已将阶段五 `document` 交付说明文档页切换为 Open Design `solution-workbench-page delivery-doc-page` 外壳，包含顶部导航、交付文档 Hero、文档完成度、阶段三/阶段四输入证据和章节工作区承载。
- 已将阶段五 `acceptance` 交付验收页切换为 Open Design `agent-guide-page delivery-page` 外壳，包含顶部导航、验收 Hero、交付对象、交付包、文档确认、模拟验收、最终结论和准备度侧栏。
- 已保留现有阶段五后端能力：交付说明 Artifact、运维说明 Artifact、验收包 Artifact、AI Gateway 交付审阅、项目完成和最终档案袋证据。
- 已新增执行记录：`docs/superpowers/plans/2026-06-01-open-design-round-6-stage-five.md`。

验证：

- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `cd frontend && npm run test:stage-five`：通过，9 项测试通过。
- `git diff --check`：通过。
- 截图验收：
  - `/private/tmp/edufde-v2-round6-ref-delivery-document.png`
  - `/private/tmp/edufde-v2-round6-prod-delivery-document.png`
  - `/private/tmp/edufde-v2-round6-ref-delivery-acceptance.png`
  - `/private/tmp/edufde-v2-round6-prod-delivery-acceptance.png`
- 已知差异：当前 demo 项目已完成阶段五，因此生产页显示 `6/6`、项目已完成、交付包已勾选和历史测试对象；静态原型为未保存/待验收训练态。生产页内部章节目录、Artifact 摘要、AI 审阅和完成按钮仍保留真实业务控件，后续可继续做像素级细化。

### 2026-06-01 Open Design 第二轮第 7 轮：项目档案袋与能力报告

- 已确认学生端最终档案袋 Open Design 原型页面为 `12-portfolio-report.html`。
- 已将项目档案袋生产前端切换为 Open Design `agent-guide-page portfolio-page` 外壳，包含项目档案袋顶栏、Hero、最终状态卡、主工作区和侧栏承载。
- 已将项目档案袋从旧 `AppShell` 包裹释放为 immersive 页面，避免旧侧栏和旧顶部栏覆盖 Open Design 视觉。
- 已保留现有项目档案袋真实数据：五阶段 Artifact 汇总、交付材料摘要、学习画像摘要、阶段跳转和刷新同步。
- 已新增执行记录：`docs/superpowers/plans/2026-06-01-open-design-round-7-portfolio.md`。

验证：

- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。
- 截图验收：
  - `/private/tmp/edufde-v2-round7-ref-portfolio-report.png`
  - `/private/tmp/edufde-v2-round7-prod-portfolio-report.png`
- 已知差异：生产页使用真实 demo 项目数据，显示项目已完成、14 项证据和真实交付材料摘要；静态原型为本地脚本未同步状态。生产页主体仍使用现有 Artifact 阶段卡和学习画像组件承载，未完全复刻静态原型中的能力画像六宫格、导出归档包和弹窗报告交互。

### 2026-06-01 Open Design 第二轮第 8 轮：AI Rubric、教师端与管理端旧状态临时实现

- 已确认第 8 轮基准页面包含 `11-ai-review-rubric.html`、`01-teacher-dashboard.html`、`02-course-setup.html`、`03-experiment-library.html`、`04-class-monitor.html` 和 `13-admin-deployment.html`；其中教师端和管理端原型仍属于旧状态页面，本轮按用户要求先临时实现。
- 新增 `frontend/src/components/vnext-ops/operations-dashboard.tsx`，使用 Open Design 通用 `shell / sidebar / topbar / metric / panel / layout / rubric / evidence / workflow` 视觉体系承载教师端和管理端入口。
- 修改 `frontend/app/page.tsx`，教师和管理员登录后不再进入“正式页面待开放”占位页，而是进入新的 Open Design 运营入口。
- 教师端已覆盖教师工作台、课程配置、实验包库、课中监控和 AI 评审与 Rubric；教师工作台、课中监控和 AI Rubric 接入现有教师进度 API 与阶段 Artifact 摘要。
- 管理员端已覆盖实验包库和租户、License 与部署管理；管理页当前是静态治理视图，不伪造尚不存在的 License、运维授权和部署实例后端。
- AI Rubric 页面从 review 类 Artifact、Rubric 快照、风险建议和证据条目中组织生产数据；接受 AI 建议和覆盖评分当前仅作为教师确认入口提示，正式写入评分草稿、覆盖原因和审计日志仍需后续后端切片。
- 已新增执行记录：`docs/superpowers/plans/2026-06-01-open-design-round-8-ai-teacher-admin.md`。

验证：

- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- 截图验收：
  - `/private/tmp/edufde-v2-round8-ref-ai-review-rubric.png`
  - `/private/tmp/edufde-v2-round8-prod-ai-review-rubric.png`
  - `/private/tmp/edufde-v2-round8-ref-teacher-dashboard.png`
  - `/private/tmp/edufde-v2-round8-prod-teacher-dashboard.png`
  - `/private/tmp/edufde-v2-round8-ref-admin-deployment.png`
  - `/private/tmp/edufde-v2-round8-prod-admin-deployment.png`

已知差异：

- 教师端和管理端仍是旧状态临时实现，正式教师批改、评分发布、课程成员模型、内容资产版本管理、License、运维授权和审计写入未在本轮后端闭环。
- 内置 Browser 插件可打开页面并等待文本，但截图接口在当前会话超时；本轮截图验收改用本地 Chrome CDP 脚本完成。

### 2026-06-01 Open Design 第二轮第 0-8 轮总体验收矩阵

- 新增 `docs/dev/open-design-vnext-round-0-8-acceptance-2026-06-01.md`，汇总第 0 轮至第 8 轮页面覆盖、生产实现状态、后端数据状态、截图证据和剩余缺口分级。
- 当前结论定义为：第二轮页面覆盖完成，关键旧流程已退出正式入口或退为非正式兼容，真实后端 Artifact / AI Gateway / Rubric / 教师进度能力已保留；但不能声明为最终像素级完成态，仍需后续视觉精修和后端闭环切片。
- 已将剩余缺口拆分为 P1 视觉精修、P1 后端闭环和 P2 数据态 / QA 缺口。

验证：

- `cd frontend && npm run test:stage-one`：通过，22 项测试通过。
- `cd frontend && npm run test:stage-two`：通过，9 项测试通过。
- `cd frontend && npm run test:stage-three`：通过，28 项测试通过。
- `cd frontend && npm run test:stage-four`：通过，10 项测试通过。
- `cd frontend && npm run test:stage-five`：通过，9 项测试通过。

### 2026-06-01 教师 AI Rubric 确认后端闭环第一片

- 新增教师 AI 评审确认接口：`POST /api/v1/teacher/progress/artifacts/{artifact_id}/review-confirmation`。
- 新增 `TeacherReviewConfirmationRequest`，支持 `accept` 和 `override` 两类决策；覆盖评分必须提供 `override_reason`，教师分数限制在 0-100。
- 教师确认 AI review 后会生成新的 `teacher_ai_review_confirmation` Artifact，内容包含源 AI review Artifact、AI 原分、教师分数、覆盖原因、Rubric 快照、证据引用、AI Gateway 信息、教师身份和确认时间。
- 源 AI review Artifact 会同步标记为 `accepted`，写入 `reviewed_at`，并在 `content_json.teacher_confirmation` 中记录确认 Artifact、教师分数、覆盖原因和确认人。
- 权限仍遵循当前临时教师边界：只有创建该课程的教师可以确认；学生返回 403，其他教师返回 404。
- 第 8 轮 AI Rubric 前端按钮已从“入口提示”改为真实调用确认 API，成功后重新拉取阶段 Artifact，并在页面状态中提示已写入审计 Artifact。

验证：

- TDD 红灯：新增测试先以 404 失败，证明接口缺失。
- `.venv/bin/python -m pytest backend/tests/test_teacher_progress.py -q`：通过，8 项测试通过。
- `.venv/bin/python -m pytest backend/tests/test_teacher_progress.py backend/tests/test_artifacts.py backend/tests/test_learning_profile.py -q`：通过，18 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-01 Open Design vNext 固定视觉 QA Seed 第一片

- 新增 `seed_open_design_vnext_qa_data(session)`，在基础 demo 数据之上创建独立视觉验收数据态。
- 新增固定视觉 QA 账号与课程：
  - 学生账号：`lin@edufde.demo`
  - 密码：`EduFDE-demo-123`
  - 学生姓名：`林同学`
  - 课程：`MFG-QA-VNEXT-QA`
- 固定 Session 状态用于后续截图对照：
  - 实验 Session：`in_progress`
  - 阶段一：`completed`
  - 阶段二：`completed`
  - 阶段三：`in_practice`
  - 阶段四 / 阶段五：`locked`
- 固定 12 个 Artifact，覆盖阶段一访谈证据、阶段二需求/可行性/技术方案与 82 分 AI Rubric 评审、阶段三数据源/质量记录和知识工程决策草稿。
- `backend/scripts/init_demo_data.py` 已同步调用 visual QA seed，重复执行会恢复该固定视觉验收数据态。
- 已更新 `docs/dev/open-design-vnext-round-0-8-acceptance-2026-06-01.md`，将 P2 数据态缺口改为“已完成第一片，截图脚本仍需切换到 visual QA seed”。

验证：

- TDD 红灯：新增 visual QA seed 测试先因常量/函数不存在失败。
- `.venv/bin/python -m pytest backend/tests/test_demo_seed.py -q`：通过，4 项测试通过。
- `.venv/bin/python -m pytest backend/tests/test_demo_seed.py backend/tests/test_courses_sessions.py backend/tests/test_teacher_progress.py -q`：通过，17 项测试通过。
- `git diff --check`：通过。

### 2026-06-01 Open Design vNext 固定视觉 QA 截图脚本

- 新增 `backend/scripts/capture_open_design_vnext_qa.py`，将原先散落在 `/private/tmp` 的临时 CDP 截图脚本沉淀为仓库内脚本。
- 脚本执行流程：
  - 检查 Open Design 原型 `http://127.0.0.1:4175`、生产前端 `http://127.0.0.1:3001`、后端 `http://127.0.0.1:18002` 和 Chrome CDP `http://127.0.0.1:9224`。
  - 默认重置 `lin@edufde.demo` visual QA seed。
  - 捕获第 0-8 轮 Open Design 参考页和生产页截图。
  - 写出 `/private/tmp/edufde-vnext-qa-captures/manifest.json`，记录截图路径、来源 URL 和文件大小。
- 已修正脚本稳定性问题：学生端阶段截图每次从带唯一查询参数的根入口重新装载，点击逻辑跳过 disabled 按钮并重试，避免 SPA 状态未重置造成误判。
- 本轮实跑已生成 26 张截图，覆盖登录入口、学生首页、实验详情、项目总览、阶段一、阶段二、阶段三、阶段四/五锁定态、项目档案袋、教师工作台、AI Rubric 和管理部署页。
- 已更新 `docs/dev/open-design-vnext-round-0-8-acceptance-2026-06-01.md`，将 P2 QA 缺口更新为“固定 visual QA 截图状态已完成”。

验证：

- `.venv/bin/python -m py_compile backend/scripts/capture_open_design_vnext_qa.py`：通过。
- `.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py`：通过，捕获 26 张截图。
- 截图输出目录：`/private/tmp/edufde-vnext-qa-captures/`。
- Manifest：`/private/tmp/edufde-vnext-qa-captures/manifest.json`。

### 2026-06-01 Open Design vNext 后期阶段视觉 QA 数据态

- 新增 `seed_open_design_vnext_late_qa_data(session)`，专门固定阶段四 / 阶段五截图验收数据态。
- 新增固定后期视觉 QA 账号与课程：
  - 学生账号：`chen@edufde.demo`
  - 密码：`EduFDE-demo-123`
  - 学生姓名：`陈同学`
  - 课程：`MFG-QA-VNEXT-LATE`
- 固定 Session 状态：
  - 实验 Session：`in_progress`
  - 阶段一 / 二 / 三：`completed`
  - 阶段四：`in_practice`
  - 阶段五：`not_started`
- 固定 19 个 Artifact，覆盖阶段三 AI 评审、阶段四 Dify 构建记录、平台自动化测试报告、84 分 AI 测试反馈、阶段五交付说明 / 运维说明 / 验收材料草稿。
- `backend/scripts/init_demo_data.py` 已同步调用 late visual QA seed，并在输出中声明 `visual_late_qa_course` 和 `visual_late_qa_student`。
- `backend/scripts/capture_open_design_vnext_qa.py` 已同步重置两个 visual QA seed，并新增：
  - `round5-prod-agent-test-score-late.png`
  - `round6-prod-delivery-acceptance-late.png`
  - 阶段四四个参考页：`09-agent-guide`、`09-dify-onboarding`、`09-agent-build-test`、`09-agent-test-score`
  - 阶段五两个参考页：`10-delivery-document`、`10-delivery-acceptance`
- 最新实跑已生成 32 张截图，manifest 仍写入 `/private/tmp/edufde-vnext-qa-captures/manifest.json`。

验证：

- TDD 红灯：新增 late visual QA seed 测试先因常量/函数不存在失败。
- `.venv/bin/python -m pytest backend/tests/test_demo_seed.py -q`：通过，5 项测试通过。
- `.venv/bin/python -m py_compile backend/scripts/init_demo_data.py backend/scripts/capture_open_design_vnext_qa.py backend/app/seeds/demo.py`：通过。
- `.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py`：通过，捕获 32 张截图。

### 2026-06-01 阶段四 / 五持久化评分映射修正

- 修复 late-stage visual QA 截图中阶段四测试评分页只显示 `--` 的问题。
- 新增 `stageFourPlatformRunFromPersistedReport(...)`，从已保存的 `stage_4_test_report` 中恢复测试总分、维度分、测试用例和告警/失败状态，用于生产页视觉状态。
- 阶段四测试评分页现在能直接展示持久化总分 84、四个维度分和历史测试用例，不再必须重新点击“开始自动化测试”才有评分态。
- 修正阶段四质量门禁：已有测试报告不再自动代表通过或不通过，而是按持久化报告里的分数和失败状态判断。
- 新增 `stageFiveScoreFromStageFourTestReport(...)`，阶段五验收页可从 `total_score` 或旧版 `coverage_notes` 中提取阶段四测试评分。
- 阶段五验收对象卡现在能直接显示阶段四持久化评分 84 分，避免继续显示“待拉取”。

验证：

- TDD 红灯：阶段四 / 五新增测试先因缺少评分恢复函数失败。
- `cd frontend && npm run test:stage-four`：通过，12 项测试通过。
- `cd frontend && npm run test:stage-five`：通过，10 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py`：通过，捕获 32 张截图。
- 截图核对：
  - `/private/tmp/edufde-vnext-qa-captures/round5-prod-agent-test-score-late.png` 显示阶段四总分 84 和维度分。
  - `/private/tmp/edufde-vnext-qa-captures/round6-prod-delivery-acceptance-late.png` 显示阶段四测试评分 84 分。

### 2026-06-01 阶段三 RAG：召回策略页专用复刻

- 完成 `08-rag-retrieval.html` 对应生产页专用复刻，不再使用通用 RAG 结构化占位页。
- 新增召回策略页模型，覆盖：
  - 召回概念：向量召回、关键词召回、混合召回。
  - 查询样本：审厂追溯、外观划伤趋势、AQL 标准、整改闭环。
  - Top-K 候选证据：6 条制造业质检样本及向量分、关键词分、最终分计算。
  - Score Anatomy：Vector / Keyword / Metadata / Source。
  - Decision Practice：3 个策略判断和 3 项 Quality Gate 检查。
- 生产页已实现查询切换、业务过滤、Top-K 范围、召回模式切换和右侧门禁展示。
- 修复 Next.js + Tailwind 环境下 `.outline` 类名冲突导致 Open Design 侧栏卡片出现黑色轮廓的问题。
- 更新阶段三固定截图验收矩阵，声明 `08-rag-retrieval.html` 已进入专用模块复刻范围。

验证：

- TDD 红灯：新增召回策略页模型测试先因 `stageThreeRetrieval*` 导出不存在失败。
- `cd frontend && npm run test:stage-three`：通过，33 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed`：通过，捕获 51 张截图。
- 截图核对：
  - `/private/tmp/edufde-vnext-qa-captures/round4-prod-rag-retrieval.png` 已显示召回实验台、Top-K 证据排序、Score Anatomy 和策略判断列表，右侧卡片轮廓与 Open Design 原型一致。

### 2026-06-01 阶段三 RAG：回答生成与引用页专用复刻

- 完成 `08-rag-answer-citation.html` 对应生产页专用复刻，不再使用通用 RAG 结构化占位页。
- 新增回答引用页模型，覆盖：
  - Concept：先给结论再给证据、证据不足时说明不足、不替人做责任认定。
  - Visualization：4 个业务问题、3 种回答策略、3 种引用粒度和引用质量分。
  - Evidence Trace：每个业务问题 3 条证据，包含来源、可引用字段和支撑范围。
  - Quality Review：Evidence / Citation / Uncertainty / Boundary。
  - Decision Practice：3 个回答质量判断和 3 项 Quality Gate 检查。
- 生产页已实现回答策略切换、业务问题切换、引用粒度切换、证据链展示、质量分色彩状态和右侧门禁展示。
- 更新阶段三固定截图验收矩阵，声明 `08-rag-answer-citation.html` 已进入专用模块复刻范围。

验证：

- TDD 红灯：新增回答引用页模型测试先因 `stageThreeAnswer*` 导出不存在失败。
- `cd frontend && npm run test:stage-three`：通过，34 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed`：通过，捕获 51 张截图。
- 截图核对：
  - `/private/tmp/edufde-vnext-qa-captures/round4-prod-rag-answer-citation.png` 已显示回答策略切换、引用粒度、生成回答、证据链、质量检查和三条判断练习。

### 2026-06-01 阶段三 RAG：召回测试页专用复刻

- 完成 `08-rag-recall-test.html` 对应生产页专用复刻，不再使用通用 RAG 结构化占位页。
- 新增召回测试页模型，覆盖：
  - Concept：范围内能命中、证据缺失能识别、范围外能拦截。
  - Test Bench：4 类测试问题、Top-K、通过阈值、命中率、误召回和测试结论。
  - Retrieved Evidence：目标证据 / 相似噪声标记、来源、元数据和分数。
  - Coverage Matrix：范围内、字段缺失、记录冲突、范围外。
  - Decision Practice：3 个失败归因判断和 4 项 Test Gate 检查。
- 生产页已实现测试问题切换、Top-K / 阈值切换、指标计算、召回结果列表、覆盖矩阵和右侧门禁展示。
- 更新阶段三固定截图验收矩阵，声明 `08-rag-recall-test.html` 已进入专用模块复刻范围。

验证：

- TDD 红灯：新增召回测试页模型测试先因 `stageThreeRecall*` 导出不存在失败。
- `cd frontend && npm run test:stage-three`：通过，35 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed`：通过，捕获 51 张截图。
- 截图核对：
  - `/private/tmp/edufde-vnext-qa-captures/round4-prod-rag-recall-test.png` 已显示测试集、召回结果、命中率/误召回指标、覆盖矩阵和失败归因练习。

### 2026-06-01 阶段三 RAG：风险边界页专用复刻

- 完成 `08-rag-risk-boundary.html` 对应生产页专用复刻，阶段三 RAG 03-10 专用模块复刻全部完成。
- 新增风险边界页模型，覆盖：
  - Boundary Rule：有证据才回答、资料不足要说明、责任结论转人工。
  - Decision Router：证据充分、证据不足、记录冲突、转人工 4 类风险场景。
  - Boundary Matrix：证据缺失、记录冲突、责任判定、范围外问题。
  - Boundary Statement：支持范围、证据要求、转人工条件、拒答边界 4 个声明字段。
  - Completion Gate：3 项门禁与 4 项阶段四前确认检查。
- 生产页已实现风险场景切换、处理策略展示、边界矩阵、边界声明模板和右侧完成门禁。
- 更新阶段三固定截图验收矩阵，声明 `08-rag-risk-boundary.html` 已进入专用模块复刻范围。

验证：

- TDD 红灯：新增风险边界页模型测试先因 `stageThreeRiskBoundary*` 导出不存在失败。
- `cd frontend && npm run test:stage-three`：通过，36 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed`：通过，捕获 51 张截图。
- 截图核对：
  - `/private/tmp/edufde-vnext-qa-captures/round4-prod-rag-risk-boundary.png` 已显示风险分流、处理策略、边界矩阵、声明模板和完成门禁。

### 2026-06-01 阶段四：实现导学页专用复刻

- 完成 `09-agent-guide.html` 对应生产页专用复刻，阶段四 late visual QA 状态现在可逐项截图四个子页。
- 新增阶段四导学页模型，覆盖：
  - Agent Architecture：用户问题入口、边界判断、RAG 检索、回答与引用、转人工与日志。
  - From Stage 03：阶段三成果进入阶段四后的配置、工作流和测试检查映射。
  - Prompt & Workflow：角色与任务、证据要求、边界规则、输出格式。
  - Case Walkthrough：输入问题、边界判断、检索动作、回答行为。
- 生产页已实现导学页专用 JSX，移除旧阶段三补充卡，右侧 Learning Gate 使用 Open Design 原型的复选行样式，Next 卡片清除 Tailwind `outline` 视觉冲突。
- 更新固定截图脚本，阶段四 late 态现在分别捕获：
  - `round5-prod-agent-guide-late.png`
  - `round5-prod-dify-onboarding-late.png`
  - `round5-prod-agent-build-test-late.png`
  - `round5-prod-agent-test-score-late.png`

验证：

- TDD 红灯：新增导学页模型测试先因 `stageFourGuide*` 导出不存在失败。
- `cd frontend && npm run test:stage-four`：通过，13 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py`：通过，重置 visual QA seed 并捕获 54 张截图。
- `.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed`：通过，捕获 54 张截图。
- 截图核对：
  - `/private/tmp/edufde-vnext-qa-captures/round5-prod-agent-guide-late.png` 已显示导学页架构图、阶段三映射表、规则网格、案例拆解和右侧门禁/Next 卡片。

### 2026-06-01 阶段四：Dify 入门页专用复刻

- 完成 `09-dify-onboarding.html` 对应生产页专用复刻。
- 新增阶段四 Dify 入门 runbook 模型，覆盖：
  - 8 个 Chatflow 操作步骤：工作室入口、创建应用、识别画布、开始节点变量、LLM 节点、直接回复与连线、Preview 调试、发布链接回填。
  - 每步左侧 Dify 操作说明、右侧平台回填字段和底部确认勾选。
  - 特殊原型模块：Chatflow 默认节点 mini flow、LLM 指令模板、直接回复提示条、Preview 测试问题列表。
- 生产页已从旧 `StepEditor` 表单卡片切换为 Open Design `dify-runbook-step / dify-step-grid` 结构，右侧改为原型的 Step Progress、Platform Sync 和 Why Sync 卡片。

验证：

- TDD 红灯：新增 Dify 入门 runbook 测试先因 `stageFourOnboardingRunbookSteps` 导出不存在失败。
- `cd frontend && npm run test:stage-four`：通过，14 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --skip-seed`：通过，捕获 54 张截图。
- 截图核对：
  - `/private/tmp/edufde-vnext-qa-captures/round5-prod-dify-onboarding-late.png` 已显示 8 步 runbook、画布 mini flow、LLM 指令模板、右侧进度条和 Platform Sync。

### 2026-06-01 阶段四：正式搭建工作台专用复刻

- 完成 `09-agent-build-test.html` 对应生产页专用模型与 JSX 复刻，fresh visual screenshot 待截图环境恢复后补跑。
- 新增阶段四正式搭建模型，覆盖：
  - Target Build Path：KB-01 至 KB-04 知识库创建、上传、分段清洗、索引检索，CF-01 至 CF-05 开始节点、知识检索、边界判断、引用回答、转人工和发布回填。
  - 12 个正式构建步骤：创建正式应用、创建知识库、上传资料、分段清洗、索引检索、接入检索节点、边界分支、引用回答、异常路径、连线变量、Preview 预检、发布回填。
  - 每步左侧 Dify 操作说明、右侧平台同步字段和底部确认勾选。
  - Prompt 模板、三类 Preview 预检题和下一页自动化测试题型预告。
- 生产页已从简化 `BuildStep` 表单卡片切换为 Open Design `build-step / build-step-grid` 结构，右侧改为原型的 Build Progress、Platform Sync 和 Evidence 卡片。

验证：

- TDD 红灯：新增正式搭建工作台模型测试先因 `stageFourBuildFlowNodes` 导出不存在失败。
- `cd frontend && npm run test:stage-four`：通过，15 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。
- 截图验收状态：
  - `backend/scripts/capture_open_design_vnext_qa.py --skip-seed` 未完成 fresh screenshot：先后遇到 4175 残留静态服务空响应、9224 Chrome CDP 超时/退出和 3001 Next.js 超时；4175 与 3001 已重启恢复，Browser 插件随后拒绝访问 `127.0.0.1:3001`，因此本页不声明截图验收完成。

### 2026-06-01 阶段四：自动化测试评分页专用复刻

- 完成 `09-agent-test-score.html` 对应生产页专用模型与 JSX 复刻，fresh visual screenshot 待浏览器/CDP 环境恢复后补跑。
- 新增阶段四测试评分模型，覆盖：
  - Test Target：Dify 应用名称、知识库名称、发布链接和访问权限说明。
  - Test Suites：Suite A 正常追溯、Suite B 证据引用、Suite C 资料不足、Suite D 风险边界。
  - Run Results：T-01 至 T-05 五条测试结果，包含期望行为、实际回答、命中证据和问题定位。
  - Remediation Loop：证据引用与风险边界两类整改路径。
  - Score：总分 81、四个维度分和进入阶段五质量门禁。
- 生产页已从旧 Tailwind 结果卡片和通用表单组件切换为 Open Design `test-target-form / test-suite-grid / test-result-list / test-fix-board / test-score-card` 结构；右侧保留保存测试评分记录、生成 AI 测试反馈和进入阶段五交付文档的真实后端动作。

验证：

- TDD 红灯：新增测试评分页模型测试先因 `stageFourTestSuiteCards` 等导出不存在失败。
- `cd frontend && npm run test:stage-four`：通过，16 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。
- 截图验收状态：
  - 当前会话 Browser 插件拒绝访问 `127.0.0.1:3001`，Chrome CDP 会话也出现退出/拒绝连接，因此 `round5-prod-agent-test-score-late.png` fresh screenshot 暂不声明完成。

### 2026-06-01 阶段五：交付说明文档页专用复刻

- 完成 `10-delivery-document.html` 对应生产页专用模型与 JSX 复刻，fresh visual screenshot 待浏览器/CDP 环境恢复后补跑。
- 新增阶段五交付文档模型，覆盖：
  - 左侧悬浮章节目录：01 交付目标、02 使用说明、03 资料范围、04 支持与边界、05 测试与验收、06 维护更新。
  - 顶部三块输入证据：阶段四 Dify 应用与测试评分、阶段三 RAG 边界与资料范围、本页客户可读交付说明文档。
  - 六章完整长文档结构，每章包含写作教学、事实依据、学生撰写区、AI 检查本章和保存本章。
  - 交付文档提交继续接真实 `stage_5_delivery_document` 和 `stage_5_operations_guide` Artifact 保存逻辑。
- 生产页已从旧“单章节编辑器 + 右侧门禁卡片”切换为 Open Design `doc-nav-rail / solution-document / report-chapter / method-block / evidence-shelf / writing-zone` 结构。

验证：

- TDD 红灯：新增阶段五交付文档模型测试先因 `stageFiveDeliveryChapterModels` 等导出不存在失败。
- `cd frontend && npm run test:stage-five`：通过，11 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。
- 截图验收状态：
  - 当前会话 Browser 插件拒绝访问 `127.0.0.1:3001`，Chrome CDP 会话也出现退出/拒绝连接，因此 `round6-prod-delivery-document-late.png` fresh screenshot 暂不声明完成。

### 2026-06-01 阶段五：交付验收确认页专用复刻

- 完成 `10-delivery-acceptance.html` 对应生产页专用模型与 JSX 复刻，fresh visual screenshot 待浏览器/CDP 环境恢复后补跑。
- 新增阶段五验收确认模型，覆盖：
  - Handoff Target 交付对象和阶段四测试评分拉取。
  - Acceptance Agenda 四步验收议程：确认交付对象、演示核心用例、回答客户追问、形成验收结论。
  - Delivery Package 七项交付包清单及说明。
  - Delivery Document 文档状态与客户追问依据。
  - Acceptance Review 模拟客户验收记录。
  - Final Decision 三类验收结论、归档确认、Readiness 环和 Demo Script。
- 生产页已从旧 Tailwind 卡片切换为 Open Design `delivery-object-grid / delivery-agenda-list / delivery-check-grid / delivery-doc-summary / delivery-review-board / delivery-signoff-grid / delivery-readiness-ring` 结构；保存验收记录、生成交付审阅和完成阶段五仍接真实后端动作。

验证：

- TDD 红灯：新增阶段五验收确认模型测试先因 `stageFiveAcceptanceAgendaItems` 等导出不存在失败。
- `cd frontend && npm run test:stage-five`：通过，12 项测试通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。
- 截图验收状态：
  - 当前会话 Browser 插件拒绝访问 `127.0.0.1:3001`，Chrome CDP 会话也出现退出/拒绝连接，因此 `round6-prod-delivery-acceptance-late.png` fresh screenshot 暂不声明完成。

### 2026-06-01 第七轮：项目档案袋页专用复刻

- 完成 `12-portfolio-report.html` 对应生产页专用模型与 JSX 复刻，fresh visual screenshot 待浏览器/CDP 环境恢复后补跑。
- 新增项目档案袋模型，覆盖：
  - Project Overview 四块总览：实验项目、Dify 应用、平台测试、验收结论。
  - Evidence Chain 五阶段证据链。
  - Capability Profile 六项 FDE 交付能力画像。
  - Final Package 四类最终交付包入口。
  - Archive Gate、Review Notes 和 Actions 侧栏。
- 生产页已从旧“阶段产物列表 + 两个摘要卡片”切换为 Open Design `portfolio-summary-grid / portfolio-stage-chain / portfolio-ability-grid / portfolio-package-grid / portfolio-ring / portfolio-review-list` 结构；仍使用真实 Artifact、阶段状态和学习画像数据填充动态内容。

验证：

- TDD 红灯：新增项目档案袋模型测试先因 `portfolio-flow.ts` 不存在失败。
- `cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts`：通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。
- 截图验收状态：
  - 当前会话 Browser 插件拒绝访问 `127.0.0.1:3001`，Chrome CDP 会话也出现退出/拒绝连接，因此 `round7-prod-portfolio-report-late.png` fresh screenshot 暂不声明完成。

### 2026-06-01 第八轮：教师 / AI Rubric / 管理端旧状态页临时承载核对

- 核对第八轮 Open Design 原型页面：
  - `01-teacher-dashboard.html`
  - `02-course-setup.html`
  - `03-experiment-library.html`
  - `04-class-monitor.html`
  - `11-ai-review-rubric.html`
  - `13-admin-deployment.html`
- 当前生产端由 `frontend/src/components/vnext-ops/operations-dashboard.tsx` 统一承载教师/管理员登录后的正式运营入口。
- 第八轮按既定标准处理：原型本身属于旧状态页面，暂不进行像素级重构；保持教师进度、Artifact、AI Rubric 教师确认和管理部署临时 UI 能力可进入、可演示、可后续切片。
- 固定截图脚本已覆盖：
  - `round8-ref-ai-review-rubric`
  - `round8-ref-teacher-dashboard`
  - `round8-ref-admin-deployment`
  - `round8-prod-teacher-dashboard`
  - `round8-prod-ai-review-rubric`
  - `round8-prod-admin-deployment`

验证：

- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。
- 截图验收状态：
  - 当前会话 Browser 插件拒绝访问 `127.0.0.1:3001`，Chrome CDP 会话也出现退出/拒绝连接，因此第八轮 fresh screenshot 暂不重跑。

### 2026-06-01 Open Design vNext 0-8 轮生产构建与全量回归补验

- 补跑第二轮当前代码侧回归验证，覆盖阶段一至阶段五、项目档案袋模型、前端生产构建和后端完整测试。
- 修复 `frontend/app/login/page.tsx` 生产构建错误：`LoginPortal` 使用 `useSearchParams()`，Next.js 16 生产预渲染要求该 client hook 位于 Suspense 边界内。页面层已增加 `<Suspense fallback={null}>`，登录业务组件不变。
- 首次 `npm run build` 在沙盒内因 Turbopack 创建进程 / 绑定端口被系统拒绝；按权限规则在沙盒外重跑后暴露真实 `/login` Suspense 错误，修复后构建通过。

验证：

- `cd frontend && npm run test:stage-one`：通过，22 项测试通过。
- `cd frontend && npm run test:stage-two`：通过，9 项测试通过。
- `cd frontend && npm run test:stage-three`：通过，36 项测试通过。
- `cd frontend && npm run test:stage-four`：通过，16 项测试通过。
- `cd frontend && npm run test:stage-five`：通过，12 项测试通过。
- `cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts`：通过，1 项测试通过。
- `cd frontend && npm run build`：通过，`/`、`/dev-workbench`、`/login` 均完成静态预渲染。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python -m pytest backend/tests -q`：通过，125 项测试通过，1 条 LangGraph pending deprecation warning。
- `git diff --check`：通过。

### 2026-06-01 Open Design vNext 固定视觉 QA 恢复与 0-8 轮截图补验

- 修复本地视觉 QA 服务链路：
  - 3001 端口当前被另一套 TechenMeta 医学短视频项目占用，不能作为 EduFDE 生产前端验收地址。
  - 新启 EduFDE Next.js 前端在 `http://127.0.0.1:3002`，后端运行在 `http://127.0.0.1:18002`，Open Design 静态原型运行在 `http://127.0.0.1:4175/index.html#login-entry`。
  - 前端默认 API 基址从 `http://localhost:8000` 调整为 `http://127.0.0.1:18002`，并同步 `frontend/README.md`。
  - 后端 CORS 从单一 `FRONTEND_ORIGIN` 扩展为逗号分隔多 origin，默认允许 `localhost:3000`、`127.0.0.1:3001`、`127.0.0.1:3002`。
- 更新 `backend/scripts/capture_open_design_vnext_qa.py`：
  - 第 6 轮 late 态现在分别捕获 `round6-prod-delivery-document-late.png` 和 `round6-prod-delivery-acceptance-late.png`。
  - 第 7 轮生产截图命名为 `round7-prod-portfolio-report.png`，与 `12-portfolio-report.html` 对齐。
- 完整固定视觉 QA 已通过：
  - 命令：`.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --prod-base http://127.0.0.1:3002`
  - 结果：生成 55 张截图。
  - manifest：`/private/tmp/edufde-vnext-qa-captures/manifest.json`
  - 关键补齐截图：`round5-prod-agent-build-test-late.png`、`round5-prod-agent-test-score-late.png`、`round6-prod-delivery-document-late.png`、`round6-prod-delivery-acceptance-late.png`、`round7-prod-portfolio-report.png`、`round8-prod-teacher-dashboard.png`、`round8-prod-ai-review-rubric.png`、`round8-prod-admin-deployment.png`。
- 补充验证：
  - `.venv/bin/python -m pytest backend/tests/test_health.py -q`：通过，3 项测试通过，1 条 LangGraph pending deprecation warning。
  - `.venv/bin/python -m pytest backend/tests -q`：通过，126 项测试通过，1 条 LangGraph pending deprecation warning。
  - `cd frontend && npm run typecheck`：通过。
  - `cd frontend && npm run lint`：通过。
  - `git diff --check`：通过。

### 2026-06-01 Open Design vNext 第七轮档案袋归档态精修

- 基于 `round7-ref-portfolio-report.png` 与 `round7-prod-portfolio-report.png` 的对照，修复项目档案袋生产态把早期学生数据渲染成 `待开始 / 0/5` 的问题。
- 新增 `buildPortfolioArchiveState`，将档案袋归档态从单纯阶段状态改为结合真实 Artifact 判断：
  - 阶段四存在 `stage_4_test_report` 时，档案袋可显示阶段四证据已进入归档结构。
  - 阶段五 `stage_5_acceptance_package` 只有在 `submitted` / `reviewed` / `accepted` 时才算最终验收已同步，`draft` 不再误判为最终归档。
  - 平台测试分数从阶段四测试报告读取，Dify 应用从阶段四实现记录或阶段五交付文档读取。
- 固定截图脚本调整：
  - 第七轮 `round7-prod-portfolio-report.png` 改用后期阶段学生 `chen@edufde.demo` 捕获，避免用阶段三进行中的早期学生状态对照最终档案袋。
- 新一轮截图结果：
  - 命令：`.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --prod-base http://127.0.0.1:3002`
  - 结果：生成 55 张截图。
  - manifest：`/private/tmp/edufde-vnext-qa-captures/manifest.json`
  - 本轮 manifest 时间：`2026-06-01T09:48:53.642378+00:00`
  - 第七轮生产截图已显示 `成果归档`、`待拉取验收记录`、`72%`、`4/5 已归档`、阶段五 `待同步` 和平台测试分数 `84 分`。
- 已解决数据差异：
  - late visual QA seed 的阶段四测试报告和 AI 测试评审已按 Open Design 静态参考统一为 `84 分`，`round6-prod-delivery-acceptance-late.png` 与 `round7-prod-portfolio-report.png` 不再保留 78/84 分差异。
- 补充验证：
  - `.venv/bin/python -m pytest backend/tests/test_demo_seed.py -q`：通过，5 项测试通过。
  - `cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts`：通过，4 项测试通过，保留 Node ESM warning。
  - `cd frontend && npm run typecheck`：通过。
  - `cd frontend && npm run lint`：通过。

### 2026-06-01 Open Design vNext 阶段一固定截图矩阵修正

- 基于固定截图首屏差异粗扫，确认 `round2-ref-interview-lab.png` 与 `round2-prod-stage-one-interview.png` 的高差异主要来自截图状态不一致：参考页是 `06-interview-lab.html`，生产页此前停留在阶段一导学页。
- 更新 `backend/scripts/capture_open_design_vnext_qa.py`：
  - 新增 `round2-ref-interview-guide.png`，显式纳入 `06-interview-guide.html` 参考图。
  - 新增 `round2-prod-interview-guide.png`，保留生产导学页截图。
  - `round2-prod-stage-one-interview.png` 现在会点击“开始模拟访谈”后再截图，确保与 `06-interview-lab.html` 对标。
- 新增 `backend/tests/test_open_design_vnext_qa_script.py`，锁定第 2 轮参考截图必须同时覆盖 guide 和 lab。
- 重跑固定视觉 QA：
  - 命令：`.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --prod-base http://127.0.0.1:3002`
  - 结果：生成 57 张截图。
  - manifest：`/private/tmp/edufde-vnext-qa-captures/manifest.json`
  - 本轮 manifest 时间：`2026-06-01T10:03:59.212559+00:00`
  - 阶段一 lab 对 lab 首屏粗差异从 16.9% 降为 5.5%；导学页对导学页首屏粗差异为 2.2%。

验证：

- `.venv/bin/python -m pytest backend/tests/test_open_design_vnext_qa_script.py -q`：通过，1 项测试通过。
- `.venv/bin/python -m py_compile backend/scripts/capture_open_design_vnext_qa.py`：通过。
- `git diff --check`：通过。

### 2026-06-01 Open Design vNext 项目档案袋同步态修正

- 基于 `round7-ref-portfolio-report.png` 与 `round7-prod-portfolio-report.png` 的人工对照，确认顶部 summary 卡片仍有一处业务判定偏差：阶段五存在草稿验收包时，生产端过早展示 Dify URL 和“验收结论已确认”。
- 新增 `buildPortfolioSummaryCards`，把项目档案袋四张 summary card 的动态判定从 JSX 中抽到 `portfolio-flow.ts`：
  - 验收记录未同步时，`Dify 应用` 保持 Open Design 的 `未同步`。
  - 验收记录未同步时，`验收结论` 保持 `未确认`。
  - 平台测试分数仍从阶段四测试报告读取，当前 visual QA seed 显示 `84 分`。
- `ProjectPortfolioView` 改为复用该纯函数，避免后续再把 draft acceptance package 误当成最终归档依据。
- 重跑固定视觉 QA：
  - 命令：`.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --prod-base http://127.0.0.1:3002`
  - 结果：生成 57 张截图。
  - manifest：`/private/tmp/edufde-vnext-qa-captures/manifest.json`
  - 本轮 manifest 时间：`2026-06-01T10:13:03.168736+00:00`
  - `round7-prod-portfolio-report.png` 已显示 `未同步`、`84 分`、`未确认`、`72%`、`4 / 5 已归档` 和阶段五 `待同步`。

验证：

- `cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts`：通过，5 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-01 Open Design vNext 项目档案袋导航与阶段动作精修

- 继续对照 `12-portfolio-report.html`，修正项目档案袋生产页中 Open Design 不存在的顶部导航项：
  - 顶部导航从 `交付文档 / 验收确认 / 档案袋 / 同步证据` 收敛为原型一致的 `交付文档 / 验收确认 / 档案袋`。
  - `同步最新证据` 保留在右侧 Actions 卡片，和 Open Design 原型一致。
- 新增 `portfolioNavigationItems`，将项目档案袋顶部导航作为模型数据纳入 `portfolio-flow.test.ts`。
- 修正五阶段证据链动作文案，不再显示动态数量：
  - `查看阶段一产物`
  - `查看阶段二工作台`
  - `查看 RAG 决策路径`
  - `查看阶段四评分`
  - `查看验收确认`
- 为 `.portfolio-stage-chain button` 补齐 Open Design 中 `.portfolio-stage-chain a` 的视觉样式，保留生产端真实 `onStageOpen` 交互。
- 重跑固定视觉 QA：
  - 命令：`.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --prod-base http://127.0.0.1:3002`
  - 结果：生成 57 张截图。
  - manifest：`/private/tmp/edufde-vnext-qa-captures/manifest.json`
  - 本轮 manifest 时间：`2026-06-01T10:25:59.688457+00:00`
  - `round7-prod-portfolio-report.png` 已显示三项顶部导航和原型阶段动作文案。

验证：

- `cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts`：通过，5 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-01 Open Design vNext 阶段三 RAG 召回策略页精修

- 基于 `round4-ref-rag-retrieval.png` 与 `round4-prod-rag-retrieval.png` 的对照，修正右侧 Quality Gate 初始提示文案：
  - 从生产端硬编码的 `完成 3 个策略判断，并确认 3 项召回检查后保存。`
  - 调整为 Open Design 原型一致的 `已完成 0/3 个策略判断，0/3 个检查项。`
- 新增 `stageThreeRetrievalGateInitialCopy`，并纳入 `stage-three-flow.test.ts` 的召回策略原型模型测试。
- `StageThreeRetrievalLearningView` 改为引用该常量，避免后续召回策略页文案再次偏离原型。
- 重跑固定视觉 QA：
  - 命令：`.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --prod-base http://127.0.0.1:3002`
  - 结果：生成 57 张截图。
  - manifest：`/private/tmp/edufde-vnext-qa-captures/manifest.json`
  - 本轮 manifest 时间：`2026-06-01T10:36:59.123446+00:00`
  - `round4-prod-rag-retrieval.png` 已显示 Open Design 一致的 Quality Gate 初始进度文案；首屏粗差异从 13.1% 降为 12.7%。

验证：

- `cd frontend && npm run test:stage-three`：通过，36 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-01 Open Design vNext 项目档案袋 Hero 与最终状态文案精修

- 继续对照 `12-portfolio-report.html`，修正项目档案袋顶部两处原型文案差异：
  - Hero 说明补回 Open Design 末句：`不用单一分数替代学习过程。`
  - 未同步验收时的最终状态说明改为 Open Design 原型的 `点击“拉取项目证据”后，将从阶段四测试、交付文档和验收确认中同步最终归档状态。`
- 新增 `portfolioHeroCopy`，将档案袋 Hero 说明纳入 `portfolio-flow.test.ts` 的原型模型测试。
- `ProjectPortfolioView` 改为引用 `portfolioHeroCopy`，避免 JSX 内再次漂移。
- 重跑固定视觉 QA：
  - 命令：`.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --prod-base http://127.0.0.1:3002`
  - 结果：生成 57 张截图。
  - manifest：`/private/tmp/edufde-vnext-qa-captures/manifest.json`
  - 本轮 manifest 时间：`2026-06-01T11:01:53.224209+00:00`
  - `round7-prod-portfolio-report.png` 已显示 Open Design 一致的 Hero 说明和最终状态说明。

验证：

- TDD 红灯：`cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts` 先因 `portfolioHeroCopy` 未导出失败。
- `cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts`：通过，5 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-01 Open Design vNext 项目档案袋未同步 Toast 对齐

- 继续对照 `12-portfolio-report.html`，补齐项目档案袋在阶段五验收记录未同步时的固定提示：
  - 文案：`未检测到阶段五验收记录，已保留演示档案结构`
  - DOM/CSS 钩子：`data-portfolio-toast` + `toast show`
- 新增 `portfolioAcceptanceUnsyncedToastCopy`，并纳入 `portfolio-flow.test.ts` 的原型模型测试。
- `ProjectPortfolioView` 在 `archiveState.acceptanceGateDone === false` 时渲染该 toast，保持与 Open Design 原型的未同步状态一致。
- 清理 `ProjectPortfolioView` 里复刻后不再使用的旧档案袋组件和导入，避免新旧页面结构混杂。
- 重跑固定视觉 QA：
  - 命令：`.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --prod-base http://127.0.0.1:3002`
  - 结果：生成 57 张截图。
  - manifest：`/private/tmp/edufde-vnext-qa-captures/manifest.json`
  - 本轮 manifest 时间：`2026-06-01T11:21:54.481060+00:00`
  - `round7-prod-portfolio-report.png` 已显示 Open Design 一致的未同步验收 toast。

验证：

- TDD 红灯：`cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts` 先因 `portfolioAcceptanceUnsyncedToastCopy` 未导出失败。
- `cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts`：通过，5 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-01 Open Design vNext 视觉 QA 状态拆分与阶段二矩阵修正

- 修正固定截图矩阵中阶段二对标关系：
  - 新增 `round3-ref-solution-guide`，对标 `07-solution-guide.html`。
  - `round3-prod-solution-guide` 独立采集阶段二导学页。
  - `round3-prod-stage-two-solution` 独立采集阶段二方案工作台，对标 `07-solution-definition.html`。
- 拆分互斥 QA 数据状态，避免一个学生账号同时承担“阶段一未进入访谈”“阶段二导学刚解锁”“阶段二/三已推进”“阶段四/五后期态”：
  - `wang@edufde.demo`：阶段一导学与访谈实验室截图状态。
  - `zhao@edufde.demo`：阶段二导学页截图状态。
  - `lin@edufde.demo`：阶段二方案工作台和阶段三截图状态。
  - `chen@edufde.demo`：阶段四、阶段五、项目档案袋后期截图状态。
- 新增 `course-selection.ts`，学生首页选择当前课程时不再盲用 `courses[0]`，而是优先选择正在进行且阶段进度更高的 session，避免多课程学生误入锁定课程。
- `capture_open_design_vnext_qa.py` 的 manifest 已记录四个 visual QA 学生账号。
- 移除误导性的 `round4-prod-stage-three-knowledge` 截图；阶段三数据源识别页以 `round4-prod-rag-source` 对标 `08-knowledge-decision.html`。
- 重跑固定视觉 QA：
  - 命令：`.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --prod-base http://127.0.0.1:3002`
  - 结果：生成 58 张截图。
  - manifest：`/private/tmp/edufde-vnext-qa-captures/manifest.json`
  - 本轮 manifest 时间：`2026-06-01T12:05:11.874466+00:00`

验证：

- TDD 红灯：`cd frontend && node --experimental-strip-types --test src/components/student-product/course-selection.test.ts` 先因 `course-selection.ts` 不存在失败。
- `cd frontend && node --experimental-strip-types --test src/components/student-product/course-selection.test.ts`：通过，2 项测试通过，保留 Node ESM warning。
- `.venv/bin/python -m pytest backend/tests/test_demo_seed.py backend/tests/test_open_design_vnext_qa_script.py -q`：通过，9 项测试通过。
- `.venv/bin/python -m py_compile backend/scripts/capture_open_design_vnext_qa.py backend/app/seeds/demo.py`：通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-01 阶段三数据质量评估页 Open Design 复刻精修

- 精修 `08-rag-data-quality.html` 对应生产页 `round4-prod-rag-data-quality.png`：
  - 补齐 Open Design 原型中的 `Quality Rubric`、`Manufacturing Samples`、`Quality Impact`、`Decision Practice` 和底部 `Next Page` 模块。
  - 顶部三条原则恢复为原型文案：`不是看文件多不多`、`不让 AI 补事实`、`先评估再清洗`。
  - 右侧 `Quality Gate` 恢复圆环进度视觉，并保留质量评估检查、红线和下一环节卡片。
- 新增可测试数据模型：
  - `stageThreeQualityPrinciples`
  - `stageThreeQualityDimensionItems`
  - `stageThreeQualityMatrixRows`
  - `stageThreeQualityImpactItems`
- 重跑固定视觉 QA：
  - 命令：`.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --prod-base http://127.0.0.1:3002`
  - 结果：生成 58 张截图。
  - manifest：`/private/tmp/edufde-vnext-qa-captures/manifest.json`
  - 本轮 manifest 时间：`2026-06-01T12:30:14.801722+00:00`

验证：

- TDD 红灯：`cd frontend && npm run test:stage-three` 先因质量评估原型模块常量未导出失败。
- `cd frontend && npm run test:stage-three`：通过，37 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-01 阶段五交付文档章节导航遮挡修正

- 核对阶段四 `09-agent-build-test.html` 和 `09-agent-test-score.html`：
  - 构建测试页模块数量、长页节奏、右侧栏和底部 Next Test 已与当前原型保持一致。
  - 测试评分页生产端显示 84 分、三条测试结果和整改反馈，是 late visual QA seed 的真实后端数据态；结构模块完整，暂不按未测试占位态回退。
- 修正阶段五 `10-delivery-document.html` 对应生产页 `round6-prod-delivery-document-late.png`：
  - `StageFiveDeliveryDocumentView` 的章节导航不再默认 `pinned` 展开。
  - 截图中左侧目录恢复为 Open Design 一致的收起竖向 rail，不再遮挡 Hero。
- 重跑固定视觉 QA：
  - 命令：`.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --prod-base http://127.0.0.1:3002`
  - 结果：生成 58 张截图。
  - manifest：`/private/tmp/edufde-vnext-qa-captures/manifest.json`
  - 本轮 manifest 时间：`2026-06-01T12:38:10.233805+00:00`

验证：

- `cd frontend && npm run test:stage-five`：通过，12 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-01 第 0 轮生产入口截图覆盖与登录空态对齐

- 修正固定视觉 QA 脚本第 0 轮覆盖缺口：
  - 新增生产截图 `round0-prod-login-entry.png`，对应 `http://127.0.0.1:3002/#login-entry`。
  - 新增生产截图 `round0-prod-login.png`，对应 `http://127.0.0.1:3002/login`。
  - 全量固定截图数量由 58 张增加到 60 张。
- 登录页视觉对齐 Open Design：
  - 生产 `/login` 默认不再预填 demo 账号和密码，截图中账号和密码输入框为空。
  - 如需演示便利，可显式使用 `?demo=1` 或 `?demo=true` 进入预填 demo 凭据状态。
- 新增 `login-portal-model.ts` 和测试，隔离登录角色解析、demo 预填开关和初始表单状态。
- Browser 直接验证 `http://127.0.0.1:3002/#login-entry`：
  - URL 正确。
  - 页面标题为 `EduFDE｜高校 AI 智能体项目交付实训平台`。
  - 公共入口内容存在。
  - 无 Next.js / React 错误覆盖层。
  - console error/warn 为 0。
- Browser 直接验证 `http://127.0.0.1:3002/login`：
  - 账号输入为空。
  - 密码输入为空。
  - 无 Next.js / React 错误覆盖层。
  - console error/warn 为 0。
- 重跑固定视觉 QA：
  - 命令：`.venv/bin/python backend/scripts/capture_open_design_vnext_qa.py --prod-base http://127.0.0.1:3002`
  - 结果：生成 60 张截图。
  - manifest：`/private/tmp/edufde-vnext-qa-captures/manifest.json`
  - 本轮 manifest 时间：`2026-06-01T13:04:30.256863+00:00`

验证：

- TDD 红灯：`.venv/bin/python -m pytest backend/tests/test_open_design_vnext_qa_script.py -q` 先因 `PRODUCTION_PUBLIC_PAGES` 未定义失败。
- `.venv/bin/python -m pytest backend/tests/test_open_design_vnext_qa_script.py -q`：通过，3 项测试通过。
- `.venv/bin/python -m py_compile backend/scripts/capture_open_design_vnext_qa.py`：通过。
- TDD 红灯：`cd frontend && node --experimental-strip-types --test src/components/vnext-public/login-portal-model.test.ts` 先因 `login-portal-model.ts` 不存在失败。
- `cd frontend && node --experimental-strip-types --test src/components/vnext-public/login-portal-model.test.ts`：通过，2 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

### 2026-06-01 课程成员权限模型第一片

- 新增后端 `course_members` 模型与 Alembic 迁移：
  - `course_id + user_id` 唯一。
  - 保留 `tenant_id`、`institution_id`、`role`、`is_active` 和时间戳。
  - 迁移会把已有 `courses.created_by_user_id` 回填为 active teacher membership。
- 创建课程时自动写入创建教师的 active teacher membership。
- demo seed 与 Open Design visual QA seed 创建/更新课程时会补齐教师 membership。
- 教师进度相关权限从 `courses.created_by_user_id == current_user.id` 替换为 active `course_members`：
  - 课程进度列表。
  - 阶段 Artifact 摘要。
  - AI review 教师确认 Artifact。
- 仍保留 `courses.created_by_user_id` 作为创建者审计字段，不再作为教师读取边界的唯一依据。

验证：

- TDD 红灯：`CourseMember` 导入、数据库元数据、课程创建 membership 和成员教师进度访问测试先因模型不存在失败。
- `.venv/bin/python -m pytest backend/tests/test_database_foundation.py backend/tests/test_courses_sessions.py backend/tests/test_teacher_progress.py -q`：通过，21 项测试通过，保留 LangGraph warning。
- `.venv/bin/python -m pytest backend/tests/test_demo_seed.py backend/tests/test_database_foundation.py backend/tests/test_courses_sessions.py backend/tests/test_teacher_progress.py -q`：通过，28 项测试通过，保留 LangGraph warning。
- `.venv/bin/python -m pytest backend/tests -q`：通过，133 项测试通过，保留 LangGraph warning。
- `.venv/bin/python -m py_compile backend/app/models/teaching.py backend/app/models/identity.py backend/app/services/courses.py backend/app/services/teacher_progress.py backend/app/seeds/demo.py backend/alembic/versions/e7b9c3d4a102_add_course_members.py`：通过。
- `DATABASE_URL=sqlite+pysqlite:////private/tmp/edufde-alembic-course-members.db .venv/bin/alembic upgrade head`：未通过，阻断点是既有旧迁移 `9b1f22f3c8a4_add_user_password_hash.py` 在 SQLite 下执行 `ALTER COLUMN` 不兼容，非本次迁移错误。
- `.venv/bin/alembic upgrade head`：通过，在当前 PostgreSQL 配置下执行 `d6a4f2c8b901 -> e7b9c3d4a102`。
- `git diff --check`：通过。

### 2026-06-01 教师成绩草稿 / 发布 / 导出第一片

- 新增教师成绩后端能力：
  - `POST /api/v1/teacher/progress/sessions/{session_id}/grade-draft`：保存 `teacher_grade_draft` Artifact。
  - `POST /api/v1/teacher/progress/sessions/{session_id}/grade-publication`：发布 `teacher_grade_publication` Artifact。
  - `GET /api/v1/teacher/progress/courses/{course_id}/grade-export`：按课程导出最新成绩状态 JSON。
  - `GET /api/v1/teacher/progress/courses/{course_id}/grade-export.csv`：下载课程成绩 CSV 文件。
  - `GET /api/v1/teacher/progress/courses/{course_id}/grade-export.xlsx`：下载带表头样式、列宽和冻结首行的 Excel workbook。
- 成绩能力锚定 `stage_5`，继续沿用统一 Artifact 证据链，不新增旁路成绩表。
- 成绩草稿、发布和导出均按 active `course_members` teacher membership 授权。
- 已补测试覆盖教师保存草稿、发布正式成绩、JSON/CSV/XLSX 课程导出、学生拒绝和非课程教师拒绝。

验证：

- TDD 红灯：`.venv/bin/python -m pytest backend/tests/test_teacher_progress.py -q` 先因新接口不存在失败。
- `.venv/bin/python -m pytest backend/tests/test_teacher_progress.py -q`：通过，13 项测试通过，保留 LangGraph warning。
- `.venv/bin/python -m py_compile backend/app/api/teacher_progress.py backend/app/schemas/teacher_progress.py backend/app/services/teacher_progress.py`：通过。
- `.venv/bin/python -m pytest backend/tests -q`：通过，136 项测试通过，保留 LangGraph warning。
- `git diff --check`：通过。
- TDD 红灯：新增 CSV 导出断言后，`.venv/bin/python -m pytest backend/tests/test_teacher_progress.py -q` 先因 `/grade-export.csv` 不存在失败。
- `.venv/bin/python -m pytest backend/tests/test_teacher_progress.py -q`：通过，13 项测试通过，保留 LangGraph warning。
- `.venv/bin/python -m py_compile backend/app/api/teacher_progress.py backend/app/services/teacher_progress.py`：通过。
- `.venv/bin/python -m pytest backend/tests -q`：通过，136 项测试通过，保留 LangGraph warning。
- TDD 红灯：新增 XLSX 导出断言后，`.venv/bin/python -m pytest backend/tests/test_teacher_progress.py -q` 先因 `/grade-export.xlsx` 不存在失败。
- `.venv/bin/python -m pytest backend/tests/test_teacher_progress.py -q`：通过，17 项测试通过，保留 LangGraph warning。
- `.venv/bin/python -m py_compile backend/app/api/teacher_progress.py backend/app/services/teacher_progress.py`：通过。
- `.venv/bin/python -m pytest backend/tests -q`：通过，140 项测试通过，保留 LangGraph warning。

### 2026-06-01 教师端成绩发布前端第一片

- 前端 API 层新增教师成绩能力：
  - `saveTeacherGradeDraft`
  - `publishTeacherGrade`
  - `exportTeacherCourseGrades`
  - `downloadTeacherCourseGradesCsv`
  - `downloadTeacherCourseGradesXlsx`
- 新增 `vnext-ops/teacher-grade-flow.ts`，按学生 Session 阶段完成度与 Artifact 数量生成教师成绩草稿 payload。
- 教师工作台新增“成绩发布”面板：
  - 显示当前学生项目成绩状态。
  - 支持保存草稿、发布成绩、同步课程成绩状态、下载 CSV 和下载 Excel。
  - 使用后端 `teacher_grade_draft` / `teacher_grade_publication` Artifact 能力。

验证：

- `cd frontend && node --experimental-strip-types --test src/components/vnext-ops/teacher-grade-flow.test.ts`：通过，2 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- CSV 下载接入后，`cd frontend && npm run typecheck`：通过。
- CSV 下载接入后，`cd frontend && npm run lint`：通过。
- Excel 下载接入后，`cd frontend && npm run typecheck`：通过。
- Excel 下载接入后，`cd frontend && npm run lint`：通过。
- Chrome CDP 渲染检查 `http://127.0.0.1:3002/` 教师工作台：`教师工作台` 和 `成绩发布` 面板可见，无 error overlay；截图保存到 `/private/tmp/edufde-teacher-grade-dashboard-cdp.png`。
- 浏览器检查时当前 `18002` 后端进程仍是旧代码，页面顶部出现旧服务对新导出接口返回的 `Not Found`；新后端接口已由 pytest 覆盖，按钮联调需重启后端进程或切换到新 API 端口后复测。

### 2026-06-01 教师课程 Rubric 读取第一片

- 新增教师端课程 Rubric 读取能力：
  - `GET /api/v1/teacher/progress/courses/{course_id}/rubrics`
  - 按 active `course_members` teacher membership 授权。
  - 返回课程绑定实验包版本下的 published Rubric。
  - 同一阶段存在课程定制 Rubric 时，优先返回课程定制项，否则返回实验包默认项。
- 教师端课程配置页的“评分 Rubric”表已接入真实 Rubric 数据，不再只依赖静态占位行。

验证：

- `.venv/bin/python -m pytest backend/tests/test_teacher_progress.py -q`：通过，15 项测试通过，保留 LangGraph warning。
- `.venv/bin/python -m py_compile backend/app/api/teacher_progress.py backend/app/schemas/teacher_progress.py backend/app/services/teacher_progress.py`：通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python -m pytest backend/tests -q`：通过，138 项测试通过，保留 LangGraph warning。
- `git diff --check`：通过。

### 2026-06-01 教师课程 Rubric 草稿 / 发布第一片

- 新增教师端课程 Rubric 版本能力：
  - `POST /api/v1/teacher/progress/courses/{course_id}/rubrics/{stage_key}/draft`
  - `POST /api/v1/teacher/progress/courses/{course_id}/rubrics/{rubric_id}/publish`
- 教师可基于课程绑定实验包版本为指定阶段创建课程级 Rubric 草稿。
- 发布课程级 Rubric 时，会归档同课程、同阶段旧的 published 课程 Rubric；实验包默认 Rubric 不被修改。
- 教师端课程配置页新增“发布课程版本”入口，基于当前阶段 Rubric 生成课程定制版本并发布。

验证：

- TDD 红灯：`.venv/bin/python -m pytest backend/tests/test_teacher_progress.py -q` 先因课程 Rubric 草稿 / 发布接口不存在失败。
- `.venv/bin/python -m pytest backend/tests/test_teacher_progress.py -q`：通过，17 项测试通过，保留 LangGraph warning。
- `.venv/bin/python -m py_compile backend/app/api/teacher_progress.py backend/app/schemas/teacher_progress.py backend/app/services/teacher_progress.py`：通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python -m pytest backend/tests -q`：通过，140 项测试通过，保留 LangGraph warning。
- `git diff --check`：通过。

### 2026-06-01 教师课程 Rubric 编辑表单第一片

- 新增 `vnext-ops/teacher-rubric-flow.ts`：
  - 从课程 Rubric 生成可编辑草稿表单。
  - 将表单转换为 `TeacherRubricDraftPayload`。
  - 校验 Rubric JSON 必须为对象，并强制使用当前选择的 `stage_key`。
- 教师端课程配置页新增最小 Rubric 编辑表单：
  - 可选择阶段。
  - 可编辑版本名称。
  - 可编辑总分。
  - 可编辑规则 JSON。
  - 发布时保存课程 Rubric 草稿并立即发布为课程版本。

验证：

- `cd frontend && node --experimental-strip-types --test src/components/vnext-ops/teacher-rubric-flow.test.ts`：通过，3 项测试通过，保留 Node ESM warning。
- `cd frontend && node --experimental-strip-types --test src/components/vnext-ops/teacher-grade-flow.test.ts src/components/vnext-ops/teacher-rubric-flow.test.ts`：通过，5 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python -m pytest backend/tests/test_teacher_progress.py -q`：通过，17 项测试通过，保留 LangGraph warning。
- `.venv/bin/python -m pytest backend/tests -q`：通过，140 项测试通过，保留 LangGraph warning。
- `git diff --check`：通过。

### 2026-06-01 第 8 轮管理端运营概览第一片

- 新增管理端运营概览接口：`GET /api/v1/admin/operations/overview`。
- 接口仅允许 `admin` 访问，教师和学生返回 403。
- 当前概览不新增正式 License / 部署实例表，而是先从现有真实数据聚合：
  - 当前租户和机构。
  - 活跃用户数。
  - 课程数。
  - 学生实验 Session 数。
  - 课程绑定实验包版本数。
  - AI Gateway 调用次数、失败次数、token 总量、平均延迟和 usage type 分布。
  - 成绩册、Artifact 档案、AI 审计日志和 Rubric 规则库导出项记录数。
- 管理端部署页已接入该接口，顶部指标、部署实例表、License 权益、数据导出和 AI 用量统计从真实聚合数据渲染；接口不可用时保留空态。

验证：

- TDD 红灯：`.venv/bin/python -m pytest backend/tests/test_admin_operations.py -q` 先因管理端运营概览接口不存在失败。
- `.venv/bin/python -m pytest backend/tests/test_admin_operations.py -q`：通过，2 项测试通过，保留 LangGraph warning。
- `.venv/bin/python -m py_compile backend/app/api/admin_operations.py backend/app/schemas/admin_operations.py backend/app/services/admin_operations.py backend/app/main.py`：通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python -m pytest backend/tests -q`：通过，142 项测试通过，保留 LangGraph warning。

### 2026-06-01 第 8 轮管理端正式模型第一片

- 新增正式管理端数据模型：
  - `deployment_instances`：部署实例。
  - `license_entitlements`：License 权益与限额。
  - `operations_access_grants`：运维授权窗口。
- 新增 Alembic 迁移：`f8c1d2e3a405_add_admin_operations_models.py`。
- demo seed 会创建本地演示部署实例、活跃用户 / 课程 / AI 调用三类 License 权益，以及只读聚合范围的运维授权记录。
- 管理端运营概览优先读取正式部署实例、License 权益和运维授权记录；如果后续环境没有正式记录，仍保留派生空态兜底。
- 管理端部署页的运维授权区已显示最新授权原因。

验证：

- TDD 红灯：`.venv/bin/python -m pytest backend/tests/test_database_foundation.py backend/tests/test_admin_operations.py -q` 先因正式管理端模型不存在而收集失败。
- `.venv/bin/python -m pytest backend/tests/test_database_foundation.py backend/tests/test_admin_operations.py -q`：通过，8 项测试通过，保留 LangGraph warning。
- `.venv/bin/python -m py_compile backend/app/models/admin.py backend/app/api/admin_operations.py backend/app/schemas/admin_operations.py backend/app/services/admin_operations.py backend/app/seeds/demo.py`：通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python -m pytest backend/tests -q`：通过，142 项测试通过，保留 LangGraph warning。

### 2026-06-01 第 8 轮管理端操作 API 第一片

- 新增管理端操作接口：
  - `POST /api/v1/admin/operations/license-entitlements`
  - `POST /api/v1/admin/operations/deployment-instances/{deployment_instance_id}/status`
  - `POST /api/v1/admin/operations/access-grants/{grant_id}/revoke`
- 管理员可更新 License 权益限额、切换部署实例运行 / 维护状态、撤销运维授权。
- 教师调用上述接口返回 403，继续保持管理端操作权限边界。
- 管理端部署页新增最小操作入口：
  - License 权益区支持“上调席位”。
  - 部署实例区支持“切换维护 / 恢复运行”。
  - 运维授权区支持撤销当前 active 授权。

验证：

- TDD 红灯：`.venv/bin/python -m pytest backend/tests/test_admin_operations.py -q` 先因三个操作路由不存在而失败。
- `.venv/bin/python -m pytest backend/tests/test_admin_operations.py -q`：通过，4 项测试通过，保留 LangGraph warning。
- `.venv/bin/python -m py_compile backend/app/api/admin_operations.py backend/app/schemas/admin_operations.py backend/app/services/admin_operations.py`：通过。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `.venv/bin/python -m pytest backend/tests -q`：通过，144 项测试通过，保留 LangGraph warning。

### 2026-06-01 第 7 轮项目档案袋交互精修

- 对齐 `12-portfolio-report.html` 中原型已有但生产端仍为静态承载的成果操作：
  - “生成能力报告”会打开 `portfolio-report-panel` 弹窗，展示能力报告摘要和 5 个能力维度。
  - 生成报告后 Archive Gate 归档度从未同步态 72% 提升到 86%，能力报告检查项标记为完成。
  - “导出归档包”在报告未生成前显示阻断 toast；报告生成后显示归档包已准备 toast。
  - “复制项目摘要”会调用剪贴板并显示成功/失败 toast。
- 新增 `portfolioCapabilityReport`、导出 toast 文案和项目摘要文案模型，避免页面内硬编码报告内容。

验证：

- TDD 红灯：`cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts` 先因 `portfolioCapabilityReport` 等模型缺失失败。
- `cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts`：通过，5 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- Browser 验证：`http://127.0.0.1:3002/` 登录 `chen@edufde.demo` 后进入项目档案袋；生成能力报告弹窗、86% 归档度、导出归档包 toast 均可见；console error/warn 为空。

### 2026-06-01 第 6 轮阶段五交付文档交互补齐

- 对齐 `10-delivery-document.html` 中原型已有但生产端仍不完整的文档工作台交互：
  - “预览文档”不再触发刷新，改为打开 `report-preview` 弹层。
  - 预览弹层按六章交付文档结构生成客户可读预览内容，并提供继续编辑、确认文档并进入验收、进入验收确认三个动作。
  - 预览弹层每次打开都会把内部滚动复位到顶部，确保标题、文档名和第一章优先可见。
  - “AI 检查本章”打开 `ai-eval-drawer` 抽屉，展示评分、四个评审维度、必须处理问题和修改建议。
  - “保存本章”只接受 AI 评审 `pass` 结果；`revise` / `rewrite` / `unchecked` 不计入 6 章完成度。
- 新增阶段五纯模型函数：
  - `canSaveStageFiveChapter`
  - `createStageFiveDeliveryPreviewSections`

验证：

- TDD 红灯：`cd frontend && node --experimental-strip-types --test src/components/student-product/stage-five-flow.test.ts` 先因新模型函数缺失失败。
- `cd frontend && node --experimental-strip-types --test src/components/student-product/stage-five-flow.test.ts`：通过，14 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。
- Browser 验证：`http://127.0.0.1:3002/` 使用 demo 学生进入阶段五交付文档页；“预览文档”弹层可打开，`aria-hidden=false`，预览章节数为 6，`panelScrollTop=0`，标题、文档名和 `01 / 交付目标与项目概览` 优先可见；当前 demo session 已完成，章节按钮为 disabled，AI 抽屉交互由单元测试覆盖。

### 2026-06-01 第 6 轮阶段五验收确认交互补齐

- 对齐 `10-delivery-acceptance.html` 中原型已有但生产端仍为静态按钮的验收反馈：
  - “复制演示脚本”会调用剪贴板并显示 `data-delivery-toast`。
  - Browser 环境无虚拟剪贴板时显示原型一致 fallback：`复制失败，请手动复制侧栏脚本`。
  - 保存交付验收记录在未满足门禁时不再只是 disabled 静态按钮，而是保留 `aria-disabled` 并提示：`请先完成交付对象、清单、说明和模拟验收`。
  - 保存成功后显示：`交付验收记录已保存，可以进入项目档案袋`；真实 Artifact 保存仍走现有后端 `stage_5_acceptance_package` 流程。
- 新增阶段五验收交互模型：
  - `createStageFiveDemoScriptCopyText`
  - `stageFiveAcceptanceBlockedToast`
  - `stageFiveAcceptanceSavedToast`
  - `stageFiveDemoScriptCopyToast`
  - `stageFiveDemoScriptCopyFallbackToast`

验证：

- TDD 红灯：`cd frontend && npm run test:stage-five` 先因验收交互模型缺失失败。
- `cd frontend && npm run test:stage-five`：通过，15 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- Browser 验证：`http://127.0.0.1:3002/` 使用 demo 学生进入阶段五验收确认页；点击“复制演示脚本”后出现 `data-delivery-toast`，当前 Browser 环境显示 fallback 文案 `复制失败，请手动复制侧栏脚本`。

### 2026-06-01 第 5 轮阶段四测试评分交互补齐

- 对齐 `09-agent-test-score.html` 中平台自动化测试页的原型反馈：
  - “开始自动化测试”未满足测试对象门禁时不再只是不可点击，改为保留 disabled 视觉态并显示 `data-test-toast`。
  - 未填写测试对象、发布链接或访问权限说明时提示：`请先填写测试对象、发布链接和访问权限说明`。
  - 测试运行成功提示：`测试完成：可以保存评分记录`。
  - 保存测试评分记录未满足门禁时提示：`需要测试通过且无严重失败项后才能保存`。
  - 保存成功提示：`测试评分记录已保存，可以进入阶段五`；真实保存仍走现有 `stage_4_test_report` Artifact 流程。
- 新增阶段四测试评分交互文案模型：
  - `stageFourTestTargetRequiredToast`
  - `stageFourTestReadyToast`
  - `stageFourTestBlockedToast`
  - `stageFourTestSavedToast`

验证：

- TDD 红灯：`cd frontend && npm run test:stage-four` 先因阶段四测试反馈文案模型缺失失败。
- `cd frontend && npm run test:stage-four`：通过，17 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- Browser 验证：`http://127.0.0.1:3002/` 使用 demo 学生进入阶段四测试评分页；点击“开始自动化测试”后出现 `data-test-toast`，文案为 `请先填写测试对象、发布链接和访问权限说明`。

### 2026-06-01 第 5 轮阶段四正式搭建工作台交互补齐

- 对齐 `09-agent-build-test.html` 中正式 Dify 搭建页的原型反馈：
  - “填入演示记录”显示 `data-build-toast`：`已填入演示记录，请按你的 Dify 实际配置修改后保存`。
  - “保存正式搭建记录”未满足门禁时保留 disabled 视觉态，但可点击并提示：`请先完成 12 个构建步骤、必填记录和有效发布链接`。
  - 保存成功后提示：`正式搭建记录已保存，可以进入平台测试与评分`；真实保存仍走现有 `stage_4_dify_implementation` Artifact 流程。
- 新增阶段四搭建交互文案模型：
  - `stageFourBuildDemoFilledToast`
  - `stageFourBuildBlockedToast`
  - `stageFourBuildSavedToast`

验证：

- TDD 红灯：`cd frontend && npm run test:stage-four` 先因阶段四搭建反馈文案模型缺失失败。
- `cd frontend && npm run test:stage-four`：通过，18 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- Browser 验证：`http://127.0.0.1:3002/` 使用 demo 学生进入阶段四搭建工作台；点击“填入演示记录”后出现 `data-build-toast`，文案为 `已填入演示记录，请按你的 Dify 实际配置修改后保存`。

### 2026-06-02 第 5 轮阶段四 Dify 入门页交互补齐

- 对齐 `09-dify-onboarding.html` 中 Dify 入门页的原型反馈：
  - “保存 Dify 入门记录”未满足门禁时保留 disabled 视觉态，但可点击并提示：`请先完成 8 个 Chatflow 操作步骤、必填记录和有效发布链接`。
  - “填入演示记录”显示 `data-dify-toast`：`已填入演示记录，请按你的 Dify 实际操作结果修改后保存`。
  - 保存入门记录成功后提示：`Dify 入门记录已保存，可以进入正式构建工作台`。
  - 未保存入门记录时点击“进入正式构建工作台”提示：`请先保存 Dify 入门记录`。
  - 保存成功后才允许进入正式搭建工作台；后续正式构建保存仍走现有 `stage_4_dify_implementation` Artifact 流程。
- 新增阶段四 Dify 入门交互文案模型：
  - `stageFourOnboardingDemoFilledToast`
  - `stageFourOnboardingBlockedToast`
  - `stageFourOnboardingSavedToast`
  - `stageFourOnboardingNextBlockedToast`

验证：

- TDD 红灯：`cd frontend && npm run test:stage-four` 先因阶段四 Dify 入门反馈文案模型缺失失败。
- `cd frontend && npm run test:stage-four`：通过，19 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- Browser 验证：`http://127.0.0.1:3002/` 使用 demo 学生进入阶段四 Dify 入门页；已验证未完成保存门禁 toast、填入演示记录 toast、保存成功 toast，并在保存后进入正式构建工作台。

### 2026-06-02 第 5 轮阶段四实现导学页交互补齐

- 对齐 `09-agent-guide.html` 中阶段四实现导学页的原型反馈：
  - 未完成四项导学确认时点击“进入 Dify 入门练习”提示：`请先完成进入搭建前确认`。
  - 四项导学确认全部完成时显示 `data-agent-toast`：`阶段四导学已完成，可以进入 Dify 入门练习`。
  - “进入 Dify 入门练习”保留 disabled 视觉态但可点击触发门禁提示；完成后进入 Dify 入门页。
- 新增阶段四导学交互文案模型：
  - `stageFourGuideReadyToast`
  - `stageFourGuideBlockedToast`

验证：

- TDD 红灯：`cd frontend && npm run test:stage-four` 先因阶段四导学反馈文案模型缺失失败。
- `cd frontend && npm run test:stage-four`：通过，20 项测试通过，保留 Node ESM warning。
- Browser 验证：`http://127.0.0.1:3002/` 使用 demo 学生进入阶段四实现导学页；已验证未完成进入门禁 toast、四项确认完成 toast，并在完成后进入 Dify 入门页。

### 2026-06-02 第 4 轮阶段三数据源识别页保存反馈补齐

- 对齐 `08-knowledge-decision.html` 中数据源识别页的原型反馈：
  - 保存数据源识别决策成功后显示 `data-rag-toast`：`数据源识别决策已保存，可进入数据质量评估。`。
  - 保存仍先走现有阶段三过程记录 Artifact：`createStageThreeSourceRecordPayload` -> `onSaveLabExperimentRecord`。
  - 成功保存后再进入数据质量评估页，避免跳转过快导致原型反馈不可见。
- 新增阶段三数据源识别交互文案模型：
  - `stageThreeSourceSavedToast`

验证：

- TDD 红灯：`cd frontend && npm run test:stage-three` 先因阶段三数据源保存反馈文案模型缺失失败。
- `cd frontend && npm run test:stage-three`：通过，38 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- Browser 限制：当前 demo 学生阶段三已处于完成态，生产页只能看到已禁用的项目决策/收口页，未重置 seed 的情况下无法触发数据源识别保存按钮；本切片暂以模型测试、类型检查和 lint 收口。

### 2026-06-02 第 4 轮阶段三数据质量评估页保存反馈补齐

- 对齐 `08-rag-data-quality.html` 中数据质量评估页的原型反馈：
  - 保存数据质量评估成功后显示 `data-quality-toast`：`数据质量评估已保存，可以进入清洗与预处理。`。
  - 保存仍先走现有阶段三过程记录 Artifact：`createStageThreeQualityRecordPayload` -> `onSaveLabExperimentRecord`。
  - 成功保存后再进入清洗与预处理页，避免跳转过快导致原型反馈不可见。
- 新增阶段三数据质量评估交互文案模型：
  - `stageThreeQualitySavedToast`

验证：

- TDD 红灯：`cd frontend && npm run test:stage-three` 先因阶段三数据质量保存反馈文案模型缺失失败。
- `cd frontend && npm run test:stage-three`：通过，39 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- Browser 限制：当前 demo 学生阶段三已处于完成态，生产页只能看到已禁用的项目决策/收口页，未重置 seed 的情况下无法触发数据质量评估保存按钮；本切片暂以模型测试、类型检查和 lint 收口。

### 2026-06-02 第 4 轮阶段三清洗与预处理页交互补齐

- 对齐 `08-rag-cleaning.html` 中清洗与预处理页的原型反馈和最小交互：
  - 清洗样本 tab 可切换原始内容 / 预处理后候选知识 / 本次变化。
  - 4 个处理策略练习可选择答案，正确 / 错误反馈文案对齐原型。
  - 4 项检查勾选后更新本页门禁计数。
  - 策略判断和检查全部完成后可点击“保存清洗策略”，显示 `data-cleaning-toast`：`清洗策略已保存，可以进入知识结构设计。`。
  - 保存成功后进入知识结构设计页。
- 新增阶段三清洗页交互文案模型：
  - `stageThreeCleaningSavedToast`

验证：

- TDD 红灯：`cd frontend && npm run test:stage-three` 先因阶段三清洗保存反馈文案模型缺失失败。
- `cd frontend && npm run test:stage-three`：通过，40 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- Browser 限制：当前 demo 学生阶段三已处于完成态，生产页无法直接进入未完成清洗页触发保存；本切片暂以模型测试、类型检查和 lint 收口。

### 2026-06-02 第 4 轮阶段三知识结构设计页交互补齐

- 对齐 `08-rag-structure.html` 中知识结构设计页的原型反馈和最小交互：
  - 4 个知识域归类练习可选择答案，正确 / 错误反馈文案对齐原型。
  - 4 项检查勾选后更新本页门禁计数。
  - 归类判断和检查全部完成后可点击“保存知识结构草案”，显示 `data-structure-toast`：`知识结构草案已保存，可以进入分块策略。`。
  - 保存成功后进入分块策略页。
- 新增阶段三知识结构页交互文案模型：
  - `stageThreeStructureSavedToast`

验证：

- TDD 红灯：`cd frontend && npm run test:stage-three` 先因阶段三知识结构保存反馈文案模型缺失失败。
- `cd frontend && npm run test:stage-three`：通过，41 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- Browser 限制：当前 demo 学生阶段三已处于完成态，生产页无法直接进入未完成知识结构页触发保存；本切片暂以模型测试、类型检查和 lint 收口。

### 2026-06-02 第 4 轮阶段三分块策略页交互补齐

- 对齐 `08-rag-chunking.html` 中分块策略页的原型反馈和最小交互：
  - 分块模拟器的资料样本、分块策略、Chunk Size 和 Overlap 控件已改为受控状态，并驱动当前分块预览、chunk 数量和观察提示。
  - 4 个分块策略练习可选择答案，正确 / 错误反馈文案对齐原型。
  - 4 项检查勾选后更新本页门禁计数。
  - 分块判断和检查全部完成后可点击“保存分块策略记录”，显示 `data-chunking-toast`：`分块策略记录已保存，可以进入向量化与存储。`。
  - 保存成功后进入向量化与存储页。
- 新增阶段三分块页交互文案模型：
  - `stageThreeChunkingSavedToast`

验证：

- TDD 红灯：`cd frontend && npm run test:stage-three` 先因阶段三分块保存反馈文案模型缺失失败。
- `cd frontend && npm run test:stage-three`：通过，42 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- Browser 限制：当前 demo 学生阶段三已处于完成态，生产页无法直接进入未完成分块页触发保存；本切片暂以模型测试、类型检查和 lint 收口。

### 2026-06-02 第 4 轮阶段三向量化与存储页交互补齐

- 对齐 `08-rag-vector-storage.html` 中向量化与存储页的原型反馈和最小交互：
  - 查询问题和元数据过滤控件已改为受控状态，并驱动二维语义空间、Top-K 相似知识块和过滤后知识块数量。
  - 3 个向量存储策略练习可选择答案，正确 / 错误反馈文案对齐原型。
  - 3 项存储检查勾选后更新本页门禁计数。
  - 策略判断和检查全部完成后可点击“保存本环节结果”，按钮切换为“已保存”，显示 `data-vector-toast`：`向量化与存储设计已保存，可以进入召回策略。`。
  - 保存成功后进入召回策略页。
- 新增阶段三向量化与存储页交互文案模型：
  - `stageThreeVectorSavedToast`

验证：

- TDD 红灯：`cd frontend && npm run test:stage-three` 先因阶段三向量化与存储保存反馈文案模型缺失失败。
- `cd frontend && npm run test:stage-three`：通过，43 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。
- Browser 限制：当前 demo 学生阶段三已处于完成态，生产页无法直接进入未完成向量化与存储页触发保存；本切片暂以模型测试、类型检查和 lint 收口。

### 2026-06-02 第 4 轮阶段三召回策略页交互补齐

- 对齐 `08-rag-retrieval.html` 中召回策略页的原型反馈和最小交互：
  - 保留查询问题、召回模式、业务过滤和 Top-K 联动演示，继续驱动召回路径、排序结果和分数条。
  - 3 个召回策略练习可选择答案，正确 / 错误反馈文案对齐原型。
  - 3 项召回检查勾选后更新本页门禁计数。
  - 策略判断和检查全部完成后可点击“保存本环节结果”，按钮切换为“已保存”，显示 `data-retrieval-toast`：`召回策略判断已保存，可以进入回答生成与引用。`。
  - 保存成功后进入回答生成与引用页。
- 新增阶段三召回策略页交互文案模型：
  - `stageThreeRetrievalSavedToast`

验证：

- TDD 红灯：`cd frontend && npm run test:stage-three` 先因阶段三召回策略保存反馈文案模型缺失失败。
- `cd frontend && npm run test:stage-three`：通过，44 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。
- Browser 限制：当前 demo 学生阶段三已处于完成态，生产页无法直接进入未完成召回策略页触发保存；本切片暂以模型测试、类型检查和 lint 收口。

### 2026-06-02 第 4 轮阶段三回答生成与引用页交互补齐

- 对齐 `08-rag-answer-citation.html` 中回答生成与引用页的原型反馈和最小交互：
  - 保留业务问题、回答策略和引用粒度联动演示，继续驱动生成回答、引用条、风险提示、证据链和引用质量分。
  - 3 个回答质量判断练习可选择处理方式，正确 / 错误反馈文案对齐原型。
  - 3 项引用检查勾选后更新本页门禁计数。
  - 回答判断和引用检查全部完成后可点击“保存本环节结果”，按钮切换为“已保存”，显示 `data-answer-toast`：`回答生成与引用检查已保存`。
  - 保存成功后进入召回测试页。
- 新增阶段三回答生成与引用页交互文案模型：
  - `stageThreeAnswerSavedToast`

验证：

- TDD 红灯：`cd frontend && npm run test:stage-three` 先因阶段三回答生成与引用保存反馈文案模型缺失失败。
- `cd frontend && npm run test:stage-three`：通过，45 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。
- Browser 限制：当前 demo 学生阶段三已处于完成态，生产页无法直接进入未完成回答生成与引用页触发保存；本切片暂以模型测试、类型检查和 lint 收口。

### 2026-06-02 第 4 轮阶段三召回测试页交互补齐

- 对齐 `08-rag-recall-test.html` 中召回测试页的原型反馈和最小交互：
  - 运行批量测试按钮已接入本页状态，运行前召回结果区域显示等待提示，运行后展示 Top-K 目标证据 / 相似噪声结果。
  - Top-K 和通过阈值控件继续驱动命中率、误召回和测试结论指标。
  - 3 个失败修正判断练习可选择前置修正环节，正确 / 错误反馈文案对齐原型。
  - 4 项提交前检查勾选后更新右侧门禁进度。
  - 完成批量测试、三项判断练习和 4 项检查后可点击“保存召回测试记录”，按钮切换为“已保存”，保存状态显示 `已保存召回测试记录，可进入风险边界。`。
  - 保存成功后进入风险边界页。
- 新增阶段三召回测试页交互文案模型：
  - `stageThreeRecallSavedState`

验证：

- TDD 红灯：`cd frontend && npm run test:stage-three` 先因阶段三召回测试保存状态文案模型缺失失败。
- `cd frontend && npm run test:stage-three`：通过，46 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。
- Browser 限制：当前 demo 学生阶段三已处于完成态，生产页无法直接进入未完成召回测试页触发保存；本切片暂以模型测试、类型检查和 lint 收口。

### 2026-06-02 第 4 轮阶段三风险边界页交互补齐

- 对齐 `08-rag-risk-boundary.html` 中风险边界页的原型反馈和最小交互：
  - 4 个风险场景已改为需要学生选择处理策略，只有正确选择才计入边界门禁。
  - 重置判断、边界声明预览、保存边界草稿、4 项阶段四前确认检查已接入本地状态。
  - 右侧边界门禁按“场景判断 / 边界草稿 / 阶段四确认”三项计算完成度，并高亮已完成项。
  - 完成全部门禁后可点击“保存并进入阶段四导学”，显示 `data-rag-toast`：`阶段三边界说明已保存，正在进入阶段四导学`，随后跳转到 `#stage-four`。
  - 阶段三 RAG 01-10 学习页交互反馈第一片至此全部补齐。
- 新增阶段三风险边界页交互文案模型：
  - `stageThreeRiskBoundarySavedToast`

验证：

- TDD 红灯：`cd frontend && npm run test:stage-three` 先因阶段三风险边界完成反馈文案模型缺失失败。
- `cd frontend && npm run test:stage-three`：通过，47 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。
- Browser 限制：当前 demo 学生阶段三已处于完成态，生产页无法直接进入未完成风险边界页触发保存；本切片暂以模型测试、类型检查和 lint 收口。

### 2026-06-02 第 4 轮阶段三风险边界 Artifact 持久化

- 将 `08-rag-risk-boundary.html` 对应生产页的最终保存从纯前端 toast / hash 跳转推进为真实过程 Artifact 保存：
  - 新增 `createStageThreeRiskBoundaryRecordPayload`，生成 `stage_3_lab_experiment_record` 兼容 payload。
  - `selected_parameters.vnext_step` 固定为 `risk_boundary`。
  - payload 保留 4 个风险场景判断、4 段边界声明、阶段四前确认检查。
  - observations 记录“效果评估”和“应用层”两条边界证据，避免超过后端最多 5 条观察记录限制。
  - 风险边界页点击“保存并进入阶段四导学”时先调用 `onSaveLabExperimentRecord`，保存成功后才显示 `阶段三边界说明已保存，正在进入阶段四导学` 并跳转 `#stage-four`。
- 本切片不新增后端表，复用既有阶段三过程 Artifact 接口，符合当前 P0 后端合约。

验证：

- TDD 红灯：`cd frontend && npm run test:stage-three` 先因 `createStageThreeRiskBoundaryRecordPayload` 缺失失败。
- `cd frontend && npm run test:stage-three`：通过，48 项测试通过，保留 Node ESM warning。
- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `git diff --check`：通过。

## 四、下一步推荐任务

推荐下一任务：基于已恢复且状态对齐的固定视觉 QA 截图，对项目档案袋和阶段三 / 四 / 五长页做人工视觉细节精修与差异记录。

建议边界：

- 保持阶段一至阶段五和项目档案袋已迁移页面 Open Design 视觉不回退；教师/管理端当前只保持既有能力稳定，不作为本目标继续开发对象。
- 复用 `backend/scripts/capture_open_design_vnext_qa.py` 做每次视觉精修后的固定截图对照。
- 优先继续精修当前粗差异最高的阶段三 RAG、阶段四测试评分页和阶段五章节目录；项目档案袋已补齐能力报告弹窗、导出归档包、复制摘要和动态 toast 第一片。
- 下一步优先继续学生端 Artifact 恢复和视觉精修，不推进教师端批改 UI、Rubric 规则结构化编辑器或管理端 License / 部署 / 运维授权后续切片。

## 五、验证基线

常用验证命令：

```bash
python3 -m pytest backend/tests -q
cd frontend
npm run lint
npm run typecheck
npm run test:stage-one
npm run test:stage-two
npm run test:stage-three
npm run test:stage-four
npm run test:stage-five
```

涉及前端体验时，应尽量启动本地服务并做浏览器验证。

## 六、进度记录规则

后续更新本文件时只记录：

- 当前阶段状态变化。
- 最近完成的具体切片。
- 验证命令和结果。
- 未验证区域。
- 下一步推荐任务。

不要把第一阶段历史流水重新复制回本文件。
