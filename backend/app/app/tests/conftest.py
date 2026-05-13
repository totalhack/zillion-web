from typing import Dict, Generator, Set

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.models.user import User
from app.tests.utils.user import authentication_token_from_email
from app.tests.utils.utils import get_superuser_token_headers, random_email


def _get_user_ids(db: Session) -> Set[int]:
    return {user_id for (user_id,) in db.query(User.id).all()}


@pytest.fixture()
def db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def client() -> Generator:
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def superuser_token_headers(client: TestClient) -> Dict[str, str]:
    return get_superuser_token_headers(client)


@pytest.fixture()
def normal_user_email() -> str:
    return random_email()


@pytest.fixture(autouse=True)
def cleanup_created_users() -> Generator:
    db = SessionLocal()
    existing_user_ids = _get_user_ids(db)
    db.close()

    yield

    db = SessionLocal()
    try:
        created_users = db.query(User).filter(User.id.notin_(existing_user_ids)).all()
        for user in created_users:
            db.delete(user)
        db.commit()
    finally:
        db.close()


@pytest.fixture()
def normal_user_token_headers(
    client: TestClient, db: Session, normal_user_email: str
) -> Generator[Dict[str, str], None, None]:
    token_headers = authentication_token_from_email(
        client=client, email=normal_user_email, db=db
    )
    yield token_headers

    db.expire_all()
    user = db.query(User).filter(User.email == normal_user_email).first()
    if user:
        db.delete(user)
        db.commit()
