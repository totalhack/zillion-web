import json

from sqlalchemy.orm import Session
from zillion.model import Warehouses

from app import crud, schemas
from app.core.config import settings
from app.db import base  # noqa: F401

# make sure all SQL Alchemy models are imported (app.db.base) before initializing DB
# otherwise, SQL Alchemy might fail to initialize relationships properly
# for more details: https://github.com/tiangolo/full-stack-fastapi-postgresql/issues/28


def init_db(db: Session) -> None:
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next line
    # Base.metadata.create_all(bind=engine)

    user = crud.user.get_by_email(db, email=settings.FIRST_SUPERUSER)
    if not user:
        print(f"#### Creating first user: {settings.FIRST_SUPERUSER}")
        user_in = schemas.UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
        )
        user = crud.user.create(db, obj_in=user_in)  # noqa: F841

        print("#### Adding initial Warehouses")

        engine = db.get_bind()

        params = {
            "config": "https://raw.githubusercontent.com/totalhack/zillion-covid-19/master/zillion_covid_19/covid_warehouse.json"
        }
        engine.execute(
            Warehouses.insert(),
            id=1,
            name="Zillion Covid-19 Warehouse",
            params=json.dumps(params),
            meta=None,
        )

        params = {
            "config": "https://raw.githubusercontent.com/totalhack/zillion-baseball/master/zillion_baseball/baseball_warehouse.json"
        }
        engine.execute(
            Warehouses.insert(),
            id=2,
            name="Zillion Baseball Warehouse",
            params=json.dumps(params),
            meta=None,
        )

