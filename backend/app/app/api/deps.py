import hmac
from typing import Generator, Dict, Any, Optional

from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session
from tlbx import json, pp
from zillion.configs import load_warehouse_config, zillion_config
from zillion.model import Warehouses
from zillion.warehouse import Warehouse

from app import app
from app import crud, models, schemas
from app.core import security
from app.core.config import settings
from app.db.session import SessionLocal


reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token", auto_error=False
)

warehouses = {}


def warehouse_is_disabled(warehouse_row: Warehouses) -> bool:
    meta = warehouse_row.meta
    if not meta:
        return False

    if isinstance(meta, dict):
        meta_obj = meta
    else:
        try:
            meta_obj = json.loads(meta)
        except (TypeError, ValueError):
            return False

    return isinstance(meta_obj, dict) and meta_obj.get("disabled") is True


@app.on_event("startup")
async def init_warehouses():
    global warehouses
    warehouses = get_warehouses()


def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


def get_warehouses() -> Dict[str, Any]:
    """NOTE: this assumes Zillion Web DB is same as Zillion DB"""
    global warehouses
    if warehouses:
        # TODO: cache control?
        return warehouses

    print("Building warehouses...")
    db = SessionLocal()
    try:
        result = db.query(Warehouses).all()
        for row in result:
            if warehouse_is_disabled(row):
                print(
                    f"Skipping warehouse {row.name} because warehouse.meta has disabled=true"
                )
                continue
            print(f"Loading warehouse {row.name}")
            warehouses[row.id] = Warehouse.load(row.id)
        pp(warehouses)
        return warehouses
    finally:
        db.close()


def get_current_user(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(reusable_oauth2),
) -> models.User:
    bearer_token = token
    token = token or request.cookies.get(security.SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if (
        not bearer_token
        and request.method not in {"GET", "HEAD", "OPTIONS"}
        and request.headers.get("X-Zillion-CSRF") != "1"
    ):
        raise HTTPException(status_code=403, detail="Missing CSRF header")
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[security.ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
        token_data = schemas.TokenPayload(**payload)
    except (jwt.InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = crud.user.get(db, id=token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    version = payload.get("password_version")
    if (
        payload.get("purpose") is not None
        or (version is None and ":" in user.hashed_password)
        or (
            version is not None
            and (
                not isinstance(version, str)
                or not hmac.compare_digest(
                    version, security.password_version(user.hashed_password)
                )
            )
        )
    ):
        raise HTTPException(status_code=401, detail="Session has expired")
    if bearer_token and request.headers.get("X-Zillion-CSRF") == "1":
        security.set_session_cookie(response, token, payload["exp"])
    return user


def get_current_active_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    if not crud.user.is_active(current_user):
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_current_active_superuser(
    current_user: models.User = Depends(get_current_active_user),
) -> models.User:
    if not crud.user.is_superuser(current_user):
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user
