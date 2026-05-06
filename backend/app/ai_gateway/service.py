from __future__ import annotations

from time import perf_counter

from sqlalchemy.orm import Session

from app.ai_gateway.providers import AiProvider, FakeProvider, SiliconFlowProvider
from app.ai_gateway.schemas import AiGatewayRequest, AiGatewayResponse
from app.core.config import Settings, get_settings
from app.models import AiCallLog
from app.models.enums import AiCallStatus


class AiGatewayError(Exception):
    """Raised when an AI Gateway provider call fails."""


def invoke_ai(
    session: Session,
    request: AiGatewayRequest,
    *,
    provider: AiProvider | None = None,
) -> AiGatewayResponse:
    active_provider = provider or _configured_provider()
    started = perf_counter()
    try:
        response = active_provider.generate(request)
    except Exception as exc:
        latency_ms = _elapsed_ms(started)
        _write_call_log(
            session,
            request=request,
            provider=active_provider.provider,
            model_name=active_provider.model_name,
            status=AiCallStatus.FAILED,
            latency_ms=latency_ms,
            error_message=str(exc),
        )
        raise AiGatewayError(str(exc)) from exc

    latency_ms = _elapsed_ms(started)
    response = response.model_copy(update={"latency_ms": latency_ms})
    call_log = _write_call_log(
        session,
        request=request,
        provider=response.provider,
        model_name=response.model_name,
        status=AiCallStatus.SUCCEEDED,
        latency_ms=latency_ms,
        response=response,
    )
    return response.model_copy(update={"call_log_id": call_log.id})


def _write_call_log(
    session: Session,
    *,
    request: AiGatewayRequest,
    provider: str,
    model_name: str,
    status: AiCallStatus,
    latency_ms: int,
    response: AiGatewayResponse | None = None,
    error_message: str | None = None,
) -> AiCallLog:
    log = AiCallLog(
        tenant_id=request.tenant_id,
        institution_id=request.institution_id,
        course_id=request.course_id,
        session_id=request.session_id,
        stage_record_id=request.stage_record_id,
        user_id=request.user_id,
        prompt_version_id=request.prompt_version_id,
        usage_type=request.usage_type,
        provider=provider,
        model_name=model_name,
        status=status,
        request_metadata_json=_request_metadata(request),
        response_metadata_json=_response_metadata(response),
        prompt_tokens=response.prompt_tokens if response is not None else 0,
        completion_tokens=response.completion_tokens if response is not None else 0,
        total_tokens=response.total_tokens if response is not None else 0,
        latency_ms=latency_ms,
        error_message=error_message,
    )
    session.add(log)
    session.commit()
    session.refresh(log)
    return log


def _request_metadata(request: AiGatewayRequest) -> dict[str, object]:
    return {
        "summary": _summarize(request.input_text),
        "input_length": len(request.input_text),
        "payload_keys": sorted(request.request_payload.keys()),
    }


def _response_metadata(response: AiGatewayResponse | None) -> dict[str, object]:
    if response is None:
        return {}
    return {
        "summary": _summarize(response.content),
        "content_length": len(response.content),
        "payload_keys": sorted(response.response_payload.keys()),
    }


def _summarize(value: str, *, max_length: int = 500) -> str:
    normalized = " ".join(value.strip().split())
    if len(normalized) <= max_length:
        return normalized
    return f"{normalized[: max_length - 3]}..."


def _elapsed_ms(started: float) -> int:
    return max(0, int((perf_counter() - started) * 1000))


def _configured_provider(app_settings: Settings | None = None) -> AiProvider:
    current_settings = app_settings or get_settings()
    provider_name = current_settings.ai_provider.strip().lower()
    if provider_name in {"", "fake"}:
        return FakeProvider()
    if provider_name == "siliconflow":
        return SiliconFlowProvider(
            api_key=current_settings.siliconflow_api_key,
            base_url=current_settings.siliconflow_base_url,
            model_name=current_settings.siliconflow_model,
            timeout_seconds=current_settings.ai_timeout_seconds,
        )
    return _ConfigurationErrorProvider(
        provider=provider_name or "unconfigured",
        message=(
            f"Unsupported AI_PROVIDER '{current_settings.ai_provider}'. "
            "Supported providers: fake, siliconflow"
        ),
    )


class _ConfigurationErrorProvider:
    model_name = "unconfigured"

    def __init__(self, *, provider: str, message: str) -> None:
        self.provider = provider
        self._message = message

    def generate(self, request: AiGatewayRequest) -> AiGatewayResponse:
        raise ValueError(self._message)
