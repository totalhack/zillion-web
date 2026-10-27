import fcntl
import hashlib
import hmac
import json
import os
import secrets
import tempfile
import time
from datetime import datetime, timedelta
from typing import Any, Optional, Union

from fastapi import HTTPException, Request, Response
import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


ALGORITHM = "HS256"
SESSION_COOKIE = "zillion_session"
AUTH_RATE_LIMITS = {
    "login_failure": (300, 10, 100),
    "login_success": (60, 50, 50),
    "reauth": (300, 10, 100),
    "recovery": (3600, 3, 20),
    "reset": (300, 10, 100),
}


def enforce_auth_rate_limit(
    request: Request, action: str, account: str, *, increment: bool = True
) -> None:
    window, account_limit, source_limit = AUTH_RATE_LIMITS[action]
    source = request.client.host if request.client else "unknown"
    keys = [
        (
            password_version(f"{action}:account:{account.strip().casefold()}"),
            account_limit,
        ),
        (password_version(f"{action}:source:{source}"), source_limit),
    ]
    path = f"/tmp/zillion-auth-{password_version('rate-limit')}.json"
    descriptor = os.open(path + ".lock", os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, "r+") as lock_file:
        fcntl.flock(lock_file, fcntl.LOCK_EX)
        now = time.time()
        try:
            state_descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
            with os.fdopen(state_descriptor) as state_file:
                state = json.load(state_file)
        except (FileNotFoundError, json.JSONDecodeError, UnicodeDecodeError):
            state = {}
        if not isinstance(state, dict):
            state = {}
        state = {
            key: value
            for key, value in state.items()
            if isinstance(value, dict)
            and type(value.get("count")) is int
            and value["count"] >= 0
            and isinstance(value.get("expires"), (int, float))
            and value["expires"] > now
        }
        if any(state.get(key, {}).get("count", 0) >= limit for key, limit in keys):
            raise HTTPException(
                status_code=429,
                detail="Too many attempts. Please try again later.",
                headers={"Retry-After": str(window)},
            )
        if not increment:
            return
        for key, limit in keys:
            entry = state.setdefault(key, {"count": 0, "expires": now + window})
            entry["count"] += 1
        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                dir=os.path.dirname(path),
                prefix=os.path.basename(path) + ".",
                delete=False,
            ) as state_file:
                temporary_path = state_file.name
                json.dump(state, state_file)
                state_file.flush()
                os.fsync(state_file.fileno())
            os.replace(temporary_path, path)
            temporary_path = None
        finally:
            if temporary_path is not None:
                os.unlink(temporary_path)


def set_session_cookie(response: Response, token: str, expires_at: float) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=max(0, int(expires_at - time.time())),
        httponly=True,
        secure=settings.SERVER_HOST.scheme == "https",
        samesite="lax",
        path=settings.API_V1_STR,
    )


def create_access_token(
    subject: Union[str, Any],
    expires_delta: timedelta = None,
    hashed_password: Optional[str] = None,
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    if hashed_password is not None:
        to_encode["password_version"] = password_version(hashed_password)
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def password_version(hashed_password: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode(), hashed_password.encode(), hashlib.sha256
    ).hexdigest()


def rotate_password_version(hashed_password: str) -> str:
    return hashed_password.split(":", 1)[0] + ":" + secrets.token_hex(16)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password.split(":", 1)[0])


def get_password_hash(password: str) -> str:
    return rotate_password_version(pwd_context.hash(password))
