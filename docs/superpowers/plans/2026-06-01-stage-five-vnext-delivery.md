# Stage Five vNext Delivery And Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the formal Stage Five student path with the Open Design vNext delivery document and acceptance confirmation flow while preserving existing Stage Five delivery document, acceptance package, operations guide, AI Gateway review, and final completion contracts.

**Architecture:** Add vNext helper types and payload mapping in `stage-five-flow.ts`, refactor `StageFiveWorkspace` to render `document -> acceptance`, and wire Stage Five mode state into `ExperimentWorkspace` so Stage Five uses focused vNext layout like Stages One to Four.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, FastAPI, existing Stage Five API and Artifact contracts.

**Completion note (2026-06-01):** Implemented and verified. The formal Stage Five path now renders `document -> acceptance`; document submit saves `stage_5_delivery_document` and `stage_5_operations_guide`, acceptance save creates `stage_5_acceptance_package`, AI review creates `stage_5_ai_delivery_review`, and final completion completes the project/session without changing the backend contract.

**Verification evidence:** `npm run test:stage-five`, `npm run test:stage-four`, `npm run test:stage-one`, `npm run test:stage-two`, `npm run test:stage-three`, `npm run typecheck`, `npm run lint`, and `.venv/bin/python -m pytest backend/tests/test_stage_five.py -q` passed. Browser fallback verification used headless Chrome CDP because the Browser plugin route was unavailable; it completed the full Stage Five vNext flow and confirmed DB state `session=completed`, `stage_5=completed`, with all four Stage Five artifacts present. Screenshots: `/private/tmp/edufde-stage-five-vnext-document.png`, `/private/tmp/edufde-stage-five-vnext-acceptance.png`, `/private/tmp/edufde-stage-five-vnext-completed.png`, `/private/tmp/edufde-stage-five-vnext-mobile.png`.

---

## File Structure

- Add `frontend/src/components/student-product/stage-five-flow.ts`: vNext mode, chapter model, chapter scoring, readiness gates, delivery/operations/acceptance payload mapping, step derivation, and deterministic acceptance questions.
- Add `frontend/src/components/student-product/stage-five-flow.test.ts`: TDD coverage for step derivation, document gates, scoring, payload mapping, acceptance gates, and acceptance payload creation.
- Modify `frontend/package.json`: add `test:stage-five`.
- Modify `frontend/src/components/student-product/experiment-workspace.tsx`: add derived/manual Stage Five mode state and focused layout behavior.
- Modify `frontend/src/components/student-product/stage-five-workspace.tsx`: replace old three-form formal UI with vNext document and acceptance views while preserving callbacks.
- Modify `docs/dev/current-context.md`: update current recommendation after Stage Five P0 progresses.
- Modify `docs/dev/progress.md`: record Stage Five vNext P0 implementation and verification results.

## Task 1: Add vNext Flow Tests And Helpers

**Files:**
- Add: `frontend/src/components/student-product/stage-five-flow.test.ts`
- Add: `frontend/src/components/student-product/stage-five-flow.ts`
- Modify: `frontend/package.json`

- [x] **Step 1: Write failing tests**

Add coverage for:

- `deriveStageFiveVNextStep([], "not_started") === "document"`.
- delivery+operations, acceptance, review, or completed stage derive to `acceptance`.
- all vNext modes are focused.
- six chapter keys are required for document readiness.
- local chapter scoring returns pass for complete customer/evidence/boundary text and revise/rewrite for weak text.
- full chapter drafts map to existing `StageFiveDeliveryDocumentPayload`.
- full chapter drafts map to existing `StageFiveOperationsGuidePayload`.
- acceptance readiness requires target, package checks, saved document/operations artifacts, simulated review, signoff decision, signoff note, and archive checks.
- acceptance state maps to existing `StageFiveAcceptancePackagePayload`.

- [x] **Step 2: Run stage-five tests and confirm RED**

```bash
cd frontend
npm run test:stage-five
```

- [x] **Step 3: Implement helpers**

Implement:

- `StageFiveMode = "document" | "acceptance"`.
- `deriveStageFiveVNextStep`.
- `isStageFiveFocusedMode`.
- six chapter keys/specs.
- `scoreStageFiveChapter`.
- `isStageFiveDocumentReady`.
- `createStageFiveDeliveryDocumentPayloadFromVNext`.
- `createStageFiveOperationsGuidePayloadFromVNext`.
- delivery package and signoff state types.
- `createStageFiveAcceptanceQuestions`.
- `isStageFiveAcceptanceReady`.
- `createStageFiveAcceptancePackagePayloadFromVNext`.

- [x] **Step 4: Run stage-five tests and confirm GREEN**

```bash
cd frontend
npm run test:stage-five
```

## Task 2: Wire Stage Five Step Recovery In ExperimentWorkspace

**Files:**
- Modify: `frontend/src/components/student-product/experiment-workspace.tsx`

- [x] Add `derivedStageFiveStep = deriveStageFiveVNextStep(...)`.
- [x] Add `DerivedStepState<StageFiveMode>`.
- [x] Reset Stage Five state to derived in `handleStageSelect`.
- [x] Pass manual `onModeChange` to `StageFiveWorkspace`.
- [x] Keep focused layout behavior using `isStageFiveFocusedMode`.

## Task 3: Replace Stage Five Formal UI With vNext Flow

**Files:**
- Modify: `frontend/src/components/student-product/stage-five-workspace.tsx`

- [x] Replace the old three independent form layout with two vNext branches.
- [x] Implement `StageFiveDocumentWorkspace`.
- [x] Implement chapter rail/progress, local AI check drawer/panel, chapter save gate, and document preview summary.
- [x] Document submit saves delivery document and operations guide artifacts, then moves to acceptance.
- [x] Implement `StageFiveAcceptanceWorkspace`.
- [x] Implement delivery target, acceptance agenda, package checklist, document status, simulated customer questions, signoff, readiness gate, AI review, and completion panel.
- [x] Preserve existing save/review/complete callbacks.
- [x] Preserve locked and completed stage behavior.
- [x] Remove formal UI copy that implies the old Stage Five three-form model.

## Task 4: Verify Contracts And Regressions

**Files:**
- No required edits unless failures expose issues.

- [x] Run front-end unit tests:

```bash
cd frontend
npm run test:stage-five
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

- [x] Run backend Stage Five regression:

```bash
.venv/bin/python -m pytest backend/tests/test_stage_five.py -q
```

## Task 5: Browser Verification

**Files:**
- No required edits unless browser verification exposes issues.

- [x] Start local backend and frontend.
- [x] Use Browser plugin first if available; if the Browser route is unavailable, use headless Chrome CDP fallback and record that reason.
- [x] On a session with Stage Four completed and Stage Five unlocked, verify:
  - Stage Five opens on "把项目结果写成交付说明文档。"
  - six chapters can be checked, saved, and submitted;
  - delivery document and operations guide artifacts are created;
  - acceptance page opens on "完成客户验收确认，形成最终交付证据。"
  - package checklist, simulated acceptance, and signoff enable acceptance save;
  - acceptance package is created;
  - AI delivery review is generated;
  - Stage Five completes and final project status is completed.
- [x] Capture screenshots to `/private/tmp`.
- [x] Confirm browser console error/warn count is 0, except known favicon 404 if present.

## Task 6: Update Governance Docs

**Files:**
- Modify: `docs/dev/current-context.md`
- Modify: `docs/dev/progress.md`

- [x] Record Stage Five P0 completion, verification commands, browser evidence, and known boundaries.
- [x] Update the next recommended task after Stage Five is complete.

## Acceptance Criteria

- Stage Five no longer presents the old three-form layout as the formal product path.
- Stage Five formal path is `document -> acceptance`.
- Existing Stage Five backend API and Artifact types remain compatible.
- AI review still goes through AI Gateway.
- Completion still completes the full project/session.
- Required tests and browser verification pass or any unverified area is explicitly documented.
