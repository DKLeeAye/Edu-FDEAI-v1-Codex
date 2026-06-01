# Stage One vNext Interview Flow Design

> Date: 2026-06-01  
> Scope: first formal development slice for the Open Design vNext driven platform upgrade  
> Source prototype files:
>
> - `docs/prototypes/open-design-vnext/screens/06-interview-guide.html`
> - `docs/prototypes/open-design-vnext/screens/06-interview-lab.html`
> - `docs/prototypes/open-design-vnext/screens/06-interview-submit.html`

## Goal

Replace the formal Stage One student product experience with the Open Design vNext continuous flow:

```text
Interview guide
→ AI customer interview lab
→ Interview evidence整理 and stage submission
→ Stage Two input evidence chain
```

This slice does not complete the full platform upgrade. It is the first production-grade vertical slice toward the active goal: migrate the Open Design vNext experience into the existing Next.js and FastAPI platform while preserving Artifact, AI Gateway, Rubric, permissions, and verification boundaries.

## Product Requirements

Stage One must follow the new design, not the old split between teaching guidance mode and project practice mode.

- `06-interview-guide.html` becomes the formal Stage One method page. It teaches interview method and sends the student into the interview lab.
- `06-interview-lab.html` becomes the formal Stage One core workspace. It centers on AI customer interview, live clues, pain points, project information, pending questions, score/readiness, and a notes drawer.
- `06-interview-submit.html` becomes the formal Stage One submission gate. It turns conversation evidence into customer quotes, confirmed facts, pending questions, requirement draft, boundary judgment, and Stage Two input.
- The old six-level guided training can remain in backend data and low-level code as legacy compatibility, but it must not appear as a formal Stage One primary path and must not be required for Stage Two input.
- Stage completion still requires formal interview evidence, visit notes, problem summary, and evaluation artifacts unless this rule is intentionally replaced by a later reviewed contract.

## Current Baseline

The current formal student entry is `frontend/app/page.tsx`, with Stage One rendered by `frontend/src/components/student-product/stage-one-workspace.tsx`.

Current Stage One already has useful production contracts:

- `askStageOneCustomer` creates `stage_1_interview_turn` artifacts through AI Gateway.
- `saveStageOneVisitNotes` creates `stage_1_visit_notes` artifacts.
- `saveStageOneSummary` creates `stage_1_problem_summary` artifacts.
- `requestStageOnePracticeEvaluation` creates `stage_1_evaluation` artifacts.
- `completeStageOne` unlocks Stage Two after required formal artifacts exist.
- Backend scope checks already restrict Stage One to the owning student session.

The main mismatch is product shape: current UI still exposes a home hub with old "教学引导 / 项目实战" style progression. The new production path must be guide/lab/submit.

## User Experience Design

### Stage One Flow State

Frontend Stage One should use a new flow state:

```ts
type StageOneVNextStep = "guide" | "lab" | "submit";
```

Default behavior:

- If the stage is not completed and no formal interview exists, open `guide`.
- If at least one interview turn exists but the formal summary chain is incomplete, open `lab`.
- If interview evidence exists and the student chooses to整理 or the required submit artifacts are partially present, open `submit`.
- If Stage One is completed, open `submit` as a read-only completion summary with a path to Stage Two.

This step state replaces the formal primary mode split. Legacy guided training functions can stay outside this flow for compatibility, but the production Stage One UI should not lead with them.

### Guide Page

The guide page should mirror the prototype's information hierarchy:

- Narrow student rail / stage context.
- Topbar with Stage 01 and return to experiment detail/workspace.
- Hero explaining that requirements interview is not casual chat.
- Six probing dimensions: business goal, current process, pain impact, data basis, constraints, acceptance standard.
- Record template: customer quote, confirmed fact, personal judgment, pending question, requirement clue.
- Conversion example from customer expression to requirement judgment.
- AI agent suitability checklist.
- Primary action: start AI customer interview.

The guide page does not create formal Stage Two input. It may update local UI step state only.

### Interview Lab

The lab should mirror the prototype's training shell:

- Header identifies the manufacturing quality inspection AI customer interview practice.
- Scenario head shows "制造业质检追溯 AI 智能体项目", customer identity, stage, and method link.
- Chat stream shows persisted `stage_1_interview_turn` artifacts plus the pending turn.
- Prompt chips insert suggested questions, not canned answers.
- Input box posts through `askStageOneCustomer`.
- Save notes opens or saves the notes drawer.
- Finish moves to submit step, not directly to Stage Two.
- Right insight column derives live signals from formal artifacts and draft state:
  - AI realtime feedback.
  - identified requirements.
  - customer pain points.
  - project key information.
  - pending questions.
  - practice score/readiness.
- Notes drawer lets students draft confirmed facts, hypotheses, risks/questions, next visit plan, and customer-visible summary.

For P0, live insight extraction may be deterministic and front-end derived from saved artifacts and form fields. It must not fake AI calls outside AI Gateway.

### Submit Page

The submit page should mirror the prototype's evidence-to-requirement gate:

- Hero explains that Stage One output must become Stage Two requirement evidence.
- Progress strip shows interview done, artifact整理 active, Stage Two next.
- Evidence column:
  - customer quote excerpts from interview artifacts.
  - confirmed facts from visit notes.
  - pending risk/questions from visit notes and summary.
- Requirement draft column maps to `StageOneSummaryPayload`:
  - core customer need → `problem_statement`.
  - target user → `target_user`.
  - business context → `business_context`.
  - pain points → `pain_points`.
  - acceptance / success criteria → `success_criteria`.
  - boundary judgment and pending issues → `unconfirmed_questions`.
  - evidence artifact ids → `evidence_artifact_ids`.
- Gate check requires the student to confirm five evidence conditions before completing the stage.
- Submission sequence:
  1. Save visit notes if the notes draft has changed.
  2. Save problem summary if the summary draft has changed.
  3. Generate Stage One evaluation through AI Gateway.
  4. Complete Stage One and unlock Stage Two.

P0 may keep these as explicit button actions where safer, but the final submit button must make the required sequence clear and recoverable.

## Data And Artifact Contract

No new database table is required for P0.

Existing artifacts remain authoritative:

| Artifact type | Role in vNext |
| --- | --- |
| `stage_1_interview_turn` | Formal AI customer interview evidence. |
| `stage_1_visit_notes` | Interview整理: confirmed facts, hypotheses, risks, next visit plan, customer visible summary. |
| `stage_1_problem_summary` | Stage Two input: problem statement, target user, business context, pain points, success criteria, pending questions, evidence ids. |
| `stage_1_evaluation` | AI evaluation and readiness check generated through AI Gateway. |

P0 should preserve existing backend request schemas:

- `StageOneInterviewRequest`
- `StageOneVisitNotesRequest`
- `StageOneSummaryRequest`

If a later slice needs richer structured insight snapshots, add a new artifact field or artifact type after tests prove the existing contract is insufficient.

## Component Architecture

Keep the first implementation inside the existing student product boundary:

- Modify `frontend/src/components/student-product/stage-one-flow.ts`
  - Replace formal Stage One mode model with vNext step helpers.
  - Keep legacy guided helper types only where existing tests or compatibility code still need them.
  - Add pure functions for extracting quotes, facts, pending questions, readiness checks, and default submit drafts from artifacts.
- Modify `frontend/src/components/student-product/stage-one-workspace.tsx`
  - Split render paths into guide, lab, and submit sections inside the same component for P0.
  - Remove old formal home hub and primary guided/practice split from the product path.
  - Keep API handler props unchanged.
- Modify `frontend/src/components/student-product/experiment-workspace.tsx`
  - Initialize and reset the new Stage One step state.
  - Treat lab and submit as focused Stage One views.
- Modify `frontend/src/components/student-product/stage-one-flow.test.ts`
  - Cover step derivation, artifact-to-submit draft mapping, readiness checks, and legacy guided isolation.

Backend changes are optional for P0. If tests reveal the submit sequence needs one atomic endpoint, that should become a separate backend slice instead of being hidden inside UI code.

## Error Handling

- AI customer request failure keeps the student's question in the input box and shows the existing error path from `frontend/app/page.tsx`.
- Save visit notes or summary failure leaves the student on submit with unsaved draft state intact.
- Evaluation failure does not mark Stage One complete.
- Completion conflict shows that required artifacts are missing and keeps the student on submit.
- Completed Stage One renders submit summary as read-only enough to avoid accidental resubmission, while still showing evidence.

## Testing And Verification

Frontend unit tests:

- `deriveStageOneVNextStep` opens guide, lab, submit, or completed submit based on artifacts and stage status.
- Submit draft creation maps existing artifacts into the correct Stage One payload fields.
- Gate checks only pass when the five evidence confirmations are true and required draft fields are present.
- Legacy guided training data does not make the formal vNext flow complete.

Backend regression tests:

- Existing `backend/tests/test_stage_one.py` should keep passing.
- No formal Stage One completion should depend on guided training records.

Manual browser verification:

- Log in as demo student.
- Enter the manufacturing quality inspection experiment.
- Open Stage One and verify the first screen matches the vNext guide structure.
- Start interview, send an AI customer question, and verify the persisted answer appears in the lab.
- Open/finish to submit, save notes and summary, request evaluation, complete stage, and verify Stage Two unlocks.
- Inspect responsive behavior for the guide/lab/submit views at desktop and narrow viewport widths.

## Acceptance Criteria

The slice is done when:

1. Formal Stage One no longer presents the old teaching-guidance/project-practice dual entrance as the target product path.
2. The visible Stage One student experience follows guide → lab → submit.
3. The lab uses real `askStageOneCustomer` API calls through AI Gateway and persists formal interview artifacts.
4. The submit page saves formal visit notes and problem summary artifacts and can request evaluation and complete Stage One.
5. Stage Two still receives Stage One artifacts through the existing evidence chain.
6. Frontend tests, backend Stage One tests, lint/typecheck, and browser verification pass or any gaps are documented in `docs/dev/progress.md`.

## Out Of Scope For P0

- Full student home and experiment detail redesign.
- Stage Two vNext chapter workbench.
- Yellow debt closure workflow.
- Teacher dashboard redesign.
- Course member permission model.
- Real Dify API integration.
- New persistent portfolio model.
