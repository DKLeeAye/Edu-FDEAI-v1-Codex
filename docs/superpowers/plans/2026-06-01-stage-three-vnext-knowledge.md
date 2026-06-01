# Stage Three vNext Knowledge Engineering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the formal Stage Three student path with the Open Design vNext RAG knowledge-engineering flow while preserving existing Stage Three process records, knowledge decision, AI Gateway review, and Stage Four unlock contracts.

**Architecture:** Add vNext step and process-record helpers in `stage-three-flow.ts`, then refactor `StageThreeWorkspace` to render `source -> quality -> decision -> review`. Source and quality screens save process evidence through the existing `stage_3_lab_experiment_record` API; the formal decision and AI review continue to use existing backend APIs.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, FastAPI, existing Stage Three API and Artifact contracts.

**Completion note (2026-06-01):** Implemented and verified. The formal Stage Three path now renders `source -> quality -> decision -> review`; source and quality save as `stage_3_lab_experiment_record` with `selected_parameters.vnext_step` values `source_decision` and `quality_assessment`; decision, AI review, completion, and Stage Four unlock continue through the existing backend contracts.

**Verification evidence:** `npm run test:stage-one`, `npm run test:stage-two`, `npm run test:stage-three`, `npm run typecheck`, `npm run lint`, and `.venv/bin/python -m pytest backend/tests/test_stage_three.py -q` passed. Browser fallback verification used headless Chrome CDP because the Browser plugin route was unavailable; it completed the full Stage Three vNext flow and confirmed DB state `stage_3=completed`, `stage_4=not_started`, two vNext lab records, one knowledge decision, and one AI review. Screenshots: `/private/tmp/edufde-stage-three-vnext-source.png`, `/private/tmp/edufde-stage-three-vnext-decision.png`, `/private/tmp/edufde-stage-three-vnext-completed.png`.

---

## File Structure

- Modify `frontend/src/components/student-product/stage-three-flow.ts`: replace formal mode with vNext step, add source/quality sample specs, source/quality checklist types, process record payload helpers, vNext step derivation, and progress helpers.
- Modify `frontend/src/components/student-product/stage-three-flow.test.ts`: add TDD coverage for vNext step derivation, source/quality gates, process record payloads, and progress states.
- Modify `frontend/src/components/student-product/experiment-workspace.tsx`: change Stage Three state handling to derived/manual vNext step state like Stage One and Stage Two.
- Modify `frontend/src/components/student-product/stage-three-workspace.tsx`: replace the old four-entry formal homepage with vNext source, quality, decision, and review render paths.
- Modify `docs/dev/current-context.md`: update current recommendation after Stage Three P0 progresses.
- Modify `docs/dev/progress.md`: record Stage Three vNext P0 implementation and verification results.

## Task 1: Add vNext Flow Tests And Helpers

**Files:**
- Modify: `frontend/src/components/student-product/stage-three-flow.test.ts`
- Modify: `frontend/src/components/student-product/stage-three-flow.ts`

- [x] **Step 1: Write failing tests**

Add imports in `stage-three-flow.test.ts`:

```ts
  createStageThreeQualityRecordPayload,
  createStageThreeSourceRecordPayload,
  createStageThreeVNextProgressItems,
  deriveStageThreeVNextStep,
  isStageThreeQualityReady,
  isStageThreeSourceReady,
  stageThreeQualitySamples,
  stageThreeSourceDecisionItems,
  type StageThreeQualityChecks,
  type StageThreeQualitySelectionState,
  type StageThreeSourceChecks,
  type StageThreeSourceSelectionState,
```

Append these tests:

```ts
test("stage three vNext step starts at source without stage three artifacts", () => {
  assert.equal(deriveStageThreeVNextStep([], "not_started"), "source");
});

test("stage three vNext step derives from latest source and quality process records", () => {
  const sourceRecord: StageThreeArtifactLike = {
    ...baseArtifact,
    artifact_type: "stage_3_lab_experiment_record",
    content_json: {
      selected_parameters: {
        vnext_step: "source_decision",
      },
    },
  };
  const qualityRecord: StageThreeArtifactLike = {
    ...baseArtifact,
    artifact_type: "stage_3_lab_experiment_record",
    content_json: {
      selected_parameters: {
        vnext_step: "quality_assessment",
      },
    },
    created_at: "2026-06-01T08:10:00.000Z",
    id: "quality-record",
  };

  assert.equal(deriveStageThreeVNextStep([sourceRecord], "in_practice"), "quality");
  assert.equal(deriveStageThreeVNextStep([sourceRecord, qualityRecord], "in_practice"), "decision");
});

test("stage three vNext step opens review after decision or completion", () => {
  const decision: StageThreeArtifactLike = {
    ...baseArtifact,
    artifact_type: "stage_3_knowledge_decision",
    content_json: {
      knowledge_goal: "支撑审厂追溯问答。",
    },
  };

  assert.equal(deriveStageThreeVNextStep([decision], "in_practice"), "review");
  assert.equal(deriveStageThreeVNextStep([], "completed"), "review");
});

test("stage three source gate requires four correct decisions and four checks", () => {
  const checks: StageThreeSourceChecks = {
    dataTypes: true,
    mesRisk: true,
    paperStructuring: true,
    sourceHandling: true,
  };
  const selections: StageThreeSourceSelectionState = {
    mesExport: "clean",
    paperPhoto: "manual",
    sop: "direct",
    wechatScreenshot: "exclude",
  };

  assert.equal(isStageThreeSourceReady(selections, checks), true);
  assert.equal(isStageThreeSourceReady({ ...selections, mesExport: "direct" }, checks), false);
  assert.equal(isStageThreeSourceReady(selections, { ...checks, mesRisk: false }), false);
});

test("stage three quality gate requires sample viewing, correct judgments and checks", () => {
  const checks: StageThreeQualityChecks = {
    cleanVsEvidence: true,
    fieldCompleteness: true,
    noAutoFill: true,
    sourceCredibility: true,
  };
  const selections: StageThreeQualitySelectionState = {
    auditChecklist: "pass",
    mesExport: "clean",
    paperScan: "manual",
    personalMemo: "block",
  };
  const viewed = ["auditChecklist", "mesExport", "paperScan", "personalMemo"] as const;

  assert.equal(isStageThreeQualityReady(selections, viewed, checks), true);
  assert.equal(isStageThreeQualityReady({ ...selections, paperScan: "pass" }, viewed, checks), false);
  assert.equal(isStageThreeQualityReady(selections, viewed.slice(0, 3), checks), false);
});

test("stage three source and quality record payloads preserve process evidence in lab record artifacts", () => {
  const sourcePayload = createStageThreeSourceRecordPayload({
    checks: {
      dataTypes: true,
      mesRisk: true,
      paperStructuring: true,
      sourceHandling: true,
    },
    selections: {
      mesExport: "clean",
      paperPhoto: "manual",
      sop: "direct",
      wechatScreenshot: "exclude",
    },
  });
  const qualityPayload = createStageThreeQualityRecordPayload({
    checks: {
      cleanVsEvidence: true,
      fieldCompleteness: true,
      noAutoFill: true,
      sourceCredibility: true,
    },
    selections: {
      auditChecklist: "pass",
      mesExport: "clean",
      paperScan: "manual",
      personalMemo: "block",
    },
    viewedSampleKeys: ["auditChecklist", "mesExport", "paperScan", "personalMemo"],
  });

  assert.equal(sourcePayload.selected_parameters.vnext_step, "source_decision");
  assert.equal(qualityPayload.selected_parameters.vnext_step, "quality_assessment");
  assert.equal(sourcePayload.observations[0].layer, "数据准备");
  assert.equal(qualityPayload.observations[0].layer, "数据准备");
});

test("stage three vNext progress summarizes source, quality, decision and review", () => {
  const progress = createStageThreeVNextProgressItems(
    [
      {
        ...baseArtifact,
        artifact_type: "stage_3_lab_experiment_record",
        content_json: {
          selected_parameters: {
            vnext_step: "quality_assessment",
          },
        },
      },
    ],
    "in_practice",
  );

  assert.deepEqual(
    progress.map((item) => [item.key, item.state, item.meta]),
    [
      ["source", "done", "已保存"],
      ["quality", "done", "已保存"],
      ["decision", "ready", "待决策"],
      ["review", "locked", "先保存决策"],
    ],
  );
});
```

- [x] **Step 2: Run Stage Three tests and confirm RED**

Run:

```bash
cd frontend
npm run test:stage-three
```

Expected result: FAIL because the vNext helpers are not exported.

- [x] **Step 3: Implement vNext helper types**

Add these exports to `stage-three-flow.ts`:

```ts
export type StageThreeVNextStep = "source" | "quality" | "decision" | "review";

export type StageThreeMode = StageThreeVNextStep;

export type StageThreeSourceDecisionKey = "sop" | "mesExport" | "paperPhoto" | "wechatScreenshot";
export type StageThreeSourceDecisionValue = "direct" | "clean" | "manual" | "exclude" | "";
export type StageThreeSourceSelectionState = Record<StageThreeSourceDecisionKey, StageThreeSourceDecisionValue>;

export type StageThreeQualitySampleKey = "auditChecklist" | "mesExport" | "paperScan" | "personalMemo";
export type StageThreeQualityDecisionValue = "pass" | "clean" | "manual" | "block" | "";
export type StageThreeQualitySelectionState = Record<StageThreeQualitySampleKey, StageThreeQualityDecisionValue>;

export type StageThreeSourceChecks = {
  dataTypes: boolean;
  mesRisk: boolean;
  paperStructuring: boolean;
  sourceHandling: boolean;
};

export type StageThreeQualityChecks = {
  cleanVsEvidence: boolean;
  fieldCompleteness: boolean;
  noAutoFill: boolean;
  sourceCredibility: boolean;
};

export type StageThreeVNextProgressState = "locked" | "ready" | "active" | "done";
export type StageThreeVNextProgressItem = {
  key: StageThreeVNextStep;
  label: string;
  meta: string;
  state: StageThreeVNextProgressState;
};
```

Define `stageThreeSourceDecisionItems` and `stageThreeQualitySamples` with the exact sample keys and expected answers used in the tests.

- [x] **Step 4: Implement helper functions**

Add:

```ts
export function deriveStageThreeVNextStep(
  artifacts: StageThreeArtifactLike[],
  stageStatus?: string,
): StageThreeVNextStep {
  if (stageStatus === "completed") return "review";
  if (latestArtifactOfType(artifacts, stageThreeDecisionType)) return "review";

  const latestProcess = latestArtifactOfType(artifacts, stageThreeLabRecordType);
  const step = latestProcess?.content_json.selected_parameters &&
    typeof latestProcess.content_json.selected_parameters === "object"
    ? (latestProcess.content_json.selected_parameters as Record<string, unknown>).vnext_step
    : null;
  if (step === "quality_assessment") return "decision";
  if (step === "source_decision") return "quality";
  return "source";
}

export function isStageThreeSourceReady(
  selections: StageThreeSourceSelectionState,
  checks: StageThreeSourceChecks,
): boolean {
  return stageThreeSourceDecisionItems.every((item) => selections[item.key] === item.expected) &&
    Object.values(checks).every(Boolean);
}

export function isStageThreeQualityReady(
  selections: StageThreeQualitySelectionState,
  viewedSampleKeys: readonly StageThreeQualitySampleKey[],
  checks: StageThreeQualityChecks,
): boolean {
  return stageThreeQualitySamples.every(
    (item) => viewedSampleKeys.includes(item.key) && selections[item.key] === item.expected,
  ) && Object.values(checks).every(Boolean);
}
```

Implement `createStageThreeSourceRecordPayload`, `createStageThreeQualityRecordPayload`, and `createStageThreeVNextProgressItems` using the same payload shape required by `StageThreeLabExperimentRecordPayload`.

- [x] **Step 5: Run Stage Three tests and confirm GREEN**

Run:

```bash
cd frontend
npm run test:stage-three
```

Expected result: PASS.

## Task 2: Wire ExperimentWorkspace To The vNext Stage Three Step

**Files:**
- Modify: `frontend/src/components/student-product/experiment-workspace.tsx`

- [x] **Step 1: Import the new helper**

Change the Stage Three imports:

```ts
import {
  deriveStageThreeVNextStep,
  isStageThreeFocusedMode,
  type StageThreeMode,
} from "./stage-three-flow";
```

- [x] **Step 2: Replace the static Stage Three mode state**

Add a derived step:

```ts
const derivedStageThreeStep = deriveStageThreeVNextStep(
  artifactsByStage.stage_3,
  session.stage_records.find((record) => record.stage_key === "stage_3")?.status,
);
```

Replace `useState<StageThreeMode>("home")` with the same derived/manual state pattern used for Stage One and Stage Two:

```ts
const [stageThreeStepState, setStageThreeStepState] = useState<DerivedStepState<StageThreeMode>>({
  sessionId: session.id,
  source: "derived",
  step: derivedStageThreeStep,
});
const stageThreeStep =
  stageThreeStepState.sessionId === session.id
    ? stageThreeStepState.source === "derived"
      ? derivedStageThreeStep
      : stageThreeStepState.step
    : derivedStageThreeStep;
const effectiveStageThreeMode =
  activeStageKey === "stage_3" ? stageThreeStep : derivedStageThreeStep;
```

- [x] **Step 3: Reset Stage Three from derived state when selecting a stage**

In `handleStageSelect`, replace `setStageThreeMode("home")` with:

```ts
setStageThreeStepState({ sessionId: session.id, source: "derived", step: derivedStageThreeStep });
```

- [x] **Step 4: Pass manual setter into StageThreeWorkspace**

Change:

```tsx
onModeChange={setStageThreeMode}
```

to:

```tsx
onModeChange={(step) => setStageThreeStepState({ sessionId: session.id, source: "manual", step })}
```

- [x] **Step 5: Run typecheck**

Run:

```bash
cd frontend
npm run typecheck
```

Expected result: PASS after Stage Three workspace accepts the new step model.

## Task 3: Refactor StageThreeWorkspace Shell

**Files:**
- Modify: `frontend/src/components/student-product/stage-three-workspace.tsx`

- [x] **Step 1: Update imports**

Import the new helpers and types from `stage-three-flow.ts`:

```ts
  createStageThreeQualityRecordPayload,
  createStageThreeSourceRecordPayload,
  createStageThreeVNextProgressItems,
  isStageThreeQualityReady,
  isStageThreeSourceReady,
  stageThreeQualitySamples,
  stageThreeSourceDecisionItems,
  type StageThreeQualityChecks,
  type StageThreeQualitySampleKey,
  type StageThreeQualitySelectionState,
  type StageThreeSourceChecks,
  type StageThreeSourceSelectionState,
```

Remove formal use of `createStageThreeEntryItems`, `StageThreeEntryItem`, `StageThreeCaseTeaching`, and `StageThreeRagLab` from the main render path. The files may remain in the repo for now.

- [x] **Step 2: Add source and quality local state**

Inside `StageThreeWorkspace`, add:

```ts
const [sourceSelections, setSourceSelections] = useState<StageThreeSourceSelectionState>({
  mesExport: "",
  paperPhoto: "",
  sop: "",
  wechatScreenshot: "",
});
const [sourceChecks, setSourceChecks] = useState<StageThreeSourceChecks>({
  dataTypes: false,
  mesRisk: false,
  paperStructuring: false,
  sourceHandling: false,
});
const [qualitySelections, setQualitySelections] = useState<StageThreeQualitySelectionState>({
  auditChecklist: "",
  mesExport: "",
  paperScan: "",
  personalMemo: "",
});
const [qualityChecks, setQualityChecks] = useState<StageThreeQualityChecks>({
  cleanVsEvidence: false,
  fieldCompleteness: false,
  noAutoFill: false,
  sourceCredibility: false,
});
const [viewedQualitySamples, setViewedQualitySamples] = useState<StageThreeQualitySampleKey[]>([]);
```

Compute:

```ts
const vNextProgress = useMemo(
  () => createStageThreeVNextProgressItems(artifacts, stageStatus),
  [artifacts, stageStatus],
);
const sourceReady = isStageThreeSourceReady(sourceSelections, sourceChecks);
const qualityReady = isStageThreeQualityReady(qualitySelections, viewedQualitySamples, qualityChecks);
```

- [x] **Step 3: Add process-save handlers**

Add:

```ts
async function handleSaveSourceDecision() {
  if (!sourceReady || locked || completed || isSavingLabRecord) return;
  const ok = await onSaveLabExperimentRecord(
    createStageThreeSourceRecordPayload({
      checks: sourceChecks,
      selections: sourceSelections,
    }),
  );
  if (ok) onModeChange("quality");
}

async function handleSaveQualityAssessment() {
  if (!qualityReady || locked || completed || isSavingLabRecord) return;
  const ok = await onSaveLabExperimentRecord(
    createStageThreeQualityRecordPayload({
      checks: qualityChecks,
      selections: qualitySelections,
      viewedSampleKeys: viewedQualitySamples,
    }),
  );
  if (ok) onModeChange("decision");
}
```

- [x] **Step 4: Replace `workspaceMode === "home"` branch**

Remove the old `StageThreeHome` formal branch. Render:

```tsx
if (workspaceMode === "source") {
  return <StageThreeSourceDecisionView ... />;
}

if (workspaceMode === "quality") {
  return <StageThreeQualityAssessmentView ... />;
}
```

Keep `decision` for the existing knowledge decision editor and `review` for the existing review/completion panel.

- [x] **Step 5: Update focused header copy**

Update `StageThreeFocusedHeader` to use:

- Back button: `返回数据源识别`
- Status badge: current vNext step title

Update `modeTitle`:

```ts
const titles: Record<StageThreeMode, string> = {
  decision: "知识工程决策",
  quality: "数据质量评估",
  review: "AI 评审与阶段四交接",
  source: "数据源识别",
};
```

- [x] **Step 6: Run typecheck**

Run:

```bash
cd frontend
npm run typecheck
```

Expected result: PASS after adding the new view components in Tasks 4 and 5.

## Task 4: Build Data Source Identification View

**Files:**
- Modify: `frontend/src/components/student-product/stage-three-workspace.tsx`

- [x] **Step 1: Add `RagFlowNav`**

Create a local component that renders the ten Open Design vNext RAG steps. It accepts `activeStep: "source" | "quality" | "decision" | "review"` and labels unimplemented later steps as later slices.

- [x] **Step 2: Add `StageThreeSourceDecisionView`**

Render the vNext source screen with:

- hero kicker `Stage 03 / RAG Knowledge Engineering`;
- heading `数据源识别：判断哪些资料可以进入 RAG 知识库。`;
- principle strip for teaching focus, manufacturing context, and stage output;
- four source cards;
- candidate and excluded source quality lens;
- four decision practice rows using `stageThreeSourceDecisionItems`;
- right checklist using `sourceChecks`;
- save button `保存数据源决策并进入质量评估`.

The decision row select calls:

```ts
onSelectionChange(item.key, event.target.value as StageThreeSourceSelectionState[typeof item.key]);
```

The checklist checkbox calls:

```ts
onCheckChange("dataTypes", event.target.checked);
```

- [x] **Step 3: Disable source save until ready**

The save button must be disabled when:

```ts
locked || completed || isSaving || !ready
```

Button copy:

```tsx
{isSaving ? "保存中" : "保存数据源决策并进入质量评估"}
```

- [x] **Step 4: Run Stage Three tests and typecheck**

Run:

```bash
cd frontend
npm run test:stage-three
npm run typecheck
```

Expected result: PASS.

## Task 5: Build Data Quality Assessment View

**Files:**
- Modify: `frontend/src/components/student-product/stage-three-workspace.tsx`

- [x] **Step 1: Add `StageThreeQualityAssessmentView`**

Render the vNext quality screen with:

- hero heading `数据质量评估：判断资料是否足以支撑可信检索。`;
- quality principles for fields, source, consistency, traceability, and citation;
- matrix examples for SOP, MES export, paper scan, and personal memo;
- four sample cards using `stageThreeQualitySamples`;
- per-sample `查看样本详情` button that appends the sample key to `viewedQualitySamples`;
- select enabled only after that sample has been viewed;
- right gate card showing viewed count and correct judgment count;
- checklist using `qualityChecks`;
- save button `保存质量评估并进入知识工程决策`.

- [x] **Step 2: Add sample detail drawer or inline detail panel**

For P0 use an inline detail panel under the active sample. It should show the sample raw text and the correct handling explanation from `stageThreeQualitySamples`.

- [x] **Step 3: Disable quality save until ready**

The save button must be disabled when:

```ts
locked || completed || isSaving || !ready
```

- [x] **Step 4: Run Stage Three tests and typecheck**

Run:

```bash
cd frontend
npm run test:stage-three
npm run typecheck
```

Expected result: PASS.

## Task 6: Align Decision And Review Steps With vNext

**Files:**
- Modify: `frontend/src/components/student-product/stage-three-workspace.tsx`

- [x] **Step 1: Change project decision branch to `workspaceMode === "decision"`**

Replace the old condition:

```tsx
workspaceMode === "project_decision"
```

with:

```tsx
workspaceMode === "decision"
```

Keep the existing `KnowledgeDecisionEditor` and save behavior.

- [x] **Step 2: Change review branch to `workspaceMode === "review"`**

The review branch should keep:

- `RiskDocumentHero`
- `DecisionDocumentPreview`
- `KnowledgeReviewPanel`

Update visible copy from "风险预判与决策文档收口" to "AI 评审与阶段四交接" where it appears as the primary step title.

- [x] **Step 3: Remove old formal homepage copy from the formal branch**

The formal Stage Three path must no longer show these old primary-path strings:

- `知识工程决策中心`
- `预置案例教学`
- `五层知识实验室`
- `四入口推进`

These strings may remain only in unreachable legacy components or tests if they are not rendered by the formal path.

- [x] **Step 4: Run search, Stage Three tests, and typecheck**

Run:

```bash
rg -n "知识工程决策中心|预置案例教学|五层知识实验室|四入口推进" frontend/src/components/student-product/stage-three-workspace.tsx
cd frontend
npm run test:stage-three
npm run typecheck
```

Expected result: search returns no formal-path matches in `stage-three-workspace.tsx`; tests and typecheck pass.

## Task 7: Regression Verification

**Files:**
- No production edits unless a regression is found.

- [x] **Step 1: Run frontend Stage Three checks**

Run:

```bash
cd frontend
npm run test:stage-three
npm run typecheck
npm run lint
```

Expected result: PASS.

- [x] **Step 2: Run backend Stage Three regression**

Run:

```bash
.venv/bin/python -m pytest backend/tests/test_stage_three.py -q
```

Expected result: PASS.

- [x] **Step 3: Run browser verification**

Start backend and frontend development servers:

```bash
AI_PROVIDER=fake FRONTEND_ORIGIN=http://127.0.0.1:3002 .venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 18002
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:18002 npm run dev -- --hostname 127.0.0.1 --port 3002
```

Open `http://127.0.0.1:3002` and verify on a session with Stage Three unlocked:

- Stage Three first formal screen is data source identification.
- Four source decisions plus four checks enable saving and moving to quality.
- Four sample details, four quality judgments, and four checks enable saving and moving to decision.
- Decision save creates `stage_3_knowledge_decision`.
- AI review creates `stage_3_ai_review`.
- Completing Stage Three unlocks Stage Four.
- Browser console error/warn count is 0.

## Task 8: Update Development Governance

**Files:**
- Modify: `docs/dev/current-context.md`
- Modify: `docs/dev/progress.md`

- [x] **Step 1: Update progress**

Add a `2026-06-01 阶段三新版知识工程决策流程 P0` entry under "最近完成" with:

- vNext source/quality/decision/review implementation summary;
- process Artifact mapping;
- verification command results;
- browser verification result and screenshot path;
- verified limitations.

- [x] **Step 2: Update current context**

Replace the Stage Three recommendation with the next concrete task after Stage Three P0. If Stage Three browser verification passes, set the next recommendation to Stage Four vNext agent build flow P0.

- [x] **Step 3: Run documentation whitespace check**

Run:

```bash
git diff --check
```

Expected result: no whitespace errors.
