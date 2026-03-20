import pytest
import asyncio
from unittest.mock import MagicMock
from datetime import datetime, timezone

from src.infrastructure.postgres_sink import PostgresSink
from src.domain.models import PriceTick

class MockEngine:
    def __init__(self):
        self.batches_written = []
        self.begun = False
        self.conn_mock = MagicMock()
        
    def begin(self):
        self.begun = True
        cm = MagicMock()
        cm.__enter__.return_value = self.conn_mock
        return cm

@pytest.mark.asyncio
async def test_postgres_sink_batching():
    engine = MockEngine()
    # Batch size 3, very long timeout so it only flushes on batch size or stop
    sink = PostgresSink(engine, batch_size=3, flush_interval=10.0)
    
    await sink.start()
    
    tick1 = PriceTick("BTCUSDT", 50000.0, datetime.now(timezone.utc))
    tick2 = PriceTick("ETHUSDT", 3000.0, datetime.now(timezone.utc))
    tick3 = PriceTick("BNBUSDT", 300.0, datetime.now(timezone.utc))
    tick4 = PriceTick("ADAUSDT", 1.0, datetime.now(timezone.utc))
    
    await sink.write(tick1)
    await sink.write(tick2)
    
    # Give it a tiny moment to process the queue, but it shouldn't flush yet (batch size 3)
    await asyncio.sleep(0.01)
    assert engine.conn_mock.execute.call_count == 0
    
    # 3rd tick should trigger flush
    await sink.write(tick3)
    await asyncio.sleep(0.05) # Wait for flush task
    
    assert engine.conn_mock.execute.call_count == 1
    
    # 4th tick is left pending
    await sink.write(tick4)
    await asyncio.sleep(0.01)
    assert engine.conn_mock.execute.call_count == 1
    
    # Stop should flush the remaining 1 tick
    await sink.stop()
    assert engine.conn_mock.execute.call_count == 2
