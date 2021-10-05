import logging
from datetime import date, datetime, timedelta, time
from decimal import Decimal
from pathlib import Path
from typing import Any, Callable, Dict, List, Mapping, Optional, Union

import emails
from emails.template import JinjaTemplate
from jose import jwt
from marshmallow import Schema, fields, missing
import numpy as np
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
from tlbx import json

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


class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        else:
            return super(JSONEncoder, self).default(obj)


# NOTE: this needs to stay in sync with the UI criteria options


def get_today():
    return str(date.today())


def get_yesterday():
    return str(date.today() - timedelta(days=1))


def get_start_of_week():
    today = date.today()
    return str(today - timedelta(days=today.weekday()))


def get_start_of_month():
    return str(date.today().replace(day=1))


def get_start_of_last_month():
    som = date.today().replace(day=1)
    solm = (som - timedelta(days=1)).replace(day=1)
    return str(solm)


def get_end_of_last_month():
    som = date.today().replace(day=1)
    eolm = som - timedelta(days=1)
    return str(eolm)


def get_start_of_year():
    return str(date.today().replace(month=1, day=1))


def get_n_days_ago(n):
    return str(date.today() - timedelta(days=n))


def get_n_hours_ago(n):
    return str(
        datetime.now().replace(minute=0, second=0, microsecond=0) - timedelta(hours=n)
    )


def get_n_minutes_ago(n):
    return str(datetime.now().replace(second=0, microsecond=0) - timedelta(minutes=n))


def get_now():
    return str(datetime.now())


NON_RANGE_DATE_SHORTCUTS = {
    "today": lambda: get_today(),
    "yesterday": lambda: get_yesterday(),
    "startofweek": lambda: get_start_of_week(),
    "startofmonth": lambda: get_start_of_month(),
    "startoflastmonth": lambda: get_start_of_last_month(),
    "startofyear": lambda: get_start_of_year(),
    "thishour": lambda: get_n_hours_ago(0),
    "lasthour": lambda: get_n_hours_ago(1),
    "last10minutes": lambda: get_n_minutes_ago(10),
}

RANGE_DATE_SHORTCUTS = {
    "today": lambda: [get_today(), get_today()],
    "yesterday": lambda: [get_yesterday(), get_yesterday()],
    "last7days": lambda: [get_n_days_ago(7), get_n_days_ago(1)],
    "last30days": lambda: [get_n_days_ago(30), get_n_days_ago(1)],
    "thisweek": lambda: [get_start_of_week(), get_today()],
    "thismonth": lambda: [get_start_of_month(), get_today()],
    "lastmonth": lambda: [get_start_of_last_month(), get_end_of_last_month()],
    "thisyear": lambda: [get_start_of_year(), get_today()],
    "thishour": lambda: [get_n_hours_ago(0), get_n_minutes_ago(0)],
    "lasthour": lambda: [get_n_hours_ago(1), get_n_hours_ago(0)],
    "last10minutes": lambda: [get_n_minutes_ago(10), get_n_minutes_ago(0)],
}

DATE_SHORTCUT_VALUES = {
    "=": NON_RANGE_DATE_SHORTCUTS,
    "!=": NON_RANGE_DATE_SHORTCUTS,
    ">": NON_RANGE_DATE_SHORTCUTS,
    "<": NON_RANGE_DATE_SHORTCUTS,
    ">=": NON_RANGE_DATE_SHORTCUTS,
    "<=": NON_RANGE_DATE_SHORTCUTS,
    "between": RANGE_DATE_SHORTCUTS,
    "not between": RANGE_DATE_SHORTCUTS,
}

SHORTCUT_VALUES = dict(date=DATE_SHORTCUT_VALUES, datetime=DATE_SHORTCUT_VALUES)


def clean_shortcut(val):
    return str(val).lower().replace(" ", "")


def handle_shortcut_criteria(warehouse, request):
    """HACK: perhaps this should be passed through and handled in Zillion"""
    if not request.get("criteria", None):
        return

    has_shortcuts = False
    fields = warehouse.get_fields()
    ui_criteria = []
    final_criteria = []
    for field_name, op, value in request["criteria"]:
        ui_criteria.append(
            [field_name, op, value.copy() if hasattr(value, "copy") else value]
        )
        field = fields[field_name]
        field_type = field.type.lower()
        if field_type not in SHORTCUT_VALUES:
            final_criteria.append([field_name, op, value])
            continue

        shortcut_val = clean_shortcut(value)
        if shortcut_val not in SHORTCUT_VALUES[field_type].get(op, {}):
            final_criteria.append([field_name, op, value])
            continue

        has_shortcuts = True
        value = SHORTCUT_VALUES[field_type][op][shortcut_val]()
        final_criteria.append([field_name, op, value])

    if has_shortcuts and "meta" in request:
        # Denotes that we had special criteria for the UI. Saved on the report
        # so we can take appropriate action on load.
        request["meta"]["ui_criteria"] = ui_criteria
    request["criteria"] = final_criteria


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
