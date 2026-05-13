from typing import Dict

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import crud
from app.core.config import settings
from app.schemas.user import UserCreate
from app.tests.utils.user import user_authentication_headers
from app.tests.utils.utils import random_email, random_lower_string


def test_get_users_superuser_me(
    client: TestClient, superuser_token_headers: Dict[str, str]
) -> None:
    r = client.get(f"{settings.API_V1_STR}/users/me", headers=superuser_token_headers)
    current_user = r.json()
    assert current_user
    assert current_user["is_active"] is True
    assert current_user["is_superuser"]
    assert current_user["email"] == settings.FIRST_SUPERUSER


def test_get_users_normal_user_me(
    client: TestClient,
    normal_user_token_headers: Dict[str, str],
    normal_user_email: str,
) -> None:
    r = client.get(f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers)
    current_user = r.json()
    assert current_user
    assert current_user["is_active"] is True
    assert current_user["is_superuser"] is False
    assert current_user["email"] == normal_user_email


def test_create_user_new_email(
    client: TestClient, superuser_token_headers: dict, db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    data = {"email": username, "password": password}
    r = client.post(
        f"{settings.API_V1_STR}/users/", headers=superuser_token_headers, json=data
    )
    assert 200 <= r.status_code < 300
    created_user = r.json()
    db.expire_all()
    user = crud.user.get_by_email(db, email=username)
    assert user
    assert user.email == created_user["email"]


def test_create_user_with_warehouse_access(
    client: TestClient, superuser_token_headers: dict, db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    data = {"email": username, "password": password, "warehouse_ids": [1]}

    r = client.post(
        f"{settings.API_V1_STR}/users/", headers=superuser_token_headers, json=data
    )

    assert 200 <= r.status_code < 300
    created_user = r.json()
    assert created_user["warehouse_ids"] == [1]

    db.expire_all()
    user = crud.user.get_by_email(db, email=username)
    assert user
    assert user.warehouse_ids == [1]


def test_get_existing_user(
    client: TestClient, superuser_token_headers: dict, db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.user.create(db, obj_in=user_in)
    user_id = user.id
    r = client.get(
        f"{settings.API_V1_STR}/users/{user_id}", headers=superuser_token_headers
    )
    assert 200 <= r.status_code < 300
    api_user = r.json()
    existing_user = crud.user.get_by_email(db, email=username)
    assert existing_user
    assert existing_user.email == api_user["email"]


def test_create_user_existing_username(
    client: TestClient, superuser_token_headers: dict, db: Session
) -> None:
    username = random_email()
    # username = email
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    crud.user.create(db, obj_in=user_in)
    data = {"email": username, "password": password}
    r = client.post(
        f"{settings.API_V1_STR}/users/", headers=superuser_token_headers, json=data
    )
    created_user = r.json()
    assert r.status_code == 400
    assert "_id" not in created_user


def test_create_user_by_normal_user(
    client: TestClient, normal_user_token_headers: Dict[str, str]
) -> None:
    username = random_email()
    password = random_lower_string()
    data = {"email": username, "password": password}
    r = client.post(
        f"{settings.API_V1_STR}/users/", headers=normal_user_token_headers, json=data
    )
    assert r.status_code == 400


def test_get_other_user_by_normal_user_forbidden(
    client: TestClient,
    normal_user_token_headers: Dict[str, str],
    db: Session,
) -> None:
    username = random_email()
    password = random_lower_string()
    user = crud.user.create(db, obj_in=UserCreate(email=username, password=password))

    r = client.get(
        f"{settings.API_V1_STR}/users/{user.id}", headers=normal_user_token_headers
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "The user doesn't have enough privileges"


def test_update_user_me_updates_password_and_name(
    client: TestClient,
    normal_user_token_headers: Dict[str, str],
    normal_user_email: str,
) -> None:
    new_password = random_lower_string()
    full_name = "Updated User"
    r = client.put(
        f"{settings.API_V1_STR}/users/me",
        headers=normal_user_token_headers,
        json={"password": new_password, "full_name": full_name},
    )
    assert r.status_code == 200
    result = r.json()
    assert result["full_name"] == full_name

    updated_headers = user_authentication_headers(
        client=client, email=normal_user_email, password=new_password
    )
    r = client.get(f"{settings.API_V1_STR}/users/me", headers=updated_headers)
    assert r.status_code == 200
    assert r.json()["full_name"] == full_name


def test_update_user_by_superuser(
    client: TestClient, superuser_token_headers: dict, db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    user = crud.user.create(db, obj_in=UserCreate(email=username, password=password))

    r = client.put(
        f"{settings.API_V1_STR}/users/{user.id}",
        headers=superuser_token_headers,
        json={"full_name": "Admin Updated", "is_active": False},
    )
    assert r.status_code == 200
    result = r.json()
    assert result["full_name"] == "Admin Updated"
    assert result["is_active"] is False


def test_update_user_by_superuser_updates_warehouse_access(
    client: TestClient, superuser_token_headers: dict, db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    user = crud.user.create(db, obj_in=UserCreate(email=username, password=password))

    r = client.put(
        f"{settings.API_V1_STR}/users/{user.id}",
        headers=superuser_token_headers,
        json={"warehouse_ids": [1]},
    )

    assert r.status_code == 200
    result = r.json()
    assert result["warehouse_ids"] == [1]

    db.expire_all()
    updated_user = crud.user.get(db, id=user.id)
    assert updated_user
    assert updated_user.warehouse_ids == [1]


def test_update_user_not_found(
    client: TestClient, superuser_token_headers: dict
) -> None:
    r = client.put(
        f"{settings.API_V1_STR}/users/999999",
        headers=superuser_token_headers,
        json={"full_name": "Nobody"},
    )
    assert r.status_code == 404
    assert r.json()["detail"] == (
        "The user with this username does not exist in the system"
    )


def test_create_user_open_registration_forbidden(client: TestClient) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/users/open",
        json={
            "email": random_email(),
            "password": random_lower_string(),
            "full_name": "Open Registration User",
        },
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "Open user registration is forbidden on this server"


def test_retrieve_users(
    client: TestClient, superuser_token_headers: dict, db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    crud.user.create(db, obj_in=user_in)

    username2 = random_email()
    password2 = random_lower_string()
    user_in2 = UserCreate(email=username2, password=password2)
    crud.user.create(db, obj_in=user_in2)

    r = client.get(f"{settings.API_V1_STR}/users/", headers=superuser_token_headers)
    all_users = r.json()

    assert len(all_users) > 1
    for item in all_users:
        assert "email" in item
