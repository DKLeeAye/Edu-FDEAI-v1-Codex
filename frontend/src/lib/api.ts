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

export type StageOneSummaryPayload = {
  problem_statement: string;
  target_user: string;
  business_context: string;
  pain_points: string[];
  success_criteria: string[];
};

export type StageOneSummaryResponse = {
  session_id: string;
  stage_record_id: string;
  stage_key: string;
  artifact: Artifact;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function getCurrentUser(token: string): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/api/v1/auth/me", { token });
}

export async function listCourses(token: string): Promise<Course[]> {
  return apiRequest<Course[]>("/api/v1/courses", { token });
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

export async function listStageOneArtifacts(token: string, sessionId: string): Promise<Artifact[]> {
  return apiRequest<Artifact[]>(
    `/api/v1/experiment-sessions/${sessionId}/stages/stage_1/artifacts`,
    { token },
  );
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

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
