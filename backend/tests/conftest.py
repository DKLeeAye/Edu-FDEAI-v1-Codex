from __future__ import annotations

from collections.abc import Generator

import pytest

from app.core.config import get_settings


@pytest.fixture(autouse=True)
def default_ai_provider_to_fake(monkeypatch: pytest.MonkeyPatch) -> Generator[None, None, None]:
    monkeypatch.setenv("AI_PROVIDER", "fake")
    monkeypatch.delenv("SILICONFLOW_API_KEY", raising=False)
    monkeypatch.delenv("SILICONFLOW_BASE_URL", raising=False)
    monkeypatch.delenv("SILICONFLOW_MODEL", raising=False)
    monkeypatch.delenv("AI_TIMEOUT_SECONDS", raising=False)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
