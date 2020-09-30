from fastapi import APIRouter

from app.api.api_v1.endpoints import login, users, utils, warehouse

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(utils.router, prefix="/utils", tags=["utils"])
api_router.include_router(warehouse.router, prefix="/warehouse", tags=["warehouse"])
