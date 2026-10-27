from datetime import timedelta
from typing import Any

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Body,
    Depends,
    Form,
    HTTPException,
    Request,
    Response,
)
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.security import get_password_hash
from app.utils import (
    generate_password_reset_token,
    send_reset_password_email,
    verify_password_reset_token,
)

router = APIRouter()


@router.post("/login/access-token", response_model=schemas.Token)
def login_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
    use_cookie: bool = Form(False),
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    if use_cookie and request.headers.get("X-Zillion-CSRF") != "1":
        raise HTTPException(status_code=403, detail="Missing CSRF header")
    security.enforce_auth_rate_limit(
        request, "login_failure", form_data.username, increment=False
    )
    user = crud.user.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        security.enforce_auth_rate_limit(request, "login_failure", form_data.username)
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not crud.user.is_active(user):
        security.enforce_auth_rate_limit(request, "login_failure", form_data.username)
        raise HTTPException(status_code=400, detail="Inactive user")
    security.enforce_auth_rate_limit(request, "login_success", form_data.username)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(
        user.id,
        expires_delta=access_token_expires,
        hashed_password=user.hashed_password,
    )
    if use_cookie:
        payload = security.jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        security.set_session_cookie(response, token, payload["exp"])
    return {
        "access_token": "cookie" if use_cookie else token,
        "token_type": "bearer",
    }


@router.post("/logout", response_model=schemas.Msg)
def logout(
    response: Response,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    user = (
        db.query(models.User)
        .filter(models.User.id == current_user.id)
        .populate_existing()
        .with_for_update()
        .one()
    )
    user.hashed_password = security.rotate_password_version(user.hashed_password)
    db.commit()
    response.delete_cookie(security.SESSION_COOKIE, path=settings.API_V1_STR)
    return {"msg": "Logged out"}


@router.post("/login/test-token", response_model=schemas.User)
def test_token(current_user: models.User = Depends(deps.get_current_user)) -> Any:
    """
    Test access token
    """
    return current_user


@router.post("/password-recovery/{email}", response_model=schemas.Msg)
def recover_password(
    email: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Password Recovery
    """
    security.enforce_auth_rate_limit(request, "recovery", email)
    user = crud.user.get_by_email(db, email=email)

    if user and crud.user.is_active(user):
        password_reset_token = generate_password_reset_token(
            email=user.email, hashed_password=user.hashed_password
        )
        background_tasks.add_task(
            send_reset_password_email,
            email_to=user.email,
            email=user.email,
            token=password_reset_token,
        )
    return {"msg": "Password recovery email sent"}


@router.post("/reset-password/", response_model=schemas.Msg)
def reset_password(
    request: Request,
    token: str = Body(...),
    new_password: str = Body(...),
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Reset password
    """
    security.enforce_auth_rate_limit(request, "reset", token)
    email = verify_password_reset_token(token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid token")
    user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .populate_existing()
        .with_for_update()
        .first()
    )
    if (
        not user
        or not crud.user.is_active(user)
        or not verify_password_reset_token(token, hashed_password=user.hashed_password)
    ):
        raise HTTPException(status_code=400, detail="Invalid token")
    hashed_password = get_password_hash(new_password)
    user.hashed_password = hashed_password
    db.add(user)
    db.commit()
    return {"msg": "Password updated successfully"}
