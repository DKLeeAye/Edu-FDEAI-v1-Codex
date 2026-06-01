# Stage Five vNext Delivery And Acceptance Design

## Context

Open Design vNext is the formal product experience baseline for this upgrade. Stage One through Stage Four P0 have already moved to vNext formal paths. Stage Five now needs the same front-end driven migration using:

- `docs/prototypes/open-design-vnext/screens/10-delivery-document.html`
- `docs/prototypes/open-design-vnext/screens/10-delivery-acceptance.html`

The existing Stage Five production UI already saves the right backend evidence, but it presents the work as three independent form blocks. The vNext product intent is different: students should first create a customer-readable delivery document, then run a structured acceptance confirmation and final project signoff.

## Product Decision

Stage Five formal student experience becomes:

```text
交付文档工作台
-> 交付验收确认
-> AI 交付审阅
-> 完成项目并进入档案袋
```

The old Stage Five three-form layout is no longer the primary product path. Its backend contracts remain authoritative and must be preserved:

- `stage_5_delivery_document`
- `stage_5_acceptance_package`
- `stage_5_operations_guide`
- `stage_5_ai_delivery_review`
- Stage Five completion and final session completion

## Scope

P0 implements:

1. vNext Step 01: 交付说明文档撰写工作台.
2. vNext Step 02: 交付验收确认工作台.
3. Existing AI delivery review through AI Gateway.
4. Existing final completion flow.

P0 does not implement live Dify API sync, real customer meeting recording, generated PDF export, or a new backend document chapter model. The UI records the evidence required for those later capabilities and maps it into current Artifact contracts.

## Experience Requirements

### 交付文档工作台

The first formal Stage Five screen should match the intent of `10-delivery-document.html`:

- Hero copy: "把项目结果写成交付说明文档。"
- Chapter navigation shows six chapters:
  - `01 交付目标`
  - `02 使用说明`
  - `03 资料范围`
  - `04 支持与边界`
  - `05 测试与验收`
  - `06 维护更新`
- Context strip shows:
  - Stage Four Dify application and test score as input;
  - Stage Three RAG boundary and data scope as input;
  - customer-readable delivery document as output.
- Each chapter has:
  - writing guidance;
  - evidence hints;
  - editable student draft fields;
  - deterministic local AI check in P0;
  - save gate requiring chapter review status `pass`.
- Document submit requires all six chapters saved as pass.

When submitted, the document page must save current backend artifacts:

- `stage_5_delivery_document`
- `stage_5_operations_guide`

Operations guide is saved from the maintenance/update and boundary chapters because the vNext document page includes maintenance responsibility and update requirements inside the customer delivery document.

### 交付验收确认

The second formal Stage Five screen should match the intent of `10-delivery-acceptance.html`:

- Hero copy: "完成客户验收确认，形成最终交付证据。"
- Handoff target is derived from Stage Four implementation/test evidence and the saved delivery document.
- Delivery package checklist contains seven checks:
  - Dify 发布链接
  - 平台自动化测试记录
  - 客户使用说明
  - 已知限制说明
  - 维护与更新说明
  - 客户演示脚本
  - 下一版本建议
- Acceptance agenda explains:
  - confirm delivery target;
  - demo core use cases;
  - answer customer questions;
  - form acceptance decision.
- Simulated acceptance generates three customer questions around:
  - missing image metadata;
  - responsibility boundary;
  - knowledge base and test-set maintenance.
- Final signoff requires:
  - acceptance decision: pass, conditional, or revise;
  - signoff note of meaningful length;
  - three archive checks confirming test evidence, boundary, and maintenance responsibility.

Saving acceptance must create `stage_5_acceptance_package`. Generating delivery review must still call the existing Stage Five AI Gateway endpoint and create `stage_5_ai_delivery_review`.

## Backend And Artifact Mapping

No new backend endpoint is required for P0.

| vNext step | Existing backend artifact | Notes |
| --- | --- | --- |
| 交付文档工作台 | `stage_5_delivery_document` | Maps project overview, usage, scope, boundary, test conclusion into the existing delivery payload. |
| 交付文档工作台 | `stage_5_operations_guide` | Maps maintenance, data update, monitoring, known issues, and owner responsibility into the existing operations payload. |
| 交付验收确认 | `stage_5_acceptance_package` | Maps acceptance scope, criteria, test evidence, unresolved issues, and handover checklist into the existing acceptance payload. |
| AI 交付审阅 | `stage_5_ai_delivery_review` | Existing AI Gateway review over Stage Four and Stage Five artifacts. |
| 完成项目 | Stage Five completion endpoint | Existing final session completion. |

Delivery document payload mapping:

- `project_name` <- Stage Four app name or document goal chapter title
- `final_agent_url` <- Stage Four app URL or delivery target publish URL
- `delivery_summary` <- goal, scenario, scope, boundary, test conclusion
- `core_features` <- supported questions and expected customer tasks
- `target_users` <- quality owner, quality engineer, audit material preparer
- `usage_instructions` <- usage chapter fields
- `known_limitations` <- unsupported scenarios, data gaps, boundary notes

Operations guide payload mapping:

- `runtime_dependencies` <- Dify app, knowledge base, uploaded source data, test set
- `data_update_plan` <- maintenance owner/update trigger chapter
- `monitoring_plan` <- test rerun, issue feedback, regression requirement
- `common_issues` <- unresolved warning/failure cases and boundary risks
- `maintenance_owner_notes` <- maintenance responsibility chapter

Acceptance package payload mapping:

- `acceptance_scope` <- handoff target, agenda, delivery document status, signoff decision
- `acceptance_criteria` <- package checklist and generated customer questions
- `test_evidence_summary` <- Stage Four test report summary plus delivery review notes
- `unresolved_issues` <- conditional/revise signoff notes, warnings, known limitations
- `handover_checklist` <- seven delivery package items and archive checks

No Stage Five UI code may call a model provider directly. AI review must continue through `onRequestReview`, backed by AI Gateway.

## State Model

Production frontend should use:

```ts
type StageFiveMode = "document" | "acceptance";
```

Initial step derivation:

- completed stage: `acceptance`;
- latest `stage_5_ai_delivery_review` exists: `acceptance`;
- latest `stage_5_acceptance_package` exists: `acceptance`;
- latest `stage_5_delivery_document` and `stage_5_operations_guide` exist: `acceptance`;
- otherwise: `document`.

Manual navigation can move backward to the document step for review. Artifact-derived recovery should restore the latest useful step after refresh.

## Quality Gates

P0 completion for Stage Five vNext requires:

- Stage Five no longer renders the old three independent form blocks as the formal primary path.
- The formal path renders `document -> acceptance`.
- Document submit requires all six chapters to pass local review and be saved.
- Document submit saves both delivery document and operations guide artifacts through existing API callbacks.
- Acceptance save requires delivery target, full package checklist, saved document/operations artifacts, simulated customer questions, and final signoff.
- Acceptance save creates the existing acceptance package artifact.
- AI delivery review still uses the existing AI Gateway flow.
- Final completion still requires delivery document, acceptance package, operations guide, and AI delivery review.
- Tests, typecheck, lint, backend Stage Five regression, and browser verification pass or any unverified area is explicitly documented.
