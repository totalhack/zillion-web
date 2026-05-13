from typing import Dict

from fastapi.testclient import TestClient

from app.core.config import settings


def test_ok(client: TestClient) -> None:
    r = client.get(f"{settings.API_V1_STR}/utils/ok/")
    assert r.status_code == 200
    assert r.json() == {"status": "OK"}


def test_test_email_requires_superuser(
    client: TestClient, normal_user_token_headers: Dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/utils/test-email/",
        headers=normal_user_token_headers,
        params={"email_to": "example@example.com"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "The user doesn't have enough privileges"