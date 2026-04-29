# EduFDE 开发进度

> 每个开发会话结束时更新本文件。

## 一、当前阶段

MVP 平台地基阶段：项目脚手架、本地开发环境、数据库连接、基础模型和 Alembic 迁移框架已初始化。

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

## 三、尚未开始

- 认证
- 实验包种子数据
- AI Gateway
- Artifact 模型
- 阶段模块
- 教师视图
- 学习画像
- 部署

## 四、当前推荐下一步任务

认证与用户 / session 基础。

建议范围：

- 保持简单枚举角色 `admin` / `teacher` / `student`。
- 实现最小登录/session 或本地演示身份注入方案。
- 不提前实现完整 RBAC/ABAC。
- 服务层开始显式注入 tenant / institution / course 作用域，为后续课程和实验 session 创建做准备。

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
