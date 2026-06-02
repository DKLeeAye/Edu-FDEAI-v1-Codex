from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_health_endpoint_reports_service_status() -> None:
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "EduFDE Core API",
        "environment": "local",
        "version": "0.1.0",
    }


def test_versioned_health_endpoint_reports_service_status() -> None:
    client = TestClient(create_app())

    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_frontend_origins_accept_comma_separated_values() -> None:
    settings = Settings(
        FRONTEND_ORIGIN="http://localhost:3000, http://127.0.0.1:3002,,",
    )

    assert settings.frontend_origins == ["http://localhost:3000", "http://127.0.0.1:3002"]


def test_default_frontend_origins_cover_localhost_and_loopback_dev_hosts() -> None:
    settings = Settings(_env_file=None)

    assert "http://localhost:3000" in settings.frontend_origins
    assert "http://127.0.0.1:3000" in settings.frontend_origins
