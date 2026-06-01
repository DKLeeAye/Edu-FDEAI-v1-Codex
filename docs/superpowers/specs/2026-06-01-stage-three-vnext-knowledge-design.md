# Stage Three vNext Knowledge Engineering Design

## Context

Open Design vNext is the formal product experience baseline for this upgrade. Stage One has moved to the vNext interview flow and Stage Two has moved to the vNext guide plus six-chapter solution workbench. Stage Three now needs the same front-end driven migration using:

- `docs/prototypes/open-design-vnext/screens/08-knowledge-decision.html`
- `docs/prototypes/open-design-vnext/screens/08-rag-data-quality.html`
- the broader `docs/prototypes/open-design-vnext/screens/08-rag-*.html` flow as later-stage context

The prototype expands Stage Three into ten RAG knowledge-engineering pages. Migrating all ten at once would be too large for one stable product slice. P0 therefore implements the formal entry, first data-quality decision, and project knowledge decision handoff while preserving the existing backend contracts.

## Product Decision

Stage Three formal student experience becomes:

```text
数据源识别
-> 数据质量评估
-> 知识工程决策
-> AI 评审与阶段四交接
```

The old formal Stage Three homepage with parallel entries for "预置案例教学 / 五层知识实验室 / 项目知识工程决策 / 风险预判与决策文档" is no longer the primary product path. Those legacy views can remain as implementation history or later reference, but the formal student path must render the vNext RAG flow.

## Scope

P0 implements:

1. RAG Step 01: 数据源识别.
2. RAG Step 02: 数据质量评估.
3. A vNext decision workbench backed by the existing `stage_3_knowledge_decision` API.
4. A vNext review and handoff screen backed by the existing `stage_3_ai_review` and `completeStageThree` APIs.

P0 does not implement full standalone pages for cleaning, structure, chunking, vector storage, retrieval, answer citation, recall test, or risk boundary. Those remain later Stage Three slices. P0 must still leave the data model open for those later process records.

## Experience Requirements

### Data Source Identification

The first formal Stage Three screen should match the intent of `08-knowledge-decision.html`:

- Hero copy: "数据源识别：判断哪些资料可以进入 RAG 知识库。"
- RAG flow nav shows the ten prototype steps, with Step 01 active and later steps marked as later slices where not implemented.
- Principle strip explains:
  - this is not direct file upload;
  - manufacturing QA sources are scattered and uneven;
  - the stage output is a knowledge engineering decision document.
- Source cards explain stable knowledge, audit materials, dynamic records, and raw materials.
- Quality lens separates candidate sources from sources that should not be directly included.
- Decision practice requires four source decisions:
  - SOP v3.2 -> priority candidate;
  - MES export CSV -> enter quality assessment;
  - paper inspection photo -> needs structure/manual review;
  - WeChat screenshot -> exclude.
- Right-side checklist requires four confirmations before saving the source decision.
- Saving source decision creates a process Artifact through the existing Stage Three lab experiment API and moves to data quality.

### Data Quality Assessment

The second formal Stage Three screen should match the intent of `08-rag-data-quality.html`:

- Hero copy: "数据质量评估：判断资料是否足以支撑可信检索。"
- RAG flow nav shows Step 02 active.
- Quality principles cover field completeness, source credibility, consistency, traceability, and citation usability.
- Sample practice requires viewing and judging four samples:
  - customer audit checklist -> high quality candidate;
  - MES quality export -> clean before use;
  - rework paper scan -> manual evidence/OCR review;
  - personal memo -> do not include.
- Right-side gate tracks viewed samples, correct judgments, and four checklist confirmations.
- Saving quality assessment creates or updates a process Artifact through the existing Stage Three lab experiment API and moves to the knowledge decision workbench.

### Knowledge Decision Workbench

The decision workbench replaces the old "项目知识工程决策" entry as the formal third step:

- It uses Stage Two formal outputs as input evidence, especially technical solution and feasibility artifacts.
- It pre-fills from Stage Two artifacts and the latest Stage Three process record when possible.
- It keeps the existing five decision layers:
  - data preparation;
  - chunking strategy;
  - embedding and storage;
  - retrieval strategy;
  - evaluation and maintenance.
- Saving calls the existing `saveStageThreeDecision` path and creates `stage_3_knowledge_decision`.
- The decision cannot bypass existing required fields from `StageThreeKnowledgeDecisionRequest`.

### AI Review And Stage Four Handoff

The review screen replaces the old "风险预判与决策文档" entry as the formal fourth step:

- It previews the saved knowledge decision.
- It shows risks, Stage Four readiness, and AI review evidence.
- AI review calls the existing Stage Three AI review endpoint and must go through AI Gateway.
- Completing Stage Three still requires a saved `stage_3_knowledge_decision` and a `stage_3_ai_review`, then unlocks Stage Four.

## Backend And Artifact Mapping

P0 does not require a new table or new endpoint.

| vNext step | Existing backend artifact | Notes |
| --- | --- | --- |
| `source` 数据源识别 | `stage_3_lab_experiment_record` | Store `selected_parameters.vnext_step = "source_decision"` plus source decisions and checklist state. |
| `quality` 数据质量评估 | `stage_3_lab_experiment_record` | Store `selected_parameters.vnext_step = "quality_assessment"` plus sample judgments and checklist state. |
| `decision` 知识工程决策 | `stage_3_knowledge_decision` | Existing formal decision contract remains authoritative. |
| `review` AI 评审与交接 | `stage_3_ai_review` and stage completion | Existing AI Gateway review and Stage Four unlock remain authoritative. |

The process record still uses `StageThreeLabExperimentRecordRequest`, whose `selected_parameters` is already a flexible dictionary. This lets later slices add cleaning, structure, chunking, vector, retrieval, citation, recall-test, and risk-boundary records without changing the P0 contract.

No Stage Three UI code may call an AI provider directly. AI checks must continue through `requestStageThreeReview`, backed by AI Gateway.

## State Model

Production frontend should replace the old `StageThreeMode` formal model with a vNext step:

```ts
type StageThreeVNextStep = "source" | "quality" | "decision" | "review";
```

Initial step derivation:

- locked stage: render locked source state;
- completed stage: `review`;
- latest `stage_3_knowledge_decision` exists: `review`;
- latest process record has `selected_parameters.vnext_step = "quality_assessment"`: `decision`;
- latest process record has `selected_parameters.vnext_step = "source_decision"`: `quality`;
- no Stage Three artifacts: `source`.

Manual navigation can move backward to earlier steps for review. Artifact-derived recovery should still restore the latest useful step after refresh.

## Data Seeding

Decision drafts should continue to seed from Stage Two outputs:

- `stage_2_technical_solution`
- legacy `stage_2_solution_definition` if present
- `stage_2_feasibility_report`

Source and quality screens can show fixed manufacturing QA teaching samples for P0. Their saved process records should be stored as real Artifact evidence rather than local storage.

## Quality Gates

P0 completion for Stage Three vNext requires:

- the old four-card Stage Three homepage is not the formal primary path;
- the formal path opens on data source identification after Stage Two completion;
- source decisions and checklist gate movement into data quality;
- quality sample viewing, judgments, and checklist gate movement into decision;
- decision save still creates `stage_3_knowledge_decision`;
- AI review still creates `stage_3_ai_review` through AI Gateway;
- Stage Four unlock still requires decision plus review;
- process records do not replace the formal decision and review artifacts;
- browser verification covers source -> quality -> decision save -> AI review -> Stage Three completion on a prepared session.

## Verification

Required automated checks:

```bash
cd frontend
npm run test:stage-three
npm run typecheck
npm run lint

.venv/bin/python -m pytest backend/tests/test_stage_three.py -q
```

Required browser checks:

- Stage Three first formal screen is the vNext data source identification screen.
- Source checklist and four decisions enable saving and moving to data quality.
- Data quality sample details, four judgments, and checklist enable saving and moving to decision.
- Decision workbench saves a formal knowledge decision through the existing backend API.
- AI review and completion still unlock Stage Four.
- Browser console error/warn count is 0.

## Out Of Scope For P0

- Full ten-page RAG path migration.
- Real file upload, parsing, vector database, or Dify knowledge-base creation.
- New backend process Artifact types for each RAG page.
- Teacher dashboard or grading workflow changes.
- Course member permission model changes.
