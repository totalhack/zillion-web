from fastapi.testclient import TestClient
from tlbx import st, pp

from app.core.config import settings


def test_root(client: TestClient, superuser_token_headers: dict):
    resp = client.get(
        f"{settings.API_V1_STR}/warehouse/", headers=superuser_token_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    pp(data)


def test_get_structure(client: TestClient, superuser_token_headers: dict):
    resp = client.get(
        f"{settings.API_V1_STR}/warehouse/1/structure", headers=superuser_token_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    pp(data)


def test_reinit_warehouse(client: TestClient, superuser_token_headers: dict):
    resp = client.get(
        f"{settings.API_V1_STR}/warehouse/1/reinit", headers=superuser_token_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    pp(data)


def test_check_metric_formula(client: TestClient, superuser_token_headers: dict):
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/check_metric_formula",
        headers=superuser_token_headers,
        json={"name": "adhoc1", "formula": "1.0*{hits}/{at_bats}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    pp(data)


def test_execute(client: TestClient, superuser_token_headers: dict):
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/execute",
        headers=superuser_token_headers,
        json={"metrics": ["hits"], "dimensions": ["year"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    pp(data)


def test_execute_text(client: TestClient, superuser_token_headers: dict):
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/execute_text",
        headers=superuser_token_headers,
        json={"text": "Home runs by year for the last 10 years"},
    )
    assert resp.status_code == 200
    data = resp.json()
    pp(data)


def test_execute_no_display(client: TestClient, superuser_token_headers: dict):
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/execute",
        headers=superuser_token_headers,
        json={"metrics": ["hits"], "dimensions": ["year"], "display_names": False},
    )
    assert resp.status_code == 200
    data = resp.json()
    pp(data)


def test_save_and_execute_id(client: TestClient, superuser_token_headers: dict):
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/save",
        headers=superuser_token_headers,
        json={"metrics": ["hits"], "dimensions": ["year"]},
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


def test_init_embeddings(client: TestClient, superuser_token_headers: dict):
    resp = client.get(
        f"{settings.API_V1_STR}/warehouse/1/init_embeddings",
        headers=superuser_token_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    pp(data)


def test_load_from_text(client: TestClient, superuser_token_headers: dict):
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/load_from_text",
        headers=superuser_token_headers,
        json={"text": "hits and home runs by year for the last 10 years"},
    )
    assert resp.status_code == 200
    data = resp.json()
    pp(data)
    assert data["metrics"] == ["hits", "home_runs"]
    assert data["dimensions"] == ["year"]


def test_execute_invalid_fields(client: TestClient, superuser_token_headers: dict):
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/execute",
        headers=superuser_token_headers,
        json={"metrics": ["bla"], "dimensions": ["year"]},
    )
    assert resp.status_code == 400


# TODO This test needs to be rewritten since we are using the basebell
# dataset for tests now which doesn't have any useful shortcuts (no dates)
# def test_execute_shortcut_criteria(client: TestClient, superuser_token_headers: dict):
#     resp = client.post(
#         f"{settings.API_V1_STR}/warehouse/1/execute",
#         headers=superuser_token_headers,
#         json={
#             "metrics": ["H"],
#             "dimensions": ["year"],
#             "criteria": [("year", ">=", "StartofYear")],
#         },
#     )
#     assert resp.status_code == 200
#     data = resp.json()
#     pp(data)
