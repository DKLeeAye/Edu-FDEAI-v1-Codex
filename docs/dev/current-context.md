# EduFDE 当前开发上下文

> 本文件是第二阶段高密度上下文入口。每次新开发会话优先阅读本文件，而不是读取第一阶段完整历史流水。

## 一、当前项目状态

EduFDE 是面向高校的 AI 智能体项目交付实训平台，训练学生完成五阶段项目交付链路：

```text
需求访谈与问题发现
→ 方案定义与可行性判断
→ 知识工程决策
→ 智能体实现与测试
→ 交付验收与运维说明
```

第一阶段已经完成 MVP 闭环和正式学生端第一轮产品化。项目当前进入第二阶段：**产品化精修与真实能力迭代**。

第一阶段详细资料已归档：

- `docs/dev/archive/phase-1-productization-archive/`

第一阶段完整复盘可追溯：

- `docs/dev/archive/phase-1-productization-archive/project-stage-review-2026-05-28.phase-1.md`

## 二、当前已具备能力

前端：

- 正式学生端入口：登录、课程列表、实验项目工作区。
- 五阶段正式工作区：阶段一至阶段五均已接入现有后端能力。
- 学习画像展示和最终项目档案袋展示。
- 旧联调工作台 `/dev-workbench` 保留。

后端：

- 认证与当前用户上下文。
- 课程、实验会话和阶段状态。
- 统一 Artifact 服务。
- 阶段一至阶段五后端业务服务。
- AI Gateway，支持 fake provider 和硅基流动 provider。
- AI 调用日志。
- 基础教师进度视图。
- 教师 AI review 确认、成绩草稿、正式发布、课程成绩 JSON/CSV/XLSX 导出、课程 Rubric 读取、课程 Rubric 草稿/发布和最小 Rubric 编辑表单第一片。
- 基础学习画像。

数据地基：

- 租户、院校、用户。
- 实验包、实验包版本、阶段蓝图。
- 课程、实验会话、阶段记录。
- Artifact、Rubric、黄灯债务、AI 调用日志。
- 阶段一教学引导训练记录。

## 三、当前主线

第二阶段优先推进：

1. Open Design vNext 第二轮像素级复刻升级。
2. 逐页迁移 Open Design 静态原型到 Next.js 生产前端。
3. 在复刻过程中补齐真实后端数据、权限、Artifact、AI Gateway、Rubric 和验收能力。
4. 黄灯债务确认、回应和清除闭环。
5. 课程成员权限模型第一片已落地；后续扩展成员管理 API、助教和班级边界。
6. 教师批改与正式评分第一片已落地；后续扩展教师端批改 UI、Rubric 规则结构化编辑器和真实 Dify API。

当前目标模式范围已收敛：本轮以学生端 Open Design 复刻、五阶段 Artifact 恢复、项目档案袋和验收体验打磨完成为结束条件；教师端和 Rubric 规则结构化编辑器暂不继续处理。

当前最推荐的下一步任务：

```text
Open Design vNext 第二轮像素级复刻升级：
以 `http://127.0.0.1:4175/index.html#login-entry` 为第一入口，按 Open Design 静态原型逐页一比一复刻到 Next.js 生产前端，并在复刻过程中补齐真实后端数据、权限、Artifact、AI Gateway、Rubric 和验收能力。
当前执行范围先收口到学生端：阶段一至阶段五、项目档案袋、Artifact 恢复和验收体验；教师端与 Rubric 规则结构化编辑器暂缓。
```

前端驱动型产品化迭代的新设计输入：

- `docs/prototypes/open-design-vnext/`：用于接收 Open Design 导出的新版静态前端原型。
- 该目录内文件是本轮升级后的正式产品体验基准，不是生产前端源码。
- 后续应先做原型审计和页面 / 业务 / API / Artifact 映射，再按垂直切片迁移到现有 Next.js 前端和 FastAPI 后端。
- 初步审计文档：`docs/dev/open-design-vnext-prototype-audit-2026-05-31.md`。
- 当前第二轮复刻顺序以 `docs/superpowers/specs/2026-06-01-open-design-pixel-replication-v2-design.md` 为准：第 0 轮统一入口与登录页、第 1 轮学生入口与项目选择、第 2 轮阶段一访谈、第 3 轮阶段二方案定义、第 4 轮阶段三知识工程与 RAG、第 5 轮阶段四智能体实现与测试、第 6 轮阶段五交付与档案袋、第 7 轮 AI 评审与教师视图、第 8 轮课程配置 / 实验包库 / 管理部署。
- 与 Open Design vNext 冲突的旧产品流程不在正式产品中并列保留；旧阶段一“教学引导模式 / 项目实战模式”双入口应退为遗留兼容或迁移辅助。

## 四、关键架构原则

- 所有 AI 调用必须经过 AI Gateway。
- 课程必须绑定实验包版本。
- 阶段输出必须保存为 Artifact。
- AI 评审必须绑定 Rubric 和证据。
- 教师拥有最终教学判断权。
- 服务层查询必须强制执行租户 / 院校 / 课程作用域。
- 教学引导记录不得污染正式项目交付证据链。

## 五、当前临时边界

- 教师权限：教师进度、阶段 Artifact、AI review 确认、成绩草稿、成绩发布和成绩导出已按 active `course_members` 授权；成员管理 API、助教和班级边界后续扩展。
- 学习画像：规则即时计算，不持久化。
- 项目档案袋：前端聚合 Artifact 展示，已补齐能力报告弹窗、导出归档包、复制摘要和同步动作 toast 第一片；阶段四评分按最新 `stage_4_test_report` 恢复，并可从 `total_score` 或测试报告 `coverage_notes` 中读取；阶段五验收同步会排除 `draft` 和“退回修改”验收包；已有 `stage_5_ai_delivery_review` 时能力报告和导出状态可回访恢复；当交付文档或阶段四 implementation 暂缺时，总览 Dify 应用卡片可从 `stage_5_acceptance_package.acceptance_scope` 恢复交付对象和发布链接；后端未建独立档案袋表。
- 阶段一访谈实验室 / 整理提交：无真实 `stage_1_interview_turn` Artifact 时使用 Open Design 兜底对话和 AI 实时反馈，已补齐参考图第二轮学生追问；整理提交页在完全没有阶段一正式 Artifact 时使用 Open Design 兜底草稿填充访谈证据、需求理解和阶段二输入，真实访谈、拜访整理、问题总结或评估 Artifact 仍优先按 Artifact 渲染。
- 阶段二方案工作台：六章工作台可从真实 section draft / submission Artifact 恢复；当 section Artifact 缺失或字段为空时，可从正式 `stage_2_requirements_document`、`stage_2_feasibility_report` 和 `stage_2_technical_solution` 按字段兜底回填，避免刷新或 visual QA seed 中只有正式文档时出现大面积空白输入区。
- 固定视觉 QA：第 1 轮学生首页 / 实验详情 / 项目总览使用主链路账号 `lin@edufde.demo`；第 2 轮阶段一导学 / 访谈实验室 / 整理提交使用阶段一专用账号 `wang@edufde.demo`，避免第 1 轮截图被阶段一未访谈状态污染；最新固定矩阵为 62 张截图。
- 阶段三 RAG 01-10：已补齐 `08-knowledge-decision.html`、`08-rag-data-quality.html`、`08-rag-cleaning.html`、`08-rag-structure.html`、`08-rag-chunking.html`、`08-rag-vector-storage.html`、`08-rag-retrieval.html`、`08-rag-answer-citation.html`、`08-rag-recall-test.html` 和 `08-rag-risk-boundary.html` 对应的交互反馈第一片；数据源识别、数据质量评估和风险边界最终说明真实保存走阶段三过程记录 Artifact；数据源识别、数据质量评估和风险边界页可从最新 `stage_3_lab_experiment_record` 恢复已选判断、检查项、已查看样本、边界字段和保存状态；风险边界页的边界声明预览现在遵守 `hidden` 属性，默认隐藏，点击“预览边界声明”后再展开；其余 RAG 学习页当前按 Open Design 学习页本地交互承载。
- 阶段四实现导学 / Dify 入门 / 正式搭建 / 测试评分：已补齐 `09-agent-guide.html` 对应的导学确认完成提示和进入 Dify 入门门禁第一片；已补齐 `09-dify-onboarding.html` 对应的填入演示记录、保存门禁提示、入门记录保存反馈和进入正式构建门禁第一片，且已保存的 `stage_4_dify_implementation` Artifact 可恢复 Dify 入门页 8 步检查、保存态和关键回填字段；已补齐 `09-agent-build-test.html` 对应的填入演示记录、保存门禁提示和搭建记录保存反馈第一片，且可从 implementation Artifact 恢复 12 步构建检查、保存态和正式搭建回填字段；已补齐 `09-agent-test-score.html` 对应的测试对象缺失提示、运行成功提示、保存门禁提示和测试评分保存反馈第一片，且可从 `stage_4_test_report.coverage_notes` 恢复测试对象、发布链接、访问说明、总分、维度分、告警项和严重失败数；旧测试报告的 `test_cases` 若缺少详情字段，会按内置平台测试模板兜底展示测试问题、期望行为、智能体回答、命中证据和问题定位。
- 阶段五交付文档 / 验收确认：已补齐 `10-delivery-document.html` 对应的文档预览弹层、章节 AI 评审抽屉和 pass-only 章节保存门禁第一片，且可从 `stage_5_delivery_document`、`stage_5_operations_guide`、阶段四和阶段三 Artifact 恢复 6 章草稿与章节保存状态；交付文档页 late 只读/回访态已补齐 `.delivery-doc-page` 专属冷灰蓝表单覆盖，避免事实依据区和撰写区控件偏红/偏粉；已补齐 `10-delivery-acceptance.html` 对应的复制演示脚本 toast、保存门禁提示、验收保存反馈和顶部导航原型四项第一片，且可从 `stage_5_acceptance_package`、交付文档、运维说明和阶段四 Artifact 恢复验收对象、交付包、模拟验收、验收结论和归档检查状态；legacy 验收包缺少新版 `handover_checklist` 时，交付包 7 项清单可从交付文档、运维说明、阶段四实现记录和阶段四测试报告回填；当上游阶段四或交付文档 Artifact 缺失时，验收对象、知识库和发布链接可从 `acceptance_scope` 或 `stage_4_test_report.coverage_notes` 回访恢复；最终归档门禁只允许“通过验收”和“有条件通过”，“退回修改”不再误判为可归档。
- 黄灯债务：有数据表和部分生成逻辑，闭环体验未完成。
- Dify：当前保存构建和测试证据，未真实调用 Dify API。
- 管理端：已新增运营概览 API，基于真实租户、机构、用户、课程、Session、Artifact、Rubric 和 AI Gateway 调用日志聚合部署页指标；正式 `deployment_instances`、`license_entitlements` 和 `operations_access_grants` 第一片已建模并接入 seed 与概览读取；License 限额更新、部署状态更新和运维授权撤销 API 第一片已完成，审批、创建、审计回放和限额 enforcement 仍待后续切片。
- 文件与知识库：MinIO、Redis、Celery 等依赖已准备，文件解析和向量库未进入主线。

## 六、重要代码位置

前端：

- `frontend/app/page.tsx`：正式学生端主编排。
- `frontend/app/dev-workbench/page.tsx`：旧联调工作台。
- `frontend/src/components/student-product/`：正式学生端组件。
- `frontend/src/components/student-workspace/`：旧联调工作台组件。
- `frontend/src/lib/api.ts`：当前前端请求入口。

后端：

- `backend/app/main.py`：应用入口。
- `backend/app/api/`：接口层。
- `backend/app/services/`：业务服务层。
- `backend/app/api/admin_operations.py`、`backend/app/services/admin_operations.py`、`backend/app/schemas/admin_operations.py`：第 8 轮管理端运营概览第一片。
- `backend/app/models/admin.py`：部署实例、License 权益和运维授权第一片模型。
- `backend/app/models/`：数据库模型。
- `backend/app/schemas/`：请求和响应结构。
- `backend/app/ai_gateway/`：AI 网关。
- `backend/app/ai_runtime/`：阶段 AI 编排。
- `backend/alembic/versions/`：数据库迁移。
- `backend/tests/`：后端测试。

## 七、常用验证

后端：

```bash
python3 -m pytest backend/tests -q
```

前端：

```bash
cd frontend
npm run lint
npm run typecheck
npm run test:stage-one
npm run test:stage-two
npm run test:stage-three
npm run test:stage-four
npm run test:stage-five
```

涉及 UI 时，应启动本地服务并用浏览器验证核心流程。

## 八、历史追溯规则

默认不要读取第一阶段完整历史流水。

只有在以下情况读取归档：

- 需要追溯某个阶段能力为什么这样设计。
- 需要核对旧验证记录。
- 需要恢复第一阶段某个原始文档内容。
- 需要查阅 student2 完整走查材料或截图。

归档路径：

- `docs/dev/archive/phase-1-productization-archive/`
