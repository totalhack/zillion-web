from typing import Dict

from fastapi.testclient import TestClient

from app.core.config import settings


def test_get_access_token(client: TestClient) -> None:
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    assert r.status_code == 200
    assert "access_token" in tokens
    assert tokens["access_token"]


def test_use_access_token(
    client: TestClient, superuser_token_headers: Dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/login/test-token", headers=superuser_token_headers
    )
    result = r.json()
    assert r.status_code == 200
    assert "email" in result


def test_get_access_token_incorrect_password(client: TestClient) -> None:
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": "not-the-right-password",
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 400
    assert r.json()["detail"] == "Incorrect email or password"


def test_reset_password_invalid_token(client: TestClient) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/reset-password/",
        json={"token": "invalid-token", "new_password": "new-password"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "Invalid token"
