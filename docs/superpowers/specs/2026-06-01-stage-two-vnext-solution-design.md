# Stage Two vNext Solution Design

## Context

Open Design vNext is the formal product experience baseline for this upgrade. Stage One has already moved to the vNext `guide -> lab -> submit` path. Stage Two now needs the same treatment using:

- `docs/prototypes/open-design-vnext/screens/07-solution-guide.html`
- `docs/prototypes/open-design-vnext/screens/07-solution-definition.html`

The existing production backend already has the long-term Stage Two contract: three formal documents, nine section drafts/submissions, section-level AI review, document-level AI review, yellow-flag debt, and Stage Three unlock. The vNext UI must sit on top of those contracts instead of replacing them with local-only state.

## Product Decision

Stage Two formal student experience becomes:

```text
阶段二导学
-> 六章报告工作台
-> 预览阶段二报告
-> 完成阶段二并解锁阶段三
```

The old formal Stage Two home card and "阶段二核心操作区" split is no longer the primary product path. It can remain only as internal implementation history while the formal UI renders vNext guide/workbench states.

## Experience Requirements

### Stage Two Guide

The first formal Stage Two screen should match the intent of `07-solution-guide.html`:

- Hero copy: "把访谈证据转成可行性研究，再形成总体技术方案。"
- Stage handoff strip: Stage One input, Stage Two training, Stage Three knowledge engineering.
- Deliverable explanation: requirements analysis report, feasibility study report, technical solution.
- Case translation board: interview evidence -> requirement analysis -> feasibility judgement -> technical-plan hint.
- Feasibility lens: business value, data condition, technical path, non-negotiable boundary.
- Technical-plan flow: user, input, knowledge/data, agent capability, acceptance.
- Right-side pre-workspace checklist with four checks:
  - distinguish requirements, feasibility, and technical-plan responsibilities;
  - treat MES field gaps as boundary risk rather than AI auto-completion;
  - write at least three out-of-scope items;
  - include data, capability, process, and acceptance indicators.
- The "enter workbench" action is disabled until all four checks are selected.

### Stage Two Workbench

The formal workbench should match the intent of `07-solution-definition.html`:

- Header/nav identifies "方案工作台" and provides report preview and Stage Two submit actions.
- Left chapter rail lists six report chapters:
  1. 项目背景与客户问题
  2. 需求分析
  3. 可行性研究
  4. 能力边界
  5. 总体技术方案
  6. 验收与风险说明
- Hero copy: "从访谈证据，推导可交付的技术方案。"
- Context strip shows Stage One input, Stage Two outputs, and Stage Three entry condition.
- Each chapter has three layers:
  - writing teaching method;
  - Stage One evidence shelf;
  - student writing zone.
- Each chapter supports:
  - draft editing;
  - saving mapped section drafts;
  - AI chapter check through the existing Stage Two section-review API;
  - confirming/saving the chapter after mapped sections can be submitted;
  - status display in the chapter rail.
- Preview composes the six chapters into a report-style readout before final completion.
- Completion remains blocked until the three formal backend documents are composed and reviewed without red flags.

## Backend And Artifact Mapping

The vNext six chapters map to the existing nine backend section keys:

| vNext chapter | Existing document | Existing section keys |
| --- | --- | --- |
| `background` 项目背景与客户问题 | `requirements_document` | `requirements_context` |
| `requirement` 需求分析 | `requirements_document` | `requirements_scope` |
| `feasibility` 可行性研究 | `feasibility_report` | `feasibility_data`, `feasibility_value` |
| `boundary` 能力边界 | `feasibility_report` | `feasibility_technical` |
| `technical` 总体技术方案 | `technical_solution` | `technical_route`, `technical_flow`, `technical_handoff` |
| `acceptance` 验收与风险说明 | `requirements_document` | `requirements_acceptance` |

Chapter actions call the existing APIs, possibly more than once for a chapter mapped to multiple backend sections. This preserves:

- `stage_2_section_draft`
- `stage_2_section_review`
- `stage_2_section_submission`
- `stage_2_requirements_document`
- `stage_2_feasibility_report`
- `stage_2_technical_solution`
- `stage_2_document_review`
- yellow-flag content inside document reviews

No Stage Two UI code may call an AI provider directly. AI checks must continue through `requestStageTwoSectionReview` and `requestStageTwoDocumentReview`, both backed by AI Gateway.

## State Model

Production frontend should replace the old `StageTwoMode = "home" | "guided_workbench"` with a vNext step:

```ts
type StageTwoVNextStep = "guide" | "workbench";
```

Initial step derivation:

- locked stage: render locked guide/empty state;
- no Stage Two artifacts and not completed: `guide`;
- any Stage Two draft/review/submission/document artifact: `workbench`;
- completed stage: `workbench`.

The workbench is the focused Stage Two mode. For this P0 slice, the guide renders inside the normal project shell, matching the current Stage One guide integration pattern.

## Data Seeding

The writing zones should prefill from Stage One evidence where available:

- `stage_1_problem_summary`
- `stage_1_visit_notes`
- `stage_1_interview_turn`

The seeded text should remain editable. When a backend draft/submission already exists, it overrides the seed.

## Quality Gates

P0 completion for Stage Two vNext requires:

- the old formal Stage Two home / core-operation split is not the primary path;
- the guide checklist gates entry to the workbench;
- the six-chapter rail and report workbench render using vNext copy and structure;
- chapter progress derives from backend artifacts, not local-only state;
- chapter save/check/confirm calls preserve existing section Artifact contracts;
- document compose/review/complete calls preserve existing Stage Two gates;
- Stage Three unlock still depends on reviewed formal documents;
- Stage One evidence remains visible as Stage Two input;
- yellow flags from document reviews remain visible and tied to later-stage impact;
- browser verification covers guide entry, at least one chapter save/check/confirm path, preview, and completion on a prepared Stage Two session.

## Verification

Required automated checks:

```bash
cd frontend
npm run test:stage-two
npm run typecheck
npm run lint

.venv/bin/python -m pytest backend/tests/test_stage_two.py -q
```

Required browser checks:

- Stage Two first formal screen is the vNext guide.
- All four guide checks enable "进入阶段二工作台".
- Workbench shows the six vNext chapters and does not show the old "先学会判断，再生成方案文档" home copy.
- A chapter can save draft content and request AI check through existing backend APIs.
- Existing Stage Two formal document completion path still unlocks Stage Three.
