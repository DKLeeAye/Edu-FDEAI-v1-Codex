import { apiBaseUrl } from "@/src/lib/config";

type RequestOptions = {
  token?: string;
  method?: "GET" | "POST";
  body?: unknown;
};

export type UserRole = "admin" | "teacher" | "student";

export type CurrentUser = {
  id: string;
  email: string;
  full_name: string;
  tenant_id: string;
  institution_id: string;
  role: UserRole;
};

export type Course = {
  id: string;
  tenant_id: string;
  institution_id: string;
  package_version_id: string;
  created_by_user_id: string | null;
  title: string;
  code: string;
  status: string;
};

export type StageRecord = {
  id: string;
  course_id: string;
  session_id: string;
  stage_key: string;
  stage_order: number;
  status: string;
};

export type ExperimentSession = {
  id: string;
  tenant_id: string;
  institution_id: string;
  course_id: string;
  student_user_id: string;
  package_version_id: string;
  status: string;
  stage_records: StageRecord[];
};

export type TeacherStudentSummary = {
  id: string;
  email: string;
  full_name: string;
};

export type TeacherStageProgress = StageRecord & {
  artifact_count: number;
  updated_at: string;
};

export type TeacherSessionProgress = {
  id: string;
  course_id: string;
  student: TeacherStudentSummary;
  status: string;
  stage_records: TeacherStageProgress[];
  artifact_total_count: number;
  updated_at: string;
};

export type TeacherCourseProgress = Course & {
  sessions: TeacherSessionProgress[];
};

export type LearningProfileStudentSummary = {
  id: string;
  email: string;
  full_name: string;
};

export type LearningProfileStageStatus = {
  stage_key: string;
  stage_order: number;
  status: string;
};

export type LearningProfile = {
  session_id: string;
  session_status: string;
  student: LearningProfileStudentSummary;
  stage_status_summary: LearningProfileStageStatus[];
  artifact_count_by_stage: Record<string, number>;
  ai_review_count_by_stage: Record<string, number>;
  completed_stage_count: number;
  total_stage_count: number;
  completion_ratio: number;
  strengths: string[];
  risks: string[];
  next_suggestions: string[];
};

export type Artifact = {
  id: string;
  tenant_id: string;
  institution_id: string;
  course_id: string;
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  submitted_by_user_id: string | null;
  artifact_type: string;
  title: string;
  content_json: Record<string, unknown>;
  version: number;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TeacherArtifactSummary = Pick<
  Artifact,
  | "id"
  | "course_id"
  | "session_id"
  | "stage_record_id"
  | "stage_key"
  | "submitted_by_user_id"
  | "artifact_type"
  | "title"
  | "content_json"
  | "version"
  | "status"
  | "submitted_at"
  | "created_at"
  | "updated_at"
>;

export type TeacherReviewConfirmationPayload = {
  comment?: string;
  decision: "accept" | "override";
  override_reason?: string;
  teacher_score?: number;
};

export type TeacherGradeRubricScore = {
  comment?: string;
  dimension_key: string;
  dimension_name?: string;
  max_score: number;
  score: number;
};

export type TeacherGradeDraftPayload = {
  comment?: string;
  evidence_artifact_ids?: string[];
  overall_score: number;
  rubric_scores?: TeacherGradeRubricScore[];
};

export type TeacherGradePublicationPayload = {
  draft_artifact_id: string;
  publication_note?: string;
};

export type TeacherGradeExportRow = {
  comment: string | null;
  draft_artifact_id: string | null;
  grade_status: "missing" | "draft" | "published";
  publication_artifact_id: string | null;
  published_at: string | null;
  published_score: number | null;
  session_id: string;
  student: TeacherStudentSummary;
};

export type TeacherGradeExport = {
  course_id: string;
  course_title: string;
  generated_at: string;
  rows: TeacherGradeExportRow[];
};

export type TeacherRubric = {
  course_id: string | null;
  created_at: string;
  id: string;
  name: string;
  package_version_id: string;
  rubric_json: Record<string, unknown>;
  scope: "course" | "package";
  stage_key: string;
  status: string;
  total_score: number;
  updated_at: string;
  version: number;
};

export type TeacherRubricDraftPayload = {
  name: string;
  rubric_json: Record<string, unknown>;
  total_score: number;
};

export type AdminScopeSummary = {
  id: string;
  name: string;
};

export type AdminDeploymentInstance = {
  active_users_count: number;
  courses_count: number;
  environment: "local" | "staging" | "production";
  id: string;
  last_activity_at: string | null;
  name: string;
  package_versions_count: number;
  sessions_count: number;
  status: "running" | "idle";
};

export type AdminLicenseEntitlement = {
  key: string;
  label: string;
  limit: number | null;
  source: string;
  status: "active" | "unused";
  unit: string;
  used: number;
};

export type AdminAiUsageByType = {
  call_count: number;
  failed_count: number;
  total_tokens: number;
  usage_type: string;
};

export type AdminAiUsageSummary = {
  average_latency_ms: number | null;
  by_usage_type: AdminAiUsageByType[];
  failed_calls: number;
  succeeded_calls: number;
  total_calls: number;
  total_tokens: number;
};

export type AdminDataExportItem = {
  key: string;
  label: string;
  last_updated_at: string | null;
  record_count: number;
  status: "ready" | "empty";
};

export type AdminOperationsAccessGrant = {
  created_at: string;
  deployment_instance_id: string;
  expires_at: string | null;
  id: string;
  reason: string;
  scope: Record<string, unknown>;
  starts_at: string | null;
  status: string;
};

export type AdminOperationsOverview = {
  ai_usage: AdminAiUsageSummary;
  data_exports: AdminDataExportItem[];
  deployment_instances: AdminDeploymentInstance[];
  institution: AdminScopeSummary;
  license_entitlements: AdminLicenseEntitlement[];
  operations_access_grants: AdminOperationsAccessGrant[];
  tenant: AdminScopeSummary;
};

export type AdminLicenseEntitlementUpsertPayload = {
  entitlement_key: string;
  label: string;
  limit_value: number | null;
  status: "active" | "inactive";
  unit: string;
};

export type AdminDeploymentStatusUpdatePayload = {
  last_health_check_now?: boolean;
  status: "running" | "maintenance" | "idle";
};

export type AdminAccessGrantRevokePayload = {
  reason: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export type StageOneInterviewResponse = {
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  user_message: string;
  ai_customer_response: string;
  ai_call_log_id: string | null;
  artifact: Artifact;
};

export type StageOneGuidedFeedback = {
  summary?: string;
  can_continue?: boolean;
  dimensions?: Record<string, string>;
  [key: string]: unknown;
};

export type StageOneCustomerPersona = {
  id?: string | null;
  name?: string | null;
  position?: string | null;
  responsibilities?: string[];
  project_concerns?: string[];
  release_rules?: string[];
  [key: string]: unknown;
};

export type StageOneGuidedTurn = {
  turn_id: string;
  level_key: string;
  student_message: string;
  customer_response: string;
  feedback: StageOneGuidedFeedback;
  customer_call_log_id: string | null;
  feedback_call_log_id: string | null;
};

export type StageOneGuidedTraining = {
  attempt_id: string;
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  active_level: string;
  completed_levels: string[];
  status: string;
  customer_persona: StageOneCustomerPersona;
  turns: StageOneGuidedTurn[];
};

export type StageOneGuidedTurnResponse = StageOneGuidedTurn & {
  attempt_id: string;
  session_id: string;
  stage_record_id: string;
  stage_key: string;
};

export type StageOneGuidedLevelCompletionResponse = {
  attempt_id: string;
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  active_level: string;
  completed_levels: string[];
  status: string;
};

export type StageOneSummaryPayload = {
  problem_statement: string;
  target_user: string;
  business_context: string;
  pain_points: string[];
  success_criteria: string[];
  unconfirmed_questions?: string[];
  evidence_artifact_ids?: string[];
};

export type StageOneSummaryResponse = {
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  artifact: Artifact;
};

export type StageOneVisitNotesPayload = {
  confirmed_information: string[];
  requirement_hypotheses: string[];
  risks_and_questions: string[];
  next_visit_plan: string;
  customer_visible_summary: string;
};

export type StageOneVisitNotesResponse = {
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  artifact: Artifact;
};

export type StageOneEvaluationResponse = {
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  artifact: Artifact;
};

export type StageCompletionResponse = {
  session_id: string;
  completed_stage_record_id: string;
  completed_stage_key: string;
  completed_stage_status: string;
  unlocked_stage_record_id: string;
  unlocked_stage_key: string;
  unlocked_stage_status: string;
};

export type StageTwoSolutionDefinitionPayload = {
  solution_title: string;
  problem_summary: string;
  proposed_agent_capability: string;
  target_workflow: string;
  data_sources: string[];
  tool_or_system_dependencies: string[];
  feasibility_risks: string[];
  expected_value: string;
};

export type StageTwoDocumentKey =
  | "requirements_document"
  | "feasibility_report"
  | "technical_solution";

export type StageTwoSectionKey =
  | "requirements_context"
  | "requirements_scope"
  | "requirements_acceptance"
  | "feasibility_data"
  | "feasibility_technical"
  | "feasibility_value"
  | "technical_route"
  | "technical_flow"
  | "technical_handoff";

export type StageTwoSectionDraftPayload = {
  document_type: StageTwoDocumentKey;
  section_key: StageTwoSectionKey;
  student_responses: Record<string, unknown>;
  evidence_artifact_ids: string[];
  student_reflection?: string;
};

export type StageTwoGuideConfirmationPayload = {
  checks: {
    dataBoundary: boolean;
    documentRoles: boolean;
    outOfScope: boolean;
    technicalPlan: boolean;
  };
};

export type StageTwoRequirementsDocumentPayload = {
  project_background: string;
  current_business_process: string;
  pain_points: string[];
  requirement_goals: string[];
  acceptance_criteria: string[];
  constraints: string[];
  source_evidence_artifact_ids: string[];
};

export type StageTwoFeasibilityReportPayload = {
  data_sources: string[];
  data_quality_assessment: string;
  data_gaps: string[];
  data_feasibility_conclusion: "feasible" | "needs_supplement" | "not_feasible";
  ai_capable_scope: string;
  ai_limitations: string;
  technical_risks: string[];
  technical_feasibility_conclusion: "feasible" | "conditional" | "not_recommended";
  expected_benefits: string;
  implementation_cost: string;
  roi_conclusion: "worth_doing" | "conditional" | "not_worth_doing";
  overall_recommendation: "proceed" | "adjust_scope" | "pause";
};

export type StageTwoTechnicalSolutionPayload = {
  knowledge_base_strategy: "document" | "structured" | "hybrid" | "none";
  knowledge_base_rationale: string;
  agent_type: "chat" | "workflow" | "hybrid";
  agent_type_rationale: string;
  data_flow: string;
  deployment_option: "saas" | "private" | "hybrid" | "local_demo";
  deployment_rationale: string;
  technical_risks: string[];
  stage_three_starting_point: string;
  stage_four_build_plan: string;
};

export type StageTwoFormalDocumentPayload =
  | StageTwoRequirementsDocumentPayload
  | StageTwoFeasibilityReportPayload
  | StageTwoTechnicalSolutionPayload;

export type StageTwoSolutionDefinitionResponse = {
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  artifact: Artifact;
};

export type StageTwoAiReviewResponse = {
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  ai_call_log_id: string | null;
  artifact: Artifact;
};

export type StageTwoDocumentResponse = StageTwoSolutionDefinitionResponse;

export type StageThreeKnowledgeStrategy = "prompt_only" | "rag" | "tool_calling" | "hybrid";

export type StageThreeKnowledgeDecisionPayload = {
  knowledge_goal: string;
  required_knowledge_types: string[];
  source_inventory: string[];
  selected_strategy: StageThreeKnowledgeStrategy;
  strategy_rationale: string;
  data_quality_risks: string[];
  maintenance_plan: string;
  evaluation_plan: string;
  stage_4_build_plan: string;
};

export type StageThreeCaseStudyRecordPayload = {
  visited_lesson_keys: string[];
  key_takeaways: string[];
  diagnostic_summary: string;
};

export type StageThreeLayerObservationPayload = {
  layer: string;
  knowledge_point: string;
  observation: string;
};

export type StageThreeLabExperimentRecordPayload = {
  observations: StageThreeLayerObservationPayload[];
  selected_parameters: Record<string, unknown>;
};

export type StageThreeKnowledgeDecisionResponse = {
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  artifact: Artifact;
};

export type StageThreeProcessArtifactResponse = StageThreeKnowledgeDecisionResponse;

export type StageThreeAiReviewResponse = {
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  ai_call_log_id: string | null;
  artifact: Artifact;
};

export type StageFourAppMode = "chatflow" | "workflow" | "agent";
export type StageFourAppAccessCheckResult =
  | "unchecked"
  | "manual_confirmed"
  | "reachable"
  | "blocked";
export type StageFourTestCategory = "standard" | "out_of_scope" | "multi_turn" | "custom";
export type StageFourTestCaseResult = "passed" | "failed" | "partial";
export type StageFourOverallResult = "passed" | "needs_revision";

export type StageFourDifyImplementationPayload = {
  dify_app_name: string;
  dify_app_url: string;
  dify_app_id?: string;
  agent_api_endpoint?: string;
  agent_api_type?: "dify_chat_messages" | "generic_json";
  app_mode: StageFourAppMode;
  app_access_check_notes?: string;
  app_access_check_result?: StageFourAppAccessCheckResult;
  build_task_checklist?: string[];
  knowledge_base_notes: string;
  onboarding_checklist?: string[];
  prompt_or_instruction_notes: string;
  stage_three_alignment_notes?: string;
  tool_configuration_notes: string;
  implementation_notes: string;
  known_limitations: string[];
};

export type StageFourGuideConfirmationPayload = {
  checks: {
    agentArchitecture: boolean;
    riskBoundaries: boolean;
    stageThreeTransfer: boolean;
    testableRules: boolean;
  };
};

export type StageFourTestCase = {
  scenario: string;
  input: string;
  expected_output: string;
  actual_output: string;
  evidence_note?: string;
  result: StageFourTestCaseResult;
  test_category?: StageFourTestCategory;
  notes?: string;
};

export type StageFourTestReportPayload = {
  test_goal: string;
  test_cases: StageFourTestCase[];
  coverage_notes?: string;
  observed_failures: string[];
  improvement_actions: string[];
  overall_result: StageFourOverallResult;
};

export type StageFourAgentTestRunPayload = {
  access_note?: string;
  api_endpoint?: string;
  api_key?: string;
  api_type?: "dify_chat_messages" | "generic_json";
  app_name?: string;
  knowledge_name?: string;
  publish_url?: string;
};

export type StageFourDifyImplementationResponse = {
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  artifact: Artifact;
};

export type StageFourTestReportResponse = {
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  artifact: Artifact;
};

export type StageFourAiTestReviewResponse = {
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  ai_call_log_id: string | null;
  artifact: Artifact;
};

export type StageFiveDeliveryDocumentPayload = {
  project_name: string;
  final_agent_url: string;
  delivery_summary: string;
  core_features: string[];
  target_users: string[];
  usage_instructions: string;
  known_limitations: string[];
};

export type StageFiveAcceptancePackagePayload = {
  acceptance_scope: string;
  acceptance_criteria: string[];
  test_evidence_summary: string;
  unresolved_issues: string[];
  handover_checklist: string[];
};

export type StageFiveOperationsGuidePayload = {
  runtime_dependencies: string[];
  data_update_plan: string;
  monitoring_plan: string;
  common_issues: string[];
  maintenance_owner_notes: string;
};

export type StageFiveArtifactResponse = {
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  artifact: Artifact;
};

export type StageFiveAiDeliveryReviewResponse = {
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  ai_call_log_id: string | null;
  artifact: Artifact;
};

export type StageFiveCompletionResponse = {
  session_id: string;
  completed_stage_record_id: string;
  completed_stage_key: string;
  completed_stage_status: string;
  session_status: string;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function registerWithInvite(payload: {
  email: string;
  full_name: string;
  invite_code: string;
  password: string;
}): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/register", {
    method: "POST",
    body: payload,
  });
}

export async function getCurrentUser(token: string): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/api/v1/auth/me", { token });
}

export async function listCourses(token: string): Promise<Course[]> {
  return apiRequest<Course[]>("/api/v1/courses", { token });
}

export async function listTeacherCourseProgress(
  token: string,
): Promise<TeacherCourseProgress[]> {
  return apiRequest<TeacherCourseProgress[]>("/api/v1/teacher/progress/courses", { token });
}

export async function listTeacherStageArtifacts(
  token: string,
  sessionId: string,
  stageKey: string,
): Promise<TeacherArtifactSummary[]> {
  return apiRequest<TeacherArtifactSummary[]>(
    `/api/v1/teacher/progress/sessions/${sessionId}/stages/${stageKey}/artifacts`,
    { token },
  );
}

export async function confirmTeacherAiReview(
  token: string,
  artifactId: string,
  payload: TeacherReviewConfirmationPayload,
): Promise<TeacherArtifactSummary> {
  return apiRequest<TeacherArtifactSummary>(
    `/api/v1/teacher/progress/artifacts/${artifactId}/review-confirmation`,
    { method: "POST", token, body: payload },
  );
}

export async function saveTeacherGradeDraft(
  token: string,
  sessionId: string,
  payload: TeacherGradeDraftPayload,
): Promise<TeacherArtifactSummary> {
  return apiRequest<TeacherArtifactSummary>(
    `/api/v1/teacher/progress/sessions/${sessionId}/grade-draft`,
    { method: "POST", token, body: payload },
  );
}

export async function publishTeacherGrade(
  token: string,
  sessionId: string,
  payload: TeacherGradePublicationPayload,
): Promise<TeacherArtifactSummary> {
  return apiRequest<TeacherArtifactSummary>(
    `/api/v1/teacher/progress/sessions/${sessionId}/grade-publication`,
    { method: "POST", token, body: payload },
  );
}

export async function exportTeacherCourseGrades(
  token: string,
  courseId: string,
): Promise<TeacherGradeExport> {
  return apiRequest<TeacherGradeExport>(
    `/api/v1/teacher/progress/courses/${courseId}/grade-export`,
    { token },
  );
}

export async function downloadTeacherCourseGradesCsv(
  token: string,
  courseId: string,
): Promise<Blob> {
  const response = await fetch(
    `${apiBaseUrl}/api/v1/teacher/progress/courses/${courseId}/grade-export.csv`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new Error(detail || `API request failed with ${response.status}`);
  }

  return response.blob();
}

export async function downloadTeacherCourseGradesXlsx(
  token: string,
  courseId: string,
): Promise<Blob> {
  const response = await fetch(
    `${apiBaseUrl}/api/v1/teacher/progress/courses/${courseId}/grade-export.xlsx`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new Error(detail || `API request failed with ${response.status}`);
  }

  return response.blob();
}

export async function listTeacherCourseRubrics(
  token: string,
  courseId: string,
): Promise<TeacherRubric[]> {
  return apiRequest<TeacherRubric[]>(
    `/api/v1/teacher/progress/courses/${courseId}/rubrics`,
    { token },
  );
}

export async function saveTeacherCourseRubricDraft(
  token: string,
  courseId: string,
  stageKey: string,
  payload: TeacherRubricDraftPayload,
): Promise<TeacherRubric> {
  return apiRequest<TeacherRubric>(
    `/api/v1/teacher/progress/courses/${courseId}/rubrics/${stageKey}/draft`,
    { method: "POST", token, body: payload },
  );
}

export async function publishTeacherCourseRubric(
  token: string,
  courseId: string,
  rubricId: string,
): Promise<TeacherRubric> {
  return apiRequest<TeacherRubric>(
    `/api/v1/teacher/progress/courses/${courseId}/rubrics/${rubricId}/publish`,
    { method: "POST", token },
  );
}

export async function getAdminOperationsOverview(
  token: string,
): Promise<AdminOperationsOverview> {
  return apiRequest<AdminOperationsOverview>("/api/v1/admin/operations/overview", { token });
}

export async function upsertAdminLicenseEntitlement(
  token: string,
  payload: AdminLicenseEntitlementUpsertPayload,
): Promise<AdminLicenseEntitlement> {
  return apiRequest<AdminLicenseEntitlement>("/api/v1/admin/operations/license-entitlements", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateAdminDeploymentStatus(
  token: string,
  deploymentInstanceId: string,
  payload: AdminDeploymentStatusUpdatePayload,
): Promise<AdminDeploymentInstance> {
  return apiRequest<AdminDeploymentInstance>(
    `/api/v1/admin/operations/deployment-instances/${deploymentInstanceId}/status`,
    {
      method: "POST",
      token,
      body: payload,
    },
  );
}

export async function revokeAdminOperationsAccessGrant(
  token: string,
  grantId: string,
  payload: AdminAccessGrantRevokePayload,
): Promise<AdminOperationsAccessGrant> {
  return apiRequest<AdminOperationsAccessGrant>(
    `/api/v1/admin/operations/access-grants/${grantId}/revoke`,
    {
      method: "POST",
      token,
      body: payload,
    },
  );
}

export async function getLearningProfile(
  token: string,
  sessionId: string,
): Promise<LearningProfile> {
  return apiRequest<LearningProfile>(`/api/v1/learning-profiles/sessions/${sessionId}`, {
    token,
  });
}

export async function listExperimentSessions(token: string): Promise<ExperimentSession[]> {
  return apiRequest<ExperimentSession[]>("/api/v1/experiment-sessions", { token });
}

export async function createExperimentSession(
  token: string,
  courseId: string,
): Promise<ExperimentSession> {
  return apiRequest<ExperimentSession>("/api/v1/experiment-sessions", {
    token,
    method: "POST",
    body: { course_id: courseId },
  });
}

export async function askStageOneCustomer(
  token: string,
  sessionId: string,
  message: string,
): Promise<StageOneInterviewResponse> {
  return apiRequest<StageOneInterviewResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_1/stage-one/interview-turns`,
    {
      token,
      method: "POST",
      body: { message },
    },
  );
}

export async function getStageOneGuidedTraining(
  token: string,
  sessionId: string,
): Promise<StageOneGuidedTraining> {
  return apiRequest<StageOneGuidedTraining>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_1/stage-one/guided-training`,
    { token },
  );
}

export async function createStageOneGuidedTrainingTurn(
  token: string,
  sessionId: string,
  levelKey: string,
  message: string,
): Promise<StageOneGuidedTurnResponse> {
  return apiRequest<StageOneGuidedTurnResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_1/stage-one/guided-training/turns`,
    {
      token,
      method: "POST",
      body: { level_key: levelKey, message },
    },
  );
}

export async function completeStageOneGuidedTrainingLevel(
  token: string,
  sessionId: string,
  levelKey: string,
): Promise<StageOneGuidedLevelCompletionResponse> {
  return apiRequest<StageOneGuidedLevelCompletionResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_1/stage-one/guided-training/levels/${levelKey}/complete`,
    {
      token,
      method: "POST",
    },
  );
}

export async function saveStageOneSummary(
  token: string,
  sessionId: string,
  payload: StageOneSummaryPayload,
): Promise<StageOneSummaryResponse> {
  return apiRequest<StageOneSummaryResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_1/stage-one/summary`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function saveStageOneVisitNotes(
  token: string,
  sessionId: string,
  payload: StageOneVisitNotesPayload,
): Promise<StageOneVisitNotesResponse> {
  return apiRequest<StageOneVisitNotesResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_1/stage-one/visit-notes`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function requestStageOnePracticeEvaluation(
  token: string,
  sessionId: string,
): Promise<StageOneEvaluationResponse> {
  return apiRequest<StageOneEvaluationResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_1/stage-one/evaluation`,
    {
      token,
      method: "POST",
    },
  );
}

export async function completeStageOne(
  token: string,
  sessionId: string,
): Promise<StageCompletionResponse> {
  return apiRequest<StageCompletionResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_1/stage-one/complete`,
    {
      token,
      method: "POST",
    },
  );
}

export async function saveStageTwoSolutionDefinition(
  token: string,
  sessionId: string,
  payload: StageTwoSolutionDefinitionPayload,
): Promise<StageTwoSolutionDefinitionResponse> {
  return apiRequest<StageTwoSolutionDefinitionResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_2/stage-two/solution-definition`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function saveStageTwoSectionDraft(
  token: string,
  sessionId: string,
  payload: StageTwoSectionDraftPayload,
): Promise<StageTwoDocumentResponse> {
  return apiRequest<StageTwoDocumentResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_2/stage-two/section-draft`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function saveStageTwoGuideConfirmation(
  token: string,
  sessionId: string,
  payload: StageTwoGuideConfirmationPayload,
): Promise<StageTwoDocumentResponse> {
  return apiRequest<StageTwoDocumentResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_2/stage-two/guide-confirmation`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function requestStageTwoSectionReview(
  token: string,
  sessionId: string,
  documentType: StageTwoDocumentKey,
  sectionKey: StageTwoSectionKey,
): Promise<StageTwoAiReviewResponse> {
  return apiRequest<StageTwoAiReviewResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_2/stage-two/section-review`,
    {
      token,
      method: "POST",
      body: { document_type: documentType, section_key: sectionKey },
    },
  );
}

export async function submitStageTwoSection(
  token: string,
  sessionId: string,
  documentType: StageTwoDocumentKey,
  sectionKey: StageTwoSectionKey,
): Promise<StageTwoDocumentResponse> {
  return apiRequest<StageTwoDocumentResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_2/stage-two/section-submit`,
    {
      token,
      method: "POST",
      body: { document_type: documentType, section_key: sectionKey },
    },
  );
}

export async function composeStageTwoDocumentFromSections(
  token: string,
  sessionId: string,
  documentType: StageTwoDocumentKey,
): Promise<StageTwoDocumentResponse> {
  return apiRequest<StageTwoDocumentResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_2/stage-two/document-from-sections`,
    {
      token,
      method: "POST",
      body: { document_type: documentType },
    },
  );
}

export async function saveStageTwoRequirementsDocument(
  token: string,
  sessionId: string,
  payload: StageTwoRequirementsDocumentPayload,
): Promise<StageTwoDocumentResponse> {
  return apiRequest<StageTwoDocumentResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_2/stage-two/requirements-document`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function saveStageTwoFeasibilityReport(
  token: string,
  sessionId: string,
  payload: StageTwoFeasibilityReportPayload,
): Promise<StageTwoDocumentResponse> {
  return apiRequest<StageTwoDocumentResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_2/stage-two/feasibility-report`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function saveStageTwoTechnicalSolution(
  token: string,
  sessionId: string,
  payload: StageTwoTechnicalSolutionPayload,
): Promise<StageTwoDocumentResponse> {
  return apiRequest<StageTwoDocumentResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_2/stage-two/technical-solution`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function requestStageTwoDocumentReview(
  token: string,
  sessionId: string,
  documentType: StageTwoDocumentKey,
): Promise<StageTwoAiReviewResponse> {
  return apiRequest<StageTwoAiReviewResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_2/stage-two/document-review`,
    {
      token,
      method: "POST",
      body: { document_type: documentType },
    },
  );
}

export async function requestStageTwoAiReview(
  token: string,
  sessionId: string,
): Promise<StageTwoAiReviewResponse> {
  return apiRequest<StageTwoAiReviewResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_2/stage-two/ai-review`,
    {
      token,
      method: "POST",
    },
  );
}

export async function completeStageTwo(
  token: string,
  sessionId: string,
): Promise<StageCompletionResponse> {
  return apiRequest<StageCompletionResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_2/stage-two/complete`,
    {
      token,
      method: "POST",
    },
  );
}

export async function saveStageThreeKnowledgeDecision(
  token: string,
  sessionId: string,
  payload: StageThreeKnowledgeDecisionPayload,
): Promise<StageThreeKnowledgeDecisionResponse> {
  return apiRequest<StageThreeKnowledgeDecisionResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_3/stage-three/knowledge-decision`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function saveStageThreeCaseStudyRecord(
  token: string,
  sessionId: string,
  payload: StageThreeCaseStudyRecordPayload,
): Promise<StageThreeProcessArtifactResponse> {
  return apiRequest<StageThreeProcessArtifactResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_3/stage-three/case-study-record`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function saveStageThreeLabExperimentRecord(
  token: string,
  sessionId: string,
  payload: StageThreeLabExperimentRecordPayload,
): Promise<StageThreeProcessArtifactResponse> {
  return apiRequest<StageThreeProcessArtifactResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_3/stage-three/lab-experiment-record`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function requestStageThreeAiReview(
  token: string,
  sessionId: string,
): Promise<StageThreeAiReviewResponse> {
  return apiRequest<StageThreeAiReviewResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_3/stage-three/ai-review`,
    {
      token,
      method: "POST",
    },
  );
}

export async function completeStageThree(
  token: string,
  sessionId: string,
): Promise<StageCompletionResponse> {
  return apiRequest<StageCompletionResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_3/stage-three/complete`,
    {
      token,
      method: "POST",
    },
  );
}

export async function saveStageFourDifyImplementation(
  token: string,
  sessionId: string,
  payload: StageFourDifyImplementationPayload,
): Promise<StageFourDifyImplementationResponse> {
  return apiRequest<StageFourDifyImplementationResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_4/stage-four/dify-implementation`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function saveStageFourGuideConfirmation(
  token: string,
  sessionId: string,
  payload: StageFourGuideConfirmationPayload,
): Promise<StageFourDifyImplementationResponse> {
  return apiRequest<StageFourDifyImplementationResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_4/stage-four/guide-confirmation`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function saveStageFourTestReport(
  token: string,
  sessionId: string,
  payload: StageFourTestReportPayload,
): Promise<StageFourTestReportResponse> {
  return apiRequest<StageFourTestReportResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_4/stage-four/test-report`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function runStageFourAgentTests(
  token: string,
  sessionId: string,
  payload: StageFourAgentTestRunPayload,
): Promise<StageFourTestReportResponse> {
  return apiRequest<StageFourTestReportResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_4/stage-four/agent-tests`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function requestStageFourAiTestReview(
  token: string,
  sessionId: string,
): Promise<StageFourAiTestReviewResponse> {
  return apiRequest<StageFourAiTestReviewResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_4/stage-four/ai-test-review`,
    {
      token,
      method: "POST",
    },
  );
}

export async function completeStageFour(
  token: string,
  sessionId: string,
): Promise<StageCompletionResponse> {
  return apiRequest<StageCompletionResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_4/stage-four/complete`,
    {
      token,
      method: "POST",
    },
  );
}

export async function saveStageFiveDeliveryDocument(
  token: string,
  sessionId: string,
  payload: StageFiveDeliveryDocumentPayload,
): Promise<StageFiveArtifactResponse> {
  return apiRequest<StageFiveArtifactResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_5/stage-five/delivery-document`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function saveStageFiveAcceptancePackage(
  token: string,
  sessionId: string,
  payload: StageFiveAcceptancePackagePayload,
): Promise<StageFiveArtifactResponse> {
  return apiRequest<StageFiveArtifactResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_5/stage-five/acceptance-package`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function saveStageFiveOperationsGuide(
  token: string,
  sessionId: string,
  payload: StageFiveOperationsGuidePayload,
): Promise<StageFiveArtifactResponse> {
  return apiRequest<StageFiveArtifactResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_5/stage-five/operations-guide`,
    {
      token,
      method: "POST",
      body: payload,
    },
  );
}

export async function requestStageFiveAiDeliveryReview(
  token: string,
  sessionId: string,
): Promise<StageFiveAiDeliveryReviewResponse> {
  return apiRequest<StageFiveAiDeliveryReviewResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_5/stage-five/ai-delivery-review`,
    {
      token,
      method: "POST",
    },
  );
}

export async function completeStageFive(
  token: string,
  sessionId: string,
): Promise<StageFiveCompletionResponse> {
  return apiRequest<StageFiveCompletionResponse>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_5/stage-five/complete`,
    {
      token,
      method: "POST",
    },
  );
}

export async function listStageArtifacts(
  token: string,
  sessionId: string,
  stageKey: string,
): Promise<Artifact[]> {
  return apiRequest<Artifact[]>(
    `/api/v1/experiment-sessions/${sessionId}/stages/${stageKey}/artifacts`,
    { token },
  );
}

export async function listStageOneArtifacts(token: string, sessionId: string): Promise<Artifact[]> {
  return listStageArtifacts(token, sessionId, "stage_1");
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`无法连接后端服务：${apiBaseUrl}`);
    }
    throw error;
  }

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new Error(detail || `API request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === "string" ? body.detail : "";
  } catch {
    return "";
  }
}
