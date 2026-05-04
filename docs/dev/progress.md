# EduFDE 开发进度

> 每个开发会话结束时更新本文件。

## 一、当前阶段

MVP 五阶段学生端最小闭环推进阶段：项目脚手架、本地开发环境、数据库连接、基础模型、Alembic 迁移框架、最小认证与当前用户上下文、演示实验包初始化、课程 / session 最小创建链路、Artifact service/API、AI Gateway 最小边界、阶段一“需求访谈与问题发现”最小后端业务链路与学生端前端联调页、阶段一完成 / 阶段二解锁状态流转、阶段二“方案定义与可行性判断”最小后端业务链路、阶段二学生端最小联调能力、阶段三“知识工程决策”最小后端业务链路、阶段三学生端最小联调能力、学生端联调页轻量组件拆分、阶段四“智能体实现与测试”Dify 路径最小后端业务链路、阶段四学生端最小联调能力、阶段五“交付验收与运维说明”最小后端业务链路、阶段五学生端最小联调能力、MVP 基础教师进度视图最小后端链路与前端联调能力、MVP 基础学习画像最小链路已完成；当前尚未实现正式产品页面、教师批改和完整评分。

## 二、已完成

- 阅读并审查原始 v1.0 设计文档。
- 确认终局产品定位：AI 智能体项目交付实训平台。
- 创建 v2.0 设计文档体系。
- 创建开发治理结构：
  - `AGENTS.md`
  - `docs/dev/README.md`
  - `docs/dev/progress.md`
  - `docs/dev/decisions.md`
  - `docs/dev/session-handoff-template.md`
  - `docs/dev/module-prompt-template.md`
- 初始化应用脚手架和本地开发环境：
  - `frontend/` Next.js App Router + TypeScript + Tailwind CSS 骨架。
  - `backend/` FastAPI + Pydantic Settings 骨架。
  - `docker-compose.yml` 包含 PostgreSQL、Redis、MinIO、MinIO bucket 初始化。
  - `.env.example` 覆盖前端、后端、数据库、Redis、MinIO 本地配置。
  - 后端 `/health` 与 `/api/v1/health` 基础健康检查。
  - 根目录、前端、后端 README 启动说明。
- 初始化数据库地基：
  - 添加 SQLAlchemy `Base`、engine、sessionmaker 和 FastAPI dependency 入口。
  - 初始化 Alembic，首个迁移可从模型自动生成并执行。
  - 创建 MVP 最小模型骨架：`tenants`、`institutions`、`users`、`courses`、`experiment_packages`、`experiment_package_versions`、`experiment_sessions`、`stage_records`、`artifacts`、`rubrics`、`yellow_flags`、`ai_call_logs`。
  - `courses.package_version_id` 非空绑定 `experiment_package_versions.id`。
  - 运行数据模型保留 `tenant_id` / `institution_id` / `course_id` 作用域边界。
  - 添加数据库地基测试和 `backend/scripts/check_db.py` 连接验证脚本。
- 初始化 MVP 最小认证与当前用户上下文：
  - 添加 `users.password_hash` 字段和 Alembic 迁移。
  - 添加 PBKDF2 密码哈希与校验工具。
  - 添加 JWT access token 生成与校验。
  - 添加 `/api/v1/auth/login` 和受保护的 `/api/v1/auth/me`。
  - 当前用户上下文包含 `tenant_id`、`institution_id` 和 `role`。
  - token 校验后的用户查询显式匹配 `user_id`、`tenant_id`、`institution_id`、`role` 和 `is_active`。
- 初始化制造业质检 AI 实验包与课程 / session 最小链路：
  - 新增 `stage_blueprints` 最小内容资产模型和 Alembic 迁移。
  - 添加可重复执行的 `backend/scripts/init_demo_data.py` 演示 seed 脚本。
  - seed 初始化默认 tenant、默认 institution、admin / teacher / student 演示用户、制造业质检 AI 智能体实验包 v1、5 个 stage blueprints、5 个最小 Rubric 和阶段一 AI 客户 persona JSON 配置。
  - 添加课程 service/API：teacher 当前用户可创建、查询本 tenant / institution 下课程，课程必须绑定可用 `package_version_id`。
  - 添加实验 session service/API：student 当前用户可基于本 tenant / institution 下课程创建自己的 session，session 继承课程绑定的 `package_version_id`，并初始化 5 条 `stage_records`。
  - session 创建时阶段一为 `not_started`，阶段二至五为 `locked`。
- 初始化 Artifact service/API 与 AI Gateway 最小边界：
  - `artifacts` 显式增加 `stage_key` 字段，并通过 Alembic migration 补齐历史数据。
  - 新增 Artifact service/API，支持学生在自己 session 的指定 stage 下创建 Artifact，按 session/stage 查询列表，以及读取 Artifact 详情。
  - Artifact 创建时写入 `tenant_id`、`institution_id`、`course_id`、`session_id`、`stage_record_id`、`stage_key` 和 `submitted_by_user_id`。
  - Artifact service 层显式校验 tenant / institution / course / session / stage 作用域；学生只能访问自己的 session Artifact。
  - 教师读取课程内 Artifact 暂以 `courses.created_by_user_id` 作为低成本 MVP 边界，后续需替换为 `course_members` / 课程权限模型。
  - 新增 `backend/app/ai_gateway/` 模块，定义统一 `AiGatewayRequest` / `AiGatewayResponse`、provider 协议和 deterministic fake provider。
  - 新增 `invoke_ai` 统一入口；fake provider 调用也必须经过 AI Gateway。
  - 每次 AI Gateway 调用同步写入 `ai_call_logs`，记录 scope、usage、provider/model、请求/响应摘要、状态、错误、耗时和 token 占位字段。
- 初始化阶段一“需求访谈与问题发现”最小后端业务链路：
  - 新增 `backend/app/services/stage_one.py`、`backend/app/api/stage_one.py`、`backend/app/schemas/stage_one.py`。
  - 新增阶段一 AI 客户提问接口，所有调用经过 AI Gateway fake provider，usage 使用 `stage_1_customer_interview`。
  - 阶段一服务层按当前用户上下文校验 tenant / institution / course / session / stage 作用域；学生只能操作自己的 experiment session。
  - 阶段一接口只接受 `stage_key = stage_1`，拒绝将阶段一接口写入其他阶段。
  - 每次 AI 客户访谈保存 `stage_1_interview_turn` Artifact，内容包含 `user_message`、`ai_customer_response` 和 `ai_call_log_id`。
  - 首次阶段一访谈或总结保存会将 `stage_records.status` 从 `not_started` 推进到既有等价状态 `in_practice`，并设置开始时间；不会自动完成阶段一或解锁阶段二。
  - 新增阶段一问题发现总结保存接口，保存 `stage_1_problem_summary` Artifact，暂不触发 AI 评审。
  - AI Gateway 成功响应返回 `call_log_id`，便于阶段 Artifact 记录最小追踪信息。
- 初始化阶段一学生端最小联调页：
  - 新增轻量前端 API client，统一使用 `NEXT_PUBLIC_API_BASE_URL` 或默认 `http://localhost:8000`。
  - 首页替换为学生端阶段一联调页，支持登录、调用 `/api/v1/auth/me` 获取当前用户、读取课程、进入或创建 session。
  - 学生可向阶段一 AI 客户提问，页面展示 AI 回复、AI Log 短 ID 和 Artifact 短 ID。
  - 学生可保存阶段一问题发现总结，页面展示当前阶段一 Artifact 列表。
  - 演示 seed 脚本新增默认课程 `MFG-QA-DEMO`，便于学生账号直接创建 session 进行本地联调。
- 初始化阶段一完成与阶段二解锁最小状态流转：
  - 新增阶段一完成接口：学生必须在自己 session 的 `stage_1` 下已有 `stage_1_problem_summary` Artifact 才能完成阶段一。
  - 阶段一完成后，`stage_1` 更新为 `completed`，只把 `stage_2` 从 `locked` 更新为 `not_started`。
  - 阶段一完成不会自动完成阶段二，也不会解锁阶段三。
  - 完成逻辑继续校验 tenant / institution / course / session / user 作用域。
- 初始化阶段二“方案定义与可行性判断”最小后端业务链路：
  - 新增 `backend/app/services/stage_two.py`、`backend/app/api/stage_two.py`、`backend/app/schemas/stage_two.py`。
  - 阶段二接口只接受 `stage_key = stage_2`，并限制学生只能操作自己的 experiment session。
  - 阶段二方案定义保存为 `stage_2_solution_definition` Artifact，绑定 tenant / institution / course / session / stage_record / stage_key。
  - `stage_2` 为 `locked` 时拒绝保存阶段二方案；首次保存方案后将 `stage_2` 从 `not_started` 推进到 `in_practice`。
  - 新增阶段二 AI 可行性评审接口，必须读取当前阶段二方案 Artifact，usage 使用 `stage_2_feasibility_review`，调用经过 AI Gateway fake provider 并写入 `ai_call_logs`。
  - AI 评审结果保存为 `stage_2_ai_review` Artifact，内容包含 `review_summary`、`feasibility_judgement`、`key_risks`、`suggested_improvements`、`ai_call_log_id` 和阶段二 Rubric 快照。
  - 新增阶段二完成接口：必须同时存在 `stage_2_solution_definition` 和 `stage_2_ai_review` Artifact；完成后 `stage_2` 更新为 `completed`，只把 `stage_3` 从 `locked` 更新为 `not_started`。
  - 本轮未实现阶段二完整前端页面、真实大模型接入、正式 Rubric 评分引擎、教师批改或阶段三业务。
- 初始化阶段二学生端最小联调能力：
  - 扩展轻量前端 API client，新增阶段一完成、阶段二方案保存、阶段二 AI 评审、阶段二完成和通用 stage Artifact 查询调用。
  - 在现有学生端联调页展示五阶段最小状态，至少能观察 `stage_1`、`stage_2`、`stage_3` 的状态变化。
  - 在阶段一总结保存区域新增“完成阶段一”按钮，完成后刷新 session 状态和 Artifact 列表。
  - 新增阶段二方案定义结构化表单，保存成功后展示方案 Artifact 短 ID，并刷新阶段二 Artifact 列表。
  - 新增“请求 AI 可行性评审”按钮，展示评审摘要、可行性判断、关键风险、改进建议和 AI log 短 ID。
  - 新增“完成阶段二”按钮，完成后刷新阶段状态并显示 `stage_3` 已解锁。
  - 本轮仍为联调页扩展，不是最终正式产品 UI；未实现阶段三业务、教师端、学习画像或真实模型接入。
- 初始化阶段三“知识工程决策”最小后端业务链路：
  - 新增 `backend/app/services/stage_three.py`、`backend/app/api/stage_three.py`、`backend/app/schemas/stage_three.py`。
  - 阶段三接口只接受 `stage_key = stage_3`，并限制学生只能操作自己的 experiment session。
  - 阶段三保存、AI 评审和完成均要求 `stage_2` 已 `completed`，避免绕过阶段二。
  - 阶段三知识工程决策保存为 `stage_3_knowledge_decision` Artifact，绑定 tenant / institution / course / session / stage_record / stage_key。
  - `stage_3` 为 `locked` 时拒绝保存阶段三决策；首次保存决策后将 `stage_3` 从 `not_started` 推进到 `in_practice`。
  - 新增阶段三 AI 知识工程决策评审接口，必须读取当前阶段三知识工程决策 Artifact，并消费当前 session 下阶段二 `stage_2_solution_definition` Artifact 作为上下文。
  - 阶段三 AI 评审 usage 使用 `stage_3_knowledge_decision_review`，调用经过 AI Gateway fake provider 并写入 `ai_call_logs`。
  - AI 评审结果保存为 `stage_3_ai_review` Artifact，内容包含 `review_summary`、`strategy_fit`、`missing_knowledge_risks`、`data_quality_warnings`、`stage_4_readiness`、`suggested_improvements`、`ai_call_log_id` 和阶段三 Rubric 快照。
  - 新增阶段三完成接口：必须同时存在 `stage_3_knowledge_decision` 和 `stage_3_ai_review` Artifact；完成后 `stage_3` 更新为 `completed`，只把 `stage_4` 从 `locked` 更新为 `not_started`。
  - 本轮未实现阶段三前端页面、Dify 集成、真实知识库构建、文档上传解析、embedding / chunking / 向量库、真实大模型、正式 Rubric 评分引擎或教师批改。
- 初始化阶段三学生端最小联调能力：
  - 扩展轻量前端 API client，新增阶段三知识工程决策保存、AI 决策评审、阶段三完成调用。
  - 在现有学生端联调页继续展示五阶段状态，并在阶段三完成后刷新显示 `stage_4=not_started`。
  - 新增阶段三知识工程决策表单，覆盖 `knowledge_goal`、`required_knowledge_types`、`source_inventory`、`selected_strategy`、`strategy_rationale`、`data_quality_risks`、`maintenance_plan`、`evaluation_plan`、`stage_4_build_plan`。
  - 阶段三为 `locked` 或 session 未就绪时禁用阶段三表单和操作按钮，避免误导学生提交阶段三内容。
  - 新增阶段三 AI 知识工程决策评审按钮，展示评审摘要、策略匹配度、知识缺口风险、数据质量警示、阶段四准备度、改进建议和 AI Log 短 ID。
  - 新增阶段三完成按钮，完成后刷新阶段状态和 Artifact 列表。
  - 本轮仍为联调页扩展，不是最终正式产品 UI；未实现阶段四 Dify 集成、真实知识库构建、embedding / chunking / 向量库、真实模型、教师端或学习画像。
- 完成学生端联调页轻量组件拆分：
  - 将 `frontend/app/page.tsx` 从 1368 行降至约 611 行，页面层保留认证、session 初始化、Artifact 刷新和阶段操作编排。
  - 新增 `frontend/src/components/student-workspace/`，拆出默认表单值、联调页类型、共享工具函数、通用表单 / 状态 / 评审展示组件。
  - 拆出工作区面板、Artifact 列表、阶段一访谈与总结、阶段二方案定义、阶段三知识工程决策组件。
  - 不引入 React Query / Zustand 等新状态管理；不改变现有 API client、后端业务、页面流程或正式 UI 边界。
- 初始化阶段四“智能体实现与测试”Dify 路径最小后端业务链路：
  - 新增 `backend/app/services/stage_four.py`、`backend/app/api/stage_four.py`、`backend/app/schemas/stage_four.py`。
  - 阶段四接口只接受 `stage_key = stage_4`，并限制学生只能操作自己的 experiment session。
  - 阶段四保存、测试报告、AI 测试反馈和完成均要求 `stage_3` 已 `completed`，避免绕过阶段三。
  - Dify 实现记录保存为 `stage_4_dify_implementation` Artifact，绑定 tenant / institution / course / session / stage_record / stage_key。
  - `stage_4` 为 `locked` 时拒绝保存 Dify 实现记录；首次保存 Dify 实现记录后将 `stage_4` 从 `not_started` 推进到 `in_practice`。
  - 阶段四测试记录保存为 `stage_4_test_report` Artifact，且必须要求当前 session 下已存在 `stage_4_dify_implementation` Artifact。
  - 阶段四 AI 测试反馈必须读取 `stage_4_dify_implementation`、`stage_4_test_report` 和阶段三 `stage_3_knowledge_decision` Artifact。
  - 阶段四 AI 测试反馈 usage 使用 `stage_4_agent_test_review`，调用经过 AI Gateway fake provider 并写入 `ai_call_logs`。
  - AI 测试反馈结果保存为 `stage_4_ai_test_review` Artifact，内容包含 `review_summary`、`test_coverage_feedback`、`implementation_risks`、`improvement_suggestions`、`release_readiness`、`ai_call_log_id` 和阶段四 Rubric 快照。
  - 新增阶段四完成接口：必须同时存在 `stage_4_dify_implementation`、`stage_4_test_report` 和 `stage_4_ai_test_review` Artifact；完成后 `stage_4` 更新为 `completed`，只把 `stage_5` 从 `locked` 更新为 `not_started`。
  - 本轮未实现阶段四前端页面、真实 Dify API 深度集成、文档上传 / embedding / chunking / 向量库、真实模型、教师批改、正式 Rubric 评分引擎或阶段五业务。
- 初始化阶段四学生端最小联调能力：
  - 扩展轻量前端 API client，新增阶段四 Dify 实现记录保存、测试报告保存、AI 测试反馈和阶段四完成调用。
  - 在 `frontend/src/components/student-workspace/` 新增阶段四联调组件，`frontend/app/page.tsx` 继续保留页面级状态、session 初始化、Artifact 刷新和 API 调用编排。
  - 阶段四 Dify 实现记录表单覆盖应用名称、URL、可选 ID、应用模式、知识库记录、Prompt / 指令记录、工具配置记录、实现说明和已知限制。
  - 阶段四测试报告表单覆盖测试目标、测试用例 JSON、观察到的问题、改进动作和总体结果。
  - 页面可展示阶段四 AI 测试反馈的 review summary、测试覆盖反馈、实现风险、改进建议、发布准备度和 AI Log 短 ID。
  - 完成阶段四后刷新阶段状态，并显示 `stage_4=completed`、`stage_5=not_started`。
  - 本轮仍为学生端联调页扩展，不是正式产品 UI；未实现真实 Dify API 集成、阶段五业务、教师端、真实模型、文档上传 / embedding / chunking / 向量库。
- 初始化阶段五“交付验收与运维说明”最小后端业务链路：
  - 新增 `backend/app/services/stage_five.py`、`backend/app/api/stage_five.py`、`backend/app/schemas/stage_five.py`。
  - 阶段五接口只接受 `stage_key = stage_5`，并限制学生只能操作自己的 experiment session。
  - 阶段五保存、AI 交付审阅和完成均要求 `stage_4` 已 `completed`，避免绕过阶段四。
  - 交付说明保存为 `stage_5_delivery_document` Artifact，验收材料保存为 `stage_5_acceptance_package` Artifact，运维说明保存为 `stage_5_operations_guide` Artifact。
  - `stage_5` 为 `locked` 时拒绝保存阶段五材料；首次保存阶段五材料后将 `stage_5` 从 `not_started` 推进到 `in_practice`。
  - 阶段五验收材料保存要求当前 session 下已存在阶段四 `stage_4_dify_implementation` 和 `stage_4_test_report`。
  - 阶段五 AI 交付审阅必须读取阶段五交付说明、验收材料、运维说明，并消费阶段四 Dify 实现记录、测试报告和 AI 测试反馈。
  - 阶段五 AI 交付审阅 usage 使用 `stage_5_delivery_review`，调用经过 AI Gateway fake provider 并写入 `ai_call_logs`。
  - AI 交付审阅结果保存为 `stage_5_ai_delivery_review` Artifact，内容包含 `review_summary`、`delivery_completeness`、`acceptance_risks`、`operations_risks`、`improvement_suggestions`、`final_readiness`、`ai_call_log_id` 和阶段五 Rubric 快照。
  - 新增阶段五完成接口：必须同时存在 `stage_5_delivery_document`、`stage_5_acceptance_package`、`stage_5_operations_guide` 和 `stage_5_ai_delivery_review` Artifact；完成后 `stage_5` 更新为 `completed`，并将当前 experiment session 标记为 `completed`。
  - 本轮未实现阶段五前端页面、教师最终验收、证书、成绩、真实 Dify API、真实模型、正式 Rubric 评分、学习画像或部署。
- 初始化阶段五学生端最小联调能力：
  - 扩展轻量前端 API client，新增阶段五交付说明保存、验收材料保存、运维说明保存、AI 交付审阅和阶段五完成调用。
  - 在 `frontend/src/components/student-workspace/` 新增阶段五联调组件，`frontend/app/page.tsx` 继续保留页面级状态、session 初始化、Artifact 刷新和 API 调用编排。
  - 阶段五交付说明表单覆盖项目名称、最终智能体 URL、交付摘要、核心功能、目标用户、使用说明和已知限制。
  - 阶段五验收材料表单覆盖验收范围、验收标准、测试证据摘要、未解决问题和交接清单。
  - 阶段五运维说明表单覆盖运行依赖、数据更新计划、监控计划、常见问题和维护负责人说明。
  - 页面可展示阶段五 AI 交付审阅的 review summary、delivery completeness、验收风险、运维风险、改进建议、最终准备度和 AI Log 短 ID。
  - 完成阶段五后刷新阶段状态和 session 状态，并显示 `stage_5=completed`、`session=completed`。
  - 本轮仍为学生端联调页扩展，不是正式产品 UI；未实现教师最终验收、证书、成绩、学习画像、真实模型、真实 Dify API 或部署。
- 初始化 MVP 基础教师进度视图最小链路：
  - 新增 `backend/app/services/teacher_progress.py`、`backend/app/api/teacher_progress.py`、`backend/app/schemas/teacher_progress.py`。
  - 新增 `/api/v1/teacher/progress/courses`，教师只能查看自己创建的课程，返回课程下 student session、session status、五阶段 stage_records 状态、每阶段 Artifact 数量、Artifact 总数和最近更新时间。
  - 新增 `/api/v1/teacher/progress/sessions/{session_id}/stages/{stage_key}/artifacts`，教师可查看自己课程内某个学生 session 指定阶段的 Artifact 摘要。
  - 教师进度 API 服务层显式校验当前用户为 `teacher`，并过滤 `tenant_id`、`institution_id`、`Course.created_by_user_id`、session 和 stage 作用域；学生访问返回 403。
  - 教师 Artifact 摘要仍沿用当前 MVP `courses.created_by_user_id` 边界，不做课程成员模型、教师批改、Rubric 打分或学习画像。
  - 前端联调页支持教师账号登录；教师登录后展示课程列表、学生 session 列表、阶段状态、Artifact 数量，并可按阶段查看 Artifact JSON 摘要。
- 初始化 MVP 基础学习画像最小链路：
  - 新增 `backend/app/services/learning_profile.py`、`backend/app/api/learning_profile.py`、`backend/app/schemas/learning_profile.py`。
  - 新增 `/api/v1/learning-profiles/sessions/{session_id}`，学生可查看自己的 session 学习画像，教师可查看自己创建课程下学生 session 的学习画像。
  - 学习画像服务层显式校验 `tenant_id`、`institution_id`、course、session 和 user 作用域；教师边界继续沿用 `courses.created_by_user_id`。
  - 画像从现有 `stage_records` 和 `artifacts` 即时计算，返回 session 状态、学生摘要、阶段状态、每阶段 Artifact 数量、每阶段 AI 反馈数量、完成阶段数、完成比例、优势、风险和下一步建议。
  - strengths / risks / next_suggestions 当前使用规则生成，不接真实模型、不写长期画像表、不引入教师批改或 Rubric 分数。
  - 前端联调页新增只读学习画像展示：学生侧显示当前 session 画像，教师进度视图显示选中学生 session 画像。

## 三、尚未开始

- 阶段一至三正式产品页面
- 阶段四正式产品页面
- 阶段五正式产品页面
- 正式教师后台 UI
- 部署

## 四、当前推荐下一步任务

正式产品 UI 打磨，或教师批改 / 完整评分的独立切片。

建议范围：

- 若选择正式教师后台 UI：基于已验证的教师进度 API 重做正式教师端信息架构与页面，不引入批改和评分。
- 若选择正式学生端 UI：基于已验证的联调页能力重做五阶段工作区，不接真实 Dify API 或正式评分。
- 阶段一 AI 客户完整体验、阶段二正式 Rubric 评分、教师批改、真实 Dify API 集成仍按后续独立切片推进。

## 五、验证基线

后端：

```bash
.venv/bin/pytest backend/tests
.venv/bin/uvicorn app.main:app --app-dir backend --reload --host 0.0.0.0 --port 8000
curl http://localhost:8000/health
```

前端：

```bash
cd frontend
npm run lint
npm run typecheck
npm run dev
```

Docker 依赖服务：

```bash
cp .env.example .env
docker compose --env-file .env config --quiet
docker compose --env-file .env up -d postgres redis minio minio-init
docker compose --env-file .env ps -a
```

本轮实际验证记录：

- 2026-04-30 数据库地基：
  - Docker PostgreSQL：`/Applications/Docker.app/Contents/Resources/bin/docker compose --env-file .env ps postgres` 显示 `edufde-postgres` 为 `Up ... (healthy)`。
  - Alembic 生成首个 migration：`.venv/bin/alembic revision --autogenerate -m "create mvp database foundation"` 成功生成 `backend/alembic/versions/2ba7aadc5602_create_mvp_database_foundation.py`。
  - Alembic 执行迁移：`.venv/bin/alembic upgrade head` 成功执行 `Running upgrade  -> 2ba7aadc5602`。
  - Alembic schema diff：`.venv/bin/alembic check` 返回 `No new upgrade operations detected`，确认当前模型与数据库 schema 一致。
  - PostgreSQL 数据库状态：`docker compose --env-file .env ps postgres` 显示 `edufde-postgres` 为 `Up ... (healthy)`。
  - PostgreSQL 迁移版本：`docker compose --env-file .env exec -T postgres psql -U edufde -d edufde -c "select version_num from alembic_version;"` 返回 `2ba7aadc5602`。
  - PostgreSQL 地基表数量：查询 `information_schema.tables` 中 12 张 MVP 地基表，返回 `table_count = 12`。
  - 后端测试：`.venv/bin/pytest backend/tests -q` 返回 `8 passed`。
  - Ruff：`.venv/bin/ruff check backend` 返回 `All checks passed!`。
  - `backend/scripts/check_db.py` 保留为普通本地终端的可选直连烟测；本轮完成标准以 Alembic 与 Docker PostgreSQL 查询验证为准。
- 2026-04-30 认证与当前用户上下文：
  - Docker PostgreSQL：`/Applications/Docker.app/Contents/Resources/bin/docker compose --env-file .env ps postgres` 显示 `edufde-postgres` 为 `Up ... (healthy)`。
  - 认证测试红灯：`.venv/bin/pytest backend/tests/test_auth.py -q` 初始返回缺少 `app.core.security`、`/api/v1/auth/me` 为 404 等预期失败。
  - 认证测试绿灯：`.venv/bin/pytest backend/tests/test_auth.py -q` 返回 `6 passed`。
  - 后端全量测试：`.venv/bin/pytest backend/tests -q` 返回 `14 passed`。
  - Ruff：`.venv/bin/ruff check backend` 返回 `All checks passed!`。
  - Alembic 执行迁移：`.venv/bin/alembic upgrade head` 成功执行 `Running upgrade 2ba7aadc5602 -> 9b1f22f3c8a4`。
  - Alembic schema diff：`.venv/bin/alembic check` 返回 `No new upgrade operations detected`。
  - PostgreSQL 迁移版本：`docker compose --env-file .env exec -T postgres psql -U edufde -d edufde -c "select version_num from alembic_version;"` 返回 `9b1f22f3c8a4`。
- 2026-04-30 实验包初始化与课程 / session 最小链路：
  - 前置 Git 状态：`git status --short` 无输出，确认工作区干净；`git log -1 --oneline` 返回 `9fe2398 feat: add mvp authentication context`。
  - Docker PostgreSQL：`/Applications/Docker.app/Contents/Resources/bin/docker compose --env-file .env ps postgres` 显示 `edufde-postgres` 为 `Up ... (healthy)`。
  - 新增测试红灯：`.venv/bin/pytest backend/tests/test_demo_seed.py backend/tests/test_courses_sessions.py -q` 初始因缺少 `StageBlueprint` 和 `app.seeds` 失败。
  - 新增测试绿灯：`.venv/bin/pytest backend/tests/test_demo_seed.py backend/tests/test_courses_sessions.py -q` 返回 `5 passed`。
  - 后端全量测试：`.venv/bin/pytest backend/tests -q` 返回 `19 passed`。
  - Ruff：`.venv/bin/ruff check backend` 返回 `All checks passed!`。
  - Alembic 生成 migration：`.venv/bin/alembic revision --autogenerate -m "add stage blueprints"` 成功生成 `backend/alembic/versions/82e61f25d0bf_add_stage_blueprints.py`。
  - Alembic 执行迁移：`.venv/bin/alembic upgrade head` 成功执行 `Running upgrade 9b1f22f3c8a4 -> 82e61f25d0bf`。
  - Alembic schema diff：`.venv/bin/alembic check` 返回 `No new upgrade operations detected`。
  - 演示 seed 脚本：`.venv/bin/python backend/scripts/init_demo_data.py` 连续执行两次成功，输出默认 tenant、institution、package version 和三个演示用户。
  - PostgreSQL seed 结果：查询返回 `demo_users = 3`、`package_versions = 1`、`stage_blueprints = 5`、`rubrics = 5`。
- 2026-04-30 Artifact service/API 与 AI Gateway 最小边界：
  - 新增测试红灯：`.venv/bin/pytest backend/tests/test_artifacts.py backend/tests/test_ai_gateway.py -q` 初始返回 Artifact API 404、`app.ai_gateway` 未实现等预期失败。
  - 新增测试绿灯：`.venv/bin/pytest backend/tests/test_artifacts.py backend/tests/test_ai_gateway.py -q` 返回 `8 passed`。
  - 后端全量测试：`.venv/bin/pytest backend/tests -q` 返回 `27 passed`。
  - Ruff：`.venv/bin/ruff check backend` 返回 `All checks passed!`。
  - Ruff format：`.venv/bin/ruff format --check backend/alembic/versions/b4c2d6e8f901_add_artifact_stage_key.py backend/app/ai_gateway/__init__.py backend/app/ai_gateway/providers.py backend/app/ai_gateway/schemas.py backend/app/ai_gateway/service.py backend/app/api/artifacts.py backend/app/main.py backend/app/models/evidence.py backend/app/schemas/artifacts.py backend/app/services/artifacts.py backend/tests/test_ai_gateway.py backend/tests/test_artifacts.py` 返回 `12 files already formatted`；全目录 format check 仍会命中既有未格式化文件，本轮未扩大 diff。
  - Alembic 执行迁移：`.venv/bin/alembic upgrade head` 成功执行 `Running upgrade 82e61f25d0bf -> b4c2d6e8f901`。
  - Alembic schema diff：`.venv/bin/alembic check` 返回 `No new upgrade operations detected`。
- 2026-04-30 阶段一“需求访谈与问题发现”最小后端业务链路：
  - 新增测试红灯：`.venv/bin/pytest backend/tests/test_stage_one.py -q` 初始返回阶段一提问接口和总结接口 404，`2 failed, 2 passed`。
  - 新增测试绿灯：`.venv/bin/pytest backend/tests/test_stage_one.py -q` 返回 `4 passed`。
  - 相邻模块回归：`.venv/bin/pytest backend/tests/test_stage_one.py backend/tests/test_artifacts.py backend/tests/test_ai_gateway.py -q` 返回 `12 passed`。
  - 后端全量测试：`.venv/bin/pytest backend/tests -q` 返回 `31 passed`。
  - Ruff：`.venv/bin/ruff check backend` 返回 `All checks passed!`。
  - Alembic schema diff：`.venv/bin/alembic check` 返回 `No new upgrade operations detected`。本轮未产生 migration，因此未执行新的 `alembic upgrade head`。
- 2026-04-30 阶段一学生端最小联调页：
  - 新增 seed 测试红灯：`.venv/bin/pytest backend/tests/test_demo_seed.py::test_demo_seed_creates_student_usable_demo_course -q` 初始返回 `0 == 1`，确认 seed 未创建学生可用课程。
  - 新增 seed 测试绿灯：`.venv/bin/pytest backend/tests/test_demo_seed.py::test_demo_seed_creates_student_usable_demo_course -q` 返回 `1 passed`。
  - 前端 lint：`npm run lint` 在 `frontend/` 返回通过。
  - 前端 typecheck：`npm run typecheck` 在 `frontend/` 返回通过。
  - 后端局部测试：`.venv/bin/pytest backend/tests/test_demo_seed.py backend/tests/test_courses_sessions.py -q` 返回 `6 passed`。
  - 后端全量测试：`.venv/bin/pytest backend/tests -q` 返回 `32 passed`。
  - 后端 Ruff：`.venv/bin/ruff check backend` 返回 `All checks passed!`。
  - Alembic 执行迁移：`.venv/bin/alembic upgrade head` 成功，无待执行迁移。
  - Alembic schema diff：`.venv/bin/alembic check` 返回 `No new upgrade operations detected`。
  - 演示 seed 脚本：`.venv/bin/python backend/scripts/init_demo_data.py` 需本机网络权限连接 Docker PostgreSQL；提权后成功输出默认 tenant、institution、package version 和演示用户。
  - 浏览器联调：后端使用 `FRONTEND_ORIGIN=http://127.0.0.1:3000` 启动在 `http://127.0.0.1:18000`，前端使用 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:18000 npm run dev -- --hostname 127.0.0.1 --port 3000` 启动在 `http://127.0.0.1:3000`。
  - 浏览器已验证：学生登录成功；读取当前用户；自动进入 / 创建 `MFG-QA-DEMO` session；阶段一提问返回 fake AI 客户回复；访谈生成 Artifact 且阶段状态显示 `in_practice`；保存阶段一总结后 Artifact 数量变为 2；浏览器 console error 为空。
- 2026-05-04 阶段二“方案定义与可行性判断”最小后端业务链路：
  - 新增测试红灯：`.venv/bin/pytest backend/tests/test_stage_two.py -q` 初始返回阶段一完成接口和阶段二接口 404 / 业务状态不匹配，`7 failed`。
  - 新增测试绿灯：`.venv/bin/pytest backend/tests/test_stage_two.py -q` 返回 `7 passed`。
  - 相邻模块回归：`.venv/bin/pytest backend/tests/test_stage_one.py backend/tests/test_stage_two.py -q` 返回 `11 passed`。
  - 后端全量测试：`.venv/bin/pytest backend/tests -q` 返回 `39 passed`。
  - 后端 Ruff：`.venv/bin/ruff check backend` 返回 `All checks passed!`。
  - 本轮未修改数据库模型，未产生 Alembic migration，因此未运行新的 `alembic upgrade head` / `alembic check`。
- 2026-05-04 阶段二学生端最小联调能力：
  - 前端 lint：`npm run lint` 在 `frontend/` 返回通过。
  - 前端 typecheck：`npm run typecheck` 在 `frontend/` 返回通过。
  - 后端全量测试：`.venv/bin/pytest backend/tests -q` 返回 `39 passed`。
  - Docker 依赖服务：`/Applications/Docker.app/Contents/Resources/bin/docker compose --env-file .env ps postgres redis minio` 显示 PostgreSQL / Redis healthy，MinIO Up。
  - Alembic 执行迁移：`.venv/bin/alembic upgrade head` 成功，无待执行迁移日志。
  - 演示 seed 脚本：`.venv/bin/python backend/scripts/init_demo_data.py` 普通沙箱连接本机 Docker PostgreSQL 被拒绝；提权后成功输出默认 tenant、institution、package version、`MFG-QA-DEMO` 和演示用户。
  - 后端 health：`curl -s http://127.0.0.1:18000/health` 返回 `{"status":"ok","service":"EduFDE Core API","environment":"local","version":"0.1.0"}`。
  - 浏览器联调：后端使用 `FRONTEND_ORIGIN=http://127.0.0.1:3000` 启动在 `http://127.0.0.1:18000`，前端使用 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:18000 npm run dev -- --hostname 127.0.0.1 --port 3000` 启动在 `http://127.0.0.1:3000`。
  - 浏览器已验证：学生登录成功；进入已有 `MFG-QA-DEMO` session；阶段一总结保存成功；阶段一完成后 `stage_1=completed`、`stage_2=not_started`；阶段二方案保存成功并生成 `stage_2_solution_definition`；阶段二 AI 评审成功并生成 `stage_2_ai_review` 和 AI Log 短 ID；阶段二完成后 `stage_2=completed`、`stage_3=not_started`；浏览器 console error 为空。
  - 验证后已停止前端和后端本地 dev server。
- 2026-05-04 阶段三“知识工程决策”最小后端业务链路：
  - 新增测试红灯：`.venv/bin/pytest backend/tests/test_stage_three.py -q` 初始返回阶段三接口 404，`5 failed, 3 passed`。
  - 新增测试绿灯：`.venv/bin/pytest backend/tests/test_stage_three.py -q` 返回 `8 passed`。
  - 相邻模块回归：`.venv/bin/pytest backend/tests/test_stage_two.py backend/tests/test_stage_three.py -q` 返回 `15 passed`。
  - 后端全量测试：`.venv/bin/pytest backend/tests -q` 返回 `47 passed`。
  - 后端 Ruff：`.venv/bin/ruff check backend` 返回 `All checks passed!`。
  - 本轮未修改数据库模型，未产生 Alembic migration，因此未运行新的 `alembic upgrade head` / `alembic check`。
- 2026-05-04 阶段三学生端最小联调能力：
  - 前端 lint：`npm run lint` 在 `frontend/` 返回通过。
  - 前端 typecheck：`npm run typecheck` 在 `frontend/` 返回通过。
  - 本轮未修改后端代码，未运行 `.venv/bin/pytest backend/tests -q`。
  - Docker 依赖服务：PostgreSQL / Redis healthy，MinIO Up。
  - 浏览器联调：后端使用 `FRONTEND_ORIGIN=http://127.0.0.1:3001` 启动在 `http://127.0.0.1:18000`，前端使用 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:18000 npm run dev -- --hostname 127.0.0.1 --port 3001` 启动在 `http://127.0.0.1:3001`。
  - 浏览器已验证：学生登录成功；进入已有 `MFG-QA-DEMO` session；页面展示五阶段状态；阶段三未解锁时操作禁用；阶段一 / 阶段二完成链路可刷新状态；阶段三保存知识工程决策成功并生成 `stage_3_knowledge_decision`；阶段三 AI 评审成功并生成 `stage_3_ai_review` 和 AI Log 短 ID；阶段三完成后 `stage_3=completed`、`stage_4=not_started`；页面无 Next.js 错误覆盖层，前后端 dev server 日志无明显运行时错误。
  - 本轮前后端 dev server 由提权命令启动，普通沙箱停止进程被系统拒绝；停止操作提权申请因当前工具额度限制未能执行，遗留本地监听进程 PID：前端 `63650`（端口 `3001`）、后端 `63521`（端口 `18000`）。
- 2026-05-04 阶段四“智能体实现与测试”Dify 路径最小后端业务链路：
  - 新增测试红灯：`.venv/bin/pytest backend/tests/test_stage_four.py -q` 初始返回阶段四接口 404 等预期失败。
  - 新增测试绿灯：`.venv/bin/pytest backend/tests/test_stage_four.py -q` 返回 `15 passed`。
  - 相邻模块回归：`.venv/bin/pytest backend/tests/test_stage_three.py backend/tests/test_stage_four.py -q` 返回 `23 passed`。
  - 后端全量测试：`.venv/bin/pytest backend/tests -q` 返回 `62 passed`。
  - 后端 Ruff：`.venv/bin/ruff check backend` 返回 `All checks passed!`。
  - 本轮未修改数据库模型，未产生 Alembic migration，因此未运行新的 `alembic upgrade head` / `alembic check`。
- 2026-05-04 学生端联调页轻量组件拆分：
  - 前端 lint：`npm run lint` 在 `frontend/` 返回通过。
  - 前端 typecheck：`npm run typecheck` 在 `frontend/` 返回通过。
  - 本轮未修改后端代码，未运行 `.venv/bin/pytest backend/tests -q`。
  - Docker 依赖服务：`/Applications/Docker.app/Contents/Resources/bin/docker compose --env-file .env ps postgres redis minio` 显示 PostgreSQL / Redis healthy，MinIO Up。
  - 浏览器联调：后端使用 `FRONTEND_ORIGIN=http://127.0.0.1:3001` 启动在 `http://127.0.0.1:18000`，前端使用 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:18000 npm run dev -- --hostname 127.0.0.1 --port 3001` 启动在 `http://127.0.0.1:3001`。
  - 浏览器已验证：学生登录成功；进入已有 `MFG-QA-DEMO` session；展示 `stage_1=completed`、`stage_2=completed`、`stage_3=completed`、`stage_4=not_started`、`stage_5=locked`；阶段一 AI 客户访谈成功并生成新的 `stage_1_interview_turn` Artifact 和 AI Log；阶段一 / 二 / 三 Artifact 列表、阶段二 AI 评审摘要、阶段三知识工程决策评审摘要均正常渲染。
  - 已在已完成 session 上点击阶段二保存按钮，后端返回既有错误 `Stage two is already completed` 并由页面错误区展示；该行为与本轮“不改变业务行为”的目标一致。
  - 验证后已停止本轮前端和后端本地 dev server，端口 `3001` 和 `18000` 无监听进程。
- 2026-05-04 阶段四学生端最小联调能力：
  - 前端 TDD 红灯：在 `frontend/app/page.tsx` 引用未实现的 `StageFourPanel` 后，`npm run typecheck` 返回缺少 `@/src/components/student-workspace/stage-four` 的预期错误。
  - 前端 lint：`npm run lint` 在 `frontend/` 返回通过。
  - 前端 typecheck：`npm run typecheck` 在 `frontend/` 返回通过。
  - 本轮未修改后端代码，未运行 `.venv/bin/pytest backend/tests -q`。
  - Docker 依赖服务：PostgreSQL / Redis healthy，MinIO Up。
  - 演示 seed 脚本：`.venv/bin/python backend/scripts/init_demo_data.py` 普通沙箱连接本机 Docker PostgreSQL 被拒绝；提权后成功输出默认 tenant、institution、package version、`MFG-QA-DEMO` 和演示用户。
  - 浏览器联调：后端使用 `FRONTEND_ORIGIN=http://127.0.0.1:3001` 启动在 `http://127.0.0.1:18000`，前端使用 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:18000 npm run dev -- --hostname 127.0.0.1 --port 3001` 启动在 `http://127.0.0.1:3001`。
  - 浏览器已验证：学生登录成功；进入已有 `MFG-QA-DEMO` session；初始展示 `stage_1=completed`、`stage_2=completed`、`stage_3=completed`、`stage_4=not_started`、`stage_5=locked`；保存 Dify 实现记录成功并生成 `stage_4_dify_implementation`，阶段四推进到 `in_practice`；保存测试报告成功并生成 `stage_4_test_report`；请求 AI 测试反馈成功并生成 `stage_4_ai_test_review` 和 AI Log 短 ID；完成阶段四后展示 `stage_4=completed`、`stage_5=not_started`。
  - DevTools Console 已检查，无应用错误；仅有 React DevTools、HMR 和 Chrome 扩展提示。
  - 验证后已停止本轮前端和后端本地 dev server，端口 `3001` 和 `18000` 无监听进程。
- 2026-05-04 阶段五“交付验收与运维说明”最小后端业务链路：
  - 新增测试红灯：`.venv/bin/pytest backend/tests/test_stage_five.py -q` 初始返回阶段五接口 404 等预期失败，`12 failed, 6 passed`。
  - 新增测试绿灯：`.venv/bin/pytest backend/tests/test_stage_five.py -q` 返回 `18 passed`。
  - 相邻模块回归：`.venv/bin/pytest backend/tests/test_stage_four.py backend/tests/test_stage_five.py -q` 返回 `33 passed`。
  - 后端全量测试：`.venv/bin/pytest backend/tests -q` 返回 `80 passed`。
  - 后端 Ruff：`.venv/bin/ruff check backend` 返回 `All checks passed!`。
  - 本轮未修改数据库模型，未产生 Alembic migration，因此未运行新的 `alembic upgrade head` / `alembic check`。
- 2026-05-04 阶段五学生端最小联调能力：
  - 前端 TDD 红灯：在 `frontend/app/page.tsx` 引用未实现的 `StageFivePanel` 后，`npm run typecheck` 返回缺少 `@/src/components/student-workspace/stage-five` 的预期错误。
  - 前端 typecheck：`npm run typecheck` 在 `frontend/` 返回通过。
  - 前端 lint：`npm run lint` 在 `frontend/` 返回通过。
  - 本轮未修改后端代码，未运行 `.venv/bin/pytest backend/tests -q`。
  - Docker 依赖服务：PostgreSQL / Redis healthy，MinIO Up。
  - 演示 seed 脚本：`.venv/bin/python backend/scripts/init_demo_data.py` 普通沙箱连接本机 Docker PostgreSQL 被拒绝；提权后成功输出默认 tenant、institution、package version、`MFG-QA-DEMO` 和演示用户。
  - 浏览器联调：后端使用 `FRONTEND_ORIGIN=http://127.0.0.1:3001` 启动在 `http://127.0.0.1:18000`，前端使用 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:18000 npm run dev -- --hostname 127.0.0.1 --port 3001` 启动在 `http://127.0.0.1:3001`。
  - 浏览器已验证：学生登录成功；进入已有 `MFG-QA-DEMO` session；初始展示 `stage_1=completed`、`stage_2=completed`、`stage_3=completed`、`stage_4=completed`、`stage_5=not_started`；保存交付说明成功并生成 `stage_5_delivery_document`；保存验收材料成功并生成 `stage_5_acceptance_package`；保存运维说明成功并生成 `stage_5_operations_guide`；请求 AI 交付审阅成功并生成 `stage_5_ai_delivery_review` 和 AI Log 短 ID；完成阶段五后工作区展示 `stage_5=completed`、`session=completed`。
  - DevTools Console 已检查，`console_errors []`，无明显应用错误。
  - 验证后已停止本轮前端和后端本地 dev server，端口 `3001` 和 `18000` 无监听进程。
- 2026-05-04 MVP 基础教师进度视图：
  - 新增测试红灯：`.venv/bin/pytest backend/tests/test_teacher_progress.py -q` 初始返回教师进度接口 404，确认 API 尚未实现。
  - 新增测试绿灯：`.venv/bin/pytest backend/tests/test_teacher_progress.py -q` 返回 `5 passed`。
  - 后端全量测试：`.venv/bin/pytest backend/tests -q` 返回 `85 passed`。
  - 后端 Ruff：`.venv/bin/ruff check backend` 返回 `All checks passed!`。
  - 前端 typecheck：`npm run typecheck` 在 `frontend/` 返回通过。
  - 前端 lint：`npm run lint` 在 `frontend/` 返回通过。
  - Docker 依赖服务：PostgreSQL / Redis healthy，MinIO Up。
  - Alembic 执行迁移：`.venv/bin/alembic upgrade head` 成功，无待执行迁移日志。
  - 演示 seed 脚本：`.venv/bin/python backend/scripts/init_demo_data.py` 普通沙箱连接本机 Docker PostgreSQL 被拒绝；提权后成功输出默认 tenant、institution、package version、`MFG-QA-DEMO` 和演示用户。
  - 浏览器联调：后端使用 `FRONTEND_ORIGIN=http://127.0.0.1:3001` 启动在 `http://127.0.0.1:18000`，前端使用 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:18000 npm run dev -- --hostname 127.0.0.1 --port 3001` 启动在 `http://127.0.0.1:3001`。
  - 浏览器已验证：教师 `teacher@edufde.demo` 登录成功；教师进度视图展示 `MFG-QA-DEMO`、演示学生 session、session status、五阶段状态与 Artifact 数量；阶段 Artifact 摘要可从 `stage_1` 切换到 `stage_5` 查看；DevTools console error 为空。
  - 验证后已停止本轮前端和后端本地 dev server，端口 `3001` 和 `18000` 无监听进程。
- 2026-05-04 MVP 基础学习画像最小链路：
  - 新增测试红灯：`.venv/bin/pytest backend/tests/test_learning_profile.py -q` 初始返回学习画像接口 404，确认 API 尚未实现。
  - 新增测试绿灯：`.venv/bin/pytest backend/tests/test_learning_profile.py -q` 返回 `5 passed`。
  - 后端全量测试：`.venv/bin/pytest backend/tests -q` 返回 `90 passed`。
  - 后端 Ruff：`.venv/bin/ruff check backend` 返回 `All checks passed!`。
  - 前端 typecheck：`npm run typecheck` 在 `frontend/` 返回通过。
  - 前端 lint：`npm run lint` 在 `frontend/` 返回通过。
  - 本轮未修改数据库模型，未产生 Alembic migration。
  - Docker 依赖服务：PostgreSQL / Redis healthy，MinIO Up。
  - Alembic 执行迁移：`.venv/bin/alembic upgrade head` 成功，无待执行迁移日志。
  - 演示 seed 脚本：`.venv/bin/python backend/scripts/init_demo_data.py` 普通沙箱连接本机 Docker PostgreSQL 被拒绝；提权后成功输出默认 tenant、institution、package version、`MFG-QA-DEMO` 和演示用户。
  - 浏览器联调：后端使用 `FRONTEND_ORIGIN=http://127.0.0.1:3001` 启动在 `http://127.0.0.1:18000`，前端使用 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:18000 npm run dev -- --hostname 127.0.0.1 --port 3001` 启动在 `http://127.0.0.1:3001`。
  - 浏览器已验证：学生 `student@edufde.demo` 登录后可看到“当前学习画像”，包含阶段完成、Artifact、AI 反馈、优势、风险和下一步；教师 `teacher@edufde.demo` 登录后可在教师进度视图看到选中学生的“学生学习画像”；学习画像 API 请求返回 200。
  - DevTools console error 已检查，返回 `[]`。
  - 验证后已停止本轮前端和后端本地 dev server。

Git 状态：

- 当前目录已确认是 Git 仓库，当前分支为 `main`。
- 本轮数据库地基初始化改动已通过本地 Git commit `feat: initialize database foundation` 记录。
- 后端测试：`2 passed`。
- 后端 health：`http://127.0.0.1:18000/health` 返回 `{"status":"ok","service":"EduFDE Core API","environment":"local","version":"0.1.0"}`。标准端口仍按 README 使用 `8000`；本机验证时 `8000` 被占用，改用 `18000`。
- 前端 lint：通过。
- 前端 typecheck：通过。
- 前端页面：`http://127.0.0.1:13000` 返回包含 `EduFDE MVP` 与 `AI 智能体项目交付实训平台` 的占位页 HTML。标准端口仍按 README 使用 `3000`。
- 前端生产依赖审计：`npm audit --omit=dev` 显示 `found 0 vulnerabilities`。
- Docker Compose 配置：通过。
- Docker 依赖服务：PostgreSQL 和 Redis 为 `healthy`；MinIO `Up`；`minio-init` `Exited (0)`。

## 六、开放风险

- MVP 范围容易膨胀，第一轮实现应聚焦结构性地基。
- 阶段一 AI 客户质量是最大产品体验风险。
- 阶段二 AI 评审必须从一开始绑定结构化 Rubric 和证据。
- Dify 集成应尽早验证，避免阶段四后期返工。
- 本机默认 `python3` 是 3.9.6；后端开发应使用 Python 3.11+，本轮实际使用 `/Users/dkleeaye/.local/bin/python3.12` 创建 `.venv`。
