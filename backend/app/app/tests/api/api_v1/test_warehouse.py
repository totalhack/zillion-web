from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tlbx import st, pp

from app import crud
from app.core.config import settings
from app.schemas.user import UserCreate
from app.tests.utils.user import authentication_token_from_email
from app.tests.utils.utils import random_email, random_lower_string


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


def test_get_fields(client: TestClient, superuser_token_headers: dict):
    resp = client.get(
        f"{settings.API_V1_STR}/warehouse/1/get_fields",
        headers=superuser_token_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == 1
    assert "hits" in data["metrics"]
    assert "year" in data["dimensions"]


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


def test_check_metric_formula_duplicate_display_name(
    client: TestClient, superuser_token_headers: dict
):
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/check_metric_formula",
        headers=superuser_token_headers,
        json={
            "name": "adhoc1",
            "formula": "1.0*{hits}/{at_bats}",
            "display_name": "H",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data == {
        "success": False,
        "reason": "Display name 'H' is used by another field",
    }


def test_check_dimension_formula_duplicate_display_name(
    client: TestClient, superuser_token_headers: dict
):
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/check_dimension_formula",
        headers=superuser_token_headers,
        json={"name": "adhoc_dim", "formula": "{year}", "display_name": "Year"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data == {
        "success": False,
        "reason": "Display name 'Year' is used by another field",
    }


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
    # NLP coverage is temporarily disabled during the Python 3.11 upgrade.
    pass


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


def test_save_and_load(client: TestClient, superuser_token_headers: dict):
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/save",
        headers=superuser_token_headers,
        json={"metrics": ["hits"], "dimensions": ["year"]},
    )
    assert resp.status_code == 200
    spec_id = resp.json()["spec_id"]

    resp = client.get(
        f"{settings.API_V1_STR}/warehouse/1/load",
        headers=superuser_token_headers,
        params={"spec_id": spec_id},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["metrics"] == ["hits"]
    assert data["dimensions"] == ["year"]
    data = resp.json()
    pp(data)


def test_init_embeddings(client: TestClient, superuser_token_headers: dict):
    # NLP coverage is temporarily disabled during the Python 3.11 upgrade.
    pass


def test_load_from_text(client: TestClient, superuser_token_headers: dict):
    # NLP coverage is temporarily disabled during the Python 3.11 upgrade.
    pass


def test_execute_invalid_fields(client: TestClient, superuser_token_headers: dict):
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/execute",
        headers=superuser_token_headers,
        json={"metrics": ["bla"], "dimensions": ["year"]},
    )
    assert resp.status_code == 400


def test_list_warehouses_filters_by_user_access(client: TestClient, db: Session):
    email = random_email()
    password = random_lower_string()
    user = crud.user.create(db, obj_in=UserCreate(email=email, password=password))
    crud.user.update(db, db_obj=user, obj_in={"warehouse_ids": [1]})
    headers = authentication_token_from_email(client=client, email=email, db=db)

    resp = client.get(f"{settings.API_V1_STR}/warehouse/", headers=headers)

    assert resp.status_code == 200
    assert resp.json() == {"1": {"id": 1, "name": "Zillion Baseball Warehouse"}}


def test_warehouse_structure_forbidden_without_access(
    client: TestClient, normal_user_token_headers: dict
):
    resp = client.get(
        f"{settings.API_V1_STR}/warehouse/1/structure",
        headers=normal_user_token_headers,
    )

    assert resp.status_code == 403
    assert resp.json()["detail"] == "You do not have access to warehouse 1"


def test_execute_allowed_with_explicit_warehouse_access(
    client: TestClient, db: Session
):
    email = random_email()
    password = random_lower_string()
    user = crud.user.create(db, obj_in=UserCreate(email=email, password=password))
    crud.user.update(db, db_obj=user, obj_in={"warehouse_ids": [1]})
    headers = authentication_token_from_email(client=client, email=email, db=db)

    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/execute",
        headers=headers,
        json={"metrics": ["hits"], "dimensions": ["year"]},
    )

    assert resp.status_code == 200


def test_load_forbidden_without_access(
    client: TestClient, superuser_token_headers: dict, normal_user_token_headers: dict
):
    resp = client.post(
        f"{settings.API_V1_STR}/warehouse/1/save",
        headers=superuser_token_headers,
        json={"metrics": ["hits"], "dimensions": ["year"]},
    )
    assert resp.status_code == 200
    spec_id = resp.json()["spec_id"]

    resp = client.get(
        f"{settings.API_V1_STR}/warehouse/1/load",
        headers=normal_user_token_headers,
        params={"spec_id": spec_id},
    )

    assert resp.status_code == 403
    assert resp.json()["detail"] == "You do not have access to warehouse 1"


# TODO This test needs to be rewritten for the baseball dataset.
# We do have date coverage available through debut_date, but the old shortcut
# expectations were written against a different warehouse schema.
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
