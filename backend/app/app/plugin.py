from typing import Any

from fastapi import FastAPI, HTTPException, Depends, Response
from fastapi.openapi.utils import get_openapi
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from tlbx import st, json

from app.api import deps
from app.core.config import settings
from app.schemas.warehouse import ReportTextRequest
from app.utils import JSONEncoder

bearer_scheme = HTTPBearer()


def init_plugin(app):
    print("Setting up plugin API")

    def validate_plugin_token(
        credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    ):
        if (
            credentials.scheme != "Bearer"
            or credentials.credentials != settings.PLUGIN_TOKEN
        ):
            raise HTTPException(status_code=401, detail="Invalid or missing token")
        return credentials

    plugin_deps = [Depends(validate_plugin_token)]
    if "localhost" in settings.SERVER_HOST:
        print("WARNING: Plugin API is enabled in debug mode!")
        plugin_deps = None

    plugin_title = "Zillion Plugin API"
    plugin_description = (
        "An analytics API for querying a Zillion Warehouse in natural language"
    )
    plugin_version = "0.0.1"

    plugin_app = FastAPI(
        title=plugin_title,
        description=plugin_description,
        version=plugin_version,
        servers=[{"url": f"{settings.SERVER_HOST}"}],
        root_path_in_servers=False,
        openapi_url="/openapi.json",
        docs_url=None,
        redoc_url="/docs",
        dependencies=plugin_deps,
    )

    def custom_openapi():
        """This is unfortunately necessary to get the OpenAPI spec to include the
        /plugin base path"""
        if plugin_app.openapi_schema:
            return plugin_app.openapi_schema
        openapi_schema = get_openapi(
            title=plugin_title,
            description=plugin_description,
            version=plugin_version,
            servers=[{"url": f"{settings.SERVER_HOST}"}],
            routes=plugin_app.routes,
        )
        paths = openapi_schema["paths"].copy()
        for k, v in paths.items():
            if not k.startswith("/plugin"):
                openapi_schema["paths"]["/plugin" + k] = v
                del openapi_schema["paths"][k]
        plugin_app.openapi_schema = openapi_schema
        return plugin_app.openapi_schema

    plugin_app.openapi = custom_openapi

    app.mount("/plugin", plugin_app)

    @plugin_app.post("/execute_text")
    def execute_text(request: ReportTextRequest) -> Any:
        """Execute a report based on natural language text

        TODO only supports a single warehouse ID for now since we don't have a
        good way for ChatGPT to understand which warehouse to use.

        """
        wh = deps.get_warehouses()[settings.PLUGIN_WAREHOUSE_ID]
        result = wh.execute_text(request.text, allow_partial=False)
        df = result.df_display
        if result.dimensions:
            df = df.reset_index()
        # NOTE: different format than main API execute_text endpoint
        data = df.to_dict(orient="records")
        json_str = json.dumps(data, ignore_nan=True, cls=JSONEncoder)
        return Response(media_type="application/json", content=json_str)

    @app.get("/.well-known/ai-plugin.json")
    def ai_plugin():
        """Sub dynamic values into the plugin json file"""
        with open("/app/app/.well-known/ai-plugin.json") as f:
            data = json.load(f)

        data["api"]["url"] = data["api"]["url"].format(SERVER_HOST=settings.SERVER_HOST)
        data["logo_url"] = data["logo_url"].format(SERVER_HOST=settings.SERVER_HOST)
        data["contact_email"] = data["contact_email"].format(
            PLUGIN_EMAIL=settings.PLUGIN_EMAIL
        )
        data["legal_info_url"] = data["legal_info_url"].format(
            PLUGIN_LEGAL_INFO=settings.PLUGIN_LEGAL_INFO
        )

        if "localhost" in settings.SERVER_HOST:
            print("WARNING: Disabling auth for localhost")
            data["auth"] = {"type": "none"}
        else:
            data["auth"] = {"type": "user_http", "authorization_type": "bearer"}
        return data

    @app.get("/.well-known/logo.png")
    async def serve_logo():
        return FileResponse("/app/app/.well-known/logo.png")
