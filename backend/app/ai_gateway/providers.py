from __future__ import annotations

from typing import Any, Protocol

import httpx

from app.ai_gateway.schemas import AiGatewayRequest, AiGatewayResponse


class AiProvider(Protocol):
    provider: str
    model_name: str

    def generate(self, request: AiGatewayRequest) -> AiGatewayResponse:
        """Generate a response for a gateway request."""


class FakeProvider:
    provider = "fake"
    model_name = "fake-deterministic-v1"

    def generate(self, request: AiGatewayRequest) -> AiGatewayResponse:
        content = f"Fake {request.usage_type} response: {request.input_text}"
        return AiGatewayResponse(
            provider=self.provider,
            model_name=self.model_name,
            content=content,
            response_payload={
                "deterministic": True,
                "usage_type": request.usage_type,
            },
            prompt_tokens=0,
            completion_tokens=0,
            total_tokens=0,
        )


class SiliconFlowConfigurationError(ValueError):
    """Raised when SiliconFlow is selected without the required runtime config."""


class SiliconFlowProvider:
    provider = "siliconflow"

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        model_name: str,
        timeout_seconds: int,
        http_client: httpx.Client | None = None,
    ) -> None:
        self.api_key = api_key.strip()
        self.base_url = base_url.strip().rstrip("/")
        self._configured_model_name = model_name.strip()
        self.model_name = self._configured_model_name or "unconfigured"
        self.timeout_seconds = timeout_seconds
        self._http_client = http_client

    def generate(self, request: AiGatewayRequest) -> AiGatewayResponse:
        self._validate_configuration()
        body = {
            "model": self._configured_model_name,
            "messages": self._build_messages(request),
            "stream": False,
        }
        response_data = self._post_chat_completion(body)
        return self._parse_response(response_data)

    def _validate_configuration(self) -> None:
        missing = []
        if not self.api_key:
            missing.append("SILICONFLOW_API_KEY")
        if not self.base_url:
            missing.append("SILICONFLOW_BASE_URL")
        if not self._configured_model_name:
            missing.append("SILICONFLOW_MODEL")
        if missing:
            missing_text = ", ".join(missing)
            raise SiliconFlowConfigurationError(
                "SiliconFlow provider is enabled but missing required configuration: "
                f"{missing_text}"
            )

    def _build_messages(self, request: AiGatewayRequest) -> list[dict[str, str]]:
        messages: list[dict[str, str]] = []
        system_prompt = request.request_payload.get("system_prompt")
        if isinstance(system_prompt, str) and system_prompt.strip():
            messages.append({"role": "system", "content": system_prompt.strip()})
        conversation_history = request.request_payload.get("conversation_history")
        if isinstance(conversation_history, list):
            for item in conversation_history:
                if not isinstance(item, dict):
                    continue
                role = item.get("role")
                content = item.get("content")
                if role in {"user", "assistant"} and isinstance(content, str) and content.strip():
                    messages.append({"role": role, "content": content.strip()})
        messages.append({"role": "user", "content": request.input_text})
        return messages

    def _post_chat_completion(self, body: dict[str, Any]) -> dict[str, Any]:
        client = self._http_client
        close_client = False
        if client is None:
            client = httpx.Client(timeout=self.timeout_seconds)
            close_client = True
        try:
            response = client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
            )
        except httpx.RequestError as exc:
            raise RuntimeError(f"SiliconFlow request failed: {exc}") from exc
        finally:
            if close_client:
                client.close()

        if response.status_code >= 400:
            raise RuntimeError(
                "SiliconFlow request failed with status "
                f"{response.status_code}: {_extract_error_message(response)}"
            )
        try:
            response_data = response.json()
        except ValueError as exc:
            raise RuntimeError("SiliconFlow response was not valid JSON") from exc
        if not isinstance(response_data, dict):
            raise RuntimeError("SiliconFlow response JSON must be an object")
        return response_data

    def _parse_response(self, response_data: dict[str, Any]) -> AiGatewayResponse:
        choices = response_data.get("choices")
        if not isinstance(choices, list) or not choices:
            raise RuntimeError("SiliconFlow response did not include choices")

        first_choice = choices[0]
        if not isinstance(first_choice, dict):
            raise RuntimeError("SiliconFlow response choice was not an object")
        message = first_choice.get("message")
        if not isinstance(message, dict):
            raise RuntimeError("SiliconFlow response choice did not include a message")
        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            raise RuntimeError("SiliconFlow response message did not include content")

        usage = response_data.get("usage")
        if not isinstance(usage, dict):
            usage = {}
        response_model = response_data.get("model")
        model_name = response_model if isinstance(response_model, str) else self.model_name
        finish_reason = first_choice.get("finish_reason")
        return AiGatewayResponse(
            provider=self.provider,
            model_name=model_name,
            content=content,
            response_payload={
                "id": response_data.get("id"),
                "object": response_data.get("object"),
                "created": response_data.get("created"),
                "model": response_model,
                "finish_reason": finish_reason,
            },
            prompt_tokens=_int_or_zero(usage.get("prompt_tokens")),
            completion_tokens=_int_or_zero(usage.get("completion_tokens")),
            total_tokens=_int_or_zero(usage.get("total_tokens")),
        )


def _extract_error_message(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.text[:500]
    if isinstance(payload, dict):
        for key in ("message", "error", "detail"):
            value = payload.get(key)
            if isinstance(value, str):
                return value
            if isinstance(value, dict):
                nested_message = value.get("message")
                if isinstance(nested_message, str):
                    return nested_message
    return str(payload)[:500]


def _int_or_zero(value: Any) -> int:
    if isinstance(value, int):
        return value
    return 0
