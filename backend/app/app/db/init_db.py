import json
import os

from sqlalchemy.orm import Session
from zillion.core import read_filepath_or_buffer
from zillion.model import Warehouses
from zillion.warehouse import Warehouse

from app import crud, schemas
from app.core.config import settings
from app.db import base  # noqa: F401

# make sure all SQL Alchemy models are imported (app.db.base) before initializing DB
# otherwise, SQL Alchemy might fail to initialize relationships properly
# for more details: https://github.com/tiangolo/full-stack-fastapi-postgresql/issues/28


def init_warehouse_data(db: Session) -> None:
    whs_json_file = os.getenv("INITIAL_WAREHOUSES_FILE", None)
    if not whs_json_file:
        print("#### No INITIAL_WAREHOUSES_FILE set")
        return

    print(f"#### Adding Initial Warehouses from {whs_json_file}")

    whs = json.loads(read_filepath_or_buffer(whs_json_file))
    engine = db.get_bind()

    for wh in whs:
        print("Adding Warehouse...")
        print(wh)
        engine.execute(
            Warehouses.insert(),
            id=wh["id"],
            name=wh["name"],
            params=json.dumps(wh["params"]),
            meta=None,
        )

        # Load to make sure any required data syncs occur before app start
        Warehouse.load(wh["id"])


def init_user_data(db: Session) -> None:
    print(f"#### Creating first user: {settings.FIRST_SUPERUSER}")
    user_in = schemas.UserCreate(
        email=settings.FIRST_SUPERUSER,
        password=settings.FIRST_SUPERUSER_PASSWORD,
        is_superuser=True,
    )
    user = crud.user.create(db, obj_in=user_in)  # noqa: F841


def init_db(db: Session) -> None:
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next line
    # Base.metadata.create_all(bind=engine)

    user = crud.user.get_by_email(db, email=settings.FIRST_SUPERUSER)
    if not user:
        init_user_data(db)
        init_warehouse_data(db)
