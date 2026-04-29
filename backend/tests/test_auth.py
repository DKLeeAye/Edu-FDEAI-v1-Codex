from __future__ import annotations

import importlib
import uuid
from collections.abc import Generator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_session
from app.main import create_app
from app.models import Institution, Tenant, User
from app.models.enums import UserRole


def load_security_module() -> Any:
    try:
        return importlib.import_module("app.core.security")
    except ModuleNotFoundError as exc:
        pytest.fail(f"app.core.security is not implemented: {exc}")


def test_password_hash_verifies_matching_password() -> None:
    security = load_security_module()

    password_hash = security.hash_password("correct-password")

    assert password_hash != "correct-password"
    assert security.verify_password("correct-password", password_hash)


def test_password_hash_rejects_wrong_password() -> None:
    security = load_security_module()

    password_hash = security.hash_password("correct-password")

    assert not security.verify_password("wrong-password", password_hash)


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_sessionmaker = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )

    with testing_sessionmaker() as session:
        yield session

    Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    app = create_app()

    def override_get_session() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture()
def active_student(db_session: Session) -> User:
    security = load_security_module()
    tenant = Tenant(name="Demo Tenant", slug=f"demo-{uuid.uuid4()}")
    db_session.add(tenant)
    db_session.flush()
    institution = Institution(tenant_id=tenant.id, name="Demo University", code="DEMO")
    db_session.add(institution)
    db_session.flush()
    user = User(
        tenant_id=tenant.id,
        institution_id=institution.id,
        email="student@example.edu",
        full_name="Student Demo",
        role=UserRole.STUDENT,
        is_active=True,
        password_hash=security.hash_password("correct-password"),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_login_success_returns_access_token(client: TestClient, active_student: User) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": active_student.email, "password": "correct-password"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)
    assert body["access_token"]


def test_login_rejects_wrong_password(client: TestClient, active_student: User) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": active_student.email, "password": "wrong-password"},
    )

    assert response.status_code == 401


def test_me_rejects_missing_token(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_me_returns_current_user_for_valid_token(
    client: TestClient,
    active_student: User,
) -> None:
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": active_student.email, "password": "correct-password"},
    )
    token = login_response.json()["access_token"]

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": str(active_student.id),
        "email": active_student.email,
        "full_name": active_student.full_name,
        "tenant_id": str(active_student.tenant_id),
        "institution_id": str(active_student.institution_id),
        "role": "student",
    }
