from __future__ import annotations

from typing import Protocol

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
