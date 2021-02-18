"""
Example:
COMPOSE_FILE=docker-compose.light.dev.yml ./scripts/run-local.sh python /app/scripts/add_warehouse.py My_Warehouse /app/custom/my_warehouse.jdon
"""

import json
import sys

from zillion.model import Warehouses
from zillion.warehouse import Warehouse

from app.db.session import SessionLocal


if __name__ == "__main__":
    db = SessionLocal()
    name = sys.argv[1]
    assert name
    config_url = sys.argv[2]
    assert config_url

    print(f"Loading from url {config_url}")
    wh = Warehouse(config=config_url)

    engine = db.get_bind()
    qr = engine.execute(
        Warehouses.insert(),
        name=name,
        params=json.dumps({"config": config_url}),
    )
    wh_id = qr.inserted_primary_key[0]
    print(f"Created warehouse ID {wh_id}")
