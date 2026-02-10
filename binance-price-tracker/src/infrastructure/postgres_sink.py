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

from src.application.sinks import PriceTickSink
from src.domain.models import PriceTick


class PostgresSink(PriceTickSink):
    """
    Writes ticks to PostgreSQL.

    Note:
      - Works for local Postgres or Cloud SQL Postgres.
      - The difference is ONLY how Engine is created.
    """

    def __init__(self, engine: Engine) -> None:
        self._engine = engine
        self._metadata = MetaData()

        # Minimal schema. You can extend later (id, inserted_at, etc.)
        self._ticks = Table(
            "price_ticks",
            self._metadata,
            Column("symbol", String(32), nullable=False),
            Column("last_price", Float, nullable=False),
            Column("event_time", DateTime(timezone=True), nullable=False),
        )

    def init_schema(self) -> None:
        self._metadata.create_all(self._engine)

    def write(self, tick: PriceTick) -> None:
        try:
            with self._engine.begin() as conn:
                conn.execute(self._ticks.insert().values(asdict(tick)))
        except SQLAlchemyError as e:
            raise RuntimeError(f"Postgres insert failed: {e}") from e


def build_engine_local(database_url: str) -> Engine:
    """
    Local/TCP connection using SQLAlchemy URL.

    Example:
      postgresql+psycopg://user:pass@127.0.0.1:5432/db
    """
    engine = create_engine(database_url, pool_pre_ping=True, future=True)
    # Fast fail on misconfig:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return engine
