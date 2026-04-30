# EduFDE Frontend

Next.js App Router frontend for the EduFDE MVP.

## Local Setup

```bash
npm install
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

Open `http://localhost:3000`.

If port `8000` is occupied, start the backend on another local port and set
`NEXT_PUBLIC_API_BASE_URL` accordingly.

## Validation

```bash
npm run lint
npm run typecheck
```

## Scope

Current scope:

- Student login against `/api/v1/auth/login`.
- Current user loading through `/api/v1/auth/me`.
- Course and experiment session bootstrap for the demo course.
- Stage one AI customer interview.
- Stage one problem summary save.
- Stage one Artifact list.

Teacher, admin, later stages, learning profile, AI review, and production authentication flows will be implemented in later slices.
