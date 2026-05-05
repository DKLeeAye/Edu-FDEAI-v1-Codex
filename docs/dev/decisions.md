# EduFDE 开发决策记录

> 长期有效的产品和工程决策写在这里。条目保持简短，并标注日期。

## 2026-04-29

### 产品定位

EduFDE 定位为面向高校的 **AI 智能体项目交付实训平台**。

### 文档权威性

v2.0 文档是后续开发依据。v1.0 文档仅作为历史参考。

### 交付形态

终局平台支持 SaaS、专有租户、私有化部署。MVP 只实现共享 SaaS 风格的基础形态，但保留长期边界。

### MVP 架构地基

MVP 必须保留：

- 实验包版本绑定
- 统一 Artifact 模型
- AI Gateway 边界
- 租户 / 院校 / 课程作用域
- AI 调用日志
- 黄灯债务最小模型
- Rubric 最小模型

### AI 原则

AI 是教学助理和反馈生成器，不是最终裁判。教师拥有最终教学判断权。

### 阶段三定位

阶段三是知识工程决策层。真实生产知识库构建发生在阶段四的 Dify 或 LangGraph 路径中。

### MVP 阶段四路径

MVP 优先实现 Dify 路径。LangGraph 代码路径后置。

### 流式输出选择

MVP 阶段 AI 流式输出优先使用 SSE。WebSocket 后置到通知或协作场景。

### 脚手架边界

本地开发采用根目录分离的 `frontend/` 与 `backend/`，后端按模块化单体起步。AI Gateway 在 MVP 早期作为后端内部模块预留边界，但后续所有模型调用仍必须经过该边界。

### 本地依赖服务

`docker-compose.yml` 在脚手架阶段只承载 PostgreSQL、Redis、MinIO 和 MinIO bucket 初始化，不把前后端开发服务放进 Compose。前后端先用本机开发命令启动，降低调试复杂度。

### 前端版本基线

前端使用 Next.js 16.2.x。v2.0 文档要求 Next.js 14+，本轮因 Next 14 依赖审计存在生产高危公告，选择升级到 Next 16 并保留 App Router。

### Python 版本基线

后端要求 Python 3.11+。本机默认 `python3` 为 3.9.6，不作为项目运行入口；本轮使用 Python 3.12 创建 `.venv`。

## 2026-04-30

### 数据库作用域模型

MVP 直接引入 `tenants` 与 `institutions` 双层模型。`tenant_id` 表示长期交付 / 租户 / 数据隔离边界，`institution_id` 表示院校教学组织边界；MVP 可以只初始化一租户一院校，但不把二者合并。

### 课程与实验包版本绑定

`courses.package_version_id` 必须非空绑定 `experiment_package_versions.id`。`experiment_sessions` 同步保留 `package_version_id`，用于后续历史追溯，但创建时应来自课程绑定版本。

### 运行数据作用域字段

教学运行与证据审计数据显式保留 `tenant_id`、`institution_id` 和必要的 `course_id`：包括 `experiment_sessions`、`stage_records`、`artifacts`、`yellow_flags`、`ai_call_logs`。服务层过滤仍需后续实现，本轮只建立数据库边界。

### 内容资产作用域

`experiment_packages`、`experiment_package_versions`、`rubrics` 保留可空的 `tenant_id` / `institution_id`，支持平台标准包、院校定制包和课程覆盖 Rubric。平台标准内容可以不绑定具体院校。

### 数据库枚举值

SQLAlchemy 枚举使用业务文档中的小写值入库，例如 `draft`、`published`、`completed`，避免数据库状态值与文档状态值出现大小写偏差。

### MVP 认证边界

MVP 认证实现仅覆盖邮箱密码登录、PBKDF2 密码哈希、JWT access token 和当前用户上下文。不实现注册、邮箱验证、刷新 token、完整 RBAC/ABAC 或前端登录页；这些能力后续按模块补齐。

### 当前用户作用域校验

JWT claim 携带 `user_id`、`tenant_id`、`institution_id` 和 `role`。后端 dependency 解码 token 后，必须用这些字段共同查询 active user，不能只按 `user_id` 取用户，也不能依赖前端传入 tenant/institution 作为安全边界。

### MVP 标准实验包作用域

内置制造业质检 AI 智能体实验包作为平台标准内容初始化，`experiment_packages` 与 `experiment_package_versions` 的 `tenant_id` / `institution_id` 可为空。课程运行数据仍必须写入教师当前用户的 `tenant_id` / `institution_id`。

### Stage Blueprint 最小模型

MVP 引入 `stage_blueprints` 表绑定 `experiment_package_versions`，用于锁定实验包版本下的五阶段结构。学生 session 创建时从课程绑定版本读取 stage blueprints，不从前端接收阶段定义。

### Session 初始化规则

学生只能基于当前 tenant / institution 可见课程创建自己的 `experiment_session`。`experiment_sessions.package_version_id` 必须继承 `courses.package_version_id`；创建时初始化 5 条 `stage_records`，阶段一为 `not_started`，后续阶段为 `locked`。

### Artifact 作用域持久化

Artifact 是五阶段共享基础设施，不属于单一阶段私有结构。MVP 创建 Artifact 时必须显式写入 `tenant_id`、`institution_id`、`course_id`、`session_id`、`stage_record_id`、`stage_key` 和提交用户；读取和列表查询必须在 service 层校验 tenant / institution / course / session / stage 作用域。

### Artifact MVP 课程读取边界

学生只能访问自己 `experiment_session` 下的 Artifact。教师读取 Artifact 在未引入 `course_members` 前暂以 `courses.created_by_user_id` 限定为自己创建的课程；后续课程成员、助教和教研负责人权限必须替换为正式课程权限模型。

### AI Gateway MVP Provider 边界

MVP 当前只实现 deterministic fake provider，不接真实模型供应商。包括 fake provider 在内的所有 AI 模拟调用也必须经过 `backend/app/ai_gateway/` 的统一入口，后续真实 provider 只能实现 provider 协议接入，阶段服务不得直接调用供应商 SDK。

### AI 调用日志最小策略

AI Gateway 每次调用同步写入 `ai_call_logs`，至少记录 scope、用户、usage、provider/model、请求摘要、响应摘要、状态、错误信息、耗时和 token 占位字段。当前日志摘要写入 `request_metadata_json` / `response_metadata_json`；后续真实模型接入时再补充 Prompt 版本、真实 token 和成本统计。

### AI Gateway 调用日志追踪 ID

AI Gateway 成功响应返回 `call_log_id`，阶段服务可将该 ID 写入 Artifact 内容，实现阶段产物到 `ai_call_logs` 的最小可追踪关联。该字段不替代后续更正式的证据 / 审计关联模型。

### 阶段一 MVP 启动状态

当前 `StageStatus` 没有字面值 `in_progress`。阶段一 MVP 后端将首次访谈或总结保存后的阶段记录推进到既有等价状态 `in_practice`，不新增迁移、不自动完成阶段一，也不解锁阶段二。

### 阶段一接口阶段边界

阶段一后端接口虽然沿用 `/experiment-sessions/{session_id}/stages/{stage_key}/...` 路径形态，但服务层只接受 `stage_key = stage_1`，并继续基于当前用户上下文校验 tenant / institution / course / session / stage 作用域。

### 演示 seed 课程

演示 seed 脚本会创建一门默认课程 `MFG-QA-DEMO`，绑定制造业质检 AI 智能体实验包 v1，并归属于演示教师。该课程用于学生端最小联调页直接创建 session；正式课程管理和课程成员模型仍按后续模块实现。

### MVP 前端认证存储

阶段一最小联调页将 access token 保存到浏览器 `localStorage`，仅用于本地 MVP 演示和手工联调。生产级会话安全、刷新 token、HttpOnly Cookie 或更完整的前端认证状态管理后续独立设计。

## 2026-05-04

### 阶段完成最小状态流转

MVP 阶段状态推进采用“当前阶段完成后只解锁下一阶段”的最小规则。阶段一完成要求存在 `stage_1_problem_summary` Artifact；完成后 `stage_1` 置为 `completed`，仅将 `stage_2` 从 `locked` 置为 `not_started`。阶段二完成要求存在 `stage_2_solution_definition` 和 `stage_2_ai_review` Artifact；完成后 `stage_2` 置为 `completed`，仅将 `stage_3` 从 `locked` 置为 `not_started`。

### 阶段二 MVP Artifact 类型

阶段二最小后端链路使用 `stage_2_solution_definition` 保存学生结构化方案定义，使用 `stage_2_ai_review` 保存 AI 可行性评审结果。二者继续复用统一 Artifact 模型，并显式绑定 tenant / institution / course / session / stage_record / stage_key。

### 阶段二 AI 评审边界

阶段二 AI 可行性评审必须读取当前阶段二方案 Artifact，并通过 AI Gateway 调用 fake provider，usage 使用 `stage_2_feasibility_review`。评审 Artifact 写入 `ai_call_log_id` 和阶段二 Rubric 快照；MVP 当前不实现正式评分引擎，也不把 AI 评审作为教师最终判断。

### 阶段三 MVP Artifact 类型

阶段三最小后端链路使用 `stage_3_knowledge_decision` 保存学生知识工程决策，使用 `stage_3_ai_review` 保存 AI 知识工程决策评审结果。二者继续复用统一 Artifact 模型，并显式绑定 tenant / institution / course / session / stage_record / stage_key。

### 阶段三 AI 评审边界

阶段三 AI 知识工程决策评审必须读取当前阶段三知识工程决策 Artifact，并消费当前 session 下阶段二 `stage_2_solution_definition` Artifact 作为评审上下文。调用必须经过 AI Gateway fake provider，usage 使用 `stage_3_knowledge_decision_review`；评审 Artifact 写入 `ai_call_log_id` 和阶段三 Rubric 快照，MVP 当前不实现正式评分引擎。

### 阶段三完成最小状态流转

阶段三操作要求 `stage_2` 已 `completed`。阶段三完成要求存在 `stage_3_knowledge_decision` 和 `stage_3_ai_review` Artifact；完成后 `stage_3` 置为 `completed`，仅将 `stage_4` 从 `locked` 置为 `not_started`，不自动完成或解锁后续阶段。

### 学生端联调页组件边界

MVP 学生端联调页保持 `frontend/app/page.tsx` 作为页面级编排层，负责认证、session 初始化、Artifact 刷新和阶段 API 调用。阶段状态、Artifact 列表、阶段一 / 二 / 三联调表单、评审摘要和通用表单控件拆到 `frontend/src/components/student-workspace/`，不在联调页阶段引入复杂状态管理或正式产品 UI 抽象。

### 阶段四 MVP Artifact 类型

阶段四 Dify 路径最小后端链路使用 `stage_4_dify_implementation` 保存学生 Dify 实现记录，使用 `stage_4_test_report` 保存智能体测试记录，使用 `stage_4_ai_test_review` 保存 AI 测试反馈。三者继续复用统一 Artifact 模型，并显式绑定 tenant / institution / course / session / stage_record / stage_key。

### 阶段四 AI 测试反馈边界

阶段四 AI 测试反馈必须读取当前阶段四 Dify 实现记录和测试报告，并消费阶段三 `stage_3_knowledge_decision` Artifact 作为上下文。调用必须经过 AI Gateway fake provider，usage 使用 `stage_4_agent_test_review`；反馈 Artifact 写入 `ai_call_log_id` 和阶段四 Rubric 快照，MVP 当前不实现正式评分引擎、教师批改或真实 Dify API 深度集成。

### 阶段四完成最小状态流转

阶段四操作要求 `stage_3` 已 `completed`。阶段四完成要求存在 `stage_4_dify_implementation`、`stage_4_test_report` 和 `stage_4_ai_test_review` Artifact；完成后 `stage_4` 置为 `completed`，仅将 `stage_5` 从 `locked` 置为 `not_started`，不自动完成阶段五。

### 阶段五 MVP Artifact 类型

阶段五最小后端链路使用 `stage_5_delivery_document` 保存交付说明，使用 `stage_5_acceptance_package` 保存验收材料，使用 `stage_5_operations_guide` 保存运维说明，使用 `stage_5_ai_delivery_review` 保存 AI 交付审阅结果。四者继续复用统一 Artifact 模型，并显式绑定 tenant / institution / course / session / stage_record / stage_key。

### 阶段五 AI 交付审阅边界

阶段五 AI 交付审阅必须读取当前阶段五交付说明、验收材料和运维说明，并消费阶段四 `stage_4_dify_implementation`、`stage_4_test_report`、`stage_4_ai_test_review` Artifact 作为交付上下文。调用必须经过 AI Gateway fake provider，usage 使用 `stage_5_delivery_review`；审阅 Artifact 写入 `ai_call_log_id` 和阶段五 Rubric 快照，MVP 当前不实现正式评分引擎、教师最终验收或真实模型。

### 阶段五完成最小状态流转

阶段五操作要求 `stage_4` 已 `completed`。阶段五完成要求存在 `stage_5_delivery_document`、`stage_5_acceptance_package`、`stage_5_operations_guide` 和 `stage_5_ai_delivery_review` Artifact；完成后 `stage_5` 置为 `completed`，并将当前 `experiment_session` 置为 `completed`。学习画像、教师验收、证书和成绩后续独立实现。

### MVP 教师进度视图权限边界

MVP 基础教师进度视图只做只读进度与 Artifact 摘要，不做教师批改、Rubric 打分或学习画像。教师进度 API 暂以 `courses.created_by_user_id == current_user.id` 判断课程内读取权限，并继续强制校验 `tenant_id`、`institution_id`、course、session 和 stage 作用域；后续引入 `course_members` / 课程权限模型后必须替换该临时边界。

### MVP 学习画像最小模型

MVP 基础学习画像先做只读即时计算，不新增 `learning_profiles` 持久表，不调用真实模型，也不生成 Rubric 分数或教师批改结论。画像输入限定为现有 `experiment_sessions`、`stage_records` 和 `artifacts`，输出阶段状态、Artifact / AI 反馈计数、完成比例，以及规则生成的 strengths / risks / next_suggestions。

### MVP 学习画像权限边界

学习画像 API 与教师进度视图保持同一临时边界：学生只能读取自己的 session；教师只能读取自己创建课程下的学生 session；服务层继续强制校验 `tenant_id`、`institution_id`、course、session 和 user 作用域。后续引入 `course_members` / 课程权限模型后必须替换 `courses.created_by_user_id` 判断。

### MVP 通用 Session 查询权限边界

通用 `/api/v1/experiment-sessions` list/get API 与教师进度视图保持同一临时边界：学生只能读取自己的 session；教师只能读取自己创建课程下的学生 session；admin 可在当前 tenant / institution 下读取。后续引入 `course_members` 后必须统一替换教师 `courses.created_by_user_id` 判断。

### Demo Seed 登录合同

`backend/scripts/init_demo_data.py` 重复执行时必须恢复 demo 用户的默认 role、active 状态和密码，确保本地库被手工修改后仍可用固定账号完成演示。该行为仅面向本地 MVP demo seed，不代表生产用户管理策略。

## 2026-05-05

### 正式学生端 UI 原型收口

正式学生端 UI 采用“登录 → 实验课程列表 → 实验项目主页 → 五阶段工作区 → 最终项目档案袋 / 学习画像”的信息架构。进入五阶段实验页后，全局侧栏默认收起为窄栏，页面主体采用阶段导航、中央工作区和右侧上下文栏的布局，避免联调页式表单堆叠。

### 用户可见术语中文化

正式产品 UI 不直接暴露 Artifact、stage_1、stage_1_problem_summary、fake provider、AI log 等开发和联调命名。前端需要建立内部字段到中文业务文案的映射，例如 Artifact 显示为“阶段产物 / 项目证据 / 交付材料”，stage 状态显示为“未解锁 / 待开始 / 进行中 / 已完成”。

### 正式 UI 重构边界

正式学生端 UI 重构应优先复用已验证的 MVP API，不在同一轮引入真实模型、真实 Dify API 深度集成、教师批改、正式评分、course_members 权限模型或完整管理端。旧联调页在正式学生端闭环稳定后再清理或下线。

### 正式学生端入口与旧工作台保留

根路由 `/` 开始承载正式学生端产品 UI；旧联调工作台保留到 `/dev-workbench`，继续作为阶段一至五完整操作、教师进度视图和学习画像的验证入口。正式 UI 闭环稳定前不删除旧工作台能力。

### 前端正式术语映射层

正式学生端 UI 通过前端映射层把内部阶段键、阶段状态和 Artifact 类型转换为中文业务文案。API client、后端字段和测试仍可使用内部命名；用户可见正式页面不得直接显示 `stage_x`、Artifact、AI Log、JSON、fake provider 等联调术语。

### 正式阶段页面组件边界

正式学生端阶段页面迁移采用 `frontend/src/components/student-product/` 承载产品化交互，`frontend/app/page.tsx` 保持认证、session、阶段状态和 API 调用编排层。旧 `student-workspace` 组件继续服务 `/dev-workbench` 联调和回退，不作为正式学生端页面直接复用。
