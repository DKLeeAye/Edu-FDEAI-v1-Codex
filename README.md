# EduFDE

EduFDE is an AI agent project delivery training platform for universities. The MVP starts with a modular monolith backend, a single Next.js frontend, and local infrastructure for PostgreSQL, Redis, and MinIO.

## Repository Layout

```text
backend/          FastAPI backend scaffold
frontend/         Next.js App Router frontend scaffold
docker-compose.yml
.env.example      Local environment template
docs/             v2.0 product, architecture, and development governance docs
```

## Local Prerequisites

- Python 3.11+
- Node.js 20+
- Docker Desktop or Docker Engine with Compose

## Environment

```bash
cp .env.example .env
```

## Start Dependency Services

```bash
docker compose --env-file .env up -d postgres redis minio minio-init
docker compose ps
```

If Docker Desktop is installed but `docker` is not in your shell `PATH`, use:

```bash
PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH" /Applications/Docker.app/Contents/Resources/bin/docker compose --env-file .env up -d postgres redis minio minio-init
```

Service URLs:

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

## Start Backend

```bash
python3.12 -m venv .venv
.venv/bin/pip install -r backend/requirements-dev.txt
.venv/bin/uvicorn app.main:app --app-dir backend --reload --host 0.0.0.0 --port 8000
```

Validate:

```bash
curl http://localhost:8000/health
.venv/bin/pytest backend/tests
```

## Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

Validate:

```bash
cd frontend
npm run lint
npm run typecheck
```

## MVP Scope Guardrails

This scaffold deliberately does not implement business modules yet. Later slices will add authentication, tenant/institution/course scope enforcement, experiment package versions, Artifact, AI Gateway, AI call logs, Rubric, yellow-flag debt, project portfolios, stages, teacher views, and learning profiles.

All AI calls must go through the future AI Gateway boundary. Stage services must not call model providers directly.
