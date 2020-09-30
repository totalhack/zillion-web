import logging
from datetime import date, datetime, timedelta, time
from decimal import Decimal
from pathlib import Path
from typing import Any, Callable, Dict, List, Mapping, Optional, Union

import emails
from emails.template import JinjaTemplate
from jose import jwt
from marshmallow import Schema, fields, missing
from pydantic import (
    BaseModel,
    root_validator,
    create_model,
    AnyUrl,
    EmailStr,
    StrictFloat,
    StrictInt,
)
from pydantic.utils import validate_field_name

from app.core.config import settings


def send_email(
    email_to: str,
    subject_template: str = "",
    html_template: str = "",
    environment: Dict[str, Any] = {},
) -> None:
    assert settings.EMAILS_ENABLED, "no provided configuration for email variables"
    message = emails.Message(
        subject=JinjaTemplate(subject_template),
        html=JinjaTemplate(html_template),
        mail_from=(settings.EMAILS_FROM_NAME, settings.EMAILS_FROM_EMAIL),
    )
    smtp_options = {"host": settings.SMTP_HOST, "port": settings.SMTP_PORT}
    if settings.SMTP_TLS:
        smtp_options["tls"] = True
    if settings.SMTP_USER:
        smtp_options["user"] = settings.SMTP_USER
    if settings.SMTP_PASSWORD:
        smtp_options["password"] = settings.SMTP_PASSWORD
    response = message.send(to=email_to, render=environment, smtp=smtp_options)
    logging.info(f"send email result: {response}")


def send_test_email(email_to: str) -> None:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Test email"
    with open(Path(settings.EMAIL_TEMPLATES_DIR) / "test_email.html") as f:
        template_str = f.read()
    send_email(
        email_to=email_to,
        subject_template=subject,
        html_template=template_str,
        environment={"project_name": settings.PROJECT_NAME, "email": email_to},
    )


def send_reset_password_email(email_to: str, email: str, token: str) -> None:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Password recovery for user {email}"
    with open(Path(settings.EMAIL_TEMPLATES_DIR) / "reset_password.html") as f:
        template_str = f.read()
    server_host = settings.SERVER_HOST
    link = f"{server_host}/reset-password?token={token}"
    send_email(
        email_to=email_to,
        subject_template=subject,
        html_template=template_str,
        environment={
            "project_name": settings.PROJECT_NAME,
            "username": email,
            "email": email_to,
            "valid_hours": settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS,
            "link": link,
        },
    )


def send_new_account_email(email_to: str, username: str, password: str) -> None:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - New account for user {username}"
    with open(Path(settings.EMAIL_TEMPLATES_DIR) / "new_account.html") as f:
        template_str = f.read()
    link = settings.SERVER_HOST
    send_email(
        email_to=email_to,
        subject_template=subject,
        html_template=template_str,
        environment={
            "project_name": settings.PROJECT_NAME,
            "username": username,
            "password": password,
            "email": email_to,
            "link": link,
        },
    )


def generate_password_reset_token(email: str) -> str:
    delta = timedelta(hours=settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS)
    now = datetime.utcnow()
    expires = now + delta
    exp = expires.timestamp()
    encoded_jwt = jwt.encode(
        {"exp": exp, "nbf": now, "sub": email}, settings.SECRET_KEY, algorithm="HS256"
    )
    return encoded_jwt


def verify_password_reset_token(token: str) -> Optional[str]:
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return decoded_token["sub"]
    except jwt.JWTError:
        return None


# -------- See https://gist.github.com/kmatarese/a5492f4a02449e13ea85ace8801b8dfb


CUSTOM_FIELD_DEFAULT = Any
# Fields in the marshmallow schema may fail the call to pydantic's
# validate_field_name if they conflict with base fields. To work around this
# we mark illegal fields with this and then strip it later to create an alias
# using an alias_generator. Bleh.
ALIAS_MARKER = "__alias__"


def get_dict_type(x):
    """For dicts we need to look at the key and value type"""
    key_type = get_pydantic_type(x.key_field)
    if x.value_field:
        value_type = get_pydantic_type(x.value_field)
        return Dict[key_type, value_type]
    return Dict[key_type, Any]


def get_list_type(x):
    """For lists we need to look at the value type"""
    if x.inner:
        c_type = get_pydantic_type(x.inner)
        return List[c_type]
    return List


def get_nested_model(x):
    """Return a model from a nested marshmallow schema"""
    return pydantic_from_marshmallow(x.schema)


FIELD_CONVERTERS = {
    fields.Bool: bool,
    fields.Boolean: bool,
    fields.Date: date,
    fields.DateTime: datetime,
    fields.Decimal: Decimal,
    fields.Dict: get_dict_type,
    fields.Email: EmailStr,
    fields.Float: float,
    fields.Function: Callable,
    fields.Int: int,
    fields.Integer: int,
    fields.List: get_list_type,
    fields.Mapping: Mapping,
    fields.Method: Callable,
    fields.Nested: get_nested_model,
    fields.Number: Union[StrictFloat, StrictInt],
    fields.Str: str,
    fields.String: str,
    fields.Time: time,
    fields.TimeDelta: timedelta,
    fields.URL: AnyUrl,
    fields.Url: AnyUrl,
    fields.UUID: str,
}


def is_custom_field(field):
    """If this is a subclass of marshmallow's Field and not in our list, we
    assume its a custom field"""
    ftype = type(field)
    if issubclass(ftype, fields.Field) and ftype not in FIELD_CONVERTERS:
        return True
    return False


def get_pydantic_type(field):
    """Get pydantic type from a marshmallow field"""
    if is_custom_field(field):
        conv = Any
    else:
        conv = FIELD_CONVERTERS[type(field)]

    # TODO: Is there a cleaner way to check for annotation types?
    if isinstance(conv, type) or conv.__module__ == "typing":
        pyd_type = conv
    else:
        pyd_type = conv(field)

    if not field.required:
        pyd_type = Optional[pyd_type]
    return pyd_type


def is_valid_field_name(bases, x):
    try:
        validate_field_name(bases, x)
        return True
    except NameError as e:
        return False


def get_alias(x):
    if x.endswith(ALIAS_MARKER):
        return x.replace(ALIAS_MARKER, "")
    return x


class MarshmallowModel(BaseModel):
    """A pydantic model that uses a marshmallow schema for object-wide validation"""

    _schema = None

    @root_validator(pre=True)
    def _schema_validate(cls, values):
        if not cls._schema:
            raise AssertionError("Must define a marshmallow schema")
        return cls._schema().load(values)

    class Config:
        alias_generator = get_alias


def pydantic_from_marshmallow(schema):
    """Convert a marshmallow schema to a pydantic model. May only
    work for fairly simple cases. Barely tested. Enjoy."""

    pyd_fields = {}
    for field_name, field in schema._declared_fields.items():
        pyd_type = get_pydantic_type(field)
        default = field.default if field.default != missing else None
        if not is_valid_field_name([BaseModel], field_name):
            field_name = field_name + ALIAS_MARKER
        pyd_fields[field_name] = (pyd_type, default)

    if isinstance(schema, Schema):
        name = schema.__class__.__name__
    else:
        name = schema.__name__

    return create_model(name, _schema=schema, **pyd_fields, __base__=MarshmallowModel)
