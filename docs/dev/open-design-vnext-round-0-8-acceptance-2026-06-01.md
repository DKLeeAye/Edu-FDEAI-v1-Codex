# Open Design vNext 第二轮 0-8 轮验收矩阵

> 日期：2026-06-01  
> 入口基准：`http://127.0.0.1:4175/index.html#login-entry`  
> 生产前端：`http://127.0.0.1:3002`  
> 后端：`http://127.0.0.1:18002`

## 一、验收结论

第 0 轮至第 8 轮页面已完成生产前端承载，学生端主链路、五阶段工作区、项目档案袋、教师端旧状态页、AI Rubric 页和管理员部署页均有 Next.js 页面入口，并完成基础视觉截图对照。

本轮不能声明为最终“像素级完成态”。当前状态应定义为：

```text
Open Design vNext 第二轮页面覆盖完成
→ 关键旧流程已从正式入口移除或退为非正式兼容
→ 真实后端 Artifact / AI Gateway / Rubric / 教师进度能力已保留
→ 仍需后续像素级精修与后端闭环切片
```

## 二、页面覆盖矩阵

| 轮次 | Open Design 页面 | 生产实现状态 | 后端/数据状态 | 截图证据 |
| --- | --- | --- | --- | --- |
| 第 0 轮 | `index.html#login-entry`、`login.html` | 已实现公共首页和登录页 | 登录接真实 Auth API | `round0-ref/prod-*` |
| 第 1 轮 | `student-home.html`、`student-experiment-detail.html`、`05-student-project.html` | 已实现学生首页、实验详情、项目总览 | 课程、Session、学习画像、Artifact 接真实数据 | `round1-ref/prod-*` |
| 第 2 轮 | `06-interview-guide.html`、`06-interview-lab.html`、`06-interview-submit.html` | 已实现阶段一导学、访谈、整理提交 | AI 客户、访谈 Artifact、总结、评估、阶段完成接真实后端 | `round2-ref/prod-*` |
| 第 3 轮 | `07-solution-guide.html`、`07-solution-definition.html` | 已实现阶段二导学和六章方案工作台 | 九小节映射、AI 检查、文档评审、黄灯债务保持 | `round3-ref/prod-*` |
| 第 4 轮 | `08-*` RAG 10 页 | 已实现数据源、质量评估和 RAG 10 步承载 | 阶段三过程记录、知识决策、AI 评审保持 | `round4-ref/prod-*`、`round4b-ref/prod-*` |
| 第 5 轮 | `09-agent-guide.html`、`09-dify-onboarding.html`、`09-agent-build-test.html`、`09-agent-test-score.html` | 已完成四个子页专用模块复刻并完成 fresh screenshot | Dify 构建 Artifact、测试报告、AI 测试反馈保持 | `round5-ref/prod-*` |
| 第 6 轮 | `10-delivery-document.html`、`10-delivery-acceptance.html` | 已完成交付文档和验收确认专用模块复刻并完成 fresh screenshot | 交付说明、运维说明、验收包、AI 交付审阅保持 | `round6-ref/prod-*` |
| 第 7 轮 | `12-portfolio-report.html` | 已完成专用模型与 JSX 复刻，并补齐 late QA Artifact 归档态截图 | 五阶段 Artifact、交付摘要、学习画像聚合保持 | `round7-ref/prod-*` |
| 第 8 轮 | `11-ai-review-rubric.html`、`01-04` 教师旧状态页、`13-admin-deployment.html` | 已按旧状态页面标准完成教师/管理员登录后正式运营入口临时承载 | 教师进度与 Artifact API 接入；AI Rubric 教师确认 Artifact 已接入；管理端运营概览、正式模型和最小操作 API 已接入 | `round8-ref/prod-*` |

## 三、验证记录

前端静态验证：

- `cd frontend && npm run typecheck`：通过。
- `cd frontend && npm run lint`：通过。
- `cd frontend && npm run build`：通过，`/`、`/dev-workbench`、`/login` 均完成静态预渲染。
- `git diff --check`：通过。

阶段逻辑回归：

- `cd frontend && npm run test:stage-one`：24 项通过。
- `cd frontend && npm run test:stage-two`：10 项通过。
- `cd frontend && npm run test:stage-three`：51 项通过。
- `cd frontend && npm run test:stage-four`：25 项通过。
- `cd frontend && npm run test:stage-five`：23 项通过。
- `cd frontend && node --experimental-strip-types --test src/components/student-product/portfolio-flow.test.ts`：10 项通过。

后端回归：

- `.venv/bin/python -m pytest backend/tests -q`：146 项通过，1 条 LangGraph pending deprecation warning。

生产构建修复：

- `frontend/app/login/page.tsx` 已为 `LoginPortal` 增加 Suspense 边界，修复 Next.js 16 生产构建中 `useSearchParams()` 缺少 Suspense 导致 `/login` 预渲染失败的问题。

浏览器验证：

- Open Design 原型仍运行在 `http://127.0.0.1:4175/index.html#login-entry`。
- Next.js EduFDE 前端本轮运行在 `http://127.0.0.1:3002`；`3001` 当前被另一套 TechenMeta 医学短视频项目占用，不作为 EduFDE 验收地址。
- FastAPI 后端仍运行在 `http://127.0.0.1:18002`。
- 新增仓库内固定视觉 QA 截图脚本：`backend/scripts/capture_open_design_vnext_qa.py`。
- 脚本已使用阶段一、阶段二导学、主链路和后期态四组 visual QA seed，并捕获第 0-8 轮参考/生产截图；当前最新矩阵为 62 张。
- 固定截图目录：`/private/tmp/edufde-vnext-qa-captures/`。
- 截图 manifest：`/private/tmp/edufde-vnext-qa-captures/manifest.json`。
- 本轮 manifest 时间：`2026-06-01T09:14:38.974264+00:00`，生产前端基址 `http://127.0.0.1:3002`。
- 第七轮档案袋与 84 分 seed 对齐后 manifest 时间：`2026-06-01T09:48:53.642378+00:00`，生产前端基址 `http://127.0.0.1:3002`。
- 阶段一 guide/lab 截图矩阵修正后 manifest 时间：`2026-06-01T10:03:59.212559+00:00`，生产前端基址 `http://127.0.0.1:3002`。
- 项目档案袋同步态修正后 manifest 时间：`2026-06-01T10:13:03.168736+00:00`，生产前端基址 `http://127.0.0.1:3002`。
- 项目档案袋导航与阶段动作精修后 manifest 时间：`2026-06-01T10:25:59.688457+00:00`，生产前端基址 `http://127.0.0.1:3002`。
- 阶段三 RAG 召回策略页精修后 manifest 时间：`2026-06-01T10:36:59.123446+00:00`，生产前端基址 `http://127.0.0.1:3002`。
- 项目档案袋 Hero 与最终状态文案精修后 manifest 时间：`2026-06-01T11:01:53.224209+00:00`，生产前端基址 `http://127.0.0.1:3002`。
- 项目档案袋未同步验收 toast 对齐后 manifest 时间：`2026-06-01T11:21:54.481060+00:00`，生产前端基址 `http://127.0.0.1:3002`。
- 视觉 QA 状态拆分与阶段二 / 阶段三矩阵修正后 manifest 时间：`2026-06-01T12:05:11.874466+00:00`，生产前端基址 `http://127.0.0.1:3002`，截图数 58。
- 阶段三数据质量评估页精修后 manifest 时间：`2026-06-01T12:30:14.801722+00:00`，生产前端基址 `http://127.0.0.1:3002`，截图数 58。
- 阶段五交付文档章节导航遮挡修正后 manifest 时间：`2026-06-01T12:38:10.233805+00:00`，生产前端基址 `http://127.0.0.1:3002`，截图数 58。
- 第 0 轮生产入口与登录页纳入固定截图矩阵后 manifest 时间：`2026-06-01T13:04:30.256863+00:00`，生产前端基址 `http://127.0.0.1:3002`，截图数 60。
- 阶段四测试评分 late 截图等待文案修正后 manifest 时间：`2026-06-01T20:24:21.590733+00:00`，生产前端基址 `http://127.0.0.1:3002`，截图数 60，manifest 位于 `/private/tmp/edufde-vnext-qa-captures-current-2/manifest.json`。
- 项目档案袋首屏 toast 遮挡修正后 manifest 时间：`2026-06-01T20:31:43.420810+00:00`，生产前端基址 `http://127.0.0.1:3002`，截图数 60，manifest 位于 `/private/tmp/edufde-vnext-qa-captures-current-3/manifest.json`。
- 阶段五验收页顶部导航精修后 manifest 时间：`2026-06-01T20:49:30.545973+00:00`，生产前端基址 `http://127.0.0.1:3002`，截图数 60，manifest 位于 `/private/tmp/edufde-vnext-qa-captures-current-5/manifest.json`。
- 阶段一访谈页兜底对话对齐后 manifest 时间：`2026-06-01T20:58:39.031456+00:00`，生产前端基址 `http://127.0.0.1:3002`，截图数 60，manifest 位于 `/private/tmp/edufde-vnext-qa-captures-current-6/manifest.json`。
- 第 1 轮学生页截图账号边界修正后 manifest 时间：`2026-06-01T21:09:04.368116+00:00`，生产前端基址 `http://127.0.0.1:3002`，截图数 60，manifest 位于 `/private/tmp/edufde-vnext-qa-captures-current-7/manifest.json`。
- 阶段二方案工作台正式文档回填修正后 manifest 时间：`2026-06-01T21:26:47.196332+00:00`，生产前端基址 `http://127.0.0.1:3002`，截图数 60，manifest 位于 `/private/tmp/edufde-vnext-qa-captures-current-9/manifest.json`。
- 阶段四测试评分稀疏报告详情回填修正后 manifest 时间：`2026-06-01T21:36:16.523767+00:00`，生产前端基址 `http://127.0.0.1:3002`，截图数 60，manifest 位于 `/private/tmp/edufde-vnext-qa-captures-current-10/manifest.json`。
- 阶段五验收清单 legacy 回填修正后 manifest 时间：`2026-06-01T21:49:06.753492+00:00`，生产前端基址 `http://127.0.0.1:3002`，截图数 60，manifest 位于 `/private/tmp/edufde-vnext-qa-captures-current-11/manifest.json`。
- 阶段五交付文档只读表单色彩对齐后 manifest 时间：`2026-06-01T22:11:39.007317+00:00`，生产前端基址 `http://127.0.0.1:3002`，截图数 60，manifest 位于 `/private/tmp/edufde-vnext-qa-captures-current-14/manifest.json`。
- 阶段三风险边界预览默认隐藏修正后 manifest 时间：`2026-06-01T22:19:56.089535+00:00`，生产前端基址 `http://127.0.0.1:3002`，截图数 60，manifest 位于 `/private/tmp/edufde-vnext-qa-captures-current-15/manifest.json`。
- 阶段一整理提交页纳入固定矩阵并补齐 Open Design 兜底草稿后 manifest 时间：`2026-06-01T22:29:23.876576+00:00`，生产前端基址 `http://127.0.0.1:3002`，截图数 62，manifest 位于 `/private/tmp/edufde-vnext-qa-captures-current-17/manifest.json`。

## 四、P0 已解决

- 正式入口不再以旧阶段一“教学引导模式 / 项目实战模式”双入口作为产品主路径。
- 阶段一至阶段五工作区已从旧 `AppShell` 包裹中释放为 Open Design focused 页面。
- 第 2 轮阶段一固定截图已覆盖 `06-interview-guide.html`、`06-interview-lab.html` 和 `06-interview-submit.html`；整理提交页无正式 Artifact 时使用 Open Design 兜底草稿，真实阶段一 Artifact 仍优先。
- 学生端核心链路不再以 Tailwind/旧组件视觉体系为首屏基准。
- 教师和管理员登录后不再进入“正式页面待开放”占位页。
- AI 评审页面明确展示 Rubric、证据、审计字段和教师最终确认权。

## 五、剩余缺口分级

### P1：视觉精修缺口

- 阶段三 RAG 01-10 已完成专用模块复刻第一轮；其中 `08-rag-data-quality.html` 已补齐 Rubric、样本质量矩阵、质量影响链、决策练习、Next Page、顶部原则和右侧 Quality Gate 圆环。
- 阶段四 `09-agent-guide.html`、`09-dify-onboarding.html`、`09-agent-build-test.html`、`09-agent-test-score.html` 已完成专用模块复刻并完成 fresh screenshot。
- 阶段五 `10-delivery-document.html`、`10-delivery-acceptance.html` 已完成专用模型与 JSX 复刻并完成 fresh screenshot。
- 项目档案袋已完成能力画像六宫格、最终交付包、证据链和归档侧栏的代码侧复刻；能力报告弹窗、导出归档包、复制项目摘要和动态 toast 已完成第一片。
- 第 8 轮教师/管理端原型本身仍是旧状态页面，本轮只完成正式入口和临时承载。

### P1：后端闭环缺口

- 教师接受 AI 建议、覆盖评分、覆盖原因和审计日志写入已完成第一片：教师确认会生成 `teacher_ai_review_confirmation` Artifact，并回写源 AI review 的 `teacher_confirmation` 审计块。
- 课程成员权限模型已完成第一片：新增 `course_members`、课程创建自动写入教师成员、demo/visual QA seed 自动补齐教师成员，教师进度、阶段 Artifact 摘要、AI review 教师确认、成绩草稿、成绩发布和成绩导出已按 active teacher membership 授权。
- 正式教师批改、评分发布和成绩导出已完成第一片：`teacher_grade_draft` 保存草稿，`teacher_grade_publication` 保存正式发布，课程导出读取最新发布记录，并已提供 CSV 和 XLSX 文件下载；教师工作台已新增成绩发布面板和前端 API 接入；课程 Rubric 读取、草稿和发布接口已接入，课程配置页可读取真实 Rubric，并通过阶段、名称、总分和规则 JSON 表单发布课程版本；更细的 Rubric 规则结构化编辑器仍待补。
- 管理端运营概览已完成第一片：`GET /api/v1/admin/operations/overview` 基于当前管理员租户 / 机构聚合真实用户、课程、Session、实验包版本、Artifact、Rubric 和 AI Gateway 调用日志；管理端部署页已接入顶部指标、部署实例、License 权益、数据导出和 AI 用量统计。
- 管理端正式模型已完成第一片：新增 `deployment_instances`、`license_entitlements` 和 `operations_access_grants`，demo seed 创建本地演示部署、三类 License 权益和只读聚合运维授权；运营概览优先读取这些正式记录。
- 管理端操作 API 已完成第一片：管理员可更新 License 权益、切换部署实例运行 / 维护状态、撤销运维授权；管理端部署页已接入最小操作入口。
- 成员管理 API、助教/班级成员、学生选课关系仍需后续扩展。
- 管理端 License、部署实例和运维授权的审批、创建、审计回放、限额 enforcement 和 SLA 仍待后续切片。

### P2：数据态和 QA 缺口

- 已建立固定视觉 QA seed 和仓库内截图脚本，避免后续截图完全依赖普通 demo 完成态：
  - 阶段一截图账号：`wang@edufde.demo`
  - 课程：`MFG-QA-VNEXT-STAGE1`
  - 学生姓名：`王同学`
  - 阶段状态：阶段一进行中，阶段二至五锁定
  - Artifact 数量：0
  - 阶段二导学截图账号：`zhao@edufde.demo`
  - 课程：`MFG-QA-VNEXT-STAGE2-GUIDE`
  - 学生姓名：`赵同学`
  - 阶段状态：阶段一完成，阶段二进行中，阶段三至五锁定
  - Artifact 数量：0
  - 主链路账号：`lin@edufde.demo`
  - 密码：`EduFDE-demo-123`
  - 课程：`MFG-QA-VNEXT-QA`
  - 学生姓名：`林同学`
  - 阶段状态：阶段一完成、阶段二完成、阶段三进行中、阶段四/五锁定
  - Artifact 数量：12
  - AI Rubric 评审：阶段二建议分 82，Rubric `solution_definition_v1.1`
  - 后期阶段账号：`chen@edufde.demo`
  - 课程：`MFG-QA-VNEXT-LATE`
  - 学生姓名：`陈同学`
  - 阶段状态：阶段一至三完成、阶段四进行中、阶段五未开始
  - Artifact 数量：19
  - 阶段四 AI 测试评审：建议分 84，Rubric `agent_test_v1.0`
- `backend/scripts/capture_open_design_vnext_qa.py` 已完成第 0-8 轮固定截图状态：
  - 参考页：`round0-ref-*` 至 `round8-ref-*`
  - 第 0 轮生产公共页：`round0-prod-login-entry.png` 对标 `index.html#login-entry`，`round0-prod-login.png` 对标 `login.html`。
  - 生产 `/login` 默认保持 Open Design 空输入状态；demo 账号预填仅在显式 `?demo=1` / `?demo=true` 时启用。
  - 生产页：学生首页、实验详情、项目总览、阶段一、阶段二、阶段三、阶段四/五锁定态、阶段四测试评分 late 态、阶段五验收确认 late 态、项目档案袋、教师工作台、AI Rubric、管理部署页。
  - 第 1 轮学生首页、实验详情和项目总览使用主链路账号 `lin@edufde.demo`；第 2 轮阶段一导学和访谈实验室使用阶段一专用账号 `wang@edufde.demo`，避免截图状态互相污染。
- 阶段一第 2 轮截图已拆分导学页和访谈实验室：
  - `round2-ref-interview-guide.png` 对标 `round2-prod-interview-guide.png`。
  - `round2-ref-interview-lab.png` 对标 `round2-prod-stage-one-interview.png`。
  - 访谈实验室无真实 Artifact 的 Open Design 兜底态已补齐四条对话，包含第二轮学生追问 `这些资料分散对您和一线质检员分别造成了什么影响？`，右侧 AI 实时反馈也与原型一致。
  - 生产端 lab 截图会先点击“开始模拟访谈”，避免继续把导学页误当作访谈模拟页进行像素对比。
- 阶段二第 3 轮截图已拆分导学页和方案工作台：
  - `round3-ref-solution-guide.png` 对标 `round3-prod-solution-guide.png`。
  - `round3-ref-solution-definition.png` 对标 `round3-prod-stage-two-solution.png`。
  - 生产端分别使用阶段二导学 QA seed 和主链路 QA seed，避免用已完成阶段二状态误截导学页，或用未解锁状态误截方案工作台。
  - `round3-prod-stage-two-solution.png` 已支持从正式 `stage_2_requirements_document`、`stage_2_feasibility_report` 和 `stage_2_technical_solution` 按字段兜底回填六章工作台内容；已有学生草稿字段仍优先保留。
- 阶段三 RAG 01-10 已纳入固定截图脚本：
  - 参考页：`round4-ref-knowledge-decision.png`、`round4-ref-rag-data-quality.png`、`round4-ref-rag-cleaning.png` 至 `round4-ref-rag-risk-boundary.png`
  - 生产页：`round4-prod-rag-source.png`、`round4-prod-rag-data-quality.png`、`round4-prod-rag-cleaning.png` 至 `round4-prod-rag-risk-boundary.png`
  - 已移除误导性的 `round4-prod-stage-three-knowledge.png`，避免把阶段三后置交接/评审页误当作 `08-knowledge-decision.html` 的对标页。
  - 当前结论：生产端可稳定承载并逐页切换；`08-rag-cleaning.html`、`08-rag-structure.html`、`08-rag-chunking.html`、`08-rag-vector-storage.html`、`08-rag-retrieval.html`、`08-rag-answer-citation.html`、`08-rag-recall-test.html` 和 `08-rag-risk-boundary.html` 已完成第一轮专用模块复刻。
  - `08-rag-data-quality.html` 的生产页已补齐原型中的 `Quality Rubric`、`Manufacturing Samples`、`Quality Impact`、`Decision Practice` 和 `Next Page` 主模块，并恢复原型三条原则与右侧圆环门禁；数据质量评估页交互反馈已补齐第一片：保存成功显示 `data-quality-toast`，真实保存仍走阶段三过程记录 Artifact。
  - `08-knowledge-decision.html` 数据源识别页交互反馈已补齐第一片：保存成功显示 `data-rag-toast`，真实保存仍走阶段三过程记录 Artifact。
  - `08-knowledge-decision.html`、`08-rag-data-quality.html` 和 `08-rag-risk-boundary.html` 可从最新 `stage_3_lab_experiment_record` 恢复数据源判断、质量判断、检查项、已查看样本、风险场景判断、边界字段和保存状态，避免刷新后回到空白状态。
  - `08-rag-cleaning.html` 清洗与预处理页交互反馈已补齐第一片：样本 tab、策略判断、检查门禁和保存成功 `data-cleaning-toast` 已接入，保存后进入知识结构设计。
  - `08-rag-structure.html` 知识结构设计页交互反馈已补齐第一片：知识域归类、检查门禁和保存成功 `data-structure-toast` 已接入，保存后进入分块策略。
  - `08-rag-chunking.html` 分块策略页交互反馈已补齐第一片：分块模拟器控件、策略判断、检查门禁和保存成功 `data-chunking-toast` 已接入，保存后进入向量化与存储。
  - `08-rag-vector-storage.html` 向量化与存储页交互反馈已补齐第一片：查询 / 过滤联动、存储策略判断、检查门禁和保存成功 `data-vector-toast` 已接入，保存后进入召回策略。
  - `08-rag-retrieval.html` 召回策略页交互反馈已补齐第一片：召回演示控件、策略判断、检查门禁和保存成功 `data-retrieval-toast` 已接入，保存后进入回答生成与引用。
  - `08-rag-answer-citation.html` 回答生成与引用页交互反馈已补齐第一片：回答策略 / 引用粒度联动、回答质量判断、引用检查门禁和保存成功 `data-answer-toast` 已接入，保存后进入召回测试。
  - `08-rag-recall-test.html` 召回测试页交互反馈已补齐第一片：运行批量测试、失败修正判断、提交前检查门禁和保存状态反馈已接入，保存后进入风险边界。
  - `08-rag-risk-boundary.html` 风险边界页交互反馈已补齐第一片：风险场景判断、边界草稿预览/保存、阶段四确认门禁和最终保存 `data-rag-toast` 已接入，保存后进入阶段四导学锚点。
  - `08-rag-risk-boundary.html` 边界声明预览已恢复为默认隐藏，修正 `.risk-preview { display: grid; }` 覆盖 `hidden` 属性导致 initial screenshot 多出预览框的问题；current-15 已确认底部与参考图一致，只显示“预览边界声明 / 保存边界草稿”按钮。
  - `08-rag-retrieval.html` 的 Quality Gate 初始进度文案已对齐为 `已完成 0/3 个策略判断，0/3 个检查项。`。
- 阶段四 late 态截图已扩展为四个子页逐项截图：
  - `round5-prod-agent-guide-late.png` 已对齐 `09-agent-guide.html` 的架构图、阶段三映射表、规则网格、案例拆解和右侧门禁/Next 卡片；实现导学页交互反馈已补齐第一片：四项导学确认完成和未完成进入 Dify 入门门禁均显示 `data-agent-toast`。
  - `round5-prod-dify-onboarding-late.png` 已对齐 `09-dify-onboarding.html` 的 8 步 runbook、画布 mini flow、LLM 指令模板、右侧进度条和 Platform Sync；Dify 入门页交互反馈已补齐第一片：填入演示记录、保存门禁阻断、保存成功和进入正式构建门禁均显示 `data-dify-toast`，保存成功后才允许进入正式构建工作台。
  - `09-agent-build-test.html` 已完成生产代码侧专用复刻；`round5-prod-agent-build-test-late.png` fresh screenshot 已补跑；搭建页交互反馈已补齐第一片：填入演示记录、保存门禁阻断和保存成功均显示 `data-build-toast`，真实保存仍走 `stage_4_dify_implementation` Artifact 流程。
  - `09-agent-test-score.html` 已完成生产代码侧专用复刻，覆盖 Test Target、Test Suites、Run Results、Remediation Loop、Score 和 Quality Gate；`round5-prod-agent-test-score-late.png` fresh screenshot 已补跑。
  - 固定视觉 QA 脚本已对齐当前生产页标题 `用平台测试集验证 Dify 智能体是否达到交付门槛`，避免 late 测试评分截图等待旧文案导致全量矩阵卡住。
  - `09-agent-test-score.html` 交互反馈已补齐第一片：测试对象缺失时运行测试显示 `data-test-toast`，测试运行 / 保存评分记录 / 保存门禁阻断文案对齐原型；真实保存仍走 `stage_4_test_report` Artifact 流程。
  - `stage_4_test_report.coverage_notes` 旧报告可恢复测试对象、发布链接、访问说明、总分、维度分、告警项和严重失败数，避免阶段四测试评分页回访时 Quality Gate 错判“测试对象未完成”或“无严重失败项”。
  - 稀疏旧报告的 `test_cases` 若只有 `scenario` / `result`，生产页会按平台测试模板回填测试问题、期望行为、智能体回答、命中证据和问题定位；`round5-prod-agent-test-score-late.png` current-10 已确认三条 Run Results 详情不再空白。
- 阶段四 / 五 late 态截图已接入持久化测试报告评分映射：
  - `round5-prod-agent-test-score-late.png` 显示阶段四持久化总分 84 和四个维度分。
  - `round6-prod-delivery-acceptance-late.png` 显示阶段五验收对象中的阶段四测试评分 84 分。
  - 阶段四质量门禁按持久化报告里的分数和失败状态判断，不再只凭测试报告存在与否推断通过。
- 阶段五交付说明文档页已完成生产代码侧专用复刻：
  - 覆盖 `doc-nav-rail` 左侧章节目录、三块输入证据、六章完整 `report-chapter`、写作教学、事实依据、撰写区、AI 检查和保存本章。
  - `round6-prod-delivery-document-late.png` fresh screenshot 已补跑。
  - 章节导航已恢复默认收起态，不再用 `pinned` 展开遮挡 Hero；截图中仅显示左侧竖向 rail，与 `10-delivery-document.html` 对齐。
  - 文档预览与章节 AI 评审交互已补齐第一片：`预览文档` 打开 `report-preview` 弹层并生成 6 章预览，弹层打开时复位到顶部；`AI 检查本章` 打开 `ai-eval-drawer` 抽屉；章节保存门禁只接受 `pass` 评审结果。
  - late 只读 / 回访态表单色彩已限定在 `.delivery-doc-page` 下对齐 Open Design 冷灰蓝视觉，避免章节事实依据区和撰写区控件出现偏红 / 偏粉底色；current-14 中第一章证据区 RGB 均值为 `[236,241,244]`，贴近参考图 `[237,242,246]`。
- 阶段五交付验收确认页已完成生产代码侧专用复刻：
  - 覆盖 Handoff Target、Acceptance Agenda、Delivery Package、Delivery Document、Acceptance Review、Final Decision、Readiness、Demo Script 和 Final Gate。
  - `round6-prod-delivery-acceptance-late.png` fresh screenshot 已补跑。
  - 顶部导航已收敛为原型四项：`阶段三 RAG`、`阶段四测试`、`交付文档`、`验收确认`；生产页不再额外显示 `同步进度`。
  - 验收确认页交互反馈已补齐第一片：`复制演示脚本` 调用剪贴板并显示 `data-delivery-toast`；保存门禁未满足时显示原型一致提示，保存成功后继续走真实 `stage_5_acceptance_package` Artifact 流程。
  - 已保存验收包可从 `acceptance_scope` 恢复交付对象、知识库和发布链接，避免上游阶段四或交付文档 Artifact 暂缺时回退到演示默认值。
  - 验收包尚未生成时，验收对象也可从 `stage_4_test_report.coverage_notes` 恢复应用名称、知识库和发布链接。
  - legacy `stage_5_acceptance_package` 缺少新版 `handover_checklist` 时，交付包七项清单可从交付文档、运维说明、阶段四实现记录和阶段四测试报告回填；`round6-prod-delivery-acceptance-late.png` current-11 已确认 Delivery Package 为 `7 / 7`，Readiness 为 `80%`。
  - Final Gate 已收敛为只有“通过验收”和“有条件通过”可归档；“退回修改”会保留为结论选项，但不再误判为可保存最终档案袋证据。
- 第七轮项目档案袋页已完成生产代码侧专用复刻：
  - 覆盖 Project Overview、Evidence Chain、Capability Profile、Final Package、Archive Gate、Review Notes 和 Actions。
  - `round7-prod-portfolio-report.png` fresh screenshot 已补跑。
  - 生产端已按真实 Artifact 聚合归档态：阶段四测试报告可进入档案袋证据，阶段五验收包草稿不再误判为最终验收已同步；当前截图显示 `未同步`、`84 分`、`未确认`、`72%`、`4 / 5 已归档` 和阶段五 `待同步`。
  - 阶段五验收包同步边界已与 Final Gate 对齐：`draft` 和“退回修改”不计入最终验收同步，“通过验收”和“有条件通过”才进入最终归档态。
  - 阶段四测试评分按最新 `stage_4_test_report` 恢复；可从 `content_json.total_score` 读取，也可从测试报告 `coverage_notes` 中明确的“总分：84”字段恢复，避免档案袋评分回退为 `--` 或多次测试后显示旧分数。
  - 验收包已同步但交付文档或阶段四 implementation 暂缺时，项目总览 Dify 应用卡片可从 `acceptance_scope` 恢复交付对象和发布链接。
  - 顶部导航已收敛为原型三项：`交付文档`、`验收确认`、`档案袋`；阶段证据链动作文案已恢复为原型文字，不再显示动态 Artifact 数量。
  - Hero 说明和最终状态未同步说明已对齐 `12-portfolio-report.html` 原型文案。
  - 首屏不再自动显示未同步验收 toast，避免遮挡右侧 `Review Notes`；点击 `拉取项目证据` 或 `同步最新证据` 后，未检测到有效验收记录时才显示 `data-portfolio-toast`：`未检测到阶段五验收记录，已保留演示档案结构`。
  - 成果操作交互已对齐原型第一片：生成能力报告会打开报告弹窗并将归档度提升到 86%；报告生成前导出归档包显示阻断 toast，报告生成后显示归档包已准备 toast；已有 `stage_5_ai_delivery_review` 时刷新后可恢复能力报告已生成和导出可用状态；复制项目摘要会调用剪贴板并显示结果 toast。
  - late visual QA seed 的阶段四测试报告和 AI 测试评审已对齐 Open Design 静态参考图，不再保留 78/84 分数据差异。
- 第八轮教师 / AI Rubric / 管理端已按旧状态页面标准完成临时承载核对：
  - 生产端由 `vnext-ops/operations-dashboard.tsx` 统一承载教师工作台、课程配置、实验包库、课中监控、AI Rubric 和管理部署入口。
  - 固定截图脚本已覆盖并补跑 `round8-prod-teacher-dashboard`、`round8-prod-ai-review-rubric` 和 `round8-prod-admin-deployment`。
- 内置 Browser 插件截图接口在当前会话超时，本轮用 Chrome CDP 兜底；后续可继续优先尝试 Browser 插件。

## 六、建议下一阶段切片

1. 当前目标模式先以学生端完成为结束条件，继续基于固定 visual QA 截图精修 `09-agent-build-test.html`、`09-agent-test-score.html`、`10-delivery-document.html`、`10-delivery-acceptance.html` 和 `12-portfolio-report.html`。
2. 继续补齐学生端阶段四、阶段五和项目档案袋中尚未从 Artifact 恢复的状态字段，优先保证刷新、重新登录和跨页面回访不丢关键证据。
3. 教师端、Rubric 规则结构化编辑器、成员管理 API、管理端 License / 部署 / 运维授权审批与 enforcement 暂不作为当前目标模式后续切片。
