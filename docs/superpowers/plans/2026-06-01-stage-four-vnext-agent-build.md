# Stage Four vNext Agent Build And Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the formal Stage Four student path with the Open Design vNext agent implementation flow while preserving existing Stage Four Dify implementation, test report, AI Gateway review, and Stage Five unlock contracts.

**Architecture:** Add vNext step and payload helpers in `stage-four-flow.ts`, then refactor `StageFourWorkspace` to render `guide -> onboarding -> build -> test`. Onboarding is local instructional/process state in P0; build saves the existing implementation Artifact; test score saves the existing test report Artifact, then uses existing AI review and completion APIs.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, FastAPI, existing Stage Four API and Artifact contracts.

**Completion note (2026-06-01):** Implemented and verified. The formal Stage Four path now renders `guide -> onboarding -> build -> test`; build saves `stage_4_dify_implementation`, the test score screen saves `stage_4_test_report`, AI review saves `stage_4_ai_test_review`, and completion unlocks Stage Five without changing the backend contract.

**Verification evidence:** `npm run test:stage-four`, `npm run test:stage-one`, `npm run test:stage-two`, `npm run test:stage-three`, `npm run typecheck`, `npm run lint`, and `.venv/bin/python -m pytest backend/tests/test_stage_four.py -q` passed. Browser fallback verification used headless Chrome CDP because the Browser plugin route was unavailable; it completed the full Stage Four vNext flow and confirmed DB state `stage_4=completed`, `stage_5=not_started` with implementation, test report, and AI test review artifacts. Screenshot: `/private/tmp/edufde-stage-four-vnext-completed.png`.

---

## File Structure

- Modify `frontend/src/components/student-product/stage-four-flow.ts`: replace formal mode with vNext step, add guide/onboarding/build/test specs, gates, implementation payload mapping, simulated platform test run, test report payload mapping, and vNext step derivation.
- Modify `frontend/src/components/student-product/stage-four-flow.test.ts`: add TDD coverage for vNext step derivation, guide/onboarding/build gates, payload mapping, platform test run, and progress state.
- Modify `frontend/src/components/student-product/experiment-workspace.tsx`: change Stage Four state handling to derived/manual vNext step state like Stages One to Three.
- Modify `frontend/src/components/student-product/stage-four-workspace.tsx`: replace the old homepage/task-rail formal path with vNext guide, onboarding, build, and test render paths.
- Modify `docs/dev/current-context.md`: update current recommendation after Stage Four P0 progresses.
- Modify `docs/dev/progress.md`: record Stage Four vNext P0 implementation and verification results.

## Task 1: Add vNext Flow Tests And Helpers

**Files:**
- Modify: `frontend/src/components/student-product/stage-four-flow.test.ts`
- Modify: `frontend/src/components/student-product/stage-four-flow.ts`

- [x] **Step 1: Write failing tests**

Add coverage for:

- `deriveStageFourVNextStep([], "not_started") === "guide"`.
- implementation/test/review/completed artifacts all derive to `test`.
- all vNext modes are focused.
- guide gate requires four checks.
- onboarding gate requires eight checked steps, all required fields, and valid publish URL.
- build gate requires 12 checked steps, all required fields, and valid publish URL.
- build draft maps into `StageFourDifyImplementationPayload`.
- deterministic platform test run reaches a score above 80 and has no severe failure.
- platform test run maps into `StageFourTestReportPayload` with Suite A-D coverage and warning remediation.

- [x] **Step 2: Run stage-four tests and confirm RED**

```bash
cd frontend
npm run test:stage-four
```

- [x] **Step 3: Implement helpers**

Implement:

- `StageFourMode = "guide" | "onboarding" | "build" | "test"`.
- `deriveStageFourVNextStep`.
- `isStageFourFocusedMode`.
- guide/onboarding/build/check constants.
- onboarding and build draft types.
- `isStageFourGuideReady`.
- `isStageFourOnboardingReady`.
- `isStageFourBuildReady`.
- `createStageFourImplementationPayloadFromVNext`.
- deterministic platform test specs and `createStageFourPlatformTestRun`.
- `createStageFourTestReportPayloadFromRun`.

- [x] **Step 4: Run stage-four tests and confirm GREEN**

```bash
cd frontend
npm run test:stage-four
```

## Task 2: Wire Stage Four Step Recovery In ExperimentWorkspace

**Files:**
- Modify: `frontend/src/components/student-product/experiment-workspace.tsx`

- [x] Add `derivedStageFourStep = deriveStageFourVNextStep(...)`.
- [x] Replace `useState<StageFourMode>("home")` with `DerivedStepState<StageFourMode>`.
- [x] Reset Stage Four state to derived in `handleStageSelect`.
- [x] Pass manual `onModeChange` to `StageFourWorkspace`.
- [x] Keep focused layout behavior using `isStageFourFocusedMode`.

## Task 3: Replace Stage Four Formal UI With vNext Flow

**Files:**
- Modify: `frontend/src/components/student-product/stage-four-workspace.tsx`

- [x] Replace the old `home/build_test_workbench` branch with four vNext branches.
- [x] Implement `StageFourGuideView`.
- [x] Implement `StageFourOnboardingView`.
- [x] Implement `StageFourBuildView`.
- [x] Implement `StageFourTestScoreView`.
- [x] Preserve existing save/review/complete callbacks.
- [x] Preserve locked and completed stage behavior.
- [x] Remove formal UI copy that implies the old Stage Four homepage/task-rail model.

## Task 4: Verify Contracts And Regressions

**Files:**
- No required edits unless failures expose issues.

- [x] Run front-end unit tests:

```bash
cd frontend
npm run test:stage-four
npm run test:stage-one
npm run test:stage-two
npm run test:stage-three
```

- [x] Run front-end static checks:

```bash
cd frontend
npm run typecheck
npm run lint
```

- [x] Run backend Stage Four regression:

```bash
.venv/bin/python -m pytest backend/tests/test_stage_four.py -q
```

## Task 5: Browser Verification

**Files:**
- No required edits unless browser verification exposes issues.

- [x] Start local backend and frontend.
- [x] Use Browser plugin first if available; if the Browser route is unavailable, use headless Chrome CDP fallback and record that reason.
- [x] On a session with Stage Three completed and Stage Four unlocked, verify:
  - Stage Four opens on "把知识库决策转成可运行的质检智能体。"
  - guide checks move to Dify onboarding;
  - onboarding demo/manual data saves and moves to build;
  - build demo/manual data saves implementation and moves to test;
  - test score loads target, runs simulated tests, saves test report, requests AI review, and completes Stage Four;
  - Stage Five unlocks.
- [x] Capture screenshots to `/private/tmp`.
- [x] Confirm browser console error/warn count is 0, except known favicon 404 if present.

## Task 6: Update Governance Docs

**Files:**
- Modify: `docs/dev/current-context.md`
- Modify: `docs/dev/progress.md`

- [x] Record Stage Four P0 completion, verification commands, browser evidence, and known boundaries.
- [x] Update the next recommended task to Stage Five vNext delivery/acceptance P0 if Stage Four is complete.

## Acceptance Criteria

- Stage Four no longer presents the old homepage/task-rail as the formal product path.
- Stage Four formal path is `guide -> onboarding -> build -> test`.
- Existing Stage Four backend API and Artifact types remain compatible.
- AI review still goes through AI Gateway.
- Completion still unlocks Stage Five.
- Required tests and browser verification pass or any unverified area is explicitly documented.
