from __future__ import annotations

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from google.cloud.sql.connector import Connector  # type: ignore


def build_engine_cloudsql(
    instance_connection_name: str,
    db_user: str,
    db_pass: str,
    db_name: str,
) -> Engine:
    """
    Cloud SQL Postgres connection using Cloud SQL Python Connector.

    Why this approach:
      - No need to expose DB publicly.
      - Auth is handled by GCP identity (service account) + Cloud SQL Client role.
      - Works cleanly in Cloud Run.

    Driver:
      - Uses pg8000 underneath (pure Python).
    """
    connector = Connector()

    def getconn():
        # connector.connect returns a DB-API connection object
        return connector.connect(
            instance_connection_name,
            "pg8000",
            user=db_user,
            password=db_pass,
            db=db_name,
        )

    engine = create_engine(
        "postgresql+pg8000://",
        creator=getconn,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=2,
        pool_timeout=30,
        pool_recycle=1800,
        future=True,
    )

    # Fast fail on misconfig:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))

    return engine
