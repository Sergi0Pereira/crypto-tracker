from __future__ import annotations

from dataclasses import asdict
from sqlalchemy import (
    create_engine,
    MetaData,
    Table,
    Column,
    String,
    Float,
    DateTime,
    text,
)
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from src.domain.models import PriceTick


class PriceTickRepository:
    """
    Storage adapter (Repository pattern) for price ticks.

    Using SQLAlchemy Core (not ORM) keeps it lightweight and explicit.
    """

    def __init__(self, engine: Engine) -> None:
        self._engine = engine
        self._metadata = MetaData()

        self._ticks = Table(
            "price_ticks",
            self._metadata,
            Column("symbol", String(32), nullable=False),
            Column("last_price", Float, nullable=False),
            Column("event_time", DateTime(timezone=True), nullable=False),
        )

    def init_schema(self) -> None:
        self._metadata.create_all(self._engine)

    def insert(self, tick: PriceTick) -> None:
        try:
            with self._engine.begin() as conn:
                conn.execute(self._ticks.insert().values(asdict(tick)))
        except SQLAlchemyError as e:
            # In production you'd add retry/backoff and a dead-letter path
            raise RuntimeError(f"DB insert failed: {e}") from e


def build_engine(database_url: str) -> Engine:
    """
    database_url example (Cloud SQL Postgres):
      postgresql+psycopg://USER:PASSWORD@HOST:PORT/DBNAME

    psycopg:
      - Is the Postgres driver (psycopg3).
      - SQLAlchemy uses it to talk to the database.
    """
    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        future=True,
    )
    # quick connectivity check (optional)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return engine
