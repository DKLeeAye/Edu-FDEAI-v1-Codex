# Stage Four vNext Agent Build And Test Design

## Context

Open Design vNext is the formal product experience baseline for this upgrade. Stage One, Stage Two, and Stage Three P0 have already moved to vNext formal paths. Stage Four now needs the same front-end driven migration using:

- `docs/prototypes/open-design-vnext/screens/09-agent-guide.html`
- `docs/prototypes/open-design-vnext/screens/09-dify-onboarding.html`
- `docs/prototypes/open-design-vnext/screens/09-agent-build-test.html`
- `docs/prototypes/open-design-vnext/screens/09-agent-test-score.html`

The existing Stage Four production UI already records Dify implementation and test evidence, but it still starts from an old Stage Four homepage and then switches into a generic task-rail workbench. The formal experience must instead follow the vNext four-page implementation path.

## Product Decision

Stage Four formal student experience becomes:

```text
实现导学
-> Dify 入门
-> 正式搭建工作台
-> 测试与评分
```

The old Stage Four `home -> build_test_workbench` model and task-rail view are no longer the primary product path. Their backend contracts remain useful, but the formal student path must render the vNext implementation guide, Dify onboarding, production build, and test scoring sequence.

## Scope

P0 implements:

1. vNext Step 01: 实现导学.
2. vNext Step 02: Dify 入门操作练习.
3. vNext Step 03: 正式智能体搭建工作台.
4. vNext Step 04: 平台测试与评分.

P0 preserves the existing Stage Four backend contract:

- `stage_4_dify_implementation`
- `stage_4_test_report`
- `stage_4_ai_test_review`
- Stage Four completion and Stage Five unlock

P0 does not implement real Dify API calls, file upload, vector database creation, or live automated testing against a Dify endpoint. The UI records the evidence needed for those later capabilities and maps it into the current Artifact contract.

## Experience Requirements

### 实现导学

The first formal Stage Four screen should match the intent of `09-agent-guide.html`:

- Hero copy: "把知识库决策转成可运行的质检智能体。"
- Flow nav shows four steps:
  - `01 实现导学`
  - `02 Dify 入门`
  - `03 搭建工作台`
  - `04 测试与评分`
- The architecture map explains:
  - user question entry;
  - boundary decision;
  - RAG retrieval;
  - answer with citation;
  - handoff and logs.
- The Stage Three transfer map explains how data source quality, chunking metadata, retrieval citation, and risk boundaries become Stage Four configuration.
- Learning gate requires four checks:
  - know the agent consists of role, retrieval, citation, boundaries, and logs;
  - know Stage Three results must land in configuration, branches, or tests;
  - know insufficient data and responsibility judgment cannot directly produce conclusions;
  - ready to write manufacturing QA scenarios as testable agent rules.
- Passing the learning gate moves to Dify onboarding.

### Dify 入门

The second formal Stage Four screen should match the intent of `09-dify-onboarding.html`:

- Hero copy: "按真实 Chatflow 流程完成一次 Dify 上手。"
- Completion standard: `8 个 Chatflow 操作步骤 + 1 条发布记录`.
- Eight checks are required:
  - `workspace`: enter workspace and Chatflow entry;
  - `create`: create Chatflow app;
  - `canvas`: identify default nodes and right-side config panel;
  - `start`: check start node input variables;
  - `llm`: configure LLM node;
  - `answer`: configure direct answer node and wiring;
  - `preview`: complete Preview debug;
  - `publish`: publish Chatflow and fill publish link.
- Required fields:
  - workspace name;
  - app name and app type;
  - canvas summary;
  - start inputs;
  - model name;
  - LLM summary;
  - node chain;
  - test record;
  - publish URL.
- Saving onboarding records the step state locally in the Stage Four component and carries it into the implementation Artifact when the formal build is saved.

### 正式搭建工作台

The third formal Stage Four screen should match the intent of `09-agent-build-test.html`:

- Hero copy: "先创建知识库，再把检索能力接入正式 Chatflow。"
- Completion standard: 12 build steps plus publish/access data.
- Twelve checks are required:
  - `project`: create formal Chatflow application;
  - `kb-create`: create knowledge base;
  - `kb-upload`: upload materials;
  - `kb-segment`: configure chunking and cleaning;
  - `kb-index`: configure indexing and retrieval;
  - `retrieval`: connect Chatflow retrieval node;
  - `condition`: configure business boundary branch;
  - `prompt`: configure citation-answer LLM prompt;
  - `handoff`: configure insufficient-data and human handoff path;
  - `connect`: check node wiring and variable passing;
  - `preview`: complete Dify Preview precheck;
  - `publish`: publish formal app and fill test entry.
- Required fields include:
  - project name and purpose;
  - knowledge base name and source mode;
  - uploaded files;
  - segment config;
  - index config;
  - retrieval config;
  - boundary rule;
  - prompt summary;
  - fallback template;
  - node chain;
  - preview record;
  - publish URL and access note.
- Saving the build creates `stage_4_dify_implementation` through the existing backend API.

### 测试与评分

The fourth formal Stage Four screen should match the intent of `09-agent-test-score.html`:

- Hero copy: "用平台测试集验证 Dify 智能体是否达到交付门槛。"
- Test target fields:
  - app name;
  - knowledge base name;
  - publish URL;
  - access note.
- Test suites cover:
  - Suite A: normal traceability questions;
  - Suite B: evidence citation questions;
  - Suite C: insufficient-data questions;
  - Suite D: risk-boundary questions.
- P0 uses the deterministic prototype test set as a simulated platform run. The run produces:
  - test cases;
  - dimension scores;
  - total score;
  - warning/failure localization;
  - remediation suggestions.
- Quality gate requires:
  - target record complete;
  - automated test run completed;
  - total score at least 80;
  - no severe failure.
- Saving the score creates `stage_4_test_report` through the existing backend API.
- AI review still calls `requestStageFourReview` through AI Gateway.
- Stage completion still requires implementation, test report, and AI review, then unlocks Stage Five.

## Backend And Artifact Mapping

P0 does not require a new table or endpoint.

| vNext step | Existing backend artifact | Notes |
| --- | --- | --- |
| `guide` 实现导学 | None | Instructional gate only; not a formal backend record in P0. |
| `onboarding` Dify 入门 | Included in `stage_4_dify_implementation` | Save checklist keys and onboarding summary inside implementation payload fields. |
| `build` 正式搭建 | `stage_4_dify_implementation` | Map the 12-step build evidence to existing implementation fields. |
| `test` 测试评分 | `stage_4_test_report`, `stage_4_ai_test_review`, stage completion | Simulated test run maps to current test report, then AI Gateway review and completion. |

Implementation payload mapping:

- `dify_app_name` <- build `projectName`
- `dify_app_url` <- build `publishUrl`
- `app_mode` <- `chatflow`
- `knowledge_base_notes` <- knowledge name, source mode, uploaded files, segment config, index config
- `prompt_or_instruction_notes` <- prompt summary
- `tool_configuration_notes` <- retrieval config, boundary rule, fallback template, node chain
- `implementation_notes` <- project purpose, preview record, onboarding summary, Stage Three alignment
- `known_limitations` <- access note and open limitations
- `onboarding_checklist` <- completed onboarding step keys
- `build_task_checklist` <- completed build step keys
- `app_access_check_notes` and `app_access_check_result` <- access note and manual confirmation state

Test report mapping:

- `test_goal` <- "验证已发布 Dify Chatflow 是否达到阶段五交付门槛"
- `test_cases` <- deterministic Suite A-D cases
- `overall_result` <- `passed` when total score is at least 80 and there is no severe failure
- `coverage_notes` <- suite and score summary
- `observed_failures` <- warning or failed cases
- `improvement_actions` <- remediation locations

No Stage Four UI code may call a model provider directly. AI review must continue through `requestStageFourReview`, backed by AI Gateway.

## State Model

Production frontend should replace the old formal model with:

```ts
type StageFourMode = "guide" | "onboarding" | "build" | "test";
```

Initial step derivation:

- completed stage: `test`;
- latest `stage_4_ai_test_review` exists: `test`;
- latest `stage_4_test_report` exists: `test`;
- latest `stage_4_dify_implementation` exists: `test`;
- otherwise: `guide`.

Manual navigation can move backward to earlier steps for review. Artifact-derived recovery should still restore the latest useful step after refresh.

## Quality Gates

P0 completion for Stage Four vNext requires:

- the old Stage Four homepage is not the formal primary path;
- Stage Four opens on the vNext implementation guide after Stage Three completion;
- guide checks enable movement to onboarding;
- onboarding requires eight checks, required fields, and valid URL before moving to build;
- build requires 12 checks, required fields, and valid URL before saving implementation;
- test score can pull the saved build target and run deterministic platform tests;
- saving score creates `stage_4_test_report`;
- AI review still creates `stage_4_ai_test_review` through AI Gateway;
- Stage Four completion still unlocks Stage Five;
- no direct AI provider calls or direct Dify API calls are introduced in P0.

## Verification

Required automated checks:

```bash
cd frontend
npm run test:stage-four
npm run test:stage-one
npm run test:stage-two
npm run test:stage-three
npm run typecheck
npm run lint

.venv/bin/python -m pytest backend/tests/test_stage_four.py -q
```

Required browser checks:

- Stage Four first formal screen is the vNext implementation guide.
- Guide four checks enable movement to Dify onboarding.
- Dify onboarding can complete eight checks, required fields, and move to build.
- Formal build can complete 12 checks, save implementation, and move to test.
- Test score can load the saved target, run tests, save test report, request AI review, and complete Stage Four.
- Browser console error/warn count is 0, except known favicon 404 if present.

## Out Of Scope For P0

- Real Dify API integration.
- Real file upload, parsing, vector database creation, or automated endpoint testing.
- Teacher dashboard or grading workflow changes.
- Course member permission model changes.
- Refactoring Stage Four backend schemas or Artifact types.
