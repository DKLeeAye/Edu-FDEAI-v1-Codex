# EduFDE 开发进度

> 每个开发会话结束时更新本文件。

## 一、当前阶段

MVP 平台地基阶段：项目脚手架和本地开发环境已初始化。

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

## 三、尚未开始

- 数据库迁移
- 认证
- 实验包种子数据
- AI Gateway
- Artifact 模型
- 阶段模块
- 教师视图
- 学习画像
- 部署

## 四、当前推荐下一步任务

初始化数据库与基础迁移框架。

建议范围：

- 添加 Alembic 初始化配置。
- 创建数据库连接和 SQLAlchemy Base。
- 只建立下一阶段需要的基础模型边界，不提前实现完整业务流程。
- 优先处理 tenant/institution/course 作用域、实验包版本、Artifact、AI 调用日志、黄灯债务、Rubric 的最小模型设计。

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
- 当前目录不是 Git 仓库，无法在本地执行提交级治理。
- 本机默认 `python3` 是 3.9.6；后端开发应使用 Python 3.11+，本轮实际使用 `/Users/dkleeaye/.local/bin/python3.12` 创建 `.venv`。
