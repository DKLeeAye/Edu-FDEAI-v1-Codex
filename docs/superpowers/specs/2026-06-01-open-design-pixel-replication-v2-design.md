# Open Design vNext Pixel Replication V2 Design

## Goal

The second upgrade round targets pixel-level visual replication of the Open Design vNext static prototype in the production Next.js frontend.

The first production entry is:

```text
http://127.0.0.1:4175/index.html#login-entry
```

The previous process page `edufde-platform-prototype.html` is not a target page.

## Execution Standard

The Open Design static files are the visual source of truth:

- page structure;
- visible copy;
- spacing and density;
- color tokens;
- typography scale;
- border radius;
- shadows;
- layout model;
- interaction states;
- responsive behavior.

Implementation must use modern production frontend code, but it must not reinterpret the design through the previous Tailwind component style. Open Design CSS and component anatomy should be migrated into a dedicated vNext production design system, then wired to real backend APIs.

Each slice must include screenshot comparison between the Open Design reference and the production implementation.

## Page Rounds

### Round 0: Unified Public Entry And Login

- `index.html#login-entry`
- `login.html`

Production requirements:

- root route shows the Open Design public entry before authentication;
- login route visually matches the Open Design login page;
- login still uses real `/auth/login`;
- successful login stores the access token and enters the production role workspace.

### Round 1: Student Entry And Project Selection

- `screens/student-home.html`
- `screens/student-experiment-detail.html`
- `screens/05-student-project.html`

Production requirements:

- student home uses real course and session data;
- experiment detail maps to real course/package version state;
- project stage shell becomes the visual baseline for later stage pages.

### Round 2: Stage One Interview

- `screens/06-interview-guide.html`
- `screens/06-interview-lab.html`
- `screens/06-interview-submit.html`

Production requirements:

- replicate the independent interview training shell;
- no old dark side rail or current AppShell on the lab page;
- use real AI Gateway calls and `stage_1_*` artifacts.

### Round 3: Stage Two Solution Definition

- `screens/07-solution-guide.html`
- `screens/07-solution-definition.html`

Production requirements:

- replicate the guide and solution-definition workbench;
- keep real section draft, review, submission, document review, and yellow-debt contracts.

### Round 4: Stage Three Knowledge Engineering And RAG

- `screens/08-knowledge-decision.html`
- `screens/08-rag-data-quality.html`
- `screens/08-rag-cleaning.html`
- `screens/08-rag-structure.html`
- `screens/08-rag-chunking.html`
- `screens/08-rag-vector-storage.html`
- `screens/08-rag-retrieval.html`
- `screens/08-rag-recall-test.html`
- `screens/08-rag-answer-citation.html`
- `screens/08-rag-risk-boundary.html`

Production requirements:

- replicate the multi-page RAG learning flow;
- introduce new structured artifacts only where existing `stage_3_*` artifacts cannot represent the Open Design state.

### Round 5: Stage Four Agent Build And Test

- `screens/09-agent-guide.html`
- `screens/09-dify-onboarding.html`
- `screens/09-agent-build-test.html`
- `screens/09-agent-test-score.html`

Production requirements:

- replicate Dify onboarding, build, test, and score screens;
- preserve AI Gateway for reviews;
- prepare the Dify API boundary for later real integration.

### Round 6: Stage Five Delivery And Portfolio

- `screens/10-delivery-document.html`
- `screens/10-delivery-acceptance.html`
- `screens/12-portfolio-report.html`

Production requirements:

- replicate delivery document, acceptance, and portfolio report;
- preserve stage completion, final artifacts, and project archive evidence.

### Round 7: AI Review And Teacher Views

- `screens/11-ai-review-rubric.html`
- `screens/01-teacher-dashboard.html`
- `screens/04-class-monitor.html`

Production requirements:

- these pages may reflect an older Open Design state because the original design stopped after the student-side completion;
- implement them temporarily as designed;
- keep teacher authority, evidence binding, and AI Gateway boundaries.

### Round 8: Course Setup, Experiment Library, Admin Deployment

- `screens/02-course-setup.html`
- `screens/03-experiment-library.html`
- `screens/13-admin-deployment.html`

Production requirements:

- these pages may also reflect older design state;
- implement them as temporary Open Design targets;
- add backend modules only when needed for real course membership, package version governance, tenant, license, or audit behavior.

## Backend Boundary

Visual replication does not permit bypassing architecture rules:

- all model calls go through AI Gateway;
- stage outputs persist as artifacts;
- AI review binds Rubric and evidence;
- service queries enforce tenant, institution, course, and session scope;
- teacher confirmation remains the final instructional authority.

## Verification Gates

Each round must record:

- Open Design reference URL;
- production URL;
- desktop screenshot comparison;
- mobile screenshot comparison when applicable;
- functional API verification;
- typecheck and lint status;
- backend tests for touched domains;
- known deviations if the Open Design source itself is incomplete or old.

