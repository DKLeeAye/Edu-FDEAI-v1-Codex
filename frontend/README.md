# EduFDE Frontend

Next.js App Router frontend for the EduFDE MVP. Current UI is a local integration page for demonstrating the student five-stage flow, teacher progress view, Artifact summaries, and learning profiles. It is not the final product UI.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

By default the frontend calls `http://localhost:8000`. To point at another backend:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

## Demo Accounts

Use the seed script from the repository root before logging in:

```bash
.venv/bin/python backend/scripts/init_demo_data.py
```

Demo password: `EduFDE-demo-123`

- Student: `student@edufde.demo`
- Fresh student: `student2@edufde.demo`
- Teacher: `teacher@edufde.demo`

The login form defaults to the student account. Enter the teacher email with the same password to switch to the teacher progress view.

## Demonstrable Flows

Student:

- Login.
- Enter or create the `MFG-QA-DEMO` course session.
- Complete stages 1 through 5.
- Confirm session status becomes `completed`.
- View the current learning profile.

Teacher:

- Login.
- View own course sessions.
- Inspect per-stage progress and Artifact summaries.
- View the selected student's learning profile.

## Validation

```bash
npm run lint
npm run typecheck
```

## Current Boundaries

- The page intentionally uses direct component state and a lightweight API client.
- React Query, Zustand, formal route structure, and final product information architecture are deferred.
- No real model provider or real Dify API is connected from the frontend.
