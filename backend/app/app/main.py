import traceback as tb

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import Response
from zillion.core import (
    UnsupportedGrainException,
    InvalidDimensionValueException,
    InvalidFieldException,
    ZillionException,
    error,
)
from tlbx import st

from app import app
from app.api.api_v1.api import api_router
from app.core.config import settings


if settings.ROLLBAR_ENABLED:
    print("Initializing Rollbar")
    import rollbar

    rollbar.init(settings.ROLLBAR_KEY, environment=settings.ROLLBAR_ENV)


# https://github.com/tiangolo/fastapi/issues/775#issuecomment-592946834
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except (InvalidFieldException, InvalidDimensionValueException) as e:
        error(str(e))
        return Response(str(e), status_code=400)
    except (UnsupportedGrainException, ZillionException) as e:
        error(str(e))
        return Response(str(e), status_code=500)
    except Exception as e:
        tb.print_exc()
        if settings.ROLLBAR_ENABLED:
            rollbar.report_exc_info()
        if settings.DEBUG:
            return Response(tb.format_exc(), status_code=500)
        return Response(f"Internal server error: {str(e)}", status_code=500)


app.middleware("http")(catch_exceptions_middleware)


# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]
    print("Enabling CORS for origins:", origins)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)
