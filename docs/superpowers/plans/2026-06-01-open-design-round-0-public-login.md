# Open Design Round 0 Public Entry And Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replicate the Open Design `index.html#login-entry` and `login.html` pages in the production Next.js frontend and connect login to the real backend authentication flow.

**Architecture:** Use a dedicated vNext public module for the marketing entry and login portal. Migrate the Open Design CSS baseline into the frontend app, keep the existing authenticated workspace as the post-login destination, and replace the previous unauthenticated React login screen.

**Tech Stack:** Next.js App Router, React, TypeScript, Open Design CSS, existing FastAPI authentication API.

---

### Task 1: Visual Baseline

**Files:**

- Create: `frontend/app/open-design-vnext.css`
- Modify: `frontend/app/layout.tsx`

- [x] Copy the Open Design CSS baseline from `docs/prototypes/open-design-vnext/assets/app.css` into `frontend/app/open-design-vnext.css`.
- [x] Import the new CSS in `frontend/app/layout.tsx` after `globals.css`.
- [x] Update metadata title and description to match the Open Design public entry.

### Task 2: Shared Auth Storage

**Files:**

- Create: `frontend/src/lib/auth-storage.ts`
- Modify: `frontend/app/page.tsx`

- [x] Move the production access-token storage key to `frontend/src/lib/auth-storage.ts`.
- [x] Import the key from both the root app and login portal.

### Task 3: Public Entry Page

**Files:**

- Create: `frontend/src/components/vnext-public/marketing-home.tsx`
- Modify: `frontend/app/page.tsx`

- [x] Create a React implementation of Open Design `index.html`.
- [x] Preserve `#login-entry` as the unified account portal section.
- [x] Replace the unauthenticated root view with the Open Design public entry.
- [x] Keep authenticated root behavior unchanged for now, so login can still enter the existing workspace.

### Task 4: Login Page

**Files:**

- Create: `frontend/src/components/vnext-public/login-portal.tsx`
- Create: `frontend/app/login/page.tsx`

- [x] Create a React implementation of Open Design `login.html`.
- [x] Support role selection from the `role` query parameter.
- [x] Use demo account defaults for student, teacher, and admin.
- [x] Submit credentials through the existing `login` API helper.
- [x] Store the access token and route back to `/` after successful login.

### Task 5: Verification

**Commands:**

- [x] `cd frontend && npm run typecheck`
- [x] `cd frontend && npm run lint`
- [x] Start production frontend against a backend API.
- [x] Compare `http://127.0.0.1:4175/index.html#login-entry` with production `/`.
- [x] Compare `http://127.0.0.1:4175/login.html?role=student` with production `/login?role=student`.
- [x] Verify student login API path against the current EduFDE backend.
- [x] Record screenshots and any deviations in `docs/dev/progress.md`.

Verification evidence:

- Typecheck passed.
- Lint passed.
- Current EduFDE backend health: `http://127.0.0.1:18002/health`.
- Student login API returned bearer token through `POST /api/v1/auth/login`.
- Screenshots:
  - `/private/tmp/edufde-v2-round0-ref-top.png`
  - `/private/tmp/edufde-v2-round0-prod-home.png`
  - `/private/tmp/edufde-v2-round0-ref-login.png`
  - `/private/tmp/edufde-v2-round0-prod-login.png`

Known deviation:

- `index.html#login-entry` screenshots through headless Chrome capture a blank viewport because the static prototype's anchor/reveal interaction does not render correctly in this screenshot mode. The top-of-page reference screenshot renders correctly and matches production top-of-page. Manual browser viewing remains available through `http://127.0.0.1:4175/index.html#login-entry`.
- Production `/login?role=student` pre-fills demo credentials for local verification; the Open Design static reference shows empty inputs. This is an intentional development convenience and can be hidden behind a visual-QA mode later.
