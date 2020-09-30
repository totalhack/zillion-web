from typing import Generator, Dict, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
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
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)

warehouses = {}


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
            warehouses[row.id] = Warehouse.load(row.id)
        pp(warehouses)
        return warehouses
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> models.User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = crud.user.get(db, id=token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def get_current_active_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    if not crud.user.is_active(current_user):
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_current_active_superuser(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    if not crud.user.is_superuser(current_user):
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user
