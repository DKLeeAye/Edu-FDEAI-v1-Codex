# EduFDE 开发进度

> 每个开发会话结束时更新本文件。

## 一、当前阶段

MVP 平台地基阶段：项目脚手架、本地开发环境、数据库连接、基础模型、Alembic 迁移框架、最小认证与当前用户上下文、演示实验包初始化、课程 / session 最小创建链路、Artifact service/API 与 AI Gateway 最小边界已初始化。

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

## 三、尚未开始

- 阶段模块
- 教师视图
- 学习画像
- 部署

## 四、当前推荐下一步任务

阶段一“需求访谈与问题发现”最小后端业务链路。

建议范围：

- 基于 AI Gateway fake provider 先实现 AI 客户最小调用链路，不接真实模型供应商。
- 阶段一访谈记录和整理输出必须保存为 Artifact。
- 保持 AI 客户完整体验、AI 评审、Rubric 评分按后续独立切片推进。

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
