import secrets
from typing import Any, Dict, List, Optional, Union

from pydantic import AnyHttpUrl, BaseSettings, EmailStr, validator


class Settings(BaseSettings):
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"

    SECRET_KEY: str = secrets.token_urlsafe(32)
    # 60 minutes * 24 hours * N days
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 90

    DOMAIN: str  # Just the domain, e.g. www,exampe.com
    SERVER_HOST: AnyHttpUrl  # Full server base url, e.g. https://www.example.com

    PLUGIN_TOKEN: str
    PLUGIN_WAREHOUSE_ID: int
    PLUGIN_EMAIL: str
    PLUGIN_LEGAL_INFO: str

    # BACKEND_CORS_ORIGINS is a JSON-formatted list of origins
    # e.g: '["http://localhost", "http://localhost:4200", "http://localhost:3000", \
    # "http://localhost:8080"]'
    BACKEND_CORS_ORIGINS: List[Union[AnyHttpUrl, str]] = []

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    PROJECT_NAME: str
    ROLLBAR_ENABLED: bool = False
    ROLLBAR_ENV: str = None
    ROLLBAR_KEY: str = None

    SQLALCHEMY_DATABASE_URI: str

    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = None
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[EmailStr] = None
    EMAILS_FROM_NAME: Optional[str] = None

    @validator("EMAILS_FROM_NAME")
    def get_project_name(cls, v: Optional[str], values: Dict[str, Any]) -> str:
        if not v:
            return values["PROJECT_NAME"]
        return v

    EMAIL_RESET_TOKEN_EXPIRE_HOURS: int = 48
    EMAIL_TEMPLATES_DIR: str = "/app/app/email-templates/build"
    EMAILS_ENABLED: bool = False

    @validator("EMAILS_ENABLED", pre=True)
    def get_emails_enabled(cls, v: bool, values: Dict[str, Any]) -> bool:
        return bool(
            values.get("SMTP_HOST")
            and values.get("SMTP_PORT")
            and values.get("EMAILS_FROM_EMAIL")
        )

    EMAIL_TEST_USER: str = None
    FIRST_SUPERUSER: EmailStr
    FIRST_SUPERUSER_PASSWORD: str
    USERS_OPEN_REGISTRATION: bool = False

    class Config:
        case_sensitive = True


settings = Settings()
