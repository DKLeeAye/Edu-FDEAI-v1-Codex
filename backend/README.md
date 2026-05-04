# EduFDE Backend

FastAPI backend for the EduFDE MVP. Current scope includes authentication, demo experiment package seed, courses, experiment sessions, five stage APIs, Artifact APIs, AI Gateway fake provider, AI call logs, teacher progress, and rule-based learning profile.

## Local Setup

Run commands from the repository root unless noted.

```bash
python3.12 -m venv .venv
.venv/bin/pip install -r backend/requirements-dev.txt
```

Start dependency services:

```bash
docker compose --env-file .env up -d postgres redis minio minio-init
docker compose --env-file .env ps -a
```

Run migrations and seed demo data:

```bash
.venv/bin/alembic upgrade head
.venv/bin/python backend/scripts/init_demo_data.py
```

Start the API:

```bash
.venv/bin/uvicorn app.main:app --app-dir backend --reload --host 0.0.0.0 --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/health
```

## Demo Data

`backend/scripts/init_demo_data.py` is idempotent and restores the demo login contract on repeated runs.

Demo password: `EduFDE-demo-123`

- `student@edufde.demo`
- `teacher@edufde.demo`
- `admin@edufde.demo`

Default course:

- Code: `MFG-QA-DEMO`
- Package version: manufacturing QA agent `1.0.0`

## Validation

```bash
.venv/bin/pytest backend/tests -q
.venv/bin/ruff check backend
```

Database schema checks:

```bash
.venv/bin/alembic check
.venv/bin/python backend/scripts/check_db.py
```

## Current Boundaries

- All AI calls go through `backend/app/ai_gateway/`; current provider is deterministic fake AI.
- Stage services are student-write only and persist outputs as Artifact.
- Teacher read APIs are read-only and currently use `courses.created_by_user_id` as the MVP permission boundary.
- Real model providers, real Dify API integration, formal course membership, teacher scoring, and deployment packaging are deferred.
