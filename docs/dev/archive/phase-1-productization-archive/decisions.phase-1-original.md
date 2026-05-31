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

### 阶段三过程 Artifact 边界

阶段三过程学习证据保存为 `stage_3_case_study_record` 和 `stage_3_lab_experiment_record` Artifact，用于记录预置案例学习和五层知识实验室观察。二者可以推进阶段三进入 `in_practice`，但不替代正式 `stage_3_knowledge_decision` 或 `stage_3_ai_review`，也不作为阶段三完成门槛。

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

## 2026-05-06

### MVP 真实模型 Provider 配置策略

AI Gateway 默认 provider 切换为 `siliconflow`，本地确定性开发或测试可显式配置 `AI_PROVIDER=fake`。硅基流动接入采用 OpenAI-compatible chat completions 请求格式，运行配置限定为 `SILICONFLOW_API_KEY`、`SILICONFLOW_BASE_URL`、`SILICONFLOW_MODEL` 和 `AI_TIMEOUT_SECONDS`；配置缺失必须通过 AI Gateway 返回清晰错误并写入失败 `ai_call_logs`。

### 阶段一 AI 客户 Prompt 边界

阶段一真实模型调用只通过 `request_payload.system_prompt` 向 AI Gateway 传递客户角色提示词。阶段服务仍不得直接接触供应商 SDK 或 HTTP API；系统提示词必须让模型保持制造业质检项目客户身份，不扮演导师、评审或解题助手。

## 2026-05-07

### 产品化精修优先级

正式学生端第一轮页面迁移和硅基流动真实 Provider 接入后，项目进入产品化精修与真实能力迭代阶段。短期优先级从“继续横向铺教师后台 UI”调整为“逐页打磨学生端真实教学体验，并同步补强后端规范和 AI 行为”。教师后台、course_members、黄灯债务、真实 Dify API、教师批改和正式评分仍保留为后续独立切片。

### 精修切片边界

每个精修切片应选择一个清晰页面或阶段，不做无边界重构。前端应减少同质化表单堆叠，围绕该阶段真实项目动作设计交互；后端应同步检查 Artifact 内容结构、service 校验、权限作用域、AI Gateway 调用、Prompt 版本、错误记录和测试覆盖。旧 `/dev-workbench` 继续作为低层联调和回退入口保留。

### 阶段四精修边界

阶段四第一轮精修优先做 Dify 路径的产品体验和轻量结构增强，不做真实 Dify API 深度集成、平台内工作流画布、自研自动化测试执行器或 LangGraph 代码路径。正式学生端采用“阶段四主页 / 构建与测试核心工作台”分离模式，核心工作台用任务轨组织 Dify 新手村、知识库、Prompt 与流程、应用提交、测试验收和阶段收口。

### 阶段四 Artifact 兼容增强

阶段四继续沿用既有 `stage_4_dify_implementation`、`stage_4_test_report` 和 `stage_4_ai_test_review` 三类 Artifact，不新增数据库表。构建记录可附加概念确认、构建 checklist、阶段三遵循说明和应用访问检查；测试报告可附加测试类别、证据说明和覆盖说明。AI 测试反馈可输出测试类别覆盖统计和质量门禁摘要，供阶段五交付说明继续消费。

## 2026-05-12

### 阶段一教学引导对话模型

阶段一教学引导模式虽然有六个训练关卡，但对学生呈现为一场连续客户访谈。关卡只表示当前训练目标和达成状态，不再把对话按关卡切断或由学生手动点击推进。每轮提问后由 LangGraph 的反馈节点生成 `can_continue` 等反馈字段，后端据此自动推进 `active_level`；前端左侧六关卡进度为只读状态。

### 教学引导客户信息展示边界

学生端教学引导页只展示客户姓名、职位和职责等可见身份信息，不展示实验包中的项目顾虑、隐藏动机、信息释放规则或拒答边界。这些字段只用于 AI 客户行为和反馈评估，不作为学生进入访谈前的明示线索。

### 阶段一客户智能体行为守卫

阶段一客户智能体必须保持“被访谈客户”身份，不得把访谈责任反问给学生。客户回复 prompt 必须明确禁止“你们有什么痛点 / 你们具体怎么考虑 / 你们准备做什么方案”等顾问式反问。LangGraph 阶段一客户 graph 增加学生问题意图识别、信息释放决策和客户回复守卫节点；客户回复越界时通过 AI Gateway 自动重试一次，重试仍越界时使用安全兜底回复。教学引导和项目实战均沿用该边界，区别只在训练反馈节点和正式 Artifact 写入。

### 教学引导完成后的收尾对话

教学引导六关卡全部达成后，attempt 可保持 `completed`，但仍允许学生在最后一关 `summary_alignment` 追加收尾消息。该消息继续保存为教学练习 turn，不写入正式 Artifact，不作为阶段二输入。后端仍禁止 completed attempt 回到前置关卡追加消息。总结确认关卡的客户回复应以确认下一步材料、优先级和收尾为主，避免提出会强制学生继续回答的新问题。

### 阶段一精修主线切换

阶段一教学引导模式第一轮功能体验阶段性收口后，下一阶段精修主线切换为项目实战模式。教学引导模式继续作为训练能力和回归基线保留，但不再扩展范围；除阻塞性缺陷外，后续阶段一工作应优先围绕正式客户拜访、拜访间整理、问题发现总结、综合评估和阶段二输入证据链展开。项目实战模式的正式产物必须继续写入 Artifact，并作为阶段二唯一输入来源；教学引导训练记录不得被阶段二读取为正式证据。

### 阶段一项目实战正式证据链

阶段一项目实战模式的正式证据链由 `stage_1_interview_turn`、`stage_1_visit_notes`、`stage_1_problem_summary` 和 `stage_1_evaluation` 组成。完成阶段一并解锁阶段二前必须至少存在正式访谈轮次、拜访间整理、问题总结和综合评估。教学引导训练记录继续保持隔离，不得作为阶段二输入或阶段一完成依据。

### 阶段一项目实战综合评估

阶段一项目实战综合评估由 LangGraph 编排，并通过 AI Gateway 生成，usage 使用 `stage_1_practice_evaluation`。评估输入只读取项目实战正式 Artifact，不读取 `stage_one_guided_attempts` / `stage_one_guided_turns`。评估结果保存为正式 Artifact，用于学生完成阶段一前的自检和阶段二读取阶段一证据链时的上下文。

## 2026-05-19

### 阶段二正式文档链路

阶段二产品化精修采用三份正式文档串行链路：`stage_2_requirements_document`、`stage_2_feasibility_report`、`stage_2_technical_solution`。每份文档保存为独立 Artifact，文档级 AI 评审保存为 `stage_2_document_review`。旧 `stage_2_solution_definition` / `stage_2_ai_review` 链路继续保留给 `/dev-workbench` 和既有回归，但正式学生端优先使用新链路。

### 阶段二黄灯债务

阶段二文档级评审会把可继续但需后续回应的问题写入 `stage_2_document_review.content_json.yellow_flags`，并同步落库到 `yellow_flags`。数据差距默认影响阶段三，技术 / 构建风险默认影响阶段四；红灯问题仍保留在评审 Artifact 中并阻塞对应文档继续推进。

### 阶段二到阶段三输入

阶段三正式页面和后端 AI 评审优先读取 `stage_2_technical_solution` 作为阶段二输入；如果不存在新正式文档，则回退读取旧 `stage_2_solution_definition`。这样保证正式链路向三文档模型迁移，同时不破坏既有 MVP 联调和测试数据。

### 阶段二小节级教学引导

阶段二正式学生端不再把三份文档作为学生直接填写的起点。正式流程改为小节级学习闭环：学生先阅读教学目标和合格标准，选择阶段一证据，回答关键判断问题，保存 `stage_2_section_draft`，请求 `stage_2_section_review`，在 AI 追问无红灯后提交 `stage_2_section_submission`。三份正式文档仍作为阶段二最终产物，但由已提交小节汇总生成，再进入文档级 AI 评审和红黄灯门禁。

### 阶段二兼容边界

`stage_2_requirements_document`、`stage_2_feasibility_report`、`stage_2_technical_solution` 和 `stage_2_document_review` 继续作为阶段二正式输出物；新增小节级 Artifact 只记录教学过程和过程版本。旧 `stage_2_solution_definition` / `stage_2_ai_review` 以及三文档直接保存 API 暂时保留，用于 `/dev-workbench`、历史数据和回归测试兼容，但正式学生端优先走小节教学流。

### 阶段二主页与核心操作区分离

阶段二正式学生端采用“主页入口 + 专注核心操作区”布局。主页继续放在五阶段交付主线和右侧阶段上下文栏内，只展示阶段说明、文档进度和进入核心操作区的单一入口；核心操作区进入后隐藏五阶段主线和通用上下文栏，把页面宽度优先分配给三份文档串行、文档式章节撰写和 AI 导师 / 门禁。该布局用于降低学生直接面对三份文档的认知负荷，同时避免核心输入区被全局三栏挤压。

### 阶段三主页与专注入口

阶段三产品化精修采用“预置案例教学 → 五层知识体系学习 → 可视化实验 → 决策填写 → 风险预判 → 提交决策文档”的教学链路，但正式学生端主页先收敛为四个入口：预置案例教学、五层知识实验室、项目知识工程决策、风险预判与决策文档。进入子入口后隐藏五阶段主线，使用专注页面承载教学和可视化实验。主页入口状态由 StageRecord 和统一 Artifact 推导；`stage_3_knowledge_decision` / `stage_3_ai_review` 继续作为阶段三正式后端产物，案例教学记录和实验记录后续如需持久化时再新增独立 Artifact 类型，不写入阶段三正式决策文档。

### 阶段三 RAG 可视化实验边界

五层知识实验室中的 RAG 可视化演示定位为确定性教学模拟，用于帮助学生理解数据准备、分块、向量化、召回和评估之间的因果关系。当前前端使用制造业质检样本文档、固定向量点位和确定性评分函数，不接真实 embedding、向量数据库或外部模型，也不通过阶段三后端保存实验过程。后续如需把学生观察记录纳入学习证据，应新增 `stage_3_lab_experiment_record` 过程 Artifact，并保持其与正式 `stage_3_knowledge_decision` 决策文档分离。

### 阶段三预置案例教学边界

预置案例教学只用于建立 RAG 直觉，不读取学生自己的项目输入，也不写入阶段三正式 Artifact。该入口通过坏例子 / 好例子对比，让学生先识别坏数据、坏分块、坏召回以及三类诊断问题；项目级知识工程判断仍只由后续项目知识工程决策入口沉淀到 `stage_3_knowledge_decision`。后续如需记录学生是否完成案例学习，应新增独立过程记录，而不是把案例学习状态作为阶段三完成门槛。

### 阶段三项目决策工作台边界

项目知识工程决策入口负责把阶段二输入和五层实验室观察迁移成当前项目的正式知识工程选择，保存目标仍是既有 `stage_3_knowledge_decision`。五层实验室观察在没有过程 Artifact 时使用确定性教学快照生成迁移建议；如果后续新增 `stage_3_lab_experiment_record`，项目决策页可以优先读取该过程证据，但它不替代正式决策文档，也不改变阶段三完成门槛。风险预判与决策文档入口负责展示已保存决策、触发 `stage_3_ai_review` 和完成阶段三。

### 阶段三风险预判与提交门禁边界

风险预判与决策文档入口不新增独立 `risk_forecast` Artifact；当前风险矩阵由正式 `stage_3_knowledge_decision` 和 `stage_3_ai_review` 派生，作为提交前解释和阶段四交接检查。阶段三完成门禁仍以后端既有 `stage_3_knowledge_decision` + `stage_3_ai_review` 为持久化事实，前端额外要求五层 readiness、风险预判可生成和阶段四交接说明明确，用于防止学生保存空泛决策后直接完成阶段。后续如果教师需要审阅学生手写风险预判，可再新增过程或正式 Artifact 类型，但不得覆盖既有知识工程决策文档。

## 2026-05-19

### AI Gateway usage 级模型路由

平台 AI Gateway 保留 `SILICONFLOW_MODEL` 作为兜底模型，同时新增客户对话模型和复杂评审模型两个路由配置。高频客户模拟对话 usage 使用 `SILICONFLOW_CUSTOMER_MODEL`，当前本地配置为 `deepseek-ai/DeepSeek-V4-Flash`；教学反馈、阶段一综合评估和阶段二至阶段五评审 / 评估 usage 使用 `SILICONFLOW_REASONING_MODEL`，当前本地配置为 `Pro/zai-org/GLM-5.1`。阶段服务和 LangGraph 节点仍不得直接选择供应商 SDK 或绕过 AI Gateway。

## 2026-05-10

### 阶段一教学引导模式优先精修

阶段一工作台精修先完成页面结构，再进入功能体验打磨。教学引导模式页面已确认为独立训练页，采用全局窄侧栏后的三栏专注布局：左侧六关卡进度，中间客户对话窗口，右侧本关目标、提问技巧、推荐问句和 AI 分析辅助。该页面不显示阶段一主页的五阶段交付主线，也不显示通用阶段上下文栏。

### 教学引导训练记录边界

教学引导模式用于训练访谈能力，不作为阶段二正式输入。后续功能打磨可以保存训练过程、关卡完成度和 AI 反馈，但必须与项目实战模式的正式客户拜访证据区分；进入阶段二的问题定义、需求假设和未确认问题清单仍只来自项目实战模式。

### 阶段一后续功能打磨顺序

阶段一下一步优先打磨教学引导模式内的功能：六关卡状态推进、推荐问句使用、学生提问质量反馈、AI 客户回应边界、训练复盘和重试 / 继续动作。教学引导模式稳定后，再继续精修项目实战模式、拜访间整理、问题发现总结和阶段一综合评估。

### 阶段工作区保留全局窄侧栏

进入阶段一至阶段五工作区后，EduFDE 全局侧边栏保持收起为窄栏的状态。课程列表页和实验课程总览页仍可保留完整全局侧栏；阶段内页面采用全局窄侧栏、顶部返回 / 刷新入口、阶段导航、中央任务工作区和右侧上下文栏，以兼顾导航连续性和任务区宽度。

### 阶段一精修信息架构

阶段一采用“教学引导模式”和“项目实战模式”分离的页面结构。阶段一主页负责模式选择与进度总览；阶段一主页左侧五阶段导航必须与现有课程实验进入后的“五阶段交付主线”导航保持一致。教学引导模式和项目实战模式都是独立客户对话页，窗口顶部展示客户身份介绍。教学引导模式左侧展示六关卡进度，右侧展示关卡目标、提问技巧、推荐问句和 AI 反馈；项目实战模式右侧展示实时访谈线索、待追问问题和正式产出流程。

教学引导推荐首次学习完成，但不强制阻塞项目实战。拜访间整理、问题发现总结和阶段一综合评估属于项目实战模式的正式交付链路；阶段二正式输入只来自项目实战模式，不读取教学引导练习内容。

### 阶段一教学引导首轮接入边界

阶段一精修第一轮前端落地中，教学引导模式作为页面内练习视图实现，不调用现有 `stage_1_customer_interview` 接口，也不写入 `stage_1_interview_turn` 或 `stage_1_problem_summary` Artifact。现有阶段一后端接口继续只承载项目实战模式的正式客户拜访和问题总结，避免教学练习污染阶段二的正式输入。后续如果需要持久化教学练习，应新增独立的训练记录或 teaching attempt 模型 / API，而不是复用正式项目 Artifact。

### LangGraph AI Runtime 边界

平台级 AI 智能体编排采用 LangGraph，但不替代 AI Gateway。LangGraph 只负责状态化流程编排、节点顺序和阶段智能体工作流；所有模型调用节点必须通过 EduFDE `AI Gateway` 适配器进入现有 provider 路由、调用日志、Prompt 版本和 tenant / course / session 作用域审计。

### 阶段一客户角色配置

阶段一客户模拟智能体配置进入实验包版本 manifest：`customer_personas` 作为角色库，`stage_1_ai_config.customer_persona_bindings` 显式绑定教学引导和项目实战默认客户。第一轮通过 seed / manifest 配置，不做可视化编辑后台；课程仍通过实验包版本锁定客户角色和释放规则。

### 阶段一教学引导持久化

教学引导模式新增独立 `stage_one_guided_attempts` / `stage_one_guided_turns` 记录，保存关卡进度、客户回应、AI 反馈和两类 AI call log ID。该记录不写入正式 Artifact，不作为阶段二输入；阶段二仍只读取项目实战模式的正式阶段一证据链。
