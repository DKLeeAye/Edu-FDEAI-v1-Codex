# EduFDE

EduFDE 是面向高校的 AI 智能体项目交付实训平台。当前仓库已经完成 MVP 最小闭环：学生端五阶段联调路径、教师基础进度视图、Artifact 摘要和基础学习画像。

当前前端仍是联调页，不是正式产品 UI。MVP 继续保留实验包版本绑定、统一 Artifact、AI Gateway、AI 调用日志、Rubric 最小模型和 tenant / institution / course 作用域边界。

## Repository Layout

```text
backend/          FastAPI backend
frontend/         Next.js App Router frontend
docker-compose.yml
.env.example      Local environment template
docs/             v2.0 product, architecture, and development governance docs
```

## Local Prerequisites

- Python 3.11+
- Node.js 20+
- Docker Desktop or Docker Engine with Compose

## Demo Startup

1. Create local environment:

```bash
cp .env.example .env
```

2. Start dependency services:

```bash
docker compose --env-file .env up -d postgres redis minio minio-init
docker compose --env-file .env ps -a
```

If Docker Desktop is installed but `docker` is not in your shell `PATH`, use:

```bash
PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH" /Applications/Docker.app/Contents/Resources/bin/docker compose --env-file .env up -d postgres redis minio minio-init
```

3. Prepare backend environment:

```bash
python3.12 -m venv .venv
.venv/bin/pip install -r backend/requirements-dev.txt
```

4. Run migrations and seed demo data:

```bash
.venv/bin/alembic upgrade head
.venv/bin/python backend/scripts/init_demo_data.py
```

5. Start backend:

```bash
.venv/bin/uvicorn app.main:app --app-dir backend --reload --host 0.0.0.0 --port 8000
```

6. Start frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Demo Accounts

All demo accounts use the same password: `EduFDE-demo-123`.

- Student: `student@edufde.demo`
- Teacher: `teacher@edufde.demo`
- Admin seed account: `admin@edufde.demo`

当前联调页支持 student 和 teacher 登录。Admin 账号用于保留后端作用域连续性，当前联调页不提供 admin 工作流。

## Validation

Backend:

```bash
.venv/bin/pytest backend/tests -q
.venv/bin/ruff check backend
```

Frontend:

```bash
cd frontend
npm run lint
npm run typecheck
```

Optional checks:

```bash
curl http://localhost:8000/health
.venv/bin/alembic check
.venv/bin/python backend/scripts/check_db.py
```

## Local Service URLs

- Backend API: `http://localhost:8000`
- Frontend: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

## MVP Guardrails

- Do not call model providers directly from stage services; use `backend/app/ai_gateway/`.
- Demo AI behavior currently uses the deterministic fake provider.
- Stage outputs must be stored as Artifact.
- Courses must bind `experiment_package_versions.id`.
- Teacher read access is still an MVP temporary boundary based on `courses.created_by_user_id`; a formal `course_members` model is intentionally deferred.
- Real Dify API integration, real model provider integration, formal product UI, teacher scoring, and deployment are outside the current MVP closure scope.
