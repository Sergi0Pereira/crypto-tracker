import pytest
import asyncio
import logging
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone

from src.application.service import PriceIngestionService
from src.application.sinks import PriceTickSink
from src.application.throttle import PerSymbolThrottle
from src.domain.models import PriceTick

class MockSink(PriceTickSink):
    def __init__(self):
        self.written_ticks = []
        self.started = False
        self.stopped = False

    async def start(self) -> None:
        self.started = True

    async def stop(self) -> None:
        self.stopped = True

    async def write(self, tick: PriceTick) -> None:
        self.written_ticks.append(tick)

class MockStream:
    def __init__(self, ticks):
        self.ticks = ticks

    async def connect(self, symbols: list[str]):
        for t in self.ticks:
            yield t

@pytest.mark.asyncio
async def test_service_run_and_shutdown():
    # Setup
    ticks = [
        PriceTick("BTCUSDT", 50000.0, datetime.now(timezone.utc)),
        PriceTick("ETHUSDT", 3000.0, datetime.now(timezone.utc)),
    ]
    stream = MockStream(ticks)
    sink = MockSink()
    throttle = PerSymbolThrottle(interval_seconds=0.001) # Allow all (must be > 0)
    logger = logging.getLogger("test")

    service = PriceIngestionService(stream, sink, throttle, logger)

    # Run
    await service.run(["BTCUSDT", "ETHUSDT"])

    # Verify
    assert sink.started is True
    assert sink.stopped is True
    assert len(sink.written_ticks) == 2
    assert sink.written_ticks[0].symbol == "BTCUSDT"
    assert sink.written_ticks[1].symbol == "ETHUSDT"

@pytest.mark.asyncio
async def test_service_throttle():
    ticks = [
        PriceTick("BTCUSDT", 50000.0, datetime.now(timezone.utc)),
        PriceTick("BTCUSDT", 50001.0, datetime.now(timezone.utc)), # Throttled
    ]
    stream = MockStream(ticks)
    sink = MockSink()
    throttle = PerSymbolThrottle(interval_seconds=10) # 10s throttle
    logger = logging.getLogger("test")

    service = PriceIngestionService(stream, sink, throttle, logger)
    await service.run(["BTCUSDT"])

    assert len(sink.written_ticks) == 1
    assert sink.written_ticks[0].last_price == 50000.0
