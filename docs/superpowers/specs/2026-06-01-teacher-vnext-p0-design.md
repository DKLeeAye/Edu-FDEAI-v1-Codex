# Teacher vNext P0 Dashboard And Class Monitor Design

## Review Status

This specification is a proposed P0 slice for the Open Design vNext front-end driven upgrade. It is ready for user review. Implementation should start only after this scope is accepted.

## Context

Open Design vNext is the formal product experience baseline for this upgrade. The student Stage One through Stage Five P0 paths have already moved to vNext formal experiences. The next product gap is the formal teacher side:

- `docs/prototypes/open-design-vnext/screens/01-teacher-dashboard.html`
- `docs/prototypes/open-design-vnext/screens/04-class-monitor.html`

The current production entry at `frontend/app/page.tsx` still routes non-student roles to an unsupported state. A lower-level teacher progress view already exists in `/dev-workbench`, and the backend already provides teacher progress APIs with role and course-owner scope checks. This makes the teacher P0 slice feasible without creating new backend tables or changing the long-term architecture boundary.

## Product Decision

Teacher P0 becomes:

```text
教师登录
-> 教师工作台
-> 课程运行看板
-> 课中五阶段进度矩阵
-> 学生阶段 Artifact 摘要与学习画像
```

The old "current role pending" page is no longer acceptable for teacher users in the formal product entry.

P0 focuses on `01 教师工作台` and `04 课中监控`. The following Open Design pages are not implemented as editable production capabilities in this slice:

- `02-course-setup.html`
- `03-experiment-library.html`

Those pages require course publishing, experiment package version governance, Rubric configuration, AI model quota policy, and review workflows that exceed the current backend capability. They remain authoritative design input for later slices.

## Scope

P0 implements:

1. Formal teacher workspace entry after login.
2. vNext-style teacher dashboard metrics and course operation table.
3. vNext-style class monitor with five-stage progress matrix.
4. Teacher next-action and risk panels derived from current backend data.
5. Selected session stage Artifact summary.
6. Selected session learning profile if the existing learning profile endpoint permits teacher access.
7. Empty, loading, and API error states suitable for a formal product page.

P0 does not implement:

1. Course setup editing or publishing.
2. Experiment package library editing, QA review, or version release.
3. Teacher override of AI scoring.
4. Grade export.
5. Audit log for accepting or overriding AI recommendations.
6. Course member permission model replacement.

## Experience Requirements

### 教师工作台

The first formal teacher screen should match the intent of `01-teacher-dashboard.html`:

- Page title: `教师工作台`.
- Lead copy communicates that course configuration, in-class risk, and post-class scoring converge into one teacher entry.
- Top metrics show:
  - running courses;
  - AI items requiring teacher confirmation or review;
  - high-risk groups;
  - portfolio or project completion ratio.
- Main table shows course operation state:
  - course title and code;
  - current dominant stage;
  - progress ratio;
  - risk label;
  - teacher next action.
- Secondary panel shows class-level common issues inferred from sessions, stage status, artifact counts, and learning profile risks.
- Side panel shows today-priority items and the "teacher final confirmation right" principle.

The metric labels and structure should follow Open Design vNext, but values may be derived deterministically from current backend data in P0.

### 课中监控

The class monitor should match the intent of `04-class-monitor.html`:

- Page title: `课中监控`.
- Lead copy explains that teachers locate stage progress, submission state, key blockers, and AI risk prompts.
- Metrics show:
  - class groups or sessions;
  - current-stage completion ratio;
  - red-risk count;
  - strong examples count.
- Main matrix displays every selected-course student session as one row.
- Columns map to the five student stages:
  - `访谈`
  - `方案`
  - `知识`
  - `实现`
  - `交付`
- Each stage cell shows stage status and artifact count.
- Teacher intervention text is generated from the most urgent incomplete or risky stage.
- Selecting a row updates the detail side panel.
- Detail side panel displays:
  - selected student identity;
  - learning profile summary when available;
  - selected stage Artifact summaries;
  - a compact priority recommendation.

### Navigation

Teacher P0 can use a local segmented view or tab-like switch between `教师工作台` and `课中监控`. It does not need a new global router page. It should live inside the existing formal app shell so the experience is aligned with the student product entry.

## Backend And Data Mapping

No new backend endpoint is required for P0.

| UI need | Existing source | Notes |
| --- | --- | --- |
| Course list and sessions | `GET /api/v1/teacher/progress/courses` | Already scoped by teacher role, tenant, institution, and `Course.created_by_user_id`. |
| Five-stage progress matrix | `TeacherCourseProgress.sessions[].stage_records` | Status and artifact counts map directly to matrix cells. |
| Course operation progress | `TeacherCourseProgress.sessions[].stage_records` | Derived ratio from completed stages over total stages. |
| Artifact detail panel | `GET /api/v1/teacher/progress/sessions/{session_id}/stages/{stage_key}/artifacts` | Existing summary includes artifact type, title, content, status, and timestamps. |
| Learning profile panel | `GET /api/v1/learning-profiles/sessions/{session_id}` | Used only if teacher access is already allowed by the endpoint. |
| Risk and next-action labels | Frontend deterministic derivation | P0 derives from stage statuses, artifact counts, AI review artifacts, and learning profile risks. |

The temporary teacher course boundary remains `courses.created_by_user_id`. The UI and docs must continue to state that the long-term boundary is a course member permission model.

No teacher UI code may call a model provider directly. Any future AI review or class recap generation must go through AI Gateway. P0 may show disabled or informational actions for class recap and grade export, but it must not imply a completed backend workflow when none exists.

## Frontend Architecture

The implementation should introduce a teacher product module instead of expanding the old low-level `TeacherProgressView`:

```text
frontend/src/components/teacher-product/
  teacher-workspace.tsx
  teacher-dashboard.tsx
  class-monitor.tsx
  teacher-progress-model.ts
  teacher-progress-model.test.ts
```

`teacher-progress-model.ts` owns deterministic derivations:

- course metrics;
- dominant course stage;
- course completion ratio;
- session risk tone;
- teacher next action;
- class monitor summary;
- selected session display model.

The formal `frontend/app/page.tsx` should route teacher users to the new teacher workspace. The old `/dev-workbench` teacher view can remain as a low-level integration workbench.

## Error Handling

P0 must handle:

- no teacher courses;
- course with no sessions;
- selected session with no artifacts;
- artifact fetch failure;
- learning profile fetch failure;
- teacher progress fetch failure;
- refresh while keeping the latest valid selected course, session, and stage where possible.

Errors should be visible in-page and recoverable through refresh actions. They should not crash the formal app shell.

## Quality Gates

P0 completion requires:

- Teacher login no longer renders the unsupported-role page.
- Formal teacher workspace renders `教师工作台` and `课中监控`.
- Dashboard and class monitor match the Open Design vNext structure and copy intent.
- Course, session, and stage selections drive the Artifact detail panel.
- Existing backend permission boundaries remain intact.
- `TeacherProgressView` in `/dev-workbench` remains usable or is replaced with an equivalent low-level path.
- Frontend model tests cover the deterministic teacher metrics and risk derivation.
- Backend teacher progress tests pass.
- Frontend typecheck and lint pass.
- Browser validation confirms the teacher demo account can enter the formal teacher page and no unsupported-teacher copy remains.

