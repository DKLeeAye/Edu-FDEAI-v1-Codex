import type { StageThreeKnowledgeStrategy } from "@/src/lib/api";

export type StatusTone = "accent" | "danger" | "normal";

export type InterviewTurn = {
  id: string;
  userMessage: string;
  aiResponse: string;
  artifactId: string;
  aiCallLogId: string | null;
};

export type SummaryFormState = {
  problemStatement: string;
  targetUser: string;
  businessContext: string;
  painPoints: string;
  successCriteria: string;
};

export type SolutionFormState = {
  solutionTitle: string;
  problemSummary: string;
  proposedAgentCapability: string;
  targetWorkflow: string;
  dataSources: string;
  toolOrSystemDependencies: string;
  feasibilityRisks: string;
  expectedValue: string;
};

export type KnowledgeDecisionFormState = {
  knowledgeGoal: string;
  requiredKnowledgeTypes: string;
  sourceInventory: string;
  selectedStrategy: StageThreeKnowledgeStrategy;
  strategyRationale: string;
  dataQualityRisks: string;
  maintenancePlan: string;
  evaluationPlan: string;
  stage4BuildPlan: string;
};
