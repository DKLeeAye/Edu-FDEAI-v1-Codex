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
