from enum import StrEnum


def enum_values(enum_cls: type[StrEnum]) -> list[str]:
    return [member.value for member in enum_cls]


class UserRole(StrEnum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"


class CourseStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class PackageStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class PackageType(StrEnum):
    STANDARD = "standard"
    INSTITUTION_CUSTOM = "institution_custom"
    CO_BUILT = "co_built"


class StageStatus(StrEnum):
    LOCKED = "locked"
    NOT_STARTED = "not_started"
    IN_LEARNING = "in_learning"
    IN_PRACTICE = "in_practice"
    SUBMITTED = "submitted"
    REVISION_REQUIRED = "revision_required"
    WARNING_CONFIRMED = "warning_confirmed"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class SessionStatus(StrEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ArtifactStatus(StrEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"
    ACCEPTED = "accepted"
    REVISION_REQUIRED = "revision_required"


class RubricStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class YellowFlagSeverity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class YellowFlagStatus(StrEnum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    CARRIED_FORWARD = "carried_forward"
    CLEARED = "cleared"
    WAIVED_BY_TEACHER = "waived_by_teacher"


class AiCallStatus(StrEnum):
    SUCCEEDED = "succeeded"
    FAILED = "failed"
