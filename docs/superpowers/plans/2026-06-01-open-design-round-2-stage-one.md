# Open Design Round 2 Stage One Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replicate the Open Design Stage 01 requirement interview flow in production Next.js: `06-interview-guide.html`, `06-interview-lab.html`, and `06-interview-submit.html`, while keeping real AI Gateway, Artifact, evaluation, and stage completion behavior.

**Architecture:** Treat all Stage 01 vNext steps as focused Open Design pages. Keep the existing stage state machine and API handlers, but remove old AppShell/workspace wrapping from guide, lab, and submit.

---

### Task 1: Focused Stage Shell

- [x] Include `guide`, `lab`, and `submit` in the Stage 01 focused workspace decision.
- [x] Keep old guided-training compatibility functions unchanged for historical tests and non-vNext compatibility.
- [x] Update tests to assert that every Stage 01 vNext step uses the focused Open Design layout.

### Task 2: Guide Page

- [x] Replace the old Tailwind guide surface with Open Design `06-interview-guide.html` structure.
- [x] Preserve current stage status, interview count, refresh action, and start-interview action.
- [x] Implement the readiness checklist and progress indicator in React.

### Task 3: Interview Lab

- [x] Replace the old Tailwind lab surface with Open Design `06-interview-lab.html` structure.
- [x] Preserve AI Gateway-backed customer replies through the existing `onAskCustomer` handler.
- [x] Preserve visit-note draft editing and save behavior.
- [x] Preserve insight cards, suggested questions, scoring, and finish-to-submit navigation.

### Task 4: Submit Page

- [x] Replace the old Tailwind submit surface with Open Design `06-interview-submit.html` structure.
- [x] Preserve visit notes save, summary save, AI evaluation, gate checks, and stage completion.
- [x] Add explicit submit-page navigation back to guide and lab.
- [x] Preserve completed-session behavior with real backend state.

### Task 5: Verification

- [x] `cd frontend && npm run typecheck`
- [x] `cd frontend && npm run lint`
- [x] `cd frontend && npm run test:stage-one`
- [x] `git diff --check`
- [x] Capture reference and production screenshots for guide, lab, and submit pages.

Screenshots:

- `/private/tmp/edufde-v2-round2-ref-interview-guide.png`
- `/private/tmp/edufde-v2-round2-prod-interview-guide.png`
- `/private/tmp/edufde-v2-round2-ref-interview-lab.png`
- `/private/tmp/edufde-v2-round2-prod-interview-lab.png`
- `/private/tmp/edufde-v2-round2-ref-interview-submit.png`
- `/private/tmp/edufde-v2-round2-prod-interview-submit.png`

Known deviation:

- The production screenshots use the real demo student session, which is already completed. Therefore the submit page shows `已提交`, `5/5`, saved drafts, and real Artifact-derived text, while the static prototype shows an in-progress empty state.
