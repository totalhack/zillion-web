import logging
import os

from tenacity import after_log, before_log, retry, stop_after_attempt, wait_fixed
from zillion.model import Warehouses

from app.core.config import settings
from app.models.user import User
from app.db.session import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

max_tries = 60 * 5  # 5 minutes
wait_seconds = 1


@retry(
    stop=stop_after_attempt(max_tries),
    wait=wait_fixed(wait_seconds),
    before=before_log(logger, logging.INFO),
    after=after_log(logger, logging.WARN),
)
def init() -> None:
    db = None
    try:
        db = SessionLocal()
        # Wait for DB connectivity first.
        db.execute("SELECT 1")

        # The test wrapper execs into the backend container immediately after
        # `docker compose up -d`, so we also need to wait for prestart
        # initialization to finish creating the seeded user and warehouses.
        user = db.query(User).filter(User.email == settings.FIRST_SUPERUSER).first()
        if not user:
            raise RuntimeError("Initial superuser has not been created yet")

        if os.getenv("INITIAL_WAREHOUSES_FILE"):
            warehouse_count = db.query(Warehouses).count()
            if warehouse_count < 1:
                raise RuntimeError("Initial warehouses have not been loaded yet")
    except Exception as e:
        logger.error(e)
        raise e
    finally:
        if db is not None:
            db.close()


def main() -> None:
    logger.info("Initializing service")
    init()
    logger.info("Service finished initializing")


if __name__ == "__main__":
    main()
