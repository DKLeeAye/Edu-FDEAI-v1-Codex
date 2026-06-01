# Stage Two vNext Solution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the formal Stage Two student path with the Open Design vNext guide + six-chapter solution workbench while preserving the existing Stage Two Artifact, AI Gateway, document review, yellow-flag, and Stage Three unlock contracts.

**Architecture:** Add vNext step and chapter helpers in `stage-two-flow.ts`, then refactor `StageTwoWorkspace` to render a guide and a six-chapter workbench. The workbench maps each vNext chapter to one or more existing Stage Two section keys, so production still writes `stage_2_section_*`, composes the three formal documents, reviews them through AI Gateway, and completes Stage Two through the current backend.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, FastAPI, existing Stage Two API and Artifact contracts.

---

## File Structure

- Modify `frontend/src/components/student-product/stage-two-flow.ts`: add `StageTwoVNextStep`, guide checks, chapter keys/specs, chapter progress helpers, chapter-to-section mapping helpers, and focused-mode update.
- Modify `frontend/src/components/student-product/stage-two-flow.test.ts`: add TDD coverage for vNext step derivation, guide readiness, six-chapter mapping, and chapter progress.
- Modify `frontend/src/components/student-product/experiment-workspace.tsx`: replace formal Stage Two mode state with vNext `guide/workbench` state and derive/reset it like Stage One.
- Modify `frontend/src/components/student-product/stage-two-workspace.tsx`: replace old formal Stage Two home/workbench split with vNext guide and six-chapter workbench render paths.
- Modify `docs/dev/current-context.md`: update the recommended next task after Stage Two P0 progress changes.
- Modify `docs/dev/progress.md`: record Stage Two vNext P0 implementation and verification results.

## Task 1: Add vNext Flow Tests And Helpers

**Files:**
- Modify: `frontend/src/components/student-product/stage-two-flow.test.ts`
- Modify: `frontend/src/components/student-product/stage-two-flow.ts`

- [x] **Step 1: Write failing tests**

Add imports in `stage-two-flow.test.ts`:

```ts
  createStageTwoVNextChapterProgress,
  deriveStageTwoVNextStep,
  getStageTwoVNextChapterSpec,
  isStageTwoGuideReady,
  stageTwoVNextChapterSpecs,
  type StageTwoGuideChecks,
```

Append these tests:

```ts
test("stage two vNext step starts at guide without stage two artifacts", () => {
  assert.equal(deriveStageTwoVNextStep([], "not_started"), "guide");
});

test("stage two vNext step opens workbench after any formal stage two artifact", () => {
  const artifacts: StageTwoArtifactLike[] = [
    {
      ...baseArtifact,
      artifact_type: "stage_2_section_draft",
      content_json: {
        document_type: "requirements_document",
        section_key: "requirements_context",
      },
    },
  ];

  assert.equal(deriveStageTwoVNextStep(artifacts, "in_practice"), "workbench");
  assert.equal(deriveStageTwoVNextStep([], "completed"), "workbench");
});

test("stage two guide requires all four checks before entering workbench", () => {
  const partial: StageTwoGuideChecks = {
    documentRoles: true,
    dataBoundary: true,
    outOfScope: false,
    technicalPlan: true,
  };
  const complete: StageTwoGuideChecks = {
    documentRoles: true,
    dataBoundary: true,
    outOfScope: true,
    technicalPlan: true,
  };

  assert.equal(isStageTwoGuideReady(partial), false);
  assert.equal(isStageTwoGuideReady(complete), true);
});

test("stage two vNext chapters map six report chapters onto existing nine sections", () => {
  assert.deepEqual(
    stageTwoVNextChapterSpecs.map((chapter) => [chapter.key, chapter.sectionKeys]),
    [
      ["background", ["requirements_context"]],
      ["requirement", ["requirements_scope"]],
      ["feasibility", ["feasibility_data", "feasibility_value"]],
      ["boundary", ["feasibility_technical"]],
      ["technical", ["technical_route", "technical_flow", "technical_handoff"]],
      ["acceptance", ["requirements_acceptance"]],
    ],
  );
  assert.equal(getStageTwoVNextChapterSpec("technical").title, "总体技术方案");
});

test("stage two vNext chapter progress is saved only after every mapped section is submitted", () => {
  const artifacts: StageTwoArtifactLike[] = [
    {
      ...baseArtifact,
      id: "data-submission",
      artifact_type: "stage_2_section_submission",
      content_json: {
        document_type: "feasibility_report",
        section_key: "feasibility_data",
      },
    },
    {
      ...baseArtifact,
      id: "value-draft",
      artifact_type: "stage_2_section_draft",
      content_json: {
        document_type: "feasibility_report",
        section_key: "feasibility_value",
      },
    },
  ];

  const progress = createStageTwoVNextChapterProgress(artifacts, "in_practice");
  const feasibility = progress.find((chapter) => chapter.key === "feasibility");

  assert.deepEqual(
    progress.map((chapter) => chapter.key),
    ["background", "requirement", "feasibility", "boundary", "technical", "acceptance"],
  );
  assert.equal(feasibility?.state, "needs_review");
  assert.equal(feasibility?.meta, "1/2 小节已确认");
});
```

- [x] **Step 2: Run the Stage Two frontend tests and confirm RED**

Run:

```bash
cd frontend
npm run test:stage-two
```

Expected result: FAIL because the vNext helpers are not exported.

2026-06-01 result: RED confirmed. `npm run test:stage-two` failed because `createStageTwoVNextChapterProgress` was not exported from `stage-two-flow.ts`.

- [x] **Step 3: Implement the vNext helper types and exports**

Add these types and constants to `stage-two-flow.ts`:

```ts
export type StageTwoVNextStep = "guide" | "workbench";

export type StageTwoGuideChecks = {
  documentRoles: boolean;
  dataBoundary: boolean;
  outOfScope: boolean;
  technicalPlan: boolean;
};

export type StageTwoVNextChapterKey =
  | "background"
  | "requirement"
  | "feasibility"
  | "boundary"
  | "technical"
  | "acceptance";

export type StageTwoVNextChapterState =
  | "draft"
  | "needs_review"
  | "ready_to_save"
  | "saved"
  | "locked";

export type StageTwoVNextChapterSpec = {
  key: StageTwoVNextChapterKey;
  number: string;
  title: string;
  kicker: string;
  methodTitle: string;
  methodBody: string;
  sectionKeys: StageTwoSectionKey[];
};

export type StageTwoVNextChapterProgress = {
  key: StageTwoVNextChapterKey;
  label: string;
  meta: string;
  state: StageTwoVNextChapterState;
};

export const stageTwoVNextChapterSpecs: StageTwoVNextChapterSpec[] = [
  {
    key: "background",
    kicker: "Background",
    methodBody:
      "先说明客户所在场景、审厂压力、当前处理方式和主要阻塞点。不要提前承诺技术方案。",
    methodTitle:
      "这一章不是写“客户想做 AI”，而是写清楚业务为什么需要被解决。",
    number: "01",
    sectionKeys: ["requirements_context"],
    title: "项目背景与客户问题",
  },
  {
    key: "requirement",
    kicker: "Requirement Analysis",
    methodBody:
      "说明谁使用、在什么场景使用、输入什么、期望得到什么、有哪些限制条件。",
    methodTitle: "需求分析要把“想要一个智能体”拆成用户、场景、任务和约束。",
    number: "02",
    sectionKeys: ["requirements_scope"],
    title: "需求分析",
  },
  {
    key: "feasibility",
    kicker: "Feasibility Study",
    methodBody:
      "分别评估业务价值、数据条件、技术路径、组织落地和风险边界。",
    methodTitle: "可行性研究不是证明“肯定能做”，而是诚实判断可做范围。",
    number: "03",
    sectionKeys: ["feasibility_data", "feasibility_value"],
    title: "可行性研究",
  },
  {
    key: "boundary",
    kicker: "Capability Boundary",
    methodBody:
      "用明确句子写出范围内、范围外和转人工条件，避免项目被无限扩大。",
    methodTitle: "好的技术方案必须写清楚“做什么”和“不做什么”。",
    number: "04",
    sectionKeys: ["feasibility_technical"],
    title: "能力边界",
  },
  {
    key: "technical",
    kicker: "Technical Architecture",
    methodBody:
      "说明知识库放什么、结构化数据怎么来、工作流如何处理风险、输出如何带证据。",
    methodTitle: "总体技术方案要让实现团队知道数据、流程、智能体和验收如何连接。",
    number: "05",
    sectionKeys: ["technical_route", "technical_flow", "technical_handoff"],
    title: "总体技术方案",
  },
  {
    key: "acceptance",
    kicker: "Acceptance & Risk",
    methodBody:
      "把验收拆成范围内回答、范围外拒答、缺失字段提示、证据引用和人工确认。",
    methodTitle: "验收标准要能被测试，风险说明要能被追踪。",
    number: "06",
    sectionKeys: ["requirements_acceptance"],
    title: "验收与风险说明",
  },
];
```

- [x] **Step 4: Implement helper functions**

Add these exports to `stage-two-flow.ts`:

```ts
export function deriveStageTwoVNextStep(
  artifacts: StageTwoArtifactLike[],
  stageStatus?: string,
): StageTwoVNextStep {
  if (stageStatus === "completed") {
    return "workbench";
  }
  return artifacts.length > 0 ? "workbench" : "guide";
}

export function isStageTwoGuideReady(checks: StageTwoGuideChecks): boolean {
  return Object.values(checks).every(Boolean);
}

export function getStageTwoVNextChapterSpec(
  chapterKey: StageTwoVNextChapterKey,
): StageTwoVNextChapterSpec {
  return (
    stageTwoVNextChapterSpecs.find((chapter) => chapter.key === chapterKey) ??
    stageTwoVNextChapterSpecs[0]
  );
}

export function createStageTwoVNextChapterProgress(
  artifacts: StageTwoArtifactLike[],
  stageStatus?: string,
): StageTwoVNextChapterProgress[] {
  return stageTwoVNextChapterSpecs.map((chapter) => {
    if (stageStatus === "locked") {
      return {
        key: chapter.key,
        label: chapter.title,
        meta: "未解锁",
        state: "locked",
      };
    }
    const submittedCount = chapter.sectionKeys.filter((sectionKey) =>
      latestStageTwoSectionSubmission(
        artifacts,
        getStageTwoSectionDocumentType(sectionKey),
        sectionKey,
      ),
    ).length;
    if (submittedCount === chapter.sectionKeys.length) {
      return {
        key: chapter.key,
        label: chapter.title,
        meta: "已保存",
        state: "saved",
      };
    }
    const draftCount = chapter.sectionKeys.filter((sectionKey) =>
      latestStageTwoSectionDraft(
        artifacts,
        getStageTwoSectionDocumentType(sectionKey),
        sectionKey,
      ),
    ).length;
    const readyCount = chapter.sectionKeys.filter((sectionKey) => {
      const documentType = getStageTwoSectionDocumentType(sectionKey);
      const draft = latestStageTwoSectionDraft(artifacts, documentType, sectionKey);
      const review = latestStageTwoSectionReview(artifacts, documentType, sectionKey, draft?.id);
      return review?.content_json.can_submit === true && !hasRedFlags(review);
    }).length;
    if (readyCount === chapter.sectionKeys.length) {
      return {
        key: chapter.key,
        label: chapter.title,
        meta: "可确认保存",
        state: "ready_to_save",
      };
    }
    if (draftCount > 0 || readyCount > 0 || submittedCount > 0) {
      return {
        key: chapter.key,
        label: chapter.title,
        meta: `${submittedCount}/${chapter.sectionKeys.length} 小节已确认`,
        state: "needs_review",
      };
    }
    return {
      key: chapter.key,
      label: chapter.title,
      meta: "待撰写",
      state: "draft",
    };
  });
}

export function getStageTwoSectionDocumentType(
  sectionKey: StageTwoSectionKey,
): StageTwoDocumentKey {
  const spec = stageTwoSectionSpecs.find((section) => section.key === sectionKey);
  return spec?.documentType ?? "requirements_document";
}

export function isStageTwoFocusedMode(mode: StageTwoMode): boolean {
  return mode === "workbench";
}
```

Also change `StageTwoMode` to:

```ts
export type StageTwoMode = StageTwoVNextStep;
```

- [x] **Step 5: Run Stage Two frontend tests and confirm GREEN**

Run:

```bash
cd frontend
npm run test:stage-two
```

Expected result: PASS.

2026-06-01 result: PASS. `npm run test:stage-two` completed 9/9 passing tests.

## Task 2: Wire Stage Two vNext Step In The Experiment Workspace

**Files:**
- Modify: `frontend/src/components/student-product/experiment-workspace.tsx`

- [x] **Step 1: Replace Stage Two mode state with derived vNext step**

Import `deriveStageTwoVNextStep` from `stage-two-flow.ts`.

Replace:

```ts
const [stageTwoMode, setStageTwoMode] = useState<StageTwoMode>("home");
const effectiveStageTwoMode = activeStageKey === "stage_2" ? stageTwoMode : "home";
```

with:

```ts
const derivedStageTwoStep = deriveStageTwoVNextStep(
  artifactsByStage.stage_2,
  session.stage_records.find((record) => record.stage_key === "stage_2")?.status,
);
const [stageTwoStepState, setStageTwoStepState] = useState<{
  sessionId: string;
  step: StageTwoMode;
}>({
  sessionId: session.id,
  step: derivedStageTwoStep,
});
const stageTwoStep =
  stageTwoStepState.sessionId === session.id ? stageTwoStepState.step : derivedStageTwoStep;
const effectiveStageTwoMode = activeStageKey === "stage_2" ? stageTwoStep : derivedStageTwoStep;
```

- [x] **Step 2: Reset Stage Two step when stage navigation changes**

In `handleStageSelect`, replace:

```ts
setStageTwoMode("home");
```

with:

```ts
setStageTwoStepState({ sessionId: session.id, step: derivedStageTwoStep });
```

- [x] **Step 3: Pass the new setter into StageTwoWorkspace**

Replace:

```tsx
onModeChange={setStageTwoMode}
```

with:

```tsx
onModeChange={(step) => setStageTwoStepState({ sessionId: session.id, step })}
```

- [x] **Step 4: Run typecheck**

Run:

```bash
cd frontend
npm run typecheck
```

Expected result: PASS.

2026-06-01 result: PASS after StageTwoWorkspace guide branch was updated for the new `guide/workbench` mode.

## Task 3: Replace The Stage Two Guide Screen

**Files:**
- Modify: `frontend/src/components/student-product/stage-two-workspace.tsx`

- [x] **Step 1: Add guide state and imports**

Import `isStageTwoGuideReady`, `type StageTwoGuideChecks`, and `type StageTwoVNextStep`.

Inside `StageTwoWorkspace`, add:

```ts
const [guideChecks, setGuideChecks] = useState<StageTwoGuideChecks>({
  dataBoundary: false,
  documentRoles: false,
  outOfScope: false,
  technicalPlan: false,
});
const guideReady = isStageTwoGuideReady(guideChecks);
```

- [x] **Step 2: Replace the old home branch**

Replace the `workspaceMode === "home"` branch with:

```tsx
if (workspaceMode === "guide") {
  return (
    <StageTwoGuideView
      checks={guideChecks}
      isRefreshing={isRefreshing}
      locked={locked}
      onCheckChange={setGuideChecks}
      onEnterWorkbench={() => onModeChange("workbench")}
      onRefresh={onRefresh}
      ready={guideReady}
      stageOneArtifacts={stageOneArtifacts}
      statusLabel={status.label}
    />
  );
}
```

- [x] **Step 3: Add `StageTwoGuideView`**

Create `StageTwoGuideView` in `stage-two-workspace.tsx`. It must render the vNext guide copy from the spec:

- hero text;
- stage handoff strip;
- three deliverable cards;
- case translation board;
- feasibility lens cards;
- technical plan flow;
- four checkboxes;
- disabled/enabled enter button;
- Stage One evidence side card.

Use stable labels:

```tsx
const guideCheckItems: Array<{
  key: keyof StageTwoGuideChecks;
  label: string;
}> = [
  { key: "documentRoles", label: "我能区分需求分析、可行性研究和技术方案的职责。" },
  { key: "dataBoundary", label: "我知道 MES 字段缺失是方案边界风险，不是 AI 自动补齐任务。" },
  { key: "outOfScope", label: "我能写出至少 3 条项目不做范围。" },
  { key: "technicalPlan", label: "我知道总体方案必须包含数据、能力、流程和验收指标。" },
];
```

- [x] **Step 4: Remove old formal Stage Two home copy from the formal branch**

The formal Stage Two render path must no longer show:

- `先学会判断，再生成方案文档`
- `进入阶段二核心操作区`
- `三份文档串行`

Those strings may remain only if they are unreachable or intentionally retained in non-formal compatibility code.

- [x] **Step 5: Run Stage Two tests and typecheck**

Run:

```bash
cd frontend
npm run test:stage-two
npm run typecheck
```

Expected result: PASS.

2026-06-01 result: PASS for `npm run test:stage-two` and `npm run typecheck`. `rg` confirmed old formal copy `先学会判断，再生成方案文档` and `进入阶段二核心操作区` is absent from `stage-two-workspace.tsx`.

## Task 4: Build The Six-Chapter Workbench Shell

**Files:**
- Modify: `frontend/src/components/student-product/stage-two-workspace.tsx`
- Modify: `frontend/src/components/student-product/stage-two-flow.ts`

- [x] **Step 1: Add chapter state**

Inside `StageTwoWorkspace`, add:

```ts
const chapterProgress = useMemo(
  () => createStageTwoVNextChapterProgress(artifacts, stageStatus),
  [artifacts, stageStatus],
);
const [activeChapter, setActiveChapter] = useState<StageTwoVNextChapterKey>("background");
const activeChapterSpec = getStageTwoVNextChapterSpec(activeChapter);
```

- [x] **Step 2: Replace the old workbench side navigation**

Use `chapterProgress` to render six chapter rail buttons:

```tsx
{chapterProgress.map((chapter) => (
  <button
    className={
      activeChapter === chapter.key
        ? "rounded-2xl border border-slate-950 bg-slate-950 p-3 text-left text-white"
        : "rounded-2xl border border-slate-200 bg-white p-3 text-left text-slate-800 hover:border-slate-300"
    }
    key={chapter.key}
    onClick={() => setActiveChapter(chapter.key)}
    type="button"
  >
    <span>{getStageTwoVNextChapterSpec(chapter.key).number}</span>
    <strong>{chapter.label}</strong>
    <em>{stageTwoVNextChapterStateCopy(chapter.state)}</em>
  </button>
))}
```

`stageTwoVNextChapterStateCopy` should map:

```ts
{
  draft: "未检",
  locked: "未解锁",
  needs_review: "待完善",
  ready_to_save: "合格",
  saved: "已保存",
}
```

- [x] **Step 3: Add the vNext workbench hero and context strip**

Render:

- `Stage 02 / Evidence-driven Report Workspace`
- `从访谈证据，推导可交付的技术方案。`
- three context cards:
  - `阶段一输入 / 周明访谈记录`
  - `本阶段产物 / 三份正式材料`
  - `进入阶段三条件 / 边界与数据条件明确`

- [x] **Step 4: Render active chapter method/evidence/writing layers**

Create `StageTwoChapterEditor` that receives:

```ts
{
  activeChapterSpec: StageTwoVNextChapterSpec;
  artifacts: Artifact[];
  currentDraftState: DraftState;
  documentLocked: boolean;
  onFieldChange: (sectionKey: StageTwoSectionKey, fieldKey: string, value: string) => void;
  stageOneArtifacts: Artifact[];
}
```

For every mapped section in `activeChapterSpec.sectionKeys`, render the existing `stageTwoSectionSpecs` fields. This keeps the six vNext chapters while preserving nine backend section payloads.

- [x] **Step 5: Run typecheck**

Run:

```bash
cd frontend
npm run typecheck
```

Expected result: PASS.

2026-06-01 result: PASS for `npm run typecheck`.

## Task 5: Wire Chapter Actions To Existing Stage Two APIs

**Files:**
- Modify: `frontend/src/components/student-product/stage-two-workspace.tsx`

- [x] **Step 1: Replace active-section-only handlers with chapter handlers**

Create handlers:

```ts
async function handleSaveChapterDraft(chapterKey: StageTwoVNextChapterKey): Promise<void> {
  if (documentLocked) return;
  const chapter = getStageTwoVNextChapterSpec(chapterKey);
  for (const sectionKey of chapter.sectionKeys) {
    const spec = sectionSpec(sectionKey);
    if (!isSectionDraftReady(spec, currentDraftState.drafts[sectionKey])) {
      continue;
    }
    await onSaveSectionDraft({
      document_type: spec.documentType,
      evidence_artifact_ids: currentDraftState.evidence[sectionKey],
      section_key: sectionKey,
      student_reflection: currentDraftState.reflections[sectionKey]?.trim() || undefined,
      student_responses: toStudentResponses(spec, currentDraftState.drafts[sectionKey]),
    });
  }
}

async function handleRequestChapterReview(chapterKey: StageTwoVNextChapterKey): Promise<void> {
  const chapter = getStageTwoVNextChapterSpec(chapterKey);
  for (const sectionKey of chapter.sectionKeys) {
    const spec = sectionSpec(sectionKey);
    const draft = latestStageTwoSectionDraft(artifacts, spec.documentType, sectionKey);
    const submission = latestStageTwoSectionSubmission(artifacts, spec.documentType, sectionKey);
    if (draft && !submission) {
      await onRequestSectionReview(spec.documentType, sectionKey);
    }
  }
}

async function handleConfirmChapter(chapterKey: StageTwoVNextChapterKey): Promise<void> {
  const chapter = getStageTwoVNextChapterSpec(chapterKey);
  for (const sectionKey of chapter.sectionKeys) {
    const spec = sectionSpec(sectionKey);
    const draft = latestStageTwoSectionDraft(artifacts, spec.documentType, sectionKey);
    const review = latestStageTwoSectionReview(artifacts, spec.documentType, sectionKey, draft?.id);
    const submission = latestStageTwoSectionSubmission(artifacts, spec.documentType, sectionKey);
    if (!submission && review?.content_json.can_submit === true && !hasFlags(review.content_json.red_flags)) {
      await onSubmitSection(spec.documentType, sectionKey);
    }
  }
}
```

- [x] **Step 2: Render chapter action buttons**

Buttons:

- `保存本章草稿`
- `AI 检查本章`
- `确认合格并保存本章`

Disable based on:

- stage locked/completed;
- saving/reviewing state;
- no required fields ready;
- no drafts for review;
- chapter progress not `ready_to_save`.

- [x] **Step 3: Keep document-level actions in the right-side panel**

The panel should still expose:

- compose active formal document;
- request document review;
- show latest document review;
- show yellow flags;
- complete Stage Two.

The active formal document can be derived from the active chapter's first mapped section:

```ts
const activeDocument = sectionSpec(activeChapterSpec.sectionKeys[0]).documentType;
```

- [x] **Step 4: Run Stage Two tests and typecheck**

Run:

```bash
cd frontend
npm run test:stage-two
npm run typecheck
```

Expected result: PASS.

2026-06-01 result: PASS for `npm run test:stage-two` and `npm run typecheck`.

## Task 6: Add Report Preview And Completion Copy

**Files:**
- Modify: `frontend/src/components/student-product/stage-two-workspace.tsx`

- [x] **Step 1: Add preview modal state**

Add:

```ts
const [previewOpen, setPreviewOpen] = useState(false);
```

- [x] **Step 2: Add preview action in workbench header**

Render two top actions:

- `预览报告`
- `提交阶段二`

`预览报告` opens the modal. `提交阶段二` calls `onCompleteStage` only when `canComplete` is true.

- [x] **Step 3: Render report preview modal**

The modal should list the six chapter titles and the current field values from `currentDraftState`. It should not write localStorage or bypass backend completion.

- [x] **Step 4: Run typecheck**

Run:

```bash
cd frontend
npm run typecheck
```

Expected result: PASS.

2026-06-01 result: PASS for `npm run typecheck`. Additional `npm run test:stage-two` also passed 9/9.

## Task 7: Regression Verification

**Files:**
- No production edits unless a regression is found.

- [x] **Step 1: Run frontend Stage Two checks**

Run:

```bash
cd frontend
npm run test:stage-two
npm run typecheck
npm run lint
```

Expected result: PASS.

2026-06-01 result: PASS for `npm run test:stage-two`, `npm run typecheck`, and `npm run lint`.

- [x] **Step 2: Run backend Stage Two regression**

Run:

```bash
.venv/bin/python -m pytest backend/tests/test_stage_two.py -q
```

Expected result: PASS.

2026-06-01 result: PASS with `.venv/bin/python -m pytest backend/tests/test_stage_two.py -q` (11 passed, 1 LangGraph deprecation warning).

- [x] **Step 3: Run browser verification**

Start backend and frontend development servers:

```bash
AI_PROVIDER=fake FRONTEND_ORIGIN=http://127.0.0.1:3002 .venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 18002
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:18002 npm run dev -- --hostname 127.0.0.1 --port 3002
```

Open `http://127.0.0.1:3002` and verify:

- Stage Two first formal screen is the vNext guide.
- Four guide checks enable entry to workbench.
- Workbench shows the six vNext chapters.
- Old formal copy `先学会判断，再生成方案文档` and `进入阶段二核心操作区` is absent.
- At least one chapter can save draft and request AI check.
- Preview report opens.
- Existing full Stage Two backend path can still complete Stage Two and unlock Stage Three on a prepared session.
- Browser console error/warn count is 0.

2026-06-01 result: PASS for the implemented P0 browser slice. With `http://127.0.0.1:3002` and fake-provider backend on `http://127.0.0.1:18002`, a clean Stage One-completed student entered the vNext Stage Two guide, completed all 4 guide checks, entered the six-chapter workbench, saved Chapter 01 draft, generated AI section review, confirmed the section submission, and opened report preview. Old formal copy `先学会判断`, `进入阶段二核心操作区`, and `三份文档串行` was absent from the formal workbench. Console error/warn count was 0. Screenshot path: `/private/tmp/edufde-stage-two-vnext-workbench.png`. Backend DB check confirmed `stage_2_section_draft`, `stage_2_section_review`, and `stage_2_section_submission` for `requirements_context`. Full six-chapter browser completion was not manually run in this P0 slice; existing backend Stage Two regression remains the coverage for full Stage Two completion/unlock.

## Task 8: Update Development Governance

**Files:**
- Modify: `docs/dev/current-context.md`
- Modify: `docs/dev/progress.md`

- [x] **Step 1: Update progress**

Add a `2026-06-01 阶段二新版方案定义流程 P0` entry under "最近完成" with:

- vNext guide and six-chapter workbench implementation summary;
- mapping from six UI chapters to nine existing backend sections;
- verification command results;
- browser verification result and screenshot path;
- observed limitations, written as explicit verified facts.

- [x] **Step 2: Update current context**

Replace the old "阶段一新版访谈流程精修第一切片" recommendation with the next concrete task after Stage Two P0. If Stage Two browser verification passes, set the next recommendation to Stage Three vNext knowledge decision flow.

- [x] **Step 3: Run documentation whitespace check**

Run:

```bash
git diff --check
```

Expected result: no whitespace errors.

2026-06-01 result: PASS. `git diff --check` completed with no whitespace errors.
