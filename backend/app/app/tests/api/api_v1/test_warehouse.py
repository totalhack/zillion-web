from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tlbx import st, pp

from app.core.config import settings


def test_root(client: TestClient, superuser_token_headers: dict) -> None:
    resp = client.get(
        f"{settings.API_V1_STR}/warehouse/", headers=superuser_token_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    pp(data)


def test_get_structure(client: TestClient, superuser_token_headers: dict) -> None:
    resp = client.get(
        f"{settings.API_V1_STR}/warehouse/1/structure", headers=superuser_token_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    pp(data)


def test_check_formula(client: TestClient, superuser_token_headers: dict) -> None:
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/check_formula",
        headers=superuser_token_headers,
        json={"name": "adhoc1", "formula": "1.0*{Cases}/{Deaths}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    pp(data)


def test_execute(client: TestClient, superuser_token_headers: dict) -> None:
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/execute",
        headers=superuser_token_headers,
        json={"metrics": ["cases"], "dimensions": ["month"]},
    )
    assert resp.status_code == 200, resp.content
    data = resp.json()
    pp(data)


def test_execute_no_display(client: TestClient, superuser_token_headers: dict) -> None:
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/execute",
        headers=superuser_token_headers,
        json={"metrics": ["cases"], "dimensions": ["month"], "display_names": False},
    )
    assert resp.status_code == 200, resp.content
    data = resp.json()
    pp(data)


def test_save_and_execute_id(client: TestClient, superuser_token_headers: dict) -> None:
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/save",
        headers=superuser_token_headers,
        json={"metrics": ["cases"], "dimensions": ["month"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    pp(data)

    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/execute_id",
        headers=superuser_token_headers,
        json=data,
    )
    assert resp.status_code == 200
    data = resp.json()
    pp(data)


def test_execute_invalid_fields(
    client: TestClient, superuser_token_headers: dict
) -> None:
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/execute",
        headers=superuser_token_headers,
        json={"metrics": ["bla"], "dimensions": ["month"]},
    )
    assert resp.status_code == 400, resp.content


def test_execute_shortcut_criteria(
    client: TestClient, superuser_token_headers: dict
) -> None:
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/execute",
        headers=superuser_token_headers,
        json={
            "metrics": ["cases"],
            "dimensions": ["month"],
            "criteria": [("date", ">=", "StartofMonth")],
        },
    )
    assert resp.status_code == 200, resp.content
    data = resp.json()
    pp(data)