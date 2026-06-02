# EduFDE Backend

FastAPI backend for the EduFDE MVP. Current scope includes authentication, demo experiment package seed, courses, experiment sessions, five stage APIs, Artifact APIs, AI Gateway fake provider, configurable SiliconFlow provider, AI call logs, teacher progress, and rule-based learning profile.

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

## AI Provider Configuration

The backend defaults to the SiliconFlow provider. Fill the API key and model in your local `.env` before making real AI calls:

```bash
AI_PROVIDER=siliconflow
SILICONFLOW_API_KEY=
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=Pro/zai-org/GLM-5.1
SILICONFLOW_CUSTOMER_MODEL=deepseek-ai/DeepSeek-V4-Flash
SILICONFLOW_REASONING_MODEL=Pro/zai-org/GLM-5.1
AI_TIMEOUT_SECONDS=90
```

`SILICONFLOW_MODEL` is the fallback model. `SILICONFLOW_CUSTOMER_MODEL` is used for high-frequency Stage 1 customer-simulation dialogue usages. `SILICONFLOW_REASONING_MODEL` is used for guided feedback, Stage 1 practice evaluation, and stage review/evaluation usages. Reasoning calls can take substantially longer than customer-simulation turns, so keep `AI_TIMEOUT_SECONDS` at 90 seconds or higher when using slower reasoning models.

For deterministic local development without real model calls, explicitly switch the gateway to fake:

```bash
AI_PROVIDER=fake
```

SiliconFlow is called with the OpenAI-compatible chat completions shape at `POST /chat/completions`. For keys created in the China console, use `https://api.siliconflow.cn/v1`; other SiliconFlow environments can override `SILICONFLOW_BASE_URL` as needed. Do not commit a real API key. If `AI_PROVIDER=siliconflow` is enabled without API key, base URL, or model, the gateway returns a clear configuration error and writes a failed `ai_call_logs` record.

## Demo Data

`backend/scripts/init_demo_data.py` is idempotent and restores the demo login contract on repeated runs.

Demo password: `EduFDE-demo-123`

- `student@edufde.demo`
- `student2@edufde.demo`
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

- All AI calls go through `backend/app/ai_gateway/`; default provider is SiliconFlow, and deterministic fake AI is available through `AI_PROVIDER=fake`.
- Stage services are student-write only and persist outputs as Artifact.
- Teacher read APIs are read-only and currently use `courses.created_by_user_id` as the MVP permission boundary.
- Real Dify API integration, formal course membership, teacher scoring, and deployment packaging are deferred.
