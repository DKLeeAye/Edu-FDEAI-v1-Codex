from __future__ import annotations

import uuid
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import StageStatus
from app.schemas.artifacts import ArtifactResponse

StageTwoDocumentType = Literal[
    "requirements_document",
    "feasibility_report",
    "technical_solution",
]

StageTwoSectionKey = Literal[
    "requirements_context",
    "requirements_scope",
    "requirements_acceptance",
    "feasibility_data",
    "feasibility_technical",
    "feasibility_value",
    "technical_route",
    "technical_flow",
    "technical_handoff",
]


class StageTwoSectionDraftRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    document_type: StageTwoDocumentType
    section_key: StageTwoSectionKey
    student_responses: dict[str, Any] = Field(default_factory=dict)
    evidence_artifact_ids: list[uuid.UUID] = Field(default_factory=list, max_length=20)
    student_reflection: str | None = Field(default=None, min_length=1, max_length=2000)


class StageTwoSectionActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    document_type: StageTwoDocumentType
    section_key: StageTwoSectionKey


class StageTwoDocumentFromSectionsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    document_type: StageTwoDocumentType


class StageTwoRequirementsDocumentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    project_background: str = Field(min_length=1, max_length=4000)
    current_business_process: str = Field(min_length=1, max_length=4000)
    pain_points: list[str] = Field(min_length=1, max_length=12)
    requirement_goals: list[str] = Field(min_length=1, max_length=12)
    acceptance_criteria: list[str] = Field(min_length=1, max_length=12)
    constraints: list[str] = Field(min_length=1, max_length=12)
    source_evidence_artifact_ids: list[uuid.UUID] = Field(default_factory=list, max_length=20)


class StageTwoFeasibilityReportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    data_sources: list[str] = Field(min_length=1, max_length=20)
    data_quality_assessment: str = Field(min_length=1, max_length=4000)
    data_gaps: list[str] = Field(default_factory=list, max_length=20)
    data_feasibility_conclusion: Literal["feasible", "needs_supplement", "not_feasible"]
    ai_capable_scope: str = Field(min_length=1, max_length=4000)
    ai_limitations: str = Field(min_length=1, max_length=4000)
    technical_risks: list[str] = Field(default_factory=list, max_length=20)
    technical_feasibility_conclusion: Literal["feasible", "conditional", "not_recommended"]
    expected_benefits: str = Field(min_length=1, max_length=4000)
    implementation_cost: str = Field(min_length=1, max_length=4000)
    roi_conclusion: Literal["worth_doing", "conditional", "not_worth_doing"]
    overall_recommendation: Literal["proceed", "adjust_scope", "pause"]


class StageTwoTechnicalSolutionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    knowledge_base_strategy: Literal["document", "structured", "hybrid", "none"]
    knowledge_base_rationale: str = Field(min_length=1, max_length=4000)
    agent_type: Literal["chat", "workflow", "hybrid"]
    agent_type_rationale: str = Field(min_length=1, max_length=4000)
    data_flow: str = Field(min_length=1, max_length=4000)
    deployment_option: Literal["saas", "private", "hybrid", "local_demo"]
    deployment_rationale: str = Field(min_length=1, max_length=4000)
    technical_risks: list[str] = Field(default_factory=list, max_length=20)
    stage_three_starting_point: str = Field(min_length=1, max_length=4000)
    stage_four_build_plan: str = Field(min_length=1, max_length=4000)


class StageTwoDocumentReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    document_type: StageTwoDocumentType


class StageTwoSolutionDefinitionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    solution_title: str = Field(min_length=1, max_length=200)
    problem_statement_ref: uuid.UUID | None = None
    problem_summary: str | None = Field(default=None, min_length=1, max_length=4000)
    proposed_agent_capability: str = Field(min_length=1, max_length=4000)
    target_workflow: str = Field(min_length=1, max_length=4000)
    data_sources: list[str] = Field(min_length=1, max_length=20)
    tool_or_system_dependencies: list[str] = Field(min_length=1, max_length=20)
    feasibility_risks: list[str] = Field(min_length=1, max_length=20)
    expected_value: str = Field(min_length=1, max_length=4000)

    @model_validator(mode="after")
    def require_problem_reference(self) -> StageTwoSolutionDefinitionRequest:
        if self.problem_statement_ref is None and not self.problem_summary:
            raise ValueError("problem_statement_ref or problem_summary is required")
        return self


class StageTwoSolutionDefinitionResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: ArtifactResponse


class StageTwoDocumentResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    artifact: ArtifactResponse


class StageTwoAiReviewResponse(BaseModel):
    session_id: uuid.UUID
    stage_record_id: uuid.UUID
    stage_key: str
    ai_call_log_id: uuid.UUID | None
    artifact: ArtifactResponse


class StageTwoCompletionResponse(BaseModel):
    session_id: uuid.UUID
    completed_stage_record_id: uuid.UUID
    completed_stage_key: str
    completed_stage_status: StageStatus
    unlocked_stage_record_id: uuid.UUID
    unlocked_stage_key: str
    unlocked_stage_status: StageStatus
