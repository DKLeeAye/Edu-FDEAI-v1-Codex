# Stage One vNext Interview Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the formal Stage One student path with the Open Design vNext guide → AI interview lab → evidence submit flow while keeping existing backend Artifact and AI Gateway contracts.

**Architecture:** Keep the first slice inside the existing student product boundary. Add pure flow helpers in `stage-one-flow.ts`, then refactor `StageOneWorkspace` to render vNext guide, lab, and submit screens through the existing API handler props from `frontend/app/page.tsx`.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, FastAPI, existing Stage One API and Artifact contracts.

---

## File Structure

- Modify `frontend/src/components/student-product/stage-one-flow.ts`: vNext step types, step derivation, artifact-to-draft helpers, submit gate helpers, legacy guided isolation.
- Modify `frontend/src/components/student-product/stage-one-flow.test.ts`: TDD coverage for new flow helper behavior.
- Modify `frontend/src/components/student-product/stage-one-workspace.tsx`: replace the formal old Stage One hub with guide/lab/submit render paths.
- Modify `frontend/src/components/student-product/experiment-workspace.tsx`: store `StageOneVNextStep`, reset it on stage navigation, and treat lab/submit as focused views.
- Modify `docs/dev/progress.md`: record implementation and verification results.
- Optional after UI implementation: modify `frontend/app/globals.css` only if Tailwind utility classes cannot reproduce a specific prototype detail cleanly.

## Task 1: Add Flow Tests For vNext Step And Submit Mapping

**Files:**
- Modify: `frontend/src/components/student-product/stage-one-flow.test.ts`
- Modify: `frontend/src/components/student-product/stage-one-flow.ts`

- [x] **Step 1: Write failing tests**

Add tests to `frontend/src/components/student-product/stage-one-flow.test.ts` after the existing progress tests:

```ts
test("stage one vNext step starts at guide without formal interview evidence", () => {
  assert.equal(deriveStageOneVNextStep([], "not_started"), "guide");
});

test("stage one vNext step moves to lab after the first formal interview turn", () => {
  const artifacts: StageOneArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_1_interview_turn",
      content_json: {
        user_message: "当前质检追溯最卡在哪里？",
        ai_customer_response: "审厂前要从 MES、Excel 和纸质单里拼材料。",
      },
    },
  ];

  assert.equal(deriveStageOneVNextStep(artifacts, "in_practice"), "lab");
});

test("stage one vNext step opens submit when formal submit artifacts exist", () => {
  const artifacts: StageOneArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_1_interview_turn",
      content_json: {
        user_message: "请介绍资料来源。",
        ai_customer_response: "资料分散在 MES、Excel、纸质单和整改材料里。",
      },
    },
    {
      ...baseArtifact,
      id: "artifact-2",
      artifact_type: "stage_1_visit_notes",
      content_json: {
        confirmed_information: ["审厂追溯材料分散。"],
        risks_and_questions: ["MES 字段完整性待确认。"],
      },
    },
  ];

  assert.equal(deriveStageOneVNextStep(artifacts, "in_practice"), "submit");
});

test("stage one vNext submit draft maps interview evidence into stage one payloads", () => {
  const artifacts: StageOneArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_1_interview_turn",
      content_json: {
        user_message: "审厂追溯材料现在来自哪里？",
        ai_customer_response: "现在要从 MES、Excel、纸质单和共享文件夹里找证据。",
      },
    },
    {
      ...baseArtifact,
      id: "artifact-2",
      artifact_type: "stage_1_visit_notes",
      content_json: {
        confirmed_information: ["质检记录分散在 MES、Excel 和纸质单。"],
        requirement_hypotheses: ["需要减少审厂前人工整理追溯材料的时间。"],
        risks_and_questions: ["字段缺失时需要人工确认。"],
        next_visit_plan: "追问字段样例和验收口径。",
        customer_visible_summary: "先围绕审厂追溯材料整理做试点。",
      },
    },
  ];

  const draft = createStageOneVNextSubmitDraft(artifacts);

  assert.deepEqual(draft.quote_excerpts, [
    "现在要从 MES、Excel、纸质单和共享文件夹里找证据。",
  ]);
  assert.deepEqual(draft.visit_notes.confirmed_information, [
    "质检记录分散在 MES、Excel 和纸质单。",
  ]);
  assert.equal(
    draft.summary.problem_statement,
    "需要减少审厂前人工整理追溯材料的时间。",
  );
  assert.deepEqual(draft.summary.evidence_artifact_ids, ["artifact-1"]);
});

test("stage one vNext gate requires checks and formal draft fields", () => {
  const draft = createStageOneVNextSubmitDraft([
    {
      ...baseArtifact,
      artifact_type: "stage_1_interview_turn",
      content_json: {
        user_message: "审厂追溯材料现在来自哪里？",
        ai_customer_response: "现在要从 MES、Excel、纸质单和共享文件夹里找证据。",
      },
    },
  ]);

  assert.equal(
    isStageOneVNextSubmitReady(draft, {
      businessGoal: true,
      customerQuote: true,
      dataSource: true,
      projectBoundary: true,
      stageTwoInput: true,
    }),
    false,
  );
});
```

Also extend the import list in that test file:

```ts
  createStageOneVNextSubmitDraft,
  deriveStageOneVNextStep,
  isStageOneVNextSubmitReady,
```

- [x] **Step 2: Run the Stage One frontend tests and confirm RED**

Run:

```bash
cd frontend
npm run test:stage-one
```

Expected result: FAIL because `deriveStageOneVNextStep`, `createStageOneVNextSubmitDraft`, and `isStageOneVNextSubmitReady` are not exported.

- [x] **Step 3: Add minimal flow helper implementation**

Add these exports to `frontend/src/components/student-product/stage-one-flow.ts`:

```ts
export type StageOneVNextStep = "guide" | "lab" | "submit";

export type StageOneVNextGateChecks = {
  businessGoal: boolean;
  customerQuote: boolean;
  dataSource: boolean;
  projectBoundary: boolean;
  stageTwoInput: boolean;
};

export type StageOneVNextSubmitDraft = {
  quote_excerpts: string[];
  visit_notes: {
    confirmed_information: string[];
    requirement_hypotheses: string[];
    risks_and_questions: string[];
    next_visit_plan: string;
    customer_visible_summary: string;
  };
  summary: {
    problem_statement: string;
    target_user: string;
    business_context: string;
    pain_points: string[];
    success_criteria: string[];
    unconfirmed_questions: string[];
    evidence_artifact_ids: string[];
  };
};

export function deriveStageOneVNextStep(
  artifacts: StageOneArtifactLike[],
  stageStatus: string | undefined,
): StageOneVNextStep {
  if (stageStatus === "completed") {
    return "submit";
  }
  const interviewCount = countArtifactsOfType(artifacts, stageOneInterviewType);
  const hasVisitNotes = latestArtifactOfType(artifacts, stageOneVisitNotesType) !== null;
  const hasSummary = latestArtifactOfType(artifacts, stageOneSummaryType) !== null;
  const hasEvaluation = latestArtifactOfType(artifacts, stageOneEvaluationType) !== null;
  if (hasVisitNotes || hasSummary || hasEvaluation) {
    return "submit";
  }
  return interviewCount > 0 ? "lab" : "guide";
}

export function createStageOneVNextSubmitDraft(
  artifacts: StageOneArtifactLike[],
): StageOneVNextSubmitDraft {
  const interviewArtifacts = artifacts
    .filter((artifact) => artifact.artifact_type === stageOneInterviewType)
    .slice()
    .sort(compareArtifactsByCreatedAt);
  const latestVisitNotes = latestArtifactOfType(artifacts, stageOneVisitNotesType);
  const latestSummary = latestArtifactOfType(artifacts, stageOneSummaryType);
  const visitContent = latestVisitNotes?.content_json ?? {};
  const summaryContent = latestSummary?.content_json ?? {};
  const hypotheses = stringListValue(visitContent.requirement_hypotheses);
  const confirmed = stringListValue(visitContent.confirmed_information);
  const risks = stringListValue(visitContent.risks_and_questions);

  return {
    quote_excerpts: interviewArtifacts
      .map((artifact) => stringValue(artifact.content_json.ai_customer_response))
      .filter(Boolean)
      .slice(-3),
    visit_notes: {
      confirmed_information: confirmed,
      requirement_hypotheses: hypotheses,
      risks_and_questions: risks,
      next_visit_plan: stringValue(visitContent.next_visit_plan),
      customer_visible_summary: stringValue(visitContent.customer_visible_summary),
    },
    summary: {
      problem_statement:
        stringValue(summaryContent.problem_statement) || hypotheses[0] || "",
      target_user: stringValue(summaryContent.target_user),
      business_context:
        stringValue(summaryContent.business_context) || confirmed[0] || "",
      pain_points: stringListValue(summaryContent.pain_points),
      success_criteria: stringListValue(summaryContent.success_criteria),
      unconfirmed_questions:
        stringListValue(summaryContent.unconfirmed_questions).length > 0
          ? stringListValue(summaryContent.unconfirmed_questions)
          : risks,
      evidence_artifact_ids:
        stringListValue(summaryContent.evidence_artifact_ids).length > 0
          ? stringListValue(summaryContent.evidence_artifact_ids)
          : interviewArtifacts.map((artifact) => artifact.id),
    },
  };
}

export function isStageOneVNextSubmitReady(
  draft: StageOneVNextSubmitDraft,
  checks: StageOneVNextGateChecks,
): boolean {
  return (
    Object.values(checks).every(Boolean) &&
    draft.quote_excerpts.length > 0 &&
    draft.visit_notes.confirmed_information.length > 0 &&
    draft.visit_notes.next_visit_plan.trim().length > 0 &&
    draft.visit_notes.customer_visible_summary.trim().length > 0 &&
    draft.summary.problem_statement.trim().length > 0 &&
    draft.summary.target_user.trim().length > 0 &&
    draft.summary.business_context.trim().length > 0 &&
    draft.summary.pain_points.length > 0 &&
    draft.summary.success_criteria.length > 0
  );
}
```

- [x] **Step 4: Run Stage One frontend tests and confirm GREEN**

Run:

```bash
cd frontend
npm run test:stage-one
```

Expected result: PASS.

## Task 2: Replace Stage One Formal Mode State With vNext Step State

**Files:**
- Modify: `frontend/src/components/student-product/experiment-workspace.tsx`
- Modify: `frontend/src/components/student-product/stage-one-workspace.tsx`
- Modify: `frontend/src/components/student-product/stage-one-flow.ts`

- [x] **Step 1: Write failing test for focused vNext steps**

In `frontend/src/components/student-product/stage-one-flow.test.ts`, replace the old focused-mode test with:

```ts
test("stage one shell uses focused layout for vNext lab and submit steps", () => {
  assert.equal(isStageOneFocusedStep("guide"), false);
  assert.equal(isStageOneFocusedStep("lab"), true);
  assert.equal(isStageOneFocusedStep("submit"), true);
});
```

Update imports by replacing `isStageOneFocusedMode` with `isStageOneFocusedStep`.

- [x] **Step 2: Run RED**

Run:

```bash
cd frontend
npm run test:stage-one
```

Expected result: FAIL because `isStageOneFocusedStep` is not exported.

- [x] **Step 3: Implement the focused helper**

Add this function to `frontend/src/components/student-product/stage-one-flow.ts`:

```ts
export function isStageOneFocusedStep(step: StageOneVNextStep): boolean {
  return step === "lab" || step === "submit";
}
```

Keep `isStageOneFocusedMode` temporarily if other files still import it during the refactor. Remove it only after imports are updated.

- [x] **Step 4: Update `experiment-workspace.tsx` imports and state**

Replace:

```ts
import { isStageOneFocusedMode, type StageOneMode } from "./stage-one-flow";
```

with:

```ts
import {
  deriveStageOneVNextStep,
  isStageOneFocusedStep,
  type StageOneVNextStep,
} from "./stage-one-flow";
```

Replace:

```ts
const [stageOneMode, setStageOneMode] = useState<StageOneMode>("home");
const effectiveStageOneMode = activeStageKey === "stage_1" ? stageOneMode : "home";
const stageOneFocused =
  activeStageKey === "stage_1" && isStageOneFocusedMode(effectiveStageOneMode);
```

with:

```ts
const [stageOneStep, setStageOneStep] = useState<StageOneVNextStep>("guide");
const effectiveStageOneStep =
  activeStageKey === "stage_1"
    ? stageOneStep
    : deriveStageOneVNextStep(artifactsByStage.stage_1, activeRecord?.status);
const stageOneFocused =
  activeStageKey === "stage_1" && isStageOneFocusedStep(effectiveStageOneStep);
```

Inside `handleStageSelect`, replace `setStageOneMode("home");` with:

```ts
setStageOneStep(deriveStageOneVNextStep(artifactsByStage.stage_1, activeRecord?.status));
```

Pass the new props into `StageOneWorkspace`:

```tsx
onStepChange={setStageOneStep}
workspaceStep={effectiveStageOneStep}
```

and remove `onModeChange` / `workspaceMode`.

- [x] **Step 5: Update `StageOneWorkspaceProps`**

In `frontend/src/components/student-product/stage-one-workspace.tsx`, replace old props:

```ts
onModeChange: (mode: StageOneMode) => void;
workspaceMode: StageOneMode;
```

with:

```ts
onStepChange: (step: StageOneVNextStep) => void;
workspaceStep: StageOneVNextStep;
```

Update imports to use `StageOneVNextStep`.

- [x] **Step 6: Run tests and typecheck**

Run:

```bash
cd frontend
npm run test:stage-one
npm run typecheck
```

Expected result: PASS.

## Task 3: Implement The vNext Guide Screen

**Files:**
- Modify: `frontend/src/components/student-product/stage-one-workspace.tsx`

- [x] **Step 1: Add guide render path**

At the start of `StageOneWorkspace`, after derived artifact state, branch on `workspaceStep`:

```tsx
if (workspaceStep === "guide") {
  return (
    <StageOneGuideView
      completed={completed}
      customerIdentity={customerIdentity}
      onBack={onRefresh}
      onStartInterview={() => onStepChange("lab")}
      statusLabel={status.label}
    />
  );
}
```

- [x] **Step 2: Add `StageOneGuideView` in the same file**

Implement a Tailwind-based layout with these sections and exact user-facing labels:

```tsx
function StageOneGuideView({
  completed,
  customerIdentity,
  onStartInterview,
  statusLabel,
}: {
  completed: boolean;
  customerIdentity: StageOneCustomerIdentity;
  onStartInterview: () => void;
  statusLabel: string;
}) {
  const probeItems = [
    ["业务目标", "客户为什么现在要做这个项目，审厂或交付压力来自哪里？"],
    ["当前流程", "从质检记录、异常处理到客户审厂追溯，现在由谁完成、怎么流转？"],
    ["痛点影响", "资料分散会造成多少返工、延误、误判或客户解释风险？"],
    ["数据基础", "MES、Excel、纸质单和整改材料中哪些字段可用，哪些经常缺失？"],
    ["使用约束", "一线质检员、质量负责人和 IT 侧有哪些不能改变的流程边界？"],
    ["验收标准", "客户怎样判断 AI 智能体真的解决了追溯和审厂准备问题？"],
  ];

  return (
    <section className="min-h-[calc(100dvh-96px)] bg-slate-50 px-6 py-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Stage 01</p>
          <h2 className="mt-3 text-lg font-semibold">需求访谈与业务理解</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            先学会把“想用 AI 提升效率”追问成真实业务问题，再进入 AI 客户访谈。
          </p>
          <StatusBadge label={statusLabel} tone={completed ? "green" : "blue"} />
        </aside>

        <div className="space-y-6">
          <header className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Interview Method
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.02em] text-slate-950">
              需求访谈不是聊天，是把模糊诉求还原成可交付问题。
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              正式访谈前，你需要先知道应该问什么、如何记录、如何整理，以及怎样判断制造业质检问题是否适合交给 AI 智能体解决。
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {probeItems.map(([title, copy]) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
              </article>
            ))}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">记录不是抄对话，而是沉淀证据</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              {["客户原话", "已确认事实", "个人判断", "待确认问题", "需求线索"].map((item) => (
                <div key={item} className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700">Ready For Practice</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                准备好后，进入 AI 客户访谈。
              </h2>
              <p className="mt-2 text-sm text-slate-600">{customerIdentity.title}</p>
            </div>
            <button
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              type="button"
              onClick={onStartInterview}
            >
              开始模拟访谈
            </button>
          </section>
        </div>
      </div>
    </section>
  );
}
```

- [x] **Step 3: Run typecheck**

Run:

```bash
cd frontend
npm run typecheck
```

Expected result: PASS.

## Task 4: Implement The vNext Interview Lab Screen

**Files:**
- Modify: `frontend/src/components/student-product/stage-one-workspace.tsx`

- [x] **Step 1: Branch lab render path**

Replace the old practice render path with a `workspaceStep === "lab"` render path that keeps existing submit handlers:

```tsx
if (workspaceStep === "lab") {
  return (
    <StageOneInterviewLabView
      completed={completed}
      customerIdentity={customerIdentity}
      displayedInterviewRecords={displayedInterviewRecords}
      isSendingInterview={isSendingInterview}
      message={message}
      onFinish={() => onStepChange("submit")}
      onMessageChange={setMessage}
      onSubmit={handleInterviewSubmit}
      practiceInsights={practiceInsights}
      questionSuggestions={questionSuggestions}
      visitNotesDraft={visitNotesDraft}
      onVisitNotesDraftChange={(draft) =>
        setVisitNotesState({ draft, sourceArtifactId: latestVisitNotesId })
      }
    />
  );
}
```

- [x] **Step 2: Implement lab view with prototype structure**

The lab view must include:

- top app header with "制造业质检 AI 客户访谈实训";
- chat stream rendered from `displayedInterviewRecords`;
- four prompt chips using `questionSuggestions.slice(0, 4)`;
- textarea and send button bound to `handleInterviewSubmit`;
- finish button that moves to submit;
- right insight cards for realtime feedback, identified requirements, pain points, project key information, pending questions, and score/readiness;
- notes drawer or always-visible notes panel on narrow screens.

Use existing `PracticeConversationRecord` and `PracticeInsightState` types; do not add backend calls.

- [x] **Step 3: Run frontend tests and typecheck**

Run:

```bash
cd frontend
npm run test:stage-one
npm run typecheck
```

Expected result: PASS.

2026-06-01 result: PASS for `npm run test:stage-one`, `npm run typecheck`, and `npm run lint`.
Browser verification on `http://127.0.0.1:3002` with backend `http://127.0.0.1:18002` confirmed the vNext lab render path, expected lab copy, screenshot capture, and no console error/warn. Because the demo student project is already completed, lab inputs were disabled and active send persistence still needs a clean Stage One session in Task 6.

## Task 5: Implement The vNext Submit Screen

**Files:**
- Modify: `frontend/src/components/student-product/stage-one-workspace.tsx`
- Modify: `frontend/src/components/student-product/stage-one-flow.ts`
- Modify: `frontend/src/components/student-product/stage-one-flow.test.ts`

- [x] **Step 1: Add submit state**

In `StageOneWorkspace`, add local gate state:

```ts
const [gateChecks, setGateChecks] = useState<StageOneVNextGateChecks>({
  businessGoal: false,
  customerQuote: false,
  dataSource: false,
  projectBoundary: false,
  stageTwoInput: false,
});
const submitDraft = useMemo(() => createStageOneVNextSubmitDraft(artifacts), [artifacts]);
const submitReady = isStageOneVNextSubmitReady(submitDraft, gateChecks);
```

- [x] **Step 2: Branch submit render path**

For `workspaceStep === "submit"`, render `StageOneSubmitView` with:

```tsx
<StageOneSubmitView
  completed={completed}
  gateChecks={gateChecks}
  isCompletingStage={isCompletingStage}
  isRequestingEvaluation={isRequestingEvaluation}
  isSavingSummary={isSavingSummary}
  isSavingVisitNotes={isSavingVisitNotes}
  latestEvaluationArtifact={latestEvaluationArtifact}
  onBackToLab={() => onStepChange("lab")}
  onCompleteStage={onCompleteStage}
  onGateCheckChange={setGateChecks}
  onRequestEvaluation={onRequestEvaluation}
  onSaveSummary={handleSaveSummaryFromSubmit}
  onSaveVisitNotes={handleSaveVisitNotesFromSubmit}
  submitDraft={submitDraft}
  submitReady={submitReady}
/>
```

- [x] **Step 3: Add submit save handlers**

Create handlers in `StageOneWorkspace`:

```ts
async function handleSaveVisitNotesFromSubmit(draft: StageOneVNextSubmitDraft): Promise<boolean> {
  return onSaveVisitNotes(draft.visit_notes);
}

async function handleSaveSummaryFromSubmit(draft: StageOneVNextSubmitDraft): Promise<boolean> {
  return onSaveSummary(draft.summary);
}
```

- [x] **Step 4: Implement submit view**

The submit view must show:

- hero title "把客户访谈整理成可进入阶段二的需求证据。";
- progress strip with interview done, artifact整理 active, Stage Two next;
- quote excerpts, confirmed facts, pending questions;
- editable or readable requirement draft fields that map to current payload names;
- five gate checkboxes;
- buttons for saving notes, saving summary, generating evaluation, and completing Stage One;
- complete button disabled until `submitReady` is true and evaluation exists.

- [x] **Step 5: Run frontend tests and typecheck**

Run:

```bash
cd frontend
npm run test:stage-one
npm run typecheck
```

Expected result: PASS.

2026-06-01 result: PASS for `npm run test:stage-one`, `npm run typecheck`, and `npm run lint`.
Additional regression checks passed for `npm run test:stage-two`, `npm run test:stage-three`, `npm run test:stage-four`, and `.venv/bin/python -m pytest backend/tests/test_stage_one.py -q`.
Browser verification on `http://127.0.0.1:3002` with backend `http://127.0.0.1:18002` confirmed that a completed demo project opens Stage One on the vNext submit page, expected submit copy renders, the old "项目实战模式 / 返回阶段一主页" formal fallback is absent, console error/warn count is 0, and screenshots were captured at `/private/tmp/edufde-stage-one-vnext-submit.png` and `/private/tmp/edufde-stage-one-vnext-submit-actions.png`.

## Task 6: Regression Verification

**Files:**
- No production edits unless a regression is found.

- [x] **Step 1: Run backend Stage One regression**

Run:

```bash
python3 -m pytest backend/tests/test_stage_one.py -q
```

Expected result: PASS.

2026-06-01 result: PASS with `.venv/bin/python -m pytest backend/tests/test_stage_one.py -q` (16 passed). System `python3 -m pytest ...` uses Python 3.9 on this machine and fails during collection because the backend requires Python 3.11+ syntax.

- [x] **Step 2: Run frontend full static checks**

Run:

```bash
cd frontend
npm run lint
npm run typecheck
npm run test:stage-one
npm run test:stage-two
npm run test:stage-three
npm run test:stage-four
```

Expected result: PASS.

2026-06-01 result: PASS for `npm run lint`, `npm run typecheck`, `npm run test:stage-one`, `npm run test:stage-two`, `npm run test:stage-three`, and `npm run test:stage-four`.

- [x] **Step 3: Run browser verification**

Start backend and frontend development servers:

```bash
FRONTEND_ORIGIN=http://127.0.0.1:3001 .venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 18001
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:18001 npm run dev -- --hostname 127.0.0.1 --port 3001
```

Open `http://127.0.0.1:3001` and verify:

- demo student login works;
- Stage One first formal screen is the vNext guide;
- start interview opens the lab;
- sending an interview question persists an AI customer response;
- finish opens submit;
- saving notes and summary creates artifacts;
- evaluation generation uses the existing backend;
- completing Stage One unlocks Stage Two;
- the old formal dual entrance is not shown.

2026-06-01 result: PASS on `http://127.0.0.1:3002` with backend `http://127.0.0.1:18002` and `AI_PROVIDER=fake`.
Clean local verification account `codex-stage-one-clean@edufde.demo` completed the full `guide -> lab -> submit` flow: guide opened as the first formal screen, lab sent an interview question and persisted an AI customer response, visit notes and requirement summary were saved as artifacts, evaluation generation used the existing Stage One backend, the five submit checks enabled completion, Stage One completed, and Stage Two unlocked. The old formal "教学引导模式 / 项目实战模式" dual entrance was absent throughout. Browser console error/warn count was 0. Screenshot captured at `/private/tmp/edufde-stage-one-clean-e2e-complete.png`.

Backend persistence check for the clean account confirmed one session with `stage_1=completed`, `stage_2=not_started`, `stage_3/stage_4/stage_5=locked`, and four Stage One artifact types: `stage_1_interview_turn`, `stage_1_visit_notes`, `stage_1_problem_summary`, `stage_1_evaluation`.

## Task 7: Update Development Progress

**Files:**
- Modify: `docs/dev/progress.md`

- [x] **Step 1: Record the slice**

Add an entry dated `2026-06-01` under "最近完成" with:

- Stage One vNext P0 implemented from the three Open Design prototype pages.
- Old formal dual entrance removed from the primary Stage One product path.
- Existing backend Artifact and AI Gateway contracts preserved.
- Verification commands and results.
- Any browser verification gaps if a server or dependency could not run.

- [x] **Step 2: Run documentation whitespace check**

Run:

```bash
git diff --check
```

Expected result: no whitespace errors.

2026-06-01 result: PASS with `git diff --check`.
