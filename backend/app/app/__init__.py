import typing

from fastapi import FastAPI
from fastapi.responses import JSONResponse
import orjson

from app.core.config import settings


# https://github.com/tiangolo/fastapi/issues/459#issuecomment-536781105
class ORJSONResponse(JSONResponse):
    media_type = "application/json"

    def render(self, content: typing.Any) -> bytes:
        return orjson.dumps(content, option=orjson.OPT_NON_STR_KEYS)


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=None,  # Disable Swagger docs
    redoc_url="/docs",  # Serve redocs from here instead
    default_response_class=ORJSONResponse,
)
