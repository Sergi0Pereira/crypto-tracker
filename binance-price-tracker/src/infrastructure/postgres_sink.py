from __future__ import annotations

from dataclasses import asdict
import asyncio
import logging

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
    Writes ticks to PostgreSQL using batching and background threads.

    Note:
      - Works for local Postgres or Cloud SQL Postgres.
      - The difference is ONLY how Engine is created.
    """

    def __init__(
        self, engine: Engine, batch_size: int = 500, flush_interval: float = 1.0
    ) -> None:
        self._engine = engine
        self._metadata = MetaData()
        self._batch_size = batch_size
        self._flush_interval = flush_interval
        self._queue: asyncio.Queue[PriceTick] = asyncio.Queue()
        self._task: asyncio.Task[None] | None = None
        self._log = logging.getLogger("binance-price-tracker")

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

    async def start(self) -> None:
        self._task = asyncio.create_task(self._worker())
        self._log.info("Started PostgresSink worker task")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

        # Flush remaining ticks
        await self._flush_all_pending()
        self._log.info("Stopped PostgresSink")

    async def write(self, tick: PriceTick) -> None:
        await self._queue.put(tick)

    async def _worker(self) -> None:
        batch: list[PriceTick] = []
        while True:
            try:
                # Wait for tick or timeout
                tick = await asyncio.wait_for(self._queue.get(), timeout=self._flush_interval)
                batch.append(tick)
                self._queue.task_done()

                if len(batch) >= self._batch_size:
                    await self._flush_batch(batch)
                    batch = []
            except asyncio.TimeoutError:
                if batch:
                    await self._flush_batch(batch)
                    batch = []
            except asyncio.CancelledError:
                if batch:
                    await self._flush_batch(batch)
                raise

    async def _flush_all_pending(self) -> None:
        batch: list[PriceTick] = []
        while not self._queue.empty():
            try:
                batch.append(self._queue.get_nowait())
                self._queue.task_done()
            except asyncio.QueueEmpty:
                break
        if batch:
            await self._flush_batch(batch)

    async def _flush_batch(self, batch: list[PriceTick]) -> None:
        if not batch:
            return

        def _sync_insert() -> None:
            try:
                with self._engine.begin() as conn:
                    conn.execute(self._ticks.insert().values([asdict(t) for t in batch]))
            except SQLAlchemyError as e:
                self._log.error(
                    f"Postgres insert failed for batch of {len(batch)} ticks: {e}"
                )

        await asyncio.to_thread(_sync_insert)

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
