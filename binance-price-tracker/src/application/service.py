from __future__ import annotations

import logging

from src.application.throttle import PerSymbolThrottle
from src.application.sinks import PriceTickSink
from src.infrastructure.binance_ws import BinanceTickerStream


class PriceIngestionService:
    """
    Orchestrates:
      WS stream -> throttle -> sink.write()

    SOLID:
      - Depends on PriceTickSink abstraction, not DB-specific code.
    """

    def __init__(
        self,
        stream: BinanceTickerStream,
        sink: PriceTickSink,
        throttle: PerSymbolThrottle,
        logger: logging.Logger,
    ) -> None:
        self._stream = stream
        self._sink = sink
        self._throttle = throttle
        self._log = logger

    async def run(self, symbols: list[str]) -> None:
        self._log.info("Starting ingestion for %d symbols", len(symbols))

        async for tick in self._stream.connect(symbols):
            if not self._throttle.should_emit(tick.symbol):
                continue

            self._sink.write(tick)
            self._log.info("Emitted tick: %s price=%s time=%s", tick.symbol, tick.last_price, tick.event_time.isoformat())
