from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import AsyncIterator

import websockets
from websockets.client import WebSocketClientProtocol

from src.domain.models import PriceTick


class BinanceTickerStream:
    """
    Connects to Binance combined stream and yields PriceTick objects.

    For "<symbol>@ticker" payload:
      - "c" is the last price :contentReference[oaicite:7]{index=7}
      - "E" is event time in ms
      - combined streams wrap events as {"stream": "...", "data": {...}} :contentReference[oaicite:8]{index=8}
    """

    def __init__(self, ws_base: str) -> None:
        self._ws_base = ws_base.rstrip("/")

    def _build_url(self, symbols: list[str]) -> str:
        # Binance requires lowercase symbols in stream names :contentReference[oaicite:9]{index=9}
        streams = "/".join([f"{s.lower()}@ticker" for s in symbols])
        return f"{self._ws_base}/stream?streams={streams}"

    async def connect(self, symbols: list[str]) -> AsyncIterator[PriceTick]:
        url = self._build_url(symbols)
        log = logging.getLogger("binance-price-tracker")

        while True:
            try:
                async with websockets.connect(
                    url,
                    ping_interval=20,   # Binance sends ping frames; websockets lib will respond with pong automatically
                    ping_timeout=60,
                    close_timeout=10,
                    max_queue=1000,
                ) as ws:
                    log.info("WebSocket connected to Binance.")
                    async for message in self._iter_messages(ws):
                        tick = self._parse_tick(message)
                        if tick is not None:
                            yield tick
            except (websockets.ConnectionClosed, websockets.InvalidStatusCode, asyncio.TimeoutError) as e:
                log.warning(f"WebSocket disconnected: {e}. Reconnecting in 2 seconds...")
                await asyncio.sleep(2)
            except Exception as e:
                log.error(f"Unexpected WebSocket error: {e}. Reconnecting in 5 seconds...")
                await asyncio.sleep(5)

    async def _iter_messages(self, ws: WebSocketClientProtocol) -> AsyncIterator[dict]:
        log = logging.getLogger("binance-price-tracker")
        async for raw in ws:
            try:
                yield json.loads(raw)
            except json.JSONDecodeError as e:
                log.warning(f"Failed to parse JSON message: {e}")
                continue

    def _parse_tick(self, msg: dict) -> PriceTick | None:
        data = msg.get("data")
        if not isinstance(data, dict):
            return None

        symbol = data.get("s")
        last_price = data.get("c")
        event_time_ms = data.get("E")

        if not (isinstance(symbol, str) and isinstance(last_price, str) and isinstance(event_time_ms, int)):
            return None

        event_time = datetime.fromtimestamp(event_time_ms / 1000, tz=timezone.utc)
        return PriceTick(symbol=symbol.upper(), last_price=float(last_price), event_time=event_time)
