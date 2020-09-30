import traceback as tb

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import Response
from zillion.core import UnsupportedGrainException, InvalidDimensionValueException

from app import app
from app.api.api_v1.api import api_router
from app.core.config import settings


# https://github.com/tiangolo/fastapi/issues/775#issuecomment-592946834
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except UnsupportedGrainException as e:
        return Response(str(e), status_code=500)
    except InvalidDimensionValueException as e:
        return Response(str(e), status_code=500)
    except Exception as e:
        tb.print_exc()
        if settings.DEBUG:
            return Response(tb.format_exc(), status_code=500)
        return Response("Internal server error", status_code=500)


app.middleware("http")(catch_exceptions_middleware)


# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)
