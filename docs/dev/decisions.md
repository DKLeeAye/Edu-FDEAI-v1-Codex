# EduFDE 长期决策记录

> 本文件只保留仍然长期有效的产品和工程决策。第一阶段完整历史决策已归档到 `docs/dev/archive/phase-1-productization-archive/decisions.phase-1-original.md`。

## 一、产品与文档

### 产品定位

EduFDE 定位为面向高校的 **AI 智能体项目交付实训平台**。

### 文档权威性

v2.0 产品、架构和阶段设计文档是后续开发依据。v1.0 文档仅作为历史参考。

### 阶段归档策略

第一阶段工程治理文档归档到 `docs/dev/archive/phase-1-productization-archive/`。当前开发继续使用原有 `docs/dev` 体系，但默认上下文压缩为 `current-context.md`、`progress.md`、`decisions.md` 和相关 v2.0 文档。

## 二、架构边界

### 模块化单体起步

后端按模块化单体推进，早期不拆微服务。模块边界通过 `api`、`services`、`schemas`、`models`、`ai_gateway` 和 `ai_runtime` 维持。

### AI Gateway

所有模型调用必须经过 `backend/app/ai_gateway/`。阶段服务不得直接调用模型供应商 SDK 或 HTTP API。

### 课程与实验包版本绑定

课程必须绑定 `experiment_package_versions.id`。学生实验会话创建时继承课程绑定版本，保证课程历史可追溯。

### 统一 Artifact 模型

所有阶段正式产物、过程证据和 AI 反馈统一保存为 Artifact。Artifact 是项目档案袋、AI 评审、教师评分和学习画像的共同输入。

### 作用域校验

服务层查询必须强制执行租户 / 院校 / 课程 / 实验会话 / 阶段作用域。不得依赖前端传入的作用域作为安全边界。

### 教师最终判断权

AI 是教学助理、客户模拟器、反馈生成器和评审辅助，不是最终裁判。教师拥有最终教学判断权。

### 教师成绩 Artifact

教师正式评分不新增旁路成绩表作为第一片实现。成绩草稿保存为 `teacher_grade_draft` Artifact，正式发布保存为 `teacher_grade_publication` Artifact，并锚定到学生实验会话的 `stage_5`。课程成绩 JSON/CSV/XLSX 导出读取同一课程作用域下最新成绩发布 Artifact，其中 XLSX 由标准库生成 workbook，不新增表格库依赖。教师读取课程 Rubric 时，优先返回课程定制 Rubric，否则返回课程绑定实验包版本的默认 Rubric。教师发布课程级 Rubric 时，归档同课程、同阶段旧的 published 课程 Rubric，不修改实验包默认 Rubric。当前教师端最小 Rubric 编辑表单允许编辑阶段、名称、总分和规则 JSON；后续可在此基础上扩展 Rubric 规则结构化编辑器和教师端批改 UI。

## 三、当前临时边界

### 教师课程权限

已引入 `course_members` 作为教师读取课程内学生数据的正式权限边界第一片。创建课程时会自动写入创建教师的 active teacher membership；教师进度、阶段 Artifact 摘要、AI review 教师确认、成绩草稿、成绩发布和成绩导出按 active `course_members` 授权，不再只依赖 `courses.created_by_user_id`。后续可继续扩展助教、班级、学生选课和成员管理 API。

### 学习画像

当前学习画像基于实验会话、阶段记录和 Artifact 即时计算，不新增持久化画像表，不生成正式成绩结论。

### 项目档案袋

当前项目档案袋主要由前端聚合阶段产物展示，后续再补独立持久模型或导出能力。

### 黄灯债务

黄灯债务已有最小数据模型，阶段二已能生成部分风险记录。完整的学生确认、后续阶段回应、清除和教师豁免流程后续独立实现。

## 四、阶段规则

### 阶段状态推进

当前阶段完成后只解锁下一阶段。阶段五完成后，实验会话进入完成状态。

### 阶段一正式产品形态以新版设计为准

Open Design vNext 生效后，阶段一正式产品不再保留旧版“教学引导模式 / 项目实战模式”双入口分割。

阶段一正式路径调整为：

```text
导学方法页
→ AI 客户访谈工作区
→ 访谈记录整理与阶段提交
→ 阶段二输入证据链
```

旧六关卡教学引导能力如暂时保留，只作为遗留兼容或独立训练记录，不作为正式学生端主路径，不写入阶段二正式输入。阶段二正式输入来自新版阶段一提交页形成的访谈证据、需求理解、待确认问题和边界判断。

### 阶段二正式文档路径

阶段二正式学生端主路径为“需求文档 / 可行性报告 / 总体技术方案”的串行文档工作台。旧版单一方案定义接口保留用于兼容，但不作为产品化主体验。

### 阶段三正式产品形态以新版设计为准

阶段三是知识工程决策层。真实生产知识库构建发生在阶段四的 Dify 或 LangGraph 路径中。

Open Design vNext 生效后，阶段三正式学生端不再保留旧版“预置案例教学 / 五层知识实验室 / 项目知识工程决策 / 风险预判与决策文档”四入口作为正式首屏。

阶段三正式路径调整为：

```text
数据源识别
→ 数据质量评估
→ 知识工程决策
→ AI 评审与阶段四交接
```

P0 阶段不新增后端表。数据源识别、数据质量评估和风险边界最终说明作为过程证据保存为 `stage_3_lab_experiment_record`，并使用 `selected_parameters.vnext_step` 区分 `source_decision`、`quality_assessment` 和 `risk_boundary`。正式知识工程决策继续保存为 `stage_3_knowledge_decision`，AI 评审继续保存为 `stage_3_ai_review`，阶段三完成后只解锁阶段四。

### 阶段四 MVP 路径

阶段四优先采用 Dify 路径。真实 Dify API 深度集成后续独立推进，当前阶段四主要保存构建和测试证据。

Dify 入门记录不新增独立后端 Artifact 类型；P0 阶段作为 `stage_4_dify_implementation` 的一部分保存，并通过 `implementation_notes` 与 `onboarding_checklist` 恢复前端入门页状态。正式搭建页同样从 `stage_4_dify_implementation` 的 `knowledge_base_notes`、`tool_configuration_notes`、`implementation_notes`、`build_task_checklist` 和应用链接字段恢复，不新增阶段四构建草稿表。

### 阶段四自动化测试必须调用真实智能体 API

阶段四测试评分不再以纯前端模拟结果作为正式完成依据。学生需要提交可被后端调用的智能体 API 地址；发布页链接只能作为交付对象说明，不能替代自动化测试入口。

当前第一片支持 Dify `chat-messages` API 的阻塞调用模式，API Key 只在运行测试时临时提交，不明文持久化。后端测试服务负责执行测试集、保存 `stage_4_test_report` Artifact，并在报告中记录是否提供 key、测试对象、API 地址、逐条实际回答、维度分、总分、告警数和严重失败数。

阶段四完成门禁必须读取真实测试报告：总分不少于 80、严重失败数为 0，且测试覆盖标准追溯、资料不足 / 边界和多轮追问关键类别。测试失败、链接无效或外部调用失败应清晰反馈给学生，并优先保存为可追溯的失败报告，而不是静默回退到兜底模拟结果。

### 阶段五验收状态继续以 Artifact 为恢复来源

阶段五文档与验收确认不新增独立草稿或验收状态表。P0 阶段从 `stage_5_delivery_document`、`stage_5_operations_guide`、阶段四 Dify implementation / 测试报告和阶段三知识工程决策恢复 `10-delivery-document.html` 对应 6 章文档状态；从 `stage_5_acceptance_package`、交付文档、运维说明和阶段四 Artifact 恢复 `10-delivery-acceptance.html` 对应页面状态。验收包内容继续作为最终项目档案袋和 AI 交付审阅的正式证据来源。

### 管理端运营概览先聚合真实教学数据

第 8 轮管理部署页原型仍处于旧状态。为了避免继续使用静态占位，先提供 `GET /api/v1/admin/operations/overview` 作为管理端第一片后端能力。

该接口只允许管理员访问，并基于当前管理员所属租户 / 机构聚合现有真实数据：用户、课程、学生实验 Session、课程绑定实验包版本、Artifact、Rubric 和 AI Gateway 调用日志。

当前不把聚合结果伪装为正式 License 或真实部署实例模型。正式 License 权益、部署实例、运维授权窗口、限额和 SLA 模型仍需后续独立建表和切片实现。

### 管理端模型第一片采用独立运维域表

管理端第一片正式模型拆为三类：

```text
deployment_instances
license_entitlements
operations_access_grants
```

这些表只承载管理端运维域，不替代教学域现有的课程、Artifact、Rubric 或 AI Gateway 日志。运营概览读取正式运维域配置，同时继续从教学域和 AI Gateway 聚合实际使用量。

当前已先实现管理员更新 License 权益、切换部署实例状态和撤销运维授权三类最小操作。审批、授权创建、审计回放和限额 enforcement 后续独立切片实现；当前 demo seed 只创建一个本地演示实例、三类 License 权益和只读聚合范围授权，用于替代静态占位。

## 五、技术基线

### 前端

前端使用 Next.js App Router、TypeScript 和 Tailwind CSS。正式状态管理和数据请求分层可逐步引入 React Query / Zustand，但应按切片推进。

### 后端

后端使用 FastAPI、Python 3.11+、SQLAlchemy 2.x、Alembic、Pydantic v2、PostgreSQL、Redis、MinIO/S3 和 Celery。

### AI Provider

AI Gateway 支持 fake provider 和硅基流动 provider。确定性本地开发可使用 `AI_PROVIDER=fake`；真实能力验证使用硅基流动配置。

## 六、第二阶段优先级

短期优先级从“横向铺页面和接口”调整为“逐页打磨学生端真实教学体验，并同步补强后端规范、AI 行为、Artifact 结构和长期架构边界”。

优先顺序：

1. 阶段一新版访谈流程。
2. 阶段二至阶段五 AI 评审结构化和证据绑定。
3. 黄灯债务闭环。
4. 后端阶段运行通用能力。
5. 课程成员权限模型。
6. 正式教师后台、教师批改、正式评分和真实 Dify API。

## 七、前端驱动型升级策略

### Open Design vNext 原型定位

`docs/prototypes/open-design-vnext/` 中的 Open Design 静态原型作为第二阶段产品化升级的正式产品体验基准，不作为生产前端源码直接接入。

正式迁移采用“原型审计 → 页面 / 业务 / API / Artifact 映射 → 垂直切片迁移 → 浏览器验证”的方式推进。

升级后的平台应严格对齐 Open Design vNext 的页面结构、流程分割、视觉层级和交互意图。现有旧版正式学生端、旧联调页和旧阶段一双模式设计只作为遗留实现参考；凡与新版设计冲突的旧流程，应迁移、合并或退为兼容入口，而不是在正式产品中并列保留。

### 迁移边界

静态原型中的 HTML、CSS、JavaScript 和 `localStorage` 交互只用于理解体验目标。生产实现必须继续使用现有 Next.js App Router、TypeScript、Tailwind CSS、React 组件、FastAPI 后端、统一 Artifact、AI Gateway、Rubric 证据和权限作用域。

不得为了追求静态原型还原而绕开长期架构边界。

### 近期迁移顺序

第一轮优先：

1. 学生主路径壳层：登录、学生首页、实验详情、五阶段入口。
2. 阶段一新版访谈流程：导学方法页、AI 客户访谈、访谈线索、访谈整理和阶段二输入证据链。
3. 阶段二新版方案定义流程：导学页、六章方案工作台、章节级 AI 检查、报告预览和阶段三输入证据链。
4. 阶段三新版知识工程决策流程：数据源识别、数据质量评估、知识工程决策、AI 评审和阶段四输入证据链。
5. 阶段四新版智能体构建与测试流程。
6. 黄灯债务闭环。

教师端、管理部署、官网首页和真实 Dify API 继续作为后续独立切片推进。
