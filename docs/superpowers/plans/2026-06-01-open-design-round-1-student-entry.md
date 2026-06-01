# Open Design Round 1 Student Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replicate the Open Design student entry flow after login: `student-home.html`, `student-experiment-detail.html`, and `05-student-project.html`, while keeping course, session, learning profile, Artifact, and stage state backed by the real EduFDE API.

**Architecture:** Keep the root authenticated state machine in `frontend/app/page.tsx`, but route the first student experience through Open Design vNext shells before entering the existing detailed stage workspaces.

**Tech Stack:** Next.js App Router, React, TypeScript, Open Design CSS, existing FastAPI course/session/artifact APIs.

---

### Task 1: Student Home

**Files:**

- Modify: `frontend/src/components/student-product/course-list.tsx`
- Modify: `frontend/app/page.tsx`

- [x] Replace the old authenticated course list visual shell with the Open Design `student-home.html` structure.
- [x] Preserve real courses, experiment sessions, learning profile, and continue actions.
- [x] Render the authenticated `courses` view outside the old `AppShell` so it can match the Open Design student layout.

### Task 2: Experiment Detail

**Files:**

- Create: `frontend/src/components/student-product/student-experiment-detail.tsx`
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/open-design-vnext.css`

- [x] Implement the Open Design `student-experiment-detail.html` / manufacturing quality experiment page.
- [x] Change course entry to open the experiment detail page first instead of jumping directly into the old workspace.
- [x] Connect stage rows to the real stage workspace via `StageKey`.
- [x] Preserve portfolio and student-home navigation.
- [x] Add button styling overrides so the React buttons inherit the static prototype link/card styling.

### Task 3: Student Project Overview

**Files:**

- Create: `frontend/src/components/student-product/student-project-overview.tsx`
- Modify: `frontend/app/page.tsx`

- [x] Implement the Open Design `05-student-project.html` structure as a React overview shell.
- [x] Connect metrics, active stage, artifact count, and artifact table to real session/profile/artifact data.
- [x] Route the primary action into the current stage workspace.
- [x] Keep the project overview separate from the detailed stage workspace for visual parity with the Open Design entry flow.

### Task 4: Verification

**Commands:**

- [x] `cd frontend && npm run typecheck`
- [x] `cd frontend && npm run lint`
- [x] `git diff --check`
- [x] Capture reference screenshots from `http://127.0.0.1:4175/screens/student-experiment-detail.html`.
- [x] Capture reference screenshots from `http://127.0.0.1:4175/screens/05-student-project.html`.
- [x] Capture production screenshots through real student login on `http://127.0.0.1:3001`.

Verification evidence:

- Typecheck passed.
- Lint passed.
- `git diff --check` passed.
- Screenshots:
  - `/private/tmp/edufde-v2-round1-ref-student-home.png`
  - `/private/tmp/edufde-v2-round1-prod-student-home.png`
  - `/private/tmp/edufde-v2-round1-ref-experiment-detail.png`
  - `/private/tmp/edufde-v2-round1-prod-experiment-detail.png`
  - `/private/tmp/edufde-v2-round1-ref-project-overview.png`
  - `/private/tmp/edufde-v2-round1-prod-project-overview.png`

Known deviation:

- Production pages are now real data-driven, so names, active stage, completion percentage, artifact count, and artifact rows can differ from the static Open Design screenshots. The visual shell, layout hierarchy, typography, spacing, and navigation order remain the fidelity target.
