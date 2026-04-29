# EduFDE Backend

FastAPI backend scaffold for the EduFDE MVP.

## Local Setup

```bash
python3.12 -m venv ../.venv
../.venv/bin/pip install -r requirements-dev.txt
../.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

## Validation

```bash
../.venv/bin/pytest
```

## Database

Run migrations from the repository root:

```bash
.venv/bin/alembic upgrade head
.venv/bin/alembic check
```

Optional direct connection smoke test for a normal local terminal:

```bash
.venv/bin/python backend/scripts/check_db.py
```

## Scope

This scaffold intentionally contains only platform wiring and health endpoints. Business modules such as authentication, experiment packages, Artifact, AI Gateway implementation, stage workflows, and learning profiles will be added in later MVP slices.
